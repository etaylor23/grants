import React, { useState, useMemo, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import {
  Box,
  Typography,
} from "@mui/material";
import {
  useWorkdayHours,
  useTimeSlots,
  useGrants,
} from "../../hooks/useLocalData";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { generateUserColor } from "../../utils/colors";
import { TimesheetModal } from "../TimesheetModal";
import { DateRange } from "../DateRangeSelector";
import styles from "../Layout/ModernContainer.module.css";

interface LocalCalendarViewProps {
  userId: string;
  userName: string;
  onDateSelect?: (date: string) => void;
  dateRange?: DateRange;
}

export const LocalCalendarView: React.FC<LocalCalendarViewProps> = ({
  userId,
  userName,
  onDateSelect,
  dateRange,
}) => {
  const [timesheetModalOpen, setTimesheetModalOpen] = useState(false);
  const [timesheetStartDate, setTimesheetStartDate] = useState<Date>(new Date());
  const [timesheetEndDate, setTimesheetEndDate] = useState<Date>(new Date());
  const [calendarApi, setCalendarApi] = useState<any>(null);

  // Use provided date range or default to current month
  const currentDateRange = dateRange || {
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date()),
    label: "Current Month",
  };

  const year = new Date().getFullYear();
  const periodStart = format(currentDateRange.startDate, "yyyy-MM-dd");
  const periodEnd = format(currentDateRange.endDate, "yyyy-MM-dd");

  // Fetch data from IndexedDB
  const { data: workdayHours = {} } = useWorkdayHours(userId, year);
  const { data: timeSlots = [] } = useTimeSlots(userId, periodStart, periodEnd);
  const { data: grants = [] } = useGrants();

  console.log("LocalCalendarView data:", {
    userId,
    userName,
    workdayHoursCount: Object.keys(workdayHours).length,
    timeSlotsCount: timeSlots.length,
    grantsCount: grants.length,
  });

  // Create calendar events from workday hours and time slots
  const events = useMemo(() => {
    const events: any[] = [];
    const userColor = generateUserColor(userName);

    // Create events for each workday
    Object.entries(workdayHours).forEach(([date, hours]) => {
      if (hours > 0) {
        // Find time slots for this date
        const daySlots = timeSlots.filter((slot: any) => slot.Date === date);
        const totalHours = daySlots.reduce((sum, slot: any) => sum + (slot.HoursAllocated || 0), 0);
        const totalPercent = Math.round((totalHours / hours) * 100);

        const event = {
          id: `workday-${userId}-${date}`,
          title: `${userName}: ${totalHours}h / ${hours}h (${totalPercent}%)`,
          date,
          backgroundColor: userColor,
          borderColor: "transparent",
          textColor: "white",
          allDay: true,
          extendedProps: {
            userId,
            userName,
            totalHours,
            availableHours: hours,
            totalPercent,
            daySlots,
          },
        };

        events.push(event);
      }
    });

    console.log(`Created ${events.length} calendar events for ${userName}`);
    return events;
  }, [userId, userName, workdayHours, timeSlots]);

  // Function to get current calendar period
  const getCurrentCalendarPeriod = useCallback(() => {
    if (!calendarApi) {
      return {
        start: currentDateRange.startDate,
        end: currentDateRange.endDate,
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
      default:
        return {
          start: currentDateRange.startDate,
          end: currentDateRange.endDate,
        };
    }
  }, [calendarApi, currentDateRange]);

  const handleDateClick = (info: any) => {
    const dateStr = info.dateStr;
    console.log("Date clicked:", dateStr);
    onDateSelect?.(dateStr);
  };

  const handleEventClick = (info: any) => {
    // Open timesheet modal when clicking on a workday event
    const eventUserId = info.event.extendedProps?.userId;
    const eventUserName = info.event.extendedProps?.userName;

    if (eventUserId && eventUserName) {
      const period = getCurrentCalendarPeriod();
      setTimesheetStartDate(period.start);
      setTimesheetEndDate(period.end);
      setTimesheetModalOpen(true);
    }

    onDateSelect?.(info.event.startStr);
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>Calendar View - {userName}</h1>
          <p className={styles.subtitle}>
            View time allocations and workdays for the selected period
          </p>
        </div>

        <div className={`${styles.alert} ${styles.info}`}>
          <strong>How to use:</strong> Click on workday events to edit allocations in the timesheet view.
          <br />
          <strong>Event details:</strong> Shows hours allocated vs available hours and percentage utilization.
        </div>

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
                initialView="dayGridMonth"
                initialDate={currentDateRange.startDate}
                validRange={{
                  start: currentDateRange.startDate,
                  end: currentDateRange.endDate,
                }}
                headerToolbar={{
                  left: "prev,next today",
                  center: "title",
                  right: "dayGridMonth,timeGridWeek",
                }}
                buttonText={{
                  today: "Today",
                  month: "Month",
                  week: "Week",
                }}
                events={events}
                dateClick={handleDateClick}
                eventClick={handleEventClick}
                height="100%"
                dayMaxEvents={3}
                moreLinkClick="popover"
                eventContent={(eventInfo) => {
                  const { daySlots, totalHours, availableHours } = eventInfo.event.extendedProps;

                  return (
                    <Box sx={{ p: 0.5, overflow: "hidden" }}>
                      <Typography variant="caption" sx={{ fontWeight: "bold" }}>
                        {totalHours}h / {availableHours}h
                      </Typography>
                      {daySlots && daySlots.length > 0 && (
                        <Box sx={{ mt: 0.5 }}>
                          {daySlots.slice(0, 2).map((slot: any) => {
                            const grant = grants.find((g: any) => g.PK === slot.GrantID);
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
                                {grant?.Title || 'Unknown Grant'}: {slot.HoursAllocated}h
                              </Typography>
                            );
                          })}
                          {daySlots.length > 2 && (
                            <Typography variant="caption" sx={{ fontSize: "0.65rem", opacity: 0.8 }}>
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
          </div>
        </div>
      </div>

      {/* Timesheet Modal */}
      <TimesheetModal
        open={timesheetModalOpen}
        onClose={() => setTimesheetModalOpen(false)}
        userId={userId}
        userName={userName}
        startDate={timesheetStartDate}
        endDate={timesheetEndDate}
      />
    </div>
  );
};
