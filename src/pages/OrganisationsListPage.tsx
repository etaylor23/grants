import React, { useState } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  TextField,
  Button,
} from "@mui/material";
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Add as AddIcon,
  Visibility as ViewIcon,
} from "@mui/icons-material";
import { format, parseISO } from "date-fns";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "../components/Layout/AppLayout";
import { CreateOrganisationModal } from "../components/CreateOrganisationModal";
import { ContextIndicator } from "../components/ContextIndicator";
import { useOrganisations } from "../hooks/useLocalData";
import { Organisation } from "../db/schema";

interface EditingOrganisation {
  PK: string;
  Name: string;
  CompanyNumber: string;
  CreatedDate: string;
}

export const OrganisationsListPage: React.FC = () => {
  const navigate = useNavigate();
  const [createOrganisationModalOpen, setCreateOrganisationModalOpen] =
    useState(false);
  const [editingOrganisationId, setEditingOrganisationId] = useState<
    string | null
  >(null);
  const [editingOrganisation, setEditingOrganisation] =
    useState<EditingOrganisation | null>(null);

  const { data: organisations = [] } = useOrganisations();

  // Debug logging
  console.log("OrganisationsListPage - organisations data:", organisations);

  const handleEditStart = (organisation: Organisation) => {
    setEditingOrganisationId(organisation.PK);
    setEditingOrganisation({
      PK: organisation.PK,
      Name: organisation.Name,
      CompanyNumber: organisation.CompanyNumber,
      CreatedDate: organisation.CreatedDate,
    });
  };

  const handleEditCancel = () => {
    setEditingOrganisationId(null);
    setEditingOrganisation(null);
  };

  const handleEditSave = async () => {
    if (!editingOrganisation) return;

    try {
      const { db } = await import("../db/schema");
      await db.organisations.put(editingOrganisation as Organisation);

      setEditingOrganisationId(null);
      setEditingOrganisation(null);

      // Refresh organisations data
      window.location.reload(); // Temporary - should use query invalidation
    } catch (error) {
      console.error("Failed to save organisation:", error);
    }
  };

  const handleInputChange = (
    field: keyof EditingOrganisation,
    value: string
  ) => {
    if (!editingOrganisation) return;

    setEditingOrganisation({
      ...editingOrganisation,
      [field]: value,
    });
  };

  const formatDate = (dateString: string): string => {
    try {
      return format(parseISO(dateString), "dd MMM yyyy");
    } catch (error) {
      return dateString;
    }
  };

  const handleViewOrganisation = (organisation: Organisation) => {
    console.log("Navigating to organisation:", organisation);
    console.log("URL will be:", `/organisation/${organisation.CompanyNumber}`);
    navigate(`/organisation/${organisation.CompanyNumber}`);
  };

  return (
    <AppLayout>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
              Organisations Management
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateOrganisationModalOpen(true)}
          >
            Create Organisation
          </Button>
        </Box>

        {/* Context Indicator */}
        <ContextIndicator variant="banner" showDescription sx={{ mb: 3 }} />

        {/* Organisations Table */}
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                <TableCell sx={{ fontWeight: 600 }}>
                  Organisation Name
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Company Number</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Created Date</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {organisations.map((organisation) => {
                const isEditing = editingOrganisationId === organisation.PK;

                return (
                  <TableRow key={organisation.PK} hover>
                    <TableCell>
                      {isEditing ? (
                        <TextField
                          fullWidth
                          size="small"
                          value={editingOrganisation?.Name || ""}
                          onChange={(e) =>
                            handleInputChange("Name", e.target.value)
                          }
                        />
                      ) : (
                        organisation.Name
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <TextField
                          fullWidth
                          size="small"
                          value={editingOrganisation?.CompanyNumber || ""}
                          onChange={(e) =>
                            handleInputChange("CompanyNumber", e.target.value)
                          }
                        />
                      ) : (
                        organisation.CompanyNumber
                      )}
                    </TableCell>
                    <TableCell>
                      {formatDate(organisation.CreatedDate)}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Box sx={{ display: "flex", gap: 1 }}>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={handleEditSave}
                          >
                            <SaveIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="secondary"
                            onClick={handleEditCancel}
                          >
                            <CancelIcon />
                          </IconButton>
                        </Box>
                      ) : (
                        <Box
                          sx={{ display: "flex", gap: 1, alignItems: "center" }}
                        >
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<ViewIcon />}
                            onClick={() => handleViewOrganisation(organisation)}
                            sx={{ mr: 1 }}
                          >
                            View
                          </Button>
                          <IconButton
                            size="small"
                            color="secondary"
                            onClick={() => handleEditStart(organisation)}
                            title="Edit Organisation"
                          >
                            <EditIcon />
                          </IconButton>
                        </Box>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {organisations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} sx={{ textAlign: "center", py: 4 }}>
                    <Typography
                      variant="h6"
                      color="text.secondary"
                      sx={{ mb: 1 }}
                    >
                      No organisations found
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Create an organisation to get started
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Create Organisation Modal */}
        <CreateOrganisationModal
          open={createOrganisationModalOpen}
          onClose={() => setCreateOrganisationModalOpen(false)}
          onOrganisationCreated={() => {
            setCreateOrganisationModalOpen(false);
            window.location.reload(); // Temporary - should use query invalidation
          }}
        />
      </Box>
    </AppLayout>
  );
};
