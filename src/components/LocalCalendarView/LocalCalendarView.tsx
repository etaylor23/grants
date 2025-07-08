import React, { useState, useMemo, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Box, Typography, Button, Alert } from "@mui/material";
import {
  useWorkdayHours,
  useTimeSlots,
  useGrants,
} from "../../hooks/useLocalData";
import {
  format,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
} from "date-fns";
import { generateUserColor } from "../../utils/colors";
import { getHoursFromDayEntry } from "../../db/schema";
import { EnhancedTimesheetModal } from "../EnhancedTimesheetModal";
import { DayTypeModal } from "../DayTypeModal";
import { useSaveWorkdayHours } from "../../hooks/useLocalData";
import styles from "../Layout/ModernContainer.module.css";

interface LocalCalendarViewProps {
  userId: string;
  userName: string;
  onDateSelect?: (date: string) => void;
}

export const LocalCalendarView: React.FC<LocalCalendarViewProps> = ({
  userId,
  userName,
  onDateSelect,
}) => {
  const [timesheetModalOpen, setTimesheetModalOpen] = useState(false);
  const [dayTypeModalOpen, setDayTypeModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [calendarApi, setCalendarApi] = useState<any>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Calculate current view period based on calendar's current view (unconstrained)
  const currentMonth = startOfMonth(currentDate);
  const currentMonthEnd = endOfMonth(currentDate);
  const year = currentDate.getFullYear();

  // Fetch data for current view period (expanded to include adjacent months for smooth navigation)
  const extendedStart = subMonths(currentMonth, 1);
  const extendedEnd = addMonths(currentMonthEnd, 1);

  const periodStart = format(extendedStart, "yyyy-MM-dd");
  const periodEnd = format(extendedEnd, "yyyy-MM-dd");

  // Fetch data from IndexedDB
  const { data: workdayHours = {} } = useWorkdayHours(userId, year);
  const { data: timeSlots = [] } = useTimeSlots(userId, periodStart, periodEnd);
  const { data: grants = [] } = useGrants();

  // Mutations
  const saveWorkdayHoursMutation = useSaveWorkdayHours();

  console.log("LocalCalendarView data:", {
    userId,
    userName,
    currentDate: format(currentDate, "yyyy-MM-dd"),
    periodStart,
    periodEnd,
    year,
    workdayHours,
    workdayHoursCount: Object.keys(workdayHours).length,
    timeSlots,
    timeSlotsCount: timeSlots.length,
    grants,
    grantsCount: grants.length,
  });

  // REVERSE DATA FLOW: Create calendar events from timesheet allocations
  const events = useMemo(() => {
    const events: any[] = [];
    const userColor = generateUserColor(userName);

    console.log("Creating calendar events from timesheet data...", {
      timeSlots,
      workdayHours,
      userName,
      userColor,
    });

    // Group time slots by date to create calendar events
    const slotsByDate = timeSlots.reduce(
      (acc: Record<string, any[]>, slot: any) => {
        if (!acc[slot.Date]) {
          acc[slot.Date] = [];
        }
        acc[slot.Date].push(slot);
        return acc;
      },
      {}
    );

    // Create events for each date that has time slot allocations
    Object.entries(slotsByDate).forEach(([date, daySlots]) => {
      const totalHours = daySlots.reduce(
        (sum, slot: any) => sum + (slot.HoursAllocated || 0),
        0
      );

      // Get available hours from workday hours, or use default if auto-generated
      const availableHours = workdayHours[date]
        ? getHoursFromDayEntry(workdayHours[date])
        : 8;
      const totalPercent = Math.round((totalHours / availableHours) * 100);

      console.log(
        `Date ${date}: ${daySlots.length} slots, ${totalHours}h total, ${availableHours}h available`
      );

      const event = {
        id: `workday-${userId}-${date}`,
        title: `${userName}: ${totalHours}h / ${availableHours}h (${totalPercent}%)`,
        date,
        backgroundColor: userColor,
        borderColor: "transparent",
        textColor: "white",
        allDay: true,
        extendedProps: {
          userId,
          userName,
          totalHours,
          availableHours,
          totalPercent,
          daySlots,
        },
      };

      console.log(`Created event for ${date}:`, event);
      events.push(event);
    });

    // If no events were created, add some test events to verify click functionality
    if (events.length === 0 && userId && userName) {
      console.log("No events from data, creating test events...");

      // Create test events for the first few days of the period
      const testDates = [
        format(currentMonth, "yyyy-MM-dd"),
        format(
          new Date(currentMonth.getTime() + 24 * 60 * 60 * 1000),
          "yyyy-MM-dd"
        ),
        format(
          new Date(currentMonth.getTime() + 2 * 24 * 60 * 60 * 1000),
          "yyyy-MM-dd"
        ),
      ];

      testDates.forEach((date, index) => {
        const testEvent = {
          id: `test-${userId}-${date}`,
          title: `${userName}: Test Event ${index + 1}`,
          date,
          backgroundColor: userColor,
          borderColor: "transparent",
          textColor: "white",
          allDay: true,
          extendedProps: {
            userId,
            userName,
            totalHours: 8,
            availableHours: 8,
            totalPercent: 100,
            daySlots: [],
            isTestEvent: true,
          },
        };
        events.push(testEvent);
      });

      console.log(`Created ${testDates.length} test events`);
    }

    console.log(
      `Final events count: ${events.length} for ${userName}:`,
      events
    );
    return events;
  }, [userId, userName, workdayHours, timeSlots]);

  // Calendar view configuration (unconstrained)
  const calendarViewConfig = useMemo(() => {
    return {
      initialView: "dayGridMonth",
      headerToolbar: {
        left: "prev,next today",
        center: "title",
        right: "dayGridMonth,dayGridWeek,listMonth",
      },
      height: 700,
    };
  }, []);

  // Function to get current calendar period
  const getCurrentCalendarPeriod = useCallback(() => {
    if (!calendarApi) {
      return {
        start: currentMonth,
        end: currentMonthEnd,
      };
    }

    const view = calendarApi.view;
    const viewCurrentDate = view.currentStart;

    switch (view.type) {
      case "dayGridMonth":
        return {
          start: startOfMonth(viewCurrentDate),
          end: endOfMonth(viewCurrentDate),
        };
      default:
        return {
          start: currentMonth,
          end: currentMonthEnd,
        };
    }
  }, [calendarApi, currentMonth, currentMonthEnd]);

  const handleDatesSet = useCallback((dateInfo: any) => {
    // Update current date when calendar view changes
    setCurrentDate(dateInfo.start);
  }, []);

  const handleDateClick = async (info: any) => {
    const dateStr = info.dateStr;
    console.log("📅 Date clicked:", dateStr, info);

    // Store selected date for modals
    setSelectedDate(dateStr);

    // For now, open timesheet modal directly
    // TODO: Could add context menu or modifier key detection for day type editing
    setTimesheetModalOpen(true);
    onDateSelect?.(dateStr);
  };

  const handleDayTypeSave = async (entry: any) => {
    if (!selectedDate) return;

    const year = new Date(selectedDate).getFullYear();
    await saveWorkdayHoursMutation.mutateAsync({
      userId,
      year,
      date: selectedDate,
      entry,
    });
  };

  const handleEventClick = (info: any) => {
    console.log("🎯 Event clicked:", info.event, info);

    // Open enhanced timesheet modal when clicking on a workday event
    const eventUserId = info.event.extendedProps?.userId;
    const eventUserName = info.event.extendedProps?.userName;

    console.log("Event details:", { eventUserId, eventUserName });

    if (eventUserId && eventUserName) {
      setTimesheetModalOpen(true);
    } else {
      console.warn("Event missing user details:", info.event.extendedProps);
    }

    onDateSelect?.(info.event.startStr);
  };

  // Debug function to manually seed database
  const handleDebugSeed = async () => {
    try {
      console.log("🌱 Manually seeding database...");
      const { seedLocalDynamo } = await import("../../db/seedLocalDynamo");
      await seedLocalDynamo();
      console.log("✅ Database seeded successfully");

      // Refresh the page to reload data
      window.location.reload();
    } catch (error) {
      console.error("❌ Database seeding failed:", error);
    }
  };

  // Debug function to check database contents
  const handleDebugDatabase = async () => {
    try {
      console.log("🔍 Checking database contents...");
      const { db } = await import("../../db/schema");

      const individuals = await db.individuals.toArray();
      const grants = await db.grants.toArray();
      const workdays = await db.workdays.toArray();
      const workdayHours = await db.workdayHours.toArray();
      const timeslots = await db.timeslots.toArray();

      console.log("📊 Database contents:", {
        individuals: individuals.length,
        grants: grants.length,
        workdays: workdays.length,
        workdayHours: workdayHours.length,
        timeslots: timeslots.length,
      });

      console.log("👥 Individuals:", individuals);
      console.log("💰 Grants:", grants);
      console.log("📅 Workdays:", workdays);
      console.log("⏰ Workday Hours:", workdayHours);
      console.log("🎯 Time Slots:", timeslots);
    } catch (error) {
      console.error("❌ Database check failed:", error);
    }
  };

  return (
    <Box sx={{ width: "100%", minHeight: "100vh", p: 2 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
          Calendar for {userName}
        </Typography>
      </Box>

      {/* Calendar Section */}
      <Box sx={{ mb: 3 }}>
        <Box
          sx={{
            width: "100%",
            height: calendarViewConfig.height,
            backgroundColor: "#ffffff",
            borderRadius: 2,
            border: "1px solid #e0e0e0",
            overflow: "hidden",
            "& .fc": {
              fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
              height: "100%",
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
              "&.fc-button-active": {
                backgroundColor: "#1976d2",
                borderColor: "#1976d2",
                color: "#ffffff",
              },
            },
            "& .fc-event": {
              borderRadius: "6px",
              border: "none",
              fontSize: "0.75rem",
              fontWeight: 500,
              margin: "2px",
              padding: "2px 6px",
            },
            "& .fc-day-today": {
              backgroundColor: "#e3f2fd !important",
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
            initialView={calendarViewConfig.initialView}
            initialDate={currentDate}
            datesSet={handleDatesSet}
            headerToolbar={calendarViewConfig.headerToolbar}
            buttonText={{
              today: "Today",
              month: "Month",
              week: "Week",
              listMonth: "List",
              listYear: "Year List",
            }}
            events={events}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            height="100%"
            dayMaxEvents={3}
            moreLinkClick="popover"
            eventContent={(eventInfo) => {
              const { daySlots, totalHours, availableHours } =
                eventInfo.event.extendedProps;

              return (
                <Box sx={{ p: 0.5, overflow: "hidden" }}>
                  <Typography variant="caption" sx={{ fontWeight: "bold" }}>
                    {totalHours}h / {availableHours}h
                  </Typography>
                  {daySlots && daySlots.length > 0 && (
                    <Box sx={{ mt: 0.5 }}>
                      {daySlots.slice(0, 2).map((slot: any) => {
                        const grant = grants.find(
                          (g: any) => g.PK === slot.GrantID
                        );
                        return (
                          <Typography
                            key={slot.GrantID}
                            variant="caption"
                            sx={{
                              display: "block",
                              fontSize: "0.65rem",
                              opacity: 0.9,
                            }}
                          >
                            {grant?.Title || "Unknown Grant"}:{" "}
                            {slot.HoursAllocated}h
                          </Typography>
                        );
                      })}
                      {daySlots.length > 2 && (
                        <Typography
                          variant="caption"
                          sx={{ fontSize: "0.65rem", opacity: 0.8 }}
                        >
                          +{daySlots.length - 2} more...
                        </Typography>
                      )}
                    </Box>
                  )}
                </Box>
              );
            }}
          />
        </Box>
      </Box>

      {/* Enhanced Timesheet Modal */}
      <EnhancedTimesheetModal
        open={timesheetModalOpen}
        onClose={() => setTimesheetModalOpen(false)}
        userId={userId}
        userName={userName}
      />

      {/* Day Type Modal */}
      <DayTypeModal
        open={dayTypeModalOpen}
        onClose={() => setDayTypeModalOpen(false)}
        onSave={handleDayTypeSave}
        date={selectedDate}
        currentEntry={selectedDate ? workdayHours[selectedDate] : undefined}
        userName={userName}
      />

      {/* Info Alert */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>How to use:</strong> Click on any calendar day to open the
          timesheet. Right-click or use Shift+Click to edit day type
          (work/leave).
          <br />
          <strong>Event details:</strong> Shows hours allocated vs available
          hours and percentage utilization.
          <br />
          <strong>Leave Management:</strong>
          <Button
            size="small"
            onClick={() => {
              setSelectedDate(format(new Date(), "yyyy-MM-dd"));
              setDayTypeModalOpen(true);
            }}
            sx={{ ml: 1, mr: 1 }}
          >
            Edit Day Types
          </Button>
          <strong>Debug:</strong>
          <Button
            size="small"
            onClick={handleDebugDatabase}
            sx={{ ml: 1, mr: 1 }}
          >
            Check Database
          </Button>
          <Button size="small" onClick={handleDebugSeed} sx={{ mr: 1 }}>
            Seed Database
          </Button>
          Events: {events.length}
        </Typography>
      </Alert>
    </Box>
  );
};
