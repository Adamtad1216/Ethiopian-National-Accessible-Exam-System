# Confirmation Modal Usage Guide

## Overview

The confirmation modal system is a state-of-the-art replacement for browser `window.confirm()` dialogs. It provides beautiful, animated confirmations with support for danger variants, loading states, and async operations.

## Files Involved

- **[contexts/ConfirmationContext.tsx](src/contexts/ConfirmationContext.tsx)** - Provider and hook
- **[components/ConfirmationModal.tsx](src/components/ConfirmationModal.tsx)** - Modal component
- **[App.tsx](src/App.tsx)** - Provider wrapper and modal mount
- **[pages/admin/AdminUsers.tsx](src/pages/admin/AdminUsers.tsx)** - Example implementation

## How to Use

### 1. Hook into any component

```typescript
import { useConfirmation } from "@/contexts/ConfirmationContext";

export function MyComponent() {
  const { confirm } = useConfirmation();

  // Use it...
}
```

### 2. Call confirm() with options

```typescript
const confirmed = await confirm({
  title: "Delete User",
  description:
    "Are you sure you want to delete this user? This action cannot be undone.",
  confirmLabel: "Delete",
  cancelLabel: "Cancel",
  variant: "danger", // "danger" | "default"
});

if (confirmed) {
  // User clicked confirm
  await deleteUser();
} else {
  // User clicked cancel
}
```

## Options

- **title** (required): Main heading text
- **description**: Optional explanatory text
- **confirmLabel**: Button text for confirm (default: "Confirm")
- **cancelLabel**: Button text for cancel (default: "Cancel")
- **variant**: "danger" (red button) or "default" (blue gradient)
- **icon**: Optional custom icon (defaults based on variant)

## Features

✅ Smooth animations (fade in/out, slide, zoom)
✅ Danger variant for destructive actions (red styling)
✅ Loading spinner during async operations
✅ Customizable button labels
✅ Icon support (AlertCircle for danger, CheckCircle2 for default)
✅ No extra dependencies (uses existing shadcn components)

## Current Implementation

The system is currently integrated into **AdminUsers.tsx** for user deletion:

```typescript
const confirmed = await confirm({
  title: "Remove User",
  description: `Are you sure you want to remove ${targetUser.firstName} ${targetUser.lastName} from the system? This action cannot be undone.`,
  confirmLabel: "Remove",
  cancelLabel: "Cancel",
  variant: "danger",
});
```

## Future Integration Points

Can be easily added to:

- Exam deletion / rejection
- Bulk import confirmation
- Settings reset confirmation
- Any destructive action across the app
