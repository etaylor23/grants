import React, { useState } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  IconButton,
  Box,
  Button,
} from "@mui/material";
import { Menu as MenuIcon, Add as AddIcon } from "@mui/icons-material";
// IndexedDB only - no legacy dependencies
import { UserPicker } from "../UserPicker";
import { DynamicSidebar } from "../DynamicSidebar";
import { ContextSwitcher } from "../ContextSwitcher";
import { ContextTransition } from "../ContextTransition";
import { Individual } from "../../db/schema";
import { CreateGrantModal } from "../CreateGrantModal";
import { HeaderBreadcrumbs } from "../HeaderBreadcrumbs";

interface AppLayoutProps {
  children: React.ReactNode;
  selectedUserId?: string | null;
  onUserChange?: (userId: string, user: Individual) => void;
  organisationId?: string;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  selectedUserId,
  onUserChange,
  organisationId,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [createGrantModalOpen, setCreateGrantModalOpen] = useState(false);

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
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
          <Box sx={{ flexGrow: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
              <Box>
                <Typography
                  variant="h6"
                  noWrap
                  component="div"
                  sx={{ fontWeight: 600 }}
                >
                  GrantGrid
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "0.7rem" }}
                >
                  Your workforce, mapped to funding
                </Typography>
              </Box>

              {/* Breadcrumbs positioned after the title */}
              <HeaderBreadcrumbs
                sx={{
                  ml: 2,
                  display: { xs: "none", sm: "flex" }, // Hide on mobile to save space
                }}
              />
            </Box>
          </Box>

          {/* Context Switcher and User Controls */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <ContextSwitcher />

            {onUserChange && (
              <>
                <UserPicker
                  selectedUserId={selectedUserId || null}
                  onUserChange={onUserChange}
                  organisationId={organisationId}
                />

                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => setCreateGrantModalOpen(true)}
                  sx={{
                    color: "white",
                    borderColor: "rgba(255, 255, 255, 0.5)",
                    "&:hover": {
                      borderColor: "white",
                      backgroundColor: "rgba(255, 255, 255, 0.1)",
                    },
                  }}
                >
                  Create Grant
                </Button>
              </>
            )}
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
        <DynamicSidebar organizationId={organisationId} />
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          mt: 8, // Account for AppBar height
          height: "calc(100vh - 64px)",
          backgroundColor: "#ffffff",
        }}
      >
        {/* Main Content with Context Transitions */}
        <ContextTransition animateOnContextChange>
          <Box sx={{ p: 3 }}>{children}</Box>
        </ContextTransition>
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
