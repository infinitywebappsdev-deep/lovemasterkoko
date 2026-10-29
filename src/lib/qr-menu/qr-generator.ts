/**
 * Generate unique QR code URLs for each table/room.
 * Guests scan the QR → land on /qr?room=204 or /qr?table=Table+5
 * with the location pre-filled (FoodApp-style table-specific QR pattern).
 */

/** Base URL for the QR menu page (adjust for deployed origin). */
export function qrMenuBaseUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  // Server/build-time fallback
  return process.env.NEXT_PUBLIC_SITE_URL || "https://bankyhotel.freebuff.page";
}

/**
 * Build the full QR landing URL for a specific room or table.
 */
export function buildTableQrUrl(
  location: string,
  locationType: "room" | "table" | "poolside_garden" = "table",
  ref?: string
): string {
  const base = qrMenuBaseUrl().replace(/\/+$/, "");
  const params = new URLSearchParams();
  if (locationType === "table") {
    params.set("table", location);
  } else {
    params.set("room", location);
  }
  if (ref) params.set("ref", ref);
  return `${base}/qr?${params.toString()}`;
}

/**
 * Build a QR code data URL (PNG) for a table/room URL using a QR code library.
 * Returns a data URI that can be rendered in an <img> tag or downloaded as a poster.
 *
 * @param location - Room number or table identifier
 * @param locationType - "room" | "table" | "poolside_garden"
 * @param size - Pixel size of the QR code (default 300)
 */
export async function generateTableQrDataUrl(
  location: string,
  locationType: "room" | "table" | "poolside_garden" = "table",
  size: number = 300,
  ref?: string
): Promise<string> {
  const url = buildTableQrUrl(location, locationType, ref);

  // Dynamically import a QR code library that works in the browser.
  // Using the 'qrcode' package that is already in package.json.
  const QRCode = (await import("qrcode")).default;

  return QRCode.toDataURL(url, {
    width: size,
    margin: 2,
    color: {
      dark: "#1a1817",
      light: "#f4efe6",
    },
    errorCorrectionLevel: "H",
  });
}

/**
 * Build a printable hotel dining QR card as an HTML string.
 * Can be opened in a new window and printed (Ctrl+P) to create
 * table tent cards with the QR code and hotel branding.
 */
export function buildPrintableQrCardHtml(
  location: string,
  locationType: "room" | "table" | "poolside_garden",
  qrDataUrl: string,
  hotelName: string = "Banky Hotel & Suites"
): string {
  const label = locationType === "room" ? `Room ${location}` :
                locationType === "poolside_garden" ? `Poolside / Garden — ${location}` :
                `Table ${location}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${hotelName} — Dining QR ${label}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@400;500;600&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Inter', sans-serif;
    background: #11100f;
    color: #f4efe6;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 20px;
  }
  .card {
    background: #181715;
    border: 1px solid #2a2520;
    border-radius: 16px;
    padding: 32px;
    text-align: center;
    max-width: 380px;
    width: 100%;
  }
  .hotel-name {
    font-family: 'Playfair Display', serif;
    font-size: 22px;
    font-weight: 700;
    color: #ffbf00;
    margin-bottom: 6px;
  }
  .label {
    font-size: 14px;
    color: #a89f94;
    margin-bottom: 20px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .qr-img {
    width: 220px;
    height: 220px;
    border-radius: 12px;
    border: 2px solid #2a2520;
    margin: 0 auto 16px;
    background: #f4efe6;
  }
  .cta {
    display: inline-block;
    padding: 10px 24px;
    background: #ffbf00;
    color: #11100f;
    font-weight: 600;
    font-size: 14px;
    border-radius: 8px;
    text-decoration: none;
    margin-top: 8px;
  }
  .footer {
    margin-top: 20px;
    font-size: 11px;
    color: #6b635a;
  }
  @media print {
    body { background: white; }
    .card { border: 1px solid #ddd; background: white; color: #111; }
    .hotel-name { color: #333; }
    .label { color: #666; }
    .qr-img { border-color: #ddd; background: white; }
  }
</style>
</head>
<body>
  <div class="card">
    <div class="hotel-name">${hotelName}</div>
    <div class="label">Dining QR • ${label}</div>
    <img class="qr-img" src="${qrDataUrl}" alt="Scan to order" />
    <a class="cta" href="${buildTableQrUrl(location, locationType)}" target="_blank">
      Scan to Order
    </a>
    <div class="footer">
      Room Service • Restaurant Dining • Open Bar<br>
      +234 803 716 6121
    </div>
  </div>
</body>
</html>`;
}
