import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "../components/Layout/AppLayout";
import { TimesheetGrid } from "../components/TimesheetGrid/TimesheetGrid";
import { mockUsers } from "../api/mockData";
import { User } from "../models/types";

// Helper function to find user by slug
const findUserBySlug = (slug: string): User | undefined => {
  return mockUsers.find(
    (user) => user.name.toLowerCase().replace(/\s+/g, "-") === slug
  );
};

// Helper function to load selected users from localStorage
const loadSelectedUsersForTimesheet = (currentUser: User): User[] => {
  try {
    const saved = localStorage.getItem("selectedUsers");
    if (saved) {
      const userIds = JSON.parse(saved) as string[];
      const users = userIds
        .map((id) => mockUsers.find((u) => u.id === id))
        .filter(Boolean) as User[];

      // Ensure current user is included in the selection
      if (users.length > 0 && !users.find((u) => u.id === currentUser.id)) {
        return [currentUser, ...users];
      }

      return users.length > 0 ? users : [currentUser];
    }
  } catch (error) {
    console.error("Failed to load selected users from localStorage:", error);
  }
  return [currentUser];
};

export const TimesheetPage: React.FC = () => {
  const { userSlug } = useParams<{ userSlug: string }>();
  const navigate = useNavigate();

  // Find the user based on the slug
  const currentUser = userSlug ? findUserBySlug(userSlug) : mockUsers[0];
  const [selectedUsers, setSelectedUsers] = useState<User[]>(() =>
    currentUser ? loadSelectedUsersForTimesheet(currentUser) : [mockUsers[0]]
  );

  // If user not found, redirect to calendar
  if (!currentUser) {
    navigate("/calendar");
    return null;
  }

  const handleUsersChange = (users: User[]) => {
    setSelectedUsers(users);

    // Save to localStorage for persistence
    try {
      const userIds = users.map((u) => u.id);
      localStorage.setItem("selectedUsers", JSON.stringify(userIds));
    } catch (error) {
      console.error("Failed to save selected users to localStorage:", error);
    }

    // If the current user is removed from selection, navigate to the first remaining user
    // or back to calendar if no users selected
    if (users.length === 0) {
      navigate("/calendar");
    } else if (!users.find((u) => u.id === currentUser.id)) {
      const newUserSlug = users[0].name.toLowerCase().replace(/\s+/g, "-");
      navigate(`/timesheet/${newUserSlug}`);
    }
  };

  return (
    <AppLayout
      selectedUsers={selectedUsers}
      onUsersChange={handleUsersChange}
      viewMode="grid"
      onViewModeChange={(mode) => {
        if (mode === "calendar") {
          navigate("/calendar");
        }
      }}
    >
      <TimesheetGrid userId={currentUser.id} />
    </AppLayout>
  );
};
