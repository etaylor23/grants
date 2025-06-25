import React, { useMemo } from 'react';
import {
  Box,
  ToggleButtonGroup,
  ToggleButton,
  Typography,
  Chip,
} from '@mui/material';
import {
  CalendarMonth as MonthIcon,
  DateRange as RangeIcon,
  Today as TodayIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { 
  startOfMonth, 
  endOfMonth, 
  subMonths, 
  startOfYear, 
  endOfYear, 
  subYears,
  addMonths,
  format 
} from 'date-fns';

export interface PeriodOption {
  id: string;
  label: string;
  shortLabel: string;
  startDate: Date;
  endDate: Date;
  icon: React.ReactNode;
  description: string;
}

export interface PeriodSelectorProps {
  selectedPeriod: string;
  onPeriodChange: (periodId: string, period: PeriodOption) => void;
  className?: string;
}

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  selectedPeriod,
  onPeriodChange,
  className,
}) => {
  const periodOptions = useMemo((): PeriodOption[] => {
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    
    return [
      {
        id: 'monthly',
        label: 'Monthly',
        shortLabel: 'Month',
        startDate: currentMonthStart,
        endDate: currentMonthEnd,
        icon: <MonthIcon />,
        description: format(currentMonthStart, 'MMMM yyyy'),
      },
      {
        id: '3months',
        label: '3 Months',
        shortLabel: '3M',
        startDate: currentMonthStart,
        endDate: endOfMonth(addMonths(currentMonthStart, 2)),
        icon: <RangeIcon />,
        description: `${format(currentMonthStart, 'MMM')} - ${format(addMonths(currentMonthStart, 2), 'MMM yyyy')}`,
      },
      {
        id: '6months',
        label: '6 Months',
        shortLabel: '6M',
        startDate: currentMonthStart,
        endDate: endOfMonth(addMonths(currentMonthStart, 5)),
        icon: <RangeIcon />,
        description: `${format(currentMonthStart, 'MMM')} - ${format(addMonths(currentMonthStart, 5), 'MMM yyyy')}`,
      },
      {
        id: 'lastmonth',
        label: 'Last Month',
        shortLabel: 'Last M',
        startDate: startOfMonth(subMonths(now, 1)),
        endDate: endOfMonth(subMonths(now, 1)),
        icon: <HistoryIcon />,
        description: format(subMonths(now, 1), 'MMMM yyyy'),
      },
      {
        id: 'last6months',
        label: 'Last 6 Months',
        shortLabel: 'Last 6M',
        startDate: startOfMonth(subMonths(now, 5)),
        endDate: currentMonthEnd,
        icon: <HistoryIcon />,
        description: `${format(subMonths(now, 5), 'MMM')} - ${format(now, 'MMM yyyy')}`,
      },
      {
        id: 'thisyear',
        label: 'This Year',
        shortLabel: 'Year',
        startDate: startOfYear(now),
        endDate: endOfYear(now),
        icon: <TodayIcon />,
        description: format(now, 'yyyy'),
      },
      {
        id: 'lastyear',
        label: 'Last Year',
        shortLabel: 'Last Y',
        startDate: startOfYear(subYears(now, 1)),
        endDate: endOfYear(subYears(now, 1)),
        icon: <HistoryIcon />,
        description: format(subYears(now, 1), 'yyyy'),
      },
    ];
  }, []);

  const selectedPeriodOption = periodOptions.find(option => option.id === selectedPeriod);

  const handlePeriodChange = (
    event: React.MouseEvent<HTMLElement>,
    newPeriod: string | null,
  ) => {
    if (newPeriod !== null) {
      const periodOption = periodOptions.find(option => option.id === newPeriod);
      if (periodOption) {
        onPeriodChange(newPeriod, periodOption);
      }
    }
  };

  return (
    <Box className={className} sx={{ mb: 3 }}>
      {/* Period Selection */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'stretch', sm: 'center' },
        justifyContent: 'space-between',
        gap: 2,
        mb: 2,
      }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            Time Period
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Select the time range for calendar and timesheet views
          </Typography>
        </Box>
        
        <ToggleButtonGroup
          value={selectedPeriod}
          exclusive
          onChange={handlePeriodChange}
          aria-label="time period selection"
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              px: 2,
              py: 1,
              border: '1px solid #e0e0e0',
              '&.Mui-selected': {
                backgroundColor: '#1976d2',
                color: 'white',
                '&:hover': {
                  backgroundColor: '#1565c0',
                },
              },
              '&:hover': {
                backgroundColor: '#f5f5f5',
              },
            },
          }}
        >
          {periodOptions.map((option) => (
            <ToggleButton
              key={option.id}
              value={option.id}
              aria-label={option.label}
            >
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 0.5,
                flexDirection: { xs: 'column', sm: 'row' },
              }}>
                {option.icon}
                <Typography variant="caption" sx={{ 
                  display: { xs: 'block', sm: 'none' },
                  fontSize: '0.7rem',
                }}>
                  {option.shortLabel}
                </Typography>
                <Typography variant="body2" sx={{ 
                  display: { xs: 'none', sm: 'block' },
                  fontWeight: 500,
                }}>
                  {option.label}
                </Typography>
              </Box>
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {/* Selected Period Info */}
      {selectedPeriodOption && (
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 2,
          p: 2,
          backgroundColor: '#f8f9fa',
          borderRadius: 2,
          border: '1px solid #e0e0e0',
        }}>
          <Chip
            icon={selectedPeriodOption.icon as React.ReactElement}
            label={selectedPeriodOption.label}
            color="primary"
            variant="filled"
          />
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {selectedPeriodOption.description}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {format(selectedPeriodOption.startDate, 'MMM dd, yyyy')} - {format(selectedPeriodOption.endDate, 'MMM dd, yyyy')}
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
};
