# DhabaQueue 🍽️

> A smart restaurant queue management system that connects WhatsApp customer intake with a real-time staff dashboard.

DhabaQueue is a full-stack restaurant queue management application designed to reduce manual queue handling and improve communication between customers and restaurant staff.

Customers can provide their name and party size through WhatsApp, while restaurant staff manage the queue, tables, notifications, and food orders from a centralized dashboard.

---

## ✨ Features

### 📱 WhatsApp Customer Intake
- Customers can provide their name and party size through WhatsApp.
- AI extracts structured information from natural-language messages.
- Example:
  - `Hi, I'm Ramesh. Table for 4 please.`
- Extracted information is automatically converted into a queue entry.

### 🤖 Local AI Processing
- Uses **Ollama + Llama 3.2** for natural-language understanding.
- Runs locally without paid AI API usage.
- Extracts:
  - Customer name
  - Party size
- Can also handle basic queue-related questions.

### 📊 Real-Time Queue Dashboard
- Live restaurant queue management.
- Search and filter customers.
- Queue status tracking.
- Real-time updates using Socket.IO.

### 🔔 Customer Notification
Staff can manually notify customers when their table is ready.

### 🪑 Table Management
Staff can manage table availability and seating from the dashboard.

### 🍛 Food Order Tracking
Track food orders through multiple stages:

`ORDERED → PREPARING → READY → SERVED`

### 🚶 Walk-In Customers
Staff can manually add customers who arrive without using WhatsApp.

### 🔐 Authentication
- Staff login system.
- Protected dashboard routes.
- JWT-based authentication.

---

## 🏗️ System Architecture

```text
                  Customer
                     │
                     │ WhatsApp
                     ▼
              WhatsApp Webhook
                     │
                     ▼
              Node.js Backend
                     │
             ┌───────┴────────┐
             │                │
             ▼                ▼
        Ollama AI          PostgreSQL
             │                │
             └───────┬────────┘
                     │
                     ▼
              Socket.IO
                     │
                     ▼
            Staff Dashboard
             │      │      │
             ▼      ▼      ▼
           Queue  Tables  Food Orders
```

---

## 📁 Project Structure

```text
dhaba-queue/
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

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/dhaba-queue.git
cd dhaba-queue
```

### 2. Install backend dependencies

```bash
cd backend
npm install
```

### 3. Configure environment variables

Create `backend/.env` and add your local configuration:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/dhaba_queue"
PORT=4000
JWT_SECRET="your-secret"

WHATSAPP_TOKEN="your-token"
WHATSAPP_PHONE_NUMBER_ID="your-phone-number-id"
WEBHOOK_VERIFY_TOKEN="your-verification-token"

DEMO_MODE="true"
```

> ⚠️ Never commit `.env` files or API credentials to GitHub.

### 4. Start PostgreSQL

The project can be run using a local PostgreSQL instance or Docker.

```bash
docker run --name dhaba-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=your-password \
  -e POSTGRES_DB=dhaba_queue \
  -p 5432:5432 \
  -d postgres:16
```

### 5. Set up Prisma

```bash
npx prisma generate
npx prisma migrate dev
node prisma/seed.js
```

### 6. Start the backend

```bash
npm run dev
```

Backend runs at: `http://localhost:4000`

### 7. Start the frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: `http://localhost:5173`

---

## 🤖 Running the Local AI

Install Ollama and pull the model:

```bash
ollama pull llama3.2:3b
```

Start Ollama:

```bash
ollama serve
```

The backend communicates with the local Ollama server.

**Example customer message:**

```text
Hi, I'm Ramesh. I need a table for 4.
```

**AI extracts:**

```json
{
  "name": "Ramesh",
  "partySize": 4
}
```

The backend then creates the corresponding queue entry.

---

## 🎬 Demo Workflow

A complete local demonstration can be performed without paid AI APIs:

1. Start PostgreSQL.
2. Start Ollama.
3. Start the backend.
4. Start the frontend.
5. Open the dashboard.
6. Simulate a WhatsApp customer message.
7. Ollama extracts the customer's name and party size.
8. Backend creates the queue entry.
9. Customer appears on the live dashboard.
10. Staff notify the customer.
11. Staff seat the customer.
12. Staff track the food order.

---

## 💬 WhatsApp Integration

DhabaQueue includes support for the Meta WhatsApp Cloud API and webhook-based customer intake.

For local development, the application also provides a demo mode so the complete queue workflow can be demonstrated without relying on external WhatsApp message delivery.

The AI processing itself runs locally through Ollama.
