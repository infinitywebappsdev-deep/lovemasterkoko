"use client";

import { useState, useEffect } from "react";
import {
  X,
  CheckCircle2,
  Clock,
  Utensils,
  Bike,
  Sparkles,
  PhoneCall,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  ShoppingBag,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { QrOrder, OrderStatus } from "@/lib/qr-menu/types";
import { subscribeOrderById, formatNaira } from "@/lib/qr-menu/store";

interface LiveOrderTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeOrder: QrOrder | null;
  ordersHistory: QrOrder[];
  onSelectOrder: (order: QrOrder) => void;
}

const ORDER_STEPS: {
  status: OrderStatus;
  title: string;
  desc: string;
  stepIndex: number;
}[] = [
  { status: "pending", title: "Order Received", desc: "Sent directly to Banky Hotel Kitchen ticket display", stepIndex: 1 },
  { status: "in_progress", title: "Kitchen Preparing", desc: "Executive chefs are cooking & plating your meal fresh", stepIndex: 2 },
  { status: "fulfilled", title: "Served & Delivered", desc: "Delivered to your room or table. Bon appétit!", stepIndex: 3 },
];

export function LiveOrderTrackerModal({
  isOpen,
  onClose,
  activeOrder,
  ordersHistory,
  onSelectOrder,
}: LiveOrderTrackerModalProps) {
  const [currentOrder, setCurrentOrder] = useState<QrOrder | null>(activeOrder);

  useEffect(() => {
    setCurrentOrder(activeOrder);
  }, [activeOrder]);

  // Subscribe to real-time updates for the current order
  useEffect(() => {
    if (!isOpen || !currentOrder?.id) return;
    const unsub = subscribeOrderById(currentOrder.id, (updated) => {
      if (updated) {
        setCurrentOrder(updated);
      }
    });
    return () => unsub();
  }, [isOpen, currentOrder?.id]);

  if (!isOpen) return null;

  const getStepProgress = (status: OrderStatus) => {
    if (status === "cancelled") return 0;
    if (status === "fulfilled") return 3;
    if (status === "in_progress") return 2;
    return 1; // pending
  };

  const currentStep = currentOrder ? getStepProgress(currentOrder.status) : 1;

  const getWhatsAppLink = (order: QrOrder) => {
    const hotelNumber = "2348037166121";
    const itemsList = order.items
      .map((i) => `• ${i.quantity}x ${i.title} (${formatNaira(i.subtotal)})`)
      .join("%0A");
    const msg = `*ORDER STATUS INQUIRY - BANKY HOTEL*%0A%0A*Order #:* ${order.orderNumber}%0A*Location:* ${order.roomOrTable}%0A*Status:* ${order.status.toUpperCase()}%0A*Items:*%0A${itemsList}%0A*Total:* ${formatNaira(order.totalAmount)}%0A%0A_In-Room QR Order Tracker_`;
    return `https://wa.me/${hotelNumber}?text=${msg}`;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
        <div className="fixed inset-0" onClick={onClose} />

        <motion.div
          initial={{ scale: 0.93, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.93, opacity: 0, y: 15 }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
          className="relative z-10 bg-[#161513] border border-stone-800 rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 border-b border-stone-800 flex items-center justify-between bg-stone-900/40">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#aa8453]/20 text-[#c89e63]">
                <Clock className="h-4 w-4" />
              </span>
              <div>
                <h3 className="font-display text-base font-medium text-white">
                  Live Kitchen & Order Tracker
                </h3>
                <p className="text-[11px] text-stone-400">
                  Real-time status synced with in-house chefs
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-white rounded-full bg-stone-900"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Orders History Tab if more than 1 order placed in this session */}
          {ordersHistory.length > 1 && (
            <div className="px-4 py-2 bg-stone-950 border-b border-stone-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar">
              <span className="text-[10px] text-stone-500 uppercase tracking-wider flex-shrink-0 font-mono">
                Your Orders:
              </span>
              {ordersHistory.map((ord) => {
                const isSelected = currentOrder?.id === ord.id;
                return (
                  <button
                    key={ord.id}
                    onClick={() => {
                      setCurrentOrder(ord);
                      onSelectOrder(ord);
                    }}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-mono flex-shrink-0 transition-all ${
                      isSelected
                        ? "bg-[#aa8453] text-white font-semibold"
                        : "bg-stone-900 text-stone-400 border border-stone-800"
                    }`}
                  >
                    {ord.orderNumber.split("-").slice(-1)[0]} • {ord.status}
                  </button>
                );
              })}
            </div>
          )}

          {currentOrder ? (
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Order identifier card */}
              <div className="bg-gradient-to-r from-stone-900 via-[#1c1a17] to-stone-900 border border-stone-800 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-widest text-[#c89e63] bg-[#aa8453]/20 px-2 py-0.5 rounded">
                    Order Ref
                  </span>
                  <h4 className="font-mono text-base font-bold text-white mt-1">
                    {currentOrder.orderNumber}
                  </h4>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Destination: <strong className="text-white">{currentOrder.roomOrTable}</strong>
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs font-medium text-stone-400 block">Total</span>
                  <span className="font-display text-lg font-bold text-[#c89e63]">
                    {formatNaira(currentOrder.totalAmount)}
                  </span>
                </div>
              </div>

              {/* Real-time Progress Stepper (infused from FoodApp / FoodScan) */}
              <div className="bg-stone-900/50 border border-stone-800 rounded-2xl p-4">
                <div className="space-y-4">
                  {/* Step 1: Placed */}
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                          currentStep >= 1
                            ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30"
                            : "bg-stone-800 text-stone-500"
                        }`}
                      >
                        {currentStep > 1 ? <CheckCircle2 className="h-4 w-4" /> : "1"}
                      </div>
                      <div className={`w-0.5 h-8 my-1 ${currentStep > 1 ? "bg-emerald-500" : "bg-stone-800"}`} />
                    </div>
                    <div className="pt-0.5">
                      <h5 className={`text-xs font-semibold ${currentStep >= 1 ? "text-white" : "text-stone-500"}`}>
                        Order Received & Queued
                      </h5>
                      <p className="text-[11px] text-stone-400">
                        Kitchen received order ticket • Checked by chef
                      </p>
                    </div>
                  </div>

                  {/* Step 2: Preparing */}
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                          currentStep >= 2
                            ? "bg-amber-500 text-white shadow-md shadow-amber-500/30"
                            : "bg-stone-800 text-stone-500"
                        }`}
                      >
                        {currentStep > 2 ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : currentStep === 2 ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          "2"
                        )}
                      </div>
                      <div className={`w-0.5 h-8 my-1 ${currentStep > 2 ? "bg-emerald-500" : "bg-stone-800"}`} />
                    </div>
                    <div className="pt-0.5">
                      <h5 className={`text-xs font-semibold ${currentStep >= 2 ? "text-white" : "text-stone-500"}`}>
                        Cooking & Plating in Progress
                      </h5>
                      <p className="text-[11px] text-stone-400">
                        Fresh preparation in Banky Hotel executive kitchen
                      </p>
                    </div>
                  </div>

                  {/* Step 3: Served */}
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                          currentStep >= 3
                            ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30"
                            : "bg-stone-800 text-stone-500"
                        }`}
                      >
                        {currentStep >= 3 ? <CheckCircle2 className="h-4 w-4" /> : "3"}
                      </div>
                    </div>
                    <div className="pt-0.5">
                      <h5 className={`text-xs font-semibold ${currentStep >= 3 ? "text-white" : "text-stone-500"}`}>
                        Plated & Served
                      </h5>
                      <p className="text-[11px] text-stone-400">
                        Delivered to {currentOrder.roomOrTable}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Itemized Order Summary */}
              <div className="bg-stone-900/40 border border-stone-800/80 rounded-2xl p-4">
                <h5 className="text-xs font-semibold text-stone-300 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                  <span>Ordered Dishes ({currentOrder.totalItems})</span>
                  <span className="text-stone-500 font-normal normal-case text-[11px]">
                    {new Date(currentOrder.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </h5>

                <div className="space-y-2">
                  {currentOrder.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-start justify-between text-xs py-1 border-b border-stone-800/40 last:border-none"
                    >
                      <div className="flex items-start gap-2">
                        <span className="font-mono text-[#c89e63] font-semibold">
                          {item.quantity}x
                        </span>
                        <div>
                          <span className="text-stone-200 font-medium">{item.title}</span>
                          {item.notes && (
                            <p className="text-[10px] text-stone-400 italic mt-0.5">
                              Note: {item.notes}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="font-mono text-white font-semibold">
                        {formatNaira(item.subtotal)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact actions */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <a
                  href={getWhatsAppLink(currentOrder)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-10 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 shadow transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>WhatsApp Staff</span>
                </a>

                <a
                  href="tel:08037166121"
                  className="h-10 px-3 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  <PhoneCall className="h-3.5 w-3.5 text-[#c89e63]" />
                  <span>Call Kitchen</span>
                </a>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-stone-400 text-xs">
              <ShoppingBag className="h-10 w-10 text-stone-600 mx-auto mb-2" />
              <p>No active orders placed in this session.</p>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
