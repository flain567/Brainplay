import { useState, useEffect, useRef } from 'react'
import { trackOnboardingStep, trackOnboardingComplete } from '../utils/analytics.js'

const ONBOARDED_KEY = 'bp_onboarded'
const FIRST_GAME_REWARD_KEY = 'bp_first_game_rewarded'

// ─── Genre definitions ──────────────────────────────────────────────────────
const GENRES = [
  { id: 'puzzle',      label: 'Puzzle',       icon: '🧩', color: '#E84393' },
  { id: 'action',      label: 'Action',       icon: '🔥', color: '#FF6B6B' },
  { id: 'kata',        label: 'Kata',         icon: '📝', color: '#55EFC4' },
  { id: 'logika',      label: 'Logika',       icon: '🧠', color: '#0984E3' },
  { id: 'pengetahuan', label: 'Pengetahuan',  icon: '🇮🇩', color: '#F39C12' },
  { id: 'casual',      label: 'Casual',       icon: '🎯', color: '#4ECDC4' },
]

// ─── Genre → tag mapping (matches GAMES[].tag in App.jsx) ───────────────────
const GENRE_TAG_MAP = {
  puzzle:      ['Puzzle'],
  action:      ['Action'],
  kata:        ['Kata'],
  logika:      ['Logika'],
  pengetahuan: ['Pengetahuan'],
  casual:      ['Casual', 'Action'],
}

// ─── All games (lightweight copy for onboarding only) ───────────────────────
const ALL_GAMES = [
  { id: 'memory-card',     emoji: '🃏', title: 'Memory Card',       desc: 'Cocokkan pasangan kartu tersembunyi!',         tag: 'Puzzle',      diff: 'Mudah' },
  { id: 'slither-worm',    emoji: '🐍', title: 'Slither Worm',      desc: 'Kendalikan cacing neon, jangan nabrak!',        tag: 'Action',      diff: 'Mudah' },
  { id: '2048',             emoji: '🔗', title: 'Connect Blocks',    desc: 'Sambungkan blok angka yang sama!',              tag: 'Puzzle',      diff: 'Sedang' },
  { id: 'word-search',     emoji: '🔍', title: 'Word Search',       desc: 'Temukan kata tersembunyi di grid!',             tag: 'Puzzle',      diff: 'Mudah' },
  { id: 'space-shooter',   emoji: '🚀', title: 'Space Shooter',     desc: 'Hancurkan wave alien dan boss!',                tag: 'Action',      diff: 'Sedang' },
  { id: 'hangman',          emoji: '💀', title: 'Hangman',            desc: 'Tebak kata tersembunyi huruf per huruf!',       tag: 'Kata',        diff: 'Mudah' },
  { id: 'color-sort',      emoji: '🧪', title: 'Color Sort',        desc: 'Sortir bola warna ke tabung yang tepat!',       tag: 'Puzzle',      diff: 'Mudah' },
  { id: 'sudoku',           emoji: '🔢', title: 'Sudoku',             desc: 'Isi grid 9×9 tanpa duplikat!',                  tag: 'Logika',      diff: 'Sedang' },
  { id: 'jigsaw',           emoji: '🧩', title: 'Jigsaw Puzzle',     desc: 'Susun potongan gambar jadi utuh!',              tag: 'Puzzle',      diff: 'Mudah' },
  { id: 'memory-pattern',  emoji: '🧠', title: 'Memory Pattern Pro', desc: 'Ingat & ulangi pola yang menyala!',             tag: 'Puzzle',      diff: 'Sedang' },
  { id: 'reaction-test',   emoji: '⚡', title: 'Reaction Test',     desc: 'Uji kecepatan reaksimu!',                       tag: 'Action',      diff: 'Mudah' },
  { id: 'neon-dash',        emoji: '💎', title: 'Neon Dash',          desc: 'Lari & lompat melewati rintangan neon!',        tag: 'Action',      diff: 'Sedang' },
  { id: 'brick-breaker',   emoji: '🧱', title: 'Brick Breaker',     desc: 'Hancurkan semua bata dengan bola pantul!',      tag: 'Action',      diff: 'Sedang' },
  { id: 'wordle',           emoji: '💬', title: 'Wordle Indonesia',   desc: 'Tebak kata 5 huruf bahasa Indonesia!',          tag: 'Kata',        diff: 'Sedang' },
  { id: 'voxel-racer',     emoji: '🚗', title: 'Voxel Racer',       desc: 'Balapan 3D, hindari rintangan!',                tag: 'Action',      diff: 'Sedang' },
  { id: 'math-challenge',  emoji: '🧮', title: 'Math Challenge',    desc: 'Jawab soal matematika sebelum waktu habis!',    tag: 'Logika',      diff: 'Sedang' },
  { id: 'number-sequence', emoji: '🔢', title: 'Number Sequence',   desc: 'Temukan pola dalam deret angka!',               tag: 'Logika',      diff: 'Sedang' },
  { id: 'quiz-trivia',     emoji: '🇮🇩', title: 'Quiz Trivia',       desc: 'Uji pengetahuan umummu tentang Indonesia!',     tag: 'Pengetahuan', diff: 'Mudah' },
  { id: 'binary-puzzle',   emoji: '🔲', title: 'Binary Puzzle',     desc: 'Isi grid dengan 0 dan 1!',                      tag: 'Logika',      diff: 'Sedang' },
  { id: 'sliding-puzzle',  emoji: '🧩', title: 'Sliding Puzzle',    desc: 'Geser tile untuk menyusun urutan!',             tag: 'Puzzle',      diff: 'Mudah' },
  { id: 'tower-hanoi',     emoji: '🗼', title: 'Tower of Hanoi',    desc: 'Pindahkan disk ke tiang kanan!',                tag: 'Logika',      diff: 'Sedang' },
  { id: 'minesweeper',     emoji: '💣', title: 'Minesweeper',       desc: 'Buka kotak tanpa kena bom!',                    tag: 'Logika',      diff: 'Sedang' },
  { id: 'fields-adventure', emoji: '🗺️', title: 'Fields of Adventure', desc: 'Jelajahi dunia pixel art!',                   tag: 'Action',      diff: 'Mudah' },
  { id: 'letter-tiles',    emoji: '🔤', title: 'Letter Tiles',      desc: 'Susun huruf acak jadi kata!',                   tag: 'Kata',        diff: 'Mudah' },
]

const FALLBACK_GAMES = ['memory-card', 'word-search', 'color-sort']

const FEATURE_CARDS = [
  { icon: '🪙', title: 'Koin & XP',        desc: 'Main game, kumpulkan koin untuk beli cosmetics', color: '#FDCB6E' },
  { icon: '📅', title: 'Daily Challenge',   desc: 'Selesaikan misi harian, jaga streak-mu',         color: '#FF6B6B' },
  { icon: '🎡', title: 'Lucky Wheel',       desc: 'Spin tiap hari untuk item eksklusif',             color: '#A29BFE' },
]

const DIFF_COLORS = { 'Mudah': '#4ECDC4', 'Sedang': '#F39C12', 'Sulit': '#FF6B6B' }

// ─── Shared styles ──────────────────────────────────────────────────────────
const S = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 9999,
    background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(10px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 16,
  },
  card: {
    background: 'linear-gradient(160deg, #1a1035, #0d0b1e)',
    borderRadius: 28, padding: '32px 24px',
    maxWidth: 420, width: '100%',
    border: '1.5px solid rgba(162,155,254,0.15)',
    boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
    maxHeight: '92vh', overflowY: 'auto',
  },
  title: {
    fontFamily: "'Fredoka One', cursive",
    fontSize: 24, color: '#fff',
    textAlign: 'center', margin: '0 0 8px',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.5)', fontSize: 13,
    textAlign: 'center', margin: '0 0 24px', lineHeight: 1.5,
  },
  skipBtn: {
    background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)',
    fontSize: 12, cursor: 'pointer', width: '100%',
    marginTop: 16, padding: 8,
    transition: 'color 0.2s',
  },
  primaryBtn: {
    background: 'linear-gradient(135deg, #7C6FE8, #A29BFE)',
    color: '#fff', border: 'none', borderRadius: 16,
    padding: '16px 32px', fontSize: 16, fontWeight: 700,
    cursor: 'pointer', width: '100%',
    fontFamily: "'Fredoka One', cursive",
    letterSpacing: '0.5px',
    boxShadow: '0 4px 20px rgba(124,111,232,0.35)',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

export function useOnboarding() {
  const [show, setShow] = useState(false)

  useEffect(() => {
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

export function checkFirstGameReward(earnCoins) {
  if (localStorage.getItem(FIRST_GAME_REWARD_KEY)) return false
  const onboarded = localStorage.getItem(ONBOARDED_KEY)
  if (!onboarded) return false
  localStorage.setItem(FIRST_GAME_REWARD_KEY, 'true')
  if (earnCoins) earnCoins(100, 'Bonus game pertama!')
  return true
}

// ─── Progress Dots ──────────────────────────────────────────────────────────
function ProgressDots({ current, total }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 28 }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{
          width: i === current ? 28 : 8, height: 8,
          borderRadius: 100,
          background: i === current
            ? 'linear-gradient(90deg, #7C6FE8, #A29BFE)'
            : i < current
              ? '#7C6FE855'
              : 'rgba(255,255,255,0.1)',
          transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }} />
      ))}
    </div>
  )
}

// ─── Step Wrapper (fade-slide animation) ────────────────────────────────────
function StepWrap({ children, stepKey }) {
  return (
    <div
      key={stepKey}
      style={{ animation: 'obSlideUp 0.45s cubic-bezier(0.2, 0.8, 0.2, 1) both' }}
    >
      {children}
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function OnboardingModal({ onPickGame, onSkip }) {
  const [step, setStep] = useState(0)
  const [selectedGenres, setSelectedGenres] = useState([])
  const [selectedGame, setSelectedGame] = useState(null)
  const cardRef = useRef(null)

  const TOTAL_STEPS = 5

  useEffect(() => {
    trackOnboardingStep('welcome')
  }, [])

  const nextStep = (trackLabel) => {
    if (trackLabel) trackOnboardingStep(trackLabel)
    setStep(s => s + 1)
    if (cardRef.current) cardRef.current.scrollTop = 0
  }

  const skip = () => {
    localStorage.setItem(ONBOARDED_KEY, 'true')
    trackOnboardingStep('skipped')
    trackOnboardingComplete()
    onSkip()
  }

  const toggleGenre = (id) => {
    setSelectedGenres(prev => {
      if (prev.includes(id)) return prev.filter(g => g !== id)
      if (prev.length >= 3) return prev
      return [...prev, id]
    })
  }

  // Get recommended games based on genre selection
  const getRecommendedGames = () => {
    if (selectedGenres.length === 0) {
      return ALL_GAMES.filter(g => FALLBACK_GAMES.includes(g.id))
    }
    const allowedTags = selectedGenres.flatMap(gid => GENRE_TAG_MAP[gid] || [])
    const matches = ALL_GAMES.filter(g => allowedTags.includes(g.tag))
    if (matches.length === 0) {
      return ALL_GAMES.filter(g => FALLBACK_GAMES.includes(g.id))
    }
    // Shuffle and pick 3, prioritize easy
    const easy = matches.filter(g => g.diff === 'Mudah')
    const rest = matches.filter(g => g.diff !== 'Mudah')
    const pool = [...easy, ...rest]
    return pool.slice(0, 3)
  }

  const finish = () => {
    localStorage.setItem(ONBOARDED_KEY, 'true')
    trackOnboardingStep('completed')
    trackOnboardingComplete()
    if (selectedGame) {
      onPickGame(selectedGame)
    } else {
      onSkip()
    }
  }

  return (
    <div style={S.overlay}>
      <style>{`
        @keyframes obSlideUp { from { opacity: 0; transform: translateY(24px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes obFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes obFloat { 0%,100% { transform: translateY(0) scale(1) } 50% { transform: translateY(-10px) scale(1.05) } }
        @keyframes obPulse { 0%,100% { box-shadow: 0 4px 20px rgba(124,111,232,0.35) } 50% { box-shadow: 0 4px 30px rgba(124,111,232,0.6), 0 0 0 6px rgba(124,111,232,0.1) } }
        @keyframes obSparkle { 0%,100% { opacity: 0.3; transform: scale(0.8) } 50% { opacity: 1; transform: scale(1.2) } }
        @keyframes obCountUp { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } }
        .ob-card-scrollbar::-webkit-scrollbar { width: 4px; }
        .ob-card-scrollbar::-webkit-scrollbar-thumb { background: rgba(124,111,232,0.3); border-radius: 100px; }
        .ob-card-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}</style>

      <div ref={cardRef} className="ob-card-scrollbar" style={{
        ...S.card,
        animation: step === 0 ? 'obSlideUp 0.5s ease' : undefined,
      }}>
        <ProgressDots current={step} total={TOTAL_STEPS} />

        {/* ═══════════ STEP 0: Welcome ═══════════ */}
        {step === 0 && (
          <StepWrap stepKey="welcome">
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: 72, marginBottom: 16,
                animation: 'obFloat 2.5s ease-in-out infinite',
                filter: 'drop-shadow(0 6px 24px rgba(124,111,232,0.4))',
              }}>
                🧠
              </div>

              <h2 style={{
                fontFamily: "'Fredoka One', cursive",
                fontSize: 30,
                background: 'linear-gradient(135deg, #FF6B6B, #A29BFE, #4ECDC4)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                margin: '0 0 8px',
              }}>
                BrainPlay
              </h2>

              <p style={{
                color: 'rgba(255,255,255,0.45)', fontSize: 14, lineHeight: 1.6,
                margin: '0 0 28px', fontStyle: 'italic',
              }}>
                Asah otakmu sambil bersenang-senang!
              </p>

              {/* Highlight stats */}
              <div style={{
                display: 'flex', justifyContent: 'center', gap: 6,
                marginBottom: 32, flexWrap: 'wrap',
              }}>
                {[
                  { text: '22+ Game', color: '#FF6B6B' },
                  { text: 'Daily Challenge', color: '#FDCB6E' },
                  { text: 'Lucky Wheel', color: '#A29BFE' },
                ].map((item, i) => (
                  <span key={i} style={{
                    background: `${item.color}15`,
                    border: `1px solid ${item.color}33`,
                    borderRadius: 100, padding: '6px 14px',
                    fontSize: 12, fontWeight: 700, color: item.color,
                    animation: `obCountUp 0.4s ${0.15 * (i + 1)}s ease both`,
                  }}>
                    {item.text}
                  </span>
                ))}
              </div>

              <button onClick={() => nextStep('welcome_done')} style={S.primaryBtn}>
                Mulai →
              </button>

              <button onClick={skip} style={S.skipBtn}>
                Lewati onboarding
              </button>
            </div>
          </StepWrap>
        )}

        {/* ═══════════ STEP 1: Pilih Genre ═══════════ */}
        {step === 1 && (
          <StepWrap stepKey="genre">
            <h3 style={S.title}>🎨 Genre Favoritmu?</h3>
            <p style={S.subtitle}>
              Pilih <strong style={{ color: '#A29BFE' }}>1–3 genre</strong> yang kamu suka
            </p>

            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 10, marginBottom: 24,
            }}>
              {GENRES.map((genre, i) => {
                const isSelected = selectedGenres.includes(genre.id)
                return (
                  <button
                    key={genre.id}
                    onClick={() => toggleGenre(genre.id)}
                    style={{
                      background: isSelected
                        ? `linear-gradient(135deg, ${genre.color}20, ${genre.color}35)`
                        : 'rgba(255,255,255,0.03)',
                      border: isSelected
                        ? `2px solid ${genre.color}`
                        : '1.5px solid rgba(255,255,255,0.08)',
                      borderRadius: 18, padding: '16px 8px',
                      cursor: 'pointer', textAlign: 'center',
                      position: 'relative',
                      transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                      animation: `obSlideUp 0.35s ${0.06 * i}s ease both`,
                    }}
                  >
                    <div style={{ fontSize: 28, marginBottom: 6 }}>{genre.icon}</div>
                    <div style={{
                      fontSize: 11, fontWeight: 700,
                      color: isSelected ? genre.color : 'rgba(255,255,255,0.5)',
                      transition: 'color 0.2s',
                    }}>
                      {genre.label}
                    </div>
                    {isSelected && (
                      <div style={{
                        position: 'absolute', top: -4, right: -4,
                        width: 20, height: 20, borderRadius: '50%',
                        background: genre.color, display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, color: '#fff', fontWeight: 800,
                        animation: 'obSlideUp 0.2s ease',
                      }}>
                        ✓
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            <button
              onClick={() => nextStep('genre_selected')}
              disabled={selectedGenres.length === 0}
              style={{
                ...S.primaryBtn,
                opacity: selectedGenres.length === 0 ? 0.4 : 1,
                cursor: selectedGenres.length === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              Lanjut ({selectedGenres.length}/3) →
            </button>

            <button onClick={skip} style={S.skipBtn}>
              Lewati →
            </button>
          </StepWrap>
        )}

        {/* ═══════════ STEP 2: Pilih Game Pertama ═══════════ */}
        {step === 2 && (
          <StepWrap stepKey="pickgame">
            <h3 style={S.title}>🎮 Pilih Game Pertama!</h3>
            <p style={S.subtitle}>
              Berdasarkan genre pilihanmu, ini rekomendasi kami
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {getRecommendedGames().map((game, i) => {
                const isSelected = selectedGame === game.id
                const diffColor = DIFF_COLORS[game.diff] || '#94A3B8'
                return (
                  <button
                    key={game.id}
                    onClick={() => setSelectedGame(game.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      background: isSelected
                        ? 'rgba(124,111,232,0.12)'
                        : 'rgba(255,255,255,0.03)',
                      border: isSelected
                        ? '2px solid #7C6FE8'
                        : '1.5px solid rgba(255,255,255,0.08)',
                      borderRadius: 18, padding: '14px 16px',
                      cursor: 'pointer', textAlign: 'left',
                      transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                      animation: `obSlideUp 0.35s ${0.1 * (i + 1)}s ease both`,
                    }}
                  >
                    <div style={{
                      fontSize: 32, width: 52, height: 52,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'rgba(124,111,232,0.1)', borderRadius: 16,
                      flexShrink: 0,
                    }}>
                      {game.emoji}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        color: '#fff', fontWeight: 700, fontSize: 15, marginBottom: 3,
                        display: 'flex', alignItems: 'center', gap: 8,
                      }}>
                        {game.title}
                        <span style={{
                          fontSize: 9, fontWeight: 800, color: diffColor,
                          background: `${diffColor}18`, border: `1px solid ${diffColor}33`,
                          borderRadius: 100, padding: '2px 8px',
                        }}>
                          {game.diff}
                        </span>
                      </div>
                      <div style={{
                        color: 'rgba(255,255,255,0.4)', fontSize: 12, lineHeight: 1.4,
                      }}>
                        {game.desc}
                      </div>
                    </div>
                    <div style={{
                      fontSize: 18, flexShrink: 0,
                      opacity: isSelected ? 1 : 0.2,
                      color: '#7C6FE8',
                      transition: 'opacity 0.2s',
                    }}>
                      {isSelected ? '✓' : '○'}
                    </div>
                  </button>
                )
              })}
            </div>

            <button
              onClick={() => nextStep('game_selected')}
              disabled={!selectedGame}
              style={{
                ...S.primaryBtn,
                opacity: selectedGame ? 1 : 0.4,
                cursor: selectedGame ? 'pointer' : 'not-allowed',
              }}
            >
              Lanjut →
            </button>

            <button onClick={skip} style={S.skipBtn}>
              Lewati →
            </button>
          </StepWrap>
        )}

        {/* ═══════════ STEP 3: Orientasi Fitur ═══════════ */}
        {step === 3 && (
          <StepWrap stepKey="features">
            <h3 style={S.title}>✨ Fitur Utama</h3>
            <p style={S.subtitle}>
              Hal seru yang bisa kamu lakukan di BrainPlay
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
              {FEATURE_CARDS.map((feature, i) => (
                <div
                  key={i}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1.5px solid rgba(255,255,255,0.08)',
                    borderRadius: 20, padding: '18px 20px',
                    display: 'flex', alignItems: 'center', gap: 16,
                    animation: `obSlideUp 0.4s ${0.12 * (i + 1)}s ease both`,
                  }}
                >
                  <div style={{
                    width: 52, height: 52, borderRadius: 16,
                    background: `${feature.color}15`,
                    border: `1px solid ${feature.color}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 28, flexShrink: 0,
                  }}>
                    {feature.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      color: '#fff', fontWeight: 700, fontSize: 15, marginBottom: 4,
                    }}>
                      {feature.title}
                    </div>
                    <div style={{
                      color: 'rgba(255,255,255,0.4)', fontSize: 12, lineHeight: 1.5,
                    }}>
                      {feature.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={() => nextStep('features_done')} style={S.primaryBtn}>
              Lanjut →
            </button>

            <button onClick={skip} style={S.skipBtn}>
              Lewati →
            </button>
          </StepWrap>
        )}

        {/* ═══════════ STEP 4: Siap Main ═══════════ */}
        {step === 4 && (
          <StepWrap stepKey="ready">
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: 64, marginBottom: 16,
                animation: 'obFloat 2.5s ease-in-out infinite',
              }}>
                🚀
              </div>

              <h3 style={{ ...S.title, fontSize: 26 }}>
                Kamu Siap!
              </h3>
              <p style={{ ...S.subtitle, marginBottom: 20 }}>
                Ini ringkasan petualanganmu
              </p>

              {/* Summary pills */}
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1.5px solid rgba(255,255,255,0.08)',
                borderRadius: 20, padding: 20, marginBottom: 16,
                textAlign: 'left',
              }}>
                {/* Genre summary */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  marginBottom: 14, paddingBottom: 14,
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <span style={{ fontSize: 20 }}>🎨</span>
                  <div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600, marginBottom: 4 }}>
                      Genre Favorit
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {selectedGenres.length > 0 ? selectedGenres.map(gid => {
                        const genre = GENRES.find(g => g.id === gid)
                        return genre ? (
                          <span key={gid} style={{
                            fontSize: 12, fontWeight: 700, color: genre.color,
                            background: `${genre.color}15`,
                            border: `1px solid ${genre.color}33`,
                            borderRadius: 100, padding: '3px 10px',
                          }}>
                            {genre.icon} {genre.label}
                          </span>
                        ) : null
                      }) : (
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Semua genre</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Game summary */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 20 }}>🎮</span>
                  <div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600, marginBottom: 4 }}>
                      Game Pertama
                    </div>
                    {(() => {
                      const game = ALL_GAMES.find(g => g.id === selectedGame)
                      return game ? (
                        <span style={{
                          fontSize: 13, fontWeight: 700, color: '#fff',
                        }}>
                          {game.emoji} {game.title}
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>—</span>
                      )
                    })()}
                  </div>
                </div>
              </div>

              {/* Reward teaser */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(253,203,110,0.08), rgba(253,203,110,0.15))',
                border: '1.5px solid rgba(253,203,110,0.25)',
                borderRadius: 16, padding: '14px 20px',
                marginBottom: 28,
                animation: 'obSlideUp 0.4s 0.3s ease both',
              }}>
                <div style={{
                  color: '#FDCB6E', fontSize: 14, fontWeight: 700, textAlign: 'center',
                }}>
                  🪙 100 koin menunggumu setelah game pertama!
                </div>
              </div>

              <button
                onClick={finish}
                style={{
                  ...S.primaryBtn,
                  fontSize: 18,
                  background: 'linear-gradient(135deg, #7C6FE8, #4ECDC4)',
                  animation: 'obPulse 2s ease infinite',
                  padding: '18px 32px',
                }}
              >
                MULAI PETUALANGAN 🚀
              </button>
            </div>
          </StepWrap>
        )}
      </div>
    </div>
  )
}
