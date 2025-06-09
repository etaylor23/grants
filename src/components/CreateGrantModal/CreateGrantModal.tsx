import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  Alert,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useCreateGrant, useIndividuals } from '../../hooks/useLocalData';

interface CreateGrantModalProps {
  open: boolean;
  onClose: () => void;
  onGrantCreated?: (grantId: string) => void;
}

interface GrantFormData {
  title: string;
  startDate: string;
  endDate: string;
  managerUserId: string;
}

const initialFormData: GrantFormData = {
  title: '',
  startDate: '',
  endDate: '',
  managerUserId: '',
};

export const CreateGrantModal: React.FC<CreateGrantModalProps> = ({
  open,
  onClose,
  onGrantCreated,
}) => {
  const [formData, setFormData] = useState<GrantFormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<GrantFormData>>({});
  const createGrantMutation = useCreateGrant();
  const { data: individuals = [] } = useIndividuals();

  const handleInputChange = (field: keyof GrantFormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSelectChange = (field: keyof GrantFormData) => (
    event: any
  ) => {
    const value = event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user makes selection
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<GrantFormData> = {};

    // Required fields
    if (!formData.title.trim()) {
      newErrors.title = 'Grant title is required';
    }
    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }
    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    }
    if (!formData.managerUserId) {
      newErrors.managerUserId = 'Manager is required';
    }

    // Date validation
    if (formData.startDate && formData.endDate) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      
      if (endDate <= startDate) {
        newErrors.endDate = 'End date must be after start date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const grantData = {
        title: formData.title.trim(),
        startDate: formData.startDate,
        endDate: formData.endDate,
        managerUserId: formData.managerUserId,
      };

      const grantId = await createGrantMutation.mutateAsync(grantData);
      
      // Reset form
      setFormData(initialFormData);
      setErrors({});
      
      // Notify parent component
      onGrantCreated?.(grantId);
      
      // Close modal
      onClose();
    } catch (error) {
      console.error('Failed to create grant:', error);
    }
  };

  const handleClose = () => {
    setFormData(initialFormData);
    setErrors({});
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center' }}>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Create New Grant
        </Typography>
        <IconButton
          aria-label="close"
          onClick={handleClose}
          sx={{
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Enter the details for the new grant. All fields are required.
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Grant Title"
                value={formData.title}
                onChange={handleInputChange('title')}
                error={!!errors.title}
                helperText={errors.title}
                variant="outlined"
                placeholder="e.g., Digital Health Innovation Project"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                value={formData.startDate}
                onChange={handleInputChange('startDate')}
                error={!!errors.startDate}
                helperText={errors.startDate}
                variant="outlined"
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="End Date"
                type="date"
                value={formData.endDate}
                onChange={handleInputChange('endDate')}
                error={!!errors.endDate}
                helperText={errors.endDate}
                variant="outlined"
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth error={!!errors.managerUserId}>
                <InputLabel>Grant Manager</InputLabel>
                <Select
                  value={formData.managerUserId}
                  onChange={handleSelectChange('managerUserId')}
                  label="Grant Manager"
                >
                  {individuals.map((individual) => (
                    <MenuItem key={individual.PK} value={individual.PK}>
                      {individual.FirstName} {individual.LastName}
                    </MenuItem>
                  ))}
                </Select>
                {errors.managerUserId && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                    {errors.managerUserId}
                  </Typography>
                )}
              </FormControl>
            </Grid>
          </Grid>

          {createGrantMutation.isError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Failed to create grant. Please try again.
            </Alert>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} variant="outlined">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={createGrantMutation.isPending}
        >
          {createGrantMutation.isPending ? 'Creating...' : 'Create Grant'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
