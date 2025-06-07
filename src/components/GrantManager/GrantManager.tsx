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
  Chip,
} from "@mui/material";
import { Add as AddIcon, ColorLens as ColorIcon } from "@mui/icons-material";
import { useGrants, useCreateGrant } from "../../api/hooks";
import { Grant } from "../../models/types";

interface GrantFormData {
  name: string;
  color: string;
  description: string;
}

const initialFormData: GrantFormData = {
  name: "",
  color: "#1976d2",
  description: "",
};

const predefinedColors = [
  "#1976d2",
  "#d32f2f",
  "#388e3c",
  "#f57c00",
  "#7b1fa2",
  "#303f9f",
  "#c2185b",
  "#00796b",
  "#5d4037",
  "#455a64",
  "#e64a19",
  "#1565c0",
];

export const GrantManager: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<GrantFormData>(initialFormData);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { data: grants = [], isLoading, error: fetchError } = useGrants();
  const createGrantMutation = useCreateGrant();

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
    (field: keyof GrantFormData) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({
        ...prev,
        [field]: event.target.value,
      }));
    };

  const handleColorSelect = (color: string) => {
    setFormData((prev) => ({
      ...prev,
      color,
    }));
  };

  const handleSubmit = async () => {
    try {
      // Validation
      if (!formData.name.trim()) {
        setError("Grant name is required");
        return;
      }

      if (!formData.color) {
        setError("Grant color is required");
        return;
      }

      await createGrantMutation.mutateAsync(formData);
      setSuccess("Grant created successfully");
      handleClose();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to create grant"
      );
    }
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
        Failed to load grants data
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
          Grant Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpen}
          sx={{ borderRadius: 2 }}
        >
          Add Grant
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
              <TableCell sx={{ fontWeight: 600 }}>Color</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {grants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} sx={{ textAlign: "center", py: 4 }}>
                  <Typography color="text.secondary">
                    No grants found. Click "Add Grant" to create the first
                    grant.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              grants.map((grant: Grant) => (
                <TableRow key={grant.id} hover>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box
                        sx={{
                          width: 16,
                          height: 16,
                          backgroundColor: grant.color,
                          borderRadius: "50%",
                          border: "1px solid #e0e0e0",
                        }}
                      />
                      {grant.name}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={grant.color}
                      size="small"
                      sx={{
                        backgroundColor: grant.color,
                        color: "#ffffff",
                        fontFamily: "monospace",
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    {grant.description || (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        fontStyle="italic"
                      >
                        No description
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Grant Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Grant</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField
              label="Grant Name"
              value={formData.name}
              onChange={handleInputChange("name")}
              fullWidth
              required
            />

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Color
              </Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
                {predefinedColors.map((color) => (
                  <Box
                    key={color}
                    onClick={() => handleColorSelect(color)}
                    sx={{
                      width: 32,
                      height: 32,
                      backgroundColor: color,
                      borderRadius: "50%",
                      cursor: "pointer",
                      border:
                        formData.color === color
                          ? "3px solid #1976d2"
                          : "2px solid #e0e0e0",
                      "&:hover": {
                        transform: "scale(1.1)",
                      },
                      transition: "all 0.2s ease-in-out",
                    }}
                  />
                ))}
              </Box>
              <TextField
                label="Custom Color (Hex)"
                value={formData.color}
                onChange={handleInputChange("color")}
                fullWidth
                placeholder="#1976d2"
                InputProps={{
                  startAdornment: (
                    <ColorIcon sx={{ mr: 1, color: "text.secondary" }} />
                  ),
                }}
              />
            </Box>

            <TextField
              label="Description"
              value={formData.description}
              onChange={handleInputChange("description")}
              fullWidth
              multiline
              rows={3}
              placeholder="Optional description of the grant..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={createGrantMutation.isPending}
          >
            {createGrantMutation.isPending ? "Creating..." : "Create"}
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
