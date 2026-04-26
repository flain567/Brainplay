import { useState, useEffect } from 'react'

export default function PageTransition({ children, pageKey }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(false)
    const t = setTimeout(() => setVisible(true), 30)
    return () => clearTimeout(t)
  }, [pageKey])

  return (
    <>
      <style>{`
        .page-transition-wrap {
          width: 100%;
          flex: 1;
          display: flex;
          flex-direction: column;
          transition: opacity 0.3s ease, transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1);
          will-change: opacity, transform;
        }
        .page-transition-wrap.entering {
          opacity: 0;
          transform: translateY(12px) scale(0.99);
        }
        .page-transition-wrap.visible {
          opacity: 1;
          transform: none;
        }
      `}</style>
      <div className={`page-transition-wrap ${visible ? 'visible' : 'entering'}`}>
        {children}
      </div>
    </>
  )
}
