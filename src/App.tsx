import React, { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline, Box, CircularProgress, Typography } from "@mui/material";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { theme } from "./theme";
import { Dashboard } from "./pages/Dashboard";
import { CalendarPage } from "./pages/CalendarPage";
import { TimesheetPage } from "./pages/TimesheetPage";
import { GrantPage } from "./pages/GrantPage";
import { PersonnelPage } from "./pages/PersonnelPage";
import { GrantManagementPage } from "./pages/GrantManagementPage";
import { InitializationService } from "./services/initialization";
import { isLocalDynamoEnabled, debugLog } from "./config/environment";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Loading component
const LoadingScreen: React.FC<{ message: string }> = ({ message }) => (
  <Box
    sx={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh",
      gap: 2,
    }}
  >
    <CircularProgress size={60} />
    <Typography variant="h6" color="text.secondary">
      {message}
    </Typography>
    {isLocalDynamoEnabled() && (
      <Typography variant="body2" color="text.secondary">
        Initializing local database...
      </Typography>
    )}
  </Box>
);

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(
    null
  );

  useEffect(() => {
    const initializeApp = async () => {
      try {
        debugLog("Starting app initialization...");
        await InitializationService.initialize();
        setIsInitialized(true);
        debugLog("App initialization completed");
      } catch (error) {
        console.error("App initialization failed:", error);
        setInitializationError(
          error instanceof Error ? error.message : "Unknown error"
        );
      }
    };

    initializeApp();
  }, []);

  if (initializationError) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            gap: 2,
            p: 3,
          }}
        >
          <Typography variant="h5" color="error" gutterBottom>
            Initialization Failed
          </Typography>
          <Typography variant="body1" color="text.secondary" textAlign="center">
            {initializationError}
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Please refresh the page to try again.
          </Typography>
        </Box>
      </ThemeProvider>
    );
  }

  if (!isInitialized) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LoadingScreen message="Initializing Application..." />
      </ThemeProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <Routes>
            <Route path="/" element={<Navigate to="/calendar" replace />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/timesheet/:userSlug" element={<TimesheetPage />} />
            <Route path="/grants" element={<GrantPage />} />
            <Route path="/grants/:grantSlug" element={<GrantPage />} />
            <Route path="/personnel" element={<PersonnelPage />} />
            <Route path="/grant-management" element={<GrantManagementPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </Router>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
