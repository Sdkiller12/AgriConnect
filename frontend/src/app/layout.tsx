import type { Metadata } from "next";
import "./globals.css";
import Link from 'next/link';
import NavBar from '../components/ui/NavBar';

export const metadata: Metadata = {
  title: "AgriConnect IA — L'expert agricole dans votre poche",
  description: "Diagnostic de maladies par photo, conseils de culture, cours des prix et météo agricole en Côte d'Ivoire.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
        <meta name="theme-color" content="#15803d" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col">

        {/* ===== Header ===== */}
        <header className="sticky top-0 z-40 w-full glass border-b border-white/50" style={{boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 20px rgba(0,0,0,0.04)'}}>
          <div className="container-app">
            <div className="flex items-center justify-between h-16">

              {/* Logo */}
              <Link href="/" className="flex items-center gap-2.5 group" aria-label="AgriConnect IA — Accueil">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background: 'linear-gradient(135deg, #16a34a 0%, #0ea5e9 100%)', boxShadow: '0 4px 10px rgba(22,163,74,0.35)'}}>
                  {/* Leaf icon */}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/>
                    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
                  </svg>
                </div>
                <div className="leading-none">
                  <span className="font-black text-base tracking-tight text-slate-800">
                    AGRI<span style={{color: '#16a34a'}}>CONNECT</span>
                  </span>
                  <span className="block text-[10px] font-bold text-slate-400 tracking-widest uppercase leading-none mt-0.5">
                    Intelligence Agricole
                  </span>
                </div>
              </Link>

              {/* Desktop Nav */}
              <nav className="hidden md:flex items-center gap-1" aria-label="Navigation principale">
                <Link href="/" className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all duration-150">
                  Accueil
                </Link>
                <Link href="/diagnostic" className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all duration-150">
                  Diagnostic
                </Link>
                <Link href="/assistant" className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all duration-150">
                  Assistant
                </Link>
                <Link href="/prix" className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all duration-150">
                  Prix
                </Link>
                <Link href="/meteo" className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all duration-150">
                  Météo
                </Link>
              </nav>

              {/* Status Badge */}
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                <span className="status-dot" style={{width:'7px',height:'7px'}}></span>
                CI · Hors-ligne disponible
              </div>

              {/* Mobile status */}
              <div className="md:hidden flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-100">
                <span className="status-dot" style={{width:'6px',height:'6px'}}></span>
                <span>En ligne</span>
              </div>
            </div>
          </div>
        </header>

        {/* ===== Page Content ===== */}
        <main className="flex-1 container-app py-5 md:py-8 pb-28 md:pb-8">
          <div className="page-enter">
            {children}
          </div>
        </main>

        {/* ===== Mobile Bottom Navigation ===== */}
        <NavBar />

        {/* ===== Registre Service Worker pour la PWA ===== */}
        <script dangerouslySetInnerHTML={{__html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js').then(function(reg) {
                console.log('[PWA] Service Worker enregistré avec succès. Scope:', reg.scope);
              }, function(err) {
                console.log('[PWA] Échec d\\'enregistrement du Service Worker:', err);
              });
            });
          }
        `}} />

      </body>
    </html>
  );
}
