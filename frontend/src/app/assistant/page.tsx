'use client';

import React, { useState, useEffect, useRef } from 'react';
import api from '../../lib/api';
import { ChatMessage } from '../../types/api';
import AlertBanner from '../../components/ui/AlertBanner';
import { getTranslation } from '../../lib/translations';
import {
  IconMessageSquare,
  IconMic,
  IconMicOff,
  IconSend,
  IconTrash2,
  IconVolume2,
  IconVolumeX,
  IconUser,
  IconBot,
} from '../../components/ui/Icons';

export default function AssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState<number | null>(null);
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

  const SUGGESTED_QUESTIONS_FR = [
    "Pourquoi les feuilles de mon cacaoyer jaunissent ?",
    "Comment soigner l'anthracnose de l'anacardier ?",
    "Quel est le meilleur moment pour planter le manioc ?",
    "Comment lutter contre les capsides du cacao ?",
  ];
  const SUGGESTED_QUESTIONS_BAOULE = [
    "Nzué ti yé n'glaa n'gba ka koka mun be nzo kôkô ?",
    "N'glaa ti koka anacardier anthracnose ?",
    "Blé kpè ti kpa kpa kpè manioc ?",
    "N'glaa ka capsule cacao ?",
  ];
  const SUGGESTED_QUESTIONS_DIOULA = [
    "Mun na ne ka cacao flayaw be dyèmèn ?",
    "Cogo di ka anacarde anthracnose kènèya ?",
    "Tumadi ka fisa ka banan ye don ?",
    "Cogo di ka cacao capside kèlè ?",
  ];

  const getSuggestedQuestions = () => {
    if (lang === 'baoule') return SUGGESTED_QUESTIONS_BAOULE;
    if (lang === 'dioula') return SUGGESTED_QUESTIONS_DIOULA;
    return SUGGESTED_QUESTIONS_FR;
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (text?: string) => {
    const content = (text || inputText).trim();
    if (!content || loading) return;

    const userMessage: ChatMessage = { role: 'user', content };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setLoading(true);
    setError(null);

    try {
      const response = await api.sendMessageToAssistant(userMessage.content, messages);
      const assistantMessage: ChatMessage = { role: 'assistant', content: response.response };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur de connexion avec l'assistant.";
      setError(msg);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleVoiceInput = () => {
    if (typeof window === 'undefined') return;

    if (lang !== 'fr') {
      setError(t('voiceError'));
    }

    type SpeechRecognitionCtor = new () => {
      lang: string;
      interimResults: boolean;
      maxAlternatives: number;
      onstart: (() => void) | null;
      onerror: ((e: { error: string }) => void) | null;
      onend: (() => void) | null;
      onresult: ((e: { results: { [k: number]: { [k: number]: { transcript: string } } } }) => void) | null;
      start: () => void;
    };

    const win = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
    const SpeechRecognitionCls = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionCls) {
      alert("La dictée vocale n'est pas supportée par votre navigateur. Essayez Google Chrome.");
      return;
    }
    const recognition = new SpeechRecognitionCls();
    recognition.lang = 'fr-FR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => { setIsListening(true); if (lang === 'fr') setError(null); };
    recognition.onerror = (event) => { setIsListening(false); setError(`Erreur vocale : ${event.error}.`); };
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event) => { setInputText(event.results[0][0].transcript); };
    recognition.start();
  };

  const handleSpeak = (text: string, index: number) => {
    if (typeof window === 'undefined') return;
    if (isSpeaking === index) {
      window.speechSynthesis.cancel();
      setIsSpeaking(null);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.onend = () => setIsSpeaking(null);
    utterance.onerror = () => setIsSpeaking(null);
    setIsSpeaking(index);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    return () => { if (typeof window !== 'undefined') window.speechSynthesis.cancel(); };
  }, []);

  return (
    <div className="flex flex-col animate-fade-in" style={{ height: 'calc(100vh - 9rem)' }}>

      {/* ===== Header ===== */}
      <div className="flex items-center justify-between pb-4 mb-4" style={{ borderBottom: '1px solid #e2e8f0' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.2)' }}>
            <IconMessageSquare size={18} style={{ color: '#0ea5e9' }} strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none">
              {t('assistantHeader')}
            </h1>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">
              {t('assistantSub')}
            </p>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            id="btn-clear-chat"
            onClick={() => { setMessages([]); setError(null); if (typeof window !== 'undefined') window.speechSynthesis.cancel(); }}
            className="btn btn-ghost text-xs px-3 py-2 inline-flex items-center gap-1.5"
            style={{ color: '#94a3b8' }}
          >
            <IconTrash2 size={14} strokeWidth={2} />
            {t('clearChat')}
          </button>
        )}
      </div>

      {error && <div className="mb-3"><AlertBanner type="warning" message={error} /></div>}

      {/* ===== Messages List ===== */}
      <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pr-1 pb-2">

        {/* Empty state */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 gap-6">
            <div className="space-y-2">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto animate-float"
                style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.15)' }}>
                <IconBot size={32} style={{ color: '#0ea5e9' }} strokeWidth={1.5} />
              </div>
              <h2 className="text-lg font-black text-slate-800">{t('howCanIHelp')}</h2>
              <p className="text-sm text-slate-400 font-medium max-w-xs">
                {t('howCanIHelpSub')}
              </p>
            </div>

            <div className="w-full max-w-md space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('suggestedQuestions')}</span>
              <div className="grid gap-2">
                {getSuggestedQuestions().map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(q)}
                    className="text-left px-4 py-3 rounded-xl text-sm font-medium text-slate-600 transition-all hover:shadow-sm inline-flex items-start gap-2.5"
                    style={{ background: 'white', border: '1px solid #e2e8f0' }}
                  >
                    <IconMessageSquare size={14} style={{ color: '#94a3b8', flexShrink: 0, marginTop: '2px' }} strokeWidth={2} />
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex gap-3 animate-slide-up ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* Avatar */}
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{
                background: msg.role === 'user' ? 'rgba(22,163,74,0.12)' : 'rgba(14,165,233,0.1)',
                border: msg.role === 'user' ? '1px solid rgba(22,163,74,0.2)' : '1px solid rgba(14,165,233,0.2)',
              }}>
              {msg.role === 'user'
                ? <IconUser size={14} style={{ color: '#15803d' }} strokeWidth={2} />
                : <IconBot size={14} style={{ color: '#0ea5e9' }} strokeWidth={2} />
              }
            </div>

            {/* Bubble */}
            <div className={`max-w-[80%] ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'} px-4 py-3`}>
              <p className="text-sm font-medium leading-relaxed whitespace-pre-line">
                {msg.content}
              </p>

              {msg.role === 'assistant' && (
                <div className="mt-2.5 pt-2 flex items-center justify-between" style={{ borderTop: '1px solid #f1f5f9' }}>
                  <button
                    onClick={() => handleSpeak(msg.content, index)}
                    className="btn btn-ghost text-xs px-2.5 py-1.5 inline-flex items-center gap-1.5"
                    style={{
                      color: isSpeaking === index ? '#ef4444' : '#94a3b8',
                      background: isSpeaking === index ? '#fef2f2' : 'transparent',
                    }}
                    aria-label={isSpeaking === index ? "Arrêter la lecture" : "Lire à voix haute"}
                  >
                    {isSpeaking === index
                      ? <><IconVolumeX size={13} strokeWidth={2} /> {t('stop')}</>
                      : <><IconVolume2 size={13} strokeWidth={2} /> {t('listen')}</>
                    }
                  </button>
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">IA AgriConnect</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex gap-3 animate-fade-in">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.2)' }}>
              <IconBot size={14} style={{ color: '#0ea5e9' }} strokeWidth={2} />
            </div>
            <div className="chat-bubble-ai px-4 py-3.5 flex items-center gap-2">
              <div className="flex gap-1">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
              <span className="text-xs font-semibold text-slate-400">{t('thinking')}</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ===== Input Area ===== */}
      <div className="pt-3 mt-3" style={{ borderTop: '1px solid #e2e8f0' }}>
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2 items-center">

          {/* Voice button */}
          <button
            type="button"
            id="btn-voice"
            onClick={handleVoiceInput}
            className="btn flex-shrink-0 inline-flex items-center justify-center"
            style={{
              width: '48px',
              height: '48px',
              padding: 0,
              borderRadius: '14px',
              background: isListening
                ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                : 'linear-gradient(135deg, #16a34a, #15803d)',
              color: 'white',
              boxShadow: isListening ? '0 0 0 4px rgba(239,68,68,0.2)' : '0 4px 12px rgba(22,163,74,0.3)',
              animation: isListening ? 'pulse-soft 1s ease-in-out infinite' : 'none',
            }}
            title={isListening ? "Arrêter la dictée" : "Activer la dictée vocale"}
            aria-label={isListening ? "Arrêter la dictée" : "Activer la dictée vocale"}
          >
            {isListening ? <IconMicOff size={18} strokeWidth={2} /> : <IconMic size={18} strokeWidth={2} />}
          </button>

          {/* Text input */}
          <input
            ref={inputRef}
            id="chat-input"
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder={isListening ? t('placeholderListening') : t('placeholder')}
            disabled={loading || isListening}
            className="input-field flex-1"
            aria-label="Message pour l'assistant"
          />

          {/* Send button */}
          <button
            type="submit"
            id="btn-send"
            disabled={loading || !inputText.trim() || isListening}
            className="btn btn-primary flex-shrink-0 inline-flex items-center gap-2"
            style={{ paddingLeft: '1.25rem', paddingRight: '1.25rem', height: '48px', borderRadius: '14px' }}
            aria-label="Envoyer le message"
          >
            {t('send')}
            <IconSend size={15} strokeWidth={2.25} />
          </button>
        </form>
      </div>
    </div>
  );
}
