import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import { GrantSelector } from "./GrantSelector";
import { theme } from "../../theme";
import { mockGrants } from "../../api/mockData";

const renderWithProviders = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

describe("GrantSelector", () => {
  const mockOnGrantChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders with no grant selected", () => {
    renderWithProviders(
      <GrantSelector selectedGrant={null} onGrantChange={mockOnGrantChange} />
    );

    expect(screen.getByLabelText("Select Grant")).toBeInTheDocument();
    expect(screen.getByDisplayValue("")).toBeInTheDocument();
  });

  it("renders with a grant selected", () => {
    const selectedGrant = mockGrants[0];
    renderWithProviders(
      <GrantSelector
        selectedGrant={selectedGrant}
        onGrantChange={mockOnGrantChange}
      />
    );

    expect(screen.getByDisplayValue(selectedGrant.id)).toBeInTheDocument();
  });

  it("calls onGrantChange when a grant is selected", () => {
    renderWithProviders(
      <GrantSelector selectedGrant={null} onGrantChange={mockOnGrantChange} />
    );

    const select = screen.getByLabelText("Select Grant");
    fireEvent.mouseDown(select);

    const option = screen.getByText(mockGrants[0].name);
    fireEvent.click(option);

    expect(mockOnGrantChange).toHaveBeenCalledWith(mockGrants[0]);
  });

  it("calls onGrantChange with null when empty option is selected", () => {
    const selectedGrant = mockGrants[0];
    renderWithProviders(
      <GrantSelector
        selectedGrant={selectedGrant}
        onGrantChange={mockOnGrantChange}
      />
    );

    const select = screen.getByLabelText("Select Grant");
    fireEvent.mouseDown(select);

    const emptyOption = screen.getByText("Select a grant to view");
    fireEvent.click(emptyOption);

    expect(mockOnGrantChange).toHaveBeenCalledWith(null);
  });

  it("displays all available grants as options", () => {
    renderWithProviders(
      <GrantSelector selectedGrant={null} onGrantChange={mockOnGrantChange} />
    );

    const select = screen.getByLabelText("Select Grant");
    fireEvent.mouseDown(select);

    mockGrants.forEach((grant) => {
      expect(screen.getByText(grant.name)).toBeInTheDocument();
    });
  });
});
