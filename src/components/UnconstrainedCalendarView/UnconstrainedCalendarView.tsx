import React, { useState, useMemo, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import {
  Box,
  Typography,
  Button,
  Alert,
} from "@mui/material";
import {
  useWorkdayHours,
  useTimeSlots,
  useGrants,
} from "../../hooks/useLocalData";
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { generateUserColor } from "../../utils/colors";
import { EnhancedTimesheetModal } from "../EnhancedTimesheetModal";

interface UnconstrainedCalendarViewProps {
  userId: string;
  userName: string;
  organisationId?: string;
  onDateSelect?: (date: string) => void;
}

export const UnconstrainedCalendarView: React.FC<UnconstrainedCalendarViewProps> = ({
  userId,
  userName,
  organisationId,
  onDateSelect,
}) => {
  const [timesheetModalOpen, setTimesheetModalOpen] = useState(false);
  const [calendarApi, setCalendarApi] = useState<any>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Calculate current view period based on calendar's current view
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
  const { data: allGrants = [] } = useGrants();

  // Filter grants by organisation if specified
  const grants = useMemo(() => {
    if (organisationId) {
      return allGrants.filter(grant => grant.OrganisationID === organisationId);
    }
    return allGrants;
  }, [allGrants, organisationId]);

  console.log("UnconstrainedCalendarView data:", {
    userId,
    userName,
    organisationId,
    currentDate: format(currentDate, 'yyyy-MM-dd'),
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

  // Create events for the calendar
  const events = useMemo(() => {
    const eventList: any[] = [];
    const userColor = generateUserColor(userName);

    // Group time slots by date
    const slotsByDate = timeSlots.reduce((acc: any, slot: any) => {
      if (!acc[slot.Date]) {
        acc[slot.Date] = [];
      }
      acc[slot.Date].push(slot);
      return acc;
    }, {});

    // Create events for each date with time slots
    Object.entries(slotsByDate).forEach(([date, daySlots]: [string, any]) => {
      const totalHours = daySlots.reduce((sum: number, slot: any) => sum + (slot.HoursAllocated || 0), 0);
      const availableHours = workdayHours[date] || 0;
      const utilizationPercent = availableHours > 0 ? (totalHours / availableHours) * 100 : 0;

      // Create a summary event for the day
      eventList.push({
        id: `${userId}-${date}`,
        title: `${totalHours.toFixed(1)}h / ${availableHours}h`,
        date: date,
        backgroundColor: userColor,
        borderColor: userColor,
        textColor: '#ffffff',
        extendedProps: {
          daySlots,
          totalHours,
          availableHours,
          utilizationPercent,
          userId,
          userName,
        },
      });

      // Add individual grant events if there are multiple grants
      if (daySlots.length > 1) {
        daySlots.forEach((slot: any, index: number) => {
          const grant = grants.find(g => g.PK === slot.GrantID);
          if (grant) {
            eventList.push({
              id: `${userId}-${date}-${slot.GrantID}`,
              title: `${grant.Title}: ${slot.HoursAllocated || 0}h`,
              date: date,
              backgroundColor: `${userColor}80`, // Semi-transparent
              borderColor: userColor,
              textColor: '#333333',
              display: 'list-item',
              extendedProps: {
                grantId: slot.GrantID,
                grantTitle: grant.Title,
                hours: slot.HoursAllocated || 0,
                userId,
                userName,
              },
            });
          }
        });
      }
    });

    return eventList;
  }, [timeSlots, workdayHours, grants, userId, userName]);

  const handleDateClick = async (info: any) => {
    const dateStr = info.dateStr;
    console.log("📅 Date clicked:", dateStr, info);

    try {
      // Check if this date already has workday hours
      const existingHours = workdayHours[dateStr];

      if (!existingHours || existingHours === 0) {
        // Create a default workday entry (8 hours)
        console.log("Creating workday entry for:", dateStr);
        const { db, generateWorkdayHoursKey } = await import('../../db/schema');

        const year = new Date(dateStr).getFullYear();
        const workdayHoursKey = generateWorkdayHoursKey(userId, year);

        // Get existing workday hours record for this year
        const existingRecord = await db.workdayHours.get([userId, workdayHoursKey]);

        if (existingRecord) {
          // Update existing record
          existingRecord.Hours[dateStr] = 8;
          await db.workdayHours.put(existingRecord);
        } else {
          // Create new record
          await db.workdayHours.put({
            PK: userId,
            SK: workdayHoursKey,
            Hours: { [dateStr]: 8 }, // Default 8 hours
          });
        }

        console.log("✅ Workday entry created for", dateStr);

        // Refresh workday hours data
        // The useWorkdayHours hook should automatically refetch
      }

      // Open timesheet modal for this date
      setTimesheetModalOpen(true);

    } catch (error) {
      console.error("❌ Failed to create workday entry:", error);
    }

    onDateSelect?.(dateStr);
  };

  const handleEventClick = (info: any) => {
    const { daySlots } = info.event.extendedProps;
    if (daySlots) {
      // Open timesheet modal for the clicked date
      const clickedDate = new Date(info.event.start);
      setTimesheetModalOpen(true);
    }
  };

  const handleDatesSet = useCallback((dateInfo: any) => {
    // Update current date when calendar view changes
    setCurrentDate(dateInfo.start);
  }, []);

  return (
    <Box sx={{ width: '100%', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
          Organization Calendar View - {userName}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Navigate freely through time to view allocations for this organization
        </Typography>
        {organisationId && (
          <Typography variant="body2" sx={{
            mt: 1,
            p: 1,
            backgroundColor: '#e8f5e8',
            borderRadius: 1,
            color: '#2e7d32',
            fontWeight: 500
          }}>
            🏢 Organization-Filtered View: Showing data for this organization only
          </Typography>
        )}
      </Box>

      {/* Calendar Section */}
      <Box sx={{ mb: 3 }}>
        <Box
          sx={{
            width: '100%',
            height: 700,
            backgroundColor: "#ffffff",
            borderRadius: 2,
            border: "1px solid #e0e0e0",
            overflow: "hidden",
            "& .fc": {
              fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
              height: '100%',
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
              backgroundColor: "#1976d2",
              borderColor: "#1976d2",
              color: "white",
              fontWeight: 500,
              "&:hover": {
                backgroundColor: "#1565c0",
                borderColor: "#1565c0",
              },
              "&:focus": {
                boxShadow: "0 0 0 0.2rem rgba(25, 118, 210, 0.25)",
              },
            },
            "& .fc-button-active": {
              backgroundColor: "#0d47a1 !important",
              borderColor: "#0d47a1 !important",
            },
            "& .fc-daygrid-day": {
              "&:hover": {
                backgroundColor: "#f5f5f5",
              },
            },
            "& .fc-event": {
              fontSize: "0.75rem",
              fontWeight: 500,
              border: "none",
              borderRadius: "4px",
              margin: "1px",
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
            initialDate={currentDate}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,dayGridWeek,listMonth',
            }}
            buttonText={{
              today: "Today",
              month: "Month",
              week: "Week",
              list: "List",
            }}
            events={events}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            datesSet={handleDatesSet}
            height="100%"
            dayMaxEvents={3}
            moreLinkClick="popover"
            eventContent={(eventInfo) => {
              const { daySlots, totalHours, availableHours, utilizationPercent } = eventInfo.event.extendedProps;
              
              if (daySlots) {
                // Main day summary event
                return (
                  <Box sx={{ p: 0.5, fontSize: '0.75rem' }}>
                    <Box sx={{ fontWeight: 600 }}>
                      {totalHours.toFixed(1)}h / {availableHours}h
                    </Box>
                    <Box sx={{ fontSize: '0.65rem', opacity: 0.9 }}>
                      {utilizationPercent.toFixed(0)}% utilized
                    </Box>
                  </Box>
                );
              } else {
                // Individual grant event
                return (
                  <Box sx={{ p: 0.5, fontSize: '0.7rem' }}>
                    {eventInfo.event.title}
                  </Box>
                );
              }
            }}
          />
        </Box>
      </Box>

      {/* Enhanced Timesheet Modal with Period Selector */}
      <EnhancedTimesheetModal
        open={timesheetModalOpen}
        onClose={() => setTimesheetModalOpen(false)}
        userId={userId}
        userName={userName}
        organisationId={organisationId}
      />
    </Box>
  );
};
