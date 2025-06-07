import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CalendarPage } from "./CalendarPage";
import { TimesheetModal } from "../components/TimesheetModal/TimesheetModal";
import { mockUsers } from "../api/mockData";
import { User } from "../models/types";
import { useWorkdays } from "../api/hooks";
import { startOfMonth, endOfMonth } from "date-fns";

// Helper function to find user by slug
const findUserBySlug = (slug: string): User | undefined => {
  return mockUsers.find(
    (user) => user.name.toLowerCase().replace(/\s+/g, "-") === slug
  );
};

// Helper function to get current calendar period
const getCurrentCalendarPeriod = () => {
  const now = new Date();
  return {
    start: startOfMonth(now),
    end: endOfMonth(now),
  };
};

export const TimesheetModalPage: React.FC = () => {
  const { userSlug } = useParams<{ userSlug: string }>();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(true);

  // Find the user based on the slug
  const currentUser = userSlug ? findUserBySlug(userSlug) : null;

  // Get user workdays for the current period
  const period = getCurrentCalendarPeriod();
  const { data: userWorkdays } = useWorkdays(
    currentUser?.id || "",
    new Date().getFullYear()
  );

  // If user not found, redirect to calendar
  useEffect(() => {
    if (!currentUser) {
      navigate("/calendar");
    }
  }, [currentUser, navigate]);

  const handleModalClose = () => {
    setModalOpen(false);
    // Navigate back to calendar when modal is closed
    navigate("/calendar");
  };

  if (!currentUser) {
    return null;
  }

  return (
    <>
      {/* Render the calendar page as the background */}
      <CalendarPage />

      {/* Render the timesheet modal on top */}
      <TimesheetModal
        open={modalOpen}
        onClose={handleModalClose}
        userId={currentUser.id}
        userName={currentUser.name}
        startDate={period.start}
        endDate={period.end}
        workdays={userWorkdays?.workdays || {}}
      />
    </>
  );
};
