import { requireStaff, jsonError, jsonOk } from "@/lib/booking/auth";
import { getRoomTypes, listReservations } from "@/lib/booking/engine";
import { todayHotelISO } from "@/lib/booking/pricing";
import type { Reservation } from "@/lib/booking/types";

/** GET /api/admin/stats — live operational stats for the admin dashboard. */
export async function GET(req: Request) {
  const auth = await requireStaff(req);
  if (!auth.ok) return jsonError(auth.error, auth.message, 401);

  const today = todayHotelISO();
  const [reservations, roomTypes] = await Promise.all([listReservations({ limit: 300 }), getRoomTypes()]);

  const totalRooms = roomTypes.reduce((a, rt) => a + (rt.qty ?? 0), 0);
  const arrivals = reservations.filter((r) => r.checkIn === today && ["confirmed", "pending"].includes(r.status));
  const departures = reservations.filter((r) => r.checkOut === today && r.status === "checked_in");
  const inHouse = reservations.filter((r) => r.status === "checked_in");
  const monthPrefix = today.slice(0, 7);
  const monthReservations = reservations.filter(
    (r) => r.paymentStatus === "successful" && (r.createdAt ?? "").startsWith(monthPrefix)
  );
  const revenue = monthReservations.reduce((a, r) => a + (r.pricing?.amountPaid ?? 0), 0);

  // Daily revenue trends for the current month
  const [yearStr, monthStr, dayStr] = today.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const currentDay = parseInt(dayStr, 10);
  const daysInMonth = new Date(year, month, 0).getDate();

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const fullMonthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const monthShort = monthNames[month - 1] ?? "Month";
  const monthLong = fullMonthNames[month - 1] ?? "Current Month";

  const revenueByDate = new Map<string, { revenueKobo: number; bookings: number }>();
  for (const r of monthReservations) {
    const d = (r.createdAt ?? "").slice(0, 10);
    const existing = revenueByDate.get(d) || { revenueKobo: 0, bookings: 0 };
    existing.revenueKobo += (r.pricing?.amountPaid ?? 0);
    existing.bookings += 1;
    revenueByDate.set(d, existing);
  }

  const dailyTrends = [];
  let peakRevenue = 0;
  let peakDay = "";

  for (let d = 1; d <= daysInMonth; d++) {
    const dStr = d.toString().padStart(2, "0");
    const dateISO = `${monthPrefix}-${dStr}`;
    const dayData = revenueByDate.get(dateISO);
    const revNaira = dayData ? Math.round(dayData.revenueKobo / 100) : 0;
    const bookings = dayData ? dayData.bookings : 0;

    if (revNaira > peakRevenue) {
      peakRevenue = revNaira;
      peakDay = `${monthShort} ${d}`;
    }

    dailyTrends.push({
      date: dateISO,
      dayLabel: `${monthShort} ${d}`,
      dayNum: d,
      revenue: revNaira,
      bookings,
      isToday: d === currentDay,
      isPastOrToday: d <= currentDay,
    });
  }

  return jsonOk({
    totalRooms,
    arrivals: arrivals.length,
    departures: departures.length,
    inHouse: inHouse.length,
    revenue,
    currency: "NGN",
    recent: reservations.slice(0, 8),
    today,
    dailyTrends,
    monthMetadata: {
      monthName: monthLong,
      monthShort,
      year,
      currentDay,
      daysInMonth,
      peakRevenue,
      peakDay: peakDay || `${monthShort} ${currentDay}`,
      totalPaidBookings: monthReservations.length,
      averageDailyRevenue: currentDay > 0 ? Math.round((revenue / 100) / currentDay) : 0,
    },
  });
}
