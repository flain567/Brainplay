// ─── Anagram Crossword Level Database ─────────────────────────────────────────
// Words of Wonders style — 50 levels across 5 chapters
// Progressive difficulty: 3→9 words per level
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
  // CHAPTER 1: HUTAN KATA — 3-5 words per level, 3-5 letters
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
      // L1: 3 words — AKU×KAU×KUA
      {
        letters: ['A','K','U'],
        words: [
          { word:'AKU', dir:'H', r:0, c:0 },
          { word:'KAU', dir:'V', r:0, c:1 },
          { word:'KUA', dir:'H', r:2, c:0 },
        ],
        extraWords: [],
      },
      // L2: 3 words — API×PAI×IPA
      {
        letters: ['A','P','I'],
        words: [
          { word:'API', dir:'H', r:0, c:0 },
          { word:'PAI', dir:'V', r:0, c:1 },
          { word:'IPA', dir:'V', r:0, c:2 },
        ],
        extraWords: [],
      },
      // L3: 3 words — IBU×BUS×UBI
      {
        letters: ['I','B','U','S'],
        words: [
          { word:'IBU', dir:'H', r:0, c:0 },
          { word:'BUS', dir:'V', r:0, c:1 },
          { word:'UBI', dir:'V', r:0, c:2 },
        ],
        extraWords: ['BIS'],
      },
      // L4: 4 words — BATU + 3 verticals
      {
        letters: ['B','A','T','U'],
        words: [
          { word:'BATU', dir:'H', r:1, c:0 },
          { word:'BAU',  dir:'V', r:1, c:0 },
          { word:'ABU',  dir:'V', r:1, c:1 },
          { word:'TUBA', dir:'V', r:1, c:2 },
        ],
        extraWords: ['TAU','TUA','BUT'],
      },
      // L5: 4 words — SARI + 3 crossings
      {
        letters: ['S','A','R','I'],
        words: [
          { word:'SARI', dir:'H', r:1, c:0 },
          { word:'SIR',  dir:'V', r:1, c:0 },
          { word:'AIR',  dir:'V', r:1, c:1 },
          { word:'RIA',  dir:'V', r:1, c:2 },
        ],
        extraWords: ['ARI'],
      },
      // L6: 4 words — TAMAN + 3 verticals
      {
        letters: ['T','A','M','A','N'],
        words: [
          { word:'TAMAN', dir:'H', r:1, c:0 },
          { word:'MANA',  dir:'V', r:1, c:2 },
          { word:'AMAN',  dir:'V', r:1, c:3 },
          { word:'NAMA',  dir:'V', r:1, c:4 },
        ],
        extraWords: ['MATA'],
      },
      // L7: 4 words — KASUR + 3 verticals
      {
        letters: ['K','A','S','U','R'],
        words: [
          { word:'KASUR', dir:'H', r:2, c:0 },
          { word:'KAUS',  dir:'V', r:2, c:0 },
          { word:'SUKA',  dir:'V', r:2, c:2 },
          { word:'RUSA',  dir:'V', r:2, c:4 },
        ],
        extraWords: ['KAS','KAU','ARUS'],
      },
      // L8: 5 words — MAKAN + 4 verticals
      {
        letters: ['M','A','K','A','N'],
        words: [
          { word:'MAKAN', dir:'H', r:2, c:0 },
          { word:'MAKA',  dir:'V', r:2, c:0 },
          { word:'AKAN',  dir:'V', r:2, c:1 },
          { word:'ANAK',  dir:'V', r:2, c:3 },
          { word:'NAMA',  dir:'V', r:2, c:4 },
        ],
        extraWords: ['AMAN','MANA'],
      },
      // L9: 4 words — BUNGA + 3 verticals
      {
        letters: ['B','U','N','G','A'],
        words: [
          { word:'BUNGA', dir:'H', r:2, c:0 },
          { word:'BANG',  dir:'V', r:2, c:0 },
          { word:'UANG',  dir:'V', r:2, c:1 },
          { word:'GUNA',  dir:'V', r:2, c:3 },
        ],
        extraWords: ['BAU','BAN','GUA','BUNG'],
      },
      // L10: 5 words — ATUR + complex grid
      {
        letters: ['A','T','U','R'],
        words: [
          { word:'ATUR', dir:'H', r:1, c:0 },
          { word:'RATU', dir:'V', r:1, c:3 },
          { word:'TUA',  dir:'V', r:1, c:1 },
          { word:'RAUT', dir:'H', r:2, c:2 },
          { word:'URAT', dir:'V', r:1, c:2 },
        ],
        extraWords: ['TAU'],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CHAPTER 2: PANTAI BAHASA — 4-5 words per level, 5-6 letters
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
      // L11: 4 words — DUNIA + 3V
      {
        letters: ['D','U','N','I','A'],
        words: [
          { word:'DUNIA', dir:'H', r:2, c:0 },
          { word:'DAUN',  dir:'V', r:2, c:0 },
          { word:'UNDI',  dir:'V', r:2, c:1 },
          { word:'NADI',  dir:'V', r:2, c:2 },
        ],
        extraWords: ['DUA','UNI','ADI'],
      },
      // L12: 5 words — SURAT + 4V
      {
        letters: ['S','U','R','A','T'],
        words: [
          { word:'SURAT', dir:'H', r:2, c:0 },
          { word:'SATU',  dir:'V', r:2, c:0 },
          { word:'URAT',  dir:'V', r:2, c:1 },
          { word:'RATUS', dir:'V', r:2, c:2 },
          { word:'ARUS',  dir:'V', r:2, c:3 },
        ],
        extraWords: ['RATU','RAUT','TUA','TAU'],
      },
      // L13: 4 words — KAMUS + 3V
      {
        letters: ['K','A','M','U','S'],
        words: [
          { word:'KAMUS', dir:'H', r:2, c:0 },
          { word:'KUAS',  dir:'V', r:2, c:0 },
          { word:'MUKA',  dir:'V', r:2, c:2 },
          { word:'SAKU',  dir:'V', r:2, c:4 },
        ],
        extraWords: ['KAS','KAU','AKU','MAS','MAU','SUKA'],
      },
      // L14: 4 words — TIKUS + 3V
      {
        letters: ['T','I','K','U','S'],
        words: [
          { word:'TIKUS', dir:'H', r:2, c:0 },
          { word:'IKUT',  dir:'V', r:2, c:1 },
          { word:'KUIS',  dir:'V', r:2, c:2 },
          { word:'SIKU',  dir:'V', r:2, c:4 },
        ],
        extraWords: ['SITU'],
      },
      // L15: 4 words — BUKAN + cross grid
      {
        letters: ['B','U','K','A','N'],
        words: [
          { word:'BUKAN', dir:'H', r:2, c:0 },
          { word:'BANK',  dir:'V', r:2, c:0 },
          { word:'UBAN',  dir:'V', r:2, c:1 },
          { word:'ABU',   dir:'H', r:3, c:0 },
        ],
        extraWords: ['BAN','BAU','KAN'],
      },
      // L16: 4 words — SEMUA + 3V
      {
        letters: ['S','E','M','U','A'],
        words: [
          { word:'SEMUA', dir:'H', r:2, c:0 },
          { word:'SEMU',  dir:'V', r:2, c:0 },
          { word:'EMAS',  dir:'V', r:2, c:1 },
          { word:'ASEM',  dir:'V', r:2, c:4 },
        ],
        extraWords: ['MAS','MAU'],
      },
      // L17: 5 words — PINTAR + 4V
      {
        letters: ['P','I','N','T','A','R'],
        words: [
          { word:'PINTAR', dir:'H', r:2, c:0 },
          { word:'PINTA',  dir:'V', r:2, c:0 },
          { word:'NIAT',   dir:'V', r:2, c:2 },
          { word:'TARI',   dir:'V', r:2, c:3 },
          { word:'ARIT',   dir:'V', r:2, c:4 },
        ],
        extraWords: ['ANTI','PITA','TANI'],
      },
      // L18: 5 words — TUKAR + 4V
      {
        letters: ['T','U','K','A','R'],
        words: [
          { word:'TUKAR', dir:'H', r:2, c:0 },
          { word:'URAT',  dir:'V', r:2, c:1 },
          { word:'KUAT',  dir:'V', r:2, c:2 },
          { word:'ATUR',  dir:'V', r:2, c:3 },
          { word:'RATU',  dir:'V', r:2, c:4 },
        ],
        extraWords: ['RAUT','TUA','TAU','KARTU'],
      },
      // L19: 5 words — SAYANG + 4V
      {
        letters: ['S','A','Y','A','N','G'],
        words: [
          { word:'SAYANG', dir:'H', r:2, c:0 },
          { word:'SANG',   dir:'V', r:2, c:0 },
          { word:'YANG',   dir:'V', r:2, c:2 },
          { word:'NAGA',   dir:'V', r:2, c:4 },
          { word:'GANAS',  dir:'V', r:2, c:5 },
        ],
        extraWords: ['SANA'],
      },
      // L20: 5 words — HARUM + 4V
      {
        letters: ['H','A','R','U','M'],
        words: [
          { word:'HARUM', dir:'H', r:2, c:0 },
          { word:'HUMA',  dir:'V', r:2, c:0 },
          { word:'ARUM',  dir:'V', r:2, c:1 },
          { word:'RUMAH', dir:'V', r:2, c:2 },
          { word:'MURAH', dir:'V', r:2, c:4 },
        ],
        extraWords: ['RAMU'],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CHAPTER 3: PUNCAK PIKIRAN — 4-6 words per level, 5-7 letters
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
      // L21: 5 words — KERTAS + 4V
      {
        letters: ['K','E','R','T','A','S'],
        words: [
          { word:'KERTAS', dir:'H', r:2, c:0 },
          { word:'KERAS',  dir:'V', r:2, c:0 },
          { word:'ERAT',   dir:'V', r:2, c:1 },
          { word:'TERA',   dir:'V', r:2, c:3 },
          { word:'SERAT',  dir:'V', r:2, c:5 },
        ],
        extraWords: ['KERA','RAK','TAS','ERA','SATE'],
      },
      // L22: 5 words — BANGSA + 4 crossings
      {
        letters: ['B','A','N','G','S','A'],
        words: [
          { word:'BANGSA', dir:'H', r:2, c:0 },
          { word:'ABANG',  dir:'V', r:0, c:1 },
          { word:'NAGA',   dir:'V', r:2, c:2 },
          { word:'SANG',   dir:'V', r:2, c:4 },
          { word:'BASA',   dir:'H', r:3, c:3 },
        ],
        extraWords: ['BAN','GAS'],
      },
      // L23: 6 words — PANTAI + 5V
      {
        letters: ['P','A','N','T','A','I'],
        words: [
          { word:'PANTAI', dir:'H', r:2, c:0 },
          { word:'PINTA',  dir:'V', r:2, c:0 },
          { word:'APIT',   dir:'V', r:2, c:1 },
          { word:'NIAT',   dir:'V', r:2, c:2 },
          { word:'TANI',   dir:'V', r:2, c:3 },
          { word:'ANTI',   dir:'V', r:2, c:4 },
        ],
        extraWords: ['PITA','TAPI'],
      },
      // L24: 6 words — BINTANG + 5V
      {
        letters: ['B','I','N','T','A','N','G'],
        words: [
          { word:'BINTANG', dir:'H', r:2, c:0 },
          { word:'BAIT',    dir:'V', r:2, c:0 },
          { word:'NANTI',   dir:'V', r:2, c:2 },
          { word:'TIANG',   dir:'V', r:2, c:3 },
          { word:'ANTI',    dir:'V', r:2, c:4 },
          { word:'GANTI',   dir:'V', r:2, c:6 },
        ],
        extraWords: ['BANG','TANG'],
      },
      // L25: 5 words — KARENA + 4V
      {
        letters: ['K','A','R','E','N','A'],
        words: [
          { word:'KARENA', dir:'H', r:2, c:0 },
          { word:'KENA',   dir:'V', r:2, c:0 },
          { word:'ARENA',  dir:'V', r:2, c:1 },
          { word:'ENAK',   dir:'V', r:2, c:3 },
          { word:'ARAK',   dir:'V', r:2, c:5 },
        ],
        extraWords: ['ERA','KERA'],
      },
      // L26: 6 words — TULANG + 5V
      {
        letters: ['T','U','L','A','N','G'],
        words: [
          { word:'TULANG', dir:'H', r:2, c:0 },
          { word:'TUAN',   dir:'V', r:2, c:0 },
          { word:'ULANG',  dir:'V', r:2, c:1 },
          { word:'LAGU',   dir:'V', r:2, c:2 },
          { word:'ALUN',   dir:'V', r:2, c:3 },
          { word:'GUNA',   dir:'V', r:2, c:5 },
        ],
        extraWords: ['UANG','TANG'],
      },
      // L27: 5 words — PASANG + cross grid
      {
        letters: ['P','A','S','A','N','G'],
        words: [
          { word:'PASANG', dir:'H', r:2, c:0 },
          { word:'PANAS',  dir:'V', r:2, c:0 },
          { word:'SANG',   dir:'V', r:2, c:2 },
          { word:'NAGA',   dir:'V', r:2, c:4 },
          { word:'ASA',    dir:'H', r:3, c:0 },
        ],
        extraWords: ['SANA','PAS'],
      },
      // L28: 4 words — SENANG + 3V
      {
        letters: ['S','E','N','A','N','G'],
        words: [
          { word:'SENANG', dir:'H', r:2, c:0 },
          { word:'SEGAN',  dir:'V', r:2, c:0 },
          { word:'AGEN',   dir:'V', r:2, c:3 },
          { word:'NENAS',  dir:'V', r:2, c:4 },
        ],
        extraWords: ['SANG'],
      },
      // L29: 4 words — MUDAH + 3V
      {
        letters: ['M','U','D','A','H'],
        words: [
          { word:'MUDAH', dir:'H', r:0, c:0 },
          { word:'MUDA',  dir:'V', r:0, c:0 },
          { word:'ADUH',  dir:'V', r:0, c:3 },
          { word:'HUMA',  dir:'V', r:0, c:4 },
        ],
        extraWords: ['MAU','DUA'],
      },
      // L30: 4 words — GULAI + cross grid
      {
        letters: ['G','U','L','A','I'],
        words: [
          { word:'GULAI', dir:'H', r:3, c:0 },
          { word:'GALI',  dir:'V', r:3, c:0 },
          { word:'LAGU',  dir:'V', r:3, c:2 },
          { word:'GILA',  dir:'V', r:0, c:3 },
        ],
        extraWords: ['GUA'],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CHAPTER 4: KOTA AKSARA — 5-7 words per level, 6-8 letters
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
      // L31: 5 words — PERAHU + 4 crossings
      {
        letters: ['P','E','R','A','H','U'],
        words: [
          { word:'PERAHU', dir:'H', r:2, c:0 },
          { word:'PURA',   dir:'V', r:2, c:0 },
          { word:'ERA',    dir:'V', r:2, c:1 },
          { word:'RUAH',   dir:'V', r:2, c:2 },
          { word:'UPAH',   dir:'V', r:2, c:5 },
        ],
        extraWords: ['URAP'],
      },
      // L32: 5 words — MENARA + 4V
      {
        letters: ['M','E','N','A','R','A'],
        words: [
          { word:'MENARA', dir:'H', r:2, c:0 },
          { word:'ENAM',   dir:'V', r:2, c:1 },
          { word:'NAMA',   dir:'V', r:2, c:2 },
          { word:'AMAN',   dir:'V', r:2, c:3 },
          { word:'ARENA',  dir:'V', r:2, c:5 },
        ],
        extraWords: ['ERA','MANA'],
      },
      // L33: 6 words — SELAMAT + 5V
      {
        letters: ['S','E','L','A','M','A','T'],
        words: [
          { word:'SELAMAT', dir:'H', r:3, c:0 },
          { word:'SALAM',   dir:'V', r:3, c:0 },
          { word:'LEMAS',   dir:'V', r:3, c:2 },
          { word:'ATLAS',   dir:'V', r:3, c:3 },
          { word:'MALAS',   dir:'V', r:3, c:4 },
          { word:'TALAM',   dir:'V', r:3, c:6 },
        ],
        extraWords: ['METAL','MASA'],
      },
      // L34: 7 words — MATAHARI + 6V
      {
        letters: ['M','A','T','A','H','A','R','I'],
        words: [
          { word:'MATAHARI', dir:'H', r:3, c:0 },
          { word:'MATI',     dir:'V', r:3, c:0 },
          { word:'AMAT',     dir:'V', r:3, c:1 },
          { word:'TARI',     dir:'V', r:3, c:2 },
          { word:'HARI',     dir:'V', r:3, c:4 },
          { word:'ARTI',     dir:'V', r:3, c:5 },
          { word:'RAHIM',    dir:'V', r:3, c:6 },
        ],
        extraWords: ['MAHIR','TIARA'],
      },
      // L35: 5 words — TERBANG + 4V
      {
        letters: ['T','E','R','B','A','N','G'],
        words: [
          { word:'TERBANG', dir:'H', r:3, c:0 },
          { word:'TERANG',  dir:'V', r:3, c:0 },
          { word:'ERANG',   dir:'V', r:3, c:1 },
          { word:'BERANG',  dir:'V', r:3, c:3 },
          { word:'NETRA',   dir:'V', r:3, c:5 },
        ],
        extraWords: ['BERAT','BANG','ERA','BAN'],
      },
      // L36: 5 words — MALAM + 4 crossings
      {
        letters: ['M','A','L','A','M'],
        words: [
          { word:'MALAM', dir:'H', r:2, c:0 },
          { word:'MAMA',  dir:'V', r:2, c:0 },
          { word:'ALAM',  dir:'V', r:2, c:1 },
          { word:'LAMA',  dir:'V', r:2, c:2 },
          { word:'MAL',   dir:'V', r:2, c:4 },
        ],
        extraWords: [],
      },
      // L37: 5 words — PELAJAR + cross grid
      {
        letters: ['P','E','L','A','J','A','R'],
        words: [
          { word:'PELAJAR', dir:'H', r:3, c:0 },
          { word:'AJAR',    dir:'V', r:3, c:3 },
          { word:'JALA',    dir:'V', r:3, c:4 },
          { word:'RELA',    dir:'V', r:3, c:6 },
          { word:'RAJA',    dir:'H', r:6, c:3 },
        ],
        extraWords: ['PALA'],
      },
      // L38: 5 words — MERDEKA + 4V
      {
        letters: ['M','E','R','D','E','K','A'],
        words: [
          { word:'MERDEKA', dir:'H', r:3, c:0 },
          { word:'MEKAR',   dir:'V', r:3, c:0 },
          { word:'DEREK',   dir:'V', r:3, c:3 },
          { word:'KERA',    dir:'V', r:3, c:5 },
          { word:'ADEM',    dir:'V', r:3, c:6 },
        ],
        extraWords: ['KREM','ERA'],
      },
      // L39: 6 words — PERTAMA + 5V
      {
        letters: ['P','E','R','T','A','M','A'],
        words: [
          { word:'PERTAMA', dir:'H', r:3, c:0 },
          { word:'PETA',    dir:'V', r:3, c:0 },
          { word:'ERAT',    dir:'V', r:3, c:1 },
          { word:'TERA',    dir:'V', r:3, c:3 },
          { word:'AMAT',    dir:'V', r:3, c:4 },
          { word:'MARA',    dir:'V', r:3, c:5 },
        ],
        extraWords: ['TARA'],
      },
      // L40: 6 words — BERSAMA + 5V
      {
        letters: ['B','E','R','S','A','M','A'],
        words: [
          { word:'BERSAMA', dir:'H', r:3, c:0 },
          { word:'BERAS',   dir:'V', r:3, c:0 },
          { word:'EMAS',    dir:'V', r:3, c:1 },
          { word:'RASA',    dir:'V', r:3, c:2 },
          { word:'SEBAR',   dir:'V', r:3, c:3 },
          { word:'MASA',    dir:'V', r:3, c:5 },
        ],
        extraWords: ['MAS'],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CHAPTER 5: GALAKSI KATA — 5-9 words per level, 7-9 letters
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
      // L41: 6 words — PELANGI + 5V
      {
        letters: ['P','E','L','A','N','G','I'],
        words: [
          { word:'PELANGI', dir:'H', r:3, c:0 },
          { word:'PALING',  dir:'V', r:3, c:0 },
          { word:'LAGI',    dir:'V', r:3, c:2 },
          { word:'AGEN',    dir:'V', r:3, c:3 },
          { word:'NILA',    dir:'V', r:3, c:4 },
          { word:'GALI',    dir:'V', r:3, c:5 },
        ],
        extraWords: ['PAGI','GELI'],
      },
      // L42: 6 words — MENCARI + 5 crossings
      {
        letters: ['M','E','N','C','A','R','I'],
        words: [
          { word:'MENCARI', dir:'H', r:3, c:0 },
          { word:'MARI',    dir:'V', r:3, c:0 },
          { word:'ERA',     dir:'V', r:3, c:1 },
          { word:'NIRA',    dir:'V', r:3, c:2 },
          { word:'CARI',    dir:'V', r:3, c:3 },
          { word:'IMAN',    dir:'V', r:3, c:6 },
        ],
        extraWords: ['CERIA'],
      },
      // L43: 7 words — SEMANGAT + 6V
      {
        letters: ['S','E','M','A','N','G','A','T'],
        words: [
          { word:'SEMANGAT', dir:'H', r:3, c:0 },
          { word:'SETAN',    dir:'V', r:3, c:0 },
          { word:'EMAS',     dir:'V', r:3, c:1 },
          { word:'ANGSA',    dir:'V', r:3, c:3 },
          { word:'NAGA',     dir:'V', r:3, c:4 },
          { word:'GANAS',    dir:'V', r:3, c:5 },
          { word:'TEMAN',    dir:'V', r:3, c:7 },
        ],
        extraWords: ['MATA','SANG','AGEN'],
      },
      // L44: 7 words — KEADILAN + 6V
      {
        letters: ['K','E','A','D','I','L','A','N'],
        words: [
          { word:'KEADILAN', dir:'H', r:3, c:0 },
          { word:'KIDAL',    dir:'V', r:3, c:0 },
          { word:'ADIL',     dir:'V', r:3, c:2 },
          { word:'DIAN',     dir:'V', r:3, c:3 },
          { word:'IDEAL',    dir:'V', r:3, c:4 },
          { word:'LENA',     dir:'V', r:3, c:5 },
          { word:'NAIK',     dir:'V', r:3, c:7 },
        ],
        extraWords: ['AKAL','IKAN'],
      },
      // L45: 6 words — BERMAIN + 5V
      {
        letters: ['B','E','R','M','A','I','N'],
        words: [
          { word:'BERMAIN', dir:'H', r:3, c:0 },
          { word:'BERI',    dir:'V', r:3, c:0 },
          { word:'EMIR',    dir:'V', r:3, c:1 },
          { word:'MAIN',    dir:'V', r:3, c:3 },
          { word:'AMIN',    dir:'V', r:3, c:4 },
          { word:'NABI',    dir:'V', r:3, c:6 },
        ],
        extraWords: ['RANI','RAMI','IMAN'],
      },
      // L46: 6 words — BERLARI + 5V
      {
        letters: ['B','E','R','L','A','R','I'],
        words: [
          { word:'BERLARI', dir:'H', r:3, c:0 },
          { word:'BELA',    dir:'V', r:3, c:0 },
          { word:'ERA',     dir:'V', r:3, c:1 },
          { word:'RELA',    dir:'V', r:3, c:2 },
          { word:'LARI',    dir:'V', r:3, c:3 },
          { word:'RABI',    dir:'V', r:3, c:5 },
        ],
        extraWords: ['BERI','AIR'],
      },
      // L47: 7 words — MERANTAU + 6V
      {
        letters: ['M','E','R','A','N','T','A','U'],
        words: [
          { word:'MERANTAU', dir:'H', r:3, c:0 },
          { word:'MANTRA',   dir:'V', r:3, c:0 },
          { word:'RANTAU',   dir:'V', r:3, c:2 },
          { word:'ANTAR',    dir:'V', r:3, c:3 },
          { word:'NAMA',     dir:'V', r:3, c:4 },
          { word:'TUAN',     dir:'V', r:3, c:5 },
          { word:'ATUR',     dir:'V', r:3, c:6 },
        ],
        extraWords: ['ENAM','MARA','RATU'],
      },
      // L48: 8 words — PETUALANG + 7V
      {
        letters: ['P','E','T','U','A','L','A','N','G'],
        words: [
          { word:'PETUALANG', dir:'H', r:4, c:0 },
          { word:'PALU',      dir:'V', r:4, c:0 },
          { word:'TULANG',    dir:'V', r:4, c:2 },
          { word:'ULANG',     dir:'V', r:4, c:3 },
          { word:'ALUN',      dir:'V', r:4, c:4 },
          { word:'LAGU',      dir:'V', r:4, c:5 },
          { word:'NAGA',      dir:'V', r:4, c:7 },
          { word:'GELAP',     dir:'V', r:4, c:8 },
        ],
        extraWords: ['UANG','TANG','TUAN'],
      },
      // L49: 7 words — MATAHARI + 6V
      {
        letters: ['M','A','T','A','H','A','R','I'],
        words: [
          { word:'MATAHARI', dir:'H', r:4, c:0 },
          { word:'MAHIR',    dir:'V', r:4, c:0 },
          { word:'ARAH',     dir:'V', r:4, c:1 },
          { word:'TIARA',    dir:'V', r:4, c:2 },
          { word:'HARI',     dir:'V', r:4, c:4 },
          { word:'ARTI',     dir:'V', r:4, c:5 },
          { word:'RAHIM',    dir:'V', r:4, c:6 },
        ],
        extraWords: ['TARI','MATI','AMAT'],
      },
      // L50: 9 words — NUSANTARA ← FINAL BOSS
      {
        letters: ['N','U','S','A','N','T','A','R','A'],
        words: [
          { word:'NUSANTARA', dir:'H', r:4, c:0 },
          { word:'NUSA',      dir:'V', r:4, c:0 },
          { word:'URAT',      dir:'V', r:4, c:1 },
          { word:'SURAT',     dir:'V', r:4, c:2 },
          { word:'ANTAR',     dir:'V', r:4, c:3 },
          { word:'NAAS',      dir:'V', r:4, c:4 },
          { word:'TUAN',      dir:'V', r:4, c:5 },
          { word:'RATU',      dir:'V', r:4, c:7 },
          { word:'ATAS',      dir:'V', r:4, c:8 },
        ],
        extraWords: ['SUARA','RANTAU','ANTARA','SANA'],
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
