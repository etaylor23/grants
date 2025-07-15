# Costs Feature Documentation

## Overview

The Costs feature extends the grants application to track non-staff expenses alongside existing staff cost tracking. This feature provides comprehensive cost management capabilities for grant projects, including data entry, validation, calculations, and reporting.

## Architecture

### Database Schema

The costs feature uses IndexedDB with DynamoDB-compatible schema design:

```typescript
interface Cost {
  PK: string;              // Cost ID (e.g., "C-12345")
  GrantID: string;         // References Grant.PK
  Type: CostType;          // Materials, Travel, etc.
  Name: string;            // Cost item name
  Description: string;     // Detailed description
  Amount: number;          // Amount in pence for precision
  InvoiceDate: string;     // ISO date format
  CreatedDate: string;     // Creation timestamp
  OrganisationID: string;  // References Organisation.PK
}
```

### Supported Cost Types

- **Materials**: Raw materials, supplies, equipment
- **Subcontractors**: External contractor costs
- **Travel**: Business travel expenses
- **Overheads**: Indirect costs and overhead expenses
- **Capital**: Capital equipment and infrastructure

## Components

### CostsGrid

The main component for cost data entry and management.

**Features:**
- ReactGrid-based interface for spreadsheet-like editing
- Real-time validation with user-friendly error messages
- Auto-save functionality with debounced updates
- Add/delete cost entries
- Dropdown selection for cost types
- Date picker for invoice dates
- Amount validation (prevents negative values, enforces limits)

**Usage:**
```tsx
<CostsGrid
  grantId="G-12345"
  organisationId="ORG-001"
  title="Grant Costs Management"
  showCard={true}
/>
```

### GrantDashboardTable (Enhanced)

Extended to include non-staff costs in grant analysis.

**New Features:**
- Displays all cost types including non-staff costs
- Period-based cost aggregation
- Drill-down modal for detailed cost breakdowns
- Integrated calculations combining staff and non-staff costs

### CostDrillDownModal (Enhanced)

Modal component for detailed cost analysis.

**Features:**
- Separate views for staff vs. non-staff costs
- Period-filtered cost details
- Summary totals and statistics
- Responsive table layout

## Data Hooks

### useCosts
Fetches costs with optional filtering by grant and organisation.

```typescript
const { data: costs, isLoading, error, refetch } = useCosts(grantId, organisationId);
```

### useCreateCost
Creates new cost entries with validation.

```typescript
const createCost = useCreateCost();
await createCost.mutateAsync({
  grantId: "G-12345",
  type: "Materials",
  name: "Laboratory Equipment",
  description: "Microscope for research",
  amount: 150000, // £1,500.00 in pence
  invoiceDate: "2024-01-15",
  organisationId: "ORG-001"
});
```

### useUpdateCost
Updates existing cost entries.

```typescript
const updateCost = useUpdateCost();
await updateCost.mutateAsync({
  costId: "C-12345",
  name: "Updated Name",
  amount: 200000
});
```

### useDeleteCost
Deletes cost entries.

```typescript
const deleteCost = useDeleteCost();
await deleteCost.mutateAsync("C-12345");
```

## Calculations

### Cost Period Totals
Calculates total costs for specific periods and cost types.

```typescript
const { totalValue } = calculateCostsPeriodTotals(
  costs,
  grantId,
  costType,
  periodStart,
  periodEnd
);
```

### Integrated Cost Type Results
Combines staff and non-staff costs for comprehensive grant analysis.

```typescript
const results = calculateCostTypeResults({
  grantId,
  timeSlots,
  individuals,
  costs,
  periodType: "monthly",
  dateRange: { startDate, endDate }
});
```

## Validation Rules

### Required Fields
- **Name**: Must be non-empty, max 100 characters
- **Type**: Must be one of the supported cost types
- **Amount**: Must be non-negative, max £1,000,000
- **Invoice Date**: Must be valid date, max 1 year in future

### Optional Fields
- **Description**: Max 500 characters

### Business Rules
- Grant ID and Organisation ID are required for all operations
- Amounts are stored in pence for precision
- Invoice dates cannot be more than 1 year in the future
- Cost names must be unique within a grant (enforced at UI level)

## Integration Points

### Grant View Page
The costs feature is integrated into the main grant view page:

```tsx
// In GrantViewPage.tsx
{grant && organisation && (
  <div className={styles["costs-section"]}>
    <CostsGrid
      grantId={grant.PK}
      organisationId={organisation.PK}
      title="Grant Costs Management"
    />
  </div>
)}
```

### Dashboard Calculations
Non-staff costs are automatically included in:
- Period-based cost analysis
- Cost type breakdowns
- Total grant expenditure calculations
- Drill-down detailed views

## Testing

### Unit Tests
- Database operations (CRUD)
- Calculation functions
- Validation logic
- Component rendering and interactions

### Test Files
- `useLocalData.costs.test.ts` - Data hooks testing
- `grantCalculations.costs.test.ts` - Calculation functions
- `CostsGrid.test.tsx` - Component testing

### Running Tests
```bash
npm test -- costs
```

## Performance Considerations

### Database Indexing
The costs table includes indexes for efficient querying:
- Primary key (PK)
- Grant ID for filtering by grant
- Grant ID + Invoice Date for period queries
- Organisation ID + Grant ID for organisation filtering
- Cost Type for type-based filtering

### Auto-save Optimization
- 1-second debounce for auto-save operations
- Batch updates to minimize database calls
- Optimistic UI updates for better user experience

## Future Enhancements

### Planned Features
1. **Cost Categories**: Sub-categorization within cost types
2. **Attachments**: File upload for invoices and receipts
3. **Approval Workflow**: Multi-stage approval process for costs
4. **Budget Tracking**: Budget vs. actual cost analysis
5. **Reporting**: Advanced reporting and export capabilities
6. **Integration**: Connection with accounting systems

### Migration Path
The current schema is designed for easy migration to DynamoDB:
- All fields use DynamoDB-compatible types
- Proper indexing strategy for GSI implementation
- Consistent naming conventions with existing tables

## Troubleshooting

### Common Issues

**Validation Errors**
- Check required fields are populated
- Verify amount is positive and within limits
- Ensure date format is correct

**Auto-save Not Working**
- Check network connectivity
- Verify grant and organisation IDs are valid
- Check browser console for JavaScript errors

**Performance Issues**
- Large datasets may require pagination (future enhancement)
- Consider filtering by date range for better performance
- Clear browser cache if experiencing stale data

### Debug Mode
Enable debug logging by setting localStorage:
```javascript
localStorage.setItem('debug', 'grants:costs');
```

## API Reference

See individual component and hook documentation for detailed API information:
- [CostsGrid Component](../src/components/CostsGrid/CostsGrid.tsx)
- [Data Hooks](../src/hooks/useLocalData.ts)
- [Calculation Functions](../src/utils/grantCalculations.ts)
- [Database Schema](../src/db/schema.ts)
