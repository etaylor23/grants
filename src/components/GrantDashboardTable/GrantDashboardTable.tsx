import React, { useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { Grant, Individual, TimeSlot } from "../../db/schema";
import styles from "../../pages/GrantView.module.css";
import { PeriodType, CostTypeRow } from "../../models/grantDashboard";
import {
  calculateCostTypeResults,
  formatCurrency,
} from "../../utils/grantCalculations";
import { GrantCalculationInput } from "../../models/grantDashboard";

interface GrantDashboardTableProps {
  grant: Grant;
  timeSlots: TimeSlot[];
  individuals: Individual[];
  periodType: PeriodType;
}

export const GrantDashboardTable: React.FC<GrantDashboardTableProps> = ({
  grant,
  timeSlots,
  individuals,
  periodType,
}) => {
  // Prepare calculation input
  const calculationInput: GrantCalculationInput = useMemo(() => {
    console.log("GrantDashboardTable - Preparing calculation input:", {
      grantId: grant.PK,
      grantTitle: grant.Title,
      grantStartDate: grant.StartDate,
      grantEndDate: grant.EndDate,
      timeSlotsCount: timeSlots.length,
      individualsCount: individuals.length,
      periodType,
      timeSlotsSample: timeSlots.slice(0, 3).map((slot) => ({
        userId: slot.UserID,
        date: slot.Date,
        grantId: slot.GrantID,
        hoursAllocated: slot.HoursAllocated,
      })),
    });

    return {
      grantId: grant.PK,
      timeSlots: timeSlots.map((slot) => ({
        userId: slot.UserID,
        date: slot.Date,
        grantId: slot.GrantID,
        hoursAllocated: slot.HoursAllocated,
      })),
      individuals: individuals.map((ind) => ({
        PK: ind.PK,
        AnnualGross: ind.AnnualGross,
      })),
      periodType,
      dateRange: {
        startDate: grant.StartDate,
        endDate: grant.EndDate,
      },
    };
  }, [grant, timeSlots, individuals, periodType]);

  // Calculate cost type results
  const costTypeResults = useMemo(() => {
    return calculateCostTypeResults(calculationInput);
  }, [calculationInput]);

  // Transform results into table data
  const tableData: CostTypeRow[] = useMemo(() => {
    return costTypeResults.map((result) => {
      const periodColumns = result.periods.map((period) => ({
        id: period.periodId,
        label: period.periodLabel,
        startDate: period.startDate,
        endDate: period.endDate,
        value: period.totalValue,
      }));

      console.log("TABLE DATA", {
        costType: result.costType,
        totalClaimableAmount: grant.TotalClaimableAmount || 0,
        periodColumns,
        totalForTimePeriod: result.totalValue,
        totalClaimed: result.totalValue, // For now, same as total for time period
      });

      return {
        costType: result.costType,
        totalClaimableAmount: grant.TotalClaimableAmount || 0,
        periodColumns,
        totalForTimePeriod: result.totalValue,
        totalClaimed: result.totalValue, // For now, same as total for time period
      };
    });
  }, [costTypeResults, grant.TotalClaimableAmount]);

  // Get unique periods for dynamic columns
  const periods = useMemo(() => {
    if (tableData.length === 0) return [];
    return tableData[0].periodColumns;
  }, [tableData]);

  // Define columns
  const columns = useMemo<ColumnDef<CostTypeRow, any>[]>(() => {
    const baseColumns: ColumnDef<CostTypeRow, any>[] = [
      {
        accessorKey: "costType",
        header: "Cost Type",
        cell: (info) => (
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {info.getValue()}
          </Typography>
        ),
      },
      {
        accessorKey: "totalClaimableAmount",
        header: "Total Claimable Amount",
        cell: (info) => (
          <Typography variant="body2">
            {formatCurrency(info.getValue() as number)}
          </Typography>
        ),
      },
    ];

    // Add dynamic period columns
    const periodColumns: ColumnDef<CostTypeRow, any>[] = periods.map(
      (period) => ({
        id: period.id,
        header: period.label,
        accessorFn: (row) =>
          row.periodColumns.find((col) => col.id === period.id)?.value || 0,
        cell: (info) => (
          <Typography variant="body2">
            {formatCurrency(info.getValue() as number)}
          </Typography>
        ),
      })
    );
    console.log("periodColumns", periodColumns);

    const endColumns: ColumnDef<CostTypeRow, any>[] = [
      {
        accessorKey: "totalForTimePeriod",
        header: "Total for Time Period",
        cell: (info) => (
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {formatCurrency(info.getValue() as number)}
          </Typography>
        ),
      },
      {
        accessorKey: "totalClaimed",
        header: "Total Claimed",
        cell: (info) => (
          <Typography
            variant="body2"
            sx={{ fontWeight: 600, color: "primary.main" }}
          >
            {formatCurrency(info.getValue() as number)}
          </Typography>
        ),
      },
    ];

    return [...baseColumns, ...periodColumns, ...endColumns];
  }, [periods]);

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div
      className={styles.dashboardTableContainer}
      role="region"
      aria-labelledby="grant-table-heading"
    >
      <div className={styles.dashboardTableHeader}>
        <h2 id="grant-table-heading" className={styles.dashboardTableTitle}>
          Grant Cost Breakdown
        </h2>
        <p className={styles.dashboardTableDescription}>
          Detailed analysis of costs by category and time period
        </p>
      </div>

      <TableContainer>
        <Table
          className={styles.dashboardTable}
          aria-label="Grant cost breakdown by category and time period"
          role="table"
        >
          <TableHead>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} role="row">
                {headerGroup.headers.map((header) => (
                  <TableCell
                    key={header.id}
                    component="th"
                    scope="col"
                    role="columnheader"
                  >
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
              <TableRow key={row.id} role="row">
                {row.getVisibleCells().map((cell, cellIndex) => (
                  <TableCell
                    key={cell.id}
                    role={cellIndex === 0 ? "rowheader" : "cell"}
                    scope={cellIndex === 0 ? "row" : undefined}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
};
