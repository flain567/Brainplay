// ─── Anagram Crossword Level Database ─────────────────────────────────────────
// Words of Wonders style — 50 levels across 5 chapters
//
// Data format per level:
//   letters:    array of characters on the wheel (may contain duplicates)
//   words:      target words that must be found to complete the level
//     - word:   the word string
//     - dir:    'H' (horizontal) or 'V' (vertical)
//     - r, c:   starting row and column on the grid
//   extraWords: valid words from the same letters that give bonus coins
//
// Intersection rule: if two words share a cell (r,c), both must have
// the same letter at that position.
// ──────────────────────────────────────────────────────────────────────────────

export const CHAPTERS = [
  // ═══════════════════════════════════════════════════════════════════════════
  // CHAPTER 1: HUTAN KATA — The Forest of Words
  // Theme: Growth, beginning of the word journey
  // Art: Deep forest greens, leaf patterns, organic feel
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'hutan',
    name: 'Hutan Kata',
    emoji: '🌿',
    description: 'Mulai petualangan di hutan penuh kata tersembunyi.',
    theme: {
      gradient: 'linear-gradient(135deg, #0D4A2E 0%, #1B8C5A 100%)',
      accent: '#00E88F',
      accentDark: '#0D4A2E',
      surface: '#12523A',
      textOnBg: '#B8F0D6',
      cardBg: 'rgba(0,232,143,0.08)',
      pathColor: '#1B6B4B',
      bgScene: 'linear-gradient(180deg, #0a3d1f 0%, #145a35 20%, #1e8a52 45%, #2db86a 65%, #68d99b 80%, #a8e6c3 92%, #d4f5e2 100%)',
      bgOverlay: 'radial-gradient(ellipse at 30% 20%, rgba(30,180,90,0.25) 0%, transparent 60%)',
      tileColor: '#1B8C5A',
      tileBorder: '#00E88F',
      tileText: '#FFFFFF',
      wheelBg: 'radial-gradient(circle, #0f4a2e 0%, #0a3520 60%, #072818 100%)',
      wheelBorder: '#1B6B4B',
    },
    levels: [
      // L1: AKU + KAU — Int K@(0,1)
      {
        letters: ['A','K','U'],
        words: [
          { word:'AKU', dir:'H', r:0, c:0 },
          { word:'KAU', dir:'V', r:0, c:1 },
        ],
        extraWords: ['KUA'],
      },
      // L2: API + IPA — Int I@(0,2)
      {
        letters: ['A','P','I'],
        words: [
          { word:'API', dir:'H', r:0, c:0 },
          { word:'IPA', dir:'V', r:0, c:2 },
        ],
        extraWords: ['PA'],
      },
      // L3: IBU + UBI — Int U@(0,2)
      {
        letters: ['I','B','U'],
        words: [
          { word:'IBU', dir:'H', r:0, c:0 },
          { word:'UBI', dir:'V', r:0, c:2 },
        ],
        extraWords: [],
      },
      // L4: AIR + RIA — Int R@(0,2)
      {
        letters: ['A','I','R'],
        words: [
          { word:'AIR', dir:'H', r:0, c:0 },
          { word:'RIA', dir:'V', r:0, c:2 },
        ],
        extraWords: [],
      },
      // L5: DUA + ADU — Int A@(0,2)
      {
        letters: ['D','U','A'],
        words: [
          { word:'DUA', dir:'H', r:0, c:0 },
          { word:'ADU', dir:'V', r:0, c:2 },
        ],
        extraWords: [],
      },
      // L6: BATU + TUBA — Int T@(0,2)
      {
        letters: ['B','A','T','U'],
        words: [
          { word:'BATU', dir:'H', r:0, c:0 },
          { word:'TUBA', dir:'V', r:0, c:2 },
        ],
        extraWords: ['TAU','TUA','BUT'],
      },
      // L7: LAMA + ALAM — Int A@(0,3)
      {
        letters: ['L','A','M','A'],
        words: [
          { word:'LAMA', dir:'H', r:0, c:0 },
          { word:'ALAM', dir:'V', r:0, c:3 },
        ],
        extraWords: ['MAL'],
      },
      // L8: RAJA + AJAR — Int A@(0,3)
      {
        letters: ['R','A','J','A'],
        words: [
          { word:'RAJA', dir:'H', r:0, c:0 },
          { word:'AJAR', dir:'V', r:0, c:3 },
        ],
        extraWords: [],
      },
      // L9: GULA + LAGU — Int L@(0,2)
      {
        letters: ['G','U','L','A'],
        words: [
          { word:'GULA', dir:'H', r:0, c:0 },
          { word:'LAGU', dir:'V', r:0, c:2 },
        ],
        extraWords: [],
      },
      // L10: ATUR + RATU + TUA — Int R@(1,3), T@(1,1)
      {
        letters: ['A','T','U','R'],
        words: [
          { word:'ATUR', dir:'H', r:1, c:0 },
          { word:'RATU', dir:'V', r:1, c:3 },
          { word:'TUA',  dir:'V', r:1, c:1 },
        ],
        extraWords: ['RAUT','TAU'],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CHAPTER 2: PANTAI BAHASA — The Language Beach
  // Theme: Exploration, expanding horizons
  // Art: Ocean blues, sand yellows, tropical vibes
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'pantai',
    name: 'Pantai Bahasa',
    emoji: '🏖️',
    description: 'Jelajahi pantai indah sambil menyusun kata.',
    theme: {
      gradient: 'linear-gradient(135deg, #006994 0%, #48CAE4 100%)',
      accent: '#F4D35E',
      accentDark: '#005577',
      surface: '#0A7EA8',
      textOnBg: '#E0F7FA',
      cardBg: 'rgba(244,211,94,0.08)',
      pathColor: '#0891B2',
      bgScene: 'linear-gradient(180deg, #003d5c 0%, #006994 15%, #0891b2 30%, #48CAE4 50%, #7dd3e8 65%, #b8e8f0 78%, #e0c97a 85%, #d4a843 92%, #c4974a 100%)',
      bgOverlay: 'radial-gradient(ellipse at 70% 15%, rgba(255,230,120,0.2) 0%, transparent 50%)',
      tileColor: '#0078A8',
      tileBorder: '#F4D35E',
      tileText: '#FFFFFF',
      wheelBg: 'radial-gradient(circle, #004d6e 0%, #003552 60%, #002540 100%)',
      wheelBorder: '#0891B2',
    },
    levels: [
      // L11: KASUR + RUSAK + RUSA — Int S@(2,2), U@(2,3)
      {
        letters: ['K','A','S','U','R'],
        words: [
          { word:'KASUR', dir:'H', r:2, c:0 },
          { word:'RUSAK', dir:'V', r:0, c:2 },
          { word:'RUSA',  dir:'V', r:1, c:3 },
        ],
        extraWords: ['KAS','KAU'],
      },
      // L12: MAKAN + ANAK + NAMA — Int A@(0,3), N@(0,4)
      {
        letters: ['M','A','K','A','N'],
        words: [
          { word:'MAKAN', dir:'H', r:0, c:0 },
          { word:'ANAK',  dir:'V', r:0, c:3 },
          { word:'NAMA',  dir:'V', r:0, c:4 },
        ],
        extraWords: ['MAKA','AMAN','MANA'],
      },
      // L13: BUNGA + UANG + GUNA — Int U@(0,1), G@(0,3)
      {
        letters: ['B','U','N','G','A'],
        words: [
          { word:'BUNGA', dir:'H', r:0, c:0 },
          { word:'UANG',  dir:'V', r:0, c:1 },
          { word:'GUNA',  dir:'V', r:0, c:3 },
        ],
        extraWords: ['BAU','BAN','BUNG','GUA'],
      },
      // L14: PINTU + TIPU + UNIT — Int T@(0,3), U@(0,4)
      {
        letters: ['P','I','N','T','U'],
        words: [
          { word:'PINTU', dir:'H', r:0, c:0 },
          { word:'TIPU',  dir:'V', r:0, c:3 },
          { word:'UNIT',  dir:'V', r:0, c:4 },
        ],
        extraWords: ['PIN','TIP'],
      },
      // L15: DUNIA + DAUN + UNDI — Int D@(2,0), U@(2,1)
      {
        letters: ['D','U','N','I','A'],
        words: [
          { word:'DUNIA', dir:'H', r:2, c:0 },
          { word:'DAUN',  dir:'V', r:2, c:0 },
          { word:'UNDI',  dir:'V', r:2, c:1 },
        ],
        extraWords: ['DUA','UNI','ADI'],
      },
      // L16: SURAT + RATUS + URAT — Int T@(2,4), U@(2,1)
      {
        letters: ['S','U','R','A','T'],
        words: [
          { word:'SURAT', dir:'H', r:2, c:0 },
          { word:'RATUS', dir:'V', r:0, c:4 },
          { word:'URAT',  dir:'V', r:2, c:1 },
        ],
        extraWords: ['RATU','TUA'],
      },
      // L17: TAMAN + MANA + AMAN — Int M@(0,2), A@(0,3)
      {
        letters: ['T','A','M','A','N'],
        words: [
          { word:'TAMAN', dir:'H', r:0, c:0 },
          { word:'MANA',  dir:'V', r:0, c:2 },
          { word:'AMAN',  dir:'V', r:0, c:3 },
        ],
        extraWords: ['MATA'],
      },
      // L18: KAMUS + MUKA + SAKU — Int M@(0,2), S@(0,4)
      {
        letters: ['K','A','M','U','S'],
        words: [
          { word:'KAMUS', dir:'H', r:0, c:0 },
          { word:'MUKA',  dir:'V', r:0, c:2 },
          { word:'SAKU',  dir:'V', r:0, c:4 },
        ],
        extraWords: ['MAS','KAU','AKU'],
      },
      // L19: TIKUS + SIKU + KUIS — Int S@(0,4), K@(0,2)
      {
        letters: ['T','I','K','U','S'],
        words: [
          { word:'TIKUS', dir:'H', r:0, c:0 },
          { word:'SIKU',  dir:'V', r:0, c:4 },
          { word:'KUIS',  dir:'V', r:0, c:2 },
        ],
        extraWords: ['SITU'],
      },
      // L20: TUKAR + KARTU + RATU + ATUR — Int K@(2,2), R@(2,4), A@(2,3)
      {
        letters: ['T','U','K','A','R'],
        words: [
          { word:'TUKAR', dir:'H', r:2, c:0 },
          { word:'KARTU', dir:'V', r:2, c:2 },
          { word:'RATU',  dir:'V', r:2, c:4 },
          { word:'ATUR',  dir:'V', r:2, c:3 },
        ],
        extraWords: ['RAUT','TUA','TAK'],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CHAPTER 3: PUNCAK PIKIRAN — The Mind Summit
  // Theme: Rising challenge, elevation of the mind
  // Art: Mountain purples, snow sparkle, ethereal glow
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'puncak',
    name: 'Puncak Pikiran',
    emoji: '🏔️',
    description: 'Daki puncak tertinggi pengetahuan kata.',
    theme: {
      gradient: 'linear-gradient(135deg, #3A0CA3 0%, #7209B7 100%)',
      accent: '#C77DFF',
      accentDark: '#3A0CA3',
      surface: '#4A15C4',
      textOnBg: '#E8D5FF',
      cardBg: 'rgba(199,125,255,0.08)',
      pathColor: '#7B2FF7',
      bgScene: 'linear-gradient(180deg, #1a0533 0%, #2d0a55 15%, #4a1880 30%, #6b30a8 45%, #8b4ec8 55%, #a872d8 65%, #c4a0e8 75%, #d8c4f0 82%, #e8ddf5 90%, #cdc4d0 95%, #9a8fa0 100%)',
      bgOverlay: 'radial-gradient(ellipse at 50% 30%, rgba(199,125,255,0.2) 0%, transparent 55%)',
      tileColor: '#5A20B8',
      tileBorder: '#C77DFF',
      tileText: '#FFFFFF',
      wheelBg: 'radial-gradient(circle, #2d0a55 0%, #1f0740 60%, #140530 100%)',
      wheelBorder: '#5A20B8',
    },
    levels: [
      // L21: KERTAS + KERAS + SERAT + TERA
      {
        letters: ['K','E','R','T','A','S'],
        words: [
          { word:'KERTAS', dir:'H', r:2, c:0 },
          { word:'KERAS',  dir:'V', r:2, c:0 },
          { word:'SERAT',  dir:'V', r:2, c:5 },
          { word:'TERA',   dir:'V', r:2, c:3 },
        ],
        extraWords: ['KERA','RAK','TAS','ERA','SATE'],
      },
      // L22: BANGSA + ABANG + SANG + BASA
      {
        letters: ['B','A','N','G','S','A'],
        words: [
          { word:'BANGSA', dir:'H', r:2, c:0 },
          { word:'ABANG',  dir:'V', r:0, c:1 },
          { word:'SANG',   dir:'V', r:2, c:4 },
          { word:'BASA',   dir:'H', r:3, c:3 },
        ],
        extraWords: ['BAN','GAS'],
      },
      // L23: HARUM + MURAH + RUMAH
      {
        letters: ['H','A','R','U','M'],
        words: [
          { word:'HARUM', dir:'H', r:2, c:0 },
          { word:'MURAH', dir:'V', r:2, c:4 },
          { word:'RUMAH', dir:'V', r:2, c:2 },
        ],
        extraWords: ['RAMU','ARUM'],
      },
      // L24: PANTAI + NIAT + ANTI + PINTA
      {
        letters: ['P','A','N','T','A','I'],
        words: [
          { word:'PANTAI', dir:'H', r:2, c:0 },
          { word:'NIAT',   dir:'V', r:2, c:2 },
          { word:'ANTI',   dir:'V', r:2, c:4 },
          { word:'PINTA',  dir:'V', r:2, c:0 },
        ],
        extraWords: ['PITA','TANI','TAPI'],
      },
      // L25: BINTANG + NANTI + TIANG + GANTI
      {
        letters: ['B','I','N','T','A','N','G'],
        words: [
          { word:'BINTANG', dir:'H', r:2, c:0 },
          { word:'NANTI',   dir:'V', r:2, c:2 },
          { word:'TIANG',   dir:'V', r:2, c:3 },
          { word:'GANTI',   dir:'V', r:2, c:6 },
        ],
        extraWords: ['ANTI','BANG','TANG'],
      },
      // L26: KARENA + ARENA + KENA + ENAK
      {
        letters: ['K','A','R','E','N','A'],
        words: [
          { word:'KARENA', dir:'H', r:2, c:0 },
          { word:'ARENA',  dir:'V', r:2, c:1 },
          { word:'KENA',   dir:'V', r:2, c:0 },
          { word:'ENAK',   dir:'V', r:2, c:3 },
        ],
        extraWords: ['ERA'],
      },
      // L27: TULANG + ULANG + TUAN + GUNA
      {
        letters: ['T','U','L','A','N','G'],
        words: [
          { word:'TULANG', dir:'H', r:2, c:0 },
          { word:'ULANG',  dir:'V', r:2, c:1 },
          { word:'TUAN',   dir:'V', r:2, c:0 },
          { word:'GUNA',   dir:'V', r:2, c:5 },
        ],
        extraWords: ['UANG','TANG'],
      },
      // L28: PASANG + PANAS + SANG + ASA
      {
        letters: ['P','A','S','A','N','G'],
        words: [
          { word:'PASANG', dir:'H', r:2, c:0 },
          { word:'PANAS',  dir:'V', r:2, c:0 },
          { word:'SANG',   dir:'V', r:2, c:2 },
          { word:'ASA',    dir:'H', r:3, c:0 },
        ],
        extraWords: ['NAGA','SANA','PAS'],
      },
      // L29: SENANG + SEGAN + NENAS
      {
        letters: ['S','E','N','A','N','G'],
        words: [
          { word:'SENANG', dir:'H', r:2, c:0 },
          { word:'SEGAN',  dir:'V', r:2, c:0 },
          { word:'NENAS',  dir:'V', r:2, c:4 },
        ],
        extraWords: ['AGEN','SANG'],
      },
      // L30: MUDAH + MUDA + HUMA
      {
        letters: ['M','U','D','A','H'],
        words: [
          { word:'MUDAH', dir:'H', r:0, c:0 },
          { word:'MUDA',  dir:'V', r:0, c:0 },
          { word:'HUMA',  dir:'V', r:0, c:4 },
        ],
        extraWords: ['MAU'],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CHAPTER 4: KOTA AKSARA — The City of Letters
  // Theme: Civilization, complexity, sophistication
  // Art: Warm amber/orange, urban glow, geometric patterns
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'kota',
    name: 'Kota Aksara',
    emoji: '🏛️',
    description: 'Taklukkan kota penuh teka-teki aksara.',
    theme: {
      gradient: 'linear-gradient(135deg, #8B3A06 0%, #E36414 100%)',
      accent: '#FB8B24',
      accentDark: '#8B3A06',
      surface: '#A84E0C',
      textOnBg: '#FFE0C2',
      cardBg: 'rgba(251,139,36,0.08)',
      pathColor: '#D45A0A',
      bgScene: 'linear-gradient(180deg, #1a0800 0%, #3d1a06 10%, #6b3010 20%, #a04a15 32%, #d46a20 45%, #e88840 55%, #f0a060 65%, #f5c090 75%, #e8d0b0 82%, #d4c0a0 88%, #8a7560 95%, #5a4a3a 100%)',
      bgOverlay: 'radial-gradient(ellipse at 40% 25%, rgba(251,180,80,0.25) 0%, transparent 55%)',
      tileColor: '#B85A10',
      tileBorder: '#FB8B24',
      tileText: '#FFFFFF',
      wheelBg: 'radial-gradient(circle, #5a2a06 0%, #3d1a04 60%, #2a1003 100%)',
      wheelBorder: '#8B4A10',
    },
    levels: [
      // L31: PELAN + PANEL + LENA
      {
        letters: ['P','E','L','A','N'],
        words: [
          { word:'PELAN', dir:'H', r:2, c:0 },
          { word:'PANEL', dir:'V', r:2, c:0 },
          { word:'LENA',  dir:'V', r:2, c:2 },
        ],
        extraWords: ['PENA'],
      },
      // L32: SEMUA + EMAS + SEMU
      {
        letters: ['S','E','M','U','A'],
        words: [
          { word:'SEMUA', dir:'H', r:0, c:0 },
          { word:'EMAS',  dir:'V', r:0, c:1 },
          { word:'SEMU',  dir:'V', r:0, c:0 },
        ],
        extraWords: ['MAS','MAU'],
      },
      // L33: LEBAR + BELA + RELA
      {
        letters: ['L','E','B','A','R'],
        words: [
          { word:'LEBAR', dir:'H', r:2, c:0 },
          { word:'BELA',  dir:'V', r:2, c:2 },
          { word:'RELA',  dir:'V', r:2, c:4 },
        ],
        extraWords: ['ERA'],
      },
      // L34: SAYANG + SANG + YANG
      {
        letters: ['S','A','Y','A','N','G'],
        words: [
          { word:'SAYANG', dir:'H', r:2, c:0 },
          { word:'SANG',   dir:'V', r:2, c:0 },
          { word:'YANG',   dir:'V', r:2, c:2 },
        ],
        extraWords: ['NAGA','SANA'],
      },
      // L35: MALAM + LAMA + ALAM + MAL
      {
        letters: ['M','A','L','A','M'],
        words: [
          { word:'MALAM', dir:'H', r:2, c:0 },
          { word:'LAMA',  dir:'V', r:2, c:2 },
          { word:'ALAM',  dir:'V', r:2, c:1 },
          { word:'MAL',   dir:'V', r:2, c:4 },
        ],
        extraWords: ['MAMA'],
      },
      // L36: PERAHU + RUAH + UPAH + PURA
      {
        letters: ['P','E','R','A','H','U'],
        words: [
          { word:'PERAHU', dir:'H', r:2, c:0 },
          { word:'RUAH',   dir:'V', r:2, c:2 },
          { word:'UPAH',   dir:'V', r:2, c:5 },
          { word:'PURA',   dir:'V', r:2, c:0 },
        ],
        extraWords: ['URAP'],
      },
      // L37: MENARA + ARENA + NAMA + AMAN
      {
        letters: ['M','E','N','A','R','A'],
        words: [
          { word:'MENARA', dir:'H', r:2, c:0 },
          { word:'ARENA',  dir:'V', r:2, c:5 },
          { word:'NAMA',   dir:'V', r:2, c:2 },
          { word:'AMAN',   dir:'V', r:2, c:3 },
        ],
        extraWords: ['ERA','MANA'],
      },
      // L38: TERBANG + TERANG + BERANG
      {
        letters: ['T','E','R','B','A','N','G'],
        words: [
          { word:'TERBANG', dir:'H', r:3, c:0 },
          { word:'TERANG',  dir:'V', r:3, c:0 },
          { word:'BERANG',  dir:'V', r:3, c:3 },
        ],
        extraWords: ['BERAT','BANG','ERA','BAN'],
      },
      // L39: SELAMAT + SALAM + LEMAS + ATLAS + MALAS
      {
        letters: ['S','E','L','A','M','A','T'],
        words: [
          { word:'SELAMAT', dir:'H', r:3, c:0 },
          { word:'SALAM',   dir:'V', r:3, c:0 },
          { word:'LEMAS',   dir:'V', r:3, c:2 },
          { word:'ATLAS',   dir:'V', r:3, c:3 },
          { word:'MALAS',   dir:'V', r:3, c:4 },
        ],
        extraWords: ['METAL','MASA'],
      },
      // L40: MATAHARI + MATI + TARI + AMAT + HARI + RAHIM
      {
        letters: ['M','A','T','A','H','A','R','I'],
        words: [
          { word:'MATAHARI', dir:'H', r:3, c:0 },
          { word:'MATI',     dir:'V', r:3, c:0 },
          { word:'TARI',     dir:'V', r:3, c:2 },
          { word:'AMAT',     dir:'V', r:3, c:3 },
          { word:'HARI',     dir:'V', r:3, c:4 },
          { word:'RAHIM',    dir:'V', r:3, c:6 },
        ],
        extraWords: ['MAHIR','TIARA'],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CHAPTER 5: GALAKSI KATA — The Word Galaxy
  // Theme: Mastery, infinite possibilities
  // Art: Deep cosmic blacks/purples, gold star accents, iridescent glow
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'galaksi',
    name: 'Galaksi Kata',
    emoji: '🌌',
    description: 'Kuasai galaksi — batas akhir penguasaan kata.',
    theme: {
      gradient: 'linear-gradient(135deg, #10002B 0%, #240046 60%, #3C096C 100%)',
      accent: '#FFD700',
      accentDark: '#1A0036',
      surface: '#1E0042',
      textOnBg: '#E0C3FC',
      cardBg: 'rgba(255,215,0,0.06)',
      pathColor: '#5A189A',
      bgScene: 'linear-gradient(180deg, #05001a 0%, #0a0030 15%, #150050 30%, #220070 42%, #300090 52%, #3c00a0 60%, #2a0080 70%, #1a0060 80%, #100040 90%, #080020 100%)',
      bgOverlay: 'radial-gradient(ellipse at 50% 40%, rgba(255,215,0,0.12) 0%, transparent 50%), radial-gradient(circle at 20% 20%, rgba(200,150,255,0.1) 0%, transparent 40%), radial-gradient(circle at 80% 70%, rgba(100,50,200,0.15) 0%, transparent 35%)',
      tileColor: '#2A0070',
      tileBorder: '#FFD700',
      tileText: '#FFD700',
      wheelBg: 'radial-gradient(circle, #150040 0%, #0e0030 60%, #080020 100%)',
      wheelBorder: '#3A0080',
    },
    levels: [
      // L41: PELAJAR + AJAR + JALA + RELA
      {
        letters: ['P','E','L','A','J','A','R'],
        words: [
          { word:'PELAJAR', dir:'H', r:3, c:0 },
          { word:'AJAR',    dir:'V', r:3, c:3 },
          { word:'JALA',    dir:'V', r:3, c:4 },
          { word:'RELA',    dir:'V', r:3, c:6 },
        ],
        extraWords: ['PALA'],
      },
      // L42: MERDEKA + DEREK + MEKAR
      {
        letters: ['M','E','R','D','E','K','A'],
        words: [
          { word:'MERDEKA', dir:'H', r:3, c:0 },
          { word:'DEREK',   dir:'V', r:3, c:3 },
          { word:'MEKAR',   dir:'V', r:3, c:0 },
        ],
        extraWords: ['KREM','ERA'],
      },
      // L43: PERTAMA + PETA + TERA + AMAT + MARA
      {
        letters: ['P','E','R','T','A','M','A'],
        words: [
          { word:'PERTAMA', dir:'H', r:3, c:0 },
          { word:'PETA',    dir:'V', r:3, c:0 },
          { word:'TERA',    dir:'V', r:3, c:3 },
          { word:'AMAT',    dir:'V', r:3, c:4 },
          { word:'MARA',    dir:'V', r:3, c:5 },
        ],
        extraWords: ['TARA'],
      },
      // L44: BERSAMA + BERAS + EMAS + SEBAR + MASA
      {
        letters: ['B','E','R','S','A','M','A'],
        words: [
          { word:'BERSAMA', dir:'H', r:3, c:0 },
          { word:'BERAS',   dir:'V', r:3, c:0 },
          { word:'EMAS',    dir:'V', r:3, c:1 },
          { word:'SEBAR',   dir:'V', r:3, c:3 },
          { word:'MASA',    dir:'V', r:3, c:5 },
        ],
        extraWords: ['RASA','MAS'],
      },
      // L45: PELANGI + PALING + LAGI + GALI
      {
        letters: ['P','E','L','A','N','G','I'],
        words: [
          { word:'PELANGI', dir:'H', r:3, c:0 },
          { word:'PALING',  dir:'V', r:3, c:0 },
          { word:'LAGI',    dir:'V', r:3, c:2 },
          { word:'GALI',    dir:'V', r:3, c:5 },
        ],
        extraWords: ['PAGI','GELI'],
      },
      // L46: SEMANGAT + SETAN + ANGSA + GANAS + TEMAN
      {
        letters: ['S','E','M','A','N','G','A','T'],
        words: [
          { word:'SEMANGAT', dir:'H', r:3, c:0 },
          { word:'SETAN',    dir:'V', r:3, c:0 },
          { word:'ANGSA',    dir:'V', r:3, c:3 },
          { word:'GANAS',    dir:'V', r:3, c:5 },
          { word:'TEMAN',    dir:'V', r:3, c:7 },
        ],
        extraWords: ['EMAS','NAGA','SANG','MATA'],
      },
      // L47: MENCARI + MARI + NIRA + CERIA + IMAN
      {
        letters: ['M','E','N','C','A','R','I'],
        words: [
          { word:'MENCARI', dir:'H', r:3, c:0 },
          { word:'MARI',    dir:'V', r:3, c:0 },
          { word:'NIRA',    dir:'V', r:3, c:2 },
          { word:'CERIA',   dir:'V', r:3, c:3 },
          { word:'IMAN',    dir:'V', r:3, c:6 },
        ],
        extraWords: ['CARI','ERA'],
      },
      // L48: KEADILAN + ADIL + KIDAL + IDEAL + LENA + NAIK
      {
        letters: ['K','E','A','D','I','L','A','N'],
        words: [
          { word:'KEADILAN', dir:'H', r:3, c:0 },
          { word:'ADIL',     dir:'V', r:3, c:2 },
          { word:'KIDAL',    dir:'V', r:3, c:0 },
          { word:'IDEAL',    dir:'V', r:3, c:4 },
          { word:'LENA',     dir:'V', r:3, c:5 },
          { word:'NAIK',     dir:'V', r:3, c:7 },
        ],
        extraWords: ['AKAL','IKAN'],
      },
      // L49: PETUALANG + TULANG + ULANG + GELAP
      {
        letters: ['P','E','T','U','A','L','A','N','G'],
        words: [
          { word:'PETUALANG', dir:'H', r:4, c:0 },
          { word:'TULANG',    dir:'V', r:4, c:2 },
          { word:'ULANG',     dir:'V', r:4, c:3 },
          { word:'GELAP',     dir:'V', r:4, c:8 },
        ],
        extraWords: ['UANG','TANG','TUAN'],
      },
      // L50: NUSANTARA + NUSA + SURAT + ANTAR + TUAN + RATU ← FINAL BOSS
      {
        letters: ['N','U','S','A','N','T','A','R','A'],
        words: [
          { word:'NUSANTARA', dir:'H', r:4, c:0 },
          { word:'NUSA',      dir:'V', r:4, c:0 },
          { word:'SURAT',     dir:'V', r:4, c:2 },
          { word:'ANTAR',     dir:'V', r:4, c:3 },
          { word:'TUAN',      dir:'V', r:4, c:5 },
          { word:'RATU',      dir:'V', r:4, c:7 },
        ],
        extraWords: ['SUARA','RANTAU','ANTARA','RATUS','SANA','URAT'],
      },
    ],
  },
]

// Helper: compute grid cells from word placement data
export function computeWordCells(word, dir, r, c) {
  return word.split('').map((letter, i) => ({
    r: dir === 'H' ? r : r + i,
    c: dir === 'H' ? c + i : c,
    letter,
  }))
}

// Helper: get all cells for a level (with deduplication)
export function getLevelGrid(level) {
  const cellMap = new Map()
  level.words.forEach(w => {
    computeWordCells(w.word, w.dir, w.r, w.c).forEach(cell => {
      const key = `${cell.r},${cell.c}`
      cellMap.set(key, cell)
    })
  })
  return Array.from(cellMap.values())
}

// Helper: get grid bounds
export function getGridBounds(level) {
  const cells = getLevelGrid(level)
  let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity
  cells.forEach(c => {
    if (c.r < minR) minR = c.r
    if (c.r > maxR) maxR = c.r
    if (c.c < minC) minC = c.c
    if (c.c > maxC) maxC = c.c
  })
  return { minR, maxR, minC, maxC, rows: maxR - minR + 1, cols: maxC - minC + 1 }
}

// Helper: get flat level index and chapter index from absolute level number
export function getLevelInfo(absoluteLevel) {
  let count = 0
  for (let ci = 0; ci < CHAPTERS.length; ci++) {
    if (absoluteLevel < count + CHAPTERS[ci].levels.length) {
      return { chapterIndex: ci, levelInChapter: absoluteLevel - count, chapter: CHAPTERS[ci], level: CHAPTERS[ci].levels[absoluteLevel - count] }
    }
    count += CHAPTERS[ci].levels.length
  }
  return null
}

export const TOTAL_LEVELS = CHAPTERS.reduce((sum, ch) => sum + ch.levels.length, 0)
