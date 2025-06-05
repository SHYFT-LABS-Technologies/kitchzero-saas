import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

/**
 * Clean seed script - clears all data and reloads fresh test data
 * Use this when you want to completely reset your test data
 */

async function main() {
  try {
    console.log("🧹 Cleaning database and reloading fresh test data...")

    // Clear all data in correct order
    console.log("🗑️ Clearing all existing data...")
    await prisma.wasteLogReview.deleteMany({})
    await prisma.wasteLog.deleteMany({})
    await prisma.inventory.deleteMany({})
    //await prisma.user.deleteMany({})
    //await prisma.branch.deleteMany({})
    console.log("✅ All data cleared")

    console.log("\n🎉 Database cleaned!")
  } catch (error) {
    console.error("❌ Error during clean seed:", error)
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
