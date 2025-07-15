import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Alert,
  Snackbar,
} from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
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
import "@silevis/reactgrid/styles.css";
import { format } from "date-fns";
import {
  useCosts,
  useCreateCost,
  useUpdateCost,
  useDeleteCost,
} from "../../hooks/useLocalData";
import { CostType } from "../../db/schema";
import styles from "./CostsModal.module.css";

// Cost type options for dropdown
const COST_TYPE_OPTIONS = [
  { label: "Materials", value: "Materials" },
  { label: "Subcontractors", value: "Subcontractors" },
  { label: "Travel", value: "Travel" },
  { label: "Overheads", value: "Overheads" },
  { label: "Capital", value: "Capital" },
];

interface CostsModalProps {
  open: boolean;
  onClose: () => void;
  grantId: string;
  organisationId: string;
  grantTitle?: string;
}

interface PendingCostChanges {
  Type?: string;
  Name?: string;
  Description?: string;
  Amount?: number;
  InvoiceDate?: string;
}

export const CostsModal: React.FC<CostsModalProps> = ({
  open,
  onClose,
  grantId,
  organisationId,
  grantTitle,
}) => {
  // State management
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState<
    Map<string, PendingCostChanges>
  >(new Map());
  const [openDropdowns, setOpenDropdowns] = useState<Set<string>>(new Set());
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Data hooks
  const { data: costs = [], refetch } = useCosts(grantId, organisationId);
  const createCostMutation = useCreateCost();
  const updateCostMutation = useUpdateCost();
  const deleteCostMutation = useDeleteCost();

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setError(null);
      setSuccessMessage(null);
      setPendingChanges(new Map());
      setOpenDropdowns(new Set());
    }
  }, [open]);

  // Cleanup auto-save timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  // Format amount from pence to pounds for display
  const formatAmountToPounds = useCallback((amountInPence: number): number => {
    return amountInPence / 100;
  }, []);

  // Format amount from pounds to pence for storage
  const formatAmountToPence = useCallback((amountInPounds: number): number => {
    return Math.round(amountInPounds * 100);
  }, []);

  // Validate cost field
  const validateCostField = useCallback(
    (fieldName: string, value: any): string | null => {
      console.log("🔍 Validating field:", {
        fieldName,
        value,
        valueType: typeof value,
      });

      switch (fieldName) {
        case "type":
          if (!value || value === "") {
            console.log("❌ Type validation failed: empty value");
            return "Type is required";
          }
          if (typeof value === "string" && value.length > 50) {
            console.log("❌ Type validation failed: too long");
            return "Type must be 50 characters or less";
          }
          console.log("✅ Type validation passed");
          return null;

        case "name":
          if (!value || value === "") {
            console.log("❌ Name validation failed: empty value");
            return "Name is required";
          }
          if (typeof value === "string" && value.length > 100) {
            console.log("❌ Name validation failed: too long");
            return "Name must be 100 characters or less";
          }
          console.log("✅ Name validation passed");
          return null;

        case "description":
          // Description is optional
          if (value && typeof value === "string" && value.length > 500) {
            console.log("❌ Description validation failed: too long");
            return "Description must be 500 characters or less";
          }
          console.log("✅ Description validation passed");
          return null;

        case "amount":
          // For amount, we need to handle both number and string inputs
          let numericValue: number;

          if (typeof value === "string") {
            // Try to parse string to number
            const parsed = parseFloat(value.replace(/[£,]/g, ""));
            if (isNaN(parsed)) {
              console.log("❌ Amount validation failed: not a number");
              return "Amount must be a valid number";
            }
            numericValue = parsed;
          } else if (typeof value === "number") {
            numericValue = value;
          } else {
            console.log("❌ Amount validation failed: invalid type");
            return "Amount must be a valid number";
          }

          // Now validate the numeric value
          if (numericValue <= 0) {
            console.log("❌ Amount validation failed: not positive");
            return "Amount must be greater than zero";
          }

          // Check if it's in pence or pounds
          const maxValue = numericValue > 1000 ? 10000000 : 100000; // 10M pence or 100K pounds
          if (numericValue > maxValue) {
            console.log("❌ Amount validation failed: too large");
            return "Amount cannot exceed £100,000";
          }

          console.log("✅ Amount validation passed");
          return null;

        case "invoiceDate":
          if (!value) {
            console.log("❌ Invoice date validation failed: missing");
            return "Invoice date is required";
          }

          let dateValue: Date;

          if (value instanceof Date) {
            dateValue = value;
          } else if (typeof value === "string") {
            dateValue = new Date(value);
            if (isNaN(dateValue.getTime())) {
              console.log(
                "❌ Invoice date validation failed: invalid date string"
              );
              return "Invalid date format";
            }
          } else {
            console.log("❌ Invoice date validation failed: invalid type");
            return "Invalid date format";
          }

          const today = new Date();
          today.setHours(23, 59, 59, 999);
          if (dateValue > today) {
            console.log("❌ Invoice date validation failed: future date");
            return "Invoice date cannot be in the future";
          }

          const tenYearsAgo = new Date();
          tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
          if (dateValue < tenYearsAgo) {
            console.log("❌ Invoice date validation failed: too old");
            return "Invoice date cannot be more than 10 years ago";
          }

          console.log("✅ Invoice date validation passed");
          return null;

        default:
          console.log("⚠️ Unknown field:", fieldName);
          return null;
      }
    },
    []
  );

  // Handle adding new cost
  const handleAddCost = useCallback(async () => {
    try {
      const newCost = {
        grantId,
        organisationId,
        type: "Materials" as CostType,
        name: "New Cost",
        description: "",
        amount: 0,
        invoiceDate: format(new Date(), "yyyy-MM-dd"),
      };

      await createCostMutation.mutateAsync(newCost);
      setSuccessMessage("New cost added successfully");
      refetch();
    } catch (err) {
      console.error("Error adding cost:", err);
      setError(err instanceof Error ? err.message : "Failed to add cost");
    }
  }, [createCostMutation, grantId, organisationId, refetch]);

  // Handle cell changes in ReactGrid
  const handleChanges = useCallback(
    async (changes: any[]) => {
      console.log("🎯 CostsModal handleChanges called with:", changes);

      for (const change of changes) {
        const { rowId, columnId, newCell, previousCell } = change;

        console.log("🔄 Processing change:", {
          rowId,
          columnId,
          newCellType: newCell.type,
          newValue:
            newCell.value ||
            newCell.selectedValue ||
            newCell.text ||
            newCell.date,
          previousValue:
            previousCell?.value ||
            previousCell?.selectedValue ||
            previousCell?.text ||
            previousCell?.date,
        });

        // Find the cost being edited
        const cost = costs.find((c) => c.PK === rowId);
        if (!cost) {
          console.warn("❌ Cost not found for rowId:", rowId);
          continue;
        }

        let newValue: any;
        let fieldKey: keyof PendingCostChanges;

        // Handle different cell types and extract values
        switch (columnId) {
          case "type":
            if (newCell.type === "dropdown") {
              newValue = newCell.selectedValue;
              fieldKey = "Type";

              // Handle dropdown open/close state
              if (newCell.isOpen !== previousCell?.isOpen) {
                setOpenDropdowns((prev) => {
                  const newSet = new Set(prev);
                  if (newCell.isOpen) {
                    newSet.add(rowId);
                    console.log("🔓 Opening dropdown for cost:", rowId);
                  } else {
                    newSet.delete(rowId);
                    console.log("🔒 Closing dropdown for cost:", rowId);
                  }
                  return newSet;
                });
              }

              // Only process value changes, not just open/close
              if (newCell.selectedValue === previousCell?.selectedValue) {
                console.log(
                  "⏭️ Skipping - no value change, just dropdown state"
                );
                continue;
              }
            } else {
              console.warn(
                "❌ Unexpected cell type for type column:",
                newCell.type
              );
              continue;
            }
            break;

          case "name":
            if (newCell.type === "text") {
              newValue = newCell.text;
              fieldKey = "Name";
            } else {
              console.warn(
                "❌ Unexpected cell type for name column:",
                newCell.type
              );
              continue;
            }
            break;

          case "description":
            if (newCell.type === "text") {
              newValue = newCell.text;
              fieldKey = "Description";
            } else {
              console.warn(
                "❌ Unexpected cell type for description column:",
                newCell.type
              );
              continue;
            }
            break;

          case "amount":
            if (newCell.type === "number") {
              newValue = formatAmountToPence(newCell.value || 0);
              fieldKey = "Amount";
            } else {
              console.warn(
                "❌ Unexpected cell type for amount column:",
                newCell.type
              );
              continue;
            }
            break;

          case "invoiceDate":
            if (newCell.type === "date") {
              newValue = format(newCell.date, "yyyy-MM-dd");
              fieldKey = "InvoiceDate";
            } else {
              console.warn(
                "❌ Unexpected cell type for invoiceDate column:",
                newCell.type
              );
              continue;
            }
            break;

          default:
            console.warn("❌ Unknown column:", columnId);
            continue;
        }

        console.log("✅ Extracted value:", {
          fieldKey,
          newValue,
          originalValue: cost[fieldKey],
        });

        // Validate the new value
        const validationError = validateCostField(columnId, newValue);
        if (validationError) {
          console.error("❌ Validation error:", validationError);
          setError(validationError);
          continue;
        }

        console.log("✅ Validation passed for:", { fieldKey, newValue });

        // Update pending changes
        const existingChanges = pendingChanges.get(rowId) || {};
        const updatedChanges = {
          ...existingChanges,
          [fieldKey]: newValue,
        };

        console.log("📝 Updating pending changes:", {
          rowId,
          existingChanges,
          updatedChanges,
        });

        setPendingChanges((prev) => {
          const newMap = new Map(prev);
          newMap.set(rowId, updatedChanges);
          return newMap;
        });

        // Trigger auto-save with debounce
        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current);
          console.log("⏰ Clearing existing auto-save timeout");
        }

        console.log("⏰ Setting auto-save timeout for 1 second");
        autoSaveTimeoutRef.current = setTimeout(async () => {
          console.log("💾 Auto-save triggered for cost:", rowId);
          await saveChanges(new Map([[rowId, updatedChanges]]));
        }, 1000);
      }
    },
    [
      costs,
      pendingChanges,
      validateCostField,
      formatAmountToPence,
      setOpenDropdowns,
    ]
  );

  // Save pending changes to the backend
  const saveChanges = useCallback(
    async (changesToSave: Map<string, PendingCostChanges>) => {
      console.log("💾 saveChanges called with:", changesToSave);

      if (changesToSave.size === 0) {
        console.log("⏭️ No changes to save");
        return;
      }

      const entries = Array.from(changesToSave.entries());
      console.log("📤 Processing", entries.length, "cost updates");

      for (const [costId, changes] of entries) {
        console.log("🔄 Updating cost:", { costId, changes });

        // Find the original cost to merge with changes
        const originalCost = costs.find((c) => c.PK === costId);
        if (!originalCost) {
          console.error("❌ Original cost not found for ID:", costId);
          continue;
        }

        const updateData = {
          costId,
          type: (changes.Type || originalCost.Type) as CostType,
          name: changes.Name !== undefined ? changes.Name : originalCost.Name,
          description:
            changes.Description !== undefined
              ? changes.Description
              : originalCost.Description,
          amount:
            changes.Amount !== undefined ? changes.Amount : originalCost.Amount,
          invoiceDate:
            changes.InvoiceDate !== undefined
              ? changes.InvoiceDate
              : originalCost.InvoiceDate,
        };

        console.log("📝 Sending update data:", updateData);

        try {
          await updateCostMutation.mutateAsync(updateData);
          console.log("✅ Successfully updated cost:", costId);
        } catch (err) {
          console.error("❌ Error updating cost:", costId, err);
          setError(
            err instanceof Error ? err.message : "Failed to update cost"
          );
          return; // Stop processing on error
        }
      }

      console.log("🧹 Clearing pending changes and refetching data");

      // Clear pending changes after successful save
      setPendingChanges(new Map());

      // Refetch to get updated data
      await refetch();

      console.log("✅ Save operation completed successfully");
    },
    [updateCostMutation, refetch, costs]
  );

  // Handle deleting cost
  const handleDeleteCost = useCallback(
    async (costId: string) => {
      if (!window.confirm("Are you sure you want to delete this cost?")) {
        return;
      }

      setError(null);

      try {
        await deleteCostMutation.mutateAsync(costId);
        setSuccessMessage("Cost deleted successfully");
        refetch();
      } catch (err) {
        console.error("Error deleting cost:", err);
        setError(err instanceof Error ? err.message : "Failed to delete cost");
      }
    },
    [deleteCostMutation, refetch]
  );

  // Handle cell click (for actions column)
  const handleCellClick = useCallback(
    (rowId: string | number, columnId: string) => {
      if (columnId === "actions") {
        // Handle delete action
        handleDeleteCost(String(rowId));
      }
    },
    [handleDeleteCost]
  );

  // Close error/success messages
  const handleCloseMessage = useCallback(() => {
    setError(null);
    setSuccessMessage(null);
  }, []);

  // Generate ReactGrid rows and columns
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
      const displayCost = {
        ...cost,
        ...pendingChanges.get(cost.PK),
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
            inputValue: "",
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
  }, [costs, pendingChanges, openDropdowns, formatAmountToPounds]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        className: styles.modalPaper,
      }}
    >
      <DialogTitle className={styles.modalTitle}>
        <Typography variant="h6" component="div">
          Grant Costs Management
        </Typography>
        {grantTitle && (
          <Typography variant="body2" color="text.secondary">
            {grantTitle}
          </Typography>
        )}
      </DialogTitle>

      <DialogContent className={styles.modalContent}>
        {/* Header with Add button */}
        <div className={styles.costsGridHeader}>
          <Typography variant="h6">Grant Costs</Typography>
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

        {/* ReactGrid */}
        <div className={styles.costsGridWrapper}>
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
      </DialogContent>

      <DialogActions className={styles.modalActions}>
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
      </DialogActions>

      {/* Error/Success Messages */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={handleCloseMessage}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={handleCloseMessage} severity="error">
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!successMessage}
        autoHideDuration={3000}
        onClose={handleCloseMessage}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={handleCloseMessage} severity="success">
          {successMessage}
        </Alert>
      </Snackbar>
    </Dialog>
  );
};
