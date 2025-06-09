// Simplified hooks for build compatibility
import { useQuery } from '@tanstack/react-query';

// Mock data for testing
const mockIndividuals = [
  {
    PK: "U-12345",
    FirstName: "Ellis",
    LastName: "Taylor",
    AnnualGross: 48000,
    Pension: 1450,
    NationalIns: 5000
  },
  {
    PK: "U-67890",
    FirstName: "Sarah",
    LastName: "Johnson",
    AnnualGross: 52000,
    Pension: 1560,
    NationalIns: 5200
  },
  {
    PK: "U-11111",
    FirstName: "Michael",
    LastName: "Chen",
    AnnualGross: 45000,
    Pension: 1350,
    NationalIns: 4800
  }
];

const mockGrants = [
  {
    PK: "G-001",
    Title: "Digital Health Innovation Project",
    StartDate: "2024-10-01",
    EndDate: "2025-09-30",
    ManagerUserID: "U-12345"
  },
  {
    PK: "G-002",
    Title: "AI Research Initiative",
    StartDate: "2024-12-01",
    EndDate: "2025-11-30",
    ManagerUserID: "U-67890"
  },
  {
    PK: "G-003",
    Title: "Sustainable Technology Development",
    StartDate: "2025-01-01",
    EndDate: "2025-12-31",
    ManagerUserID: "U-11111"
  }
];

export const useIndividuals = () => {
  return useQuery({
    queryKey: ['individuals'],
    queryFn: async () => mockIndividuals,
    staleTime: 5 * 60 * 1000,
  });
};

export const useGrants = () => {
  return useQuery({
    queryKey: ['grants'],
    queryFn: async () => mockGrants,
    staleTime: 5 * 60 * 1000,
  });
};

export const useWorkdayHours = (userId: string, year: number) => {
  return useQuery({
    queryKey: ['workdayHours', userId, year],
    queryFn: async () => ({}),
    enabled: false,
  });
};

export const useTimeSlots = (userId: string, startDate: string, endDate: string) => {
  return useQuery({
    queryKey: ['timeslots', userId, startDate, endDate],
    queryFn: async () => [],
    enabled: false,
  });
};

export const useSaveSlots = () => {
  return {
    mutate: () => {},
    mutateAsync: async () => {},
    isPending: false,
  };
};
