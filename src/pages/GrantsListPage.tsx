import React, { useState, useMemo } from 'react';
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
  Chip,
  IconButton,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { format, parseISO, isAfter, isBefore } from 'date-fns';
import { AppLayout } from '../components/Layout/AppLayout';
import { CreateGrantModal } from '../components/CreateGrantModal';
import { ImpactAnalysisModal } from '../components/ImpactAnalysisModal';
import { useGrants, useIndividuals, useOrganisations, useTimeSlots } from '../hooks/useLocalData';
import { Grant, Individual, Organisation } from '../db/schema';

// Helper function to format dates as ordinal
const formatOrdinalDate = (dateString: string): string => {
  try {
    const date = parseISO(dateString);
    const day = date.getDate();
    const month = format(date, 'MMMM');
    const year = format(date, 'yyyy');
    
    const ordinal = (n: number): string => {
      const s = ['th', 'st', 'nd', 'rd'];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };
    
    return `${ordinal(day)} ${month} ${year}`;
  } catch (error) {
    return dateString;
  }
};

// Helper function to determine grant status
const getGrantStatus = (startDate: string, endDate: string): 'Active' | 'Inactive' => {
  const now = new Date();
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  
  return (isAfter(now, start) || now.toDateString() === start.toDateString()) && 
         (isBefore(now, end) || now.toDateString() === end.toDateString()) 
    ? 'Active' 
    : 'Inactive';
};

interface EditingGrant {
  PK: string;
  Title: string;
  StartDate: string;
  EndDate: string;
  ManagerUserID: string;
  OrganisationID: string;
}

export const GrantsListPage: React.FC = () => {
  const [createGrantModalOpen, setCreateGrantModalOpen] = useState(false);
  const [editingGrantId, setEditingGrantId] = useState<string | null>(null);
  const [editingGrant, setEditingGrant] = useState<EditingGrant | null>(null);
  const [impactAnalysisOpen, setImpactAnalysisOpen] = useState(false);
  const [dateChangeImpact, setDateChangeImpact] = useState<any>(null);

  const { data: grants = [] } = useGrants();
  const { data: individuals = [] } = useIndividuals();
  const { data: organisations = [] } = useOrganisations();

  // Create lookup maps for efficient data access
  const individualsMap = useMemo(() => {
    return individuals.reduce((acc, individual) => {
      acc[individual.PK] = individual;
      return acc;
    }, {} as Record<string, Individual>);
  }, [individuals]);

  const organisationsMap = useMemo(() => {
    return organisations.reduce((acc, org) => {
      acc[org.PK] = org;
      return acc;
    }, {} as Record<string, Organisation>);
  }, [organisations]);

  const handleEditStart = (grant: Grant) => {
    setEditingGrantId(grant.PK);
    setEditingGrant({
      PK: grant.PK,
      Title: grant.Title,
      StartDate: grant.StartDate,
      EndDate: grant.EndDate,
      ManagerUserID: grant.ManagerUserID,
      OrganisationID: grant.OrganisationID,
    });
  };

  const handleEditCancel = () => {
    setEditingGrantId(null);
    setEditingGrant(null);
  };

  const handleEditSave = async () => {
    if (!editingGrant) return;

    try {
      // Check if dates have changed and perform impact analysis
      const originalGrant = grants.find(g => g.PK === editingGrant.PK);
      if (!originalGrant) return;

      const datesChanged =
        originalGrant.StartDate !== editingGrant.StartDate ||
        originalGrant.EndDate !== editingGrant.EndDate;

      if (datesChanged) {
        // Perform impact analysis
        const impactData = await analyzeImpact(originalGrant, editingGrant);
        if (impactData.affectedTimeSlots.length > 0) {
          setDateChangeImpact(impactData);
          setImpactAnalysisOpen(true);
          return; // Don't save yet, wait for user decision
        }
      }

      // No impact or no date changes, save directly
      await saveGrantChanges();
    } catch (error) {
      console.error('Failed to save grant:', error);
    }
  };

  const saveGrantChanges = async () => {
    if (!editingGrant) return;

    const { db } = await import('../db/schema');
    await db.grants.put(editingGrant as Grant);

    setEditingGrantId(null);
    setEditingGrant(null);

    // Refresh grants data
    window.location.reload(); // Temporary - should use query invalidation
  };

  const analyzeImpact = async (originalGrant: Grant, newGrant: EditingGrant) => {
    // This is a simplified impact analysis
    // In a real implementation, this would query all affected TimeSlots
    const mockImpactData = {
      grantId: originalGrant.PK,
      grantTitle: originalGrant.Title,
      originalStartDate: originalGrant.StartDate,
      originalEndDate: originalGrant.EndDate,
      newStartDate: newGrant.StartDate,
      newEndDate: newGrant.EndDate,
      affectedTimeSlots: [
        {
          date: '2024-05-15',
          userId: 'U-12345',
          userName: 'Ellis Taylor',
          hours: 8,
          financialValue: 320,
        },
        {
          date: '2024-05-16',
          userId: 'U-67890',
          userName: 'Sarah Johnson',
          hours: 6,
          financialValue: 280,
        },
      ],
      totalHoursLost: 14,
      totalFinancialValueLost: 600,
      affectedIndividuals: ['Ellis Taylor', 'Sarah Johnson'],
    };

    return mockImpactData;
  };

  const handleProceedWithDeletion = async () => {
    // Delete affected time slots and save grant changes
    await saveGrantChanges();
    setImpactAnalysisOpen(false);
    setDateChangeImpact(null);
  };

  const handleAdjustDates = () => {
    // Close impact analysis and allow user to adjust dates
    setImpactAnalysisOpen(false);
    setDateChangeImpact(null);
    // Keep editing mode active
  };

  const handleInputChange = (field: keyof EditingGrant, value: string) => {
    if (!editingGrant) return;
    
    setEditingGrant({
      ...editingGrant,
      [field]: value,
    });
  };

  return (
    <AppLayout>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 3 
        }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
              Global Grants Management
            </Typography>
            <Typography variant="body1" color="text.secondary">
              View and manage grants across all organizations
            </Typography>
            <Typography variant="body2" sx={{
              mt: 1,
              p: 1,
              backgroundColor: '#e3f2fd',
              borderRadius: 1,
              color: '#1976d2',
              fontWeight: 500,
              display: 'inline-block'
            }}>
              📊 Global View: Showing grants from all organizations
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateGrantModalOpen(true)}
          >
            Create Grant
          </Button>
        </Box>

        {/* Grants Table */}
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell sx={{ fontWeight: 600 }}>Grant Title</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Start Date</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>End Date</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Manager</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Organisation</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {grants.map((grant) => {
                const isEditing = editingGrantId === grant.PK;
                const manager = individualsMap[grant.ManagerUserID];
                const organisation = organisationsMap[grant.OrganisationID];
                const status = getGrantStatus(grant.StartDate, grant.EndDate);

                return (
                  <TableRow key={grant.PK} hover>
                    <TableCell>
                      {isEditing ? (
                        <TextField
                          fullWidth
                          size="small"
                          value={editingGrant?.Title || ''}
                          onChange={(e) => handleInputChange('Title', e.target.value)}
                        />
                      ) : (
                        grant.Title
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <TextField
                          type="date"
                          size="small"
                          value={editingGrant?.StartDate || ''}
                          onChange={(e) => handleInputChange('StartDate', e.target.value)}
                          InputLabelProps={{ shrink: true }}
                        />
                      ) : (
                        formatOrdinalDate(grant.StartDate)
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <TextField
                          type="date"
                          size="small"
                          value={editingGrant?.EndDate || ''}
                          onChange={(e) => handleInputChange('EndDate', e.target.value)}
                          InputLabelProps={{ shrink: true }}
                        />
                      ) : (
                        formatOrdinalDate(grant.EndDate)
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <FormControl fullWidth size="small">
                          <Select
                            value={editingGrant?.ManagerUserID || ''}
                            onChange={(e) => handleInputChange('ManagerUserID', e.target.value)}
                          >
                            {individuals.map((individual) => (
                              <MenuItem key={individual.PK} value={individual.PK}>
                                {individual.FirstName} {individual.LastName}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      ) : (
                        manager ? `${manager.FirstName} ${manager.LastName}` : 'Unknown'
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <FormControl fullWidth size="small">
                          <Select
                            value={editingGrant?.OrganisationID || ''}
                            onChange={(e) => handleInputChange('OrganisationID', e.target.value)}
                          >
                            {organisations.map((org) => (
                              <MenuItem key={org.PK} value={org.PK}>
                                {org.Name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      ) : (
                        organisation?.Name || 'Unknown'
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={status}
                        color={status === 'Active' ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Box sx={{ display: 'flex', gap: 1 }}>
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
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleEditStart(grant)}
                        >
                          <EditIcon />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Create Grant Modal */}
        <CreateGrantModal
          open={createGrantModalOpen}
          onClose={() => setCreateGrantModalOpen(false)}
          onGrantCreated={() => {
            setCreateGrantModalOpen(false);
            window.location.reload(); // Temporary - should use query invalidation
          }}
        />

        {/* Impact Analysis Modal */}
        <ImpactAnalysisModal
          open={impactAnalysisOpen}
          onClose={() => {
            setImpactAnalysisOpen(false);
            setDateChangeImpact(null);
          }}
          impactData={dateChangeImpact}
          onProceedWithDeletion={handleProceedWithDeletion}
          onAdjustDates={handleAdjustDates}
        />
      </Box>
    </AppLayout>
  );
};
