'use client';

import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { PriceTrendResponse } from '../../types/api';
import AlertBanner from '../../components/ui/AlertBanner';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { getTranslation } from '../../lib/translations';
import {
  IconTrendingUp,
  IconTrendingDown,
  IconBarChart2,
  IconActivity,
} from '../../components/ui/Icons';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';

const regions = [
  { value: 'Abidjan', label: 'Abidjan' },
  { value: 'San-Pedro', label: 'San-Pédro' },
  { value: 'Yamoussoukro', label: 'Yamoussoukro' },
  { value: 'Daloa', label: 'Daloa' },
  { value: 'Bouake', label: 'Bouaké' },
];

const cultures = [
  { value: 'cacao',          label: 'Cacao' },
  { value: 'cafe',           label: 'Café' },
  { value: 'anacarde',       label: 'Anacarde' },
  { value: 'banane_plantain',label: 'Banane plantain' },
  { value: 'manioc',         label: 'Manioc' },
];

export default function PrixPage() {
  const [region, setRegion] = useState('Abidjan');
  const [culture, setCulture] = useState('cacao');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PriceTrendResponse | null>(null);
  const [chartData, setChartData] = useState<{ name: string; Prix: number }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState('fr');

  useEffect(() => {
    const updateLang = () => {
      setLang(localStorage.getItem('agri_lang') || 'fr');
    };
    updateLang();
    window.addEventListener('storage', updateLang);
    return () => window.removeEventListener('storage', updateLang);
  }, []);

  const t = (key: string) => getTranslation(lang, key);

  useEffect(() => {
    const fetchPriceData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.getMarketPrice(culture, region);
        setData(res);

        const points: { name: string; Prix: number }[] = [];
        const days = 30;
        const currentPrice = res.prix_actuel_fcfa_kg;
        const variationPct = res.variation_pct_30j;
        const startPrice = currentPrice / (1 + (variationPct / 100));
        const priceStep = (currentPrice - startPrice) / days;

        for (let i = 0; i <= days; i++) {
          const date = new Date();
          date.setDate(date.getDate() - (days - i));
          const noise = i === days ? 0 : (Math.random() - 0.5) * (currentPrice * 0.02);
          const price = Math.round(startPrice + (priceStep * i) + noise);
          points.push({
            name: date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
            Prix: price
          });
        }
        setChartData(points);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Impossible de récupérer les cours du marché.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    fetchPriceData();
  }, [culture, region]);

  const getTrend = (tendance: string) => {
    if (tendance === 'hausse') return { Icon: IconTrendingUp, label: lang === 'fr' ? 'En hausse' : (lang === 'baoule' ? 'Kôkô' : 'Yiriba'), color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' };
    if (tendance === 'baisse') return { Icon: IconTrendingDown, label: lang === 'fr' ? 'En baisse' : (lang === 'baoule' ? 'Sian' : 'Koro'), color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' };
    return { Icon: IconActivity, label: lang === 'fr' ? 'Stable' : (lang === 'baoule' ? 'Stable' : 'Stable'), color: '#374151', bg: '#f9fafb', border: '#e5e7eb' };
  };

  const getCultureLabel = (val: string) => {
    if (lang === 'fr') {
      if (val === 'banane_plantain') return 'Banane plantain';
      return val.charAt(0).toUpperCase() + val.slice(1);
    }
    if (lang === 'baoule') {
      if (val === 'cacao') return 'Cacao';
      if (val === 'cafe') return 'Café';
      if (val === 'anacarde') return 'Anacarde';
      if (val === 'banane_plantain') return 'Mande';
      if (val === 'manioc') return 'Manioc';
    }
    if (lang === 'dioula') {
      if (val === 'cacao') return 'Cacao';
      if (val === 'cafe') return 'Café';
      if (val === 'anacarde') return 'Anacarde';
      if (val === 'banane_plantain') return 'Baranda';
      if (val === 'manioc') return 'Bana';
    }
    return val;
  };

  const translateAdvice = (adv: string) => {
    if (lang === 'fr') return adv;
    const lower = adv.toLowerCase();
    if (lower.includes("bon moment") || lower.includes("vendre")) {
      return lang === 'baoule' ? "Blé kpa ti o sa fa koka mun di ndèndè..." : "Waati bɛ ye ka sòngow siri ndèndè...";
    }
    if (lower.includes("bas") || lower.includes("stockez")) {
      return lang === 'baoule' ? "Prix ti ye kpa: nian koka mun be cache..." : "Sòngow ti fisa: marasogo run ka ta...";
    }
    return lang === 'baoule' ? "Prix ti stable. Vendez koka..." : "Sòngow be stable. Sòngow siri...";
  };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ===== Page Header ===== */}
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(217,119,6,0.1)', border: '1px solid rgba(217,119,6,0.2)' }}>
            <IconTrendingUp size={18} style={{ color: '#d97706' }} strokeWidth={2} />
          </span>
          {t('prixHeader')}
        </h1>
        <p className="text-sm font-medium text-slate-500 mt-1 ml-[52px]">
          {t('prixSub')}
        </p>
      </div>

      {error && <AlertBanner type="warning" message={error} />}

      {/* ===== Filters ===== */}
      <div className="card p-5 animate-slide-up">
        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">{t('select')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="select-culture" className="text-xs font-bold text-slate-500">{t('cultureLabel')}</label>
            <select id="select-culture" value={culture} onChange={(e) => setCulture(e.target.value)} className="select-field">
              {cultures.map((c) => (
                <option key={c.value} value={c.value}>{getCultureLabel(c.value)}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="select-region" className="text-xs font-bold text-slate-500">{t('regionLabel')}</label>
            <select id="select-region" value={region} onChange={(e) => setRegion(e.target.value)} className="select-field">
              {regions.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card p-10">
          <LoadingSpinner message="Récupération des cours actuels..." />
        </div>
      ) : (
        data && (
          <div className="space-y-5 animate-slide-up">

            {/* ===== Price + Trend Row ===== */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

              {/* Current price card */}
              <div className="card p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('todayPrice')}</span>
                  <IconBarChart2 size={18} style={{ color: '#94a3b8' }} strokeWidth={1.75} />
                </div>
                <div>
                  <div className="text-4xl font-black text-slate-800 tracking-tight leading-none">
                    {data.prix_actuel_fcfa_kg.toLocaleString('fr-FR')}
                  </div>
                  <div className="text-sm font-bold text-slate-400 mt-1">FCFA / kg · {getCultureLabel(culture)}</div>
                </div>

                {/* Trend badge */}
                {(() => {
                  const trend = getTrend(data.tendance);
                  return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                      style={{ background: trend.bg, color: trend.color, border: `1px solid ${trend.border}` }}>
                      <trend.Icon size={12} strokeWidth={2.5} />
                      {trend.label} ({data.variation_pct_30j > 0 ? '+' : ''}{data.variation_pct_30j}%)
                    </span>
                  );
                })()}
              </div>

              {/* Recommendation card */}
              <div className="md:col-span-2 rounded-2xl p-6 space-y-3 flex flex-col justify-between"
                style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', border: '1px solid #334155' }}>
                <div>
                  <span className="text-xs font-black uppercase tracking-widest" style={{ color: '#64748b' }}>
                    {t('commercialAdvice')}
                  </span>
                  <h3 className="text-base font-bold mt-2" style={{ color: '#4ade80' }}>Recommandation</h3>
                  <p className="text-sm leading-relaxed mt-1 font-medium" style={{ color: '#cbd5e1' }}>
                    {translateAdvice(data.recommandation)}
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-3" style={{ borderTop: '1px solid #334155' }}>
                  <span className="status-dot" style={{ background: '#4ade80', boxShadow: '0 0 0 2px rgba(74,222,128,0.2)' }} />
                  <span className="text-xs font-bold" style={{ color: '#64748b' }}>
                    Données indicatives — Mise à jour quotidienne
                  </span>
                </div>
              </div>
            </div>

            {/* ===== Chart ===== */}
            <div className="card p-6 space-y-4">
              <div>
                <h3 className="text-base font-black text-slate-800 tracking-tight">
                  {t('priceTrend')}
                </h3>
                <p className="text-xs font-semibold text-slate-400 mt-0.5">
                  {t('variationIndicative')} · {getCultureLabel(culture)} · {regions.find(r => r.value === region)?.label}
                </p>
              </div>

              <div style={{ height: '240px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22c55e" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#22c55e" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }}
                      stroke="transparent"
                      tickLine={false}
                      interval={6}
                    />
                    <YAxis
                      domain={['auto', 'auto']}
                      tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }}
                      stroke="transparent"
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '12px',
                        color: '#f8fafc',
                        fontSize: '12px',
                        fontWeight: 700,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                      }}
                      formatter={(value) => { const n = Number(value); return isNaN(n) ? ['—', 'Prix'] : [`${n.toLocaleString('fr-FR')} FCFA/kg`, 'Prix']; }}
                    />
                    <Area
                      type="monotone"
                      dataKey="Prix"
                      stroke="#16a34a"
                      strokeWidth={2.5}
                      fill="url(#priceGradient)"
                      dot={false}
                      activeDot={{ r: 5, fill: '#16a34a', stroke: 'white', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}
