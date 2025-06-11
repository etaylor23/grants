import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  IconButton,
  Typography,
  Tabs,
  Tab,
  Divider,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { TimesheetGrid } from "../TimesheetGrid/TimesheetGrid";
import { PeriodSelector, PeriodOption } from "../PeriodSelector";
import { usePeriodSelector } from "../../hooks/usePeriodSelector";
import { useWorkdayHours, useTimeSlots, useGrants } from "../../hooks/useLocalData";
import { format, eachDayOfInterval } from "date-fns";

interface EnhancedTimesheetModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  organisationId?: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`timesheet-tabpanel-${index}`}
      aria-labelledby={`timesheet-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ height: '100%' }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export const EnhancedTimesheetModal: React.FC<EnhancedTimesheetModalProps> = ({
  open,
  onClose,
  userId,
  userName,
  organisationId,
}) => {
  const [tabValue, setTabValue] = useState(0);
  
  // Use PeriodSelector for date range management
  const { selectedPeriod, selectedPeriodOption, handlePeriodChange } = usePeriodSelector('monthly');

  // Default to current month if no period selected yet
  const currentDateRange = selectedPeriodOption || {
    startDate: new Date(),
    endDate: new Date(),
    label: "Current Period",
  };

  const year = currentDateRange.startDate.getFullYear();
  const periodStart = format(currentDateRange.startDate, "yyyy-MM-dd");
  const periodEnd = format(currentDateRange.endDate, "yyyy-MM-dd");

  // Get workday hours from IndexedDB
  const { data: workdayHours = {} } = useWorkdayHours(userId, year);
  const { data: timeSlots = [] } = useTimeSlots(userId, periodStart, periodEnd);
  const { data: allGrants = [] } = useGrants();

  // Filter grants by organisation if specified
  const grants = useMemo(() => {
    if (organisationId) {
      return allGrants.filter(grant => grant.OrganisationID === organisationId);
    }
    return allGrants;
  }, [allGrants, organisationId]);

  // Get all dates in the period
  const allDates = eachDayOfInterval({ 
    start: currentDateRange.startDate, 
    end: currentDateRange.endDate 
  });

  // Filter out dates that are not workdays (these will be disabled)
  const disabledDates = allDates
    .filter(date => {
      const dateStr = format(date, "yyyy-MM-dd");
      return !workdayHours[dateStr] || workdayHours[dateStr] === 0;
    })
    .map(date => format(date, "yyyy-MM-dd"));

  const periodTitle = `${userName} - ${format(currentDateRange.startDate, "MMM dd")} to ${format(currentDateRange.endDate, "MMM dd, yyyy")}`;

  // Calculate summary statistics
  const totalHours = timeSlots.reduce((sum, slot) => sum + (slot.HoursAllocated || 0), 0);
  const totalAvailableHours = Object.values(workdayHours).reduce((sum: number, hours: any) => sum + (hours || 0), 0);
  const utilizationPercent = totalAvailableHours > 0 ? (totalHours / totalAvailableHours) * 100 : 0;
  const activeGrants = Array.from(new Set(timeSlots.map(slot => slot.GrantID))).length;

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      PaperProps={{
        sx: {
          height: "95vh",
          maxHeight: "95vh",
        },
      }}
    >
      <DialogTitle sx={{ m: 0, p: 2, display: "flex", alignItems: "center" }}>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Timesheet & Reporting - {periodTitle}
        </Typography>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent dividers sx={{ p: 0, height: "100%" }}>
        <Box sx={{ height: "100%" }}>
          {/* Period Selector */}
          <Box sx={{ p: 2, backgroundColor: '#f8f9fa', borderBottom: '1px solid #e0e0e0' }}>
            <PeriodSelector
              selectedPeriod={selectedPeriod}
              onPeriodChange={handlePeriodChange}
            />
            
            {/* Summary Statistics */}
            <Box sx={{ 
              display: 'flex', 
              gap: 3, 
              mt: 2,
              p: 2,
              backgroundColor: 'white',
              borderRadius: 1,
              border: '1px solid #e0e0e0'
            }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#1976d2' }}>
                  {totalHours.toFixed(1)}h
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Hours
                </Typography>
              </Box>
              <Divider orientation="vertical" flexItem />
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#2e7d32' }}>
                  {totalAvailableHours.toFixed(1)}h
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Available Hours
                </Typography>
              </Box>
              <Divider orientation="vertical" flexItem />
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#ed6c02' }}>
                  {utilizationPercent.toFixed(1)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Utilization
                </Typography>
              </Box>
              <Divider orientation="vertical" flexItem />
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#9c27b0' }}>
                  {activeGrants}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Active Grants
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="timesheet tabs">
              <Tab label="Time Entry" />
              <Tab label="Summary Report" />
              <Tab label="Grant Breakdown" />
            </Tabs>
          </Box>

          {/* Tab Panels */}
          <TabPanel value={tabValue} index={0}>
            <Box sx={{ height: "calc(100% - 200px)", p: 2 }}>
              <TimesheetGrid
                userId={userId}
                startDate={currentDateRange.startDate}
                endDate={currentDateRange.endDate}
                disabledDates={disabledDates}
                showCard={false}
                showRowColumnControls={true}
                title={`Time Entry - ${format(currentDateRange.startDate, "MMM dd")} to ${format(currentDateRange.endDate, "MMM dd, yyyy")}`}
              />
            </Box>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Summary Report - {currentDateRange.label}
              </Typography>
              <Typography variant="body1">
                Detailed summary reporting will be implemented here.
              </Typography>
            </Box>
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Grant Breakdown - {currentDateRange.label}
              </Typography>
              <Typography variant="body1">
                Grant-specific breakdown and analysis will be implemented here.
              </Typography>
            </Box>
          </TabPanel>
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};
