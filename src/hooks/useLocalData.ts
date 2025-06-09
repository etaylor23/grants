// Simplified hooks for build compatibility
import { useQuery } from '@tanstack/react-query';

export const useIndividuals = () => {
  return useQuery({
    queryKey: ['individuals'],
    queryFn: async () => [],
    enabled: false,
  });
};

export const useGrants = () => {
  return useQuery({
    queryKey: ['grants'],
    queryFn: async () => [],
    enabled: false,
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
