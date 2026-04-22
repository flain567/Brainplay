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
        .page-enter {
          animation: pageEnter 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) both;
        }
        @keyframes pageEnter {
          from { opacity: 0; transform: translateY(16px) scale(0.98); filter: blur(8px); }
          to   { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
      `}</style>
      <div className={visible ? 'page-enter' : ''} style={{ opacity: visible ? 1 : 0, width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </>
  )
}
