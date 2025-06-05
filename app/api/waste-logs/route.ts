import { type NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
 try {
   const user = await getAuthUser(request)
   if (!user) {
     return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
   }

   const whereClause = user.role === "SUPER_ADMIN" ? {} : { branchId: user.branchId }

   const wasteLogs = await prisma.wasteLog.findMany({
     where: whereClause,
     include: {
       branch: {
         select: { id: true, name: true, location: true },
       },
     },
     orderBy: { createdAt: "desc" },
   })

   return NextResponse.json({ wasteLogs })
 } catch (error) {
   console.error("Waste logs fetch error:", error)
   return NextResponse.json({ error: "Internal server error" }, { status: 500 })
 }
}

export async function POST(request: NextRequest) {
 try {
   const user = await getAuthUser(request)
   if (!user) {
     return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
   }

   const { itemName, quantity, unit, value, reason, photo, branchId, date } = await request.json()

   // Branch admins can only add to their own branch
   const targetBranchId = user.role === "SUPER_ADMIN" ? branchId : user.branchId

   if (!targetBranchId) {
     return NextResponse.json({ error: "Branch ID is required" }, { status: 400 })
   }

   // Parse the provided date or use current time
   let wasteDate = new Date()
   if (date) {
     wasteDate = new Date(date)
     // If only date is provided (YYYY-MM-DD), set time to current time
     if (date.length === 10) {
       const now = new Date()
       wasteDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds())
     }
   }

   // Create waste log directly without review process
   const wasteLog = await prisma.wasteLog.create({
     data: {
       itemName,
       quantity: Number.parseFloat(quantity),
       unit,
       value: Number.parseFloat(value),
       reason,
       photo,
       branchId: targetBranchId,
       createdAt: wasteDate, // Use the provided date
     },
     include: {
       branch: {
         select: { id: true, name: true, location: true },
       },
     },
   })

   return NextResponse.json({ wasteLog })
 } catch (error) {
   console.error("Waste log creation error:", error)
   return NextResponse.json({ error: "Internal server error" }, { status: 500 })
 }
}