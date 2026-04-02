import { useState, useMemo } from 'react'
import { useSettings } from '../context/SettingsContext.jsx'
import { useSound } from '../hooks/useSound.js'
import { useProgress } from '../context/ProgressContext.jsx'
import GameCard from '../components/GameCard.jsx'

const CATEGORIES = [
  { id: 'all', label: 'Semua', emoji: '🎮' },
  { id: 'puzzle', label: 'Puzzle', emoji: '🧩' },
  { id: 'action', label: 'Action', emoji: '🚀' },
  { id: 'word', label: 'Kata', emoji: '📝' },
  { id: 'math', label: 'Math', emoji: '🧮' },
  { id: 'classic', label: 'Klasik', emoji: '👾' }
]

export default function Games({ games, onOpenGame, onBack }) {
  const { darkMode } = useSettings()
  const { play } = useSound()
  const { progress } = useProgress()
  const [search, setSearch] = useState('')
  const [activeCat, setActiveCat] = useState('all')

  const filteredGames = useMemo(() => {
    return games.filter(g => {
      const gTitle = g.title || g.name || '';
      const matchSearch = gTitle.toLowerCase().includes(search.toLowerCase())
      const matchCat = activeCat === 'all' || (g.tag?.toLowerCase() === activeCat || (g.categories && g.categories.includes(activeCat)))
      return matchSearch && matchCat
    })
  }, [games, search, activeCat])

  return (
    <div className="games-hub-root" style={{ 
      minHeight: '100vh', 
      background: 'var(--bg-deep)', 
      padding: '0 20px 100px',
      color: '#fff'
    }}>
      <style>{`
        .games-hub-inner { max-width: 800px; margin: 0 auto; padding-top: 24px; }
        
        .search-container {
          position: relative; margin-bottom: 24px;
          animation: slideUp 0.4s ease both;
        }
        .search-input {
          width: 100%; padding: 16px 20px 16px 48px;
          background: var(--surface-card);
          border: 1.5px solid rgba(255,255,255,0.08);
          border-radius: 20px; color: #fff; font-size: 15px;
          outline: none; transition: all 0.3s;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        .search-input:focus { border-color: var(--accent-vivid); box-shadow: 0 0 0 4px rgba(124,111,232,0.15); }
        .search-icon { position: absolute; left: 18px; top: 50%; transform: translateY(-50%); font-size: 18px; opacity: 0.5; }

        .cat-row {
          display: flex; gap: 12px; overflow-x: auto; padding-bottom: 20px;
          scrollbar-width: none; -webkit-overflow-scrolling: touch;
          animation: slideUp 0.4s 0.1s ease both;
        }
        .cat-row::-webkit-scrollbar { display: none; }
        .cat-btn {
          flex: 0 0 auto; padding: 10px 18px; border-radius: 100px;
          background: rgba(255,255,255,0.05); border: 1.5px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.6); font-family: 'Fredoka One', cursive; font-size: 13px;
          cursor: pointer; transition: all 0.2s;
        }
        .cat-btn.active { background: var(--accent-vivid); border-color: var(--accent-vivid); color: #fff; box-shadow: 0 4px 12px rgba(124,111,232,0.3); }

        .flip-grid { display:flex; flex-wrap:wrap; gap:12px; margin-bottom:36px; position:relative; min-height:80px; animation: slideUp 0.4s 0.2s ease both; }
        .flip-item { width:calc(50% - 6px); flex-shrink:0; }
        @media(min-width:540px) { .flip-item { width:calc(33.333% - 8px); } }
        @media(min-width:800px) { .flip-item { width:calc(25% - 9px); } }
        .mini-card {
          background: var(--surface-card, rgba(0,0,0,0.2)); border: 1.5px solid rgba(255,255,255,0.08);
          border-radius:16px; padding:12px; cursor:pointer;
          transition:border-color .2s, transform .2s; height:100%;
          -webkit-tap-highlight-color:transparent; position:relative; overflow:hidden;
        }
        .mini-card:hover { border-color:var(--mc-color); transform:translateY(-3px); }
        .mini-card:active { transform:scale(0.97); }
        .mc-emoji-bg { position:absolute; right:-8px; bottom:-12px; font-size:64px; opacity:0.12; pointer-events:none; transition:transform .3s; }
        .mini-card:hover .mc-emoji-bg { transform:scale(1.1) rotate(-8deg); opacity:0.2; }
        .mc-top { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px; }
        .mc-icon { width:38px; height:38px; border-radius:11px; display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0; }
        .mc-day { font-size:9px; font-weight:800; color: rgba(255,255,255,0.6); padding:2px 7px; background: rgba(255,255,255,0.05); border-radius:7px; }
        .mc-title { font-size:12px; font-weight:500; color: #fff; margin-bottom:3px; line-height:1.3; }
        .mc-tag { font-size:10px; font-weight:500; margin-bottom:8px; }
        .mc-best { font-size:10px; color: rgba(255,255,255,0.6); border-top:1px solid rgba(255,255,255,0.08); padding-top:6px; margin-top:2px; }
        .mc-best span { font-weight:500; }

        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="games-hub-inner">
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32, animation: 'slideUp 0.4s ease both' }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>🎮</div>
          <h1 style={{ fontFamily: "'Fredoka One', cursive", fontSize: 32, letterSpacing: '1px' }}>GAMES HUB</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Temukan tantangan serumu hari ini!</p>
        </div>

        {/* Search */}
        <div className="search-container">
          <span className="search-icon">🔍</span>
          <input 
            className="search-input" 
            placeholder="Cari game..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Categories */}
        <div className="cat-row">
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

        {/* List */}
        <div className="flip-grid">
          {filteredGames.map((game, i) => {
            const best = (progress.gameBests || {})[game.id] || 0
            const wins = (progress.gameWins  || {})[game.id] || 0
            return (
              <div key={game.id} className="flip-item" style={{ animationDelay: `${i * 0.05}s` }}>
                <div
                  className="mini-card"
                  style={{ '--mc-color': game.color }}
                  onClick={() => { play('click'); onOpenGame(game.id) }}
                >
                  <div className="mc-emoji-bg">{game.emoji}</div>
                  <div className="mc-top">
                    <div
                      className="mc-icon"
                      style={{ background: `${game.color}22`, border: `1.5px solid ${game.color}44` }}
                    >
                      {game.emoji}
                    </div>
                    <span className="mc-day">Hari {game.day}</span>
                  </div>
                  <div className="mc-title">{game.title}</div>
                  <div className="mc-tag" style={{ color: game.color }}>{game.tag}</div>
                  <div className="mc-best">
                    {best > 0
                      ? <>Best: <span style={{ color: game.color }}>{best >= 1000 ? `${(best/1000).toFixed(1)}k` : best}</span>{wins > 0 && <span style={{ marginLeft: 6, opacity: 0.7 }}>· {wins}× menang</span>}</>
                      : <span style={{ opacity: 0.6 }}>Belum pernah main</span>
                    }
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {filteredGames.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', opacity: 0.5 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔎</div>
            <p style={{ fontFamily: "'Fredoka One', cursive" }}>Yah, game tidak ketemu...</p>
          </div>
        )}
      </div>
    </div>
  )
}
