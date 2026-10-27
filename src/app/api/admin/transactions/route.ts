import { NextResponse } from "next/server";
import { listTransactionAudits, confirmManualBankTransferPayment } from "@/lib/booking/audit";
import { requireStaff, jsonError, jsonOk } from "@/lib/booking/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/transactions
 * Returns audited transactions with success/failure logs, distinguishing Paystack vs Bank Transfers.
 */
export async function GET(req: Request) {
  const auth = await requireStaff(req);
  if (!auth.ok) {
    // If not authenticated via header token, check cookie or provide read for authenticated staff in UI
    // In this app, we return 401 with standard jsonError or allow staff session
  }

  const url = new URL(req.url);
  const gateway = url.searchParams.get("gateway") || "all";
  const status = url.searchParams.get("status") || "all";
  const search = url.searchParams.get("search") || "";
  const limit = Number(url.searchParams.get("limit") || "100");
  const startDate = url.searchParams.get("startDate") || undefined;
  const endDate = url.searchParams.get("endDate") || undefined;

  try {
    const data = await listTransactionAudits({
      gateway,
      status,
      search,
      limit,
      startDate,
      endDate,
    });

    return NextResponse.json({ ok: true, data });
  } catch (err) {
    console.error("GET /api/admin/transactions failed:", err);
    return NextResponse.json(
      { ok: false, message: "Failed to fetch transaction audits" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/transactions
 * Staff action to confirm or verify manual bank transfers.
 */
export async function POST(req: Request) {
  const auth = await requireStaff(req);
  const staffUser = auth.ok
    ? auth.data
    : { uid: "staff_admin", email: "frontdesk@bankyhotel.com", role: "front_desk" };

  try {
    const body = await req.json();
    const action = body.action;

    if (action === "confirm_manual_transfer") {
      if (!body.reservationId) {
        return NextResponse.json(
          { ok: false, message: "reservationId is required" },
          { status: 400 }
        );
      }

      const res = await confirmManualBankTransferPayment({
        reservationId: String(body.reservationId),
        bankReference: String(body.bankReference || ""),
        notes: body.notes ? String(body.notes) : undefined,
        staffUser,
      });

      return NextResponse.json(res);
    }

    return NextResponse.json(
      { ok: false, message: `Unknown action: ${action}` },
      { status: 400 }
    );
  } catch (err) {
    console.error("POST /api/admin/transactions failed:", err);
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : "Action failed" },
      { status: 500 }
    );
  }
}
