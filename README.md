# DhabaQueue — WhatsApp-native waitlist & table management for small restaurants

No app to download. No QR code to a webpage. A customer joins the waitlist by
scanning a QR poster that opens **WhatsApp directly** — not a website — and
messaging the restaurant. From there, an AI-assisted bot handles check-in,
staff manage everything from one live dashboard, and customers get notified
by WhatsApp both when their table *and* their food are ready.

## The problem

Small restaurants and dhabas run walk-in seating on shouted names and
guesswork. Customers don't know how long they'll actually wait, so they
leave. Existing waitlist products (Yelp Waitlist, Qwaiting, ScanQueue) solve
this with a QR code that opens a **webpage** — still an extra step, and it
assumes a fast connection and an unfamiliar interface. In India, WhatsApp is
already open on almost every phone. DhabaQueue uses it as the entire
customer-facing interface — the QR code opens a WhatsApp chat, never a form.

## How it works

1. Customer scans the entrance QR (a `wa.me` deep link) — their phone opens
   WhatsApp directly, already composed with a starter message. One tap to send.
2. A bot replies and gets their name and party size — if the optional AI
   layer is enabled, a customer can just type "Hi, Ramesh here, table for 4"
   in one message instead of answering two separate prompts.
3. They're added to the queue and told their position + an estimated wait,
   calculated from real recent table-turnover data and current table capacity.
4. They can ask questions in plain language ("how much longer?", "status",
   "cancel") any time.
5. Staff can also add walk-ins directly from the dashboard — for customers
   who'd rather not use WhatsApp at all. Phone number is optional; without
   one, no automatic notification is sent and staff just call the name.
6. Staff tap Notify when a table opens — sends a WhatsApp message.
7. Once seated, staff track the food order's status (Ordered, Preparing,
   Ready, Served) on the same dashboard. The moment it's marked Ready, the
   customer gets a second WhatsApp notification for their food.
8. Returning customers are recognized by phone number on their next visit —
   the bot greets them by name and skips straight to asking party size.

## Architecture

```
 Customer's phone                Backend (Node/Express)              Staff dashboard
 [Scans QR ->     ] WhatsApp     [ /webhook/whatsapp   ] Socket.io   [ React (Vite)   ]
 [ WhatsApp chat   ] Cloud API   [ conversation state   ] live queue [ - queue board  ]
 [ opens directly  ]             [ machine + AI layer   ] + food     [ - walk-in form ]
                                  [ (optional Claude)    ] updates    [ - table grid   ]
                                  [                       ]           [ - food tracker ]
                                  [ wait-time estimator   ]
                                  [ at-risk flagging      ]
                                             |
                                      [ PostgreSQL  ]
                                      [ (Prisma ORM)]
```

## Stack

- Backend: Node.js, Express, Socket.io, Prisma, PostgreSQL
- WhatsApp: Meta WhatsApp Cloud API (webhooks, free developer/sandbox tier)
- AI layer (optional): Claude API for free-form message understanding and
  general-question answering; the bot works fully without it, just with
  rigid step-by-step prompts instead
- Frontend: React (Vite) + Tailwind — staff dashboard only; customers never
  touch a browser
- Auth: JWT for staff login
- Rate limiting: express-rate-limit on the WhatsApp webhook
- Testing: Node's built-in test runner (`node --test`) — no extra dependency
- Cost safety: two-level daily AI usage caps (per-customer and per-restaurant)
  so a spammy number or a busy day can't run up unbounded API cost

## Project layout

```
backend/
  prisma/schema.prisma        - DB schema (restaurants, queue, customers,
                                 tables, staff, food orders)
  prisma/seed.js               - creates demo restaurant + staff login
  scripts/generateQr.js        - generates the entrance wa.me QR poster
  src/server.js                 - Express + Socket.io entry point
  src/whatsapp/webhook.js       - receives/sends WhatsApp messages
  src/whatsapp/conversation.js  - the bot's conversation state machine
  src/whatsapp/aiAssistant.js   - optional Claude-powered NLU layer
  src/whatsapp/quotaDecision.js - pure AI-quota decision logic (unit tested)
  src/whatsapp/aiQuota.js       - DB-backed quota enforcement
  src/queue/estimator.js        - wait-time algorithm
  src/queue/atRisk.js           - pure at-risk detection (unit tested)
  src/queue/routes.js           - REST API: queue, tables, food orders
  src/auth/routes.js            - staff login
frontend/
  src/App.jsx                   - dashboard shell
  src/components/
    QueueBoard.jsx               - live waiting list
    TableGrid.jsx                 - free/occupied table status
    AddWalkInForm.jsx             - staff-entered walk-ins
    FoodTracker.jsx                - food order status per seated table
```

## Setup

### 1. Backend

```bash
cd backend
cp .env.example .env     # fill in DATABASE_URL, WhatsApp creds, etc.
npm install
npx prisma migrate dev --name init
npm run seed              # creates a demo restaurant + staff login
npm run dev
```

### 2. WhatsApp Cloud API (sandbox)

1. Create a Meta developer app, add the WhatsApp product.
2. In the app's WhatsApp > Configuration screen, set the webhook URL to
   `https://<your-backend-url>/webhook/whatsapp` and the verify token to match
   `WEBHOOK_VERIFY_TOKEN` in `.env`.
3. Add your own phone number as a test recipient (sandbox mode only allows
   pre-approved numbers) and message it to test the flow.

### 3. Generate the entrance QR

```bash
cd backend
npm run generate:qr -- 919876543210
```

This creates `entrance-qr.png` — a QR code that deep-links straight into
WhatsApp with a pre-filled message. Print it and place it at the counter.
There is no webpage behind this QR code — scanning it just opens a WhatsApp
chat, which is the whole point.

### 4. Optional: enable AI-assisted conversation

Set `ANTHROPIC_API_KEY` in `.env` to let the bot understand free-form
messages ("hi, it's Priya, table for 3") in one shot, and answer general
questions like "how much longer" without matching an exact keyword. Without
this key, the bot still works completely, using plain step-by-step prompts.

### 5. Frontend

```bash
cd frontend
cp .env.example .env      # points at your backend's URL
npm install
npm run dev
```

Log in with the seeded staff account (printed by `npm run seed`) to see the
live dashboard.

### 6. Running tests

```bash
cd backend
npm test
```

Runs 21 unit tests covering at-risk detection, party-size validation, and
AI-quota decision logic — all pure functions with zero I/O, so tests run in
under 300ms with no database or WhatsApp credentials needed.

## Design decisions worth mentioning in an interview

- The QR code opens WhatsApp, not a webpage. This is the core differentiator
  from competitors like Yelp Waitlist or ScanQueue — there is no form to
  fill out, no webpage to load on a slow connection. The QR is purely a
  shortcut to a pre-filled WhatsApp message.
- AI is additive, not required. The conversation bot works fully with rigid
  step-by-step prompts; the optional Claude integration only makes the
  experience smoother (one-message intake, natural questions) without ever
  being a single point of failure for the core flow.
- Wait-time estimate checks real table capacity first — if a suitably-sized
  table is already free, the estimate is 0 (just needs seating); otherwise
  it falls back to parties-ahead times rolling average turnover time.
- Two independent status tracks: queue status (waiting/seated) and food
  status (ordered/preparing/ready/served) are separate models. A party can be
  seated but still waiting on food — the dashboard reflects that distinction
  instead of treating "seated" as "done."
- Walk-ins are a first-class path, not an afterthought. Not every customer
  wants to use WhatsApp — staff can add someone directly from the dashboard,
  with phone number optional.
- AI use is capped, not just optional. Two independent daily limits (per
  customer, per restaurant) protect against runaway API cost from a spammy
  number or an unexpectedly busy day. The decision logic is a pure function
  (`evaluateQuota`), unit tested separately from the DB plumbing around it -
  the same testability pattern used for the at-risk detection logic.
- Pure functions kept dependency-free on purpose — `computeIsAtRisk` and
  `evaluateQuota` each live in their own module with no database import,
  specifically so they can be unit tested in isolation.

## Known limitations (be upfront about these)

- WhatsApp Cloud API sandbox mode only messages pre-approved test numbers —
  production use needs Meta business verification.
- No POS/payment integration — deliberately scoped to walk-in seating and
  basic food-status tracking, not a full restaurant-ops stack.
- Single-location only in this version; multi-branch would need a
  restaurant-selection step in the bot.
- Rate limiting is per-IP on the webhook, which is a basic guard, not a full
  anti-abuse system.
- The AI layer's natural-language extraction can occasionally miss or
  misread a message; the rigid fallback prompts always catch anything it
  doesn't confidently parse, so the flow never breaks — it just falls back
  to asking directly.
- No end-to-end/integration tests against a real database yet — the current
  test suite covers pure business logic only.
