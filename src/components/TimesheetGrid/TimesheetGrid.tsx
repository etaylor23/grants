import React, { useState, useMemo, useCallback } from "react";
import {
  ReactGrid,
  Column,
  Row,
  HeaderCell,
  TextCell,
  NumberCell,
} from "@silevis/reactgrid";
import "./TimesheetGrid.scss";
import { Box, Typography, Alert, Snackbar, Button, Stack } from "@mui/material";
import { useTimeSlots, useBatchUpdateTimeSlots } from "../../api/hooks";
import { mockGrants } from "../../api/mockData";
import { TimeSlot, TimeSlotBatch, ApiError } from "../../models/types";
import { format, eachDayOfInterval, startOfMonth, endOfMonth } from "date-fns";

interface TimesheetGridProps {
  userId: string;
  startDate?: Date;
  endDate?: Date;
  disabledDates?: string[];
  showCard?: boolean;
  showRowColumnControls?: boolean;
  title?: string;
}

export const TimesheetGrid: React.FC<TimesheetGridProps> = ({
  userId,
  startDate,
  endDate,
  disabledDates = [],
  showCard = true,
  showRowColumnControls = false,
  title,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [selectedCell, setSelectedCell] = useState<{
    rowId: string;
    columnId: string;
    value: number;
  } | null>(null);

  const currentDate = new Date();
  const periodStart = startDate || startOfMonth(currentDate);
  const periodEnd = endDate || endOfMonth(currentDate);
  const periodDays = eachDayOfInterval({ start: periodStart, end: periodEnd });

  const { data: timeSlots = [], refetch } = useTimeSlots(
    userId,
    format(periodStart, "yyyy-MM-dd"),
    format(periodEnd, "yyyy-MM-dd")
  );

  const batchUpdateMutation = useBatchUpdateTimeSlots();

  // Create grid structure
  const columns: Column[] = useMemo(() => {
    const cols: Column[] = [{ columnId: "grant", width: 150 }];

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
        { type: "header", text: "Grant" } as HeaderCell,
        ...periodDays.map(
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

      periodDays.forEach((day) => {
        const dateStr = format(day, "yyyy-MM-dd");
        const slot = timeSlots.find(
          (s) => s.date === dateStr && s.grantId === grant.id
        );
        const isDisabled = disabledDates.includes(dateStr);

        cells.push({
          type: "number",
          value: slot?.allocationPercent || 0,
          date: dateStr,
          grantId: grant.id,
          nonEditable: isDisabled,
          className: isDisabled ? "disabled-cell" : "",
        } as NumberCell & {
          date: string;
          grantId: string;
          nonEditable?: boolean;
          className?: string;
        });
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

    return [headerRow, ...grantRows, totalRow];
  }, [periodDays, timeSlots, disabledDates]);

  // Row and column operations
  const applyToRow = useCallback(() => {
    if (!selectedCell) return;

    const { rowId, value } = selectedCell;
    const changes: any[] = [];

    // Find all cells in the row (excluding the grant name column)
    const targetRow = rows.find((row) => row.rowId === rowId);
    if (!targetRow) return;

    targetRow.cells.forEach((cell, index) => {
      if (index === 0) return; // Skip grant name column

      const columnId = columns[index].columnId;
      const dateStr = String(columnId);

      // Skip disabled dates
      if (disabledDates.includes(dateStr)) return;

      if (cell.type === "number") {
        changes.push({
          rowId,
          columnId: String(columnId),
          newCell: {
            ...cell,
            value: value,
          },
        });
      }
    });

    if (changes.length > 0) {
      handleChanges(changes);
    }
  }, [selectedCell, rows, columns, disabledDates]);

  const applyToColumn = useCallback(() => {
    if (!selectedCell) return;

    const { columnId, value } = selectedCell;
    const changes: any[] = [];

    // Skip if it's the grant column or a disabled date
    if (columnId === "grant" || disabledDates.includes(String(columnId)))
      return;

    // Apply to all grant rows (excluding header and total rows)
    mockGrants.forEach((grant) => {
      const targetRow = rows.find((row) => row.rowId === grant.id);
      if (!targetRow) return;

      const cellIndex = columns.findIndex(
        (col) => col.columnId === String(columnId)
      );
      if (cellIndex === -1) return;

      const cell = targetRow.cells[cellIndex];
      if (cell.type === "number") {
        changes.push({
          rowId: grant.id,
          columnId: String(columnId),
          newCell: {
            ...cell,
            value: value,
          },
        });
      }
    });

    if (changes.length > 0) {
      handleChanges(changes);
    }
  }, [selectedCell, rows, columns, disabledDates]);

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

  const handleFocusLocationChanged = useCallback(
    (location: any) => {
      const { rowId, columnId } = location;

      // Skip if it's header or total row
      if (rowId === "header" || rowId === "total") return;

      // Skip if it's the grant column
      if (columnId === "grant") return;

      // Find the cell value
      const targetRow = rows.find((row) => row.rowId === rowId);
      if (!targetRow) return;

      const cellIndex = columns.findIndex(
        (col) => col.columnId === String(columnId)
      );
      if (cellIndex === -1) return;

      const cell = targetRow.cells[cellIndex];
      if (cell.type === "number") {
        setSelectedCell({
          rowId,
          columnId: String(columnId),
          value: cell.value || 0,
        });
      }
    },
    [rows, columns]
  );

  const gridContent = (
    <>
      {showRowColumnControls && selectedCell && (
        <Box sx={{ mb: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="body2">
              Selected: {selectedCell.value}% (Row:{" "}
              {mockGrants.find((g) => g.id === selectedCell.rowId)?.name}, Date:{" "}
              {format(new Date(selectedCell.columnId), "MMM dd")})
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={applyToRow}
              disabled={disabledDates.includes(selectedCell.columnId)}
            >
              Apply to Row
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={applyToColumn}
              disabled={selectedCell.columnId === "grant"}
            >
              Apply to Column
            </Button>
          </Stack>
        </Box>
      )}

      <Box className="timesheet-grid">
        <ReactGrid
          stickyLeftColumns={1}
          rows={rows}
          columns={columns}
          onCellsChanged={handleChanges}
          onFocusLocationChanged={handleFocusLocationChanged}
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
    <Box sx={{ height: "100%" }}>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
        {title ||
          `Timesheet Grid - ${format(periodStart, "MMM dd")} to ${format(
            periodEnd,
            "MMM dd, yyyy"
          )}`}
      </Typography>
      <Box
        sx={{
          backgroundColor: "#ffffff",
          borderRadius: 2,
          border: "1px solid #e0e0e0",
          overflow: "hidden",
          height: "calc(100% - 80px)",
        }}
      >
        {gridContent}
      </Box>
    </Box>
  );
};
