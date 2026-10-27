import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { HOTEL, naira } from "@/lib/hotel";
import type { Reservation } from "./types";

export interface ItineraryData {
  reference: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  roomTypeName: string;
  assignedRoomNumber?: string;
  ratePlanName?: string;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  nights: number;
  adults: number;
  children: number;
  status: string;
  paymentStatus: string;
  pricing?: {
    grandTotal: number;
    amountPaid: number;
    balanceDue: number;
    roomSubtotal?: number;
    taxTotal?: number;
    serviceCharge?: number;
    addonTotal?: number;
    currency?: string;
  };
  requests?: string;
  createdAt?: string;
}

function formatDatePretty(isoDateStr: string): string {
  if (!isoDateStr) return "—";
  try {
    const [y, m, d] = isoDateStr.split("-").map(Number);
    if (!y || !m || !d) return isoDateStr;
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return isoDateStr;
  }
}

/**
 * Generates an authentic, beautifully styled vector PDF itinerary for Banky Hotel & Suites.
 * Includes official branding, hotel location, check-in/out dates, guest details,
 * financial breakdown with payment status, verification QR code, and check-in guide.
 */
export async function generateItineraryPdf(data: ItineraryData): Promise<void> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm

  // Generate QR Code data URL for reservation verification
  const verificationUrl = typeof window !== "undefined"
    ? `${window.location.origin}/booking/confirmation?ref=${encodeURIComponent(data.reference)}`
    : `https://bankyhotelandsuites.com/booking/confirmation?ref=${encodeURIComponent(data.reference)}`;

  let qrDataUrl: string | null = null;
  try {
    qrDataUrl = await QRCode.toDataURL(verificationUrl, {
      width: 280,
      margin: 1,
      color: {
        dark: "#1A1714",
        light: "#FFFFFF",
      },
    });
  } catch (err) {
    console.warn("Failed to generate itinerary QR code:", err);
  }

  // ------------------------------------------------------------------
  // 1. Header Banner (Dark Luxury Charcoal #171513)
  // ------------------------------------------------------------------
  const headerHeight = 38;
  doc.setFillColor(23, 21, 19); // #171513
  doc.rect(0, 0, pageWidth, headerHeight, "F");

  // Gold accent accent bar underneath header
  doc.setFillColor(197, 160, 89); // #C5A059 (Banky Gold)
  doc.rect(0, headerHeight, pageWidth, 1.8, "F");

  // Hotel Name
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("BANKY HOTEL & SUITES", margin, 14);

  // Tagline & Hospitality classification
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(218, 192, 143); // warm champagne gold
  doc.text(HOTEL.tagline.toUpperCase(), margin, 19.5);

  // Hotel Location & Contact (right aligned in header)
  doc.setFontSize(7.5);
  doc.setTextColor(220, 220, 220);
  doc.text("Km 5 NDLEA Junction Ado-Iworoko Rd, Adebayo, Ado-Ekiti", pageWidth - margin, 12, { align: "right" });
  doc.text("Tel: +234 903 587 9708  |  WhatsApp: +234 903 587 9708", pageWidth - margin, 16.5, { align: "right" });
  doc.text("reservations@bankyhotelandsuites.com  |  bankyhotelandsuites.com", pageWidth - margin, 21, { align: "right" });

  // Document Title badge in header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(197, 160, 89);
  doc.text("OFFICIAL GUEST RESERVATION ITINERARY", pageWidth - margin, 31, { align: "right" });

  let currentY = headerHeight + 8;

  // ------------------------------------------------------------------
  // 2. Reference & Status Bar
  // ------------------------------------------------------------------
  const isPaid =
    data.paymentStatus === "successful" ||
    data.paymentStatus === "paid" ||
    (data.pricing && data.pricing.balanceDue <= 0 && data.pricing.amountPaid > 0);

  // Background card for reservation summary
  doc.setFillColor(248, 246, 243); // soft cream #f8f6f3
  doc.setDrawColor(226, 220, 210); // subtle border
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, currentY, contentWidth, 20, 2, 2, "FD");

  // Reference Label & Value
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(110, 105, 98);
  doc.text("BOOKING REFERENCE", margin + 5, currentY + 6);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(184, 134, 11); // deep gold
  doc.text(data.reference, margin + 5, currentY + 13.5);

  // Status Badge (Right side)
  const statusX = pageWidth - margin - 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);

  if (isPaid) {
    doc.setFillColor(236, 253, 245); // light emerald
    doc.setDrawColor(52, 211, 153);
    doc.roundedRect(statusX - 58, currentY + 4, 58, 12, 1.5, 1.5, "FD");
    doc.setTextColor(5, 150, 105);
    doc.text("CONFIRMED · PAID IN FULL", statusX - 29, currentY + 11.5, { align: "center" });
  } else if (data.status === "confirmed") {
    doc.setFillColor(254, 243, 199); // light amber
    doc.setDrawColor(245, 158, 11);
    doc.roundedRect(statusX - 64, currentY + 4, 64, 12, 1.5, 1.5, "FD");
    doc.setTextColor(180, 83, 9);
    doc.text("CONFIRMED · DEPOSIT PAID", statusX - 32, currentY + 11.5, { align: "center" });
  } else {
    doc.setFillColor(254, 243, 199);
    doc.setDrawColor(245, 158, 11);
    doc.roundedRect(statusX - 50, currentY + 4, 50, 12, 1.5, 1.5, "FD");
    doc.setTextColor(180, 83, 9);
    doc.text(`STATUS: ${data.status.toUpperCase()}`, statusX - 25, currentY + 11.5, { align: "center" });
  }

  currentY += 26;

  // ------------------------------------------------------------------
  // 3. Grid: Dates & Stay Details (Left Column) + Guest Details (Right Column)
  // ------------------------------------------------------------------
  const colGap = 6;
  const colWidth = (contentWidth - colGap) / 2; // 88mm each
  const cardHeight = 44;

  // --- Box Left: Stay Dates & Times ---
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(225, 220, 212);
  doc.roundedRect(margin, currentY, colWidth, cardHeight, 2, 2, "FD");

  // Section Header
  doc.setFillColor(242, 238, 230);
  doc.roundedRect(margin, currentY, colWidth, 7.5, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(40, 36, 33);
  doc.text("STAY DATES & TIMINGS", margin + 4, currentY + 5.2);

  // Check-in
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(120, 110, 100);
  doc.text("CHECK-IN", margin + 4, currentY + 13);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(20, 20, 20);
  doc.text(formatDatePretty(data.checkIn), margin + 4, currentY + 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(184, 134, 11);
  doc.text(`From ${HOTEL.checkIn}`, margin + 4, currentY + 22.5);

  // Check-out
  const checkOutX = margin + colWidth / 2 + 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(120, 110, 100);
  doc.text("CHECK-OUT", checkOutX, currentY + 13);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(20, 20, 20);
  doc.text(formatDatePretty(data.checkOut), checkOutX, currentY + 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(184, 134, 11);
  doc.text(`Until ${HOTEL.checkOut}`, checkOutX, currentY + 22.5);

  // Duration & Guests divider line
  doc.setDrawColor(235, 230, 222);
  doc.line(margin + 4, currentY + 26, margin + colWidth - 4, currentY + 26);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(70, 65, 60);
  doc.text(`Duration: ${data.nights} Night${data.nights > 1 ? "s" : ""}`, margin + 4, currentY + 32);
  doc.text(`Occupancy: ${data.adults} Adult${data.adults > 1 ? "s" : ""}${data.children > 0 ? `, ${data.children} Child${data.children > 1 ? "ren" : ""}` : ""}`, margin + 4, currentY + 38);

  // --- Box Right: Guest & Reservation Profile ---
  const rightColX = margin + colWidth + colGap;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(225, 220, 212);
  doc.roundedRect(rightColX, currentY, colWidth, cardHeight, 2, 2, "FD");

  // Section Header
  doc.setFillColor(242, 238, 230);
  doc.roundedRect(rightColX, currentY, colWidth, 7.5, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(40, 36, 33);
  doc.text("PRIMARY GUEST INFORMATION", rightColX + 4, currentY + 5.2);

  // Guest Name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(120, 110, 100);
  doc.text("LEAD GUEST NAME", rightColX + 4, currentY + 13);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(20, 20, 20);
  doc.text(data.guestName || "Guest", rightColX + 4, currentY + 18.5);

  // Email
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(80, 75, 70);
  if (data.guestEmail) {
    doc.text(`Email: ${data.guestEmail}`, rightColX + 4, currentY + 25);
  }
  if (data.guestPhone) {
    doc.text(`Phone: ${data.guestPhone}`, rightColX + 4, currentY + 31);
  }
  if (data.requests) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(110, 100, 90);
    const safeReq = data.requests.length > 40 ? `${data.requests.slice(0, 37)}…` : data.requests;
    doc.text(`Requests: "${safeReq}"`, rightColX + 4, currentY + 38);
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(140, 135, 130);
    doc.text("Special Requests: None requested", rightColX + 4, currentY + 38);
  }

  currentY += cardHeight + 6;

  // ------------------------------------------------------------------
  // 4. Accommodation & Assigned Suite Details
  // ------------------------------------------------------------------
  const roomCardHeight = 26;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(225, 220, 212);
  doc.roundedRect(margin, currentY, contentWidth, roomCardHeight, 2, 2, "FD");

  // Section Header
  doc.setFillColor(242, 238, 230);
  doc.roundedRect(margin, currentY, contentWidth, 7.5, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(40, 36, 33);
  doc.text("ACCOMMODATION & ROOM SELECTION", margin + 4, currentY + 5.2);

  // Room Type
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(20, 20, 20);
  doc.text(data.roomTypeName, margin + 4, currentY + 15);

  // Rate Plan
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 95, 90);
  doc.text(`Rate Plan: ${data.ratePlanName || "Standard Flexible Rate"}`, margin + 4, currentY + 21);

  // Room Assignment Status (Right)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(110, 105, 98);
  doc.text("ASSIGNED UNIT", pageWidth - margin - 45, currentY + 13);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(184, 134, 11);
  const roomUnit = data.assignedRoomNumber ? `Room ${data.assignedRoomNumber}` : "Front Desk Allocation";
  doc.text(roomUnit, pageWidth - margin - 45, currentY + 18.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(130, 125, 120);
  doc.text("Key card issued at reception", pageWidth - margin - 45, currentY + 22.5);

  currentY += roomCardHeight + 6;

  // ------------------------------------------------------------------
  // 5. Payment & Accounting Summary Breakdown
  // ------------------------------------------------------------------
  const p = data.pricing;
  const grandTotal = p ? p.grandTotal / 100 : 0;
  const amountPaid = p ? p.amountPaid / 100 : 0;
  const balanceDue = p ? p.balanceDue / 100 : 0;

  const finCardHeight = 46;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(225, 220, 212);
  doc.roundedRect(margin, currentY, contentWidth, finCardHeight, 2, 2, "FD");

  // Section Header
  doc.setFillColor(242, 238, 230);
  doc.roundedRect(margin, currentY, contentWidth, 7.5, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(40, 36, 33);
  doc.text("PAYMENT SUMMARY & SETTLEMENT BREAKDOWN", margin + 4, currentY + 5.2);

  // Line items
  let itemY = currentY + 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(80, 75, 70);

  // Total Reservation Cost
  doc.text("Total Reservation Charge (including VAT & Service Charge):", margin + 6, itemY);
  doc.setFont("helvetica", "bold");
  doc.text(naira(grandTotal), pageWidth - margin - 6, itemY, { align: "right" });

  itemY += 7;
  // Amount Settled Online
  doc.setFont("helvetica", "normal");
  doc.text("Amount Settled via Paystack (Instant Online Settlement):", margin + 6, itemY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(5, 150, 105);
  doc.text(`-${naira(amountPaid)}`, pageWidth - margin - 6, itemY, { align: "right" });

  // Divider
  itemY += 4;
  doc.setDrawColor(220, 215, 205);
  doc.line(margin + 6, itemY, pageWidth - margin - 6, itemY);

  // Outstanding Balance Banner
  itemY += 7.5;
  if (balanceDue <= 0) {
    doc.setFillColor(236, 253, 245);
    doc.roundedRect(margin + 4, itemY - 4.5, contentWidth - 8, 10, 1.5, 1.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(5, 150, 105);
    doc.text("BALANCE DUE UPON ARRIVAL:  NIL (PAID IN FULL)", margin + 8, itemY + 1.5);
    doc.text(naira(0), pageWidth - margin - 8, itemY + 1.5, { align: "right" });
  } else {
    doc.setFillColor(254, 243, 199);
    doc.roundedRect(margin + 4, itemY - 4.5, contentWidth - 8, 10, 1.5, 1.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(180, 83, 9);
    doc.text("BALANCE DUE AT FRONT DESK (CHECK-IN):", margin + 8, itemY + 1.5);
    doc.text(naira(balanceDue), pageWidth - margin - 8, itemY + 1.5, { align: "right" });
  }

  currentY += finCardHeight + 6;

  // ------------------------------------------------------------------
  // 6. Verification QR Code & Check-in Protocol (Bottom Block)
  // ------------------------------------------------------------------
  const bottomHeight = 44;
  doc.setFillColor(248, 246, 243);
  doc.setDrawColor(226, 220, 210);
  doc.roundedRect(margin, currentY, contentWidth, bottomHeight, 2, 2, "FD");

  // If QR code exists, embed it
  if (qrDataUrl) {
    const qrSize = 34;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin + 4, currentY + 5, qrSize, qrSize, 1.5, 1.5, "F");
    doc.addImage(qrDataUrl, "PNG", margin + 5, currentY + 6, qrSize - 2, qrSize - 2);

    // Instructions next to QR
    const infoX = margin + qrSize + 9;
    const textW = contentWidth - qrSize - 14;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(30, 26, 22);
    doc.text("DIGITAL CHECK-IN VERIFICATION QR", infoX, currentY + 10);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(85, 80, 75);
    doc.text(
      "Present this QR code on your mobile device or printed page upon arrival. The front desk staff will scan it to verify payment and issue your room key immediately.",
      infoX,
      currentY + 15,
      { maxWidth: textW, lineHeightFactor: 1.3 }
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(184, 134, 11);
    doc.text("Hotel Location & Front Desk Assistance:", infoX, currentY + 28);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2);
    doc.setTextColor(70, 65, 60);
    doc.text("Banky Hotel & Suites, Km 5 NDLEA Junction Ado-Iworoko Rd, Adebayo, Ado-Ekiti.", infoX, currentY + 33);
    doc.text("24/7 Front Desk Concierge: +234 903 587 9708 · Secure On-Site Parking Available", infoX, currentY + 37.5);
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(30, 26, 22);
    doc.text("CHECK-IN GUIDE & HOTEL LOCATION", margin + 6, currentY + 10);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(80, 75, 70);
    doc.text("Banky Hotel & Suites, Km 5 NDLEA Junction Ado-Iworoko Rd, Adebayo, Ado-Ekiti, Nigeria.", margin + 6, currentY + 17);
    doc.text("Check-in begins at 2:00 PM. Please present a government-issued photo ID upon arrival.", margin + 6, currentY + 24);
    doc.text("Front Desk: +234 903 587 9708 | WhatsApp: +234 903 587 9708", margin + 6, currentY + 31);
  }

  // ------------------------------------------------------------------
  // 7. Footer
  // ------------------------------------------------------------------
  const footerY = 286;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(140, 135, 130);
  doc.text(
    `Banky Hotel & Suites Itinerary · Ref: ${data.reference} · Generated: ${new Date().toLocaleString("en-GB")}`,
    margin,
    footerY
  );
  doc.text("Quiet Luxury in the Heart of Ado-Ekiti", pageWidth - margin, footerY, { align: "right" });

  // Save the PDF file to user's device
  const cleanRef = (data.reference || "BKS").replace(/[^a-zA-Z0-9-_]/g, "");
  doc.save(`Banky-Hotel-Itinerary-${cleanRef}.pdf`);
}
