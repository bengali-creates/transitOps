# TransitOps

Smart Transport Operations Platform. A rules-enforced fleet operations system built on Next.js, NeonDB, Drizzle, shadcn/ui, and AWS Bedrock.

## Documents to read first

1. `UNDERSTANDING_AND_INNOVATION.md` : what the problem is really asking and where to innovate.
2. `ARCHITECTURE.md` : stack, layers, folder structure, and database design.
3. `BUILD_PLAN.md` : the ordered milestones for agentic coding, one commit per feature.

## Quick start

```bash
# 1. install
npm install

# 2. configure
cp .env.example .env
# fill DATABASE_URL (Neon), AUTH_SECRET (npx auth secret), and AWS Bedrock keys

# 3. database
npm run db:generate   # create migration from the schema
npm run db:migrate    # apply to Neon
npm run db:seed       # roles, demo users, sample fleet

# 4. run
npm run dev
```

## Demo logins (from the seed)

All use the password `Password123!`.

- `manager@transitops.dev` : Fleet Manager
- `driver@transitops.dev` : Driver
- `safety@transitops.dev` : Safety Officer
- `finance@transitops.dev` : Financial Analyst
- `admin@transitops.dev` : Admin

## Implemented Features

Here is a list of the core capabilities currently implemented in the platform:

- **Authentication & RBAC:** Secure login system with JWT sessions and strict role-based access control (Admin, Fleet Manager, Driver, Safety Officer, Financial Analyst).
- **Vehicle Registry:** Full CRUD management for fleet assets. Enforces unique registration numbers and tracks vehicle status (Available, In Shop, On Trip, Retired).
- **Driver Management:** Manage driver profiles with compliance tracking (license expiry warnings) and safety score monitoring.
- **Maintenance Workflow:** Open and close maintenance records that automatically update the vehicle's status (pulling it from the available dispatch pool while in the shop).
- **Fuel & Expense Tracking:** Log fuel consumption and general expenses to automatically compute and aggregate the total operational cost per vehicle.
- **Reports & Analytics:** A responsive dashboard featuring key performance indicators (Fuel Efficiency, Fleet Utilization, Operational Cost, Vehicle ROI), visual charts powered by Recharts, and a flawless CSV export functionality.
- **Settings & Access Configuration:** Configure general application settings (Depot Name, Currency) and visualize the RBAC matrix to understand role permissions at a glance.

## The one rule that keeps it correct

Server actions never set an entity status. Every status change (dispatch, complete, cancel, open or close maintenance) goes through a service in `src/server/services` and runs inside a transaction. See `trip-service.ts` and `maintenance-service.ts` for the pattern.
