import { NextResponse } from "next/server";
import { getPaymentSettings, updatePaymentSettings } from "@/lib/settings/payment";

export const dynamic = "force-dynamic";

/**
 * GET /api/settings/payment
 * Returns the current payment settings across the site.
 */
export async function GET() {
  try {
    const settings = await getPaymentSettings();
    return NextResponse.json(
      { ok: true, data: settings },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3, stale-while-revalidate=5",
        },
      }
    );
  } catch (err) {
    console.error("GET /api/settings/payment error:", err);
    return NextResponse.json(
      { ok: false, message: "Could not load payment settings" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings/payment
 * Updates payment settings (e.g. toggles paystackEnabled, updates bank details).
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const partial: Record<string, unknown> = {};
    if (typeof body.paystackEnabled === "boolean") {
      partial.paystackEnabled = body.paystackEnabled;
    }
    if (typeof body.bankTransferEnabled === "boolean") {
      partial.bankTransferEnabled = body.bankTransferEnabled;
    }
    if (typeof body.frontDeskEnabled === "boolean") {
      partial.frontDeskEnabled = body.frontDeskEnabled;
    }
    if (typeof body.noticeMessage === "string") {
      partial.noticeMessage = body.noticeMessage;
    }
    if (body.bankDetails && typeof body.bankDetails === "object") {
      partial.bankDetails = {
        bankName: String(body.bankDetails.bankName || "Zenith Bank"),
        accountName: String(body.bankDetails.accountName || "Banky Hotel & Suites Ltd"),
        accountNumber: String(body.bankDetails.accountNumber || "1018273645"),
        instructions: String(body.bankDetails.instructions || ""),
      };
    }
    if (body.thermalPrinter && typeof body.thermalPrinter === "object") {
      partial.thermalPrinter = {
        autoPrintOnConfirmation: body.thermalPrinter.autoPrintOnConfirmation !== false,
        paperWidth: body.thermalPrinter.paperWidth === "58mm" ? "58mm" : "80mm",
        triggerOn: ["confirmation", "incoming", "both"].includes(body.thermalPrinter.triggerOn)
          ? body.thermalPrinter.triggerOn
          : "both",
        chimeOnPrint: body.thermalPrinter.chimeOnPrint !== false,
        includeChefNotes: body.thermalPrinter.includeChefNotes !== false,
        autoCloseAfterPrint: body.thermalPrinter.autoCloseAfterPrint !== false,
      };
    }

    const updated = await updatePaymentSettings(partial, "admin_user");
    return NextResponse.json({ ok: true, data: updated });
  } catch (err) {
    console.error("POST /api/settings/payment error:", err);
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : "Failed to update payment settings" },
      { status: 500 }
    );
  }
}
