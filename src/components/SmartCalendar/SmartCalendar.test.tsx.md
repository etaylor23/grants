import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SmartCalendar } from './SmartCalendar';
import { Individual } from '../../db/schema';

// Mock the hooks and components
vi.mock('../../hooks/useLocalData', () => ({
  useIndividuals: vi.fn(),
  useOrganisations: vi.fn(),
}));

vi.mock('../../utils/breadcrumbUtils', () => ({
  useScopeInfo: vi.fn(),
}));

vi.mock('../LocalCalendarView', () => ({
  LocalCalendarView: vi.fn(({ userId, userName, users, multiUser }) => (
    <div data-testid="local-calendar-view">
      <div>User ID: {userId}</div>
      <div>User Name: {userName}</div>
      <div>Multi User: {multiUser ? 'true' : 'false'}</div>
      {users && <div>Users Count: {users.length}</div>}
    </div>
  )),
}));

vi.mock('../UnconstrainedCalendarView', () => ({
  UnconstrainedCalendarView: vi.fn(({ userId, userName, organisationId }) => (
    <div data-testid="unconstrained-calendar-view">
      <div>User ID: {userId}</div>
      <div>User Name: {userName}</div>
      <div>Organisation ID: {organisationId}</div>
    </div>
  )),
}));

// Mock data
const mockIndividuals: Individual[] = [
  {
    PK: 'user-1',
    FirstName: 'John',
    LastName: 'Doe',
    AnnualGross: 50000,
    Pension: 5000,
    NationalIns: 3000,
    OrganisationID: 'org-1',
  },
  {
    PK: 'user-2',
    FirstName: 'Jane',
    LastName: 'Smith',
    AnnualGross: 60000,
    Pension: 6000,
    NationalIns: 3500,
    OrganisationID: 'org-1',
  },
];

const mockOrganisations = [
  { PK: 'org-1', Name: 'Organization 1', CompanyNumber: '12345', CreatedDate: '2023-01-01' },
];

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('SmartCalendar', () => {
  const mockOnUserChange = vi.fn();
  const mockOnUsersChange = vi.fn();
  const mockOnDateSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    const { useIndividuals, useOrganisations } = require('../../hooks/useLocalData');
    const { useScopeInfo } = require('../../utils/breadcrumbUtils');
    
    useIndividuals.mockReturnValue({
      data: mockIndividuals,
      isLoading: false,
      error: null,
    });
    
    useOrganisations.mockReturnValue({
      data: mockOrganisations,
      isLoading: false,
      error: null,
    });
    
    useScopeInfo.mockReturnValue({
      isGlobal: true,
      organizationId: null,
      organizationName: null,
      contextType: 'global' as const,
    });
  });

  describe('Single-user mode', () => {
    it('renders placeholder when no user is selected', () => {
      render(
        <TestWrapper>
          <SmartCalendar
            selectedUserId={null}
            selectedUser={null}
            onUserChange={mockOnUserChange}
            onDateSelect={mockOnDateSelect}
            multiSelect={false}
          />
        </TestWrapper>
      );

      expect(screen.getByText('Select a team member to view their calendar')).toBeInTheDocument();
    });

    it('renders LocalCalendarView in global context with selected user', () => {
      render(
        <TestWrapper>
          <SmartCalendar
            selectedUserId="user-1"
            selectedUser={mockIndividuals[0]}
            onUserChange={mockOnUserChange}
            onDateSelect={mockOnDateSelect}
            multiSelect={false}
          />
        </TestWrapper>
      );

      expect(screen.getByTestId('local-calendar-view')).toBeInTheDocument();
      expect(screen.getByText('User ID: user-1')).toBeInTheDocument();
      expect(screen.getByText('User Name: John Doe')).toBeInTheDocument();
      expect(screen.getByText('Multi User: false')).toBeInTheDocument();
    });

    it('renders UnconstrainedCalendarView in organization context', () => {
      const { useScopeInfo } = require('../../utils/breadcrumbUtils');
      useScopeInfo.mockReturnValue({
        isGlobal: false,
        organizationId: '12345',
        organizationName: 'Organization 1',
        contextType: 'organization' as const,
      });

      render(
        <TestWrapper>
          <SmartCalendar
            organizationId="org-1"
            selectedUserId="user-1"
            selectedUser={mockIndividuals[0]}
            onUserChange={mockOnUserChange}
            onDateSelect={mockOnDateSelect}
            multiSelect={false}
          />
        </TestWrapper>
      );

      expect(screen.getByTestId('unconstrained-calendar-view')).toBeInTheDocument();
      expect(screen.getByText('User ID: user-1')).toBeInTheDocument();
      expect(screen.getByText('Organisation ID: org-1')).toBeInTheDocument();
    });
  });

  describe('Multi-user mode', () => {
    it('renders placeholder when no users are selected', () => {
      render(
        <TestWrapper>
          <SmartCalendar
            selectedUserIds={[]}
            selectedUsers={[]}
            onUsersChange={mockOnUsersChange}
            onDateSelect={mockOnDateSelect}
            multiSelect={true}
          />
        </TestWrapper>
      );

      expect(screen.getByText('Select team members to view their calendars')).toBeInTheDocument();
    });

    it('renders LocalCalendarView with multiple users in global context', () => {
      render(
        <TestWrapper>
          <SmartCalendar
            selectedUserIds={['user-1', 'user-2']}
            selectedUsers={mockIndividuals}
            onUsersChange={mockOnUsersChange}
            onDateSelect={mockOnDateSelect}
            multiSelect={true}
          />
        </TestWrapper>
      );

      expect(screen.getByTestId('local-calendar-view')).toBeInTheDocument();
      expect(screen.getByText('Multi User: true')).toBeInTheDocument();
      expect(screen.getByText('Users Count: 2')).toBeInTheDocument();
      expect(screen.getByText(/showing calendar for 2 selected users/i)).toBeInTheDocument();
    });

    it('shows user names when multiple users are selected', () => {
      render(
        <TestWrapper>
          <SmartCalendar
            selectedUserIds={['user-1', 'user-2']}
            selectedUsers={mockIndividuals}
            onUsersChange={mockOnUsersChange}
            onDateSelect={mockOnDateSelect}
            multiSelect={true}
          />
        </TestWrapper>
      );

      expect(screen.getByText(/john doe, jane smith/i)).toBeInTheDocument();
    });

    it('handles single user in multi-select mode', () => {
      render(
        <TestWrapper>
          <SmartCalendar
            selectedUserIds={['user-1']}
            selectedUsers={[mockIndividuals[0]]}
            onUsersChange={mockOnUsersChange}
            onDateSelect={mockOnDateSelect}
            multiSelect={true}
          />
        </TestWrapper>
      );

      expect(screen.getByText(/showing calendar for 1 selected user/i)).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  describe('Context switching', () => {
    it('adapts to global vs organization context', () => {
      const { useScopeInfo } = require('../../utils/breadcrumbUtils');
      
      // Test global context
      useScopeInfo.mockReturnValue({
        isGlobal: true,
        organizationId: null,
        organizationName: null,
        contextType: 'global' as const,
      });

      const { rerender } = render(
        <TestWrapper>
          <SmartCalendar
            selectedUserId="user-1"
            selectedUser={mockIndividuals[0]}
            onUserChange={mockOnUserChange}
            onDateSelect={mockOnDateSelect}
            multiSelect={false}
          />
        </TestWrapper>
      );

      expect(screen.getByTestId('local-calendar-view')).toBeInTheDocument();

      // Test organization context
      useScopeInfo.mockReturnValue({
        isGlobal: false,
        organizationId: '12345',
        organizationName: 'Organization 1',
        contextType: 'organization' as const,
      });

      rerender(
        <TestWrapper>
          <SmartCalendar
            organizationId="org-1"
            selectedUserId="user-1"
            selectedUser={mockIndividuals[0]}
            onUserChange={mockOnUserChange}
            onDateSelect={mockOnDateSelect}
            multiSelect={false}
          />
        </TestWrapper>
      );

      expect(screen.getByTestId('unconstrained-calendar-view')).toBeInTheDocument();
    });
  });

  describe('Event handling', () => {
    it('passes onDateSelect to calendar components', () => {
      render(
        <TestWrapper>
          <SmartCalendar
            selectedUserId="user-1"
            selectedUser={mockIndividuals[0]}
            onUserChange={mockOnUserChange}
            onDateSelect={mockOnDateSelect}
            multiSelect={false}
          />
        </TestWrapper>
      );

      // The mock component should receive the onDateSelect prop
      expect(screen.getByTestId('local-calendar-view')).toBeInTheDocument();
    });
  });

  describe('Loading states', () => {
    it('handles loading state gracefully', () => {
      const { useIndividuals } = require('../../hooks/useLocalData');
      useIndividuals.mockReturnValue({
        data: [],
        isLoading: true,
        error: null,
      });

      render(
        <TestWrapper>
          <SmartCalendar
            selectedUserId="user-1"
            selectedUser={mockIndividuals[0]}
            onUserChange={mockOnUserChange}
            onDateSelect={mockOnDateSelect}
            multiSelect={false}
          />
        </TestWrapper>
      );

      // Should still render the calendar component even during loading
      expect(screen.getByTestId('local-calendar-view')).toBeInTheDocument();
    });
  });

  describe('Props validation', () => {
    it('handles missing optional props gracefully', () => {
      render(
        <TestWrapper>
          <SmartCalendar />
        </TestWrapper>
      );

      expect(screen.getByText('Select a team member to view their calendar')).toBeInTheDocument();
    });

    it('prioritizes multi-select props when multiSelect is true', () => {
      render(
        <TestWrapper>
          <SmartCalendar
            selectedUserId="user-1"
            selectedUser={mockIndividuals[0]}
            selectedUserIds={['user-2']}
            selectedUsers={[mockIndividuals[1]]}
            onUserChange={mockOnUserChange}
            onUsersChange={mockOnUsersChange}
            onDateSelect={mockOnDateSelect}
            multiSelect={true}
          />
        </TestWrapper>
      );

      // Should use multi-select data (Jane Smith) instead of single-select (John Doe)
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });
  });
});
