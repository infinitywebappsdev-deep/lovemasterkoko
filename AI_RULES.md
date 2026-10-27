# AI Rules & Project Guidelines

## Tech Stack
- **Framework**: Next.js 15 (App Router) utilizing React Server Components (RSC), Client Components (`"use client"`), and API Route Handlers in `src/app/api/`.
- **Core Language & Runtime**: React 19 and TypeScript with strict type checking across all components, hooks, and server utilities.
- **Styling**: Tailwind CSS (v3) configured with class-based dark mode (`darkMode: "class"`), custom color tokens (`gold`, `ivory`, `midnight`, `cream`), and custom typography variables (`font-display`, `font-sans`, `font-condensed`).
- **Icons**: `lucide-react` for unified, accessible iconography across customer and admin views.
- **Motion & Interactions**: `framer-motion` for fluid page transitions, reveal animations, modals, drawer animations, and interactive touch states.
- **Analytics & Charts**: `recharts` for admin dashboard analytics, revenue trends, booking distributions, and metrics reporting.
- **QR Code Services**: `qrcode` (with `@types/qrcode`) for table QR codes, contactless dining menus, and digital order tracking.
- **Backend & Database**: Firebase Web SDK (`firebase`) for client-safe operations and Firebase Admin SDK (`firebase-admin`) paired with `server-only` for privileged server routes and database management.
- **Payments & Reservations**: Dedicated booking engine (`src/lib/booking/`) with Paystack payment gateway integration for quotes, reservations, checkout, and webhook verification.

---

## Library & Architecture Usage Rules

### 1. Routing and Page Architecture
- **Use Next.js 15 App Router** (`src/app/`):
  - Place all routes, sub-routes, and route groups inside `src/app/`.
  - Default to **Server Components** for pages and data-fetching layouts unless user interaction, browser APIs, or React state/effects are required.
  - When state, event listeners, or client hooks (`useState`, `useEffect`, `useContext`) are needed, add `"use client"` at the very top of the file. Keep client boundaries as deep and small as possible.
  - Route Handlers must live inside `src/app/api/**/route.ts` using Next.js `NextRequest` and `NextResponse`.

### 2. Styling, Colors & Design System
- **Use Tailwind CSS exclusively** for styling layout, typography, grid/flex structures, and responsive design.
- Utilize established luxury design tokens from `tailwind.config.ts`:
  - Accents: `text-gold`, `bg-gold`, `bg-gold-light`, `bg-gold-soft`.
  - Backgrounds & Neutrals: `bg-ivory`, `bg-midnight`, `bg-cream`, and standard Tailwind slate/zinc/neutral shades.
  - Typography: `font-display` (serif headings), `font-sans` (body/UI), and `font-condensed` (badges/subheads).
- Keep dark mode classes explicit (`dark:...`) honoring the active theme context in `src/lib/ThemeContext.tsx` and `src/lib/ColorSchemeContext.tsx`.

### 3. Iconography
- **Use `lucide-react`** as the default icon library for all UI elements, status icons, badges, and navigation items.
- Maintain consistent icon sizing via Tailwind classes (e.g., `className="w-4 h-4"` or `className="w-5 h-5"`).
- For specialized brand icons (e.g., WhatsApp, custom logos), use dedicated components in `src/components/icons/` or `src/components/common/`.

### 4. Animations & Micro-Interactions
- **Use `framer-motion`** for:
  - Entrance animations and page reveals (`motion.div`, `AnimatePresence`).
  - Interactive modals, sheet drawers, toasts, and slide-in trays (such as QR menu cart and order trackers).
  - Hover and tap state feedback on primary action buttons.
- For simple utility animations (such as fades, infinite tickers, or marquee ribbons), prefer the built-in Tailwind keyframe animations defined in `tailwind.config.ts` (`animate-rise`, `animate-ticker`, `animate-fade-in`).

### 5. Charts & Analytics
- **Use `recharts`** for all data visualization:
  - Admin dashboard occupancy graphs, revenue history, and daily booking volume.
  - Always wrap charts in `<ResponsiveContainer width="100%" height={...}>` to ensure responsiveness on mobile and desktop viewports.
  - Style charts using the app's palette (`#c5a880` gold, `#1b1b1b` midnight, slate neutrals) with custom tooltips matching the dark/light mode theme.

### 6. QR Code Generation
- **Use `qrcode`** for:
  - Generating dynamic table QR codes for dine-in guests in the QR menu system (`src/lib/qr-menu/`).
  - Rendering downloadable or printable QR cards (`TableQrCardModal.tsx`) and receipt verification links.
  - Always generate QR codes asynchronously or via data URLs (`QRCode.toDataURL(...)`) and handle fallback rendering gracefully.

### 7. Backend, Storage & Firebase
- **Client vs. Server Separation**:
  - **Firebase Admin (`firebase-admin`)**: Must **only** be imported in server-side files (API routes or server actions). Protect server modules with `import "server-only";` to prevent leaking service keys or admin credentials to client bundles.
  - **Firebase Web SDK (`firebase`)**: Used in `src/lib/firebase.ts` for safe client interactions and standard auth/storage integrations where applicable.
- Never expose API secret keys, service account JSON, or payment secret keys in client-side components.

### 8. Payments & Bookings
- **Use the internal booking pipeline** in `src/lib/booking/`:
  - Pricing calculation, discount codes, add-on totals, and currency conversions must be verified server-side in `src/lib/booking/pricing.ts` and `src/lib/booking/engine.ts`.
  - Use `src/lib/booking/paystack.ts` for initializing Paystack transactions and validating webhook signatures (`/api/booking/webhook`).
  - Never trust pricing or payment completion status submitted directly by the client browser.

### 9. File Structure Conventions
- `src/app/`: Next.js pages, layouts, error boundaries, and API routes.
- `src/components/`: Reusable React components organized by domain:
  - `admin/`: Admin panels, tables, metrics, and analytics charts.
  - `common/`: Shared reusable widgets (logos, image carousels, badges).
  - `layout/`: Global navigation, header, footer, floating action buttons, theme switchers.
  - `qr/`: Contactless dining, table modals, order tracking, and receipt components.
  - `seo/`: JSON-LD structured data and meta helpers.
- `src/lib/`: Domain engines, database clients, helpers, context providers, and TypeScript definitions.
