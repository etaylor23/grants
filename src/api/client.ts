import { Workday, TimeSlot, TimeSlotBatch, WorkdayHours, WorkdayHoursBatch } from "../models/types";
import { mockWorkdays, mockTimeSlots, mockWorkdayHours } from "./mockData";
import { DEFAULT_WORKDAY_HOURS } from "../utils/dateUtils";

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

  static async batchUpdateTimeSlots(batch: TimeSlotBatch): Promise<void> {
    await delay(400);

    // Apply changes - validation is now handled in the frontend
    if (batch.create) {
      for (const slot of batch.create) {
        mockTimeSlots.push(slot);
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
          mockTimeSlots[index] = updatedSlot;
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

  static async getWorkdayHours(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<WorkdayHours[]> {
    await delay(200);

    const start = new Date(startDate);
    const end = new Date(endDate);

    return mockWorkdayHours.filter((hours) => {
      if (hours.userId !== userId) return false;
      const hoursDate = new Date(hours.date);
      return hoursDate >= start && hoursDate <= end;
    });
  }

  static async batchUpdateWorkdayHours(batch: WorkdayHoursBatch): Promise<void> {
    await delay(300);

    if (batch.create) {
      for (const hours of batch.create) {
        // Remove existing entry if it exists
        const existingIndex = mockWorkdayHours.findIndex(
          (h) => h.userId === hours.userId && h.date === hours.date
        );
        if (existingIndex !== -1) {
          mockWorkdayHours.splice(existingIndex, 1);
        }
        mockWorkdayHours.push(hours);
      }
    }

    if (batch.update) {
      for (const hours of batch.update) {
        const existingIndex = mockWorkdayHours.findIndex(
          (h) => h.userId === hours.userId && h.date === hours.date
        );
        if (existingIndex !== -1) {
          mockWorkdayHours[existingIndex] = hours;
        } else {
          mockWorkdayHours.push(hours);
        }
      }
    }

    if (batch.delete) {
      for (const deleteSpec of batch.delete) {
        const index = mockWorkdayHours.findIndex(
          (h) => h.userId === deleteSpec.userId && h.date === deleteSpec.date
        );
        if (index !== -1) {
          mockWorkdayHours.splice(index, 1);
        }
      }
    }
  }

  static async createDefaultWorkdayHours(
    userId: string,
    date: string,
    availableHours: number = DEFAULT_WORKDAY_HOURS
  ): Promise<void> {
    await delay(100);

    // Check if already exists
    const existing = mockWorkdayHours.find(
      (h) => h.userId === userId && h.date === date
    );

    if (!existing) {
      mockWorkdayHours.push({
        userId,
        date,
        availableHours,
      });
    }
  }
}
