# Project Roadmap — Badminton Host

**Last Updated**: 2026-06-20  
**Version**: 1.0.0  
**Status**: MVP Complete (Session 7 — Latest Features Shipped)

## Phase Overview

### Phase 1: Core Infrastructure (COMPLETE)
- SQLite schema + migrations (soft-deletes, WAL mode)
- Express-like API routing
- Session-based auth (bcrypt passwords)
- Vite + React frontend
- Type safety (TypeScript)

**Status**: ✅ Complete (Session 1–2)

### Phase 2: Session & Cost Management (COMPLETE)
- Create/edit sessions with courts and date
- Add-on costs (food, transportation)
- Participant registration + attendance tracking
- Manual cost override (manual_total)
- Cost splitting: allocate court/item costs per participant

**Status**: ✅ Complete (Session 3–4)

### Phase 3: Bill Sharing & Payments (COMPLETE)
- Shareable bill tokens (public access to individual's session bill)
- Mark payment status: unpaid → partial → paid/waived
- Payment tracking (paid_amount, payment_status, updated_at)
- Member list with skill level tracking

**Status**: ✅ Complete (Session 5)

### Phase 4: UI Redesign & Design System (COMPLETE)
- Cream background + white card design
- Shadow scale + consistent spacing
- Inline SVG icon component
- Applied across all admin + public pages
- Responsive mobile-friendly layout

**Status**: ✅ Complete (Session 6)

### Phase 5: Reports & Analytics (COMPLETE)
- Admin reports dashboard: Finance, Sessions, Members, Payments aggregates
- Date range filtering (all-time, month, custom)
- Top participants + debtors ranking
- Attendance rate tracking
- Recent payment history (30-item limit)

**Status**: ✅ Complete (Session 6)

### Phase 6: Debts Refactoring & Proxy Registration (COMPLETE)
- Person-centric debt view (drill-down per session)
- Collapsible per-session breakdown
- Inline mark-paid/partial actions
- Share bill link from debts for payment reminders
- **Proxy Registration**: One player registers + pays for up to 5 companions
- Migration 007: `paid_by` column for companion tracking
- Debts grouped under payer in UI

**Status**: ✅ Complete (Session 7)

### Phase 7: Public Sharing & Customization (COMPLETE)
- **Public Participation Report**: Shareable token with participation counts only (no money/phone)
- Migration 008: Public report settings (`public_report_enabled`, `public_report_token`, `show_guests`)
- Customizable share control: time range (All/this month/custom) + guest visibility toggle
- Privacy headers (`no-store, no-referrer`)
- Public page: `/r/:token?from=YYYY-MM-DD&to=YYYY-MM-DD`
- Access validation: uniform 404 if token invalid or settings disabled

**Status**: ✅ Complete (Session 7)

## Feature Completion Summary

| Feature | Session | Status | Notes |
|---------|---------|--------|-------|
| Schema + Auth | 1–2 | ✅ | SQLite, bcrypt, sessions |
| Sessions CRUD | 3 | ✅ | Create, edit, delete, manual cost override |
| Participants + Costs | 4–5 | ✅ | Court registration, cost items, splitting |
| Bill Sharing | 5 | ✅ | Public shareable bill tokens |
| Payments | 5 | ✅ | Track paid/partial/waived, updated_at |
| UI Redesign | 6 | ✅ | Design system, icon component, responsive |
| Reports Dashboard | 6 | ✅ | Finance, sessions, members, payments aggregates |
| Debts Refactoring | 7 | ✅ | Person-centric view, drill-down, share link |
| Proxy Registration | 7 | ✅ | Register companions, paid_by FK, group debts |
| Public Report (Custom) | 7 | ✅ | Shareable participation counts, time range + guest toggle |

## Shipped Endpoints (Session 7)

**Admin**:
- `GET /api/admin/reports?from=YYYY-MM-DD&to=YYYY-MM-DD` — Reports dashboard

**Sessions**:
- `POST /api/sessions` — Create
- `PUT /api/sessions/:id` — Update (including manual_total)
- `GET /api/sessions/:id` — Detail
- `POST /api/sessions/:id/participants` — Register (with optional companions via paid_by)

**Participants**:
- `POST /api/sessions/:id/participants/:pid/payments` — Mark paid/partial/waived

**Public**:
- `GET /api/public/session/:id` — Public session page (with Google Maps + venue)
- `GET /api/public/bill/:token` — Shareable bill
- `GET /api/public/report/:token?from=YYYY-MM-DD&to=YYYY-MM-DD` — Participation report (token-gated, no money)

**Database Migrations**:
- 001–006: Core schema (members, sessions, courts, participants, costs)
- 007: `paid_by` column for proxy registration
- 008: Public report settings

## Known Limitations & Future Enhancements

### Current Limitations
1. **SQLite scalability**: Suitable for small-to-medium CLBs; consider PostgreSQL for 100k+ rows
2. **No external payment API**: Badminton club would receive manual payment (cash/transfer); integrate Stripe/SePay later if needed
3. **Single-pass attendance**: No RSVP flow; participants marked "attended/absent" at end of session
4. **Member photos**: Not yet supported; could add avatar upload + CloudFlare R2 storage
5. **Recurring sessions**: No template for weekly/monthly sessions; must create manually

### Potential Enhancements
- **Recurring session templates**: Auto-create sessions (e.g., every Tuesday)
- **SMS/Email notifications**: Remind players of upcoming sessions or payment due
- **Member photos + avatars**: Upload + display in participant lists
- **Advanced analytics**: Charts (revenue over time, attendance trends)
- **Export reports**: PDF/CSV download of reports
- **Payment gateway**: Stripe/SePay integration for online payment
- **Chat/messaging**: In-app messages for bill disputes or coaching feedback
- **Mobile app**: React Native or PWA version
- **Sponsorships**: Badminton racket brands, court venue sponsorships
- **Coaching analytics**: Track player performance, skill progression

## Code Quality Metrics

**Last Audit**: 2026-06-20

| Metric | Target | Current | Notes |
|--------|--------|---------|-------|
| TypeScript Coverage | 100% | ✅ | All .ts/.tsx files typed |
| Test Coverage | >70% | TBD | Unit + integration tests needed |
| File Size Avg | <200 LOC | ✅ | Well-modularized components |
| Migration Status | Up-to-date | ✅ | 008_public_report_settings.sql |
| Documentation | >60% | ✅ | codebase-summary, system-architecture, roadmap |

## Development Team

**Current**: Solo developer (HuyPG)  
**Deployment**: Self-hosted (Docker optional)  
**License**: Private (internal use)

## Version History

| Version | Date | Highlights |
|---------|------|-----------|
| 1.0.0 | 2026-06-20 | Public report sharing, proxy registration, UI redesign, reports dashboard |
| (Pre-1.0) | 2026-06-01 | MVP launch: sessions, costs, bill sharing, debts, payments |

## Next Steps (Post-MVP)

1. **Testing**: Write comprehensive unit + E2E tests
2. **Scalability**: Evaluate PostgreSQL migration if user base grows
3. **Payment integration**: Add Stripe/SePay for online settlements
4. **Mobile-first**: Optimize for phone usage during sessions
5. **Analytics**: Revenue charts, attendance trends, player performance rankings
6. **Community**: Multi-club support (if Huy wants to share platform with other clubs)
