/**
 * QR Code entity for per-table/room QR management.
 * Inspired by softenrj/qr-menu's dedicated QR document pattern.
 */
export interface QrCodeEntity {
  /** Unique document ID in Firestore */
  id: string;
  /** Human label: "Table 5", "Room 204", "Poolside Bar" */
  label: string;
  /** Location type this QR serves */
  locationType: "room" | "table" | "poolside_garden";
  /** The location identifier (room number, table name, etc.) */
  location: string;
  /** Firestore-generated target URL stored for QR generation */
  targetUrl: string;
  /** Base64-encoded PNG QR image (generated at creation time) */
  qrImageBase64?: string;
  /** Physical location description for staff (e.g. "Executive Lounge, 2nd Floor") */
  areaDescription?: string;
  /** Whether this QR code is currently active/usable */
  isActive: boolean;
  /** Which staff member created this QR */
  createdBy?: string;
  /** When this QR was created */
  createdAt: string;
  /** Last modified timestamp */
  updatedAt: string;
}

/**
 * Create a new QR code document in Firestore.
 */
export interface CreateQrCodeInput {
  label: string;
  locationType: "room" | "table" | "poolside_garden";
  location: string;
  areaDescription?: string;
  createdBy?: string;
}
