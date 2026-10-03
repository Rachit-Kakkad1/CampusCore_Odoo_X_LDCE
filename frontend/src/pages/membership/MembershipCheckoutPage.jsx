// frontend/src/pages/membership/MembershipCheckoutPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import MembershipPaymentForm from '../../components/membership/MembershipPaymentForm';
import MembershipSummary from '../../components/membership/MembershipSummary';
import MembershipSuccessPage from './MembershipSuccessPage';
import { membershipApi, fallbackPlans } from '../../services/membership/membershipApi';
import authService from '../../services/auth.service';

export const MembershipCheckoutPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedPlanId = searchParams.get('plan') || '12_months';

  const [plans, setPlans] = useState(fallbackPlans);
  const [selectedPlan, setSelectedPlan] = useState(fallbackPlans.find(p => p.id === '12_months') || fallbackPlans[2]);
  const [paymentMode, setPaymentMode] = useState('card');

  const storedUser = authService.getStoredUser();
  const [name, setName] = useState(storedUser?.name || '');
  const [email, setEmail] = useState(storedUser?.email || '');
  const [mobile, setMobile] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activatedResult, setActivatedResult] = useState(null);

  // Load official backend plans
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const fetched = await membershipApi.getPlans();
        if (Array.isArray(fetched) && fetched.length > 0) {
          setPlans(fetched);
          const matched = fetched.find(p => p.id === requestedPlanId) || fetched.find(p => p.id === '12_months') || fetched[0];
          setSelectedPlan(matched);
        }
      } catch (err) {
        console.warn('Using fallback plans:', err);
      }
    };
    fetchPlans();
  }, [requestedPlanId]);

  // Handle Checkout submission
  const handlePaymentSubmit = async (e) => {
    if (e) e.preventDefault();
    setError(null);

    // Validation
    if (!name.trim()) {
      setError('Please provide your Full Name.');
      return;
    }
    if (!email.trim() || !email.includes('@') || !email.includes('.')) {
      setError('Please provide a valid Email Address for receipt and pass delivery.');
      return;
    }

    setLoading(true);

    try {
      const res = await membershipApi.checkout({
        plan: selectedPlan.id,
        payment_mode: paymentMode,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        mobile: mobile.trim(),
      });

      // Show success state
      setActivatedResult(res);
    } catch (err) {
      console.error('Membership checkout error:', err);
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Payment processing failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // If already activated, display success view
  if (activatedResult) {
    return <MembershipSuccessPage activatedData={activatedResult} />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col text-foreground selection:bg-primary selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-12 sm:py-16">
        <form onSubmit={handlePaymentSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Left Column: Payment & Personal Information */}
          <div className="lg:col-span-7 bg-card border border-border p-6 sm:p-10 shadow-sm">
            <MembershipPaymentForm
              plan={selectedPlan}
              paymentMode={paymentMode}
              setPaymentMode={setPaymentMode}
              name={name}
              setName={setName}
              email={email}
              setEmail={setEmail}
              mobile={mobile}
              setMobile={setMobile}
              onBack={() => navigate('/membership')}
              error={error}
              user={storedUser}
            />
          </div>

          {/* Right Column: Order Summary & Primary Pay CTA */}
          <div className="lg:col-span-5">
            <MembershipSummary
              plan={selectedPlan}
              loading={loading}
              onSubmit={handlePaymentSubmit}
            />
          </div>
        </form>
      </main>
    </div>
  );
};

export default MembershipCheckoutPage;
