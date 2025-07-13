# Timesheet-Calendar Relationship Analysis

## Current State Analysis

### Current Architecture Overview

The current system has a **calendar-driven timesheet model** where:

1. **Calendar entries (workdays) gate timesheet availability**
2. **Workday hours must exist before timesheet allocation is possible**
3. **Calendar views display aggregated timesheet data**

### Key Components and Data Flow

#### 1. Data Models (grants/src/db/schema.ts)

**WorkdayHours Table:**

```typescript
interface WorkdayHours {
  PK: string; // UserID
  SK: string; // "WORKDAY_HOURS#YYYY"
  Hours: Record<string, number>; // { "2025-01-15": 8, "2025-01-16": 8 }
}
```

**TimeSlot Table:**

```typescript
interface TimeSlot {
  PK: string; // UserID
  SK: string; // "YYYY-MM-DD#GrantID"
  AllocationPercent: number; // 0-100 range
  HoursAllocated: number; // Raw hours
  Date: string; // ISO date
  GrantID: string;
  UserID: string;
}
```

#### 2. Current Validation Logic

**TimesheetModal.tsx (Lines 47-53):**

```typescript
// Filter out dates that are not workdays (these will be disabled)
const disabledDates = allDates
  .filter((date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return !workdays[dateStr] || workdays[dateStr] === 0;
  })
  .map((date) => format(date, "yyyy-MM-dd"));
```

**TimesheetGrid.tsx (Lines 436-460):**

```typescript
// Validate against maximum hours for the day
const maxHours =
  cell.maxHours || workdayHoursLookup[cell.date] || DEFAULT_WORKDAY_HOURS;

if (newValue + currentTotalHours > maxHours) {
  setError(
    `Cannot allocate ${newValue} hours. Maximum available: ${
      maxHours - currentTotalHours
    } hours for this day.`
  );
  return;
}
```

#### 3. Calendar-Driven Workday Creation

**LocalCalendarView.tsx (Lines 220-250):**

```typescript
const handleDateClick = async (info: any) => {
  const existingHours = workdayHours[dateStr];

  if (!existingHours || existingHours === 0) {
    // Create a default workday entry (8 hours)
    await db.workdayHours.put({
      PK: userId,
      SK: workdayHoursKey,
      Hours: { [dateStr]: 8 }, // Default 8 hours
    });
  }

  setTimesheetModalOpen(true);
};
```

### Current Calculation Functions

#### 1. Utilization Calculations (grants/src/utils/dateUtils.ts)

```typescript
export const calculateTotalAvailableHours = (
  workdayHoursLookup: Record<string, number>,
  periodDates: string[]
): number => {
  return periodDates.reduce(
    (total, date) => total + (workdayHoursLookup[date] || 0),
    0
  );
};

export const calculateAveragePercentage = (
  totalHoursWorked: number,
  totalAvailableHours: number
): number => {
  return totalAvailableHours > 0
    ? (totalHoursWorked / totalAvailableHours) * 100
    : 0;
};
```

#### 2. Grant Cost Calculations (grants/src/utils/grantCalculations.ts)

```typescript
export const calculateHourlyRate = (annualGross: number): number => {
  // Assuming 260 working days per year, 8 hours per day
  return annualGross / (260 * 8);
};

export const calculatePeriodTotals = (
  timeSlots: Array<{...}>,
  individuals: Array<{...}>,
  grantId: string,
  periodStart: Date,
  periodEnd: Date
): { totalHours: number; totalValue: number }
```

## Problems with Current Architecture

### 1. Calendar Dependency Bottleneck

- **Issue:** Users must create calendar entries before they can allocate hours
- **Impact:** Workflow friction, especially for bulk time entry
- **Location:** TimesheetModal.tsx lines 47-53, TimesheetGrid.tsx validation

### 2. Rigid Workday Model

- **Issue:** No support for leave types (annual leave, sick leave)
- **Impact:** Cannot distinguish between work days and leave days
- **Location:** WorkdayHours schema only stores numeric hours

### 3. Calculation Assumptions

- **Issue:** All calculations assume workdays = available work time
- **Impact:** Utilization metrics don't account for legitimate leave
- **Location:** All calculation functions in dateUtils.ts and grantCalculations.ts

### 4. Manual Calendar Management

- **Issue:** Users must manually click calendar dates to create workdays
- **Impact:** Time-consuming setup, potential for missed days
- **Location:** LocalCalendarView.tsx handleDateClick

## Required Changes Summary

### 1. Data Model Extensions

- Add leave type support to WorkdayHours or create new LeaveEntry table
- Support leave types: Annual Leave, Sick Leave, Public Holiday, Other

### 2. Reverse Data Flow

- Remove calendar dependency from timesheet allocation
- Auto-generate workdays when hours are allocated
- Make timesheet the primary source of truth

### 3. Enhanced Calculations

- Update utilization calculations to account for leave types
- Distinguish between "available work time" and "total calendar time"
- Provide leave-adjusted metrics

### 4. UI Improvements

- Add leave type selection in timesheet interface
- Remove calendar creation requirement
- Auto-save timesheet changes to calendar

## Implementation Summary

### ✅ Completed Changes

#### 1. **Removed Calendar Entry Dependency**

- **TimesheetModal.tsx**: Eliminated disabled dates based on missing workday entries
- **TimesheetGrid.tsx**: Updated validation to use default hours when workday entries don't exist
- **LocalCalendarView.tsx**: Simplified date click handler to directly open timesheet

#### 2. **Implemented Reverse Data Flow**

- **useSaveSlots hook**: Added auto-generation of workday entries when timesheet hours are allocated
- **LocalCalendarView.tsx**: Calendar events now driven by timesheet allocations rather than manual workday creation
- **UnconstrainedCalendarView.tsx**: Updated to match new data flow pattern

#### 3. **Added Leave Type Support to Data Models**

- **schema.ts**: Extended WorkdayHours interface to support DayEntry with leave types
- **New Types**: LeaveType enum ('work', 'annual-leave', 'sick-leave', 'public-holiday', 'other')
- **Helper Functions**: Added backward-compatible functions for working with leave types
- **Auto-generation**: Workday entries now created as proper work day entries with leave type support

#### 4. **Implemented Leave Type UI Controls**

- **LeaveTypeSelector**: New component for selecting day types with hours and notes
- **DayTypeModal**: Modal dialog for editing individual day types
- **Calendar Integration**: Added "Edit Day Types" button to calendar views
- **useSaveWorkdayHours**: New hook for persisting leave type changes

#### 5. **Updated Calculation Logic for Leave Impact**

- **dateUtils.ts**: Added leave-aware calculation functions:
  - `calculateTotalAvailableWorkHours()`: Only counts work day hours
  - `calculateCapacityUtilization()`: Provides both work day and overall capacity metrics
  - `calculateLeaveDaysByType()`: Breaks down leave by type
- **TimesheetGrid.tsx**: Updated to use new calculation functions
- **LeaveImpactSummary**: New component showing detailed leave impact analysis

#### 6. **Enhanced Reporting and Analytics**

- **Leave Impact Tab**: Added to EnhancedTimesheetModal showing:
  - Work day utilization (excludes leave days)
  - Overall capacity utilization (includes leave impact)
  - Leave breakdown by type with visual indicators
  - Key insights and metrics
- **Backward Compatibility**: All legacy numeric workday entries still supported

### 🔧 Technical Implementation Details

#### Data Model Changes

```typescript
// Before: Simple numeric hours
Hours: Record<string, number>;

// After: Support for leave types
Hours: Record<string, number | DayEntry>;

interface DayEntry {
  hours: number;
  type: LeaveType;
  note?: string;
}
```

#### Calculation Improvements

```typescript
// Before: Simple utilization
utilization = hoursWorked / totalAvailableHours;

// After: Leave-aware utilization
workDayUtilization = hoursWorked / availableWorkHours;
overallCapacityUtilization = hoursWorked / theoreticalMaxHours;
```

#### Auto-Generation Logic

- When timesheet hours are allocated to any date
- System automatically creates workday entry if none exists
- Uses default 8-hour work day entry
- Maintains data consistency across calendar and timesheet views

### 🧪 Testing Recommendations

#### 1. **Data Migration Testing**

- Test with existing numeric workday entries (backward compatibility)
- Verify auto-generation works for new dates
- Ensure leave type data persists correctly

#### 2. **UI Workflow Testing**

- Calendar date clicking opens timesheet without requiring workday creation
- Leave type editing through DayTypeModal works correctly
- Leave impact summary shows accurate metrics

#### 3. **Calculation Accuracy Testing**

- Verify work day utilization excludes leave days
- Check overall capacity utilization includes leave impact
- Validate leave day counting by type

#### 4. **Edge Case Testing**

- Mixed legacy and new data formats
- Zero-hour work days vs. leave days
- Bulk timesheet operations with auto-generation

#### 5. **Performance Testing**

- Large datasets with many leave entries
- Calendar view rendering with timesheet-driven events
- Auto-generation performance during bulk operations

### 📋 Next Steps for Production

1. **Database Migration**: Plan migration strategy for existing workday data
2. **User Training**: Document new leave management features
3. **Monitoring**: Set up monitoring for auto-generation performance
4. **Feedback Collection**: Gather user feedback on new workflow
5. **Iterative Improvements**: Based on usage patterns and feedback
