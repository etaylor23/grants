import {
  Workday,
  TimeSlot,
  TimeSlotBatch,
  ApiError,
  Personnel,
  Grant,
  DynamoWorkdayItem,
  DynamoTimeSlotItem,
  DynamoPersonnelItem,
  DynamoGrantItem,
} from "../models/types";
import {
  putItem,
  getItem,
  deleteItem,
  updateItem,
  query,
  transactWrite,
} from "../db/local-dynamo";

// Simulate API delay for realistic behavior
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// DynamoDB-backed API client
export class DynamoApiClient {
  // Get workdays for a user and year
  static async getWorkdays(userId: string, year: number): Promise<Workday> {
    await delay(200);

    try {
      const result = await getItem(
        {
          Key: {
            PK: userId,
            SK: `WORKDAYS#${year}`,
          },
        },
        "Workdays"
      );

      if (result) {
        const dynamoItem = result as DynamoWorkdayItem;
        return {
          userId: dynamoItem.PK,
          year,
          workdays: dynamoItem.Workdays || {},
        };
      }

      // Return empty workday record if not found
      return {
        userId,
        year,
        workdays: {},
      };
    } catch (error) {
      console.error("Failed to get workdays:", error);
      throw new ApiError("Failed to retrieve workdays");
    }
  }

  // Get time slots for a user within date range
  static async getTimeSlots(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<TimeSlot[]> {
    await delay(300);

    try {
      const result = await query(
        {
          KeyConditionExpression:
            "PK = :userId AND begins_with(SK, :datePrefix)",
          ExpressionAttributeValues: {
            ":userId": userId,
            ":datePrefix": startDate.substring(0, 7), // YYYY-MM prefix
          },
        },
        "TimeSlots"
      );

      const timeSlots: TimeSlot[] = result.Items.map((item: any) => {
        const dynamoItem = item as DynamoTimeSlotItem;
        const [date, grantId] = dynamoItem.SK.split("#");
        return {
          userId: dynamoItem.PK,
          date,
          grantId,
          allocationPercent: dynamoItem.AllocationPercent,
          totalHours: dynamoItem.TotalHours || 8.0, // Default to 8 hours if not set
        };
      }).filter((slot: TimeSlot) => {
        const slotDate = new Date(slot.date);
        const start = new Date(startDate);
        const end = new Date(endDate);
        return slotDate >= start && slotDate <= end;
      });

      return timeSlots;
    } catch (error) {
      console.error("Failed to get time slots:", error);
      throw new ApiError("Failed to retrieve time slots");
    }
  }

  // Get time slots for a grant within date range
  static async getGrantTimeSlots(
    grantId: string,
    startDate: string,
    endDate: string
  ): Promise<TimeSlot[]> {
    await delay(300);

    try {
      // Query all time slots and filter by grant ID
      // In a real DynamoDB setup, we'd use a GSI for this
      const allTimeSlots: TimeSlot[] = [];

      // Get all personnel to query their time slots
      const personnelResult = await query(
        {
          KeyConditionExpression: "PK = :pk",
          ExpressionAttributeValues: {
            ":pk": "PERSONNEL",
          },
        },
        "Personnel"
      );

      // For each person, get their time slots in the date range
      for (const person of personnelResult.Items) {
        const personTimeSlots = await this.getTimeSlots(
          (person as DynamoPersonnelItem).SK,
          startDate,
          endDate
        );
        allTimeSlots.push(...personTimeSlots);
      }

      // Filter by grant ID
      return allTimeSlots.filter((slot) => slot.grantId === grantId);
    } catch (error) {
      console.error("Failed to get grant time slots:", error);
      throw new ApiError("Failed to retrieve grant time slots");
    }
  }

  // Batch update time slots with constraints
  static async batchUpdateTimeSlots(batch: TimeSlotBatch): Promise<void> {
    await delay(400);

    try {
      // Validate 100% allocation constraint
      const dayTotals: Record<string, number> = {};

      // Calculate totals for affected days
      const affectedDays = new Set<string>();

      if (batch.create) {
        batch.create.forEach((slot) => {
          affectedDays.add(`${slot.userId}-${slot.date}`);
        });
      }

      if (batch.update) {
        batch.update.forEach((slot) => {
          affectedDays.add(`${slot.userId}-${slot.date}`);
        });
      }

      if (batch.delete) {
        batch.delete.forEach((slot) => {
          affectedDays.add(`${slot.userId}-${slot.date}`);
        });
      }

      // Get current allocations for affected days
      for (const dayKey of Array.from(affectedDays)) {
        const [userId, date] = dayKey.split("-");
        const existingSlots = await this.getTimeSlots(userId, date, date);
        dayTotals[dayKey] = existingSlots.reduce(
          (sum, slot) => sum + slot.allocationPercent,
          0
        );
      }

      // Apply changes to calculate new totals
      if (batch.create) {
        batch.create.forEach((slot) => {
          const key = `${slot.userId}-${slot.date}`;
          dayTotals[key] = (dayTotals[key] || 0) + slot.allocationPercent;
        });
      }

      if (batch.update) {
        for (const slot of batch.update) {
          const key = `${slot.userId}-${slot.date}`;
          // Remove old value and add new value
          const existingSlots = await this.getTimeSlots(
            slot.userId,
            slot.date,
            slot.date
          );
          const existingSlot = existingSlots.find(
            (s) => s.grantId === slot.grantId
          );
          if (existingSlot) {
            dayTotals[key] =
              (dayTotals[key] || 0) -
              existingSlot.allocationPercent +
              slot.allocationPercent;
          }
        }
      }

      if (batch.delete) {
        for (const slot of batch.delete) {
          const key = `${slot.userId}-${slot.date}`;
          const existingSlots = await this.getTimeSlots(
            slot.userId,
            slot.date,
            slot.date
          );
          const existingSlot = existingSlots.find(
            (s) => s.grantId === slot.grantId
          );
          if (existingSlot) {
            dayTotals[key] =
              (dayTotals[key] || 0) - existingSlot.allocationPercent;
          }
        }
      }

      // Validate 100% constraint
      for (const [dayKey, total] of Object.entries(dayTotals)) {
        if (total > 100) {
          throw new ApiError(
            `Total allocation for ${dayKey} exceeds 100% (${total}%)`
          );
        }
      }

      // Execute batch operations using transaction
      const transactItems: any[] = [];

      if (batch.create) {
        batch.create.forEach((slot) => {
          const timeSlotItem: DynamoTimeSlotItem = {
            PK: slot.userId,
            SK: `${slot.date}#${slot.grantId}`,
            AllocationPercent: slot.allocationPercent,
            TotalHours: slot.totalHours,
          };

          transactItems.push({
            Put: {
              Item: timeSlotItem,
              ConditionExpression: "attribute_not_exists(PK)",
            },
          });
        });
      }

      if (batch.update) {
        batch.update.forEach((slot) => {
          const timeSlotItem: DynamoTimeSlotItem = {
            PK: slot.userId,
            SK: `${slot.date}#${slot.grantId}`,
            AllocationPercent: slot.allocationPercent,
            TotalHours: slot.totalHours,
          };

          transactItems.push({
            Put: {
              Item: timeSlotItem,
              ConditionExpression: "attribute_exists(PK)",
            },
          });
        });
      }

      if (batch.delete) {
        batch.delete.forEach((slot) => {
          transactItems.push({
            Delete: {
              Key: {
                PK: slot.userId,
                SK: `${slot.date}#${slot.grantId}`,
              },
              ConditionExpression: "attribute_exists(PK)",
            },
          });
        });
      }

      // Execute transaction
      if (transactItems.length > 0) {
        await transactWrite({ TransactItems: transactItems });
      }
    } catch (error) {
      console.error("Batch update failed:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError("Failed to update time slots");
    }
  }

  // Toggle workday for a user
  static async toggleWorkday(
    userId: string,
    date: string,
    isWorkday: boolean
  ): Promise<void> {
    await delay(300);

    try {
      const year = new Date(date).getFullYear();

      if (isWorkday) {
        // Add workday
        await updateItem(
          {
            Key: {
              PK: userId,
              SK: `WORKDAYS#${year}`,
            },
            UpdateExpression: "SET Workdays.#date = :value",
            ExpressionAttributeNames: {
              "#date": date,
            },
            ExpressionAttributeValues: {
              ":value": true,
            },
          },
          "Workdays"
        );
      } else {
        // Remove workday and all associated time slots
        const transactItems: any[] = [];

        // Remove workday
        transactItems.push({
          Update: {
            Key: {
              PK: userId,
              SK: `WORKDAYS#${year}`,
            },
            UpdateExpression: "REMOVE Workdays.#date",
            ExpressionAttributeNames: {
              "#date": date,
            },
          },
        });

        // Get and remove all time slots for this date
        const timeSlots = await this.getTimeSlots(userId, date, date);
        timeSlots.forEach((slot) => {
          transactItems.push({
            Delete: {
              Key: {
                PK: userId,
                SK: `${slot.date}#${slot.grantId}`,
              },
            },
          });
        });

        // Execute transaction
        await transactWrite({ TransactItems: transactItems });
      }
    } catch (error) {
      console.error("Failed to toggle workday:", error);
      throw new ApiError("Failed to toggle workday");
    }
  }

  // Add bulk workdays
  static async addBulkWorkdays(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<void> {
    await delay(300);

    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const year = start.getFullYear();

      // Generate workdays (excluding weekends)
      const workdays: Record<string, boolean> = {};
      const currentDate = new Date(start);

      while (currentDate <= end) {
        const dayOfWeek = currentDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          // Not Sunday or Saturday
          const dateStr = currentDate.toISOString().split("T")[0];
          workdays[dateStr] = true;
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Update workdays record
      const updateExpressions: string[] = [];
      const attributeNames: Record<string, string> = {};
      const attributeValues: Record<string, any> = {};

      Object.keys(workdays).forEach((date, index) => {
        const nameKey = `#date${index}`;
        const valueKey = `:value${index}`;
        updateExpressions.push(`Workdays.${nameKey} = ${valueKey}`);
        attributeNames[nameKey] = date;
        attributeValues[valueKey] = true;
      });

      if (updateExpressions.length > 0) {
        await updateItem(
          {
            Key: {
              PK: userId,
              SK: `WORKDAYS#${year}`,
            },
            UpdateExpression: `SET ${updateExpressions.join(", ")}`,
            ExpressionAttributeNames: attributeNames,
            ExpressionAttributeValues: attributeValues,
          },
          "Workdays"
        );
      }
    } catch (error) {
      console.error("Failed to add bulk workdays:", error);
      throw new ApiError("Failed to add bulk workdays");
    }
  }

  // Personnel management methods
  static async getAllPersonnel(): Promise<Personnel[]> {
    await delay(200);

    try {
      const result = await query(
        {
          KeyConditionExpression: "PK = :pk",
          ExpressionAttributeValues: {
            ":pk": "PERSONNEL",
          },
        },
        "Personnel"
      );

      return result.Items.map((item: any) => {
        const dynamoItem = item as DynamoPersonnelItem;
        return {
          id: dynamoItem.SK,
          firstName: dynamoItem.FirstName,
          lastName: dynamoItem.LastName,
          annualGrossSalary: dynamoItem.AnnualGrossSalary,
          pension: dynamoItem.Pension,
          nationalInsurance: dynamoItem.NationalInsurance,
        };
      });
    } catch (error) {
      console.error("Failed to get personnel:", error);
      throw new ApiError("Failed to retrieve personnel");
    }
  }

  static async createPersonnel(
    personnel: Omit<Personnel, "id">
  ): Promise<Personnel> {
    await delay(300);

    try {
      const id = `PERSON-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      const personnelItem: DynamoPersonnelItem = {
        PK: "PERSONNEL",
        SK: id,
        FirstName: personnel.firstName,
        LastName: personnel.lastName,
        AnnualGrossSalary: personnel.annualGrossSalary,
        Pension: personnel.pension,
        NationalInsurance: personnel.nationalInsurance,
      };

      await putItem(
        {
          Item: personnelItem,
          ConditionExpression: "attribute_not_exists(PK)",
        },
        "Personnel"
      );

      return { id, ...personnel };
    } catch (error) {
      console.error("Failed to create personnel:", error);
      throw new ApiError("Failed to create personnel");
    }
  }

  // Grant management methods
  static async getAllGrants(): Promise<Grant[]> {
    await delay(200);

    try {
      const result = await query(
        {
          KeyConditionExpression: "PK = :pk",
          ExpressionAttributeValues: {
            ":pk": "GRANTS",
          },
        },
        "Grants"
      );

      return result.Items.map((item: any) => {
        const dynamoItem = item as DynamoGrantItem;
        return {
          id: dynamoItem.SK,
          name: dynamoItem.Name,
          color: dynamoItem.Color,
          description: dynamoItem.Description,
        };
      });
    } catch (error) {
      console.error("Failed to get grants:", error);
      throw new ApiError("Failed to retrieve grants");
    }
  }

  static async createGrant(grant: Omit<Grant, "id">): Promise<Grant> {
    await delay(300);

    try {
      const id = `GRANT-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      const grantItem: DynamoGrantItem = {
        PK: "GRANTS",
        SK: id,
        Name: grant.name,
        Color: grant.color,
        Description: grant.description || "",
      };

      await putItem(
        {
          Item: grantItem,
          ConditionExpression: "attribute_not_exists(PK)",
        },
        "Grants"
      );

      return { id, ...grant };
    } catch (error) {
      console.error("Failed to create grant:", error);
      throw new ApiError("Failed to create grant");
    }
  }
}
