import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Grid,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Divider,
} from "@mui/material";
import {
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
} from "@mui/icons-material";
import { format, eachDayOfInterval, isWeekend } from "date-fns";
import { useGrants, useTimeSlots, useWorkdayHours, useSaveSlots } from "../../hooks/useLocalData";

interface BulkAllocationModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  initialStartDate?: Date;
  initialEndDate?: Date;
}

interface BulkAllocationData {
  startDate: string;
  endDate: string;
  grantId: string;
  allocationPercent: number;
}

interface DayAllocation {
  date: string;
  availableHours: number;
  currentAllocatedHours: number;
  newAllocationHours: number;
  totalAfterAllocation: number;
  isOverAllocated: boolean;
  isWeekend: boolean;
  isWorkday: boolean;
}

const initialFormData: BulkAllocationData = {
  startDate: '',
  endDate: '',
  grantId: '',
  allocationPercent: 50,
};

export const BulkAllocationModal: React.FC<BulkAllocationModalProps> = ({
  open,
  onClose,
  userId,
  userName,
  initialStartDate,
  initialEndDate,
}) => {
  const [formData, setFormData] = useState<BulkAllocationData>({
    ...initialFormData,
    startDate: initialStartDate ? format(initialStartDate, 'yyyy-MM-dd') : '',
    endDate: initialEndDate ? format(initialEndDate, 'yyyy-MM-dd') : '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);
  const [conflictResolution, setConflictResolution] = useState<'reduce' | 'skip' | 'cancel'>('reduce');

  // Data hooks
  const { data: grants = [] } = useGrants();
  const { data: timeSlots = [] } = useTimeSlots(
    userId,
    formData.startDate,
    formData.endDate
  );
  const { data: workdayHours = {} } = useWorkdayHours(userId, new Date().getFullYear());
  const saveSlotsMutation = useSaveSlots();

  // Filter grants that overlap with the selected date range
  const availableGrants = useMemo(() => {
    if (!formData.startDate || !formData.endDate) return grants;
    
    return grants.filter((grant: any) => {
      const grantStart = grant.StartDate;
      const grantEnd = grant.EndDate;
      const selectionStart = formData.startDate;
      const selectionEnd = formData.endDate;
      
      // Check if grant period overlaps with selection period
      return grantStart <= selectionEnd && grantEnd >= selectionStart;
    });
  }, [grants, formData.startDate, formData.endDate]);

  // Calculate day-by-day allocation preview
  const allocationPreview = useMemo((): DayAllocation[] => {
    if (!formData.startDate || !formData.endDate || !formData.grantId) return [];

    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    return days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const availableHours = workdayHours[dateStr] || 0;
      const isWeekendDay = isWeekend(day);
      const isWorkdaySet = availableHours > 0;
      
      // Calculate current allocations for this day
      const daySlots = timeSlots.filter((slot: any) => slot.Date === dateStr);
      const currentAllocatedHours = daySlots.reduce((sum, slot: any) => sum + (slot.HoursAllocated || 0), 0);
      
      // Calculate new allocation
      const effectiveAvailableHours = isWorkdaySet ? availableHours : (isWeekendDay ? 0 : 8); // Default 8 hours for new workdays
      const newAllocationHours = (effectiveAvailableHours * formData.allocationPercent) / 100;
      const totalAfterAllocation = currentAllocatedHours + newAllocationHours;
      
      return {
        date: dateStr,
        availableHours: effectiveAvailableHours,
        currentAllocatedHours,
        newAllocationHours,
        totalAfterAllocation,
        isOverAllocated: totalAfterAllocation > effectiveAvailableHours,
        isWeekend: isWeekendDay,
        isWorkday: isWorkdaySet || !isWeekendDay, // Will be workday if already set or if not weekend
      };
    }).filter(day => !day.isWeekend); // Only show workdays
  }, [formData, timeSlots, workdayHours]);

  // Validation and conflict analysis
  const validationResult = useMemo(() => {
    const conflicts = allocationPreview.filter(day => day.isOverAllocated);
    const validDays = allocationPreview.filter(day => !day.isOverAllocated);
    const totalHours = allocationPreview.reduce((sum, day) => sum + day.newAllocationHours, 0);
    const totalDays = allocationPreview.length;

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
      validDays,
      totalHours,
      totalDays,
      canProceed: conflicts.length === 0 || conflictResolution !== 'cancel',
    };
  }, [allocationPreview, conflictResolution]);

  const handleInputChange = (field: keyof BulkAllocationData) => (
    event: React.ChangeEvent<HTMLInputElement | { value: unknown }>
  ) => {
    const value = event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }
    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    }
    if (!formData.grantId) {
      newErrors.grantId = 'Grant selection is required';
    }
    if (formData.allocationPercent <= 0 || formData.allocationPercent > 100) {
      newErrors.allocationPercent = 'Allocation must be between 1% and 100%';
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

  const handlePreview = () => {
    if (validateForm()) {
      setShowPreview(true);
    }
  };

  const handleApply = async () => {
    try {
      const selectedGrant = grants.find((g: any) => g.PK === formData.grantId);
      if (!selectedGrant) return;

      // Determine which days to apply based on conflict resolution
      let daysToApply = allocationPreview;
      if (validationResult.hasConflicts) {
        if (conflictResolution === 'skip') {
          daysToApply = validationResult.validDays;
        } else if (conflictResolution === 'reduce') {
          // Reduce allocation to fit available capacity
          daysToApply = allocationPreview.map(day => {
            if (day.isOverAllocated) {
              const maxAllowableHours = day.availableHours - day.currentAllocatedHours;
              return {
                ...day,
                newAllocationHours: Math.max(0, maxAllowableHours),
                totalAfterAllocation: day.currentAllocatedHours + Math.max(0, maxAllowableHours),
                isOverAllocated: false,
              };
            }
            return day;
          });
        }
      }

      // Create operations for bulk allocation
      const operations: Array<{
        type: 'put' | 'delete';
        timeSlot?: any;
        date?: string;
        grantId?: string;
      }> = [];

      daysToApply.forEach(day => {
        if (day.newAllocationHours > 0) {
          operations.push({
            type: 'put',
            timeSlot: {
              UserID: userId,
              Date: day.date,
              GrantID: formData.grantId,
              AllocationPercent: (day.newAllocationHours / day.availableHours) * 100,
              HoursAllocated: day.newAllocationHours,
            }
          });
        }
      });

      if (operations.length > 0) {
        await saveSlotsMutation.mutateAsync({
          userId,
          operations
        });
      }

      onClose();
    } catch (error) {
      console.error('Failed to apply bulk allocation:', error);
    }
  };

  const handleClose = () => {
    setFormData(initialFormData);
    setErrors({});
    setShowPreview(false);
    onClose();
  };

  const selectedGrant = grants.find((g: any) => g.PK === formData.grantId);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        Bulk Time Allocation - {userName}
      </DialogTitle>
      
      <DialogContent>
        {!showPreview ? (
          // Form Step
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Start Date"
                  type="date"
                  value={formData.startDate}
                  onChange={handleInputChange('startDate')}
                  error={!!errors.startDate}
                  helperText={errors.startDate}
                  InputLabelProps={{ shrink: true }}
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
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <FormControl fullWidth error={!!errors.grantId}>
                  <InputLabel>Grant</InputLabel>
                  <Select
                    value={formData.grantId}
                    onChange={(e) => handleInputChange('grantId')(e as any)}
                    label="Grant"
                  >
                    {availableGrants.map((grant: any) => (
                      <MenuItem key={grant.PK} value={grant.PK}>
                        {grant.Title} ({grant.StartDate} to {grant.EndDate})
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.grantId && (
                    <Typography variant="caption" color="error">
                      {errors.grantId}
                    </Typography>
                  )}
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Allocation Percentage"
                  type="number"
                  value={formData.allocationPercent}
                  onChange={handleInputChange('allocationPercent')}
                  error={!!errors.allocationPercent}
                  helperText={errors.allocationPercent || 'Percentage of daily hours to allocate'}
                  inputProps={{ min: 1, max: 100 }}
                  InputProps={{ endAdornment: '%' }}
                />
              </Grid>
            </Grid>

            {availableGrants.length === 0 && formData.startDate && formData.endDate && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                No grants are available for the selected date range. Please choose dates that overlap with existing grant periods.
              </Alert>
            )}
          </Box>
        ) : (
          // Preview Step
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Allocation Preview
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <Chip label={`Grant: ${selectedGrant?.Title}`} color="primary" sx={{ mr: 1 }} />
              <Chip label={`${formData.allocationPercent}% allocation`} color="secondary" sx={{ mr: 1 }} />
              <Chip label={`${validationResult.totalDays} workdays`} />
            </Box>

            {validationResult.hasConflicts && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  <WarningIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Allocation Conflicts Detected
                </Typography>
                <Typography variant="body2">
                  {validationResult.conflicts.length} days would exceed 100% allocation. Choose how to handle conflicts:
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant={conflictResolution === 'reduce' ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => setConflictResolution('reduce')}
                    sx={{ mr: 1 }}
                  >
                    Reduce to Fit
                  </Button>
                  <Button
                    variant={conflictResolution === 'skip' ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => setConflictResolution('skip')}
                    sx={{ mr: 1 }}
                  >
                    Skip Conflicts
                  </Button>
                  <Button
                    variant={conflictResolution === 'cancel' ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => setConflictResolution('cancel')}
                    color="error"
                  >
                    Cancel
                  </Button>
                </Box>
              </Alert>
            )}

            <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell align="right">Available</TableCell>
                    <TableCell align="right">Current</TableCell>
                    <TableCell align="right">New Allocation</TableCell>
                    <TableCell align="right">Total After</TableCell>
                    <TableCell align="center">Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {allocationPreview.map((day) => (
                    <TableRow 
                      key={day.date}
                      sx={{ 
                        backgroundColor: day.isOverAllocated ? '#ffebee' : 'inherit'
                      }}
                    >
                      <TableCell>{format(new Date(day.date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell align="right">{day.availableHours.toFixed(1)}h</TableCell>
                      <TableCell align="right">{day.currentAllocatedHours.toFixed(1)}h</TableCell>
                      <TableCell align="right">{day.newAllocationHours.toFixed(1)}h</TableCell>
                      <TableCell align="right">{day.totalAfterAllocation.toFixed(1)}h</TableCell>
                      <TableCell align="center">
                        {day.isOverAllocated ? (
                          <ErrorIcon color="error" />
                        ) : (
                          <CheckIcon color="success" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        {!showPreview ? (
          <Button 
            onClick={handlePreview} 
            variant="contained"
            disabled={!formData.startDate || !formData.endDate || !formData.grantId}
          >
            Preview Allocation
          </Button>
        ) : (
          <>
            <Button onClick={() => setShowPreview(false)}>Back to Form</Button>
            <Button 
              onClick={handleApply} 
              variant="contained"
              disabled={!validationResult.canProceed || saveSlotsMutation.isPending}
              color={validationResult.hasConflicts ? 'warning' : 'primary'}
            >
              {saveSlotsMutation.isPending ? 'Applying...' : 'Apply Allocation'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};
