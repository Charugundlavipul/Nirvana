import Link from "next/link";
import {
  FiArrowRight,
  FiArrowUpRight,
  FiCalendar,
  FiCheck,
  FiClock,
  FiHelpCircle,
  FiShield,
  FiX,
} from "react-icons/fi";
import { getManagedPageMetadata } from "../../../src/lib/serverContentApi";

export const revalidate = 86400;

export async function generateMetadata() {
  return getManagedPageMetadata("/cancellation-policy", {
    title: "Cancellation Policy - Direct Bookings",
    description:
      "Review the Nirvana Luxe cancellation policy for direct bookings and find where to view the policy for Airbnb or Vrbo reservations.",
    pathname: "/cancellation-policy",
    keywords: [
      "Nirvana Luxe cancellation policy",
      "direct booking cancellation policy",
      "vacation rental cancellation policy",
    ],
  });
}

const directBookingWindows = [
  {
    icon: FiCheck,
    eyebrow: "14+ days before check-in",
    title: "Full refund",
    description:
      "Cancel at least 14 days before your scheduled check-in date to receive a full refund.",
    tone: "border-emerald-200 bg-emerald-50/70",
    iconTone: "bg-emerald-600 text-white",
  },
  {
    icon: FiClock,
    eyebrow: "7–13 days before check-in",
    title: "50% refund",
    description:
      "Cancel between 7 and 13 days before your scheduled check-in date to receive a 50% refund.",
    tone: "border-amber-200 bg-amber-50/70",
    iconTone: "bg-amber-500 text-white",
  },
  {
    icon: FiX,
    eyebrow: "Fewer than 7 days",
    title: "Non-refundable",
    description:
      "Cancellations made fewer than 7 days before check-in are not eligible for a refund.",
    tone: "border-rose-200 bg-rose-50/70",
    iconTone: "bg-rose-500 text-white",
  },
];

const platformPolicies = [
  {
    name: "Airbnb",
    accent: "text-[#e51d53]",
    dot: "bg-[#ff385c]",
    description:
      "Your Airbnb reservation is governed by the cancellation policy shown on Airbnb when you booked. Review the exact deadlines and estimated refund under Reservation details in Trips.",
    tripHref: "https://www.airbnb.com/trips",
    tripLabel: "View Airbnb trips",
    helpHref: "https://www.airbnb.com/help/article/4118",
  },
  {
    name: "Vrbo",
    accent: "text-[#174ea6]",
    dot: "bg-[#1a73e8]",
    description:
      "Your Vrbo reservation is governed by the cancellation policy attached to that booking. Sign in and open My Trips to review the applicable terms and request a cancellation.",
    tripHref: "https://www.vrbo.com/trips",
    tripLabel: "View Vrbo trips",
    helpHref: "https://help.vrbo.com/articles/Can-a-traveler-cancel-a-reservation",
  },
];

export default function CancellationPolicyPage() {
  return (
    <div className="min-h-screen bg-[#f7f6f1] font-sans text-slate-900">
      <section className="hero-section relative overflow-hidden border-b border-slate-100 bg-white px-4 pb-4 pt-28 sm:px-6 sm:pb-4 sm:pt-28 md:pb-6 md:pt-28">
        <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-amber-50 sm:h-96 sm:w-96" />
          <div className="absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-accent/5 sm:h-[420px] sm:w-[420px]" />
          <div className="absolute left-1/3 top-1/2 h-40 w-40 rounded-full bg-blue-50/60 blur-2xl" />
        </div>
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5">
            <FiShield aria-hidden="true" className="text-xs text-accent" />
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">
              Book with confidence
            </span>
          </div>
          <h1 className="mb-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
            Cancellation Policy
          </h1>
          <p className="mx-auto max-w-2xl text-sm text-slate-500 sm:text-base">
            Plans can change. Review your cancellation options for a direct booking,
            or find the policy that applies to your Airbnb or Vrbo reservation.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 py-14 md:py-20">
        <section aria-labelledby="direct-bookings">
          <div className="mb-9 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-accent">
                Primary policy
              </p>
              <h2 id="direct-bookings" className="text-3xl font-bold tracking-tight md:text-4xl">
                Booked directly on our website?
              </h2>
              <p className="mt-3 max-w-2xl leading-7 text-slate-600">
                The following cancellation windows apply to reservations completed
                on the official Nirvana Luxe direct-booking website.
              </p>
            </div>
            <Link
              href="/book"
              className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Book direct
              <FiArrowRight aria-hidden="true" />
            </Link>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {directBookingWindows.map((window) => {
              const Icon = window.icon;
              return (
                <article
                  key={window.title}
                  className={`rounded-3xl border p-6 shadow-[0_18px_45px_rgba(15,23,42,0.05)] md:p-7 ${window.tone}`}
                >
                  <div className={`mb-7 flex h-11 w-11 items-center justify-center rounded-2xl ${window.iconTone}`}>
                    <Icon aria-hidden="true" className="text-xl" />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                    {window.eyebrow}
                  </p>
                  <h3 className="mt-3 text-2xl font-bold">{window.title}</h3>
                  <p className="mt-3 leading-7 text-slate-600">{window.description}</p>
                </article>
              );
            })}
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white px-6 py-5 text-sm leading-6 text-slate-600 shadow-sm">
            <div className="flex items-start gap-3">
              <FiCalendar aria-hidden="true" className="mt-1 shrink-0 text-lg text-accent" />
              <p>
                Refund eligibility is based on how many calendar days remain before
                the property&apos;s scheduled check-in date. To start a cancellation,
                please{" "}
                <Link href="/contact" className="font-semibold text-slate-900 underline decoration-accent underline-offset-4">
                  contact our team
                </Link>
                .
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="other-platforms" className="mt-20 md:mt-24">
          <div className="max-w-3xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-accent">
              Airbnb &amp; Vrbo bookings
            </p>
            <h2 id="other-platforms" className="text-3xl font-bold tracking-tight md:text-4xl">
              Booked through another platform?
            </h2>
            <p className="mt-4 leading-7 text-slate-600">
              The platform policy shown on your reservation controls—not the
              direct-booking policy above. Policies can vary by property, stay dates,
              and the terms accepted at checkout, so your trip details are the most
              accurate source.
            </p>
          </div>

          <div className="mt-9 grid gap-6 md:grid-cols-2">
            {platformPolicies.map((platform) => (
              <article
                key={platform.name}
                className="flex flex-col rounded-3xl border border-slate-200 bg-white p-7 shadow-[0_18px_50px_rgba(15,23,42,0.06)] md:p-8"
              >
                <div className="mb-5 flex items-center gap-3">
                  <span aria-hidden="true" className={`h-3 w-3 rounded-full ${platform.dot}`} />
                  <h3 className={`text-2xl font-bold ${platform.accent}`}>{platform.name}</h3>
                </div>
                <p className="flex-1 leading-7 text-slate-600">{platform.description}</p>
                <div className="mt-7 flex flex-wrap items-center gap-4">
                  <a
                    href={platform.tripHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                  >
                    {platform.tripLabel}
                    <FiArrowUpRight aria-hidden="true" />
                  </a>
                  <a
                    href={platform.helpHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 underline decoration-slate-300 underline-offset-4 transition hover:text-slate-950"
                  >
                    Platform help
                    <FiArrowUpRight aria-hidden="true" />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-20 overflow-hidden rounded-[2rem] bg-[#111d30] px-7 py-10 text-white md:px-12 md:py-12">
          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-center">
            <div className="max-w-2xl">
              <div className="mb-4 flex items-center gap-2 text-accent">
                <FiHelpCircle aria-hidden="true" className="text-xl" />
                <p className="text-xs font-semibold uppercase tracking-[0.22em]">
                  Need help?
                </p>
              </div>
              <h2 className="text-2xl font-bold md:text-3xl">Not sure which policy applies?</h2>
              <p className="mt-3 leading-7 text-slate-300">
                Tell us where you booked and share your reservation details. We&apos;ll
                point you to the correct policy and next step.
              </p>
            </div>
            <Link
              href="/contact"
              className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full bg-accent px-6 py-3.5 text-sm font-bold text-white transition hover:brightness-110"
            >
              Contact us
              <FiArrowRight aria-hidden="true" />
            </Link>
          </div>
        </section>

        <p className="mt-8 text-center text-xs leading-5 text-slate-500">
          This page summarizes cancellation terms for convenience. For direct
          bookings, it should be read together with our{" "}
          <Link href="/terms" className="underline underline-offset-2 hover:text-slate-800">
            Terms and Conditions
          </Link>
          . Third-party bookings remain subject to the terms displayed by the
          respective platform.
        </p>
      </div>
    </div>
  );
}
