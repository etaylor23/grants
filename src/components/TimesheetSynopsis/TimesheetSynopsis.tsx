import React, { useMemo } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
} from "@mui/material";
import {
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
  AttachMoney as MoneyIcon,
  Assignment as AssignmentIcon,
} from "@mui/icons-material";
import { format, eachDayOfInterval } from "date-fns";
import { useIndividuals } from "../../hooks/useLocalData";

interface TimesheetSynopsisProps {
  userId: string;
  userName: string;
  startDate: Date;
  endDate: Date;
  timeSlots: any[];
  grants: any[];
  workdayHours: Record<string, number>;
}

export const TimesheetSynopsis: React.FC<TimesheetSynopsisProps> = ({
  userId,
  userName,
  startDate,
  endDate,
  timeSlots,
  grants,
  workdayHours,
}) => {
  const { data: individuals = [] } = useIndividuals();
  
  // Find the individual's data for salary calculations
  const individual = individuals.find((ind: any) => ind.PK === userId);
  const annualGross = individual?.AnnualGross || 0;
  
  // Calculate working days in the period (assuming 260 working days per year)
  const workingDaysPerYear = 260;
  const dailyRate = annualGross / workingDaysPerYear;
  const hourlyRate = dailyRate / 8; // Assuming 8 hours per day

  // Get all dates in the period
  const periodDays = eachDayOfInterval({ start: startDate, end: endDate });
  const periodDates = periodDays.map(day => format(day, "yyyy-MM-dd"));

  // Calculate summary statistics
  const summary = useMemo(() => {
    // Total available hours
    const totalAvailableHours = periodDates.reduce((sum, date) => {
      return sum + (workdayHours[date] || 0);
    }, 0);

    // Total allocated hours
    const totalAllocatedHours = timeSlots.reduce((sum, slot: any) => {
      return sum + (slot.HoursAllocated || 0);
    }, 0);

    // Utilization percentage
    const utilizationPercent = totalAvailableHours > 0 
      ? (totalAllocatedHours / totalAvailableHours) * 100 
      : 0;

    // Grant breakdown
    const grantBreakdown = grants.map((grant: any) => {
      const grantSlots = timeSlots.filter((slot: any) => slot.GrantID === grant.PK);
      const grantHours = grantSlots.reduce((sum, slot: any) => sum + (slot.HoursAllocated || 0), 0);
      const grantValue = grantHours * hourlyRate;
      const grantPercent = totalAllocatedHours > 0 ? (grantHours / totalAllocatedHours) * 100 : 0;
      
      return {
        id: grant.PK,
        title: grant.Title,
        hours: grantHours,
        value: grantValue,
        percent: grantPercent,
        dailyAverage: grantHours / periodDates.length,
      };
    }).filter(grant => grant.hours > 0).sort((a, b) => b.hours - a.hours);

    // Daily breakdown
    const dailyBreakdown = periodDates.map(date => {
      const daySlots = timeSlots.filter((slot: any) => slot.Date === date);
      const dayHours = daySlots.reduce((sum, slot: any) => sum + (slot.HoursAllocated || 0), 0);
      const availableHours = workdayHours[date] || 0;
      const dayValue = dayHours * hourlyRate;
      const dayUtilization = availableHours > 0 ? (dayHours / availableHours) * 100 : 0;
      
      return {
        date,
        hours: dayHours,
        available: availableHours,
        value: dayValue,
        utilization: dayUtilization,
        grants: daySlots.length,
      };
    }).filter(day => day.available > 0);

    return {
      totalAvailableHours,
      totalAllocatedHours,
      utilizationPercent,
      totalValue: totalAllocatedHours * hourlyRate,
      averageHoursPerDay: totalAllocatedHours / periodDates.length,
      grantBreakdown,
      dailyBreakdown,
      workingDays: dailyBreakdown.length,
    };
  }, [timeSlots, grants, workdayHours, periodDates, hourlyRate]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getUtilizationColor = (percent: number) => {
    if (percent >= 90) return 'success';
    if (percent >= 70) return 'warning';
    return 'error';
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
        📊 Timesheet Synopsis - {userName}
      </Typography>
      
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        {format(startDate, "MMMM dd, yyyy")} - {format(endDate, "MMMM dd, yyyy")} 
        • Annual Salary: {formatCurrency(annualGross)} 
        • Hourly Rate: {formatCurrency(hourlyRate)}
      </Typography>

      {/* Key Metrics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <ScheduleIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" component="div">
                  {summary.totalAllocatedHours.toFixed(1)}h
                </Typography>
              </Box>
              <Typography color="text.secondary" variant="body2">
                Total Allocated Hours
              </Typography>
              <Typography variant="caption" color="text.secondary">
                of {summary.totalAvailableHours}h available
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TrendingUpIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" component="div">
                  {summary.utilizationPercent.toFixed(1)}%
                </Typography>
              </Box>
              <Typography color="text.secondary" variant="body2">
                Utilization Rate
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={Math.min(summary.utilizationPercent, 100)} 
                color={getUtilizationColor(summary.utilizationPercent)}
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <MoneyIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" component="div">
                  {formatCurrency(summary.totalValue)}
                </Typography>
              </Box>
              <Typography color="text.secondary" variant="body2">
                Total Period Value
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatCurrency(summary.totalValue / (summary.workingDays || 1))}/day avg
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <AssignmentIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" component="div">
                  {summary.grantBreakdown.length}
                </Typography>
              </Box>
              <Typography color="text.secondary" variant="body2">
                Active Grants
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {summary.averageHoursPerDay.toFixed(1)}h/day avg
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Grant Breakdown Table */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Grant Allocation Breakdown
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Grant</TableCell>
                      <TableCell align="right">Hours</TableCell>
                      <TableCell align="right">Value</TableCell>
                      <TableCell align="right">% of Total</TableCell>
                      <TableCell align="right">Daily Avg</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {summary.grantBreakdown.map((grant) => (
                      <TableRow key={grant.id}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {grant.title}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          {grant.hours.toFixed(1)}h
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(grant.value)}
                        </TableCell>
                        <TableCell align="right">
                          <Chip 
                            label={`${grant.percent.toFixed(1)}%`}
                            size="small"
                            color={grant.percent > 50 ? 'primary' : 'default'}
                          />
                        </TableCell>
                        <TableCell align="right">
                          {grant.dailyAverage.toFixed(1)}h
                        </TableCell>
                      </TableRow>
                    ))}
                    {summary.grantBreakdown.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          <Typography color="text.secondary">
                            No grant allocations in this period
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Period Summary
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Working Days
                  </Typography>
                  <Typography variant="h6">
                    {summary.workingDays} days
                  </Typography>
                </Box>
                
                <Divider />
                
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Average Utilization
                  </Typography>
                  <Typography variant="h6">
                    {summary.utilizationPercent.toFixed(1)}%
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={Math.min(summary.utilizationPercent, 100)} 
                    color={getUtilizationColor(summary.utilizationPercent)}
                    sx={{ mt: 1 }}
                  />
                </Box>
                
                <Divider />
                
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Efficiency Metrics
                  </Typography>
                  <Typography variant="body2">
                    • {summary.averageHoursPerDay.toFixed(1)}h allocated/day
                  </Typography>
                  <Typography variant="body2">
                    • {formatCurrency(summary.totalValue / (summary.workingDays || 1))}/day value
                  </Typography>
                  <Typography variant="body2">
                    • {summary.grantBreakdown.length} active grants
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
