import { Workday, TimeSlot, TimeSlotBatch, ApiError } from "../models/types";
import { mockWorkdays, mockTimeSlots } from "./mockData";

// Simulate API delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Mock API client
export class ApiClient {
  static async getWorkdays(userId: string, year: number): Promise<Workday> {
    await delay(200);

    const key = `${userId}-${year}`;
    let workday = mockWorkdays[key];

    // Create empty workday record if it doesn't exist
    if (!workday) {
      workday = {
        userId,
        year,
        workdays: {},
      };
      mockWorkdays[key] = workday;
    }

    return workday;
  }

  static async getTimeSlots(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<TimeSlot[]> {
    await delay(300);

    const start = new Date(startDate);
    const end = new Date(endDate);

    return mockTimeSlots.filter((slot) => {
      if (slot.userId !== userId) return false;
      const slotDate = new Date(slot.date);
      return slotDate >= start && slotDate <= end;
    });
  }

  static async getGrantTimeSlots(
    grantId: string,
    startDate: string,
    endDate: string
  ): Promise<TimeSlot[]> {
    await delay(300);

    const start = new Date(startDate);
    const end = new Date(endDate);

    return mockTimeSlots.filter((slot) => {
      if (slot.grantId !== grantId) return false;
      const slotDate = new Date(slot.date);
      return slotDate >= start && slotDate <= end;
    });
  }

  static async batchUpdateTimeSlots(batch: TimeSlotBatch): Promise<void> {
    await delay(400);

    // Validate total allocation doesn't exceed 100% per day
    const dayTotals: Record<string, number> = {};

    // Calculate current totals
    mockTimeSlots.forEach((slot) => {
      const key = `${slot.userId}-${slot.date}`;
      dayTotals[key] = (dayTotals[key] || 0) + slot.allocationPercent;
    });

    // Apply changes and validate
    if (batch.create) {
      for (const slot of batch.create) {
        const key = `${slot.userId}-${slot.date}`;
        const newTotal = (dayTotals[key] || 0) + slot.allocationPercent;

        if (newTotal > 100) {
          const error: ApiError = {
            message: `Total allocation for ${slot.date} would exceed 100%`,
            code: "ALLOCATION_EXCEEDED",
          };
          throw error;
        }

        mockTimeSlots.push(slot);
        dayTotals[key] = newTotal;
      }
    }

    if (batch.update) {
      for (const updatedSlot of batch.update) {
        const index = mockTimeSlots.findIndex(
          (slot) =>
            slot.userId === updatedSlot.userId &&
            slot.date === updatedSlot.date &&
            slot.grantId === updatedSlot.grantId
        );

        if (index !== -1) {
          const key = `${updatedSlot.userId}-${updatedSlot.date}`;
          const oldPercent = mockTimeSlots[index].allocationPercent;
          const newTotal =
            (dayTotals[key] || 0) - oldPercent + updatedSlot.allocationPercent;

          if (newTotal > 100) {
            const error: ApiError = {
              message: `Total allocation for ${updatedSlot.date} would exceed 100%`,
              code: "ALLOCATION_EXCEEDED",
            };
            throw error;
          }

          mockTimeSlots[index] = updatedSlot;
          dayTotals[key] = newTotal;
        }
      }
    }

    if (batch.delete) {
      for (const deleteSpec of batch.delete) {
        const index = mockTimeSlots.findIndex(
          (slot) =>
            slot.userId === deleteSpec.userId &&
            slot.date === deleteSpec.date &&
            slot.grantId === deleteSpec.grantId
        );

        if (index !== -1) {
          mockTimeSlots.splice(index, 1);
        }
      }
    }
  }

  static async toggleWorkday(
    userId: string,
    date: string,
    isWorkday: boolean
  ): Promise<void> {
    console.log("API toggleWorkday called:", { userId, date, isWorkday });
    await delay(200);

    const year = new Date(date).getFullYear();
    const key = `${userId}-${year}`;
    let workdayRecord = mockWorkdays[key];

    // Create workday record if it doesn't exist
    if (!workdayRecord) {
      workdayRecord = {
        userId,
        year,
        workdays: {},
      };
      mockWorkdays[key] = workdayRecord;
    }

    if (isWorkday) {
      workdayRecord.workdays[date] = true;
      console.log(
        "Added workday:",
        date,
        "Current workdays:",
        workdayRecord.workdays
      );
    } else {
      delete workdayRecord.workdays[date];
      console.log(
        "Removed workday:",
        date,
        "Current workdays:",
        workdayRecord.workdays
      );

      // Remove all time slots for this day
      const slotsToRemove = mockTimeSlots.filter(
        (slot) => slot.userId === userId && slot.date === date
      );

      slotsToRemove.forEach((slot) => {
        const index = mockTimeSlots.indexOf(slot);
        if (index !== -1) {
          mockTimeSlots.splice(index, 1);
        }
      });
    }
  }

  static async addBulkWorkdays(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<void> {
    console.log("API addBulkWorkdays called:", { userId, startDate, endDate });
    await delay(300);

    const start = new Date(startDate);
    const end = new Date(endDate);
    const year = start.getFullYear();
    const key = `${userId}-${year}`;

    let workdayRecord = mockWorkdays[key];

    // Create workday record if it doesn't exist
    if (!workdayRecord) {
      workdayRecord = {
        userId,
        year,
        workdays: {},
      };
      mockWorkdays[key] = workdayRecord;
    }

    // Add all weekdays (Monday-Friday) in the date range
    const currentDate = new Date(start);
    let addedCount = 0;

    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay();

      // Add if it's a weekday (Monday = 1, Friday = 5)
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        const dateStr = currentDate.toISOString().split("T")[0];
        workdayRecord.workdays[dateStr] = true;
        addedCount++;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log(`Added ${addedCount} workdays for user ${userId}`);
  }
}
