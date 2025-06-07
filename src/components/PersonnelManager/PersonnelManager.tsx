import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Snackbar,
  CircularProgress,
} from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { usePersonnel, useCreatePersonnel } from "../../api/hooks";
import { Personnel } from "../../models/types";

interface PersonnelFormData {
  firstName: string;
  lastName: string;
  annualGrossSalary: number;
  pension: number;
  nationalInsurance: number;
}

const initialFormData: PersonnelFormData = {
  firstName: "",
  lastName: "",
  annualGrossSalary: 0,
  pension: 0,
  nationalInsurance: 0,
};

export const PersonnelManager: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<PersonnelFormData>(initialFormData);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { data: personnel = [], isLoading, error: fetchError } = usePersonnel();
  const createPersonnelMutation = useCreatePersonnel();

  const handleOpen = () => {
    setFormData(initialFormData);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setFormData(initialFormData);
    setError(null);
  };

  const handleInputChange =
    (field: keyof PersonnelFormData) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setFormData((prev) => ({
        ...prev,
        [field]:
          field === "firstName" || field === "lastName"
            ? value
            : parseFloat(value) || 0,
      }));
    };

  const handleSubmit = async () => {
    try {
      // Validation
      if (!formData.firstName.trim() || !formData.lastName.trim()) {
        setError("First name and last name are required");
        return;
      }

      if (formData.annualGrossSalary <= 0) {
        setError("Annual gross salary must be greater than 0");
        return;
      }

      await createPersonnelMutation.mutateAsync(formData);
      setSuccess("Personnel created successfully");
      handleClose();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to create personnel"
      );
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
    }).format(amount);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (fetchError) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Failed to load personnel data
      </Alert>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Personnel Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpen}
          sx={{ borderRadius: 2 }}
        >
          Add Personnel
        </Button>
      </Box>

      <TableContainer
        component={Paper}
        sx={{
          borderRadius: 2,
          border: "1px solid #e0e0e0",
          overflow: "hidden",
        }}
      >
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f8f9fa" }}>
              <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>
                Annual Gross Salary
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Pension</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>National Insurance</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {personnel.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} sx={{ textAlign: "center", py: 4 }}>
                  <Typography color="text.secondary">
                    No personnel records found. Click "Add Personnel" to create
                    the first record.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              personnel.map((person: Personnel) => (
                <TableRow key={person.id} hover>
                  <TableCell>
                    {person.firstName} {person.lastName}
                  </TableCell>
                  <TableCell>
                    {formatCurrency(person.annualGrossSalary)}
                  </TableCell>
                  <TableCell>{formatCurrency(person.pension)}</TableCell>
                  <TableCell>
                    {formatCurrency(person.nationalInsurance)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Personnel Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Personnel</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField
              label="First Name"
              value={formData.firstName}
              onChange={handleInputChange("firstName")}
              fullWidth
              required
            />
            <TextField
              label="Last Name"
              value={formData.lastName}
              onChange={handleInputChange("lastName")}
              fullWidth
              required
            />
            <TextField
              label="Annual Gross Salary"
              type="number"
              value={formData.annualGrossSalary}
              onChange={handleInputChange("annualGrossSalary")}
              fullWidth
              required
              InputProps={{
                startAdornment: "£",
              }}
            />
            <TextField
              label="Pension"
              type="number"
              value={formData.pension}
              onChange={handleInputChange("pension")}
              fullWidth
              InputProps={{
                startAdornment: "£",
              }}
            />
            <TextField
              label="National Insurance"
              type="number"
              value={formData.nationalInsurance}
              onChange={handleInputChange("nationalInsurance")}
              fullWidth
              InputProps={{
                startAdornment: "£",
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={createPersonnelMutation.isPending}
          >
            {createPersonnelMutation.isPending ? "Creating..." : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success/Error Snackbars */}
      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={() => setSuccess(null)} severity="success">
          {success}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={() => setError(null)} severity="error">
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
};
