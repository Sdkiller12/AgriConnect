'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  IconHome,
  IconCamera,
  IconMessageSquare,
  IconTrendingUp,
  IconSun,
} from './Icons';

const navItems = [
  { href: '/',           Icon: IconHome,           label: 'Accueil',    id: 'home' },
  { href: '/diagnostic', Icon: IconCamera,          label: 'Diagnostic', id: 'diagnostic' },
  { href: '/assistant',  Icon: IconMessageSquare,   label: 'Assistant',  id: 'assistant' },
  { href: '/prix',       Icon: IconTrendingUp,      label: 'Prix',       id: 'prix' },
  { href: '/meteo',      Icon: IconSun,             label: 'Météo',      id: 'meteo' },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      aria-label="Navigation mobile"
      style={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(20px) saturate(1.8)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.8)',
        borderTop: '1px solid rgba(226,232,240,0.8)',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.06)',
      }}
    >
      <div className="flex items-stretch justify-around h-16 px-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.id}
              href={item.href}
              id={`nav-${item.id}`}
              className="flex flex-col items-center justify-center flex-1 gap-1 transition-all duration-200 relative"
              style={{ color: isActive ? '#15803d' : '#94a3b8' }}
              aria-current={isActive ? 'page' : undefined}
            >
              {/* Active indicator bar */}
              {isActive && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                  style={{ background: '#16a34a' }}
                />
              )}

              {/* Icon container */}
              <span
                className="flex items-center justify-center w-9 h-7 rounded-xl transition-all duration-200"
                style={{
                  background: isActive ? 'rgba(34,197,94,0.12)' : 'transparent',
                  transform: isActive ? 'scale(1.1)' : 'scale(1)',
                }}
              >
                <item.Icon size={18} strokeWidth={isActive ? 2.25 : 1.75} />
              </span>

              {/* Label */}
              <span
                className="text-[10px] leading-none transition-all duration-200"
                style={{ fontWeight: isActive ? 700 : 500 }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
