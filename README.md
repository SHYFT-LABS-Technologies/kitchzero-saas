# KitchZero - Smart Food Waste Management SaaS

![KitchZero Logo](https://placeholder.svg?height=100&width=300&text=KitchZero)

KitchZero is a comprehensive SaaS platform designed to help restaurants and food service businesses track, manage, and reduce food waste. By providing detailed analytics and actionable insights, KitchZero empowers businesses to make data-driven decisions that benefit both their bottom line and the environment.

## 🌟 Features

- **Waste Tracking**: Log and categorize food waste with detailed information
- **Inventory Management**: Track inventory items, quantities, and expiry dates
- **Multi-branch Support**: Manage multiple restaurant locations from a single dashboard
- **Role-based Access Control**: Super Admin and Branch Admin roles with appropriate permissions
- **Approval Workflow**: Review system for Branch Admin changes to ensure data integrity
- **Analytics Dashboard**: Visual representation of waste trends and cost impact
- **Expiry Alerts**: Notifications for inventory items approaching expiration

## 🛠️ Tech Stack

- **Frontend**: React, Next.js (App Router), Tailwind CSS
- **Backend**: Next.js API Routes, Server Actions
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT-based custom auth system
- **State Management**: React Context API
- **UI Components**: Custom components with Tailwind CSS
- **Icons**: Lucide React

## 📋 Prerequisites

- Node.js (v18+)
- PostgreSQL database
- npm or yarn

## 🚀 Getting Started

### Installation

1. Clone the repository:
   \`\`\`bash
   git clone https://github.com/yourusername/kitchzero-saas.git
   cd kitchzero-saas
   \`\`\`

2. Install dependencies:
   \`\`\`bash
   npm install
   # or
   yarn install
   \`\`\`

3. Set up environment variables:
   Create a `.env` file in the root directory with the following variables:
   \`\`\`
   DATABASE_URL="postgresql://username:password@localhost:5432/kitchzero"
   JWT_SECRET="your-secret-key"
   \`\`\`

4. Set up the database:
   \`\`\`bash
   npx prisma db push
   \`\`\`

5. Seed the database:
   \`\`\`bash
   npm run seed
   \`\`\`

6. Start the development server:
   \`\`\`bash
   npm run dev
   # or
   yarn dev
   \`\`\`

7. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Default Login Credentials

After seeding the database, you can log in with the following credentials:

- **Super Admin**:
  - Username: `superadmin`
  - Password: `admin123`

- **Branch Admin (Main Restaurant)**:
  - Username: `branchadmin`
  - Password: `branch123`

- **Branch Admin (Downtown Branch)**:
  - Username: `admin_kandy`
  - Password: `branch123`

- **Branch Admin (Seaside Cafe)**:
  - Username: `admin_galle`
  - Password: `branch123`

## 📊 Database Schema

KitchZero uses a relational database with the following main entities:

- **User**: System users with different roles (Super Admin, Branch Admin)
- **Branch**: Restaurant locations
- **Inventory**: Food items in stock with expiry dates
- **WasteLog**: Records of food waste with quantities and reasons
- **WasteLogReview**: Approval workflow for Branch Admin changes

## 👥 User Roles and Permissions

### Super Admin
- Full access to all branches
- Can create, update, and delete branches
- Can manage users across all branches
- Can approve or reject Branch Admin change requests
- Direct access to create, update, and delete waste logs

### Branch Admin
- Access limited to assigned branch
- Can view and add inventory items for their branch
- Can create waste logs (requires approval)
- Can request updates or deletions of waste logs (requires approval)
- Cannot access other branches' data

## 📱 Key Screens

### Dashboard
- Overview of waste metrics and trends
- Quick access to key functions
- Performance indicators and alerts

### Waste Management
- Log new waste entries
- View and filter waste logs
- Request edits or deletions (Branch Admin)
- Review and approve changes (Super Admin)

### Inventory Management
- Add and track inventory items
- Monitor expiry dates
- View inventory statistics

### Branch Management (Super Admin only)
- Add and manage branches
- Assign Branch Admins
- View branch performance metrics

## 🔄 Workflow

1. **Branch Admin** logs waste entries
2. System creates a review request
3. **Super Admin** receives notification of pending reviews
4. **Super Admin** approves or rejects the change
5. If approved, the change is applied to the database
6. Analytics are updated to reflect the new data

## 📝 Development Notes

### Project Structure
- `/app`: Next.js App Router pages and API routes
- `/components`: Reusable React components
- `/lib`: Utility functions and shared code
- `/prisma`: Database schema and migrations
- `/scripts`: Database seeding and utility scripts

### API Endpoints

- **Authentication**:
  - `POST /api/auth/login`: User login
  - `POST /api/auth/logout`: User logout
  - `GET /api/auth/me`: Get current user

- **Branches**:
  - `GET /api/branches`: List branches
  - `POST /api/branches`: Create branch
  - `PUT /api/branches/[id]`: Update branch
  - `DELETE /api/branches/[id]`: Delete branch

- **Inventory**:
  - `GET /api/inventory`: List inventory items
  - `POST /api/inventory`: Add inventory item

- **Waste Logs**:
  - `GET /api/waste-logs`: List waste logs
  - `POST /api/waste-logs`: Create waste log
  - `PUT /api/waste-logs/[id]`: Update waste log
  - `DELETE /api/waste-logs/[id]`: Delete waste log

- **Reviews**:
  - `GET /api/reviews`: List pending reviews
  - `PUT /api/reviews/[id]`: Approve/reject review

### Running in Production

To build and run the application in production:

\`\`\`bash
npm run build
npm start
\`\`\`

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgements

- [Next.js](https://nextjs.org/)
- [Prisma](https://www.prisma.io/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Lucide Icons](https://lucide.dev/)

---

Developed with ❤️ for sustainable food service operations.
