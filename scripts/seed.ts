import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  try {
    console.log("🌱 Starting comprehensive seed...")

    // Clear existing reviews first
    console.log("🧹 Cleaning up existing reviews...")
    await prisma.wasteLogReview.deleteMany({})

    // Create Super Admin
    const hashedPassword = await bcrypt.hash("admin123", 12)
    const superAdmin = await prisma.user.upsert({
      where: { username: "superadmin" },
      update: {},
      create: {
        username: "superadmin",
        password: hashedPassword,
        role: "SUPER_ADMIN",
      },
    })
    console.log("✅ Super Admin created:", superAdmin.username)

    // Create branches - using findFirst and create instead of upsert
    console.log("🏢 Creating branches...")

    // Main branch with specific ID
    const mainBranch = await prisma.branch.upsert({
      where: { id: "main-branch" },
      update: {},
      create: {
        id: "main-branch",
        name: "Main Restaurant",
        location: "Colombo, Sri Lanka",
      },
    })

    // Check if other branches exist, create if not
    let kandyBranch = await prisma.branch.findFirst({
      where: { name: "Downtown Branch" },
    })
    if (!kandyBranch) {
      kandyBranch = await prisma.branch.create({
        data: {
          name: "Downtown Branch",
          location: "Kandy, Sri Lanka",
        },
      })
    }

    let galleBranch = await prisma.branch.findFirst({
      where: { name: "Seaside Cafe" },
    })
    if (!galleBranch) {
      galleBranch = await prisma.branch.create({
        data: {
          name: "Seaside Cafe",
          location: "Galle, Sri Lanka",
        },
      })
    }

    const branches = [mainBranch, kandyBranch, galleBranch]
    console.log("✅ Branches created:", branches.length)

    // Create Branch Admins
    const branchAdminPassword = await bcrypt.hash("branch123", 12)
    const branchAdmins = await Promise.all([
      prisma.user.upsert({
        where: { username: "branchadmin" },
        update: {},
        create: {
          username: "branchadmin",
          password: branchAdminPassword,
          role: "BRANCH_ADMIN",
          branchId: branches[0].id,
        },
      }),
      prisma.user.upsert({
        where: { username: "admin_kandy" },
        update: {},
        create: {
          username: "admin_kandy",
          password: branchAdminPassword,
          role: "BRANCH_ADMIN",
          branchId: branches[1].id,
        },
      }),
      prisma.user.upsert({
        where: { username: "admin_galle" },
        update: {},
        create: {
          username: "admin_galle",
          password: branchAdminPassword,
          role: "BRANCH_ADMIN",
          branchId: branches[2].id,
        },
      }),
    ])
    console.log("✅ Branch Admins created:", branchAdmins.length)

    // Create inventory items
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

    // Clear existing inventory
    console.log("🧹 Cleaning up existing inventory...")
    await prisma.inventory.deleteMany({})

    const inventory = []
    for (const branch of branches) {
      for (const item of inventoryItems) {
        const quantity = Math.random() * 50 + 10 // 10-60 units
        const daysToExpiry = Math.random() * 30 + 1 // 1-30 days
        const expiryDate = new Date()
        expiryDate.setDate(expiryDate.getDate() + daysToExpiry)

        const inventoryItem = await prisma.inventory.create({
          data: {
            itemName: item.name,
            quantity: Number(quantity.toFixed(1)),
            unit: item.unit,
            expiryDate,
            purchaseCost: item.cost * quantity,
            branchId: branch.id,
          },
        })
        inventory.push(inventoryItem)
      }
    }
    console.log("✅ Inventory items created:", inventory.length)

    // Clear existing waste logs
    console.log("🧹 Cleaning up existing waste logs...")
    await prisma.wasteLog.deleteMany({})

    // Create waste logs with realistic data over the past 90 days
    const wasteReasons = ["SPOILAGE", "OVERPRODUCTION", "PLATE_WASTE", "BUFFET_LEFTOVER"] as const
    const wasteLogs = []

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

        const wasteLog = await prisma.wasteLog.create({
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
        wasteLogs.push(wasteLog)
      }
    }
    console.log("✅ Waste logs created:", wasteLogs.length)

    // Create some sample pending reviews
    console.log("📝 Creating sample pending reviews...")
    const sampleReviews = []

    // Create a few pending CREATE reviews
    for (let i = 0; i < 3; i++) {
      const randomBranch = branches[Math.floor(Math.random() * branches.length)]
      const randomItem = inventoryItems[Math.floor(Math.random() * inventoryItems.length)]
      const branchAdmin = branchAdmins.find((admin) => admin.branchId === randomBranch.id)

      if (branchAdmin) {
        const review = await prisma.wasteLogReview.create({
          data: {
            action: "CREATE",
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
        sampleReviews.push(review)
      }
    }

    // Create a few pending UPDATE reviews
    const recentWasteLogs = wasteLogs.slice(-5)
    for (let i = 0; i < 2; i++) {
      const wasteLog = recentWasteLogs[i]
      const branch = branches.find((b) => b.id === wasteLog.branchId)
      const branchAdmin = branchAdmins.find((admin) => admin.branchId === branch?.id)

      if (branchAdmin && wasteLog) {
        const review = await prisma.wasteLogReview.create({
          data: {
            wasteLogId: wasteLog.id,
            action: "UPDATE",
            originalData: wasteLog,
            newData: {
              ...wasteLog,
              quantity: wasteLog.quantity + 1,
              value: wasteLog.value + 100,
            },
            reason: "Correcting quantity and value",
            createdBy: branchAdmin.id,
          },
        })
        sampleReviews.push(review)
      }
    }

    console.log("✅ Sample reviews created:", sampleReviews.length)

    console.log("\n🎉 Comprehensive seed completed successfully!")
    console.log("\nLogin credentials:")
    console.log("Super Admin - Username: superadmin, Password: admin123")
    console.log("Branch Admin (Main) - Username: branchadmin, Password: branch123")
    console.log("Branch Admin (Kandy) - Username: admin_kandy, Password: branch123")
    console.log("Branch Admin (Galle) - Username: admin_galle, Password: branch123")
    console.log(`\nData created:`)
    console.log(`- ${branches.length} branches`)
    console.log(`- ${branchAdmins.length + 1} users`)
    console.log(`- ${inventory.length} inventory items`)
    console.log(`- ${wasteLogs.length} waste log entries`)
    console.log(`- ${sampleReviews.length} pending reviews`)
  } catch (error) {
    console.error("❌ Error in comprehensive seed:", error)
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
