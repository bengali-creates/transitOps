# TransitOps: Problem Understanding and Innovation Roadmap

## 1. What the problem is really about

Strip away the feature list and TransitOps is asking for one thing: a single system of record for a transport fleet that also enforces the rules a dispatcher would otherwise have to remember by hand. Today those rules live in people's heads and in spreadsheets, so they get broken. A truck goes out with an expired-license driver. A vehicle in the shop still shows up as bookable. Cargo goes over capacity. Nobody notices a licence is about to expire until the driver is already stopped at a checkpoint.

So the platform has three jobs, in order of importance:

1. **Record keeping.** Vehicles, drivers, trips, maintenance, fuel, and expenses all need clean CRUD with a shared database.
2. **Rule enforcement.** The state of a vehicle, a driver, and a trip must move together and must never enter an illegal combination. This is the part that separates a real submission from a glorified spreadsheet.
3. **Visibility.** KPIs, utilization, cost, and ROI so a manager can act on what the data is telling them.

## 2. The rules are a state machine, not a form

The single most important insight for scoring well is that the mandatory business rules are not validations sprinkled on forms. They are a coupled state machine across three entities:

```
                 dispatch (all guards pass)
   TRIP: draft ---------------------------> dispatched ---------> completed
              \                                  |
               \--------- cancel ----------------/-> cancelled
                                                 (restore assets)

   VEHICLE: available --dispatch--> on_trip --complete--> available
            available --maintenance open--> in_shop --close--> available
            (retired is terminal)

   DRIVER:  available --dispatch--> on_trip --complete--> available
```

A dispatch is only legal when every guard passes at once: vehicle is available (not retired, in shop, or already on a trip), driver is available and not suspended, licence is not expired, and cargo weight is within capacity. When it fires, three rows change together. If any one of those writes fails, none should apply. That is why the reference implementation runs each transition inside a database transaction and records every change in a `status_history` table.

Most teams will implement these rules as scattered `if` checks inside their form handlers. That works until two rules interact and the states drift apart. Centralising all transitions in a service layer is the design decision that keeps the demo bug-free under pressure.

## 3. Where the easy marks are

Before innovation, the base build has to be watertight. These are the requirements graders will click through:

- Register `Van-05` at 500 kg, register driver `Alex`, create a 450 kg trip, dispatch, complete, then open maintenance and confirm the vehicle disappears from the dispatch list. That exact workflow is in the brief, so it will be tested.
- Try to break it: dispatch a 600 kg load on the 500 kg van, assign a suspended driver, book a vehicle that is in the shop. Each must be blocked with a clear message.
- KPIs on the dashboard must move in real time as those actions happen.

If all of that holds together, the base is done. Everything below is how to stand out.

## 4. Innovation: turning a CRUD app into an operations brain

The tech stack already includes AWS Bedrock, so the differentiator is obvious: move from a system that records what happened to one that recommends what to do next. The rule engine you built for correctness becomes the guardrail that keeps the AI honest. That framing matters. The AI never overrides a hard rule; it only ranks or flags within the set of legal options. That is a genuinely defensible design, not a gimmick.

Here are the innovations, ordered by demo impact per hour of effort.

### Tier 1: high impact, buildable inside the hackathon

**AI Dispatch Copilot.** When a user creates a trip, instead of hunting through dropdowns, they get a ranked shortlist of vehicle plus driver pairings. The system first filters to only assets that pass every hard rule (same guards as the trip service), then Bedrock ranks the legal pairings by load fit (avoid sending a 1500 kg truck for a 200 kg parcel), driver safety score, regional match, and utilization balance. Each suggestion comes with a one-line rationale. This directly upgrades the core flow every judge will touch, and the reference code for it is already in `src/server/services/dispatch-ai.ts`.

**Predictive Maintenance flags.** Instead of maintenance being reactive, score each vehicle on distance since last service, trip intensity, and age, then have Bedrock surface a short "these three vehicles are trending toward a breakdown" panel with reasoning. It reuses data you already store, so the only new work is the scoring query and one Bedrock call.

**Natural-language fleet assistant.** A chat box on the dashboard that answers "which drivers have licences expiring in 30 days" or "show me underutilised vehicles this month". You translate the question to a safe, parameterised query over your own tables (or hand Bedrock a compact JSON snapshot of the current fleet and let it answer). This is the single most impressive thing to demo live because it feels like the future and it is fast to build on top of a clean schema.

### Tier 2: strong if time allows

**Fuel anomaly detection.** Every fuel log implies an efficiency (distance over litres). When a log lands far outside a vehicle's normal band, flag it. Possible fuel theft, a sensor fault, or a mechanical problem. Bedrock turns the raw flag into a plain-English explanation and a suggested action. This is the kind of feature a real fleet owner pays for.

**Document intelligence.** The bonus asks for vehicle document management. Go further: when a user uploads an insurance or permit image, Bedrock extracts the fields and the expiry date automatically, which then feeds the compliance reminder system. Upload a photo, get a structured record and a calendar of expiries. The `vehicle_documents.extractedData` column already exists for this.

**Dynamic safety scoring.** Rather than a static number, recompute driver safety scores from trip history, incidents, and on-time completion, and let the Safety Officer see an explanation of why a score moved.

### Tier 3: narrative and stretch

**Cost and ETA forecasting before dispatch.** Predict a trip's fuel cost and completion time from historical trips on similar routes and loads, so a manager sees the expected P&L of a trip before committing to it.

**"What-if" simulation.** Let a manager ask what happens to utilization and cost if they retire two of the oldest vehicles, and get a modelled answer.

## 5. The one-sentence pitch

TransitOps is not a digital logbook. It is a rules-enforced operations platform where a clean, transactional state machine guarantees the fleet is always in a legal state, and AWS Bedrock sits on top of that trustworthy data to recommend the best dispatch, predict the next breakdown, and answer plain-English questions about the whole operation.

## 6. Scoping advice for eight hours

Build the base until the example workflow and every "try to break it" case pass. Then add exactly one Tier 1 innovation and demo it well. A flawless base plus one polished AI feature beats a shaky base with three half-working ones. The Dispatch Copilot is the recommended pick because it lives inside the flow judges already care about and the scaffolding is written for you.
