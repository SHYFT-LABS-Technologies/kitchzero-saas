import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

/**
 * Seed script to load test data
 * This can be run multiple times to refresh test data
 */

async function main() {
  try {
    console.log("🌱 Loading test data...")

    // Check if we should preserve existing data
    const preserveData = process.argv.includes("--preserve")

    if (!preserveData) {
      console.log("🧹 Clearing existing test data...")
      // Clear in correct order (respecting foreign key constraints)
      await prisma.wasteLogReview.deleteMany({})
      await prisma.wasteLog.deleteMany({})
      await prisma.inventory.deleteMany({})
      await prisma.user.deleteMany({})
      await prisma.branch.deleteMany({})
      console.log("✅ Existing data cleared")
    }

    // Create branches
    console.log("🏢 Creating branches...")
    const branches = await Promise.all([
      prisma.branch.create({
        data: {
          id: "main-branch",
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

    // Create users
    console.log("👥 Creating users...")
    const hashedPassword = await bcrypt.hash("admin123", 12)
    const branchPassword = await bcrypt.hash("branch123", 12)

    const superAdmin = await prisma.user.create({
      data: {
        username: "superadmin",
        password: hashedPassword,
        role: "SUPER_ADMIN",
      },
    })

    const branchAdmins = await Promise.all([
      prisma.user.create({
        data: {
          username: "branchadmin",
          password: branchPassword,
          role: "BRANCH_ADMIN",
          branchId: branches[0].id,
        },
      }),
      prisma.user.create({
        data: {
          username: "admin_kandy",
          password: branchPassword,
          role: "BRANCH_ADMIN",
          branchId: branches[1].id,
        },
      }),
      prisma.user.create({
        data: {
          username: "admin_galle",
          password: branchPassword,
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
        const quantity = Math.random() * 50 + 10 // 10-60 units
        const daysToExpiry = Math.random() * 30 + 1 // 1-30 days
        const expiryDate = new Date()
        expiryDate.setDate(expiryDate.getDate() + daysToExpiry)

        await prisma.inventory.create({
          data: {
            itemName: item.name,
            quantity: Number(quantity.toFixed(1)),
            unit: item.unit,
            expiryDate,
            purchaseCost: Number((item.cost * quantity).toFixed(0)),
            branchId: branch.id,
          },
        })
        inventoryCount++
      }
    }
    console.log(`✅ Created ${inventoryCount} inventory items`)

    // Create waste logs with realistic data over the past 90 days
    console.log("🗑️ Creating waste logs...")
    const wasteReasons = ["SPOILAGE", "OVERPRODUCTION", "PLATE_WASTE", "BUFFET_LEFTOVER"] as const
    let wasteLogCount = 0

    for (let dayOffset = 90; dayOffset >= 0; dayOffset--) {
      const date = new Date()
      date.setDate(date.getDate() - dayOffset)

      // Create 2-8 waste entries per day across all branches
      const entriesPerDay = Math.floor(Math.random() * 7) + 2

      for (let i = 0; i < entriesPerDay; i++) {
        const randomBranch = branches[Math.floor(Math.random() * branches.length)]
        const randomItem = inventoryItems[Math.floor(Math.random() * inventoryItems.length)]
        const quantity = Math.random() * 5 + 0.5 // 0.5-5.5 kg/units
        const value = quantity * randomItem.cost * (0.8 + Math.random() * 0.4) // ±20% price variation

        // Add some randomness to the date within the day
        const wasteDate = new Date(date)
        wasteDate.setHours(Math.floor(Math.random() * 24))
        wasteDate.setMinutes(Math.floor(Math.random() * 60))

        await prisma.wasteLog.create({
          data: {
            itemName: randomItem.name,
            quantity: Number(quantity.toFixed(1)),
            unit: randomItem.unit,
            value: Number(value.toFixed(0)),
            reason: wasteReasons[Math.floor(Math.random() * wasteReasons.length)],
            branchId: randomBranch.id,
            createdAt: wasteDate,
          },
        })
        wasteLogCount++
      }
    }
    console.log(`✅ Created ${wasteLogCount} waste logs`)

    // Create sample pending reviews
    console.log("📝 Creating sample pending reviews...")
    let reviewCount = 0

    // Create pending CREATE reviews
    for (let i = 0; i < 3; i++) {
      const randomBranch = branches[Math.floor(Math.random() * branches.length)]
      const randomItem = inventoryItems[Math.floor(Math.random() * inventoryItems.length)]
      const branchAdmin = branchAdmins.find((admin) => admin.branchId === randomBranch.id)

      if (branchAdmin) {
        await prisma.wasteLogReview.create({
          data: {
            action: "CREATE",
            status: "PENDING",
            newData: {
              itemName: randomItem.name,
              quantity: Number((Math.random() * 5 + 0.5).toFixed(1)),
              unit: randomItem.unit,
              value: Number((Math.random() * 1000 + 100).toFixed(0)),
              reason: wasteReasons[Math.floor(Math.random() * wasteReasons.length)],
              branchId: randomBranch.id,
            },
            reason: `New ${randomItem.name} waste entry`,
            createdBy: branchAdmin.id,
          },
        })
        reviewCount++
      }
    }

    // Create pending UPDATE reviews
    const recentWasteLogs = await prisma.wasteLog.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
    })

    for (let i = 0; i < Math.min(2, recentWasteLogs.length); i++) {
      const wasteLog = recentWasteLogs[i]
      const branch = branches.find((b) => b.id === wasteLog.branchId)
      const branchAdmin = branchAdmins.find((admin) => admin.branchId === branch?.id)

      if (branchAdmin && wasteLog) {
        await prisma.wasteLogReview.create({
          data: {
            wasteLogId: wasteLog.id,
            action: "UPDATE",
            status: "PENDING",
            originalData: {
              itemName: wasteLog.itemName,
              quantity: wasteLog.quantity,
              unit: wasteLog.unit,
              value: wasteLog.value,
              reason: wasteLog.reason,
              branchId: wasteLog.branchId,
            },
            newData: {
              itemName: wasteLog.itemName,
              quantity: wasteLog.quantity + 1,
              unit: wasteLog.unit,
              value: wasteLog.value + 100,
              reason: wasteLog.reason,
              branchId: wasteLog.branchId,
            },
            reason: "Correcting quantity and value",
            createdBy: branchAdmin.id,
          },
        })
        reviewCount++
      }
    }

    // Create a pending DELETE review
    if (recentWasteLogs.length > 0) {
      const wasteLogToDelete = recentWasteLogs[recentWasteLogs.length - 1]
      const deleteBranch = branches.find((b) => b.id === wasteLogToDelete.branchId)
      const deleteBranchAdmin = branchAdmins.find((admin) => admin.branchId === deleteBranch?.id)

      if (deleteBranchAdmin && wasteLogToDelete) {
        await prisma.wasteLogReview.create({
          data: {
            wasteLogId: wasteLogToDelete.id,
            action: "DELETE",
            status: "PENDING",
            originalData: {
              itemName: wasteLogToDelete.itemName,
              quantity: wasteLogToDelete.quantity,
              unit: wasteLogToDelete.unit,
              value: wasteLogToDelete.value,
              reason: wasteLogToDelete.reason,
              branchId: wasteLogToDelete.branchId,
            },
            reason: "Incorrect entry - needs to be removed",
            createdBy: deleteBranchAdmin.id,
          },
        })
        reviewCount++
      }
    }

    console.log(`✅ Created ${reviewCount} sample reviews`)

    console.log("\n🎉 Test data loaded successfully!")
    console.log("\n📊 Summary:")
    console.log(`- ${branches.length} branches`)
    console.log(`- ${branchAdmins.length + 1} users (1 super admin, ${branchAdmins.length} branch admins)`)
    console.log(`- ${inventoryCount} inventory items`)
    console.log(`- ${wasteLogCount} waste log entries`)
    console.log(`- ${reviewCount} pending reviews`)

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
