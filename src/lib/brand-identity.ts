export type BrandIdentityConfig = {
  activeLogoUrl: string;
  activeLogoFallbackUrl: string;
  assetCatalog: BrandAsset[];
  updatedAt: string;
};

export type BrandAsset = {
  url: string;
  filename: string;
  label: string;
  description: string;
  kind: "full" | "mark" | "monochrome" | "other";
  active: boolean;
};

export const DEFAULT_BRAND_IDENTITY: BrandIdentityConfig = {
  activeLogoUrl: "/images/Banky_Hotel___Suites_Main_Logo_plus-1793190474245.png",
  activeLogoFallbackUrl: "/images/Banky_Hotel___Suites_Main_Logo_plus-1793190474245.png",
  assetCatalog: [
    {
      url: "/images/Banky_Hotel___Suites_Main_Logo_plus-1793190474245.png",
      filename: "Banky_Hotel___Suites_Main_Logo_plus-1793190474245.png",
      label: "Banky Logo",
      description: "Banky Hotel & Suites logo",
      kind: "full",
      active: true,
    },
    {
      url: "/images/Banky Hotel & Suites Main Logo plus.png",
      filename: "Banky Hotel & Suites Main Logo plus.png",
      label: "Architectural Mark",
      description: "Royal blue 3-tower skyline with golden horizon crescent",
      kind: "mark",
      active: false,
    },
    {
      url: "/images/Banky Hotel & Suites Main Logo 2 plus..png",
      filename: "Banky Hotel & Suites Main Logo 2 plus..png",
      label: "White Silhouette Mark",
      description: "Pure white silhouette mark for dark backdrops & footer",
      kind: "monochrome",
      active: false,
    },
  ],
  updatedAt: new Date(0).toISOString(),
};
