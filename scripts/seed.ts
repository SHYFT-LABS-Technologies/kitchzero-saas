import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  try {
    console.log("🌱 Loading test data...")

    // Clear existing data
    console.log("🧹 Clearing existing test data...")
    await prisma.wasteLogReview.deleteMany({})
    await prisma.wasteLog.deleteMany({})
    await prisma.inventory.deleteMany({})
    await prisma.userSession.deleteMany({})
    await prisma.loginAttempt.deleteMany({})
    await prisma.rateLimit.deleteMany({})
    await prisma.auditLog.deleteMany({})
    await prisma.user.deleteMany({})
    await prisma.branch.deleteMany({})
    console.log("✅ Existing data cleared")

    // Create branches
    console.log("🏢 Creating branches...")
    const branches = await Promise.all([
      prisma.branch.create({
        data: {
          name: "Main Restaurant",
          location: "Colombo, Sri Lanka",
        },
      }),
      prisma.branch.create({
        data: {
          name: "Downtown Branch", 
          location: "Kandy, Sri Lanka",
        },
      }),
      prisma.branch.create({
        data: {
          name: "Seaside Cafe",
          location: "Galle, Sri Lanka",
        },
      }),
    ])
    console.log(`✅ Created ${branches.length} branches`)

    // Create users with secure passwords
    console.log("👥 Creating users...")
    const superAdminPassword = await bcrypt.hash("admin123", 12)
    const branchAdminPassword = await bcrypt.hash("branch123", 12)

    const superAdmin = await prisma.user.create({
      data: {
        username: "superadmin",
        password: superAdminPassword,
        role: "SUPER_ADMIN",
      },
    })

    const branchAdmins = await Promise.all([
      prisma.user.create({
        data: {
          username: "branchadmin",
          password: branchAdminPassword,
          role: "BRANCH_ADMIN",
          branchId: branches[0].id,
        },
      }),
      prisma.user.create({
        data: {
          username: "admin_kandy",
          password: branchAdminPassword,
          role: "BRANCH_ADMIN",
          branchId: branches[1].id,
        },
      }),
      prisma.user.create({
        data: {
          username: "admin_galle",
          password: branchAdminPassword,
          role: "BRANCH_ADMIN",
          branchId: branches[2].id,
        },
      }),
    ])
    console.log(`✅ Created 1 super admin and ${branchAdmins.length} branch admins`)

    // Create inventory items
    console.log("📦 Creating inventory items...")
    const inventoryItems = [
      { name: "Rice", unit: "kg", cost: 150 },
      { name: "Chicken", unit: "kg", cost: 800 },
      { name: "Vegetables", unit: "kg", cost: 200 },
      { name: "Fish", unit: "kg", cost: 600 },
      { name: "Bread", unit: "pieces", cost: 50 },
      { name: "Milk", unit: "liters", cost: 180 },
      { name: "Eggs", unit: "pieces", cost: 25 },
      { name: "Potatoes", unit: "kg", cost: 120 },
      { name: "Onions", unit: "kg", cost: 100 },
      { name: "Tomatoes", unit: "kg", cost: 250 },
    ]

    let inventoryCount = 0
    for (const branch of branches) {
      for (const item of inventoryItems) {
        const quantity = Math.random() * 50 + 10
        const daysToExpiry = Math.random() * 30 + 1
        const expiryDate = new Date()
        expiryDate.setDate(expiryDate.getDate() + daysToExpiry)

        await prisma.inventory.create({
          data: {
            itemName: item.name,
            quantity: quantity,
            unit: item.unit as any,
            expiryDate,
            purchaseCost: item.cost * quantity,
            branchId: branch.id,
          },
        })
        inventoryCount++
      }
    }
    console.log(`✅ Created ${inventoryCount} inventory items`)

    // Create waste logs
    console.log("🗑️ Creating waste logs...")
    const wasteReasons = ["SPOILAGE", "OVERPRODUCTION", "PLATE_WASTE", "BUFFET_LEFTOVER"] as const
    let wasteLogCount = 0

    for (let dayOffset = 90; dayOffset >= 0; dayOffset--) {
      const date = new Date()
      date.setDate(date.getDate() - dayOffset)

      const entriesPerDay = Math.floor(Math.random() * 7) + 2

      for (let i = 0; i < entriesPerDay; i++) {
        const randomBranch = branches[Math.floor(Math.random() * branches.length)]
        const randomItem = inventoryItems[Math.floor(Math.random() * inventoryItems.length)]
        const quantity = Math.random() * 5 + 0.5
        const value = quantity * randomItem.cost * (0.8 + Math.random() * 0.4)

        const wasteDate = new Date(date)
        wasteDate.setHours(Math.floor(Math.random() * 24))
        wasteDate.setMinutes(Math.floor(Math.random() * 60))

        await prisma.wasteLog.create({
          data: {
            itemName: randomItem.name,
            quantity: quantity,
            unit: randomItem.unit as any,
            value: value,
            reason: wasteReasons[Math.floor(Math.random() * wasteReasons.length)],
            branchId: randomBranch.id,
            createdAt: wasteDate,
          },
        })
        wasteLogCount++
      }
    }
    console.log(`✅ Created ${wasteLogCount} waste logs`)

    console.log("\n🎉 Test data loaded successfully!")
    console.log("\n📊 Summary:")
    console.log(`- ${branches.length} branches`)
    console.log(`- ${branchAdmins.length + 1} users`)
    console.log(`- ${inventoryCount} inventory items`)
    console.log(`- ${wasteLogCount} waste log entries`)

    console.log("\n🔑 Login credentials:")
    console.log("Super Admin - Username: superadmin, Password: admin123")
    console.log("Branch Admin (Main) - Username: branchadmin, Password: branch123")
    console.log("Branch Admin (Kandy) - Username: admin_kandy, Password: branch123")
    console.log("Branch Admin (Galle) - Username: admin_galle, Password: branch123")

  } catch (error) {
    console.error("❌ Error loading test data:", error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })