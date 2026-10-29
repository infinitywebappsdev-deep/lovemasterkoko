import "server-only";
// NOTE: firebase-admin is intentionally NOT used in this project.
// It performs dynamic code generation (eval/new Function) at module load,
// which Cloudflare Workers/workerd rejects with a "Code generation from strings
// disallowed" TypeError — every API route crashed with a 500.
// There is no service-account key configured anyway (see hasValidServiceAccount
// history + .env.example), and Firestore security rules are written for the
// unauthenticated web SDK, so the web SDK is the single data path everywhere:
// local dev, tests and the deployed Worker all behave identically.
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  runTransaction,
  writeBatch,
  type DocumentReference,
  type QueryConstraint,
  type WhereFilterOp,
  type OrderByDirection,
} from "firebase/firestore";
import { db as webDb } from "@/lib/firebase";
import firebaseConfigData from "../../../firebase-applet-config.json";


export interface GenericDocSnapshot<T = any> {
  id: string;
  exists: boolean;
  data: () => T | undefined;
  ref: WebDocRef;
}

export interface GenericQuerySnapshot<T = any> {
  empty: boolean;
  size: number;
  docs: GenericDocSnapshot<T>[];
}

export class WebDocRef {
  readonly id: string;
  readonly ref: DocumentReference;
  readonly colName: string;

  constructor(colName: string, id?: string) {
    this.colName = colName;
    if (id) {
      this.ref = doc(webDb, colName, id);
      this.id = id;
    } else {
      this.ref = doc(collection(webDb, colName));
      this.id = this.ref.id;
    }
  }

  async get(): Promise<GenericDocSnapshot> {
    const snap = await getDoc(this.ref);
    return {
      id: snap.id,
      exists: snap.exists(),
      data: () => snap.data(),
      ref: this,
    };
  }

  async set(data: any, options?: { merge?: boolean }): Promise<void> {
    const sanitized = sanitizeUndefined(data);
    if (options?.merge) {
      await setDoc(this.ref, sanitized, { merge: true });
    } else {
      await setDoc(this.ref, sanitized);
    }
  }

  async update(data: any): Promise<void> {
    const sanitized = sanitizeUndefined(data);
    await updateDoc(this.ref, sanitized);
  }

  async delete(): Promise<void> {
    await deleteDoc(this.ref);
  }
}

export class WebQuery {
  protected colName: string;
  protected constraints: QueryConstraint[];

  constructor(colName: string, constraints: QueryConstraint[] = []) {
    this.colName = colName;
    this.constraints = constraints;
  }

  where(field: string, opStr: string, value: any): WebQuery {
    return new WebQuery(this.colName, [
      ...this.constraints,
      where(field, opStr as WhereFilterOp, value),
    ]);
  }

  orderBy(field: string, directionStr?: "asc" | "desc"): WebQuery {
    return new WebQuery(this.colName, [
      ...this.constraints,
      orderBy(field, directionStr as OrderByDirection),
    ]);
  }

  limit(n: number): WebQuery {
    return new WebQuery(this.colName, [
      ...this.constraints,
      limit(n),
    ]);
  }

  async get(): Promise<GenericQuerySnapshot> {
    const colRef = collection(webDb, this.colName);
    const q = this.constraints.length > 0 ? query(colRef, ...this.constraints) : colRef;
    const snap = await getDocs(q);
    return {
      empty: snap.empty,
      size: snap.size,
      docs: snap.docs.map((d) => ({
        id: d.id,
        exists: true,
        data: () => d.data(),
        ref: new WebDocRef(this.colName, d.id),
      })),
    };
  }
}

export class WebCollectionRef extends WebQuery {
  constructor(name: string) {
    super(name, []);
  }

  doc(id?: string): WebDocRef {
    return new WebDocRef(this.colName, id);
  }

  async add(data: any): Promise<WebDocRef> {
    const sanitized = sanitizeUndefined(data);
    const colRef = collection(webDb, this.colName);
    const res = await addDoc(colRef, sanitized);
    return new WebDocRef(this.colName, res.id);
  }
}

function sanitizeUndefined(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== "object") return obj;
  if (obj instanceof Date) return obj.toISOString();
  if (Array.isArray(obj)) return obj.map(sanitizeUndefined);
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      out[k] = sanitizeUndefined(v);
    }
  }
  return out;
}

function resolveNativeDocRef(target: any): DocumentReference {
  if (!target) throw new Error("Null or undefined target provided to transaction");
  if (target instanceof WebDocRef) return target.ref;
  if (target.ref instanceof WebDocRef) return target.ref.ref;
  if (target.ref && typeof target.ref === "object" && "id" in target.ref) return target.ref;
  if (target && typeof target === "object" && "id" in target && "path" in target) return target;
  throw new Error(`Unable to resolve DocumentReference from target: ${typeof target}`);
}

export class WebFirestoreAdapter {
  collection(name: string): WebCollectionRef {
    return new WebCollectionRef(name);
  }

  async runTransaction<T>(updateFunction: (tx: any) => Promise<T>): Promise<T> {
    return await runTransaction(webDb, async (nativeTx) => {
      const txProxy = {
        get: async (target: any) => {
          if (target instanceof WebDocRef) {
            const snap = await nativeTx.get(target.ref);
            return {
              id: snap.id,
              exists: snap.exists(),
              data: () => snap.data(),
              ref: target,
            };
          }
          if (target && target.ref instanceof WebDocRef) {
            const snap = await nativeTx.get(target.ref.ref);
            return {
              id: snap.id,
              exists: snap.exists(),
              data: () => snap.data(),
              ref: target.ref,
            };
          }
          if (target && typeof target.get === "function") {
            return await target.get();
          }
          const nativeRef = resolveNativeDocRef(target);
          const snap = await nativeTx.get(nativeRef);
          return {
            id: snap.id,
            exists: snap.exists(),
            data: () => snap.data(),
            ref: new WebDocRef(nativeRef.parent.id, snap.id),
          };
        },
        set: (target: any, data: any, options?: { merge?: boolean }) => {
          const nativeRef = resolveNativeDocRef(target);
          const sanitized = sanitizeUndefined(data);
          if (options?.merge) {
            nativeTx.set(nativeRef, sanitized, { merge: true });
          } else {
            nativeTx.set(nativeRef, sanitized);
          }
        },
        update: (target: any, data: any) => {
          const nativeRef = resolveNativeDocRef(target);
          const sanitized = sanitizeUndefined(data);
          nativeTx.update(nativeRef, sanitized);
        },
        delete: (target: any) => {
          const nativeRef = resolveNativeDocRef(target);
          nativeTx.delete(nativeRef);
        },
      };
      return await updateFunction(txProxy);
    });
  }

  batch() {
    const b = writeBatch(webDb);
    return {
      set: (target: any, data: any, options?: { merge?: boolean }) => {
        const nativeRef = resolveNativeDocRef(target);
        const sanitized = sanitizeUndefined(data);
        if (options?.merge) {
          b.set(nativeRef, sanitized, { merge: true });
        } else {
          b.set(nativeRef, sanitized);
        }
        return this;
      },
      update: (target: any, data: any) => {
        const nativeRef = resolveNativeDocRef(target);
        const sanitized = sanitizeUndefined(data);
        b.update(nativeRef, sanitized);
        return this;
      },
      delete: (target: any) => {
        const nativeRef = resolveNativeDocRef(target);
        b.delete(nativeRef);
        return this;
      },
      commit: async () => {
        await b.commit();
      },
    };
  }
}

const _webDbAdapter = new WebFirestoreAdapter();

/**
 * Authoritative Server Database instance.
 */
export function serverDb(): WebFirestoreAdapter {
  return _webDbAdapter;
}

export function serverAuth(): any {
  return {
    verifyIdToken: async (idToken: string) => {
      const apiKey = firebaseConfigData?.apiKey || process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
      if (!apiKey) {
        throw new Error("Missing Firebase API key for ID token verification");
      }
      const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        },
      );
      if (!res.ok) {
        throw new Error(`Token verification failed: ${res.status}`);
      }
      const data = await res.json();
      const user = data.users?.[0];
      if (!user) {
        throw new Error("No user profile associated with provided token");
      }
      return {
        uid: user.localId,
        email: user.email,
        email_verified: user.emailVerified ?? false,
      };
    },
  };
}

/** Collection names (single authoritative naming for the booking domain). */
export const COL = {
  roomTypes: "room_types",
  physicalRooms: "physical_rooms",
  ratePlans: "rate_plans",
  rateRules: "rate_rules",
  inventoryBlocks: "inventory_blocks",
  reservations: "reservations",
  holds: "booking_holds",
  promos: "promotions",
  addons: "addons",
  guests: "guests",
  payments: "payments",
  refunds: "refunds",
  auditLogs: "audit_logs",
  idempotency: "idempotency_keys",
  inventoryLocks: "inventory_locks",
  siteSettings: "site_settings",
} as const;
