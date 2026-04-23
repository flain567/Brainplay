import { useState, useRef, useEffect } from 'react'
import { useInventory, MATERIALS, CHESTS, CONSUMABLES, CRAFTING_RECIPES } from '../context/InventoryContext.jsx'
import { useCoins } from '../context/CoinContext.jsx'
import { useThemeColors } from '../hooks/useThemeColors.js'
import { useSound } from '../hooks/useSound.js'
import gsap from 'gsap'

export default function Inventory({ onBack }) {
  const { inventory, openChest, craftRecipe } = useInventory()
  const { coins } = useCoins()
  const tc = useThemeColors()
  const { play } = useSound()
  const dark = tc.dark

  const [tab, setTab] = useState('backpack') // 'backpack', 'chests', 'forge'
  const [openingChest, setOpeningChest] = useState(null)
  const [rewards, setRewards] = useState(null)
  const chestRef = useRef(null)

  // Sub-tabs for backpack
  const [bagFilter, setBagFilter] = useState('materials') // 'materials', 'consumables'

  // Colors
  const surface = dark ? '#1A1F35' : '#FFFFFF'
  const surfaceDeep = dark ? '#0D1022' : '#F8F9FC'
  const borderCol = dark ? '#252B45' : '#E8ECF4'
  const textMain = dark ? '#E2E8F0' : '#2D3436'
  const S = {
    muted: dark ? '#475569' : '#636E72',
    accent: '#7C6FE8',
    gold: '#FFD700',
    red: '#FF6B6B'
  }

  // --- Animation Handlers ---
  const handleOpenChest = (chestId) => {
    play('click')
    setOpeningChest(chestId)
    setRewards(null)

    // Wait for modal mount, then start sequence
    setTimeout(() => {
      play('chest_shake') // hypothetical sound or just atmosphere
      
      // Intensive shake via GSAP
      if (chestRef.current) {
        gsap.to(chestRef.current, {
          x: 10, rotation: 10, duration: 0.08, repeat: 12, yoyo: true,
          onComplete: () => {
            play('chest_open')
            gsap.to(chestRef.current, {
              scale: 2, opacity: 0, duration: 0.5, ease: 'back.in(2)',
              onComplete: () => revealRewards(chestId)
            })
          }
        })
      } else {
        // Fallback if ref failed
        setTimeout(() => revealRewards(chestId), 1000)
      }
    }, 300)
  }

  const revealRewards = (chestId) => {
    const res = openChest(chestId)
    if (res.success) {
      play('success') // need a better fanfare sound eventually
      setRewards(res.drops)
    } else {
      setOpeningChest(null)
      alert(res.reason)
    }
  }

  const closeRewards = () => {
    play('click')
    setOpeningChest(null)
    setRewards(null)
  }

  const handleCraft = (recipeId) => {
    play('click')
    const res = craftRecipe(recipeId)
    if (res.success) {
      play('success')
      alert(`🎉 Sukses! ${res.message}\nKamu memilikinya sekarang.`)
    } else {
       play('error')
       alert(`❌ Gagal: ${res.reason}`)
    }
  }

  // UI Helpers
  const renderItemCard = (itemData, qty) => (
    <div key={itemData.id} style={{
      background: surfaceDeep, border: `1.5px solid ${borderCol}`,
      borderRadius: 16, padding: 16, display: 'flex', gap: 14,
      alignItems: 'center', position: 'relative', overflow: 'hidden'
    }}>
      <div style={{
        width: 50, height: 50, borderRadius: 12, display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontSize: 24,
        background: `${itemData.color}15`, border: `1.5px solid ${itemData.color}44`
      }}>
        {itemData.icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 15, color: textMain }}>
          {itemData.name}
        </div>
        <div style={{ fontSize: 11, color: S.muted, marginTop: 2, lineHeight: 1.4 }}>
          {itemData.desc}
        </div>
      </div>
      <div style={{
        background: `${itemData.color}22`, color: itemData.color,
        fontFamily: "'Fredoka One',cursive", padding: '6px 12px',
        borderRadius: 12, fontSize: 14, border: `1.5px dashed ${itemData.color}55`
      }}>
        x{qty}
      </div>
    </div>
  )

  return (
    <div className="inv-root">
      <style>{`
        .inv-root {
          min-height: 100vh; background: ${tc.bg}; padding: 0 16px 100px;
        }
        .inv-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 0; position: sticky; top: 0; z-index: 10;
          background: ${tc.bg}ee; backdrop-filter: blur(10px);
        }
        .inv-btn-back {
          width: 40px; height: 40px; border-radius: 12px;
          border: 1.5px solid ${borderCol}; background: ${surface};
          color: ${textMain}; font-size: 18px; display: flex;
          align-items: center; justify-content: center; cursor: pointer;
        }
        .inv-tabs {
          display: flex; background: ${surfaceDeep}; border-radius: 100px;
          padding: 4px; border: 1.5px solid ${borderCol}; margin-bottom: 20px;
        }
        .inv-tab {
          flex: 1; padding: 10px 0; text-align: center; font-size: 13px;
          font-weight: 800; color: ${S.muted}; border-radius: 100px;
          cursor: pointer; transition: all 0.2s;
        }
        .inv-tab.active { background: ${S.accent}; color: #fff; }
        
        .inv-grid { display: grid; gap: 12px; }
        .recipe-card {
          background: ${surface}; border: 1.5px solid ${borderCol};
          border-radius: 20px; padding: 16px; margin-bottom: 16px;
        }
        .craft-req { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
        .req-pill {
          display: flex; align-items: center; gap: 6px; padding: 4px 10px;
          border-radius: 100px; font-size: 11px; font-weight: 800; border: 1px solid;
        }
        
        /* Chest overlay */
        .chest-overlay-wrap {
          position: fixed; inset: 0; z-index: 9999;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          animation: overlayFadeIn 0.4s ease both;
        }
        .chest-overlay-bg {
          position: absolute; inset: 0;
          background: rgba(0,0,0,0.85); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
          z-index: 0;
        }
        .chest-overlay-content {
          position: relative; z-index: 1;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          width: 100%;
        }
        @keyframes overlayFadeIn { from { opacity: 0; } to { opacity: 1; } }
        
        .chest-shaking {
          animation: chestShake 0.1s infinite alternate;
        }
        @keyframes chestShake {
          from { transform: rotate(-8deg) translateX(-2px); }
          to { transform: rotate(8deg) translateX(2px); }
        }
      `}</style>

      <div className="inv-header">
        <button className="inv-btn-back" onClick={onBack}>←</button>
        <span style={{ fontFamily: "'Fredoka One',cursive", fontSize: 20, color: textMain }}>
          Tas & Crafting
        </span>
        <div style={{ width: 40 }} /> {/* Spacer */}
      </div>

      <div className="inv-tabs">
        <div className={`inv-tab ${tab === 'backpack' ? 'active' : ''}`} onClick={() => { play('click'); setTab('backpack') }}>🎒 Tas</div>
        <div className={`inv-tab ${tab === 'chests' ? 'active' : ''}`} onClick={() => { play('click'); setTab('chests') }}>🎁 Peti</div>
        <div className={`inv-tab ${tab === 'forge' ? 'active' : ''}`} onClick={() => { play('click'); setTab('forge') }}>🔨 Forge</div>
      </div>

      {/* ─── BACKPACK ─── */}
      {tab === 'backpack' && (
        <div style={{ animation: 'slide-up 0.3s ease' }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <button
              onClick={() => { play('click'); setBagFilter('materials') }}
              style={{
                background: bagFilter === 'materials' ? `${S.accent}22` : surfaceDeep,
                border: `1.5px solid ${bagFilter === 'materials' ? S.accent : borderCol}`,
                color: bagFilter === 'materials' ? S.accent : textMain,
                padding: '6px 16px', borderRadius: 100, fontSize: 13, fontWeight: 700, cursor: 'pointer'
              }}>💎 Material</button>
            <button
              onClick={() => { play('click'); setBagFilter('consumables') }}
              style={{
                background: bagFilter === 'consumables' ? `${S.accent}22` : surfaceDeep,
                border: `1.5px solid ${bagFilter === 'consumables' ? S.accent : borderCol}`,
                color: bagFilter === 'consumables' ? S.accent : textMain,
                padding: '6px 16px', borderRadius: 100, fontSize: 13, fontWeight: 700, cursor: 'pointer'
              }}>🧪 Consumable</button>
          </div>

          <div className="inv-grid">
            {bagFilter === 'materials' && Object.keys(MATERIALS).map(key => {
              const qty = inventory.materials[key] || 0
              if (qty <= 0) return null
              return renderItemCard(MATERIALS[key], qty)
            })}
            {bagFilter === 'materials' && Object.values(inventory.materials).every(q => !q) && (
              <p style={{ textAlign: 'center', color: S.muted, fontSize: 14, marginTop: 40 }}>Material kosong. Buka peti letak di tab Peti!</p>
            )}

            {bagFilter === 'consumables' && Object.keys(CONSUMABLES).map(key => {
              const qty = inventory.consumables[key] || 0
              if (qty <= 0) return null
              return renderItemCard(CONSUMABLES[key], qty)
            })}
            {bagFilter === 'consumables' && Object.values(inventory.consumables).every(q => !q) && (
              <p style={{ textAlign: 'center', color: S.muted, fontSize: 14, marginTop: 40 }}>Belum ada item consumable.</p>
            )}
          </div>
        </div>
      )}

      {/* ─── CHESTS ─── */}
      {tab === 'chests' && (
        <div style={{ animation: 'slide-up 0.3s ease' }}>
          <div className="inv-grid">
            {Object.keys(CHESTS).map(key => {
              const chest = CHESTS[key]
              const qty = inventory.chests[key] || 0
              return (
                <div key={key} style={{
                  background: dark ? `linear-gradient(145deg, ${surface}, ${surfaceDeep})` : surface,
                  border: `2px solid ${qty > 0 ? chest.color : borderCol}`,
                  borderRadius: 20, padding: 20, textAlign: 'center',
                  opacity: qty > 0 ? 1 : 0.6, position: 'relative'
                }}>
                  {qty > 0 && <div style={{
                    position: 'absolute', top: 12, right: 12, background: chest.color,
                    color: '#000', fontFamily: "'Fredoka One',cursive", padding: '4px 10px',
                    borderRadius: 100, fontSize: 11
                  }}>x{qty}</div>}
                  <div style={{ fontSize: 48, marginBottom: 12, filter: qty ? 'drop-shadow(0 0 10px '+chest.color+'66)' : 'grayscale(1)' }}>
                    {chest.icon}
                  </div>
                  <h3 style={{ fontFamily: "'Fredoka One',cursive", fontSize: 18, color: textMain, margin: '0 0 6px 0' }}>{chest.name}</h3>
                  <p style={{ fontSize: 12, color: S.muted, margin: '0 0 16px 0', lineHeight: 1.5 }}>{chest.desc}</p>
                  
                  <button 
                    disabled={qty <= 0}
                    onClick={() => handleOpenChest(key)}
                    style={{
                      width: '100%', padding: '12px', borderRadius: 14,
                      border: 'none', background: qty > 0 ? chest.color : borderCol,
                      color: qty > 0 ? (dark ? '#000' : '#fff') : S.muted,
                      fontFamily: "'Fredoka One',cursive", fontSize: 14,
                      cursor: qty > 0 ? 'pointer' : 'not-allowed',
                      boxShadow: qty > 0 ? `0 4px 15px ${chest.color}44` : 'none'
                    }}
                  >
                    Buka Peti
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ─── FORGE / CRAFTING ─── */}
      {tab === 'forge' && (
        <div style={{ animation: 'slide-up 0.3s ease' }}>
          <p style={{ textAlign: 'center', color: S.muted, fontSize: 13, marginBottom: 20 }}>
            Peleburan material menjadi Cosmetic dan Gelar Legendaris!
          </p>
          
          {CRAFTING_RECIPES.map(recipe => {
            const isAffordable = Object.entries(recipe.cost).every(([id, qty]) => (inventory.materials[id]||0) >= qty)
            return (
              <div key={recipe.id} className="recipe-card">
                <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 16 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 12, background: `${recipe.color}22`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 24, border: `2px solid ${recipe.color}`
                  }}>
                    {recipe.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 15, color: textMain }}>{recipe.name}</div>
                    <div style={{ fontSize: 11, color: S.muted, marginTop: 4, lineHeight: 1.4 }}>{recipe.desc}</div>
                  </div>
                </div>

                <div style={{ fontSize: 11, color: textMain, fontWeight: 800 }}>Kebutuhan Material:</div>
                <div className="craft-req">
                  {Object.entries(recipe.cost).map(([matId, needed]) => {
                    const have = inventory.materials[matId] || 0
                    const matInfo = MATERIALS[matId]
                    const enough = have >= needed
                    return (
                      <div key={matId} className="req-pill" style={{
                        borderColor: enough ? `${matInfo.color}44` : '#FF6B6B44',
                        background: enough ? `${matInfo.color}15` : '#FF6B6B15',
                        color: enough ? textMain : '#FF6B6B'
                      }}>
                        <span>{matInfo.icon}</span> {have}/{needed}
                      </div>
                    )
                  })}
                </div>

                <button
                  onClick={() => handleCraft(recipe.id)}
                  disabled={!isAffordable}
                  style={{
                    width: '100%', padding: '12px', marginTop: 16, borderRadius: 12,
                    background: isAffordable ? 'linear-gradient(135deg, #A29BFE, #6C5CE7)' : borderCol,
                    color: isAffordable ? '#fff' : S.muted, border: 'none',
                    fontFamily: "'Fredoka One',cursive", fontSize: 14, cursor: isAffordable ? 'pointer' : 'not-allowed'
                  }}
                >
                  {isAffordable ? '🔨 Craft Item' : 'Material Tidak Cukup'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* ─── CHEST OPENING OVERLAY ─── */}
      {openingChest && (
        <div className="chest-overlay-wrap">
          <div className="chest-overlay-bg" />
          <div className="chest-overlay-content">
            {!rewards ? (
               <div ref={chestRef} className="chest-shaking" style={{ fontSize: 120 }}>
                 {CHESTS[openingChest]?.icon}
               </div>
            ) : (
               <div style={{ animation: 'popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)', zIndex: 2 }}>
                 <style>{`@keyframes popIn { 0%{transform:scale(0.5);opacity:0} 100%{transform:scale(1);opacity:1} }`}</style>
                 <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 24, color: '#FFD700', marginBottom: 20, textAlign: 'center' }}>
                   JACKPOT!
                 </div>
                 
                 <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
                   {rewards.map((r, i) => {
                     const mat = MATERIALS[r.id]
                     return (
                       <div key={i} style={{
                         background: '#1A1F35',
                         border: `2px solid ${mat.color}`, textAlign: 'center', width: 130, padding: "24px", borderRadius: 24,
                         boxShadow: `0 10px 30px ${mat.color}33`, animation: `popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.15}s both`
                       }}>
                         <div style={{ fontSize: 52, marginBottom: 12 }}>{mat.icon}</div>
                         <div style={{ fontSize: 16, color: mat.color, fontWeight: 900, fontFamily: "'Fredoka One',cursive" }}>+{r.qty}</div>
                         <div style={{ fontSize: 11, color: '#E2E8F0', marginTop: 4 }}>{mat.name}</div>
                       </div>
                     )
                   })}
                 </div>

                 <button onClick={closeRewards} style={{
                   marginTop: 40, width: '100%', background: '#fff', color: '#000',
                   padding: '14px', borderRadius: 100, border: 'none',
                   fontFamily: "'Fredoka One',cursive", fontSize: 16, cursor: 'pointer',
                   position: 'relative', zIndex: 10
                 }}>
                   KUMPULKAN
                 </button>
               </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
