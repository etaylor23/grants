// Grant Dashboard specific types and interfaces

export type CostType = 'Staff' | 'Overheads' | 'Materials' | 'Capital' | 'Travel' | 'Other';

export type PeriodType = 'monthly' | 'quarterly';

export interface PeriodColumn {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  value: number;
}

export interface CostTypeRow {
  costType: CostType;
  totalClaimableAmount: number;
  periodColumns: PeriodColumn[];
  totalForTimePeriod: number;
  totalClaimed: number;
}

export interface GrantDashboardData {
  grantId: string;
  grantTitle: string;
  costTypeRows: CostTypeRow[];
  periodType: PeriodType;
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

export interface GrantCalculationInput {
  grantId: string;
  timeSlots: Array<{
    userId: string;
    date: string;
    grantId: string;
    hoursAllocated: number;
  }>;
  individuals: Array<{
    PK: string;
    AnnualGross: number;
  }>;
  periodType: PeriodType;
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

export interface PeriodCalculationResult {
  periodId: string;
  periodLabel: string;
  startDate: string;
  endDate: string;
  totalHours: number;
  totalValue: number;
}

export interface CostTypeCalculationResult {
  costType: CostType;
  periods: PeriodCalculationResult[];
  totalHours: number;
  totalValue: number;
}

// Default cost types with initial zero values
export const DEFAULT_COST_TYPES: CostType[] = [
  'Staff',
  'Overheads', 
  'Materials',
  'Capital',
  'Travel',
  'Other'
];

// Helper function to create empty cost type row
export const createEmptyCostTypeRow = (costType: CostType): CostTypeRow => ({
  costType,
  totalClaimableAmount: 0,
  periodColumns: [],
  totalForTimePeriod: 0,
  totalClaimed: 0,
});
