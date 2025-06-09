import React, { useMemo, useState, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import "./CalendarView.scss";
import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import {
  useWorkdays,
  useTimeSlots,
  useToggleWorkday,
  useAddBulkWorkdays,
} from "../../api/hooks";
import { mockGrants } from "../../api/mockData";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
} from "date-fns";
import { User } from "../../models/types";
import { generateUserColor } from "../../utils/colors";
import { TimesheetModal } from "../TimesheetModal";
import { DateRangeSelector, DateRange } from "../DateRangeSelector";
import styles from "../Layout/ModernContainer.module.css";

interface CalendarViewProps {
  selectedUsers: User[];
  onDateSelect?: (date: string) => void;
  dateRange?: DateRange;
  onDateRangeChange?: (range: DateRange) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  selectedUsers,
  onDateSelect,
  dateRange,
  onDateRangeChange,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkSelectedUserId, setBulkSelectedUserId] = useState<string>("");

  // Timesheet modal state
  const [timesheetModalOpen, setTimesheetModalOpen] = useState(false);
  const [timesheetUserId, setTimesheetUserId] = useState<string>("");
  const [timesheetUserName, setTimesheetUserName] = useState<string>("");
  const [timesheetStartDate, setTimesheetStartDate] = useState<Date>(
    new Date()
  );
  const [timesheetEndDate, setTimesheetEndDate] = useState<Date>(new Date());
  const [calendarApi, setCalendarApi] = useState<any>(null);

  // Use provided date range or default to current month
  const currentDateRange = dateRange || {
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date()),
    label: "Current Month",
  };

  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const periodStart = format(currentDateRange.startDate, "yyyy-MM-dd");
  const periodEnd = format(currentDateRange.endDate, "yyyy-MM-dd");

  // Fetch workdays and time slots for all selected users
  // Always call hooks for up to 3 users to avoid conditional hook calls
  const user1Id = selectedUsers[0]?.id || "";
  const user2Id = selectedUsers[1]?.id || "";
  const user3Id = selectedUsers[2]?.id || "";

  const user1Workdays = useWorkdays(user1Id, year).data;
  const user1TimeSlots = useTimeSlots(user1Id, periodStart, periodEnd).data || [];

  const user2Workdays = useWorkdays(user2Id, year).data;
  const user2TimeSlots = useTimeSlots(user2Id, periodStart, periodEnd).data || [];

  const user3Workdays = useWorkdays(user3Id, year).data;
  const user3TimeSlots = useTimeSlots(user3Id, periodStart, periodEnd).data || [];

  const userWorkdays = selectedUsers
    .map((user, index) => {
      switch (index) {
        case 0:
          return { user, workdays: user1Workdays, timeSlots: user1TimeSlots };
        case 1:
          return { user, workdays: user2Workdays, timeSlots: user2TimeSlots };
        case 2:
          return { user, workdays: user3Workdays, timeSlots: user3TimeSlots };
        default:
          return null;
      }
    })
    .filter(Boolean) as Array<{
    user: User;
    workdays: any;
    timeSlots: any[];
  }>;

  const toggleWorkdayMutation = useToggleWorkday();
  const addBulkWorkdaysMutation = useAddBulkWorkdays();

  // Function to get current calendar period
  const getCurrentCalendarPeriod = useCallback(() => {
    if (!calendarApi) {
      // Fallback to current month
      const now = new Date();
      return {
        start: startOfMonth(now),
        end: endOfMonth(now),
      };
    }

    const view = calendarApi.view;
    const currentDate = view.currentStart;

    switch (view.type) {
      case "dayGridMonth":
        return {
          start: startOfMonth(currentDate),
          end: endOfMonth(currentDate),
        };
      case "timeGridWeek":
        return {
          start: startOfWeek(currentDate, { weekStartsOn: 1 }), // Monday start
          end: endOfWeek(currentDate, { weekStartsOn: 1 }),
        };
      case "timeGridDay":
        return {
          start: startOfDay(currentDate),
          end: endOfDay(currentDate),
        };
      default:
        return {
          start: startOfMonth(currentDate),
          end: endOfMonth(currentDate),
        };
    }
  }, [calendarApi]);

  console.log("CalendarView render:", {
    selectedUsersCount: selectedUsers.length,
    userWorkdays: userWorkdays.map((uw) => ({
      userId: uw.user.id,
      workdaysCount: uw.workdays ? Object.keys(uw.workdays.workdays).length : 0,
    })),
  });

  const events = useMemo(() => {
    const events: any[] = [];

    // Create events for each user's workdays
    userWorkdays.forEach(({ user, workdays, timeSlots }) => {
      if (!workdays) return;

      Object.keys(workdays.workdays).forEach((date) => {
        if (workdays.workdays[date]) {
          const daySlots = timeSlots.filter((slot) => slot.date === date);
          const totalPercent = daySlots.reduce(
            (sum, slot) => sum + slot.allocationPercent,
            0
          );

          const userColor = generateUserColor(user.name);

          const event = {
            id: `workday-${user.id}-${date}`,
            title: `${user.name}: ${totalPercent}% allocated`,
            date,
            backgroundColor: userColor,
            borderColor: "transparent",
            textColor: "white",
            allDay: true,
            extendedProps: {
              userId: user.id,
              userName: user.name,
              totalPercent,
              daySlots,
            },
          };

          events.push(event);
        }
      });
    });

    console.log(
      `Created ${events.length} calendar events for ${selectedUsers.length} users`
    );
    return events;
  }, [userWorkdays, selectedUsers]);

  const handleDateClick = (info: any) => {
    const dateStr = info.dateStr;

    if (selectedUsers.length === 1) {
      // Single user - toggle workday directly
      const user = selectedUsers[0];
      const userWorkday = userWorkdays.find((uw) => uw.user.id === user.id);
      const isWorkday = userWorkday?.workdays?.workdays[dateStr] || false;

      toggleWorkdayMutation.mutate({
        userId: user.id,
        date: dateStr,
        isWorkday: !isWorkday,
      });
    } else if (selectedUsers.length > 1) {
      // Multiple users - show dialog to select which user
      setSelectedDate(dateStr);
      setSelectedUserId(selectedUsers[0].id);
      setDialogOpen(true);
    }

    onDateSelect?.(dateStr);
  };

  const handleDialogConfirm = () => {
    if (selectedUserId && selectedDate) {
      const userWorkday = userWorkdays.find(
        (uw) => uw.user.id === selectedUserId
      );
      const isWorkday = userWorkday?.workdays?.workdays[selectedDate] || false;

      toggleWorkdayMutation.mutate({
        userId: selectedUserId,
        date: selectedDate,
        isWorkday: !isWorkday,
      });
    }

    setDialogOpen(false);
    setSelectedDate("");
    setSelectedUserId("");
  };

  const handleEventClick = (info: any) => {
    // Open timesheet modal when clicking on a workday event
    const userId = info.event.extendedProps?.userId;
    const userName = info.event.extendedProps?.userName;

    if (userId && userName) {
      const period = getCurrentCalendarPeriod();

      setTimesheetUserId(userId);
      setTimesheetUserName(userName);
      setTimesheetStartDate(period.start);
      setTimesheetEndDate(period.end);
      setTimesheetModalOpen(true);
    }

    onDateSelect?.(info.event.startStr);
  };

  const handleBulkWorkdaysClick = () => {
    if (selectedUsers.length === 1) {
      // Single user - add bulk workdays directly
      const user = selectedUsers[0];

      addBulkWorkdaysMutation.mutate({
        userId: user.id,
        startDate: periodStart,
        endDate: periodEnd,
      });
    } else if (selectedUsers.length > 1) {
      // Multiple users - show dialog to select which user
      setBulkSelectedUserId(selectedUsers[0].id);
      setBulkDialogOpen(true);
    }
  };

  const handleBulkDialogConfirm = () => {
    if (bulkSelectedUserId) {
      addBulkWorkdaysMutation.mutate({
        userId: bulkSelectedUserId,
        startDate: periodStart,
        endDate: periodEnd,
      });
    }

    setBulkDialogOpen(false);
    setBulkSelectedUserId("");
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>Calendar View</h1>
          <p className={styles.subtitle}>
            Manage workdays and view time allocations across your selected date range
          </p>
        </div>

        {/* Date Range Selector */}
        {onDateRangeChange && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Date Range Selection</h2>
              <p className={styles.sectionDescription}>
                Choose a custom date range or select from preset options to view calendar data
              </p>
            </div>
            <div className={styles.sectionContent}>
              <DateRangeSelector
                selectedRange={currentDateRange}
                onRangeChange={onDateRangeChange}
              />
            </div>
          </div>
        )}

        <div className={`${styles.alert} ${styles.info}`}>
          <strong>How to use:</strong> Click on any date to add/remove a workday. Click on workday events to
          edit allocations in the timesheet view.
          <br />
          <strong>Color coding:</strong> Each user has a unique color. Event opacity indicates allocation percentage.
        </div>

        <Box sx={{ mb: 3, display: "flex", justifyContent: "center" }}>
          <button
            className={`${styles.button} ${styles.primary}`}
            onClick={handleBulkWorkdaysClick}
            disabled={addBulkWorkdaysMutation.isPending}
          >
            {addBulkWorkdaysMutation.isPending
              ? "Adding..."
              : "Add all workdays for selected period"}
          </button>
        </Box>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Calendar</h2>
            <p className={styles.sectionDescription}>
              {format(currentDateRange.startDate, "MMMM dd, yyyy")} - {format(currentDateRange.endDate, "MMMM dd, yyyy")}
              {currentDateRange.label && ` (${currentDateRange.label})`}
            </p>
          </div>
          <div className={styles.sectionContent}>
            <Box
              sx={{
                height: "600px",
                backgroundColor: "#ffffff",
                borderRadius: 2,
                border: "1px solid #e0e0e0",
                overflow: "hidden",
          "& .fc": {
            fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
          },
          "& .fc-toolbar": {
            padding: "16px 20px",
            backgroundColor: "#f8f9fa",
            borderBottom: "1px solid #e0e0e0",
          },
          "& .fc-toolbar-title": {
            fontSize: "1.5rem",
            fontWeight: 600,
            color: "#1976d2",
          },
          "& .fc-button": {
            backgroundColor: "#ffffff",
            border: "1px solid #d0d7de",
            borderRadius: "8px",
            color: "#24292f",
            fontSize: "0.875rem",
            fontWeight: 500,
            padding: "8px 16px",
            margin: "0 4px",
            transition: "all 0.2s ease-in-out",
            textTransform: "none",
            "&:hover": {
              backgroundColor: "#f6f8fa",
              borderColor: "#1976d2",
              color: "#1976d2",
            },
            "&:focus": {
              boxShadow: "0 0 0 3px rgba(25, 118, 210, 0.1)",
              outline: "none",
            },
            "&.fc-button-active": {
              backgroundColor: "#1976d2",
              borderColor: "#1976d2",
              color: "#ffffff",
              "&:hover": {
                backgroundColor: "#1565c0",
                borderColor: "#1565c0",
                color: "#ffffff",
              },
            },
            "&:disabled": {
              backgroundColor: "#f6f8fa",
              borderColor: "#d0d7de",
              color: "#8c959f",
              cursor: "not-allowed",
            },
          },
          "& .fc-daygrid-day": {
            "&:hover": {
              backgroundColor: "#f8f9fa",
            },
          },
          "& .fc-daygrid-day-number": {
            color: "#24292f",
            fontWeight: 500,
            padding: "8px",
          },
          "& .fc-col-header-cell": {
            backgroundColor: "#f6f8fa",
            borderColor: "#d0d7de",
            fontWeight: 600,
            color: "#656d76",
            textTransform: "uppercase",
            fontSize: "0.75rem",
            letterSpacing: "0.5px",
            padding: "12px 8px",
          },
          "& .fc-daygrid-day-frame": {
            minHeight: "100px",
          },
          "& .fc-event": {
            borderRadius: "6px",
            border: "none",
            fontSize: "0.75rem",
            fontWeight: 500,
            margin: "2px",
            padding: "2px 6px",
          },
          "& .fc-more-link": {
            color: "#1976d2",
            fontWeight: 500,
            fontSize: "0.75rem",
            "&:hover": {
              color: "#1565c0",
            },
          },
          "& .fc-day-today": {
            backgroundColor: "#e3f2fd !important",
            "& .fc-daygrid-day-number": {
              backgroundColor: "#1976d2",
              color: "#ffffff",
              borderRadius: "50%",
              width: "28px",
              height: "28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "4px",
            },
          },
        }}
      >
        <FullCalendar
          ref={(ref) => {
            if (ref) {
              setCalendarApi(ref.getApi());
            }
          }}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          initialDate={currentDateRange.startDate}
          validRange={{
            start: currentDateRange.startDate,
            end: currentDateRange.endDate,
          }}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          buttonText={{
            today: "Today",
            month: "Month",
            week: "Week",
            day: "Day",
          }}
          events={events}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          height="100%"
          dayMaxEvents={3}
          moreLinkClick="popover"
          eventContent={(eventInfo) => {
            const { daySlots } = eventInfo.event.extendedProps;

            return (
              <Box sx={{ p: 0.5, overflow: "hidden" }}>
                <Typography variant="caption" sx={{ fontWeight: "bold" }}>
                  {eventInfo.event.title}
                </Typography>
                {daySlots && daySlots.length > 0 && (
                  <Box sx={{ mt: 0.5 }}>
                    {daySlots.slice(0, 2).map((slot: any) => {
                      const grant = mockGrants.find(
                        (g) => g.id === slot.grantId
                      );
                      return (
                        <Typography
                          key={slot.grantId}
                          variant="caption"
                          sx={{ display: "block", fontSize: "0.65rem" }}
                        >
                          {grant?.name}: {slot.allocationPercent}%
                        </Typography>
                      );
                    })}
                    {daySlots.length > 2 && (
                      <Typography
                        variant="caption"
                        sx={{ fontSize: "0.65rem" }}
                      >
                        +{daySlots.length - 2} more
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>
            );
          }}
        />
            </Box>
          </div>
        </div>
      </div>

      {/* User Selection Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>Select User for Workday</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Which user should this workday be assigned to?
          </Typography>
          <FormControl fullWidth>
            <InputLabel>User</InputLabel>
            <Select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              label="User"
            >
              {selectedUsers.map((user) => (
                <MenuItem key={user.id} value={user.id}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        backgroundColor: generateUserColor(user.name),
                      }}
                    />
                    {user.name}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDialogConfirm} variant="contained">
            Add Workday
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Workdays Dialog */}
      <Dialog open={bulkDialogOpen} onClose={() => setBulkDialogOpen(false)}>
        <DialogTitle>Add All Workdays for Period</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            This will add all weekdays (Monday-Friday) in the current month as
            workdays. Which user should these workdays be assigned to?
          </Typography>
          <FormControl fullWidth>
            <InputLabel>User</InputLabel>
            <Select
              value={bulkSelectedUserId}
              onChange={(e) => setBulkSelectedUserId(e.target.value)}
              label="User"
            >
              {selectedUsers.map((user) => (
                <MenuItem key={user.id} value={user.id}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        backgroundColor: generateUserColor(user.name),
                      }}
                    />
                    {user.name}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleBulkDialogConfirm}
            variant="contained"
            disabled={addBulkWorkdaysMutation.isPending}
          >
            {addBulkWorkdaysMutation.isPending ? "Adding..." : "Add Workdays"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Timesheet Modal */}
      {timesheetUserId && (
        <TimesheetModal
          open={timesheetModalOpen}
          onClose={() => setTimesheetModalOpen(false)}
          userId={timesheetUserId}
          userName={timesheetUserName}
          startDate={timesheetStartDate}
          endDate={timesheetEndDate}
          workdays={
            userWorkdays.find((uw) => uw.user.id === timesheetUserId)?.workdays
              ?.workdays || {}
          }
        />
      )}
    </div>
  );
};
