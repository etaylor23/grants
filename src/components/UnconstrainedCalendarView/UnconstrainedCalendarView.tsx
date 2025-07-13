import React, { useState, useMemo, useCallback, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Box, Typography } from "@mui/material";
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
import { generateConsistentColor } from "../../utils/colors";
import { getHoursFromDayEntry } from "../../db/schema";
import { EnhancedTimesheetModal } from "../EnhancedTimesheetModal";

interface UnconstrainedCalendarViewProps {
  userId?: string; // Legacy single-user support
  userName?: string; // Legacy single-user support
  userIds?: string[]; // Multi-user support
  userNames?: string[]; // Multi-user support
  users?: Array<{ id: string; name: string }>; // Alternative multi-user format
  organisationId?: string;
  onDateSelect?: (date: string) => void;
  multiUser?: boolean;
}

export const UnconstrainedCalendarView: React.FC<
  UnconstrainedCalendarViewProps
> = ({
  userId,
  userName,
  userIds = [],
  userNames = [],
  users = [],
  organisationId,
  onDateSelect,
  multiUser = true,
}) => {
  const [timesheetModalOpen, setTimesheetModalOpen] = useState(false);
  // const [calendarApi, setCalendarApi] = useState<any>(null); // Unused for now
  const [currentDate, setCurrentDate] = useState(new Date());

  // State for tracking which user's timesheet modal should be opened
  const [selectedModalUserId, setSelectedModalUserId] = useState<string>("");
  const [selectedModalUserName, setSelectedModalUserName] =
    useState<string>("");

  // Calculate current view period based on calendar's current view
  const currentMonth = startOfMonth(currentDate);
  const currentMonthEnd = endOfMonth(currentDate);
  const year = currentDate.getFullYear();

  // Fetch data for current view period (expanded to include adjacent months for smooth navigation)
  const extendedStart = subMonths(currentMonth, 1);
  const extendedEnd = addMonths(currentMonthEnd, 1);

  const periodStart = format(extendedStart, "yyyy-MM-dd");
  const periodEnd = format(extendedEnd, "yyyy-MM-dd");

  // Determine which users to fetch data for (similar to LocalCalendarView)
  const targetUsers = useMemo(() => {
    if (multiUser) {
      if (users && users.length > 0) {
        return users.map((u) => ({ id: u.id, name: u.name }));
      } else if (userIds && userIds.length > 0) {
        return userIds.map((id, index) => ({
          id,
          name: (userNames && userNames[index]) || `User ${index + 1}`,
        }));
      }
    } else if (userId && userName) {
      return [{ id: userId, name: userName }];
    }
    return [];
  }, [multiUser, users, userIds, userNames, userId, userName]);

  // Get primary user for single-user operations
  const primaryUserId =
    targetUsers.length > 0 ? targetUsers[0].id : userId || "";
  const primaryUserName =
    targetUsers.length > 0 ? targetUsers[0].name : userName || "";

  // Fetch data from IndexedDB for primary user
  const { data: primaryWorkdayHours = {} } = useWorkdayHours(
    primaryUserId,
    year
  );
  const { data: primaryTimeSlots = [] } = useTimeSlots(
    primaryUserId,
    periodStart,
    periodEnd
  );
  const { data: allGrants = [] } = useGrants();

  // For multi-user mode, fetch data for additional users
  const [multiUserData, setMultiUserData] = useState<
    Record<string, { workdayHours: any; timeSlots: any[] }>
  >({});

  // Effect to fetch data for additional users when targetUsers changes
  useEffect(() => {
    const fetchMultiUserData = async () => {
      if (targetUsers.length <= 1) {
        setMultiUserData({});
        return;
      }

      const { db } = await import("../../db/schema");
      const newData: Record<string, { workdayHours: any; timeSlots: any[] }> =
        {};

      for (const user of targetUsers) {
        try {
          // Fetch workday hours
          const workdayHoursResult = await db.workdayHours.get([
            user.id,
            `${user.id}-${year}`,
          ]);
          const workdayHours = workdayHoursResult?.Hours || {};

          // Fetch time slots
          const allSlots = await db.timeslots
            .where("PK")
            .equals(user.id)
            .toArray();
          const timeSlots = allSlots.filter(
            (slot) => slot.Date >= periodStart && slot.Date <= periodEnd
          );

          newData[user.id] = { workdayHours, timeSlots };
        } catch (error) {
          console.warn(`Failed to fetch data for user ${user.id}:`, error);
          newData[user.id] = { workdayHours: {}, timeSlots: [] };
        }
      }

      setMultiUserData(newData);
    };

    fetchMultiUserData();
  }, [targetUsers, year, periodStart, periodEnd]);

  // Combine all user data
  const combinedUserData = useMemo(() => {
    return targetUsers.map((user) => {
      if (user.id === primaryUserId) {
        // Use React Query data for primary user
        return {
          user,
          workdayHours: primaryWorkdayHours,
          timeSlots: primaryTimeSlots,
        };
      } else {
        // Use manually fetched data for additional users
        const userData = multiUserData[user.id] || {
          workdayHours: {},
          timeSlots: [],
        };
        return {
          user,
          workdayHours: userData.workdayHours,
          timeSlots: userData.timeSlots,
        };
      }
    });
  }, [
    targetUsers,
    primaryUserId,
    primaryWorkdayHours,
    primaryTimeSlots,
    multiUserData,
  ]);

  // Legacy support: use primary user data for single-user operations
  const workdayHours = primaryWorkdayHours;
  const timeSlots = primaryTimeSlots;

  // Filter grants by organisation if specified
  const grants = useMemo(() => {
    if (organisationId) {
      return allGrants.filter(
        (grant) => grant.OrganisationID === organisationId
      );
    }
    return allGrants;
  }, [allGrants, organisationId]);

  // Filter timeSlots to only include those for grants in the current organization
  const filteredTimeSlots = useMemo(() => {
    if (organisationId) {
      const organizationGrantIds = new Set(grants.map((grant) => grant.PK));
      return timeSlots.filter((slot) => organizationGrantIds.has(slot.GrantID));
    }
    return timeSlots;
  }, [timeSlots, grants, organisationId]);

  console.log("UnconstrainedCalendarView data:", {
    userId,
    userName,
    organisationId,
    currentDate: format(currentDate, "yyyy-MM-dd"),
    periodStart,
    periodEnd,
    year,
    workdayHours,
    workdayHoursCount: Object.keys(workdayHours).length,
    timeSlots,
    timeSlotsCount: timeSlots.length,
    filteredTimeSlots,
    filteredTimeSlotsCount: filteredTimeSlots.length,
    grants,
    grantsCount: grants.length,
  });

  // Pre-calculate organization grant IDs for filtering
  const organizationGrantIds = useMemo(() => {
    if (organisationId) {
      return new Set(grants.map((grant) => grant.PK));
    }
    return null;
  }, [grants, organisationId]);

  // Create events for the calendar (similar to LocalCalendarView)
  const events = useMemo(() => {
    const events: any[] = [];

    console.log("Creating calendar events from timesheet data...", {
      combinedUserData,
      targetUsers,
    });

    // Create events for each user
    combinedUserData.forEach(({ user, workdayHours, timeSlots }) => {
      const userColor = generateConsistentColor(user.name);

      // Filter timeSlots for this user by organization grants
      const userFilteredTimeSlots = organizationGrantIds
        ? timeSlots.filter((slot) => organizationGrantIds.has(slot.GrantID))
        : timeSlots;

      // Group time slots by date
      const slotsByDate = userFilteredTimeSlots.reduce(
        (acc: any, slot: any) => {
          if (!acc[slot.Date]) {
            acc[slot.Date] = [];
          }
          acc[slot.Date].push(slot);
          return acc;
        },
        {}
      );

      // Create events for each date that has time slot allocations for this user
      Object.entries(slotsByDate).forEach(([date, daySlots]) => {
        const typedDaySlots = daySlots as any[];
        const totalHours = typedDaySlots.reduce(
          (sum: number, slot: any) => sum + (slot.HoursAllocated || 0),
          0
        );

        // Get available hours from workday hours, or use default if auto-generated
        const availableHours = workdayHours[date]
          ? getHoursFromDayEntry(workdayHours[date])
          : 8;
        const totalPercent = Math.round((totalHours / availableHours) * 100);

        console.log(
          `User ${user.name} - Date ${date}: ${typedDaySlots.length} slots, ${totalHours}h total, ${availableHours}h available`
        );

        const event = {
          id: `workday-${user.id}-${date}`,
          title: `${totalHours.toFixed(1)}h / ${availableHours}h`,
          date,
          backgroundColor: userColor,
          borderColor: userColor,
          textColor: "#ffffff",
          allDay: true,
          extendedProps: {
            userId: user.id,
            userName: user.name,
            totalHours,
            availableHours,
            utilizationPercent: totalPercent,
            daySlots: typedDaySlots,
            multiUser,
            targetUsers,
          },
        };

        console.log(`Created event for ${user.name} on ${date}:`, event);
        events.push(event);
      });
    });

    console.log(
      `Final events count: ${events.length} for ${targetUsers.length} users:`,
      events
    );
    return events;
  }, [
    combinedUserData,
    targetUsers,
    multiUser,
    grants,
    organisationId,
    organizationGrantIds,
  ]);

  const handleDateClick = async (info: any) => {
    const dateStr = info.dateStr;
    console.log("📅 Date clicked:", dateStr, info);

    try {
      // Check if this date already has workday hours
      // const existingHours = workdayHours[dateStr]; // Unused in new flow

      // Reset selected user when clicking on a date (use primary user)
      setSelectedModalUserId("");
      setSelectedModalUserName("");

      // REVERSE DATA FLOW: No longer auto-create workday entries on calendar click
      // Workday entries are now auto-generated when timesheet hours are allocated
      // Simply open the timesheet modal for any date
      setTimesheetModalOpen(true);
    } catch (error) {
      console.error("❌ Failed to open timesheet:", error);
    }

    onDateSelect?.(dateStr);
  };

  const handleEventClick = (info: any) => {
    console.log("🎯 Event clicked:", info.event, info);

    // Open enhanced timesheet modal when clicking on a workday event
    const eventUserId = info.event.extendedProps?.userId;
    const eventUserName = info.event.extendedProps?.userName;
    const { daySlots } = info.event.extendedProps;

    console.log("Event details:", { eventUserId, eventUserName });

    if (daySlots && eventUserId && eventUserName) {
      // Set the selected user for the modal
      setSelectedModalUserId(eventUserId);
      setSelectedModalUserName(eventUserName);
      setTimesheetModalOpen(true);
    } else if (daySlots) {
      // Fallback for events without user details
      setTimesheetModalOpen(true);
    }
  };

  const handleDatesSet = useCallback((dateInfo: any) => {
    // Update current date when calendar view changes
    setCurrentDate(dateInfo.start);
  }, []);

  return (
    <Box sx={{ width: "100%", minHeight: "100vh" }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
          Organization Calendar View - {userName}
        </Typography>
      </Box>

      {/* Calendar Section */}
      <Box sx={{ mb: 3 }}>
        <Box
          sx={{
            width: "100%",
            height: 700,
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
              border: "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: "8px",
              margin: "1px",
              padding: "4px 8px",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
              transition: "all 0.2s ease-in-out",
              cursor: "pointer",
            },
            "& .fc-event:hover": {
              transform: "translateY(-2px) scale(1.02)",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
              borderColor: "rgba(255, 255, 255, 0.4)",
              zIndex: 10,
            },
          }}
        >
          <FullCalendar
            ref={(ref) => {
              if (ref) {
                // setCalendarApi(ref.getApi()); // Commented out for now
              }
            }}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            initialDate={currentDate}
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,dayGridWeek,listMonth",
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
              const {
                totalHours = 0,
                availableHours = 8,
                userName = "Unknown User",
                utilizationPercent = 0,
              } = eventInfo.event.extendedProps || {};

              // Get user initials for avatar
              const getUserInitials = (name: string) => {
                return name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase();
              };

              if (multiUser) {
                // Multi-user mode: Show user avatar and utilization (match LocalCalendarView)
                return (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      p: 0.5,
                      fontSize: "0.75rem",
                      fontWeight: 500,
                    }}
                  >
                    <Box
                      sx={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        backgroundColor: "rgba(255, 255, 255, 0.2)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.6rem",
                        fontWeight: 600,
                        color: "white",
                        flexShrink: 0,
                      }}
                    >
                      {getUserInitials(userName)}
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Box sx={{ fontWeight: 600, lineHeight: 1 }}>
                        {totalHours.toFixed(1)}h/{availableHours}h
                      </Box>
                      <Box sx={{ fontSize: "0.65rem", opacity: 0.9 }}>
                        {utilizationPercent.toFixed(0)}%
                      </Box>
                    </Box>
                  </Box>
                );
              } else {
                // Single-user mode: Match UnconstrainedCalendarView format exactly
                return (
                  <Box sx={{ p: 0.5, fontSize: "0.75rem" }}>
                    <Box sx={{ fontWeight: 600 }}>
                      {totalHours.toFixed(1)}h / {availableHours}h
                    </Box>
                    <Box sx={{ fontSize: "0.65rem", opacity: 0.9 }}>
                      {utilizationPercent.toFixed(0)}% utilized
                    </Box>
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
        onClose={() => {
          setTimesheetModalOpen(false);
          // Reset selected user when modal closes
          setSelectedModalUserId("");
          setSelectedModalUserName("");
        }}
        userId={selectedModalUserId || primaryUserId}
        userName={selectedModalUserName || primaryUserName}
        organisationId={organisationId}
      />
    </Box>
  );
};
