// frontend/src/components/membership/MembershipPaymentForm.jsx
import React from 'react';
import { ArrowLeft, User, Mail, Phone, CreditCard, Smartphone, Building2, CheckCircle2 } from 'lucide-react';
import logoEmblem from '../../assests/CampusCore Academic Emblem.png';

export const MembershipPaymentForm = ({
  plan,
  paymentMode,
  setPaymentMode,
  name,
  setName,
  email,
  setEmail,
  mobile,
  setMobile,
  onBack,
  error,
  user,
}) => {
  const paymentMethods = [
    {
      id: 'card',
      title: 'Card',
      description: 'Credit or Debit Card',
      badges: ['Visa', 'Mastercard', 'Amex', 'RuPay'],
      icon: CreditCard,
    },
    {
      id: 'upi',
      title: 'UPI Instant',
      description: 'Google Pay, PhonePe, Paytm, BHIM UPI',
      badges: ['GPay', 'PhonePe', 'Paytm'],
      icon: Smartphone,
    },
    {
      id: 'netbanking',
      title: 'Netbanking / Gateway',
      description: 'Direct bank debit via all major Indian banks',
      badges: ['SBI', 'HDFC', 'ICICI', 'Axis'],
      icon: Building2,
    },
  ];

  const greetingName = name?.trim() ? name.trim().split(' ')[0] : (user?.name ? user.name.split(' ')[0] : 'Member');

  return (
    <div className="space-y-8">
      {/* Top Navigation & Brand Header */}
      <div className="space-y-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 font-mono text-xs text-muted hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
          <span>Back to Plans</span>
        </button>

        <div className="flex items-center gap-3 pt-1">
          <img
            src={logoEmblem}
            alt="CampusCore"
            className="w-10 h-10 object-contain drop-shadow-sm"
          />
          <div>
            <span className="font-sans font-bold text-lg text-foreground block leading-tight">
              CampusCore
            </span>
            <span className="font-mono text-[10px] uppercase text-muted tracking-wider">
              LDCE Student Organization
            </span>
          </div>
        </div>
      </div>

      {/* Greeting and Headline */}
      <div className="space-y-1 border-b border-border/80 pb-6">
        <p className="font-sans text-sm text-muted">
          Hi {greetingName},
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
          Pay CampusCore <span className="text-primary font-mono">₹{plan.price}</span>
        </h1>
        <p className="font-sans text-xs text-muted">
          Complete your personal details and payment method to activate your membership.
        </p>
      </div>

      {/* Error Callout */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-900 font-mono text-xs flex items-start gap-2.5">
          <div className="w-2 h-2 rounded-full bg-red-600 mt-1.5 shrink-0" />
          <div className="space-y-1">
            <span className="font-bold block uppercase tracking-wider">Payment / Registration Notice</span>
            <p className="font-sans text-xs">{error}</p>
          </div>
        </div>
      )}

      {/* Payment Method Selector Section */}
      <div className="space-y-3">
        <label className="block font-mono text-xs font-bold uppercase tracking-wider text-foreground">
          Select Payment Method
        </label>

        <div className="space-y-2.5">
          {paymentMethods.map((m) => {
            const isSelected = paymentMode === m.id;
            const IconComponent = m.icon;
            return (
              <div
                key={m.id}
                onClick={() => setPaymentMode(m.id)}
                className={`p-4 border transition-all duration-200 cursor-pointer flex items-center justify-between gap-4 ${
                  isSelected
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border bg-card hover:border-foreground/30'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-9 h-9 rounded flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-primary text-white' : 'bg-muted/10 text-muted'
                    }`}
                  >
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-sans font-bold text-sm text-foreground">
                        {m.title}
                      </span>
                    </div>
                    <p className="font-sans text-[11px] text-muted leading-tight">
                      {m.description}
                    </p>
                  </div>
                </div>

                {/* Radio Indicator */}
                <div className="flex items-center gap-2">
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                      isSelected
                        ? 'border-primary bg-primary'
                        : 'border-border bg-white'
                    }`}
                  >
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Personal Information Section */}
      <div className="space-y-4 pt-2 border-t border-border/80">
        <div>
          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
            Personal Information
          </h3>
          <p className="font-sans text-[11px] text-muted">
            Your digital member pass and receipts will be linked to this identity.
          </p>
        </div>

        <div className="space-y-3 font-mono text-xs">
          <div>
            <label className="block text-[10px] uppercase font-semibold text-muted mb-1 flex items-center gap-1.5">
              <User className="w-3 h-3 text-primary" />
              <span>Full Name *</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rachit Hiren Kakkad"
              className="w-full p-3 bg-white border border-border text-foreground focus:outline-none focus:border-primary transition-colors text-xs"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-semibold text-muted mb-1 flex items-center gap-1.5">
              <Mail className="w-3 h-3 text-primary" />
              <span>Email Address *</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. kakkadrachit1@gmail.com"
              className="w-full p-3 bg-white border border-border text-foreground focus:outline-none focus:border-primary transition-colors text-xs"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-semibold text-muted mb-1 flex items-center gap-1.5">
              <Phone className="w-3 h-3 text-primary" />
              <span>Mobile Number (Optional)</span>
            </label>
            <input
              type="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="e.g. 9876543210"
              className="w-full p-3 bg-white border border-border text-foreground focus:outline-none focus:border-primary transition-colors text-xs"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MembershipPaymentForm;
