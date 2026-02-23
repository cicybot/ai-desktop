# ZapOS — Architecture

## Overview

ZapOS is a macOS-like web desktop running in the browser. Users manage multiple desktops, each containing draggable/resizable windows that embed terminal sessions (ttyd) or web apps (iframe).

```
┌─────────────────────────────────────────────────────────┐
│  Browser (https://desktop.cicy.de5.net/)                │
│  ┌───────────────────────────────────────────────────┐  │
│  │ TopBar  [Desktops ▾] [Agents ▾] [Apps ▾]   ⫿☰⊞⚙ │  │
│  ├───────────────────────────────────────────────────┤  │
│  │                                                   │  │
│  │   ┌─────────────┐  ┌─────────────┐               │  │
│  │   │ Window      │  │ Window      │               │  │
│  │   │ (ttyd term) │  │ (iframe app)│               │  │
│  │   │             │  │             │               │  │
│  │   └─────────────┘  └─────────────┘               │  │
│  │                                                   │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │              Dock (macOS-style)              │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## System Architecture

```
Frontend (React/Vite)          Backend (FastAPI)           Infrastructure
─────────────────────          ─────────────────           ──────────────
                                                           
  ai-desktop-web              FastAPI :14444               MySQL (tts_bot)
  Docker :6905                  │                            │
  ┌──────────┐                  ├─ /api/groups/*   ──────────┤ desktop_groups
  │ App.tsx  │ ── axios ──────► ├─ /api/tmux/*     ──────────┤ ttyd_config
  │ TopBar   │                  ├─ /api/apps/*     ──────────┤ desktop_apps
  │ Window   │                  ├─ /api/ttyd/*               │
  │ Dock     │                  ├─ /api/auth/*               │
  └──────────┘                  └──────────────              │
       │                                                     
       │ iframe                ttyd-proxy :15003             
       └──────────────────────► Docker ttyd-proxy-server     
                                (proxies to tmux panes)      
```

## Frontend Components

```
src/
├── App.tsx              # Root — state management, window/desktop CRUD
├── main.tsx             # Entry point
├── types.ts             # TypeScript interfaces (WindowState, DesktopState, etc.)
├── index.css            # Tailwind imports
├── components/
│   ├── TopBar.tsx       # Top menu bar — 3 dropdown menus, layout buttons, settings
│   ├── Window.tsx       # Draggable/resizable window — framer-motion + react-resizable
│   ├── Desktop.tsx      # Desktop container — renders windows for one desktop
│   ├── Dock.tsx         # macOS-style dock with hover magnification
│   ├── ConfirmDialog.tsx# Reusable confirm/danger dialog
│   ├── LoginDialog.tsx  # Auth login dialog
│   ├── Sidebar.tsx      # Side panel (hidden)
│   ├── CentralPrompt.tsx# Center prompt (hidden, planned)
│   ├── MenuBar.tsx      # Legacy menu bar
│   └── Logo.tsx         # Logo component
└── lib/
    ├── api.ts           # API client — groupsApi, tmuxApi, appsApi, ttydApi, authApi
    ├── agent.ts         # Agent utilities
    └── utils.ts         # cn() helper (clsx + tailwind-merge)
```

## State Management

All state lives in `App.tsx` using React `useState`:

```
desktops: DesktopState[]        # All desktops with their windows
activeDesktopId: string         # Currently visible desktop
activeWindowId: string | null   # Currently focused window
globalLoading: string | false   # Loading overlay message
```

### Caching Strategy

```
User Action → setState (instant UI) → API call (background)
                  ↓
         window.__mc + localStorage
```

- `window.__mc` — in-memory cache object
- `localStorage` — persistent cache (`cache_agents`, `cache_apps`)
- Custom `setAgents`/`setApps` wrappers auto-sync to both caches
- Dropdowns open instantly with cached data, API refreshes in background

### Desktop Preservation

All desktops render simultaneously. Non-active desktops use `display: none` instead of unmounting, preserving iframe state (terminal sessions, web app state).

## Backend API

Base URL: `https://g-fast-api.cicy.de5.net/api/`

### Groups (Desktops)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/groups` | List all desktops |
| POST | `/groups` | Create desktop |
| GET | `/groups/:id` | Get desktop with panes |
| PATCH | `/groups/:id` | Rename desktop |
| DELETE | `/groups/:id` | Delete desktop |
| POST | `/groups/:id/panes/:paneId` | Add window to desktop |
| DELETE | `/groups/:id/panes/:paneId` | Remove window from desktop |
| PATCH | `/groups/:id/panes/:paneId/layout` | Update window position/size |
| PATCH | `/groups/:id/layout` | Batch update all window layouts |

### Tmux (Agents)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/tmux/create` | Create new tmux session + ttyd |
| GET | `/tmux-list` | List all tmux panes |
| GET | `/tmux/panes/:paneId` | Get pane info |
| PATCH | `/tmux/panes/:paneId` | Update pane (title, etc.) |
| DELETE | `/tmux/panes/:paneId` | Delete pane |
| POST | `/tmux/panes/:paneId/restart` | Restart pane |

### Apps
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/apps` | List all apps |
| POST | `/apps` | Create app (name, url, icon) |
| PATCH | `/apps/:id` | Update app |
| DELETE | `/apps/:id` | Delete app |

### TTY
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/ttyd/list` | List all ttyd configs |
| POST | `/ttyd/start/:paneId` | Start ttyd for pane |
| GET | `/ttyd/status/:paneId` | Check ttyd status |

## Database Schema

```sql
-- Desktops
desktop_groups (id, name, description, created_at, updated_at)
desktop_group_panes (id, group_id, pane_id, pos_x, pos_y, width, height, z_index)

-- Agents (tmux sessions)
ttyd_config (pane_id PK, title, ttyd_port, workspace, init_script, proxy,
             tg_token, tg_chat_id, tg_enable)

-- Apps
desktop_apps (id, name, url, icon, created_at, updated_at)
```

## Key Patterns

### Optimistic UI
Every user action updates local state first (0ms), then fires API call in background (fire-and-forget). If API fails, error is logged but UI stays responsive.

### Window Types
- `ttyd` — Terminal window, iframe loads ttyd-proxy URL, title editable (syncs to DB via `tmuxApi.renamePane`)
- `preview` — Web app window, iframe loads arbitrary URL, shows URL bar in title

### Window Dedup
When adding a window, checks if same `paneId` or `url` already exists on the desktop. If so, focuses existing window instead of creating duplicate.

### Layout System
Three layout modes triggered from TopBar:
- **Vertical Split** (Columns) — windows side by side
- **Horizontal Split** (Rows) — windows stacked
- **Grid** — optimal grid based on window count and aspect ratio

All layouts start at position (20, 20) with 60px bottom margin for Dock.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI Framework | React 19 + TypeScript |
| Build | Vite |
| Styling | TailwindCSS |
| Animation | Framer Motion |
| Window Resize | react-resizable |
| HTTP Client | Axios |
| Backend | FastAPI (Python) |
| Database | MySQL |
| Terminal | tmux + ttyd + ttyd-proxy |
| Deployment | Docker + Cloudflare Tunnel |

## Deployment

```
Cloudflare Tunnel
  ├── desktop.cicy.de5.net     → Docker ai-desktop-web :6905
  ├── g-fast-api.cicy.de5.net  → FastAPI uvicorn :14444
  └── ttyd-proxy.cicy.de5.net  → Docker ttyd-proxy :15003
```

## Version

Current: **v0.2.0**
