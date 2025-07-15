import React, { useMemo } from "react";
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
} from "@mui/material";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
} from "@tanstack/react-table";
import { format, parseISO, isWithinInterval } from "date-fns";
import {
  formatCurrency,
  calculateHourlyRate,
} from "../../utils/grantCalculations";

interface TimeAllocationDetail {
  individualName: string;
  userId: string;
  date: string;
  hoursAllocated: number;
  hourlyRate: number;
  calculatedValue: number;
  allocationPercentage: number;
}

interface CostDetail {
  id: string;
  name: string;
  description?: string;
  date: string;
  amount: number;
  type: "staff" | "cost";
  hours?: number;
  hourlyRate?: number;
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
  costs: Array<{
    PK: string;
    GrantID: string;
    Type: string;
    Name: string;
    Description: string;
    Amount: number; // in pence
    InvoiceDate: string;
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
  costs,
  grantId,
}) => {
  // Filter and transform data for the modal
  const drillDownData = useMemo<CostDetail[]>(() => {
    if (costType === "Staff") {
      // Handle staff costs - filter time slots for this grant and period
      const relevantSlots = timeSlots.filter((slot) => {
        // Ensure slot.date is a string before parsing
        const dateStr =
          typeof slot.date === "string" ? slot.date : String(slot.date);
        return (
          slot.grantId === grantId &&
          isWithinInterval(parseISO(dateStr), {
            start: periodStart,
            end: periodEnd,
          })
        );
      });

      // Transform to detailed allocation data
      return relevantSlots.map((slot) => {
        const individual = individuals.find((ind) => ind.PK === slot.userId);
        const hourlyRate = individual
          ? calculateHourlyRate(individual.AnnualGross)
          : 0;
        const calculatedValue = slot.hoursAllocated * hourlyRate;

        return {
          id: `${slot.userId}-${slot.date}`,
          name: individual
            ? `${individual.FirstName} ${individual.LastName}`
            : "Unknown",
          date: slot.date,
          amount: calculatedValue,
          type: "staff" as const,
          hours: slot.hoursAllocated,
          hourlyRate,
        };
      });
    } else {
      // Handle non-staff costs - filter costs for this grant, cost type, and period
      const relevantCosts = costs.filter((cost) => {
        // Ensure cost.InvoiceDate is a string before parsing
        const invoiceDateStr =
          typeof cost.InvoiceDate === "string"
            ? cost.InvoiceDate
            : String(cost.InvoiceDate);
        return (
          cost.GrantID === grantId &&
          cost.Type === costType &&
          isWithinInterval(parseISO(invoiceDateStr), {
            start: periodStart,
            end: periodEnd,
          })
        );
      });

      return relevantCosts.map((cost) => ({
        id: cost.PK,
        name: cost.Name,
        description: cost.Description,
        date: cost.InvoiceDate,
        amount: cost.Amount / 100, // Convert from pence to pounds
        type: "cost" as const,
      }));
    }
  }, [
    timeSlots,
    individuals,
    costs,
    costType,
    grantId,
    periodStart,
    periodEnd,
  ]);

  // Calculate summary totals
  const summaryTotals = useMemo(() => {
    const totalHours = drillDownData.reduce(
      (sum, item) => sum + (item.hours || 0),
      0
    );
    const totalValue = drillDownData.reduce(
      (sum, item) => sum + item.amount,
      0
    );

    return { totalHours, totalValue };
  }, [drillDownData]);

  // Define table columns based on cost type
  const columns = useMemo<ColumnDef<CostDetail, any>[]>(() => {
    const baseColumns: ColumnDef<CostDetail, any>[] = [
      {
        accessorKey: "name",
        header: costType === "Staff" ? "Individual Name" : "Cost Name",
        cell: (info: any) => (
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {info.getValue() as string}
          </Typography>
        ),
      },
      {
        accessorKey: "date",
        header: costType === "Staff" ? "Date" : "Invoice Date",
        cell: (info: any) => {
          const dateValue = info.getValue() as string;
          const dateStr =
            typeof dateValue === "string" ? dateValue : String(dateValue);
          return (
            <Typography variant="body2">
              {format(parseISO(dateStr), "MMM dd, yyyy")}
            </Typography>
          );
        },
      },
    ];

    // Add cost-type specific columns
    if (costType === "Staff") {
      baseColumns.push(
        {
          accessorKey: "hours",
          header: "Hours Allocated",
          cell: (info: any) => (
            <Typography variant="body2">
              {(info.getValue() as number).toFixed(2)}h
            </Typography>
          ),
        },
        {
          accessorKey: "hourlyRate",
          header: "Hourly Rate",
          cell: (info: any) => (
            <Typography variant="body2">
              {formatCurrency(info.getValue() as number)}
            </Typography>
          ),
        }
      );
    } else {
      baseColumns.push({
        accessorKey: "description",
        header: "Description",
        cell: (info: any) => (
          <Typography variant="body2">{info.getValue() as string}</Typography>
        ),
      });
    }

    // Add amount column
    baseColumns.push({
      accessorKey: "amount",
      header: "Amount",
      cell: (info: any) => (
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {formatCurrency(info.getValue() as number)}
        </Typography>
      ),
    });

    return baseColumns;
  }, [costType]);

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
        sx: { minHeight: "60vh" },
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
          <Box sx={{ mt: 1, display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Chip
              label={`${drillDownData.length} allocation${
                drillDownData.length !== 1 ? "s" : ""
              }`}
              size="small"
              variant="outlined"
            />
            <Chip
              label={`${format(periodStart, "MMM dd")} - ${format(
                periodEnd,
                "MMM dd, yyyy"
              )}`}
              size="small"
              variant="outlined"
            />
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        {drillDownData.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              {costType === "Staff"
                ? "No time allocations found for this period and cost type."
                : "No cost entries found for this period and cost type."}
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
              <Box sx={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {costType === "Staff" && (
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Total Hours
                    </Typography>
                    <Typography variant="h6">
                      {summaryTotals.totalHours.toFixed(2)}h
                    </Typography>
                  </Box>
                )}
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
                    {costType === "Staff"
                      ? "Number of Allocations"
                      : "Number of Cost Items"}
                  </Typography>
                  <Typography variant="h6">{drillDownData.length}</Typography>
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
