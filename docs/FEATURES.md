# ZapOS v0.2.0 — Changelog & Features

## Features

### Window Management
- Draggable & resizable windows (framer-motion + react-resizable)
- Window types: `ttyd` (terminal) and `preview` (iframe web app)
- Close/minimize/maximize with macOS-style traffic light buttons
- Double-click title bar to inline-edit window title (syncs to DB for ttyd)
- URL bar for preview windows (shows hostname, full URL on focus)
- Reload iframe & open-in-new-window toolbar buttons
- Window dedup: same pane/URL won't open twice on same desktop
- Starting position (20, 20) with 30px offset per window

### Layout System
- **Vertical Split** — windows arranged side by side (Columns icon)
- **Horizontal Split** — windows stacked top to bottom (Rows icon)
- **Grid Layout** — auto-calculated optimal grid
- Layout buttons appear when ≥ 2 windows exist
- All layouts: start at (20, 20), 60px bottom margin for Dock

### Multi-Desktop
- Create/rename/delete desktops via TopBar dropdown
- All desktops render with `display: none` — iframes stay alive when switching
- Each desktop has independent window set

### Agents (Terminal Sessions)
- Create new tmux sessions from Agents dropdown
- Open existing agents instantly (skips tmux create when paneId exists)
- Inline rename, restart (with confirm), delete (with confirm)
- Agents list with search, cached for instant dropdown

### Apps (Web Apps)
- CRUD via Apps dropdown
- Add by URL, auto-dedup by URL
- Inline rename, delete with confirm
- Apps list with search, cached for instant dropdown

### Dock
- macOS-style magnification on hover
- Sizes: hovered=60px, ±1=50px, ±2=44px, default=40px
- Agent icons: black bg + green Terminal
- App icons: white bg + blue Globe
- Tooltip on hovered item only

### UI/UX
- Global centered loading overlay for all async operations
- Optimistic UI: state updates instantly, API in background
- Cache layer: `window.__mc` + `localStorage` for instant data
- Consistent dropdown UX across all three menus (search, rename, delete)
- ConfirmDialog component for destructive actions (danger mode)
- Dark theme throughout

### Auth
- Token-based auth via URL param or localStorage
- Login dialog for unauthenticated users

## Tech Stack
- React 19, TypeScript, Vite, TailwindCSS
- Framer Motion, react-resizable, Axios
- FastAPI backend, MySQL, tmux + ttyd
- Docker + Cloudflare Tunnel deployment
