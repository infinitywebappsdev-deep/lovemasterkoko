import type { Metadata } from "next";
import { ROOMS, naira } from "@/lib/hotel";

type RouteParams = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const room = ROOMS.find((r) => r.slug === slug);

  if (!room) {
    return {
      title: { absolute: "Room Not Found | Banky Hotel & Suites" },
      robots: { index: false },
    };
  }

  const description = `${room.blurb} The ${room.name} at Banky Hotel & Suites, Ado-Ekiti starts at ${naira(
    room.rate
  )} per night. Book direct for the best rate.`;

  return {
    // `absolute` so the brand suffix is always present and never doubled by the
    // root layout's title template (template inheritance does not reach here).
    title: {
      absolute: `${room.name} — ${naira(room.rate)} / Night | Banky Hotel & Suites`,
    },
    description,
    alternates: {
      canonical: `/rooms/${room.slug}`,
    },
    openGraph: {
      title: `${room.name} | Banky Hotel & Suites`,
      description,
      images: [room.image],
    },
  };
}

export default function RoomDetailLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
