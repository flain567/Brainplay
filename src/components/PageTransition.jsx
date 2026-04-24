import { useState, useEffect } from 'react'

export default function PageTransition({ children, pageKey }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(false)
    const t = setTimeout(() => setVisible(true), 30)
    return () => clearTimeout(t)
  }, [pageKey])

  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'none' : 'translateY(8px)',
      transition: 'opacity 0.35s ease, transform 0.35s ease',
      width: '100%',
      flex: 1,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {children}
    </div>
  )
}
