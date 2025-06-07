import React, { useMemo, useState } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  TextField,
  Button,
  Stack,
} from "@mui/material";
import { CalendarMonth as CalendarIcon } from "@mui/icons-material";
import { useGrantTimeSlots, usePersonnel } from "../../api/hooks";
import { TimeSlot, Personnel } from "../../models/types";

interface GrantTimesheetProps {
  grantId: string;
  grantName: string;
  grantColor: string;
}

interface PersonnelHours {
  personnelId: string;
  personnelName: string;
  dailyHours: Record<string, number>; // date -> allocated hours
  totalHours: number;
  totalDays: number;
}

// Helper function to get current month date range
const getCurrentMonthRange = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const startDate = new Date(year, month, 1).toISOString().split("T")[0];
  const endDate = new Date(year, month + 1, 0).toISOString().split("T")[0];

  return { startDate, endDate };
};

export const GrantTimesheet: React.FC<GrantTimesheetProps> = ({
  grantId,
  grantName,
  grantColor,
}) => {
  // Get current month in YYYY-MM format for the input
  const getCurrentMonthInput = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
  };

  // All useState hooks must be at the top
  const [dateRange, setDateRange] = useState(() => getCurrentMonthRange());
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthInput());

  const {
    data: timeSlots = [],
    isLoading: timeSlotsLoading,
    error: timeSlotsError,
  } = useGrantTimeSlots(grantId, dateRange.startDate, dateRange.endDate);
  const { data: personnel = [], isLoading: personnelLoading } = usePersonnel();

  // Calculate personnel hours for this grant
  const personnelHours = useMemo((): PersonnelHours[] => {
    if (!timeSlots.length || !personnel.length) return [];

    // Group time slots by user
    const userSlots = timeSlots.reduce((acc, slot) => {
      if (!acc[slot.userId]) {
        acc[slot.userId] = [];
      }
      acc[slot.userId].push(slot);
      return acc;
    }, {} as Record<string, TimeSlot[]>);

    // Calculate hours for each person
    return Object.entries(userSlots)
      .map(([userId, slots]) => {
        const person = personnel.find((p) => p.id === userId);
        const dailyHours: Record<string, number> = {};
        let totalHours = 0;

        slots.forEach((slot) => {
          // Calculate allocated hours: totalHours * (allocationPercent / 100)
          const allocatedHours =
            slot.totalHours * (slot.allocationPercent / 100);
          dailyHours[slot.date] = allocatedHours;
          totalHours += allocatedHours;
        });

        return {
          personnelId: userId,
          personnelName: person
            ? `${person.firstName} ${person.lastName}`
            : `User ${userId}`,
          dailyHours,
          totalHours,
          totalDays: Object.keys(dailyHours).length,
        };
      })
      .sort((a, b) => a.personnelName.localeCompare(b.personnelName));
  }, [timeSlots, personnel]);

  // Generate date array for table headers
  const dateArray = useMemo(() => {
    const dates: string[] = [];
    const start = new Date(dateRange.startDate);
    const end = new Date(dateRange.endDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split("T")[0]);
    }

    return dates;
  }, [dateRange.startDate, dateRange.endDate]);

  // Calculate grand totals
  const grandTotalHours = personnelHours.reduce(
    (sum, person) => sum + person.totalHours,
    0
  );
  const grandTotalDays = personnelHours.reduce(
    (sum, person) => sum + person.totalDays,
    0
  );

  if (timeSlotsLoading || personnelLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (timeSlotsError) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Failed to load grant timesheet data
      </Alert>
    );
  }

  // Handle date range changes
  const handleMonthChange = (selectedMonth: string) => {
    const [year, month] = selectedMonth.split("-").map(Number);

    const startDate = new Date(year, month - 1, 1).toISOString().split("T")[0];
    const endDate = new Date(year, month, 0).toISOString().split("T")[0];

    setDateRange({ startDate, endDate });
  };

  return (
    <Box>
      {/* Grant Header with Date Controls */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          mb: 3,
          flexWrap: "wrap",
        }}
      >
        <Box
          sx={{
            width: 24,
            height: 24,
            backgroundColor: grantColor,
            borderRadius: "50%",
            border: "1px solid #e0e0e0",
          }}
        />
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          {grantName} - Timesheet
        </Typography>

        {/* Date Range Controls */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, ml: "auto" }}>
          <TextField
            type="month"
            value={selectedMonth}
            onChange={(e) => {
              setSelectedMonth(e.target.value);
              handleMonthChange(e.target.value);
            }}
            size="small"
            sx={{ minWidth: 150 }}
            InputProps={{
              startAdornment: (
                <CalendarIcon sx={{ mr: 1, color: "text.secondary" }} />
              ),
            }}
          />
          <Chip
            label={`${dateRange.startDate} to ${dateRange.endDate}`}
            variant="outlined"
            size="small"
          />
        </Box>
      </Box>

      {personnelHours.length === 0 ? (
        <Alert severity="info" sx={{ m: 2 }}>
          No time allocations found for this grant in the selected date range.
        </Alert>
      ) : (
        <TableContainer
          component={Paper}
          sx={{
            borderRadius: 2,
            border: "1px solid #e0e0e0",
            overflow: "auto",
            maxHeight: "70vh",
          }}
        >
          <Table stickyHeader>
            <TableHead>
              <TableRow sx={{ backgroundColor: "#f8f9fa" }}>
                <TableCell sx={{ fontWeight: 600, minWidth: 150 }}>
                  Personnel
                </TableCell>
                {dateArray.map((date) => (
                  <TableCell
                    key={date}
                    align="center"
                    sx={{ fontWeight: 600, minWidth: 100 }}
                  >
                    {new Date(date).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "2-digit",
                    })}
                  </TableCell>
                ))}
                <TableCell
                  align="center"
                  sx={{
                    fontWeight: 600,
                    minWidth: 120,
                    backgroundColor: "#e3f2fd",
                  }}
                >
                  Total Hours
                </TableCell>
                <TableCell
                  align="center"
                  sx={{
                    fontWeight: 600,
                    minWidth: 100,
                    backgroundColor: "#e3f2fd",
                  }}
                >
                  Total Days
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {personnelHours.map((person) => (
                <TableRow key={person.personnelId} hover>
                  <TableCell sx={{ fontWeight: 500 }}>
                    {person.personnelName}
                  </TableCell>
                  {dateArray.map((date) => (
                    <TableCell key={date} align="center">
                      {person.dailyHours[date] ? (
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 500,
                            color:
                              person.dailyHours[date] > 0
                                ? "primary.main"
                                : "text.secondary",
                          }}
                        >
                          {person.dailyHours[date].toFixed(1)}h
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="text.disabled">
                          -
                        </Typography>
                      )}
                    </TableCell>
                  ))}
                  <TableCell
                    align="center"
                    sx={{
                      fontWeight: 600,
                      backgroundColor: "#f5f5f5",
                      color: "primary.main",
                    }}
                  >
                    {person.totalHours.toFixed(1)}h
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      fontWeight: 600,
                      backgroundColor: "#f5f5f5",
                      color: "primary.main",
                    }}
                  >
                    {person.totalDays}
                  </TableCell>
                </TableRow>
              ))}

              {/* Grand Total Row */}
              <TableRow sx={{ backgroundColor: "#e3f2fd" }}>
                <TableCell sx={{ fontWeight: 700, fontSize: "1.1rem" }}>
                  Grand Total
                </TableCell>
                {dateArray.map((date) => {
                  const dayTotal = personnelHours.reduce(
                    (sum, person) => sum + (person.dailyHours[date] || 0),
                    0
                  );
                  return (
                    <TableCell key={date} align="center">
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          color:
                            dayTotal > 0 ? "primary.main" : "text.disabled",
                        }}
                      >
                        {dayTotal > 0 ? `${dayTotal.toFixed(1)}h` : "-"}
                      </Typography>
                    </TableCell>
                  );
                })}
                <TableCell
                  align="center"
                  sx={{
                    fontWeight: 700,
                    fontSize: "1.1rem",
                    color: "primary.main",
                  }}
                >
                  {grandTotalHours.toFixed(1)}h
                </TableCell>
                <TableCell
                  align="center"
                  sx={{
                    fontWeight: 700,
                    fontSize: "1.1rem",
                    color: "primary.main",
                  }}
                >
                  {grandTotalDays}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Summary Statistics */}
      {personnelHours.length > 0 && (
        <Box sx={{ mt: 3, display: "flex", gap: 3, flexWrap: "wrap" }}>
          <Paper sx={{ p: 2, minWidth: 200 }}>
            <Typography variant="h6" color="primary" gutterBottom>
              {grandTotalHours.toFixed(1)} hours
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total allocated to this grant
            </Typography>
          </Paper>

          <Paper sx={{ p: 2, minWidth: 200 }}>
            <Typography variant="h6" color="primary" gutterBottom>
              {personnelHours.length} people
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Working on this grant
            </Typography>
          </Paper>

          <Paper sx={{ p: 2, minWidth: 200 }}>
            <Typography variant="h6" color="primary" gutterBottom>
              {(grandTotalHours / Math.max(dateArray.length, 1)).toFixed(1)}{" "}
              hours/day
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Average daily allocation
            </Typography>
          </Paper>
        </Box>
      )}
    </Box>
  );
};
