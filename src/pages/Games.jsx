import { useState, useMemo, useEffect, useRef, useLayoutEffect } from 'react'
import { useSettings } from '../context/SettingsContext.jsx'
import { useSound } from '../hooks/useSound.js'
import { useProgress } from '../context/ProgressContext.jsx'
import { useThemeColors } from '../hooks/useThemeColors.js'
import gsap from 'gsap'

const CATEGORIES = [
  { id: 'all', label: 'Semua', emoji: '🎮', tags: [] },
  { id: 'puzzle', label: 'Puzzle', emoji: '🧩', tags: ['puzzle', 'casual'] },
  { id: 'action', label: 'Action', emoji: '🚀', tags: ['action'] },
  { id: 'word', label: 'Kata', emoji: '📝', tags: ['kata'] },
  { id: 'math', label: 'Math', emoji: '🧮', tags: ['logika'] },
  { id: 'classic', label: 'Klasik', emoji: '👾', tags: ['puzzle', 'casual', 'logika'] },
]

export default function Games({ games, onOpenGame, onBack }) {
  const { darkMode } = useSettings()
  const { play } = useSound()
  const { progress } = useProgress()
  const tc = useThemeColors()
  const dark = tc.dark

  const [search, setSearch] = useState('')
  const [activeCat, setActiveCat] = useState('all')
  const gridRef = useRef(null)
  const headerRef = useRef(null)
  const catRef = useRef(null)
  const searchRef = useRef(null)
  const emojiRef = useRef(null)
  const countRef = useRef(null)
  const hasAnimated = useRef(false)

  const filteredGames = useMemo(() => {
    return games.filter(g => {
      const gTitle = g.title || g.name || ''
      const matchSearch = gTitle.toLowerCase().includes(search.toLowerCase())
      const catDef = CATEGORIES.find(c => c.id === activeCat)
      const gTag = g.tag?.toLowerCase()
      const matchCat = activeCat === 'all' || (catDef && catDef.tags.includes(gTag))
      return matchSearch && matchCat
    })
  }, [games, search, activeCat])

  // ── GSAP: Initial page entrance ──
  useLayoutEffect(() => {
    if (hasAnimated.current) return
    hasAnimated.current = true

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

    // Header entrance
    if (headerRef.current) {
      tl.fromTo(headerRef.current, { opacity: 0, y: -30 }, { opacity: 1, y: 0, duration: 0.6 })
    }

    // Search entrance
    if (searchRef.current) {
      tl.fromTo(searchRef.current, { opacity: 0, y: 20, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: 0.5 }, '-=0.3')
    }

    // Category tabs stagger
    if (catRef.current) {
      const tabs = catRef.current.querySelectorAll('.cat-btn')
      tl.fromTo(tabs, { opacity: 0, x: -20, scale: 0.9 }, { opacity: 1, x: 0, scale: 1, duration: 0.4, stagger: 0.06 }, '-=0.3')
    }

    // Emoji bounce (continuous)
    if (emojiRef.current) {
      gsap.to(emojiRef.current, {
        y: -8, duration: 1.2, repeat: -1, yoyo: true, ease: 'power1.inOut',
      })
    }
  }, [])

  // ── GSAP: Card stagger on filter change ──
  useEffect(() => {
    if (!gridRef.current) return
    const cards = gridRef.current.querySelectorAll('.flip-item')
    if (!cards.length) return

    gsap.fromTo(cards,
      { opacity: 0, y: 24, scale: 0.92 },
      { opacity: 1, y: 0, scale: 1, duration: 0.4, stagger: 0.05, ease: 'back.out(1.4)', clearProps: 'all' }
    )

    // Animate game count badge
    if (countRef.current) {
      gsap.fromTo(countRef.current, { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(2)' })
    }
  }, [filteredGames])

  // Stats
  const totalPlayed = Object.keys(progress.gameBests || {}).length

  return (
    <div className="games-hub-root" style={{
      minHeight: '100vh',
      background: dark ? 'var(--bg-deep)' : '#F4F6FB',
      padding: '0 20px 100px',
      color: dark ? '#fff' : '#2D3436',
    }}>
      <style>{`
        .games-hub-inner { max-width: 800px; margin: 0 auto; padding-top: 24px; }

        .gh-header {
          text-align: center; margin-bottom: 28px;
          position: relative;
        }
        .gh-emoji { font-size: 52px; display: inline-block; filter: drop-shadow(0 4px 12px rgba(124,111,232,0.3)); }
        .gh-title {
          font-family: 'Fredoka One', cursive; font-size: 30px;
          letter-spacing: 1.5px; margin-top: 8px;
          background: linear-gradient(135deg, ${dark ? '#A29BFE' : '#7C6FE8'}, ${dark ? '#74B9FF' : '#45B7D1'});
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .gh-subtitle { color: ${dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}; font-size: 13px; margin-top: 4px; }
        .gh-counter {
          display: inline-flex; align-items: center; gap: 6px;
          margin-top: 12px; padding: 6px 16px; border-radius: 100px;
          background: ${dark ? 'rgba(124,111,232,0.12)' : 'rgba(124,111,232,0.08)'};
          border: 1.5px solid ${dark ? 'rgba(124,111,232,0.25)' : 'rgba(124,111,232,0.2)'};
          font-size: 12px; font-weight: 700; color: #7C6FE8;
        }

        .search-container { position: relative; margin-bottom: 24px; }
        .search-input {
          width: 100%; padding: 16px 20px 16px 48px;
          background: ${dark ? 'var(--surface-card)' : '#fff'};
          border: 1.5px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'};
          border-radius: 20px; color: ${dark ? '#fff' : '#2D3436'}; font-size: 15px;
          outline: none; transition: all 0.3s;
          box-shadow: ${dark ? '0 4px 15px rgba(0,0,0,0.1)' : '0 4px 15px rgba(0,0,0,0.04)'};
        }
        .search-input:focus {
          border-color: #7C6FE8;
          box-shadow: 0 0 0 4px rgba(124,111,232,0.15);
        }
        .search-input::placeholder { color: ${dark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}; }
        .search-icon { position: absolute; left: 18px; top: 50%; transform: translateY(-50%); font-size: 18px; opacity: 0.5; }

        .cat-row {
          display: flex; gap: 10px; overflow-x: auto; padding-bottom: 20px;
          scrollbar-width: none; -webkit-overflow-scrolling: touch;
        }
        .cat-row::-webkit-scrollbar { display: none; }
        .cat-btn {
          flex: 0 0 auto; padding: 10px 18px; border-radius: 100px;
          background: ${dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'};
          border: 1.5px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'};
          color: ${dark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'};
          font-family: 'Fredoka One', cursive; font-size: 13px;
          cursor: pointer; transition: all 0.25s;
          white-space: nowrap;
        }
        .cat-btn:hover { transform: translateY(-2px); }
        .cat-btn.active {
          background: linear-gradient(135deg, #7C6FE8, #6C5CE7);
          border-color: #7C6FE8; color: #fff;
          box-shadow: 0 4px 16px rgba(124,111,232,0.35);
          transform: translateY(-2px);
        }

        .flip-grid {
          display: flex; flex-wrap: wrap; gap: 12px;
          margin-bottom: 36px; position: relative; min-height: 80px;
        }
        .flip-item { width: calc(50% - 6px); flex-shrink: 0; }
        @media(min-width:540px) { .flip-item { width: calc(33.333% - 8px); } }
        @media(min-width:800px) { .flip-item { width: calc(25% - 9px); } }

        .mini-card {
          background: ${dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'};
          border-radius: 18px; padding: 1.5px; cursor: pointer;
          transition: transform 0.25s, box-shadow 0.25s;
          height: 100%; -webkit-tap-highlight-color: transparent;
          position: relative; overflow: hidden;
        }
        .mini-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 30px color-mix(in srgb, var(--mc-color) 25%, transparent);
        }
        .mini-card:active { transform: scale(0.97); }

        .mini-card::before { /* Bent Border Glow */
          content: ""; position: absolute; inset: 0;
          background: radial-gradient(350px circle at var(--mouse-x) var(--mouse-y), rgba(255,255,255,0.6), transparent 40%);
          opacity: 0; transition: opacity 0.5s;
          pointer-events: none;
        }
        .flip-grid:hover .mini-card::before { opacity: 1; }

        .mini-card-inner {
          position: relative; z-index: 1;
          background: ${dark ? 'rgba(20, 20, 35, 0.9)' : '#fff'};
          border-radius: 16.5px;
          height: 100%; padding: 14px; overflow: hidden;
          transition: background 0.3s;
        }
        .mini-card-inner::after { /* Bento Surface Glow */
          content: ""; position: absolute; inset: 0; z-index: 2;
          background: radial-gradient(600px circle at var(--mouse-x) var(--mouse-y), rgba(255,255,255,0.05), transparent 40%);
          opacity: 0; transition: opacity 0.5s; pointer-events: none;
        }
        .flip-grid:hover .mini-card-inner::after { opacity: 1; }

        .mc-emoji-bg {
          position: absolute; right: -8px; bottom: -12px; z-index: 0;
          font-size: 64px; opacity: 0.08; pointer-events: none;
          transition: transform 0.4s, opacity 0.4s;
        }
        .mini-card:hover .mc-emoji-bg { transform: scale(1.15) rotate(-10deg); opacity: 0.18; }

        .mc-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
        .mc-icon {
          width: 40px; height: 40px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          font-size: 20px; flex-shrink: 0;
          transition: transform 0.3s;
        }
        .mini-card:hover .mc-icon { transform: scale(1.1) rotate(-5deg); }
        .mc-day {
          font-size: 9px; font-weight: 800;
          color: ${dark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.4)'};
          padding: 2px 8px; background: ${dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'};
          border-radius: 8px;
        }
        .mc-title {
          font-size: 13px; font-weight: 600;
          color: ${dark ? '#fff' : '#2D3436'};
          margin-bottom: 3px; line-height: 1.3;
        }
        .mc-tag { font-size: 10px; font-weight: 600; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
        .mc-best {
          font-size: 10px; color: ${dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)'};
          border-top: 1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'};
          padding-top: 7px; margin-top: 4px;
        }
        .mc-best span { font-weight: 600; }

        .gh-empty {
          text-align: center; padding: 60px 0;
          opacity: 0.5; animation: fadeIn 0.4s ease;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 0.5; } }
      `}</style>

      <div className="games-hub-inner">
        {/* Header */}
        <div className="gh-header" ref={headerRef}>
          <div className="gh-emoji" ref={emojiRef}>🎮</div>
          <div className="gh-title">GAMES HUB</div>
          <div className="gh-subtitle">Temukan tantangan serumu hari ini!</div>
          <div className="gh-counter" ref={countRef}>
            <span>🕹️</span>
            <span>{totalPlayed}/{games.length} dimainkan</span>
          </div>
        </div>

        {/* Search */}
        <div className="search-container" ref={searchRef}>
          <span className="search-icon">🔍</span>
          <input
            className="search-input"
            placeholder="Cari game..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Categories */}
        <div className="cat-row" ref={catRef}>
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              className={`cat-btn ${activeCat === cat.id ? 'active' : ''}`}
              onClick={() => { play('click'); setActiveCat(cat.id) }}
            >
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>

        {/* Game Grid */}
        <div 
          className="flip-grid" 
          ref={gridRef}
          onMouseMove={(e) => {
            const cards = e.currentTarget.getElementsByClassName('mini-card')
            for (const card of cards) {
              const rect = card.getBoundingClientRect()
              const x = e.clientX - rect.left
              const y = e.clientY - rect.top
              card.style.setProperty('--mouse-x', `${x}px`)
              card.style.setProperty('--mouse-y', `${y}px`)
            }
          }}
        >
          {filteredGames.map((game, i) => {
            const best = (progress.gameBests || {})[game.id] || 0
            const wins = (progress.gameWins  || {})[game.id] || 0
            return (
              <div key={game.id} className="flip-item">
                <div
                  className="mini-card magic-bento"
                  style={{ '--mc-color': game.color }}
                  onClick={() => { play('click'); onOpenGame(game.id) }}
                >
                  <div className="mini-card-inner">
                    <div className="mc-emoji-bg">{game.emoji}</div>
                    <div className="mc-top">
                      <div
                        className="mc-icon"
                        style={{ background: `${game.color}18`, border: `1.5px solid ${game.color}33`, position: 'relative', zIndex: 10 }}
                      >
                        {game.emoji}
                      </div>
                      <span className="mc-day" style={{ position: 'relative', zIndex: 10 }}>Hari {game.day}</span>
                    </div>
                    <div className="mc-title" style={{ position: 'relative', zIndex: 10 }}>{game.title}</div>
                    <div className="mc-tag" style={{ color: game.color, position: 'relative', zIndex: 10 }}>{game.tag}</div>
                    <div className="mc-best" style={{ position: 'relative', zIndex: 10 }}>
                      {best > 0
                        ? <>Best: <span style={{ color: game.color }}>{best >= 1000 ? `${(best/1000).toFixed(1)}k` : best}</span>{wins > 0 && <span style={{ marginLeft: 6, opacity: 0.7 }}>· {wins}× menang</span>}</>
                        : <span style={{ opacity: 0.6 }}>Belum pernah main</span>
                      }
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {filteredGames.length === 0 && (
          <div className="gh-empty">
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔎</div>
            <p style={{ fontFamily: "'Fredoka One', cursive" }}>Yah, game tidak ketemu...</p>
          </div>
        )}
      </div>
    </div>
  )
}
