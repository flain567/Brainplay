import { useState, useMemo } from 'react'
import { useSettings } from '../context/SettingsContext.jsx'
import { useSound } from '../hooks/useSound.js'
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

        .game-grid {
          display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;
          animation: slideUp 0.4s 0.2s ease both;
        }
        @media (min-width: 768px) { .game-grid { grid-template-columns: repeat(3, 1fr); } }

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
        <div className="game-grid">
          {filteredGames.map((game, i) => (
            <div key={game.id} style={{ animationDelay: `${i * 0.05}s` }}>
              <GameCard 
                game={game} 
                onClick={() => { play('click'); onOpenGame(game.id) }} 
                dark={true}
              />
            </div>
          ))}
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
