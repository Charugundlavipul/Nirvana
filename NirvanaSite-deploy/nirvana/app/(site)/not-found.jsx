import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6 py-20">
      <div className="max-w-xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Page Not Found</p>
        <h1 className="mt-4 text-4xl font-bold text-slate-900">That page doesn&apos;t exist.</h1>
        <p className="mt-4 text-slate-600">
          The page may have moved, or the property you requested is no longer available.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="rounded-full bg-accent px-6 py-3 font-semibold text-white">
            Return Home
          </Link>
          <Link href="/properties" className="rounded-full border border-slate-300 px-6 py-3 font-semibold text-slate-700">
            Browse Properties
          </Link>
        </div>
      </div>
    </div>
  );
}
