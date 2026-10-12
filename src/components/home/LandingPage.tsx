import React, { useState } from 'react';
import {
  Fingerprint,
  Send,
  Smartphone,
  Banknote,
  ShieldCheck,
  Shield,
  Zap,
  Headphones,
  LayoutGrid,
  Phone,
  Mail,
  Globe,
  MapPin,
  ArrowRight,
  LogIn,
  Check,
  CheckCircle2,
  FileText,
  Umbrella,
  Menu,
  X
} from 'lucide-react';

interface LandingPageProps {
  onNavigateToLogin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigateToLogin }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (newsletterEmail) {
      setSubscribed(true);
      setTimeout(() => {
        setNewsletterEmail('');
        setSubscribed(false);
      }, 4000);
    }
  };

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans antialiased selection:bg-blue-600 selection:text-white">
      {/* ========================================================
          1. HEADER / NAVBAR
          ======================================================== */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm transition">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo */}
          <div 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-cyan-500 p-0.5 shadow-md shadow-blue-500/20 group-hover:scale-105 transition">
                <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center font-black text-blue-700 text-xl tracking-tighter">
                  AS
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black text-blue-900 tracking-tight leading-tight">
                  AS <span className="text-cyan-600">EasySwipe</span>
                </span>
                <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                  Pvt Ltd • Fintech
                </span>
              </div>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="text-blue-600 font-bold hover:text-blue-700 transition"
            >
              Home
            </button>
            <button
              onClick={() => scrollToSection('services')}
              className="hover:text-blue-600 transition"
            >
              Services
            </button>
            <button
              onClick={() => scrollToSection('why-choose-us')}
              className="hover:text-blue-600 transition"
            >
              About Us
            </button>
            <button
              onClick={() => scrollToSection('features')}
              className="hover:text-blue-600 transition"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('contact')}
              className="hover:text-blue-600 transition"
            >
              Contact
            </button>
          </nav>

          {/* Login Button */}
          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={onNavigateToLogin}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full border-2 border-slate-300 hover:border-blue-600 hover:text-blue-600 text-slate-700 font-bold text-sm transition shadow-sm hover:shadow"
            >
              <LogIn className="w-4 h-4" />
              <span>Login</span>
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 px-6 py-5 space-y-4 shadow-xl animate-in slide-in-from-top-2">
            <button
              onClick={() => { setMobileMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="block w-full text-left font-bold text-blue-600 py-2"
            >
              Home
            </button>
            <button
              onClick={() => scrollToSection('services')}
              className="block w-full text-left font-semibold text-slate-700 py-2"
            >
              Services
            </button>
            <button
              onClick={() => scrollToSection('why-choose-us')}
              className="block w-full text-left font-semibold text-slate-700 py-2"
            >
              About Us
            </button>
            <button
              onClick={() => scrollToSection('features')}
              className="block w-full text-left font-semibold text-slate-700 py-2"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('contact')}
              className="block w-full text-left font-semibold text-slate-700 py-2"
            >
              Contact
            </button>
            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={onNavigateToLogin}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm shadow-md"
              >
                <LogIn className="w-4 h-4" /> Login
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ========================================================
          2. HERO SECTION
          ======================================================== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0a1f3a] via-[#0c284c] to-[#08182d] text-white py-16 lg:py-24">
        {/* Subtle Background Glows */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Column: Heading & CTAs */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight tracking-tight">
                Your Trusted <br />
                <span className="text-emerald-400">Financial</span> Partner
              </h1>

              {/* Tagline Pills */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 pt-1">
                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-semibold backdrop-blur-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Simple
                </span>
                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-semibold backdrop-blur-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span> Fast
                </span>
                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-semibold backdrop-blur-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span> Secure
                </span>
              </div>

              <p className="text-base sm:text-lg text-slate-300 max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
                AS EasySwipe Pvt Ltd provides all your banking, payment, loan and insurance services at one place with complete security and reliability.
              </p>

              {/* CTA Buttons */}
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <button
                  onClick={() => scrollToSection('services')}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-xl shadow-blue-600/30 transition transform hover:-translate-y-0.5"
                >
                  <span>Our Services</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => scrollToSection('contact')}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl border-2 border-white/40 hover:border-white text-white font-bold text-sm transition hover:bg-white/10"
                >
                  <span>Contact Us</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Right Column: Visual Elements (App Phone Mockup + RuPay Card + 3D Shield) */}
            <div className="lg:col-span-5 relative flex items-center justify-center">
              
              {/* Phone Mockup Card */}
              <div className="relative w-64 sm:w-72 bg-[#0d223f] border-4 border-slate-700/80 rounded-[38px] p-5 shadow-2xl shadow-black/60 text-white z-10 transform hover:scale-[1.02] transition duration-300">
                {/* Phone Speaker Notch */}
                <div className="w-20 h-3 bg-slate-800 rounded-full mx-auto mb-4"></div>

                <div className="text-center space-y-1 mb-6">
                  <h3 className="text-sm font-black tracking-wide text-white">AS EasySwipe</h3>
                  <p className="text-[11px] font-bold text-slate-300">Your Trusted Financial Partner</p>
                  <p className="text-[9px] text-slate-400 font-medium">Simple • Fast • Secure</p>
                </div>

                {/* 5 Service Icons in Phone Grid */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="flex flex-col items-center">
                    <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-600/40">
                      <Fingerprint className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-[10px] font-bold mt-1.5 text-slate-300">AEPS</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="w-11 h-11 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-600/40">
                      <Send className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-[10px] font-bold mt-1.5 text-slate-300">DMT</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="w-11 h-11 rounded-xl bg-cyan-600 flex items-center justify-center shadow-md shadow-cyan-600/40">
                      <Smartphone className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-[10px] font-bold mt-1.5 text-slate-300">BBPS</span>
                  </div>

                  <div className="flex flex-col items-center col-start-1 col-end-2 ml-4">
                    <div className="w-11 h-11 rounded-xl bg-emerald-500 flex items-center justify-center shadow-md shadow-emerald-500/40">
                      <Banknote className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-[10px] font-bold mt-1.5 text-slate-300">Loans</span>
                  </div>

                  <div className="flex flex-col items-center col-start-3 col-end-4 mr-4">
                    <div className="w-11 h-11 rounded-xl bg-teal-600 flex items-center justify-center shadow-md shadow-teal-600/40">
                      <Shield className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-[10px] font-bold mt-1.5 text-slate-300">Insurance</span>
                  </div>
                </div>

                {/* Bottom Secure Pill */}
                <div className="py-2.5 px-4 rounded-xl bg-emerald-600 text-center font-bold text-xs text-white shadow-lg shadow-emerald-600/40 flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Secure & Reliable</span>
                </div>
              </div>

              {/* Floating RuPay Card (Top-Right) */}
              <div className="hidden sm:block absolute -top-4 -right-12 sm:-right-8 w-60 h-36 rounded-2xl bg-gradient-to-br from-[#12396b] via-[#0f2c52] to-[#0a1c35] border border-blue-400/30 p-4 shadow-2xl shadow-blue-950/80 z-20 transform rotate-6 hover:rotate-0 transition duration-300">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-black tracking-wide text-white">AS EasySwipe</span>
                  <div className="w-7 h-5 rounded bg-amber-400/80 border border-amber-300 flex items-center justify-center">
                    <div className="w-4 h-3 border border-amber-600 rounded-sm"></div>
                  </div>
                </div>
                <p className="text-xs font-mono font-bold tracking-widest text-slate-200 mt-2">
                  1234 5678 9012 3456
                </p>
                <div className="flex items-end justify-between mt-3 text-[9px] text-slate-300 font-medium">
                  <div>
                    <span className="text-[7px] text-slate-400 block">VALID THRU</span>
                    <span>12/28</span>
                  </div>
                  <span className="font-black italic text-sm text-cyan-300 tracking-wider">RuPay</span>
                </div>
              </div>

              {/* Floating Shield Keyhole (Bottom-Right) */}
              <div className="hidden sm:flex absolute -bottom-4 right-2 sm:right-6 w-14 h-16 rounded-2xl bg-gradient-to-b from-blue-500 to-indigo-700 border-2 border-white/30 items-center justify-center shadow-xl shadow-blue-900/60 z-20 transform -rotate-12 animate-bounce">
                <div className="w-7 h-9 rounded-full bg-white/20 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-white" />
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          3. OUR SERVICES SECTION
          ======================================================== */}
      <section id="services" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          
          <span className="text-xs font-extrabold uppercase tracking-widest text-blue-600 block mb-2">
            OUR SERVICES
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            All Financial Services Under One Roof
          </h2>
          <div className="h-1.5 w-20 mx-auto rounded-full bg-gradient-to-r from-blue-600 to-emerald-400 mt-3 mb-14" />

          {/* 5 Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            
            {/* 1. AEPS */}
            <div className="bg-white rounded-3xl p-7 border border-slate-200/80 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition duration-300 flex flex-col items-center text-center group">
              <div className="w-16 h-16 rounded-full bg-[#0c2340] text-blue-400 flex items-center justify-center mb-5 group-hover:scale-110 transition shadow-lg shadow-slate-900/10">
                <Fingerprint className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-1">AEPS</h3>
              <p className="text-xs text-slate-500 font-medium mb-6 flex-1">
                Aadhaar Enabled Payment System
              </p>
              <button 
                onClick={onNavigateToLogin}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 group-hover:gap-2 transition-all"
              >
                <span>Know More</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 2. DMT */}
            <div className="bg-white rounded-3xl p-7 border border-slate-200/80 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition duration-300 flex flex-col items-center text-center group">
              <div className="w-16 h-16 rounded-full bg-[#0c2340] text-indigo-400 flex items-center justify-center mb-5 group-hover:scale-110 transition shadow-lg shadow-slate-900/10">
                <Send className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-1">DMT</h3>
              <p className="text-xs text-slate-500 font-medium mb-6 flex-1">
                Domestic Money Transfer
              </p>
              <button 
                onClick={onNavigateToLogin}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 group-hover:gap-2 transition-all"
              >
                <span>Know More</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 3. BBPS */}
            <div className="bg-white rounded-3xl p-7 border border-slate-200/80 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition duration-300 flex flex-col items-center text-center group">
              <div className="w-16 h-16 rounded-full bg-[#0c2340] text-cyan-400 flex items-center justify-center mb-5 group-hover:scale-110 transition shadow-lg shadow-slate-900/10">
                <Smartphone className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-1">BBPS</h3>
              <p className="text-xs text-slate-500 font-medium mb-6 flex-1">
                Bharat Bill Payment System
              </p>
              <button 
                onClick={onNavigateToLogin}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 group-hover:gap-2 transition-all"
              >
                <span>Know More</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 4. Loans */}
            <div className="bg-white rounded-3xl p-7 border border-slate-200/80 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition duration-300 flex flex-col items-center text-center group">
              <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center mb-5 group-hover:scale-110 transition shadow-lg shadow-emerald-500/20">
                <Banknote className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-1">Loans</h3>
              <p className="text-xs text-slate-500 font-medium mb-6 flex-1">
                Instant & Easy Loans
              </p>
              <button 
                onClick={onNavigateToLogin}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 group-hover:gap-2 transition-all"
              >
                <span>Know More</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 5. Insurance */}
            <div className="bg-white rounded-3xl p-7 border border-slate-200/80 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition duration-300 flex flex-col items-center text-center group">
              <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center mb-5 group-hover:scale-110 transition shadow-lg shadow-emerald-500/20">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-1">Insurance</h3>
              <p className="text-xs text-slate-500 font-medium mb-6 flex-1">
                Secure Your Future with Insurance
              </p>
              <button 
                onClick={onNavigateToLogin}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 group-hover:gap-2 transition-all"
              >
                <span>Know More</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================
          4. WHY CHOOSE US SECTION
          ======================================================== */}
      <section id="why-choose-us" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-14">
            <span className="text-xs font-extrabold uppercase tracking-widest text-blue-600 block mb-2">
              WHY CHOOSE US
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Trusted Service, Every Time
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left: Big Glossy 3D Shield Check Illustration */}
            <div className="lg:col-span-5 flex items-center justify-center">
              <div className="relative w-64 h-72 sm:w-72 sm:h-80 bg-gradient-to-tr from-blue-700 via-blue-600 to-cyan-500 rounded-3xl shadow-2xl shadow-blue-500/30 flex items-center justify-center transform hover:scale-105 transition duration-500">
                {/* Shield Contour Shape */}
                <div className="w-48 h-56 rounded-2xl bg-blue-600/60 border-2 border-white/30 backdrop-blur-sm flex items-center justify-center shadow-inner">
                  <div className="w-24 h-24 rounded-full bg-white/20 border-4 border-white flex items-center justify-center shadow-2xl">
                    <Check className="w-14 h-14 text-white stroke-[3.5]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Right: 2x2 Feature Grid */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-8">
              
              {/* Feature 1 */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900 mb-1">Secure Transactions</h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    Your security is our top priority with 100% safe transactions.
                  </p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900 mb-1">Fast Service</h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    Quick and instant services to save your valuable time.
                  </p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Headphones className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900 mb-1">Trusted Support</h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    Dedicated customer support always ready to help you.
                  </p>
                </div>
              </div>

              {/* Feature 4 */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <LayoutGrid className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900 mb-1">All-In-One Solution</h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    All banking, payment, loan & insurance services at one place.
                  </p>
                </div>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* ========================================================
          5. OUR FEATURES (DARK NAVY SECTION WITH STATS)
          ======================================================== */}
      <section id="features" className="py-20 bg-[#08172e] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left: 4 Features with Green Line Icons */}
            <div className="lg:col-span-8 space-y-8">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-widest text-cyan-400 block mb-2">
                  OUR FEATURES
                </span>
                <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                  Smart Solutions For Your Financial Needs
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4">
                
                {/* 1 */}
                <div className="space-y-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                    <Send className="w-5 h-5" />
                  </div>
                  <h4 className="text-base font-black text-white">Easy Money Transfer</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Send money instantly anywhere in India with secure transfer.
                  </p>
                </div>

                {/* 2 */}
                <div className="space-y-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <h4 className="text-base font-black text-white">Instant Bill Payment</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Pay electricity, mobile, DTH, water & more bills in just a few clicks.
                  </p>
                </div>

                {/* 3 */}
                <div className="space-y-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                    <Banknote className="w-5 h-5" />
                  </div>
                  <h4 className="text-base font-black text-white">Loan Assistance</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Get personal, business & other loans easily with minimal documents.
                  </p>
                </div>

                {/* 4 */}
                <div className="space-y-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                    <Umbrella className="w-5 h-5" />
                  </div>
                  <h4 className="text-base font-black text-white">Insurance Support</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Life, health, vehicle & other insurance plans to secure your future.
                  </p>
                </div>

              </div>
            </div>

            {/* Right: Stats Counter Box */}
            <div className="lg:col-span-4 bg-[#0d223f] border border-slate-700/60 rounded-3xl p-8 space-y-8 shadow-2xl">
              <div>
                <span className="text-4xl sm:text-5xl font-black text-white tracking-tight">1000+</span>
                <p className="text-xs font-semibold text-slate-300 mt-1 uppercase tracking-wider">Happy Customers</p>
              </div>

              <div className="border-t border-slate-700/60 pt-6">
                <span className="text-4xl sm:text-5xl font-black text-white tracking-tight">50+</span>
                <p className="text-xs font-semibold text-slate-300 mt-1 uppercase tracking-wider">Services Available</p>
              </div>

              <div className="border-t border-slate-700/60 pt-6">
                <span className="text-4xl sm:text-5xl font-black text-emerald-400 tracking-tight">100%</span>
                <p className="text-xs font-semibold text-slate-300 mt-1 uppercase tracking-wider">Secure & Reliable</p>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================
          6. CONTACT US SECTION
          ======================================================== */}
      <section id="contact" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-14">
            <span className="text-xs font-extrabold uppercase tracking-widest text-blue-600 block mb-2">
              CONTACT US
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              We Are Here To Help You
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            
            {/* Box 1: Contact Details List */}
            <div className="lg:col-span-4 bg-slate-50 border border-slate-200/80 rounded-3xl p-6 sm:p-8 space-y-6 flex flex-col justify-center">
              
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Phone</p>
                  <a href="tel:8469525602" className="text-sm font-black text-slate-900 hover:text-blue-600 transition">
                    8469525602
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Email</p>
                  <a href="mailto:asupport@aseasyswipe.com" className="text-sm font-bold text-slate-900 hover:text-blue-600 transition break-all">
                    asupport@aseasyswipe.com
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Website</p>
                  <a href="https://www.aseasyswipe.com" target="_blank" rel="noreferrer" className="text-sm font-bold text-slate-900 hover:text-blue-600 transition">
                    www.aseasyswipe.com
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Office Address</p>
                  <p className="text-xs font-semibold text-slate-700 leading-relaxed">
                    Above Yakinshahpir Dargah Gate, Taxi Stand, Panjarapol Bus Station Road, Mundra, Kutch – 370421
                  </p>
                </div>
              </div>

            </div>

            {/* Box 2: Need Help Card */}
            <div className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-lg shadow-slate-200/50">
              <div className="w-20 h-20 rounded-full bg-blue-600 text-white flex items-center justify-center mb-6 shadow-xl shadow-blue-600/30">
                <Headphones className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">Need Help?</h3>
              <p className="text-xs text-slate-500 font-medium max-w-xs mb-8">
                Our support team is always ready to assist you.
              </p>
              <a
                href="tel:8469525602"
                className="w-full py-3.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition transform hover:-translate-y-0.5"
              >
                <Phone className="w-4 h-4" />
                <span>Call Now</span>
              </a>
            </div>

            {/* Box 3: Embedded Google Maps */}
            <div className="lg:col-span-4 rounded-3xl overflow-hidden border border-slate-200 shadow-md min-h-[300px]">
              <iframe
                title="Office Location Mundra Kutch"
                src="https://maps.google.com/maps?q=Mundra%2C%20Gujarat%2C%20India&t=&z=14&ie=UTF8&iwloc=&output=embed"
                className="w-full h-full min-h-[320px] border-0"
                allowFullScreen={false}
                loading="lazy"
              />
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================
          7. FOOTER
          ======================================================== */}
      <footer className="bg-[#050e1d] text-slate-300 pt-16 pb-8 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 pb-14 border-b border-slate-800/80">
            
            {/* Col 1: Brand & About */}
            <div className="lg:col-span-4 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center font-black text-white text-base">
                  AS
                </div>
                <span className="text-lg font-black text-white tracking-tight">
                  AS <span className="text-cyan-400">EasySwipe</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
                Your one-stop platform for banking, payments, loans and insurance — simple, fast and secure.
              </p>
              
              {/* Social Icons */}
              <div className="flex items-center gap-3 pt-2">
                <a href="#" className="w-8 h-8 rounded-full bg-slate-800 hover:bg-blue-600 flex items-center justify-center text-white transition text-xs font-bold">
                  f
                </a>
                <a href="https://wa.me/918469525602" target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-slate-800 hover:bg-emerald-600 flex items-center justify-center text-white transition text-xs font-bold">
                  W
                </a>
                <a href="#" className="w-8 h-8 rounded-full bg-slate-800 hover:bg-pink-600 flex items-center justify-center text-white transition text-xs font-bold">
                  in
                </a>
                <a href="#" className="w-8 h-8 rounded-full bg-slate-800 hover:bg-red-600 flex items-center justify-center text-white transition text-xs font-bold">
                  Y
                </a>
              </div>
            </div>

            {/* Col 2: Quick Links */}
            <div className="lg:col-span-2 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-white">Quick Links</h4>
              <ul className="space-y-2 text-xs">
                <li><button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-blue-400 transition">Home</button></li>
                <li><button onClick={() => scrollToSection('services')} className="hover:text-blue-400 transition">Services</button></li>
                <li><button onClick={() => scrollToSection('why-choose-us')} className="hover:text-blue-400 transition">About Us</button></li>
                <li><button onClick={() => scrollToSection('contact')} className="hover:text-blue-400 transition">Contact Us</button></li>
                <li><button onClick={onNavigateToLogin} className="text-blue-400 font-bold hover:underline">Login</button></li>
              </ul>
            </div>

            {/* Col 3: Our Services */}
            <div className="lg:col-span-2 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-white">Our Services</h4>
              <ul className="space-y-2 text-xs">
                <li><button onClick={() => scrollToSection('services')} className="hover:text-blue-400 transition">AEPS</button></li>
                <li><button onClick={() => scrollToSection('services')} className="hover:text-blue-400 transition">DMT</button></li>
                <li><button onClick={() => scrollToSection('services')} className="hover:text-blue-400 transition">BBPS</button></li>
                <li><button onClick={() => scrollToSection('services')} className="hover:text-blue-400 transition">Loans</button></li>
                <li><button onClick={() => scrollToSection('services')} className="hover:text-blue-400 transition">Insurance</button></li>
              </ul>
            </div>

            {/* Col 4: Contact Info */}
            <div className="lg:col-span-2 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-white">Contact Info</h4>
              <ul className="space-y-2 text-xs text-slate-400">
                <li className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                  <span>8469525602</span>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                  <span className="truncate">asupport@aseasyswipe.com</span>
                </li>
                <li className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                  <span>www.aseasyswipe.com</span>
                </li>
              </ul>
            </div>

            {/* Col 5: Newsletter */}
            <div className="lg:col-span-2 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-white">Newsletter</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Subscribe to get updates and offers.
              </p>
              <form onSubmit={handleSubscribe} className="space-y-2">
                <input
                  type="email"
                  required
                  placeholder="Enter your email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  className="w-full py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition"
                >
                  {subscribed ? 'Subscribed! ✓' : 'Subscribe'}
                </button>
              </form>
            </div>

          </div>

          {/* Bottom Copyright */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
            <p>© 2026 AS EasySwipe Pvt Ltd. All Rights Reserved.</p>
            <p className="text-slate-400 font-medium">Your Trusted Financial Partner</p>
          </div>

        </div>
      </footer>
    </div>
  );
};
