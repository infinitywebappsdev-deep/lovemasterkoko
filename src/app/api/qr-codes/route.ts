import { NextRequest, NextResponse } from "next/server";
import {
  getQrCodes,
  createQrCode,
  updateQrCode,
  deleteQrCode,
  getQrCodeStats,
  getQrCodeById,
} from "@/lib/qr-menu/qr-store";

/**
 * GET /api/qr-codes — List all QR codes (admin).
 * Query: ?active=true|false — filter by active status
 * Query: ?locationType=table|room|poolside_garden — filter by type
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const active = searchParams.get("active");
    const locationType = searchParams.get("locationType");

    const options: { isActive?: boolean; locationType?: string } = {};
    if (active === "true") options.isActive = true;
    else if (active === "false") options.isActive = false;
    if (locationType) options.locationType = locationType;

    const qrCodes = await getQrCodes(options);
    return NextResponse.json({ ok: true, qrCodes });
  } catch (err) {
    console.error("GET /api/qr-codes error:", err);
    return NextResponse.json({ ok: false, error: "Failed to fetch QR codes" }, { status: 500 });
  }
}

/**
 * POST /api/qr-codes — Create a new QR code (admin).
 * Body: { label, locationType, location, areaDescription?, createdBy? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { label, locationType, location, areaDescription, createdBy } = body;

    if (!label || !locationType || !location) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields: label, locationType, location" },
        { status: 400 }
      );
    }

    const qrCode = await createQrCode({
      label,
      locationType,
      location,
      areaDescription,
      createdBy,
    });

    return NextResponse.json({ ok: true, qrCode });
  } catch (err) {
    console.error("POST /api/qr-codes error:", err);
    return NextResponse.json({ ok: false, error: "Failed to create QR code" }, { status: 500 });
  }
}
