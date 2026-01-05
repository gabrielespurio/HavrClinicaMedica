# MediAgenda - Medical Clinic Management System

## Overview

MediAgenda is a web-based scheduling and patient management system for medical clinics, built entirely in Brazilian Portuguese. The application provides two main modules: Patient Registration and Appointment Scheduling (Agenda). The system features a Google Calendar-like scheduling interface with support for multiple view modes (day, week, month) and comprehensive patient management including status tracking and appointment history.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: 
  - Zustand for local client state with persistence
  - TanStack React Query for server state management
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS v4 with custom theme variables
- **Forms**: React Hook Form with Zod validation
- **Date Handling**: date-fns library with Brazilian Portuguese locale

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES Modules
- **API Design**: RESTful JSON API with `/api` prefix
- **Build System**: Vite for frontend, esbuild for server bundling

### Authentication System
- **Strategy**: Passport.js with Local Strategy
- **Session Storage**: PostgreSQL-backed sessions via connect-pg-simple
- **Password Hashing**: bcryptjs
- **Session Duration**: 30 days with HTTP-only cookies

### Database Layer
- **Database**: PostgreSQL (Neon serverless)
- **ORM**: Drizzle ORM with drizzle-zod for schema validation
- **Schema Location**: `shared/schema.ts` (shared between client and server)
- **Migrations**: Drizzle Kit with push-based migrations

### Data Models
1. **Users**: Authentication with username, password, name, and role
2. **Patients**: Personal info (name, CPF, birth date, phone, email, address)
3. **Appointments**: Linked to patients with date, time, duration, status, and notes

### Project Structure
```
├── client/           # Frontend React application
│   ├── src/
│   │   ├── components/  # UI components (ui/, layout/, patients/, agenda/)
│   │   ├── contexts/    # React contexts (AuthContext)
│   │   ├── hooks/       # Custom hooks (usePatients, useAppointments)
│   │   ├── lib/         # Utilities (queryClient, store, utils)
│   │   └── pages/       # Route components
├── server/           # Backend Express application
│   ├── auth.ts       # Authentication setup
│   ├── db.ts         # Database connection
│   ├── routes.ts     # API endpoints
│   ├── storage.ts    # Data access layer
│   └── index.ts      # Server entry point
├── shared/           # Shared code between client/server
│   └── schema.ts     # Drizzle schema definitions
```

## External Dependencies

### Database
- **PostgreSQL**: Primary database via Neon serverless PostgreSQL
- **Connection**: Uses `DATABASE_URL` environment variable with SSL

### Authentication & Sessions
- **passport**: Authentication middleware
- **passport-local**: Username/password authentication strategy
- **express-session**: Session management
- **connect-pg-simple**: PostgreSQL session store
- **bcryptjs**: Password hashing

### Frontend Libraries
- **@tanstack/react-query**: Server state management and caching
- **@radix-ui/***: Accessible UI primitives (20+ components)
- **react-hook-form**: Form state management
- **zod**: Schema validation
- **date-fns**: Date manipulation
- **zustand**: Client state management
- **wouter**: Client-side routing
- **lucide-react**: Icon library

### Build Tools
- **Vite**: Frontend dev server and bundler
- **esbuild**: Server bundling for production
- **drizzle-kit**: Database migration tooling
- **TypeScript**: Type checking across the stack

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Secret for session encryption (optional, has default)