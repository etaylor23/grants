import React, { useEffect, useState } from "react";
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
import { LocalCalendarPage } from "./pages/LocalCalendarPage";
import { LocalTimesheetPage } from "./pages/LocalTimesheetPage";
import { initializeDatabase } from "./db/index";
import { isDexieBackend } from "./config/environment";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        await initializeDatabase();
        setIsInitialized(true);
      } catch (error) {
        console.error('Database initialization failed:', error);
        setInitError(error instanceof Error ? error.message : 'Unknown error');
        setIsInitialized(true); // Continue anyway
      }
    };

    init();
  }, []);

  if (!isInitialized) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            gap: 2,
          }}
        >
          <CircularProgress size={60} />
          <Typography variant="h6" color="text.secondary">
            Initializing Database...
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isDexieBackend() ? 'Setting up local IndexedDB' : 'Connecting to DynamoDB'}
          </Typography>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <Routes>
            {/* Default route - redirect based on backend */}
            <Route
              path="/"
              element={
                <Navigate
                  to={isDexieBackend() ? "/local-calendar" : "/calendar"}
                  replace
                />
              }
            />

            {/* IndexedDB routes */}
            {isDexieBackend() && (
              <>
                <Route path="/local-calendar" element={<LocalCalendarPage />} />
                <Route path="/local-timesheet/:userSlug" element={<LocalTimesheetPage />} />
              </>
            )}

            {/* Legacy mock data routes */}
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/timesheet/:userSlug" element={<TimesheetPage />} />
            <Route path="/grants" element={<GrantPage />} />
            <Route path="/grants/:grantSlug" element={<GrantPage />} />
            <Route path="/dashboard" element={<Dashboard />} />

            {/* Fallback redirect */}
            <Route
              path="*"
              element={
                <Navigate
                  to={isDexieBackend() ? "/local-calendar" : "/calendar"}
                  replace
                />
              }
            />
          </Routes>
        </Router>

        {initError && (
          <Box
            sx={{
              position: 'fixed',
              bottom: 16,
              right: 16,
              bgcolor: 'error.main',
              color: 'white',
              p: 2,
              borderRadius: 1,
              maxWidth: 300,
            }}
          >
            <Typography variant="body2">
              Database initialization warning: {initError}
            </Typography>
          </Box>
        )}
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
