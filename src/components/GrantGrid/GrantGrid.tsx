import React, { useState, useMemo, useCallback } from "react";
import {
  ReactGrid,
  Column,
  Row,
  HeaderCell,
  TextCell,
  NumberCell,
} from "@silevis/reactgrid";
import "./GrantGrid.scss";
import { Box, Typography, Alert, Snackbar } from "@mui/material";
import { useGrantTimeSlots, useBatchUpdateTimeSlots } from "../../api/hooks";
import { mockUsers } from "../../api/mockData";
import { Grant, TimeSlot, TimeSlotBatch, ApiError } from "../../models/types";
import { format, eachDayOfInterval, startOfMonth, endOfMonth } from "date-fns";

interface GrantGridProps {
  grant: Grant;
  startDate?: Date;
  endDate?: Date;
  disabledDates?: string[];
  showCard?: boolean;
  title?: string;
}

export const GrantGrid: React.FC<GrantGridProps> = ({
  grant,
  startDate,
  endDate,
  disabledDates = [],
  showCard = true,
  title,
}) => {
  const [error, setError] = useState<string | null>(null);

  const currentDate = new Date();
  const periodStart = startDate || startOfMonth(currentDate);
  const periodEnd = endDate || endOfMonth(currentDate);
  const periodDays = eachDayOfInterval({ start: periodStart, end: periodEnd });

  const { data: timeSlots = [], refetch } = useGrantTimeSlots(
    grant.id,
    format(periodStart, "yyyy-MM-dd"),
    format(periodEnd, "yyyy-MM-dd")
  );

  const batchUpdateMutation = useBatchUpdateTimeSlots();

  // Create grid structure
  const columns: Column[] = useMemo(() => {
    const cols: Column[] = [{ columnId: "user", width: 150 }];

    periodDays.forEach((day) => {
      cols.push({
        columnId: format(day, "yyyy-MM-dd"),
        width: 80,
      });
    });

    return cols;
  }, [periodDays]);

  const rows: Row[] = useMemo(() => {
    const headerRow: Row = {
      rowId: "header",
      cells: [
        { type: "header", text: "User" } as HeaderCell,
        ...periodDays.map(
          (day) =>
            ({
              type: "header",
              text: format(day, "dd"),
            } as HeaderCell)
        ),
      ],
    };

    const userRows: Row[] = mockUsers.map((user) => {
      const cells: (TextCell | NumberCell)[] = [
        { type: "text", text: user.name } as TextCell,
      ];

      periodDays.forEach((day) => {
        const dateStr = format(day, "yyyy-MM-dd");
        const slot = timeSlots.find(
          (s) => s.date === dateStr && s.userId === user.id
        );
        const isDisabled = disabledDates.includes(dateStr);

        cells.push({
          type: "number",
          value: slot?.allocationPercent || 0,
          date: dateStr,
          userId: user.id,
          nonEditable: isDisabled,
          className: isDisabled ? "disabled-cell" : "",
        } as NumberCell & {
          date: string;
          userId: string;
          nonEditable?: boolean;
          className?: string;
        });
      });

      return {
        rowId: user.id,
        cells,
      };
    });

    // Add total row
    const totalRow: Row = {
      rowId: "total",
      cells: [
        { type: "header", text: "Total %" } as HeaderCell,
        ...periodDays.map((day) => {
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

    return [headerRow, ...userRows, totalRow];
  }, [periodDays, timeSlots, disabledDates]);

  const handleChanges = useCallback(
    async (changes: any[]) => {
      if (changes.length === 0) return;

      try {
        const batch: TimeSlotBatch = {
          create: [],
          update: [],
          delete: [],
        };

        for (const change of changes) {
          const cell = change.newCell as NumberCell & {
            date?: string;
            userId?: string;
          };

          if (cell.type === "number" && cell.date && cell.userId) {
            const newValue = cell.value || 0;
            const existingSlot = timeSlots.find(
              (s) => s.date === cell.date && s.userId === cell.userId
            );

            if (newValue === 0 && existingSlot) {
              // Delete slot
              batch.delete!.push({
                userId: cell.userId,
                date: cell.date,
                grantId: grant.id,
              });
            } else if (newValue > 0) {
              const slot: TimeSlot = {
                userId: cell.userId,
                date: cell.date,
                grantId: grant.id,
                allocationPercent: newValue,
                totalHours: 8.0, // Default to 8 hours
              };

              if (existingSlot) {
                batch.update!.push(slot);
              } else {
                batch.create!.push(slot);
              }
            }
          }
        }

        if (
          batch.create!.length > 0 ||
          batch.update!.length > 0 ||
          batch.delete!.length > 0
        ) {
          await batchUpdateMutation.mutateAsync(batch);
          await refetch();
        }
      } catch (error) {
        console.error("Failed to update time slots:", error);
        const apiError = error as ApiError;
        setError(apiError.message || "Failed to update allocations");
      }
    },
    [timeSlots, grant.id, batchUpdateMutation, refetch]
  );

  const handleCloseError = () => {
    setError(null);
  };

  const gridContent = (
    <>
      <Box className="grant-grid">
        <ReactGrid
          stickyLeftColumns={1}
          rows={rows}
          columns={columns}
          onCellsChanged={handleChanges}
          enableRangeSelection
          enableRowSelection
          enableFillHandle
          enableColumnSelection
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
    </>
  );

  if (!showCard) {
    return gridContent;
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
        {title || `${grant.name} - User Allocations`}
      </Typography>
      <Box
        sx={{
          backgroundColor: "#ffffff",
          borderRadius: 2,
          border: "1px solid #e0e0e0",
          overflow: "hidden",
        }}
      >
        {gridContent}
      </Box>
    </Box>
  );
};
