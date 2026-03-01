'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from '../../components/motion';
import { playClick } from '../../lib/sfx-utils';
import CloseIcon from './CloseIcon';

interface ShareModalProps {
  show: boolean;
  text: string;
  url: string;
  onClose: () => void;
}

const SOCIALS = [
  { name: 'X', color: '#000', icon: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
  ), getUrl: (text: string, url: string) => `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}` },
  { name: 'WhatsApp', color: '#25D366', icon: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
  ), getUrl: (text: string, url: string) => `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}` },
  { name: 'Telegram', color: '#26A5E4', icon: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /></svg>
  ), getUrl: (text: string, url: string) => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}` },
  { name: 'LinkedIn', color: '#0A66C2', icon: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
  ), getUrl: (text: string, url: string) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&summary=${encodeURIComponent(text)}` },
  { name: 'Facebook', color: '#1877F2', icon: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
  ), getUrl: (text: string, url: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}` },
];

export default function ShareModal({ show, text, url, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    playClick();
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  return (
    <AnimatePresence>
      {show && (
        <>
          <motion.div
            key="share-backdrop"
            className="fixed inset-0 z-50 bg-black/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { playClick(); onClose(); }}
          />
          <motion.div
            key="share-modal"
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <div className="pointer-events-auto w-[340px] bg-surface-darker border border-surface rounded-sm shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <h2 className="text-sm font-bold uppercase tracking-wider">Share Result</h2>
                <button onClick={() => { playClick(); onClose(); }} className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-foreground transition-colors">
                  <CloseIcon />
                </button>
              </div>

              {/* Preview text */}
              <div className="px-5 pb-4">
                <p className="text-[11px] text-gray-500 leading-relaxed whitespace-pre-line line-clamp-3">{text}</p>
              </div>

              {/* Copy link */}
              <div className="px-5 pb-4">
                <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-1.5">Copy Link</p>
                <button
                  onClick={copyLink}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-surface border border-surface-dark rounded-sm hover:bg-surface-hover transition-colors group"
                >
                  <span className="flex-1 text-[11px] text-gray-400 truncate text-left">{url}</span>
                  <span className="text-[9px] uppercase tracking-wider font-bold shrink-0 transition-colors" style={{ color: copied ? '#4ade80' : undefined }}>
                    {copied ? 'Copied!' : 'Copy'}
                  </span>
                </button>
              </div>

              {/* Social buttons */}
              <div className="px-5 pb-5">
                <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-3">Share To</p>
                <div className="flex items-center justify-between">
                  {SOCIALS.map((s) => (
                    <a
                      key={s.name}
                      href={s.getUrl(text, url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => playClick()}
                      className="flex flex-col items-center gap-1.5 group"
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white transition-transform hover:scale-110 active:scale-95"
                        style={{ backgroundColor: s.color }}
                      >
                        {s.icon}
                      </div>
                      <span className="text-[8px] text-gray-600 uppercase tracking-wider group-hover:text-gray-400 transition-colors">{s.name}</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
