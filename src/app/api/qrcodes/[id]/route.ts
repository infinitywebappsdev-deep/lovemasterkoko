import { NextRequest, NextResponse } from "next/server";
import { getQrCodeById, updateQrCode, deleteQrCode, regenerateQrImage } from "@/lib/qr-menu/qr-store";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/qrcodes/[id] — Get a single QR code by ID.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const qrCode = await getQrCodeById(id);

    if (!qrCode) {
      return NextResponse.json({ ok: false, error: "QR code not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, qrCode });
  } catch (err) {
    console.error("GET /api/qrcodes/[id] error:", err);
    return NextResponse.json({ ok: false, error: "Failed to fetch QR code" }, { status: 500 });
  }
}

/**
 * PATCH /api/qrcodes/[id] — Update a QR code.
 * Body: { label?, locationType?, location?, areaDescription?, isActive? }
 * If location or locationType changes, the target URL and QR image are regenerated automatically.
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await req.json();

    // Check existence
    const existing = await getQrCodeById(id);
    if (!existing) {
      return NextResponse.json({ ok: false, error: "QR code not found" }, { status: 404 });
    }

    const qrCode = await updateQrCode(id, body);
    return NextResponse.json({ ok: true, qrCode });
  } catch (err) {
    console.error("PATCH /api/qrcodes/[id] error:", err);
    return NextResponse.json({ ok: false, error: "Failed to update QR code" }, { status: 500 });
  }
}

/**
 * DELETE /api/qrcodes/[id] — Soft-delete a QR code (sets isActive: false).
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await deleteQrCode(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/qrcodes/[id] error:", err);
    return NextResponse.json({ ok: false, error: "Failed to delete QR code" }, { status: 500 });
  }
}
