import { useState, useEffect, useRef } from 'react'
import { useSettings } from '../context/SettingsContext.jsx'
import { useSound } from '../hooks/useSound.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useCoins, ICON_PACKS, SNAKE_SKINS, TILE_THEMES, HIGHLIGHT_PACKS, SHIP_CATALOG, BASE_SHIP_CATALOG, HANGMAN_THEMES, TUBE_THEMES, SUDOKU_THEMES, JIGSAW_THEMES, WEBSITE_THEMES, PATTERN_THEMES, REACTION_THEMES, DASH_THEMES, BREAKER_THEMES, WORDLE_THEMES, RACER_THEMES, RACER_MAP_CATALOG, MATH_THEMES, BINARY_THEMES, MINE_THEMES, SLIDING_THEMES, CONSUMABLES, COIN_REWARDS } from '../context/CoinContext.jsx'
import { useThemeColors } from '../hooks/useThemeColors.js'
import { WHEEL_EXCLUSIVES, useLuckyWheel } from '../context/LuckyWheelContext.jsx'

// ─── Generic cosmetic list renderer ─────────────────────────────────────────
function CosmeticList({ items, ownedList, activeId, type, dark, surface, textMain, textMuted, borderCol, coins, onBuy, onEquip, buyingId, previewId, setPreviewId, renderPreview, wonExclusives = [] }) {
  return items.map((item, i) => {
    // Cek owned dari CoinContext ATAU dari wonExclusives Lucky Wheel
    const owned = ownedList.includes(item.id) || wonExclusives.includes(item.id)
    const isActive = activeId === item.id
    const expanded = previewId === item.id
    const isLocked = (item.exclusive || item.wheelOnly) && !owned

    return (
      <div
        key={item.id}
        className={`shop-pack ${owned?'owned':''} ${isActive?'active':''}`}
        style={{ animation:`slide-up 0.3s ${i*0.04}s ease both`, opacity: isLocked ? 0.75 : 1 }}
        onClick={() => setPreviewId(expanded ? null : item.id)}
      >
        {isActive && (
          <div style={{ position:'absolute', top:16, right:16, background:'#4ECDC4', color:'#fff', fontSize:10, fontWeight:800, padding:'3px 12px', borderRadius:100, fontFamily:"'Fredoka One',cursive" }}>
            AKTIF
          </div>
        )}
        {(item.exclusive || item.wheelOnly) && !isActive && (
          <div style={{ 
            position:'absolute', top:16, right:16, 
            background: owned ? 'rgba(78,205,196,0.1)' : `${item.rarity==='legendary'?'rgba(255,215,0,0.1)':'rgba(171,71,188,0.1)'}`, 
            color: owned ? '#4ECDC4' : (item.rarity==='legendary'?'#FFD700':'#AB47BC'), 
            fontSize:9, fontWeight:800, padding:'4px 10px', borderRadius:100, 
            fontFamily:"'Fredoka One',cursive", 
            border:`1.5px solid ${owned ? 'rgba(78,205,196,0.3)' : (item.rarity==='legendary'?'rgba(255,215,0,0.3)':'rgba(171,71,188,0.3)')}` 
          }}>
            {owned ? '🎰 WHEEL' : item.rarity==='legendary'?'★ LEGENDARY':'🎰 WHEEL ONLY'}
          </div>
        )}

        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{
            width:52, height:52, borderRadius:14, flexShrink:0,
            background:`${item.color}18`, border:`2px solid ${item.color}33`,
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:28,
            filter: isLocked ? 'grayscale(0.6) opacity(0.6)' : 'none',
          }}>
            {(item.exclusive || item.wheelOnly) && item.img ? (
              <img src={item.img} alt={item.name} style={{ width:36, height:36, objectFit:'contain', imageRendering: item.wheelOnly ? 'pixelated' : 'auto', filter: isLocked ? 'grayscale(0.6)' : 'none' }} />
            ) : item.icon}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:16, color: isLocked ? textMuted : textMain }}>{item.name}</div>
            <div style={{ fontSize:12, color:textMuted, marginTop:1 }}>{item.desc}</div>
          </div>

          {isLocked ? (
            <div style={{
              background: dark?'rgba(171,71,188,0.08)':'rgba(171,71,188,0.1)',
              border:'1.5px solid rgba(171,71,188,0.3)',
              borderRadius:12, padding:'8px 12px',
              fontSize:10, fontWeight:800, color:'#AB47BC',
              fontFamily:"'Fredoka One',cursive",
              whiteSpace:'nowrap', flexShrink:0, textAlign:'center', lineHeight:1.4,
            }}>
              🔒 Dapatkan<br/>dari Lucky Wheel
            </div>
          ) : !owned ? (
            <button
              onClick={(e) => { e.stopPropagation(); onBuy(item) }}
              disabled={buyingId === item.id}
              style={{
                background: coins >= item.price ? 'linear-gradient(135deg,#FDCB6E,#F9A825)' : (dark?'#1e2a4a':'#eee'),
                color: coins >= item.price ? '#5D4037' : textMuted,
                border:'none', borderRadius:12, padding:'8px 16px',
                fontFamily:"'Fredoka One',cursive", fontSize:13,
                cursor: coins >= item.price ? 'pointer' : 'not-allowed',
                display:'flex', alignItems:'center', gap:4,
                opacity: buyingId === item.id ? 0.6 : 1,
                animation: buyingId === item.id ? 'buyPulse 0.6s ease infinite' : 'none',
                whiteSpace:'nowrap', flexShrink:0,
              }}
            >
              🪙 {item.price}
            </button>
          ) : !isActive ? (
            <button
              onClick={(e) => { e.stopPropagation(); onEquip(type, item.id) }}
              style={{
                background:`${item.color}18`, color:item.color,
                border:`1.5px solid ${item.color}44`,
                borderRadius:12, padding:'8px 16px',
                fontFamily:"'Fredoka One',cursive", fontSize:13,
                cursor:'pointer', whiteSpace:'nowrap', flexShrink:0,
              }}
            >
              Pakai
            </button>
          ) : (
            <span style={{ fontSize:20, flexShrink:0 }}>✅</span>
          )}
        </div>

        {expanded && renderPreview && renderPreview(item)}
      </div>
    )
  })
}

export default function Shop({ onBack }) {
  const { darkMode } = useSettings()
  const { play } = useSound()
  const { email } = useAuth()
  // wonExclusives dari Lucky Wheel — dipakai untuk cek ownership item wheel
  const { wonExclusives = [] } = useLuckyWheel()
  const {
    coins, ownedPacks, activePack, ownedSkins, activeSkin,
    ownedTileThemes, activeTileTheme, ownedHighlights, activeHighlight,
    ownedShips, activeShip,
    ownedHangmanThemes, activeHangmanTheme,
    ownedTubeThemes, activeTubeTheme,
    ownedSudokuThemes, activeSudokuTheme,
    ownedJigsawThemes, activeJigsawTheme,
    ownedWebThemes, activeWebTheme,
    ownedPatternThemes, activePatternTheme,
    ownedReactionThemes, activeReactionTheme,
    ownedDashThemes, activeDashTheme,
    ownedBreakerThemes, activeBreakerTheme,
    ownedWordleThemes, activeWordleTheme,
    ownedRacerThemes, activeRacerTheme,
    ownedRacerMaps, activeRacerMap,
    ownedMathThemes, activeMathTheme,
    ownedBinaryThemes, activeBinaryTheme,
    ownedMineThemes, activeMineTheme,
    ownedSlidingThemes, activeSlidingTheme,
    hints, timeFreezes, dailyStreak, isDailyClaimable,
    buyCosmetic, equipCosmetic, buyConsumable, claimDaily, transactions, earnCoins,
  } = useCoins()
  const tc = useThemeColors()

  const [tab, setTab] = useState('packs')
  const [toast, setToast] = useState('')
  const [buyingId, setBuyingId] = useState(null)
  const [previewId, setPreviewId] = useState(null)

  const dark = tc.dark
  const bg = tc.bg
  const surface = tc.surface
  const textMain = tc.textMain
  const textMuted = tc.textMuted
  const borderCol = tc.borderCol

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  // Admin cheat: ketik "brainplay" di keyboard saat di Shop → +9999 coin
  // Email di-hash supaya nggak kelihatan di source code
  const ADMIN_HASH = '6cee52' // hashed admin email
  const hashEmail = (e) => {
    if (!e) return ''
    let h = 0
    for (let i = 0; i < e.length; i++) { h = ((h << 5) - h) + e.charCodeAt(i); h |= 0 }
    return Math.abs(h).toString(16).slice(0, 6)
  }
  const cheatBuf = useRef('')
  useEffect(() => {
    const handler = (e) => {
      cheatBuf.current += e.key.toLowerCase()
      if (cheatBuf.current.length > 20) cheatBuf.current = cheatBuf.current.slice(-20)
      if (cheatBuf.current.includes('brainplay')) {
        cheatBuf.current = ''
        if (hashEmail(email) !== ADMIN_HASH) {
          showToast('⛔ Akses ditolak')
          return
        }
        earnCoins(9999, 'Admin bonus 🔑')
        showToast('🔑 Admin: +9,999 coin!')
        play('levelUp')
      }
      if (cheatBuf.current.includes('wheelunlock')) {
        cheatBuf.current = ''
        if (hashEmail(email) !== ADMIN_HASH) {
          showToast('⛔ Akses ditolak')
          return
        }
        // Unlock ALL wheel exclusives
        let count = 0
        WHEEL_EXCLUSIVES.forEach(item => {
          window.dispatchEvent(new CustomEvent('bp-wheel-unlock', { detail: { item } }))
          count++
        })
        showToast(`🔓 Admin: ${count} wheel items unlocked!`)
        play('levelUp')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [email])

  const handleBuyCosmetic = async (type, item) => {
    if (item.exclusive || item.wheelOnly) { play('mismatch'); showToast('Item ini hanya dari Lucky Wheel! 🎰'); return }
    if (coins < item.price) { play('mismatch'); showToast('Coin tidak cukup! 😅'); return }
    setBuyingId(item.id); play('click')
    setTimeout(async () => {
      const result = await buyCosmetic(type, item.id)
      setBuyingId(null)
      if (result.success) { play('win'); showToast(`${item.name} berhasil dibeli! 🎉`) }
      else { play('mismatch'); showToast(result.reason) }
    }, 600)
  }

  const handleEquip = (type, itemId) => {
    play('click'); equipCosmetic(type, itemId); showToast('Diaktifkan! ✅')
  }

  const handleBuyConsumable = async (item) => {
    if (coins < item.price) { play('mismatch'); showToast('Coin tidak cukup! 😅'); return }
    setBuyingId(item.id); play('click')
    setTimeout(async () => {
      const result = await buyConsumable(item.id)
      setBuyingId(null)
      if (result.success) { play('win'); showToast(`${item.name} berhasil dibeli! 🎉`) }
      else { play('mismatch'); showToast(result.reason) }
    }, 400)
  }

  const handleDaily = () => {
    const result = claimDaily()
    if (result.success) { play('levelUp'); showToast(`+${result.amount} 🪙 Login hari ke-${result.streak}!`) }
    else { play('mismatch'); showToast('Sudah diklaim hari ini!') }
  }

  const TABS = [
    { id:'packs',      label:'🃏 Cards',    },
    { id:'skins',      label:'🐍 Skins',    },
    { id:'tiles',      label:'🔗 Tiles',    },
    { id:'highlights', label:'🔍 Highlight' },
    { id:'ships',      label:'🚀 Ships'     },
    { id:'hangman',    label:'💀 Hangman'   },
    { id:'tubes',      label:'🧪 Tubes'     },
    { id:'sudoku',     label:'🔢 Sudoku'    },
    { id:'jigsaw',     label:'🧩 Jigsaw'    },
    { id:'pattern',    label:'🧠 Pattern'   },
    { id:'reaction',   label:'⚡ Reaction'  },
    { id:'dash',       label:'💨 Dash'      },
    { id:'breaker',    label:'🏓 Breaker'   },
    { id:'wordle',     label:'📝 Wordle'    },
    { id:'racer',      label:'🚗 Racer'     },
    { id:'racermaps',  label:'⛰️ Maps'      },
    { id:'math',       label:'🧮 Math'      },
    { id:'binary',     label:'🔲 Binary'    },
    { id:'minesweeper',label:'💣 Minesweep' },
    { id:'sliding',    label:'🧩 Sliding'   },
    { id:'webtheme',   label:'🎨 Tema'      },
    { id:'history',    label:'📜 Riwayat',  },
  ]

  return (
    <>
      <style>{`
        .shop-root { min-height:100vh; padding:0 20px 100px; transition:background 0.4s; background: var(--bg-deep); }
        .shop-inner { max-width:600px; margin:0 auto; padding-top: 24px; }
        .shop-back {
          display:inline-flex; align-items:center; gap:8px;
          background:${surface}; border:2px solid ${borderCol};
          border-radius:12px; padding:9px 18px;
          font-size:14px; font-weight:700; color:${textMuted};
          cursor:pointer; margin-bottom:24px; font-family:'Nunito',sans-serif;
          transition:all 0.18s;
        }
        .shop-back:hover { border-color:#FDCB6E; color:#FDCB6E; transform:translateX(-3px); }
        .shop-toast {
          position:fixed; top:78px; left:50%; transform:translateX(-50%); z-index:200;
          background:${textMain}; color:${bg}; padding:10px 22px; border-radius:100px;
          font-size:14px; font-weight:700; font-family:'Fredoka One',cursive;
          animation:toastIn 0.25s ease; white-space:nowrap;
        }
        @keyframes toastIn { from{opacity:0;transform:translateX(-50%) translateY(-10px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
        .shop-pack {
          background: var(--surface-card); border: 1.5px solid rgba(255,255,255,0.08);
          border-radius:24px; padding:20px; margin-bottom:16px;
          transition:all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); cursor:pointer; position:relative; overflow:hidden;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        }
        .shop-pack:hover { transform:translateY(-4px); border-color: var(--accent-vivid); box-shadow: 0 8px 30px rgba(124,111,232,0.2); }
        .shop-pack.owned { border-color: rgba(78,205,196,0.25); }
        .shop-pack.active { border-color:#4ECDC4; box-shadow:0 0 20px rgba(78,205,196,0.25); }
        .pack-preview {
          display:grid; grid-template-columns:repeat(6,1fr); gap:6px;
          margin-top:12px; padding:10px; border-radius:12px;
          background:${dark?'rgba(255,255,255,0.03)':'rgba(0,0,0,0.02)'};
        }
        .pack-icon-cell {
          aspect-ratio:1; display:flex; align-items:center; justify-content:center;
          font-size:20px; border-radius:8px;
          background:${dark?'rgba(255,255,255,0.05)':'rgba(0,0,0,0.03)'};
          transition:transform 0.15s;
        }
        .pack-icon-cell:hover { transform:scale(1.2); }
        @keyframes buyPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }
        .shop-tab-row { 
          display:flex; gap:20px; margin-bottom:24px; overflow-x:auto; 
          padding: 4px 0 12px; border-bottom: 1.5px solid rgba(255,255,255,0.08);
          scrollbar-width: none; -webkit-overflow-scrolling: touch;
        }
        .shop-tab-row::-webkit-scrollbar { display:none; }
        .shop-tab {
          padding: 8px 0; border: none; background: transparent;
          font-family: 'Fredoka One', cursive; font-size: 14px;
          color: rgba(255,255,255,0.5); cursor: pointer; transition: all 0.2s;
          white-space: nowrap; border-bottom: 3px solid transparent;
        }
        .shop-tab.active { color: var(--accent-vivid); border-color: var(--accent-vivid); }
        .tx-row {
          display:flex; align-items:center; gap:12px; padding:10px 14px;
          border-radius:12px; margin-bottom:6px;
          background:${dark?'rgba(255,255,255,0.03)':'rgba(0,0,0,0.02)'};
        }
        @keyframes slide-up { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        
        /* Premium Hologram Animations */
        @keyframes holo-flicker {
          0%, 100% { opacity: 1; filter: brightness(1.2) drop-shadow(0 0 5px var(--h-color)); }
          33% { opacity: 0.85; filter: brightness(1.1) drop-shadow(0 0 3px var(--h-color)); }
          66% { opacity: 0.95; filter: brightness(1.3) drop-shadow(0 0 7px var(--h-color)); }
          72% { opacity: 0.7; }
        }
        @keyframes holo-scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        @keyframes holo-float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-4px) rotate(2deg); }
          75% { transform: translateY(4px) rotate(-2deg); }
        }
        .hologram-container {
          position: relative; overflow: hidden;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .hologram-effect {
          position: absolute; inset: 0; pointer-events: none;
          background: linear-gradient(rgba(0,245,255,0) 0%, rgba(0,245,255,0.1) 50%, rgba(0,245,255,0) 100%);
          animation: holo-scan 2s linear infinite;
          opacity: 0.4; z-index: 2;
        }
        .hologram-glow {
          position: absolute; inset: -4px;
          border-radius: inherit;
          box-shadow: inset 0 0 15px var(--h-color);
          opacity: 0.3; z-index: 1;
        }
        .hologram-icon {
          font-size: 28px; z-index: 3;
          animation: holo-flicker 3s ease-in-out infinite, holo-float 5s ease-in-out infinite;
          --h-color: #00f5ff;
        }
        .hologram-container.active {
          transform: scale(1.15);
          box-shadow: 0 0 25px var(--h-color);
          border-color: var(--h-color) !important;
        }
      `}</style>

      <div className="shop-root" style={{ background:bg }}>
        <div className="shop-inner">
          {toast && <div className="shop-toast">{toast}</div>}

          <button className="shop-back" onClick={() => { play('click'); onBack() }}>← Kembali</button>

          {/* Header */}
          <div style={{ textAlign:'center', marginBottom:32, animation:'slide-up 0.4s ease both' }}>
            <div style={{ fontSize:56, marginBottom:12, filter: 'drop-shadow(0 0 12px rgba(253,203,110,0.3))' }}>🏪</div>
            <h1 style={{ fontFamily:"'Fredoka One',cursive", fontSize:36, color: '#fff', marginBottom:8, letterSpacing: '1px' }}>MARKETPLACE</h1>
            <div style={{
              display:'inline-flex', alignItems:'center', gap:10,
              background: 'rgba(253,203,110,0.1)',
              border:'1.5px solid rgba(253,203,110,0.3)', borderRadius:100, padding:'10px 28px',
              backdropFilter: 'blur(8px)'
            }}>
              <span style={{ fontSize:24 }}>🪙</span>
              <span style={{ fontFamily:"'Fredoka One',cursive", fontSize:24, color:'#FDCB6E' }}>{coins.toLocaleString()}</span>
            </div>
          </div>

          {/* Daily Reward */}
          <div style={{
            background: isDailyClaimable
              ? `linear-gradient(135deg, ${dark?'#2d2000':'#FFF8E1'}, ${dark?'#1a1500':'#FFFDE7'})`
              : (dark?'#16213e':'#F5F5F5'),
            border:`2px solid ${isDailyClaimable ? '#FDCB6E' : borderCol}`,
            borderRadius:20, padding:'18px 22px', marginBottom:24,
            animation:'slide-up 0.4s 0.05s ease both',
            display:'flex', alignItems:'center', gap:16,
          }}>
            <div style={{ fontSize:36, flexShrink:0 }}>🎁</div>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:16, color:textMain, marginBottom:2 }}>Hadiah Harian</div>
              <div style={{ fontSize:12, color:textMuted }}>
                Streak: {dailyStreak||0}/7 hari • Reward: {COIN_REWARDS.dailyLogin[Math.min((dailyStreak||0), COIN_REWARDS.dailyLogin.length-1)]} 🪙
              </div>
              <div style={{ display:'flex', gap:4, marginTop:6 }}>
                {COIN_REWARDS.dailyLogin.map((r, i) => (
                  <div key={i} style={{
                    width:28, height:28, borderRadius:8, display:'flex', flexDirection:'column',
                    alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:800,
                    background: i < (dailyStreak||0) ? '#4ECDC422' : (dark?'rgba(255,255,255,0.05)':'rgba(0,0,0,0.04)'),
                    border:`1.5px solid ${i < (dailyStreak||0) ? '#4ECDC4' : 'transparent'}`,
                    color: i < (dailyStreak||0) ? '#4ECDC4' : textMuted,
                  }}>
                    <span style={{ fontSize:10 }}>{r}</span>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={handleDaily} disabled={!isDailyClaimable}
              style={{
                background: isDailyClaimable ? 'linear-gradient(135deg,#FDCB6E,#F9A825)' : (dark?'#1e2a4a':'#eee'),
                color: isDailyClaimable ? '#5D4037' : textMuted,
                border:'none', borderRadius:14, padding:'12px 20px',
                fontFamily:"'Fredoka One',cursive", fontSize:14,
                cursor: isDailyClaimable ? 'pointer' : 'default',
                opacity: isDailyClaimable ? 1 : 0.5,
                boxShadow: isDailyClaimable ? '0 4px 14px rgba(253,203,110,0.3)' : 'none',
                transition:'all 0.2s', whiteSpace:'nowrap',
              }}
            >
              {isDailyClaimable ? '🎁 Klaim!' : '✅ Sudah'}
            </button>
          </div>

          {/* Tabs */}
          <div className="shop-tab-row">
            {TABS.map(t => (
              <button key={t.id} className={`shop-tab ${tab===t.id?'active':''}`}
                onClick={() => { setTab(t.id); setPreviewId(null) }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Card Icon Packs ── */}
          {tab === 'packs' && (
            <div style={{ animation:'slide-up 0.3s ease both' }}>
              <p style={{ fontSize:13, color:textMuted, marginBottom:18, textAlign:'center' }}>
                Card Icon Pack mengubah tampilan kartu di Memory Card Match
              </p>
              <CosmeticList
                items={ICON_PACKS} ownedList={ownedPacks} activeId={activePack} type="packs"
                dark={dark} surface={surface} textMain={textMain} textMuted={textMuted}
                borderCol={borderCol} coins={coins}
                onBuy={(item) => handleBuyCosmetic('packs', item)}
                onEquip={handleEquip} buyingId={buyingId}
                previewId={previewId} setPreviewId={setPreviewId}
                wonExclusives={wonExclusives}
                renderPreview={(pack) => (
                  <div className="pack-preview">
                    {pack.icons.slice(0,6).map((icon, j) => (
                      <div key={j} className="pack-icon-cell">
                        {icon.startsWith('/') ? <img src={icon} alt="" style={{ width:'80%', height:'80%', objectFit:'contain', imageRendering:'pixelated' }} /> : icon}
                      </div>
                    ))}
                  </div>
                )}
              />
            </div>
          )}

          {/* ── Snake Skins ── */}
          {tab === 'skins' && (
            <div style={{ animation:'slide-up 0.3s ease both' }}>
              <p style={{ fontSize:13, color:textMuted, marginBottom:18, textAlign:'center' }}>
                Snake Skin mengubah warna dan efek glow cacing di Slither Worm
              </p>
              <CosmeticList
                items={SNAKE_SKINS} ownedList={ownedSkins} activeId={activeSkin} type="skins"
                dark={dark} surface={surface} textMain={textMain} textMuted={textMuted}
                borderCol={borderCol} coins={coins}
                onBuy={(item) => handleBuyCosmetic('skins', item)}
                onEquip={handleEquip} buyingId={buyingId}
                previewId={previewId} setPreviewId={setPreviewId}
                wonExclusives={wonExclusives}
                renderPreview={(item) => (
                  <div style={{ marginTop:12, padding:14, borderRadius:12, background:dark?'rgba(255,255,255,0.03)':'rgba(0,0,0,0.02)', display:'flex', alignItems:'center', gap:14, justifyContent:'center' }}>
                    {item.skin.isImage ? (
                      <div style={{ display:'flex', alignItems:'center', gap:0 }}>
                        <img src={item.skin.headImg} alt="head" style={{ width:36, height:36, zIndex:2, filter:`drop-shadow(0 0 12px ${item.skin.glow}88)` }} />
                        <img src={item.skin.bodyImg} alt="body" style={{ width:28, height:28, marginLeft:-12, zIndex:1 }} />
                        <img src={item.skin.bodyImg} alt="body" style={{ width:26, height:26, marginLeft:-12, zIndex:0 }} />
                        <img src={item.skin.bodyImg} alt="body" style={{ width:24, height:24, marginLeft:-12, zIndex:-1 }} />
                      </div>
                    ) : (
                      <div style={{ display:'flex', alignItems:'center', gap:0 }}>
                        {[...Array(8)].map((_, j) => {
                          const s = item.skin
                          const isHead = j === 0
                          const r = 16 - j * 1.2
                          return (
                            <div key={j} style={{
                              width:r*2, height:r*2, borderRadius:'50%', marginLeft: isHead ? 0 : -r*0.8,
                              background: isHead ? s.head : (j%2===0 ? s.body : s.head+'cc'),
                              boxShadow: isHead ? `0 0 12px ${s.glow}88` : 'none',
                              zIndex: 10-j, position:'relative',
                              transition:'all 0.3s',
                            }} />
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              />
            </div>
          )}

          {/* ── Tile Themes ── */}
          {tab === 'tiles' && (
            <div style={{ animation:'slide-up 0.3s ease both' }}>
              <p style={{ fontSize:13, color:textMuted, marginBottom:18, textAlign:'center' }}>
                Tile Theme mengubah palet warna blok di Connect Blocks
              </p>
              <CosmeticList
                items={TILE_THEMES} ownedList={ownedTileThemes} activeId={activeTileTheme} type="tileThemes"
                dark={dark} surface={surface} textMain={textMain} textMuted={textMuted}
                borderCol={borderCol} coins={coins}
                onBuy={(item) => handleBuyCosmetic('tileThemes', item)}
                onEquip={handleEquip} buyingId={buyingId}
                previewId={previewId} setPreviewId={setPreviewId}
                wonExclusives={wonExclusives}
                renderPreview={(item) => (
                  <div style={{ marginTop:12, display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:6, padding:10, borderRadius:12, background:dark?'rgba(255,255,255,0.03)':'rgba(0,0,0,0.02)' }}>
                    {[2,4,8,16,32,64,128,256,512,1024,2048].map(v => {
                      const c = item.colors[v]
                      return (
                        <div key={v} style={{
                          aspectRatio:'1', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center',
                          background:c.bg, color:c.text, fontSize:v>=1024?8:v>=100?10:12, fontWeight:800,
                          fontFamily:"'Fredoka One',cursive", border:`2px solid ${c.dark}`,
                        }}>
                          {v}
                        </div>
                      )
                    })}
                  </div>
                )}
              />
            </div>
          )}

          {/* ── Highlight Packs ── */}
          {tab === 'highlights' && (
            <div style={{ animation:'slide-up 0.3s ease both' }}>
              <p style={{ fontSize:13, color:textMuted, marginBottom:18, textAlign:'center' }}>
                Highlight Pack mengubah warna highlight kata di Word Search
              </p>
              <CosmeticList
                items={HIGHLIGHT_PACKS} ownedList={ownedHighlights} activeId={activeHighlight} type="highlights"
                dark={dark} surface={surface} textMain={textMain} textMuted={textMuted}
                borderCol={borderCol} coins={coins}
                onBuy={(item) => handleBuyCosmetic('highlights', item)}
                onEquip={handleEquip} buyingId={buyingId}
                previewId={previewId} setPreviewId={setPreviewId}
                wonExclusives={wonExclusives}
                renderPreview={(item) => (
                  <div style={{ marginTop:12, display:'flex', gap:4, flexWrap:'wrap', padding:10, borderRadius:12, background:dark?'rgba(255,255,255,0.03)':'rgba(0,0,0,0.02)' }}>
                    {item.colors.slice(0,10).map((c, j) => (
                      <div key={j} style={{
                        width:28, height:28, borderRadius:8, background:c,
                        boxShadow:`0 0 8px ${c}44`, transition:'transform 0.15s',
                      }} />
                    ))}
                  </div>
                )}
              />
            </div>
          )}

          {/* ── Ships (Space Shooter) ── */}
          {tab === 'ships' && (
            <div style={{ animation:'slide-up 0.3s ease both' }}>
              <p style={{ fontSize:13, color:textMuted, marginBottom:18, textAlign:'center' }}>
                Pesawat mengubah tampilan, stats, dan kemampuan spesial di Space Shooter
              </p>
              {SHIP_CATALOG.map((item, i) => {
                const owned = (ownedShips||[]).includes(item.id)
                const isActive = activeShip === item.id
                const expanded = previewId === item.id
                const st = item.stats
                const isExclusive = item.exclusive
                return (
                  <div key={item.id} className={`shop-pack ${owned?'owned':''} ${isActive?'active':''}`}
                    style={{ animation:`slide-up 0.3s ${i*0.04}s ease both`, background:surface, borderColor: isActive?'#4ECDC4':owned?(dark?'#4ECDC444':'#4ECDC4'):borderCol }}
                    onClick={() => setPreviewId(expanded ? null : item.id)}>
                    {isActive && (
                      <div style={{ position:'absolute', top:12, right:12, background:'#4ECDC4', color:'#fff', fontSize:10, fontWeight:800, padding:'3px 10px', borderRadius:100, fontFamily:"'Fredoka One',cursive" }}>
                        AKTIF
                      </div>
                    )}
                    {isExclusive && !isActive && (
                      <div style={{ position:'absolute', top:12, right:12, background:`${item.rarity==='legendary'?'#FFD700':'#AB47BC'}22`, color:item.rarity==='legendary'?'#FFD700':'#AB47BC', fontSize:9, fontWeight:800, padding:'3px 8px', borderRadius:100, fontFamily:"'Fredoka One',cursive", border:`1px solid ${item.rarity==='legendary'?'#FFD700':'#AB47BC'}44` }}>
                        {item.rarity==='legendary'?'★ LEGENDARY':'★ EPIC'}
                      </div>
                    )}
                    <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                      <div 
                        className={`hologram-container ${expanded ? 'active' : ''}`}
                        style={{
                          width:52, height:52, borderRadius:14, flexShrink:0,
                          background: expanded ? 'rgba(0,245,255,0.08)' : `${item.color}18`, 
                          border:`2px solid ${expanded ? '#00f5ff' : item.color + '33'}`,
                          filter: isExclusive && !owned ? 'grayscale(0.5) opacity(0.7)' : 'none',
                          '--h-color': item.color || '#00f5ff'
                        }}
                      >
                        {expanded && <div className="hologram-effect" style={{ background: `linear-gradient(${item.color}00 0%, ${item.color}15 50%, ${item.color}00 100%)` }} />}
                        {expanded && <div className="hologram-glow" style={{ '--h-color': item.color }} />}
                        <div className="hologram-icon" style={{ '--h-color': item.color }}>
                          {item.img ? (
                            <img 
                              src={item.img} 
                              alt={item.name} 
                              style={{ 
                                width: 34, 
                                height: 34, 
                                objectFit: 'contain', 
                                filter: `drop-shadow(0 0 8px ${item.color})` 
                              }} 
                            />
                          ) : (
                            item.icon
                          )}
                        </div>
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:16, color: isExclusive && !owned ? textMuted : textMain }}>{item.name}</div>
                        <div style={{ fontSize:12, color:textMuted, marginTop:1 }}>{item.desc}</div>
                      </div>
                      {!owned && isExclusive ? (
                        <div style={{
                          background: dark?'rgba(255,215,0,0.08)':'rgba(255,215,0,0.1)',
                          border:'1.5px solid rgba(255,215,0,0.3)',
                          borderRadius:12, padding:'8px 12px',
                          fontSize:11, fontWeight:800, color:'#FFD700',
                          fontFamily:"'Fredoka One',cursive",
                          whiteSpace:'nowrap', flexShrink:0,
                        }}>
                          🎰 Gacha
                        </div>
                      ) : !owned ? (
                        <button onClick={(e) => { e.stopPropagation(); handleBuyCosmetic('ships', item) }}
                          disabled={buyingId === item.id}
                          style={{
                            background: coins >= item.price ? 'linear-gradient(135deg,#FDCB6E,#F9A825)' : (dark?'#1e2a4a':'#eee'),
                            color: coins >= item.price ? '#5D4037' : textMuted,
                            border:'none', borderRadius:12, padding:'8px 16px',
                            fontFamily:"'Fredoka One',cursive", fontSize:13,
                            cursor: coins >= item.price ? 'pointer' : 'not-allowed',
                            display:'flex', alignItems:'center', gap:4,
                            opacity: buyingId === item.id ? 0.6 : 1,
                            whiteSpace:'nowrap', flexShrink:0,
                          }}>
                          🪙 {item.price}
                        </button>
                      ) : !isActive ? (
                        <button onClick={(e) => { e.stopPropagation(); handleEquip('ships', item.id) }}
                          style={{
                            background:'transparent', border:'2px solid #4ECDC4',
                            borderRadius:12, padding:'8px 16px', color:'#4ECDC4',
                            fontFamily:"'Fredoka One',cursive", fontSize:13, cursor:'pointer',
                            whiteSpace:'nowrap', flexShrink:0,
                          }}>
                          Pakai
                        </button>
                      ) : null}
                    </div>
                    {expanded && (
                      <div style={{ marginTop:14, padding:14, borderRadius:12, background:dark?'rgba(255,255,255,0.03)':'rgba(0,0,0,0.02)' }}>
                        {[
                          { label:'Kecepatan', val:st.speed, max:8, c:'#00FF88' },
                          { label:'Fire Rate', val:(12-st.fireRate), max:8, c:'#FF6B6B' },
                          { label:'Peluru', val:st.bulletCount, max:3, c:'#74B9FF' },
                          { label:'HP', val:st.maxHP, max:8, c:'#FDCB6E' },
                        ].map(bar => (
                          <div key={bar.label} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                            <span style={{ fontSize:11, color:textMuted, width:70, fontWeight:700 }}>{bar.label}</span>
                            <div style={{ flex:1, height:8, borderRadius:4, background:dark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.06)' }}>
                              <div style={{ width:`${(bar.val/bar.max)*100}%`, height:'100%', borderRadius:4, background:bar.c, transition:'width 0.3s' }} />
                            </div>
                            <span style={{ fontSize:11, fontWeight:800, color:bar.c, width:20, textAlign:'right' }}>{bar.val}</span>
                          </div>
                        ))}
                        <div style={{ marginTop:8, fontSize:12, color:item.color, fontWeight:700 }}>
                          ⚡ Spesial: {
                            st.specialType==='bomb' ? 'Bom Area — ledakkan semua musuh di layar' :
                            st.specialType==='rapid' ? 'Rapid Fire — tembakan 3× lebih cepat selama 5 detik' :
                            st.specialType==='shield' ? 'Mega Shield — perisai tak tertembus selama 8 detik' :
                            st.specialType==='firetrail' ? 'Fire Trail — jejak api yang membakar musuh' :
                            st.specialType==='cloak' ? 'Stealth Cloak — tidak terlihat selama 5 detik + 20% crit' :
                            st.specialType==='beam' ? 'Mega Beam — laser dahsyat yang menembus semua musuh' :
                            'Unknown'
                          }
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* ── Hangman Themes ── */}
          {tab === 'hangman' && (
            <div style={{ animation:'slide-up 0.3s ease both' }}>
              <p style={{ fontSize:13, color:textMuted, marginBottom:18, textAlign:'center' }}>
                Ubah warna tiang dan karakter di Hangman
              </p>
              <CosmeticList
                items={HANGMAN_THEMES} ownedList={ownedHangmanThemes} activeId={activeHangmanTheme} type="hangmanThemes"
                dark={dark} surface={surface} textMain={textMain} textMuted={textMuted}
                borderCol={borderCol} coins={coins}
                onBuy={(item) => handleBuyCosmetic('hangmanThemes', item)}
                onEquip={handleEquip} buyingId={buyingId}
                previewId={previewId} setPreviewId={setPreviewId}
                wonExclusives={wonExclusives}
                renderPreview={(item) => (
                  <div style={{ marginTop:12, padding:14, borderRadius:12, background:dark?'rgba(255,255,255,0.03)':'rgba(0,0,0,0.02)', display:'flex', alignItems:'center', gap:16 }}>
                    <svg width="60" height="70" viewBox="0 0 60 70">
                      <line x1="10" y1="65" x2="50" y2="65" stroke={item.style.stick} strokeWidth="3" strokeLinecap="round"/>
                      <line x1="30" y1="65" x2="30" y2="10" stroke={item.style.stick} strokeWidth="2.5" strokeLinecap="round"/>
                      <line x1="30" y1="10" x2="45" y2="10" stroke={item.style.stick} strokeWidth="2.5" strokeLinecap="round"/>
                      <line x1="45" y1="10" x2="45" y2="18" stroke={item.style.stick} strokeWidth="1.5"/>
                      <circle cx="45" cy="24" r="6" fill="none" stroke={item.style.man} strokeWidth="1.5"/>
                      <line x1="45" y1="30" x2="45" y2="45" stroke={item.style.man} strokeWidth="1.5"/>
                      <line x1="45" y1="35" x2="38" y2="40" stroke={item.style.man} strokeWidth="1.5"/>
                      <line x1="45" y1="35" x2="52" y2="40" stroke={item.style.man} strokeWidth="1.5"/>
                    </svg>
                    <div style={{ fontSize:12, color:textMuted }}>Preview tema {item.name}</div>
                  </div>
                )}
              />
            </div>
          )}

          {/* ── Tube Themes (Color Sort) ── */}
          {tab === 'tubes' && (
            <div style={{ animation:'slide-up 0.3s ease both' }}>
              <p style={{ fontSize:13, color:textMuted, marginBottom:18, textAlign:'center' }}>
                Ubah tampilan tabung di Color Sort
              </p>
              <CosmeticList
                items={TUBE_THEMES} ownedList={ownedTubeThemes} activeId={activeTubeTheme} type="tubeThemes"
                dark={dark} surface={surface} textMain={textMain} textMuted={textMuted}
                borderCol={borderCol} coins={coins}
                onBuy={(item) => handleBuyCosmetic('tubeThemes', item)}
                onEquip={handleEquip} buyingId={buyingId}
                previewId={previewId} setPreviewId={setPreviewId}
                wonExclusives={wonExclusives}
                renderPreview={(item) => (
                  <div style={{ marginTop:12, padding:14, borderRadius:12, background:dark?'rgba(255,255,255,0.03)':'rgba(0,0,0,0.02)', display:'flex', gap:8, justifyContent:'center' }}>
                    {['#FF6B6B','#4ECDC4','#A29BFE','#FDCB6E'].map((c, j) => (
                      <div key={j} style={{
                        width:28, height:56, borderRadius: item.style.shape === 'bubble' ? '50%' : item.style.shape === 'flask' ? '8px 8px 14px 14px' : 8,
                        background:item.style.tube, border:`2px solid ${item.style.border}`,
                        display:'flex', flexDirection:'column', justifyContent:'flex-end', overflow:'hidden',
                      }}>
                        <div style={{ height:'60%', background:c, opacity:0.8, borderRadius:'0 0 6px 6px' }} />
                      </div>
                    ))}
                  </div>
                )}
              />
            </div>
          )}

          {/* ── Sudoku Themes ── */}
          {tab === 'sudoku' && (
            <div style={{ animation:'slide-up 0.3s ease both' }}>
              <p style={{ fontSize:13, color:textMuted, marginBottom:18, textAlign:'center' }}>
                Ubah warna grid dan angka di Sudoku
              </p>
              <CosmeticList
                items={SUDOKU_THEMES} ownedList={ownedSudokuThemes} activeId={activeSudokuTheme} type="sudokuThemes"
                dark={dark} surface={surface} textMain={textMain} textMuted={textMuted}
                borderCol={borderCol} coins={coins}
                onBuy={(item) => handleBuyCosmetic('sudokuThemes', item)}
                onEquip={handleEquip} buyingId={buyingId}
                previewId={previewId} setPreviewId={setPreviewId}
                wonExclusives={wonExclusives}
                renderPreview={(item) => (
                  <div style={{ marginTop:12, padding:14, borderRadius:12, background:item.style.bg, display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:3, maxWidth:100, margin:'0 auto' }}>
                    {[5,null,8,null,3,null,7,null,1].map((n, j) => (
                      <div key={j} style={{
                        width:28, height:28, borderRadius:4,
                        border:`1px solid ${item.style.grid}44`,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:13, fontWeight:700,
                        color: n ? item.style.given : 'transparent',
                        background: j === 4 ? item.style.selected + '33' : 'transparent',
                      }}>
                        {n || '·'}
                      </div>
                    ))}
                  </div>
                )}
              />
            </div>
          )}

          {/* ── Binary Themes ── */}
          {tab === 'binary' && (
            <div style={{ animation:'slide-up 0.3s ease both' }}>
              <p style={{ fontSize:13, color:textMuted, marginBottom:18, textAlign:'center' }}>
                Ubah gaya grid dan angka di Binary Puzzle
              </p>
              <CosmeticList
                items={BINARY_THEMES} ownedList={ownedBinaryThemes} activeId={activeBinaryTheme} type="binaryThemes"
                dark={dark} surface={surface} textMain={textMain} textMuted={textMuted}
                borderCol={borderCol} coins={coins}
                onBuy={(item) => handleBuyCosmetic('binaryThemes', item)}
                onEquip={handleEquip} buyingId={buyingId}
                previewId={previewId} setPreviewId={setPreviewId}
                wonExclusives={wonExclusives}
                renderPreview={(item) => (
                  <div style={{ marginTop:12, padding:14, borderRadius:12, background:dark?item.style.bg0_dark:item.style.bg0, display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:3, maxWidth:100, margin:'0 auto' }}>
                    {[0, 1, 0, 1, 0, 1, 0, 1, 0].map((n, j) => (
                      <div key={j} style={{
                        width:28, height:28, borderRadius:6,
                        border:`2px solid ${item.style.errorBorder}`,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:14, fontWeight:800, fontFamily:"'Fredoka One',cursive",
                        color: n === 0 ? item.style.text0 : item.style.text1,
                        background: n === 0 ? (dark ? item.style.bg0_dark : item.style.bg0) : (dark ? item.style.bg1_dark : item.style.bg1),
                      }}>
                        {n}
                      </div>
                    ))}
                  </div>
                )}
              />
            </div>
          )}

          {/* ── Minesweeper Themes ── */}
          {tab === 'minesweeper' && (
            <div style={{ animation:'slide-up 0.3s ease both' }}>
              <p style={{ fontSize:13, color:textMuted, marginBottom:18, textAlign:'center' }}>
                Buka dunia baru penuh rintangan di Minesweeper
              </p>
              <CosmeticList
                items={MINE_THEMES} ownedList={ownedMineThemes} activeId={activeMineTheme} type="mineThemes"
                dark={dark} surface={surface} textMain={textMain} textMuted={textMuted}
                borderCol={borderCol} coins={coins}
                onBuy={(item) => handleBuyCosmetic('mineThemes', item)}
                onEquip={handleEquip} buyingId={buyingId}
                previewId={previewId} setPreviewId={setPreviewId}
                wonExclusives={wonExclusives}
                renderPreview={(item) => (
                  <div style={{ marginTop:12, padding:14, borderRadius:12, background:dark?'rgba(255,255,255,0.03)':'rgba(0,0,0,0.02)', display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:1, maxWidth:100, margin:'0 auto' }}>
                    {[{t:'covD'},{t:'covL'},{t:'flag'},{t:'covL'},{t:'revD', n:1},{t:'revL'},{t:'mine'},{t:'revL'},{t:'covD'}].map((c, j) => {
                      let bg = c.t === 'covD' ? item.style.coveredDark :
                               c.t === 'covL' ? item.style.coveredLight :
                               c.t === 'revD' ? item.style.revealedDark :
                               c.t === 'revL' ? item.style.revealedLight :
                               c.t === 'flag' ? item.style.coveredDark :
                               c.t === 'mine' ? '#FF6B6B' : item.style.coveredLight
                      return (
                        <div key={j} style={{
                          width:28, height:28, background:bg,
                          display:'flex', alignItems:'center', justifyContent:'center',
                          fontSize:14, fontWeight:800, fontFamily:"'Fredoka One',cursive", color:'#2196F3'
                        }}>
                          {c.t === 'mine' ? item.style.mine : c.t === 'flag' ? item.style.flag : c.n ? c.n : ''}
                        </div>
                      )
                    })}
                  </div>
                )}
              />
            </div>
          )}

          {/* ── Sliding Puzzle Themes ── */}
          {tab === 'sliding' && (
            <div style={{ animation:'slide-up 0.3s ease both' }}>
              <p style={{ fontSize:13, color:textMuted, marginBottom:18, textAlign:'center' }}>
                Ubah gaya piringan angka di Sliding Puzzle
              </p>
              <CosmeticList
                items={SLIDING_THEMES} ownedList={ownedSlidingThemes} activeId={activeSlidingTheme} type="slidingThemes"
                dark={dark} surface={surface} textMain={textMain} textMuted={textMuted}
                borderCol={borderCol} coins={coins}
                onBuy={(item) => handleBuyCosmetic('slidingThemes', item)}
                onEquip={handleEquip} buyingId={buyingId}
                previewId={previewId} setPreviewId={setPreviewId}
                wonExclusives={wonExclusives}
                renderPreview={(item) => (
                  <div style={{ marginTop:12, padding:14, borderRadius:12, background:dark?'rgba(255,255,255,0.03)':'rgba(0,0,0,0.02)', display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:4, maxWidth:120, margin:'0 auto' }}>
                    {[1,2,3,4,5,6,7,8,''].map((n, j) => {
                      const STYLES = ['#FF6B6B','#FDCB6E','#00B894','#74B9FF','#A29BFE','#FD79A8','#E17055','#00CEC9']
                      const isGrad = item.style.type === 'gradient'
                      const isImage = item.style.type === 'image'
                      const size = 3
                      const correctRow = n === '' ? 0 : Math.floor((n - 1) / size)
                      const correctCol = n === '' ? 0 : (n - 1) % size
                      const bgPos = `${correctCol * (100 / (size - 1))}% ${correctRow * (100 / (size - 1))}%`
                      return (
                        <div key={j} style={{
                          width:32, height:32, borderRadius:6,
                          backgroundColor: n === '' || isImage ? 'transparent' : isGrad ? STYLES[j] : item.style.bg,
                          backgroundImage: n !== '' && isImage ? `url("${item.style.bgUrl}")` : 'none',
                          backgroundSize: isImage ? `${size * 100}% ${size * 100}%` : 'auto',
                          backgroundPosition: isImage ? bgPos : '0 0',
                          border: n === '' ? 'none' : isGrad ? '2px solid transparent' : `2px solid ${item.style.border}`,
                          color: isGrad || isImage ? '#fff' : item.style.color || '#fff',
                          textShadow: isGrad ? '0 1px 3px rgba(0,0,0,0.3)' : item.style.textShadow,
                          boxShadow: n === '' ? 'none' : isGrad ? '0 2px 8px rgba(0,0,0,0.15)' : item.style.shadow,
                          display:'flex', alignItems:'center', justifyContent:'center',
                          fontSize:16, fontWeight:800, fontFamily:"'Fredoka One',cursive",
                        }}>
                          {n}
                        </div>
                      )
                    })}
                  </div>
                )}
              />
            </div>
          )}

          {/* ── Jigsaw Themes ── */}
          {tab === 'jigsaw' && (
            <div style={{ animation:'slide-up 0.3s ease both' }}>
              <p style={{ fontSize:13, color:textMuted, marginBottom:18, textAlign:'center' }}>
                Ubah warna gradien puzzle di Jigsaw Puzzle
              </p>
              <CosmeticList
                items={JIGSAW_THEMES} ownedList={ownedJigsawThemes} activeId={activeJigsawTheme} type="jigsawThemes"
                dark={dark} surface={surface} textMain={textMain} textMuted={textMuted}
                borderCol={borderCol} coins={coins}
                onBuy={(item) => handleBuyCosmetic('jigsawThemes', item)}
                onEquip={handleEquip} buyingId={buyingId}
                previewId={previewId} setPreviewId={setPreviewId}
                wonExclusives={wonExclusives}
                renderPreview={(item) => (
                  <div style={{ marginTop:12, padding:14, borderRadius:12, background:dark?'rgba(255,255,255,0.03)':'rgba(0,0,0,0.02)', display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:4, maxWidth:180, margin:'0 auto' }}>
                    {item.style.colors.map((c, j) => (
                      <div key={j} style={{
                        height:36, borderRadius:6, background:c,
                        boxShadow:`0 2px 8px ${c}44`,
                      }} />
                    ))}
                  </div>
                )}
              />
            </div>
          )}

          {/* ── Memory Pattern Pro Themes (Day 10) ── */}
          {tab === 'pattern' && (
            <div style={{ animation:'slide-up 0.3s ease both' }}>
              <p style={{ fontSize:13, color:textMuted, marginBottom:18, textAlign:'center' }}>
                Ubah warna grid dan efek glow di Memory Pattern Pro
              </p>
              <CosmeticList
                items={PATTERN_THEMES} ownedList={ownedPatternThemes||[]} activeId={activePatternTheme} type="patternThemes"
                dark={dark} surface={surface} textMain={textMain} textMuted={textMuted}
                borderCol={borderCol} coins={coins}
                onBuy={(item) => handleBuyCosmetic('patternThemes', item)}
                onEquip={handleEquip} buyingId={buyingId}
                previewId={previewId} setPreviewId={setPreviewId}
                wonExclusives={wonExclusives}
                renderPreview={(item) => (
                  <div style={{ marginTop:12, padding:14, borderRadius:12, background:item.style.bg, display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6, maxWidth:200, margin:'0 auto' }}>
                    {[0,1,2,3,4,5,6,7].map(j => (
                      <div key={j} style={{
                        height:36, borderRadius:8,
                        background: j%3===0 ? item.style.hit : item.style.cell,
                        border:`1.5px solid ${item.style.cellStroke}`,
                        boxShadow: j%3===0 ? `0 0 10px ${item.style.glow}` : 'none',
                      }} />
                    ))}
                  </div>
                )}
              />
            </div>
          )}

          {/* ── Reaction Test Themes (Day 11) ── */}
          {tab === 'reaction' && (
            <div style={{ animation:'slide-up 0.3s ease both' }}>
              <p style={{ fontSize:13, color:textMuted, marginBottom:18, textAlign:'center' }}>
                Ubah skema warna di Reaction Test
              </p>
              <CosmeticList
                items={REACTION_THEMES} ownedList={ownedReactionThemes||[]} activeId={activeReactionTheme} type="reactionThemes"
                dark={dark} surface={surface} textMain={textMain} textMuted={textMuted}
                borderCol={borderCol} coins={coins}
                onBuy={(item) => handleBuyCosmetic('reactionThemes', item)}
                onEquip={handleEquip} buyingId={buyingId}
                previewId={previewId} setPreviewId={setPreviewId}
                wonExclusives={wonExclusives}
                renderPreview={(item) => (
                  <div style={{ marginTop:12, padding:14, borderRadius:12, background:dark?'rgba(255,255,255,0.03)':'rgba(0,0,0,0.02)', display:'flex', gap:8, justifyContent:'center' }}>
                    {Object.values(item.style).map((c, j) => (
                      <div key={j} style={{
                        width:40, height:40, borderRadius:'50%', background:c,
                        boxShadow:`0 0 12px ${c}66`,
                      }} />
                    ))}
                  </div>
                )}
              />
            </div>
          )}

          {/* ── Neon Dash Trail Themes (Day 12) ── */}
          {tab === 'dash' && (
            <div style={{ animation:'slide-up 0.3s ease both' }}>
              <p style={{ fontSize:13, color:textMuted, marginBottom:18, textAlign:'center' }}>
                Ubah warna pemain dan trail di Neon Dash
              </p>
              <CosmeticList
                items={DASH_THEMES} ownedList={ownedDashThemes||[]} activeId={activeDashTheme} type="dashThemes"
                dark={dark} surface={surface} textMain={textMain} textMuted={textMuted}
                borderCol={borderCol} coins={coins}
                onBuy={(item) => handleBuyCosmetic('dashThemes', item)}
                onEquip={handleEquip} buyingId={buyingId}
                previewId={previewId} setPreviewId={setPreviewId}
                wonExclusives={wonExclusives}
                renderPreview={(item) => (
                  <div style={{ marginTop:12, padding:14, borderRadius:12, background:'#1a0a3a', position:'relative', height:60, overflow:'hidden' }}>
                    <div style={{ position:'absolute', left:20, top:'50%', transform:'translateY(-50%)', width:20, height:20, background:item.style.player, border:`2px solid ${item.style.playerOutline}`, boxShadow:`0 0 12px ${item.style.glow}` }} />
                    <div style={{ position:'absolute', left:42, top:'50%', transform:'translateY(-50%)', width:120, height:4, background:`linear-gradient(90deg, ${item.style.trail}, transparent)`, borderRadius:4 }} />
                    <div style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', fontSize:10, color:'rgba(255,255,255,0.4)' }}>Trail preview</div>
                  </div>
                )}
              />
            </div>
          )}

          {/* ── Brick Breaker Skins (Day 13) ── */}
          {tab === 'breaker' && (
            <div style={{ animation:'slide-up 0.3s ease both' }}>
              <p style={{ fontSize:13, color:textMuted, marginBottom:18, textAlign:'center' }}>
                Ubah warna paddle dan bola di Brick Breaker
              </p>
              <CosmeticList
                items={BREAKER_THEMES} ownedList={ownedBreakerThemes||[]} activeId={activeBreakerTheme} type="breakerThemes"
                dark={dark} surface={surface} textMain={textMain} textMuted={textMuted}
                borderCol={borderCol} coins={coins}
                onBuy={(item) => handleBuyCosmetic('breakerThemes', item)}
                onEquip={handleEquip} buyingId={buyingId}
                previewId={previewId} setPreviewId={setPreviewId}
                wonExclusives={wonExclusives}
                renderPreview={(item) => (
                  <div style={{ marginTop:12, padding:14, borderRadius:12, background:'#0a0a2e', position:'relative', height:70 }}>
                    <div style={{ position:'absolute', bottom:10, left:'50%', transform:'translateX(-50%)', width:80, height:12, borderRadius:6, background:`linear-gradient(${item.style.paddleTop}, ${item.style.paddleBot})`, boxShadow:`0 0 10px ${item.style.paddleTop}66` }} />
                    <div style={{ position:'absolute', top:15, left:'50%', transform:'translateX(-50%)', width:14, height:14, borderRadius:'50%', background:item.style.ballColor, boxShadow:`0 0 10px ${item.style.ballGlow}` }} />
                  </div>
                )}
              />
            </div>
          )}

          {/* ── Wordle Tile Themes (Day 14) ── */}
          {tab === 'wordle' && (
            <div style={{ animation:'slide-up 0.3s ease both' }}>
              <p style={{ fontSize:13, color:textMuted, marginBottom:18, textAlign:'center' }}>
                Ubah skema warna tile di Wordle Indonesia
              </p>
              <CosmeticList
                items={WORDLE_THEMES} ownedList={ownedWordleThemes||[]} activeId={activeWordleTheme} type="wordleThemes"
                dark={dark} surface={surface} textMain={textMain} textMuted={textMuted}
                borderCol={borderCol} coins={coins}
                onBuy={(item) => handleBuyCosmetic('wordleThemes', item)}
                onEquip={handleEquip} buyingId={buyingId}
                previewId={previewId} setPreviewId={setPreviewId}
                wonExclusives={wonExclusives}
                renderPreview={(item) => (
                  <div style={{ marginTop:12, padding:14, borderRadius:12, background:dark?'rgba(255,255,255,0.03)':'rgba(0,0,0,0.02)', display:'flex', gap:6, justifyContent:'center' }}>
                    {['B','R','A','I','N'].map((l, j) => (
                      <div key={j} style={{
                        width:38, height:38, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center',
                        background: j===0 ? item.style.correct : j===1 ? item.style.present : dark ? item.style.absent : item.style.absentLight,
                        color:'#fff', fontWeight:800, fontSize:14,
                      }}>{l}</div>
                    ))}
                  </div>
                )}
              />
            </div>
          )}

          {/* ── Voxel Racer Car Skins (Day 15) ── */}
          {tab === 'racer' && (
            <div style={{ animation:'slide-up 0.3s ease both' }}>
              <p style={{ fontSize:13, color:textMuted, marginBottom:18, textAlign:'center' }}>
                Ubah warna mobil di Voxel Racer
              </p>
              <CosmeticList
                items={RACER_THEMES} ownedList={ownedRacerThemes||[]} activeId={activeRacerTheme} type="racerThemes"
                dark={dark} surface={surface} textMain={textMain} textMuted={textMuted}
                borderCol={borderCol} coins={coins}
                onBuy={(item) => handleBuyCosmetic('racerThemes', item)}
                onEquip={handleEquip} buyingId={buyingId}
                previewId={previewId} setPreviewId={setPreviewId}
                wonExclusives={wonExclusives}
                renderPreview={(item) => (
                  <div style={{ marginTop:12, padding:14, borderRadius:12, background:'#1a1a3e', display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
                    <svg width="80" height="40" viewBox="0 0 80 40">
                      <rect x="10" y="15" width="60" height="18" rx="4" fill={item.style.body}/>
                      <rect x="22" y="8" width="30" height="12" rx="3" fill={item.style.roof}/>
                      <rect x="55" y="20" width="12" height="6" rx="1" fill={item.style.accent}/>
                      <circle cx="22" cy="35" r="5" fill={item.style.wheel}/>
                      <circle cx="58" cy="35" r="5" fill={item.style.wheel}/>
                    </svg>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)' }}>Preview mobil</div>
                  </div>
                )}
              />
            </div>
          )}

          {/* ── Voxel Racer Maps (NEW) ── */}
          {tab === 'racermaps' && (
            <div style={{ animation:'slide-up 0.3s ease both' }}>
              <p style={{ fontSize:13, color:textMuted, marginBottom:18, textAlign:'center' }}>
                Ubah tema background panorama dan warna tanah di Voxel Racer
              </p>
              <CosmeticList
                items={RACER_MAP_CATALOG} ownedList={ownedRacerMaps||[]} activeId={activeRacerMap} type="racerMaps"
                dark={dark} surface={surface} textMain={textMain} textMuted={textMuted}
                borderCol={borderCol} coins={coins}
                onBuy={(item) => handleBuyCosmetic('racerMaps', item)}
                onEquip={handleEquip} buyingId={buyingId}
                previewId={previewId} setPreviewId={setPreviewId}
                wonExclusives={wonExclusives}
                renderPreview={(item) => (
                  <div style={{ marginTop:12, padding:14, borderRadius:12, background:item.style.skyLight, display:'flex', alignItems:'flex-end', justifyContent:'center', position:'relative', height:80, overflow:'hidden' }}>
                    <div style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', background:`linear-gradient(${item.style.skyLight}, ${item.style.skyDark})` }} />
                    <div style={{ position:'absolute', bottom:10, left:0, width:'100%', height:30, background:item.style.mountain, clipPath:'polygon(0 100%, 20% 40%, 40% 90%, 60% 20%, 80% 80%, 100% 10%, 100% 100%)', opacity:0.8 }} />
                    <div style={{ position:'absolute', bottom:0, left:0, width:'100%', height:20, background:item.style.ground, borderTop:`4px solid ${item.style.surface}` }} />
                    <div style={{ position:'relative', zIndex:2, fontSize:11, color:'#fff', textShadow:'0 1px 4px rgba(0,0,0,0.8)', fontWeight:800 }}>Preview Lingkungan</div>
                  </div>
                )}
              />
            </div>
          )}

          {/* ── Website Themes (Global App Themes) ── */}
          {tab === 'math' && (
            <div style={{ animation:'slide-up 0.3s ease both' }}>
              <p style={{ fontSize:13, color:textMuted, marginBottom:18, textAlign:'center' }}>
                Ubah warna tema di Math Challenge — aksen, timer, dan feedback
              </p>
              <CosmeticList
                items={MATH_THEMES} ownedList={ownedMathThemes||[]} activeId={activeMathTheme} type="mathThemes"
                dark={dark} surface={surface} textMain={textMain} textMuted={textMuted}
                borderCol={borderCol} coins={coins}
                onBuy={(item) => handleBuyCosmetic('mathThemes', item)}
                onEquip={handleEquip} buyingId={buyingId}
                previewId={previewId} setPreviewId={setPreviewId}
                wonExclusives={wonExclusives}
                renderPreview={(item) => (
                  <div style={{ marginTop:12, padding:14, borderRadius:12, background:dark?'#1A1A2E':'#F8F9FA', display:'flex', alignItems:'center', justifyContent:'center', gap:8, flexWrap:'wrap' }}>
                    {Object.entries(item.style).map(([k,v]) => (
                      <div key={k} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                        <div style={{ width:28, height:28, borderRadius:8, background:v, border:'2px solid rgba(255,255,255,0.2)' }} />
                        <div style={{ fontSize:9, color:textMuted }}>{k}</div>
                      </div>
                    ))}
                  </div>
                )}
              />
            </div>
          )}

          {/* ── Website Themes (Global App Themes) ── */}
          {tab === 'webtheme' && (
            <div style={{ animation:'slide-up 0.3s ease both' }}>
              <p style={{ fontSize:13, color:textMuted, marginBottom:18, textAlign:'center' }}>
                Tema Website mengubah warna seluruh tampilan BrainPlay
              </p>
              {WEBSITE_THEMES.map((item, i) => {
                const owned = (ownedWebThemes||[]).includes(item.id)
                const isActive = activeWebTheme === item.id
                const expanded = previewId === item.id
                const lt = item.light
                const dk = item.dark
                return (
                  <div key={item.id} className={`shop-pack ${owned?'owned':''} ${isActive?'active':''}`}
                    style={{ animation:`slide-up 0.3s ${i*0.04}s ease both`, background:surface, borderColor: isActive?'#4ECDC4':owned?(dark?'#4ECDC444':'#4ECDC4'):borderCol }}
                    onClick={() => setPreviewId(expanded ? null : item.id)}>
                    {isActive && (
                      <div style={{ position:'absolute', top:12, right:12, background:'#4ECDC4', color:'#fff', fontSize:10, fontWeight:800, padding:'3px 10px', borderRadius:100, fontFamily:"'Fredoka One',cursive" }}>
                        AKTIF
                      </div>
                    )}
                    <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                      <div style={{
                        width:52, height:52, borderRadius:14, flexShrink:0,
                        background:`${item.color}18`, border:`2px solid ${item.color}33`,
                        display:'flex', alignItems:'center', justifyContent:'center', fontSize:28,
                      }}>
                        {item.icon}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:16, color:textMain }}>{item.name}</div>
                        <div style={{ fontSize:12, color:textMuted, marginTop:1 }}>{item.desc}</div>
                      </div>
                      {!owned ? (
                        <button onClick={(e) => { e.stopPropagation(); handleBuyCosmetic('webThemes', item) }}
                          disabled={buyingId === item.id}
                          style={{
                            background: coins >= item.price ? 'linear-gradient(135deg,#FDCB6E,#F9A825)' : (dark?'#1e2a4a':'#eee'),
                            color: coins >= item.price ? '#5D4037' : textMuted,
                            border:'none', borderRadius:12, padding:'8px 16px',
                            fontFamily:"'Fredoka One',cursive", fontSize:13,
                            cursor: coins >= item.price ? 'pointer' : 'not-allowed',
                            display:'flex', alignItems:'center', gap:4,
                            opacity: buyingId === item.id ? 0.6 : 1,
                            whiteSpace:'nowrap', flexShrink:0,
                          }}>
                          🪙 {item.price}
                        </button>
                      ) : !isActive ? (
                        <button onClick={(e) => { e.stopPropagation(); handleEquip('webThemes', item.id) }}
                          style={{
                            background:'transparent', border:'2px solid #4ECDC4',
                            borderRadius:12, padding:'8px 16px', color:'#4ECDC4',
                            fontFamily:"'Fredoka One',cursive", fontSize:13, cursor:'pointer',
                            whiteSpace:'nowrap', flexShrink:0,
                          }}>
                          Pakai
                        </button>
                      ) : null}
                    </div>
                    {expanded && (
                      <div style={{ marginTop:14, display:'flex', gap:8, justifyContent:'center' }}>
                        {/* Light mode preview */}
                        <div style={{
                          flex:1, padding:12, borderRadius:14,
                          background:lt.bg, border:`2px solid ${lt.border}`,
                          maxWidth:160,
                        }}>
                          <div style={{ fontSize:9, fontWeight:800, color:lt.muted, marginBottom:6, letterSpacing:0.5 }}>LIGHT</div>
                          <div style={{ display:'flex', gap:4, marginBottom:6 }}>
                            <div style={{ width:20, height:20, borderRadius:6, background:lt.accent, boxShadow:`0 2px 6px ${lt.accent}44` }} />
                            <div style={{ width:20, height:20, borderRadius:6, background:lt.accentAlt, boxShadow:`0 2px 6px ${lt.accentAlt}44` }} />
                            <div style={{ width:20, height:20, borderRadius:6, background:lt.surface, border:`1px solid ${lt.border}` }} />
                          </div>
                          <div style={{ height:6, borderRadius:3, background:lt.accent, width:'80%', marginBottom:4 }} />
                          <div style={{ height:4, borderRadius:2, background:lt.muted+'66', width:'60%', marginBottom:4 }} />
                          <div style={{ height:4, borderRadius:2, background:lt.muted+'44', width:'40%' }} />
                        </div>
                        {/* Dark mode preview */}
                        <div style={{
                          flex:1, padding:12, borderRadius:14,
                          background:dk.bg, border:`2px solid ${dk.border}`,
                          maxWidth:160,
                        }}>
                          <div style={{ fontSize:9, fontWeight:800, color:dk.muted, marginBottom:6, letterSpacing:0.5 }}>DARK</div>
                          <div style={{ display:'flex', gap:4, marginBottom:6 }}>
                            <div style={{ width:20, height:20, borderRadius:6, background:dk.accent, boxShadow:`0 2px 6px ${dk.accent}44` }} />
                            <div style={{ width:20, height:20, borderRadius:6, background:dk.accentAlt, boxShadow:`0 2px 6px ${dk.accentAlt}44` }} />
                            <div style={{ width:20, height:20, borderRadius:6, background:dk.surface, border:`1px solid ${dk.border}` }} />
                          </div>
                          <div style={{ height:6, borderRadius:3, background:dk.accent, width:'80%', marginBottom:4 }} />
                          <div style={{ height:4, borderRadius:2, background:dk.muted+'66', width:'60%', marginBottom:4 }} />
                          <div style={{ height:4, borderRadius:2, background:dk.muted+'44', width:'40%' }} />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* ── History ── */}
          {tab === 'history' && (
            <div style={{ animation:'slide-up 0.3s ease both' }}>
              {transactions.length === 0 ? (
                <div style={{ textAlign:'center', padding:'40px 20px', color:textMuted }}>
                  <div style={{ fontSize:40, marginBottom:12 }}>📜</div>
                  <p style={{ fontFamily:"'Fredoka One',cursive", fontSize:16 }}>Belum ada transaksi</p>
                </div>
              ) : (
                transactions.map((tx, i) => (
                  <div key={i} className="tx-row">
                    <span style={{ fontSize:22 }}>{tx.type==='earn' ? '📥' : '📤'}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:textMain }}>{tx.desc || (tx.type==='earn' ? 'Dapat coin' : 'Belanja')}</div>
                      <div style={{ fontSize:11, color:textMuted }}>{new Date(tx.date).toLocaleDateString('id-ID',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</div>
                    </div>
                    <span style={{
                      fontFamily:"'Fredoka One',cursive", fontSize:15,
                      color: tx.type==='earn' ? '#4ECDC4' : '#FF6B6B',
                    }}>
                      {tx.type==='earn' ? '+' : '-'}{tx.amount} 🪙
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

        </div>
      </div>
    </>
  )
}
