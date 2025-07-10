import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { UserPicker } from './UserPicker';
import { Individual } from '../../db/schema';

// Mock the hooks
vi.mock('../../hooks/useLocalData', () => ({
  useIndividuals: vi.fn(),
  useOrganisations: vi.fn(),
}));

vi.mock('../../utils/breadcrumbUtils', () => ({
  useScopeInfo: vi.fn(),
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
  {
    PK: 'user-3',
    FirstName: 'Bob',
    LastName: 'Johnson',
    AnnualGross: 55000,
    Pension: 5500,
    NationalIns: 3200,
    OrganisationID: 'org-2',
  },
];

const mockOrganisations = [
  { PK: 'org-1', Name: 'Organization 1', CompanyNumber: '12345', CreatedDate: '2023-01-01' },
  { PK: 'org-2', Name: 'Organization 2', CompanyNumber: '67890', CreatedDate: '2023-01-02' },
];

const mockScopeInfo = {
  isGlobal: true,
  organizationId: null,
  organizationName: null,
  contextType: 'global' as const,
};

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

describe('UserPicker', () => {
  const mockOnUserChange = vi.fn();
  const mockOnUsersChange = vi.fn();

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
    
    useScopeInfo.mockReturnValue(mockScopeInfo);
  });

  describe('Single-select mode', () => {
    it('renders correctly in single-select mode', () => {
      render(
        <TestWrapper>
          <UserPicker
            selectedUserId="user-1"
            onUserChange={mockOnUserChange}
            multiSelect={false}
          />
        </TestWrapper>
      );

      expect(screen.getByRole('button', { name: /select team member/i })).toBeInTheDocument();
      expect(screen.getByText('JD')).toBeInTheDocument(); // User initials
    });

    it('opens dropdown when clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <UserPicker
            selectedUserId={null}
            onUserChange={mockOnUserChange}
            multiSelect={false}
          />
        </TestWrapper>
      );

      const button = screen.getByRole('button', { name: /select team member/i });
      await user.click(button);

      expect(screen.getByRole('listbox')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('selects user when clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <UserPicker
            selectedUserId={null}
            onUserChange={mockOnUserChange}
            multiSelect={false}
          />
        </TestWrapper>
      );

      const button = screen.getByRole('button', { name: /select team member/i });
      await user.click(button);

      const johnOption = screen.getByRole('option', { name: /john doe/i });
      await user.click(johnOption);

      expect(mockOnUserChange).toHaveBeenCalledWith('user-1', mockIndividuals[0]);
    });
  });

  describe('Multi-select mode', () => {
    it('renders correctly in multi-select mode', () => {
      render(
        <TestWrapper>
          <UserPicker
            selectedUserIds={['user-1']}
            onUsersChange={mockOnUsersChange}
            multiSelect={true}
          />
        </TestWrapper>
      );

      expect(screen.getByRole('button', { name: /select team members/i })).toBeInTheDocument();
    });

    it('shows checkboxes in multi-select mode', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <UserPicker
            selectedUserIds={[]}
            onUsersChange={mockOnUsersChange}
            multiSelect={true}
          />
        </TestWrapper>
      );

      const button = screen.getByRole('button', { name: /select team members/i });
      await user.click(button);

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);
    });

    it('handles multi-select correctly', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <UserPicker
            selectedUserIds={[]}
            onUsersChange={mockOnUsersChange}
            multiSelect={true}
          />
        </TestWrapper>
      );

      const button = screen.getByRole('button', { name: /select team members/i });
      await user.click(button);

      const johnOption = screen.getByRole('option', { name: /john doe/i });
      await user.click(johnOption);

      expect(mockOnUsersChange).toHaveBeenCalledWith(['user-1'], [mockIndividuals[0]]);
    });

    it('shows select all and clear all buttons', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <UserPicker
            selectedUserIds={[]}
            onUsersChange={mockOnUsersChange}
            multiSelect={true}
          />
        </TestWrapper>
      );

      const button = screen.getByRole('button', { name: /select team members/i });
      await user.click(button);

      expect(screen.getByRole('button', { name: /select all/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /clear all/i })).toBeInTheDocument();
    });

    it('handles select all functionality', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <UserPicker
            selectedUserIds={[]}
            onUsersChange={mockOnUsersChange}
            multiSelect={true}
          />
        </TestWrapper>
      );

      const button = screen.getByRole('button', { name: /select team members/i });
      await user.click(button);

      const selectAllButton = screen.getByRole('button', { name: /select all/i });
      await user.click(selectAllButton);

      expect(mockOnUsersChange).toHaveBeenCalledWith(
        ['user-1', 'user-2', 'user-3'],
        mockIndividuals
      );
    });
  });

  describe('Search functionality', () => {
    it('shows search field when dropdown is open', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <UserPicker
            selectedUserId={null}
            onUserChange={mockOnUserChange}
            multiSelect={false}
          />
        </TestWrapper>
      );

      const button = screen.getByRole('button', { name: /select team member/i });
      await user.click(button);

      expect(screen.getByPlaceholderText('Search team members...')).toBeInTheDocument();
    });

    it('filters users based on search query', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <UserPicker
            selectedUserId={null}
            onUserChange={mockOnUserChange}
            multiSelect={false}
          />
        </TestWrapper>
      );

      const button = screen.getByRole('button', { name: /select team member/i });
      await user.click(button);

      const searchInput = screen.getByPlaceholderText('Search team members...');
      await user.type(searchInput, 'John');

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });

    it('shows no results message when search returns empty', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <UserPicker
            selectedUserId={null}
            onUserChange={mockOnUserChange}
            multiSelect={false}
          />
        </TestWrapper>
      );

      const button = screen.getByRole('button', { name: /select team member/i });
      await user.click(button);

      const searchInput = screen.getByPlaceholderText('Search team members...');
      await user.type(searchInput, 'NonexistentUser');

      expect(screen.getByText(/no users found matching/i)).toBeInTheDocument();
    });

    it('clears search when clear button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <UserPicker
            selectedUserId={null}
            onUserChange={mockOnUserChange}
            multiSelect={false}
          />
        </TestWrapper>
      );

      const button = screen.getByRole('button', { name: /select team member/i });
      await user.click(button);

      const searchInput = screen.getByPlaceholderText('Search team members...');
      await user.type(searchInput, 'John');

      const clearButton = screen.getByRole('button', { name: /clear search/i });
      await user.click(clearButton);

      expect(searchInput).toHaveValue('');
      expect(screen.getByText('Jane Smith')).toBeInTheDocument(); // Should show all users again
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <UserPicker
            selectedUserId={null}
            onUserChange={mockOnUserChange}
            multiSelect={true}
          />
        </TestWrapper>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-expanded', 'false');
      expect(button).toHaveAttribute('aria-haspopup', 'listbox');

      await user.click(button);

      expect(button).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('listbox')).toHaveAttribute('aria-multiselectable', 'true');
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <UserPicker
            selectedUserId={null}
            onUserChange={mockOnUserChange}
            multiSelect={false}
          />
        </TestWrapper>
      );

      const button = screen.getByRole('button');
      button.focus();
      
      await user.keyboard('{Enter}');
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      await user.keyboard('{Escape}');
      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });
  });

  describe('Loading and error states', () => {
    it('shows loading state', () => {
      const { useIndividuals } = require('../../hooks/useLocalData');
      useIndividuals.mockReturnValue({
        data: [],
        isLoading: true,
        error: null,
      });

      render(
        <TestWrapper>
          <UserPicker
            selectedUserId={null}
            onUserChange={mockOnUserChange}
            multiSelect={false}
          />
        </TestWrapper>
      );

      expect(screen.getByText('Loading')).toBeInTheDocument();
    });

    it('shows error state', () => {
      const { useIndividuals } = require('../../hooks/useLocalData');
      useIndividuals.mockReturnValue({
        data: [],
        isLoading: false,
        error: new Error('Failed to load'),
      });

      render(
        <TestWrapper>
          <UserPicker
            selectedUserId={null}
            onUserChange={mockOnUserChange}
            multiSelect={false}
          />
        </TestWrapper>
      );

      expect(screen.getByText('Error')).toBeInTheDocument();
    });
  });
});
