import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiClient } from "./client";
import { TimeSlotBatch, ApiError } from "../models/types";

export const useWorkdays = (userId: string, year: number) => {
  return useQuery({
    queryKey: ["workdays", userId, year],
    queryFn: () => ApiClient.getWorkdays(userId, year),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useTimeSlots = (
  userId: string,
  startDate: string,
  endDate: string
) => {
  return useQuery({
    queryKey: ["timeslots", userId, startDate, endDate],
    queryFn: () => ApiClient.getTimeSlots(userId, startDate, endDate),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useBatchUpdateTimeSlots = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (batch: TimeSlotBatch) => ApiClient.batchUpdateTimeSlots(batch),
    onSuccess: (_, batch) => {
      // Invalidate all timeslot queries
      queryClient.invalidateQueries({ queryKey: ["timeslots"] });

      // Also invalidate workdays for affected users since time slot changes
      // can affect the calendar view (percentage allocations)
      const affectedUsers = new Set<string>();

      // Collect all affected user IDs from the batch operations
      if (batch.create) {
        batch.create.forEach((slot) => affectedUsers.add(slot.userId));
      }
      if (batch.update) {
        batch.update.forEach((slot) => affectedUsers.add(slot.userId));
      }
      if (batch.delete) {
        batch.delete.forEach((slot) => affectedUsers.add(slot.userId));
      }

      // Invalidate workdays for all affected users
      affectedUsers.forEach((userId) => {
        const currentYear = new Date().getFullYear();
        queryClient.invalidateQueries({
          queryKey: ["workdays", userId, currentYear],
        });
      });
    },
    onError: (error: ApiError) => {
      console.error("Batch update failed:", error);
    },
  });
};

export const useToggleWorkday = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      date,
      isWorkday,
    }: {
      userId: string;
      date: string;
      isWorkday: boolean;
    }) => ApiClient.toggleWorkday(userId, date, isWorkday),
    onMutate: async (variables) => {
      const year = new Date(variables.date).getFullYear();
      const queryKey = ["workdays", variables.userId, year];

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousWorkdays = queryClient.getQueryData(queryKey);

      // Optimistically update to the new value
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) {
          return {
            userId: variables.userId,
            year,
            workdays: variables.isWorkday ? { [variables.date]: true } : {},
          };
        }

        const newWorkdays = { ...old.workdays };
        if (variables.isWorkday) {
          newWorkdays[variables.date] = true;
        } else {
          delete newWorkdays[variables.date];
        }

        return {
          ...old,
          workdays: newWorkdays,
        };
      });

      return { previousWorkdays };
    },
    onError: (err, variables, context) => {
      const year = new Date(variables.date).getFullYear();
      const queryKey = ["workdays", variables.userId, year];

      // Rollback on error
      if (context?.previousWorkdays) {
        queryClient.setQueryData(queryKey, context.previousWorkdays);
      }
    },
    onSettled: (_, __, variables) => {
      const year = new Date(variables.date).getFullYear();
      // Always refetch after error or success to ensure we have the latest data
      queryClient.invalidateQueries({
        queryKey: ["workdays", variables.userId, year],
      });
    },
  });
};

export const useAddBulkWorkdays = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      startDate,
      endDate,
    }: {
      userId: string;
      startDate: string;
      endDate: string;
    }) => ApiClient.addBulkWorkdays(userId, startDate, endDate),
    onSuccess: (_, variables) => {
      const year = new Date(variables.startDate).getFullYear();
      // Invalidate workdays for the affected user
      queryClient.invalidateQueries({
        queryKey: ["workdays", variables.userId, year],
      });
      // Also invalidate timeslots to ensure consistency
      queryClient.invalidateQueries({
        queryKey: ["timeslots", variables.userId],
      });
    },
    onError: (error) => {
      console.error("Bulk workday addition failed:", error);
    },
  });
};
