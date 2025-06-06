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

// Initialize mock data - start completely empty
// Users will add workdays by clicking dates
console.log("Initializing empty mock data");
