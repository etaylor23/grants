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
import { format, eachDayOfInterval } from "date-fns";

interface TimesheetModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  startDate: Date;
  endDate: Date;
  workdays: Record<string, boolean>;
}

export const TimesheetModal: React.FC<TimesheetModalProps> = ({
  open,
  onClose,
  userId,
  userName,
  startDate,
  endDate,
  workdays,
}) => {
  // Get all dates in the period
  const allDates = eachDayOfInterval({ start: startDate, end: endDate });
  
  // Filter out dates that are not workdays (these will be disabled)
  const disabledDates = allDates
    .filter(date => {
      const dateStr = format(date, "yyyy-MM-dd");
      return !workdays[dateStr];
    })
    .map(date => format(date, "yyyy-MM-dd"));

  const periodTitle = `${userName} - ${format(startDate, "MMM dd")} to ${format(endDate, "MMM dd, yyyy")}`;

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
