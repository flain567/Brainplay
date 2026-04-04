import React from 'react'

export default function BorderGlow({ children, className = '', glowColor = 'rgba(162, 41, 182, 0.8)', size = '2px', borderRadius = '24px', style = {} }) {
  return (
    <div 
      className={`border-glow-wrapper ${className}`}
      style={{ '--glow-color': glowColor, '--border-size': size, borderRadius, ...style }}
    >
      <div className="border-glow-content">
        {children}
      </div>
      <style>{`
        .border-glow-wrapper {
          position: relative;
          border-radius: inherit;
          display: inline-block;
          padding: var(--border-size);
          overflow: hidden;
          z-index: 1;
        }
        .border-glow-wrapper::before {
          content: "";
          position: absolute;
          inset: -50%;
          z-index: -2;
          background: conic-gradient(
            from 0deg,
            transparent 0%,
            transparent 30%,
            var(--glow-color) 40%,
            transparent 50%,
            transparent 80%,
            var(--glow-color) 90%,
            transparent 100%
          );
          animation: spin-glow 4s linear infinite;
        }
        .border-glow-wrapper::after {
          content: "";
          position: absolute;
          inset: var(--border-size);
          background: var(--surface, #1A1F35); /* Fallback dark surface */
          border-radius: inherit;
          z-index: -1;
        }
        .border-glow-content {
          position: relative;
          z-index: 1;
          height: 100%;
          width: 100%;
          border-radius: inherit;
        }
        @keyframes spin-glow {
          100% { transform: rotate(360deg); }
        }
        /* Sinkronisasi warna background di mode berbeda */
        body:not(.dark-mode) .border-glow-wrapper::after {
          background: #FFFFFF;
        }
      `}</style>
    </div>
  )
}
