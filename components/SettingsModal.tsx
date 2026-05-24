'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface AISettings {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface AppSettings {
  ai: AISettings;
  elevenLabsApiKey: string;
  elevenLabsVoiceId: string;
}

const STORAGE_KEY = 'clawlearn_settings';

const PRESETS: Array<{ label: string; baseUrl: string; model: string; docsUrl: string }> = [
  {
    label: 'Gemini (Google)',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    model: 'gemini-2.5-flash',
    docsUrl: 'https://aistudio.google.com/app/apikey',
  },
  {
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o',
    docsUrl: 'https://platform.openai.com/api-keys',
  },
  {
    label: 'Ollama (local)',
    baseUrl: 'http://localhost:11434/v1',
    model: 'llama3.1',
    docsUrl: 'https://ollama.com',
  },
  {
    label: 'Custom',
    baseUrl: '',
    model: '',
    docsUrl: '',
  },
];

const DEFAULT_SETTINGS: AppSettings = {
  ai: {
    apiKey: '',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    model: 'gemini-2.5-flash',
  },
  elevenLabsApiKey: '',
  elevenLabsVoiceId: 'pNInz6obpgDQGcFmaJgB',
};

export function loadSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showElevenKey, setShowElevenKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(0);

  // Load from localStorage on open
  useEffect(() => {
    if (isOpen) {
      const loaded = loadSettings();
      setSettings(loaded);
      // Detect which preset matches the current baseUrl
      const idx = PRESETS.findIndex(
        (p) => p.baseUrl && p.baseUrl === loaded.ai.baseUrl
      );
      setSelectedPreset(idx >= 0 ? idx : PRESETS.length - 1);
    }
  }, [isOpen]);

  const handlePreset = useCallback(
    (idx: number) => {
      setSelectedPreset(idx);
      const preset = PRESETS[idx];
      if (preset.baseUrl) {
        setSettings((s) => ({
          ...s,
          ai: {
            ...s.ai,
            baseUrl: preset.baseUrl,
            model: preset.model,
          },
        }));
      }
    },
    []
  );

  const handleSave = useCallback(() => {
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [settings]);

  const handleClear = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    setSettings(DEFAULT_SETTINGS);
    setSelectedPreset(0);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '9px 12px',
    background: 'rgba(13,17,23,0.06)',
    border: '1px solid rgba(13,17,23,0.15)',
    borderRadius: 4,
    fontFamily: '"DM Mono", monospace',
    fontSize: 12,
    color: 'var(--ink)',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: '"DM Mono", monospace',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: 'var(--ink-faint)',
    marginBottom: 6,
    display: 'block',
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: 24,
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const modal = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(13,17,23,0.4)',
              zIndex: 200,
            }}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              top: '50vh',
              left: '50vw',
              marginTop: 'calc(min(calc(100vh - 64px), 600px) / -2)',
              marginLeft: 'calc(min(520px, calc(100vw - 32px)) / -2)',
              width: 'min(520px, calc(100vw - 32px))',
              maxHeight: 'calc(100vh - 64px)',
              background: 'var(--cream)',
              borderRadius: 8,
              border: '1px solid rgba(13,17,23,0.12)',
              boxShadow: '0 24px 64px rgba(13,17,23,0.18)',
              zIndex: 201,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: '1px solid rgba(13,17,23,0.1)',
                flexShrink: 0,
              }}
            >
              <div>
                <h2
                  style={{
                    fontFamily: '"Playfair Display", serif',
                    fontWeight: 700,
                    fontSize: 18,
                    color: 'var(--ink)',
                    margin: 0,
                  }}
                >
                  Settings
                </h2>
                <p
                  style={{
                    fontFamily: '"DM Sans", sans-serif',
                    fontSize: 12,
                    color: 'var(--ink-faint)',
                    margin: '2px 0 0',
                  }}
                >
                  Keys are stored locally in your browser only.
                </p>
              </div>
              <button
                onClick={onClose}
                style={{
                  padding: 6,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: 'var(--ink-faint)',
                  borderRadius: 4,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '20px',
              }}
            >
              {/* ── AI Provider ── */}
              <div style={sectionStyle}>
                <div
                  style={{
                    fontFamily: '"DM Mono", monospace',
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: 'var(--indigo)',
                    marginBottom: 14,
                    paddingBottom: 8,
                    borderBottom: '1px solid rgba(13,17,23,0.08)',
                  }}
                >
                  AI Provider
                </div>

                {/* Preset buttons */}
                <div style={{ marginBottom: 14 }}>
                  <span style={labelStyle}>Provider preset</span>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {PRESETS.map((preset, idx) => (
                      <button
                        key={preset.label}
                        onClick={() => handlePreset(idx)}
                        style={{
                          padding: '5px 12px',
                          borderRadius: 3,
                          border: selectedPreset === idx
                            ? '1px solid var(--indigo)'
                            : '1px solid rgba(13,17,23,0.15)',
                          background: selectedPreset === idx
                            ? 'var(--indigo-light)'
                            : 'transparent',
                          color: selectedPreset === idx ? 'var(--indigo)' : 'var(--ink-muted)',
                          fontFamily: '"DM Sans", sans-serif',
                          fontSize: 12,
                          cursor: 'pointer',
                          transition: 'all 0.12s',
                        }}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  {PRESETS[selectedPreset]?.docsUrl && (
                    <a
                      href={PRESETS[selectedPreset].docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        marginTop: 6,
                        fontFamily: '"DM Sans", sans-serif',
                        fontSize: 11,
                        color: 'var(--indigo)',
                        textDecoration: 'none',
                      }}
                    >
                      Get API key <ExternalLink size={10} />
                    </a>
                  )}
                </div>

                {/* API Key */}
                <div style={{ marginBottom: 12 }}>
                  <span style={labelStyle}>API Key</span>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={settings.ai.apiKey}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          ai: { ...s.ai, apiKey: e.target.value },
                        }))
                      }
                      placeholder="sk-... or AIza..."
                      style={{ ...inputStyle, paddingRight: 36 }}
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <button
                      onClick={() => setShowApiKey((v) => !v)}
                      style={{
                        position: 'absolute',
                        right: 8,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        color: 'var(--ink-faint)',
                        padding: 2,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {showApiKey ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>

                {/* Base URL */}
                <div style={{ marginBottom: 12 }}>
                  <span style={labelStyle}>Base URL</span>
                  <input
                    type="text"
                    value={settings.ai.baseUrl}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        ai: { ...s.ai, baseUrl: e.target.value },
                      }))
                    }
                    placeholder="https://api.openai.com/v1"
                    style={inputStyle}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>

                {/* Model */}
                <div>
                  <span style={labelStyle}>Model</span>
                  <input
                    type="text"
                    value={settings.ai.model}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        ai: { ...s.ai, model: e.target.value },
                      }))
                    }
                    placeholder="gpt-4o"
                    style={inputStyle}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
              </div>

              {/* ── ElevenLabs ── */}
              <div style={sectionStyle}>
                <div
                  style={{
                    fontFamily: '"DM Mono", monospace',
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: 'var(--indigo)',
                    marginBottom: 14,
                    paddingBottom: 8,
                    borderBottom: '1px solid rgba(13,17,23,0.08)',
                  }}
                >
                  ElevenLabs Voice{' '}
                  <span
                    style={{
                      fontFamily: '"DM Sans", sans-serif',
                      fontSize: 10,
                      color: 'var(--ink-faint)',
                      textTransform: 'none',
                      letterSpacing: 0,
                    }}
                  >
                    (optional)
                  </span>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <span style={labelStyle}>ElevenLabs API Key</span>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showElevenKey ? 'text' : 'password'}
                      value={settings.elevenLabsApiKey}
                      onChange={(e) =>
                        setSettings((s) => ({ ...s, elevenLabsApiKey: e.target.value }))
                      }
                      placeholder="Leave blank to skip narration"
                      style={{ ...inputStyle, paddingRight: 36 }}
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <button
                      onClick={() => setShowElevenKey((v) => !v)}
                      style={{
                        position: 'absolute',
                        right: 8,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        color: 'var(--ink-faint)',
                        padding: 2,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {showElevenKey ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                  <a
                    href="https://elevenlabs.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      marginTop: 6,
                      fontFamily: '"DM Sans", sans-serif',
                      fontSize: 11,
                      color: 'var(--indigo)',
                      textDecoration: 'none',
                    }}
                  >
                    Get ElevenLabs key <ExternalLink size={10} />
                  </a>
                </div>

                <div>
                  <span style={labelStyle}>Voice ID</span>
                  <input
                    type="text"
                    value={settings.elevenLabsVoiceId}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, elevenLabsVoiceId: e.target.value }))
                    }
                    placeholder="pNInz6obpgDQGcFmaJgB"
                    style={inputStyle}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <p
                    style={{
                      fontFamily: '"DM Sans", sans-serif',
                      fontSize: 11,
                      color: 'var(--ink-faint)',
                      marginTop: 4,
                    }}
                  >
                    Default: Adam (pNInz6obpgDQGcFmaJgB)
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 20px',
                borderTop: '1px solid rgba(13,17,23,0.1)',
                flexShrink: 0,
                background: 'var(--cream)',
              }}
            >
              <button
                onClick={handleClear}
                style={{
                  padding: '7px 14px',
                  border: '1px solid rgba(13,17,23,0.15)',
                  borderRadius: 4,
                  background: 'transparent',
                  color: 'var(--ink-faint)',
                  fontFamily: '"DM Sans", sans-serif',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                Clear all
              </button>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {saved && (
                  <span
                    style={{
                      fontFamily: '"DM Mono", monospace',
                      fontSize: 11,
                      color: '#3a8a42',
                    }}
                  >
                    ✓ Saved
                  </span>
                )}
                <button
                  onClick={handleSave}
                  style={{
                    padding: '7px 18px',
                    border: 'none',
                    borderRadius: 4,
                    background: 'var(--indigo)',
                    color: 'var(--cream)',
                    fontFamily: '"DM Sans", sans-serif',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  if (!mounted) return null;
  return createPortal(modal, document.body);
}
