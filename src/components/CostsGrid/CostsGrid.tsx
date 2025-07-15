import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from "react";
import {
  ReactGrid,
  Column,
  Row,
  HeaderCell,
  TextCell,
  NumberCell,
  DropdownCell,
  DateCell,
} from "@silevis/reactgrid";
import "./CostsGrid.scss";
import { Box, Typography, Alert, Snackbar, Button, Stack } from "@mui/material";
import { Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material";
import {
  useCosts,
  useCreateCost,
  useUpdateCost,
  useDeleteCost,
} from "../../hooks/useLocalData";
import { Cost, CostType } from "../../db/schema";
import { format, parseISO } from "date-fns";

/**
 * Props for the CostsGrid component
 */
interface CostsGridProps {
  /** Grant ID to filter costs by */
  grantId: string;
  /** Organisation ID to filter costs by */
  organisationId: string;
  /** Whether to show the component wrapped in a card (default: true) */
  showCard?: boolean;
  /** Title to display above the grid (default: "Grant Costs") */
  title?: string;
}

/**
 * Interface for pending changes to cost fields
 */
interface PendingCostChanges {
  type?: CostType;
  name?: string;
  description?: string;
  amount?: number; // in pence
  invoiceDate?: string;
}

// Cost type options for dropdown
const COST_TYPE_OPTIONS = [
  { label: "Materials", value: "Materials" },
  { label: "Subcontractors", value: "Subcontractors" },
  { label: "Travel", value: "Travel" },
  { label: "Overheads", value: "Overheads" },
  { label: "Capital", value: "Capital" },
];

// Helper function to format amount from pence to pounds
const formatAmountToPounds = (pence: number): number => {
  return pence / 100;
};

// Helper function to convert pounds to pence
const formatAmountToPence = (pounds: number): number => {
  return Math.round(pounds * 100);
};

/**
 * CostsGrid component for managing non-staff costs in grants
 *
 * Provides a ReactGrid-based interface for adding, editing, and deleting cost entries.
 * Includes validation, auto-save functionality, and real-time updates.
 *
 * @param props - Component props
 * @returns JSX element containing the costs management grid
 */
export const CostsGrid: React.FC<CostsGridProps> = ({
  grantId,
  organisationId,
  showCard = true,
  title = "Grant Costs",
}) => {
  const [error, setError] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState<
    Map<string, PendingCostChanges>
  >(new Map());
  const [openDropdowns, setOpenDropdowns] = useState<Set<string>>(new Set());
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Data hooks
  const {
    data: costs = [],
    isLoading,
    error: costsError,
    refetch,
  } = useCosts(grantId, organisationId);
  const createCostMutation = useCreateCost();
  const updateCostMutation = useUpdateCost();
  const deleteCostMutation = useDeleteCost();

  // Auto-save effect with proper debouncing
  useEffect(() => {
    if (pendingChanges.size === 0) return;

    // Clear any existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout for auto-save
    autoSaveTimeoutRef.current = setTimeout(async () => {
      console.log("Auto-saving pending changes:", pendingChanges);

      try {
        // Process all pending changes
        for (const [costId, changes] of Array.from(pendingChanges.entries())) {
          console.log(`Updating cost ${costId} with changes:`, changes);
          await updateCostMutation.mutateAsync({
            costId,
            ...(changes.type !== undefined && {
              type: changes.type as CostType,
            }),
            ...(changes.name !== undefined && { name: changes.name as string }),
            ...(changes.description !== undefined && {
              description: changes.description as string,
            }),
            ...(changes.amount !== undefined && {
              amount: changes.amount as number,
            }),
            ...(changes.invoiceDate !== undefined && {
              invoiceDate: changes.invoiceDate as string,
            }),
          });
          console.log(`Successfully updated cost ${costId}`);
        }

        // Clear pending changes and refresh data
        setPendingChanges(new Map());
        await refetch();
        console.log("Auto-save completed, data refreshed");
      } catch (err) {
        console.error("Auto-save failed:", err);
        setError(
          `Failed to save changes: ${
            err instanceof Error ? err.message : "Unknown error"
          }`
        );
      }
    }, 1000);

    // Cleanup function
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [pendingChanges, updateCostMutation, refetch]);

  // Handle errors
  useEffect(() => {
    if (costsError) {
      setError(`Failed to load costs: ${costsError.message}`);
    }
  }, [costsError]);

  // Clear error handler
  const handleCloseError = () => {
    setError(null);
  };

  // Add new cost row
  const handleAddCost = useCallback(async () => {
    try {
      // Validate required fields
      if (!grantId || !organisationId) {
        setError("Grant ID and Organisation ID are required to add costs");
        return;
      }

      await createCostMutation.mutateAsync({
        grantId,
        organisationId,
        type: "Materials", // Default type
        name: "New Cost Item", // Default name to avoid validation error
        description: "",
        amount: 0, // 0 pence
        invoiceDate: new Date().toISOString().split("T")[0],
      });
      refetch();
    } catch (err) {
      setError(
        `Failed to add cost: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    }
  }, [grantId, organisationId, createCostMutation, refetch]);

  // Delete cost
  const handleDeleteCost = useCallback(
    async (costId: string) => {
      try {
        await deleteCostMutation.mutateAsync(costId);
        refetch();
      } catch (err) {
        setError(
          `Failed to delete cost: ${
            err instanceof Error ? err.message : "Unknown error"
          }`
        );
      }
    },
    [deleteCostMutation, refetch]
  );

  // Validation functions
  const validateCostField = (fieldName: string, value: any): string | null => {
    switch (fieldName) {
      case "name":
        if (!value || value.trim().length === 0) {
          return "Cost name is required";
        }
        if (value.trim().length > 100) {
          return "Cost name must be 100 characters or less";
        }
        break;
      case "description":
        if (value && value.length > 500) {
          return "Description must be 500 characters or less";
        }
        break;
      case "amount":
        if (value < 0) {
          return "Amount cannot be negative";
        }
        if (value > 1000000) {
          return "Amount cannot exceed £1,000,000";
        }
        break;
      case "invoiceDate":
        let date: Date;

        // Handle different date input formats
        if (value instanceof Date) {
          date = value;
        } else if (typeof value === "string") {
          // Try parsing ISO format first (YYYY-MM-DD)
          if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            date = new Date(value + "T00:00:00");
          } else {
            // Try parsing other common formats
            date = new Date(value);
          }
        } else {
          date = new Date(value);
        }

        if (isNaN(date.getTime())) {
          return "Invalid date format. Please use YYYY-MM-DD format (e.g., 2024-01-15)";
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time for accurate comparison

        const maxFutureDate = new Date();
        maxFutureDate.setFullYear(today.getFullYear() + 1);
        maxFutureDate.setHours(23, 59, 59, 999);

        if (date > maxFutureDate) {
          return "Invoice date cannot be more than 1 year in the future";
        }

        // Allow dates up to 10 years in the past for historical invoices
        const minPastDate = new Date();
        minPastDate.setFullYear(today.getFullYear() - 10);
        minPastDate.setHours(0, 0, 0, 0);

        if (date < minPastDate) {
          return "Invoice date cannot be more than 10 years in the past";
        }
        break;
      case "type":
        if (
          !value ||
          !COST_TYPE_OPTIONS.some((option) => option.value === value)
        ) {
          return "Please select a valid cost type";
        }
        break;
    }
    return null;
  };

  // Handle cell changes
  const handleChanges = useCallback(
    async (changes: any[]) => {
      const newPendingChanges = new Map(pendingChanges);
      let hasValidationErrors = false;

      for (const change of changes) {
        const rowId = change.rowId;
        const cost = costs.find((c) => c.PK === rowId);
        if (!cost) continue;

        const fieldName = change.columnId;
        let newValue = change.newCell.value;

        // Handle different field types
        if (fieldName === "amount") {
          // Validate amount before conversion
          const validationError = validateCostField(fieldName, newValue);
          if (validationError) {
            setError(validationError);
            hasValidationErrors = true;
            continue;
          }
          // Convert pounds to pence
          newValue = formatAmountToPence(newValue);
        } else if (fieldName === "invoiceDate") {
          // Handle date conversion properly
          let dateValue: string;

          if (newValue instanceof Date) {
            // Convert Date object to ISO string format
            dateValue = newValue.toISOString().split("T")[0];
          } else if (typeof newValue === "string") {
            // Clean up string input and ensure proper format
            dateValue = newValue.trim();

            // If it's a partial date, try to parse it
            if (
              dateValue &&
              !dateValue.includes("-") &&
              dateValue.length >= 6
            ) {
              // Handle formats like "20240115" -> "2024-01-15"
              if (dateValue.length === 8) {
                dateValue = `${dateValue.slice(0, 4)}-${dateValue.slice(
                  4,
                  6
                )}-${dateValue.slice(6, 8)}`;
              }
            }
          } else {
            dateValue = String(newValue);
          }

          // Validate date
          const validationError = validateCostField(fieldName, dateValue);
          if (validationError) {
            setError(validationError);
            hasValidationErrors = true;
            continue;
          }

          newValue = dateValue;
        } else if (fieldName === "type") {
          // Handle dropdown selection and state management
          const dropdownCell = change.newCell as DropdownCell;

          // Handle dropdown open/close state
          if (dropdownCell.isOpen !== change.previousCell?.isOpen) {
            const newOpenDropdowns = new Set(openDropdowns);
            if (dropdownCell.isOpen) {
              newOpenDropdowns.add(rowId);
            } else {
              newOpenDropdowns.delete(rowId);
            }
            setOpenDropdowns(newOpenDropdowns);
          }

          // Handle dropdown value selection
          if (
            dropdownCell.selectedValue !== change.previousCell?.selectedValue
          ) {
            newValue = dropdownCell.selectedValue;
            const validationError = validateCostField(fieldName, newValue);
            if (validationError) {
              setError(validationError);
              hasValidationErrors = true;
              continue;
            }
          } else {
            // If only dropdown state changed (not value), skip saving
            continue;
          }
        } else {
          // Validate text fields
          const validationError = validateCostField(fieldName, newValue);
          if (validationError) {
            setError(validationError);
            hasValidationErrors = true;
            continue;
          }
        }

        // Store pending change
        const existingChanges = newPendingChanges.get(rowId) || {};
        newPendingChanges.set(rowId, {
          ...existingChanges,
          [fieldName]: newValue,
        });
      }

      // Don't proceed with save if there are validation errors
      if (hasValidationErrors) {
        return;
      }

      // Update pending changes - auto-save will be triggered by useEffect
      setPendingChanges(newPendingChanges);
    },
    [costs, pendingChanges]
  );

  // Handle cell clicks (for delete action)
  const handleCellClick = useCallback(
    (rowId: string | number, columnId: string) => {
      const rowIdStr = String(rowId);
      if (columnId === "actions" && rowIdStr !== "header") {
        handleDeleteCost(rowIdStr);
      }
    },
    [handleDeleteCost]
  );

  // Generate grid data
  const { rows, columns } = useMemo(() => {
    const headerRow: Row = {
      rowId: "header",
      cells: [
        { type: "header", text: "Type" } as HeaderCell,
        { type: "header", text: "Name" } as HeaderCell,
        { type: "header", text: "Description" } as HeaderCell,
        { type: "header", text: "Amount (£)" } as HeaderCell,
        { type: "header", text: "Invoice Date" } as HeaderCell,
        { type: "header", text: "Actions" } as HeaderCell,
      ],
    };

    const dataRows: Row[] = costs.map((cost) => {
      const pendingChange = pendingChanges.get(cost.PK);

      // Apply pending changes with proper field mapping
      const displayCost = {
        ...cost,
        ...(pendingChange?.type && { Type: pendingChange.type }),
        ...(pendingChange?.name !== undefined && { Name: pendingChange.name }),
        ...(pendingChange?.description !== undefined && {
          Description: pendingChange.description,
        }),
        ...(pendingChange?.amount !== undefined && {
          Amount: pendingChange.amount,
        }),
        ...(pendingChange?.invoiceDate && {
          InvoiceDate: pendingChange.invoiceDate,
        }),
      };

      const isDropdownOpen = openDropdowns.has(cost.PK);

      return {
        rowId: cost.PK,
        cells: [
          {
            type: "dropdown",
            selectedValue: displayCost.Type || "",
            values: COST_TYPE_OPTIONS,
            isOpen: isDropdownOpen,
            isDisabled: false,
            inputValue: "", // Required for ReactGrid dropdown functionality
            className: "dropdown-cell editable-cell",
          } as DropdownCell,
          {
            type: "text",
            text: displayCost.Name || "",
            className: "editable-cell",
          } as TextCell,
          {
            type: "text",
            text: displayCost.Description || "",
            className: "editable-cell",
          } as TextCell,
          {
            type: "number",
            value: formatAmountToPounds(displayCost.Amount),
            className: "currency-cell editable-cell",
          } as NumberCell,
          {
            type: "date",
            date: displayCost.InvoiceDate
              ? new Date(displayCost.InvoiceDate)
              : new Date(),
            className: "date-cell editable-cell",
          } as DateCell,
          {
            type: "text",
            text: "Delete",
            className: "action-cell",
          } as TextCell,
        ],
      };
    });

    const allRows = [headerRow, ...dataRows];

    const allColumns: Column[] = [
      { columnId: "type", width: 140 },
      { columnId: "name", width: 180 },
      { columnId: "description", width: 250 },
      { columnId: "amount", width: 120 },
      { columnId: "invoiceDate", width: 140 },
      { columnId: "actions", width: 80 },
    ];

    return { rows: allRows, columns: allColumns };
  }, [costs, pendingChanges, openDropdowns]);

  if (isLoading) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography>Loading costs...</Typography>
      </Box>
    );
  }

  const content = (
    <div className="costs-grid-container">
      {/* Header with Add button */}
      <div className="costs-grid-header">
        <Typography variant="h6">{title}</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddCost}
          disabled={createCostMutation.isPending}
          sx={{
            backgroundColor: "#1976d2",
            "&:hover": {
              backgroundColor: "#1565c0",
            },
          }}
        >
          Add Cost
        </Button>
      </div>

      {/* Grid */}
      <div className="costs-grid-wrapper">
        <ReactGrid
          rows={rows}
          columns={columns}
          onCellsChanged={handleChanges}
          onFocusLocationChanged={(location) => {
            if (
              location.columnId === "actions" &&
              location.rowId !== "header"
            ) {
              handleCellClick(location.rowId, location.columnId);
            }
          }}
          enableRangeSelection
          enableRowSelection
          enableFillHandle
        />
      </div>

      {/* Error Snackbar */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={handleCloseError}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseError}
          severity="error"
          sx={{ width: "100%" }}
        >
          {error}
        </Alert>
      </Snackbar>
    </div>
  );

  if (!showCard) {
    return content;
  }

  return (
    <Box
      sx={{
        p: 3,
        border: 1,
        borderColor: "#e0e0e0",
        borderRadius: 2,
        backgroundColor: "#fafafa",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      }}
    >
      {content}
    </Box>
  );
};
