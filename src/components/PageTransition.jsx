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
          animation: pageEnter 0.28s ease-out both;
        }
        @keyframes pageEnter {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
      <div className={visible ? 'page-enter' : ''} style={{ opacity: visible ? 1 : 0 }}>
        {children}
      </div>
    </>
  )
}
