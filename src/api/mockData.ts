import { User, Grant, Workday, TimeSlot } from "../models/types";

export const mockUsers: User[] = [
  { id: "user1", name: "Alice Johnson", email: "alice@company.com" },
  { id: "user2", name: "Bob Smith", email: "bob@company.com" },
  { id: "user3", name: "Carol Davis", email: "carol@company.com" },
];

export const mockGrants: Grant[] = [
  {
    id: "grant1",
    name: "Research Project A",
    color: "#1976d2",
    description: "AI Research Initiative",
  },
  {
    id: "grant2",
    name: "Development Grant B",
    color: "#388e3c",
    description: "Software Development",
  },
  {
    id: "grant3",
    name: "Training Program C",
    color: "#f57c00",
    description: "Staff Training",
  },
  {
    id: "grant4",
    name: "Vacation",
    color: "#d32f2f",
    description: "Personal Time Off",
  },
];

// Helper functions for generating mock data (currently unused but kept for future use)
// const generateMockWorkdays = (
//   userId: string,
//   year: number
// ): Record<string, boolean> => {
//   const workdays: Record<string, boolean> = {};
//   // Start with no workdays - users will add them by clicking dates
//   return workdays;
// };

// const generateMockTimeSlots = (userId: string): TimeSlot[] => {
//   const slots: TimeSlot[] = [];
//   // Start with no time slots - users will add workdays and allocations
//   return slots;
// };

export const mockWorkdays: Record<string, Workday> = {};
export const mockTimeSlots: TimeSlot[] = [];

// Add some sample data for demonstration
const currentDate = new Date();
const currentMonth = currentDate.getMonth();
const currentYear = currentDate.getFullYear();

// Generate sample workdays for a specific month (weekdays only)
const generateMonthWorkdays = (year: number, month: number) => {
  const workdays: string[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();

    // Only include weekdays (Monday-Friday)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
        day
      ).padStart(2, "0")}`;
      workdays.push(dateStr);
    }
  }

  return workdays;
};

// Generate workdays for multiple months to provide comprehensive test data
const sampleWorkdays = [
  ...generateMonthWorkdays(currentYear, currentMonth), // Current month (December 2024)
  ...generateMonthWorkdays(2025, 5), // June 2025 (month index 5)
  ...generateMonthWorkdays(2025, 0), // January 2025 (month index 0)
  ...generateMonthWorkdays(2025, 1), // February 2025 (month index 1)
];

// Initialize workdays for all users across multiple years
mockUsers.forEach((user) => {
  // Initialize for 2024
  const key2024 = `${user.id}-${currentYear}`;
  mockWorkdays[key2024] = {
    userId: user.id,
    year: currentYear,
    workdays: {},
  };

  // Initialize for 2025
  const key2025 = `${user.id}-2025`;
  mockWorkdays[key2025] = {
    userId: user.id,
    year: 2025,
    workdays: {},
  };

  // Add sample workdays to appropriate years
  sampleWorkdays.forEach((date) => {
    const year = parseInt(date.split("-")[0]);
    const key = `${user.id}-${year}`;
    if (mockWorkdays[key]) {
      mockWorkdays[key].workdays[date] = true;
    }
  });
});

// Add some sample time slots
sampleWorkdays.forEach((date) => {
  // Alice Johnson allocations
  mockTimeSlots.push(
    {
      userId: "user1",
      date,
      grantId: "grant1",
      allocationPercent: 40,
      totalHours: 8.0,
    },
    {
      userId: "user1",
      date,
      grantId: "grant2",
      allocationPercent: 30,
      totalHours: 8.0,
    },
    {
      userId: "user1",
      date,
      grantId: "grant3",
      allocationPercent: 30,
      totalHours: 8.0,
    }
  );

  // Bob Smith allocations
  mockTimeSlots.push(
    {
      userId: "user2",
      date,
      grantId: "grant1",
      allocationPercent: 60,
      totalHours: 7.5,
    },
    {
      userId: "user2",
      date,
      grantId: "grant2",
      allocationPercent: 40,
      totalHours: 7.5,
    }
  );

  // Carol Davis allocations
  mockTimeSlots.push(
    {
      userId: "user3",
      date,
      grantId: "grant2",
      allocationPercent: 50,
      totalHours: 8.5,
    },
    {
      userId: "user3",
      date,
      grantId: "grant3",
      allocationPercent: 25,
      totalHours: 8.5,
    },
    {
      userId: "user3",
      date,
      grantId: "grant4",
      allocationPercent: 25,
      totalHours: 8.5,
    }
  );
});

console.log("Initialized mock data with sample workdays and time slots");
console.log(
  `Generated ${sampleWorkdays.length} workdays:`,
  sampleWorkdays.slice(0, 5),
  "..."
);
console.log(`Generated ${mockTimeSlots.length} time slots`);
console.log("Sample time slots:", mockTimeSlots.slice(0, 3));
