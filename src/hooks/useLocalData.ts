// Simplified hooks for build compatibility
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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
    queryFn: async () => {
      const { db } = await import('../db/schema');

      // Get all time slots for the user
      const allSlots = await db.timeslots.where('PK').equals(userId).toArray();

      // Filter by date range
      return allSlots.filter(slot =>
        slot.Date >= startDate && slot.Date <= endDate
      );
    },
    enabled: !!userId && !!startDate && !!endDate,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

export const useSaveSlots = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (batchData: {
      userId: string;
      operations: Array<{
        type: 'put' | 'delete';
        timeSlot?: any;
        date?: string;
        grantId?: string;
      }>;
    }) => {
      const { db, generateTimeSlotKey } = await import('../db/schema');
      const { userId, operations } = batchData;

      // Execute operations in a transaction
      await db.transaction('rw', [db.timeslots], async () => {
        for (const op of operations) {
          if (op.type === 'put' && op.timeSlot) {
            const timeSlot = {
              PK: userId,
              SK: generateTimeSlotKey(op.timeSlot.Date || op.timeSlot.date, op.timeSlot.GrantID || op.timeSlot.grantId),
              AllocationPercent: op.timeSlot.AllocationPercent || op.timeSlot.allocationPercent || 0,
              HoursAllocated: op.timeSlot.HoursAllocated || op.timeSlot.hoursAllocated || 0,
              Date: op.timeSlot.Date || op.timeSlot.date,
              GrantID: op.timeSlot.GrantID || op.timeSlot.grantId,
              UserID: userId
            };

            await db.timeslots.put(timeSlot);
          } else if (op.type === 'delete' && op.date && op.grantId) {
            const sk = generateTimeSlotKey(op.date, op.grantId);
            await db.timeslots.delete([userId, sk]);
          }
        }
      });
    },
    onSuccess: (_, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['timeslots', variables.userId] });
    },
    onError: (error) => {
      console.error('Save slots failed:', error);
    },
  });
};

// Hook to create a new user
export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userData: {
      firstName: string;
      lastName: string;
      annualGross: number;
      pension: number;
      nationalIns: number;
    }) => {
      const { db } = await import('../db/schema');

      // Generate a new user ID
      const timestamp = Date.now();
      const userId = `U-${timestamp}`;

      const individual = {
        PK: userId,
        FirstName: userData.firstName,
        LastName: userData.lastName,
        AnnualGross: userData.annualGross,
        Pension: userData.pension,
        NationalIns: userData.nationalIns,
      };

      await db.individuals.put(individual);
      return userId;
    },
    onSuccess: () => {
      // Invalidate individuals query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['individuals'] });
    },
    onError: (error) => {
      console.error('Create user failed:', error);
    },
  });
};

// Hook to create a new grant
export const useCreateGrant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (grantData: {
      title: string;
      startDate: string;
      endDate: string;
      managerUserId: string;
    }) => {
      const { db } = await import('../db/schema');

      // Generate a new grant ID
      const timestamp = Date.now();
      const grantId = `G-${timestamp}`;

      const grant = {
        PK: grantId,
        Title: grantData.title,
        StartDate: grantData.startDate,
        EndDate: grantData.endDate,
        ManagerUserID: grantData.managerUserId,
      };

      await db.grants.put(grant);
      return grantId;
    },
    onSuccess: () => {
      // Invalidate grants query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['grants'] });
    },
    onError: (error) => {
      console.error('Create grant failed:', error);
    },
  });
};
