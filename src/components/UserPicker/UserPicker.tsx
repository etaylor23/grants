import React, { useState, useEffect, useMemo } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  CircularProgress,
  Alert,
  SelectChangeEvent,
  Button,
  Divider
} from '@mui/material';
import { Person as PersonIcon, Add as AddIcon } from '@mui/icons-material';
import { useIndividuals, useOrganisations } from '../../hooks/useLocalData';
import { Individual } from '../../db/schema';
import { CreateUserModal } from '../CreateUserModal';

interface UserPickerProps {
  selectedUserId: string | null;
  onUserChange: (userId: string, user: Individual) => void;
  className?: string;
}

export const UserPicker: React.FC<UserPickerProps> = ({
  selectedUserId,
  onUserChange,
  className
}) => {
  const { data: individuals = [], isLoading, error } = useIndividuals();
  const { data: organisations = [] } = useOrganisations();
  const [localSelectedUserId, setLocalSelectedUserId] = useState<string>(selectedUserId || '');
  const [createUserModalOpen, setCreateUserModalOpen] = useState(false);

  // Create organisation lookup
  const organisationsMap = useMemo(() => {
    return organisations.reduce((acc, org) => {
      acc[org.PK] = org;
      return acc;
    }, {} as Record<string, any>);
  }, [organisations]);

  // Update local state when prop changes
  useEffect(() => {
    setLocalSelectedUserId(selectedUserId || '');
  }, [selectedUserId]);

  // Auto-select first user if none selected and users are available
  useEffect(() => {
    if (!selectedUserId && individuals.length > 0) {
      const firstUser = individuals[0];
      setLocalSelectedUserId(firstUser.PK);
      onUserChange(firstUser.PK, firstUser);
    }
  }, [selectedUserId, individuals, onUserChange]);

  const handleChange = (event: SelectChangeEvent<string>) => {
    const userId = event.target.value;

    if (userId === 'CREATE_NEW') {
      setCreateUserModalOpen(true);
      return;
    }

    const user = individuals.find(u => u.PK === userId);

    if (user) {
      setLocalSelectedUserId(userId);
      onUserChange(userId, user);

      // Persist selection in localStorage
      try {
        localStorage.setItem('selectedUserId', userId);
      } catch (error) {
        console.warn('Failed to save user selection to localStorage:', error);
      }
    }
  };

  const handleUserCreated = (userId: string) => {
    // The user will be automatically selected when the individuals query refetches
    setCreateUserModalOpen(false);
  };

  // Load persisted selection on mount
  useEffect(() => {
    if (!selectedUserId && individuals.length > 0) {
      try {
        const savedUserId = localStorage.getItem('selectedUserId');
        if (savedUserId) {
          const savedUser = individuals.find(u => u.PK === savedUserId);
          if (savedUser) {
            setLocalSelectedUserId(savedUserId);
            onUserChange(savedUserId, savedUser);
            return;
          }
        }
      } catch (error) {
        console.warn('Failed to load user selection from localStorage:', error);
      }

      // Fallback to first user
      const firstUser = individuals[0];
      setLocalSelectedUserId(firstUser.PK);
      onUserChange(firstUser.PK, firstUser);
    }
  }, [individuals, selectedUserId, onUserChange]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 200 }}>
        <CircularProgress size={20} />
        <Typography variant="body2" color="text.secondary">
          Loading users...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ minWidth: 200 }}>
        Failed to load users
      </Alert>
    );
  }

  const selectedUser = individuals.find(u => u.PK === localSelectedUserId);

  return (
    <>
      <Box className={className} sx={{ minWidth: 200 }}>
        <FormControl fullWidth size="small">
          <InputLabel id="user-picker-label" sx={{ color: 'white' }}>
            Current User
          </InputLabel>
          <Select
            labelId="user-picker-label"
            value={localSelectedUserId}
            onChange={handleChange}
            label="Current User"
            sx={{
              color: 'white',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(255, 255, 255, 0.23)',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(255, 255, 255, 0.5)',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: 'white',
              },
              '& .MuiSvgIcon-root': {
                color: 'white',
              },
            }}
            MenuProps={{
              PaperProps: {
                sx: {
                  maxHeight: 300,
                  '& .MuiMenuItem-root': {
                    padding: '8px 16px',
                  },
                },
              },
            }}
          >
            {individuals.map((individual) => (
              <MenuItem key={individual.PK} value={individual.PK}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                  <PersonIcon sx={{ color: 'action.active', fontSize: 20 }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {individual.FirstName} {individual.LastName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {individual.PK} • £{individual.AnnualGross.toLocaleString()}/year
                      {individual.OrganisationID && organisationsMap[individual.OrganisationID] && (
                        <> • {organisationsMap[individual.OrganisationID].Name}</>
                      )}
                    </Typography>
                  </Box>
                </Box>
              </MenuItem>
            ))}

            <Divider />

            <MenuItem value="CREATE_NEW">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                <AddIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                <Typography variant="body2" sx={{ fontWeight: 500, color: 'primary.main' }}>
                  Create New User
                </Typography>
              </Box>
            </MenuItem>
          </Select>
        </FormControl>

        {selectedUser && (
          <Typography
            variant="caption"
            sx={{
              color: 'rgba(255, 255, 255, 0.7)',
              display: 'block',
              mt: 0.5,
              textAlign: 'center'
            }}
          >
            {selectedUser.FirstName} {selectedUser.LastName}
          </Typography>
        )}
      </Box>

      <CreateUserModal
        open={createUserModalOpen}
        onClose={() => setCreateUserModalOpen(false)}
        onUserCreated={handleUserCreated}
      />
    </>
  );
};
