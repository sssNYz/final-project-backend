import { ArrowDown, Heart, Shield, Activity, Smartphone, User, Stethoscope } from "lucide-react";
import Link from "next/link";

export default function Page() {
  return (
    // Main Container with Scroll Snap
    <main className="h-screen w-full overflow-y-scroll snap-y snap-mandatory scroll-smooth">

      {/* SECTION 1: HERO - INTRODUCTION */}
      <section id="hero" className="relative w-full h-screen snap-start flex flex-col items-center justify-center bg-slate-900 text-white overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-40">
          <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-blue-500 rounded-full blur-[120px] mix-blend-screen animate-pulse duration-10000"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-teal-500 rounded-full blur-[120px] mix-blend-screen delay-1000 animate-pulse duration-10000"></div>
        </div>

        <div className="relative z-10 flex flex-col items-center text-center px-4 max-w-4xl mx-auto space-y-8">
          <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-md py-2 px-6 rounded-full border border-white/20 shadow-xl">
            <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
            <span className="text-sm md:text-base font-medium tracking-wide text-blue-50">WELCOME TO THE FUTURE OF HEALTH</span>
          </div>

          <h1 className="text-6xl md:text-8xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-white via-blue-100 to-blue-300 drop-shadow-sm">
            Medi Buddy
          </h1>

          <p className="text-lg md:text-2xl text-blue-100/80 max-w-2xl leading-relaxed">
            Your intelligent health companion. Instant analysis, secure records, and 24/7 monitoring in one seamless experience.
          </p>

          <div className="flex flex-wrap gap-4 mt-8 justify-center">
            <button className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-semibold transition-all shadow-lg hover:shadow-blue-500/30 flex items-center gap-2 group">
              Get Started <ArrowDown className="w-4 h-4 group-hover:translate-y-1 transition-transform" />
            </button>
            <button className="px-8 py-4 bg-white/5 hover:bg-white/10 backdrop-blur-sm text-white border border-white/10 rounded-full font-semibold transition-all">
              Learn More
            </button>
          </div>
        </div>

        {/* Scroll Indicator */}
        <Link href="#features" className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce text-blue-200/50 cursor-pointer hover:text-white transition-colors">
          <span className="text-xs uppercase tracking-widest mb-2 block text-center">Scroll to Change</span>
          <ArrowDown className="w-6 h-6 mx-auto" />
        </Link>
      </section>

      {/* SECTION 2: FEATURES - THE CHANGE */}
      {/* This section flips to a light theme for the 'change' effect */}
      <section id="features" className="relative w-full h-screen snap-start flex flex-col items-center justify-center bg-white text-slate-900 overflow-hidden py-20">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-slate-900">
              Complete Health Control
            </h2>
            <p className="text-xl text-slate-500">
              Scroll down to experience how Medi Buddy transforms complex medical data into actionable insights.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group relative p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:border-blue-200 hover:shadow-2xl hover:shadow-blue-100/50 transition-all duration-500">
              <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Activity className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-slate-800">Real-time Monitoring</h3>
              <p className="text-slate-500 leading-relaxed">
                Track your vitals instantly. Our smart algorithms detect anomalies before they become issues.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group relative p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:border-teal-200 hover:shadow-2xl hover:shadow-teal-100/50 transition-all duration-500">
              <div className="w-14 h-14 bg-teal-100 text-teal-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Shield className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-slate-800">Secure Privacy</h3>
              <p className="text-slate-500 leading-relaxed">
                Your data is encrypted with military-grade security. Only you decide who sees your records.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group relative p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:border-rose-200 hover:shadow-2xl hover:shadow-rose-100/50 transition-all duration-500">
              <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Stethoscope className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-slate-800">Expert Connect</h3>
              <p className="text-slate-500 leading-relaxed">
                Connect with top specialists in seconds. Get second opinions and prescriptions seamlessly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: MOBILE FIT / DOWNLOAD */}
      <section id="download" className="relative w-full h-screen snap-start flex items-center bg-slate-50 overflow-hidden">
        {/* Decorative blob */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-tr from-blue-600 to-teal-400 rounded-full opacity-10 blur-3xl"></div>

        <div className="container px-4 md:px-6 mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="w-full md:w-1/2 space-y-8">
              <h2 className="text-5xl md:text-7xl font-bold tracking-tighter text-slate-900">
                Fits Your <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-500">
                  Life & Screen
                </span>
              </h2>
              <p className="text-xl text-slate-600 max-w-lg">
                Designed for every device. Whether you're on a phone, tablet, or desktop, Medi Buddy adapts perfectly to your needs.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <button className="flex items-center gap-3 px-6 py-4 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors shadow-xl">
                  <Smartphone className="w-6 h-6" />
                  <div className="text-left">
                    <div className="text-xs opacity-70">Download on the</div>
                    <div className="font-bold leading-none">App Store</div>
                  </div>
                </button>
                <button className="flex items-center gap-3 px-6 py-4 bg-slate-200 text-slate-900 rounded-xl hover:bg-slate-300 transition-colors">
                  <User className="w-6 h-6" />
                  <div className="text-left">
                    <div className="text-xs opacity-70">Log in via</div>
                    <div className="font-bold leading-none">Web Portal</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Mockup Area */}
            <div className="w-full md:w-1/2 flex justify-center perspective-[1000px]">
              <div className="relative w-[300px] h-[600px] bg-slate-900 rounded-[40px] border-8 border-slate-800 shadow-2xl rotate-y-[-10deg] rotate-x-[5deg] hover:rotate-0 transition-transform duration-700 overflow-hidden">
                {/* Screen Content */}
                <div className="w-full h-full bg-slate-800 relative">
                  {/* Header */}
                  <div className="absolute top-0 w-full h-24 bg-blue-600 rounded-b-3xl z-10 p-6 flex items-end justify-between">
                    <span className="font-bold text-white text-lg">Medi Buddy</span>
                    <div className="w-8 h-8 bg-white/20 rounded-full"></div>
                  </div>
                  {/* Content Body */}
                  <div className="p-4 pt-28 space-y-4">
                    <div className="h-32 bg-slate-700/50 rounded-2xl animate-pulse"></div>
                    <div className="h-16 bg-slate-700/30 rounded-xl"></div>
                    <div className="h-16 bg-slate-700/30 rounded-xl"></div>
                    <div className="h-40 bg-teal-500/20 rounded-2xl border border-teal-500/30 p-4">
                      <div className="w-1/2 h-4 bg-teal-400/50 rounded mb-2"></div>
                      <div className="w-3/4 h-4 bg-teal-400/30 rounded"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
