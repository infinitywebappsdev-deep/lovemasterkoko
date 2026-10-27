"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-[#222] flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
          <button
            onClick={() => reset()}
            className="px-6 py-2.5 bg-[#ffbf00] text-black text-xs uppercase tracking-wider font-semibold rounded-full hover:bg-[#e09e00] transition-colors"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
