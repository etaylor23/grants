import React, { useState } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  IconButton,
  Box,
  Button,
  useMediaQuery,
  useTheme,
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
import classes from "./EnhancedAppLayout.module.css";

interface AppLayoutProps {
  children: React.ReactNode;
  selectedUserId?: string | null; // Legacy support for single-select
  selectedUserIds?: string[]; // Multi-select support
  onUserChange?: (userId: string, user: Individual) => void; // Legacy support
  onUsersChange?: (userIds: string[], users: Individual[]) => void; // Multi-select support
  organisationId?: string;
  multiSelect?: boolean;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  selectedUserId,
  selectedUserIds,
  onUserChange,
  onUsersChange,
  organisationId,
  multiSelect = true,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [createGrantModalOpen, setCreateGrantModalOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isTablet = useMediaQuery(theme.breakpoints.down("lg"));

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  return (
    <Box sx={{ display: "flex", height: "100vh" }}>
      <AppBar
        position="fixed"
        className={classes.appBar}
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
      >
        <Toolbar className={classes.toolbar}>
          {/* Mobile Menu Button */}
          <IconButton
            className={classes.mobileMenuButton}
            aria-label="open drawer"
            onClick={toggleDrawer}
            edge="start"
          >
            <MenuIcon />
          </IconButton>

          {/* Header Section */}
          <Box className={classes.headerSection}>
            {/* Brand Section */}
            <Box className={classes.brandSection}>
              <Typography className={classes.appTitle}>Grantura</Typography>
              {!isMobile && (
                <Typography className={classes.appSubtitle}>
                  Your workforce, mapped to funding
                </Typography>
              )}
            </Box>

            {/* Breadcrumbs Section - Hide on mobile and tablet */}
            {!isTablet && (
              <Box className={classes.breadcrumbsSection}>
                <HeaderBreadcrumbs
                  flat={false}
                  compact={isMobile}
                  show={!isMobile}
                />
              </Box>
            )}
          </Box>

          {/* Navigation Controls */}
          <Box className={classes.navigationControls}>
            {/* Primary Controls */}
            <Box className={classes.primaryControls}>
              <ContextSwitcher compact={isMobile} />

              {/* Secondary User Control - Show based on context and screen size */}
              {(onUserChange || onUsersChange) && !isMobile && (
                <UserPicker
                  selectedUserId={selectedUserId || null}
                  selectedUserIds={selectedUserIds}
                  onUserChange={onUserChange}
                  onUsersChange={onUsersChange}
                  organisationId={organisationId}
                  compact={isTablet}
                  showContextIndicator={false} // Context already shown in ContextSwitcher
                  multiSelect={multiSelect}
                />
              )}
            </Box>

            {/* Action Buttons - Separated from navigation, hidden on mobile */}
            {!isMobile && (
              <Box className={classes.actionSection}>
                {onUserChange && (
                  <Button
                    className={`${classes.actionButton} ${classes.primary}`}
                    variant="outlined"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => setCreateGrantModalOpen(true)}
                  >
                    {isTablet ? "Create" : "Create Grant"}
                  </Button>
                )}
              </Box>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="temporary"
        open={drawerOpen}
        onClose={toggleDrawer}
        className={classes.drawer}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        PaperProps={{
          className: classes.drawerPaper,
        }}
      >
        <Box className={classes.drawerHeader}>
          <IconButton onClick={toggleDrawer}>
            <MenuIcon />
          </IconButton>
        </Box>
        <DynamicSidebar organizationId={organisationId} />

        {/* Mobile Action Buttons - Show in drawer on mobile */}
        {isMobile && (onUserChange || onUsersChange) && (
          <Box sx={{ p: 2, borderTop: "1px solid rgba(0, 0, 0, 0.08)" }}>
            <Button
              variant="contained"
              fullWidth
              startIcon={<AddIcon />}
              onClick={() => {
                setCreateGrantModalOpen(true);
                toggleDrawer();
              }}
              sx={{ mb: 1 }}
            >
              Create Grant
            </Button>
            {/* Mobile User Picker */}
            <UserPicker
              selectedUserId={selectedUserId || null}
              selectedUserIds={selectedUserIds}
              onUserChange={onUserChange}
              onUsersChange={onUsersChange}
              organisationId={organisationId}
              compact={true}
              showContextIndicator={true}
              multiSelect={multiSelect}
            />
          </Box>
        )}
      </Drawer>

      <Box component="main" className={classes.mainContent}>
        {/* Main Content with Context Transitions */}
        <ContextTransition animateOnContextChange>
          <Box className={classes.contentWrapper}>{children}</Box>
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
