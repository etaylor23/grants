import React, { useMemo, useState, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import {
  Box,
  Card,
  Typography,
  Alert,
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
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay } from "date-fns";
import { User } from "../../models/types";
import { generateUserColor } from "../../utils/colors";
import { TimesheetModal } from "../TimesheetModal";

interface CalendarViewProps {
  selectedUsers: User[];
  onDateSelect?: (date: string) => void;
  onSwitchToGrid?: (userId?: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  selectedUsers,
  onDateSelect,
  onSwitchToGrid,
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
  const [timesheetStartDate, setTimesheetStartDate] = useState<Date>(new Date());
  const [timesheetEndDate, setTimesheetEndDate] = useState<Date>(new Date());
  const [calendarApi, setCalendarApi] = useState<any>(null);

  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const monthStart = format(startOfMonth(currentDate), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(currentDate), "yyyy-MM-dd");

  // Fetch workdays and time slots for all selected users
  // Always call hooks for up to 3 users to avoid conditional hook calls
  const user1Id = selectedUsers[0]?.id || "";
  const user2Id = selectedUsers[1]?.id || "";
  const user3Id = selectedUsers[2]?.id || "";

  const user1Workdays = useWorkdays(user1Id, year).data;
  const user1TimeSlots = useTimeSlots(user1Id, monthStart, monthEnd).data || [];

  const user2Workdays = useWorkdays(user2Id, year).data;
  const user2TimeSlots = useTimeSlots(user2Id, monthStart, monthEnd).data || [];

  const user3Workdays = useWorkdays(user3Id, year).data;
  const user3TimeSlots = useTimeSlots(user3Id, monthStart, monthEnd).data || [];

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
      const monthEnd = format(endOfMonth(currentDate), "yyyy-MM-dd");

      addBulkWorkdaysMutation.mutate({
        userId: user.id,
        startDate: monthStart,
        endDate: monthEnd,
      });
    } else if (selectedUsers.length > 1) {
      // Multiple users - show dialog to select which user
      setBulkSelectedUserId(selectedUsers[0].id);
      setBulkDialogOpen(true);
    }
  };

  const handleBulkDialogConfirm = () => {
    if (bulkSelectedUserId) {
      const monthEnd = format(endOfMonth(currentDate), "yyyy-MM-dd");

      addBulkWorkdaysMutation.mutate({
        userId: bulkSelectedUserId,
        startDate: monthStart,
        endDate: monthEnd,
      });
    }

    setBulkDialogOpen(false);
    setBulkSelectedUserId("");
  };

  return (
    <Card sx={{ p: 2, height: "100%" }}>
      <Typography variant="h6" gutterBottom>
        Calendar View
      </Typography>

      <Alert severity="info" sx={{ mb: 2 }}>
        Click on any date to add/remove a workday. Click on workday events to
        edit allocations in the grid view.
        <br />
        <strong>Colors:</strong> Gray = 0% allocated, Blue = Partial, Green =
        100%, Red = Over 100%
      </Alert>

      <Box sx={{ mb: 2, display: "flex", justifyContent: "center" }}>
        <Button
          variant="contained"
          onClick={handleBulkWorkdaysClick}
          disabled={addBulkWorkdaysMutation.isPending}
        >
          {addBulkWorkdaysMutation.isPending
            ? "Adding..."
            : "Add all workdays for period"}
        </Button>
      </Box>

      <Box sx={{ height: "calc(100% - 180px)" }}>
        <FullCalendar
          ref={(ref) => {
            if (ref) {
              setCalendarApi(ref.getApi());
            }
          }}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
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
            userWorkdays.find(uw => uw.user.id === timesheetUserId)?.workdays?.workdays || {}
          }
        />
      )}
    </Card>
  );
};
