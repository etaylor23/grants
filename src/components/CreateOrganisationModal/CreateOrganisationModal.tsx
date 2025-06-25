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
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useCreateOrganisation } from '../../hooks/useLocalData';

interface CreateOrganisationModalProps {
  open: boolean;
  onClose: () => void;
  onOrganisationCreated?: (organisationId: string) => void;
}

interface OrganisationFormData {
  name: string;
  companyNumber: string;
}

const initialFormData: OrganisationFormData = {
  name: '',
  companyNumber: '',
};

export const CreateOrganisationModal: React.FC<CreateOrganisationModalProps> = ({
  open,
  onClose,
  onOrganisationCreated,
}) => {
  const [formData, setFormData] = useState<OrganisationFormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<OrganisationFormData>>({});
  const createOrganisationMutation = useCreateOrganisation();

  const handleInputChange = (field: keyof OrganisationFormData) => (
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
    const newErrors: Partial<OrganisationFormData> = {};

    // Required fields
    if (!formData.name.trim()) {
      newErrors.name = 'Organisation name is required';
    }
    if (!formData.companyNumber.trim()) {
      newErrors.companyNumber = 'Company number is required';
    }

    // Company number format validation (basic UK format)
    if (formData.companyNumber.trim() && !/^\d{8}$/.test(formData.companyNumber.trim())) {
      newErrors.companyNumber = 'Company number must be 8 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const organisationData = {
        name: formData.name.trim(),
        companyNumber: formData.companyNumber.trim(),
      };

      const organisationId = await createOrganisationMutation.mutateAsync(organisationData);
      
      // Reset form
      setFormData(initialFormData);
      setErrors({});
      
      // Notify parent component
      onOrganisationCreated?.(organisationId);
      
      // Close modal
      onClose();
    } catch (error) {
      console.error('Failed to create organisation:', error);
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
          Create New Organisation
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
            Enter the details for the new organisation. All fields are required.
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Organisation Name"
                value={formData.name}
                onChange={handleInputChange('name')}
                error={!!errors.name}
                helperText={errors.name}
                variant="outlined"
                placeholder="e.g., Optimal Compliance Ltd"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Company Number"
                value={formData.companyNumber}
                onChange={handleInputChange('companyNumber')}
                error={!!errors.companyNumber}
                helperText={errors.companyNumber || 'UK Companies House number (8 digits)'}
                variant="outlined"
                placeholder="e.g., 12345678"
                inputProps={{
                  maxLength: 8,
                  pattern: '[0-9]*',
                }}
              />
            </Grid>
          </Grid>

          {createOrganisationMutation.isError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Failed to create organisation. Please try again.
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
          disabled={createOrganisationMutation.isPending}
        >
          {createOrganisationMutation.isPending ? 'Creating...' : 'Create Organisation'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
