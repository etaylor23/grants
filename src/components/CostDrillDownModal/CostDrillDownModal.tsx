import React, { useMemo } from 'react';
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
  Chip,
  Divider,
} from '@mui/material';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
} from '@tanstack/react-table';
import { format, parseISO, isWithinInterval } from 'date-fns';
import { formatCurrency, calculateHourlyRate } from '../../utils/grantCalculations';

interface TimeAllocationDetail {
  individualName: string;
  userId: string;
  date: string;
  hoursAllocated: number;
  hourlyRate: number;
  calculatedValue: number;
  allocationPercentage: number;
}

interface CostDrillDownModalProps {
  open: boolean;
  onClose: () => void;
  grantTitle: string;
  costType: string;
  periodLabel: string;
  periodStart: Date;
  periodEnd: Date;
  timeSlots: Array<{
    userId: string;
    date: string;
    grantId: string;
    hoursAllocated: number;
  }>;
  individuals: Array<{
    PK: string;
    FirstName: string;
    LastName: string;
    AnnualGross: number;
  }>;
  grantId: string;
}

export const CostDrillDownModal: React.FC<CostDrillDownModalProps> = ({
  open,
  onClose,
  grantTitle,
  costType,
  periodLabel,
  periodStart,
  periodEnd,
  timeSlots,
  individuals,
  grantId,
}) => {
  // Filter and transform data for the modal
  const drillDownData = useMemo<TimeAllocationDetail[]>(() => {
    // Filter time slots for this grant and period
    const relevantSlots = timeSlots.filter(slot => 
      slot.grantId === grantId && 
      isWithinInterval(parseISO(slot.date), { start: periodStart, end: periodEnd })
    );

    // Transform to detailed allocation data
    return relevantSlots.map(slot => {
      const individual = individuals.find(ind => ind.PK === slot.userId);
      const hourlyRate = individual ? calculateHourlyRate(individual.AnnualGross) : 0;
      const calculatedValue = slot.hoursAllocated * hourlyRate;
      
      return {
        individualName: individual ? `${individual.FirstName} ${individual.LastName}` : 'Unknown',
        userId: slot.userId,
        date: slot.date,
        hoursAllocated: slot.hoursAllocated,
        hourlyRate,
        calculatedValue,
        allocationPercentage: 0, // Will be calculated below
      };
    });
  }, [timeSlots, individuals, grantId, periodStart, periodEnd]);

  // Calculate summary totals
  const summaryTotals = useMemo(() => {
    const totalHours = drillDownData.reduce((sum, item) => sum + item.hoursAllocated, 0);
    const totalValue = drillDownData.reduce((sum, item) => sum + item.calculatedValue, 0);
    const averageAllocation = drillDownData.length > 0 
      ? drillDownData.reduce((sum, item) => sum + item.allocationPercentage, 0) / drillDownData.length 
      : 0;

    return { totalHours, totalValue, averageAllocation };
  }, [drillDownData]);

  // Define table columns
  const columns = useMemo<ColumnDef<TimeAllocationDetail, any>[]>(() => [
    {
      accessorKey: 'individualName',
      header: 'Individual Name',
      cell: (info) => (
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {info.getValue() as string}
        </Typography>
      ),
    },
    {
      accessorKey: 'date',
      header: 'Date',
      cell: (info) => (
        <Typography variant="body2">
          {format(parseISO(info.getValue() as string), 'MMM dd, yyyy')}
        </Typography>
      ),
    },
    {
      accessorKey: 'hoursAllocated',
      header: 'Hours Allocated',
      cell: (info) => (
        <Typography variant="body2">
          {(info.getValue() as number).toFixed(2)}h
        </Typography>
      ),
    },
    {
      accessorKey: 'hourlyRate',
      header: 'Hourly Rate',
      cell: (info) => (
        <Typography variant="body2">
          {formatCurrency(info.getValue() as number)}
        </Typography>
      ),
    },
    {
      accessorKey: 'calculatedValue',
      header: 'Calculated Value',
      cell: (info) => (
        <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
          {formatCurrency(info.getValue() as number)}
        </Typography>
      ),
    },
  ], []);

  // Create table instance
  const table = useReactTable({
    data: drillDownData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { minHeight: '60vh' }
      }}
    >
      <DialogTitle>
        <Box>
          <Typography variant="h6" component="div">
            {costType} Cost Breakdown
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {grantTitle} • {periodLabel}
          </Typography>
          <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip 
              label={`${drillDownData.length} allocation${drillDownData.length !== 1 ? 's' : ''}`}
              size="small"
              variant="outlined"
            />
            <Chip 
              label={`${format(periodStart, 'MMM dd')} - ${format(periodEnd, 'MMM dd, yyyy')}`}
              size="small"
              variant="outlined"
            />
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        {drillDownData.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              No time allocations found for this period and cost type.
            </Typography>
          </Box>
        ) : (
          <>
            {/* Data Table */}
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableCell key={header.id} sx={{ fontWeight: 600 }}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableHead>
                <TableBody>
                  {table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} hover>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Summary Totals */}
            <Box sx={{ mt: 3 }}>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Summary Totals
              </Typography>
              <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Hours
                  </Typography>
                  <Typography variant="h6">
                    {summaryTotals.totalHours.toFixed(2)}h
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Value
                  </Typography>
                  <Typography variant="h6" color="primary.main">
                    {formatCurrency(summaryTotals.totalValue)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Number of Allocations
                  </Typography>
                  <Typography variant="h6">
                    {drillDownData.length}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};
