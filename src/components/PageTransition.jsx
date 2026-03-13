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
          animation: pageEnter 0.32s cubic-bezier(0.22,1,0.36,1) both;
        }
        @keyframes pageEnter {
          from { opacity: 0; transform: translateY(18px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
      `}</style>
      <div className={visible ? 'page-enter' : ''} style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.1s' }}>
        {children}
      </div>
    </>
  )
}
