# KitchZero - Food Waste Management System

A comprehensive SaaS platform for managing food waste in restaurants and food service establishments.

## 🚀 Quick Start

### Initial Setup (Run once on new machine)
\`\`\`bash
npm run setup
\`\`\`

This will:
- Create `.env` file with default values
- Install dependencies
- Generate Prisma client
- Create database schema
- Provide next steps

### Load Test Data
\`\`\`bash
npm run seed
\`\`\`

### Start Development
\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📋 Available Scripts

### Setup & Database
- `npm run setup` - Initial project setup (run once)
- `npm run seed` - Load test data (preserves existing data)
- `npm run seed:clean` - Clear all data and reload fresh test data
- `npm run db:push` - Push schema changes to database
- `npm run db:studio` - Open Prisma Studio (database browser)
- `npm run db:reset` - Reset database and reload test data

### Development
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## 🔑 Default Login Credentials

After running the seed script:

- **Super Admin**: `superadmin` / `admin123`
- **Branch Admin (Main)**: `branchadmin` / `branch123`
- **Branch Admin (Kandy)**: `admin_kandy` / `branch123`
- **Branch Admin (Galle)**: `admin_galle` / `branch123`

## 🏗️ Project Structure

\`\`\`
├── app/                    # Next.js app directory
│   ├── (dashboard)/       # Dashboard pages
│   ├── api/              # API routes
│   └── login/            # Authentication
├── components/           # Reusable components
├── lib/                 # Utilities and configurations
├── prisma/              # Database schema
└── scripts/             # Setup and seed scripts
\`\`\`

## 🗄️ Database

The project uses PostgreSQL with Prisma ORM. The database includes:

- **Users** - Authentication and role management
- **Branches** - Multi-location support
- **Inventory** - Stock management
- **Waste Logs** - Waste tracking
- **Reviews** - Approval workflow system

## 🔧 Environment Variables

Create a `.env` file in the root directory:

\`\`\`env
DATABASE_URL="postgresql://username:password@localhost:5432/kitchzero"
JWT_SECRET="your-secret-key-change-this-in-production"
\`\`\`

## 🚀 Deployment

1. Set up your production database
2. Update `DATABASE_URL` in your deployment environment
3. Run `npm run build`
4. Deploy to your preferred platform

## 📊 Features

- **Multi-tenant Architecture** - Support for multiple restaurant branches
- **Role-based Access Control** - Super Admin and Branch Admin roles
- **Inventory Management** - Full CRUD operations for stock items
- **Waste Tracking** - Comprehensive waste logging and analytics
- **Review System** - Approval workflow for waste entries
- **Real-time Analytics** - Dashboard with charts and insights
- **Professional UI** - Modern, responsive design

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: JWT with bcrypt
- **Charts**: Chart.js with react-chartjs-2

---

Developed with ❤️ for sustainable food service operations.
