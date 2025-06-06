import { type NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { wasteLogSchema } from "@/lib/validation"
import { 
  handleApiError, 
  validateAndParseBody,
  checkRateLimitEnhanced,
  createSecureSuccessResponse,
  logRequest,
  auditLog,
  checkPermissions
} from "@/lib/api-utils"
import { RESOURCES, ACTIONS } from "@/lib/permissions"

export async function GET(request: NextRequest) {
  const requestId = logRequest(request)
  
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Rate limiting
    await checkRateLimitEnhanced(request, user, 'read')

    // Permission check
    if (!checkPermissions(user, RESOURCES.WASTE_LOGS, ACTIONS.READ)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
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

    console.log(`✅ [${requestId}] Retrieved ${wasteLogs.length} waste logs for user:`, user.username)

    return createSecureSuccessResponse({ wasteLogs })
  } catch (error) {
    console.error(`❌ [${requestId}] Error fetching waste logs:`, error)
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  const requestId = logRequest(request)
  
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Rate limiting
    await checkRateLimitEnhanced(request, user, 'write')

    // Permission check
    if (!checkPermissions(user, RESOURCES.WASTE_LOGS, ACTIONS.CREATE)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    // Validate request body with enhanced sanitization
    const validatedData = await validateAndParseBody(request, wasteLogSchema)

    // Branch admins can only add to their own branch
    const targetBranchId = user.role === "SUPER_ADMIN" 
      ? validatedData.branchId || user.branchId 
      : user.branchId

    if (!targetBranchId) {
      return NextResponse.json({ error: "Branch ID is required" }, { status: 400 })
    }

    // Additional security: verify branch access
    if (user.role === "BRANCH_ADMIN" && targetBranchId !== user.branchId) {
      return NextResponse.json({ error: "Cannot create waste logs for other branches" }, { status: 403 })
    }

    // Parse the waste date or use current date as fallback
    const parsedWasteDate = validatedData.wasteDate 
      ? new Date(validatedData.wasteDate) 
      : new Date()

    // Additional validation: prevent future dates
    if (parsedWasteDate > new Date()) {
      return NextResponse.json({ error: "Waste date cannot be in the future" }, { status: 400 })
    }

    // Create waste log with validated data
    const wasteLog = await prisma.wasteLog.create({
      data: {
        itemName: validatedData.itemName,
        quantity: validatedData.quantity,
        unit: validatedData.unit,
        value: validatedData.value,
        reason: validatedData.reason,
        photo: validatedData.photo || null,
        branchId: targetBranchId,
        createdAt: parsedWasteDate,
        updatedAt: parsedWasteDate,
      },
      include: {
        branch: {
          select: { id: true, name: true, location: true },
        },
      },
    })

    // Audit log
    await auditLog(
      'CREATE_WASTE_LOG',
      'WASTE_LOG',
      wasteLog.id,
      user,
      {
        itemName: wasteLog.itemName,
        quantity: wasteLog.quantity,
        value: wasteLog.value,
        reason: wasteLog.reason,
        branchId: wasteLog.branchId
      }
    )

    console.log(`✅ [${requestId}] Waste log created by user:`, user.username)

    return createSecureSuccessResponse({ wasteLog })
  } catch (error) {
    console.error(`❌ [${requestId}] Error creating waste log:`, error)
    return handleApiError(error)
  }
}