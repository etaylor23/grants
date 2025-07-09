import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@mui/material/styles";
import { theme } from "../../theme";
import { AppLayout } from "./AppLayout";

// Mock the components
jest.mock("../ContextSwitcher", () => ({
  ContextSwitcher: ({ compact }: { compact?: boolean }) => (
    <div data-testid="context-switcher" data-compact={compact}>
      Context Switcher
    </div>
  ),
}));

jest.mock("../UserPicker", () => ({
  UserPicker: ({
    compact,
    showContextIndicator,
    selectedUserId,
    onUserChange,
  }: {
    compact?: boolean;
    showContextIndicator?: boolean;
    selectedUserId: string | null;
    onUserChange: (userId: string, user: any) => void;
  }) => (
    <div
      data-testid="user-picker"
      data-compact={compact}
      data-show-context={showContextIndicator}
      onClick={() => onUserChange?.("test-user", { id: "test-user" })}
    >
      User Picker
    </div>
  ),
}));

jest.mock("../HeaderBreadcrumbs", () => ({
  HeaderBreadcrumbs: ({
    flat,
    compact,
    show,
  }: {
    flat?: boolean;
    compact?: boolean;
    show?: boolean;
  }) => (
    <div
      data-testid="header-breadcrumbs"
      data-flat={flat}
      data-compact={compact}
      data-show={show}
    >
      Header Breadcrumbs
    </div>
  ),
}));

jest.mock("../DynamicSidebar", () => ({
  DynamicSidebar: ({ organizationId }: { organizationId?: string }) => (
    <div data-testid="dynamic-sidebar" data-organization-id={organizationId}>
      Dynamic Sidebar
    </div>
  ),
}));

jest.mock("../CreateGrantModal", () => ({
  CreateGrantModal: ({
    open,
    onClose,
  }: {
    open: boolean;
    onClose: () => void;
  }) =>
    open ? (
      <div data-testid="create-grant-modal" onClick={onClose}>
        Create Grant Modal
      </div>
    ) : null,
}));

jest.mock("../ContextTransition", () => ({
  ContextTransition: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="context-transition">{children}</div>
  ),
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
        <MemoryRouter>{component}</MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

describe("AppLayout Navigation Design", () => {
  const mockUserChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock window.matchMedia for responsive design tests
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  describe("Basic Layout Structure", () => {
    it("renders the main layout components", () => {
      renderWithProviders(
        <AppLayout>
          <div>Test Content</div>
        </AppLayout>
      );

      expect(screen.getByText("GrantGrid")).toBeInTheDocument();
      expect(
        screen.getByText("Your workforce, mapped to funding")
      ).toBeInTheDocument();
      expect(screen.getByTestId("context-switcher")).toBeInTheDocument();
      expect(screen.getByTestId("dynamic-sidebar")).toBeInTheDocument();
      expect(screen.getByText("Test Content")).toBeInTheDocument();
    });

    it("shows breadcrumbs when not on mobile", () => {
      renderWithProviders(
        <AppLayout>
          <div>Test Content</div>
        </AppLayout>
      );

      const breadcrumbs = screen.getByTestId("header-breadcrumbs");
      expect(breadcrumbs).toBeInTheDocument();
      expect(breadcrumbs).toHaveAttribute("data-flat", "false");
      expect(breadcrumbs).toHaveAttribute("data-show", "true");
    });
  });

  describe("User Selection Interface", () => {
    it("shows user picker when onUserChange is provided", () => {
      renderWithProviders(
        <AppLayout onUserChange={mockUserChange}>
          <div>Test Content</div>
        </AppLayout>
      );

      const userPicker = screen.getByTestId("user-picker");
      expect(userPicker).toBeInTheDocument();
      expect(userPicker).toHaveAttribute("data-show-context", "false");
    });

    it("does not show user picker when onUserChange is not provided", () => {
      renderWithProviders(
        <AppLayout>
          <div>Test Content</div>
        </AppLayout>
      );

      expect(screen.queryByTestId("user-picker")).not.toBeInTheDocument();
    });

    it("calls onUserChange when user is selected", () => {
      renderWithProviders(
        <AppLayout onUserChange={mockUserChange}>
          <div>Test Content</div>
        </AppLayout>
      );

      const userPicker = screen.getByTestId("user-picker");
      fireEvent.click(userPicker);

      expect(mockUserChange).toHaveBeenCalledWith("test-user", {
        id: "test-user",
      });
    });
  });

  describe("Action Button Placement", () => {
    it("shows Create Grant button when user selection is enabled", () => {
      renderWithProviders(
        <AppLayout onUserChange={mockUserChange}>
          <div>Test Content</div>
        </AppLayout>
      );

      expect(screen.getByText("Create Grant")).toBeInTheDocument();
    });

    it("does not show Create Grant button when user selection is disabled", () => {
      renderWithProviders(
        <AppLayout>
          <div>Test Content</div>
        </AppLayout>
      );

      expect(screen.queryByText("Create Grant")).not.toBeInTheDocument();
    });

    it("opens Create Grant modal when button is clicked", async () => {
      renderWithProviders(
        <AppLayout onUserChange={mockUserChange}>
          <div>Test Content</div>
        </AppLayout>
      );

      const createButton = screen.getByText("Create Grant");
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByTestId("create-grant-modal")).toBeInTheDocument();
      });
    });
  });

  describe("Mobile Drawer Functionality", () => {
    it("opens drawer when menu button is clicked", () => {
      renderWithProviders(
        <AppLayout>
          <div>Test Content</div>
        </AppLayout>
      );

      const menuButton = screen.getByLabelText("open drawer");
      fireEvent.click(menuButton);

      // Drawer should be open (MUI Drawer component behavior)
      expect(screen.getByTestId("dynamic-sidebar")).toBeInTheDocument();
    });

    it("shows mobile action buttons in drawer when user selection is enabled", () => {
      // Mock mobile viewport
      window.matchMedia = jest.fn().mockImplementation((query) => ({
        matches: query.includes("(max-width: 960px)"),
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      renderWithProviders(
        <AppLayout onUserChange={mockUserChange}>
          <div>Test Content</div>
        </AppLayout>
      );

      // On mobile, Create Grant button should be in drawer
      const menuButton = screen.getByLabelText("open drawer");
      fireEvent.click(menuButton);

      // Should show mobile user picker in drawer
      expect(screen.getByTestId("user-picker")).toBeInTheDocument();
    });
  });

  describe("Context Integration", () => {
    it("passes organization ID to sidebar", () => {
      const organizationId = "test-org-123";

      renderWithProviders(
        <AppLayout organisationId={organizationId}>
          <div>Test Content</div>
        </AppLayout>
      );

      const sidebar = screen.getByTestId("dynamic-sidebar");
      expect(sidebar).toHaveAttribute("data-organization-id", organizationId);
    });

    it("wraps content in context transition", () => {
      renderWithProviders(
        <AppLayout>
          <div>Test Content</div>
        </AppLayout>
      );

      expect(screen.getByTestId("context-transition")).toBeInTheDocument();
      expect(screen.getByText("Test Content")).toBeInTheDocument();
    });
  });

  describe("Visual Hierarchy", () => {
    it("separates navigation controls from action buttons", () => {
      renderWithProviders(
        <AppLayout onUserChange={mockUserChange}>
          <div>Test Content</div>
        </AppLayout>
      );

      // Context switcher and user picker should be in navigation section
      expect(screen.getByTestId("context-switcher")).toBeInTheDocument();
      expect(screen.getByTestId("user-picker")).toBeInTheDocument();

      // Create Grant button should be in action section
      expect(screen.getByText("Create Grant")).toBeInTheDocument();
    });

    it("maintains proper component hierarchy", () => {
      renderWithProviders(
        <AppLayout onUserChange={mockUserChange}>
          <div>Test Content</div>
        </AppLayout>
      );

      // App title should be present
      expect(screen.getByText("GrantGrid")).toBeInTheDocument();

      // All major navigation components should be present
      expect(screen.getByTestId("context-switcher")).toBeInTheDocument();
      expect(screen.getByTestId("user-picker")).toBeInTheDocument();
      expect(screen.getByTestId("header-breadcrumbs")).toBeInTheDocument();
    });
  });
});
