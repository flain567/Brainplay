import { useEffect, useState } from 'react'

export default function SplashScreen({ onDone }) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 300)
    const t2 = setTimeout(() => setStep(2), 900)
    const t3 = setTimeout(() => setStep(3), 1500)
    const t4 = setTimeout(() => onDone(), 2000)
    return () => [t1,t2,t3,t4].forEach(clearTimeout)
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: 'linear-gradient(135deg,#0d0b1e,#1a0a2e)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      transition: 'opacity 0.4s ease',
      opacity: step === 3 ? 0 : 1,
    }}>
      <style>{`
        @keyframes splashPop  { from{transform:scale(0.3) rotate(-20deg);opacity:0} to{transform:scale(1) rotate(0deg);opacity:1} }
        @keyframes splashSlide{ from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes splashDot  { 0%,80%,100%{transform:scale(0)} 40%{transform:scale(1)} }
      `}</style>

      {/* Logo */}
      <div style={{
        fontSize: 80, marginBottom: 16,
        opacity: step >= 1 ? 1 : 0,
        animation: step >= 1 ? 'splashPop 0.5s cubic-bezier(0.34,1.56,0.64,1) both' : 'none',
        filter: 'drop-shadow(0 0 30px rgba(78,205,196,0.6))',
      }}>
        🎮
      </div>

      {/* Name */}
      <div style={{
        fontFamily: "'Fredoka One', cursive",
        fontSize: 42,
        background: 'linear-gradient(135deg,#FF6B6B,#A29BFE,#4ECDC4)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        opacity: step >= 1 ? 1 : 0,
        animation: step >= 1 ? 'splashSlide 0.4s 0.2s ease both' : 'none',
        marginBottom: 8,
      }}>
        BrainPlay
      </div>

      {/* Tagline */}
      <div style={{
        fontSize: 14, color: 'rgba(255,255,255,0.4)',
        fontWeight: 600, letterSpacing: '1px',
        opacity: step >= 2 ? 1 : 0,
        animation: step >= 2 ? 'splashSlide 0.4s ease both' : 'none',
        marginBottom: 48,
      }}>
        Santai & Mengasah Otak
      </div>

      {/* Loading dots */}
      <div style={{ display: 'flex', gap: 8, opacity: step >= 2 ? 1 : 0 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            width: 10, height: 10, borderRadius: '50%',
            background: ['#FF6B6B','#A29BFE','#4ECDC4'][i],
            animation: `splashDot 1s ${i * 0.16}s ease-in-out infinite`,
          }} />
        ))}
      </div>
    </div>
  )
}
