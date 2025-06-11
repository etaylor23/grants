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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Chip,
  Card,
  CardContent,
  Grid,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { TimesheetGrid } from "../TimesheetGrid/TimesheetGrid";
import { PeriodSelector, PeriodOption } from "../PeriodSelector";
import { usePeriodSelector } from "../../hooks/usePeriodSelector";
import { useWorkdayHours, useTimeSlots, useGrants } from "../../hooks/useLocalData";
import { format, eachDayOfInterval, parseISO } from "date-fns";

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

  // Calculate grant breakdown data
  const grantBreakdown = useMemo(() => {
    const breakdown = timeSlots.reduce((acc: any, slot: any) => {
      const grantId = slot.GrantID;
      if (!acc[grantId]) {
        const grant = grants.find(g => g.PK === grantId);
        acc[grantId] = {
          grantId,
          grantTitle: grant?.Title || 'Unknown Grant',
          totalHours: 0,
          percentage: 0,
          isActive: grant ? true : false,
        };
      }
      acc[grantId].totalHours += slot.HoursAllocated || 0;
      return acc;
    }, {});

    // Calculate percentages
    Object.values(breakdown).forEach((item: any) => {
      item.percentage = totalHours > 0 ? (item.totalHours / totalHours) * 100 : 0;
    });

    return Object.values(breakdown).sort((a: any, b: any) => b.totalHours - a.totalHours);
  }, [timeSlots, grants, totalHours]);

  // Format currency for financial calculations
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate financial breakdown per grant
  const grantFinancialBreakdown = useMemo(() => {
    // Get user's salary information for cost calculations
    // This would typically come from the individuals data
    const hourlyRate = 25; // Placeholder - should be calculated from individual's annual salary

    return grantBreakdown.map((item: any) => {
      const cost = item.totalHours * hourlyRate;
      const grant = grants.find(g => g.PK === item.grantId);

      return {
        ...item,
        cost,
        hourlyRate,
        status: grant ? 'Active' : 'Inactive',
        startDate: grant?.StartDate || '',
        endDate: grant?.EndDate || '',
      };
    });
  }, [grantBreakdown, grants]);

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
      
      <DialogContent dividers sx={{ p: 0, height: "100%", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <Box sx={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Period Selector - Fixed at top */}
          <Box sx={{ p: 2, backgroundColor: '#f8f9fa', borderBottom: '1px solid #e0e0e0', flexShrink: 0 }}>
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

          {/* Tabs - Fixed at top */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="timesheet tabs">
              <Tab label="Time Entry" />
              <Tab label="Summary Report" />
              <Tab label="Grant Breakdown" />
            </Tabs>
          </Box>

          {/* Tab Panels - Scrollable content area */}
          <Box sx={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <TabPanel value={tabValue} index={0}>
              <Box sx={{ height: "100%", overflow: "auto", p: 2 }}>
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
              <Box sx={{ height: "100%", overflow: "auto", p: 3 }}>
              <Typography variant="h6" sx={{ mb: 3 }}>
                Summary Report - {currentDateRange.label}
              </Typography>

              {/* Key Metrics Cards */}
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" sx={{ fontWeight: 600, color: '#1976d2', mb: 1 }}>
                        {totalHours.toFixed(1)}h
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Hours Worked
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" sx={{ fontWeight: 600, color: '#2e7d32', mb: 1 }}>
                        {totalAvailableHours.toFixed(1)}h
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Available Hours
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" sx={{ fontWeight: 600, color: '#ed6c02', mb: 1 }}>
                        {utilizationPercent.toFixed(1)}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Utilization Rate
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(utilizationPercent, 100)}
                        sx={{ mt: 1, height: 8, borderRadius: 4 }}
                        color={utilizationPercent > 100 ? 'error' : utilizationPercent > 80 ? 'warning' : 'primary'}
                      />
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" sx={{ fontWeight: 600, color: '#9c27b0', mb: 1 }}>
                        {activeGrants}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Active Grants
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Grant Breakdown Table */}
              <Typography variant="h6" sx={{ mb: 2 }}>
                Grant Allocation Breakdown
              </Typography>
              <TableContainer component={Paper} sx={{ mb: 3 }}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                      <TableCell sx={{ fontWeight: 600 }}>Grant</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Hours</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Percentage</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Progress</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {grantBreakdown.map((item: any) => (
                      <TableRow key={item.grantId} hover>
                        <TableCell>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {item.grantTitle}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body1">
                            {item.totalHours.toFixed(1)}h
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body1">
                            {item.percentage.toFixed(1)}%
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={item.isActive ? 'Active' : 'Inactive'}
                            color={item.isActive ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell sx={{ width: 150 }}>
                          <LinearProgress
                            variant="determinate"
                            value={item.percentage}
                            sx={{ height: 8, borderRadius: 4 }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    {grantBreakdown.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} sx={{ textAlign: 'center', py: 3 }}>
                          <Typography variant="body2" color="text.secondary">
                            No grant allocations found for this period
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Utilization Analysis */}
              <Typography variant="h6" sx={{ mb: 2 }}>
                Utilization Analysis
              </Typography>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Typography variant="body1" sx={{ flexGrow: 1 }}>
                      Time Utilization: {totalHours.toFixed(1)}h / {totalAvailableHours.toFixed(1)}h
                    </Typography>
                    <Chip
                      label={
                        utilizationPercent > 100 ? 'Over-allocated' :
                        utilizationPercent > 80 ? 'Well-utilized' :
                        utilizationPercent > 50 ? 'Under-utilized' : 'Low utilization'
                      }
                      color={
                        utilizationPercent > 100 ? 'error' :
                        utilizationPercent > 80 ? 'success' :
                        utilizationPercent > 50 ? 'warning' : 'default'
                      }
                    />
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(utilizationPercent, 100)}
                    sx={{ height: 12, borderRadius: 6, mb: 2 }}
                    color={utilizationPercent > 100 ? 'error' : 'primary'}
                  />
                  <Typography variant="body2" color="text.secondary">
                    {utilizationPercent > 100
                      ? `Over-allocated by ${(utilizationPercent - 100).toFixed(1)}%. Consider redistributing hours.`
                      : utilizationPercent > 80
                      ? 'Good utilization rate. Time is being used efficiently.'
                      : `Under-utilized by ${(100 - utilizationPercent).toFixed(1)}%. Consider taking on additional work.`
                    }
                  </Typography>
                </CardContent>
              </Card>
              </Box>
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              <Box sx={{ height: "100%", overflow: "auto", p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">
                  Grant Breakdown - {currentDateRange.label}
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    // Export functionality - would implement CSV/PDF export
                    console.log('Export grant breakdown data:', grantFinancialBreakdown);
                    alert('Export functionality would be implemented here');
                  }}
                >
                  Export Report
                </Button>
              </Box>

              {/* Financial Summary Cards */}
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={4}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" sx={{ fontWeight: 600, color: '#1976d2', mb: 1 }}>
                        {formatCurrency(grantFinancialBreakdown.reduce((sum, item) => sum + item.cost, 0))}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Cost Allocation
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" sx={{ fontWeight: 600, color: '#2e7d32', mb: 1 }}>
                        {grantFinancialBreakdown.filter(item => item.status === 'Active').length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Active Grants
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" sx={{ fontWeight: 600, color: '#ed6c02', mb: 1 }}>
                        {formatCurrency(grantFinancialBreakdown.length > 0 ?
                          grantFinancialBreakdown.reduce((sum, item) => sum + item.cost, 0) / grantFinancialBreakdown.length : 0)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Average Cost per Grant
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Detailed Grant Financial Table */}
              <Typography variant="h6" sx={{ mb: 2 }}>
                Detailed Financial Breakdown
              </Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                      <TableCell sx={{ fontWeight: 600 }}>Grant Title</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Hours</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Hourly Rate</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Total Cost</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Percentage</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Grant Period</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {grantFinancialBreakdown.map((item: any) => (
                      <TableRow key={item.grantId} hover>
                        <TableCell>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {item.grantTitle}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {item.grantId}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body1">
                            {item.totalHours.toFixed(1)}h
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body1">
                            {formatCurrency(item.hourlyRate)}/hr
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body1" sx={{ fontWeight: 600, color: '#1976d2' }}>
                            {formatCurrency(item.cost)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body1">
                              {item.percentage.toFixed(1)}%
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={item.percentage}
                              sx={{ width: 60, height: 6, borderRadius: 3 }}
                            />
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={item.status}
                            color={item.status === 'Active' ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {item.startDate && item.endDate ? (
                              <>
                                {format(parseISO(item.startDate), 'MMM dd, yyyy')} -
                                {format(parseISO(item.endDate), 'MMM dd, yyyy')}
                              </>
                            ) : (
                              'N/A'
                            )}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                    {grantFinancialBreakdown.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>
                          <Typography variant="body2" color="text.secondary">
                            No grant allocations found for this period
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Cost Analysis Summary */}
              <Box sx={{ mt: 4 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Cost Analysis Summary
                </Typography>
                <Card>
                  <CardContent>
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
                          Highest Cost Grant
                        </Typography>
                        {grantFinancialBreakdown.length > 0 && (
                          <Box>
                            <Typography variant="body1">
                              {grantFinancialBreakdown[0].grantTitle}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {formatCurrency(grantFinancialBreakdown[0].cost)}
                              ({grantFinancialBreakdown[0].totalHours.toFixed(1)}h)
                            </Typography>
                          </Box>
                        )}
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
                          Cost Distribution
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {grantFinancialBreakdown.length} grants with an average allocation of{' '}
                          {grantFinancialBreakdown.length > 0 ?
                            (totalHours / grantFinancialBreakdown.length).toFixed(1) : 0}h per grant
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Box>
              </Box>
            </TabPanel>
          </Box>
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
