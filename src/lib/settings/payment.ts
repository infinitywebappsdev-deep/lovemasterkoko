import "server-only";
import { serverDb, COL } from "@/lib/booking/server";
import {
  type PaymentSettings,
  type BankDetails,
  DEFAULT_PAYMENT_SETTINGS,
} from "./types";

export type { PaymentSettings, BankDetails };
export { DEFAULT_PAYMENT_SETTINGS };

let _inMemorySettings: PaymentSettings | null = null;

/**
 * Fetch payment settings from Firestore (site_settings/payment) on the server side.
 * Falls back safely to default settings if the document does not exist yet.
 */
export async function getPaymentSettings(): Promise<PaymentSettings> {
  try {
    const docRef = serverDb().collection(COL.siteSettings).doc("payment");
    const snap = await docRef.get();
    if (snap && snap.exists && typeof snap.data === "function") {
      const data = snap.data();
      if (data) {
        const resolved: PaymentSettings = {
          ...DEFAULT_PAYMENT_SETTINGS,
          ...data,
          bankDetails: {
            ...DEFAULT_PAYMENT_SETTINGS.bankDetails,
            ...(data.bankDetails || {}),
          },
          thermalPrinter: {
            ...(DEFAULT_PAYMENT_SETTINGS.thermalPrinter || {}),
            ...(data.thermalPrinter || {}),
            autoPrintOnConfirmation:
              data.thermalPrinter?.autoPrintOnConfirmation !== undefined
                ? Boolean(data.thermalPrinter.autoPrintOnConfirmation)
                : true,
          },
          // Explicit boolean coercion
          paystackEnabled: data.paystackEnabled !== false,
          bankTransferEnabled: data.bankTransferEnabled !== false,
          frontDeskEnabled: data.frontDeskEnabled !== false,
        };
        _inMemorySettings = resolved;
        return resolved;
      }
    }
  } catch (err) {
    console.warn("Could not read site_settings/payment from Firestore, using in-memory or default:", err);
  }

  return _inMemorySettings || DEFAULT_PAYMENT_SETTINGS;
}

/**
 * Quick server check for whether Paystack is enabled.
 */
export async function isPaystackActive(): Promise<boolean> {
  const settings = await getPaymentSettings();
  return Boolean(settings.paystackEnabled);
}

/**
 * Update payment settings in Firestore.
 */
export async function updatePaymentSettings(
  partial: Partial<PaymentSettings>,
  updatedBy: string = "staff"
): Promise<PaymentSettings> {
  const current = await getPaymentSettings();
  const next: PaymentSettings = {
    ...current,
    ...partial,
    bankDetails: {
      ...current.bankDetails,
      ...(partial.bankDetails || {}),
    },
    thermalPrinter: {
      ...(current.thermalPrinter || DEFAULT_PAYMENT_SETTINGS.thermalPrinter!),
      ...(partial.thermalPrinter || {}),
    },
    updatedAt: new Date().toISOString(),
    updatedBy,
  };

  _inMemorySettings = next;

  try {
    const docRef = serverDb().collection(COL.siteSettings).doc("payment");
    await docRef.set(next, { merge: true });
  } catch (err) {
    console.warn("Could not write site_settings/payment to Firestore, retaining in-memory state:", err);
  }

  return next;
}
