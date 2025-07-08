import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Alert,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { format } from "date-fns";
import { LeaveTypeSelector } from "../LeaveTypeSelector";
import { DayEntry, LeaveType, createWorkDayEntry, createLeaveEntry } from "../../db/schema";

interface DayTypeModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (entry: DayEntry) => Promise<void>;
  date: string;
  currentEntry?: number | DayEntry;
  userName: string;
}

export const DayTypeModal: React.FC<DayTypeModalProps> = ({
  open,
  onClose,
  onSave,
  date,
  currentEntry,
  userName,
}) => {
  const [entry, setEntry] = useState<DayEntry>(createWorkDayEntry());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize entry when modal opens or currentEntry changes
  useEffect(() => {
    if (currentEntry) {
      if (typeof currentEntry === "number") {
        // Convert legacy format
        setEntry({
          hours: currentEntry,
          type: currentEntry > 0 ? "work" : "work",
        });
      } else {
        setEntry(currentEntry);
      }
    } else {
      // Default to work day
      setEntry(createWorkDayEntry());
    }
  }, [currentEntry, open]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      await onSave(entry);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save day type");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      setError(null);
      onClose();
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "EEEE, MMMM do, yyyy");
    } catch {
      return dateStr;
    }
  };

  const getLeaveTypeColor = (type: LeaveType) => {
    const colors = {
      work: "#4caf50",
      "annual-leave": "#2196f3",
      "sick-leave": "#ff9800",
      "public-holiday": "#9c27b0",
      other: "#607d8b",
    };
    return colors[type];
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle sx={{ m: 0, p: 2, display: "flex", alignItems: "center" }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h6" component="div">
            Edit Day Type
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {userName} - {formatDate(date)}
          </Typography>
        </Box>
        <IconButton
          aria-label="close"
          onClick={handleClose}
          disabled={saving}
          sx={{
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mb: 3 }}>
          <Typography variant="body1" gutterBottom>
            Set the type and availability for this day:
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Work days allow timesheet hour allocation, while leave days do not.
          </Typography>
        </Box>

        <LeaveTypeSelector
          value={entry}
          onChange={setEntry}
          disabled={saving}
          label="Day Type"
        />

        {/* Impact Information */}
        <Box sx={{ 
          mt: 3, 
          p: 2, 
          backgroundColor: "grey.50", 
          borderRadius: 1,
          border: `1px solid ${getLeaveTypeColor(entry.type)}20`,
        }}>
          <Typography variant="subtitle2" gutterBottom>
            Impact on Timesheet:
          </Typography>
          {entry.type === "work" ? (
            <Typography variant="body2" color="text.secondary">
              • {entry.hours} hours will be available for grant allocation
              • This day will appear as editable in timesheet grids
              • Utilization calculations will include this day
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary">
              • No hours available for grant allocation
              • This day will be marked as leave in timesheet grids
              • Utilization calculations will exclude this day
            </Typography>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button 
          onClick={handleClose} 
          disabled={saving}
          color="inherit"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
          variant="contained"
          sx={{
            backgroundColor: getLeaveTypeColor(entry.type),
            "&:hover": {
              backgroundColor: getLeaveTypeColor(entry.type),
              filter: "brightness(0.9)",
            },
          }}
        >
          {saving ? "Saving..." : "Save Day Type"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DayTypeModal;
