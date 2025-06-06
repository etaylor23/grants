import React, { useState, useMemo, useCallback } from "react";
import {
  ReactGrid,
  Column,
  Row,
  HeaderCell,
  TextCell,
  NumberCell,
} from "@silevis/reactgrid";
import "@silevis/reactgrid/styles.css";
import { Box, Card, Typography, Alert, Snackbar } from "@mui/material";
import { useTimeSlots, useBatchUpdateTimeSlots } from "../../api/hooks";
import { mockGrants } from "../../api/mockData";
import { TimeSlot, TimeSlotBatch, ApiError } from "../../models/types";
import { format, eachDayOfInterval, startOfMonth, endOfMonth } from "date-fns";

interface TimesheetGridProps {
  userId: string;
}

export const TimesheetGrid: React.FC<TimesheetGridProps> = ({ userId }) => {
  const [error, setError] = useState<string | null>(null);
  const currentDate = new Date();
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const { data: timeSlots = [], refetch } = useTimeSlots(
    userId,
    format(monthStart, "yyyy-MM-dd"),
    format(monthEnd, "yyyy-MM-dd")
  );

  const batchUpdateMutation = useBatchUpdateTimeSlots();

  // Create grid structure
  const columns: Column[] = useMemo(() => {
    const cols: Column[] = [{ columnId: "grant", width: 150 }];

    monthDays.forEach((day) => {
      cols.push({
        columnId: format(day, "yyyy-MM-dd"),
        width: 80,
      });
    });

    return cols;
  }, [monthDays]);

  const rows: Row[] = useMemo(() => {
    const headerRow: Row = {
      rowId: "header",
      cells: [
        { type: "header", text: "Grant" } as HeaderCell,
        ...monthDays.map(
          (day) =>
            ({
              type: "header",
              text: format(day, "dd"),
            } as HeaderCell)
        ),
      ],
    };

    const grantRows: Row[] = mockGrants.map((grant) => {
      const cells: (TextCell | NumberCell)[] = [
        { type: "text", text: grant.name } as TextCell,
      ];

      monthDays.forEach((day) => {
        const dateStr = format(day, "yyyy-MM-dd");
        const slot = timeSlots.find(
          (s) => s.date === dateStr && s.grantId === grant.id
        );

        cells.push({
          type: "number",
          value: slot?.allocationPercent || 0,
          date: dateStr,
          grantId: grant.id,
        } as NumberCell & { date: string; grantId: string });
      });

      return {
        rowId: grant.id,
        cells,
      };
    });

    // Add total row
    const totalRow: Row = {
      rowId: "total",
      cells: [
        { type: "header", text: "Total %" } as HeaderCell,
        ...monthDays.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const daySlots = timeSlots.filter((s) => s.date === dateStr);
          const total = daySlots.reduce(
            (sum, slot) => sum + slot.allocationPercent,
            0
          );

          return {
            type: "text",
            text: `${total}%`,
          } as TextCell;
        }),
      ],
    };

    return [headerRow, ...grantRows, totalRow];
  }, [monthDays, timeSlots]);

  const handleChanges = useCallback(
    async (changes: any[]) => {
      const batch: TimeSlotBatch = {
        create: [],
        update: [],
        delete: [],
      };

      for (const change of changes) {
        const cell = change.newCell as NumberCell & {
          date?: string;
          grantId?: string;
        };

        if (cell.type === "number" && cell.date && cell.grantId) {
          const newValue = cell.value || 0;
          const existingSlot = timeSlots.find(
            (s) => s.date === cell.date && s.grantId === cell.grantId
          );

          if (newValue === 0 && existingSlot) {
            // Delete slot
            batch.delete!.push({
              userId,
              date: cell.date,
              grantId: cell.grantId,
            });
          } else if (newValue > 0) {
            const slot: TimeSlot = {
              userId,
              date: cell.date,
              grantId: cell.grantId,
              allocationPercent: newValue,
            };

            if (existingSlot) {
              batch.update!.push(slot);
            } else {
              batch.create!.push(slot);
            }
          }
        }
      }

      try {
        await batchUpdateMutation.mutateAsync(batch);
        await refetch();
      } catch (err: any) {
        const apiError = err as ApiError;
        setError(apiError.message || "Failed to update time slots");
      }
    },
    [timeSlots, userId, batchUpdateMutation, refetch]
  );

  const handleCloseError = () => {
    setError(null);
  };

  return (
    <Card sx={{ p: 2, height: "100%" }}>
      <Typography variant="h6" gutterBottom>
        Timesheet Grid - {format(currentDate, "MMMM yyyy")}
      </Typography>

      <Box sx={{ height: "calc(100% - 80px)", overflow: "auto" }}>
        <ReactGrid
          rows={rows}
          columns={columns}
          onCellsChanged={handleChanges}
          enableRangeSelection
          enableRowSelection
          enableFillHandle
        />
      </Box>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={handleCloseError}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseError}
          severity="error"
          sx={{ width: "100%" }}
        >
          {error}
        </Alert>
      </Snackbar>
    </Card>
  );
};
