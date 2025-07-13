# Enhanced Calendar View Documentation

## Overview

The Enhanced Calendar View provides a modern, multi-user capable calendar interface with improved visual design, better accessibility, and support for displaying multiple team members' schedules simultaneously.

## Key Features

### Visual Enhancements

- **Pastel Color Palette**: Soft, accessible colors for better visual appeal
- **User Avatars**: Team member initials displayed in calendar events
- **Improved Layout**: Hours and utilization metrics positioned for better readability
- **Simplified Display**: Removed grant details clutter, focusing on essential information
- **Multi-User Stacking**: Vertical layout for multiple users in the same day cell

### Multi-User Support

- **Simultaneous Display**: View multiple team members' calendars at once
- **Individual Identification**: Clear visual indicators for each team member
- **Aggregated Metrics**: Combined utilization and hours tracking
- **Flexible Selection**: Switch between single and multi-user modes

### Accessibility Improvements

- **High Contrast**: Maintains WCAG AA compliance
- **Screen Reader Support**: Comprehensive ARIA labels and descriptions
- **Keyboard Navigation**: Full keyboard accessibility for calendar interactions
- **Focus Management**: Clear visual focus indicators

## Usage

### Single-User Calendar

```tsx
import { LocalCalendarView } from "../components/LocalCalendarView";

function SingleUserCalendar() {
  return (
    <LocalCalendarView
      userId="user-123"
      userName="John Doe"
      multiUser={false}
      onDateSelect={handleDateSelect}
    />
  );
}
```

### Multi-User Calendar

```tsx
import { LocalCalendarView } from "../components/LocalCalendarView";

function MultiUserCalendar() {
  const users = [
    { id: "user-1", name: "John Doe" },
    { id: "user-2", name: "Jane Smith" },
    { id: "user-3", name: "Bob Johnson" },
  ];

  return (
    <LocalCalendarView
      users={users}
      multiUser={true}
      onDateSelect={handleDateSelect}
    />
  );
}
```

### With SmartCalendar Integration

```tsx
import { SmartCalendar } from "../components/SmartCalendar";

function EnhancedCalendarPage() {
  const [selectedUsers, setSelectedUsers] = useState<Individual[]>([]);
  const [multiSelect, setMultiSelect] = useState(false);

  return (
    <SmartCalendar
      selectedUsers={selectedUsers}
      onUsersChange={setSelectedUsers}
      multiSelect={multiSelect}
      onDateSelect={handleDateSelect}
    />
  );
}
```

## Props API

### LocalCalendarViewProps

| Prop           | Type                                | Default | Description               |
| -------------- | ----------------------------------- | ------- | ------------------------- |
| `userId`       | `string`                            | -       | Single user ID (legacy)   |
| `userName`     | `string`                            | -       | Single user name (legacy) |
| `userIds`      | `string[]`                          | `[]`    | Array of user IDs         |
| `userNames`    | `string[]`                          | `[]`    | Array of user names       |
| `users`        | `Array<{id: string, name: string}>` | `[]`    | User objects (preferred)  |
| `multiUser`    | `boolean`                           | `false` | Enable multi-user mode    |
| `onDateSelect` | `(date: string) => void`            | -       | Date selection handler    |

### SmartCalendarProps

| Prop              | Type                                               | Default | Description               |
| ----------------- | -------------------------------------------------- | ------- | ------------------------- |
| `selectedUsers`   | `Individual[]`                                     | `[]`    | Selected user objects     |
| `selectedUserIds` | `string[]`                                         | `[]`    | Selected user IDs         |
| `onUsersChange`   | `(userIds: string[], users: Individual[]) => void` | -       | Multi-user change handler |
| `multiSelect`     | `boolean`                                          | `false` | Enable multi-select mode  |
| `organizationId`  | `string`                                           | -       | Organization context      |
| `onDateSelect`    | `(date: string) => void`                           | -       | Date selection handler    |

## Visual Design

### Color System

The enhanced calendar uses a carefully selected pastel color palette:

```typescript
const pastelColors = [
  "#FFB3BA", // Light Pink
  "#FFDFBA", // Light Peach
  "#FFFFBA", // Light Yellow
  "#BAFFC9", // Light Green
  "#BAE1FF", // Light Blue
  "#E1BAFF", // Light Purple
  "#FFBAE1", // Light Magenta
  "#C9FFBA", // Light Lime
  "#FFCBA4", // Light Orange
  "#B4E7CE", // Light Mint
  "#F7D794", // Light Gold
  "#DDA0DD", // Light Plum
];
```

### Event Layout

Each calendar event displays:

1. **Top Row**: Hours used/available and utilization percentage
2. **Middle Row**: User avatar (initials) and name
3. **Bottom Row**: Number of allocations (simplified from grant details)

```
┌─────────────────────────┐
│ 6h / 8h        75%     │
│ [JD] John Doe          │
│ 3 allocations          │
└─────────────────────────┘
```

### Multi-User Stacking

When multiple users are selected, events stack vertically:

```
┌─────────────────────────┐
│ [JD] John: 6h/8h   75% │
│ [JS] Jane: 4h/8h   50% │
│ [BJ] Bob:  8h/8h  100% │
└─────────────────────────┘
```

## Integration Patterns

### With Enhanced UserPicker

```tsx
function CalendarPage() {
  const [selectedUsers, setSelectedUsers] = useState<Individual[]>([]);
  const [multiSelect, setMultiSelect] = useState(false);

  return (
    <AppLayout
      selectedUsers={selectedUsers}
      onUsersChange={setSelectedUsers}
      multiSelect={multiSelect}
    >
      <Box sx={{ p: 3 }}>
        <Button
          onClick={() => setMultiSelect(!multiSelect)}
          variant={multiSelect ? "contained" : "outlined"}
        >
          {multiSelect ? "Single User Mode" : "Multi User Mode"}
        </Button>

        <SmartCalendar
          selectedUsers={selectedUsers}
          onUsersChange={setSelectedUsers}
          multiSelect={multiSelect}
        />
      </Box>
    </AppLayout>
  );
}
```

### With URL State Persistence

```tsx
function CalendarPageWithURL() {
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedUserIds = useMemo(() => {
    const ids = searchParams.get("users");
    return ids ? ids.split(",") : [];
  }, [searchParams]);

  const handleUsersChange = (userIds: string[]) => {
    setSearchParams((prev) => ({
      ...prev,
      users: userIds.join(","),
    }));
  };

  return (
    <SmartCalendar
      selectedUserIds={selectedUserIds}
      onUsersChange={handleUsersChange}
      multiSelect={true}
    />
  );
}
```

## Data Flow

### Single-User Mode

1. User selects individual from UserPicker
2. Calendar fetches data for selected user
3. Events generated from timesheet allocations
4. Calendar displays with user-specific color

### Multi-User Mode

1. Users select multiple individuals from UserPicker
2. Calendar fetches data for all selected users
3. Events generated and color-coded per user
4. Calendar displays stacked events in day cells

## Performance Optimization

### Data Fetching

- Parallel data fetching for multiple users
- Memoized event generation
- Efficient re-rendering with React.memo

### Rendering

- Virtual scrolling for large date ranges (planned)
- Lazy loading of non-visible months
- Optimized event rendering with canvas (future)

## Accessibility Features

### Screen Reader Support

- Descriptive event labels with user and time information
- Calendar navigation announcements
- Live regions for dynamic updates

### Keyboard Navigation

- Arrow keys for date navigation
- Enter/Space for event selection
- Tab navigation through calendar controls

### Visual Accessibility

- High contrast mode support
- Scalable text and UI elements
- Color-blind friendly palette

## Testing

### Unit Tests

```bash
npm test LocalCalendarView
npm test SmartCalendar
```

### Integration Tests

```bash
npm test -- --grep "calendar integration"
```

### Accessibility Tests

```bash
npm run test:a11y
```

## Migration Guide

### From Legacy Calendar

1. **Update imports**: Use new component names
2. **Update props**: Migrate to new prop structure
3. **Handle multi-user**: Add multi-user support where needed

```tsx
// Before
<LocalCalendarView
  userId={userId}
  userName={userName}
/>

// After
<LocalCalendarView
  userId={userId}
  userName={userName}
  users={users}
  multiUser={enableMultiUser}
/>
```

## Troubleshooting

### Common Issues

1. **Events not displaying**: Check data fetching hooks
2. **Colors not applying**: Verify color generation utility
3. **Multi-user not working**: Check user array format
4. **Performance issues**: Enable React DevTools Profiler

### Debug Mode

Enable debug logging:

```tsx
<LocalCalendarView
  // ... props
  debug={true}
/>
```

## Future Enhancements

- Real-time collaboration features
- Drag-and-drop event editing
- Calendar export functionality
- Mobile-optimized touch interactions
- Integration with external calendar systems

## Related Documentation

- [Enhanced User Picker](./ENHANCED_USER_PICKER.md)
- [Integration Guide](./INTEGRATION_GUIDE.md)
- [Color System](./COLOR_SYSTEM.md)
- [Accessibility Guidelines](./ACCESSIBILITY.md)
