import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { requireStaff, jsonError } from "@/lib/booking/auth";

/** POST /api/admin/media/brand-upload
 * Accepts multipart form data with:
 * - file: the logo image file
 * - type: "full" | "mark" | "monochrome" (optional, defaults to "full")
 * - label: optional label for the logo
 */
export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req: NextRequest) {
  const auth = await requireStaff(req);
  if (!auth.ok) return jsonError(auth.error, auth.message, 401);

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const type = (formData.get("type") as string) || "full";
    const label = formData.get("label") as string || "";

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    // Validate file type - only images
    const validImageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validImageTypes.includes(file.type) && !file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only image files are allowed" },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Maximum size is 10MB. Your file is ${((file.size / (1024 * 1024)).toFixed(1))}MB` },
        { status: 400 }
      );
    }

    // Create directory if it doesn't exist
    const imagesDir = path.join(process.cwd(), "public", "images");
    await fs.mkdir(imagesDir, { recursive: true });

    // Generate a unique filename with timestamp to avoid conflicts
    const timestamp = Date.now();
    const extension = path.extname(file.name);
    const baseName = path.basename(file.name, extension);
    const safeBaseName = baseName.replace(/[^a-zA-Z0-9]/g, "_");
    const filename = `${safeBaseName}-${timestamp}${extension}`;

    // Save the file
    const filePath = path.join(imagesDir, filename);
    const bytes = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, bytes);

    // Determine the URL for this logo
    const logoUrl = `/images/${filename}`;
    const logoLabel = label || getDefaultLabel(type);

    // Update the brand-identity.ts config
    try {
      const brandIdentityPath = path.join(process.cwd(), "src", "lib", "brand-identity.ts");
      let content = await fs.readFile(brandIdentityPath, "utf-8");

      // Parse the existing content to find the assetCatalog array
      // We need to update or add the entry for this logo type
      
      const kindMap: Record<string, string> = {
        full: "full",
        mark: "mark", 
        monochrome: "monochrome",
      };
      
      const logoKind = kindMap[type] || "other";

      // Build the new catalog entry
      const newEntry = `    {\n      url: "${logoUrl}",\n      filename: "${filename}",\n      label: ${JSON.stringify(logoLabel)},\n      description: ${JSON.stringify(logoLabel)},\n      kind: "${logoKind}",\n      active: ${type === "full" ? "true" : "false"},\n    },`;

      // Check if there's already an entry for this kind
      const kindPattern = new RegExp(`kind:\\s*"${logoKind}"`);
      
      if (kindPattern.test(content)) {
        // Replace the existing entry for this kind
        // Find the full entry block for this kind
        const entryPattern = new RegExp(`    \\{[^}]*kind:\\s*"${logoKind}"[^}]*\\},`, 'm');
        content = content.replace(entryPattern, newEntry);
      } else {
        // Add new entry to the catalog - insert before the closing ]
        const catalogEndPattern = /(\s*\}\s*,\s*\])\s*$/m;
        content = content.replace(catalogEndPattern, `,${newEntry}\n  ]`);
      }

      // If this is the full logo, also update activeLogoUrl
      if (type === "full") {
        const activeUrlPattern = /activeLogoUrl:\s*"[^"]+"/;
        content = content.replace(activeUrlPattern, `activeLogoUrl: "${logoUrl}"`);
      }

      await fs.writeFile(brandIdentityPath, content, "utf-8");
    } catch (err) {
      console.warn("Could not update brand-identity.ts config file:", err);
    }

    return NextResponse.json({
      ok: true,
      filename,
      url: logoUrl,
      type,
      label: logoLabel,
      isActive: type === "full",
      message: `Logo "${logoLabel}" saved successfully.`,
    });
  } catch (error: any) {
    console.error("Brand logo upload error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to upload brand logo" },
      { status: 500 }
    );
  }
}

/** Helper to get default label for logo type */
function getDefaultLabel(type: string): string {
  const labels: Record<string, string> = {
    full: "Full Brand Logo",
    mark: "Architectural Mark",
    monochrome: "White Silhouette Mark",
  };
  return labels[type] || "Brand Logo";
}
