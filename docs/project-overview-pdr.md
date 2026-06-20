# Project Overview & Product Development Requirements (PDR)

**Project Name**: Badminton Host  
**Version**: 1.0.0  
**Last Updated**: 2026-06-20  
**Status**: MVP Complete  
**Repository**: Private (self-hosted)

## Executive Summary

Badminton Host is a web platform for managing badminton club sessions, splitting costs fairly among players, and tracking participation. It enables hosts to schedule court bookings, register players (including companions via proxy registration), calculate individual bills, monitor payments, and share anonymous participation reports with club members.

## Project Purpose

### Vision
Simplify badminton club administration by providing a single platform for session management, fair cost allocation, payment tracking, and transparent financial reporting.

### Mission
Deliver a lightweight, self-hosted web app that:
- Enables quick session creation and player registration
- Accurately splits court + add-on costs among participants
- Tracks payment status (unpaid → partial → paid)
- Provides clear financial dashboards for club hosts
- Shares public participation metrics (no money/phone data leaks)
- Supports proxy registration (one player pays for companions)

### Core Value Proposition
- **Fair Splitting**: Automatic cost allocation based on participation + role
- **Payment Clarity**: Track who owes what, create payment reminders
- **Privacy First**: Participation reports hide sensitive financial data
- **Easy Sharing**: Generate shareable links for bills and attendance reports
- **Vietnamese-Friendly**: Skill levels in Vietnamese amateur labels (Newbie → Khá+)

## Target Users

**Primary**: Badminton club hosts/organizers managing 50–500 players

**Secondary**: Individual players viewing their bills and session history

### User Personas

**Persona 1: Club Organizer (Huy)**
- **Needs**: Quick session setup, fair cost splitting, payment tracking, club analytics
- **Pain Points**: Manual spreadsheets, calculation errors, payment follow-up overhead
- **Solution**: Badminton Host automates cost splitting, tracks payments, generates reports

**Persona 2: Regular Player**
- **Needs**: Know their bill, pay on time, see attendance stats
- **Pain Points**: Unclear cost breakdowns, no payment reminder, missing session history
- **Solution**: Individual bill pages with clear breakdown, shareable payment links

**Persona 3: Visiting Guest**
- **Needs**: Register for session, know their cost, pay their share
- **Pain Points**: External payment coordination, uncertain of total cost
- **Solution**: Public session page + shareable bill (no account needed)

## Key Features (MVP – Session 7)

### 1. Session Management
- Create, edit, and manage badminton sessions (date, venue, courts, player list)
- Manual cost override (`manual_total`) for flexibility
- Multiple court bookings per session + add-on costs (food, transportation)
- Session status tracking (draft → open → settled)

### 2. Smart Cost Splitting
- Automatic per-person cost calculation (court cost / participant count)
- Add-on items allocated fairly
- Support for "should_charge" flag (players who participate but don't pay)
- Accurate financial reporting across all participants

### 3. Player Registration & Skill Tracking
- Register players with Vietnamese skill levels (0–10: Newbie → Khá+)
- Track attendance status (attended / absent / waived)
- Support for one-time guests (no membership required)
- Proxy registration: one player can register + pay for up to 5 companions

### 4. Payment Management
- Track payment status per participant: unpaid → partial → paid/waived
- Mark partial payments with exact amount
- Payment update timestamps for auditing
- Shareable bill tokens (public link to individual's session bill)
- Share bill link from debts page for payment reminders

### 5. Admin Reports Dashboard
- **Finance**: Total collected, outstanding, session costs, pending payments
- **Sessions**: Per-session breakdown (participant count, collected, outstanding)
- **Members**: Top participants, top debtors, attendance rates
- **Payments**: Recent payment history (30-item limit)
- Date range filtering (all-time, month, custom range)

### 6. Public Participation Reports
- Shareable participation report (token-gated, time-range customizable)
- Shows member names + session count only (NO money, NO phone)
- Optional guest list toggle (host controls visibility)
- Privacy headers prevent caching/referrer leaks
- Customizable time range (All / this month / custom dates)

### 7. UI Design System
- Cream background (#F5F3F0) + white card design
- Shadow scale for visual depth (elevation system)
- Inline SVG icon component
- Responsive mobile-first layout
- Consistent button, badge, chip, modal components

## Technical Specifications

**Architecture**: Full-stack monolithic web app (React frontend + Node.js backend + SQLite)

**Frontend**:
- React 18 + TypeScript
- Vite build tool
- Tailwind CSS + custom design system
- Session-based auth

**Backend**:
- Node.js + Express-like routing
- SQLite database (WAL mode for concurrent access)
- Bcrypt password hashing
- RESTful JSON API

**Database**:
- 6 core tables (settings, members, sessions, session_courts, session_participants, cost_items)
- 8 migrations to date (latest: 008_public_report_settings)
- Soft deletes on all tables for safe recovery
- Foreign key constraints (including self-FK for proxy registration)

**Key Endpoints**:
- `GET /api/admin/reports` — Reports dashboard (date-filtered)
- `POST /api/sessions` — Create session
- `POST /api/sessions/:id/participants` — Register player (with optional companions)
- `POST /api/sessions/:id/participants/:pid/payments` — Mark payment status
- `GET /api/public/session/:id` — Public session view (with venue map)
- `GET /api/public/bill/:token` — Shareable bill
- `GET /api/public/report/:token` — Participation report (token-gated, privacy-safe)

## Success Criteria

| Criterion | Target | Status |
|-----------|--------|--------|
| Session creation + registration | <2 min | ✅ |
| Cost splitting accuracy | 100% | ✅ |
| Payment tracking completeness | All statuses tracked | ✅ |
| Report generation | <1 sec | ✅ |
| Bill sharing (public) | Secure token access | ✅ |
| Participation report | Privacy-safe (no money/phone) | ✅ |
| Proxy registration | Support 5 companions per registrant | ✅ |
| Mobile usability | Responsive design | ✅ |

## Known Limitations

1. **SQLite scalability**: Handles small-to-medium clubs (< 100k rows); PostgreSQL for larger scale
2. **No payment gateway**: Manual cash/transfer settlement (no Stripe/SePay integration yet)
3. **No recurring sessions**: Each session created manually (no weekly templates)
4. **No SMS/email notifications**: Payment reminders via shareable links only
5. **No member avatars**: Names only, no profile photos

## Roadmap (Post-MVP)

- **Phase 8** (Q3 2026): Comprehensive test suite + E2E tests
- **Phase 9** (Q3 2026): Payment gateway integration (Stripe or SePay)
- **Phase 10** (Q4 2026): Mobile app (React Native) or PWA
- **Phase 11** (Q4 2026): Advanced analytics (charts, trends, skill progression)
- **Phase 12+**: Recurring sessions, SMS notifications, multi-club support

## Deployment

**Current**: Self-hosted on Huy's server (Docker container)  
**Database**: SQLite file-based (data/badminton.db)  
**Backups**: Manual backup strategy (data/ directory versioned)  
**Scaling**: Single-process Node.js (vertical scaling only)

## Acceptance Criteria (MVP Session 7)

- ✅ UI redesigned with cream + card system applied across all pages
- ✅ Reports dashboard live with finance/sessions/members/payments aggregates
- ✅ Proxy registration working (paid_by FK, companion grouping in debts)
- ✅ Public participation report shareable + token-gated
- ✅ Customizable report share control (time range + guest toggle)
- ✅ All 8 migrations in place
- ✅ Vietnamese skill levels (0–10) fully integrated
- ✅ Public bill + session pages with venue map
- ✅ Debts page refactored (person-centric, drill-down, share link)

## Metrics (as of Session 7)

- **Lines of Code**: ~2,500 (React components + services)
- **TypeScript Coverage**: 100%
- **Database Migrations**: 8 active
- **API Endpoints**: 15+ routes
- **Test Coverage**: TBD (to be added in Phase 8)
- **Documentation**: codebase-summary, system-architecture, project-roadmap, this PDR

## Team

**Developer**: Huy Pham (solo)  
**Role**: Full-stack (architecture, backend, frontend, DB, ops)  
**Development Workflow**: Feature-driven sessions (1–2 week iterations)

## Next Session Priorities

1. Add comprehensive test suite (unit + integration + E2E)
2. Evaluate PostgreSQL migration for scalability
3. Collect user feedback on UX (debts page, reports dashboard, payment flow)
4. Plan Phase 8+ features (payment gateway, mobile app, advanced analytics)
