"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import QRCode from "qrcode";
import jsPDF from "jspdf";
import {
  Printer,
  FileDown,
  CheckSquare,
  Square,
  Search,
  Filter,
  Sliders,
  BedDouble,
  UtensilsCrossed,
  Tag,
  Wifi,
  Sparkles,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCircle2,
  AlertCircle,
  Scissors,
  Layers,
  Palette,
  ExternalLink,
  Plus,
  Trash2,
} from "lucide-react";

export interface BatchLocationItem {
  id: string;
  name: string;
  type: "room" | "table";
  category?: string;
}

const DEFAULT_BATCH_ROOMS: BatchLocationItem[] = [
  // Floor 1 Rooms
  { id: "room_101", name: "Room 101", type: "room", category: "Floor 1" },
  { id: "room_102", name: "Room 102", type: "room", category: "Floor 1" },
  { id: "room_103", name: "Room 103", type: "room", category: "Floor 1" },
  { id: "room_104", name: "Room 104", type: "room", category: "Floor 1" },
  { id: "room_105", name: "Room 105", type: "room", category: "Floor 1" },
  // Floor 2 Rooms
  { id: "room_201", name: "Room 201", type: "room", category: "Floor 2" },
  { id: "room_202", name: "Room 202", type: "room", category: "Floor 2" },
  { id: "room_203", name: "Room 203", type: "room", category: "Floor 2" },
  { id: "room_204", name: "Room 204", type: "room", category: "Floor 2" },
  { id: "room_205", name: "Room 205", type: "room", category: "Floor 2" },
  { id: "room_206", name: "Room 206", type: "room", category: "Floor 2" },
  { id: "room_207", name: "Room 207", type: "room", category: "Floor 2" },
  // Suites & Penthouses
  { id: "room_301", name: "Executive Suite 301", type: "room", category: "Suites" },
  { id: "room_302", name: "Presidential Suite 302", type: "room", category: "Suites" },
  { id: "room_401", name: "Penthouse Suite 401", type: "room", category: "Suites" },
  { id: "room_501", name: "Luxury Suite 501", type: "room", category: "Suites" },
  { id: "room_std_plus", name: "Standard Plus 108", type: "room", category: "Suites" },
  { id: "room_studio", name: "Studio Suite 109", type: "room", category: "Suites" },
];

const DEFAULT_BATCH_TABLES: BatchLocationItem[] = [
  // Dining Hall Tables
  { id: "table_1", name: "Table 1", type: "table", category: "Main Dining" },
  { id: "table_2", name: "Table 2", type: "table", category: "Main Dining" },
  { id: "table_3", name: "Table 3", type: "table", category: "Main Dining" },
  { id: "table_4", name: "Table 4", type: "table", category: "Main Dining" },
  { id: "table_5", name: "Table 5", type: "table", category: "Main Dining" },
  { id: "table_6", name: "Table 6", type: "table", category: "Main Dining" },
  { id: "table_7", name: "Table 7", type: "table", category: "Main Dining" },
  { id: "table_8", name: "Table 8", type: "table", category: "Main Dining" },
  { id: "table_9", name: "Table 9", type: "table", category: "Main Dining" },
  { id: "table_10", name: "Table 10", type: "table", category: "Main Dining" },
  // Bar, Terrace & Lounges
  { id: "table_poolside_1", name: "Poolside Bar - Cabana 1", type: "table", category: "Outdoor & Bar" },
  { id: "table_poolside_2", name: "Poolside Bar - Cabana 2", type: "table", category: "Outdoor & Bar" },
  { id: "table_terrace_a", name: "Garden Terrace - Table A", type: "table", category: "Outdoor & Bar" },
  { id: "table_terrace_b", name: "Garden Terrace - Table B", type: "table", category: "Outdoor & Bar" },
  { id: "table_vip_1", name: "VIP Lounge - Booth 1", type: "table", category: "VIP Lounge" },
  { id: "table_vip_2", name: "VIP Lounge - Booth 2", type: "table", category: "VIP Lounge" },
  { id: "table_exec_bar", name: "Executive Bar Counter", type: "table", category: "VIP Lounge" },
];

interface BatchQrPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  venueLogoUrl?: string;
  venueName?: string;
  venueSubtitle?: string;
}

export function BatchQrPrintModal({
  isOpen,
  onClose,
  venueLogoUrl = "/images/Banky Hotel & Suites Main Logo 1.png",
  venueName = "BANKY HOTEL & SUITES",
  venueSubtitle = "In-Room Dining & Bar Menu",
}: BatchQrPrintModalProps) {
  // All locations (rooms + tables + custom)
  const [locations, setLocations] = useState<BatchLocationItem[]>([
    ...DEFAULT_BATCH_ROOMS,
    ...DEFAULT_BATCH_TABLES,
  ]);

  // Selected Location IDs
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(["room_101", "room_102", "room_201", "room_204", "table_1", "table_2", "table_poolside_1"])
  );

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "room" | "table">("all");

  // Custom location input
  const [customLocationName, setCustomLocationName] = useState("");
  const [customLocationType, setCustomLocationType] = useState<"room" | "table">("room");

  // Stand styling & layout options
  const [layoutMode, setLayoutMode] = useState<"1_per_page" | "2_per_page" | "4_per_page">("2_per_page");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [themeStyle, setThemeStyle] = useState<"dark_luxury" | "eco_white">("dark_luxury");
  const [includeWifi, setIncludeWifi] = useState(true);
  const [wifiDetails, setWifiDetails] = useState("Wi-Fi: Banky Guest | Pass: banky2025");
  const [customFooterTag, setCustomFooterTag] = useState("24/7 Room Service");

  // Preview Carousel State
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewQrDataUrl, setPreviewQrDataUrl] = useState<string>("");

  // Export State
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<{ current: number; total: number } | null>(null);
  const [generationSuccess, setGenerationSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Base URL calculation for QR URLs
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://bankyhotel.com";

  // Filtered locations
  const filteredLocations = useMemo(() => {
    return locations.filter((loc) => {
      if (categoryFilter !== "all" && loc.type !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          loc.name.toLowerCase().includes(q) ||
          (loc.category || "").toLowerCase().includes(q) ||
          loc.type.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [locations, categoryFilter, searchQuery]);

  // Selected locations array
  const selectedList = useMemo(() => {
    return locations.filter((l) => selectedIds.has(l.id));
  }, [locations, selectedIds]);

  // Active preview location
  const currentPreviewLocation = useMemo(() => {
    if (selectedList.length === 0) return null;
    const safeIndex = Math.min(previewIndex, selectedList.length - 1);
    return selectedList[safeIndex] || selectedList[0];
  }, [selectedList, previewIndex]);

  // Generate QR for preview item
  useEffect(() => {
    if (!currentPreviewLocation) {
      setPreviewQrDataUrl("");
      return;
    }
    const params = new URLSearchParams();
    if (currentPreviewLocation.type === "table") {
      params.set("table", currentPreviewLocation.name);
    } else {
      params.set("room", currentPreviewLocation.name);
    }
    if (customFooterTag.trim()) {
      params.set("tag", customFooterTag.trim());
    }
    const fullUrl = `${baseUrl}/qr?${params.toString()}`;

    QRCode.toDataURL(fullUrl, {
      width: 320,
      margin: 1,
      color: {
        dark: themeStyle === "dark_luxury" ? "#191816" : "#191816",
        light: "#ffffff",
      },
      errorCorrectionLevel: "M",
    })
      .then((url) => setPreviewQrDataUrl(url))
      .catch(() => setPreviewQrDataUrl(""));
  }, [currentPreviewLocation, customFooterTag, baseUrl, themeStyle]);

  // Toggle selection for a single location
  const toggleLocation = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Quick selection handlers
  const handleSelectAll = () => {
    setSelectedIds(new Set(locations.map((l) => l.id)));
  };

  const handleSelectAllRooms = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      locations.filter((l) => l.type === "room").forEach((l) => next.add(l.id));
      return next;
    });
  };

  const handleSelectAllTables = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      locations.filter((l) => l.type === "table").forEach((l) => next.add(l.id));
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
    setPreviewIndex(0);
  };

  // Add custom location
  const handleAddCustomLocation = (e: React.FormEvent) => {
    e.preventDefault();
    const name = customLocationName.trim();
    if (!name) return;

    const newId = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newLoc: BatchLocationItem = {
      id: newId,
      name,
      type: customLocationType,
      category: "Custom",
    };

    setLocations((prev) => [newLoc, ...prev]);
    setSelectedIds((prev) => new Set(prev).add(newId));
    setCustomLocationName("");
  };

  // Helper to convert Image URL to Base64
  const getBase64ImageFromUrl = async (url: string): Promise<string> => {
    if (url.startsWith("data:")) return url;
    return new Promise((resolve) => {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth || img.width || 300;
          canvas.height = img.naturalHeight || img.height || 100;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve("");
            return;
          }
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/png"));
        } catch {
          resolve("");
        }
      };
      img.onerror = () => resolve("");
      img.src = url;
    });
  };

  // Core Batch PDF Generation Engine
  const handleGenerateBatchPdf = async () => {
    if (selectedList.length === 0) {
      alert("Please select at least one location to print QR stands.");
      return;
    }

    setIsGeneratingPdf(true);
    setGenerationSuccess(false);
    setErrorMessage("");
    setGenerationProgress({ current: 0, total: selectedList.length });

    try {
      // 1. Resolve venue logo base64
      let logoBase64 = "";
      try {
        logoBase64 = await getBase64ImageFromUrl(venueLogoUrl);
      } catch {
        logoBase64 = "";
      }

      // 2. Initialize jsPDF
      // Standard A4 dimensions: 210mm x 297mm (portrait)
      const isLandscape = orientation === "landscape";
      const doc = new jsPDF({
        orientation: isLandscape ? "landscape" : "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = isLandscape ? 297 : 210;
      const pageHeight = isLandscape ? 210 : 297;

      // Color Palette based on theme
      const isDark = themeStyle === "dark_luxury";
      const bgR = isDark ? 25 : 255;
      const bgG = isDark ? 24 : 255;
      const bgB = isDark ? 22 : 255;

      const cardBgR = isDark ? 32 : 248;
      const cardBgG = isDark ? 30 : 246;
      const cardBgB = isDark ? 28 : 242;

      const goldR = 255;
      const goldG = 191;
      const goldB = 0;

      const textPrimaryR = isDark ? 255 : 20;
      const textPrimaryG = isDark ? 255 : 20;
      const textPrimaryB = isDark ? 255 : 20;

      const textMutedR = isDark ? 180 : 100;
      const textMutedG = isDark ? 175 : 100;
      const textMutedB = isDark ? 170 : 100;

      // Draw single stand helper
      const drawStand = async (
        x: number,
        y: number,
        w: number,
        h: number,
        location: BatchLocationItem
      ) => {
        // Build QR target URL
        const params = new URLSearchParams();
        if (location.type === "table") {
          params.set("table", location.name);
        } else {
          params.set("room", location.name);
        }
        if (customFooterTag.trim()) {
          params.set("tag", customFooterTag.trim());
        }
        const fullUrl = `${baseUrl}/qr?${params.toString()}`;

        // Generate QR code data URL
        const qrDataUrl = await QRCode.toDataURL(fullUrl, {
          width: 500,
          margin: 1,
          color: {
            dark: "#191816",
            light: "#ffffff",
          },
          errorCorrectionLevel: "H",
        });

        // 1. Draw Stand Background Card
        doc.setFillColor(cardBgR, cardBgG, cardBgB);
        doc.roundedRect(x, y, w, h, 6, 6, "F");

        // 2. Draw Luxury Double Border
        doc.setDrawColor(goldR, goldG, goldB);
        doc.setLineWidth(0.8);
        doc.roundedRect(x + 2, y + 2, w - 4, h - 4, 5, 5, "S");

        doc.setDrawColor(isDark ? 80 : 220, isDark ? 75 : 210, isDark ? 70 : 200);
        doc.setLineWidth(0.3);
        doc.roundedRect(x + 3.5, y + 3.5, w - 7, h - 7, 4, 4, "S");

        // 3. Gold Corner Accents (Decorative luxury hotel flourishes)
        doc.setDrawColor(goldR, goldG, goldB);
        doc.setLineWidth(1.2);
        // Top-left
        doc.line(x + 5, y + 5, x + 15, y + 5);
        doc.line(x + 5, y + 5, x + 5, y + 15);
        // Top-right
        doc.line(x + w - 15, y + 5, x + w - 5, y + 5);
        doc.line(x + w - 5, y + 5, x + w - 5, y + 15);
        // Bottom-left
        doc.line(x + 5, y + h - 5, x + 15, y + h - 5);
        doc.line(x + 5, y + h - 5, x + 5, y + h - 15);
        // Bottom-right
        doc.line(x + w - 15, y + h - 5, x + w - 5, y + h - 5);
        doc.line(x + w - 5, y + h - 5, x + w - 5, y + h - 15);

        const centerX = x + w / 2;
        let cursorY = y + 10;

        // 4. Logo (if available)
        if (logoBase64) {
          try {
            const logoW = Math.min(w * 0.35, 38);
            const logoH = 14;
            doc.addImage(logoBase64, "PNG", centerX - logoW / 2, cursorY, logoW, logoH);
            cursorY += logoH + 3;
          } catch {
            cursorY += 2;
          }
        } else {
          cursorY += 4;
        }

        // 5. Venue Name & Subtitle
        doc.setFont("helvetica", "bold");
        doc.setFontSize(w > 120 ? 15 : 12);
        doc.setTextColor(textPrimaryR, textPrimaryG, textPrimaryB);
        doc.text((venueName || "BANKY HOTEL & SUITES").toUpperCase(), centerX, cursorY, {
          align: "center",
        });
        cursorY += 4.5;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(w > 120 ? 8.5 : 7);
        doc.setTextColor(goldR, goldG, goldB);
        doc.text(
          (venueSubtitle || "In-Room Dining & Bar Menu").toUpperCase(),
          centerX,
          cursorY,
          { align: "center" }
        );
        cursorY += 6;

        // Gold divider line
        doc.setDrawColor(goldR, goldG, goldB);
        doc.setLineWidth(0.4);
        doc.line(centerX - 25, cursorY, centerX + 25, cursorY);
        cursorY += 5;

        // 6. Highlighted Location Badge
        const badgeText = `${location.type === "table" ? "DINE-IN" : "GUEST ROOM"}: ${location.name.toUpperCase()}`;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(w > 120 ? 11 : 9.5);
        const textWidth = doc.getTextWidth(badgeText);
        const badgeW = textWidth + 14;
        const badgeH = 7.5;

        // Badge pill background
        doc.setFillColor(isDark ? 55 : 245, isDark ? 45 : 235, isDark ? 20 : 200);
        doc.roundedRect(centerX - badgeW / 2, cursorY, badgeW, badgeH, 3.5, 3.5, "F");
        doc.setDrawColor(goldR, goldG, goldB);
        doc.setLineWidth(0.5);
        doc.roundedRect(centerX - badgeW / 2, cursorY, badgeW, badgeH, 3.5, 3.5, "S");

        doc.setTextColor(isDark ? 255 : 30, isDark ? 210 : 20, 0);
        doc.text(badgeText, centerX, cursorY + 5.2, { align: "center" });
        cursorY += badgeH + 6;

        // 7. QR Code Plate
        const qrSize = Math.min(w * 0.48, h * 0.38, 55);
        const qrContainerSize = qrSize + 6;

        // White card plate behind QR to guarantee 100% scanning accuracy
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(
          centerX - qrContainerSize / 2,
          cursorY,
          qrContainerSize,
          qrContainerSize,
          3,
          3,
          "F"
        );
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.3);
        doc.roundedRect(
          centerX - qrContainerSize / 2,
          cursorY,
          qrContainerSize,
          qrContainerSize,
          3,
          3,
          "S"
        );

        // Add QR Image
        doc.addImage(
          qrDataUrl,
          "PNG",
          centerX - qrSize / 2,
          cursorY + 3,
          qrSize,
          qrSize
        );
        cursorY += qrContainerSize + 5;

        // 8. Call to Action
        doc.setFont("helvetica", "bold");
        doc.setFontSize(w > 120 ? 9.5 : 8);
        doc.setTextColor(goldR, goldG, goldB);
        doc.text("SCAN WITH PHONE CAMERA TO ORDER", centerX, cursorY, {
          align: "center",
        });
        cursorY += 4;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(w > 120 ? 7.5 : 6.5);
        doc.setTextColor(textMutedR, textMutedG, textMutedB);
        doc.text(
          "Browse chef specials, food & drinks delivered directly to your door",
          centerX,
          cursorY,
          { align: "center" }
        );
        cursorY += 5;

        // 9. Custom Tag / Wi-Fi Details
        if (customFooterTag.trim() || (includeWifi && wifiDetails.trim())) {
          doc.setFillColor(isDark ? 20 : 240, isDark ? 18 : 238, isDark ? 16 : 235);
          const tagBoxW = Math.min(w - 24, 110);
          const tagBoxH = 6;
          doc.roundedRect(centerX - tagBoxW / 2, cursorY, tagBoxW, tagBoxH, 2, 2, "F");
          doc.setDrawColor(isDark ? 70 : 210, isDark ? 65 : 205, isDark ? 60 : 200);
          doc.setLineWidth(0.2);
          doc.roundedRect(centerX - tagBoxW / 2, cursorY, tagBoxW, tagBoxH, 2, 2, "S");

          doc.setFont("helvetica", "bold");
          doc.setFontSize(6.5);
          doc.setTextColor(goldR, goldG, goldB);

          const footerContent = [
            customFooterTag.trim(),
            includeWifi && wifiDetails.trim() ? wifiDetails.trim() : null,
          ]
            .filter(Boolean)
            .join("  •  ");

          doc.text(footerContent, centerX, cursorY + 4.2, { align: "center" });
        }

        // 10. Direct link text at bottom
        doc.setFont("courier", "normal");
        doc.setFontSize(5.5);
        doc.setTextColor(textMutedR, textMutedG, textMutedB);
        doc.text(fullUrl, centerX, y + h - 5, { align: "center" });
      };

      // ── Process Locations in Batch ──
      if (layoutMode === "1_per_page") {
        // 1 Stand per A4 page (centered large format)
        for (let i = 0; i < selectedList.length; i++) {
          if (i > 0) doc.addPage();
          setGenerationProgress({ current: i + 1, total: selectedList.length });

          // Fill page background
          doc.setFillColor(bgR, bgG, bgB);
          doc.rect(0, 0, pageWidth, pageHeight, "F");

          const margin = 18;
          const standW = pageWidth - margin * 2;
          const standH = pageHeight - margin * 2;

          await drawStand(margin, margin, standW, standH, selectedList[i]);
        }
      } else if (layoutMode === "2_per_page") {
        // 2 Stands per A4 sheet (Vertical split with cut lines)
        const standsPerPage = 2;
        const totalPages = Math.ceil(selectedList.length / standsPerPage);

        for (let p = 0; p < totalPages; p++) {
          if (p > 0) doc.addPage();

          // Fill page background
          doc.setFillColor(bgR, bgG, bgB);
          doc.rect(0, 0, pageWidth, pageHeight, "F");

          const marginX = 16;
          const marginY = 12;
          const availableH = pageHeight - marginY * 2;
          const standW = pageWidth - marginX * 2;
          const standH = (availableH - 10) / 2;

          const firstIndex = p * 2;
          const secondIndex = p * 2 + 1;

          // Stand 1 (Top)
          if (firstIndex < selectedList.length) {
            setGenerationProgress({ current: firstIndex + 1, total: selectedList.length });
            await drawStand(marginX, marginY, standW, standH, selectedList[firstIndex]);
          }

          // Cut Line in middle
          const cutY = marginY + standH + 5;
          doc.setDrawColor(goldR, goldG, goldB);
          doc.setLineWidth(0.3);
          doc.setLineDashPattern([2, 2], 0);
          doc.line(10, cutY, pageWidth - 10, cutY);
          doc.setLineDashPattern([], 0); // reset

          doc.setFont("helvetica", "normal");
          doc.setFontSize(7);
          doc.setTextColor(isDark ? 160 : 120, isDark ? 150 : 120, isDark ? 140 : 120);
          doc.text("✂ - - - - - - - - - - - CUT ALONG DOTTED LINE FOR TABLE TENT - - - - - - - - - - - ✂", pageWidth / 2, cutY - 1, { align: "center" });

          // Stand 2 (Bottom)
          if (secondIndex < selectedList.length) {
            setGenerationProgress({ current: secondIndex + 1, total: selectedList.length });
            await drawStand(marginX, cutY + 5, standW, standH, selectedList[secondIndex]);
          }
        }
      } else {
        // 4 Stands per A4 sheet (2x2 Grid)
        const standsPerPage = 4;
        const totalPages = Math.ceil(selectedList.length / standsPerPage);

        for (let p = 0; p < totalPages; p++) {
          if (p > 0) doc.addPage();

          doc.setFillColor(bgR, bgG, bgB);
          doc.rect(0, 0, pageWidth, pageHeight, "F");

          const marginX = 12;
          const marginY = 12;
          const standW = (pageWidth - marginX * 2 - 8) / 2;
          const standH = (pageHeight - marginY * 2 - 8) / 2;

          // Cross cut lines
          const midX = pageWidth / 2;
          const midY = pageHeight / 2;
          doc.setDrawColor(goldR, goldG, goldB);
          doc.setLineWidth(0.3);
          doc.setLineDashPattern([2, 2], 0);
          doc.line(midX, 6, midX, pageHeight - 6);
          doc.line(6, midY, pageWidth - 6, midY);
          doc.setLineDashPattern([], 0);

          for (let s = 0; s < 4; s++) {
            const itemIndex = p * 4 + s;
            if (itemIndex >= selectedList.length) break;

            setGenerationProgress({ current: itemIndex + 1, total: selectedList.length });
            const col = s % 2;
            const row = Math.floor(s / 2);
            const posX = marginX + col * (standW + 8);
            const posY = marginY + row * (standH + 8);

            await drawStand(posX, posY, standW, standH, selectedList[itemIndex]);
          }
        }
      }

      // 3. Save single compiled PDF
      const filename = `Banky_Hotel_QR_Stands_Batch_${selectedList.length}_locations.pdf`;
      doc.save(filename);
      setGenerationSuccess(true);
      setTimeout(() => setGenerationSuccess(false), 5000);
    } catch (err) {
      console.error("Batch PDF generation error:", err);
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to compile batch PDF document."
      );
    } finally {
      setIsGeneratingPdf(false);
      setGenerationProgress(null);
    }
  };

  // Direct Browser Print (Multi-Page Styled)
  const handleDirectBrowserPrint = () => {
    if (selectedList.length === 0) {
      alert("Please select at least one location to print.");
      return;
    }
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-6xl w-full p-4 sm:p-6 shadow-2xl border border-stone-200 max-h-[96vh] flex flex-col overflow-hidden animate-fadeIn">
        {/* ── Modal Header ── */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-200 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-[#ffbf00]/15 text-[#b38600] rounded-xl border border-[#ffbf00]/30">
                <Printer className="h-5 w-5 text-[#ffbf00]" />
              </span>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-stone-900">
                Batch QR Menu Stand Printer
              </h2>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Select multiple guest rooms and dining tables to compile into a single unified printable PDF.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
            title="Close Modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Modal Main Body Grid ── */}
        <div className="flex-1 overflow-y-auto py-4 grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-0 pr-1">
          {/* ══ Column 1: Multi-Location Selector (5 Cols) ══ */}
          <div className="lg:col-span-5 flex flex-col space-y-3 bg-stone-50/80 p-3.5 sm:p-4 rounded-2xl border border-stone-200">
            {/* Top Toolbar: Selection stats & Quick buttons */}
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckSquare className="h-4 w-4 text-[#ffbf00]" />
                  <span>Select Locations ({selectedList.length}/{locations.length})</span>
                </span>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#ffbf00]/20 text-[#996b00] font-bold">
                {selectedList.length} Selected
              </span>
            </div>

            {/* Quick action buttons */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-2.5 py-1 bg-white hover:bg-stone-100 border border-stone-300 rounded-lg text-stone-700 font-medium transition-colors"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={handleSelectAllRooms}
                className="px-2.5 py-1 bg-white hover:bg-stone-100 border border-stone-300 rounded-lg text-stone-700 font-medium flex items-center gap-1 transition-colors"
              >
                <BedDouble className="h-3 w-3 text-[#ffbf00]" />
                <span>All Rooms</span>
              </button>
              <button
                type="button"
                onClick={handleSelectAllTables}
                className="px-2.5 py-1 bg-white hover:bg-stone-100 border border-stone-300 rounded-lg text-stone-700 font-medium flex items-center gap-1 transition-colors"
              >
                <UtensilsCrossed className="h-3 w-3 text-[#ffbf00]" />
                <span>All Tables</span>
              </button>
              <button
                type="button"
                onClick={handleClearSelection}
                className="px-2.5 py-1 bg-white hover:bg-red-50 border border-red-200 rounded-lg text-red-600 font-medium transition-colors ml-auto"
              >
                Clear
              </button>
            </div>

            {/* Search & Category Filter */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-stone-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter rooms or tables (e.g. 204, Suite, Bar)..."
                  className="w-full h-8 pl-8 pr-3 rounded-xl border border-stone-300 text-xs text-stone-900 bg-white focus:outline-none focus:border-[#ffbf00]"
                />
              </div>

              {/* Tabs: All / Rooms / Tables */}
              <div className="grid grid-cols-3 gap-1 p-1 bg-stone-200/70 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setCategoryFilter("all")}
                  className={`py-1.5 rounded-lg transition-all ${
                    categoryFilter === "all"
                      ? "bg-white text-stone-900 shadow-xs"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  All ({locations.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryFilter("room")}
                  className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${
                    categoryFilter === "room"
                      ? "bg-white text-stone-900 shadow-xs"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  <BedDouble className="h-3 w-3 text-[#ffbf00]" />
                  <span>Rooms</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryFilter("table")}
                  className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${
                    categoryFilter === "table"
                      ? "bg-white text-stone-900 shadow-xs"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  <UtensilsCrossed className="h-3 w-3 text-[#ffbf00]" />
                  <span>Tables</span>
                </button>
              </div>
            </div>

            {/* Checkbox List */}
            <div className="flex-1 overflow-y-auto max-h-[300px] border border-stone-200 rounded-xl bg-white p-2 divide-y divide-stone-100">
              {filteredLocations.length === 0 ? (
                <div className="p-6 text-center text-xs text-stone-500">
                  No locations match your search query.
                </div>
              ) : (
                filteredLocations.map((loc) => {
                  const isChecked = selectedIds.has(loc.id);
                  return (
                    <label
                      key={loc.id}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-xs select-none ${
                        isChecked
                          ? "bg-[#fff9e6] font-semibold text-stone-900"
                          : "hover:bg-stone-50 text-stone-700"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleLocation(loc.id)}
                          className="h-4 w-4 rounded border-stone-300 text-[#ffbf00] focus:ring-[#ffbf00]"
                        />
                        <div className="flex items-center gap-1.5 truncate">
                          {loc.type === "room" ? (
                            <BedDouble className="h-3.5 w-3.5 text-[#ffbf00] shrink-0" />
                          ) : (
                            <UtensilsCrossed className="h-3.5 w-3.5 text-[#ffbf00] shrink-0" />
                          )}
                          <span className="truncate">{loc.name}</span>
                        </div>
                      </div>

                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 shrink-0">
                        {loc.category || (loc.type === "room" ? "Room" : "Table")}
                      </span>
                    </label>
                  );
                })
              )}
            </div>

            {/* Quick Add Custom Location Form */}
            <form onSubmit={handleAddCustomLocation} className="pt-2 border-t border-stone-200 space-y-1.5">
              <span className="text-[11px] font-semibold text-stone-700 block">
                Add Custom Location:
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={customLocationName}
                  onChange={(e) => setCustomLocationName(e.target.value)}
                  placeholder="e.g. Presidential 303, Cabana 3..."
                  className="flex-1 h-8 px-2.5 rounded-lg border border-stone-300 text-xs text-stone-900 bg-white focus:outline-none focus:border-[#ffbf00]"
                />
                <select
                  value={customLocationType}
                  onChange={(e) => setCustomLocationType(e.target.value as "room" | "table")}
                  className="h-8 px-2 rounded-lg border border-stone-300 text-xs text-stone-900 bg-white"
                >
                  <option value="room">Room</option>
                  <option value="table">Table</option>
                </select>
                <button
                  type="submit"
                  className="h-8 px-3 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1 shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </form>
          </div>

          {/* ══ Column 2: Stand Settings & Live Stand Preview (7 Cols) ══ */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            {/* Layout Options Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-stone-50 p-3 rounded-2xl border border-stone-200 text-xs">
              {/* Layout Mode */}
              <div>
                <label className="text-[11px] font-bold text-stone-800 uppercase tracking-wider block mb-1 flex items-center gap-1">
                  <Layers className="h-3.5 w-3.5 text-[#ffbf00]" />
                  <span>Stands Per Page</span>
                </label>
                <select
                  value={layoutMode}
                  onChange={(e) => setLayoutMode(e.target.value as any)}
                  className="w-full h-8 px-2 rounded-lg border border-stone-300 text-xs bg-white text-stone-900 font-medium focus:border-[#ffbf00]"
                >
                  <option value="2_per_page">2 Stands / Sheet (A4 Split with Cut Line)</option>
                  <option value="1_per_page">1 Stand / Sheet (Full Page A5/A4 Tent)</option>
                  <option value="4_per_page">4 Stands / Sheet (Mini Coaster Grid)</option>
                </select>
              </div>

              {/* Theme Style */}
              <div>
                <label className="text-[11px] font-bold text-stone-800 uppercase tracking-wider block mb-1 flex items-center gap-1">
                  <Palette className="h-3.5 w-3.5 text-[#ffbf00]" />
                  <span>Color Theme</span>
                </label>
                <select
                  value={themeStyle}
                  onChange={(e) => setThemeStyle(e.target.value as any)}
                  className="w-full h-8 px-2 rounded-lg border border-stone-300 text-xs bg-white text-stone-900 font-medium focus:border-[#ffbf00]"
                >
                  <option value="dark_luxury">Banky Luxury Obsidian &amp; Gold</option>
                  <option value="eco_white">Eco-Print Clean White &amp; Gold</option>
                </select>
              </div>

              {/* Orientation */}
              <div>
                <label className="text-[11px] font-bold text-stone-800 uppercase tracking-wider block mb-1 flex items-center gap-1">
                  <Sliders className="h-3.5 w-3.5 text-[#ffbf00]" />
                  <span>Orientation</span>
                </label>
                <select
                  value={orientation}
                  onChange={(e) => setOrientation(e.target.value as any)}
                  className="w-full h-8 px-2 rounded-lg border border-stone-300 text-xs bg-white text-stone-900 font-medium focus:border-[#ffbf00]"
                >
                  <option value="portrait">Portrait (Tall Table Stand)</option>
                  <option value="landscape">Landscape (Horizontal Table Tent)</option>
                </select>
              </div>
            </div>

            {/* Custom Notes & Wi-Fi Details Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-stone-50 p-3 rounded-2xl border border-stone-200 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-stone-700 block mb-1 flex items-center gap-1">
                  <Tag className="h-3 w-3 text-[#ffbf00]" />
                  <span>Custom Footer Tag:</span>
                </label>
                <input
                  type="text"
                  value={customFooterTag}
                  onChange={(e) => setCustomFooterTag(e.target.value)}
                  placeholder="e.g. 24/7 Room Service, Event Gala..."
                  className="w-full h-8 px-2.5 rounded-lg border border-stone-300 text-xs text-stone-900 bg-white focus:outline-none focus:border-[#ffbf00]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-stone-700 flex items-center gap-1">
                    <Wifi className="h-3 w-3 text-[#ffbf00]" />
                    <span>Include Wi-Fi Note</span>
                  </label>
                  <input
                    type="checkbox"
                    checked={includeWifi}
                    onChange={(e) => setIncludeWifi(e.target.checked)}
                    className="h-3.5 w-3.5 rounded text-[#ffbf00]"
                  />
                </div>
                <input
                  type="text"
                  value={wifiDetails}
                  disabled={!includeWifi}
                  onChange={(e) => setWifiDetails(e.target.value)}
                  placeholder="Wi-Fi: Banky Guest | Pass: ..."
                  className={`w-full h-8 px-2.5 rounded-lg border border-stone-300 text-xs text-stone-900 bg-white focus:outline-none focus:border-[#ffbf00] ${
                    !includeWifi ? "opacity-40 cursor-not-allowed" : ""
                  }`}
                />
              </div>
            </div>

            {/* ── Interactive Live Preview Box ── */}
            <div className="bg-stone-100 p-4 rounded-2xl border border-stone-200 flex flex-col items-center flex-1 justify-center relative overflow-hidden">
              {/* Preview Navigation Bar */}
              <div className="w-full flex items-center justify-between pb-2 mb-2 border-b border-stone-200/80 text-xs">
                <span className="font-semibold text-stone-700 flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5 text-[#ffbf00]" />
                  <span>Live Stand Preview</span>
                </span>

                {selectedList.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={previewIndex <= 0}
                      onClick={() => setPreviewIndex((prev) => Math.max(0, prev - 1))}
                      className="p-1 rounded-lg bg-white border border-stone-200 hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Previous Stand"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-[11px] font-mono font-medium text-stone-600">
                      Stand {previewIndex + 1} of {selectedList.length}
                    </span>
                    <button
                      type="button"
                      disabled={previewIndex >= selectedList.length - 1}
                      onClick={() => setPreviewIndex((prev) => Math.min(selectedList.length - 1, prev + 1))}
                      className="p-1 rounded-lg bg-white border border-stone-200 hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Next Stand"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Stand Card Mockup */}
              {currentPreviewLocation ? (
                <div
                  className={`rounded-2xl border-2 p-5 text-center shadow-xl transition-all duration-300 max-w-[320px] w-full ${
                    themeStyle === "dark_luxury"
                      ? "bg-[#191816] text-[#f4efe6] border-[#ffbf00]/50"
                      : "bg-white text-stone-900 border-[#ffbf00]/80 shadow-md"
                  }`}
                >
                  {/* Venue Logo */}
                  <div className="h-8 flex items-center justify-center mb-1.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={venueLogoUrl}
                      alt="Logo"
                      className="max-h-full max-w-[120px] object-contain drop-shadow"
                    />
                  </div>

                  <h4 className="font-display text-sm font-bold tracking-wide uppercase">
                    {venueName}
                  </h4>
                  <p className="text-[9px] font-mono uppercase tracking-widest text-[#ffbf00] mb-2 font-semibold">
                    {venueSubtitle}
                  </p>

                  {/* Location Badge */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ffbf00]/20 border border-[#ffbf00]/60 text-[#ffbf00] text-xs font-mono font-bold mb-2.5">
                    {currentPreviewLocation.type === "room" ? (
                      <BedDouble className="h-3.5 w-3.5" />
                    ) : (
                      <UtensilsCrossed className="h-3.5 w-3.5" />
                    )}
                    <span>{currentPreviewLocation.name}</span>
                  </div>

                  {/* QR Box */}
                  <div className="bg-white p-2.5 rounded-xl shadow-md border border-stone-200 inline-block mx-auto mb-2">
                    {previewQrDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={previewQrDataUrl}
                        alt="QR Code"
                        className="w-28 h-28 aspect-square object-contain block mx-auto"
                      />
                    ) : (
                      <div className="w-28 h-28 flex items-center justify-center text-stone-400 text-xs">
                        Loading QR...
                      </div>
                    )}
                  </div>

                  <p className="text-[10px] text-[#ffbf00] font-bold uppercase tracking-wider mb-0.5">
                    Scan with Phone Camera
                  </p>
                  <p className="text-[9px] text-stone-400 mb-2">
                    Instant Room Service &amp; Dine-in Ordering
                  </p>

                  {/* Footer note */}
                  {(customFooterTag || (includeWifi && wifiDetails)) && (
                    <div className="text-[9px] font-mono px-2 py-0.5 rounded bg-black/20 border border-white/10 text-stone-300">
                      {[customFooterTag, includeWifi ? wifiDetails : null]
                        .filter(Boolean)
                        .join(" • ")}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-stone-500">
                  <AlertCircle className="h-6 w-6 text-amber-500 mx-auto mb-2" />
                  <span>No locations selected. Pick rooms or tables to preview stands.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Progress & Status Messages ── */}
        {generationProgress && (
          <div className="py-2.5 px-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900 shrink-0 mb-3 animate-fadeIn">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-amber-600 animate-spin" />
              <span>
                Compiling PDF... Processing stand {generationProgress.current} of {generationProgress.total}
              </span>
            </div>
            <span className="font-mono font-bold">
              {Math.round((generationProgress.current / generationProgress.total) * 100)}%
            </span>
          </div>
        )}

        {generationSuccess && (
          <div className="py-2.5 px-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 shrink-0 mb-3 animate-fadeIn">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>
              Single PDF successfully generated and downloaded with {selectedList.length} QR stands!
            </span>
          </div>
        )}

        {errorMessage && (
          <div className="py-2.5 px-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-800 shrink-0 mb-3">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ── Modal Footer Controls ── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3.5 border-t border-stone-200 shrink-0">
          <div className="text-xs text-stone-500 flex items-center gap-2">
            <span>
              Total: <strong>{selectedList.length}</strong> stands will be compiled into 1 PDF document.
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-stone-600 hover:text-stone-900 text-xs font-semibold rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleDirectBrowserPrint}
              disabled={selectedList.length === 0 || isGeneratingPdf}
              className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-40 cursor-pointer"
              title="Print directly using browser print dialog"
            >
              <Printer className="h-4 w-4 text-stone-600" />
              <span>Direct Print</span>
            </button>

            <button
              type="button"
              onClick={handleGenerateBatchPdf}
              disabled={selectedList.length === 0 || isGeneratingPdf}
              className="px-5 py-2.5 bg-[#ffbf00] hover:bg-[#e09e00] text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-md transition-all disabled:opacity-50 cursor-pointer"
            >
              {isGeneratingPdf ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Compiling Single PDF...</span>
                </>
              ) : (
                <>
                  <FileDown className="h-4 w-4" />
                  <span>Download Batch PDF ({selectedList.length} Stands)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Hidden Print Container for Browser Multi-Page Printing ── */}
      <div id="batch-print-container" className="hidden print:block">
        <style jsx global>{`
          @media print {
            body * {
              visibility: hidden;
            }
            #batch-print-container,
            #batch-print-container * {
              visibility: visible;
            }
            #batch-print-container {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              background: #ffffff;
            }
            .batch-stand-page {
              page-break-after: always;
              break-after: page;
              height: 100vh;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              box-sizing: border-box;
              padding: 20mm;
            }
          }
        `}</style>

        {selectedList.map((loc) => {
          const params = new URLSearchParams();
          if (loc.type === "table") {
            params.set("table", loc.name);
          } else {
            params.set("room", loc.name);
          }
          if (customFooterTag.trim()) {
            params.set("tag", customFooterTag.trim());
          }
          const standUrl = `${baseUrl}/qr?${params.toString()}`;

          return (
            <div key={loc.id} className="batch-stand-page">
              <div
                style={{
                  backgroundColor: themeStyle === "dark_luxury" ? "#191816" : "#ffffff",
                  color: themeStyle === "dark_luxury" ? "#ffffff" : "#191816",
                  border: "2px solid #ffbf00",
                  borderRadius: "16px",
                  padding: "24px",
                  textAlign: "center",
                  maxWidth: "340px",
                  width: "100%",
                  boxShadow: "none",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={venueLogoUrl}
                  alt="Logo"
                  style={{ maxHeight: "40px", margin: "0 auto 8px" }}
                />
                <h2 style={{ fontSize: "16px", fontWeight: "bold", margin: "0 0 2px" }}>
                  {venueName}
                </h2>
                <p style={{ fontSize: "10px", color: "#ffbf00", margin: "0 0 12px" }}>
                  {venueSubtitle}
                </p>

                <div
                  style={{
                    display: "inline-block",
                    padding: "4px 12px",
                    borderRadius: "999px",
                    backgroundColor: "rgba(255, 191, 0, 0.2)",
                    border: "1px solid #ffbf00",
                    color: "#ffbf00",
                    fontSize: "12px",
                    fontWeight: "bold",
                    marginBottom: "12px",
                  }}
                >
                  {loc.name}
                </div>

                <div
                  style={{
                    backgroundColor: "#ffffff",
                    padding: "10px",
                    borderRadius: "12px",
                    display: "inline-block",
                    marginBottom: "12px",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(
                      standUrl
                    )}&size=180x180&margin=2`}
                    alt="QR Code"
                    style={{ width: "140px", height: "140px", display: "block" }}
                  />
                </div>

                <p style={{ fontSize: "11px", fontWeight: "bold", color: "#ffbf00", margin: "0 0 4px" }}>
                  Scan with Phone Camera to Order
                </p>
                <p style={{ fontSize: "9px", color: "#888888", margin: "0 0 6px" }}>
                  {standUrl}
                </p>
                {customFooterTag && (
                  <p style={{ fontSize: "9px", color: "#ffbf00", margin: 0 }}>
                    {customFooterTag}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
