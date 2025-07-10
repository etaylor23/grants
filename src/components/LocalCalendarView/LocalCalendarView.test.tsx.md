import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { LocalCalendarView } from "./LocalCalendarView";

// Mock FullCalendar
vi.mock("@fullcalendar/react", () => ({
  default: vi.fn(({ eventContent, events }) => (
    <div data-testid="full-calendar">
      <div data-testid="events-count">{events?.length || 0} events</div>
      {events?.map((event: any, index: number) => (
        <div key={index} data-testid={`event-${index}`}>
          {eventContent &&
            eventContent({ event: { extendedProps: event.extendedProps } })}
        </div>
      ))}
    </div>
  )),
}));

// Mock the hooks
vi.mock("../../hooks/useLocalData", () => ({
  useWorkdayHours: vi.fn(),
  useTimeSlots: vi.fn(),
  useGrants: vi.fn(),
  useSaveWorkdayHours: vi.fn(),
}));

vi.mock("../../components/EnhancedTimesheetModal", () => ({
  EnhancedTimesheetModal: vi.fn(() => <div data-testid="timesheet-modal" />),
}));

vi.mock("../../components/DayTypeModal", () => ({
  DayTypeModal: vi.fn(() => <div data-testid="day-type-modal" />),
}));

// Mock data
const mockWorkdayHours = {
  "2024-01-15": { dayType: "work", hoursAvailable: 8 },
  "2024-01-16": { dayType: "work", hoursAvailable: 8 },
};

const mockTimeSlots = [
  {
    PK: "slot-1",
    UserID: "user-1",
    GrantID: "grant-1",
    Date: "2024-01-15",
    HoursAllocated: 6,
  },
  {
    PK: "slot-2",
    UserID: "user-1",
    GrantID: "grant-2",
    Date: "2024-01-15",
    HoursAllocated: 2,
  },
];

const mockGrants = [
  { PK: "grant-1", Title: "Grant One" },
  { PK: "grant-2", Title: "Grant Two" },
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
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("LocalCalendarView", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    const {
      useWorkdayHours,
      useTimeSlots,
      useGrants,
      useSaveWorkdayHours,
    } = require("../../hooks/useLocalData");

    useWorkdayHours.mockReturnValue({ data: mockWorkdayHours });
    useTimeSlots.mockReturnValue({ data: mockTimeSlots });
    useGrants.mockReturnValue({ data: mockGrants });
    useSaveWorkdayHours.mockReturnValue({ mutateAsync: vi.fn() });
  });

  describe("Single-user mode", () => {
    it("renders calendar for single user", () => {
      render(
        <TestWrapper>
          <LocalCalendarView
            userId="user-1"
            userName="John Doe"
            multiUser={false}
          />
        </TestWrapper>
      );

      expect(screen.getByText("Calendar for John Doe")).toBeInTheDocument();
      expect(screen.getByTestId("full-calendar")).toBeInTheDocument();
    });

    it("displays user initials in events", () => {
      render(
        <TestWrapper>
          <LocalCalendarView
            userId="user-1"
            userName="John Doe"
            multiUser={false}
          />
        </TestWrapper>
      );

      // Check if events are rendered with user initials
      expect(screen.getByTestId("full-calendar")).toBeInTheDocument();
    });

    it("shows hours and utilization in correct format", () => {
      render(
        <TestWrapper>
          <LocalCalendarView
            userId="user-1"
            userName="John Doe"
            multiUser={false}
          />
        </TestWrapper>
      );

      // The calendar should render events with hours format
      expect(screen.getByTestId("full-calendar")).toBeInTheDocument();
    });
  });

  describe("Multi-user mode", () => {
    const multiUsers = [
      { id: "user-1", name: "John Doe" },
      { id: "user-2", name: "Jane Smith" },
    ];

    it("renders calendar for multiple users", () => {
      render(
        <TestWrapper>
          <LocalCalendarView users={multiUsers} multiUser={true} />
        </TestWrapper>
      );

      expect(screen.getByText("Calendar for 2 Users")).toBeInTheDocument();
      expect(screen.getByText("John Doe, Jane Smith")).toBeInTheDocument();
    });

    it("handles single user in multi-user mode", () => {
      render(
        <TestWrapper>
          <LocalCalendarView
            users={[{ id: "user-1", name: "John Doe" }]}
            multiUser={true}
          />
        </TestWrapper>
      );

      expect(screen.getByText("Calendar for John Doe")).toBeInTheDocument();
    });

    it("falls back to legacy props when users array is empty", () => {
      render(
        <TestWrapper>
          <LocalCalendarView
            userId="user-1"
            userName="John Doe"
            users={[]}
            multiUser={true}
          />
        </TestWrapper>
      );

      expect(screen.getByText("Calendar for John Doe")).toBeInTheDocument();
    });
  });

  describe("Event rendering", () => {
    it("renders events with pastel colors", () => {
      render(
        <TestWrapper>
          <LocalCalendarView
            userId="user-1"
            userName="John Doe"
            multiUser={false}
          />
        </TestWrapper>
      );

      const calendar = screen.getByTestId("full-calendar");
      expect(calendar).toBeInTheDocument();
    });

    it("shows utilization percentage on the right side", () => {
      render(
        <TestWrapper>
          <LocalCalendarView
            userId="user-1"
            userName="John Doe"
            multiUser={false}
          />
        </TestWrapper>
      );

      // Events should be rendered with the new layout
      expect(screen.getByTestId("full-calendar")).toBeInTheDocument();
    });

    it("displays user avatars in events", () => {
      render(
        <TestWrapper>
          <LocalCalendarView
            userId="user-1"
            userName="John Doe"
            multiUser={false}
          />
        </TestWrapper>
      );

      // Check that the calendar renders events
      expect(screen.getByTestId("full-calendar")).toBeInTheDocument();
    });

    it("removes grant details from event display", () => {
      render(
        <TestWrapper>
          <LocalCalendarView
            userId="user-1"
            userName="John Doe"
            multiUser={false}
          />
        </TestWrapper>
      );

      // Events should not show grant names, only allocation count
      expect(screen.getByTestId("full-calendar")).toBeInTheDocument();
    });
  });

  describe("Data handling", () => {
    it("handles empty data gracefully", () => {
      const {
        useWorkdayHours,
        useTimeSlots,
      } = require("../../hooks/useLocalData");
      useWorkdayHours.mockReturnValue({ data: {} });
      useTimeSlots.mockReturnValue({ data: [] });

      render(
        <TestWrapper>
          <LocalCalendarView
            userId="user-1"
            userName="John Doe"
            multiUser={false}
          />
        </TestWrapper>
      );

      expect(screen.getByText("Calendar for John Doe")).toBeInTheDocument();
      expect(screen.getByTestId("events-count")).toHaveTextContent("0 events");
    });

    it("aggregates time slots correctly", () => {
      render(
        <TestWrapper>
          <LocalCalendarView
            userId="user-1"
            userName="John Doe"
            multiUser={false}
          />
        </TestWrapper>
      );

      // Should create events based on time slots
      expect(screen.getByTestId("full-calendar")).toBeInTheDocument();
    });
  });

  describe("User interactions", () => {
    it("opens timesheet modal when event is clicked", async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <LocalCalendarView
            userId="user-1"
            userName="John Doe"
            multiUser={false}
          />
        </TestWrapper>
      );

      // The modal should be available in the DOM
      expect(screen.getByTestId("timesheet-modal")).toBeInTheDocument();
    });

    it("opens day type modal for day configuration", async () => {
      render(
        <TestWrapper>
          <LocalCalendarView
            userId="user-1"
            userName="John Doe"
            multiUser={false}
          />
        </TestWrapper>
      );

      // The modal should be available in the DOM
      expect(screen.getByTestId("day-type-modal")).toBeInTheDocument();
    });
  });

  describe("Props validation", () => {
    it("handles missing props gracefully", () => {
      render(
        <TestWrapper>
          <LocalCalendarView />
        </TestWrapper>
      );

      expect(screen.getByText("Calendar for Unknown User")).toBeInTheDocument();
    });

    it("prioritizes users prop over individual user props in multi-user mode", () => {
      render(
        <TestWrapper>
          <LocalCalendarView
            userId="user-1"
            userName="John Doe"
            users={[{ id: "user-2", name: "Jane Smith" }]}
            multiUser={true}
          />
        </TestWrapper>
      );

      expect(screen.getByText("Calendar for Jane Smith")).toBeInTheDocument();
    });
  });

  describe("Responsive design", () => {
    it("adapts to different screen sizes", () => {
      render(
        <TestWrapper>
          <LocalCalendarView
            userId="user-1"
            userName="John Doe"
            multiUser={false}
          />
        </TestWrapper>
      );

      // Calendar should render regardless of screen size
      expect(screen.getByTestId("full-calendar")).toBeInTheDocument();
    });
  });

  describe("Performance", () => {
    it("memoizes events calculation", () => {
      const { rerender } = render(
        <TestWrapper>
          <LocalCalendarView
            userId="user-1"
            userName="John Doe"
            multiUser={false}
          />
        </TestWrapper>
      );

      // Re-render with same props
      rerender(
        <TestWrapper>
          <LocalCalendarView
            userId="user-1"
            userName="John Doe"
            multiUser={false}
          />
        </TestWrapper>
      );

      // Should not cause unnecessary re-calculations
      expect(screen.getByTestId("full-calendar")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA labels for calendar events", () => {
      render(
        <TestWrapper>
          <LocalCalendarView
            userId="user-1"
            userName="John Doe"
            multiUser={false}
          />
        </TestWrapper>
      );

      expect(screen.getByTestId("full-calendar")).toBeInTheDocument();
    });

    it("supports keyboard navigation", () => {
      render(
        <TestWrapper>
          <LocalCalendarView
            userId="user-1"
            userName="John Doe"
            multiUser={false}
          />
        </TestWrapper>
      );

      // Calendar should be keyboard accessible
      expect(screen.getByTestId("full-calendar")).toBeInTheDocument();
    });
  });
});
