import { useState } from 'react'
import { useSettings } from '../context/SettingsContext.jsx'
import { useSound } from '../hooks/useSound.js'
import { useCoins, ICON_PACKS, SNAKE_SKINS, TILE_THEMES, HIGHLIGHT_PACKS, CONSUMABLES, COIN_REWARDS } from '../context/CoinContext.jsx'

// ─── Generic cosmetic list renderer ─────────────────────────────────────────
function CosmeticList({ items, ownedList, activeId, type, dark, surface, textMain, textMuted, borderCol, coins, onBuy, onEquip, buyingId, previewId, setPreviewId, renderPreview }) {
  return items.map((item, i) => {
    const owned = ownedList.includes(item.id)
    const isActive = activeId === item.id
    const expanded = previewId === item.id

    return (
      <div
        key={item.id}
        className={`shop-pack ${owned?'owned':''} ${isActive?'active':''}`}
        style={{ animation:`slide-up 0.3s ${i*0.04}s ease both`, background:surface, borderColor: isActive ? '#4ECDC4' : owned ? (dark?'#4ECDC444':'#4ECDC4') : borderCol }}
        onClick={() => setPreviewId(expanded ? null : item.id)}
      >
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
  const {
    coins, ownedPacks, activePack, ownedSkins, activeSkin,
    ownedTileThemes, activeTileTheme, ownedHighlights, activeHighlight,
    hints, timeFreezes, dailyStreak, isDailyClaimable,
    buyCosmetic, equipCosmetic, buyConsumable, claimDaily, transactions,
  } = useCoins()

  const [tab, setTab] = useState('packs')
  const [toast, setToast] = useState('')
  const [buyingId, setBuyingId] = useState(null)
  const [previewId, setPreviewId] = useState(null)

  const dark = darkMode
  const bg = dark ? '#0d0b1e' : '#FFF9F0'
  const surface = dark ? '#16213e' : '#fff'
  const textMain = dark ? '#e8e8f0' : '#2D3436'
  const textMuted = dark ? '#8892b0' : '#636E72'
  const borderCol = dark ? '#2d3561' : '#DFE6E9'

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const handleBuyCosmetic = async (type, item) => {
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
    { id:'items',      label:'💡 Items',    },
    { id:'history',    label:'📜 Riwayat',  },
  ]

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
          background:${textMain}; color:${bg}; padding:10px 22px; border-radius:100px;
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
        .shop-tab-row { display:flex; gap:6px; margin-bottom:20px; flex-wrap:wrap; }
        .shop-tab {
          flex:1; min-width:80px; padding:9px 6px; border-radius:14px; border:2px solid ${borderCol};
          background:transparent; font-family:'Fredoka One',cursive; font-size:12px;
          color:${textMuted}; cursor:pointer; transition:all 0.2s; text-align:center; white-space:nowrap;
        }
        .shop-tab.active { border-color:#FDCB6E; background:#FDCB6E18; color:#F9A825; }

        @media (max-width: 500px) {
          .shop-tab-row { flex-wrap:nowrap; overflow-x:auto; -webkit-overflow-scrolling:touch; scrollbar-width:none; padding-bottom:4px; }
          .shop-tab-row::-webkit-scrollbar { display:none; }
          .shop-tab { flex:0 0 auto; min-width:auto; padding:9px 14px; }
        }
        .tx-row {
          display:flex; align-items:center; gap:12px; padding:10px 14px;
          border-radius:12px; margin-bottom:6px;
          background:${dark?'rgba(255,255,255,0.03)':'rgba(0,0,0,0.02)'};
        }
        @keyframes slide-up { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div className="shop-root" style={{ background:bg }}>
        <div className="shop-inner">
          {toast && <div className="shop-toast">{toast}</div>}

          <button className="shop-back" onClick={() => { play('click'); onBack() }}>← Kembali</button>

          {/* Header */}
          <div style={{ textAlign:'center', marginBottom:28, animation:'slide-up 0.4s ease both' }}>
            <div style={{ fontSize:48, marginBottom:8 }}>🏪</div>
            <h1 style={{ fontFamily:"'Fredoka One',cursive", fontSize:30, color:textMain, marginBottom:6 }}>Shop</h1>
            <div style={{
              display:'inline-flex', alignItems:'center', gap:8,
              background: dark
                ? 'linear-gradient(135deg, rgba(253,203,110,0.12), rgba(249,168,37,0.08))'
                : 'linear-gradient(135deg,#FFF8E1,#FFFDE7)',
              border:`2px solid ${dark ? 'rgba(253,203,110,0.3)' : '#FDCB6E'}`, borderRadius:100, padding:'8px 22px',
              boxShadow: dark ? '0 4px 14px rgba(253,203,110,0.1)' : '0 4px 14px rgba(253,203,110,0.2)',
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
                renderPreview={(pack) => (
                  <div className="pack-preview">
                    {pack.icons.map((icon, j) => <div key={j} className="pack-icon-cell">{icon}</div>)}
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
                renderPreview={(item) => (
                  <div style={{ marginTop:12, padding:14, borderRadius:12, background:dark?'rgba(255,255,255,0.03)':'rgba(0,0,0,0.02)', display:'flex', alignItems:'center', gap:14, justifyContent:'center' }}>
                    {/* Snake preview circles */}
                    {[...Array(8)].map((_, j) => {
                      const s = item.skin
                      const isHead = j === 0
                      const r = 16 - j * 1.2
                      return (
                        <div key={j} style={{
                          width:r*2, height:r*2, borderRadius:'50%',
                          background: isHead ? s.head : (j%2===0 ? s.body : s.head+'cc'),
                          boxShadow: isHead ? `0 0 12px ${s.glow}88` : 'none',
                          transition:'all 0.3s',
                        }} />
                      )
                    })}
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

          {/* ── Consumable Items ── */}
          {tab === 'items' && (
            <div style={{ animation:'slide-up 0.3s ease both' }}>
              <p style={{ fontSize:13, color:textMuted, marginBottom:18, textAlign:'center' }}>
                Item sekali pakai — bisa dibeli berkali-kali
              </p>

              {/* Inventory */}
              <div style={{
                background:dark?'rgba(255,255,255,0.03)':'rgba(0,0,0,0.02)',
                border:`2px solid ${borderCol}`, borderRadius:16, padding:16, marginBottom:18,
                display:'flex', gap:20, justifyContent:'center',
              }}>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:28 }}>💡</div>
                  <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:20, color:'#FDCB6E' }}>{hints}</div>
                  <div style={{ fontSize:11, color:textMuted }}>Hints</div>
                </div>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:28 }}>⏱️</div>
                  <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:20, color:'#74B9FF' }}>{timeFreezes}</div>
                  <div style={{ fontSize:11, color:textMuted }}>Time Freeze</div>
                </div>
              </div>

              {CONSUMABLES.map((item, i) => (
                <div key={item.id} className="shop-pack"
                  style={{ animation:`slide-up 0.3s ${i*0.04}s ease both`, background:surface, borderColor:borderCol, cursor:'default' }}>
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
                    <button
                      onClick={() => handleBuyConsumable(item)}
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
                      }}
                    >
                      🪙 {item.price}
                    </button>
                  </div>
                </div>
              ))}
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
