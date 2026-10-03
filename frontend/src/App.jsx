import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Navbar from './components/common/Navbar';
import ProtectedRoute from './components/common/ProtectedRoute';
import RoleGuard from './components/dashboard/RoleGuard';
import LoginPage from './pages/LoginPage';
import Register from './pages/auth/Register';
import heroVideo from './assests/login/1003.mp4';
import logoEmblem from './assests/CampusCore Academic Emblem.png';
import MemberDashboard from './pages/dashboard/MemberDashboard';
import AdminDashboard from './pages/dashboard/AdminDashboard';
import TreasurerDashboard from './pages/dashboard/TreasurerDashboard';
import EventManagerDashboard from './pages/dashboard/EventManagerDashboard';
import VolunteerDashboard from './pages/dashboard/VolunteerDashboard';
import MerchandisePage from './pages/merchandise/MerchandisePage';
import AdminMerchandisePage from './pages/dashboard/AdminMerchandisePage';
import { GuestHome, PublicEvents, PublicEventDetails } from './pages/public';
import MembershipPage from './pages/membership/MembershipPage';
import MembershipCheckoutPage from './pages/membership/MembershipCheckoutPage';
import MembershipSuccessPage from './pages/membership/MembershipSuccessPage';
import authService from './services/auth.service';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// --- Reusable Components ---
const ScanLine = () => (
  <div className="h-[2px] w-full bg-border overflow-hidden relative">
    <div className="h-full w-1/3 bg-primary scan-line absolute left-0 top-0" />
  </div>
);

// --- Sections ---

const LandingPage = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <nav className={cn(
        "fixed top-0 w-full z-50 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
        scrolled ? "bg-background/85 backdrop-blur-md border-b border-border py-4" : "py-8 bg-transparent"
      )}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={logoEmblem}
              alt="CampusCore"
              className="w-9 h-9 object-contain drop-shadow-sm"
            />
            <span className="font-sans font-bold text-xl tracking-tight text-foreground">
              CampusCore
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8 font-mono text-[10px] uppercase tracking-[0.3em] text-muted">
            <a href="#overview" className="hover:text-primary transition-colors">Overview</a>
            <Link to="/events" className="hover:text-primary transition-colors">Events</Link>
            <Link to="/membership" className="hover:text-primary transition-colors">Membership</Link>
            <a href="#store" className="hover:text-primary transition-colors">Store</a>
            <a href="#finance" className="hover:text-primary transition-colors">Finance</a>
          </div>

          <div className="flex items-center gap-6">
            <Link to="/login" className="font-mono text-[10px] uppercase tracking-[0.3em] hidden sm:block hover:text-primary transition-colors">Sign In</Link>
            <Link to="/membership" className="group relative overflow-hidden bg-primary text-white font-mono text-[10px] uppercase tracking-[0.25em] px-6 py-3 transition-all duration-700 hover:tracking-[0.4em] inline-block">
              <span className="relative z-10 flex items-center gap-2">Join Organization <ArrowRight className="w-3 h-3" /></span>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]" />
            </Link>
          </div>
        </div>
      </nav>
      <Hero />
      <Statistics />
      <ProblemStatement />
      <ConnectedPlatform />
      <WorkflowSection />
      <Capabilities />
      <MembershipSpotlight />
      <EventSpotlight />
      <StoreSpotlight />
      <FinanceSpotlight />
      <FinalCTA />
    </>
  );
};

const Hero = () => {
  return (
    <section id="overview" className="relative pt-24 pb-12 overflow-hidden">
      <div className="w-full px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-0 items-start relative">

        {/* Left Side: Content */}
        <div className="flex flex-col items-start text-left order-2 lg:order-1 lg:col-start-1 lg:col-end-7 lg:row-start-1 lg:pt-12 xl:pt-24 relative z-10">
          <h1 className="font-serif text-4xl lg:text-5xl xl:text-6xl leading-[1.1] tracking-tight mb-6">
            Comprehensive Management for Student Communities.
          </h1>

          <p className="font-sans text-lg text-muted max-w-sm mb-10">
            A unified platform to seamlessly manage memberships, events, and organizational finances.
          </p>

          <Link to="/events" className="bg-primary text-white font-mono text-xs uppercase tracking-widest px-8 py-4 hover:opacity-90 transition-opacity inline-block">
            Explore Events
          </Link>
        </div>

        {/* Right Side: Video */}
        <div className="w-full flex justify-end order-1 lg:order-2 lg:col-start-5 lg:col-end-13 lg:row-start-1 relative z-0">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-auto bg-[#F7F6F2]"
          >
            <source src={heroVideo} type="video/mp4" />
          </video>
        </div>

      </div>
    </section>
  );
};

const Statistics = () => {
  return (
    <section className="border-y border-border">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
        {[
          { num: "01", title: "One Platform", desc: "Memberships, events and finances connected." },
          { num: "02", title: "Real-Time Operations", desc: "Tickets, inventory and tasks stay synchronized." },
          { num: "03", title: "Transparent Finance", desc: "Every payment and reimbursement accounted for." }
        ].map((stat, i) => (
          <div key={i} className="p-10 hover:bg-hover transition-colors duration-700 group">
            <div className="w-12 h-12 border border-border flex items-center justify-center mb-12">
              <span className="font-mono text-xs">{stat.num}</span>
            </div>
            <h3 className="font-mono text-xs uppercase tracking-[0.2em] mb-4">{stat.title}</h3>
            <p className="font-sans text-muted">{stat.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

const ProblemStatement = () => {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"]
  });

  const text1 = "Student organizations shouldn't need spreadsheets for members, WhatsApp for announcements, paper lists for events, notebooks for finances and scattered receipts for expenses.";
  const text2 = "One organization deserves one system.";

  return (
    <section ref={containerRef} className="py-32 px-6 border-b border-border">
      <div className="max-w-5xl mx-auto">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] mb-12 text-muted">
          The Problem / 001
        </div>
        <motion.p 
          style={{ opacity: useTransform(scrollYProgress, [0, 0.5], [0.15, 1]) }}
          className="font-serif text-3xl md:text-5xl lg:text-6xl leading-tight mb-12"
        >
          {text1}
        </motion.p>
        <motion.p 
          style={{ opacity: useTransform(scrollYProgress, [0.4, 1], [0.15, 1]) }}
          className="font-serif text-4xl md:text-6xl lg:text-7xl leading-tight text-primary italic"
        >
          {text2}
        </motion.p>
      </div>
    </section>
  );
};

const ConnectedPlatform = () => {
  return (
    <section className="py-32 px-6 border-b border-border bg-white/50">
      <div className="max-w-7xl mx-auto text-center">
        <h2 className="font-serif text-4xl md:text-6xl mb-24 uppercase">
          One System.<br />Every Operation.
        </h2>

        <div className="flex flex-col md:flex-row justify-center items-start gap-12 font-mono text-xs tracking-widest text-muted">

          <div className="flex flex-col items-center gap-4">
            <span className="text-foreground">MEMBER</span>
            <span>↓</span>
            <span>MEMBERSHIP</span>
            <span>↓</span>
            <span className="flex items-center gap-2">EVENT <span>→</span> TICKET <span>→</span> CHECK-IN</span>
            <span>↓</span>
            <span>PAYMENT</span>
            <span>↓</span>
            <span className="text-primary border border-primary/20 bg-primary/5 px-4 py-1">FINANCE</span>
          </div>

          <div className="hidden md:block w-[1px] h-64 bg-border" />

          <div className="flex flex-col items-center gap-4">
            <span className="text-foreground">MEMBER</span>
            <span>↓</span>
            <span className="flex items-center gap-2">STORE <span>→</span> ORDER</span>
            <span>↓</span>
            <span>PAYMENT</span>
            <span>↓</span>
            <span className="text-primary border border-primary/20 bg-primary/5 px-4 py-1">FINANCE</span>
          </div>

          <div className="hidden md:block w-[1px] h-64 bg-border" />

          <div className="flex flex-col items-center gap-4">
            <span className="text-foreground">VOLUNTEER</span>
            <span>↓</span>
            <span>EXPENSE</span>
            <span>↓</span>
            <span>APPROVAL</span>
            <span>↓</span>
            <span>REIMBURSEMENT</span>
            <span>↓</span>
            <span className="text-primary border border-primary/20 bg-primary/5 px-4 py-1">FINANCE</span>
          </div>

        </div>
      </div>
    </section>
  );
};

const WorkflowSection = () => {
  const [activeStep, setActiveStep] = useState(0);
  const steps = [
    { title: "JOIN", desc: "Register, pay dues and receive an active digital membership." },
    { title: "PARTICIPATE", desc: "Discover events, receive member pricing and purchase digital tickets." },
    { title: "OPERATE", desc: "Check in attendees, manage merchandise, fundraisers and volunteer tasks." },
    { title: "UNDERSTAND", desc: "See income, expenses, reimbursements and outstanding payments in one financial view." }
  ];

  return (
    <section className="py-32 px-6 border-b border-border">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-24">

        <div className="flex flex-col gap-12">
          {steps.map((step, i) => (
            <div
              key={i}
              className={cn("cursor-pointer transition-opacity duration-700", activeStep === i ? "opacity-100" : "opacity-35")}
              onClick={() => setActiveStep(i)}
            >
              <div className="font-mono text-sm tracking-widest mb-4 flex items-center gap-4">
                <span className={activeStep === i ? "text-primary" : ""}>0{i + 1}</span>
                <span className="w-8 h-[1px] bg-current" />
                {step.title}
              </div>
              {activeStep === i && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="font-sans text-xl text-muted pl-16"
                >
                  {step.desc}
                </motion.p>
              )}
            </div>
          ))}
        </div>

        <div className="relative sticky top-32 self-start">
          <div className="border border-border bg-card p-8 min-h-[300px] flex flex-col justify-center">
            {activeStep === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="font-mono text-[10px] tracking-widest text-muted uppercase">Member Pass</div>
                <div className="text-4xl font-serif">MAYA</div>
                <div className="flex items-center gap-4 font-mono text-sm">
                  <span className="text-primary flex items-center gap-2"><div className="w-2 h-2 bg-primary rounded-full" /> ACTIVE</span>
                  <span className="text-muted">MEMBER / MBR-1024</span>
                </div>
              </motion.div>
            )}
            {activeStep === 1 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="font-mono text-[10px] tracking-widest text-muted uppercase">Ticket Preview</div>
                <div className="text-4xl font-serif">SPRING GALA</div>
                <div className="grid grid-cols-2 gap-8 font-mono text-sm">
                  <div>
                    <div className="text-muted mb-1">MEMBER PRICE</div>
                    <div>₹500</div>
                  </div>
                  <div>
                    <div className="text-muted mb-1">CAPACITY</div>
                    <div>42 SEATS LEFT</div>
                  </div>
                </div>
                <div className="inline-block border border-primary text-primary px-4 py-1.5 font-mono text-xs uppercase tracking-wider mt-4">
                  Ticket Verified
                </div>
              </motion.div>
            )}
            {activeStep === 2 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="font-mono text-[10px] tracking-widest text-muted uppercase">Fundraiser Progress</div>
                <div className="text-4xl font-serif">BAKE SALE</div>
                <div className="space-y-4">
                  <div className="flex justify-between font-mono text-sm">
                    <span>3 / 5 TASKS COMPLETE</span>
                    <span className="text-primary">60% PROGRESS</span>
                  </div>
                  <div className="h-1 bg-border w-full">
                    <div className="h-full bg-primary w-[60%]" />
                  </div>
                </div>
              </motion.div>
            )}
            {activeStep === 3 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                <div className="font-mono text-[10px] tracking-widest text-muted uppercase">Financial Summary</div>
                <div className="grid grid-cols-1 gap-6 font-mono text-sm">
                  <div className="flex justify-between items-end border-b border-border pb-2">
                    <span className="text-muted">TOTAL INCOME</span>
                    <span className="text-xl">₹84,500</span>
                  </div>
                  <div className="flex justify-between items-end border-b border-border pb-2">
                    <span className="text-muted">EXPENSES</span>
                    <span className="text-xl">₹21,200</span>
                  </div>
                  <div className="flex justify-between items-end text-primary pt-2">
                    <span>BALANCE</span>
                    <span className="text-2xl">₹63,300</span>
                  </div>
                </div>
              </motion.div>
            )}
            <div className="absolute bottom-0 left-0 w-full">
              <ScanLine />
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

const Capabilities = () => {
  const [activeTab, setActiveTab] = useState(0);
  const tabs = ["MEMBERSHIP", "EVENTS", "STORE", "VOLUNTEERS", "FINANCE"];
  const content = [
    {
      title: "From sign-up to renewal.",
      benefits: [
        { label: "ACTIVE STATUS", desc: "Automatically distinguish pending, active and expired memberships." },
        { label: "MEMBER PASS", desc: "Provide a digital membership identity." },
        { label: "MEMBER PRICING", desc: "Apply benefits only to active members." }
      ]
    },
    {
      title: "From ticket purchase to door check-in.",
      benefits: [
        { label: "DYNAMIC PRICING", desc: "Member and non-member ticket pricing." },
        { label: "CAPACITY", desc: "Live seats remaining." },
        { label: "QR CHECK-IN", desc: "Validate tickets at the door and prevent reuse." }
      ]
    },
    {
      title: "Merchandise without spreadsheets.",
      benefits: [
        { label: "SIZE INVENTORY", desc: "Track stock independently for every size." },
        { label: "MEMBER DISCOUNTS", desc: "Reward active members." },
        { label: "ORDER HISTORY", desc: "Keep purchases organized." }
      ]
    },
    {
      title: "Turn plans into accountable work.",
      benefits: [
        { label: "TASK ASSIGNMENT", desc: "Assign work to volunteers." },
        { label: "PROGRESS", desc: "Track fundraiser completion." },
        { label: "EXPENSES", desc: "Submit expenses with receipts." }
      ]
    },
    {
      title: "Know where every rupee goes.",
      benefits: [
        { label: "INCOME BY SOURCE", desc: "Track dues, tickets, merchandise and fundraiser income." },
        { label: "REIMBURSEMENTS", desc: "Approve and record volunteer expenses." },
        { label: "BALANCE", desc: "Understand money in, money out and remaining funds." }
      ]
    }
  ];

  return (
    <section className="py-32 px-6 border-b border-border">
      <div className="max-w-5xl mx-auto">
        <h2 className="font-mono text-xs uppercase tracking-[0.3em] text-center mb-16">Built for the whole organization</h2>

        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {tabs.map((tab, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className={cn(
                "font-mono text-[10px] uppercase tracking-widest px-6 py-2 border transition-colors duration-500 rounded-[2px]",
                activeTab === i ? "bg-primary text-white border-primary" : "border-border text-muted hover:border-primary/50"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="border border-border p-12 relative overflow-hidden bg-card min-h-[400px] flex flex-col justify-center">
          <div className="absolute -right-8 -bottom-16 text-[240px] font-serif leading-none opacity-[0.04] text-foreground pointer-events-none select-none">
            0{activeTab + 1}
          </div>

          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative z-10"
          >
            <h3 className="font-serif text-3xl md:text-5xl mb-16 max-w-xl">{content[activeTab].title}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {content[activeTab].benefits.map((b, i) => (
                <div key={i}>
                  <div className="font-mono text-xs tracking-widest mb-4 text-primary">{b.label}</div>
                  <p className="font-sans text-muted">{b.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const MembershipSpotlight = () => {
  return (
    <section id="membership" className="py-32 px-6 border-b border-border bg-white/40">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] mb-8 text-muted">Membership / 004</div>
          <h2 className="font-serif text-5xl md:text-7xl mb-12 uppercase leading-tight">
            One identity.<br />
            <span className="text-primary italic">Everywhere.</span>
          </h2>
          <p className="font-sans text-xl text-muted max-w-md">
            Seamlessly onboard students, issue digital passes, and instantly distinguish active members from guests for pricing and access.
          </p>
        </div>
        <div className="border border-border bg-card p-8 relative">
          <div className="font-mono text-[10px] tracking-widest text-muted uppercase mb-6">Digital Member Pass</div>
          <div className="text-4xl font-serif mb-4">MAYA SHARMA</div>
          <div className="flex items-center gap-4 font-mono text-sm">
            <span className="text-primary flex items-center gap-2"><div className="w-2 h-2 bg-primary rounded-full" /> ACTIVE</span>
            <span className="text-muted">MEMBER / MBR-1024</span>
          </div>
          <div className="mt-8 pt-6 border-t border-border">
            <div className="flex justify-between text-xs tracking-widest text-muted mb-2">
              <span>EXPIRY</span>
              <span>31 MAY 2027</span>
            </div>
          </div>
          <div className="absolute top-1/2 left-0 w-full -translate-y-1/2">
            <ScanLine />
          </div>
        </div>
      </div>
    </section>
  );
};

const StoreSpotlight = () => {
  return (
    <section id="store" className="py-32 px-6 border-b border-border">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
        <div className="order-2 lg:order-1 border border-border bg-card p-8">
          <div className="font-mono text-[10px] tracking-widest text-muted uppercase mb-6">Store Order Preview</div>
          <div className="text-4xl font-serif mb-2">DEPT HOODIE</div>
          <div className="font-mono text-sm mb-6 text-muted">SIZE: LARGE • QTY: 1</div>
          <div className="flex justify-between items-end border-t border-border pt-6 font-mono text-sm">
            <span className="text-muted">TOTAL (MEMBER DISCOUNT)</span>
            <span className="text-xl text-primary">₹1,080</span>
          </div>
          <div className="mt-6 inline-block px-3 py-1 border border-primary text-primary text-xs tracking-widest">PAID / READY FOR PICKUP</div>
        </div>
        <div className="order-1 lg:order-2">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] mb-8 text-muted">Merchandise / 005</div>
          <h2 className="font-serif text-5xl md:text-7xl mb-12 uppercase leading-tight">
            Inventory.<br />
            <span className="text-primary italic">Without spreadsheets.</span>
          </h2>
          <p className="font-sans text-xl text-muted max-w-md">
            Manage stock independently by size, automatically apply member discounts, and track orders from purchase to collection.
          </p>
        </div>
      </div>
    </section>
  );
};

const FinanceSpotlight = () => {
  return (
    <section id="finance" className="py-32 px-6 border-b border-border bg-white/40">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">

        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] mb-8 text-muted">Financial Control / 006</div>
          <h2 className="font-serif text-5xl md:text-7xl mb-8 uppercase leading-tight">
            Every rupee.<br />
            <span className="text-primary italic">Accounted for.</span>
          </h2>
          <p className="font-sans text-xl text-muted max-w-md">
            See how money enters the organization, where it goes, who still owes, and what remains.
          </p>
        </div>

        <div className="border border-border bg-card p-8 shadow-sm">
          <div className="font-mono text-xs uppercase tracking-widest mb-12 border-b border-border pb-4">Financial Overview</div>

          <div className="grid grid-cols-3 gap-8 mb-12 font-mono text-sm">
            <div>
              <div className="text-muted mb-2">TOTAL INCOME</div>
              <div className="text-xl">₹84,500</div>
            </div>
            <div>
              <div className="text-muted mb-2">TOTAL EXPENSE</div>
              <div className="text-xl">₹21,200</div>
            </div>
            <div className="text-primary">
              <div className="mb-2">BALANCE</div>
              <div className="text-xl">₹63,300</div>
            </div>
          </div>

          <div className="space-y-4 font-mono text-xs">
            {[
              { label: "MEMBERSHIP DUES", amount: "+₹1,200", type: "in" },
              { label: "SPRING GALA TICKET", amount: "+₹500", type: "in" },
              { label: "HOODIE ORDER", amount: "+₹1,080", type: "in" },
              { label: "FUNDRAISER", amount: "+₹4,500", type: "in" },
              { label: "VOLUNTEER EXPENSE", amount: "-₹1,250", type: "out" },
            ].map((tx, i) => (
              <div key={i} className="flex justify-between items-center py-3 border-b border-border/50 last:border-0">
                <div>
                  <div className="mb-1">{tx.label}</div>
                  <div className="text-[9px] text-muted tracking-widest">TRANSACTION / PAID • UPI / 03 OCT 2026 / 10:42</div>
                </div>
                <div className={cn("text-sm", tx.type === "in" ? "text-primary" : "text-muted")}>
                  {tx.amount}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};

const EventSpotlight = () => {
  return (
    <section id="events" className="py-32 px-6 border-b border-border">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">

        <div className="order-2 lg:order-1 flex justify-center">
          <div className="relative w-full max-w-sm">
            <div className="border border-border bg-card p-8">
              <div className="flex justify-between items-start mb-12">
                <div>
                  <div className="font-serif text-2xl mb-2">SPRING GALA</div>
                  <div className="font-mono text-[10px] tracking-widest text-muted uppercase">TKT-A82F21</div>
                </div>
                <div className="w-16 h-16 bg-border flex items-center justify-center font-mono text-[8px] text-muted tracking-widest text-center p-2">
                  QR PREVIEW
                </div>
              </div>

              <div className="space-y-6 font-mono text-sm">
                <div>
                  <div className="text-muted mb-1 text-xs">HOLDER</div>
                  <div className="text-lg">MAYA</div>
                  <div className="text-xs text-primary mt-1">MEMBER / ACTIVE</div>
                </div>
                <div className="pt-6 border-t border-border">
                  <div className="text-muted mb-1 text-xs">STATUS</div>
                  <div className="inline-block px-3 py-1 border border-primary text-primary text-xs tracking-widest">VALID</div>
                </div>
              </div>
            </div>
            <div className="absolute top-1/2 left-0 w-full -translate-y-1/2">
              <ScanLine />
            </div>
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] mb-8 text-muted">Event Operations / 007</div>
          <h2 className="font-serif text-5xl md:text-7xl mb-12 uppercase leading-tight">
            From purchase<br />
            to check-in.
          </h2>

          <div className="grid grid-cols-2 gap-8 font-mono text-sm border-l border-border pl-8">
            <div>
              <div className="text-muted mb-2 text-xs tracking-widest">MEMBER PRICE</div>
              <div className="text-2xl">₹500</div>
            </div>
            <div>
              <div className="text-muted mb-2 text-xs tracking-widest">NON-MEMBER</div>
              <div className="text-2xl">₹750</div>
            </div>
            <div className="col-span-2 pt-4">
              <div className="text-muted mb-2 text-xs tracking-widest">SEATS REMAINING</div>
              <div className="text-2xl text-primary">42 / 100</div>
              <Link
                to="/events"
                className="mt-6 inline-flex items-center gap-2 bg-primary text-white font-mono text-xs uppercase tracking-widest px-6 py-3 hover:opacity-90 transition-opacity"
              >
                <span>Explore All Events</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

const FinalCTA = () => {
  return (
    <section className="py-40 px-6 border-b border-border text-center bg-white/50 relative overflow-hidden">
      <div className="absolute inset-0 bg-primary/5" />
      <div className="relative z-10 max-w-4xl mx-auto">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] mb-8 text-muted">Your Organization / One System</div>
        <h2 className="font-serif text-5xl md:text-8xl leading-none uppercase mb-12">
          Less admin.<br />
          <span className="italic text-primary">More community.</span>
        </h2>
        <p className="font-sans text-xl text-muted max-w-2xl mx-auto mb-16">
          Bring memberships, events, merchandise, volunteers and finances into one connected platform.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <Link to="/membership" className="group relative overflow-hidden bg-primary text-white font-mono text-[10px] uppercase tracking-[0.25em] px-10 py-5 transition-all duration-700 hover:tracking-[0.4em] w-full sm:w-auto inline-block text-center">
            <span className="relative z-10 flex items-center justify-center gap-2">Join The Organization <ArrowRight className="w-4 h-4" /></span>
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]" />
          </Link>
          <Link to="/login" className="font-mono text-[10px] uppercase tracking-[0.2em] px-10 py-5 border border-border hover:bg-white transition-colors duration-700 w-full sm:w-auto inline-block text-center">
            Sign In
          </Link>
        </div>
      </div>
    </section>
  );
};

const Footer = () => {
  return (
    <footer className="py-12 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-3">
          <img
            src={logoEmblem}
            alt="CampusCore"
            className="w-8 h-8 object-contain drop-shadow-sm"
          />
          <span className="font-sans font-bold text-base tracking-tight text-foreground">
            CampusCore
          </span>
        </div>

        <div className="flex flex-wrap justify-center gap-8 font-mono text-[10px] uppercase tracking-[0.3em] text-muted">
          <Link to="/membership" className="hover:text-primary transition-colors">Membership</Link>
          <Link to="/events" className="hover:text-primary transition-colors">Events</Link>
          <a href="#store" className="hover:text-primary transition-colors">Store</a>
          <a href="#finance" className="hover:text-primary transition-colors">Finance</a>
        </div>

        <div className="text-center md:text-right font-mono text-[10px] uppercase tracking-widest text-muted">
          CampusCore<br />
          Student Organization<br />
          2026<br />
          <span className="mt-4 block italic normal-case tracking-normal text-ghost">Built for student communities.</span>
        </div>
      </div>
    </footer>
  );
};

const DashboardRouter = () => {
  const user = authService.getStoredUser();
  const role = user?.role || 'member';

  switch (role) {
    case 'admin':
      return <AdminDashboard />;
    case 'treasurer':
      return <TreasurerDashboard />;
    case 'event_manager':
      return <EventManagerDashboard />;
    case 'volunteer':
      return <VolunteerDashboard />;
    case 'member':
    default:
      return <MemberDashboard />;
  }
};

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={
          <div className="min-h-screen flex flex-col">
            <LandingPage />
            <Footer />
          </div>
        } />
        <Route path="/guest" element={<GuestHome />} />
        <Route path="/events" element={<PublicEvents />} />
        <Route path="/events/:id" element={<PublicEventDetails />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/membership" element={<MembershipPage />} />
        <Route path="/membership/checkout" element={<MembershipCheckoutPage />} />
        <Route path="/membership/success" element={<MembershipSuccessPage />} />
        <Route path="/membership/pass" element={<Navigate to="/dashboard/member" replace />} />
        <Route path="/announcements" element={<Navigate to="/dashboard/member" replace />} />
        
        {/* Dashboard Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardRouter />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/admin/*"
          element={
            <RoleGuard allowedRoles={['admin']}>
              <AdminDashboard />
            </RoleGuard>
          }
        />
        <Route
          path="/dashboard/finance/*"
          element={
            <RoleGuard allowedRoles={['admin', 'treasurer']}>
              <TreasurerDashboard />
            </RoleGuard>
          }
        />
        <Route
          path="/dashboard/events/*"
          element={
            <RoleGuard allowedRoles={['admin', 'event_manager']}>
              <EventManagerDashboard />
            </RoleGuard>
          }
        />
        <Route
          path="/dashboard/tasks/*"
          element={
            <RoleGuard allowedRoles={['admin', 'volunteer']}>
              <VolunteerDashboard />
            </RoleGuard>
          }
        />
        <Route
          path="/dashboard/store/*"
          element={
            <RoleGuard allowedRoles={['admin']}>
              <AdminMerchandisePage />
            </RoleGuard>
          }
        />
        <Route
          path="/dashboard/member/*"
          element={
            <ProtectedRoute>
              <MemberDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/store" element={<MerchandisePage />} />
        <Route path="/merchandise" element={<MerchandisePage />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
