import React, { useMemo } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  LinearProgress,
  Divider,
  Tooltip,
} from "@mui/material";
import {
  Work as WorkIcon,
  BeachAccess as VacationIcon,
  LocalHospital as SickIcon,
  Event as HolidayIcon,
  MoreHoriz as OtherIcon,
} from "@mui/icons-material";
import { calculateCapacityUtilization, calculateLeaveDaysByType } from "../../utils/dateUtils";
import { LeaveType, getLeaveTypeFromDayEntry, DayEntry } from "../../db/schema";

interface LeaveImpactSummaryProps {
  workdayHoursData: Record<string, number | DayEntry>;
  timeSlots: Array<{ HoursAllocated: number; Date: string }>;
  periodDates: string[];
  userName: string;
}

const LEAVE_TYPE_CONFIG: Record<LeaveType, { 
  label: string; 
  icon: React.ReactNode; 
  color: string;
  description: string;
}> = {
  work: {
    label: "Work Days",
    icon: <WorkIcon />,
    color: "#4caf50",
    description: "Days available for grant allocation",
  },
  "annual-leave": {
    label: "Annual Leave",
    icon: <VacationIcon />,
    color: "#2196f3",
    description: "Vacation and personal time off",
  },
  "sick-leave": {
    label: "Sick Leave",
    icon: <SickIcon />,
    color: "#ff9800",
    description: "Medical leave and sick days",
  },
  "public-holiday": {
    label: "Public Holidays",
    icon: <HolidayIcon />,
    color: "#9c27b0",
    description: "Bank holidays and public holidays",
  },
  other: {
    label: "Other Leave",
    icon: <OtherIcon />,
    color: "#607d8b",
    description: "Other types of leave",
  },
};

export const LeaveImpactSummary: React.FC<LeaveImpactSummaryProps> = ({
  workdayHoursData,
  timeSlots,
  periodDates,
  userName,
}) => {
  const metrics = useMemo(() => {
    const totalHoursWorked = timeSlots.reduce(
      (sum, slot) => sum + (slot.HoursAllocated || 0),
      0
    );

    const capacityMetrics = calculateCapacityUtilization(
      totalHoursWorked,
      workdayHoursData,
      periodDates
    );

    const leaveDays = calculateLeaveDaysByType(workdayHoursData, periodDates);

    return {
      totalHoursWorked,
      ...capacityMetrics,
      leaveDays,
    };
  }, [workdayHoursData, timeSlots, periodDates]);

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;
  const formatHours = (value: number) => `${value.toFixed(1)}h`;

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Leave Impact Summary - {userName}
        </Typography>
        
        {/* Key Metrics */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}>
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="h4" color="primary.main" sx={{ fontWeight: 600 }}>
                {formatPercentage(metrics.workDayUtilization)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Work Day Utilization
              </Typography>
              <Tooltip title="Percentage of available work hours that were allocated to grants">
                <LinearProgress
                  variant="determinate"
                  value={Math.min(metrics.workDayUtilization, 100)}
                  sx={{ mt: 1, height: 8, borderRadius: 4 }}
                />
              </Tooltip>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="h4" color="secondary.main" sx={{ fontWeight: 600 }}>
                {formatPercentage(metrics.overallCapacityUtilization)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Overall Capacity
              </Typography>
              <Tooltip title="Percentage of total calendar time that was allocated to grants (including leave impact)">
                <LinearProgress
                  variant="determinate"
                  value={Math.min(metrics.overallCapacityUtilization, 100)}
                  color="secondary"
                  sx={{ mt: 1, height: 8, borderRadius: 4 }}
                />
              </Tooltip>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="h4" sx={{ fontWeight: 600, color: "#ed6c02" }}>
                {formatHours(metrics.totalHoursWorked)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Hours Allocated
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="h4" sx={{ fontWeight: 600, color: "#9c27b0" }}>
                {metrics.workDays}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Work Days
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        {/* Leave Breakdown */}
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
          Leave Breakdown
        </Typography>
        
        <Grid container spacing={2}>
          {Object.entries(LEAVE_TYPE_CONFIG).map(([type, config]) => {
            const count = metrics.leaveDays[type as LeaveType];
            const percentage = metrics.totalDays > 0 ? (count / metrics.totalDays) * 100 : 0;
            
            return (
              <Grid item xs={12} sm={6} md={4} key={type}>
                <Box sx={{ 
                  display: "flex", 
                  alignItems: "center", 
                  p: 2, 
                  border: 1, 
                  borderColor: "grey.200",
                  borderRadius: 1,
                  backgroundColor: count > 0 ? `${config.color}10` : "transparent",
                }}>
                  <Box sx={{ 
                    color: config.color, 
                    mr: 2,
                    display: "flex",
                    alignItems: "center",
                  }}>
                    {config.icon}
                  </Box>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {config.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {config.description}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: "right" }}>
                    <Chip
                      label={`${count} days`}
                      size="small"
                      sx={{
                        backgroundColor: count > 0 ? config.color : "grey.200",
                        color: count > 0 ? "white" : "text.secondary",
                        fontWeight: 500,
                      }}
                    />
                    {count > 0 && (
                      <Typography variant="caption" display="block" color="text.secondary">
                        {formatPercentage(percentage)}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Grid>
            );
          })}
        </Grid>

        {/* Summary Insights */}
        <Box sx={{ mt: 3, p: 2, backgroundColor: "grey.50", borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Key Insights:
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • <strong>Work Day Utilization</strong> shows how efficiently available work time was used
            <br />
            • <strong>Overall Capacity</strong> shows the impact of leave on total productivity
            <br />
            • Leave days are excluded from work utilization calculations but impact overall capacity
            <br />
            • {metrics.workDays} work days out of {metrics.totalDays} total days tracked ({formatPercentage((metrics.workDays / metrics.totalDays) * 100)} work ratio)
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default LeaveImpactSummary;
