// IndexedDB data hooks for local storage
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const useIndividuals = (organisationId?: string) => {
  return useQuery({
    queryKey: ['individuals', organisationId],
    queryFn: async () => {
      const { db } = await import('../db/schema');
      let individuals = await db.individuals.toArray();

      // Filter by organisation if specified
      if (organisationId) {
        individuals = individuals.filter(individual => individual.OrganisationID === organisationId);
      }

      console.log('Loaded individuals from IndexedDB:', individuals);
      return individuals;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useOrganisations = () => {
  return useQuery({
    queryKey: ['organisations'],
    queryFn: async () => {
      const { db } = await import('../db/schema');
      const organisations = await db.organisations.toArray();
      console.log('Loaded organisations from IndexedDB:', organisations);
      return organisations;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useGrants = (organisationId?: string) => {
  return useQuery({
    queryKey: ['grants', organisationId],
    queryFn: async () => {
      const { db } = await import('../db/schema');
      let grants = await db.grants.toArray();

      // Filter by organisation if specified
      if (organisationId) {
        grants = grants.filter(grant => grant.OrganisationID === organisationId);
      }

      console.log('Loaded grants from IndexedDB:', grants);
      return grants;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useWorkdayHours = (userId: string, year: number) => {
  return useQuery({
    queryKey: ['workdayHours', userId, year],
    queryFn: async () => {
      const { db, generateWorkdayHoursKey } = await import('../db/schema');

      const result = await db.workdayHours.get([userId, generateWorkdayHoursKey(userId, year)]);
      return result?.Hours || {};
    },
    enabled: !!userId && !!year,
    staleTime: 2 * 60 * 1000, // 2 minutes
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
      organisationId: string;
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
        OrganisationID: userData.organisationId,
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

// Hook to create a new organisation
export const useCreateOrganisation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (organisationData: {
      name: string;
      companyNumber: string;
    }) => {
      const { db } = await import('../db/schema');

      // Generate a new organisation ID
      const timestamp = Date.now();
      const organisationId = `ORG-${timestamp}`;

      const organisation = {
        PK: organisationId,
        Name: organisationData.name,
        CompanyNumber: organisationData.companyNumber,
        CreatedDate: new Date().toISOString(),
      };

      await db.organisations.put(organisation);
      return organisationId;
    },
    onSuccess: () => {
      // Invalidate organisations query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['organisations'] });
    },
    onError: (error) => {
      console.error('Create organisation failed:', error);
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
      organisationId: string;
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
        OrganisationID: grantData.organisationId,
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
