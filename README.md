# Full-Stack Application (Express + Socket.io + Supabase + React/Vite)

A full-stack template featuring a modular **Node.js/Express** backend with **Socket.io** and **Supabase SDK**, paired with a **React.js** frontend initialized with **Vite**, **React Router**, and `.env` support.

---

## 📁 Architecture Overview

```
SIH26/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── supabase.js       # Supabase Client initialization
│   │   ├── sockets/
│   │   │   └── socketHandler.js  # Real-time WebSocket connection & event handlers
│   │   ├── routes/
│   │   │   ├── api.js            # Sample Express API endpoints
│   │   │   └── index.js          # Central route registry
│   │   ├── middleware/
│   │   │   └── errorHandler.js   # Global error handling middleware
│   │   ├── app.js                # Express app configuration & middleware
│   │   └── server.js             # HTTP server & Socket.io entry point
│   ├── .env                      # Backend local environment variables
│   ├── .env.example              # Environment variable template
│   └── package.json              # Backend dependencies & scripts
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Navbar.jsx        # Navigation bar with real-time socket status indicator
│   │   ├── pages/
│   │   │   ├── Home.jsx          # Welcome and system summary page
│   │   │   ├── Dashboard.jsx     # Live real-time socket and Supabase test dashboard
│   │   │   └── NotFound.jsx      # 404 route handler
│   │   ├── services/
│   │   │   ├── api.js            # Backend API fetch client
│   │   │   ├── socket.js         # Socket.io client connector
│   │   │   └── supabase.js       # Frontend Supabase SDK client
│   │   ├── App.jsx               # React Router configuration
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx              # React app entry point
│   ├── .env                      # Frontend local environment variables
│   ├── .env.example              # Frontend env template
│   ├── index.html
│   ├── vite.config.js
│   └── package.json              # Frontend dependencies & scripts
│
├── package.json                  # Root runner scripts
└── README.md
```

---

## 🚀 Quick Start

### 1. Install Dependencies
You can install dependencies for all packages in one step from the root:
```bash
npm run install:all
```

Or install separately:
```bash
# In backend/
cd backend
npm install

# In frontend/
cd ../frontend
npm install
```

### 2. Configure Environment Variables

**Backend (`backend/.env`):**
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
```

**Frontend (`frontend/.env`):**
```env
VITE_API_URL=http://localhost:5000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. Run Development Servers

Run both Backend and Frontend concurrently from the root:
```bash
npm run dev
```

Or run individually:
- **Backend:** `npm run dev:backend` (Runs on `http://localhost:5000`)
- **Frontend:** `npm run dev:frontend` (Runs on `http://localhost:5173`)

---

## 🔌 Features

- **Express REST API**: Clean route separation under `/api` with health checks, status, and modular controllers.
- **Socket.io Real-Time**: Pre-wired for bidirectional events, connection heartbeats, and room support.
- **Supabase SDK**: Configured on both backend and frontend with graceful fallback handling if keys are not yet configured.
- **React Router**: Full single-page application routing (`/`, `/dashboard`, and `*` 404).
- **Vite React**: Lightning fast development server and optimized build pipeline.
