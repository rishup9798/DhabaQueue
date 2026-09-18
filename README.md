# DhabaQueue 🍽️

> **AI-powered restaurant queue and operations platform** that connects WhatsApp customer intake with a real-time staff dashboard, automated table allocation, and live food-order tracking.

DhabaQueue is a full-stack SaaS-style restaurant operations project built to solve a practical problem: managing walk-in queues, tables, customer notifications, and food operations from one system.

Customers can join the queue through WhatsApp using natural language, while restaurant staff manage the entire workflow from a responsive dashboard.

---

## 🚀 What DhabaQueue Does

```text
Customer WhatsApp
      ↓
Meta WhatsApp Cloud API
      ↓
Webhook
      ↓
Node.js + Express Backend
      ↓
AI extracts name + party size
      ↓
PostgreSQL + Prisma
      ↓
Socket.IO real-time updates
      ↓
Staff Dashboard
      ├── Queue
      ├── Tables
      └── Food Orders
```

The system follows a complete restaurant workflow:

```text
WAITING
   ↓
NOTIFIED
   ↓
SEATED
   ↓
ORDERED → PREPARING → READY → SERVED
   ↓
COMPLETED
```

---

## ✨ Key Features

### 📱 WhatsApp Customer Intake
- Customers can send natural-language messages to the restaurant.
- Supports English, Hindi, and Hinglish input.
- AI extracts the customer's **name** and **party size**.
- The extracted information is automatically converted into a queue entry.
- Supports queue-status conversations.

Example:

```text
"Hi, I'm Ramesh. Table for 4 please."
```

AI extracts:

```json
{
  "name": "Ramesh",
  "partySize": 4
}
```

### 🤖 AI-Powered Processing
- Uses a hosted OpenAI-compatible API instead of depending on a local AI server in production.
- Structured extraction is performed through the backend.
- Designed to understand English, Hindi, and Hinglish.
- AI is used for both customer intake and basic queue-related questions.
- Configurable through `AI_API_KEY`, `AI_BASE_URL`, and `AI_MODEL`.

### 📊 Real-Time Staff Dashboard
- Live queue management.
- Search and filtering.
- Queue status updates.
- Real-time synchronization using Socket.IO.
- Dashboard sections for queue, tables, and food operations.

### 🪑 Automatic Table Allocation
When staff seat a customer, DhabaQueue automatically selects the **smallest available table that can accommodate the party size**.

Staff can manage table numbers and capacities from the dashboard.

### 🔔 Customer Notifications
- Staff can notify customers when their table is ready.
- WhatsApp messaging is supported through the Meta WhatsApp Cloud API.
- Walk-in customers can also be associated with a phone number for notifications.
- Demo mode is available for development without sending real WhatsApp messages.

### 🍛 Food Operations
Track food orders through:

```text
ORDERED → PREPARING → READY → SERVED
```

When an order becomes **READY**, the system can notify the customer through WhatsApp.

When an order becomes **SERVED**:
- The queue entry is completed.
- The occupied table is released.
- The order remains available in history.

### 🚶 Walk-In Management
Restaurant staff can manually add customers who arrive without WhatsApp.

### 🔐 Authentication
- Staff login.
- JWT-based authentication.
- Restaurant-scoped queue and operations.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React, Vite, Tailwind CSS, React Router |
| UI / Animation | Framer Motion, GSAP, Lucide React |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| ORM | Prisma |
| Real-Time | Socket.IO |
| AI | OpenAI-compatible REST API |
| WhatsApp | Meta WhatsApp Cloud API |
| Authentication | JWT, bcryptjs |
| Deployment | Render |
| Development | Git, GitHub, Docker |

---

## 🏗️ Architecture

```text
                         CUSTOMER
                            │
                            │ WhatsApp
                            ▼
                  Meta WhatsApp Cloud API
                            │
                            │ Webhook
                            ▼
                  ┌─────────────────────┐
                  │   Node.js / Express │
                  └──────────┬──────────┘
                             │
                  ┌──────────┴──────────┐
                  ▼                     ▼
             Hosted AI              PostgreSQL
                  │                   Prisma
                  │                     │
                  └──────────┬──────────┘
                             ▼
                       Queue Engine
                             │
                         Socket.IO
                             │
                             ▼
                    STAFF DASHBOARD
                     /      |       \
                    ▼       ▼        ▼
                 Queue   Tables   Food Orders
                    │       │        │
                    └───────┴────────┘
                             │
                             ▼
                    Customer Notification
                         via WhatsApp
```

---

## 📁 Project Structure

```text
DhabaQueue/
│
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.js
│   │
│   ├── scripts/
│   │   ├── generateQr.js
│   │   └── testAi.js
│   │
│   └── src/
│       ├── auth/
│       ├── middleware/
│       ├── queue/
│       ├── whatsapp/
│       ├── lib/
│       └── server.js
│
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── ui/
│       │   ├── QueueBoard.jsx
│       │   ├── TableGrid.jsx
│       │   ├── FoodTracker.jsx
│       │   └── AddWalkInForm.jsx
│       │
│       ├── pages/
│       │   ├── HomePage.jsx
│       │   ├── DashboardPage.jsx
│       │   └── HowItWorksPage.jsx
│       │
│       ├── App.jsx
│       └── api.js
│
├── .gitignore
└── README.md
```

---

## ⚙️ Local Setup

### 1. Clone

```bash
git clone https://github.com/rishup9798/DhabaQueue.git
cd DhabaQueue
```

### 2. Backend

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/dhaba_queue"
PORT=4000
JWT_SECRET="your-secret"

AI_API_KEY="your-ai-api-key"
AI_BASE_URL="https://api.openai.com/v1"
AI_MODEL="gpt-4o-mini"

WHATSAPP_TOKEN="your-whatsapp-token"
WHATSAPP_PHONE_NUMBER_ID="your-phone-number-id"
WEBHOOK_VERIFY_TOKEN="your-verification-token"

DEMO_MODE="true"
FRONTEND_ORIGIN="http://localhost:5173"
```

> **Never commit API keys, access tokens, passwords, or `.env` files to GitHub.**

### 3. Database

Start PostgreSQL locally or with Docker:

```bash
docker run --name dhaba-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=your-password \
  -e POSTGRES_DB=dhaba_queue \
  -p 5432:5432 \
  -d postgres:16
```

Then:

```bash
npx prisma generate
npx prisma migrate dev
node prisma/seed.js
```

### 4. Start Backend

```bash
npm run dev
```

Backend:

```text
http://localhost:4000
```

### 5. Start Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend:

```text
http://localhost:5173
```

---

## 💬 WhatsApp Integration

DhabaQueue is designed around the **Meta WhatsApp Cloud API**.

Incoming customer messages are received through:

```text
POST /webhook/whatsapp
```

The backend:
1. Receives the WhatsApp webhook.
2. Identifies the restaurant.
3. Sends the customer message to the AI layer.
4. Extracts name and party size.
5. Creates or updates the queue entry.
6. Sends a WhatsApp response.
7. Pushes the queue update to connected staff dashboards through Socket.IO.

For development, `DEMO_MODE=true` logs outgoing WhatsApp messages instead of sending them.

---

## 🔄 Example End-to-End Flow

**Customer:**

```text
Hi, I'm Rahul. Table for 3 please.
```

**AI:**

```text
name = Rahul
partySize = 3
```

**Backend:**

```text
Create QueueEntry
      ↓
Calculate estimated wait
      ↓
Notify dashboard through Socket.IO
```

**Staff:**

```text
Notify → Seat
```

DhabaQueue automatically finds a suitable free table.

Then the food workflow starts:

```text
ORDERED
   ↓
PREPARING
   ↓
READY → WhatsApp notification
   ↓
SERVED
   ↓
Queue COMPLETED + Table FREE
```

---

## 🎯 Why This Project

DhabaQueue demonstrates practical full-stack engineering rather than a standalone CRUD application.

It combines:

- **Frontend engineering** — responsive React dashboard and interactive UI.
- **Backend development** — REST APIs, business logic, authentication, and validation.
- **Database design** — relational models and transactional table/queue updates with Prisma.
- **Real-time systems** — Socket.IO event-driven dashboard updates.
- **AI integration** — natural-language customer intake and structured data extraction.
- **Third-party API integration** — Meta WhatsApp Cloud API.
- **Deployment** — frontend/backend deployment with environment-based configuration.

---

## 🔮 Future Enhancements

- Multi-restaurant SaaS onboarding.
- Analytics and restaurant performance dashboards.
- Advanced wait-time prediction.
- Staff roles and permissions.
- Queue forecasting based on historical traffic.
- Automated WhatsApp templates for production messaging.
- Customer feedback and visit history.

---
.

