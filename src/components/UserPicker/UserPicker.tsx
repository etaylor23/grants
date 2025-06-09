import React from 'react';
import { Box, Typography } from '@mui/material';

interface UserPickerProps {
  selectedUserId: string | null;
  onUserChange: (userId: string, user: any) => void;
  className?: string;
}

export const UserPicker: React.FC<UserPickerProps> = ({
  selectedUserId,
  onUserChange,
  className
}) => {
  return (
    <Box className={className} sx={{ minWidth: 200 }}>
      <Typography variant="body2" sx={{ color: 'white' }}>
        User Picker (IndexedDB)
      </Typography>
    </Box>
  );
};
