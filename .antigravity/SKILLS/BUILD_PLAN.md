# TransitOps BUILD_PLAN

This is the single source of truth for building TransitOps with an AI coding agent. Read it top to bottom before writing any code. It defines the rules, the structure, and an ordered list of milestones. Each milestone is one feature and ends in exactly one commit.

---

## HOW TO USE THIS FILE (read first, non-negotiable)

YOU MUST follow these rules for every milestone. No exceptions.

1. Work milestones in order. Do not start milestone N+1 until milestone N is committed.
2. A milestone is a contract. Complete every item in its checklist before you commit. A half-done milestone is a failed milestone.
3. Before each commit, run the milestone's Verify block. If any check fails, fix it. Do not commit red.
4. Commit with the exact message given. One milestone, one commit.
5. After committing, announce completion in this format: "Milestone Mx complete and committed: <message>". Then move on.
6. Never set an entity status inside a server action. Status changes live only in `server/services/*`. Breaking this rule breaks the app. Every time.
7. Every write action starts with a `requirePermission(...)` guard and a Zod `.parse(...)`. An action without both is incomplete.

These rules exist because status drift and skipped validation are the two failures that sink this project under time pressure.

---

## GLOBAL CONVENTIONS

- TypeScript strict. Functional and declarative. No classes.
- Prefer React Server Components. Reach for `use client` only for forms and interactivity.
- Directory names: lowercase with dashes.
- Descriptive names with auxiliary verbs: `isLoading`, `hasError`.
- Early returns and guard clauses for error and edge cases.
- Validate everything with Zod. One schema per entity in `lib/validations`.
- UI from shadcn/ui plus Tailwind. Dark mode via `next-themes`.
- Data reads through `db` (neon-http). Transactions through `txDb` (pooled).

## LAYER RULE (the spine of the build)

```
component  ->  action (RBAC + Zod, then delegate)  ->  service (rules + transactions)  ->  db
```

Simple CRUD (create a vehicle, edit a driver) may write from the action. Anything that moves a status (dispatch, complete, cancel, open or close maintenance) MUST call a service.

---

## PRIORITY TIERS

- Milestones M0 to M10 are the mandatory core. Ship these first, in order.
- M11 to M13 are the innovation layer. Pick at least one (M11 recommended).
- M14 to M16 are bonus and polish. Do these only if the core is solid.

Target for eight hours: M0 to M10 flawless, plus M11. A perfect core with one polished AI feature beats a shaky core with three.

---

## MILESTONE M0: Project scaffold and tooling

Goal: a running Next.js app with the stack installed and the database reachable.

Checklist:
- [ ] Next.js 15 App Router project with TypeScript strict and the `@/*` path alias.
- [ ] Install dependencies from `package.json` (Drizzle, Neon, Auth.js, shadcn deps, TanStack Query, Zod, Zustand, Recharts, Bedrock SDK, bcryptjs, PapaParse).
- [ ] Tailwind v4 configured. `globals.css` has the shadcn tokens and dark mode.
- [ ] shadcn initialised (`components.json` present). Add: button, input, label, card, table, dialog, select, dropdown-menu, badge, sonner, tabs.
- [ ] `.env` created from `.env.example`. Fill `DATABASE_URL` (Neon), `AUTH_SECRET`, AWS keys.
- [ ] `drizzle.config.ts`, `src/db/index.ts`, `src/db/tx.ts` in place and importing without error.

Verify:
- [ ] `npm run dev` serves without errors.
- [ ] `npm run typecheck` passes.

Commit: `chore: scaffold next.js app with drizzle, neon, shadcn, and tooling`

---

## MILESTONE M1: Database schema, migration, and seed

Goal: the full schema exists in Neon with demo data.

Checklist:
- [ ] All schema files present: `enums.ts`, `auth.ts`, `fleet.ts`, `operations.ts`, `support.ts`, `index.ts`.
- [ ] Tables: roles, users, accounts, sessions, verification_tokens, vehicles, drivers, trips, maintenance_logs, fuel_logs, expenses, vehicle_documents, status_history, notifications, ai_suggestions.
- [ ] All enums defined and used (vehicle_status, driver_status, trip_status, maintenance_status, expense_type, user_role, document_type, notification_type, ai_suggestion_type).
- [ ] `npm run db:generate` produces a migration. `npm run db:migrate` applies it.
- [ ] `src/db/seed.ts` seeds four roles, four demo users (one per role), two vehicles, two drivers. `npm run db:seed` runs clean.

Verify:
- [ ] `npm run db:studio` shows all tables populated.
- [ ] Logging in later with a seeded user will work (passwords are hashed).

Commit: `feat: database schema, migrations, and seed data`

---

## MILESTONE M2: Authentication and RBAC

Goal: only authenticated users get in, and each role sees only what it may.

Checklist:
- [ ] `lib/auth.ts`: Auth.js v5 credentials provider verifying bcrypt hashes, JWT sessions, role in the token.
- [ ] `app/api/auth/[...nextauth]/route.ts` exports handlers.
- [ ] `lib/rbac.ts`: permission matrix for the four roles plus `can()` and `requirePermission()`.
- [ ] `middleware.ts` redirects unauthenticated users to `/login` and logged-in users away from `/login`.
- [ ] `/login` page with a working email and password form that calls `signIn`.

Verify:
- [ ] Visiting `/dashboard` while logged out redirects to `/login`.
- [ ] Each seeded user can log in. Wrong password is rejected.
- [ ] A server action guarded by a permission the current role lacks throws Forbidden.

Commit: `feat: authentication with credentials and role-based access control`

---

## MILESTONE M3: App shell and navigation

Goal: the protected layout every page lives inside.

Checklist:
- [ ] `(dashboard)/layout.tsx` with a sidebar (Dashboard, Vehicles, Drivers, Trips, Maintenance, Fuel, Expenses, Reports, Assistant) and a header showing the user and a sign-out.
- [ ] Sidebar items are filtered by the user's permissions.
- [ ] Dark mode toggle wired to `next-themes`.
- [ ] Responsive: sidebar collapses on mobile.
- [ ] Toast provider (sonner) mounted for action feedback.

Verify:
- [ ] Every nav link routes correctly. Signed-out users cannot reach any of them.
- [ ] Toggling dark mode persists across navigation.

Commit: `feat: app shell with sidebar, header, dark mode, and toasts`

---

## MILESTONE M4: Vehicle registry (CRUD)

Goal: full vehicle management. Reference the pattern in `server/actions/vehicles.ts`.

Checklist:
- [x] `vehicleSchema` in `lib/validations` drives the form and the action.
- [x] Actions: create, update, retire, list. Each guarded by the right vehicle permission.
- [x] `/vehicles` page: a data table with registration, name, type, capacity, odometer, status badge.
- [x] Create and edit via a dialog form. Registration number uniqueness surfaced as a friendly error.
- [x] Retire sets status to retired (retired is terminal, no delete).

Verify:
- [x] Creating a duplicate registration number is blocked with a clear message.
- [x] A retired vehicle shows a retired badge and cannot be edited back into service casually.

Commit: `feat: vehicle registry with crud and validation`

---

## MILESTONE M5: Driver management (CRUD)

Goal: full driver management with compliance fields.

Checklist:
- [x] `driverSchema` covers name, license number, category, expiry date, contact, safety score, status.
- [x] Actions: create, update, suspend or reinstate, list. Guarded by driver permissions.
- [x] `/drivers` page: table with name, license, expiry (highlight if within 30 days or expired), safety score, status.
- [x] Safety Officer can change status; other roles are read-only per the matrix.

Verify:
- [x] A driver with an expiry date in the past is visibly flagged.
- [x] Safety score is clamped to 0 to 100.

Commit: `feat: driver management with crud and compliance fields`

---

## MILESTONE M6: Trip management and business rules

Goal: the state machine. This is the highest-value milestone. Use `server/services/trip-service.ts`.

Checklist:
- [ ] `server/services/trip-service.ts`: `dispatchTrip`, `completeTrip`, `cancelTrip`, all transactional, all writing `status_history`.
- [ ] Guards enforced on dispatch: vehicle available (not retired, in_shop, or on_trip), driver available and not suspended, licence not expired, cargo weight within capacity.
- [ ] Dispatch sets vehicle and driver to on_trip. Complete restores both to available and advances the odometer. Cancel from dispatched restores both.
- [ ] Actions in `server/actions/trips.ts` only create drafts and delegate transitions to the service.
- [ ] `/trips` page: create trip (dropdowns show only eligible vehicles and drivers), then dispatch, complete (enter final odometer and fuel), or cancel.

Verify (run the brief's exact workflow):
- [ ] Register a 500 kg vehicle and a valid driver, create a 450 kg trip, dispatch succeeds, both go on_trip.
- [ ] Complete the trip, both return to available.
- [ ] Attempting a 600 kg cargo on the 500 kg vehicle is blocked.
- [ ] A suspended driver and an in_shop vehicle never appear in the dispatch dropdowns and are rejected if forced.

Commit: `feat: trip management with transactional business rules and status transitions`

---

## MILESTONE M7: Maintenance workflow

Goal: opening maintenance pulls a vehicle from the pool, closing returns it. Use `maintenance-service.ts`.

Checklist:
- [x] `server/services/maintenance-service.ts`: `openMaintenance`, `closeMaintenance`, transactional, writing `status_history`.
- [x] Opening sets the vehicle to in_shop. Closing restores to available unless the vehicle is retired.
- [x] Cannot open maintenance on a vehicle that is on_trip.
- [x] `/maintenance` page: list of records with status, plus open and close actions and a cost field.

Verify:
- [x] Opening maintenance on a vehicle immediately removes it from the trip dispatch dropdown.
- [x] Closing maintenance returns it to the dropdown.

Commit: `feat: maintenance workflow with automatic in-shop transitions`

---

## MILESTONE M8: Fuel and expense tracking

Goal: record costs and compute operational cost per vehicle.

Checklist:
- [x] `fuelLogSchema` and `expenseSchema` in validations.
- [x] Actions for fuel logs (vehicle, optional trip, litres, cost, odometer, date) and expenses (type, amount, date, optional links).
- [x] `/fuel` and `/expenses` pages with tables and create dialogs.
- [x] An `analytics` service function computes total operational cost per vehicle = fuel + maintenance + expenses.

Verify:
- [x] Adding a fuel log and a maintenance cost updates that vehicle's total operational cost.

Commit: `feat: fuel and expense tracking with operational cost computation`

---

## MILESTONE M9: Dashboard KPIs and filters

Goal: the at-a-glance operations view.

Checklist:
- [ ] KPI cards: Active Vehicles (on_trip), Available Vehicles, In Maintenance, Active Trips (dispatched), Pending Trips (draft), Drivers On Duty, Fleet Utilization percent.
- [ ] Fleet utilization = on_trip vehicles / (total minus retired) as a percentage.
- [ ] Filters by vehicle type, status, and region that update the KPIs.
- [ ] KPIs computed in Server Components and refreshed by `revalidatePath` after trip and maintenance actions.

Verify:
- [ ] Dispatching a trip increments Active Trips and Active Vehicles live.
- [ ] Filters change the numbers correctly.

Commit: `feat: dashboard with live kpis and filters`

---

## MILESTONE M10: Reports and analytics with CSV export

Goal: the numbers a manager acts on.

Checklist:
- [ ] Metrics via `lib/utils.ts` and the analytics service: fuel efficiency (distance / fuel), fleet utilization, operational cost, vehicle ROI = (revenue minus (maintenance + fuel)) / acquisition cost.
- [ ] `/reports` page with Recharts visuals: cost by vehicle, utilization trend, efficiency per vehicle.
- [ ] CSV export via PapaParse for each report table.

Verify:
- [ ] ROI and efficiency match a hand calculation on the seeded data.
- [ ] CSV downloads and opens correctly.

Commit: `feat: reports and analytics with charts and csv export`

---

## MILESTONE M11: AI Dispatch Copilot (innovation, recommended)

Goal: ranked vehicle plus driver suggestions when creating a trip. Use `server/services/dispatch-ai.ts` and `lib/bedrock.ts`.

Checklist:
- [ ] `lib/bedrock.ts` invoke helpers working against the configured Bedrock model.
- [ ] `dispatch-ai.ts` filters to legally eligible assets FIRST (same guards as the trip service), then asks Bedrock to rank by load fit, safety score, region match, and utilization.
- [ ] Every recommendation is persisted to `ai_suggestions` with a confidence score.
- [ ] `app/api/ai/dispatch/route.ts` plus a "Suggest best match" button on the create-trip form that pre-fills the top pairing with its rationale shown.

Verify:
- [ ] The copilot never suggests a retired, in_shop, on_trip, over-capacity, suspended, or expired-licence pairing.
- [ ] A sensible ranking appears with a one-line reason per option.

Commit: `feat: ai dispatch copilot with bedrock ranking over eligible assets`

---

## MILESTONE M12: Predictive maintenance and fuel anomaly detection (innovation)

Goal: surface risk before it becomes a breakdown or a loss.

Checklist:
- [ ] Scoring query per vehicle: distance since last service, trip intensity, age proxy from odometer.
- [ ] Bedrock turns the scores into a ranked "at risk" panel with reasoning, saved to `ai_suggestions`.
- [ ] Fuel anomaly check: flag any fuel log whose implied efficiency falls far outside the vehicle's normal band, with a Bedrock explanation and suggested action.
- [ ] Both surfaced on the dashboard and written to `notifications`.

Verify:
- [ ] A deliberately bad fuel log gets flagged. A normal one does not.

Commit: `feat: predictive maintenance and fuel anomaly detection`

---

## MILESTONE M13: Natural-language fleet assistant (innovation)

Goal: ask the fleet questions in plain English.

Checklist:
- [ ] `/assistant` chat page.
- [ ] `app/api/ai/assistant/route.ts` builds a compact, safe JSON snapshot of current fleet state (or parameterised queries) and passes it to Bedrock.
- [ ] Answers cite the numbers they used. No free-form SQL from the model touches the database directly.
- [ ] Handles: licences expiring soon, underutilised vehicles, highest-cost vehicles, drivers by safety score.

Verify:
- [ ] "Which licences expire in the next 30 days" returns the correct drivers from seeded data.

Commit: `feat: natural language fleet assistant over bedrock`

---

## MILESTONE M14: Compliance reminders and notifications (bonus)

Goal: proactive alerts for expiries.

Checklist:
- [ ] `app/api/cron/compliance/route.ts` sweeps for licences and documents expiring within a window and writes `notifications`.
- [ ] A notifications bell in the header with unread count and a read toggle.
- [ ] Optional email send for reminders (log to console if no mail provider is configured).

Verify:
- [ ] A driver with a licence expiring in 20 days produces a notification on sweep.

Commit: `feat: compliance reminders and in-app notifications`

---

## MILESTONE M15: Vehicle document management with AI extraction (bonus)

Goal: upload a document, get structured data back.

Checklist:
- [ ] Upload UI on the vehicle detail view. Files stored (local or a bucket), URL saved to `vehicle_documents`.
- [ ] Bedrock extracts document type and expiry into `extractedData`, which feeds the compliance sweep from M14.

Verify:
- [ ] Uploading a sample insurance document creates a record with an extracted expiry date.

Commit: `feat: vehicle document management with ai field extraction`

---

## MILESTONE M16: PDF export and final polish (bonus)

Goal: presentation-ready output and a clean demo.

Checklist:
- [ ] PDF export for reports.
- [ ] Empty states, loading skeletons, and error boundaries on every list page.
- [ ] Search, filter, and sort on the vehicle, driver, and trip tables.
- [ ] Final `npm run typecheck` and `npm run lint` both clean.

Verify:
- [ ] A full demo run of the brief's example workflow is smooth end to end.

Commit: `feat: pdf export, search and filters, and final polish`

---

## DEFINITION OF DONE (for the whole project)

The brief's example workflow passes flawlessly, every mandatory business rule is enforced through the service layer, RBAC gates every write, the dashboard KPIs move in real time, reports compute correctly and export to CSV, and at least one Bedrock innovation is demoable. That is a winning submission.
