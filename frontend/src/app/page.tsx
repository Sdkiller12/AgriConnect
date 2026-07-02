'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getTranslation } from '../lib/translations';
import {
  IconCamera,
  IconMessageSquare,
  IconTrendingUp,
  IconSun,
  IconLeaf,
  IconMicroscope,
  IconGlobe,
  IconWifiOff,
  IconArrowRight,
} from '../components/ui/Icons';

export default function HomePage() {
  const [lang, setLang] = useState('fr');

  useEffect(() => {
    const saved = localStorage.getItem('agri_lang');
    if (saved) {
      setLang(saved);
    }
  }, []);

  const changeLang = (l: string) => {
    localStorage.setItem('agri_lang', l);
    setLang(l);
    // Déclencher un événement de stockage pour mettre à jour les autres composants
    window.dispatchEvent(new Event('storage'));
  };

  const t = (key: string) => getTranslation(lang, key);

  const localizedFeatures = [
    {
      id: 'diagnostic',
      title: t('diagnosticTitle'),
      description: t('diagnosticDesc'),
      Icon: IconCamera,
      href: "/diagnostic",
      accentColor: '#16a34a',
      lightColor: 'rgba(22,163,74,0.08)',
      borderColor: 'rgba(22,163,74,0.2)',
      label: t('diagnoseBtn'),
      badge: lang === 'fr' ? "IA Visuelle" : (lang === 'baoule' ? "Koka IA" : "IA Bana"),
      badgeBg: '#f0fdf4',
      badgeColor: '#15803d',
    },
    {
      id: 'assistant',
      title: t('assistantTitle'),
      description: t('assistantDesc'),
      Icon: IconMessageSquare,
      href: "/assistant",
      accentColor: '#0ea5e9',
      lightColor: 'rgba(14,165,233,0.08)',
      borderColor: 'rgba(14,165,233,0.2)',
      label: t('assistantCTA'),
      badge: lang === 'fr' ? "Voix + Texte" : (lang === 'baoule' ? "Tie + Usa" : "Baro + Vocal"),
      badgeBg: '#f0f9ff',
      badgeColor: '#0369a1',
    },
    {
      id: 'prix',
      title: t('prixTitle'),
      description: t('prixDesc'),
      Icon: IconTrendingUp,
      href: "/prix",
      accentColor: '#d97706',
      lightColor: 'rgba(217,119,6,0.08)',
      borderColor: 'rgba(217,119,6,0.2)',
      label: t('prixCTA'),
      badge: lang === 'fr' ? "Temps réel" : (lang === 'baoule' ? "Cours ndèndè" : "Sòngow bi"),
      badgeBg: '#fffbeb',
      badgeColor: '#b45309',
    },
    {
      id: 'meteo',
      title: t('meteoTitle'),
      description: t('meteoDesc'),
      Icon: IconSun,
      href: "/meteo",
      accentColor: '#7c3aed',
      lightColor: 'rgba(124,58,237,0.08)',
      borderColor: 'rgba(124,58,237,0.2)',
      label: t('meteoCTA'),
      badge: lang === 'fr' ? "7 jours" : (lang === 'baoule' ? "7 cèn" : "7 don"),
      badgeBg: '#f5f3ff',
      badgeColor: '#6d28d9',
    }
  ];

  const localizedStats = [
    { value: '38+', label: t('statMaladies'), Icon: IconMicroscope },
    { value: '5',   label: t('statCultures'), Icon: IconLeaf },
    { value: '5',   label: t('statRegions'), Icon: IconGlobe },
    { value: '0 G', label: t('statConnexion'), Icon: IconWifiOff },
  ];

  return (
    <div className="space-y-10 animate-fade-in">

      {/* ===== Hero Section ===== */}
      <section className="relative overflow-hidden rounded-3xl text-white py-12 px-6 md:px-10" style={{
        background: 'linear-gradient(135deg, #064e3b 0%, #065f46 40%, #0f766e 100%)',
      }}>
        {/* Decorative orbs */}
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(52,211,153,0.25) 0%, transparent 70%)' }} />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.2) 0%, transparent 70%)' }} />

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '32px 32px'
        }} />

        <div className="relative z-10 max-w-2xl">
          {/* Tag */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5 text-xs font-bold tracking-wide"
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.9)' }}>
            <span className="status-dot" style={{ background: '#4ade80', boxShadow: '0 0 0 2px rgba(74,222,128,0.25)' }} />
            {t('heroTag')}
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-[1.1] mb-4">
            {t('heroTitle')}{' '}
            <span style={{
              background: 'linear-gradient(135deg, #4ade80 0%, #38bdf8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              {t('heroSubTitle')}
            </span>
          </h1>

          {/* Description */}
          <p className="text-base md:text-lg leading-relaxed mb-8" style={{ color: 'rgba(255,255,255,0.75)' }}>
            {t('heroDesc')}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-3">
            <Link href="/diagnostic"
              className="btn inline-flex items-center gap-2"
              style={{
                background: 'white',
                color: '#065f46',
                fontWeight: 700,
                paddingLeft: '1.5rem',
                paddingRight: '1.5rem',
                boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
              }}
            >
              <IconCamera size={16} strokeWidth={2.25} />
              {t('diagnoseBtn')}
            </Link>
            <Link href="/assistant"
              className="btn inline-flex items-center gap-2"
              style={{
                background: 'rgba(255,255,255,0.12)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.25)',
                fontWeight: 600,
              }}
            >
              <IconMessageSquare size={16} strokeWidth={2.25} />
              {t('askBtn')}
            </Link>
          </div>
        </div>

        {/* Decorative icon */}
        <div className="absolute right-6 bottom-6 opacity-10 pointer-events-none animate-float">
          <IconLeaf size={96} strokeWidth={1} style={{ color: 'white' }} />
        </div>
      </section>

      {/* ===== Stats Row ===== */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3" aria-label="Statistiques">
        {localizedStats.map((stat, i) => (
          <div key={i} className="card p-4 text-center animate-slide-up" style={{ animationDelay: `${i * 0.08}s` }}>
            <div className="flex justify-center mb-2">
              <stat.Icon size={22} style={{ color: '#16a34a' }} />
            </div>
            <div className="text-2xl font-black text-slate-800 tracking-tight leading-none">
              {stat.value}
            </div>
            <div className="text-xs font-semibold text-slate-400 mt-1 leading-tight">{stat.label}</div>
          </div>
        ))}
      </section>

      {/* ===== Feature Cards Grid ===== */}
      <section aria-label="Fonctionnalités principales">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-black text-slate-800 tracking-tight">{t('whatToDo')}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {localizedFeatures.map((feat, i) => (
            <Link
              key={feat.id}
              href={feat.href}
              id={`feature-${feat.id}`}
              className="group card card-interactive flex flex-col p-6 gap-5 no-underline animate-slide-up"
              style={{ animationDelay: `${0.1 + i * 0.08}s` }}
            >
              {/* Top: Icon + Badge */}
              <div className="flex items-start justify-between">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: feat.lightColor, border: `1px solid ${feat.borderColor}` }}>
                  <feat.Icon size={24} style={{ color: feat.accentColor }} strokeWidth={1.75} />
                </div>
                <span className="badge text-xs" style={{ background: feat.badgeBg, color: feat.badgeColor, border: `1px solid ${feat.borderColor}` }}>
                  {feat.badge}
                </span>
              </div>

              {/* Content */}
              <div className="flex flex-col flex-1 gap-2">
                <h3 className="text-lg font-black text-slate-800 tracking-tight leading-tight">{feat.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed font-medium">{feat.description}</p>
              </div>

              {/* Footer CTA */}
              <div className="flex items-center justify-between pt-4" style={{ borderTop: '1px solid #f1f5f9' }}>
                <span className="text-sm font-bold" style={{ color: feat.accentColor }}>{feat.label}</span>
                <span className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 group-hover:translate-x-1"
                  style={{ background: feat.lightColor, color: feat.accentColor }}>
                  <IconArrowRight size={16} strokeWidth={2.5} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ===== Language Footer ===== */}
      <footer className="pt-2 pb-2" aria-label="Sélection de langue">
        <div className="card p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-sm flex-wrap">
            <span className="text-slate-400 font-semibold text-xs uppercase tracking-wider flex items-center gap-1.5">
              <IconGlobe size={14} />
              {t('langActive')}
            </span>
            <button
              id="lang-fr"
              onClick={() => changeLang('fr')}
              className={`badge cursor-pointer transition-all ${lang === 'fr' ? 'badge-green font-bold' : 'badge-slate opacity-70 hover:opacity-100'}`}
            >
              FR · Français
            </button>
            <button
              id="lang-baoule"
              onClick={() => changeLang('baoule')}
              className={`badge cursor-pointer transition-all ${lang === 'baoule' ? 'badge-green font-bold' : 'badge-slate opacity-70 hover:opacity-100'}`}
            >
              CI · Baoulé
            </button>
            <button
              id="lang-dioula"
              onClick={() => changeLang('dioula')}
              className={`badge cursor-pointer transition-all ${lang === 'dioula' ? 'badge-green font-bold' : 'badge-slate opacity-70 hover:opacity-100'}`}
            >
              CI · Dioula
            </button>
          </div>
          <p className="text-xs text-slate-400 font-medium">
            AgriConnect IA v1.0 — Côte d&apos;Ivoire
          </p>
        </div>
      </footer>
    </div>
  );
}
