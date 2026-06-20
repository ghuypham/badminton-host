# System Architecture — Badminton Host

**Last Updated**: 2026-06-20  
**Version**: 1.0.0

## Architecture Overview

Badminton Host is a **full-stack monolithic web app** with clear separation of concerns:

```
┌─────────────────────────────────────────────────┐
│           React Frontend (Vite)                 │
│  (Pages: Sessions, Members, Debts, Reports)     │
└────────────────────┬────────────────────────────┘
                     │ HTTP/JSON
┌────────────────────▼────────────────────────────┐
│      Express-like Node.js Backend                │
│  (Routes: API handlers, auth, session)          │
└────────────────────┬────────────────────────────┘
                     │ SQL
┌────────────────────▼────────────────────────────┐
│          SQLite Database (WAL mode)              │
│  (Tables: sessions, members, participants,etc)  │
└─────────────────────────────────────────────────┘
```

## Component Architecture

### 1. Client Layer (React + TypeScript)

**Page Structure**:
- `home-page.tsx` — Dashboard with Reports card link
- `sessions-page.tsx` — List all sessions, create new
- `session-detail-page.tsx` — Edit session, register players, manage costs
- `members-page.tsx` — List/create/edit members with skill levels (Vietnamese labels)
- `debts-page.tsx` — Person-centric view of outstanding payments, drill-down per session
- `reports-page.tsx` — Admin reports dashboard (finance/sessions/members/payments), customizable report share control
- `public-session-page.tsx` — Public session view with embedded Google Maps + venue address
- `public-report-page.tsx` — Public participation report (token-gated, no money/phone, optional guests)
- `public-bill-page.tsx` — Public bill share (existing)
- `login-page.tsx` — Session-based auth

**Component Library** (Design System):
- `icon.tsx` — Inline SVG icon component (used across UI)
- `card.tsx` / styles — White cards on cream background, shadow scale
- `button.tsx`, `modal.tsx`, `badge.tsx`, `chip.tsx`, `row.tsx`, `avatar.tsx` — Consistent design system

**Utilities**:
- `src/client/lib/skill-levels.ts` — Vietnamese skill labels (Newbie → Khá+, 0–10 index)
- `src/client/lib/format.ts` — Number/currency/date formatting
- `src/client/api/client.ts` — Fetch wrapper

**Auth**:
- `auth-context.tsx` — Session state (user + permissions)

### 2. Server Layer (Node.js + Express-like routing)

**Route Handlers** (`src/server/routes/`):
- `admin-routes.ts` — `/api/admin/*` (reports, settings, auth)
- `sessions-routes.ts` — `/api/sessions` CRUD + participant registration
- `members-routes.ts` — `/api/members` CRUD + skill level
- `participants-routes.ts` — `/api/participants/:id/payments` (mark paid/partial/waived)
- `cost-routes.ts` — `/api/cost-items` (add-ons per session)
- `public-routes.ts` — `/api/public/*` (session, bill, participation report)
- `auth-routes.ts` — `/auth/login`, `/auth/logout`, `/auth/check`

**Services** (`src/server/services/`):
- `reports-service.ts` — Aggregates finance, sessions, members, payments stats; public participation report
- `cost-service.ts` — Computes session total (manual_total OR courts + items)
- `payment-service.ts` — Mark payment status, track paid_amount

**Database**:
- `src/server/db/connection.ts` — SQLite + WAL, soft-delete queries
- `src/server/db/migrations/` — SQL schema versions (001–008)

**Auth**:
- `auth/session.ts` — Session token generation + validation
- `auth/password.ts` — Bcrypt hash/verify
- `auth/require-auth.ts` — Express middleware for protected routes

### 3. Data Layer (SQLite)

**Key Tables**:

| Table | Purpose | Notable Columns |
|-------|---------|-----------------|
| `settings` | App config | `public_report_enabled`, `public_report_token`, `show_guests` |
| `members` | CLB members | `name`, `skill_level` (0–10), `phone`, `deleted_at` |
| `sessions` | Events | `title`, `session_date`, `location`, `manual_total`, `status` (draft/open/settled) |
| `session_courts` | Court costs | `session_id`, `venue_name`, `cost` |
| `session_participants` | Attendance + billing | `member_id`, `name`, `status`, `should_charge`, `paid_by` (proxy), `final_amount`, `paid_amount`, `payment_status` |
| `cost_items` | Add-on costs | `session_id`, `description`, `amount` |

**Migrations** (Latest):
- **007** (`007_paid_by.sql`): Adds `paid_by INTEGER` to enable proxy registration
- **008** (`008_public_report_settings.sql`): Adds public report settings columns

## Key Feature Architectures

### Reports Dashboard (Admin)

**Data Flow**:
```
GET /api/admin/reports?from=YYYY-MM-DD&to=YYYY-MM-DD
  ↓
reports-service.getReport(filter)
  ├─ getFinanceStats() → {totalCollected, totalOutstanding, totalSessionCost}
  ├─ getSessionsStats() → {breakdown[session_id, collected, outstanding]}
  ├─ getMembersStats() → {topParticipants, topDebtors, attendanceRates}
  └─ getPaymentHistory() → recent payments
  ↓
JSON response
  ↓
Reports Page renders 4 cards (Finance, Sessions, Members, Payments)
```

**Date Filtering**: All stats queries filter `sessions.session_date` by range; defaults to all-time if omitted.

### Proxy Registration (Paid-By)

**Registration Flow**:
```
1. Registrant fills form (name, skill level, etc.)
2. If registrant has companions (up to 5):
   - For each companion: insert participant row with registrant's participant.id in paid_by
   - Registrant's bill aggregates all: final_amount = sum(registrant + companions per-person share)
3. Followers inherit payer's session_id, final_amount calculation
4. Debt view groups followers under registrant in collapsible row
```

**Constraints**:
- Followers' bill tokens return 404 (only payer can view shared links)
- `paid_by` self-FK ensures data integrity (foreign key deferred for insertion)

### Public Participation Report (Shareable)

**Settings** (Migration 008):
- `settings.public_report_enabled` (bool) — Admin toggle to allow sharing
- `settings.public_report_token` (string) — Unique UUID for this site's report
- `settings.show_guests` (bool) — Whether to include guest list in report

**Access Flow**:
```
1. Host navigates to Reports page
2. Customizes: time range (All / this month / custom) + show_guests toggle
3. Generates share link: /r/:token?from=YYYY-MM-DD&to=YYYY-MM-DD
4. Shared link calls GET /api/public/report/:token?from&to
   - Validates token matches settings.public_report_token
   - Checks public_report_enabled = true
   - If show_guests = false, omits guest list
   - Returns: {generatedAllTime, members[], guests?[]}
5. Public page displays participation counts ONLY (no money, no phone)
```

**Privacy Headers**: `no-store, no-referrer` prevent caching/referrer leaks.

## Design System

**Tailwind Config**:
- **Colors**: Cream background (`#F5F3F0`), white cards (`#FFFFFF`)
- **Shadow Scale**: 4–5 shadow variants for visual depth
- **Typography**: Vietnamese text (fallback to system fonts)
- **Components**: Consistent spacing, border-radius, hover states

**Icon System**:
- Inline SVG icon component (`src/client/components/icon.tsx`)
- Used in buttons, navigation, and UI elements

## Authentication & Security

**Model**: Session-based (no OAuth, custom implementation)

**Flow**:
```
1. User logs in → password hashed with bcrypt
2. Server generates session token (random + salt)
3. Client stores token in HttpOnly cookie
4. Protected routes check token via require-auth middleware
5. Logout deletes session token
```

**Notes**:
- No external auth provider (KISS principle)
- Passwords hashed with bcrypt (salted)
- Session tokens stored server-side (SQLite)

## Database Query Patterns

**Cost Calculation**:
```sql
session_total = manual_total IF set
              OR sum(courts.cost) + sum(cost_items.amount) otherwise
```

**Debt Calculation**:
```
outstanding = sum(final_amount - paid_amount)
            where payment_status IN ('unpaid', 'partial')
            AND (final_amount - paid_amount) > 0
```

**Attendance Counting** (Participation Report):
```sql
count sessions where status IN ('open', 'settled')
                AND (sp.status = 'attended' OR sp.should_charge = 1)
                AND soft_deleted = false
                AND within date range [from, to]
```

## Deployment Model

**Development**:
- Vite dev server (HMR on localhost:5173)
- Node.js backend (localhost:3000)
- SQLite file-based DB (data/badminton.db)

**Production**:
- Vite production build → static HTML/JS/CSS
- Node.js backend (single process)
- SQLite WAL mode for multi-access
- Docker container (optional)

## Technology Dependencies

- **React 18**: UI framework
- **Vite**: Build tool + dev server
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling
- **SQLite3**: Database
- **bcryptjs**: Password hashing
- **Express-like routing**: Custom lightweight router

## Error Handling

**Client**:
- Try-catch around API calls
- User-friendly error messages in toast/modal
- Validation before form submission

**Server**:
- Route handlers wrap in try-catch
- Return 400 (validation), 401 (auth), 404 (not found), 500 (server error)
- Log errors (no sensitive data in logs)

## Testing Strategy

- **Unit tests**: Service layer (cost-service, reports-service, payment-service)
- **Integration tests**: Route + DB (happy path + error scenarios)
- **E2E**: Critical user journeys (login, create session, register player, split costs)
