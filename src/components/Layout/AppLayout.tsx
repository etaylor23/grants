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
  Button,
} from "@mui/material";
import {
  Menu as MenuIcon,
  CalendarToday as CalendarIcon,
  GridOn as GridIcon,
  Person as PersonIcon,
  Add as AddIcon,
} from "@mui/icons-material";
// IndexedDB only - no legacy dependencies
import { ViewMode } from "../../models/types";
import { UserPicker } from "../UserPicker";
import { Individual } from "../../db/schema";
import { CreateGrantModal } from "../CreateGrantModal";

interface AppLayoutProps {
  children: React.ReactNode;
  selectedUserId?: string | null;
  onUserChange?: (userId: string, user: Individual) => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
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

  // Simplified navigation for IndexedDB mode
  const handleNavigation = (path: string) => {
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

          {/* User Picker and Create Grant Button */}
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
                onClick={() => handleNavigation("/calendar")}
              >
                <ListItemIcon>
                  <CalendarIcon />
                </ListItemIcon>
                <ListItemText primary="Calendar View" />
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
                primary="IndexedDB Mode"
                secondary="Using local database"
              />
            </ListItem>
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
