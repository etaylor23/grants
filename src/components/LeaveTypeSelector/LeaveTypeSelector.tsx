import React from "react";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Box,
  Typography,
  SelectChangeEvent,
} from "@mui/material";
import { LeaveType, DayEntry } from "../../db/schema";

interface LeaveTypeSelectorProps {
  value: number | DayEntry;
  onChange: (entry: DayEntry) => void;
  disabled?: boolean;
  label?: string;
}

const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  work: "Work Day",
  "annual-leave": "Annual Leave",
  "sick-leave": "Sick Leave",
  "public-holiday": "Public Holiday",
  other: "Other Leave",
};

const LEAVE_TYPE_COLORS: Record<LeaveType, string> = {
  work: "#4caf50", // Green
  "annual-leave": "#2196f3", // Blue
  "sick-leave": "#ff9800", // Orange
  "public-holiday": "#9c27b0", // Purple
  other: "#607d8b", // Blue Grey
};

export const LeaveTypeSelector: React.FC<LeaveTypeSelectorProps> = ({
  value,
  onChange,
  disabled = false,
  label = "Day Type",
}) => {
  // Convert legacy number format to DayEntry
  const currentEntry: DayEntry = typeof value === "number" 
    ? { hours: value, type: value > 0 ? "work" : "work" }
    : value;

  const handleTypeChange = (event: SelectChangeEvent<LeaveType>) => {
    const newType = event.target.value as LeaveType;
    
    if (newType === "work") {
      onChange({
        hours: 8, // Default work hours
        type: "work",
      });
    } else {
      onChange({
        hours: 0, // Leave days have 0 available hours
        type: newType,
        note: currentEntry.note || "",
      });
    }
  };

  const handleHoursChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const hours = parseFloat(event.target.value) || 0;
    onChange({
      ...currentEntry,
      hours,
    });
  };

  const handleNoteChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...currentEntry,
      note: event.target.value,
    });
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 200 }}>
      {/* Leave Type Selector */}
      <FormControl fullWidth size="small" disabled={disabled}>
        <InputLabel>{label}</InputLabel>
        <Select
          value={currentEntry.type}
          onChange={handleTypeChange}
          label={label}
          sx={{
            "& .MuiSelect-select": {
              color: LEAVE_TYPE_COLORS[currentEntry.type],
              fontWeight: 500,
            },
          }}
        >
          {Object.entries(LEAVE_TYPE_LABELS).map(([type, label]) => (
            <MenuItem 
              key={type} 
              value={type}
              sx={{ 
                color: LEAVE_TYPE_COLORS[type as LeaveType],
                fontWeight: 500,
              }}
            >
              {label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Hours Input (only for work days) */}
      {currentEntry.type === "work" && (
        <TextField
          label="Available Hours"
          type="number"
          value={currentEntry.hours}
          onChange={handleHoursChange}
          disabled={disabled}
          size="small"
          inputProps={{ min: 0, max: 24, step: 0.5 }}
          helperText="Hours available for work allocation"
        />
      )}

      {/* Note Input (for leave days) */}
      {currentEntry.type !== "work" && (
        <TextField
          label="Note (Optional)"
          value={currentEntry.note || ""}
          onChange={handleNoteChange}
          disabled={disabled}
          size="small"
          multiline
          rows={2}
          placeholder="Add a note about this leave..."
          helperText="Optional note about the leave"
        />
      )}

      {/* Summary Display */}
      <Box sx={{ 
        p: 1, 
        backgroundColor: "grey.50", 
        borderRadius: 1,
        border: `1px solid ${LEAVE_TYPE_COLORS[currentEntry.type]}20`,
      }}>
        <Typography variant="caption" color="text.secondary">
          Summary:
        </Typography>
        <Typography 
          variant="body2" 
          sx={{ 
            color: LEAVE_TYPE_COLORS[currentEntry.type],
            fontWeight: 500,
          }}
        >
          {LEAVE_TYPE_LABELS[currentEntry.type]}
          {currentEntry.type === "work" && ` (${currentEntry.hours}h available)`}
          {currentEntry.type !== "work" && " (No work hours)"}
        </Typography>
        {currentEntry.note && (
          <Typography variant="caption" color="text.secondary">
            Note: {currentEntry.note}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default LeaveTypeSelector;
