import "server-only";

/**
 * Paystack integration — server-only.
 * Secrets: PAYSTACK_SECRET_KEY (never exposed to the browser).
 * All amounts in kobo. Currency NGN.
 */

const PAYSTACK_BASE = "https://api.paystack.co";

export function paystackSecretKey(): string | null {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key || !key.startsWith("sk_")) return null;
  return key;
}

export type InitiatePaymentResult = {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
};

/** Initialize a Paystack transaction for a reservation's deposit (or full amount). */
export async function initiatePayment(params: {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}): Promise<InitiatePaymentResult> {
  const secretKey = paystackSecretKey();
  if (!secretKey) {
    // NEVER fake a successful payment flow. Without a configured gateway the
    // caller must route the guest to bank transfer / front-desk settlement.
    throw new Error(
      "PAYMENT_NOT_CONFIGURED: Online payment is not configured. Please pay by bank transfer or at the front desk."
    );
  }

  const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: params.email,
      amount: params.amountKobo,
      currency: "NGN",
      reference: params.reference,
      callback_url: params.callbackUrl,
      metadata: params.metadata ?? {},
    }),
    cache: "no-store",
  });
  const json = (await res.json()) as {
    status: boolean;
    message: string;
    data?: { authorization_url: string; access_code: string; reference: string };
  };
  if (!res.ok || !json.status || !json.data) {
    throw new Error(json.message || "Paystack payment initialization failed.");
  }
  return {
    authorizationUrl: json.data.authorization_url,
    accessCode: json.data.access_code,
    reference: json.data.reference,
  };
}

export type PaystackVerification = {
  status: "success" | "failed" | "abandoned" | "pending" | string;
  amount: number; // kobo
  currency: string;
  reference: string;
  channel?: string;
  paidAt?: string;
  paid: boolean;
};

/**
 * Server-side transaction verification — the ONLY source of payment truth.
 * The browser's "payment successful" callback is never trusted.
 */
export async function verifyTransaction(reference: string): Promise<PaystackVerification> {
  const secretKey = paystackSecretKey();
  if (!secretKey) {
    // FAIL CLOSED: never report a payment as verified without the gateway.
    throw new Error(
      "PAYMENT_NOT_CONFIGURED: Payment verification is not configured — cannot confirm this payment."
    );
  }

  const res = await fetch(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
    cache: "no-store",
  });
  const json = (await res.json()) as {
    status: boolean;
    message: string;
    data?: {
      status: string;
      amount: number;
      currency: string;
      reference: string;
      channel?: string;
      paid_at?: string;
    };
  };
  if (!res.ok || !json.status || !json.data) {
    throw new Error(json.message || "Paystack verification failed.");
  }
  const d = json.data;
  return {
    status: d.status,
    amount: d.amount,
    currency: d.currency,
    reference: d.reference,
    channel: d.channel,
    paidAt: d.paid_at,
    paid: d.status === "success",
  };
}

/**
 * Validate the `x-paystack-signature` header of a webhook (HMAC SHA-512 of the
 * raw body with the secret key). Constant-time-ish comparison.
 */
export async function isValidWebhookSignature(rawBody: string, signature: string | null): Promise<boolean> {
  if (!signature) return false;
  const key = paystackSecretKey();
  if (!key) return false;
  const { createHmac, timingSafeEqual } = await import("node:crypto");
  const hmac = createHmac("sha512", key).update(rawBody, "utf8").digest("hex");
  const a = Buffer.from(hmac, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
