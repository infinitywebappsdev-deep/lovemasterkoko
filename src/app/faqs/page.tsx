import type { Metadata } from "next";
import { FaqSchema, BreadcrumbSchema } from "@/components/seo/StructuredData";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description:
    "Answers to common questions about Banky Hotel & Suites — check-in times, breakfast, parking, payment methods, and more.",
  openGraph: {
    title: "FAQs — Banky Hotel & Suites",
    description:
      "Get answers about check-in, breakfast, parking, payments, and WhatsApp booking at Banky Hotel.",
  },
};

const FAQS = [
  { q: "What are your check-in and check-out times?", a: "Standard check-in begins at 2:00 PM and check-out is by 12:00 noon. Early check-in or late check-out can be requested subject to room availability." },
  { q: "Is complimentary breakfast included?", a: "Yes, all room reservations include complimentary gourmet breakfast served daily in our fine dining restaurant." },
  { q: "Where is Banky Hotel & Suites located?", a: "We are located at Km 5 NDLEA Junction Ado-Iworoko Road, Adebayo, Ado-Ekiti, Ekiti State, Nigeria." },
  { q: "Do you have 24/7 security and uninterrupted power?", a: "Yes, we provide round-the-clock armed professional security, CCTV surveillance, and full multi-tier generator power backup." },
  { q: "What payment methods do you accept?", a: "We accept Paystack online payments (cards, bank transfer, USSD), direct bank transfers, and front-desk cash/card payments." },
  { q: "Can I book via WhatsApp?", a: "Absolutely. You can message us on WhatsApp to make inquiries, check availability, and confirm reservations with our front desk team." },
  { q: "Do you offer airport transfers?", a: "VIP airport transfers are available for Luxury Suite and Luxury guests. Other rooms can arrange transfers upon request." },
  { q: "Is there parking available?", a: "Yes, we offer complimentary secure parking for all hotel guests within our guarded premises." },
];

export default function FaqsPage() {
  const breadcrumbs = [
    { name: "Home", url: "/" },
    { name: "FAQs", url: "/faqs" },
  ];

  return (
    <>
      <FaqSchema />
      <BreadcrumbSchema items={breadcrumbs} />
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 bg-[#1b1b1b] dark:bg-[#1a1a1d]">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1b1b1b] dark:from-[#202023] via-[#1b1b1b]/80 to-[#1b1b1b]" />
        <div className="container-x relative z-10 text-center">
          <span className="eyebrow text-[var(--accent)] block mb-3">Questions &amp; Answers</span>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl text-white">Frequently Asked Questions</h1>
        </div>
      </section>
      <section className="py-16 sm:py-24 bg-white dark:bg-[#202023]">
        <div className="container-x max-w-3xl">
          <div className="space-y-4">
            {FAQS.map((f, i) => (
              <details key={i} className="group border border-[#ece6dd] dark:border-[#2e2b26] p-6" open={i === 0}>
                <summary className="font-display text-lg text-[#222] dark:text-[#f4efe6] cursor-pointer list-none flex items-center justify-between">
                  {f.q}
                  <span className="text-[var(--accent)] group-open:rotate-45 transition-transform text-2xl font-condensed">+</span>
                </summary>
                <p className="mt-4 text-sm text-[#666] dark:text-[#a8a29e] leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
