import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Chip,
} from '@mui/material';
import {
  Warning as WarningIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';

interface ImpactAnalysisData {
  grantId: string;
  grantTitle: string;
  originalStartDate: string;
  originalEndDate: string;
  newStartDate: string;
  newEndDate: string;
  affectedTimeSlots: Array<{
    date: string;
    userId: string;
    userName: string;
    hours: number;
    financialValue: number;
  }>;
  totalHoursLost: number;
  totalFinancialValueLost: number;
  affectedIndividuals: string[];
}

interface ImpactAnalysisModalProps {
  open: boolean;
  onClose: () => void;
  impactData: ImpactAnalysisData | null;
  onProceedWithDeletion: () => void;
  onAdjustDates: () => void;
}

export const ImpactAnalysisModal: React.FC<ImpactAnalysisModalProps> = ({
  open,
  onClose,
  impactData,
  onProceedWithDeletion,
  onAdjustDates,
}) => {
  if (!impactData) return null;

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    try {
      return format(parseISO(dateString), 'dd MMM yyyy');
    } catch (error) {
      return dateString;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1,
        backgroundColor: '#fff3cd',
        color: '#856404',
        borderBottom: '1px solid #ffeaa7'
      }}>
        <WarningIcon />
        <Typography variant="h6" component="div">
          Date Change Impact Analysis
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {/* Grant Information */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Grant: {impactData.grantTitle}
          </Typography>
          <Box sx={{ display: 'flex', gap: 4, mb: 2 }}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Current Dates
              </Typography>
              <Typography variant="body1">
                {formatDate(impactData.originalStartDate)} - {formatDate(impactData.originalEndDate)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Proposed Dates
              </Typography>
              <Typography variant="body1">
                {formatDate(impactData.newStartDate)} - {formatDate(impactData.newEndDate)}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Impact Summary */}
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
            Impact Summary
          </Typography>
          <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Time Slots Affected
              </Typography>
              <Typography variant="h6" color="warning.main">
                {impactData.affectedTimeSlots.length}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Total Hours Lost
              </Typography>
              <Typography variant="h6" color="warning.main">
                {impactData.totalHoursLost.toFixed(1)}h
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Financial Value Lost
              </Typography>
              <Typography variant="h6" color="warning.main">
                {formatCurrency(impactData.totalFinancialValueLost)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Individuals Affected
              </Typography>
              <Typography variant="h6" color="warning.main">
                {impactData.affectedIndividuals.length}
              </Typography>
            </Box>
          </Box>
        </Alert>

        {/* Affected Individuals */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Affected Individuals
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {impactData.affectedIndividuals.map((individual, index) => (
              <Chip
                key={index}
                label={individual}
                color="warning"
                variant="outlined"
              />
            ))}
          </Box>
        </Box>

        {/* Detailed Time Slots */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Affected Time Allocations
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Individual</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Hours</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Financial Value</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {impactData.affectedTimeSlots.map((slot, index) => (
                  <TableRow key={index} hover>
                    <TableCell>{formatDate(slot.date)}</TableCell>
                    <TableCell>{slot.userName}</TableCell>
                    <TableCell>{slot.hours.toFixed(1)}h</TableCell>
                    <TableCell>{formatCurrency(slot.financialValue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        <Alert severity="info">
          <Typography variant="body2">
            <strong>Note:</strong> Proceeding with deletion will permanently remove all time allocations 
            that fall outside the new date range. This action cannot be undone.
          </Typography>
        </Alert>
      </DialogContent>

      <DialogActions sx={{ p: 3, gap: 1 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          startIcon={<CancelIcon />}
        >
          Cancel Changes
        </Button>
        <Button
          onClick={onAdjustDates}
          variant="outlined"
          color="primary"
          startIcon={<EditIcon />}
        >
          Adjust Dates
        </Button>
        <Button
          onClick={onProceedWithDeletion}
          variant="contained"
          color="warning"
          startIcon={<DeleteIcon />}
        >
          Proceed with Deletion
        </Button>
      </DialogActions>
    </Dialog>
  );
};
