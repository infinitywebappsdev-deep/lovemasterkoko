import { NextRequest, NextResponse } from "next/server";

import { requireStaff, jsonError } from "@/lib/booking/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/media/stitch-video
 *
 * Stitching clips needs ffmpeg (normalisation, crossfades, concat), which is
 * not available in the Worker runtime — there is no writable disk and no
 * binary to spawn. The endpoint answers with an explicit 501 plus guidance so
 * the admin UI shows a real explanation instead of a crashed request.
 *
 * Pre-stitched clips keep working: upload the finished file through
 * `/api/upload-video` or the homepage media uploader.
 */
export async function POST(req: NextRequest) {
  const auth = await requireStaff(req);
  if (!auth.ok) return jsonError(auth.error, auth.message, 401);

  return NextResponse.json(
    {
      ok: false,
      error: "server_side_stitching_unavailable",
      message:
        "Video stitching requires ffmpeg, which is not available in this deployment. Stitch the clips in an editor and upload the finished MP4 with the room video uploader.",
    },
    { status: 501 }
  );
}
