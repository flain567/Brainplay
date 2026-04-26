import { useState, useEffect } from 'react'

// ─── Shared shimmer animation + skeleton primitives ─────────────────────────

const skeletonStyles = `
  @keyframes sk-shimmer {
    0%   { background-position: -400px 0; }
    100% { background-position: 400px 0; }
  }
  @keyframes sk-fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  .sk-pulse {
    background: linear-gradient(
      90deg,
      rgba(255,255,255,0.04) 0%,
      rgba(255,255,255,0.10) 40%,
      rgba(255,255,255,0.04) 80%
    );
    background-size: 800px 100%;
    animation: sk-shimmer 1.6s ease-in-out infinite;
    border-radius: 12px;
  }
  .sk-circle {
    border-radius: 50% !important;
  }
  .sk-root {
    animation: sk-fadeIn 0.25s ease both;
    min-height: 100vh;
    padding: 0 20px 100px;
    background: var(--bg-deep, #07071a);
  }
  .sk-inner {
    max-width: 600px;
    margin: 0 auto;
    padding-top: 24px;
  }
`

function Bone({ w, h, r, circle, mb, mt, ml, style }) {
  return (
    <div
      className={`sk-pulse ${circle ? 'sk-circle' : ''}`}
      style={{
        width: w || '100%',
        height: h || 16,
        borderRadius: r || 12,
        marginBottom: mb || 0,
        marginTop: mt || 0,
        marginLeft: ml || 0,
        flexShrink: 0,
        ...style,
      }}
    />
  )
}

function SkeletonCard({ children, mb = 16, style }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1.5px solid rgba(255,255,255,0.06)',
      borderRadius: 24,
      padding: 24,
      marginBottom: mb,
      ...style,
    }}>
      {children}
    </div>
  )
}

// ─── PAGE-SPECIFIC SKELETONS ────────────────────────────────────────────────

// Profile skeleton: avatar + level card, stats grid, game breakdown
export function ProfileSkeleton() {
  return (
    <>
      <style>{skeletonStyles}</style>
      <div className="sk-root">
        <div className="sk-inner">
          {/* Back button */}
          <Bone w={120} h={40} mb={28} />

          {/* Level Card */}
          <SkeletonCard mb={20} style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, rgba(255,107,107,0.2), rgba(162,155,254,0.2), rgba(78,205,196,0.2), rgba(253,203,110,0.2))' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 20 }}>
              <Bone w={90} h={90} circle mb={0} />
              <div style={{ flex: 1 }}>
                <Bone w={80} h={14} mb={8} />
                <Bone w={160} h={24} mb={8} />
                <Bone w={200} h={12} mb={0} />
              </div>
            </div>
            {/* Auth status bar */}
            <Bone h={42} mb={16} />
            {/* XP bar */}
            <div style={{ marginBottom: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <Bone w={60} h={12} />
                <Bone w={60} h={12} />
              </div>
              <Bone h={12} r={100} mb={8} />
              <Bone w={140} h={12} mb={0} style={{ margin: '0 auto' }} />
            </div>
            {/* Trophy Road button */}
            <Bone h={48} r={14} mt={16} />
          </SkeletonCard>

          {/* Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 20 }}>
            {[...Array(6)].map((_, i) => (
              <SkeletonCard key={i} mb={0}>
                <div style={{ textAlign: 'center' }}>
                  <Bone w={32} h={32} circle mb={8} style={{ margin: '0 auto' }} />
                  <Bone w={60} h={20} mb={6} style={{ margin: '0 auto' }} />
                  <Bone w={80} h={12} style={{ margin: '0 auto' }} />
                </div>
              </SkeletonCard>
            ))}
          </div>

          {/* Per-game breakdown */}
          <SkeletonCard>
            <Bone w={180} h={18} mb={16} />
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <Bone w={36} h={36} r={10} />
                <div style={{ flex: 1 }}>
                  <Bone w={120} h={14} mb={4} />
                  <Bone w={180} h={11} />
                </div>
                <Bone w={56} h={24} r={100} />
              </div>
            ))}
          </SkeletonCard>
        </div>
      </div>
    </>
  )
}

// Shop skeleton: header, coin badge, daily reward, tab row, item list
export function ShopSkeleton() {
  return (
    <>
      <style>{skeletonStyles}</style>
      <div className="sk-root">
        <div className="sk-inner">
          {/* Back button */}
          <Bone w={120} h={40} mb={24} />

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <Bone w={64} h={64} circle mb={12} style={{ margin: '0 auto' }} />
            <Bone w={200} h={36} mb={12} style={{ margin: '0 auto' }} />
            <Bone w={140} h={40} r={100} style={{ margin: '0 auto' }} />
          </div>

          {/* Daily Reward */}
          <SkeletonCard mb={24}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Bone w={40} h={40} circle />
              <div style={{ flex: 1 }}>
                <Bone w={100} h={15} mb={6} />
                <Bone w={160} h={11} mb={6} />
                <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                  {[...Array(7)].map((_, i) => (
                    <Bone key={i} w={24} h={24} r={6} />
                  ))}
                </div>
              </div>
              <Bone w={80} h={34} r={14} />
            </div>
          </SkeletonCard>

          {/* Tab row */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6,
            marginBottom: 20, padding: 10,
            background: 'rgba(0,0,0,0.25)', borderRadius: 16,
            border: '1.5px solid rgba(255,255,255,0.06)',
          }}>
            {[...Array(9)].map((_, i) => (
              <Bone key={i} h={38} r={12} />
            ))}
          </div>

          {/* Item list */}
          {[...Array(4)].map((_, i) => (
            <SkeletonCard key={i}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <Bone w={52} h={52} r={14} />
                <div style={{ flex: 1 }}>
                  <Bone w={120} h={16} mb={6} />
                  <Bone w={200} h={12} />
                </div>
                <Bone w={72} h={34} r={12} />
              </div>
            </SkeletonCard>
          ))}
        </div>
      </div>
    </>
  )
}

// Leaderboard skeleton: header, player card, game tabs, podium, list
export function LeaderboardSkeleton() {
  return (
    <>
      <style>{skeletonStyles}</style>
      <div className="sk-root">
        <div className="sk-inner">
          {/* Back button */}
          <Bone w={120} h={40} mb={24} />

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <Bone w={64} h={64} circle mb={12} style={{ margin: '0 auto' }} />
            <Bone w={240} h={36} mb={8} style={{ margin: '0 auto' }} />
          </div>

          {/* Firebase status */}
          <Bone h={38} mb={16} r={12} />

          {/* Player card */}
          <SkeletonCard mb={20}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Bone w={32} h={32} r={10} />
              <Bone w={120} h={16} />
            </div>
          </SkeletonCard>

          {/* Game tabs row */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflow: 'hidden', paddingBottom: 4 }}>
            {[...Array(6)].map((_, i) => (
              <Bone key={i} w={80} h={36} r={14} style={{ flexShrink: 0 }} />
            ))}
          </div>

          {/* Difficulty tabs */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 20, paddingBottom: 10, borderBottom: '1.5px solid rgba(255,255,255,0.08)' }}>
            {[...Array(5)].map((_, i) => (
              <Bone key={i} w={70} h={28} r={6} style={{ flexShrink: 0 }} />
            ))}
          </div>

          {/* Mode buttons */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            <Bone h={48} r={16} style={{ flex: 1 }} />
            <Bone h={48} r={16} style={{ flex: 1 }} />
            <Bone w={44} h={48} r={14} />
          </div>

          {/* Podium area */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 32, padding: '20px 0', minHeight: 180 }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 25 }}>
              <Bone w={68} h={68} r={24} mb={12} />
              <Bone w={60} h={14} mb={4} />
              <Bone w={40} h={16} />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', transform: 'scale(1.15)' }}>
              <Bone w={86} h={86} r={24} mb={12} />
              <Bone w={70} h={16} mb={4} />
              <Bone w={50} h={18} />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 25 }}>
              <Bone w={68} h={68} r={24} mb={12} />
              <Bone w={60} h={14} mb={4} />
              <Bone w={40} h={16} />
            </div>
          </div>

          {/* List rows */}
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px',
              borderRadius: 24, marginBottom: 10,
              background: 'rgba(255,255,255,0.03)',
              border: '1.5px solid rgba(255,255,255,0.06)',
            }}>
              <Bone w={36} h={36} r={12} />
              <Bone w={36} h={36} r={10} />
              <div style={{ flex: 1 }}>
                <Bone w={100} h={14} mb={4} />
                <Bone w={60} h={10} />
              </div>
              <Bone w={50} h={16} />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

// Games page skeleton: search, filter, game cards
export function GamesSkeleton() {
  return (
    <>
      <style>{skeletonStyles}</style>
      <div className="sk-root">
        <div className="sk-inner">
          {/* Back button */}
          <Bone w={120} h={40} mb={24} />

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <Bone w={64} h={64} circle mb={12} style={{ margin: '0 auto' }} />
            <Bone w={200} h={32} mb={8} style={{ margin: '0 auto' }} />
            <Bone w={260} h={14} style={{ margin: '0 auto' }} />
          </div>

          {/* Search bar */}
          <Bone h={48} r={16} mb={16} />

          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflow: 'hidden' }}>
            {[...Array(5)].map((_, i) => (
              <Bone key={i} w={80} h={34} r={100} style={{ flexShrink: 0 }} />
            ))}
          </div>

          {/* Game cards */}
          {[...Array(6)].map((_, i) => (
            <SkeletonCard key={i}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <Bone w={56} h={56} r={16} />
                <div style={{ flex: 1 }}>
                  <Bone w={140} h={16} mb={6} />
                  <Bone w={'100%'} h={12} mb={4} />
                  <Bone w={80} h={12} />
                </div>
                <Bone w={40} h={24} r={100} />
              </div>
            </SkeletonCard>
          ))}
        </div>
      </div>
    </>
  )
}

// Inventory skeleton
export function InventorySkeleton() {
  return (
    <>
      <style>{skeletonStyles}</style>
      <div className="sk-root">
        <div className="sk-inner">
          <Bone w={120} h={40} mb={24} />
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <Bone w={64} h={64} circle mb={12} style={{ margin: '0 auto' }} />
            <Bone w={180} h={32} mb={8} style={{ margin: '0 auto' }} />
          </div>

          {/* Consumables row */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
            {[...Array(3)].map((_, i) => (
              <SkeletonCard key={i} mb={0} style={{ flex: 1, textAlign: 'center', padding: 16 }}>
                <Bone w={36} h={36} circle mb={8} style={{ margin: '0 auto' }} />
                <Bone w={50} h={14} mb={4} style={{ margin: '0 auto' }} />
                <Bone w={30} h={20} style={{ margin: '0 auto' }} />
              </SkeletonCard>
            ))}
          </div>

          {/* Chest cards */}
          {[...Array(3)].map((_, i) => (
            <SkeletonCard key={i}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <Bone w={52} h={52} r={14} />
                <div style={{ flex: 1 }}>
                  <Bone w={120} h={16} mb={6} />
                  <Bone w={180} h={12} />
                </div>
                <Bone w={80} h={36} r={12} />
              </div>
            </SkeletonCard>
          ))}
        </div>
      </div>
    </>
  )
}

// Friends skeleton
export function FriendsSkeleton() {
  return (
    <>
      <style>{skeletonStyles}</style>
      <div className="sk-root">
        <div className="sk-inner">
          {/* Top bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <Bone w={44} h={44} r={14} />
            <div style={{ textAlign: 'center' }}>
              <Bone w={120} h={28} mb={4} style={{ margin: '0 auto' }} />
              <Bone w={90} h={12} style={{ margin: '0 auto' }} />
            </div>
            <div style={{ width: 44 }} />
          </div>

          {/* Tabs */}
          <div style={{
            display: 'flex', gap: 8, padding: 6,
            background: 'rgba(255,255,255,0.03)', borderRadius: 18,
            border: '1.5px solid rgba(255,255,255,0.06)', marginBottom: 24,
          }}>
            {[...Array(3)].map((_, i) => (
              <Bone key={i} h={44} r={14} style={{ flex: 1 }} />
            ))}
          </div>

          {/* Friend items */}
          {[...Array(5)].map((_, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 16, padding: 16,
              borderRadius: 20, marginBottom: 12,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <Bone w={48} h={48} r={14} />
              <div style={{ flex: 1 }}>
                <Bone w={120} h={16} mb={6} />
                <Bone w={80} h={12} />
              </div>
              <Bone w={42} h={42} r={14} />
              <Bone w={38} h={38} r={12} />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

// Stats / Analytics skeleton (generic)
export function StatsSkeleton() {
  return (
    <>
      <style>{skeletonStyles}</style>
      <div className="sk-root">
        <div className="sk-inner">
          <Bone w={120} h={40} mb={24} />
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <Bone w={64} h={64} circle mb={12} style={{ margin: '0 auto' }} />
            <Bone w={200} h={32} mb={8} style={{ margin: '0 auto' }} />
          </div>

          {/* Charts placeholder */}
          <SkeletonCard mb={20}>
            <Bone w={140} h={18} mb={16} />
            <Bone h={160} r={16} />
          </SkeletonCard>

          <SkeletonCard mb={20}>
            <Bone w={180} h={18} mb={16} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              {[...Array(4)].map((_, i) => (
                <div key={i} style={{ textAlign: 'center', padding: 12 }}>
                  <Bone w={40} h={40} circle mb={8} style={{ margin: '0 auto' }} />
                  <Bone w={50} h={18} mb={4} style={{ margin: '0 auto' }} />
                  <Bone w={70} h={12} style={{ margin: '0 auto' }} />
                </div>
              ))}
            </div>
          </SkeletonCard>
        </div>
      </div>
    </>
  )
}

// Game loading skeleton (used for lazy-loaded game components)
export function GameLoadingSkeleton() {
  return (
    <>
      <style>{skeletonStyles}</style>
      <div style={{
        width: '100%', height: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 20,
        background: '#07071a',
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: 24,
          background: 'rgba(162,155,254,0.08)',
          border: '2px solid rgba(162,155,254,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', overflow: 'hidden',
        }}>
          <div className="sk-pulse" style={{
            position: 'absolute', inset: 0, borderRadius: 24,
          }} />
          <div style={{ fontSize: 36, zIndex: 1 }}>🎮</div>
        </div>
        <div>
          <Bone w={140} h={16} mb={8} style={{ margin: '0 auto' }} />
          <Bone w={100} h={12} style={{ margin: '0 auto' }} />
        </div>
        {/* Loading bar */}
        <div style={{
          width: 200, height: 6, borderRadius: 100,
          background: 'rgba(255,255,255,0.06)', overflow: 'hidden',
        }}>
          <div style={{
            width: '40%', height: '100%', borderRadius: 100,
            background: 'linear-gradient(90deg, #A29BFE, #4ECDC4)',
            animation: 'sk-loadingBar 1.5s ease-in-out infinite alternate',
          }} />
        </div>
        <style>{`
          @keyframes sk-loadingBar {
            0%   { width: 20%; margin-left: 0; }
            100% { width: 40%; margin-left: 60%; }
          }
        `}</style>
      </div>
    </>
  )
}
