import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, UserPlus, ShieldCheck } from 'lucide-react';
import authService from '../../services/auth.service';
import logoEmblem from '../../assests/CampusCore Academic Emblem.png';

export const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'member'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) {
      setError('Please provide all required fields.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await authService.register(formData);
      navigate('/dashboard/member', { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f6f2] text-[#1c1c1c] flex flex-col justify-center items-center px-6 py-16">
      <div className="w-full max-w-md bg-white border border-[#e5e4de] p-8 md:p-10 shadow-sm relative">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-[#5F3F56]" />

        <div className="mb-8 text-center flex flex-col items-center">
          <img
            src={logoEmblem}
            alt="CampusCore Emblem"
            className="w-14 h-14 object-contain mb-3 drop-shadow-sm"
          />
          <h1 className="font-sans text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Join CampusCore
          </h1>
          <p className="font-sans text-xs text-neutral-500 mt-2">
            Create your account to unlock membership benefits, event tickets, and club apparel.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 border border-rose-300 bg-rose-50 text-rose-800 text-xs font-mono">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-neutral-600 mb-2">
              Full Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Alex Taylor"
              required
              className="w-full px-4 py-3 border border-[#e5e4de] bg-[#f7f6f2] text-sm focus:outline-none focus:border-[#5F3F56] font-sans transition-colors"
            />
          </div>

          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-neutral-600 mb-2">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="alex@campuscore.org"
              required
              className="w-full px-4 py-3 border border-[#e5e4de] bg-[#f7f6f2] text-sm focus:outline-none focus:border-[#5F3F56] font-mono text-xs transition-colors"
            />
          </div>

          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-neutral-600 mb-2">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
              className="w-full px-4 py-3 border border-[#e5e4de] bg-[#f7f6f2] text-sm focus:outline-none focus:border-[#5F3F56] font-mono text-xs transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 bg-[#5F3F56] text-white font-mono text-xs uppercase tracking-[0.2em] hover:bg-[#4d3246] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span>Creating Account...</span>
            ) : (
              <>
                <span>Register Account</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-[#e5e4de] text-center font-mono text-xs text-neutral-500">
          Already have an account?{' '}
          <Link to="/login" className="text-[#5F3F56] hover:underline font-semibold ml-1">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
