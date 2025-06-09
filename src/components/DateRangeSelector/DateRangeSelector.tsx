import React, { useState, useEffect } from "react";
import { Box, Typography } from "@mui/material";
import { format, startOfMonth, endOfMonth, subMonths, addMonths, startOfYear, endOfYear } from "date-fns";
import styles from "../Layout/ModernContainer.module.css";

export interface DateRange {
  startDate: Date;
  endDate: Date;
  label?: string;
}

interface DateRangeSelectorProps {
  selectedRange: DateRange;
  onRangeChange: (range: DateRange) => void;
  className?: string;
}

export const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({
  selectedRange,
  onRangeChange,
  className,
}) => {
  const [startDateInput, setStartDateInput] = useState("");
  const [endDateInput, setEndDateInput] = useState("");
  const [activePreset, setActivePreset] = useState<string | null>(null);

  // Update input values when selectedRange changes
  useEffect(() => {
    setStartDateInput(format(selectedRange.startDate, "yyyy-MM-dd"));
    setEndDateInput(format(selectedRange.endDate, "yyyy-MM-dd"));
  }, [selectedRange]);

  const handleStartDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setStartDateInput(value);
    
    if (value) {
      const newStartDate = new Date(value);
      if (newStartDate <= selectedRange.endDate) {
        onRangeChange({
          startDate: newStartDate,
          endDate: selectedRange.endDate,
          label: "Custom Range",
        });
        setActivePreset(null);
      }
    }
  };

  const handleEndDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setEndDateInput(value);
    
    if (value) {
      const newEndDate = new Date(value);
      if (newEndDate >= selectedRange.startDate) {
        onRangeChange({
          startDate: selectedRange.startDate,
          endDate: newEndDate,
          label: "Custom Range",
        });
        setActivePreset(null);
      }
    }
  };

  const presetRanges = [
    {
      id: "current-month",
      label: "Current Month",
      getRange: () => {
        const now = new Date();
        return {
          startDate: startOfMonth(now),
          endDate: endOfMonth(now),
          label: "Current Month",
        };
      },
    },
    {
      id: "last-month",
      label: "Last Month",
      getRange: () => {
        const lastMonth = subMonths(new Date(), 1);
        return {
          startDate: startOfMonth(lastMonth),
          endDate: endOfMonth(lastMonth),
          label: "Last Month",
        };
      },
    },
    {
      id: "next-month",
      label: "Next Month",
      getRange: () => {
        const nextMonth = addMonths(new Date(), 1);
        return {
          startDate: startOfMonth(nextMonth),
          endDate: endOfMonth(nextMonth),
          label: "Next Month",
        };
      },
    },
    {
      id: "last-3-months",
      label: "Last 3 Months",
      getRange: () => {
        const now = new Date();
        const threeMonthsAgo = subMonths(now, 2);
        return {
          startDate: startOfMonth(threeMonthsAgo),
          endDate: endOfMonth(now),
          label: "Last 3 Months",
        };
      },
    },
    {
      id: "last-6-months",
      label: "Last 6 Months",
      getRange: () => {
        const now = new Date();
        const sixMonthsAgo = subMonths(now, 5);
        return {
          startDate: startOfMonth(sixMonthsAgo),
          endDate: endOfMonth(now),
          label: "Last 6 Months",
        };
      },
    },
    {
      id: "current-year",
      label: "Current Year",
      getRange: () => {
        const now = new Date();
        return {
          startDate: startOfYear(now),
          endDate: endOfYear(now),
          label: "Current Year",
        };
      },
    },
  ];

  const handlePresetClick = (preset: typeof presetRanges[0]) => {
    const range = preset.getRange();
    onRangeChange(range);
    setActivePreset(preset.id);
  };

  // Determine which preset is currently active
  useEffect(() => {
    const currentPreset = presetRanges.find((preset) => {
      const range = preset.getRange();
      return (
        range.startDate.getTime() === selectedRange.startDate.getTime() &&
        range.endDate.getTime() === selectedRange.endDate.getTime()
      );
    });
    setActivePreset(currentPreset?.id || null);
  }, [selectedRange]);

  return (
    <Box className={`${styles.controls} ${className || ""}`}>
      <Box className={styles.controlGroup}>
        <Typography className={styles.controlLabel}>Date Range</Typography>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="date"
            value={startDateInput}
            onChange={handleStartDateChange}
            className={styles.dateInput}
            aria-label="Start date"
          />
          <Typography variant="body2" sx={{ color: "#6b7280", mx: 0.5 }}>
            to
          </Typography>
          <input
            type="date"
            value={endDateInput}
            onChange={handleEndDateChange}
            className={styles.dateInput}
            aria-label="End date"
          />
        </Box>
      </Box>

      <Box className={styles.controlGroup}>
        <Typography className={styles.controlLabel}>Quick Select</Typography>
        <Box className={styles.presetButtons}>
          {presetRanges.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handlePresetClick(preset)}
              className={`${styles.presetButton} ${
                activePreset === preset.id ? styles.active : ""
              }`}
            >
              {preset.label}
            </button>
          ))}
        </Box>
      </Box>

      <Box className={styles.controlGroup}>
        <Typography className={styles.controlLabel}>Selected Period</Typography>
        <Typography variant="body2" sx={{ color: "#374151", fontWeight: 500 }}>
          {format(selectedRange.startDate, "MMM dd, yyyy")} -{" "}
          {format(selectedRange.endDate, "MMM dd, yyyy")}
          {selectedRange.label && (
            <span style={{ color: "#6b7280", marginLeft: "0.5rem" }}>
              ({selectedRange.label})
            </span>
          )}
        </Typography>
      </Box>
    </Box>
  );
};
