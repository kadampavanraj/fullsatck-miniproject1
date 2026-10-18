# Campus Resource Booking — MERN Stack

A campus resource reservation app for labs, seminar halls, projectors, and other shared college equipment.

## Features
- Browse available campus resources
- Book a resource for a date, time, and purpose
- Prevent overlapping bookings for the same resource
- View and cancel your bookings
- Admin panel to add resources and approve/reject bookings
- Demo login selector (role-based demo; not production authentication)
- MongoDB persistence with Mongoose
- Seed script for sample resources and bookings

## Requirements
- Node.js 18+
- MongoDB running locally or a MongoDB Atlas URI

## Quick Start (Single Port)
1. Run both Frontend and Backend on **one link**:
   ```bash
   npm run dev
   ```
2. Open your browser:
   👉 **http://localhost:5000**

- **Frontend & Backend**: Both live on `http://localhost:5000`
- **Backend API**: `http://localhost:5000/api/resources`
- **API Health**: `http://localhost:5000/api/health`
- **Database**: Uses local persistent MongoDB automatically (`./server/data/db`), or your own MongoDB service on `27017` if running.
- **Sample Data**: Automatically seeded on first run, or run `npm run seed` to reset anytime.

## Demo mode
Use the top-right role selector to switch between Student and Admin. This is only a classroom/demo convenience, not secure authentication. For production, implement real authentication, password hashing, and server-side role authorization before deployment.

## Main API routes
- `GET /api/resources` — list resources
- `POST /api/resources` — add resource (demo admin role via `x-demo-role: admin`)
- `GET /api/bookings` — list bookings
- `POST /api/bookings` — create booking
- `PATCH /api/bookings/:id/status` — approve/reject (demo admin role)
- `DELETE /api/bookings/:id` — cancel booking
