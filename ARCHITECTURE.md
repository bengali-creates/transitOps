# TransitOps: Architecture Design

## 1. Stack and why each piece is here

| Layer | Choice | Reason |
| --- | --- | --- |
| Framework | Next.js 15 (App Router) | Server Components keep data fetching on the server, Server Actions replace a separate REST layer, one deployable unit |
| Language | TypeScript (strict) | End to end type safety from the database row to the form |
| Database | NeonDB (serverless Postgres) | Managed Postgres with instant branches, HTTP driver for edge reads |
| ORM | Drizzle | Types generated from the schema, SQL-first, first-class Postgres enums and transactions |
| Auth | Auth.js v5 credentials | Email and password with a Drizzle adapter, JWT sessions carrying the role |
| UI | shadcn/ui plus Tailwind v4 | Owned components, no black-box dependency, dark mode from day one |
| Data fetching (client) | TanStack Query | Cache and mutate client-side lists without hand-rolled state |
| Client state | Zustand | Small global UI state (filters, sidebar) without Redux weight |
| Validation | Zod | One schema shared by the form and the server action |
| Charts | Recharts | Dashboard and reports visualisations |
| AI | AWS Bedrock | Dispatch copilot, predictive maintenance, fleet assistant |
| CSV | PapaParse | Report export |

The guiding principle from the project conventions: minimise `use client`, prefer React Server Components, push logic to the server, and validate everything with Zod.

## 2. Layered architecture

The codebase has four layers and data flows in one direction. This is the backbone of the whole design.

```
  ┌─────────────────────────────────────────────────────────┐
  │  PRESENTATION   app/  +  components/                     │
  │  Server Components render data. Client components handle  │
  │  forms and interactivity only.                            │
  └───────────────┬─────────────────────────────────────────┘
                  │ calls
  ┌───────────────▼─────────────────────────────────────────┐
  │  ACTIONS   server/actions/                               │
  │  "use server" entry points. Do three things and stop:    │
  │  RBAC guard  ->  Zod validate  ->  delegate.              │
  └───────────────┬─────────────────────────────────────────┘
                  │ calls
  ┌───────────────▼─────────────────────────────────────────┐
  │  SERVICES   server/services/                             │
  │  All business rules and status transitions. Runs inside  │
  │  transactions. This is where the state machine lives.    │
  └───────────────┬─────────────────────────────────────────┘
                  │ uses
  ┌───────────────▼─────────────────────────────────────────┐
  │  DATA   db/  (Drizzle + Neon)                            │
  │  Schema, client, migrations, seed.                       │
  └─────────────────────────────────────────────────────────┘
```

The rule that keeps the app correct: **simple CRUD may write through an action directly, but anything that changes a status must go through a service.** Actions never set `status` on vehicles, drivers, or trips. This single constraint is what stops the state machine from drifting.

## 3. Folder structure

```
transitops/
├── drizzle/                        # generated SQL migrations
├── drizzle.config.ts
├── components.json                 # shadcn config
├── package.json
├── .env.example
├── BUILD_PLAN.md                   # agentic milestones (the main spec)
├── ARCHITECTURE.md
├── UNDERSTANDING_AND_INNOVATION.md
└── src/
    ├── middleware.ts               # route protection
    ├── app/
    │   ├── globals.css
    │   ├── layout.tsx              # root layout + providers
    │   ├── providers.tsx           # theme, react-query, session
    │   ├── page.tsx                # redirect to /dashboard
    │   ├── (auth)/
    │   │   └── login/page.tsx
    │   ├── (dashboard)/            # protected group, shared shell
    │   │   ├── layout.tsx          # sidebar + header
    │   │   ├── dashboard/page.tsx
    │   │   ├── vehicles/
    │   │   ├── drivers/
    │   │   ├── trips/
    │   │   ├── maintenance/
    │   │   ├── fuel/
    │   │   ├── expenses/
    │   │   ├── reports/
    │   │   └── assistant/          # AI chat
    │   └── api/
    │       ├── auth/[...nextauth]/route.ts
    │       ├── ai/dispatch/route.ts
    │       ├── ai/assistant/route.ts
    │       └── cron/compliance/route.ts   # licence + document expiry sweep
    ├── components/
    │   ├── ui/                     # shadcn primitives
    │   ├── layout/                 # sidebar, header, theme toggle
    │   ├── dashboard/              # kpi cards, charts
    │   ├── vehicles/  drivers/  trips/  maintenance/
    │   └── charts/
    ├── db/
    │   ├── index.ts                # neon-http client (reads)
    │   ├── tx.ts                   # pooled client (transactions)
    │   ├── seed.ts
    │   └── schema/
    │       ├── index.ts            # barrel export
    │       ├── enums.ts
    │       ├── auth.ts             # roles, users, accounts, sessions
    │       ├── fleet.ts            # vehicles, drivers
    │       ├── operations.ts       # trips, maintenance, fuel, expenses
    │       └── support.ts          # documents, status_history, notifications, ai_suggestions
    ├── lib/
    │   ├── auth.ts                 # Auth.js config
    │   ├── rbac.ts                 # permission matrix + guards
    │   ├── bedrock.ts              # Bedrock invoke helpers
    │   ├── utils.ts                # cn, currency, efficiency, ROI
    │   └── validations/index.ts    # Zod schemas
    ├── server/
    │   ├── actions/                # vehicles, drivers, trips, maintenance, fuel, expenses
    │   └── services/               # trip-service, maintenance-service, dispatch-ai, analytics
    ├── hooks/
    ├── types/
    └── config/
```

Directory names use lowercase with dashes per the project conventions.

## 4. Request lifecycle

A dispatch, end to end:

1. The trips page (a Server Component) loads open trips and renders a client `DispatchButton`.
2. The user clicks. The client component calls the `dispatchTripAction` server action.
3. The action runs `requirePermission("trip:write")`. If the session role lacks it, it throws and the UI shows a forbidden state.
4. The action calls `dispatchTrip` in the trip service.
5. The service opens a transaction, reads the trip, vehicle, and driver, runs every guard, and on success updates all three rows plus writes three `status_history` records. Any failure rolls the whole thing back.
6. The action calls `revalidatePath("/trips")` and `revalidatePath("/dashboard")`, so the Server Components refetch and KPIs update.

No custom API endpoint was needed for that. Bedrock features do get thin route handlers under `app/api/ai/*` because they stream or are called from client widgets.

## 5. Database design

### Entity relationships

```
  roles ──1:N── users ──0:N── drivers
                  │                │
                  │ createdBy      │ driverId
                  ▼                ▼
   vehicles ──1:N── trips ──N:1── drivers
      │  1:N              1:N│  1:N│
      ▼                     ▼      ▼
  maintenance_logs      fuel_logs  expenses
      │
  vehicle_documents (1:N from vehicles)

  status_history, notifications, ai_suggestions  (cross-cutting logs)
```

### Tables

**roles.** The four operational roles, seeded. RBAC reads the role name carried on the user, so this table is reference data that lets permissions grow without a migration on `users`.

**users.** Login identity with `passwordHash`, an enum `role`, and the Auth.js adapter columns. Sessions are JWT so the role travels in the token.

**vehicles.** Registry with a unique `registration_number`, `max_load_capacity`, `odometer`, `acquisition_cost`, `region`, and a `status` enum of available, on_trip, in_shop, retired. Money and load values are `numeric` in string mode so they stay exact.

**drivers.** Profile with a unique `license_number`, `license_expiry_date`, `safety_score` (0 to 100), a `status` enum of available, on_trip, off_duty, suspended, and an optional `user_id` link to a login.

**trips.** The heart of the state machine. Source, destination, vehicle, driver, cargo weight, planned distance, plus outcome fields (actual distance, final odometer, fuel consumed, revenue) and per-transition timestamps (dispatched, completed, cancelled). Status enum: draft, dispatched, completed, cancelled.

**maintenance_logs.** Vehicle, type, cost, `status` of open or closed, with opened and closed timestamps. Opening drives the vehicle to in_shop, closing restores it.

**fuel_logs.** Litres, cost, odometer, date, linked to a vehicle and optionally a trip. Feeds fuel efficiency and cost.

**expenses.** Tolls, parking, and misc costs with an `expense_type` enum, optionally tied to a vehicle or trip. Together with fuel and maintenance it forms one cost ledger.

**Support tables.**
- `status_history`: an append-only audit of every automatic transition, which also powers cycle-time analytics.
- `vehicle_documents`: file URL, expiry date, and `extractedData` JSON for AI-parsed fields.
- `notifications`: in-app alerts that also back email reminders.
- `ai_suggestions`: persisted Bedrock output (dispatch ranking, maintenance flags, assistant answers) with a confidence score.

### Computed metrics

The report metrics are not stored, they are derived:

- Fuel efficiency = distance / fuel (guarded against divide by zero).
- Operational cost per vehicle = sum of fuel cost + maintenance cost + expenses.
- Fleet utilization = vehicles on_trip / (total minus retired), expressed as a percentage.
- Vehicle ROI = (revenue minus (maintenance + fuel)) / acquisition cost.

These live in `lib/utils.ts` and an `analytics` service so both the dashboard and the CSV export share one definition.

## 6. Authentication and RBAC

Auth.js v5 with a credentials provider verifies email and password against the bcrypt hash. The session strategy is JWT, and the role is copied into the token at sign in, so `middleware.ts` and every `requirePermission` guard can read the role with no extra database round trip.

RBAC is a permission matrix in `lib/rbac.ts`. Each of the four roles maps to a set of permissions that mirror its job in the brief. The Fleet Manager owns fleet assets and maintenance, the Driver creates and runs trips, the Safety Officer owns driver compliance, and the Financial Analyst owns expenses and reports. Every write action calls `requirePermission` before touching data, so authorisation is enforced at the boundary, not in the UI.

## 7. AI integration

`lib/bedrock.ts` wraps the Bedrock Runtime client with two helpers: `invokeText` for prose and `invokeJson` for structured output (it forces a JSON-only instruction and strips stray code fences). Every AI feature calls these, so the rest of the app receives plain typed objects and never sees raw model plumbing.

The safety design is the important part. The Dispatch Copilot filters to legally eligible assets using the same guards as the trip service **before** it asks the model to rank anything. The model ranks and explains, it never authorises. That keeps the hard business rules as the source of truth and uses AI only where judgement, not correctness, is what is needed.

## 8. Key design decisions, stated plainly

1. **Services own status, actions do not.** The one rule that keeps the state machine consistent.
2. **Two database clients.** An HTTP client for fast stateless reads, a pooled client for transactions, because the Neon HTTP driver cannot run multi-statement transactions.
3. **Numeric as string.** Money and load values never touch JavaScript floats.
4. **Role in the JWT.** Authorisation with zero extra queries.
5. **AI on top of a rules engine, never inside it.** Trustworthy data first, intelligence second.
6. **One Zod schema per entity.** Shared by form and server, so validation cannot disagree with itself.
