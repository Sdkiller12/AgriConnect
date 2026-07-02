'use client';

import React, { useState, useEffect, useRef } from 'react';
import api from '../../lib/api';
import { DiagnosticResponse } from '../../types/api';
import ConfidenceBadge from '../../components/ui/ConfidenceBadge';
import AlertBanner from '../../components/ui/AlertBanner';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { getTranslation } from '../../lib/translations';
import {
  IconCamera,
  IconFolder,
  IconLeaf,
  IconMicroscope,
  IconRefreshCw,
  IconX,
  IconLightbulb,
  IconFlask,
  IconFile,
} from '../../components/ui/Icons';

export default function DiagnosticPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnosticResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [culture, setCulture] = useState<string>('cacao');
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
    // Pré-charger silencieusement le modèle pour la culture sélectionnée
    api.prewarmModel(culture).catch((err) => {
      console.warn(`[Diagnostic] Échec du pré-chargement du modèle pour ${culture}:`, err);
    });
  }, [culture]);

  const CULTURES = [
    { value: 'cacao',    label: '🍫 Cacao' },
    { value: 'cafe',     label: '☕ Café' },
    { value: 'anacarde', label: '🥜 Anacarde' },
    { value: 'manioc',   label: '🌿 Manioc' },
  ];

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null);
      setError(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setResult(null);
        setError(null);
      } else {
        setError("Veuillez déposer un fichier image valide (JPG, PNG ou WEBP).");
      }
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await api.diagnosePlant(selectedFile, culture);
      setResult(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Impossible de contacter le serveur de diagnostic.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ===== Page Header ===== */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.2)' }}>
              <IconCamera size={18} style={{ color: '#16a34a' }} strokeWidth={2} />
            </span>
            {t('diagnosticHeader')}
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1 ml-[52px]">
            {t('diagnosticSub')}
          </p>
        </div>
      </div>

      {/* ===== Culture Selector ===== */}
      <div className="card p-4 animate-slide-up">
        <span className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-3">
          {t('culturePrompt')}
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {CULTURES.map((c) => (
            <button
              key={c.value}
              id={`culture-${c.value}`}
              onClick={() => setCulture(c.value)}
              className="py-2.5 px-3 rounded-xl text-sm font-bold transition-all duration-200"
              style={{
                background: culture === c.value ? 'rgba(22,163,74,0.12)' : '#f8fafc',
                border: `2px solid ${culture === c.value ? '#16a34a' : '#e2e8f0'}`,
                color: culture === c.value ? '#15803d' : '#64748b',
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {error && <AlertBanner type="error" message={error} />}

      {/* ===== Drop Zone ===== */}
      {!previewUrl && !loading && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className="animate-slide-up"
          style={{
            border: `2px dashed ${isDragging ? '#22c55e' : '#cbd5e1'}`,
            borderRadius: '24px',
            background: isDragging ? 'rgba(34,197,94,0.04)' : 'white',
            padding: '3rem 2rem',
            textAlign: 'center',
            transition: 'all 0.2s ease',
          }}
        >
          {/* Upload icon */}
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5 animate-float"
            style={{ background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.15)' }}>
            <IconLeaf size={36} style={{ color: '#16a34a' }} strokeWidth={1.25} />
          </div>

          <h2 className="text-lg font-black text-slate-800 mb-2">{t('selectPhoto')}</h2>
          <p className="text-sm text-slate-400 font-medium max-w-xs mx-auto mb-6 leading-relaxed">
            {t('selectPhotoSub')}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              id="btn-camera"
              onClick={() => cameraInputRef.current?.click()}
              className="btn btn-primary inline-flex items-center gap-2"
            >
              <IconCamera size={16} strokeWidth={2.25} />
              {t('takePhoto')}
            </button>
            <button
              id="btn-file"
              onClick={() => fileInputRef.current?.click()}
              className="btn btn-secondary inline-flex items-center gap-2"
            >
              <IconFolder size={16} strokeWidth={2} />
              {t('chooseFile')}
            </button>
          </div>

          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" aria-hidden />
          <input type="file" ref={cameraInputRef} onChange={handleFileChange} accept="image/*" capture="environment" className="hidden" aria-hidden />
        </div>
      )}

      {/* ===== Preview + Analyze ===== */}
      {previewUrl && !loading && !result && (
        <div className="card overflow-hidden animate-scale-in">
          <div className="relative" style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Aperçu"
              className="w-full object-contain"
              style={{ maxHeight: '320px' }}
            />
            {selectedFile && (
              <div className="absolute bottom-3 left-3 right-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold glass"
                  style={{ color: '#334155' }}>
                  <IconFile size={12} strokeWidth={2} />
                  {selectedFile.name}
                  <span className="text-slate-400">({(selectedFile.size / 1024).toFixed(0)} Ko)</span>
                </span>
              </div>
            )}
          </div>

          <div className="p-4 flex gap-3">
            <button
              id="btn-analyze"
              onClick={handleAnalyze}
              className="btn btn-primary flex-1 inline-flex items-center justify-center gap-2"
              style={{ paddingTop: '0.875rem', paddingBottom: '0.875rem', fontSize: '0.9375rem' }}
            >
              <IconMicroscope size={18} strokeWidth={2} />
              {t('analyzeBtn')}
            </button>
            <button
              id="btn-cancel"
              onClick={resetForm}
              className="btn btn-secondary inline-flex items-center gap-1.5 px-5"
            >
              <IconX size={16} strokeWidth={2.5} />
              {t('cancelBtn')}
            </button>
          </div>
        </div>
      )}

      {/* ===== Loading ===== */}
      {loading && (
        <div className="card p-10 flex items-center justify-center animate-fade-in">
          <LoadingSpinner message="Analyse IA en cours, cela peut prendre quelques secondes..." />
        </div>
      )}

      {/* ===== Results ===== */}
      {result && (
        <div className="space-y-5 animate-slide-up">
          <div className="card overflow-hidden">
            <div className="flex flex-col md:flex-row">

              {/* Image */}
              <div className="md:w-2/5 flex-shrink-0" style={{ background: '#f8fafc', borderRight: '1px solid #e2e8f0' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl || ''}
                  alt="Plante"
                  className="w-full h-full object-cover"
                  style={{ minHeight: '240px', maxHeight: '340px' }}
                />
              </div>

              {/* Diagnostic info */}
              <div className="flex flex-col p-6 gap-4 flex-1">

                <div>
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1">
                    {t('diagnosticResult')}
                  </span>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="badge badge-green text-xs">
                      {CULTURES.find(c => c.value === result.culture)?.label ?? result.culture}
                    </span>
                  </div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight capitalize">
                    {result.label.replace(/_/g, ' ')}
                  </h2>
                </div>

                <ConfidenceBadge confidence={result.confidence} />

                {result.warning && (
                  <div className="flex items-start gap-2 p-3.5 rounded-xl text-sm font-medium"
                    style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#b45309' }}>
                    <span className="flex-shrink-0 mt-0.5">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    </span>
                    <span>{result.warning}</span>
                  </div>
                )}

                {/* Recommendations */}
                <div className="flex-1">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                    <IconLightbulb size={13} strokeWidth={2.25} />
                    {t('recommendedTreatments')}
                  </h3>
                  <ul className="space-y-2">
                    {result.recommandations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-slate-600 font-medium leading-relaxed">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-black mt-0.5"
                          style={{ background: 'rgba(22,163,74,0.1)', color: '#15803d' }}>
                          {index + 1}
                        </span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Fallback results */}
                {result.fallback_used && result.fallback_results && (
                  <div className="p-4 rounded-xl space-y-2" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <IconFlask size={12} strokeWidth={2.25} />
                      {t('secondOpinion')}
                    </h4>
                    <div className="space-y-1.5">
                      {result.fallback_results.map((res, index) => (
                        <div key={index} className="flex items-center justify-between gap-3">
                          <span className="text-xs font-semibold text-slate-600 truncate">{res.label}</span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="w-20 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${res.score * 100}%`, background: '#16a34a' }} />
                            </div>
                            <span className="text-xs font-bold text-slate-400">{Math.round(res.score * 100)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2" style={{ borderTop: '1px solid #f1f5f9' }}>
                  <button
                    id="btn-new-diagnosis"
                    onClick={resetForm}
                    className="btn btn-primary w-full inline-flex items-center justify-center gap-2"
                  >
                    <IconRefreshCw size={16} strokeWidth={2.25} />
                    {t('newAnalysis')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
