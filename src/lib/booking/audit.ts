import "server-only";
import { serverDb, COL } from "@/lib/booking/server";
import { type Reservation, type ReservationStatus } from "@/lib/booking/types";

export interface TransactionAuditItem {
  id: string;
  reservationId: string;
  reference: string;
  gateway: "paystack" | "bank_transfer" | "front_desk" | "cash";
  channel: string; // "card" | "paystack_transfer" | "ussd" | "manual_bank_transfer" | "pos" | "cash"
  status: "successful" | "failed" | "pending" | "processing" | "cancelled";
  amount: number; // in kobo
  currency: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  roomTypeName: string;
  nights?: number;
  checkIn?: string;
  checkOut?: string;
  gatewayReference?: string;
  failureReason?: string;
  verifiedBy?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
  isPaystack: boolean;
  isManualBankTransfer: boolean;
  metadata?: Record<string, unknown>;
}

export interface TransactionAuditSummary {
  totalCount: number;
  successCount: number;
  failedCount: number;
  pendingCount: number;
  successRatePercent: number;
  totalSuccessVolumeKobo: number;
  paystack: {
    total: number;
    successful: number;
    failed: number;
    pending: number;
    successRate: number;
    volumeKobo: number;
  };
  bankTransfer: {
    total: number;
    successful: number;
    failed: number;
    pending: number;
    volumeKobo: number;
  };
}

/**
 * Retrieve transaction audit logs from Firestore, combining payment records
 * with reservation details and audit log entries.
 */
export async function listTransactionAudits(params?: {
  gateway?: string;
  status?: string;
  search?: string;
  limit?: number;
  startDate?: string;
  endDate?: string;
}): Promise<{ items: TransactionAuditItem[]; summary: TransactionAuditSummary }> {
  try {
    const maxLimit = Math.min(200, Math.max(1, params?.limit ?? 100));

    // 1. Fetch payments
    let payDocs: any[] = [];
    try {
      const paySnap = await serverDb().collection(COL.payments).orderBy("createdAt", "desc").limit(maxLimit).get();
      payDocs = paySnap.docs;
    } catch {
      // Fallback if ordering index isn't built yet
      const paySnap = await serverDb().collection(COL.payments).limit(maxLimit).get();
      payDocs = paySnap.docs;
    }

    // 2. Fetch reservations to enrich guest info
    let resDocs: any[] = [];
    try {
      const resSnap = await serverDb().collection(COL.reservations).orderBy("createdAt", "desc").limit(maxLimit).get();
      resDocs = resSnap.docs;
    } catch {
      const resSnap = await serverDb().collection(COL.reservations).limit(maxLimit).get();
      resDocs = resSnap.docs;
    }

    const resMap = new Map<string, any>();
    resDocs.forEach((d) => {
      resMap.set(d.id, { id: d.id, ...d.data() });
    });

    const itemsMap = new Map<string, TransactionAuditItem>();

    // Process payment documents
    for (const d of payDocs) {
      const p = d.data();
      const res = p.reservationId ? resMap.get(p.reservationId) : null;
      const isPs = p.gateway === "paystack" || (p.gatewayReference && p.gatewayReference.includes("-P"));
      const gateway: "paystack" | "bank_transfer" | "front_desk" | "cash" = isPs
        ? "paystack"
        : p.gateway === "front_desk"
        ? "front_desk"
        : p.gateway === "cash"
        ? "cash"
        : "bank_transfer";

      const item: TransactionAuditItem = {
        id: d.id,
        reservationId: p.reservationId || res?.id || "",
        reference: p.reference || res?.reference || "UNKNOWN-REF",
        gateway,
        channel: p.channel || (isPs ? "card" : "manual_bank_transfer"),
        status: (p.status as any) || (res?.paymentStatus === "successful" ? "successful" : "pending"),
        amount: Number(p.amount ?? res?.pricing?.depositDue ?? res?.pricing?.grandTotal ?? 0),
        currency: p.currency || res?.pricing?.currency || "NGN",
        guestName: res?.guestName || p.guestName || "Valued Guest",
        guestEmail: res?.guestEmail || p.guestEmail || "guest@bankyhotel.com",
        guestPhone: res?.guestPhone || p.guestPhone,
        roomTypeName: res?.roomTypeName || p.roomTypeName || "Deluxe Room",
        nights: res?.nights,
        checkIn: res?.checkIn,
        checkOut: res?.checkOut,
        gatewayReference: p.gatewayReference || res?.gatewayReference || "",
        failureReason: p.failureReason || (p.status === "failed" ? "Transaction failed" : undefined),
        verifiedBy: p.verifiedBy || (p.status === "successful" ? (isPs ? "paystack_webhook" : "front_desk_staff") : undefined),
        paidAt: p.paidAt || (p.status === "successful" ? p.updatedAt : undefined),
        createdAt: p.createdAt || new Date().toISOString(),
        updatedAt: p.updatedAt || new Date().toISOString(),
        isPaystack: isPs,
        isManualBankTransfer: !isPs,
        metadata: p.metadata,
      };

      itemsMap.set(d.id, item);
    }

    // Reconcile: If there are reservations without a separate payment doc, create virtual entries
    for (const [resId, r] of resMap.entries()) {
      let hasMatchingPayment = false;
      for (const item of itemsMap.values()) {
        if (item.reservationId === resId || item.reference === r.reference) {
          hasMatchingPayment = true;
          break;
        }
      }

      if (!hasMatchingPayment) {
        const isPs = Boolean(r.gatewayReference && r.gatewayReference.includes("-P"));
        const isSuccess = r.paymentStatus === "successful";
        const isFailed = r.paymentStatus === "failed" || r.status === "cancelled";
        const status = isSuccess ? "successful" : isFailed ? "failed" : "pending";

        itemsMap.set(`res_${resId}`, {
          id: `res_${resId}`,
          reservationId: resId,
          reference: r.reference || "BKS-RES",
          gateway: isPs ? "paystack" : "bank_transfer",
          channel: isPs ? "card" : "manual_bank_transfer",
          status,
          amount: Number(r.pricing?.depositDue ?? r.pricing?.grandTotal ?? 0),
          currency: r.pricing?.currency || "NGN",
          guestName: r.guestName || "Guest",
          guestEmail: r.guestEmail || "",
          guestPhone: r.guestPhone,
          roomTypeName: r.roomTypeName || "Accommodation",
          nights: r.nights,
          checkIn: r.checkIn,
          checkOut: r.checkOut,
          gatewayReference: r.gatewayReference || "",
          failureReason: isFailed ? (r.cancellationReason || "Hold expired / Unsettled") : undefined,
          verifiedBy: isSuccess ? (isPs ? "paystack_verified" : "staff_verified") : undefined,
          paidAt: isSuccess ? r.updatedAt : undefined,
          createdAt: r.createdAt || new Date().toISOString(),
          updatedAt: r.updatedAt || new Date().toISOString(),
          isPaystack: isPs,
          isManualBankTransfer: !isPs,
        });
      }
    }

    let allItems = Array.from(itemsMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Apply date range filter if provided
    if (params?.startDate) {
      const startMs = new Date(params.startDate).getTime();
      if (!isNaN(startMs)) {
        allItems = allItems.filter((i) => new Date(i.createdAt).getTime() >= startMs);
      }
    }
    if (params?.endDate) {
      const end = new Date(params.endDate);
      if (!isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        const endMs = end.getTime();
        allItems = allItems.filter((i) => new Date(i.createdAt).getTime() <= endMs);
      }
    }

    // Compute metrics before gateway/status filter but within selected date range
    let successCount = 0;
    let failedCount = 0;
    let pendingCount = 0;
    let totalSuccessVolumeKobo = 0;

    let psTotal = 0;
    let psSuccess = 0;
    let psFailed = 0;
    let psPending = 0;
    let psVolume = 0;

    let btTotal = 0;
    let btSuccess = 0;
    let btFailed = 0;
    let btPending = 0;
    let btVolume = 0;

    for (const item of allItems) {
      if (item.status === "successful") {
        successCount++;
        totalSuccessVolumeKobo += item.amount;
      } else if (item.status === "failed") {
        failedCount++;
      } else {
        pendingCount++;
      }

      if (item.isPaystack) {
        psTotal++;
        if (item.status === "successful") {
          psSuccess++;
          psVolume += item.amount;
        } else if (item.status === "failed") {
          psFailed++;
        } else {
          psPending++;
        }
      } else {
        btTotal++;
        if (item.status === "successful") {
          btSuccess++;
          btVolume += item.amount;
        } else if (item.status === "failed") {
          btFailed++;
        } else {
          btPending++;
        }
      }
    }

    const totalAudited = allItems.length;
    const successRatePercent = totalAudited > 0 ? Math.round((successCount / totalAudited) * 100) : 0;
    const psSuccessRate = psTotal > 0 ? Math.round((psSuccess / psTotal) * 100) : 0;

    const summary: TransactionAuditSummary = {
      totalCount: totalAudited,
      successCount,
      failedCount,
      pendingCount,
      successRatePercent,
      totalSuccessVolumeKobo,
      paystack: {
        total: psTotal,
        successful: psSuccess,
        failed: psFailed,
        pending: psPending,
        successRate: psSuccessRate,
        volumeKobo: psVolume,
      },
      bankTransfer: {
        total: btTotal,
        successful: btSuccess,
        failed: btFailed,
        pending: btPending,
        volumeKobo: btVolume,
      },
    };

    // Apply active filters
    if (params?.gateway && params.gateway !== "all") {
      if (params.gateway === "paystack") {
        allItems = allItems.filter((i) => i.isPaystack);
      } else if (params.gateway === "bank_transfer") {
        allItems = allItems.filter((i) => i.isManualBankTransfer);
      }
    }

    if (params?.status && params.status !== "all") {
      allItems = allItems.filter((i) => i.status === params.status);
    }

    if (params?.search) {
      const q = params.search.toLowerCase().trim();
      allItems = allItems.filter(
        (i) =>
          i.reference.toLowerCase().includes(q) ||
          i.guestName.toLowerCase().includes(q) ||
          i.guestEmail.toLowerCase().includes(q) ||
          (i.gatewayReference && i.gatewayReference.toLowerCase().includes(q))
      );
    }

    return { items: allItems.slice(0, maxLimit), summary };
  } catch (err) {
    console.error("Failed to list transaction audits:", err);
    return {
      items: [],
      summary: {
        totalCount: 0,
        successCount: 0,
        failedCount: 0,
        pendingCount: 0,
        successRatePercent: 0,
        totalSuccessVolumeKobo: 0,
        paystack: { total: 0, successful: 0, failed: 0, pending: 0, successRate: 0, volumeKobo: 0 },
        bankTransfer: { total: 0, successful: 0, failed: 0, pending: 0, volumeKobo: 0 },
      },
    };
  }
}

/**
 * Staff manual action: Confirm a bank transfer payment.
 */
export async function confirmManualBankTransferPayment(params: {
  reservationId: string;
  bankReference: string;
  notes?: string;
  staffUser: { uid: string; email?: string; role: string };
}): Promise<{ ok: boolean; message: string }> {
  const now = new Date().toISOString();
  try {
    const resRef = serverDb().collection(COL.reservations).doc(params.reservationId);
    const snap = await resRef.get();
    if (!snap.exists) {
      return { ok: false, message: "Reservation not found" };
    }
    const r = snap.data() as Reservation;

    const amountPaid = r.pricing?.depositDue || r.pricing?.grandTotal || 0;
    const balanceDue = Math.max(0, (r.pricing?.grandTotal || 0) - amountPaid);

    // Update reservation
    await resRef.set(
      {
        status: "confirmed",
        paymentStatus: "successful",
        gatewayReference: params.bankReference || `MANUAL-${Date.now().toString(36).toUpperCase()}`,
        pricing: {
          ...r.pricing,
          amountPaid,
          balanceDue,
        },
        holdExpiresAt: null,
        updatedAt: now,
      },
      { merge: true }
    );

    // Update or create payment record
    const payQuery = await serverDb().collection(COL.payments).where("reservationId", "==", params.reservationId).get();
    if (!payQuery.empty) {
      for (const d of payQuery.docs) {
        await d.ref.set(
          {
            status: "successful",
            gateway: "bank_transfer",
            channel: "manual_bank_transfer",
            gatewayReference: params.bankReference,
            verifiedBy: params.staffUser.email || params.staffUser.uid,
            paidAt: now,
            updatedAt: now,
            notes: params.notes,
          },
          { merge: true }
        );
      }
    } else {
      await serverDb().collection(COL.payments).add({
        reservationId: params.reservationId,
        reference: r.reference,
        amount: amountPaid,
        currency: r.pricing?.currency || "NGN",
        status: "successful",
        gateway: "bank_transfer",
        channel: "manual_bank_transfer",
        gatewayReference: params.bankReference,
        verifiedBy: params.staffUser.email || params.staffUser.uid,
        paidAt: now,
        createdAt: now,
        updatedAt: now,
        notes: params.notes,
      });
    }

    // Record in audit log
    await serverDb().collection(COL.auditLogs).add({
      actor: params.staffUser.uid,
      actorType: "staff",
      actorRole: params.staffUser.role,
      action: "manual_bank_transfer_confirmed",
      entity: "reservation",
      entityId: params.reservationId,
      notes: params.notes || "Bank transfer verified by staff",
      previousValue: { status: r.status, paymentStatus: r.paymentStatus },
      newValue: { status: "confirmed", paymentStatus: "successful", amount: amountPaid, bankReference: params.bankReference },
      createdAt: now,
    });

    return { ok: true, message: "Manual bank transfer verified and reservation confirmed." };
  } catch (err) {
    console.error("Failed to confirm manual bank transfer:", err);
    return { ok: false, message: err instanceof Error ? err.message : "Confirmation failed." };
  }
}
