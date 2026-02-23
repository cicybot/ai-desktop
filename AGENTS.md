# AGENTS.md - AI Desktop Project Guide

## ⚠️ IMPORTANT

- **DO NOT restart Docker** - The container is already running with hot reload enabled via volume mounts
- **Just write code** - Changes to source files are automatically reflected in the running app
- **URL**: `http://desktop.cicy.de5.net/` is already routed via Cloudflare Tunnel to this project (port 6905)
- After code changes, simply refresh the browser to see updates

## Project Overview

This is a macOS-like web desktop application built with React 19, TypeScript, Vite, and TailwindCSS. It provides a virtual desktop environment with windows, dock, sidebar, and AI chat functionality.

---

## Build & Development Commands

```bash
# Install dependencies
npm install

# Start development server (hot reload)
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Clean build artifacts
npm run clean

# Type check (lint)
npm run lint

# Run in Docker (hot reload enabled)
docker-compose up -d --build

# Stop Docker container
docker-compose down
```

### Docker Configuration

The project uses `docker-compose.yml` for containerized deployment:
- Port: 6905 (mapped to container port 3000)
- Volume mounts for hot reload
- Environment variables: GEMINI_API_KEY, APP_URL

---

## Code Style Guidelines

### TypeScript

- Use explicit type annotations for function parameters and return types
- Use interfaces for object shapes, types for unions/aliases
- Avoid `any`, use `unknown` when type is truly unknown
- Use `Partial<T>` for update functions

```typescript
// Good
interface WindowProps {
  id: string;
  onClose: (id: string) => void;
}

function handleUpdate(id: string, updates: Partial<WindowState>): void { }

// Bad
function handleUpdate(id, updates) { }
```

### React Patterns

- Use functional components with arrow functions or `function` keyword
- Use `useState` with explicit generic type when not inferred
- Destructure props for clarity
- Use `useCallback` for event handlers passed to children
- Use `useEffect` for side effects, always include dependency array

```typescript
// Component with explicit props interface
interface DesktopProps {
  windows: WindowState[];
  onFocusWindow: (id: string) => void;
}

export function Desktop({ windows, onFocusWindow }: DesktopProps) {
  // ...
}
```

### Imports

- React imports first (standard library)
- Then external packages
- Then local components/types
- Use absolute imports with `@/` alias (maps to project root)

```typescript
import React from 'react';
import { useState, useEffect } from 'react';
import { motion } from 'motion';
import { Desktop } from './components/Desktop';
import { DesktopState, WindowState } from './types';
```

### File Naming

- Components: `PascalCase.tsx` (e.g., `Desktop.tsx`, `TopBar.tsx`)
- Utilities: `camelCase.ts` (e.g., `utils.ts`)
- Types: `camelCase.ts` (e.g., `types.ts`)
- Config: `camelCase.{ts,js}` (e.g., `vite.config.ts`)

### CSS & Tailwind

- Use Tailwind utility classes primarily
- Use `clsx` or `tailwind-merge` for conditional classes
- Custom styles only when Tailwind cannot handle it
- Use consistent spacing (4px base unit)

```typescript
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

// Usage
<div className={cn("base-class", isActive && "active-class")} />
```

### State Management

- Use React `useState` for local component state
- Use `useEffect` with localStorage for persistence
- Lift state up to common ancestor when shared
- Use functional state updates: `setState(prev => ...)`

```typescript
// Good - functional update
setDesktops((prev) =>
  prev.map((d) =>
    d.id === activeDesktopId
      ? { ...d, windows: [...d.windows, newWindow] }
      : d
  )
);
```

### Error Handling

- Use try-catch for async operations
- Log errors with meaningful context
- Provide user feedback via UI (not just console)

```typescript
try {
  const parsed = JSON.parse(savedState);
  // ...
} catch (e) {
  console.error('Failed to load state:', e);
}
```

### Naming Conventions

- Variables/functions: `camelCase`
- Components/Types: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- File names: `kebab-case.tsx`

---

## Project Structure

```
src/
├── components/          # React components
│   ├── Desktop.tsx
│   ├── Dock.tsx
│   ├── Sidebar.tsx
│   ├── TopBar.tsx
│   ├── Window.tsx
│   └── ...
├── lib/
│   └── utils.ts         # Utility functions
├── types.ts             # TypeScript types and constants
├── App.tsx              # Main application component
└── main.tsx            # Entry point
```

---

## Key Patterns

### Window Management

Windows are managed in `DesktopState.windows` array with properties:
- `id`, `type`, `title`, `url`
- `x`, `y`, `width`, `height`, `zIndex`
- `isMinimized`, `isMaximized`

### Adding New Components

1. Create file in `src/components/`
2. Define Props interface
3. Export as named function
4. Import in parent with relative path

### Vite Configuration

- `vite.config.ts` contains server configuration
- `allowedHosts` must be updated when adding new domains
- HMR can be disabled via `DISABLE_HMR` env var

---

## Environment Variables

```bash
GEMINI_API_KEY=<your-api-key>
APP_URL=http://localhost:3000  # or production URL
```

---

## Testing

Currently no test framework configured. To add tests:
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

---

## Common Tasks

### Add new window type
1. Update `WindowType` in `types.ts`
2. Add case in `Window.tsx` rendering logic
3. Update `handleAddWindow` in `App.tsx`

### Add new route/domain
1. Update `allowedHosts` in `vite.config.ts`
2. Rebuild Docker container
3. Add CF tunnel route if external access needed
