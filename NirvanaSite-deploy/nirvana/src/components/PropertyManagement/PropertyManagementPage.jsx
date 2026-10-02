"use client";

import emailjs from "@emailjs/browser";
import Image from "next/image";
import Link from "next/link";
import { useId, useState } from "react";
import { PROPERTY_MANAGEMENT_FAQS } from "./propertyManagementContent";

const emailJsConfig = {
  serviceId: process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID ?? "",
  contactTemplateId: process.env.NEXT_PUBLIC_EMAILJS_CONTACT_TEMPLATE_ID ?? "",
  publicKey: process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY ?? "",
};

const SERVICES = [
  {
    number: "01",
    title: "Revenue strategy",
    description:
      "Market-aware pricing, minimum-stay planning, calendar pacing, and thoughtful positioning for your home's location and amenities.",
    icon: "trend",
  },
  {
    number: "02",
    title: "Listing marketing",
    description:
      "Professional presentation, search-friendly listing copy, photography guidance, and distribution across appropriate booking channels.",
    icon: "spark",
  },
  {
    number: "03",
    title: "Guest hospitality",
    description:
      "Responsive communication from inquiry through checkout, clear arrival information, and local support when guests need help.",
    icon: "message",
  },
  {
    number: "04",
    title: "Turnover standards",
    description:
      "Coordinated cleaning, restocking, readiness checks, and property-specific procedures for pools, hot tubs, docks, or game rooms.",
    icon: "home",
  },
  {
    number: "05",
    title: "Property care",
    description:
      "Routine observations, maintenance coordination, issue documentation, and a practical plan for protecting your investment.",
    icon: "shield",
  },
  {
    number: "06",
    title: "Owner clarity",
    description:
      "Straightforward reporting, calendar visibility, documented decisions, and a real person who understands your home.",
    icon: "report",
  },
];

const PROCESS = [
  {
    step: "01",
    title: "Property conversation",
    text: "We learn about the home, your goals, current performance, and the level of support you need.",
  },
  {
    step: "02",
    title: "Local market review",
    text: "We assess comparable stays, seasonality, amenities, presentation, and operational opportunities.",
  },
  {
    step: "03",
    title: "Clear management plan",
    text: "You receive a tailored scope, fee structure, priorities, and realistic transition timeline.",
  },
  {
    step: "04",
    title: "Thoughtful launch",
    text: "We prepare the listing and operating playbook, coordinate vendors, and begin guest-ready management.",
  },
];

const MARKETS = [
  {
    eyebrow: "Tennessee",
    title: "Smoky Mountain cabin management",
    body: "Local vacation rental management for distinctive cabins and large-group stays in Sevierville, Pigeon Forge, Gatlinburg, Wears Valley, and nearby Smoky Mountain communities.",
    image: "/data/Nirvana/DJI_0635.webp",
    alt: "Sevierville vacation rental cabin surrounded by fall color in the Smoky Mountains",
    href: "/tennessee-vacation-rentals",
    link: "Explore our Tennessee stays",
  },
  {
    eyebrow: "North Carolina",
    title: "Lake Norman property management",
    body: "Detail-oriented care for waterfront homes and family retreats around Lake Norman, Mooresville, and the greater Charlotte lake region.",
    image: "/assets/property-management-lake-norman.webp",
    alt: "Bright luxury vacation home with a private dock on Lake Norman",
    href: "/north-carolina-vacation-rentals",
    link: "Explore our North Carolina stays",
  },
];

const LOCAL_MARKETS = [
  {
    title: "Sevierville vacation rental management",
    text: "For mountain-view cabins, indoor-pool homes, and large-group lodges, we focus on amenity presentation, guest-ready operations, and pricing around the property's specific Sevierville setting.",
  },
  {
    title: "Pigeon Forge cabin management",
    text: "Pigeon Forge demand is shaped by family travel, attractions, event weekends, and group stays. Listings and stay rules should reflect how those guests search, book, and use the home.",
  },
  {
    title: "Gatlinburg property management",
    text: "Park access, downtown proximity, views, parking, and road access all influence a Gatlinburg cabin's guest fit. We turn those practical details into clearer marketing and smoother arrivals.",
  },
  {
    title: "Wears Valley cabin management",
    text: "Privacy and a quieter mountain setting are part of the appeal. Accurate directions, seasonal preparation, outdoor amenities, and realistic guest expectations matter here.",
  },
  {
    title: "Lake Norman Airbnb management",
    text: "Waterfront homes need a different playbook: dock and lake information, boating-season demand, outdoor-space presentation, and operational care designed around the shoreline setting.",
  },
];

function Icon({ name, className = "h-6 w-6" }) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  };

  if (name === "trend") {
    return (
      <svg {...common}>
        <path d="M3 17l6-6 4 4 8-9" />
        <path d="M15 6h6v6" />
      </svg>
    );
  }

  if (name === "spark") {
    return (
      <svg {...common}>
        <path d="M12 3l1.4 4.1a5 5 0 003.2 3.2L21 12l-4.4 1.7a5 5 0 00-3.2 3.2L12 21l-1.4-4.1a5 5 0 00-3.2-3.2L3 12l4.4-1.7a5 5 0 003.2-3.2L12 3z" />
      </svg>
    );
  }

  if (name === "message") {
    return (
      <svg {...common}>
        <path d="M21 15a4 4 0 01-4 4H8l-5 3V7a4 4 0 014-4h10a4 4 0 014 4z" />
        <path d="M8 9h8M8 13h5" />
      </svg>
    );
  }

  if (name === "home") {
    return (
      <svg {...common}>
        <path d="M3 11l9-8 9 8" />
        <path d="M5 10v10h14V10M9 20v-6h6v6" />
      </svg>
    );
  }

  if (name === "shield") {
    return (
      <svg {...common}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    );
  }

  if (name === "report") {
    return (
      <svg {...common}>
        <path d="M5 3h14v18H5z" />
        <path d="M9 17v-4M12 17V9M15 17v-6" />
      </svg>
    );
  }

  if (name === "arrow") {
    return (
      <svg {...common}>
        <path d="M5 12h14M14 7l5 5-5 5" />
      </svg>
    );
  }

  if (name === "check") {
    return (
      <svg {...common}>
        <path d="M20 6L9 17l-5-5" />
      </svg>
    );
  }

  if (name === "chevron") {
    return (
      <svg {...common}>
        <path d="M6 9l6 6 6-6" />
      </svg>
    );
  }

  if (name === "phone") {
    return (
      <svg {...common}>
        <path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6 19.8 19.8 0 01-3.1-8.7A2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .4 1.9.7 2.8a2 2 0 01-.5 2.1L8.1 9.9a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.5c.9.3 1.8.6 2.8.7a2 2 0 011.7 2.1z" />
      </svg>
    );
  }

  return null;
}

function PropertyInquiryForm() {
  const formId = useId();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState({ message: "", tone: "idle" });

  const handleSubmit = async (event) => {
    event.preventDefault();

    const missingConfig = [
      emailJsConfig.serviceId,
      emailJsConfig.contactTemplateId,
      emailJsConfig.publicKey,
    ].some((value) => !value);

    if (missingConfig) {
      setStatus({
        message: "Online inquiries are temporarily unavailable. Please call or email our owner team.",
        tone: "error",
      });
      return;
    }

    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    const phone = String(data.get("phone") || "").trim();
    const market = String(data.get("market") || "").trim();
    const propertyAddress = String(data.get("property_address") || "").trim();
    const notes = String(data.get("message") || "").trim();

    setIsSubmitting(true);
    setStatus({ message: "", tone: "idle" });

    try {
      await emailjs.send(
        emailJsConfig.serviceId,
        emailJsConfig.contactTemplateId,
        {
          user_name: name,
          user_email: email,
          user_phone: phone || "Not provided",
          inquiry_message: [
            "Property management inquiry",
            `Market: ${market || "Not selected"}`,
            `Property address: ${propertyAddress || "Not provided"}`,
            `Notes: ${notes || "None"}`,
          ].join("\n"),
          submitted_at: new Intl.DateTimeFormat("en-US", {
            dateStyle: "long",
            timeStyle: "short",
          }).format(new Date()),
          reply_to: email,
          email_subject: `Property management inquiry from ${name}`,
        },
        { publicKey: emailJsConfig.publicKey }
      );

      form.reset();
      setStatus({
        message: `Thank you, ${name}. Your property details have been sent to our owner team.`,
        tone: "success",
      });
    } catch (error) {
      console.error("Property management inquiry send failed", error);
      setStatus({
        message: "We could not send your inquiry. Please call (704) 780-1368 or try again shortly.",
        tone: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldClass =
    "w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-[#607054] focus:ring-2 focus:ring-[#607054]/15";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`${formId}-name`} className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-stone-600">
            Name
          </label>
          <input id={`${formId}-name`} name="name" type="text" autoComplete="name" required placeholder="Your name" className={fieldClass} />
        </div>
        <div>
          <label htmlFor={`${formId}-phone`} className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-stone-600">
            Phone
          </label>
          <input id={`${formId}-phone`} name="phone" type="tel" autoComplete="tel" placeholder="(704) 555-0199" className={fieldClass} />
        </div>
      </div>

      <div>
        <label htmlFor={`${formId}-email`} className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-stone-600">
          Email
        </label>
        <input id={`${formId}-email`} name="email" type="email" autoComplete="email" required placeholder="you@example.com" className={fieldClass} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`${formId}-market`} className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-stone-600">
            Market
          </label>
          <select id={`${formId}-market`} name="market" defaultValue="" className={fieldClass}>
            <option value="" disabled>Select a market</option>
            <option value="Smoky Mountains, TN">Smoky Mountains, TN</option>
            <option value="Lake Norman, NC">Lake Norman, NC</option>
            <option value="Other">Other / not sure</option>
          </select>
        </div>
        <div>
          <label htmlFor={`${formId}-address`} className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-stone-600">
            Property location
          </label>
          <input id={`${formId}-address`} name="property_address" type="text" autoComplete="street-address" placeholder="City or address" className={fieldClass} />
        </div>
      </div>

      <div>
        <label htmlFor={`${formId}-message`} className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-stone-600">
          Tell us about the home
        </label>
        <textarea id={`${formId}-message`} name="message" rows="4" placeholder="Bedrooms, amenities, current management, and your goals" className={`${fieldClass} resize-y`} />
      </div>

      {status.message && (
        <p
          role={status.tone === "error" ? "alert" : "status"}
          aria-live="polite"
          className={`rounded-xl border px-4 py-3 text-sm ${
            status.tone === "error"
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {status.message}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[#233329] px-5 py-3.5 text-sm font-bold text-white shadow-[0_12px_30px_rgba(35,51,41,0.18)] transition hover:bg-[#314537] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Sending…" : "Request my local management plan"}
        {!isSubmitting && <Icon name="arrow" className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
      </button>

      <p className="text-center text-xs leading-relaxed text-stone-500">
        No obligation. We’ll start with a practical conversation about fit.
      </p>
    </form>
  );
}

export default function PropertyManagementPage() {
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <div className="property-management-page bg-[#fbfaf7] text-stone-900 selection:bg-[#cad6bd] selection:text-[#233329]">
      <section className="site-hero relative isolate overflow-hidden bg-[#f3f0e8] pt-[calc(var(--site-header-height)+2.5rem)] pb-16 md:pt-[calc(var(--site-header-height)+4rem)] md:pb-24">
        <div className="pointer-events-none absolute -left-24 top-24 h-64 w-64 rounded-full bg-[#dbe6ce]/70 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-0 h-72 w-72 rounded-full bg-white/80 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-[0.92fr_1.08fr] lg:gap-14 lg:px-10">
          <div className="relative z-10">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#89977e]/30 bg-white/75 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#526247] backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-[#718362]" />
              Local care. Thoughtful growth.
            </div>

            <h1 className="max-w-2xl text-[2.65rem] font-bold leading-[1.06] tracking-normal text-[#1e2b23] sm:text-5xl lg:text-[3.35rem] xl:text-[3.55rem]">
              Vacation rental management with local care.
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-stone-600 sm:text-xl">
              Full-service property management for exceptional cabins in the Smoky Mountains and waterfront homes on Lake Norman.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a href="#owner-consultation" className="group inline-flex items-center justify-center gap-2 rounded-full bg-[#233329] px-7 py-4 text-sm font-bold text-white shadow-[0_16px_36px_rgba(35,51,41,0.2)] transition hover:-translate-y-0.5 hover:bg-[#314537]">
                Discuss your vacation home
                <Icon name="arrow" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
              <a href="tel:+17047801368" className="inline-flex items-center justify-center gap-2 rounded-full border border-stone-300 bg-white/60 px-6 py-4 text-sm font-bold text-stone-800 transition hover:border-[#718362] hover:bg-white">
                <Icon name="phone" className="h-4 w-4 text-[#607054]" />
                (704) 780-1368
              </a>
            </div>

            <ul className="mt-8 grid gap-3 text-sm font-medium text-stone-600 sm:grid-cols-2">
              {["Locally informed management", "Guest support from arrival to checkout", "Cleaning and property-care coordination", "Clear owner communication"].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#dfe8d6] text-[#40513a]">
                    <Icon name="check" className="h-3 w-3" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative lg:pl-2">
            <div className="relative aspect-[1.32/1] overflow-hidden rounded-[2rem] bg-stone-200 shadow-[0_30px_80px_rgba(48,57,47,0.16)] sm:aspect-[1.55/1] lg:aspect-[1.18/1]">
              <Image
                src="/assets/property-management-smoky-mountains.webp"
                alt="Sunlit luxury cabin overlooking the Great Smoky Mountains"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 55vw"
                className="object-cover"
              />
            </div>
            <div className="absolute -bottom-6 left-4 max-w-[17rem] rounded-2xl border border-white/80 bg-white/95 p-4 shadow-xl backdrop-blur sm:left-8 sm:p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#607054]">For homeowners</p>
              <p className="mt-1 text-base font-extrabold leading-snug text-[#233329]">A calmer way to operate a high-performing vacation home.</p>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Service areas" className="border-y border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-5 py-6 text-xs font-bold uppercase tracking-[0.14em] text-stone-500 sm:px-8 lg:px-10">
          <span className="text-[#526247]">Serving select homes in</span>
          <span>Sevierville</span>
          <span>Pigeon Forge</span>
          <span>Gatlinburg</span>
          <span>Wears Valley</span>
          <span>Lake Norman</span>
        </div>
      </section>

      <section className="bg-white py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#607054]">Full-service management</p>
              <h2 className="mt-4 text-3xl font-bold leading-[1.15] tracking-normal text-[#1f2c24] sm:text-4xl">
                Good management begins after the listing goes live.
              </h2>
              <p className="mt-5 max-w-lg text-base leading-7 text-stone-600">
                Strong vacation rental performance is built on hundreds of small decisions: the right photos, the right rate, a spotless arrival, fast communication, and consistent care between stays. We bring those pieces together under one locally informed plan.
              </p>
              <Link href="/properties" className="group mt-7 inline-flex items-center gap-2 text-sm font-bold text-[#40513a] underline decoration-[#aab99e] underline-offset-4 hover:text-[#233329]">
                See the guest experience we manage
                <Icon name="arrow" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            <div className="grid gap-px overflow-hidden rounded-3xl border border-stone-200 bg-stone-200 sm:grid-cols-2">
              {SERVICES.map((service) => (
                <article key={service.number} className="group bg-[#fbfaf7] p-6 transition hover:bg-white sm:p-7">
                  <div className="flex items-start justify-between gap-4">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e5ebdf] text-[#526247] transition group-hover:bg-[#d5e0cc]">
                      <Icon name={service.icon} className="h-5 w-5" />
                    </span>
                    <span className="text-xs font-bold tracking-[0.18em] text-stone-300">{service.number}</span>
                  </div>
                  <h3 className="mt-6 text-xl font-extrabold text-[#233329]">{service.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-stone-600">{service.description}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#eef1e9] py-20 md:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-2 lg:gap-20 lg:px-10">
          <div className="relative order-2 lg:order-1">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] bg-stone-200 shadow-[0_25px_60px_rgba(55,68,52,0.13)]">
              <Image
                src="/data/Nirvana/01-5073-Settlers-View-Ln-Sevierville-TN-1.webp"
                alt="Professionally prepared vacation rental living room with Smoky Mountain views"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
            <div className="absolute -bottom-5 -right-2 rounded-2xl bg-[#233329] px-5 py-4 text-white shadow-xl sm:right-6">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#c9d7bf]">The standard</p>
              <p className="mt-1 font-extrabold">Guest-ready, every stay.</p>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#607054]">Hospitality meets stewardship</p>
            <h2 className="mt-4 text-3xl font-bold leading-[1.15] tracking-normal text-[#1f2c24] sm:text-4xl">
              Better stays protect the value of your home.
            </h2>
            <p className="mt-5 text-base leading-7 text-stone-600">
              We approach vacation rental management from both sides of the front door. Guests need a polished, dependable stay. Owners need visibility, thoughtful maintenance, and a team that notices the details.
            </p>

            <div className="mt-8 space-y-5">
              {[
                ["Before arrival", "Clear communication, access details, property preparation, and a final readiness check."],
                ["During the stay", "Responsive guest support and practical local coordination when something needs attention."],
                ["After checkout", "Turnover oversight, issue documentation, restocking, and maintenance follow-through."],
              ].map(([title, text]) => (
                <div key={title} className="flex gap-4">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#9dac91] bg-white text-[#526247]">
                    <Icon name="check" className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <h3 className="font-extrabold text-[#233329]">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-stone-600">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#fbfaf7] py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#607054]">Focused local markets</p>
            <h2 className="mt-4 text-3xl font-bold leading-[1.15] tracking-normal text-[#1f2c24] sm:text-4xl">
              Vacation rental management shaped by place.
            </h2>
            <p className="mt-5 text-base leading-7 text-stone-600">
              A pool cabin near Pigeon Forge and a waterfront home on Lake Norman should not be marketed or operated the same way. Our approach starts with the property’s real destination, guest, and seasonality.
            </p>
          </div>

          <div className="mt-12 grid gap-7 lg:grid-cols-2">
            {MARKETS.map((market) => (
              <article key={market.title} className="overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-[0_18px_50px_rgba(60,65,55,0.08)]">
                <div className="relative aspect-[16/9] overflow-hidden bg-stone-200">
                  <Image src={market.image} alt={market.alt} fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover transition duration-700 hover:scale-[1.03]" />
                </div>
                <div className="p-7 sm:p-9">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#607054]">{market.eyebrow}</p>
                  <h3 className="mt-3 text-3xl font-bold tracking-normal text-[#233329]">{market.title}</h3>
                  <p className="mt-4 text-sm leading-6 text-stone-600">{market.body}</p>
                  <Link href={market.href} className="group mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#40513a]">
                    {market.link}
                    <Icon name="arrow" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-16 rounded-[2rem] border border-stone-200 bg-white p-7 shadow-[0_18px_50px_rgba(60,65,55,0.06)] sm:p-10">
            <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:gap-14">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#607054]">Smokies and lake service areas</p>
                <h2 className="mt-4 text-3xl font-bold leading-[1.15] tracking-normal text-[#1f2c24]">
                  Local property management should reflect the destination.
                </h2>
                <p className="mt-4 text-sm leading-7 text-stone-600">
                  Search demand, guest expectations, access, amenities, and seasonality change from one community to the next. We build the operating plan around those differences.
                </p>
              </div>

              <div className="grid gap-x-8 gap-y-7 sm:grid-cols-2">
                {LOCAL_MARKETS.map((market, index) => (
                  <article key={market.title} className={index === LOCAL_MARKETS.length - 1 ? "sm:col-span-2" : ""}>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-[#91a086]">{String(index + 1).padStart(2, "0")}</span>
                      <h3 className="text-base font-extrabold text-[#233329]">{market.title}</h3>
                    </div>
                    <p className="mt-2 border-l border-[#d7dfd0] pl-8 text-sm leading-6 text-stone-600">{market.text}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden bg-white py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="grid items-end gap-8 lg:grid-cols-[1fr_0.72fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#607054]">A clear start</p>
              <h2 className="mt-4 max-w-3xl text-3xl font-bold leading-[1.15] tracking-normal text-[#1f2c24] sm:text-4xl">
                From first conversation to guest-ready management.
              </h2>
            </div>
            <p className="max-w-xl text-base leading-7 text-stone-600 lg:justify-self-end">
              No one-size-fits-all promises. We begin with the property, build the right operating plan, and make the transition understandable.
            </p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {PROCESS.map((item) => (
              <article key={item.step} className="relative rounded-2xl border border-stone-200 bg-[#fbfaf7] p-6">
                <span className="text-4xl font-bold tracking-normal text-[#ccd6c4]">{item.step}</span>
                <h3 className="mt-7 text-lg font-extrabold text-[#233329]">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-stone-600">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f2eee5] py-20 md:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:gap-20 lg:px-10">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#607054]">Why Nirvana Luxe</p>
            <h2 className="mt-4 text-3xl font-bold leading-[1.15] tracking-normal text-[#1f2c24] sm:text-4xl">
              Close enough to notice. Experienced enough to act.
            </h2>
            <p className="mt-5 text-base leading-7 text-stone-600">
              We are operators and hosts, not a distant call center. Our own guest experience informs how we position homes, solve stay issues, coordinate care, and communicate with owners.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                ["Local context", "Plans shaped around the real demand and operating needs of each destination."],
                ["Selective portfolio", "Attention stays on homes where our service and hospitality standards are a strong fit."],
                ["Real communication", "Direct, practical updates instead of layers of anonymous support."],
                ["Owner-minded care", "Decisions balance guest satisfaction with the long-term health of the property."],
              ].map(([title, text]) => (
                <div key={title} className="rounded-2xl bg-white/75 p-5">
                  <h3 className="font-extrabold text-[#233329]">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-stone-600">{text}</p>
                </div>
              ))}
            </div>
            <Link href="/about" className="group mt-7 inline-flex items-center gap-2 text-sm font-bold text-[#40513a] underline decoration-[#aab99e] underline-offset-4">
              Learn about Nirvana Luxe
              <Icon name="arrow" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] bg-stone-200 shadow-[0_25px_60px_rgba(55,68,52,0.13)]">
            <Image
              src="/data/ShoresideOasis/116Mcnaron-31_41_11zon.webp"
              alt="Bright sunroom in a managed Lake Norman waterfront vacation home"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      <section className="bg-white py-20 md:py-28">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 sm:px-8 lg:grid-cols-[0.62fr_1fr] lg:gap-20 lg:px-10">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#607054]">Owner questions</p>
            <h2 className="mt-4 text-3xl font-bold leading-[1.15] tracking-normal text-[#1f2c24] sm:text-4xl">
              Vacation rental management FAQs.
            </h2>
            <p className="mt-5 text-base leading-7 text-stone-600">
              A straightforward starting point for owners considering professional management in Tennessee or North Carolina.
            </p>
          </div>

          <div className="divide-y divide-stone-200 border-y border-stone-200">
            {PROPERTY_MANAGEMENT_FAQS.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div key={faq.question}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={`property-management-faq-${index}`}
                    onClick={() => setOpenFaq(isOpen ? -1 : index)}
                    className="flex w-full items-center justify-between gap-6 py-6 text-left"
                  >
                    <span className="text-base font-extrabold text-[#233329] sm:text-lg">{faq.question}</span>
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#edf1e9] text-[#526247] transition ${isOpen ? "rotate-180" : ""}`}>
                      <Icon name="chevron" className="h-4 w-4" />
                    </span>
                  </button>
                  <div
                    id={`property-management-faq-${index}`}
                    className={`grid transition-[grid-template-rows] duration-300 ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
                  >
                    <div className="overflow-hidden">
                      <p className="max-w-2xl pb-6 pr-10 text-sm leading-7 text-stone-600">{faq.answer}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="owner-consultation" className="scroll-mt-28 bg-[#e7ede1] py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 lg:px-10">
          <div className="overflow-hidden rounded-[2rem] border border-[#cbd5c3] bg-white shadow-[0_30px_80px_rgba(53,67,50,0.12)]">
            <div className="grid lg:grid-cols-[0.82fr_1.18fr]">
              <div className="relative overflow-hidden bg-[#233329] p-8 text-white sm:p-10 lg:p-12">
                <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#6d8262]/30 blur-3xl" />
                <p className="relative text-xs font-bold uppercase tracking-[0.2em] text-[#c9d7bf]">Let’s talk about your home</p>
                <h2 className="relative mt-4 text-3xl font-bold leading-[1.15] tracking-normal sm:text-4xl">
                  Let’s map the right operating plan for your home.
                </h2>
                <p className="relative mt-5 text-sm leading-7 text-stone-300">
                  Share a few details and we’ll take a practical look at the property, market, current setup, and whether Nirvana Luxe is the right management partner.
                </p>

                <div className="relative mt-9 space-y-4 border-t border-white/15 pt-7 text-sm">
                  <a href="tel:+17047801368" className="flex items-center gap-3 font-bold hover:text-[#d9e5d0]">
                    <Icon name="phone" className="h-5 w-5 text-[#b8c9ad]" />
                    (704) 780-1368
                  </a>
                  <a href="mailto:reservations@vkr-ventures.com" className="break-all font-bold text-stone-200 hover:text-white">
                    reservations@vkr-ventures.com
                  </a>
                </div>
              </div>

              <div className="p-7 sm:p-10 lg:p-12">
                <PropertyInquiryForm />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 p-3 shadow-[0_-12px_30px_rgba(0,0,0,0.08)] backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-lg gap-2">
          <a href="tel:+17047801368" className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-stone-200 px-4 py-3 text-xs font-bold text-stone-800">
            <Icon name="phone" className="h-4 w-4 text-[#607054]" />
            Call owner team
          </a>
          <a href="#owner-consultation" className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#233329] px-4 py-3 text-xs font-bold text-white">
            Management plan
            <Icon name="arrow" className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
