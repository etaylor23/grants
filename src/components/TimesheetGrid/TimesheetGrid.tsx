import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  ReactGrid,
  Column,
  Row,
  HeaderCell,
  TextCell,
  NumberCell,
  DropdownCell,
} from "@silevis/reactgrid";
import "./TimesheetGrid.scss";
import { Box, Typography, Alert, Snackbar, Button, Stack } from "@mui/material";
import { BulkAllocationModal } from "../BulkAllocationModal";
// IndexedDB data hooks
import {
  useTimeSlots,
  useWorkdayHours,
  useGrants,
  useSaveSlots,
  useIndividuals,
} from "../../hooks/useLocalData";
import {
  TimeSlot,
  TimeSlotBatch,
  WorkdayHours,
  WorkdayHoursBatch,
  ApiError,
} from "../../models/types";
import {
  format,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  isWeekend,
} from "date-fns";
import {
  formatDateOrdinal,
  calculateTotalAvailableWorkHours,
  calculateTotalHoursWorked,
  calculateAveragePercentage,
  calculateCapacityUtilization,
} from "../../utils/dateUtils";
import {
  DEFAULT_WORKDAY_HOURS,
  getHoursFromDayEntry,
  getLeaveTypeFromDayEntry,
  isWorkDay,
  LeaveType,
  DayEntry,
  createWorkDayEntry,
  createLeaveEntry,
} from "../../db/schema";
import { useSaveWorkdayHours } from "../../hooks/useLocalData";

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
  const [bulkAllocationModalOpen, setBulkAllocationModalOpen] = useState(false);

  // State for managing dropdown open/close
  const [openDropdowns, setOpenDropdowns] = useState<Set<string>>(new Set());

  const currentDate = new Date();
  const periodStart = startDate || startOfMonth(currentDate);
  const periodEnd = endDate || endOfMonth(currentDate);
  const periodDays = eachDayOfInterval({ start: periodStart, end: periodEnd });
  const year = periodStart.getFullYear();

  // IndexedDB data hooks
  const timeSlotsQuery = useTimeSlots(
    userId,
    format(periodStart, "yyyy-MM-dd"),
    format(periodEnd, "yyyy-MM-dd")
  );

  const timeSlots: any[] = timeSlotsQuery.data || [];
  const refetch = timeSlotsQuery.refetch;

  // Workday hours from IndexedDB
  const workdayHoursQuery = useWorkdayHours(userId, year);
  const workdayHoursData = workdayHoursQuery.data;

  // Grants from IndexedDB
  const { data: grants = [] } = useGrants();

  // Individuals from IndexedDB (for salary calculations)
  const { data: individuals = [] } = useIndividuals();
  const individual = individuals.find((ind: any) => ind.PK === userId);
  const annualGross = individual?.AnnualGross || 0;
  const hourlyRate = annualGross / (260 * 8); // 260 working days, 8 hours per day

  // Mutations
  const saveSlotsMutation = useSaveSlots();
  const saveWorkdayHoursMutation = useSaveWorkdayHours();

  // Create workday hours lookup for easy access (with leave type support)
  const workdayHoursLookup = useMemo(() => {
    const lookup: Record<string, number> = {};

    // workdayHoursData can now be Record<string, number | DayEntry> from IndexedDB
    const hoursData = workdayHoursData || {};
    Object.entries(hoursData).forEach(([date, entry]) => {
      lookup[date] = getHoursFromDayEntry(entry);
    });

    // Fill in defaults for dates without explicit hours
    periodDays.forEach((day) => {
      const dateStr = format(day, "yyyy-MM-dd");
      // Only add default hours for weekdays, exclude weekends and disabled dates
      if (
        !lookup[dateStr] &&
        !disabledDates.includes(dateStr) &&
        !isWeekend(day)
      ) {
        lookup[dateStr] = DEFAULT_WORKDAY_HOURS;
      }
    });
    return lookup;
  }, [workdayHoursData, periodDays, disabledDates]);

  // Create leave type lookup for determining if days are disabled
  const leaveTypeLookup = useMemo(() => {
    const lookup: Record<string, LeaveType> = {};
    const hoursData = workdayHoursData || {};

    Object.entries(hoursData).forEach(([date, entry]) => {
      lookup[date] = getLeaveTypeFromDayEntry(entry);
    });

    // Fill in defaults for dates without explicit entries
    periodDays.forEach((day) => {
      const dateStr = format(day, "yyyy-MM-dd");
      if (!lookup[dateStr]) {
        // Weekends get "work" but will be handled specially in display logic
        // Weekdays default to "work"
        lookup[dateStr] = "work";
      }
    });

    return lookup;
  }, [workdayHoursData, periodDays]);

  // Update disabled dates to include leave days and weekends
  const enhancedDisabledDates = useMemo(() => {
    const disabled = [...disabledDates];

    // Add dates that are marked as leave (non-work days) or weekends
    periodDays.forEach((day) => {
      const dateStr = format(day, "yyyy-MM-dd");
      const leaveType = leaveTypeLookup[dateStr];

      // Disable weekends by default
      if (isWeekend(day)) {
        disabled.push(dateStr);
      }
      // Disable leave days (non-work days)
      else if (leaveType && leaveType !== "work") {
        disabled.push(dateStr);
      }
    });

    return disabled;
  }, [disabledDates, leaveTypeLookup, periodDays]);

  // Define dropdown options for leave types
  const leaveTypeOptions = useMemo(
    () => [
      { label: "💼 Work", value: "work" },
      { label: "🏖️ Annual Leave", value: "annual-leave" },
      { label: "🤒 Sick Leave", value: "sick-leave" },
      { label: "🎉 Public Holiday", value: "public-holiday" },
      { label: "📝 Other", value: "other" },
    ],
    []
  );

  // Group dates by month for month headers
  const monthGroups = useMemo(() => {
    const groups: Array<{
      month: string;
      dates: Date[];
      startIndex: number;
      span: number;
    }> = [];
    let currentMonth = "";
    let currentDates: Date[] = [];
    let startIndex = 3; // After the 3 fixed columns (Grant, Total Hours, Total Value)

    periodDays.forEach((day, index) => {
      const monthKey = format(day, "MMMM yyyy");

      if (monthKey !== currentMonth) {
        // Save previous group if it exists
        if (currentDates.length > 0) {
          groups.push({
            month: currentMonth,
            dates: currentDates,
            startIndex: startIndex,
            span: currentDates.length,
          });
          startIndex += currentDates.length;
        }

        // Start new group
        currentMonth = monthKey;
        currentDates = [day];
      } else {
        currentDates.push(day);
      }
    });

    // Add the last group
    if (currentDates.length > 0) {
      groups.push({
        month: currentMonth,
        dates: currentDates,
        startIndex: startIndex,
        span: currentDates.length,
      });
    }

    return groups;
  }, [periodDays]);

  // Create grid structure with reordered columns
  const columns: Column[] = useMemo(() => {
    const cols: Column[] = [
      { columnId: "grant", width: 150 },
      { columnId: "totalHoursWorked", width: 120 },
      { columnId: "totalValue", width: 120 },
      { columnId: "averagePercentage", width: 100 },
      { columnId: "dailyValue", width: 120 },
    ];

    // Add date columns after the summary columns
    periodDays.forEach((day, index) => {
      const dateStr = format(day, "yyyy-MM-dd");
      const isWeekendDay = isWeekend(day);
      if (index < 3) {
        console.log(
          `📅 Creating column for ${dateStr} at index ${index + 5} (${
            isWeekendDay ? "Weekend" : "Weekday"
          })`
        );
      }
      cols.push({
        columnId: dateStr,
        width: 100,
      });
    });

    return cols;
  }, [periodDays]);

  const rows: Row[] = useMemo(() => {
    // Simplified month header row - show month for each day individually
    const monthHeaderRow: Row = {
      rowId: "monthHeader",
      cells: [
        { type: "header", text: "" } as HeaderCell,
        { type: "header", text: "" } as HeaderCell,
        { type: "header", text: "" } as HeaderCell,
        { type: "header", text: "" } as HeaderCell,
        { type: "header", text: "" } as HeaderCell,
        ...periodDays.map((day) => {
          const monthText = format(day, "MMM yyyy");
          const isFirstOfMonth = format(day, "dd") === "01";

          return {
            type: "header",
            text: isFirstOfMonth ? monthText : "", // Only show month text on first day of month
            className: "month-header-cell",
            style: {
              fontSize: "0.8rem",
              fontWeight: isFirstOfMonth ? 700 : 400,
              opacity: isFirstOfMonth ? 1 : 0.7,
            },
          } as HeaderCell & { className: string; style: any };
        }),
      ],
    };

    const headerRow: Row = {
      rowId: "header",
      cells: [
        { type: "header", text: "Grant" } as HeaderCell,
        { type: "header", text: "Total Hours" } as HeaderCell,
        { type: "header", text: "Total Value" } as HeaderCell,
        { type: "header", text: "Avg %" } as HeaderCell,
        { type: "header", text: "Daily Value" } as HeaderCell,
        ...periodDays.map(
          (day) =>
            ({
              type: "header",
              text: formatDateOrdinal(day),
            } as HeaderCell)
        ),
      ],
    };

    const grantRows: Row[] = grants.map((grant: any) => {
      // Calculate total hours worked for this grant
      const periodDates = periodDays.map((day) => format(day, "yyyy-MM-dd"));
      const grantId = grant.PK; // IndexedDB format
      const grantName = grant.Title; // IndexedDB format
      // Transform timeSlots to match the expected format for calculateTotalHoursWorked
      const normalizedTimeSlots = timeSlots.map((slot: any) => ({
        date: slot.Date,
        grantId: slot.GrantID,
        hoursAllocated: slot.HoursAllocated,
      }));

      const totalHoursWorked = calculateTotalHoursWorked(
        normalizedTimeSlots,
        grantId,
        periodDates
      );
      // Use enhanced calculation that excludes weekends and leave days
      const totalAvailableHours = calculateTotalAvailableWorkHours(
        workdayHoursData || {},
        periodDates
      );
      const averagePercentage = calculateAveragePercentage(
        totalHoursWorked,
        totalAvailableHours
      );

      // Calculate financial values
      const totalValue = totalHoursWorked * hourlyRate;
      const dailyValue = totalValue / periodDates.length;

      const cells: (TextCell | NumberCell)[] = [
        {
          type: "text",
          text: grantName,
          className: "read-only-cell",
        } as TextCell & { className: string },
        // Add summary columns immediately after grant name
        {
          type: "text",
          text: `${totalHoursWorked.toFixed(1)}h`,
          className: "read-only-cell",
        } as TextCell & { className: string },
        {
          type: "text",
          text: `£${totalValue.toFixed(0)}`,
          className: "read-only-cell value-cell",
        } as TextCell & { className: string },
        {
          type: "text",
          text: `${averagePercentage.toFixed(1)}%`,
          className: "read-only-cell",
        } as TextCell & { className: string },
        {
          type: "text",
          text: `£${dailyValue.toFixed(0)}`,
          className: "read-only-cell value-cell",
        } as TextCell & { className: string },
      ];

      // Add date columns after summary columns
      periodDays.forEach((day) => {
        const dateStr = format(day, "yyyy-MM-dd");
        const slot = timeSlots.find(
          (s: any) => s.Date === dateStr && s.GrantID === grantId
        );
        const isDisabled = enhancedDisabledDates.includes(dateStr);
        const isWeekendDay = isWeekend(day);
        // Use default workday hours only for weekdays, weekends get 0 hours
        const maxHours =
          workdayHoursLookup[dateStr] ||
          (isWeekendDay ? 0 : DEFAULT_WORKDAY_HOURS);

        // Determine appropriate CSS class based on day type
        let cellClassName = "editable-cell";
        if (isDisabled) {
          cellClassName = isWeekendDay ? "weekend-cell" : "disabled-cell";
        }

        cells.push({
          type: "number",
          value: slot?.HoursAllocated || 0,
          date: dateStr,
          grantId: grantId,
          maxHours: maxHours,
          nonEditable: isDisabled,
          className: cellClassName,
        } as NumberCell & { date: string; grantId: string; maxHours: number; nonEditable?: boolean; className: string });
      });

      return {
        rowId: grantId,
        cells,
      };
    });

    // Add total hours available row (editable)
    const periodDates = periodDays.map((day) => format(day, "yyyy-MM-dd"));
    // Use enhanced calculation that excludes weekends and leave days
    const totalAvailableHours = calculateTotalAvailableWorkHours(
      workdayHoursData || {},
      periodDates
    );
    const totalAvailableValue = totalAvailableHours * hourlyRate;
    const dailyAvailableValue = totalAvailableValue / periodDates.length;

    const totalHoursAvailableRow: Row = {
      rowId: "totalHoursAvailable",
      cells: [
        { type: "header", text: "Total Hours Available to Work" } as HeaderCell,
        {
          type: "text",
          text: `${totalAvailableHours.toFixed(1)}h`,
          className: "read-only-cell",
        } as TextCell & { className: string },
        {
          type: "text",
          text: `£${totalAvailableValue.toFixed(0)}`,
          className: "read-only-cell value-cell",
        } as TextCell & { className: string },
        {
          type: "text",
          text: "100.0%",
          className: "read-only-cell",
        } as TextCell & { className: string },
        {
          type: "text",
          text: `£${dailyAvailableValue.toFixed(0)}`,
          className: "read-only-cell value-cell",
        } as TextCell & { className: string },
        ...periodDays.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const isDisabled = enhancedDisabledDates.includes(dateStr);
          const isWeekendDay = isWeekend(day);
          // Use default workday hours only for weekdays, weekends get 0 hours
          const availableHours =
            workdayHoursLookup[dateStr] ||
            (isWeekendDay ? 0 : DEFAULT_WORKDAY_HOURS);

          // Determine appropriate CSS class based on day type
          let cellClassName = "editable-cell";
          if (isDisabled) {
            cellClassName = isWeekendDay ? "weekend-cell" : "disabled-cell";
          }

          return {
            type: "number",
            value: availableHours,
            date: dateStr,
            nonEditable: isDisabled,
            className: cellClassName,
          } as NumberCell & {
            date: string;
            nonEditable?: boolean;
            className: string;
          };
        }),
      ],
    };

    // Add total hours used row
    const totalUsedHours = timeSlots.reduce(
      (sum, slot: any) => sum + (slot.HoursAllocated || 0),
      0
    );
    const totalUsedValue = totalUsedHours * hourlyRate;
    const dailyUsedValue = totalUsedValue / periodDates.length;
    // Enhanced utilization calculation with leave type support
    const capacityMetrics = calculateCapacityUtilization(
      totalUsedHours,
      workdayHoursData || {},
      periodDates
    );
    const utilizationPercent = capacityMetrics.workDayUtilization;

    const totalHoursUsedRow: Row = {
      rowId: "totalHoursUsed",
      cells: [
        { type: "header", text: "Total Hours Used" } as HeaderCell,
        {
          type: "text",
          text: `${totalUsedHours.toFixed(1)}h`,
          className: "read-only-cell",
        } as TextCell & { className: string },
        {
          type: "text",
          text: `£${totalUsedValue.toFixed(0)}`,
          className: "read-only-cell value-cell",
        } as TextCell & { className: string },
        {
          type: "text",
          text: `${utilizationPercent.toFixed(1)}%`,
          className: "read-only-cell",
        } as TextCell & { className: string },
        {
          type: "text",
          text: `£${dailyUsedValue.toFixed(0)}`,
          className: "read-only-cell value-cell",
        } as TextCell & { className: string },
        ...periodDays.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const daySlots = timeSlots.filter((s: any) => s.Date === dateStr);
          const totalHours = daySlots.reduce(
            (sum, slot: any) => sum + (slot.HoursAllocated || 0),
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
      ],
    };

    // Add leave type row
    const leaveTypeRow: Row = {
      rowId: "leaveTypes",
      cells: [
        {
          type: "header",
          text: "Day Type",
          className: "header-cell",
        } as HeaderCell & { className: string },
        {
          type: "text",
          text: "",
          className: "read-only-cell",
        } as TextCell & { className: string },
        {
          type: "text",
          text: "",
          className: "read-only-cell",
        } as TextCell & { className: string },
        {
          type: "text",
          text: "",
          className: "read-only-cell",
        } as TextCell & { className: string },
        {
          type: "text",
          text: "",
          className: "read-only-cell",
        } as TextCell & { className: string },
        ...periodDays.map((day, index) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const leaveType = leaveTypeLookup[dateStr] || "work"; // Ensure we always have a valid value
          const isWeekendDay = isWeekend(day);

          // Debug logging for cell creation (only for first few cells)
          if (index < 3) {
            console.log(
              `📋 Creating day type cell for ${dateStr} (index ${index}):`,
              {
                dateStr,
                leaveType,
                isWeekendDay,
                cellType: isWeekendDay
                  ? "text (weekend - empty)"
                  : "dropdown (weekday)",
                displayValue: isWeekendDay ? "empty string" : leaveType,
                columnIndex: index + 5, // Now correctly +5 for the 5 summary columns
                alignment: "Should align with date column",
              }
            );
          }

          if (isWeekendDay) {
            // For weekends, create a read-only text cell with empty text (no day type)
            return {
              type: "text",
              text: "", // Empty string for weekends - they have no day type
              className: "read-only-cell weekend-cell",
              date: dateStr,
            } as TextCell & {
              className: string;
              date: string;
            };
          } else {
            // For weekdays, create an interactive dropdown cell
            const isDropdownOpen = openDropdowns.has(dateStr);

            const dropdownCell: DropdownCell = {
              type: "dropdown",
              selectedValue: leaveType,
              values: leaveTypeOptions,
              isDisabled: false, // Weekdays are interactive
              isOpen: isDropdownOpen,
              inputValue: "", // Empty input value
            };

            return {
              ...dropdownCell,
              className: "leave-type-cell",
              date: dateStr, // Store the date for debugging
            } as DropdownCell & {
              className: string;
              date: string;
            };
          }
        }),
      ],
    };

    return [
      monthHeaderRow,
      headerRow,
      leaveTypeRow,
      ...grantRows,
      totalHoursAvailableRow,
      totalHoursUsedRow,
    ];
  }, [
    periodDays,
    timeSlots,
    enhancedDisabledDates,
    workdayHoursLookup,
    leaveTypeLookup,
    leaveTypeOptions,
    openDropdowns,
    monthGroups,
    grants,
    hourlyRate,
  ]);

  // Row and column operations
  const applyToRow = useCallback(() => {
    if (!selectedCell) return;

    const { rowId, value } = selectedCell;
    const changes: any[] = [];

    // Find all cells in the row (excluding the grant name column)
    const targetRow = rows.find((row) => row.rowId === rowId);
    if (!targetRow) return;

    targetRow.cells.forEach((cell, index) => {
      if (index < 5) return; // Skip grant name and summary columns (first 5 columns)

      const columnId = columns[index].columnId;
      const dateStr = String(columnId);

      // Skip disabled dates and calculated columns
      if (
        disabledDates.includes(dateStr) ||
        columnId === "totalHoursWorked" ||
        columnId === "totalValue" ||
        columnId === "averagePercentage" ||
        columnId === "dailyValue"
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
      columnId === "totalValue" ||
      columnId === "averagePercentage" ||
      columnId === "dailyValue" ||
      disabledDates.includes(String(columnId))
    )
      return;

    // Apply to all grant rows (excluding header and total rows)
    grants.forEach((grant: any) => {
      const grantId = grant.PK; // IndexedDB format
      const targetRow = rows.find((row) => row.rowId === grantId);
      if (!targetRow) return;

      const cellIndex = columns.findIndex(
        (col) => col.columnId === String(columnId)
      );
      if (cellIndex === -1) return;

      const cell = targetRow.cells[cellIndex];
      if (cell.type === "number") {
        changes.push({
          rowId: grantId,
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
  }, [selectedCell, rows, columns, disabledDates, grants]);

  // Handle day type changes from dropdown
  const handleDayTypeChange = useCallback(
    async (date: string, newLeaveType: LeaveType) => {
      console.log("🔄 handleDayTypeChange called with:", {
        date,
        newLeaveType,
      });
      try {
        const currentLeaveType = leaveTypeLookup[date];
        const year = new Date(date).getFullYear();
        let newEntry: DayEntry;

        // Check if changing from work to leave type
        const isChangingToLeave =
          currentLeaveType === "work" && newLeaveType !== "work";

        // Clear all existing timesheet hours for this date if changing to leave
        const existingSlots = timeSlots.filter(
          (slot: any) => slot.Date === date
        );

        if (isChangingToLeave && existingSlots.length > 0) {
          console.log(
            `Clearing ${existingSlots.length} timesheet entries for ${date} (changing to ${newLeaveType})`
          );

          // Create delete operations for all existing slots
          const deleteOperations = existingSlots.map((slot: any) => ({
            type: "delete" as const,
            date: slot.Date,
            grantId: slot.GrantID,
          }));

          // Save the deletions first
          await saveSlotsMutation.mutateAsync({
            userId,
            operations: deleteOperations,
          });
        }

        // Update the day type
        if (newLeaveType === "work") {
          newEntry = createWorkDayEntry();
        } else {
          newEntry = createLeaveEntry(newLeaveType);
        }

        await saveWorkdayHoursMutation.mutateAsync({
          userId,
          year,
          date,
          entry: newEntry,
        });

        console.log(`Updated ${date} to ${newLeaveType}`);

        // Show user feedback if hours were cleared
        if (isChangingToLeave && existingSlots.length > 0) {
          setError(
            `Day type changed to ${newLeaveType}. All existing timesheet hours for ${date} have been cleared.`
          );
          // Clear the error after 5 seconds
          setTimeout(() => setError(null), 5000);
        }
      } catch (error) {
        console.error("Failed to update leave type:", error);
        setError("Failed to update day type. Please try again.");
      }
    },
    [
      userId,
      saveWorkdayHoursMutation,
      saveSlotsMutation,
      leaveTypeLookup,
      timeSlots,
    ]
  );

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
        const { rowId, columnId, newCell } = change;

        // Handle dropdown changes for leave types
        if (rowId === "leaveTypes" && newCell.type === "dropdown") {
          console.log("🎯 Dropdown change detected:", {
            rowId,
            columnId,
            columnIdType: typeof columnId,
            newCell,
            selectedValue: newCell.selectedValue,
            previousValue: change.previousCell?.selectedValue,
            isOpen: newCell.isOpen,
            previousIsOpen: change.previousCell?.isOpen,
            cellDate: (newCell as any).date, // Check if date is stored in cell
          });

          // Use columnId directly as the date - ensure it's a string
          const actualDate = String(columnId);

          // Validate date format and ensure it's within our period
          if (!actualDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
            console.error(
              "❌ Invalid date format:",
              actualDate,
              "Type:",
              typeof columnId
            );
            continue;
          }

          // Additional validation: check if this date is in our period
          const dateInPeriod = periodDays.some(
            (day) => format(day, "yyyy-MM-dd") === actualDate
          );
          if (!dateInPeriod) {
            console.error("❌ Date not in current period:", actualDate);
            continue;
          }

          // Additional validation: ensure this is not a weekend date (should not have dropdown)
          const correspondingDay = periodDays.find(
            (day) => format(day, "yyyy-MM-dd") === actualDate
          );
          if (correspondingDay && isWeekend(correspondingDay)) {
            console.error(
              "❌ Weekend dates should not have dropdown interactions:",
              actualDate
            );
            continue;
          }

          console.log("🎯 Processing dropdown change for date:", actualDate);

          // Handle dropdown open/close state changes
          if (newCell.isOpen !== change.previousCell?.isOpen) {
            setOpenDropdowns((prev) => {
              if (newCell.isOpen) {
                // Only one dropdown open at a time - close all others
                const newSet = new Set([actualDate]);
                console.log(
                  "🔓 Opening dropdown for:",
                  actualDate,
                  "(closing all others)",
                  "Previous state:",
                  Array.from(prev)
                );
                return newSet;
              } else {
                // Close this specific dropdown
                const newSet = new Set(prev);
                newSet.delete(actualDate);
                console.log(
                  "🔒 Closing dropdown for:",
                  actualDate,
                  "Remaining open:",
                  Array.from(newSet)
                );
                return newSet;
              }
            });
          }

          // Handle value selection changes
          if (newCell.selectedValue !== change.previousCell?.selectedValue) {
            console.log("🔄 Calling handleDayTypeChange:", {
              date: actualDate,
              selectedValue: newCell.selectedValue,
              previousValue: change.previousCell?.selectedValue,
            });

            // Call handleDayTypeChange with the correct date first
            await handleDayTypeChange(
              actualDate,
              newCell.selectedValue as LeaveType
            );

            // Close the dropdown after selection (with a small delay to ensure proper state update)
            setTimeout(() => {
              setOpenDropdowns((prev) => {
                const newSet = new Set(prev);
                newSet.delete(actualDate);
                console.log(
                  "🔒 Auto-closing dropdown after selection for:",
                  actualDate
                );
                return newSet;
              });
            }, 100);
          }

          continue;
        }

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
            console.log("Workday hours change:", newValue);
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
              (s: any) => s.Date === cell.date && s.GrantID !== cell.grantId
            );
            const currentTotalHours = daySlots.reduce(
              (sum, slot: any) => sum + (slot.HoursAllocated || 0),
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
              (s: any) => s.Date === cell.date && s.GrantID === cell.grantId
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

              // AUTO-GENERATE WORKDAY: Create workday entry if it doesn't exist
              if (!workdayHoursLookup[cell.date]) {
                console.log(`Auto-generating workday entry for ${cell.date}`);
                // This will be handled in the save operation below
              }
            }
          }
        }
      }

      try {
        // Use IndexedDB save functionality
        const operations: Array<{
          type: "put" | "delete";
          timeSlot?: any;
          date?: string;
          grantId?: string;
        }> = [];

        // Convert batch operations to IndexedDB operations
        timeSlotBatch.create?.forEach((slot) => {
          operations.push({
            type: "put",
            timeSlot: slot,
          });
        });

        timeSlotBatch.update?.forEach((slot) => {
          operations.push({
            type: "put",
            timeSlot: slot,
          });
        });

        timeSlotBatch.delete?.forEach((deleteInfo) => {
          operations.push({
            type: "delete",
            date: deleteInfo.date,
            grantId: deleteInfo.grantId,
          });
        });

        if (operations.length > 0) {
          await saveSlotsMutation.mutateAsync({
            userId,
            operations,
          });
        }

        await refetch();
      } catch (err: any) {
        const apiError = err as ApiError;
        setError(apiError.message || "Failed to update timesheet");
      }
    },
    [
      timeSlots,
      workdayHoursLookup,
      saveSlotsMutation,
      refetch,
      userId,
      setOpenDropdowns,
      handleDayTypeChange,
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
      {/* Bulk Allocation Controls */}
      <Box
        sx={{
          mb: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 500 }}>
          Time Allocation Grid
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => setBulkAllocationModalOpen(true)}
          sx={{ minWidth: 150 }}
        >
          Bulk Allocation
        </Button>
      </Box>

      {showRowColumnControls && selectedCell && (
        <Box sx={{ mb: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="body2">
              Selected: {selectedCell.value}h (Date:{" "}
              {format(new Date(selectedCell.columnId), "MMM dd")})
            </Typography>
          </Stack>
        </Box>
      )}

      <Box className="timesheet-grid" position="relative">
        <ReactGrid
          stickyLeftColumns={5}
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

      {/* Bulk Allocation Modal */}
      <BulkAllocationModal
        open={bulkAllocationModalOpen}
        onClose={() => setBulkAllocationModalOpen(false)}
        userId={userId}
        userName={
          individual ? `${individual.FirstName} ${individual.LastName}` : "User"
        }
        initialStartDate={periodStart}
        initialEndDate={periodEnd}
        onAllocationComplete={() => {
          // Force refresh of timesheet data
          refetch();
        }}
      />
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
