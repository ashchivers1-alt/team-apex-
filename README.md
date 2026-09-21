# Team Apexx Coaching Platform

A working web application for an online fat-loss / bodybuilding contest-prep
coaching business: client records, TDEE/maintenance and macro calculators,
check-in tracking, trend charts, observed-data recalibration and coach
decision support — with real data persistence, not a visual mock-up.

UK English throughout. Designed for laptop and phone.

---

## 1. Stack and why

The repository was empty, so this was built from scratch with a
straightforward, boring, maintainable stack:

- **Next.js 14 (App Router) + TypeScript** — a single codebase for UI and
  API routes, server-side rendering where useful, one deployment artifact.
- **SQLite via Prisma** — zero-config relational database stored as a single
  file (`prisma/dev.db`), which also makes backup trivial (copy the file, or
  use the built-in export/import feature below). Easy to swap for
  Postgres/MySQL later by changing `prisma/schema.prisma`'s `datasource`
  and re-running migrations, without touching application code.
- **Tailwind CSS** — clean, responsive styling without a component library
  to fight with.
- **Recharts** — weight/calorie/step charts.
- **iron-session** — signed, encrypted, stateless session cookies for a
  single-coach login (see §11 Security & scope).
- **Vitest** — unit tests for every calculation, isolated from the UI/DB
  (`src/lib/calculations/`, `src/lib/calculations/__tests__/`).

All calculation logic lives in plain, framework-free TypeScript under
`src/lib/calculations/`. Nothing there imports React, Next.js or Prisma, so
it is independently testable and easy to audit against the spec.

---

## 2. Setup

### Requirements

- Node.js 18.18+ (tested on Node 22)
- npm

### Steps

```bash
npm install

cp .env.example .env
# Edit .env:
#  - SESSION_SECRET: any random string, 32+ characters
#    (generate one with: openssl rand -base64 32)
#  - COACH_EMAIL: the email you'll sign in with
#  - COACH_PASSWORD_HASH: generate with:
#      node scripts/hash-password.mjs "your-chosen-password"
#    then paste the hash in — and escape every `$` as `\$` in the .env file
#    (Next.js interprets unescaped $... sequences in .env files as variable
#    references, which corrupts bcrypt hashes otherwise)
#    ...or, for the simplest possible local run, set COACH_PASSWORD to a
#    plain-text password instead of COACH_PASSWORD_HASH.

npx prisma migrate deploy   # creates prisma/dev.db and applies the schema
npm run seed                # optional: adds two synthetic sample clients

npm run dev                 # http://localhost:3000
```

Sign in with the `COACH_EMAIL`/password you set above.

### Running tests

```bash
npm test            # runs the full calculation test suite once
npm run test:watch  # watch mode
```

60 tests cover unit conversions, resting-energy/TDEE equations, weekly
maintenance, the 500 kcal/day scenario, custom deficit targets, macro
arithmetic (including over-budget and negative-carb cases), mixed
training/rest-day weekly totals, missing check-in data handling, observed-TDEE
sign behaviour for loss vs. gain, and the decision-support suggestion logic.

### Production build

```bash
npm run build
npm run start   # add: -p <port> to change the port
```

---

## 3. The core workflow, end to end

1. **Clients → New client** — enter required calculation inputs (name, sex,
   age, height, weight) plus as much optional coaching context as you have.
   An initial maintenance estimate and a standard 1 lb/week diet plan are
   created automatically so every client has a sensible starting point.
2. **Client → Maintenance & diet tab** — review/adjust the resting-energy
   method and activity multiplier, see the resulting TDEE, and either accept
   it or enter a coach override with a reason. Directly below, choose a
   diet-calorie scenario (the standard 1 lb/week scenario, or a custom
   target) and save it as the active plan.
3. **Client → Macros tab** — set protein/fat (grams or g/kg), see carbs
   calculated from the remainder, build "day types" (training/rest/refeed)
   and assign one to each weekday. The weekly total, daily average and
   estimated weekly deficit update live.
4. **Client → Check-ins tab** — log dated entries (weight, actual intake,
   steps, training, subjective markers, notes). Actual intake is always kept
   separate from the prescribed target.
5. **Client → Trends tab** — weight trend with a 7-day rolling average (and
   how many weigh-ins contributed), actual-vs-prescribed calories, steps,
   and a timeline of every plan change.
6. **Client → Recalibration & decisions tab** — once there's enough logged
   data, compare the equation-based maintenance estimate to an
   observed-data estimate, review a transparent, evidence-labelled coaching
   suggestion, preview the calorie/deficit effect of a proposed change, and
   only then approve and save it (with a required reason).
7. **Client → Contest prep tab** (competitors only) — show countdown and a
   target-weight rate scenario with aggressiveness warnings.
8. **Dashboard** — every active client's plan, latest check-in, weight
   trend, maintenance, current target, planned vs. observed weekly change,
   show countdown and any review flags, at a glance.
9. **Client → Printable summary** — a clean, client-facing PDF-ready page
   with calories, macros, activity targets — coach notes are never included.
10. **Data page** — full JSON export (backup) and restore (import).

---

## 4. Calculations and assumptions (what the app actually computes)

All of the below live in `src/lib/calculations/*.ts` and are unit-tested in
the matching `__tests__` folder.

### Resting energy & maintenance/TDEE (`energy.ts`)

- **Mifflin–St Jeor** (default):
  - Male: `10×kg + 6.25×cm − 5×age + 5`
  - Female: `10×kg + 6.25×cm − 5×age − 161`
  - Sex is used only because it is a strong *population-average* predictor
    of resting metabolic rate at a given weight/height/age — not a
    judgement about any individual. The app says this explicitly in the UI.
- **Katch–McArdle** (optional, requires a body-fat estimate):
  `370 + 21.6 × lean mass (kg)`. Offered as an alternative, with an explicit
  note that it is only as reliable as the body-fat estimate feeding it.
- **TDEE = resting × activity multiplier** (1.2 to 1.9, five clearly labelled
  categories, each with a plain-English description). The multiplier is
  editable. Steps/occupation/exercise are used only to *suggest* a starting
  category — they are not separately added on top of the multiplier, which
  would double-count exercise energy.
- **Weekly maintenance = daily TDEE × 7.**
- The UI states plainly that "maintenance" and "TDEE" are the same figure,
  that it is a *starting estimate*, and lists the equation's assumptions
  and limitations next to the number.
- A coach override (kcal, reason, date) can be entered at any time. The
  underlying equation estimate is always preserved and shown alongside it
  — the override never overwrites or hides the calculated value.

### Diet starting calories (`deficit.ts`)

- Standard scenario: 1 lb ≈ 3,500 kcal → 500 kcal/day deficit → daily
  target = maintenance − 500 → weekly target = daily × 7. Labelled as an
  energy-equivalent *planning* estimate, explicitly not a guarantee of
  exactly 1 lb of fat loss (scale weight also moves with water, glycogen
  and gut contents).
- Custom targets: lb/week, kg/week, % of bodyweight/week, fixed daily
  deficit (kcal), or % deficit from maintenance. All modes converge on the
  same output shape (daily/weekly target, daily/weekly deficit, % of TDEE,
  % of bodyweight/week) so they're always comparable.
- **Never silently produces a negative target**: if a target would take
  intake to zero or below, it's returned (so nothing is hidden) but flagged
  `critical` and the UI shows this prominently rather than passing it off as
  a normal number.
- Plausibility flags (not hard blocks) for: deficits over ~25–35% of TDEE,
  rates over ~1.5% of bodyweight/week, and targets that dip under the
  estimated resting expenditure — the last one explicitly documented as
  advisory, not a hard minimum-intake rule.

### Macro planner (`macros.ts`)

- Protein/fat settable in grams or g/kg (resolved against current
  bodyweight); carbs = remainder of the calorie budget at 4/4/9 kcal per
  gram (protein/carb/fat).
- A manual carb override is supported but is flagged `critical` the moment
  the resulting total exceeds the calorie budget — over-budget plans are
  never presented as fine.
- Negative carbohydrate results (protein+fat alone exceeding the budget)
  are computed and returned (so the coach can see *why*) but always
  flagged `critical` — the UI never renders them as a usable plan.
- Day templates ("Training day", "Rest day", "Refeed day", …) each carry
  their own calories/macros; each weekday is assigned one. The weekly
  total, daily average and estimated weekly deficit (vs. weekly
  maintenance) update automatically, and adding a higher-calorie day
  visibly reduces the weekly deficit.

### Check-ins & trends (`trends.ts`)

- 7-day rolling averages are computed only from logged values (no
  interpolation) and always report how many entries contributed, flagging
  low-coverage windows explicitly.
- A weight *trend* (linear regression slope) is only returned once a
  minimum number of points across a minimum span of days is available —
  specifically so a handful of readings can't be read as a "plateau" or a
  meaningful trend change.
- Equivalent-period comparisons (e.g. this week vs. last) explicitly note
  when either side has too little data to trust the comparison.

### Observed-data recalibration (`recalibration.ts`)

- `Observed TDEE ≈ average daily intake − (weight-trend slope in kg/day ×
  7,700)` — a negative slope (losing weight) therefore *increases* the
  estimated expenditure above reported intake, and vice versa (both
  directions are unit-tested).
- Requires a configurable period (default 21 days, 14–28 recommended) with
  adequate intake-logging coverage and a reliable weight trend before
  producing a figure at all; otherwise it says so rather than presenting a
  shaky number as sound.
- Surfaces: dates used, days logged, coverage %, explicit warnings (short
  period, low coverage, wide day-to-day swings, menstrual-cycle notes in
  the window), and the method/assumptions in full — including that
  under-reported intake biases the estimate, and 7,700 kcal/kg doesn't
  separate fat, lean mass or water.
- Never labelled "measured metabolism", and applying it as the new
  maintenance override is always a separate, explicit, confirmed coach
  action — never automatic.

### Decision support (`decisionSupport.ts`)

- Compares planned vs. observed weekly rate, adherence, intake-vs-prescribed
  %, steps vs. the prior equivalent period, and hunger/energy/recovery
  trends, then returns one or more of: *Hold the plan*, *Gather more
  data*, *Review adherence*, *Review activity*, or *Consider a small
  calorie/activity adjustment* — each with the specific evidence behind it.
- If there isn't enough reliable data, the only suggestion is to gather
  more — the module refuses to speculate further.
- A separate `previewAdjustment` shows the daily-calorie and weekly-deficit
  effect of a proposed change *before* anything is saved. Saving a new
  plan always requires a non-empty reason (enforced in the UI) — there is
  no "auto-apply" path anywhere in the codebase.
- Never claims to detect metabolic damage or diagnose a medical condition
  — this is stated directly in the UI next to every suggestion block.

### Contest prep (`contestPrep.ts`)

- Show countdown (days/weeks) and a target-weight scenario computed purely
  as arithmetic (weight to lose ÷ weeks remaining), flagged when the
  required rate is aggressive (>1% of bodyweight/week) or the timeline is
  very short.
- Deliberately contains **no** dehydration, sodium/potassium manipulation,
  diuretic, drug or insulin logic of any kind, and states explicitly that
  stage readiness cannot be judged from body weight alone.

---

## 5. Acceptance example (verified)

For a selected maintenance of 2,400 kcal/day, `oneLbPerWeekScenario`
(`src/lib/calculations/deficit.ts`) and its test
(`__tests__/deficit.test.ts`) confirm:

| Metric | Value |
|---|---|
| Weekly maintenance | 16,800 kcal |
| Approximate weekly deficit (1 lb/week) | 3,500 kcal |
| Daily deficit | 500 kcal |
| Diet starting intake | 1,900 kcal/day |
| Weekly diet intake | 13,300 kcal |

This exact scenario was also driven through the real running app (create
client → set a 2,400 kcal override with a reason → read the rendered
numbers) during development, and matched precisely.

---

## 6. Data handling & scope

- All data is stored in a local SQLite file (`prisma/dev.db`, git-ignored).
  Nothing is sent to any third-party service.
- **Export** (Data page, or `GET /api/export`) downloads a complete JSON
  backup of every client, plan and check-in.
- **Import/restore** (Data page, or `POST /api/import`) **replaces all
  current data** with the contents of an uploaded backup file. This is
  destructive and irreversible from within the app — the UI requires an
  explicit confirmation, and you should always have a current export of
  anything you don't want to lose before restoring.
- Client deletion (on the client's page) is permanent.
- The two seeded sample clients (`npm run seed`) are entirely synthetic —
  not real people.

### Security & scope of this deployment

This app ships with **single-coach authentication**: one email/password,
configured via environment variables, protecting every page and API route
behind session middleware (`src/middleware.ts`). This is appropriate for:

- a single coach running it locally on their own machine, or
- a single coach hosting it privately (e.g. on a small VPS) for their own
  use.

It is **not** a multi-tenant SaaS product — there is no per-coach account
system, role-based access, or audit log beyond the plan-change history
already described above. If you deploy this somewhere publicly reachable:

- Set a strong, unique `SESSION_SECRET` and a strong coach password (use
  `COACH_PASSWORD_HASH`, not plaintext `COACH_PASSWORD`).
- Serve it over HTTPS (the session cookie is marked `secure` in production).
- Put the SQLite file, and any backup files you export, somewhere with
  appropriate access controls — they contain personal and health-adjacent
  information (body-fat %, weight, medical/medication/menstrual-cycle
  notes).
- Nothing here is exposed through a public route without authentication;
  there is no logging of request bodies or health data to external services.

---

## 7. What's genuinely unfinished / known limitations

Being direct about gaps rather than papering over them:

- **No automated end-to-end/UI test suite** is committed (Playwright etc.).
  The calculation layer has full unit-test coverage (60 tests); the UI was
  manually driven through the full workflow (client creation, maintenance
  override, macros, check-ins, trends, recalibration, decision support,
  export/import) during development and confirmed correct, but there's no
  regression suite for the UI itself yet.
- **Single coach account only** — no multi-user/multi-coach support, no
  granular permissions, no audit log of *who* made a change (only *when*
  and *why*, via the reason fields).
- **No email/SMS reminders** for missed check-ins — the dashboard flags a
  client with no recent check-in, but nothing proactively notifies anyone.
- **No photo/progress-image storage** — body-fat estimates and notes are
  text/number fields only; there's no image upload for physique photos.
- **No native mobile app** — it's a responsive web app (works well on
  phone browsers), not an installable/offline-first PWA.
- **Weekday-assignment macro schedule is per-client-current only** — like
  the maintenance/diet plan, it doesn't keep a full version history of
  every past weekly schedule (only the day templates and current
  assignments), unlike maintenance/diet plans which do keep full history.
- **`npm audit` reports advisories in a transitive dependency** (`postcss`,
  bundled inside Next.js itself) related to CSS source-map handling. These
  are build-tooling advisories, not runtime/data-exposure issues for this
  app, but a future `next` major-version upgrade would clear them.
- **No rate-limiting or brute-force protection** on the login endpoint
  beyond what the platform you deploy to provides — fine for a single
  private coach login, but worth adding (e.g. a small delay/lockout after
  repeated failures) before wider exposure.

---

## 8. Project layout

```
prisma/schema.prisma        Data model (SQLite; see comments for the
                             enum-like string fields and why)
prisma/seed.ts               Synthetic sample clients
src/lib/calculations/        Pure, framework-free calculation library
src/lib/calculations/__tests__/  Vitest tests (60 tests)
src/lib/clientCalculations.ts    Glue between DB records and the
                                 calculation library
src/lib/enums.ts             Single source of truth for dropdown values
src/lib/validation.ts        Zod schemas for every API input
src/lib/session.ts, authenticate.ts, middleware.ts   Auth
src/app/api/**               REST-ish API routes (Next.js route handlers)
src/app/**                   Pages (dashboard, clients, client detail
                              tabs, printable summary, data/export)
src/components/client-detail/    One component per client-detail tab
```
