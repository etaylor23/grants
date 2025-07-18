import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  IconButton,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { TimesheetGrid } from "../TimesheetGrid/TimesheetGrid";
import { useWorkdayHours } from "../../hooks/useLocalData";
import { format, eachDayOfInterval } from "date-fns";

interface TimesheetModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  startDate: Date;
  endDate: Date;
  workdays?: Record<string, boolean>; // Optional - will fetch from IndexedDB if not provided
}

export const TimesheetModal: React.FC<TimesheetModalProps> = ({
  open,
  onClose,
  userId,
  userName,
  startDate,
  endDate,
  workdays: providedWorkdays,
}) => {
  const year = startDate.getFullYear();

  // Get workday hours from IndexedDB if not provided
  const { data: workdayHours = {} } = useWorkdayHours(userId, year);

  // Use provided workdays or derive from workday hours
  const workdays = providedWorkdays || workdayHours;

  // Get all dates in the period
  const allDates = eachDayOfInterval({ start: startDate, end: endDate });

  // REMOVED: Calendar entry dependency - no longer disable dates without workday entries
  // Users can now allocate hours to any date, and workday entries will be auto-generated
  const disabledDates: string[] = []; // Empty array - all dates are now enabled

  const periodTitle = `${userName} - ${format(startDate, "MMM dd")} to ${format(
    endDate,
    "MMM dd, yyyy"
  )}`;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      PaperProps={{
        sx: {
          height: "90vh",
          maxHeight: "90vh",
        },
      }}
    >
      <DialogTitle sx={{ m: 0, p: 2, display: "flex", alignItems: "center" }}>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Timesheet - {periodTitle}
        </Typography>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0, height: "100%" }}>
        <Box sx={{ height: "100%", p: 2 }}>
          <TimesheetGrid
            userId={userId}
            startDate={startDate}
            endDate={endDate}
            disabledDates={disabledDates}
            showCard={false}
            showRowColumnControls={true}
            title={periodTitle}
          />
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};
