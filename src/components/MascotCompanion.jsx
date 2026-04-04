import { useState, useEffect, useRef, useCallback } from 'react'
import Mascot from './Mascot.jsx'
import { useSound } from '../hooks/useSound.js'
import { useThemeColors } from '../hooks/useThemeColors.js'
import gsap from 'gsap'

// ─── Dialog Database ──────────────────────────────────────────────────────────
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

const DIALOGS = {
  greet: [
    { text: 'Halo! Aku Brainy, companion-mu di BrainPlay! Klik tombol di bawah untuk ngobrol 🧠', actions: ['Siapa kamu?', 'Tips game', 'Mini-game'] },
    { text: 'Hai hai! Selamat datang kembali! Ada yang bisa aku bantu hari ini?', actions: ['Fun fact', 'Tips game', 'Mini-game'] },
    { text: 'Yo! Otakmu sudah siap diasah hari ini? Ayo mulai! 💪', actions: ['Cerita BrainPlay', 'Tips game', 'Fun fact'] },
  ],
  about: [
    { text: 'Aku Brainy! Otak digital yang doyan main game. Lahir di BrainPlay untuk nemenin kamu latih otak sambil having fun!', actions: ['Fitur favorit?', 'Fun fact', 'Kembali'], mood: 'shy' },
    { text: 'Nama lengkapku Brainy v2.0 — versi upgrade dengan banyak ekspresi baru! Kamu bisa ganti skin & topi aku di Shop lho.', actions: ['Game favorit?', 'Fun fact', 'Kembali'], mood: 'wink' },
  ],
  tips: [
    { text: '💡 Di Memory Card, mulai dari pojok! Otak lebih gampang ingat posisi berdasarkan lokasi spatial.', actions: ['Tips lagi', 'Mini-game', 'Kembali'], mood: 'think' },
    { text: '💡 Di Sudoku, cari baris yang sudah hampir penuh dulu. Eliminasi itu senjata utama!', actions: ['Tips lagi', 'Fun fact', 'Kembali'], mood: 'happy' },
    { text: '💡 Spin Lucky Wheel setiap minggu! 5× spin berturut = peluang Legendary naik!', actions: ['Tips lagi', 'Mini-game', 'Kembali'], mood: 'excited' },
    { text: '💡 Neon Dash butuh refleks cepat. Fokus ke 2 obstacle depan aja, jangan lihat terlalu jauh!', actions: ['Tips lagi', 'Fun fact', 'Kembali'], mood: 'happy' },
    { text: '💡 Di Wordle, mulai dengan kata yang punya banyak vokal — misalnya "AUDIO" atau "SUARA".', actions: ['Tips lagi', 'Mini-game', 'Kembali'], mood: 'think' },
    { text: '💡 Brick Breaker: tahan bola di atas paddle sedikit lama biar arahnya lebih terkontrol!', actions: ['Tips lagi', 'Fun fact', 'Kembali'], mood: 'happy' },
  ],
  funfact: [
    { text: '🤓 Otak manusia bisa memproses gambar dalam 13 milidetik! Makanya Reaction Test di BrainPlay seru banget.', actions: ['Lagi dong!', 'Tips game', 'Kembali'], mood: 'excited' },
    { text: '🤓 Main puzzle secara rutin bisa meningkatkan daya ingat sampai 20%! BrainPlay = gym untuk otak.', actions: ['Lagi dong!', 'Tips game', 'Kembali'], mood: 'excited' },
    { text: '🤓 Otak kamu menggunakan 20% dari total energi tubuh — padahal beratnya cuma 2%!', actions: ['Lagi dong!', 'Fun fact', 'Kembali'], mood: 'surprised' },
    { text: '🤓 Neuron di otak bisa mengirim sinyal dengan kecepatan 432 km/jam. Lebih cepat dari mobil F1!', actions: ['Lagi dong!', 'Tips game', 'Kembali'], mood: 'excited' },
    { text: '🤓 BrainPlay punya 22+ game dan tiap game dibuat dalam 1 file! Modular banget.', actions: ['Lagi dong!', 'Cerita BrainPlay', 'Kembali'], mood: 'wink' },
    { text: '🤓 Tertawa bisa meningkatkan kemampuan berpikir kreatif sampai 10%. Jadi ketawa dulu sebelum main!', actions: ['Lagi dong!', 'Tips game', 'Kembali'], mood: 'happy' },
  ],
  brainplay: [
    { text: 'BrainPlay itu platform 25 game brain training + casual gaming. Ada XP system, coin economy, Lucky Wheel, leaderboard, dan banyak cosmetics!', actions: ['Fitur favorit?', 'Game favorit?', 'Kembali'], mood: 'excited' },
  ],
  favFeature: [
    { text: 'Lucky Wheel dong! Spin 5× berturut, ada Legendary item 1% chance. Deg-degan tapi bikin ketagihan! 🎰', actions: ['Fun fact', 'Tips game', 'Kembali'], mood: 'excited' },
    { text: 'Daily Challenges! 3 misi baru tiap hari bikin aku selalu semangat balik. Bonus XP-nya mantap! 🎯', actions: ['Fun fact', 'Tips game', 'Kembali'], mood: 'happy' },
    { text: 'Battle Pass Season! Grind tier demi tier buat unlock hadiah keren. Aku suka banget progression-nya!', actions: ['Tips game', 'Fun fact', 'Kembali'], mood: 'excited' },
  ],
  favGame: [
    { text: 'Space Shooter! 6 ship, boss fight, combo system — serunya luar biasa 🚀', actions: ['Tips game', 'Fun fact', 'Kembali'], mood: 'excited' },
    { text: 'Slither Worm! Ada 15 smart bots, minimap, dan collision realistis. Seru ngalahin mereka! 🐍', actions: ['Tips game', 'Fun fact', 'Kembali'], mood: 'smug' },
    { text: 'Letter Tiles! Susun huruf jadi kata Indonesia. Simple tapi nagih banget!', actions: ['Tips game', 'Fun fact', 'Kembali'], mood: 'happy' },
  ],
  poke: [
    { text: 'Hehe geli! Jangan pencet-pencet terus dong! 😆', actions: ['Maaf hehe', 'Mini-game', 'Fun fact'], mood: 'surprised' },
    { text: 'Waduh! Kamu suka banget pencet aku ya 😂', actions: ['Iya dong!', 'Tips game', 'Mini-game'], mood: 'shy' },
    { text: 'Oiii santai! Aku bukan tombol! Tapi oke, mau ngapain?', actions: ['Fun fact', 'Mini-game', 'Kembali'], mood: 'smug' },
  ],
  tictactoe: [
    { text: '🎮 Mini TicTacToe! Kamu ❌, aku ⭕. Tap kotak untuk main!', actions: ['Reset', 'Kembali'], mood: 'excited' },
  ],
  win:  [{ text: 'GG! Kamu menang! Otakmu emang encer! 🏆🎉', actions: ['Main lagi', 'Fun fact', 'Kembali'], mood: 'surprised' }],
  lose: [{ text: 'Haha aku menang! Jangan sedih, latihan terus ya! 😎', actions: ['Main lagi', 'Tips game', 'Kembali'], mood: 'smug' }],
  draw: [{ text: 'Seri! Kita sama-sama pinter nih! 🤝', actions: ['Main lagi', 'Fun fact', 'Kembali'], mood: 'happy' }],
  sorry:   [{ text: 'Gapapa kok! Aku seneng kamu mau main sama aku 💚', actions: ['Tips game', 'Fun fact', 'Mini-game'], mood: 'shy' }],
  yes:     [{ text: 'Makasih! Kamu emang yang paling seru diajak ngobrol!', actions: ['Fun fact', 'Tips game', 'Mini-game'], mood: 'excited' }],
  idle: [
    { text: 'Psst! Klik aku kalau mau tips atau main mini-game! 👆', actions: ['Tips game', 'Mini-game', 'Fun fact'], mood: 'wink' },
    { text: 'Jangan lupa klaim Daily Challenge hari ini ya! ⚔️', actions: ['Tips game', 'Fun fact', 'Kembali'], mood: 'happy' },
    { text: 'Aku bosen nih.. ajak aku ngobrol dong! 🥺', actions: ['Fun fact', 'Mini-game', 'Kembali'], mood: 'sad' },
  ],
}

// Scroll-aware section reactions
const SECTION_REACTIONS = {
  games:    { text: 'Wah, koleksi game-nya! Mana yang mau kamu coba duluan? 🎮', mood: 'excited' },
  features: { text: 'Fitur BrainPlay lengkap banget! XP, coins, leaderboard — semuanya ada!', mood: 'happy' },
  updates:  { text: 'Update terbaru nih! Animasi makin smooth! ✨', mood: 'excited' },
  roadmap:  { text: 'Exciting stuff yang bakal dateng! Stay tuned! 🚀', mood: 'happy' },
}

// ─── TicTacToe Logic ──────────────────────────────────────────────────────────
const WIN_COMBOS = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]
function checkWin(b, p) { return WIN_COMBOS.find(c => c.every(i => b[i] === p)) }
function checkDraw(b) { return b.every(c => c !== '') }

function aiMove(board) {
  // Try win → block → center → random
  for (let i = 0; i < 9; i++) { if (!board[i]) { board[i] = 'O'; if (checkWin(board, 'O')) { board[i] = ''; return i } board[i] = '' } }
  for (let i = 0; i < 9; i++) { if (!board[i]) { board[i] = 'X'; if (checkWin(board, 'X')) { board[i] = ''; return i } board[i] = '' } }
  if (!board[4]) return 4
  const empty = board.map((c, i) => c === '' ? i : -1).filter(i => i !== -1)
  return empty[Math.floor(Math.random() * empty.length)]
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function MascotCompanion({
  mascotName = 'Brainy',
  skin = 'neon-blue',
  hat = null,
  level = 1,
  style: containerStyle = {},
  observeSections = [],     // array of { id: string, ref: RefObject }
  floating = false,
}) {
  const { play } = useSound()
  const tc = useThemeColors()
  const dark = tc.dark

  const [bubbleOpen, setBubbleOpen] = useState(false)
  const [bubbleText, setBubbleText] = useState('')
  const [bubbleActions, setBubbleActions] = useState([])
  const [expression, setExpression] = useState('happy')
  const [typing, setTyping] = useState(false)
  const [moodEmoji, setMoodEmoji] = useState(null)
  const [clickCount, setClickCount] = useState(0)

  // TicTacToe state
  const [board, setBoard] = useState(Array(9).fill(''))
  const [gameActive, setGameActive] = useState(false)
  const [playerTurn, setPlayerTurn] = useState(true)
  const [winCombo, setWinCombo] = useState(null)
  const [gameResult, setGameResult] = useState(null) // 'win'|'lose'|'draw'|null

  const bubbleRef = useRef(null)
  const autoHideTimer = useRef(null)
  const idleCounter = useRef(0)
  const lastSection = useRef('')
  const mascotRootRef = useRef(null)

  // ─── Palette ───
  const S = {
    surface: dark ? '#1A1F35' : '#FFFFFF',
    surfaceDeep: dark ? '#0D1022' : '#F8F9FC',
    border: dark ? '#252B45' : '#E8ECF4',
    text: dark ? '#E2E8F0' : '#2D3436',
    muted: dark ? '#475569' : '#636E72',
    accent: '#7C6FE8',
    accentFill: dark ? 'rgba(124,111,232,0.14)' : 'rgba(108,92,231,0.07)',
    accentBorder: dark ? 'rgba(124,111,232,0.35)' : 'rgba(108,92,231,0.25)',
  }

  // ─── Show bubble with typing effect ───
  const showDialog = useCallback((dialog, overrideMood) => {
    clearTimeout(autoHideTimer.current)
    setTyping(true)
    setBubbleOpen(true)
    setBubbleActions([])
    setExpression(overrideMood || dialog.mood || 'happy')

    setTimeout(() => {
      setTyping(false)
      setBubbleText(dialog.text)
      setBubbleActions(dialog.actions || [])
      // Auto-hide after 20s
      autoHideTimer.current = setTimeout(() => closeBubble(), 20000)
    }, 500 + Math.random() * 300)
  }, [])

  const closeBubble = useCallback(() => {
    setBubbleOpen(false)
    setGameActive(false)
    setGameResult(null)
    setWinCombo(null)
    setBoard(Array(9).fill(''))
    setPlayerTurn(true)
    setBubbleText('')
    setBubbleActions([])
    setTimeout(() => setExpression('happy'), 300)
  }, [])

  // ─── Show mood emoji floating ───
  const flashMood = (emoji) => {
    setMoodEmoji(emoji)
    setTimeout(() => setMoodEmoji(null), 1600)
  }

  // ─── Mascot body animation via GSAP ───
  const animateMascot = useCallback((type) => {
    const root = mascotRootRef.current
    if (!root) return
    const svg = root.querySelector('svg')
    if (!svg) return
    const body = svg.querySelector('g')
    if (!body) return

    switch (type) {
      case 'jump':
        gsap.timeline()
          .to(body, { y: -20, scaleX: 0.92, scaleY: 1.1, duration: 0.2, ease: 'power2.out' })
          .to(body, { y: 0, scaleX: 1, scaleY: 1, duration: 0.4, ease: 'bounce.out' })
        break
      case 'wiggle':
        gsap.to(body, { rotation: 8, duration: 0.08, repeat: 5, yoyo: true, ease: 'none', onComplete: () => gsap.set(body, { rotation: 0 }) })
        break
      case 'excited':
        gsap.to(body, { scale: 1.15, duration: 0.15, repeat: 3, yoyo: true, ease: 'power1.inOut' })
        break
      case 'nod':
        gsap.to(body, { y: 4, duration: 0.15, repeat: 2, yoyo: true })
        break
      default: break
    }
  }, [])

  // ─── Action handler ───
  const handleAction = useCallback((action) => {
    play('click')
    idleCounter.current = 0

    const map = {
      'Siapa kamu?':     () => { showDialog(pick(DIALOGS.about)); animateMascot('wiggle'); flashMood('😊') },
      'Tips game':       () => { showDialog(pick(DIALOGS.tips)); animateMascot('jump'); flashMood('💡') },
      'Tips lagi':       () => { showDialog(pick(DIALOGS.tips)); animateMascot('nod'); flashMood('💡') },
      'Fun fact':        () => { showDialog(pick(DIALOGS.funfact)); animateMascot('excited'); flashMood('🤓') },
      'Lagi dong!':      () => { showDialog(pick(DIALOGS.funfact)); animateMascot('jump'); flashMood('🧠') },
      'Cerita BrainPlay':() => { showDialog(pick(DIALOGS.brainplay)); animateMascot('nod'); flashMood('🎮') },
      'Fitur favorit?':  () => { showDialog(pick(DIALOGS.favFeature)); animateMascot('excited'); flashMood('⭐') },
      'Game favorit?':   () => { showDialog(pick(DIALOGS.favGame)); animateMascot('jump'); flashMood('🚀') },
      'Mini-game':       () => startTicTacToe(),
      'Main lagi':       () => startTicTacToe(),
      'Reset':           () => startTicTacToe(),
      'Kembali':         () => { showDialog(pick(DIALOGS.greet)); animateMascot('nod') },
      'Maaf hehe':       () => { showDialog(pick(DIALOGS.sorry)); animateMascot('wiggle'); flashMood('💚') },
      'Iya dong!':       () => { showDialog(pick(DIALOGS.yes)); animateMascot('excited'); flashMood('💚') },
    }

    const fn = map[action]
    if (fn) fn()
    else { showDialog(pick(DIALOGS.greet)); animateMascot('nod') }
  }, [showDialog, animateMascot, play])

  // ─── Mascot tap ───
  const onMascotTap = useCallback(() => {
    play('click')
    idleCounter.current = 0
    setClickCount(c => c + 1)

    if (clickCount > 4 && clickCount % 3 === 0) {
      showDialog(pick(DIALOGS.poke))
      animateMascot('wiggle')
      flashMood('😆')
    } else if (!bubbleOpen) {
      showDialog(pick(DIALOGS.greet))
      animateMascot('jump')
      flashMood('👋')
    } else {
      closeBubble()
    }
  }, [clickCount, bubbleOpen, showDialog, animateMascot, closeBubble, play])

  // ─── TicTacToe ───
  const startTicTacToe = useCallback(() => {
    setBoard(Array(9).fill(''))
    setGameActive(true)
    setPlayerTurn(true)
    setWinCombo(null)
    setGameResult(null)
    const d = pick(DIALOGS.tictactoe)
    showDialog(d, 'excited')
    animateMascot('jump')
    flashMood('🎮')
  }, [showDialog, animateMascot])

  const playerMove = useCallback((i) => {
    if (!gameActive || !playerTurn || board[i]) return
    play('click')
    const newBoard = [...board]
    newBoard[i] = 'X'
    setBoard(newBoard)
    setPlayerTurn(false)

    const w = checkWin(newBoard, 'X')
    if (w) {
      setWinCombo(w); setGameActive(false); setGameResult('win')
      setTimeout(() => { showDialog(pick(DIALOGS.win)); animateMascot('excited'); flashMood('🏆') }, 600)
      return
    }
    if (checkDraw(newBoard)) {
      setGameActive(false); setGameResult('draw')
      setTimeout(() => { showDialog(pick(DIALOGS.draw)); animateMascot('nod'); flashMood('🤝') }, 600)
      return
    }

    // AI move after delay
    setTimeout(() => {
      const move = aiMove([...newBoard])
      if (move === undefined) return
      newBoard[move] = 'O'
      setBoard([...newBoard])

      const w2 = checkWin(newBoard, 'O')
      if (w2) {
        setWinCombo(w2); setGameActive(false); setGameResult('lose')
        setTimeout(() => { showDialog(pick(DIALOGS.lose)); animateMascot('wiggle'); flashMood('😎') }, 600)
        return
      }
      if (checkDraw(newBoard)) {
        setGameActive(false); setGameResult('draw')
        setTimeout(() => { showDialog(pick(DIALOGS.draw)); animateMascot('nod'); flashMood('🤝') }, 600)
        return
      }
      setPlayerTurn(true)
    }, 400)
  }, [board, gameActive, playerTurn, play, showDialog, animateMascot])

  // ─── Idle behavior (disabled in floating mode) ───
  useEffect(() => {
    if (floating) return // Don't auto-open chat in floating mode
    const timer = setInterval(() => {
      idleCounter.current++
      if (idleCounter.current > 6 && !bubbleOpen) {
        const r = Math.random()
        if (r < 0.4) {
          showDialog(pick(DIALOGS.idle))
          animateMascot('jump')
          flashMood('💬')
        } else if (r < 0.6) {
          setExpression('sleep')
          flashMood('💤')
          setTimeout(() => { if (!bubbleOpen) setExpression('happy') }, 4000)
        }
        idleCounter.current = 0
      }
    }, 5000)
    return () => clearInterval(timer)
  }, [floating, bubbleOpen, showDialog, animateMascot])

  // ─── Scroll section observer ───
  useEffect(() => {
    if (!observeSections.length) return
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting && e.target.id && e.target.id !== lastSection.current) {
          lastSection.current = e.target.id
          const reaction = SECTION_REACTIONS[e.target.id]
          if (reaction && !bubbleOpen) {
            flashMood('👀')
            setTimeout(() => {
              showDialog({ text: reaction.text, mood: reaction.mood, actions: ['Keren!', 'Tips game', 'Kembali'] })
              animateMascot('nod')
            }, 600)
          }
        }
      })
    }, { threshold: 0.35 })

    observeSections.forEach(s => {
      const el = s.ref?.current || document.getElementById(s.id)
      if (el) obs.observe(el)
    })
    return () => obs.disconnect()
  }, [observeSections, bubbleOpen, showDialog, animateMascot])

  // ─── Auto-greet on mount (disabled in floating mode) ───
  useEffect(() => {
    if (floating) return // Floating mascot stays quiet until clicked
    const t = setTimeout(() => {
      showDialog(pick(DIALOGS.greet), 'excited')
      animateMascot('jump')
      flashMood('👋')
    }, 2500)
    return () => clearTimeout(t)
  }, [floating])

  // ─── Render ───
  const bubbleBg = dark ? 'rgba(26,31,53,0.95)' : 'rgba(255,255,255,0.95)'
  const bubbleBorder = dark ? S.border : '#E8ECF4'

  return (
    <div style={{
      display: 'flex', flexDirection: 'column-reverse', alignItems: 'flex-end', gap: 12,
      position: floating ? 'fixed' : 'relative',
      bottom: floating ? 88 : 'auto',
      right: floating ? 24 : 'auto',
      zIndex: floating ? 2000 : 1,
      pointerEvents: 'none', // Allow clicking through the container
      ...containerStyle,
    }}>
      {/* Mascot Avatar */}
      <div style={{ flexShrink: 0, position: 'relative', pointerEvents: 'auto' }} ref={mascotRootRef}>
        <Mascot
          skin={skin}
          hat={hat}
          size={floating ? 64 : 80}
          expression={expression}
          trackEyes={true}
          interactive={true}
          onTap={onMascotTap}
        />
        {/* Mood emoji float */}
        {moodEmoji && (
          <div style={{
            position: 'absolute', top: -10, right: -6, fontSize: 18,
            animation: 'mc-mood-pop 0.4s cubic-bezier(.16,1,.3,1)',
            pointerEvents: 'none',
          }}>
            {moodEmoji}
          </div>
        )}
      </div>

      {/* Bubble + content — hidden when closed */}
      {bubbleOpen && (
      <div style={{
        width: '100%', maxWidth: '280px', pointerEvents: 'auto',
        animation: 'mc-bubble-in 0.35s cubic-bezier(.16,1,.3,1)',
      }}>
        {/* Name + level */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 900, color: S.accent, letterSpacing: 0.5 }}>
            {mascotName}
          </span>
          <span style={{
            background: S.accent, color: '#FFFFFF', fontSize: 10,
            fontWeight: 800, padding: '2px 10px', borderRadius: 8,
            boxShadow: `0 2px 10px ${S.accent}44`,
            fontFamily: "'Fredoka One',cursive",
          }}>
            Lvl.{level}
          </span>
        </div>

        {/* Speech bubble */}
        <div
          ref={bubbleRef}
          style={{
            position: 'relative',
            background: bubbleBg,
            backdropFilter: 'blur(12px)',
            border: `1.5px solid ${bubbleBorder}`,
            borderRadius: 24,
            padding: '14px 18px 2px',
            fontSize: 14, color: S.text, lineHeight: 1.55, fontWeight: 600,
            display: 'flex', flexDirection: 'column',
            maxHeight: 400,
            overflow: 'hidden',
          }}
        >
          {/* Content Scroll Area */}
          <div style={{ 
            flex: 1, 
            overflowY: bubbleOpen ? 'auto' : 'hidden', 
            paddingBottom: bubbleOpen ? 28 : 0,
            display: 'flex', flexDirection: 'column'
          }}>
            {/* Bubble tail */}
            <div style={{
              position: 'absolute', bottom: -10, left: '50%',
              transform: 'translateX(-50%)',
              width: 0, height: 0,
              borderLeft: '10px solid transparent',
              borderRight: '10px solid transparent',
              borderTop: `10px solid ${bubbleBg}`,
            }} />

            {/* Main Content */}
          {typing ? (
            <div style={{ display: 'flex', gap: 5, alignItems: 'center', height: 24 }}>
              {[0,1,2].map(i => (
                <div key={i} style={{
                  width: 7, height: 7, borderRadius: '50%', background: S.accent,
                  animation: `mc-typing-dot 1.2s ease-in-out ${i * 0.15}s infinite`,
                }} />
              ))}
            </div>
          ) : (
            <>
              <div dangerouslySetInnerHTML={{ __html: bubbleText || 'Klik aku untuk ngobrol! 👋' }} />

              {/* TicTacToe board */}
              {gameActive || gameResult ? (
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
                  gap: 5, marginTop: 12,
                }}>
                  {board.map((cell, i) => {
                    const isWin = winCombo?.includes(i)
                    return (
                      <button
                        key={i}
                        onClick={() => playerMove(i)}
                        disabled={!!cell || !gameActive || !playerTurn}
                        style={{
                          width: 42, height: 42, borderRadius: 10,
                          border: `1.5px solid ${isWin ? (gameResult === 'win' ? '#34D399' : '#FF6B6B') : S.border}`,
                          background: isWin
                            ? (gameResult === 'win' ? 'rgba(52,211,153,0.15)' : 'rgba(255,107,107,0.15)')
                            : (dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'),
                          color: cell === 'X' ? S.accent : '#FF6B6B',
                          fontSize: 18, fontWeight: 900,
                          cursor: (!cell && gameActive && playerTurn) ? 'pointer' : 'default',
                          transition: 'all 0.15s',
                          fontFamily: "'Fredoka One',cursive",
                        }}
                      >
                        {cell}
                      </button>
                    )
                  })}
                </div>
              ) : null}

              {/* Action buttons */}
              {bubbleActions.length > 0 && (
                <div style={{ display: 'flex', gap: 6, marginTop: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                  {bubbleActions.map(action => (
                    <button
                      key={action}
                      onClick={() => handleAction(action)}
                      style={{
                        background: S.accentFill,
                        border: `1px solid ${S.accentBorder}`,
                        color: S.accent, padding: '6px 14px', borderRadius: 100,
                        fontSize: 11, fontWeight: 700, cursor: 'pointer',
                        fontFamily: "'Nunito',sans-serif",
                        transition: 'all 0.2s',
                        whiteSpace: 'normal',
                        textAlign: 'center',
                        lineHeight: '1.2',
                        minWidth: '60px',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = S.accent; e.currentTarget.style.color = '#fff' }}
                      onMouseLeave={e => { e.currentTarget.style.background = S.accentFill; e.currentTarget.style.color = S.accent }}
                    >
                      {action}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
          </div>
        </div>
      </div>
      )}

      {/* Inline keyframes */}
      <style>{`
        @keyframes mc-mood-pop {
          0% { transform: scale(0) translateY(0); opacity: 0; }
          50% { transform: scale(1.3) translateY(-8px); opacity: 1; }
          100% { transform: scale(1) translateY(-4px); opacity: 1; }
        }
        @keyframes mc-typing-dot {
          0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
          30% { opacity: 1; transform: translateY(-5px); }
        }
        @keyframes mc-bubble-in {
          0% { opacity: 0; transform: translateY(10px) scale(0.92); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}
