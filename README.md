# Classroom Seating Management System

A modern, full-featured classroom seating management application built with Next.js 16, React 19, TypeScript, and MongoDB.

![Dashboard](/public/placeholder.jpg)

## 🎯 Features

### Core Functionality

- **📊 Dashboard** - Overview and analytics for room utilization, seat assignments, and student statistics
- **🚪 Room Management** - Create, edit, and manage classrooms with capacity tracking
- **💺 Seat Assignment & Simulation** - Interactive Smart Seat Allocation Engine (SSAE) with real-time visual grid simulation and mathematical distribution methods
- **👨‍🎓 Student Management** - Complete student registration and profile management
- **🤖 AI Agents** - Intelligent agent orchestration for automated seat planning
- **🖨️ Exports** - Export Live Simulation layouts precisely to Visual PDF and Spatial CSV mapped spreadsheets
- **📑 Reports** - Generate comprehensive reports on seating arrangements and utilization
- **🔐 Authentication** - Secure login system with protected routes

### Feature Tree

```mermaid
graph TD
    A[Classroom Seating Management System] --> B[Dashboard]
    A --> C[Reports]
    A --> D[Rooms]
    A --> E[Seats]
    A --> F[Students]
    A --> G[AI Agents]
    A --> H[Authentication]
    D --> D1[Room Listing]
    D --> D2[Room Creation]
    D --> D3[Room Editing]
    E --> E1[Seat Grid View]
    E --> E2[Seat Assignment]
    E --> E3[Real-time Layout Simulation]
    E --> E4[PDF & CSV Export Engine]
    F --> F1[Student Registration]
    F --> F2[Student Profile]
    F --> F3[Student Import]
    G --> G1[Agent Orchestration]
    G --> G2[Skill Execution]
    H --> H1[Login Flow]
    H --> H2[Protected Access]
```

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 16.1.6 (App Router)
- **Language**: TypeScript 5.7.3
- **UI Library**: React 19.2.4
- **Styling**: Tailwind CSS 4.2.0
- **Components**: Radix UI primitives
- **Charts**: Recharts 2.15.0
- **Forms**: React Hook Form 7.54.1 with Zod validation
- **Theme**: next-themes for dark/light mode

### Backend
- **Database**: MongoDB with Mongoose 9.3.1
- **API**: Next.js API Routes
- **Authentication**: Custom JWT-based auth

### Key Dependencies
- `@radix-ui/*` - Accessible UI components
- `lucide-react` - Icon library
- `class-variance-authority` - Component variants
- `sonner` - Toast notifications
- `date-fns` - Date utilities
- `html-to-image` & `jspdf` - High-fidelity layout rendering and exporting

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** v18+ and pnpm/yarn/npm
- **MongoDB** (local or cloud instance)
- **Git** (optional, for version control)

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd b_IhTH7MV6qn5-1773852799385
```

### 2. Install Dependencies

```bash
pnpm install
# or
npm install
# or
yarn install
```

### 3. Environment Setup

Create a `.env.local` file in the root directory:

```env
MONGODB_URI=mongodb://localhost:27017/exam_seat_mgmt
```

For MongoDB Atlas (cloud):

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/exam_seat_mgmt?retryWrites=true&w=majority
```

### 4. Start the Development Server

```bash
pnpm dev
# or
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## 📁 Project Structure

```
.
├── app/                      # Next.js App Router pages
│   ├── api/                  # API routes
│   │   ├── auth/login/      # Authentication endpoint
│   │   ├── rooms/           # Rooms CRUD API
│   │   ├── seats/           # Seat management API
│   │   └── students/        # Students CRUD API
│   ├── dashboard/           # Dashboard page
│   ├── reports/             # Reports page
│   ├── rooms/               # Room management UI
│   ├── seats/               # Seat assignment UI
│   ├── students/            # Student management UI
│   ├── sign-in/             # Login page
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Home page
├── components/
│   ├── auth/                # Auth components (LoginForm, ProtectedRoute)
│   ├── layout/              # Layout components (Sidebar, MainLayout)
│   ├── room/                # Room-related components
│   ├── seat/                # Seat grid and assignment components
│   ├── student/             # Student form components
│   └── ui/                  # Reusable UI components (shadcn/radix)
├── hooks/                   # Custom React hooks
│   ├── use-auth.tsx         # Authentication hook
│   ├── use-app-state.tsx    # Global state management
│   └── use-toast.ts         # Toast notifications
├── lib/
│   ├── models/              # Mongoose data models
│   ├── mongodb.ts           # MongoDB connection utility
│   └── utils.ts             # Helper functions
└── public/                  # Static assets
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login` - User login

### Rooms
- `GET /api/rooms` - List all rooms
- `POST /api/rooms` - Create new room
- `GET /api/rooms/[id]` - Get room by ID
- `PUT /api/rooms/[id]` - Update room
- `DELETE /api/rooms/[id]` - Delete room

### Seats
- `GET /api/seats` - Get all seats
- `POST /api/seats` - Assign/update seats

### Students
- `GET /api/students` - List all students
- `POST /api/students` - Create new student
- `GET /api/students/[id]` - Get student by ID
- `PUT /api/students/[id]` - Update student
- `DELETE /api/students/[id]` - Delete student

### Utility
- `POST /api/seed` - Seed database with initial data

## 🎨 UI Components

This project uses Radix UI primitives with custom styling via Tailwind CSS. Key components include:

- Forms (inputs, selects, checkboxes, radio groups)
- Navigation (sidebar, breadcrumbs, tabs)
- Overlays (dialogs, popovers, dropdowns, tooltips)
- Data Display (tables, cards, charts, avatars)
- Feedback (alerts, toasts, badges)
- Layout (grid, flex, resizable panels)

## 📊 Database Models

The application uses Mongoose ODM with the following models (located in `lib/models/`):

- **Room** - Classroom information and capacity
- **Seat** - Seat positions and assignments
- **Student** - Student profiles and details
- **User** - Authentication and user management

## 🔐 Authentication

The application implements JWT-based authentication:

1. Users log in via `/sign-in` page
2. Token is stored securely
3. Protected routes use `ProtectedRoute` component
4. Auth state managed via `useAuth` hook

## 🛠️ Available Scripts

```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
```

## 🌐 Deployment

### Vercel (Recommended)

```bash
vercel deploy
```

Make sure to set environment variables in Vercel dashboard.

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm; pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
EXPOSE 3000
CMD ["pnpm", "start"]
```

## 🧪 Testing

```bash
# Add test scripts here (currently not configured)
pnpm test
```

## 📝 Adding New Features

### Creating a New Page

1. Add route in `app/` directory
2. Create API endpoint in `app/api/`
3. Add Mongoose model in `lib/models/`
4. Create UI components in `components/`

### Adding New API Route

```typescript
// app/api/new-feature/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'Hello' });
}
```

## 🐛 Troubleshooting

### MongoDB Connection Issues

```bash
# Check if MongoDB is running
mongod --version

# Start MongoDB locally
sudo systemctl start mongod
```

### Build Errors

```bash
# Clear cache and rebuild
rm -rf .next node_modules
pnpm install
pnpm dev
```

## 📄 License

This project is private and proprietary.

## 👥 Contributing

This is a private project. Please contact the maintainer for contribution guidelines.

## 📞 Support

For issues and questions:
- Check existing documentation
- Review error logs in browser console
- Contact development team

---

**Built with** ❤️ **using Next.js, React, and MongoDB**
#   e x a m _ s e a t _ m a n a g e m e n t  
 #   s e a t  
 #   s e a t  
 