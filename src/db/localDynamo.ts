import {
  db,
  Individual,
  Grant,
  Workday,
  WorkdayHours,
  TimeSlot,
  DynamoDBKey,
  DynamoDBItem,
  QueryParams,
  PutParams,
  GetParams,
  DeleteParams,
  UpdateParams,
  BatchWriteParams,
  TransactWriteParams,
  validateAllocationPercent,
  validateHoursAllocated,
  DEFAULT_WORKDAY_HOURS,
  getHoursFromDayEntry,
} from "./schema";

// Initialize database on import
db.open().catch((err) => {
  console.error("Failed to open database:", err);
});

// DynamoDB-compatible API facade for IndexedDB
export class LocalDynamoDB {
  // Put operation - Insert/update single item
  async put(params: PutParams): Promise<void> {
    const { Item } = params;
    const tableName = this.getTableNameFromItem(Item);

    try {
      switch (tableName) {
        case "individuals":
          await db.individuals.put(Item as Individual);
          break;
        case "grants":
          await db.grants.put(Item as Grant);
          break;
        case "workdays":
          await db.workdays.put(Item as Workday);
          break;
        case "workdayHours":
          await db.workdayHours.put(Item as WorkdayHours);
          break;
        case "timeslots":
          const timeSlot = Item as TimeSlot;
          // Validate business rules before putting
          await this.validateTimeSlotConstraints(timeSlot);
          await db.timeslots.put(timeSlot);
          break;
        default:
          throw new Error(`Unknown table: ${tableName}`);
      }
    } catch (error) {
      throw new Error(`Put operation failed: ${error}`);
    }
  }

  // Get operation - Retrieve single item by key
  async get(params: GetParams): Promise<{ Item?: DynamoDBItem }> {
    const { Key } = params;
    const tableName = this.getTableNameFromKey(Key);

    try {
      let item: any;

      switch (tableName) {
        case "individuals":
          item = await db.individuals.get(Key.PK);
          break;
        case "grants":
          item = await db.grants.get(Key.PK);
          break;
        case "workdays":
          item = await db.workdays.get([Key.PK, Key.SK!]);
          break;
        case "workdayHours":
          item = await db.workdayHours.get([Key.PK, Key.SK!]);
          break;
        case "timeslots":
          item = await db.timeslots.get([Key.PK, Key.SK!]);
          break;
        default:
          throw new Error(`Unknown table for key: ${JSON.stringify(Key)}`);
      }

      return item ? { Item: item } : {};
    } catch (error) {
      throw new Error(`Get operation failed: ${error}`);
    }
  }

  // Delete operation - Delete single item
  async deleteItem(params: DeleteParams): Promise<void> {
    const { Key } = params;
    const tableName = this.getTableNameFromKey(Key);

    try {
      switch (tableName) {
        case "individuals":
          await db.individuals.delete(Key.PK);
          break;
        case "grants":
          await db.grants.delete(Key.PK);
          break;
        case "workdays":
          await db.workdays.delete([Key.PK, Key.SK!]);
          break;
        case "workdayHours":
          await db.workdayHours.delete([Key.PK, Key.SK!]);
          break;
        case "timeslots":
          await db.timeslots.delete([Key.PK, Key.SK!]);
          break;
        default:
          throw new Error(`Unknown table for key: ${JSON.stringify(Key)}`);
      }
    } catch (error) {
      throw new Error(`Delete operation failed: ${error}`);
    }
  }

  // Query operation - Query with partition key + optional sort key range
  async query(params: QueryParams): Promise<{ Items: DynamoDBItem[] }> {
    try {
      // For simplicity, we'll handle basic queries
      // In a real implementation, you'd parse the KeyConditionExpression

      // Get all items from a table based on the query
      let items: any[] = [];

      // This is a simplified implementation
      // You would need to implement proper query parsing for production

      return { Items: items };
    } catch (error) {
      throw new Error(`Query operation failed: ${error}`);
    }
  }

  // Batch write operation
  async batchWrite(params: BatchWriteParams): Promise<void> {
    const { RequestItems } = params;

    try {
      await db.transaction(
        "rw",
        [db.individuals, db.grants, db.workdays, db.workdayHours, db.timeslots],
        async () => {
          for (const [, requests] of Object.entries(RequestItems)) {
            for (const request of requests) {
              if (request.PutRequest) {
                await this.put({ Item: request.PutRequest.Item });
              } else if (request.DeleteRequest) {
                await this.deleteItem({ Key: request.DeleteRequest.Key });
              }
            }
          }
        }
      );
    } catch (error) {
      throw new Error(`Batch write operation failed: ${error}`);
    }
  }

  // Transaction write operation - Atomic multi-item transactions
  async transactWrite(params: TransactWriteParams): Promise<void> {
    const { TransactItems } = params;

    try {
      await db.transaction(
        "rw",
        [db.individuals, db.grants, db.workdays, db.workdayHours, db.timeslots],
        async () => {
          for (const item of TransactItems) {
            if (item.Put) {
              await this.put({ Item: item.Put.Item });
            } else if (item.Delete) {
              await this.deleteItem({ Key: item.Delete.Key });
            } else if (item.Update) {
              await this.update(item.Update);
            }
          }
        }
      );
    } catch (error) {
      throw new Error(`Transaction write operation failed: ${error}`);
    }
  }

  // Update operation - Update item with expressions
  async update(params: UpdateParams): Promise<void> {
    const { Key, UpdateExpression, ExpressionAttributeValues } = params;

    try {
      // Get existing item
      const result = await this.get({ Key });
      if (!result.Item) {
        throw new Error("Item not found for update");
      }

      // Apply update expression (simplified implementation)
      const updatedItem = this.applyUpdateExpression(
        result.Item,
        UpdateExpression!,
        ExpressionAttributeValues!
      );

      // Put updated item
      await this.put({ Item: updatedItem });
    } catch (error) {
      throw new Error(`Update operation failed: ${error}`);
    }
  }

  // Helper methods
  private getTableNameFromItem(item: DynamoDBItem): string {
    // Determine table based on item structure
    if ("FirstName" in item && "LastName" in item) return "individuals";
    if ("Title" in item && "StartDate" in item) return "grants";
    if ("Workdays" in item) return "workdays";
    if ("Hours" in item) return "workdayHours";
    if ("AllocationPercent" in item || "HoursAllocated" in item)
      return "timeslots";

    throw new Error("Cannot determine table from item structure");
  }

  private getTableNameFromKey(key: DynamoDBKey): string {
    if (!key.SK) return key.PK.startsWith("U-") ? "individuals" : "grants";

    if (key.SK.startsWith("WORKDAYS#")) return "workdays";
    if (key.SK.startsWith("WORKDAY_HOURS#")) return "workdayHours";
    if (key.SK.includes("#G-")) return "timeslots";

    throw new Error("Cannot determine table from key structure");
  }

  private applyUpdateExpression(
    item: DynamoDBItem,
    expression: string,
    values: Record<string, any>
  ): DynamoDBItem {
    // Simplified update expression parser
    const updated = { ...item };

    // Handle SET operations
    if (expression.includes("SET")) {
      const setClause = expression
        .split("SET")[1]
        .split("ADD")[0]
        .split("REMOVE")[0]
        .trim();
      const assignments = setClause.split(",");

      for (const assignment of assignments) {
        const [attr, valueRef] = assignment.split("=").map((s) => s.trim());
        if (values[valueRef]) {
          updated[attr] = values[valueRef];
        }
      }
    }

    return updated;
  }

  private async validateTimeSlotConstraints(timeSlot: TimeSlot): Promise<void> {
    // Get all existing time slots for the same user and date
    const existingSlots = await db.timeslots
      .where("PK")
      .equals(timeSlot.PK)
      .and((item) => item.Date === timeSlot.Date && item.SK !== timeSlot.SK)
      .toArray();

    // Add the new slot for validation
    const allSlots = [...existingSlots, timeSlot];

    // Validate percentage constraint
    if (!validateAllocationPercent(allSlots)) {
      throw new Error("Total allocation percentage cannot exceed 100%");
    }

    // Get available hours for the date
    const year = new Date(timeSlot.Date).getFullYear();
    const workdayHours = await db.workdayHours.get([
      timeSlot.PK,
      `WORKDAY_HOURS#${year}`,
    ]);
    const workdayEntry = workdayHours?.Hours[timeSlot.Date];
    const availableHours = workdayEntry
      ? getHoursFromDayEntry(workdayEntry)
      : DEFAULT_WORKDAY_HOURS;

    // Validate hours constraint
    if (!validateHoursAllocated(allSlots, availableHours)) {
      throw new Error(
        `Total allocated hours cannot exceed ${availableHours} hours for this day`
      );
    }
  }
}

// Export singleton instance
export const localDynamo = new LocalDynamoDB();
