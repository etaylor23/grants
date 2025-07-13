import React from 'react';
import { Box, Chip, Typography } from '@mui/material';
import { Public as GlobalIcon, Business as OrganizationIcon } from '@mui/icons-material';
import { useScopeInfo } from '../../utils/breadcrumbUtils';
import { useOrganisations } from '../../hooks/useLocalData';

interface ContextIndicatorProps {
  /**
   * Whether to show as a banner (full width) or inline
   */
  variant?: 'banner' | 'inline';
  /**
   * Custom styling
   */
  sx?: object;
  /**
   * Whether to show additional context information
   */
  showDescription?: boolean;
}

export const ContextIndicator: React.FC<ContextIndicatorProps> = ({
  variant = 'inline',
  sx = {},
  showDescription = false,
}) => {
  const { data: organisations = [] } = useOrganisations();
  const scopeInfo = useScopeInfo(organisations);

  const getContextDescription = () => {
    if (scopeInfo.isGlobal) {
      return "Viewing data across all organizations";
    } else {
      return `Viewing data for ${scopeInfo.organizationName || 'this organization'}`;
    }
  };

  const getContextColor = () => {
    return scopeInfo.isGlobal ? '#1976d2' : '#2e7d32';
  };

  if (variant === 'banner') {
    return (
      <Box
        sx={{
          backgroundColor: scopeInfo.isGlobal ? '#e3f2fd' : '#e8f5e8',
          borderLeft: `4px solid ${getContextColor()}`,
          padding: 2,
          marginBottom: 2,
          borderRadius: 1,
          ...sx,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            icon={scopeInfo.isGlobal ? <GlobalIcon /> : <OrganizationIcon />}
            label={scopeInfo.isGlobal ? "Global View" : scopeInfo.organizationName || "Organization View"}
            size="small"
            variant="filled"
            sx={{
              backgroundColor: getContextColor(),
              color: 'white',
              fontWeight: 500,
            }}
          />
          {showDescription && (
            <Typography
              variant="body2"
              sx={{
                color: getContextColor(),
                fontWeight: 500,
              }}
            >
              {getContextDescription()}
            </Typography>
          )}
        </Box>
      </Box>
    );
  }

  // Inline variant
  return (
    <Chip
      icon={scopeInfo.isGlobal ? <GlobalIcon /> : <OrganizationIcon />}
      label={scopeInfo.isGlobal ? "Global" : scopeInfo.organizationName || "Organization"}
      size="small"
      variant={scopeInfo.isGlobal ? "outlined" : "filled"}
      sx={{
        backgroundColor: scopeInfo.isGlobal ? 'transparent' : getContextColor(),
        color: scopeInfo.isGlobal ? getContextColor() : 'white',
        borderColor: getContextColor(),
        fontWeight: 500,
        ...sx,
      }}
    />
  );
};
