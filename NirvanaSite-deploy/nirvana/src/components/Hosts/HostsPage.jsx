'use client';

import React, { useEffect, useRef } from "react";
import Image from "next/image";
import {
  FaChartLine,
  FaHome,
  FaSearchDollar,
  FaHandshake,
  FaCalendarCheck,
  FaChartBar,
  FaBroom,
  FaMoneyCheckAlt,
  FaTools,
  FaFileContract,
  FaCheckCircle,
  FaMapMarkerAlt,
  FaArrowRight,
  FaListAlt,
  FaComments,
  FaConciergeBell,
  FaUserCheck,
  FaStar,
  FaBoxOpen,
  FaShieldAlt,
  FaWrench,
  FaCamera,
  FaPercentage,
  FaClipboardList,
} from "react-icons/fa";
import ContactForm from "../Contact/ContactForm";

/* ─── Data ────────────────────────────────────────────── */

const stats = [
  { value: "100%", label: "Hands-Free" },
  { value: "24/7", label: "Guest Support" },
  { value: "15+", label: "Services Included" },
  { value: "2", label: "Prime Markets" },
];

const acquisitionBullets = [
  { icon: FaSearchDollar, label: "Market analysis & deal sourcing" },
  { icon: FaChartLine, label: "Cash-flow & ROI underwriting" },
  { icon: FaHome, label: "Property acquisition support" },
  { icon: FaHandshake, label: "Furnishing to first booking" },
];

const managementBullets = [
  { icon: FaCalendarCheck, label: "Full booking management" },
  { icon: FaChartBar, label: "Dynamic pricing optimization" },
  { icon: FaBroom, label: "Cleaning & turnover ops" },
  { icon: FaWrench, label: "Preventive maintenance" },
  { icon: FaComments, label: "24/7 guest communication" },
  { icon: FaMoneyCheckAlt, label: "Monthly owner reporting" },
];

const serviceCategories = [
  {
    title: "Marketing & Revenue",
    icon: FaChartBar,
    items: [
      "Omnichannel OTA listing management",
      "Dynamic daily pricing & yield management",
      "Professional photography & styling",
      "SEO & algorithmic ranking optimization"
    ]
  },
  {
    title: "Guest Experience",
    icon: FaConciergeBell,
    items: [
      "24/7 dedicated guest communication",
      "Seamless check-in/out coordination",
      "Personalized digital guest guidebooks",
      "Proactive review & reputation management"
    ]
  },
  {
    title: "Property Care",
    icon: FaTools,
    items: [
      "Elite cleaning & turnover coordination",
      "Linen, towel & premium restocking",
      "Regular preventive maintenance checks",
      "Pre & post-stay property inspections"
    ]
  },
  {
    title: "Owner Partnership",
    icon: FaHandshake,
    items: [
      "Transparent monthly financial reporting",
      "Dedicated owner dashboard access",
      "Regulatory & tax compliance support",
      "Direct line to your account manager"
    ]
  }
];

const processSteps = [
  {
    step: "1",
    title: "Discovery & Analysis",
    desc: "We analyze your property's potential, running data-driven comp sets and revenue projections to establish goals."
  },
  {
    step: "2",
    title: "Onboarding & Prep",
    desc: "We optimize your listing, coordinate professional photography, and integrate your property into our software."
  },
  {
    step: "3",
    title: "Go-Live & Manage",
    desc: "Your property goes live. We handle all guest communications, dynamic pricing, cleanings, and maintenance."
  },
  {
    step: "4",
    title: "Passive Returns",
    desc: "You receive direct payouts and transparent monthly reports while your property appreciates in value."
  }
];

/* ─── Component ───────────────────────────────────────── */

const HostsPage = () => {
  const heroRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      const y = window.pageYOffset;
      if (heroRef.current) {
        heroRef.current.style.backgroundPositionY = `calc(50% + ${y / 2}px)`;
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      {/* ═══════════════ HERO + STAT STRIP (fits one viewport) ═══════════════ */}
      <div className="flex flex-col" style={{ minHeight: 'calc(100svh - var(--site-header-height))' }}>
        <div
          ref={heroRef}
          className="relative flex-1 w-full overflow-hidden bg-cover bg-center"
          style={{ backgroundImage: `url(/assets/hosts-hero.png)` }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70 flex flex-col items-center justify-center text-center px-5 sm:px-6 pt-8 sm:pt-12">
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.22em] sm:tracking-[0.3em] text-accent mb-3 sm:mb-5">
              For Investors &amp; Existing Property Owners
            </p>
            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white drop-shadow-lg max-w-4xl leading-[1.05] sm:leading-tight">
              Your Property.
              <br />
              <span className="text-accent">Our Expertise.</span>
            </h1>
            <p className="mt-3 sm:mt-6 text-sm sm:text-lg text-gray-300 max-w-2xl leading-relaxed">
              Looking for your next investment? Or need elite management for a property you already own? We seamlessly handle both.
            </p>
            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto px-4 sm:px-0">
              <a
                href="#inquiry-form"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-accent text-white font-bold text-xs sm:text-sm uppercase tracking-widest px-6 sm:px-8 py-3 sm:py-4 hover:bg-primary transition-all duration-300 shadow-lg"
              >
                Manage My Property
              </a>
              <a
                href="#inquiry-form"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm border border-white/30 text-white font-bold text-xs sm:text-sm uppercase tracking-widest px-6 sm:px-8 py-3 sm:py-4 hover:bg-white hover:text-gray-900 transition-all duration-300 shadow-lg"
              >
                I Want To Invest
              </a>
            </div>
          </div>
        </div>

        {/* ═══════════════ STAT STRIP ═══════════════ */}
        <div className="bg-primary shrink-0">
          <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10">
            {stats.map((s) => (
              <div key={s.label} className="py-5 sm:py-8 text-center">
                <div className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-accent">{s.value}</div>
                <div className="text-[10px] sm:text-xs uppercase tracking-widest text-gray-400 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════ PILLAR 1 — ACQUISITION ═══════════════ */}
      <section className="w-full bg-white py-16 sm:py-24 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 flex flex-col lg:flex-row items-center gap-8 sm:gap-12 lg:gap-20">
          <div className="w-full lg:w-1/2 rounded-2xl sm:rounded-[2rem] overflow-hidden shadow-xl sm:shadow-2xl">
            <Image
              src="/assets/hosts-acquisition.png"
              alt="Property acquisition and investment analysis"
              width={700}
              height={500}
              className="w-full h-auto object-cover"
            />
          </div>
          <div className="w-full lg:w-1/2 space-y-4 sm:space-y-6">
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-accent/10 text-accent text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-3">For New Investors</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 leading-snug">
              Property Acquisition
              <br />
              &amp; Development
            </h2>
            <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
              We find high-yield properties, crunch the numbers, and help you close —
              ensuring positive cash flows and growing investment value.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-1 sm:pt-2">
              {acquisitionBullets.map((b) => (
                <div key={b.label} className="flex items-center gap-3">
                  <div className="grid h-8 w-8 sm:h-9 sm:w-9 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent text-sm">
                    <b.icon />
                  </div>
                  <span className="text-sm font-medium text-gray-700">{b.label}</span>
                </div>
              ))}
            </div>

            <div className="pt-3 sm:pt-5">
              <p className="text-sm sm:text-[0.95rem] text-gray-600 leading-relaxed border-l-2 border-accent pl-4 py-1">
                <span className="text-gray-900 font-bold">Seamless Transition:</span> Once your property is acquired, you have the option to seamlessly transition into our end-to-end management program to start generating returns on day one.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ PILLAR 2 — MANAGEMENT ═══════════════ */}
      <section className="w-full bg-slate-50 py-16 sm:py-24 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 flex flex-col lg:flex-row-reverse items-center gap-8 sm:gap-12 lg:gap-20">
          <div className="w-full lg:w-1/2 rounded-2xl sm:rounded-[2rem] overflow-hidden shadow-xl sm:shadow-2xl">
            <Image
              src="/assets/hosts-management-v3.png"
              alt="End-to-end vacation rental property management"
              width={700}
              height={500}
              className="w-full h-auto object-cover"
            />
          </div>
          <div className="w-full lg:w-1/2 space-y-4 sm:space-y-6">
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-3">For Existing Owners &amp; New Investors</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 leading-snug">
              End-to-End Property
              <br />
              Management
            </h2>
            <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
              From guest messaging and dynamic pricing to cleaning and maintenance —
              we run your rental like a business so you don&rsquo;t have to.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-1 sm:pt-2">
              {managementBullets.map((b) => (
                <div key={b.label} className="flex items-center gap-3">
                  <div className="grid h-8 w-8 sm:h-9 sm:w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary text-sm">
                    <b.icon />
                  </div>
                  <span className="text-sm font-medium text-gray-700">{b.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-5 sm:px-6 py-16 sm:py-24 space-y-16 sm:space-y-28">

        {/* ═══════════════ PM SERVICES GRID (REFINED) ═══════════════ */}
        <section className="space-y-8 sm:space-y-12">
          <div className="text-center max-w-2xl mx-auto px-4">
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-accent mb-2 sm:mb-3">Comprehensive Care</p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
              Full-Service Management
            </h2>
            <p className="mt-4 text-gray-600 text-sm sm:text-base">We handle every detail of your investment, so you can enjoy the returns without the headaches.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-5xl mx-auto">
            {serviceCategories.map((cat, idx) => (
              <div key={idx} className="bg-white rounded-2xl sm:rounded-[2rem] p-6 sm:p-10 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                <div className="flex items-center gap-4 mb-6">
                  <div className="grid h-12 w-12 sm:h-14 sm:w-14 place-items-center rounded-xl sm:rounded-2xl bg-slate-50 text-accent text-xl sm:text-2xl group-hover:bg-accent group-hover:text-white transition-colors duration-300">
                    <cat.icon />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900">{cat.title}</h3>
                </div>
                <ul className="space-y-3 sm:space-y-4">
                  {cat.items.map((item, itemIdx) => (
                    <li key={itemIdx} className="flex items-start gap-3">
                      <FaCheckCircle className="text-accent shrink-0 text-sm sm:text-base mt-1" />
                      <span className="text-sm sm:text-[0.95rem] text-gray-700 leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════════ HOW IT WORKS ═══════════════ */}
        <section className="space-y-8 sm:space-y-12 pt-6 sm:pt-10">
          <div className="text-center max-w-2xl mx-auto px-4">
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-accent mb-2 sm:mb-3">The Roadmap</p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
              Your Path to Passive Income
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 max-w-6xl mx-auto">
            {processSteps.map((step, idx) => (
              <div key={idx} className="relative bg-white p-8 rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden group">
                <div className="absolute -right-4 -top-6 text-[8rem] font-black text-slate-50 group-hover:text-accent/5 transition-colors duration-500 z-0 select-none">
                  {step.step}
                </div>
                <div className="relative z-10">
                  <h4 className="font-bold text-gray-900 text-lg mb-3">{step.title}</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════════ MARKETS ═══════════════ */}
        <section className="space-y-6 sm:space-y-10">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-accent mb-2 sm:mb-3">Our Markets</p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
              Where We Specialize
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-8 max-w-4xl mx-auto">
            {[
              {
                region: "Sevierville, Gatlinburg & Pigeon Forge",
                tagline: "Great Smoky Mountains",
                desc: "Top-performing STR market. High year-round tourist demand, strong ADR, and exceptional appreciation.",
                gradient: "from-emerald-500/20 to-accent/10",
              },
              {
                region: "Charlotte Region, NC",
                tagline: "Lake Norman & Metro",
                desc: "Rapidly growing metro with Lake Norman waterfront opportunities — ideal for premium vacation rentals.",
                gradient: "from-primary/10 to-slate-200/50",
              },
            ].map((m) => (
              <div
                key={m.region}
                className={`relative rounded-2xl sm:rounded-[2rem] border border-slate-100 bg-gradient-to-br ${m.gradient} p-6 sm:p-8 md:p-10 space-y-3 shadow-sm overflow-hidden`}
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 sm:h-11 sm:w-11 place-items-center rounded-full bg-white/80 text-accent text-base sm:text-lg shadow-sm">
                    <FaMapMarkerAlt />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900">{m.region}</h3>
                    <p className="text-xs sm:text-sm text-accent font-semibold">{m.tagline}</p>
                  </div>
                </div>
                <p className="text-sm sm:text-[0.95rem] text-gray-600 leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════════ WHY NIRVANALUXE ═══════════════ */}
        <section className="relative bg-primary rounded-2xl sm:rounded-[2rem] p-8 sm:p-10 md:p-16 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(96,189,104,0.15),transparent_60%)]" />
          <div className="relative z-10 text-center max-w-3xl mx-auto space-y-8 sm:space-y-10">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
              Why Hosts Choose Us
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10">
              {[
                {
                  icon: FaChartLine,
                  title: "Investment-First",
                  desc: "Every decision maximizes your cash flow and property value.",
                },
                {
                  icon: FaFileContract,
                  title: "Fully Transparent",
                  desc: "No hidden fees. Clear monthly reports. Always.",
                },
                {
                  icon: FaTools,
                  title: "Zero Hassle",
                  desc: "You own the asset. We run the business — 24/7.",
                },
              ].map((item) => (
                <div key={item.title} className="space-y-3 sm:space-y-4">
                  <div className="grid h-12 w-12 sm:h-14 sm:w-14 mx-auto place-items-center rounded-2xl bg-accent/20 text-accent text-xl sm:text-2xl">
                    <item.icon />
                  </div>
                  <h4 className="font-bold text-white text-base sm:text-lg">{item.title}</h4>
                  <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════ INQUIRY FORM ═══════════════ */}
        <section id="inquiry-form" className="scroll-mt-24 space-y-6 sm:space-y-10 pb-6 sm:pb-10">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-accent mb-2 sm:mb-3">Get In Touch</p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
              Ready to Partner With Us?
            </h2>
          </div>
          <ContactForm />
        </section>
      </div>
    </div>
  );
};

export default HostsPage;
