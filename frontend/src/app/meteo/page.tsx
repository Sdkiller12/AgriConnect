'use client';

import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { WeatherResponse, WeatherDayForecast } from '../../types/api';
import AlertBanner from '../../components/ui/AlertBanner';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { getTranslation } from '../../lib/translations';
import {
  IconSun,
  IconCloudRain,
  IconCloud,
  IconDroplet,
  IconMapPin,
  IconAlertTriangle,
  IconCheckCircle,
  IconInfo,
  IconThermometer,
} from '../../components/ui/Icons';

const regions = [
  { value: 'Abidjan', label: 'Abidjan', sub: 'Sud' },
  { value: 'San-Pedro', label: 'San-Pédro', sub: 'Sud-Ouest' },
  { value: 'Yamoussoukro', label: 'Yamoussoukro', sub: 'Centre' },
  { value: 'Daloa', label: 'Daloa', sub: 'Ouest' },
  { value: 'Bouake', label: 'Bouaké', sub: 'Centre-Nord' },
];

function WeatherIcon({ precipMm, maxTemp, size = 40 }: { precipMm: number; maxTemp: number; size?: number }) {
  if (precipMm > 20) return <IconCloudRain size={size} strokeWidth={1.5} style={{ color: '#60a5fa' }} />;
  if (precipMm > 5)  return <IconCloudRain size={size} strokeWidth={1.5} style={{ color: '#93c5fd' }} />;
  if (precipMm > 0)  return <IconCloud     size={size} strokeWidth={1.5} style={{ color: '#94a3b8' }} />;
  if (maxTemp > 34)  return <IconThermometer size={size} strokeWidth={1.5} style={{ color: '#f87171' }} />;
  return <IconSun size={size} strokeWidth={1.5} style={{ color: '#fbbf24' }} />;
}

export default function MeteoPage() {
  const [region, setRegion] = useState('Abidjan');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<WeatherResponse | null>(null);
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
    const fetchWeather = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.getWeather(region);
        setData(res);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Les prévisions météo sont indisponibles hors connexion.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    fetchWeather();
  }, [region]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      weekday: date.toLocaleDateString('fr-FR', { weekday: 'long' }),
      dayMonth: date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
    };
  };

  const translateAlert = (alertText: string) => {
    if (lang === 'fr') return alertText;
    const lower = alertText.toLowerCase();
    if (lower.includes("fortes pluies") || lower.includes("pourriture")) {
      return lang === 'baoule' 
        ? "⚠️ Pluie kpa: n'glaa koka pourriture brune risque... Ka yo chemical treatment djanmian."
        : "⚠️ San yiriba be na: cacao pourriture brune bana be na... Ka furukè dabila bi don.";
    }
    if (lower.includes("pluie modérée") || lower.includes("humidité")) {
      return lang === 'baoule'
        ? "Pluie ndèndè: nian humidity koka pied..."
        : "San dɔoni be na: i bolo don humidity na...";
    }
    if (lower.includes("temps sec") || lower.includes("irrigation")) {
      return lang === 'baoule'
        ? "Wyo sec: irrigation koka run..."
        : "Fongolo: i bolo don san siri yiriba...";
    }
    return lang === 'baoule' ? "Normal kpa." : "Météo fisa.";
  };

  const getRiskLevel = (alerte: string) => {
    if (alerte.includes('⚠️') || alerte.toLowerCase().includes('danger') || alerte.toLowerCase().includes('risque élevé')) {
      return { Icon: IconAlertTriangle, color: '#b45309', bg: '#fffbeb', border: '#fde68a' };
    }
    if (alerte.toLowerCase().includes('pluie') || alerte.toLowerCase().includes('humidité')) {
      return { Icon: IconInfo, color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' };
    }
    return { Icon: IconCheckCircle, color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' };
  };

  const getMajorAlert = (forecasts: WeatherDayForecast[]): { text: string; type: 'warning' | 'info' | 'success' } => {
    const clean = (s: string) => s.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
    const dangerForecast = forecasts.find(f => f.alerte_agronomique.includes('⚠️'));
    if (dangerForecast) return { text: translateAlert(clean(dangerForecast.alerte_agronomique)), type: 'warning' };
    const cautionForecast = forecasts.find(f => f.precipitation_mm > 20);
    if (cautionForecast) return { text: translateAlert(clean(cautionForecast.alerte_agronomique)), type: 'info' };
    return { text: lang === 'fr' ? "Conditions météorologiques calmes. Bonnes conditions pour les traitements phytosanitaires." : (lang === 'baoule' ? "Normal kpa koka treatments." : "Météo fisa furukè dèmèya."), type: 'success' };
  };

  const todayForecast = data?.forecast[0];

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ===== Page Header ===== */}
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}>
            <IconSun size={18} style={{ color: '#7c3aed' }} strokeWidth={2} />
          </span>
          {t('meteoHeader')}
        </h1>
        <p className="text-sm font-medium text-slate-500 mt-1 ml-[52px]">
          {t('meteoSub')}
        </p>
      </div>

      {error && <AlertBanner type="warning" message={error} />}

      {/* ===== Region selector ===== */}
      <div className="card p-5 animate-slide-up">
        <div className="space-y-1.5">
          <label htmlFor="select-meteo-region" className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <IconMapPin size={13} strokeWidth={2.25} />
            {t('selectRegion')}
          </label>
          <select
            id="select-meteo-region"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="select-field"
          >
            {regions.map((r) => (
              <option key={r.value} value={r.value}>{r.label} ({r.sub})</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="card p-10">
          <LoadingSpinner message="Mise à jour des prévisions météorologiques..." />
        </div>
      ) : (
        data && data.forecast.length > 0 && (
          <div className="space-y-5 animate-slide-up">

            {/* ===== Major Alert Banner ===== */}
            {(() => {
              const alert = getMajorAlert(data.forecast);
              return <AlertBanner type={alert.type} message={alert.text} />;
            })()}

            {/* ===== Today's highlight card ===== */}
            {todayForecast && (
              <div className="rounded-2xl overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)', border: '1px solid #334155' }}>
                <div className="p-6 flex items-start justify-between flex-wrap gap-4">
                  <div>
                    <span className="text-xs font-black uppercase tracking-widest flex items-center gap-1.5" style={{ color: '#64748b' }}>
                      <IconMapPin size={11} strokeWidth={2.25} style={{ color: '#64748b' }} />
                      {t('today')} · {regions.find(r => r.value === region)?.label}
                    </span>
                    <div className="flex items-baseline gap-3 mt-2">
                      <span className="text-6xl font-black tracking-tight" style={{ color: 'white' }}>
                        {Math.round(todayForecast.temp_max)}°
                      </span>
                      <span className="text-2xl font-bold" style={{ color: '#64748b' }}>
                        / {Math.round(todayForecast.temp_min)}°C
                      </span>
                    </div>
                    <p className="text-sm font-semibold mt-2 flex items-center gap-2" style={{ color: '#94a3b8' }}>
                      {todayForecast.precipitation_mm > 0
                        ? <><IconCloudRain size={14} strokeWidth={2} style={{ color: '#60a5fa' }} /> {t('rain')} : {todayForecast.precipitation_mm} mm</>
                        : <><IconSun size={14} strokeWidth={2} style={{ color: '#fbbf24' }} /> {t('today')} sec</>
                      }
                    </p>
                  </div>
                  <div style={{ opacity: 0.7 }}>
                    <WeatherIcon precipMm={todayForecast.precipitation_mm} maxTemp={todayForecast.temp_max} size={72} />
                  </div>
                </div>

                <div className="px-6 pb-5">
                  <div className="rounded-xl p-3 text-sm font-medium" style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}>
                    {translateAlert(todayForecast.alerte_agronomique)}
                  </div>
                </div>
              </div>
            )}

            {/* ===== 7-Day Grid ===== */}
            <div>
              <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-3 px-1">
                {t('forecast7')}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.forecast.map((day, idx) => {
                  const { weekday, dayMonth } = formatDate(day.date);
                  const risk = getRiskLevel(day.alerte_agronomique);

                  return (
                    <div key={idx} className="card p-4 space-y-3 animate-slide-up" style={{ animationDelay: `${idx * 0.05}s` }}>
                      {/* Date + weather icon */}
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-sm font-black text-slate-800 capitalize">{weekday}</h4>
                          <p className="text-xs font-semibold text-slate-400 mt-0.5">{dayMonth}</p>
                        </div>
                        <WeatherIcon precipMm={day.precipitation_mm} maxTemp={day.temp_max} size={28} />
                      </div>

                      {/* Temp + rain */}
                      <div className="flex items-center justify-between py-2.5"
                        style={{ borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
                        <div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1 block mb-0.5">
                            <IconThermometer size={10} strokeWidth={2.5} /> {t('temp')}
                          </span>
                          <span className="text-lg font-black text-slate-800">
                            {Math.round(day.temp_max)}°
                            <span className="text-sm font-semibold text-slate-400"> / {Math.round(day.temp_min)}°</span>
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1 justify-end block mb-0.5">
                            <IconDroplet size={10} strokeWidth={2.5} /> {t('rain')}
                          </span>
                          <span className="text-lg font-black text-slate-800">
                            {day.precipitation_mm}
                            <span className="text-sm font-semibold text-slate-400"> mm</span>
                          </span>
                        </div>
                      </div>

                      {/* Alert */}
                      <div className="p-2.5 rounded-xl text-xs font-semibold leading-relaxed flex items-start gap-2"
                        style={{ background: risk.bg, color: risk.color, border: `1px solid ${risk.border}` }}>
                        <risk.Icon size={13} strokeWidth={2.25} style={{ flexShrink: 0, marginTop: '1px' }} />
                        <span>{translateAlert(day.alerte_agronomique)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}
