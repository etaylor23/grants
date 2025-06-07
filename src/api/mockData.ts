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

// Generate mock workdays for current year - start with empty workdays
const generateMockWorkdays = (
  userId: string,
  year: number
): Record<string, boolean> => {
  const workdays: Record<string, boolean> = {};
  // Start with no workdays - users will add them by clicking dates
  return workdays;
};

// Generate mock time slots - start with empty slots
const generateMockTimeSlots = (userId: string): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  // Start with no time slots - users will add workdays and allocations
  return slots;
};

export const mockWorkdays: Record<string, Workday> = {};
export const mockTimeSlots: TimeSlot[] = [];

// Add some sample data for demonstration
const currentDate = new Date();
const currentMonth = currentDate.getMonth();
const currentYear = currentDate.getFullYear();

// Add some sample workdays for the current month
const sampleWorkdays = [
  `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-15`,
  `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-16`,
  `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-17`,
];

// Initialize workdays for all users
mockUsers.forEach((user) => {
  const key = `${user.id}-${currentYear}`;
  mockWorkdays[key] = {
    userId: user.id,
    year: currentYear,
    workdays: {},
  };

  // Add sample workdays
  sampleWorkdays.forEach((date) => {
    mockWorkdays[key].workdays[date] = true;
  });
});

// Add some sample time slots
sampleWorkdays.forEach((date) => {
  // Alice Johnson allocations
  mockTimeSlots.push(
    { userId: "user1", date, grantId: "grant1", allocationPercent: 40 },
    { userId: "user1", date, grantId: "grant2", allocationPercent: 30 },
    { userId: "user1", date, grantId: "grant3", allocationPercent: 30 }
  );

  // Bob Smith allocations
  mockTimeSlots.push(
    { userId: "user2", date, grantId: "grant1", allocationPercent: 60 },
    { userId: "user2", date, grantId: "grant2", allocationPercent: 40 }
  );

  // Carol Davis allocations
  mockTimeSlots.push(
    { userId: "user3", date, grantId: "grant2", allocationPercent: 50 },
    { userId: "user3", date, grantId: "grant3", allocationPercent: 25 },
    { userId: "user3", date, grantId: "grant4", allocationPercent: 25 }
  );
});

console.log("Initialized mock data with sample workdays and time slots");
