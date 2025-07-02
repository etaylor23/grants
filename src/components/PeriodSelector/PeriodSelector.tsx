import React, { useMemo, useState } from "react";
import {
  Box,
  ToggleButtonGroup,
  ToggleButton,
  Typography,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
} from "@mui/material";
import {
  CalendarMonth as MonthIcon,
  DateRange as RangeIcon,
  Today as TodayIcon,
  History as HistoryIcon,
  Edit as EditIcon,
} from "@mui/icons-material";
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  endOfYear,
  subYears,
  addMonths,
  format,
} from "date-fns";
import { PeriodType } from "../../models/grantDashboard";

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
  // Optional grouping information to display in Selected Period Info
  currentGrouping?: {
    periodType: PeriodType;
    label: string;
  };
  // Optional grouping controls to display inline
  groupingControls?: React.ReactNode;
}

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  selectedPeriod,
  onPeriodChange,
  className,
  currentGrouping,
  groupingControls,
}) => {
  const [customRangeOpen, setCustomRangeOpen] = useState(false);
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const periodOptions = useMemo((): PeriodOption[] => {
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);

    return [
      {
        id: "monthly",
        label: "Current Month",
        shortLabel: "Month",
        startDate: currentMonthStart,
        endDate: currentMonthEnd,
        icon: <MonthIcon />,
        description: format(currentMonthStart, "MMMM yyyy"),
      },
      {
        id: "3months",
        label: "Next 3 Months",
        shortLabel: "3M",
        startDate: currentMonthStart,
        endDate: endOfMonth(addMonths(currentMonthStart, 2)),
        icon: <RangeIcon />,
        description: `${format(currentMonthStart, "MMM")} - ${format(
          addMonths(currentMonthStart, 2),
          "MMM yyyy"
        )}`,
      },
      {
        id: "6months",
        label: "Next 6 Months",
        shortLabel: "6M",
        startDate: currentMonthStart,
        endDate: endOfMonth(addMonths(currentMonthStart, 5)),
        icon: <RangeIcon />,
        description: `${format(currentMonthStart, "MMM")} - ${format(
          addMonths(currentMonthStart, 5),
          "MMM yyyy"
        )}`,
      },
      {
        id: "lastmonth",
        label: "Last Month",
        shortLabel: "Last M",
        startDate: startOfMonth(subMonths(now, 1)),
        endDate: endOfMonth(subMonths(now, 1)),
        icon: <HistoryIcon />,
        description: format(subMonths(now, 1), "MMMM yyyy"),
      },
      {
        id: "last6months",
        label: "Last 6 Months",
        shortLabel: "Last 6M",
        startDate: startOfMonth(subMonths(now, 5)),
        endDate: currentMonthEnd,
        icon: <HistoryIcon />,
        description: `${format(subMonths(now, 5), "MMM")} - ${format(
          now,
          "MMM yyyy"
        )}`,
      },
      {
        id: "thisyear",
        label: "This Year",
        shortLabel: "Year",
        startDate: startOfYear(now),
        endDate: endOfYear(now),
        icon: <TodayIcon />,
        description: format(now, "yyyy"),
      },
      {
        id: "lastyear",
        label: "Last Year",
        shortLabel: "Last Y",
        startDate: startOfYear(subYears(now, 1)),
        endDate: endOfYear(subYears(now, 1)),
        icon: <HistoryIcon />,
        description: format(subYears(now, 1), "yyyy"),
      },
      {
        id: "custom",
        label: "Custom Range",
        shortLabel: "Custom",
        startDate: now,
        endDate: now,
        icon: <EditIcon />,
        description: "Select custom date range",
      },
    ];
  }, []);

  const selectedPeriodOption = periodOptions.find(
    (option) => option.id === selectedPeriod
  );

  const handlePeriodChange = (
    _event: React.MouseEvent<HTMLElement>,
    newPeriod: string | null
  ) => {
    if (newPeriod !== null) {
      if (newPeriod === "custom") {
        setCustomRangeOpen(true);
      } else {
        const periodOption = periodOptions.find(
          (option) => option.id === newPeriod
        );
        if (periodOption) {
          onPeriodChange(newPeriod, periodOption);
        }
      }
    }
  };

  const handleCustomRangeApply = () => {
    if (customStartDate && customEndDate) {
      const startDate = new Date(customStartDate);
      const endDate = new Date(customEndDate);

      if (startDate <= endDate) {
        const customPeriod: PeriodOption = {
          id: "custom",
          label: "Custom Range",
          shortLabel: "Custom",
          startDate,
          endDate,
          icon: <EditIcon />,
          description: `${format(startDate, "MMM dd, yyyy")} - ${format(
            endDate,
            "MMM dd, yyyy"
          )}`,
        };

        onPeriodChange("custom", customPeriod);
        setCustomRangeOpen(false);
      }
    }
  };

  const handleCustomRangeCancel = () => {
    setCustomRangeOpen(false);
    setCustomStartDate("");
    setCustomEndDate("");
  };

  return (
    <Box className={className} sx={{ mb: 3 }}>
      {/* Horizontal Inline Layout for Period Selection and Grouping Controls */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", lg: "row" },
          gap: { xs: 2, lg: 2 },
          mb: 2,
          maxWidth: "100%",
          overflow: "hidden",
          "@media (max-width: 950px)": {
            flexDirection: "column",
            gap: 2,
          },
        }}
      >
        {/* Time Period Section */}
        <Box sx={{ flex: 1 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              mb: 1.5,
              textAlign: { xs: "left", md: "left" },
            }}
          >
            Time Period
          </Typography>
          <ToggleButtonGroup
            value={selectedPeriod}
            exclusive
            onChange={handlePeriodChange}
            aria-label="time period selection"
            size="small"
            sx={{
              "& .MuiToggleButton-root": {
                px: 1.5,
                py: 0.75,
                fontSize: "0.8rem",
                border: "1px solid #e0e0e0",
                "&.Mui-selected": {
                  backgroundColor: "#1976d2",
                  color: "white",
                  "&:hover": {
                    backgroundColor: "#1565c0",
                  },
                },
                "&:hover": {
                  backgroundColor: "#f5f5f5",
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
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    flexDirection: { xs: "column", sm: "row" },
                  }}
                >
                  {option.icon}
                  <Typography
                    variant="caption"
                    sx={{
                      display: { xs: "block", sm: "none" },
                      fontSize: "0.7rem",
                    }}
                  >
                    {option.shortLabel}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      display: { xs: "none", sm: "block" },
                      fontWeight: 500,
                      fontSize: "0.8rem",
                    }}
                  >
                    {option.label}
                  </Typography>
                </Box>
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

        {/* Data Grouping Section */}
        {groupingControls && (
          <Box
            sx={{
              flex: "0 1 auto",
              maxWidth: "100%",
              minWidth: 0,
              "@media (max-width: 950px)": {
                width: "100%",
              },
            }}
          >
            {groupingControls}
          </Box>
        )}
      </Box>

      {/* Selected Period Info */}
      {selectedPeriodOption && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            p: 2,
            backgroundColor: "#f8f9fa",
            borderRadius: 2,
            border: "1px solid #e0e0e0",
          }}
        >
          <Chip
            icon={selectedPeriodOption.icon as React.ReactElement}
            label={selectedPeriodOption.label}
            color="primary"
            variant="filled"
          />
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {selectedPeriodOption.description}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {format(selectedPeriodOption.startDate, "MMM dd, yyyy")} -{" "}
              {format(selectedPeriodOption.endDate, "MMM dd, yyyy")}
            </Typography>
          </Box>
          {currentGrouping && (
            <Box sx={{ textAlign: "right" }}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                Data Grouping
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {currentGrouping.label}
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {/* Custom Date Range Dialog */}
      <Dialog
        open={customRangeOpen}
        onClose={handleCustomRangeCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Select Custom Date Range</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Choose a custom start and end date for your time period analysis.
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Start Date"
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                fullWidth
                InputLabelProps={{
                  shrink: true,
                }}
                inputProps={{
                  max: customEndDate || undefined,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="End Date"
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                fullWidth
                InputLabelProps={{
                  shrink: true,
                }}
                inputProps={{
                  min: customStartDate || undefined,
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCustomRangeCancel}>Cancel</Button>
          <Button
            onClick={handleCustomRangeApply}
            variant="contained"
            disabled={!customStartDate || !customEndDate}
          >
            Apply Range
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
