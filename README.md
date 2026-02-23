# Felicity Event Management System

A centralized platform for managing college fest events, built with the MERN stack.

## 🚀 Quick Start

### Prerequisites

- Node.js v18+
- MongoDB (local or Atlas)

### Backend Setup

```bash
cd backend
cp .env.example .env  # Configure your environment variables
npm install
npm run seed:admin    # Create admin account
npm run dev           # Start server on port 5000
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev           # Start on port 5173
```

## 🔑 Default Admin Credentials

- **Email:** admin@felicity.iiit.ac.in
- **Password:** Admin@123

## 📁 Project Structure

```
├── backend/
│   ├── src/
│   │   ├── config/        # Database config
│   │   ├── controllers/   # Route handlers
│   │   ├── middleware/    # Auth & RBAC
│   │   ├── models/        # Mongoose schemas
│   │   ├── routes/        # API routes
│   │   ├── scripts/       # Admin seeder
│   │   └── utils/         # Email, QR utils
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/    # Navbar, ProtectedRoute
│   │   ├── context/       # AuthContext
│   │   ├── pages/         # Auth, Participant, Organizer, Admin pages
│   │   └── services/      # API services
│   └── package.json
└── README.md
```

## 👥 User Roles

| Role            | Description                                                  |
| --------------- | ------------------------------------------------------------ |
| **Participant** | IIIT or non-IIIT students who can browse/register for events |
| **Organizer**   | Clubs/councils who create and manage events                  |
| **Admin**       | System admin who manages organizers                          |

## ✨ Features Implemented

### Core Features (70 Marks)

- [x] JWT Authentication with bcrypt password hashing
- [x] Role-based access control (RBAC)
- [x] IIIT email validation for student registration
- [x] Event browsing with search and filters
- [x] Event registration with QR code tickets
- [x] Merchandise purchase flow
- [x] Participant dashboard with tabs
- [x] Organizer event management (CRUD)
- [x] Form builder for custom registration forms
- [x] Participant export to CSV
- [x] Admin organizer management

### Advanced Features (30 Marks)

#### Tier A (Choose 2 × 8 marks)

- [x] Merchandise Payment Approval (Admin review + approve/reject purchase payments)
- [x] QR Scanner & Attendance Tracking (Camera-based QR scanning for event check-in)

#### Tier B (Choose 2 × 6 marks)

- [x] Real-Time Discussion Forum (Live chat on event pages with moderation)
- [x] Organizer Password Reset Workflow (Request → Admin review → Auto-generate)

#### Tier C (Choose 1 × 2 marks)

- [x] Add to Calendar (.ics download + Google Calendar link)

## 🛠 Tech Stack

- **Frontend:** React + Vite, React Router, Axios
- **Backend:** Express.js, MongoDB + Mongoose
- **Auth:** JWT, bcrypt
- **Utilities:** QRCode, Nodemailer

## 📝 API Endpoints

### Auth

- `POST /api/auth/register` - Register participant
- `POST /api/auth/login` - Login (all roles)
- `GET /api/auth/me` - Get current user

### Events

- `GET /api/events` - Browse events
- `GET /api/events/:id` - Event details
- `POST /api/events/:id/register` - Register for event

### Organizer

- `GET /api/organizer/dashboard` - Dashboard stats
- `POST /api/organizer/events` - Create event
- `GET /api/organizer/events/:id/participants` - Participant list

### Admin

- `POST /api/admin/organizers` - Create organizer
- `DELETE /api/admin/organizers/:id` - Remove organizer
