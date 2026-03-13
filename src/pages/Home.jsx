import { useState, useEffect } from 'react'
import GameCard from '../components/GameCard.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { useSound } from '../hooks/useSound.js'

const COMING_SOON = [
  { day: 4,  emoji: '💬', title: 'Wordle',           tag: 'Kata',     color: '#A29BFE' },
  { day: 5,  emoji: '🪓', title: 'Hangman',          tag: 'Kata',     color: '#FD79A8' },
  { day: 6,  emoji: '🎨', title: 'Color Sort',       tag: 'Puzzle',   color: '#FF6B6B' },
  { day: 7,  emoji: '🧱', title: 'Brick Breaker',    tag: 'Casual',   color: '#45B7D1' },
  { day: 8,  emoji: '🔎', title: 'Word Search',      tag: 'Kata',     color: '#55EFC4' },
  { day: 9,  emoji: '🧩', title: 'Jigsaw Puzzle',    tag: 'Puzzle',   color: '#FDCB6E' },
  { day: 10, emoji: '🎯', title: 'Block Puzzle',     tag: 'Casual',   color: '#A29BFE' },
  { day: 11, emoji: '🔢', title: 'Sudoku',           tag: 'Logika',   color: '#FF6B6B' },
  { day: 12, emoji: '🫧', title: 'Bubble Shooter',   tag: 'Casual',   color: '#4ECDC4' },
  { day: 13, emoji: '⌨️', title: 'Typing Speed',     tag: 'Kata',     color: '#FD79A8' },
  { day: 14, emoji: '💣', title: 'Minesweeper',      tag: 'Logika',   color: '#45B7D1' },
  { day: 15, emoji: '🔀', title: 'Anagram',          tag: 'Kata',     color: '#FDCB6E' },
  { day: 16, emoji: '🗼', title: 'Tower of Hanoi',   tag: 'Logika',   color: '#A29BFE' },
  { day: 17, emoji: '📐', title: 'Nonogram',         tag: 'Puzzle',   color: '#FF6B6B' },
  { day: 18, emoji: '➕', title: 'Math Quiz',        tag: 'Logika',   color: '#4ECDC4' },
  { day: 19, emoji: '♠️', title: 'Solitaire',        tag: 'Casual',   color: '#FD79A8' },
  { day: 20, emoji: '🀄', title: 'Mahjong',          tag: 'Casual',   color: '#FDCB6E' },
  { day: 21, emoji: '🧮', title: 'Logic Grid',       tag: 'Logika',   color: '#45B7D1' },
  { day: 22, emoji: '🔗', title: 'Word Chain',       tag: 'Kata',     color: '#A29BFE' },
  { day: 23, emoji: '♟️', title: 'Chess Puzzle',     tag: 'Logika',   color: '#FF6B6B' },
  { day: 24, emoji: '🎰', title: 'Sliding Puzzle',   tag: 'Puzzle',   color: '#4ECDC4' },
  { day: 25, emoji: '🎲', title: '??? Surprise',     tag: 'Surprise', color: '#FD79A8' },
]

const ALL_TAGS   = ['Semua', 'Puzzle', 'Casual', 'Kata', 'Logika']
const TAG_META   = {
  Semua:   { icon: '🎮', color: '#A29BFE' },
  Puzzle:  { icon: '🧩', color: '#FDCB6E' },
  Casual:  { icon: '🎯', color: '#4ECDC4' },
  Kata:    { icon: '📝', color: '#A29BFE' },
  Logika:  { icon: '🧠', color: '#FF6B6B' },
}

// Animated background blobs
const BLOBS = [
  { color: '#FF6B6B', size: 420, top: '-8%',  left: '-5%',  dur: '9s',  delay: '0s'   },
  { color: '#A29BFE', size: 380, top: '10%',  left: '70%',  dur: '11s', delay: '2s'   },
  { color: '#4ECDC4', size: 320, top: '55%',  left: '-3%',  dur: '13s', delay: '1s'   },
  { color: '#FFE66D', size: 280, top: '70%',  left: '75%',  dur: '8s',  delay: '3s'   },
  { color: '#FD79A8', size: 200, top: '35%',  left: '40%',  dur: '10s', delay: '0.5s' },
]

export default function Home({ games, onPlay }) {
  const { darkMode } = useSettings()
  const { play }     = useSound()
  const [activeTag, setActiveTag] = useState('Semua')

  // Streak logic
  const streak = (() => {
    try {
      const data = JSON.parse(localStorage.getItem('brainplay-streak') || '{}')
      const today = new Date().toDateString()
      const yesterday = new Date(Date.now()-86400000).toDateString()
      if (data.last === today) return data.count || 1
      if (data.last === yesterday) {
        const nc = (data.count || 0) + 1
        localStorage.setItem('brainplay-streak', JSON.stringify({ last: today, count: nc }))
        return nc
      }
      localStorage.setItem('brainplay-streak', JSON.stringify({ last: today, count: 1 }))
      return 1
    } catch { return 1 }
  })()
  const [visible, setVisible]     = useState(false)
  const dark = darkMode

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  const textMain  = dark ? '#e8e8f0' : '#2D3436'
  const textMuted = dark ? '#8892b0' : '#636E72'
  const borderCol = dark ? '#2d3561' : '#DFE6E9'
  const surfaceCol = dark ? '#16213e' : '#fff'

  const filteredAvailable = activeTag === 'Semua' ? games        : games.filter(g => g.tag === activeTag)
  const filteredComing    = activeTag === 'Semua' ? COMING_SOON  : COMING_SOON.filter(g => g.tag === activeTag)

  const totalDone = games.length
  const pct = Math.round((totalDone / 25) * 100)

  return (
    <>
      <style>{`
        .home-root {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          transition: background 0.4s;
        }
        /* Animated mesh background */
        .home-blob {
          position: absolute; border-radius: 50%;
          filter: blur(80px);
          pointer-events: none; z-index: 0;
          opacity: ${dark ? '0.07' : '0.13'};
          animation: float-y var(--dur) ease-in-out var(--delay) infinite alternate;
        }
        .home-content { position: relative; z-index: 1; max-width: 1140px; margin: 0 auto; padding: 52px 28px 80px; }

        /* Hero */
        .hero-section { text-align: center; margin-bottom: 64px; }
        .hero-tag {
          display: inline-flex; align-items: center; gap: 6px;
          background: ${dark ? 'rgba(162,155,254,0.12)' : 'rgba(162,155,254,0.1)'};
          border: 1.5px solid ${dark ? 'rgba(162,155,254,0.25)' : 'rgba(162,155,254,0.3)'};
          color: #A29BFE; border-radius: 100px;
          padding: 6px 18px; font-size: 12px; font-weight: 800;
          letter-spacing: 1px; text-transform: uppercase;
          margin-bottom: 24px; font-family: 'Nunito',sans-serif;
          animation: slide-up 0.5s ease both;
        }
        .hero-title {
          font-family: 'Fredoka One', cursive;
          font-size: clamp(44px, 7vw, 80px);
          line-height: 1.08; margin-bottom: 20px;
          background: ${dark
            ? 'linear-gradient(135deg,#fff 0%,#A29BFE 45%,#FD79A8 80%,#FFE66D 100%)'
            : 'linear-gradient(135deg,#FF6B6B 0%,#A29BFE 45%,#4ECDC4 100%)'};
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text; background-size: 200% 200%;
          animation: slide-up 0.5s 0.1s ease both, gradient-shift 6s ease infinite;
        }
        .hero-sub {
          font-size: 17px; line-height: 1.7; font-weight: 500; max-width: 500px; margin: 0 auto 36px;
          animation: slide-up 0.5s 0.2s ease both;
          color: ${textMuted};
        }

        /* Progress bar */
        .progress-wrap {
          max-width: 420px; margin: 0 auto;
          animation: slide-up 0.5s 0.3s ease both;
        }
        .progress-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .progress-label  { font-size: 13px; font-weight: 700; color: ${textMuted}; }
        .progress-value  { font-family: 'Fredoka One',cursive; font-size: 16px; color: #A29BFE; }
        .progress-track  {
          height: 12px; border-radius: 100px;
          background: ${dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'};
          overflow: hidden; position: relative;
        }
        .progress-fill {
          height: 100%; border-radius: 100px;
          background: linear-gradient(90deg,#FF6B6B,#A29BFE,#4ECDC4);
          background-size: 200% 100%;
          animation: shimmer 2s linear infinite, scale-in 0.8s 0.6s ease both;
          transform-origin: left;
          width: ${pct}%;
          transition: width 1s cubic-bezier(0.34,1.56,0.64,1);
        }
        .progress-dots { display: flex; justify-content: space-between; margin-top: 8px; }
        .progress-dot  { width: 6px; height: 6px; border-radius: 50%; background: ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}; }
        .progress-dot.done { background: #A29BFE; }

        /* Filter tabs */
        .filter-row { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin-bottom: 48px; animation: slide-up 0.5s 0.35s ease both; }
        .filter-btn {
          display: flex; align-items: center; gap: 6px;
          border-radius: 100px; padding: 10px 22px;
          font-size: 14px; font-weight: 800; font-family: 'Fredoka One',cursive;
          cursor: pointer; transition: all 0.2s cubic-bezier(0.34,1.56,0.64,1);
          border: 2px solid transparent; position: relative; overflow: hidden;
        }
        .filter-btn::before {
          content: ''; position: absolute; inset: 0; border-radius: 100px;
          background: rgba(255,255,255,0); transition: background 0.2s;
        }
        .filter-btn:hover::before { background: rgba(255,255,255,0.08); }
        .filter-btn:hover { transform: translateY(-3px) scale(1.05); }
        .filter-btn:active { transform: scale(0.96); }

        /* Section headers */
        .section-head { display: flex; align-items: center; gap: 14px; margin-bottom: 28px; animation: slide-up 0.5s ease both; }
        .section-title { font-family: 'Fredoka One',cursive; font-size: 26px; color: ${textMain}; }
        .section-count { border-radius: 100px; padding: '4px 14px'; font-size: 13px; font-weight: 800; }
        .section-line  { flex: 1; height: 2px; border-radius: 100px; background: ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}; }

        /* Coming soon grid */
        .cs-card {
          background: ${surfaceCol};
          border: 2px dashed ${borderCol};
          border-radius: 20px; padding: 20px 14px;
          text-align: center; position: relative; overflow: hidden;
          transition: all 0.2s ease;
        }
        .cs-card:hover { opacity: 0.85; transform: scale(1.03); border-style: solid; }

        @media (max-width: 600px) {
          .home-content { padding: 32px 16px 60px; }
          .hero-title { font-size: 40px; }
        }
      `}</style>

      <div className="home-root" style={{ background: dark ? '#0d0b1e' : '#FFF9F0' }}>

        {/* Mesh blobs */}
        {BLOBS.map((b, i) => (
          <div key={i} className="home-blob" style={{ width: b.size, height: b.size, top: b.top, left: b.left, background: b.color, '--dur': b.dur, '--delay': b.delay }} />
        ))}

        <div className="home-content">

          {/* ── Hero ── */}
          <div className="hero-section">
            <div className="hero-tag">🏆 30 Hari · 25 Game · 1 Tujuan</div>
            <h1 className="hero-title">Selamat Datang<br/>di BrainPlay! 🎉</h1>
            <p className="hero-sub">Kumpulan game santai & mengasah otak yang bertambah setiap hari. Main, asah otak, dan cetak rekormu!</p>

            {/* Progress 30 hari */}
            <div className="progress-wrap">
              <div className="progress-header">
                <span className="progress-label">🗓 Progress 30 Hari</span>
                <span className="progress-value">{totalDone}/25 game</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" />
              </div>
              <div className="progress-dots">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className={`progress-dot${i < Math.floor(totalDone / 2.5) ? ' done' : ''}`} />
                ))}
              </div>
            </div>
          </div>

          {/* ── Streak Banner ── */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:12, marginBottom:20, marginTop:4 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, background: dark?"rgba(255,107,107,0.1)":"rgba(255,107,107,0.08)", border:"1.5px solid rgba(255,107,107,0.25)", borderRadius:100, padding:"8px 20px" }}>
              <span style={{ fontSize:20 }}>🔥</span>
              <span style={{ fontFamily:"'Fredoka One',cursive", fontSize:16, color:"#FF6B6B" }}>{streak} hari berturut-turut</span>
              {streak >= 7 && <span style={{ fontSize:14 }}>🏆</span>}
            </div>
          </div>

          {/* ── Filter ── */}
          <div className="filter-row">
            {ALL_TAGS.map(tag => {
              const active = activeTag === tag
              const meta   = TAG_META[tag]
              return (
                <button
                  key={tag}
                  className="filter-btn"
                  onClick={() => { play('click'); setActiveTag(tag) }}
                  style={{
                    background: active
                      ? `linear-gradient(135deg, ${meta.color}, ${meta.color}bb)`
                      : (dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                    color: active ? '#fff' : textMuted,
                    borderColor: active ? 'transparent' : borderCol,
                    boxShadow: active ? `0 6px 20px ${meta.color}44` : 'none',
                    transform: active ? 'translateY(-2px) scale(1.04)' : '',
                  }}
                >
                  {meta.icon} {tag}
                </button>
              )
            })}
          </div>

          {/* ── Available games ── */}
          {filteredAvailable.length > 0 && (
            <section style={{ marginBottom: 56 }}>
              <div className="section-head">
                <h2 className="section-title">🎮 Bisa Dimainkan</h2>
                <span style={{ background: '#4ECDC4', color: '#fff', borderRadius: 100, padding: '4px 14px', fontSize: 13, fontWeight: 800 }}>
                  {filteredAvailable.length} Game
                </span>
                <div className="section-line" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: 22 }}>
                {filteredAvailable.map((game, i) => (
                  <div key={game.id} style={{ animation: `slide-up 0.4s ${i * 0.07}s ease both` }}>
                    <GameCard game={game} onPlay={onPlay} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Coming soon ── */}
          {filteredComing.length > 0 && (
            <section>
              <div className="section-head">
                <h2 className="section-title">🔒 Segera Hadir</h2>
                <span style={{ background: '#A29BFE', color: '#fff', borderRadius: 100, padding: '4px 14px', fontSize: 13, fontWeight: 800 }}>
                  {filteredComing.length} Game
                </span>
                <div className="section-line" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(155px,1fr))', gap: 12 }}>
                {filteredComing.map((g, i) => (
                  <div key={g.day} className="cs-card" style={{ animationDelay: `${i * 0.04}s`, opacity: 0.6 }}>
                    <div style={{ position: 'absolute', top: 10, right: 10, background: `${g.color}22`, color: g.color, fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 100, fontFamily: "'Fredoka One',cursive", border: `1px solid ${g.color}44` }}>
                      Hari {g.day}
                    </div>
                    <div style={{ fontSize: 34, marginBottom: 10, filter: 'grayscale(30%)' }}>{g.emoji}</div>
                    <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 14, color: textMain, marginBottom: 6 }}>{g.title}</div>
                    <span style={{ background: `${g.color}22`, color: g.color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100 }}>{g.tag}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Empty state */}
          {filteredAvailable.length === 0 && filteredComing.length === 0 && (
            <div style={{ textAlign: 'center', padding: '80px 20px' }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>🔍</div>
              <p style={{ fontFamily: "'Fredoka One',cursive", fontSize: 22, color: textMain, marginBottom: 8 }}>Belum ada game di kategori ini</p>
              <p style={{ fontSize: 14, color: textMuted }}>Segera hadir di hari-hari berikutnya!</p>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
