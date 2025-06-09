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
import {
  Box,
  Typography,
  Alert,
  Snackbar,
  Button,
  Stack,
} from "@mui/material";
import {
  useTimeSlots as useLegacyTimeSlots,
  useBatchUpdateTimeSlots,
  useWorkdayHours as useLegacyWorkdayHours,
  useBatchUpdateWorkdayHours,
} from "../../api/hooks";
import { mockGrants } from "../../api/mockData";
import {
  useTimeSlots as useLocalTimeSlots,
  useWorkdayHours as useLocalWorkdayHours,
  useGrants,
  useSaveSlots
} from "../../hooks/useLocalData";
import { isDexieBackend } from "../../config/environment";
import {
  TimeSlot,
  TimeSlotBatch,
  WorkdayHours,
  WorkdayHoursBatch,
  ApiError,
} from "../../models/types";
import { format, eachDayOfInterval, startOfMonth, endOfMonth } from "date-fns";
import {
  formatDateOrdinal,
  calculateTotalAvailableHours,
  calculateTotalHoursWorked,
  calculateAveragePercentage,
  DEFAULT_WORKDAY_HOURS,
} from "../../utils/dateUtils";

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
  const year = periodStart.getFullYear();

  // Use appropriate data hooks based on backend
  const isLocal = isDexieBackend();

  // Time slots
  const legacyTimeSlotsQuery = useLegacyTimeSlots(
    userId,
    format(periodStart, "yyyy-MM-dd"),
    format(periodEnd, "yyyy-MM-dd")
  );
  const localTimeSlotsQuery = useLocalTimeSlots(
    userId,
    format(periodStart, "yyyy-MM-dd"),
    format(periodEnd, "yyyy-MM-dd")
  );

  const timeSlots = isLocal ? (localTimeSlotsQuery.data || []) : (legacyTimeSlotsQuery.data || []);
  const refetch = isLocal ? localTimeSlotsQuery.refetch : legacyTimeSlotsQuery.refetch;

  // Workday hours
  const legacyWorkdayHoursQuery = useLegacyWorkdayHours(
    userId,
    format(periodStart, "yyyy-MM-dd"),
    format(periodEnd, "yyyy-MM-dd")
  );
  const localWorkdayHoursQuery = useLocalWorkdayHours(userId, year);

  const workdayHoursData = isLocal ? localWorkdayHoursQuery.data : legacyWorkdayHoursQuery.data;

  // Grants
  const { data: localGrants = [] } = useGrants();
  const grants = isLocal ? localGrants : mockGrants;

  // Mutations
  const batchUpdateMutation = useBatchUpdateTimeSlots();
  const batchUpdateWorkdayHoursMutation = useBatchUpdateWorkdayHours();
  const saveSlotsMutation = useSaveSlots();

  // Create workday hours lookup for easy access
  const workdayHoursLookup = useMemo(() => {
    const lookup: Record<string, number> = {};

    if (isLocal) {
      // For local data, workdayHoursData is a Record<string, number>
      const hoursData = workdayHoursData as Record<string, number> || {};
      Object.entries(hoursData).forEach(([date, hours]) => {
        lookup[date] = hours;
      });
    } else {
      // For legacy data, workdayHoursData is an array
      const hoursArray = workdayHoursData as Array<{ date: string; availableHours: number }> || [];
      hoursArray.forEach((wh) => {
        lookup[wh.date] = wh.availableHours;
      });
    }

    // Fill in defaults for dates without explicit hours
    periodDays.forEach((day) => {
      const dateStr = format(day, "yyyy-MM-dd");
      if (!lookup[dateStr] && !disabledDates.includes(dateStr)) {
        lookup[dateStr] = DEFAULT_WORKDAY_HOURS;
      }
    });
    return lookup;
  }, [workdayHoursData, periodDays, disabledDates, isLocal]);

  // Create grid structure
  const columns: Column[] = useMemo(() => {
    const cols: Column[] = [
      { columnId: "grant", width: 150 },
    ];

    periodDays.forEach((day) => {
      cols.push({
        columnId: format(day, "yyyy-MM-dd"),
        width: 100,
      });
    });

    cols.push(
      { columnId: "totalHoursWorked", width: 200 }, // Increased width for full header text
      { columnId: "averagePercentage", width: 180 } // Increased width for full header text
    );

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
              text: formatDateOrdinal(day),
            } as HeaderCell)
        ),
        {
          type: "header",
          text: "Total Hours Worked on Grants in Time Period",
        } as HeaderCell,
        {
          type: "header",
          text: "Average Percentage in Time Period",
        } as HeaderCell,
      ],
    };

    const grantRows: Row[] = grants.map((grant) => {
      // Calculate total hours worked for this grant
      const periodDates = periodDays.map((day) => format(day, "yyyy-MM-dd"));
      const totalHoursWorked = calculateTotalHoursWorked(
        timeSlots,
        grant.id,
        periodDates
      );
      const totalAvailableHours = calculateTotalAvailableHours(
        workdayHoursLookup,
        periodDates
      );
      const averagePercentage = calculateAveragePercentage(
        totalHoursWorked,
        totalAvailableHours
      );

      const cells: (TextCell | NumberCell)[] = [
        {
          type: "text",
          text: grant.name,
          className: "read-only-cell"
        } as TextCell & { className: string },
      ];

      periodDays.forEach((day) => {
        const dateStr = format(day, "yyyy-MM-dd");
        const slot = timeSlots.find(
          (s: any) => {
            const slotDate = isLocal ? s.Date : s.date;
            const slotGrantId = isLocal ? s.GrantID : s.grantId;
            return slotDate === dateStr && slotGrantId === (isLocal ? (grant as any).PK : (grant as any).id);
          }
        );
        const isDisabled = disabledDates.includes(dateStr);
        const maxHours = workdayHoursLookup[dateStr] || 0;

        cells.push({
          type: "number",
          value: (slot as any)?.HoursAllocated || (slot as any)?.hoursAllocated || 0,
          date: dateStr,
          grantId: isLocal ? (grant as any).PK : (grant as any).id,
          maxHours: maxHours,
          nonEditable: isDisabled,
          className: isDisabled ? "disabled-cell" : "editable-cell"
        } as NumberCell & { date: string; grantId: string; maxHours: number; nonEditable?: boolean; className: string });
      });

      // Add calculated columns at the end
      cells.push(
        {
          type: "text",
          text: `${totalHoursWorked.toFixed(1)}h`,
          className: "read-only-cell"
        } as TextCell & { className: string },
        {
          type: "text",
          text: `${averagePercentage.toFixed(1)}%`,
          className: "read-only-cell"
        } as TextCell & { className: string }
      );

      return {
        rowId: grant.id,
        cells,
      };
    });

    // Add total hours available row (editable)
    const totalHoursAvailableRow: Row = {
      rowId: "totalHoursAvailable",
      cells: [
        { type: "header", text: "Total Hours Available to Work" } as HeaderCell,
        ...periodDays.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const isDisabled = disabledDates.includes(dateStr);
          const availableHours =
            workdayHoursLookup[dateStr] || DEFAULT_WORKDAY_HOURS;

          return {
            type: "number",
            value: availableHours,
            date: dateStr,
            nonEditable: isDisabled,
            className: isDisabled ? "disabled-cell" : "editable-cell"
          } as NumberCell & { date: string; nonEditable?: boolean; className: string };
        }),
        { type: "text", text: "", className: "read-only-cell" } as TextCell & { className: string }, // Empty cells for calculated columns
        { type: "text", text: "", className: "read-only-cell" } as TextCell & { className: string },
      ],
    };

    // Add total hours used row
    const totalHoursUsedRow: Row = {
      rowId: "totalHoursUsed",
      cells: [
        { type: "header", text: "Total Hours Used" } as HeaderCell,
        ...periodDays.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const daySlots = timeSlots.filter((s) => s.date === dateStr);
          const totalHours = daySlots.reduce(
            (sum, slot) => sum + (slot.hoursAllocated || 0),
            0
          );
          const availableHours = workdayHoursLookup[dateStr] || 0;
          const isOverAllocated = totalHours > availableHours;

          return {
            type: "text",
            text: `${totalHours.toFixed(1)}h`,
            className: "read-only-cell",
            style: isOverAllocated
              ? { backgroundColor: "#ffebee", color: "#c62828" }
              : undefined,
          } as TextCell & { style?: any; className: string };
        }),
        { type: "text", text: "", className: "read-only-cell" } as TextCell & { className: string }, // Empty cells for calculated columns
        { type: "text", text: "", className: "read-only-cell" } as TextCell & { className: string },
      ],
    };

    return [headerRow, ...grantRows, totalHoursAvailableRow, totalHoursUsedRow];
  }, [periodDays, timeSlots, disabledDates, workdayHoursLookup]);

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

      // Skip disabled dates and calculated columns
      if (
        disabledDates.includes(dateStr) ||
        columnId === "totalHoursWorked" ||
        columnId === "averagePercentage"
      )
        return;

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

    // Skip if it's a non-date column or a disabled date
    if (
      columnId === "grant" ||
      columnId === "totalHoursWorked" ||
      columnId === "averagePercentage" ||
      disabledDates.includes(String(columnId))
    )
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
      const timeSlotBatch: TimeSlotBatch = {
        create: [],
        update: [],
        delete: [],
      };
      const workdayHoursBatch: WorkdayHoursBatch = {
        create: [],
        update: [],
        delete: [],
      };

      for (const change of changes) {
        const cell = change.newCell as NumberCell & {
          date?: string;
          grantId?: string;
          maxHours?: number;
        };

        if (cell.type === "number" && cell.date) {
          const newValue = cell.value || 0;

          // Handle workday hours changes (from totalHoursAvailable row)
          if (change.rowId === "totalHoursAvailable") {
            // For IndexedDB, we need to handle workday hours differently
            const existingHours = null; // Simplified for now

            // Simplified workday hours handling for now
            console.log('Workday hours change:', newValue);
          }
          // Handle time slot changes (from grant rows)
          else if (cell.grantId) {
            // Validate against maximum hours for the day
            const maxHours =
              cell.maxHours ||
              workdayHoursLookup[cell.date] ||
              DEFAULT_WORKDAY_HOURS;

            // Calculate current total hours for this day (excluding the current grant)
            const daySlots = timeSlots.filter(
              (s: any) => {
                const slotDate = isLocal ? s.Date : s.date;
                const slotGrantId = isLocal ? s.GrantID : s.grantId;
                return slotDate === cell.date && slotGrantId !== cell.grantId;
              }
            );
            const currentTotalHours = daySlots.reduce(
              (sum, slot: any) => sum + ((isLocal ? slot.HoursAllocated : slot.hoursAllocated) || 0),
              0
            );

            if (newValue + currentTotalHours > maxHours) {
              setError(
                `Cannot allocate ${newValue} hours. Maximum available: ${
                  maxHours - currentTotalHours
                } hours for this day.`
              );
              return;
            }

            const existingSlot = timeSlots.find(
              (s: any) => {
                const slotDate = isLocal ? s.Date : s.date;
                const slotGrantId = isLocal ? s.GrantID : s.grantId;
                return slotDate === cell.date && slotGrantId === cell.grantId;
              }
            );

            if (newValue === 0 && existingSlot) {
              // Delete slot
              timeSlotBatch.delete!.push({
                userId,
                date: cell.date,
                grantId: cell.grantId,
              });
            } else if (newValue > 0) {
              // Calculate percentage for backward compatibility
              const percentage = maxHours > 0 ? (newValue / maxHours) * 100 : 0;

              const slot: any = {
                userId,
                date: cell.date,
                grantId: cell.grantId,
                allocationPercent: percentage,
                hoursAllocated: newValue,
              };

              if (existingSlot) {
                timeSlotBatch.update!.push(slot);
              } else {
                timeSlotBatch.create!.push(slot);
              }
            }
          }
        }
      }

      try {
        // Execute both batch updates
        const promises = [];

        if (
          timeSlotBatch.create?.length ||
          timeSlotBatch.update?.length ||
          timeSlotBatch.delete?.length
        ) {
          promises.push(batchUpdateMutation.mutateAsync(timeSlotBatch));
        }

        if (
          workdayHoursBatch.create?.length ||
          workdayHoursBatch.update?.length ||
          workdayHoursBatch.delete?.length
        ) {
          promises.push(
            batchUpdateWorkdayHoursMutation.mutateAsync(workdayHoursBatch)
          );
        }

        await Promise.all(promises);
        await refetch();
      } catch (err: any) {
        const apiError = err as ApiError;
        setError(apiError.message || "Failed to update timesheet");
      }
    },
    [
      timeSlots,
      workdayHoursLookup,
      batchUpdateMutation,
      batchUpdateWorkdayHoursMutation,
      refetch,
      userId,
      isLocal,
    ]
  );

  const handleCloseError = () => {
    setError(null);
  };

  const handleFocusLocationChanged = useCallback(
    (location: any) => {
      const { rowId, columnId } = location;

      // Skip if it's header or total rows
      if (
        rowId === "header" ||
        rowId === "totalHoursAvailable" ||
        rowId === "totalHoursUsed"
      )
        return;

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
              Selected: {selectedCell.value}h (Date:{" "}
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
