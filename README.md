# Felicity Event Management System

A centralized platform for managing college fest events, registrations, merchandise, and attendance — built with the MERN stack as part of the DASS Assignment 1.

## Technology Stack

| Layer         | Technology                       |
| ------------- | -------------------------------- |
| **Frontend**  | React 18 + Vite, React Router v6 |
| **Backend**   | Node.js, Express.js (REST API)   |
| **Database**  | MongoDB (Mongoose ODM), Atlas    |
| **Auth**      | JWT, bcrypt                      |
| **Utilities** | QRCode, Nodemailer, html5-qrcode |

---

## Quick Start (Local Development)

### Prerequisites

- Node.js v18+
- MongoDB (local instance or Atlas connection string)

### Backend

```bash
cd backend
cp .env.example .env    # Configure your environment variables
npm install
npm run seed:admin      # Create the default Admin account
npm run dev             # Starts on http://localhost:5000
```

### Frontend

```bash
cd frontend
npm install
npm run dev             # Starts on http://localhost:5173
```

### Using the Convenience Script (Recommended)

A `script.sh` helper is provided in the project root to simplify local development:

```bash
./script.sh setup       # Install all dependencies (backend + frontend)
./script.sh seed        # Seed the Admin account into the database
./script.sh both        # Start both backend and frontend concurrently
./script.sh backend     # Start only the backend (port 5000)
./script.sh frontend    # Start only the frontend (port 5173)
```

### Default Admin Credentials

- **Email:** admin@felicity.iiit.ac.in
- **Password:** Admin@123

---

## Deployment

- **Frontend:** Deployed on Vercel
- **Backend:** Deployed on Render (Free Tier)
- **Database:** MongoDB Atlas (M0 Free Cluster)

The `deployment.txt` file in the project root contains the live URLs and detailed deployment instructions.

---

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── config/          # Database connection
│   │   ├── controllers/     # Route handlers (auth, event, organizer, admin, discussion)
│   │   ├── middleware/      # JWT auth & RBAC middleware
│   │   ├── models/          # Mongoose schemas (User, Organizer, Admin, Event, Registration, etc.)
│   │   ├── routes/          # Express route definitions
│   │   ├── scripts/         # Admin seeder script
│   │   └── utils/           # Email service, QR generation
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # Navbar, ProtectedRoute, ParticlesBackground
│   │   ├── context/         # AuthContext (global auth state)
│   │   ├── pages/
│   │   │   ├── auth/        # Login, Register, Onboarding
│   │   │   ├── participant/ # Dashboard, BrowseEvents, EventDetails, Profile, Clubs, Ticket
│   │   │   ├── organizer/   # Dashboard, CreateEvent, EditEvent, EventDetails, Profile
│   │   │   └── admin/       # Dashboard, ManageOrganizers, PasswordResetRequests
│   │   └── services/        # Axios API service layer
│   └── package.json
├── README.md
└── deployment.txt
```

---

## User Roles

| Role            | Description                                                                        |
| --------------- | ---------------------------------------------------------------------------------- |
| **Participant** | IIIT or Non-IIIT students who browse events, register, and purchase merchandise    |
| **Organizer**   | Clubs/Councils who create events, track attendance, and manage participants        |
| **Admin**       | System administrator who provisions organizer accounts and handles password resets |

---

## Core Features Implemented (Part 1 — 70 Marks)

### Authentication & Security (Section 4)

- IIIT email domain validation for student registration
- Organizer accounts provisioned by Admin only (no self-registration)
- Admin account seeded via backend script
- Passwords hashed with **bcrypt**; all protected routes use **JWT**
- Role-based access control on every frontend page and backend route
- Sessions persist across browser restarts via localStorage; logout clears all tokens

### User Onboarding & Preferences (Section 5)

- Post-signup onboarding flow for selecting interests and following clubs
- Preferences stored in database and editable from the Profile page
- Preferences influence event recommendations on the dashboard

### Event Types (Section 7)

- **Normal Events:** Individual registration for workshops, talks, competitions
- **Merchandise Events:** T-shirts, hoodies with size/color variants, stock tracking, purchase limits

### Participant Features (Section 9)

- **Dashboard:** Upcoming events, participation history with tabs (Normal, Merchandise, Completed, Cancelled)
- **Browse Events:** Search with partial matching, trending events (top 5 in 24h), filters (type, eligibility, date range, followed clubs)
- **Event Details:** Complete event info, registration/purchase button with deadline and stock validation
- **Registration:** Ticket generation with QR code and unique Ticket ID; email confirmation
- **Profile:** Editable fields (name, contact, college, interests, followed clubs); password change
- **Clubs Page:** List all organizers with follow/unfollow functionality
- **Organizer Detail:** Organizer info with upcoming and past events

### Organizer Features (Section 10)

- **Dashboard:** Events displayed as cards in a scrollable carousel (Name, Type, Status); event analytics (registrations, revenue, attendance)
- **Event Detail:** Overview, analytics, participant list (Name, Email, Reg Date, Payment, Team, Attendance), search/filter, CSV export
- **Create/Edit Event:** Draft → Publish flow; form builder with custom fields (text, dropdown, checkbox); editing rules enforced per status
- **Profile:** Editable fields; Discord Webhook integration for auto-posting new events

### Admin Features (Section 11)

- **Dashboard:** Stats overview (total organizers, events, participants)
- **Manage Organizers:** Add new clubs (auto-generated credentials), toggle active/inactive, delete, reset passwords
- **Password Reset Requests:** View pending requests, approve/reject with notes, full history log

### Deployment (Section 12)

- Frontend deployed on Vercel; Backend deployed on Render
- MongoDB Atlas for production database
- `deployment.txt` contains all live URLs and setup instructions

---

## Advanced Features Implemented (Part 2 — 30 Marks)

### Tier A: Core Advanced Features (Choose 2 — 16 Marks)

#### 1. Merchandise Payment Approval Workflow (8 Marks)

**What it does:** Implements a complete payment verification pipeline for merchandise purchases. After a participant places an order, the order enters a **"Pending Approval"** state. Organizers have a dedicated tab in their event detail page showing all orders with their current status (Pending / Approved / Rejected). On approval, stock is decremented, a ticket with QR is generated, and a confirmation email is sent. Rejected or pending orders do not receive a QR code.

**Justification:** This feature was chosen because merchandise sales are a critical revenue stream for college fests, and unverified payments lead to stock mismanagement and disputes. A structured approval workflow with clear state transitions (Pending → Approved/Rejected) provides organizers with full financial accountability and prevents fraudulent claims.

#### 2. QR Scanner & Attendance Tracking (8 Marks)

**What it does:** Provides organizers with a built-in camera-based QR code scanner on the event detail page. Scanning a participant's QR code instantly validates their ticket and marks attendance with a timestamp. The system rejects duplicate scans, shows a live attendance dashboard (checked-in vs. total), and supports CSV export of attendance reports.

**Justification:** Manual attendance tracking with paper lists is the number one source of chaos at college events. A real-time QR-based system eliminates human error, provides instant verification, and gives organizers a live view of event turnout — which is essential for venue management and post-event analytics.

---

### Tier B: Real-time & Communication Features (Choose 2 — 12 Marks)

#### 1. Real-Time Discussion Forum (6 Marks)

**What it does:** Every event has a dedicated discussion forum accessible from the Event Details page. Registered participants can post messages, ask questions, and react to messages with emojis. Organizers have moderation privileges to **pin** important announcements and delete inappropriate messages. The forum supports threaded replies for organized conversations.

**Justification:** Event-related queries typically get lost in WhatsApp groups. A dedicated, persistent discussion forum directly on the event page keeps all communication organized, searchable, and tied to the event context. Moderation tools give organizers control over the conversation quality.

#### 2. Organizer Password Reset Workflow (6 Marks)

**What it does:** Organizers can request a password reset from the login page by providing their email and a reason. The Admin receives these requests in a dedicated "Password Reset Requests" page with full details (club name, date, reason). The Admin can approve or reject requests with optional comments. On approval, the system auto-generates a new secure password which the Admin can copy and share with the organizer. The system maintains a complete **history log** of all processed requests (Pending/Approved/Rejected tabs).

**Justification:** Since organizer accounts are provisioned by the Admin (no self-registration), organizers cannot reset their own passwords. A formal request-and-approval workflow maintains the security model while providing a practical recovery mechanism. The history log provides an audit trail for accountability.

---

### Tier C: Integration & Enhancement Features (Choose 1 — 2 Marks)

#### 1. Add to Calendar Integration (2 Marks)

**What it does:** Participants can export any registered event to their personal calendar application. The system generates downloadable `.ics` files that are universally compatible with Google Calendar, Apple Calendar, and Microsoft Outlook. Events are exported with correct dates, times, venue information, and automatic timezone handling.

**Justification:** Participants often forget event schedules after registering. Calendar integration ensures they receive automatic reminders from their own calendar app without requiring the platform to implement a separate notification system — leveraging existing tools the user already trusts.

---

## API Endpoints Summary

### Authentication

| Method | Route                       | Description          |
| ------ | --------------------------- | -------------------- |
| POST   | `/api/auth/register`        | Register participant |
| POST   | `/api/auth/login`           | Login (all roles)    |
| GET    | `/api/auth/me`              | Get current user     |
| PUT    | `/api/auth/change-password` | Change password      |

### Events (Participant)

| Method | Route                      | Description          |
| ------ | -------------------------- | -------------------- |
| GET    | `/api/events`              | Browse all events    |
| GET    | `/api/events/trending`     | Get trending events  |
| GET    | `/api/events/:id`          | Event details        |
| POST   | `/api/events/:id/register` | Register for event   |
| POST   | `/api/events/:id/purchase` | Purchase merchandise |

### Organizer

| Method | Route                                     | Description             |
| ------ | ----------------------------------------- | ----------------------- |
| GET    | `/api/organizer/dashboard`                | Dashboard stats         |
| POST   | `/api/organizer/events`                   | Create event            |
| PUT    | `/api/organizer/events/:id`               | Update event            |
| GET    | `/api/organizer/events/:id/registrations` | Participant list        |
| GET    | `/api/organizer/events/:id/export-csv`    | Export participants CSV |

### Admin

| Method | Route                              | Description           |
| ------ | ---------------------------------- | --------------------- |
| GET    | `/api/admin/dashboard`             | Admin stats           |
| POST   | `/api/admin/organizers`            | Create organizer      |
| DELETE | `/api/admin/organizers/:id`        | Delete organizer      |
| PUT    | `/api/admin/organizers/:id/toggle` | Toggle active status  |
| GET    | `/api/admin/password-resets`       | Get reset requests    |
| POST   | `/api/admin/password-resets/:id`   | Process reset request |

### Discussions

| Method | Route                       | Description           |
| ------ | --------------------------- | --------------------- |
| GET    | `/api/discussions/:eventId` | Get event discussions |
| POST   | `/api/discussions/:eventId` | Post a message        |
