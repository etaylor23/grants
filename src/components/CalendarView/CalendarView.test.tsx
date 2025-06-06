import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { CalendarView } from './CalendarView';
import { theme } from '../../theme';

// Mock FullCalendar
jest.mock('@fullcalendar/react', () => {
  return function MockFullCalendar(props: any) {
    return (
      <div data-testid="fullcalendar">
        <button
          onClick={() => props.dateClick?.({ dateStr: '2024-01-15' })}
          data-testid="mock-date-click"
        >
          Mock Date Click
        </button>
        {props.events?.map((event: any, index: number) => (
          <div key={index} data-testid={`event-${index}`}>
            {event.title}
          </div>
        ))}
      </div>
    );
  };
});

// Mock API hooks
jest.mock('../../api/hooks', () => ({
  useWorkdays: () => ({
    data: {
      userId: 'user1',
      year: 2024,
      workdays: {
        '2024-01-15': true,
        '2024-01-16': true,
      },
    },
  }),
  useTimeSlots: () => ({
    data: [
      {
        userId: 'user1',
        date: '2024-01-15',
        grantId: 'grant1',
        allocationPercent: 50,
      },
      {
        userId: 'user1',
        date: '2024-01-15',
        grantId: 'grant2',
        allocationPercent: 25,
      },
    ],
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

describe('CalendarView', () => {
  it('renders calendar component', () => {
    renderWithProviders(<CalendarView userId="user1" />);
    
    expect(screen.getByText('Calendar View')).toBeInTheDocument();
    expect(screen.getByTestId('fullcalendar')).toBeInTheDocument();
  });

  it('calls onDateSelect when date is clicked', () => {
    const mockOnDateSelect = jest.fn();
    
    renderWithProviders(
      <CalendarView userId="user1" onDateSelect={mockOnDateSelect} />
    );
    
    fireEvent.click(screen.getByTestId('mock-date-click'));
    
    expect(mockOnDateSelect).toHaveBeenCalledWith('2024-01-15');
  });

  it('displays events for workdays with allocations', () => {
    renderWithProviders(<CalendarView userId="user1" />);
    
    // Should show event with 75% allocation (50% + 25%)
    expect(screen.getByText('75% allocated')).toBeInTheDocument();
  });
});
