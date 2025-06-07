import React, { useState, useMemo } from "react";
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
} from "@mui/material";
import {
  Menu as MenuIcon,
  CalendarToday as CalendarIcon,
  GridOn as GridIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Assignment as AssignmentIcon,
} from "@mui/icons-material";
import { usePersonnel } from "../../api/hooks";
import { User, ViewMode, Personnel } from "../../models/types";
import { generateUserColor } from "../../utils/colors";

interface AppLayoutProps {
  children: React.ReactNode;
  selectedUsers: User[];
  onUsersChange: (users: User[]) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  selectedUsers,
  onUsersChange,
  viewMode,
  onViewModeChange,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Get personnel from API and convert to User format
  const { data: personnel = [] } = usePersonnel();
  const availableUsers = useMemo(() => {
    return personnel.map(
      (person: Personnel): User => ({
        id: person.id,
        name: `${person.firstName} ${person.lastName}`,
        email: `${person.firstName.toLowerCase()}.${person.lastName.toLowerCase()}@company.com`, // Generate placeholder email
      })
    );
  }, [personnel]);

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

  const handleNavigate = (path: string) => {
    navigate(path);
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
              {selectedUsers.length < availableUsers.length && (
                <FormControl size="small" sx={{ minWidth: 100 }}>
                  <Select
                    value=""
                    onChange={(e) => {
                      const user = availableUsers.find(
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
                    {availableUsers
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
            <ListItem disablePadding>
              <ListItemButton
                selected={location.pathname === "/personnel"}
                onClick={() => handleNavigate("/personnel")}
              >
                <ListItemIcon>
                  <PersonIcon />
                </ListItemIcon>
                <ListItemText primary="Personnel Management" />
              </ListItemButton>
            </ListItem>

            <ListItem disablePadding>
              <ListItemButton
                selected={location.pathname === "/grant-management"}
                onClick={() => handleNavigate("/grant-management")}
              >
                <ListItemIcon>
                  <BusinessIcon />
                </ListItemIcon>
                <ListItemText primary="Grant Management" />
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
    </Box>
  );
};
