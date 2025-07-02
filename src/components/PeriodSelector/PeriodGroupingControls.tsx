import React from "react";
import {
  Box,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import {
  CalendarToday as CalendarIcon,
  Assessment as AssessmentIcon,
} from "@mui/icons-material";
import { PeriodType } from "../../models/grantDashboard";

export interface PeriodGroupingControlsProps {
  periodType: PeriodType;
  onPeriodTypeChange: (
    event: React.MouseEvent<HTMLElement>,
    newPeriodType: PeriodType | null
  ) => void;
  showLabel?: boolean;
  className?: string;
  size?: "small" | "medium" | "large";
}

export const PeriodGroupingControls: React.FC<PeriodGroupingControlsProps> = ({
  periodType,
  onPeriodTypeChange,
  showLabel = true,
  className,
  size = "small",
}) => {
  return (
    <Box className={className}>
      {showLabel && (
        <Typography
          variant="h6"
          sx={{ fontWeight: 600, mb: 1, fontSize: "1.125rem" }}
          id="grouping-selector-heading"
        >
          Group By:
        </Typography>
      )}
      <ToggleButtonGroup
        value={periodType}
        exclusive
        onChange={onPeriodTypeChange}
        aria-label="Select data grouping for analysis"
        aria-labelledby={showLabel ? "grouping-selector-heading" : undefined}
        size={size}
        sx={{
          "& .MuiToggleButton-root": {
            px: 1.5,
            py: 0.75,
            fontSize: "0.8rem",
            "& .MuiSvgIcon-root": {
              fontSize: "1rem",
            },
          },
        }}
      >
        <ToggleButton
          value="monthly"
          aria-label="Group data by monthly periods"
        >
          <CalendarIcon sx={{ mr: 1 }} aria-hidden="true" />
          Months
        </ToggleButton>
        <ToggleButton
          value="quarterly"
          aria-label="Group data by quarterly periods"
        >
          <AssessmentIcon sx={{ mr: 1 }} aria-hidden="true" />
          Quarters
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
};
