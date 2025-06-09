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
  InputAdornment,
  Grid,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useCreateUser } from '../../hooks/useLocalData';

interface CreateUserModalProps {
  open: boolean;
  onClose: () => void;
  onUserCreated?: (userId: string) => void;
}

interface UserFormData {
  firstName: string;
  lastName: string;
  annualGross: string;
  pension: string;
  nationalIns: string;
}

const initialFormData: UserFormData = {
  firstName: '',
  lastName: '',
  annualGross: '',
  pension: '',
  nationalIns: '',
};

export const CreateUserModal: React.FC<CreateUserModalProps> = ({
  open,
  onClose,
  onUserCreated,
}) => {
  const [formData, setFormData] = useState<UserFormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<UserFormData>>({});
  const createUserMutation = useCreateUser();

  const handleInputChange = (field: keyof UserFormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<UserFormData> = {};

    // Required fields
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!formData.annualGross.trim()) {
      newErrors.annualGross = 'Annual gross salary is required';
    }
    if (!formData.pension.trim()) {
      newErrors.pension = 'Pension contribution is required';
    }
    if (!formData.nationalIns.trim()) {
      newErrors.nationalIns = 'National Insurance is required';
    }

    // Numeric validation
    if (formData.annualGross && isNaN(Number(formData.annualGross))) {
      newErrors.annualGross = 'Must be a valid number';
    }
    if (formData.pension && isNaN(Number(formData.pension))) {
      newErrors.pension = 'Must be a valid number';
    }
    if (formData.nationalIns && isNaN(Number(formData.nationalIns))) {
      newErrors.nationalIns = 'Must be a valid number';
    }

    // Range validation
    if (formData.annualGross && Number(formData.annualGross) < 0) {
      newErrors.annualGross = 'Must be a positive number';
    }
    if (formData.pension && Number(formData.pension) < 0) {
      newErrors.pension = 'Must be a positive number';
    }
    if (formData.nationalIns && Number(formData.nationalIns) < 0) {
      newErrors.nationalIns = 'Must be a positive number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const userData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        annualGross: Number(formData.annualGross),
        pension: Number(formData.pension),
        nationalIns: Number(formData.nationalIns),
      };

      const userId = await createUserMutation.mutateAsync(userData);
      
      // Reset form
      setFormData(initialFormData);
      setErrors({});
      
      // Notify parent component
      onUserCreated?.(userId);
      
      // Close modal
      onClose();
    } catch (error) {
      console.error('Failed to create user:', error);
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
          Create New User
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
            Enter the details for the new user. All fields are required.
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="First Name"
                value={formData.firstName}
                onChange={handleInputChange('firstName')}
                error={!!errors.firstName}
                helperText={errors.firstName}
                variant="outlined"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Last Name"
                value={formData.lastName}
                onChange={handleInputChange('lastName')}
                error={!!errors.lastName}
                helperText={errors.lastName}
                variant="outlined"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Annual Gross Salary"
                value={formData.annualGross}
                onChange={handleInputChange('annualGross')}
                error={!!errors.annualGross}
                helperText={errors.annualGross}
                variant="outlined"
                InputProps={{
                  startAdornment: <InputAdornment position="start">£</InputAdornment>,
                }}
                placeholder="48000"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Pension Contribution"
                value={formData.pension}
                onChange={handleInputChange('pension')}
                error={!!errors.pension}
                helperText={errors.pension}
                variant="outlined"
                InputProps={{
                  startAdornment: <InputAdornment position="start">£</InputAdornment>,
                }}
                placeholder="1450"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="National Insurance"
                value={formData.nationalIns}
                onChange={handleInputChange('nationalIns')}
                error={!!errors.nationalIns}
                helperText={errors.nationalIns}
                variant="outlined"
                InputProps={{
                  startAdornment: <InputAdornment position="start">£</InputAdornment>,
                }}
                placeholder="5000"
              />
            </Grid>
          </Grid>

          {createUserMutation.isError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Failed to create user. Please try again.
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
          disabled={createUserMutation.isPending}
        >
          {createUserMutation.isPending ? 'Creating...' : 'Create User'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
