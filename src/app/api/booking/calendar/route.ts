import { getCalendarAvailability } from "@/lib/booking/engine";
import { jsonError, jsonOk } from "@/lib/booking/auth";
import type { CalendarAvailabilityQuery } from "@/lib/booking/types";

/**
 * GET /api/booking/calendar
 * Returns daily real-time inventory availability, sellable status, and starting prices.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const query: CalendarAvailabilityQuery = {
      startDate: searchParams.get("startDate") ?? "",
      endDate: searchParams.get("endDate") ?? "",
      adults: searchParams.get("adults") ? Number(searchParams.get("adults")) : 2,
      children: searchParams.get("children") ? Number(searchParams.get("children")) : 0,
      roomCount: searchParams.get("roomCount") ? Number(searchParams.get("roomCount")) : 1,
      roomTypeId: searchParams.get("roomTypeId") || undefined,
    };

    const result = await getCalendarAvailability(query);
    if (!result.ok) return jsonError(result.error, result.message);
    return jsonOk(result.data);
  } catch (err: any) {
    console.error("GET /api/booking/calendar error:", err);
    return jsonError("INTERNAL_ERROR", err?.message || "Failed to fetch calendar inventory");
  }
}

/**
 * POST /api/booking/calendar
 * Body: { startDate, endDate, adults, children, roomCount, roomTypeId }
 */
export async function POST(req: Request) {
  try {
    let body: Partial<CalendarAvailabilityQuery>;
    try {
      body = await req.json();
    } catch {
      return jsonError("VALIDATION_ERROR", "Invalid request body.");
    }

    const query: CalendarAvailabilityQuery = {
      startDate: String(body.startDate ?? ""),
      endDate: String(body.endDate ?? ""),
      adults: body.adults !== undefined ? Number(body.adults) : 2,
      children: body.children !== undefined ? Number(body.children) : 0,
      roomCount: body.roomCount !== undefined ? Number(body.roomCount) : 1,
      roomTypeId: body.roomTypeId ? String(body.roomTypeId) : undefined,
    };

    const result = await getCalendarAvailability(query);
    if (!result.ok) return jsonError(result.error, result.message);
    return jsonOk(result.data);
  } catch (err: any) {
    console.error("POST /api/booking/calendar error:", err);
    return jsonError("INTERNAL_ERROR", err?.message || "Failed to fetch calendar inventory");
  }
}
