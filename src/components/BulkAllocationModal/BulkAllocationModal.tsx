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
  Card,
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
  onAllocationComplete?: () => void;
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
  existingSlots?: Array<{
    grantId: string;
    grantTitle: string;
    hours: number;
  }>;
  overAllocationAmount?: number;
}

interface ConflictResolution {
  date: string;
  grantToReduce: string;
  reductionAmount: number;
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
  onAllocationComplete,
}) => {
  const [formData, setFormData] = useState<BulkAllocationData>({
    ...initialFormData,
    startDate: initialStartDate ? format(initialStartDate, 'yyyy-MM-dd') : '',
    endDate: initialEndDate ? format(initialEndDate, 'yyyy-MM-dd') : '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);
  const [conflictResolution, setConflictResolution] = useState<'reduce' | 'skip' | 'cancel'>('reduce');
  const [showResults, setShowResults] = useState(false);
  const [conflictResolutions, setConflictResolutions] = useState<ConflictResolution[]>([]);
  const [allocationResults, setAllocationResults] = useState<{
    totalDaysProcessed: number;
    totalHoursAllocated: number;
    conflictsResolved: number;
    daysSkipped: number;
    operationsApplied: Array<{
      date: string;
      hours: number;
      action: 'created' | 'updated' | 'reduced';
    }>;
  } | null>(null);

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

      // Get existing slots with grant information
      const existingSlots = daySlots.map((slot: any) => {
        const grant = grants.find((g: any) => g.PK === slot.GrantID);
        return {
          grantId: slot.GrantID,
          grantTitle: grant?.Title || 'Unknown Grant',
          hours: slot.HoursAllocated || 0,
        };
      });

      // Calculate new allocation
      const effectiveAvailableHours = isWorkdaySet ? availableHours : (isWeekendDay ? 0 : 8); // Default 8 hours for new workdays
      const newAllocationHours = (effectiveAvailableHours * formData.allocationPercent) / 100;
      const totalAfterAllocation = currentAllocatedHours + newAllocationHours;
      const overAllocationAmount = Math.max(0, totalAfterAllocation - effectiveAvailableHours);

      return {
        date: dateStr,
        availableHours: effectiveAvailableHours,
        currentAllocatedHours,
        newAllocationHours,
        totalAfterAllocation,
        isOverAllocated: totalAfterAllocation > effectiveAvailableHours,
        isWeekend: isWeekendDay,
        isWorkday: isWorkdaySet || !isWeekendDay, // Will be workday if already set or if not weekend
        existingSlots,
        overAllocationAmount,
      };
    }).filter(day => !day.isWeekend); // Only show workdays
  }, [formData, timeSlots, workdayHours, grants]);

  // Validation and conflict analysis
  const validationResult = useMemo(() => {
    const conflicts = allocationPreview.filter(day => day.isOverAllocated);
    const validDays = allocationPreview.filter(day => !day.isOverAllocated);
    const totalHours = allocationPreview.reduce((sum, day) => sum + day.newAllocationHours, 0);
    const totalDays = allocationPreview.length;

    // Check if all conflicts have resolutions when "reduce" is selected
    const allConflictsResolved = conflictResolution !== 'reduce' ||
      conflicts.every(conflict =>
        conflictResolutions.some(resolution => resolution.date === conflict.date)
      );

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
      validDays,
      totalHours,
      totalDays,
      canProceed: (conflicts.length === 0 || conflictResolution !== 'cancel') && allConflictsResolved,
      allConflictsResolved,
    };
  }, [allocationPreview, conflictResolution, conflictResolutions]);

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
      // Initialize conflict resolutions for conflicts
      const conflicts = allocationPreview.filter(day => day.isOverAllocated);
      setConflictResolutions(conflicts.map(conflict => ({
        date: conflict.date,
        grantToReduce: '',
        reductionAmount: conflict.overAllocationAmount || 0,
      })));
    }
  };

  const handleConflictResolutionChange = (date: string, grantToReduce: string) => {
    setConflictResolutions(prev =>
      prev.map(resolution =>
        resolution.date === date
          ? { ...resolution, grantToReduce }
          : resolution
      )
    );
  };

  const handleApply = async () => {
    try {
      const selectedGrant = grants.find((g: any) => g.PK === formData.grantId);
      if (!selectedGrant) return;

      // Track what we're doing for reporting
      const operationsApplied: Array<{
        date: string;
        hours: number;
        action: 'created' | 'updated' | 'reduced';
      }> = [];
      let conflictsResolved = 0;
      let daysSkipped = 0;

      // Determine which days to apply based on conflict resolution
      let daysToApply = allocationPreview;
      if (validationResult.hasConflicts) {
        if (conflictResolution === 'skip') {
          daysToApply = validationResult.validDays;
          daysSkipped = validationResult.conflicts.length;
        } else if (conflictResolution === 'reduce') {
          // Apply user-selected conflict resolutions
          daysToApply = allocationPreview.map(day => {
            if (day.isOverAllocated) {
              const resolution = conflictResolutions.find(r => r.date === day.date);
              if (resolution && resolution.grantToReduce) {
                conflictsResolved++;
                // The new allocation can proceed as planned since we'll reduce an existing grant
                return day;
              } else {
                // No resolution selected, skip this day
                daysSkipped++;
                return {
                  ...day,
                  newAllocationHours: 0,
                  totalAfterAllocation: day.currentAllocatedHours,
                  isOverAllocated: false,
                };
              }
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
        // First, handle conflict resolution by reducing existing grants
        if (day.isOverAllocated && conflictResolution === 'reduce') {
          const resolution = conflictResolutions.find(r => r.date === day.date);
          if (resolution && resolution.grantToReduce) {
            // Find the existing slot to reduce
            const existingSlot = timeSlots.find((slot: any) =>
              slot.Date === day.date && slot.GrantID === resolution.grantToReduce
            );

            if (existingSlot) {
              const currentHours = existingSlot.HoursAllocated || 0;
              const reductionAmount = resolution.reductionAmount;
              const newHours = Math.max(0, currentHours - reductionAmount);

              operationsApplied.push({
                date: day.date,
                hours: -reductionAmount,
                action: 'reduced'
              });

              if (newHours > 0) {
                operations.push({
                  type: 'put',
                  timeSlot: {
                    UserID: userId,
                    Date: day.date,
                    GrantID: resolution.grantToReduce,
                    AllocationPercent: (newHours / day.availableHours) * 100,
                    HoursAllocated: newHours,
                  }
                });
              } else {
                operations.push({
                  type: 'delete',
                  date: day.date,
                  grantId: resolution.grantToReduce,
                });
              }
            }
          }
        }

        // Then, add the new allocation
        if (day.newAllocationHours > 0) {
          // Check if this is an existing slot or new one
          const existingSlot = timeSlots.find((slot: any) =>
            slot.Date === day.date && slot.GrantID === formData.grantId
          );

          const action = existingSlot ? 'updated' : 'created';

          operationsApplied.push({
            date: day.date,
            hours: day.newAllocationHours,
            action
          });

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
        console.log('Applying bulk allocation operations:', operations);
        await saveSlotsMutation.mutateAsync({
          userId,
          operations
        });

        // Calculate results for reporting
        const totalHoursAllocated = operationsApplied.reduce((sum, op) => sum + op.hours, 0);

        setAllocationResults({
          totalDaysProcessed: operationsApplied.length,
          totalHoursAllocated,
          conflictsResolved,
          daysSkipped,
          operationsApplied
        });

        setShowResults(true);
        setShowPreview(false);

        // Notify parent component to refresh data
        onAllocationComplete?.();
      } else {
        console.warn('No operations to apply');
        onClose();
      }
    } catch (error) {
      console.error('Failed to apply bulk allocation:', error);
      // TODO: Show error message to user
    }
  };

  const handleClose = () => {
    setFormData(initialFormData);
    setErrors({});
    setShowPreview(false);
    setShowResults(false);
    setAllocationResults(null);
    onClose();
  };

  const selectedGrant = grants.find((g: any) => g.PK === formData.grantId);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        Bulk Time Allocation - {userName}
      </DialogTitle>
      
      <DialogContent>
        {showResults ? (
          // Results Step
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom color="success.main">
              ✅ Bulk Allocation Applied Successfully!
            </Typography>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6} sm={3}>
                <Card sx={{ p: 2, textAlign: 'center', bgcolor: 'success.50' }}>
                  <Typography variant="h4" color="success.main">
                    {allocationResults?.totalDaysProcessed || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Days Processed
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.50' }}>
                  <Typography variant="h4" color="primary.main">
                    {allocationResults?.totalHoursAllocated.toFixed(1) || 0}h
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Hours Allocated
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.50' }}>
                  <Typography variant="h4" color="warning.main">
                    {allocationResults?.conflictsResolved || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Conflicts Resolved
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card sx={{ p: 2, textAlign: 'center', bgcolor: 'error.50' }}>
                  <Typography variant="h4" color="error.main">
                    {allocationResults?.daysSkipped || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Days Skipped
                  </Typography>
                </Card>
              </Grid>
            </Grid>

            <Typography variant="h6" gutterBottom>
              Detailed Actions Taken
            </Typography>

            <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell align="right">Hours Allocated</TableCell>
                    <TableCell align="center">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {allocationResults?.operationsApplied.map((operation) => (
                    <TableRow key={operation.date}>
                      <TableCell>{format(new Date(operation.date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell align="right">{operation.hours.toFixed(1)}h</TableCell>
                      <TableCell align="center">
                        <Chip
                          label={operation.action}
                          size="small"
                          color={
                            operation.action === 'created' ? 'success' :
                            operation.action === 'updated' ? 'primary' :
                            'warning'
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Grant:</strong> {selectedGrant?.Title}<br/>
                <strong>Allocation:</strong> {formData.allocationPercent}% of daily hours<br/>
                <strong>Period:</strong> {format(new Date(formData.startDate), 'MMM dd')} - {format(new Date(formData.endDate), 'MMM dd, yyyy')}
              </Typography>
            </Alert>
          </Box>
        ) : !showPreview ? (
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
                    onClick={() => {
                      setConflictResolution('reduce');
                      // Initialize conflict resolutions when switching to reduce mode
                      const conflicts = allocationPreview.filter(day => day.isOverAllocated);
                      setConflictResolutions(conflicts.map(conflict => ({
                        date: conflict.date,
                        grantToReduce: '',
                        reductionAmount: conflict.overAllocationAmount || 0,
                      })));
                    }}
                    sx={{ mr: 1 }}
                  >
                    Reduce to Fit
                  </Button>
                  <Button
                    variant={conflictResolution === 'skip' ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => {
                      setConflictResolution('skip');
                      setConflictResolutions([]);
                    }}
                    sx={{ mr: 1 }}
                  >
                    Skip Conflicts
                  </Button>
                  <Button
                    variant={conflictResolution === 'cancel' ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => {
                      setConflictResolution('cancel');
                      setConflictResolutions([]);
                    }}
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
                    {conflictResolution === 'reduce' && (
                      <TableCell align="center">Grant to Reduce</TableCell>
                    )}
                    <TableCell align="center">Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {allocationPreview.map((day) => {
                    const resolution = conflictResolutions.find(r => r.date === day.date);
                    return (
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
                        {conflictResolution === 'reduce' && (
                          <TableCell align="center">
                            {day.isOverAllocated ? (
                              <FormControl size="small" sx={{ minWidth: 120 }}>
                                <Select
                                  value={resolution?.grantToReduce || ''}
                                  onChange={(e) => handleConflictResolutionChange(day.date, e.target.value as string)}
                                  displayEmpty
                                  error={!resolution?.grantToReduce}
                                >
                                  <MenuItem value="" disabled>
                                    Select Grant
                                  </MenuItem>
                                  {day.existingSlots?.map((slot) => (
                                    <MenuItem key={slot.grantId} value={slot.grantId}>
                                      {slot.grantTitle} ({slot.hours.toFixed(1)}h)
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                No conflict
                              </Typography>
                            )}
                          </TableCell>
                        )}
                        <TableCell align="center">
                          {day.isOverAllocated ? (
                            conflictResolution === 'reduce' && resolution?.grantToReduce ? (
                              <CheckIcon color="warning" />
                            ) : (
                              <ErrorIcon color="error" />
                            )
                          ) : (
                            <CheckIcon color="success" />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            {conflictResolution === 'reduce' && !validationResult.allConflictsResolved && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Please select which grants to reduce for all conflicting days before proceeding.
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>
      
      <DialogActions>
        {showResults ? (
          <Button onClick={handleClose} variant="contained" color="primary">
            Done
          </Button>
        ) : (
          <>
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
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};
