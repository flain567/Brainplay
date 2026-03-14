import { useState } from 'react'
import { useSettings } from '../context/SettingsContext.jsx'
import { useSound } from '../hooks/useSound.js'
import { useCoins, ICON_PACKS, COIN_REWARDS } from '../context/CoinContext.jsx'

export default function Shop({ onBack }) {
  const { darkMode } = useSettings()
  const { play } = useSound()
  const {
    coins, ownedPacks, activePack, dailyStreak,
    isDailyClaimable, buyPack, setActivePack, claimDaily,
    transactions,
  } = useCoins()

  const [tab, setTab] = useState('packs') // packs | history
  const [toast, setToast] = useState('')
  const [buyingId, setBuyingId] = useState(null)
  const [previewPack, setPreviewPack] = useState(null)

  const dark = darkMode
  const bg       = dark ? '#0d0b1e' : '#FFF9F0'
  const surface  = dark ? '#16213e' : '#fff'
  const textMain = dark ? '#e8e8f0' : '#2D3436'
  const textMuted= dark ? '#8892b0' : '#636E72'
  const borderCol= dark ? '#2d3561' : '#DFE6E9'

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const handleBuy = async (pack) => {
    if (ownedPacks.includes(pack.id)) return
    if (coins < pack.price) {
      play('mismatch')
      showToast('Coin tidak cukup! 😅')
      return
    }
    setBuyingId(pack.id)
    play('click')
    setTimeout(async () => {
      const result = await buyPack(pack.id)
      setBuyingId(null)
      if (result.success) {
        play('win')
        showToast(`${pack.name} berhasil dibeli! 🎉`)
      } else {
        play('mismatch')
        showToast(result.reason)
      }
    }, 600)
  }

  const handleEquip = (packId) => {
    play('click')
    setActivePack(packId)
    showToast('Pack diaktifkan! ✅')
  }

  const handleDaily = () => {
    const result = claimDaily()
    if (result.success) {
      play('levelUp')
      showToast(`+${result.amount} 🪙 Login hari ke-${result.streak}!`)
    } else {
      play('mismatch')
      showToast('Sudah diklaim hari ini!')
    }
  }

  return (
    <>
      <style>{`
        .shop-root { min-height:100vh; padding:32px 20px 80px; transition:background 0.4s; }
        .shop-inner { max-width:600px; margin:0 auto; }
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
          background:${textMain}; color:${bg}; padding:10px 22px; border-radius:100;
          font-size:14px; font-weight:700; font-family:'Fredoka One',cursive;
          animation:toastIn 0.25s ease; white-space:nowrap;
        }
        @keyframes toastIn { from{opacity:0;transform:translateX(-50%) translateY(-10px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }

        .shop-pack {
          background:${surface}; border:2px solid ${borderCol};
          border-radius:20px; padding:20px; margin-bottom:14px;
          transition:all 0.2s; cursor:pointer; position:relative; overflow:hidden;
        }
        .shop-pack:hover { transform:translateY(-2px); border-color:#FDCB6E44; }
        .shop-pack.owned { border-color:${dark?'#4ECDC444':'#4ECDC4'}; }
        .shop-pack.active { border-color:#4ECDC4; box-shadow:0 0 16px #4ECDC422; }

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

        .shop-tab-row { display:flex; gap:8px; margin-bottom:20px; }
        .shop-tab {
          flex:1; padding:10px; border-radius:14px; border:2px solid ${borderCol};
          background:transparent; font-family:'Fredoka One',cursive; font-size:14px;
          color:${textMuted}; cursor:pointer; transition:all 0.2s; text-align:center;
        }
        .shop-tab.active { border-color:#FDCB6E; background:#FDCB6E18; color:#F9A825; }

        .tx-row {
          display:flex; align-items:center; gap:12px; padding:10px 14px;
          border-radius:12px; margin-bottom:6px;
          background:${dark?'rgba(255,255,255,0.03)':'rgba(0,0,0,0.02)'};
        }
      `}</style>

      <div className="shop-root" style={{ background:bg }}>
        <div className="shop-inner">

          {toast && <div className="shop-toast">{toast}</div>}

          <button className="shop-back" onClick={() => { play('click'); onBack() }}>
            ← Kembali
          </button>

          {/* Header */}
          <div style={{ textAlign:'center', marginBottom:28, animation:'slide-up 0.4s ease both' }}>
            <div style={{ fontSize:48, marginBottom:8 }}>🏪</div>
            <h1 style={{ fontFamily:"'Fredoka One',cursive", fontSize:30, color:textMain, marginBottom:6 }}>Shop</h1>
            <div style={{
              display:'inline-flex', alignItems:'center', gap:8,
              background:'linear-gradient(135deg,#FFF8E1,#FFFDE7)',
              border:'2px solid #FDCB6E',
              borderRadius:100, padding:'8px 22px',
              boxShadow:'0 4px 14px rgba(253,203,110,0.2)',
            }}>
              <span style={{ fontSize:22 }}>🪙</span>
              <span style={{ fontFamily:"'Fredoka One',cursive", fontSize:22, color:'#F9A825' }}>{coins.toLocaleString()}</span>
            </div>
          </div>

          {/* Daily Reward */}
          <div style={{
            background: isDailyClaimable
              ? `linear-gradient(135deg, ${dark?'#2d2000':'#FFF8E1'}, ${dark?'#1a1500':'#FFFDE7'})`
              : (dark?'#16213e':'#F5F5F5'),
            border: `2px solid ${isDailyClaimable ? '#FDCB6E' : borderCol}`,
            borderRadius:20, padding:'18px 22px', marginBottom:24,
            animation:'slide-up 0.4s 0.05s ease both',
            display:'flex', alignItems:'center', gap:16,
          }}>
            <div style={{ fontSize:36, flexShrink:0 }}>🎁</div>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:16, color:textMain, marginBottom:2 }}>
                Hadiah Harian
              </div>
              <div style={{ fontSize:12, color:textMuted }}>
                Streak: {dailyStreak || 0}/7 hari
                {' • '}Reward: {COIN_REWARDS.dailyLogin[Math.min((dailyStreak || 0), COIN_REWARDS.dailyLogin.length - 1)]} 🪙
              </div>
              {/* Streak dots */}
              <div style={{ display:'flex', gap:4, marginTop:6 }}>
                {COIN_REWARDS.dailyLogin.map((r, i) => (
                  <div key={i} style={{
                    width:28, height:28, borderRadius:8, display:'flex', flexDirection:'column',
                    alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:800,
                    background: i < (dailyStreak || 0) ? '#4ECDC422' : (dark?'rgba(255,255,255,0.05)':'rgba(0,0,0,0.04)'),
                    border: `1.5px solid ${i < (dailyStreak || 0) ? '#4ECDC4' : 'transparent'}`,
                    color: i < (dailyStreak || 0) ? '#4ECDC4' : textMuted,
                  }}>
                    <span style={{ fontSize:10 }}>{r}</span>
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={handleDaily}
              disabled={!isDailyClaimable}
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
            <button className={`shop-tab ${tab==='packs'?'active':''}`} onClick={() => setTab('packs')}>
              🃏 Card Packs
            </button>
            <button className={`shop-tab ${tab==='history'?'active':''}`} onClick={() => setTab('history')}>
              📜 Riwayat
            </button>
          </div>

          {/* Card Packs Tab */}
          {tab === 'packs' && (
            <div style={{ animation:'slide-up 0.3s ease both' }}>
              <p style={{ fontSize:13, color:textMuted, marginBottom:18, textAlign:'center' }}>
                Card Icon Pack mengubah tampilan kartu di Memory Card Match
              </p>

              {ICON_PACKS.map((pack, i) => {
                const owned = ownedPacks.includes(pack.id)
                const isActive = activePack === pack.id
                const expanded = previewPack === pack.id

                return (
                  <div
                    key={pack.id}
                    className={`shop-pack ${owned?'owned':''} ${isActive?'active':''}`}
                    style={{ animation:`slide-up 0.3s ${i*0.04}s ease both` }}
                    onClick={() => setPreviewPack(expanded ? null : pack.id)}
                  >
                    {/* Active badge */}
                    {isActive && (
                      <div style={{
                        position:'absolute', top:12, right:12,
                        background:'#4ECDC4', color:'#fff', fontSize:10, fontWeight:800,
                        padding:'3px 10px', borderRadius:100, fontFamily:"'Fredoka One',cursive",
                      }}>
                        AKTIF
                      </div>
                    )}

                    {/* Pack info */}
                    <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                      <div style={{
                        width:52, height:52, borderRadius:14, flexShrink:0,
                        background:`${pack.color}18`, border:`2px solid ${pack.color}33`,
                        display:'flex', alignItems:'center', justifyContent:'center', fontSize:28,
                      }}>
                        {pack.icon}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:16, color:textMain }}>{pack.name}</div>
                        <div style={{ fontSize:12, color:textMuted, marginTop:1 }}>{pack.desc}</div>
                      </div>

                      {/* Price / Action */}
                      {!owned ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleBuy(pack) }}
                          disabled={buyingId === pack.id}
                          style={{
                            background: coins >= pack.price
                              ? 'linear-gradient(135deg,#FDCB6E,#F9A825)'
                              : (dark?'#1e2a4a':'#eee'),
                            color: coins >= pack.price ? '#5D4037' : textMuted,
                            border:'none', borderRadius:12, padding:'8px 16px',
                            fontFamily:"'Fredoka One',cursive", fontSize:13,
                            cursor: coins >= pack.price ? 'pointer' : 'not-allowed',
                            display:'flex', alignItems:'center', gap:4,
                            opacity: buyingId === pack.id ? 0.6 : 1,
                            animation: buyingId === pack.id ? 'buyPulse 0.6s ease infinite' : 'none',
                            whiteSpace:'nowrap', flexShrink:0,
                          }}
                        >
                          🪙 {pack.price}
                        </button>
                      ) : !isActive ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEquip(pack.id) }}
                          style={{
                            background:`${pack.color}18`, color:pack.color,
                            border:`1.5px solid ${pack.color}44`,
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

                    {/* Expanded preview */}
                    {expanded && (
                      <div className="pack-preview">
                        {pack.icons.map((icon, j) => (
                          <div key={j} className="pack-icon-cell">{icon}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* History Tab */}
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
                    <span style={{ fontSize:22 }}>{tx.type === 'earn' ? '📥' : '📤'}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:textMain }}>{tx.desc || (tx.type==='earn' ? 'Dapat coin' : 'Belanja')}</div>
                      <div style={{ fontSize:11, color:textMuted }}>{new Date(tx.date).toLocaleDateString('id-ID', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}</div>
                    </div>
                    <span style={{
                      fontFamily:"'Fredoka One',cursive", fontSize:15,
                      color: tx.type === 'earn' ? '#4ECDC4' : '#FF6B6B',
                    }}>
                      {tx.type === 'earn' ? '+' : '-'}{tx.amount} 🪙
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
