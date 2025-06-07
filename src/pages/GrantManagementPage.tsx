import React, { useState } from "react";
import { AppLayout } from "../components/Layout/AppLayout";
import { GrantManager } from "../components/GrantManager/GrantManager";
import { mockUsers } from "../api/mockData";
import { User } from "../models/types";

// Helper function to load selected users from localStorage
const loadSelectedUsers = (): User[] => {
  try {
    const saved = localStorage.getItem("selectedUsers");
    if (saved) {
      const userIds = JSON.parse(saved) as string[];
      const users = userIds
        .map((id) => mockUsers.find((u) => u.id === id))
        .filter(Boolean) as User[];

      return users.length > 0 ? users : mockUsers;
    }
  } catch (error) {
    console.error("Failed to load selected users from localStorage:", error);
  }
  return mockUsers;
};

export const GrantManagementPage: React.FC = () => {
  const [selectedUsers, setSelectedUsers] = useState<User[]>(() =>
    loadSelectedUsers()
  );

  const handleUsersChange = (users: User[]) => {
    setSelectedUsers(users);

    // Save to localStorage for persistence
    try {
      const userIds = users.map((u) => u.id);
      localStorage.setItem("selectedUsers", JSON.stringify(userIds));
    } catch (error) {
      console.error("Failed to save selected users to localStorage:", error);
    }
  };

  return (
    <AppLayout
      selectedUsers={selectedUsers}
      onUsersChange={handleUsersChange}
      viewMode="grant" // Use grant mode as closest match
      onViewModeChange={() => {}} // No-op for this page
    >
      <GrantManager />
    </AppLayout>
  );
};
