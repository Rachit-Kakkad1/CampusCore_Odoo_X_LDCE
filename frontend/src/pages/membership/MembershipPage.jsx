// frontend/src/pages/membership/MembershipPage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import MembershipPlanCard from '../../components/membership/MembershipPlanCard';
import MembershipBenefits from '../../components/membership/MembershipBenefits';
import { membershipApi, fallbackPlans } from '../../services/membership/membershipApi';
import { ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';

export const MembershipPage = () => {
  const [plans, setPlans] = useState(fallbackPlans);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const fetched = await membershipApi.getPlans();
        if (Array.isArray(fetched) && fetched.length > 0) {
          setPlans(fetched);
        }
      } catch (err) {
        console.warn('Using fallback plans:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col text-foreground selection:bg-primary selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-16 sm:py-20 space-y-20">
        {/* Hero Section */}
        <section className="text-center max-w-3xl mx-auto space-y-4 pt-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 text-primary font-mono text-[11px] uppercase tracking-widest font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Official Student Organization Membership</span>
          </div>

          <h1 className="font-serif text-4xl sm:text-6xl font-bold tracking-tight text-foreground leading-[1.1]">
            One membership.<br />
            <span className="text-primary italic">Continuous financial benefits.</span>
          </h1>

          <p className="font-sans text-base sm:text-lg text-muted max-w-xl mx-auto leading-relaxed">
            Unlock guaranteed member pricing on all eligible flagship events, 10% off student merchandise, and a verified cryptographic digital pass.
          </p>
        </section>

        {/* Pricing Cards Section */}
        <section className="space-y-6">
          <div className="text-center space-y-1 mb-8">
            <span className="font-mono text-xs uppercase tracking-[0.25em] text-muted font-bold block">
              Membership Plans
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">
              Choose the duration that fits your semester
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {plans.map((plan) => (
              <MembershipPlanCard
                key={plan.id}
                plan={plan}
                isRecommended={plan.id === '12_months'}
              />
            ))}
          </div>
        </section>

        {/* Benefits, Comparison Table & How It Works */}
        <MembershipBenefits />
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 font-mono text-xs text-muted">
          <div>
            <span className="font-bold text-foreground">CampusCore</span> · LDCE Student Organization
          </div>
          <div className="flex items-center gap-6">
            <Link to="/events" className="hover:text-primary transition-colors">Events</Link>
            <Link to="/store" className="hover:text-primary transition-colors">Store</Link>
            <Link to="/login" className="hover:text-primary transition-colors">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MembershipPage;
