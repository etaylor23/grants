import React from "react";
import { Button, Chip } from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Public as GlobalIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useScopeInfo } from "../../utils/breadcrumbUtils";
import { useOrganisations } from "../../hooks/useLocalData";

interface BackToGlobalButtonProps {
  /**
   * The global route to navigate to (defaults to appropriate global view)
   */
  globalRoute?: string;
  /**
   * Button variant
   */
  variant?: "button" | "chip";
  /**
   * Button size
   */
  size?: "small" | "medium" | "large";
  /**
   * Custom styling
   */
  sx?: object;
}

export const BackToGlobalButton: React.FC<BackToGlobalButtonProps> = ({
  globalRoute,
  variant = "button",
  size = "medium",
  sx = {},
}) => {
  const navigate = useNavigate();
  const { data: organisations = [] } = useOrganisations();
  const scopeInfo = useScopeInfo(organisations);

  // Don't show if already in global context
  if (scopeInfo.isGlobal) {
    return null;
  }

  const handleBackToGlobal = () => {
    if (globalRoute) {
      navigate(globalRoute);
    } else {
      // Determine appropriate global route based on current context
      const currentPath = window.location.pathname;
      if (currentPath.includes("/calendar")) {
        navigate("/calendar");
      } else if (currentPath.includes("/grants")) {
        navigate("/grants");
      } else if (currentPath.includes("/timesheets")) {
        navigate("/calendar"); // No global timesheets view, go to calendar
      } else {
        navigate("/"); // Default to dashboard
      }
    }
  };

  if (variant === "chip") {
    return (
      <Chip
        icon={<GlobalIcon />}
        label="Back to Global View"
        onClick={handleBackToGlobal}
        clickable
        size={size === "large" ? "medium" : "small"}
        sx={{
          backgroundColor: "#1976d2",
          color: "white",
          "&:hover": {
            backgroundColor: "#1565c0",
          },
          ...sx,
        }}
      />
    );
  }

  return (
    <Button
      startIcon={<ArrowBackIcon />}
      onClick={handleBackToGlobal}
      size={size}
      variant="outlined"
      sx={{
        borderColor: "#1976d2",
        color: "#1976d2",
        "&:hover": {
          borderColor: "#1565c0",
          backgroundColor: "rgba(25, 118, 210, 0.04)",
        },
        ...sx,
      }}
    >
      Back to Global View
    </Button>
  );
};
