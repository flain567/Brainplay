import { useState, useEffect } from 'react'
import { trackOnboardingStep, trackOnboardingComplete } from '../utils/analytics.js'

const ONBOARDED_KEY = 'bp_onboarded'
const FIRST_GAME_REWARD_KEY = 'bp_first_game_rewarded'

// 3 recommended starter games — mix of genres, easy to pick up
const STARTER_GAMES = [
  { id: 'memory-card',  emoji: '🃏', title: 'Memory Card',    desc: 'Cocokkan kartu — mudah dan adiktif!',   color: '#4ECDC4' },
  { id: 'word-search',  emoji: '🔍', title: 'Word Search',    desc: 'Temukan kata tersembunyi di grid!',     color: '#A29BFE' },
  { id: 'color-sort',   emoji: '🧪', title: 'Color Sort',     desc: 'Sortir bola warna ke tabung yang tepat!', color: '#FDCB6E' },
]

export function useOnboarding() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Show onboarding if user never completed it
    const done = localStorage.getItem(ONBOARDED_KEY)
    if (!done) setShow(true)
  }, [])

  const complete = () => {
    localStorage.setItem(ONBOARDED_KEY, 'true')
    setShow(false)
    trackOnboardingComplete()
  }

  return { showOnboarding: show, completeOnboarding: complete }
}

// Check & reward first game completion (called after any game finishes)
export function checkFirstGameReward(earnCoins) {
  if (localStorage.getItem(FIRST_GAME_REWARD_KEY)) return false
  const onboarded = localStorage.getItem(ONBOARDED_KEY)
  if (!onboarded) return false
  // First game completed after onboarding!
  localStorage.setItem(FIRST_GAME_REWARD_KEY, 'true')
  if (earnCoins) earnCoins(100, 'Bonus game pertama!')
  return true
}

export default function OnboardingModal({ onPickGame, onSkip }) {
  const [step, setStep] = useState(0) // 0 = welcome, 1 = pick game
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    trackOnboardingStep('welcome')
  }, [])

  const goToPickGame = () => {
    setStep(1)
    trackOnboardingStep('pick_game')
  }

  const pickGame = (gameId) => {
    setSelected(gameId)
    trackOnboardingStep('game_selected')
    // Small delay for visual feedback
    setTimeout(() => {
      localStorage.setItem(ONBOARDED_KEY, 'true')
      trackOnboardingComplete()
      onPickGame(gameId)
    }, 400)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
      animation: 'obFadeIn 0.4s ease',
    }}>
      <style>{`
        @keyframes obFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes obSlideUp { from { opacity: 0; transform: translateY(30px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes obPop { from { transform: scale(0.8); opacity: 0 } to { transform: scale(1); opacity: 1 } }
        @keyframes obFloat { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-8px) } }
        @keyframes obPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(78,205,196,0.4) } 50% { box-shadow: 0 0 0 12px rgba(78,205,196,0) } }
      `}</style>

      <div style={{
        background: 'linear-gradient(145deg, #1a1035, #0d0b1e)',
        borderRadius: 24, padding: step === 0 ? '40px 32px' : '32px 24px',
        maxWidth: 400, width: '100%',
        border: '1px solid rgba(162,155,254,0.2)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        animation: 'obSlideUp 0.5s ease',
      }}>
        {step === 0 ? (
          // ─── Welcome Step ──────────────────────────────────────
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: 64, marginBottom: 16,
              animation: 'obFloat 2s ease-in-out infinite',
              filter: 'drop-shadow(0 4px 20px rgba(78,205,196,0.4))',
            }}>
              🎮
            </div>

            <h2 style={{
              fontFamily: "'Fredoka One', cursive",
              fontSize: 28,
              background: 'linear-gradient(135deg, #FF6B6B, #A29BFE, #4ECDC4)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              margin: '0 0 12px',
            }}>
              Selamat Datang!
            </h2>

            <p style={{
              color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 1.6,
              margin: '0 0 8px',
            }}>
              BrainPlay punya <strong style={{ color: '#4ECDC4' }}>15 game</strong> seru untuk mengasah otakmu.
            </p>

            <p style={{
              color: 'rgba(255,255,255,0.5)', fontSize: 13, lineHeight: 1.5,
              margin: '0 0 28px',
            }}>
              Mainkan game pertamamu dan dapatkan <strong style={{ color: '#FDCB6E' }}>🪙 100 koin gratis</strong>!
            </p>

            <button
              onClick={goToPickGame}
              style={{
                background: 'linear-gradient(135deg, #4ECDC4, #44B09E)',
                color: '#fff', border: 'none', borderRadius: 14,
                padding: '14px 32px', fontSize: 16, fontWeight: 700,
                cursor: 'pointer', width: '100%',
                animation: 'obPulse 2s ease infinite',
                fontFamily: "'Fredoka One', cursive",
                letterSpacing: '0.5px',
              }}
            >
              Mulai Bermain! 🚀
            </button>
          </div>
        ) : (
          // ─── Pick Game Step ─────────────────────────────────────
          <div>
            <h3 style={{
              fontFamily: "'Fredoka One', cursive",
              fontSize: 20, color: '#fff',
              textAlign: 'center', margin: '0 0 6px',
            }}>
              🎯 Pilih Game Pertamamu!
            </h3>

            <p style={{
              color: 'rgba(255,255,255,0.5)', fontSize: 12, textAlign: 'center',
              margin: '0 0 20px',
            }}>
              Ketuk salah satu untuk langsung bermain
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {STARTER_GAMES.map((game, i) => (
                <button
                  key={game.id}
                  onClick={() => pickGame(game.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    background: selected === game.id
                      ? `linear-gradient(135deg, ${game.color}22, ${game.color}44)`
                      : 'rgba(255,255,255,0.04)',
                    border: selected === game.id
                      ? `2px solid ${game.color}`
                      : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 16, padding: '14px 16px',
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'all 0.2s ease',
                    transform: selected === game.id ? 'scale(1.02)' : 'scale(1)',
                    animation: `obSlideUp 0.4s ${0.1 * (i + 1)}s ease both`,
                  }}
                >
                  <div style={{
                    fontSize: 36, width: 52, height: 52,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: `${game.color}18`, borderRadius: 14,
                    flexShrink: 0,
                  }}>
                    {game.emoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      color: '#fff', fontWeight: 700, fontSize: 15, marginBottom: 2,
                    }}>
                      {game.title}
                    </div>
                    <div style={{
                      color: 'rgba(255,255,255,0.45)', fontSize: 12, lineHeight: 1.3,
                    }}>
                      {game.desc}
                    </div>
                  </div>
                  <div style={{
                    color: game.color, fontSize: 20, flexShrink: 0,
                    opacity: selected === game.id ? 1 : 0.3,
                    transition: 'opacity 0.2s',
                  }}>
                    ▶
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                localStorage.setItem(ONBOARDED_KEY, 'true')
                trackOnboardingStep('skipped')
                trackOnboardingComplete()
                onSkip()
              }}
              style={{
                background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)',
                fontSize: 12, cursor: 'pointer', width: '100%',
                marginTop: 16, padding: 8,
              }}
            >
              Lewati, saya mau eksplor sendiri →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
