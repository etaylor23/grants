import React, { useState, useMemo } from 'react';
import { useParams, Navigate } from 'react-router-dom';
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
  Button,
  Avatar,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { AppLayout } from '../components/Layout/AppLayout';
import { BreadcrumbNavigation } from '../components/BreadcrumbNavigation';
import { CreateUserModal } from '../components/CreateUserModal';
import { useIndividuals, useOrganisations } from '../hooks/useLocalData';

export const OrganisationIndividualsPage: React.FC = () => {
  const { orgNumber } = useParams<{ orgNumber: string }>();
  const [createUserModalOpen, setCreateUserModalOpen] = useState(false);

  const { data: allIndividuals = [] } = useIndividuals();
  const { data: organisations = [] } = useOrganisations();

  // Find organisation by company number
  const organisation = organisations.find(org => org.CompanyNumber === orgNumber);

  // Filter individuals by organisation
  const individuals = useMemo(() => {
    if (!organisation) return [];
    return allIndividuals.filter(individual => individual.OrganisationID === organisation.PK);
  }, [allIndividuals, organisation]);

  if (!organisation) {
    return <Navigate to="/organisations" replace />;
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getInitials = (firstName: string, lastName: string): string => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getAvatarColor = (name: string): string => {
    const colors = [
      '#1976d2', '#388e3c', '#f57c00', '#7b1fa2', 
      '#c2185b', '#00796b', '#5d4037', '#455a64'
    ];
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  return (
    <AppLayout>
      <Box sx={{ p: 3 }}>
        <BreadcrumbNavigation
          items={[
            { label: 'Home', path: '/' },
            { label: 'Organisations', path: '/organisations' },
            { label: organisation.Name, path: `/organisation/${orgNumber}` },
            { label: 'Team Members', path: `/organisation/${orgNumber}/individuals` },
          ]}
        />

        {/* Header */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 3 
        }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
              Team Members - {organisation.Name}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage individuals in this organisation
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateUserModalOpen(true)}
          >
            Add Team Member
          </Button>
        </Box>

        {/* Statistics */}
        <Box sx={{ mb: 3, display: 'flex', gap: 3 }}>
          <Box sx={{ 
            p: 2, 
            backgroundColor: '#f5f5f5', 
            borderRadius: 2,
            minWidth: 120,
            textAlign: 'center'
          }}>
            <Typography variant="h4" sx={{ fontWeight: 600, color: '#1976d2' }}>
              {individuals.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Team Members
            </Typography>
          </Box>
          <Box sx={{ 
            p: 2, 
            backgroundColor: '#f5f5f5', 
            borderRadius: 2,
            minWidth: 120,
            textAlign: 'center'
          }}>
            <Typography variant="h4" sx={{ fontWeight: 600, color: '#2e7d32' }}>
              {formatCurrency(individuals.reduce((sum, ind) => sum + ind.AnnualGross, 0))}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Payroll
            </Typography>
          </Box>
          <Box sx={{ 
            p: 2, 
            backgroundColor: '#f5f5f5', 
            borderRadius: 2,
            minWidth: 120,
            textAlign: 'center'
          }}>
            <Typography variant="h4" sx={{ fontWeight: 600, color: '#ed6c02' }}>
              {individuals.length > 0 ? formatCurrency(individuals.reduce((sum, ind) => sum + ind.AnnualGross, 0) / individuals.length) : '£0'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Average Salary
            </Typography>
          </Box>
        </Box>

        {/* Individuals Table */}
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell sx={{ fontWeight: 600 }}>Team Member</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Annual Gross</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Pension</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>National Insurance</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Net Salary</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {individuals.map((individual) => {
                const fullName = `${individual.FirstName} ${individual.LastName}`;
                const netSalary = individual.AnnualGross - individual.Pension - individual.NationalIns;
                
                return (
                  <TableRow key={individual.PK} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar
                          sx={{
                            bgcolor: getAvatarColor(fullName),
                            width: 40,
                            height: 40,
                          }}
                        >
                          {getInitials(individual.FirstName, individual.LastName)}
                        </Avatar>
                        <Box>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {fullName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {individual.PK}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {formatCurrency(individual.AnnualGross)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {formatCurrency(individual.Pension)}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(individual.NationalIns)}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body1" sx={{ fontWeight: 600, color: '#2e7d32' }}>
                        {formatCurrency(netSalary)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label="Active"
                        color="success"
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
              {individuals.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4 }}>
                    <PersonIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                      No team members found
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Add team members to get started
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Create User Modal */}
        <CreateUserModal
          open={createUserModalOpen}
          onClose={() => setCreateUserModalOpen(false)}
          onUserCreated={() => {
            setCreateUserModalOpen(false);
            window.location.reload(); // Temporary - should use query invalidation
          }}
          defaultOrganisationId={organisation.PK}
        />
      </Box>
    </AppLayout>
  );
};
