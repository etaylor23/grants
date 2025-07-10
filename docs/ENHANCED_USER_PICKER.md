# Enhanced User Picker Documentation

## Overview

The Enhanced User Picker is a comprehensive component that supports both single-user and multi-user selection modes with advanced search functionality, accessibility features, and seamless integration with Novel's existing UI patterns.

## Features

### Core Functionality
- **Single-Select Mode**: Traditional dropdown for selecting one user
- **Multi-Select Mode**: Advanced interface for selecting multiple users simultaneously
- **Real-time Search**: Filter users by name as you type
- **Context-Aware Filtering**: Automatically filters users based on global vs organization context
- **Persistent State**: Maintains selections in localStorage across sessions

### Visual Enhancements
- **User Avatars**: Displays user initials in circular avatars
- **Stacked Display**: Shows multiple selected users with overlapping avatars
- **Pastel Color Palette**: Uses soft, accessible colors for better visual appeal
- **Responsive Design**: Adapts to different screen sizes and contexts

### Accessibility
- **ARIA Labels**: Comprehensive screen reader support
- **Keyboard Navigation**: Full keyboard accessibility with arrow keys, Enter, and Escape
- **Focus Management**: Proper focus handling and visual indicators
- **High Contrast**: Maintains accessibility standards for color contrast

## Usage

### Basic Single-Select Mode

```tsx
import { UserPicker } from '../components/UserPicker';

function MyComponent() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<Individual | null>(null);

  const handleUserChange = (userId: string, user: Individual) => {
    setSelectedUserId(userId);
    setSelectedUser(user);
  };

  return (
    <UserPicker
      selectedUserId={selectedUserId}
      onUserChange={handleUserChange}
      multiSelect={false}
    />
  );
}
```

### Multi-Select Mode

```tsx
import { UserPicker } from '../components/UserPicker';

function MyComponent() {
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Individual[]>([]);

  const handleUsersChange = (userIds: string[], users: Individual[]) => {
    setSelectedUserIds(userIds);
    setSelectedUsers(users);
  };

  return (
    <UserPicker
      selectedUserIds={selectedUserIds}
      onUsersChange={handleUsersChange}
      multiSelect={true}
      maxDisplayUsers={3}
    />
  );
}
```

### With Organization Context

```tsx
<UserPicker
  selectedUserIds={selectedUserIds}
  onUsersChange={handleUsersChange}
  organisationId="org-123"
  multiSelect={true}
/>
```

## Props API

### UserPickerProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `selectedUserIds` | `string[]` | `[]` | Array of selected user IDs (multi-select) |
| `selectedUserId` | `string \| null` | `null` | Single selected user ID (legacy) |
| `onUsersChange` | `(userIds: string[], users: Individual[]) => void` | - | Multi-select change handler |
| `onUserChange` | `(userId: string, user: Individual) => void` | - | Single-select change handler (legacy) |
| `organisationId` | `string` | - | Filter users by organization |
| `multiSelect` | `boolean` | `false` | Enable multi-select mode |
| `maxDisplayUsers` | `number` | `3` | Max users to show in collapsed state |
| `compact` | `boolean` | `false` | Compact display mode |
| `showContextIndicator` | `boolean` | `true` | Show global/org context indicator |
| `className` | `string` | - | Additional CSS classes |

## Integration with AppLayout

The UserPicker integrates seamlessly with the AppLayout component:

```tsx
<AppLayout
  selectedUserIds={selectedUserIds}
  onUsersChange={handleUsersChange}
  multiSelect={true}
  organisationId={organisationId}
>
  {/* Your page content */}
</AppLayout>
```

## State Management

### localStorage Persistence

The component automatically persists selections in localStorage:

- **Single-select**: Stored as `selectedUserId`
- **Multi-select**: Stored as `selectedUserIds` (JSON array)

### URL State Integration

When used with AppLayout, selections can be synchronized with URL state for deep linking and browser navigation.

## Styling

The component uses CSS modules for styling. Key classes:

- `.userPicker`: Main container
- `.multiUserAvatars`: Container for stacked avatars
- `.searchSection`: Search input area
- `.multiSelectControls`: Select All/Clear All buttons
- `.menuItem`: Individual user items in dropdown

### Customization

Override styles by providing a custom className:

```tsx
<UserPicker
  className="my-custom-picker"
  // ... other props
/>
```

## Accessibility Features

### Screen Reader Support
- Descriptive ARIA labels for all interactive elements
- Live regions for dynamic content updates
- Proper role attributes for listbox and options

### Keyboard Navigation
- **Tab**: Navigate between controls
- **Enter/Space**: Activate buttons and select users
- **Arrow Keys**: Navigate through user list
- **Escape**: Close dropdown

### Focus Management
- Visible focus indicators
- Logical tab order
- Focus trapping within dropdown

## Performance Considerations

### Optimization Features
- Memoized user filtering and search
- Debounced search input (300ms)
- Virtualization for large user lists (planned)
- Efficient re-rendering with React.memo

### Best Practices
- Use `selectedUserIds` prop for controlled components
- Implement proper error boundaries
- Consider pagination for organizations with many users

## Testing

Comprehensive test coverage includes:

- Unit tests for all functionality modes
- Integration tests with AppLayout
- Accessibility testing with screen readers
- Performance testing with large datasets

Run tests:
```bash
npm test UserPicker
```

## Migration Guide

### From Legacy UserPicker

1. **Single-select mode**: No changes required, existing props work
2. **Multi-select mode**: Add new props and handlers

```tsx
// Before (single-select only)
<UserPicker
  selectedUserId={userId}
  onUserChange={handleUserChange}
/>

// After (with multi-select support)
<UserPicker
  selectedUserId={userId}
  selectedUserIds={userIds}
  onUserChange={handleUserChange}
  onUsersChange={handleUsersChange}
  multiSelect={enableMultiSelect}
/>
```

## Troubleshooting

### Common Issues

1. **Users not loading**: Check `useIndividuals` hook and organization context
2. **Search not working**: Verify search query state management
3. **Selections not persisting**: Check localStorage permissions
4. **Accessibility issues**: Run automated accessibility tests

### Debug Mode

Enable debug logging:
```tsx
<UserPicker
  // ... props
  debug={true} // Enables console logging
/>
```

## Future Enhancements

- Virtual scrolling for large user lists
- Advanced filtering (by role, department, etc.)
- Bulk operations (import/export selections)
- Integration with user management APIs
- Custom avatar support (profile pictures)
