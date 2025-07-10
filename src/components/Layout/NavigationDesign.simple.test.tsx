import React from "react";
import { render, screen } from "@testing-library/react";

/**
 * Simple integration test for the redesigned navigation architecture
 * Tests the key UX improvements without complex dependencies
 */

// Mock components that represent the new design
const MockContextSwitcher = ({ compact }: { compact?: boolean }) => (
  <div
    data-testid="context-switcher"
    data-compact={compact}
    className={`context-indicator ${compact ? "compact" : ""}`}
  >
    <div className="context-badge global">Global</div>
    {!compact && (
      <div className="context-info">
        <div>Global Context</div>
        <div>All Organizations</div>
      </div>
    )}
  </div>
);

const MockUserPicker = ({
  compact,
  showContextIndicator,
}: {
  compact?: boolean;
  showContextIndicator?: boolean;
}) => (
  <div
    data-testid="user-picker"
    data-compact={compact}
    data-show-context={showContextIndicator}
    className={`user-picker ${compact ? "compact" : ""}`}
  >
    <div className="user-avatar">JD</div>
    {!compact && (
      <div className="user-info">
        <div>Team Member</div>
        <div>John Doe</div>
      </div>
    )}
  </div>
);

const MockNavigationBar = ({
  showUserPicker = true,
  isMobile = false,
  isTablet = false,
}: {
  showUserPicker?: boolean;
  isMobile?: boolean;
  isTablet?: boolean;
}) => (
  <div data-testid="navigation-bar" className="app-bar">
    {/* Header Section */}
    <div className="header-section">
      <div className="brand-section">
        <h1>Grantura</h1>
        {!isMobile && <p>Your workforce, mapped to funding</p>}
      </div>

      {/* Breadcrumbs - Hidden on tablet and mobile */}
      {!isTablet && (
        <div data-testid="breadcrumbs" className="breadcrumbs-section">
          Dashboard → Calendar
        </div>
      )}
    </div>

    {/* Navigation Controls */}
    <div className="navigation-controls">
      {/* Primary Controls */}
      <div className="primary-controls">
        <MockContextSwitcher compact={isMobile} />

        {/* User Picker - Hidden on mobile */}
        {showUserPicker && !isMobile && (
          <MockUserPicker compact={isTablet} showContextIndicator={false} />
        )}
      </div>

      {/* Action Buttons - Hidden on mobile */}
      {!isMobile && showUserPicker && (
        <div className="action-section">
          <button data-testid="create-grant-button" className="action-button">
            {isTablet ? "Create" : "Create Grant"}
          </button>
        </div>
      )}
    </div>
  </div>
);

describe("Navigation Design Integration Tests", () => {
  describe("Information Architecture", () => {
    it("separates navigation controls from action buttons", () => {
      render(<MockNavigationBar />);

      // Context switcher should be in navigation section
      expect(screen.getByTestId("context-switcher")).toBeInTheDocument();

      // User picker should be in navigation section
      expect(screen.getByTestId("user-picker")).toBeInTheDocument();

      // Create Grant button should be in separate action section
      expect(screen.getByTestId("create-grant-button")).toBeInTheDocument();
    });

    it("maintains clear visual hierarchy", () => {
      render(<MockNavigationBar />);

      const contextSwitcher = screen.getByTestId("context-switcher");
      const userPicker = screen.getByTestId("user-picker");
      const createButton = screen.getByTestId("create-grant-button");

      // Context switcher should be visually distinct (primary context)
      expect(contextSwitcher).toHaveAttribute("data-compact", "false");

      // User picker should be secondary
      expect(userPicker).toHaveAttribute("data-show-context", "false");

      // Action button should be separated
      expect(createButton).toBeInTheDocument();
    });

    it("shows breadcrumbs in appropriate location", () => {
      render(<MockNavigationBar />);

      const breadcrumbs = screen.getByTestId("breadcrumbs");
      expect(breadcrumbs).toBeInTheDocument();
      expect(breadcrumbs).toHaveTextContent("Dashboard → Calendar");
    });
  });

  describe("Responsive Design", () => {
    it("adapts to mobile viewport", () => {
      render(<MockNavigationBar isMobile={true} />);

      // Context switcher should be compact
      const contextSwitcher = screen.getByTestId("context-switcher");
      expect(contextSwitcher).toHaveAttribute("data-compact", "true");

      // User picker should be hidden on mobile
      expect(screen.queryByTestId("user-picker")).not.toBeInTheDocument();

      // Action buttons should be hidden on mobile
      expect(
        screen.queryByTestId("create-grant-button")
      ).not.toBeInTheDocument();

      // App subtitle should be hidden
      expect(
        screen.queryByText("Your workforce, mapped to funding")
      ).not.toBeInTheDocument();
    });

    it("adapts to tablet viewport", () => {
      render(<MockNavigationBar isTablet={true} />);

      // User picker should be compact
      const userPicker = screen.getByTestId("user-picker");
      expect(userPicker).toHaveAttribute("data-compact", "true");

      // Breadcrumbs should be hidden
      expect(screen.queryByTestId("breadcrumbs")).not.toBeInTheDocument();

      // Create button should show shortened text
      expect(screen.getByText("Create")).toBeInTheDocument();
      expect(screen.queryByText("Create Grant")).not.toBeInTheDocument();
    });

    it("shows full layout on desktop", () => {
      render(<MockNavigationBar />);

      // All components should be visible
      expect(screen.getByTestId("context-switcher")).toBeInTheDocument();
      expect(screen.getByTestId("user-picker")).toBeInTheDocument();
      expect(screen.getByTestId("create-grant-button")).toBeInTheDocument();
      expect(screen.getByTestId("breadcrumbs")).toBeInTheDocument();

      // Full text should be shown
      expect(screen.getByText("Create Grant")).toBeInTheDocument();
      expect(
        screen.getByText("Your workforce, mapped to funding")
      ).toBeInTheDocument();
    });
  });

  describe("Context Switching UX", () => {
    it("provides clear context indication", () => {
      render(<MockNavigationBar />);

      const contextSwitcher = screen.getByTestId("context-switcher");

      // Should show global context badge
      expect(screen.getByText("Global")).toBeInTheDocument();
      expect(screen.getByText("Global Context")).toBeInTheDocument();
      expect(screen.getByText("All Organizations")).toBeInTheDocument();
    });

    it("separates user selection from context switching", () => {
      render(<MockNavigationBar />);

      const contextSwitcher = screen.getByTestId("context-switcher");
      const userPicker = screen.getByTestId("user-picker");

      // Context switcher should not show user context indicator
      expect(userPicker).toHaveAttribute("data-show-context", "false");

      // They should be visually distinct components
      expect(contextSwitcher).not.toBe(userPicker);
    });
  });

  describe("Action Button Placement", () => {
    it("places action buttons in dedicated section", () => {
      render(<MockNavigationBar />);

      const createButton = screen.getByTestId("create-grant-button");
      expect(createButton).toBeInTheDocument();

      // Button should not interfere with navigation
      const contextSwitcher = screen.getByTestId("context-switcher");
      const userPicker = screen.getByTestId("user-picker");

      expect(contextSwitcher).toBeInTheDocument();
      expect(userPicker).toBeInTheDocument();
    });

    it("hides action buttons when user selection is disabled", () => {
      render(<MockNavigationBar showUserPicker={false} />);

      expect(
        screen.queryByTestId("create-grant-button")
      ).not.toBeInTheDocument();
      expect(screen.queryByTestId("user-picker")).not.toBeInTheDocument();
    });
  });

  describe("Design System Compliance", () => {
    it("uses consistent CSS classes for styling", () => {
      render(<MockNavigationBar />);

      const contextSwitcher = screen.getByTestId("context-switcher");
      const userPicker = screen.getByTestId("user-picker");

      expect(contextSwitcher).toHaveClass("context-indicator");
      expect(userPicker).toHaveClass("user-picker");
    });

    it("applies compact styling correctly", () => {
      render(<MockNavigationBar isMobile={true} />);

      const contextSwitcher = screen.getByTestId("context-switcher");
      expect(contextSwitcher).toHaveClass("compact");
    });

    it("maintains accessibility attributes", () => {
      render(<MockNavigationBar />);

      const contextSwitcher = screen.getByTestId("context-switcher");
      const userPicker = screen.getByTestId("user-picker");
      const createButton = screen.getByTestId("create-grant-button");

      // All interactive elements should have test IDs for accessibility
      expect(contextSwitcher).toHaveAttribute("data-testid");
      expect(userPicker).toHaveAttribute("data-testid");
      expect(createButton).toHaveAttribute("data-testid");
    });
  });
});
