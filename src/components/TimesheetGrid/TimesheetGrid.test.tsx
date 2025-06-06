import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { TimesheetGrid } from './TimesheetGrid';
import { theme } from '../../theme';

// Mock ReactGrid
jest.mock('@silevis/reactgrid', () => ({
  ReactGrid: ({ rows, columns, onCellsChanged }: any) => (
    <div data-testid="react-grid">
      <table>
        <thead>
          <tr>
            {columns.map((col: any) => (
              <th key={col.columnId}>{col.columnId}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row: any) => (
            <tr key={row.rowId}>
              {row.cells.map((cell: any, index: number) => (
                <td key={index}>
                  {cell.type === 'number' ? (
                    <input
                      type="number"
                      value={cell.value || 0}
                      onChange={(e) => {
                        const newCell = { ...cell, value: parseInt(e.target.value) || 0 };
                        onCellsChanged?.([{
                          rowId: row.rowId,
                          columnId: columns[index].columnId,
                          newCell,
                        }]);
                      }}
                      data-testid={`cell-${row.rowId}-${index}`}
                    />
                  ) : (
                    cell.text || cell.value
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ),
}));

// Mock API hooks
const mockMutateAsync = jest.fn();
jest.mock('../../api/hooks', () => ({
  useTimeSlots: () => ({
    data: [
      {
        userId: 'user1',
        date: '2024-01-15',
        grantId: 'grant1',
        allocationPercent: 50,
      },
    ],
    refetch: jest.fn(),
  }),
  useBatchUpdateTimeSlots: () => ({
    mutateAsync: mockMutateAsync,
  }),
}));

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        {component}
      </ThemeProvider>
    </QueryClientProvider>
  );
};

describe('TimesheetGrid', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders timesheet grid component', () => {
    renderWithProviders(<TimesheetGrid userId="user1" />);
    
    expect(screen.getByText(/Timesheet Grid/)).toBeInTheDocument();
    expect(screen.getByTestId('react-grid')).toBeInTheDocument();
  });

  it('handles cell value changes', async () => {
    mockMutateAsync.mockResolvedValue(undefined);
    
    renderWithProviders(<TimesheetGrid userId="user1" />);
    
    const input = screen.getByTestId('cell-grant1-1');
    fireEvent.change(input, { target: { value: '75' } });
    
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.arrayContaining([
            expect.objectContaining({
              userId: 'user1',
              allocationPercent: 75,
            }),
          ]),
        })
      );
    });
  });

  it('shows error message when update fails', async () => {
    mockMutateAsync.mockRejectedValue({
      message: 'Total allocation would exceed 100%',
      code: 'ALLOCATION_EXCEEDED',
    });
    
    renderWithProviders(<TimesheetGrid userId="user1" />);
    
    const input = screen.getByTestId('cell-grant1-1');
    fireEvent.change(input, { target: { value: '150' } });
    
    await waitFor(() => {
      expect(screen.getByText('Total allocation would exceed 100%')).toBeInTheDocument();
    });
  });
});
