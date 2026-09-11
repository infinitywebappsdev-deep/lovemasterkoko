"use client";

import { useState } from "react";
import {
  X,
  BellRing,
  Receipt,
  Droplet,
  Utensils,
  Sparkles,
  CheckCircle2,
  Send,
  PhoneCall,
  ExternalLink,
  MessageCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { submitServiceRequest } from "@/lib/qr-menu/store";
import { ServiceRequestType } from "@/lib/qr-menu/types";

interface ServiceRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomOrTable: string;
  orderType: "room" | "table" | "poolside_garden";
}

const SERVICE_OPTIONS: {
  id: ServiceRequestType;
  title: string;
  desc: string;
  icon: typeof Droplet;
}[] = [
  { id: "water", title: "Bring Cold Water", desc: "Chilled bottled drinking water & glasses", icon: Droplet },
  { id: "cutlery", title: "Extra Cutlery / Napkins", desc: "Fresh forks, spoons, napkins, serviettes", icon: Utensils },
  { id: "clean", title: "Clean / Clear Table", desc: "Clear used plates or wipe table surface", icon: Sparkles },
  { id: "ice", title: "Extra Ice Cubes", desc: "Bucket of ice for drinks", icon: Droplet },
  { id: "bill", title: "Request Bill / Payment", desc: "Pay with Cash, POS Card Terminal, or Paystack", icon: Receipt },
  { id: "waiter", title: "Call Staff in Person", desc: "Waiter / Concierge to come assist directly", icon: BellRing },
];

export function ServiceRequestModal({
  isOpen,
  onClose,
  roomOrTable,
  orderType,
}: ServiceRequestModalProps) {
  const [selectedType, setSelectedType] = useState<ServiceRequestType>("waiter");
  const [paymentMethod, setPaymentMethod] = useState<string>("POS Card Machine");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const currentOption = SERVICE_OPTIONS.find((s) => s.id === selectedType) || SERVICE_OPTIONS[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await submitServiceRequest({
        roomOrTable: roomOrTable || (orderType === "table" ? "Table 1" : "Room Service"),
        orderType,
        type: selectedType,
        title: currentOption.title,
        notes: notes.trim() || undefined,
        paymentMethod: selectedType === "bill" ? paymentMethod : undefined,
      });

      setSubmitted(true);
    } catch (err) {
      console.error("Service request error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getWhatsAppAlertUrl = () => {
    const hotelPhone = "2348037166121";
    const loc = roomOrTable || (orderType === "table" ? "Table 1" : "Room Service");
    const msg = `*GUEST SERVICE REQUEST - BANKY HOTEL*%0A%0A*Request:* ${currentOption.title}%0A*Location:* ${loc} (${orderType})%0A${selectedType === "bill" ? `*Payment Method:* ${paymentMethod}%0A` : ""}${notes ? `*Guest Note:* ${notes}%0A` : ""}%0A_Sent via In-Room QR Portal_`;
    return `https://wa.me/${hotelPhone}?text=${msg}`;
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
          className="relative z-10 bg-[#171614] border border-stone-800 rounded-3xl max-w-md w-full p-5 text-left shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-stone-800">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#aa8453]/20 text-[#c89e63]">
                <BellRing className="h-4 w-4" />
              </span>
              <div>
                <h3 className="font-display text-base font-medium text-white">
                  Hospitality Service Request
                </h3>
                <p className="text-[11px] text-stone-400">
                  Location: <span className="text-[#c89e63] font-semibold">{roomOrTable || "Table / Room"}</span>
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

          {!submitted ? (
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {/* Option Selector Buttons */}
              <div className="grid grid-cols-2 gap-2">
                {SERVICE_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = selectedType === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedType(opt.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? "bg-[#aa8453]/20 border-[#aa8453] text-white shadow-sm"
                          : "bg-stone-900/70 border-stone-800/90 text-stone-300 hover:border-stone-700"
                      }`}
                    >
                      <Icon className={`h-4 w-4 mb-1.5 ${isSelected ? "text-[#c89e63]" : "text-stone-400"}`} />
                      <div className="text-xs font-semibold leading-tight">{opt.title}</div>
                      <div className="text-[10px] text-stone-400 mt-0.5 line-clamp-1">{opt.desc}</div>
                    </button>
                  );
                })}
              </div>

              {/* Specific Payment Method selection if "Request Bill" is picked */}
              {selectedType === "bill" && (
                <div className="bg-stone-900/90 border border-stone-800 p-3 rounded-xl">
                  <label className="text-xs font-medium text-stone-300 block mb-2">
                    How would you like to settle your bill?
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    {[
                      "POS Card Machine",
                      "Cash at Table / Room",
                      "Paystack Online",
                      "Post to Room Folio",
                    ].map((pm) => (
                      <button
                        key={pm}
                        type="button"
                        onClick={() => setPaymentMethod(pm)}
                        className={`p-2 rounded-lg border text-left text-[11px] font-medium transition-all ${
                          paymentMethod === pm
                            ? "bg-[#aa8453] text-white border-[#aa8453]"
                            : "bg-stone-950 text-stone-400 border-stone-800 hover:text-white"
                        }`}
                      >
                        {pm}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Optional Note */}
              <div>
                <label className="text-xs font-medium text-stone-400 block mb-1">
                  Additional Note for Staff (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Please bring 4 glasses, or urgently needed..."
                  className="w-full h-9 px-3 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-[#aa8453]"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 h-11 bg-[#aa8453] hover:bg-[#967344] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-[#aa8453]/20 active:scale-[0.98] transition-all"
                >
                  <Send className="h-4 w-4" />
                  <span>{isSubmitting ? "Notifying Staff…" : "Send Service Request"}</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-4 text-center py-4 space-y-3">
              <div className="h-12 w-12 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h4 className="font-display text-lg text-white font-medium">
                Request Dispatched!
              </h4>
              <p className="text-xs text-stone-300 max-w-xs mx-auto">
                Our floor manager and waiters for <strong>{roomOrTable || "your location"}</strong> have been notified.
              </p>

              <div className="pt-2 space-y-2">
                <a
                  href={getWhatsAppAlertUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-10 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>Instant WhatsApp Ping to Concierge</span>
                </a>

                <button
                  onClick={() => {
                    setSubmitted(false);
                    onClose();
                  }}
                  className="w-full h-9 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-medium transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
