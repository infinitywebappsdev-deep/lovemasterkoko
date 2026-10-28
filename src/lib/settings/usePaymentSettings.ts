"use client";

import { useEffect, useState, useCallback } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  DEFAULT_PAYMENT_SETTINGS,
  DEFAULT_THERMAL_SETTINGS,
  type PaymentSettings,
  type ThermalPrinterSettings,
} from "./types";

const LOCAL_STORAGE_THERMAL_KEY = "banky_thermal_printer_settings";

export function usePaymentSettings() {
  const [settings, setSettings] = useState<PaymentSettings>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(LOCAL_STORAGE_THERMAL_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          return {
            ...DEFAULT_PAYMENT_SETTINGS,
            thermalPrinter: {
              ...DEFAULT_THERMAL_SETTINGS,
              ...parsed,
            },
          };
        }
      } catch {}
    }
    return DEFAULT_PAYMENT_SETTINGS;
  });
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncToLocalCache = (thermal?: ThermalPrinterSettings) => {
    if (typeof window !== "undefined" && thermal) {
      try {
        localStorage.setItem(LOCAL_STORAGE_THERMAL_KEY, JSON.stringify(thermal));
      } catch {}
    }
  };

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    try {
      const docRef = doc(db, "site_settings", "payment");
      unsubscribe = onSnapshot(
        docRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            const mergedThermal: ThermalPrinterSettings = {
              ...DEFAULT_THERMAL_SETTINGS,
              ...(data.thermalPrinter || {}),
              autoPrintOnConfirmation:
                data.thermalPrinter?.autoPrintOnConfirmation !== undefined
                  ? Boolean(data.thermalPrinter.autoPrintOnConfirmation)
                  : true,
            };
            syncToLocalCache(mergedThermal);

            setSettings({
              ...DEFAULT_PAYMENT_SETTINGS,
              ...data,
              bankDetails: {
                ...DEFAULT_PAYMENT_SETTINGS.bankDetails,
                ...(data.bankDetails || {}),
              },
              thermalPrinter: mergedThermal,
              paystackEnabled: data.paystackEnabled !== false,
              bankTransferEnabled: data.bankTransferEnabled !== false,
              frontDeskEnabled: data.frontDeskEnabled !== false,
            } as PaymentSettings);
          } else {
            setSettings(DEFAULT_PAYMENT_SETTINGS);
          }
          setLoading(false);
        },
        (err) => {
          console.warn("Firestore listener on site_settings/payment failed, falling back to API:", err);
          // Fallback to fetch from /api/settings/payment
          fetch("/api/settings/payment")
            .then((r) => r.json())
            .then((res) => {
              if (res.ok && res.data) {
                syncToLocalCache(res.data.thermalPrinter);
                setSettings(res.data);
              }
            })
            .catch(() => {})
            .finally(() => setLoading(false));
        }
      );
    } catch (err) {
      console.warn("Could not attach onSnapshot, falling back to API fetch:", err);
      fetch("/api/settings/payment")
        .then((r) => r.json())
        .then((res) => {
          if (res.ok && res.data) {
            syncToLocalCache(res.data.thermalPrinter);
            setSettings(res.data);
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const updateSettings = useCallback(
    async (partial: Partial<PaymentSettings>): Promise<boolean> => {
      setIsUpdating(true);
      setError(null);
      try {
        if (partial.thermalPrinter) {
          syncToLocalCache({
            ...(settings.thermalPrinter || DEFAULT_THERMAL_SETTINGS),
            ...partial.thermalPrinter,
          });
        }
        // Payment settings are writable by staff only — attach the Firebase ID token.
        const { adminFetch } = await import("@/lib/admin-auth");
        const res = await adminFetch("/api/settings/payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(partial),
        });
        const json = await res.json();
        if (!json.ok) {
          throw new Error(json.message || "Failed to update payment settings");
        }
        setSettings(json.data);
        syncToLocalCache(json.data.thermalPrinter);
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error saving payment settings";
        setError(msg);
        return false;
      } finally {
        setIsUpdating(false);
      }
    },
    [settings.thermalPrinter]
  );

  const togglePaystack = useCallback(
    async (targetState?: boolean): Promise<boolean> => {
      const nextState = typeof targetState === "boolean" ? targetState : !settings.paystackEnabled;
      return updateSettings({ paystackEnabled: nextState });
    },
    [settings.paystackEnabled, updateSettings]
  );

  const updateThermalSettings = useCallback(
    async (partialThermal: Partial<ThermalPrinterSettings>): Promise<boolean> => {
      const currentThermal = settings.thermalPrinter || DEFAULT_THERMAL_SETTINGS;
      const nextThermal: ThermalPrinterSettings = {
        ...currentThermal,
        ...partialThermal,
      };
      // Optimistic update locally
      setSettings((prev) => ({
        ...prev,
        thermalPrinter: nextThermal,
      }));
      syncToLocalCache(nextThermal);
      return updateSettings({ thermalPrinter: nextThermal });
    },
    [settings.thermalPrinter, updateSettings]
  );

  const toggleAutoPrintThermal = useCallback(
    async (targetState?: boolean): Promise<boolean> => {
      const current = settings.thermalPrinter?.autoPrintOnConfirmation ?? true;
      const next = typeof targetState === "boolean" ? targetState : !current;
      return updateThermalSettings({ autoPrintOnConfirmation: next });
    },
    [settings.thermalPrinter, updateThermalSettings]
  );

  return {
    settings,
    paystackEnabled: settings.paystackEnabled,
    thermalSettings: settings.thermalPrinter || DEFAULT_THERMAL_SETTINGS,
    loading,
    isUpdating,
    error,
    togglePaystack,
    updateSettings,
    updateThermalSettings,
    toggleAutoPrintThermal,
  };
}
