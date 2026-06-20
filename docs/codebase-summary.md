# Badminton Host — Codebase Summary

**Last Updated**: 2026-06-20  
**Version**: 1.0.0  
**Project**: Badminton Hosting & Bill-Splitting Platform

## Overview

Badminton Host is a web app for managing badminton sessions, splitting costs fairly, and tracking player participation. It supports:
- **Session Management**: Schedule courts, register players, set fees
- **Smart Cost Splitting**: Allocate court costs + add-ons to participants per session
- **Financial Tracking**: Monitor collected vs. outstanding payments, create payment reminders
- **Proxy Registration**: One player can register and pay for up to 5 companions
- **Public Reports**: Share participation counts (with optional guest list) via shareable token
- **Member Profiles**: Vietnamese skill levels (Newbie → Khá+), attendance tracking

## Project Structure

```
badminton_host/
├── src/
│   ├── client/           # React + Vite frontend
│   │   ├── pages/        # Page components (sessions, debts, reports, public share)
│   │   ├── components/   # Reusable UI (cards, rows, buttons, modals, icon)
│   │   ├── styles/       # Tailwind + component CSS (design system: cream + cards)
│   │   ├── lib/          # Utilities (skill-levels, format, api client)
│   │   └── auth/         # Auth context (session-based)
│   ├── server/           # Node.js backend (SQLite + JSON routes)
│   │   ├── routes/       # API handlers (sessions, members, payments, reports, public)
│   │   ├── services/     # Business logic (costs, reports aggregation)
│   │   ├── db/           # SQLite + migrations
│   │   ├── auth/         # Session + password (bcrypt)
│   │   └── app.ts        # Express-like server setup
│   └── shared/           # Shared types
├── docs/                 # Project documentation
├── plans/                # Implementation plans + reports
├── tailwind.config.ts    # Design system config
├── tsconfig.json         # TypeScript config
└── package.json          # Dependencies
```

## Core Technologies

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + custom CSS (design system: white cards on cream background, shadow scale)
- **Backend**: Node.js + Express-like routing
- **Database**: SQLite with migrations
- **Auth**: Session-based (bcrypt hashed passwords)

## Key Features Shipped (Latest 6 Commits)

### 1. UI Redesign & Design System
- **File**: `src/client/styles/index.css`, `tailwind.config.ts`
- Cream background with white cards + shadow scale
- Inline SVG icon component (`src/client/components/icon.tsx`)
- Consistent components: Card, Row, Avatar, Chip, Badge, Button, Modal
- Applied across admin + public pages

### 2. Public Session Page & Venue Map
- **File**: `src/client/pages/public-session-page.tsx`
- Embedded Google Maps + venue address (reuses `session.location`)
- Accessible to non-members via shareable session link

### 3. Member Skill Levels (Vietnamese Amateur Labels)
- **File**: `src/client/lib/skill-levels.ts`
- Numeric → Vietnamese labels: Newbie, Yếu -, Yếu, Yếu +, Trung bình yếu, Trung bình -, Trung bình, Trung bình +, Khá -, Khá, Khá +
- Schema: max raised from 5 → 10 levels
- Display function: `skillLabel(level: number): string`

### 4. Reports Dashboard (Admin)
- **Endpoint**: `GET /api/admin/reports?from=YYYY-MM-DD&to=YYYY-MM-DD`
- **File**: `src/server/services/reports-service.ts`
- **Aggregates**:
  - **Finance**: Total collected, outstanding, session costs, pending
  - **Sessions**: Per-session breakdown with participant count, collected, outstanding
  - **Members**: Top participants, top debtors, attendance rates
  - **Payments**: Recent payment history
- Linked from Home page as Reports card

### 5. Debts Page Refactored (Person-Centric View)
- **Files**: `src/client/pages/debts-page.tsx`, `src/client/components/debt-person-row.tsx`
- Person-centered drill-down: shows all sessions where person owes money
- Collapsible per-session breakdown
- Inline mark-paid/partial using existing payment endpoint
- Share bill link from debts for payment reminders

### 6. Proxy Registration (Pay for Companions)
- **Migration 007**: Adds `paid_by` column to `session_participants`
- **Logic**: One registrant can register up to 5 companions; payer covers all
- **Billing**: Payer's bill aggregates the group
- **Constraint**: Follower bill tokens blocked (404)
- **Debt View**: Debts grouped under payer
- **Backup**: Two-pass insert handles self-FK safely

### 7. Public Shareable Participation Report
- **Migration 008**: Adds `settings.public_report_enabled`, `public_report_token`, `show_guests`
- **Endpoint**: `GET /api/public/report/:token`
- **Output**: Participation counts only (CLB members vs. guests); NO money/phone exposed
- **Access Control**: `show_guests` enforced server-side; uniform 404 if token invalid or settings disabled
- **Headers**: `no-store, no-referrer` (privacy)
- **Customizable Share**: Host can set time range (All / this month / custom) + guest visibility toggle from Reports page
- **URL**: Range flows via `?from=YYYY-MM-DD&to=YYYY-MM-DD` on `/r/:token` public page

## Database Schema Highlights

**Core Tables**:
- `settings` — App-level config (public_report_enabled, public_report_token, show_guests)
- `members` — CLB members with skill level (0–10)
- `sessions` — Badminton events (title, date, location, cost, manual_total, status)
- `session_courts` — Court bookings (venue + cost per session)
- `session_participants` — Player attendance + billing (member_id, paid_by for proxy, payment_status, final_amount, paid_amount)
- `cost_items` — Ad-hoc costs (food, transportation, etc.)

**Recent Migrations**:
- **007**: `ALTER TABLE session_participants ADD COLUMN paid_by INTEGER`
- **008**: `ALTER TABLE settings ADD COLUMNS public_report_enabled, public_report_token, show_guests`

## API Routes

**Admin**:
- `GET /api/admin/reports` — Reports dashboard with finance/sessions/members/payments
- `POST /api/sessions` — Create session
- `PUT /api/sessions/:id` — Update session
- `POST /api/sessions/:id/participants` — Register/proxy register
- `POST /api/sessions/:id/participants/:pid/payments` — Mark paid/partial/waived

**Public**:
- `GET /api/public/session/:id` — Public session page
- `GET /api/public/report/:token` — Shareable participation report (if token valid + enabled)
- `GET /api/public/bill/:token` — Shareable bill (existing)

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (Vite + backend)
npm run build        # Build for production
npm run lint         # Type check
```

## Notes

- **No authentication library**: Custom session + bcrypt
- **KISS principle**: Self-hosted, simple SQLite, no external payment APIs
- **Soft deletes**: All tables use `deleted_at` for safe recovery
- **Concurrency**: SQLite WAL mode for basic multi-access support
