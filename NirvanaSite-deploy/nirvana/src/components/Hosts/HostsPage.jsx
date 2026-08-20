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
  FaFileInvoiceDollar,
  FaCalculator,
  FaCoins,
  FaInfoCircle,
} from "react-icons/fa";
import ContactForm from "../Contact/ContactForm";

/* ─── Data ────────────────────────────────────────────── */

const stats = [
  { value: "100%", label: "Hands-Free" },
  { value: "24/7", label: "Guest Support" },
  { value: "15+", label: "Services Included" },
  { value: "2", label: "Prime Markets" },
];

const taxBenefits = [
  {
    icon: FaPercentage,
    tag: "IRS Reg. § 1.469-1T",
    title: "The 7-Day STR Classification",
    desc: "Properties with an average guest stay of 7 days or less are classified as active business activities rather than passive rentals, bypassing standard passive loss limitations when qualifying under material participation."
  },
  {
    icon: FaCalculator,
    tag: "Cost Segregation",
    title: "Accelerated Bonus Depreciation",
    desc: "A specialized cost segregation study separates 20% to 30%+ of the property's purchase basis (furnishings, luxury amenities, lighting, hot tubs, landscaping) for accelerated first-year write-offs."
  },
  {
    icon: FaFileInvoiceDollar,
    tag: "Income Sheltering",
    title: "Offset Active & Ordinary Income",
    desc: "Unlike standard long-term rentals capped by passive activity rules, non-cash paper losses from qualifying STRs can directly offset active W-2 earnings, 1099 income, and K-1 business distributions."
  },
  {
    icon: FaChartLine,
    tag: "Dual Returns",
    title: "Cash Flow + Equity Appreciation",
    desc: "Generate tangible high-yield rental returns and long-term equity growth while shielding high ordinary income from immediate tax burdens on paper."
  }
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
    <div className="min-h-screen bg-[#f4f3ee] font-sans text-slate-800">
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

      {/* ═══════════════ TAX ADVANTAGE & BONUS DEPRECIATION (SECTION 1) ═══════════════ */}
      <section className="relative w-full overflow-hidden bg-white py-16 sm:py-24 border-b border-slate-200/60">
        <div className="pointer-events-none absolute -left-28 top-0 h-96 w-96 rounded-full bg-accent/[0.04] blur-3xl" />
        <div className="pointer-events-none absolute right-0 bottom-0 h-96 w-96 rounded-full bg-[#424334]/[0.03] blur-3xl" />

        <div className="max-w-7xl mx-auto px-5 sm:px-6 space-y-12 sm:space-y-16">
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/25 text-accent text-[11px] font-bold uppercase tracking-widest mb-4 shadow-xs">
              <FaCoins className="text-xs" />
              Tax Optimization &amp; Wealth Strategy
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-[-0.02em] text-slate-950 leading-tight">
              Unlock Potential Tax Breaks With <br className="hidden sm:inline" />
              <span className="text-accent">Short-Term Rental Investments</span>
            </h2>
            <p className="mt-4 text-sm sm:text-base md:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
              Short-term rentals hold a distinct advantage under IRS guidelines. High earners can leverage accelerated bonus depreciation and active participation rules to shelter income while building equity in premier cash-flowing vacation homes.
            </p>
          </div>

          {/* 4 Pillars Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {taxBenefits.map((item, idx) => (
              <div
                key={idx}
                className="group relative rounded-2xl border border-slate-200/80 bg-[#fbfaf8] p-6 sm:p-7 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_16px_36px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent/10 text-accent text-lg group-hover:bg-accent group-hover:text-white transition-colors duration-300 shadow-xs">
                      <item.icon />
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-semibold tracking-wider uppercase text-slate-700 bg-white border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.04)] group-hover:border-accent/40 group-hover:text-accent transition-colors duration-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
                      {item.tag}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2.5 leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ HYPOTHETICAL CASE STUDY (SEPARATE CENTERED SECTION) ═══════════════ */}
      <section className="relative w-full overflow-hidden bg-[#faf9f6] py-16 sm:py-24 border-b border-slate-200/60">
        <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-accent/[0.04] blur-3xl" />
        <div className="pointer-events-none absolute -left-28 bottom-0 h-96 w-96 rounded-full bg-[#424334]/[0.03] blur-3xl" />

        <div className="max-w-7xl mx-auto px-5 sm:px-6 space-y-10 sm:space-y-12">
          {/* Centered Section Header */}
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/25 text-accent text-[11px] font-bold uppercase tracking-widest mb-4 shadow-xs">
              <FaCalculator className="text-xs" />
              Hypothetical Case Study
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-[-0.02em] text-slate-950 leading-tight">
              First-Year Depreciation Impact
            </h2>
            <p className="mt-4 text-sm sm:text-base md:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
              A practical breakdown demonstrating how accelerated bonus depreciation and cost segregation can shelter active taxable income in Year 1.
            </p>
          </div>

          {/* Centered Calculation Card */}
          <div className="max-w-5xl mx-auto rounded-2xl sm:rounded-[2rem] border border-slate-200/90 bg-white p-6 sm:p-10 shadow-[0_12px_40px_rgba(0,0,0,0.04)]">
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-accent">Active Tax Shield Breakdown</span>
                  <div className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">Asset Depreciation &amp; Income Offset</div>
                </div>
                <div className="inline-flex items-center gap-2 self-start sm:self-auto px-4 py-2 rounded-full bg-[#111827] text-white text-xs font-semibold shadow-sm border border-slate-800 whitespace-nowrap">
                  <span className="text-slate-400">Sample Property:</span>
                  <span className="text-accent font-bold">$1,000,000</span>
                </div>
              </div>

              {/* Rows with bulletproof vertical & horizontal alignment */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 p-4 rounded-xl bg-[#fbfaf8] border border-slate-200/70 shadow-xs">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Sample Adjusted Gross Taxable Income (Individual / Married Couple or Co-Investors)</div>
                    <div className="text-xs text-slate-500 leading-relaxed mt-0.5">
                      Applicable for an <span className="font-semibold text-slate-800">individual</span> or <span className="font-semibold text-slate-800">married couple</span> with <span className="font-bold text-slate-900">$400k</span> in combined income (<span className="font-semibold text-accent">W-2 and/or 1099 and/or K-1</span>), or <span className="font-semibold text-slate-800">co-investors</span> pooling capital
                    </div>
                  </div>
                  <span className="inline-flex items-center px-3 py-1 rounded-lg bg-white border border-slate-200/80 text-xs sm:text-sm font-bold text-slate-900 sm:text-right shrink-0 whitespace-nowrap shadow-xs">
                    $400,000 Total
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 p-4 rounded-xl bg-[#fbfaf8] border border-slate-200/70 shadow-xs">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Estimated Cost Segregation Reclassification (25% Basis)</div>
                    <div className="text-xs text-slate-500">Fixtures, luxury furniture, hot tubs, audio/gaming, and specialized landscaping</div>
                  </div>
                  <span className="inline-flex items-center px-3 py-1 rounded-lg bg-white border border-slate-200/80 text-xs sm:text-sm font-bold text-slate-900 sm:text-right shrink-0 whitespace-nowrap shadow-xs">
                    $250,000 Basis
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 p-4 rounded-xl bg-[#fbfaf8] border border-slate-200/70 shadow-xs">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Estimated First-Year Accelerated Write-Off (Offsetting Active Income)</div>
                    <div className="text-xs text-slate-500">Accelerated non-cash paper depreciation shielding active taxable income in Year 1</div>
                  </div>
                  <span className="inline-flex items-center px-3 py-1 rounded-lg bg-accent/10 border border-accent/25 text-xs sm:text-sm font-bold text-accent sm:text-right shrink-0 whitespace-nowrap">
                    -$250,000 Deduction
                  </span>
                </div>

                {/* Highlighted Result Box */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-5 rounded-xl bg-primary text-white shadow-md">
                  <div>
                    <div className="text-sm sm:text-base font-bold text-white">Estimated Federal Tax Savings</div>
                    <div className="text-xs text-slate-300">Sheltering $250,000 of active income at ~37% top federal marginal bracket (~$46.25k per partner if 2 co-investors)</div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-accent sm:text-right shrink-0 whitespace-nowrap">
                    ~$92,500 Saved
                  </div>
                </div>
              </div>

              {/* Small Concise Disclaimer */}
              <div className="flex items-start gap-2.5 text-[11px] sm:text-xs text-slate-500 pt-1">
                <FaInfoCircle className="text-slate-400 shrink-0 text-sm mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Notice:</strong> Sample calculation for educational purposes. Actual write-offs and tax benefits vary based on cost segregation studies, purchase date, personal tax bracket, and IRS rules. Consult your CPA.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ PILLAR 1 — ACQUISITION ═══════════════ */}
      <section className="relative w-full overflow-hidden bg-[#f5f2ea] py-16 sm:py-24">
        <div className="pointer-events-none absolute -right-32 top-10 h-80 w-80 rounded-full border border-[#424334]/10" />
        <div className="pointer-events-none absolute -right-20 top-24 h-56 w-56 rounded-full border border-[#424334]/10" />
        <div className="max-w-7xl mx-auto px-5 sm:px-6 flex flex-col lg:flex-row items-center gap-8 sm:gap-12 lg:gap-20">
          <div className="relative w-full lg:w-1/2">
            <div className="absolute -bottom-4 -left-4 hidden h-full w-full rounded-[2rem] border border-[#424334]/15 sm:block" />
            <div className="relative overflow-hidden rounded-2xl shadow-[0_24px_70px_rgba(32,35,29,0.16)] sm:rounded-[2rem]">
            <Image
              src="/assets/hosts-acquisition.png"
              alt="Property acquisition and investment analysis"
              width={1024}
              height={1024}
              className="h-auto w-full object-contain"
            />
            </div>
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
      <section className="relative w-full overflow-hidden bg-white py-16 sm:py-24">
        <div className="pointer-events-none absolute -left-36 bottom-0 h-96 w-96 rounded-full bg-accent/[0.045] blur-3xl" />
        <div className="max-w-7xl mx-auto px-5 sm:px-6 flex flex-col lg:flex-row-reverse items-center gap-8 sm:gap-12 lg:gap-20">
          <div className="relative w-full lg:w-1/2">
            <div className="absolute -right-4 -top-4 hidden h-full w-full rounded-[2rem] bg-[#eef0eb] sm:block" />
            <div className="relative overflow-hidden rounded-2xl shadow-[0_24px_70px_rgba(15,23,42,0.14)] sm:rounded-[2rem]">
            <Image
              src="/assets/hosts-management-v3.png"
              alt="End-to-end vacation rental property management"
              width={1024}
              height={1024}
              className="h-auto w-full object-contain"
            />
            </div>
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

      <div>

        {/* ═══════════════ PM SERVICES GRID (REFINED) ═══════════════ */}
        <section className="relative overflow-hidden bg-[#1c1e19] py-20 sm:py-28">
          <div className="pointer-events-none absolute left-1/2 top-0 h-[30rem] w-[55rem] -translate-x-1/2 rounded-full bg-[#424334]/35 blur-[120px]" />
          <div className="relative mx-auto max-w-7xl space-y-10 px-5 sm:space-y-14 sm:px-6">
          <div className="text-center max-w-2xl mx-auto px-4">
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.24em] text-accent mb-2 sm:mb-3">Comprehensive Care</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-[-0.02em]">
              Full-Service Management
            </h2>
            <p className="mt-4 text-white/60 text-sm leading-7 sm:text-base">We handle every detail of your investment, so you can enjoy the returns without the headaches.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-5xl mx-auto">
            {serviceCategories.map((cat, idx) => (
              <div key={idx} className="group rounded-2xl border border-white/10 bg-white/[0.055] p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.085] sm:rounded-[2rem] sm:p-10">
                <div className="flex items-center gap-4 mb-6">
                  <div className="grid h-12 w-12 sm:h-14 sm:w-14 place-items-center rounded-xl sm:rounded-2xl bg-accent/15 text-accent text-xl sm:text-2xl group-hover:bg-accent group-hover:text-white transition-colors duration-300">
                    <cat.icon />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white">{cat.title}</h3>
                </div>
                <ul className="space-y-3 sm:space-y-4">
                  {cat.items.map((item, itemIdx) => (
                    <li key={itemIdx} className="flex items-start gap-3">
                      <FaCheckCircle className="text-accent shrink-0 text-sm sm:text-base mt-1" />
                      <span className="text-sm sm:text-[0.95rem] text-white/70 leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          </div>
        </section>

        {/* ═══════════════ HOW IT WORKS ═══════════════ */}
        <section className="bg-[#eef0eb] py-20 sm:py-28">
          <div className="mx-auto max-w-7xl space-y-10 px-5 sm:space-y-14 sm:px-6">
          <div className="text-center max-w-2xl mx-auto px-4">
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.24em] text-accent mb-2 sm:mb-3">The Roadmap</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-[-0.02em] text-slate-950">
              Your Path to Passive Income
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">A clear, accountable process from first conversation to consistent owner returns.</p>
          </div>

          <div className="relative grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-4 lg:gap-0 max-w-6xl mx-auto">
            <div className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-8 hidden h-px bg-[#424334]/20 lg:block" />
            {processSteps.map((step, idx) => (
              <div key={idx} className="group relative px-1 lg:px-5">
                <div className="relative rounded-2xl border border-white bg-white/70 p-7 shadow-[0_12px_35px_rgba(15,23,42,0.05)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-[0_20px_50px_rgba(15,23,42,0.09)] lg:min-h-64 lg:pt-16">
                  <div className="absolute right-5 top-5 text-5xl font-black text-[#424334]/[0.055] select-none lg:right-6 lg:top-10 lg:text-7xl">{step.step}</div>
                  <div className="relative z-10">
                    <div className="mb-5 grid h-10 w-10 place-items-center rounded-full bg-[#424334] text-xs font-bold text-white ring-8 ring-[#eef0eb] lg:absolute lg:-top-[4.5rem] lg:left-0">0{step.step}</div>
                    <h4 className="font-bold text-slate-950 text-lg mb-3">{step.title}</h4>
                    <p className="text-sm text-slate-600 leading-7">{step.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          </div>
        </section>

        {/* ═══════════════ MARKETS ═══════════════ */}
        <section className="relative overflow-hidden bg-white py-20 sm:py-28">
          <div className="pointer-events-none absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-[#f5f2ea] to-transparent" />
          <div className="relative mx-auto max-w-7xl space-y-8 px-5 sm:space-y-12 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.24em] text-accent mb-2 sm:mb-3">Our Markets</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-[-0.02em] text-slate-950">
              Where We Specialize
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-8 max-w-4xl mx-auto">
            {[
              {
                region: "Sevierville, Gatlinburg & Pigeon Forge",
                tagline: "Great Smoky Mountains",
                desc: "Top-performing STR market. High year-round tourist demand, strong ADR, and exceptional appreciation.",
                number: "01",
                gradient: "from-[#edf4e9] to-[#f8f6ef]",
              },
              {
                region: "Charlotte Region, NC",
                tagline: "Lake Norman & Lake Wylie",
                desc: "Rapidly growing metro with Lake Norman and Lake Wylie waterfront opportunities — ideal for premium vacation rentals.",
                number: "02",
                gradient: "from-[#ecefe9] to-[#f5f2ea]",
              },
            ].map((m) => (
              <div
                key={m.region}
                className={`group relative min-h-64 overflow-hidden rounded-2xl border border-slate-200/70 bg-gradient-to-br ${m.gradient} p-7 shadow-[0_14px_40px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_55px_rgba(15,23,42,0.1)] sm:rounded-[2rem] sm:p-10`}
              >
                <span className="absolute right-5 top-0 text-[6rem] font-black leading-none text-[#424334]/[0.055] sm:right-8 sm:text-[8rem]">{m.number}</span>
                <div className="relative flex items-start gap-4">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#424334] text-white text-base shadow-lg sm:h-12 sm:w-12 sm:text-lg">
                    <FaMapMarkerAlt />
                  </div>
                  <div>
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-accent sm:text-xs">{m.tagline}</p>
                    <h3 className="max-w-sm text-xl font-bold leading-snug text-slate-950 sm:text-2xl">{m.region}</h3>
                  </div>
                </div>
                <p className="relative mt-7 max-w-lg border-t border-[#424334]/10 pt-5 text-sm leading-7 text-slate-600 sm:text-[0.95rem]">{m.desc}</p>
              </div>
            ))}
          </div>
          </div>
        </section>

        {/* ═══════════════ WHY NIRVANALUXE ═══════════════ */}
        <section className="relative overflow-hidden bg-[#424334] py-20 sm:py-28">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.1),transparent_45%)]" />
          <div className="pointer-events-none absolute -bottom-44 -left-24 h-96 w-96 rounded-full border border-white/10" />
          <div className="relative z-10 mx-auto max-w-5xl space-y-10 px-5 text-center sm:space-y-14 sm:px-6">
            <div>
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.24em] text-accent sm:text-xs">The Nirvana Standard</p>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-[-0.02em] text-white">
              Why Investors Choose Us
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 md:grid-cols-3 sm:rounded-[2rem]">
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
                <div key={item.title} className="space-y-4 bg-[#424334]/95 p-8 transition-colors duration-300 hover:bg-white/[0.06] sm:p-10">
                  <div className="grid h-12 w-12 sm:h-14 sm:w-14 mx-auto place-items-center rounded-2xl border border-white/10 bg-white/10 text-accent text-xl sm:text-2xl">
                    <item.icon />
                  </div>
                  <h4 className="font-bold text-white text-base sm:text-lg">{item.title}</h4>
                  <p className="text-xs sm:text-sm text-white/60 leading-6">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════ OPERATIONAL TAX READINESS & COMPLIANCE (SECTION 2) ═══════════════ */}
        <section className="relative overflow-hidden bg-white py-20 sm:py-28 border-t border-slate-200/60">
          <div className="pointer-events-none absolute -left-36 top-0 h-96 w-96 rounded-full bg-accent/[0.045] blur-3xl" />
          <div className="pointer-events-none absolute right-0 bottom-0 h-96 w-96 rounded-full bg-[#424334]/[0.035] blur-3xl" />

          <div className="relative mx-auto max-w-7xl space-y-12 px-5 sm:space-y-16 sm:px-6">
            <div className="text-center max-w-2xl mx-auto">
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.24em] text-accent mb-2 sm:mb-3">
                Strategic Foundation
              </p>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-[-0.02em] text-slate-950">
                Operational Support for Your STR Tax Strategy
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
                Executing a compliant short-term rental tax strategy requires rigorous documentation. We provide the operational infrastructure and data logs your CPA needs.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto">
              <div className="rounded-2xl border border-slate-200/80 bg-[#fbfaf8] p-6 sm:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-md transition-all duration-300 space-y-4">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-accent/10 text-accent text-xl">
                  <FaCalendarCheck />
                </div>
                <h3 className="text-lg font-bold text-slate-950">Stay Duration Auditing</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Automated booking metrics and continuous stay-duration logging to document and maintain the IRS 7-day average stay threshold.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-[#fbfaf8] p-6 sm:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-md transition-all duration-300 space-y-4">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-accent/10 text-accent text-xl">
                  <FaFileInvoiceDollar />
                </div>
                <h3 className="text-lg font-bold text-slate-950">CapEx &amp; Asset Cataloging</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Itemized records of luxury furnishings, appliances, hot tubs, and renovations ready for immediate submission to cost segregation specialists.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-[#fbfaf8] p-6 sm:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-md transition-all duration-300 space-y-4">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-accent/10 text-accent text-xl">
                  <FaHandshake />
                </div>
                <h3 className="text-lg font-bold text-slate-950">Active Participation Oversight</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Transparent dashboards and collaborative owner approvals that keep you actively steering major asset decisions while we handle daily logistics.
                </p>
              </div>
            </div>

            {/* Comprehensive Professional Advisory & CPA Notice */}
            <div className="max-w-4xl mx-auto rounded-2xl border border-amber-200/90 bg-amber-50/70 p-6 sm:p-7 flex items-start gap-4 shadow-sm">
              <FaInfoCircle className="text-amber-700 shrink-0 text-xl mt-0.5" />
              <div className="space-y-1.5">
                <h4 className="text-sm font-bold text-amber-950">Professional Advisory Notice &amp; Compliance</h4>
                <p className="text-xs sm:text-sm text-amber-900/90 leading-relaxed">
                  Nirvana Luxe provides luxury hospitality management, property acquisition analysis, and operational reporting. Nirvana Luxe does not provide licensed tax, legal, or accounting advice. Specific tax benefits, bonus depreciation percentages, and material participation requirements depend on individual investor circumstances, tax filing status, and current IRS regulations. Always consult with a licensed CPA or tax strategist before finalizing any investment structure.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════ INQUIRY FORM ═══════════════ */}
        <section id="inquiry-form" className="scroll-mt-24 bg-[#f5f2ea] py-20 sm:py-28">
          <div className="mx-auto max-w-7xl space-y-8 px-5 sm:space-y-12 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.24em] text-accent mb-2 sm:mb-3">Get In Touch</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-[-0.02em] text-slate-950">
              Ready to Partner With Us?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">Tell us about your property or investment goals. We’ll outline the right next step for you.</p>
          </div>
          <ContactForm />
          </div>
        </section>
      </div>
    </div>
  );
};

export default HostsPage;
