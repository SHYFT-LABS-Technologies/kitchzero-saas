import { execSync } from "child_process"
import fs from "fs"
import path from "path"

/**
 * Initial setup script for new machines
 * This only needs to be run once when setting up the project
 */

async function main() {
  try {
    console.log("🚀 Starting KitchZero initial setup...")

    // Check if .env file exists, create if not
    const envPath = path.join(process.cwd(), ".env")
    if (!fs.existsSync(envPath)) {
      console.log("📝 Creating .env file...")
      fs.writeFileSync(
        envPath,
        `DATABASE_URL="postgresql://postgres:password@localhost:5432/kitchzero?schema=public"
JWT_SECRET="your-secret-key-change-this-in-production"
`,
      )
      console.log("✅ Created .env file with default values")
      console.log("⚠️ Please update the DATABASE_URL in .env with your actual database connection string")
    } else {
      console.log("✅ .env file already exists")
    }

    // Install dependencies
    console.log("📦 Installing dependencies...")
    execSync("npm install", { stdio: "inherit" })
    console.log("✅ Dependencies installed")

    // Generate Prisma client
    console.log("🔧 Generating Prisma client...")
    execSync("npx prisma generate", { stdio: "inherit" })
    console.log("✅ Prisma client generated")

    // Push schema to database (creates all tables)
    console.log("🗄️ Creating database schema...")
    execSync("npx prisma db push", { stdio: "inherit" })
    console.log("✅ Database schema created")

    console.log("\n🎉 Initial setup completed successfully!")
    console.log("\n📊 Next steps:")
    console.log("1. Update DATABASE_URL in .env if needed")
    console.log("2. Load test data: npm run seed")
    console.log("3. Start development server: npm run dev")
    console.log("4. Open http://localhost:3000")

    console.log("\n💡 Available commands:")
    console.log("- npm run seed        # Load test data")
    console.log("- npm run seed:clean  # Clear and reload test data")
    console.log("- npm run dev         # Start development server")
    console.log("- npm run db:studio   # Open database browser")
  } catch (error) {
    console.error("❌ Error during setup:", error)
    console.log("\n🔧 Troubleshooting:")
    console.log("1. Make sure PostgreSQL is running")
    console.log("2. Check DATABASE_URL in .env file")
    console.log("3. Ensure database exists")
    process.exit(1)
  }
}

main()
