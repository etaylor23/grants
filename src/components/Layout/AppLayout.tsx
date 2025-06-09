import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Box,
  Divider,
  FormControl,
  Select,
  MenuItem,
  Chip,
  Stack,
  Button,
} from "@mui/material";
import {
  Menu as MenuIcon,
  CalendarToday as CalendarIcon,
  GridOn as GridIcon,
  Person as PersonIcon,
  Add as AddIcon,
} from "@mui/icons-material";
import { mockUsers } from "../../api/mockData";
import { User, ViewMode } from "../../models/types";
import { generateUserColor } from "../../utils/colors";
import { UserPicker } from "../UserPicker";
import { Individual } from "../../db/schema";
import { CreateGrantModal } from "../CreateGrantModal";

interface AppLayoutProps {
  children: React.ReactNode;
  selectedUsers: User[];
  onUsersChange: (users: User[]) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  selectedUserId?: string | null;
  onUserChange?: (userId: string, user: Individual) => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  selectedUsers,
  onUsersChange,
  viewMode,
  onViewModeChange,
  selectedUserId,
  onUserChange,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [createGrantModalOpen, setCreateGrantModalOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleViewModeChange = (mode: ViewMode) => {
    if (mode === "calendar") {
      navigate("/calendar");
    } else if (mode === "grid") {
      // Navigate to the first selected user's timesheet
      if (selectedUsers.length > 0) {
        const userSlug = selectedUsers[0].name
          .toLowerCase()
          .replace(/\s+/g, "-");
        navigate(`/timesheet/${userSlug}`);
      }
    } else if (mode === "grant") {
      navigate("/grants");
    }
    onViewModeChange(mode);
    setDrawerOpen(false);
  };

  return (
    <Box sx={{ display: "flex", height: "100vh" }}>
      <AppBar
        position="fixed"
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={toggleDrawer}
            edge="start"
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Grant & Vacation Tracker
          </Typography>

          {/* New User Picker for IndexedDB users */}
          {onUserChange && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <UserPicker
                selectedUserId={selectedUserId || null}
                onUserChange={onUserChange}
              />

              <Button
                variant="outlined"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => setCreateGrantModalOpen(true)}
                sx={{
                  color: 'white',
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                  '&:hover': {
                    borderColor: 'white',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  },
                }}
              >
                Create Grant
              </Button>
            </Box>
          )}

          {/* Legacy user selection for backward compatibility */}
          {!onUserChange && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body2" sx={{ color: "white", mr: 1 }}>
                Users:
              </Typography>
              <Stack direction="row" spacing={1}>
                {selectedUsers.map((user) => (
                  <Chip
                    key={user.id}
                    label={user.name}
                    size="small"
                    sx={{
                      backgroundColor: generateUserColor(user.name),
                      color: "white",
                      "& .MuiChip-deleteIcon": {
                        color: "white",
                      },
                    }}
                    onDelete={() => {
                      const newUsers = selectedUsers.filter(
                        (u) => u.id !== user.id
                      );
                      onUsersChange(newUsers);
                    }}
                  />
                ))}
                {selectedUsers.length < mockUsers.length && (
                  <FormControl size="small" sx={{ minWidth: 100 }}>
                    <Select
                      value=""
                      onChange={(e) => {
                        const user = mockUsers.find(
                          (u) => u.id === e.target.value
                        );
                        if (
                          user &&
                          !selectedUsers.find((u) => u.id === user.id)
                        ) {
                          onUsersChange([...selectedUsers, user]);
                        }
                      }}
                      displayEmpty
                      sx={{
                        color: "white",
                        "& .MuiOutlinedInput-notchedOutline": {
                          borderColor: "rgba(255, 255, 255, 0.23)",
                        },
                        "& .MuiSvgIcon-root": {
                          color: "white",
                        },
                      }}
                    >
                      <MenuItem value="" disabled>
                        Add User
                      </MenuItem>
                      {mockUsers
                        .filter(
                          (user) => !selectedUsers.find((u) => u.id === user.id)
                        )
                        .map((user) => (
                          <MenuItem key={user.id} value={user.id}>
                            {user.name}
                          </MenuItem>
                        ))}
                    </Select>
                  </FormControl>
                )}
              </Stack>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      <Drawer
        variant="temporary"
        open={drawerOpen}
        onClose={toggleDrawer}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        sx={{
          "& .MuiDrawer-paper": {
            boxSizing: "border-box",
            width: 280,
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: "auto" }}>
          <List>
            <ListItem disablePadding>
              <ListItemButton
                selected={location.pathname === "/calendar"}
                onClick={() => handleViewModeChange("calendar")}
              >
                <ListItemIcon>
                  <CalendarIcon />
                </ListItemIcon>
                <ListItemText primary="Calendar View" />
              </ListItemButton>
            </ListItem>

            <ListItem disablePadding>
              <ListItemButton
                selected={location.pathname.startsWith("/grants")}
                onClick={() => handleViewModeChange("grant")}
              >
                <ListItemIcon>
                  <GridIcon />
                </ListItemIcon>
                <ListItemText primary="Grant View" />
              </ListItemButton>
            </ListItem>
          </List>

          <Divider />

          <List>
            <ListItem>
              <ListItemIcon>
                <PersonIcon />
              </ListItemIcon>
              <ListItemText
                primary="Selected Users"
                secondary={`${selectedUsers.length} user${
                  selectedUsers.length !== 1 ? "s" : ""
                } selected`}
              />
            </ListItem>
            {selectedUsers.map((user) => (
              <ListItem key={user.id} sx={{ pl: 4 }}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    backgroundColor: generateUserColor(user.name),
                    mr: 2,
                  }}
                />
                <ListItemText primary={user.name} />
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          mt: 8, // Account for AppBar height
          height: "calc(100vh - 64px)",
          backgroundColor: "#ffffff",
        }}
      >
        {children}
      </Box>

      {/* Create Grant Modal */}
      <CreateGrantModal
        open={createGrantModalOpen}
        onClose={() => setCreateGrantModalOpen(false)}
        onGrantCreated={() => {
          setCreateGrantModalOpen(false);
          // Could add notification here
        }}
      />
    </Box>
  );
};
