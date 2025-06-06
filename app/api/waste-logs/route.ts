// app/api/waste-logs/route.ts
import { type NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { 
  handleApiError, 
  checkRateLimitEnhanced,
  createSecureSuccessResponse,
  createSecureErrorResponse, // Added for CSRF
  logRequest,
  auditLog,
  checkPermissions
} from "@/lib/api-utils"
import { RESOURCES, ACTIONS } from "@/lib/permissions"
import { verifyCsrfToken } from "@/lib/security"; // Import CSRF verification

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

    if (!verifyCsrfToken(request)) {
      // Log the CSRF failure for server-side observability
      console.warn(`CSRF validation failed for request: ${request.method} ${request.url}`);
      return createSecureErrorResponse('Invalid CSRF token', 403);
    }

    // Rate limiting
    await checkRateLimitEnhanced(request, user, 'write')

    // Permission check
    if (!checkPermissions(user, RESOURCES.WASTE_LOGS, ACTIONS.CREATE)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    // Get and validate request body
    const body = await request.json()
    console.log("Waste log creation request:", body)

    // Enhanced validation
    if (!body.itemName || body.itemName.trim().length === 0) {
      return NextResponse.json({ 
        error: "Item name is required",
        details: [{ field: "itemName", message: "Item name is required" }]
      }, { status: 400 })
    }

    if (!body.quantity || isNaN(Number(body.quantity)) || Number(body.quantity) <= 0) {
      return NextResponse.json({ 
        error: "Valid quantity is required",
        details: [{ field: "quantity", message: "Quantity must be a positive number" }]
      }, { status: 400 })
    }

    if (!body.unit || !['kg', 'g', 'pieces', 'liters', 'portions'].includes(body.unit)) {
      return NextResponse.json({ 
        error: "Valid unit is required",
        details: [{ field: "unit", message: "Unit must be kg, g, pieces, liters, or portions" }]
      }, { status: 400 })
    }

    if (!body.value || isNaN(Number(body.value)) || Number(body.value) <= 0) {
      return NextResponse.json({ 
        error: "Valid value is required",
        details: [{ field: "value", message: "Value must be a positive number" }]
      }, { status: 400 })
    }

    if (!body.reason || !['SPOILAGE', 'OVERPRODUCTION', 'PLATE_WASTE', 'BUFFET_LEFTOVER'].includes(body.reason)) {
      return NextResponse.json({ 
        error: "Valid waste reason is required",
        details: [{ field: "reason", message: "Please select a valid waste reason" }]
      }, { status: 400 })
    }

    // Branch admins can only add to their own branch
    const targetBranchId = user.role === "SUPER_ADMIN" 
      ? body.branchId || user.branchId 
      : user.branchId

    if (!targetBranchId) {
      return NextResponse.json({ 
        error: "Branch ID is required",
        details: [{ field: "branchId", message: "Branch selection is required" }]
      }, { status: 400 })
    }

    // Additional security: verify branch access
    if (user.role === "BRANCH_ADMIN" && targetBranchId !== user.branchId) {
      return NextResponse.json({ error: "Cannot create waste logs for other branches" }, { status: 403 })
    }

    // Parse the waste date or use current date as fallback
    const parsedWasteDate = body.wasteDate 
      ? new Date(body.wasteDate + 'T00:00:00.000Z')
      : new Date()

    // Additional validation: prevent future dates
    if (parsedWasteDate > new Date()) {
      return NextResponse.json({ 
        error: "Waste date cannot be in the future",
        details: [{ field: "wasteDate", message: "Waste date cannot be in the future" }]
      }, { status: 400 })
    }

    // Verify branch exists
    const branchExists = await prisma.branch.findUnique({
      where: { id: targetBranchId }
    })

    if (!branchExists) {
      return NextResponse.json({ 
        error: "Selected branch does not exist",
        details: [{ field: "branchId", message: "Selected branch does not exist" }]
      }, { status: 400 })
    }

    // For branch admins, create a review request for approval
    if (user.role === "BRANCH_ADMIN") {
      const review = await prisma.wasteLogReview.create({
        data: {
          action: "CREATE",
          newData: {
            itemName: body.itemName.trim(),
            quantity: Number(body.quantity),
            unit: body.unit,
            value: Number(body.value),
            reason: body.reason,
            photo: body.photo || null,
            branchId: targetBranchId,
            wasteDate: parsedWasteDate.toISOString().split("T")[0],
          },
          reason: "New waste log entry",
          createdBy: user.id,
          status: "PENDING"
        },
      })

      // Audit log
      await auditLog(
        'CREATE_WASTE_LOG_REVIEW',
        'WASTE_LOG_REVIEW',
        review.id,
        user,
        {
          itemName: body.itemName,
          quantity: Number(body.quantity),
          value: Number(body.value),
          reason: body.reason,
          branchId: targetBranchId
        }
      )

      console.log(`✅ [${requestId}] Waste log review created by user:`, user.username)

      return createSecureSuccessResponse({ 
        reviewId: review.id,
        requiresApproval: true,
        message: "Waste log submitted for approval"
      })
    }

    // Super admins can create directly
    const wasteLog = await prisma.wasteLog.create({
      data: {
        itemName: body.itemName.trim(),
        quantity: Number(body.quantity),
        unit: body.unit,
        value: Number(body.value),
        reason: body.reason,
        photo: body.photo || null,
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

    return createSecureSuccessResponse({ 
      wasteLog,
      message: "Waste log created successfully" 
    })
  } catch (error) {
    console.error(`❌ [${requestId}] Error creating waste log:`, error)
    return handleApiError(error)
  }
}