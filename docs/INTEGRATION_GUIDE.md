# Enhanced Team Member Dropdown & Calendar Integration Guide

## Overview

This guide provides step-by-step instructions for integrating the enhanced team member dropdown and calendar view functionality into your Novel application pages.

## Quick Start

### 1. Basic Page Setup

```tsx
import React, { useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { AppLayout } from '../components/Layout/AppLayout';
import { SmartCalendar } from '../components/SmartCalendar';
import { Individual } from '../db/schema';

export const MyCalendarPage: React.FC = () => {
  // State for multi-user selection
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Individual[]>([]);
  const [multiSelect, setMultiSelect] = useState(false);

  // Handlers
  const handleUsersChange = (userIds: string[], users: Individual[]) => {
    setSelectedUserIds(userIds);
    setSelectedUsers(users);
  };

  const handleDateSelect = (date: string) => {
    console.log('Date selected:', date);
  };

  return (
    <AppLayout
      selectedUserIds={selectedUserIds}
      onUsersChange={handleUsersChange}
      multiSelect={multiSelect}
    >
      <Box sx={{ p: 3 }}>
        {/* Page Header */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
            Team Calendar
          </Typography>
          
          {/* Mode Toggle */}
          <Button
            size="small"
            variant={multiSelect ? "contained" : "outlined"}
            onClick={() => setMultiSelect(!multiSelect)}
          >
            {multiSelect ? "Single User Mode" : "Multi User Mode"}
          </Button>
        </Box>

        {/* Calendar */}
        <SmartCalendar
          selectedUserIds={selectedUserIds}
          selectedUsers={selectedUsers}
          onUsersChange={handleUsersChange}
          onDateSelect={handleDateSelect}
          multiSelect={multiSelect}
        />
      </Box>
    </AppLayout>
  );
};
```

### 2. Organization-Specific Pages

```tsx
import { useParams } from 'react-router-dom';

export const OrganizationCalendarPage: React.FC = () => {
  const { organizationId } = useParams<{ organizationId: string }>();
  
  // ... state setup same as above

  return (
    <AppLayout
      selectedUserIds={selectedUserIds}
      onUsersChange={handleUsersChange}
      organisationId={organizationId}
      multiSelect={multiSelect}
    >
      {/* Page content */}
    </AppLayout>
  );
};
```

## Advanced Integration Patterns

### URL State Persistence

```tsx
import { useSearchParams } from 'react-router-dom';

export const CalendarPageWithURL: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Parse URL state
  const selectedUserIds = useMemo(() => {
    const ids = searchParams.get('users');
    return ids ? ids.split(',') : [];
  }, [searchParams]);

  const multiSelect = searchParams.get('multiSelect') === 'true';

  // Update URL when selection changes
  const handleUsersChange = (userIds: string[], users: Individual[]) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (userIds.length > 0) {
        newParams.set('users', userIds.join(','));
      } else {
        newParams.delete('users');
      }
      return newParams;
    });
  };

  const handleModeToggle = () => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('multiSelect', (!multiSelect).toString());
      return newParams;
    });
  };

  // ... rest of component
};
```

### Custom User Filtering

```tsx
import { useIndividuals } from '../hooks/useLocalData';

export const FilteredCalendarPage: React.FC = () => {
  const { data: allUsers = [] } = useIndividuals();
  
  // Custom filtering logic
  const filteredUsers = useMemo(() => {
    return allUsers.filter(user => {
      // Example: Only show users with annual gross > 50000
      return user.AnnualGross > 50000;
    });
  }, [allUsers]);

  // Pass filtered users to UserPicker via context or props
  // ... rest of component
};
```

### Integration with Existing State Management

```tsx
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { setSelectedUsers, toggleMultiSelect } from '../store/slices/calendarSlice';

export const ReduxIntegratedCalendarPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { selectedUsers, multiSelect } = useAppSelector(state => state.calendar);

  const handleUsersChange = (userIds: string[], users: Individual[]) => {
    dispatch(setSelectedUsers({ userIds, users }));
  };

  const handleModeToggle = () => {
    dispatch(toggleMultiSelect());
  };

  // ... rest of component
};
```

## Component Configuration

### UserPicker Customization

```tsx
<UserPicker
  selectedUserIds={selectedUserIds}
  onUsersChange={handleUsersChange}
  multiSelect={true}
  maxDisplayUsers={5}           // Show up to 5 users before "+" indicator
  compact={false}               // Full display mode
  showContextIndicator={true}   // Show global/org context
  className="custom-picker"     // Custom styling
/>
```

### Calendar Customization

```tsx
<LocalCalendarView
  users={users}
  multiUser={true}
  onDateSelect={handleDateSelect}
  // Custom event rendering
  eventContent={(eventInfo) => (
    <CustomEventComponent event={eventInfo.event} />
  )}
/>
```

## Styling Integration

### CSS Modules

```css
/* MyPage.module.css */
.calendarContainer {
  background: #f9fafb;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.modeToggle {
  margin-bottom: 1rem;
}

.userPickerOverride {
  /* Custom UserPicker styles */
  min-width: 320px;
}
```

```tsx
import styles from './MyPage.module.css';

<Box className={styles.calendarContainer}>
  <UserPicker className={styles.userPickerOverride} />
</Box>
```

### Theme Integration

```tsx
import { useTheme } from '@mui/material/styles';

export const ThemedCalendarPage: React.FC = () => {
  const theme = useTheme();
  
  return (
    <Box sx={{
      backgroundColor: theme.palette.background.default,
      color: theme.palette.text.primary,
      // ... other theme-based styles
    }}>
      {/* Components */}
    </Box>
  );
};
```

## Error Handling

### Loading States

```tsx
export const CalendarPageWithLoading: React.FC = () => {
  const { data: users, isLoading, error } = useIndividuals();

  if (isLoading) {
    return (
      <AppLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <Alert severity="error" sx={{ m: 3 }}>
          Failed to load team members: {error.message}
        </Alert>
      </AppLayout>
    );
  }

  // ... rest of component
};
```

### Error Boundaries

```tsx
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <Alert severity="error" action={
      <Button onClick={resetErrorBoundary}>Try again</Button>
    }>
      Something went wrong: {error.message}
    </Alert>
  );
}

export const SafeCalendarPage: React.FC = () => {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <CalendarPageContent />
    </ErrorBoundary>
  );
};
```

## Performance Optimization

### Memoization

```tsx
export const OptimizedCalendarPage: React.FC = () => {
  // Memoize expensive calculations
  const memoizedUsers = useMemo(() => {
    return users.map(user => ({
      ...user,
      displayName: `${user.FirstName} ${user.LastName}`,
      initials: getInitials(user)
    }));
  }, [users]);

  // Memoize callbacks
  const handleUsersChange = useCallback((userIds: string[], users: Individual[]) => {
    setSelectedUsers(users);
    // Persist to localStorage
    localStorage.setItem('selectedUserIds', JSON.stringify(userIds));
  }, []);

  // ... rest of component
};
```

### Code Splitting

```tsx
import { lazy, Suspense } from 'react';

const LazyCalendarView = lazy(() => import('../components/LocalCalendarView'));

export const CalendarPage: React.FC = () => {
  return (
    <Suspense fallback={<CircularProgress />}>
      <LazyCalendarView />
    </Suspense>
  );
};
```

## Testing Integration

### Component Testing

```tsx
// MyCalendarPage.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { MyCalendarPage } from './MyCalendarPage';

describe('MyCalendarPage', () => {
  it('toggles between single and multi-user modes', async () => {
    render(<MyCalendarPage />);
    
    const toggleButton = screen.getByText('Multi User Mode');
    fireEvent.click(toggleButton);
    
    expect(screen.getByText('Single User Mode')).toBeInTheDocument();
  });
});
```

### Integration Testing

```tsx
// Integration.test.tsx
import { renderWithProviders } from '../test-utils';

describe('Calendar Integration', () => {
  it('maintains user selection across navigation', async () => {
    const { user } = renderWithProviders(<App />);
    
    // Navigate to calendar page
    await user.click(screen.getByText('Calendar'));
    
    // Select users
    await user.click(screen.getByRole('button', { name: /select team members/i }));
    
    // Verify selection persists
    expect(screen.getByText('2 users selected')).toBeInTheDocument();
  });
});
```

## Migration Checklist

- [ ] Update imports to use enhanced components
- [ ] Add multi-select state management
- [ ] Update AppLayout props
- [ ] Test single-user backward compatibility
- [ ] Verify accessibility compliance
- [ ] Update existing tests
- [ ] Add new multi-user tests
- [ ] Update documentation

## Troubleshooting

### Common Issues

1. **UserPicker not showing users**: Check `useIndividuals` hook and organization context
2. **Calendar events not displaying**: Verify data fetching and event generation
3. **Multi-select not working**: Ensure proper props and handlers are passed
4. **Styling issues**: Check CSS module imports and theme integration

### Debug Tools

```tsx
// Enable debug mode
<UserPicker debug={true} />
<LocalCalendarView debug={true} />

// React DevTools
// - Check component props and state
// - Profile performance issues
// - Inspect accessibility tree
```

## Support

For additional help:
- Check component documentation
- Review test examples
- Consult accessibility guidelines
- Contact the development team
