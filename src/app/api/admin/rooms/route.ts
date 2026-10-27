import { NextRequest, NextResponse } from "next/server";
import { ROOMS as DEFAULT_ROOMS, Room } from "@/lib/hotel";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/rooms
 * Returns all room categories
 */
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      rooms: DEFAULT_ROOMS,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to fetch room categories" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/rooms
 * Validates and processes a room category save request
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, rate, slug, qty, blurb, features, image, images, video } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Room category name is required" }, { status: 400 });
    }

    if (!rate || Number(rate) <= 0) {
      return NextResponse.json({ error: "A valid positive nightly rate is required" }, { status: 400 });
    }

    const cleanSlug = (slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-")).trim();

    const normalized: Room = {
      slug: cleanSlug,
      name: name.trim(),
      rate: Number(rate),
      qty: Number(qty) || 1,
      image: image || "/images/Standard room.jpg",
      images: Array.isArray(images) && images.length > 0 ? images : [image || "/images/Standard room.jpg"],
      video: video || `/videos/${cleanSlug}-room.mp4`,
      blurb: blurb || "",
      features: Array.isArray(features) ? features : [],
    };

    return NextResponse.json({
      success: true,
      room: normalized,
      message: `Room category "${normalized.name}" processed successfully.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to save room category" },
      { status: 500 }
    );
  }
}
