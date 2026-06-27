import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Wallet, Shield, Zap, BarChart3, Users, MessageSquare } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="relative flex flex-col min-h-screen overflow-hidden bg-background">
      {/* Background Glows */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-primary/20 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-0 -right-4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[150px] -z-10" />

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
            <Wallet className="text-white w-6 h-6" />
          </div>
          <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
            MoneyTrack Pro
          </span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <Link href="#features" className="hover:text-primary transition-colors">Features</Link>
          <Link href="#telegram" className="hover:text-primary transition-colors">Telegram Bot</Link>
          <Link href="#pricing" className="hover:text-primary transition-colors">Pricing</Link>
        </nav>
        <div className="flex items-center gap-4">
          <Link href="/auth">
            <Button variant="ghost" className="text-muted-foreground hover:text-primary">
              Sign In
            </Button>
          </Link>
          <Link href="/auth?signup=true">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20">
              Get Started
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="px-6 py-24 md:py-32 flex flex-col items-center text-center max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            v2.0.0 — Personal Edition is here
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50">
            Control Your Finances <br /> With Unmatched Speed.
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-12 leading-relaxed">
            The ultimate expense tracker for professionals. Log transactions via Telegram in seconds, visualize spending patterns, and stay within your budget.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/auth?signup=true">
              <Button size="lg" className="h-14 px-8 text-lg font-semibold bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20">
                Get Started Free
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="h-14 px-8 text-lg font-semibold border-white/10 hover:bg-white/5">
              Watch Demo
            </Button>
          </div>

          {/* Dashboard Preview Mockup */}
          <div className="mt-20 w-full rounded-2xl border border-white/5 bg-white/5 p-4 backdrop-blur-sm relative group overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
             <div className="aspect-[16/9] bg-zinc-950 rounded-xl flex items-center justify-center border border-white/5 shadow-2xl">
                <div className="flex flex-col items-center gap-4 text-white/20">
                  <BarChart3 size={48} className="animate-pulse" />
                  <span className="text-sm font-medium">Dashboard Preview — Real-time Analytics</span>
                </div>
             </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="px-6 py-24 bg-zinc-950/50">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<MessageSquare className="text-sky-400" />}
              title="Telegram First"
              description="Log expenses instantly via our Telegram bot. No app to open, no forms to fill. Just type '20k makan'."
            />
            <FeatureCard 
              icon={<Users className="text-emerald-400" />}
              title="Multi-Account Tracking"
              description="Manage all your wallets, banks, and credit cards in one unified dashboard effortlessly."
            />
            <FeatureCard 
              icon={<Shield className="text-primary" />}
              title="Privacy First"
              description="Your data is encrypted and isolated. Your personal finances stay strictly private."
            />
          </div>
        </section>
      </main>

      <footer className="px-6 py-12 border-t border-white/5 text-center text-sm text-muted-foreground">
        <p>© 2026 MoneyTrack Pro. Built for professionals.</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-8 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-all duration-300">
      <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3 text-white">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  );
}
