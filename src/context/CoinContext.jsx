import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { getJSON, setJSON, StorageKeys } from '../utils/storage.js'

const CoinContext = createContext(null)

// ─── Card Icon Packs (Memory Card Match) ────────────────────────────────────
export const ICON_PACKS = [
  { id:'default', name:'Emoji Pack', desc:'Emoji klasik yang ekspresif dan berwarna', price:0, icon:'😀', color:'#FDCB6E',
    icons:['🐶','🐱','🦊','🐻','🦁','🐯','🐸','🐧','🦄','🐼','🦋','🐙'] },
  { id:'animal', name:'Animal Pack', desc:'Berbagai jenis hewan lucu dari seluruh dunia', price:150, icon:'🐾', color:'#4ECDC4',
    icons:['🐘','🦒','🦘','🐬','🦜','🦩','🐢','🦔','🦦','🐝','🦚','🐞'] },
  { id:'food', name:'Food Pack', desc:'Makanan dan buah-buahan yang menggugah selera', price:150, icon:'🍔', color:'#FF6B6B',
    icons:['🍕','🍔','🍣','🌮','🍩','🧁','🍦','🥐','🍪','🫐','🍜','🥟'] },
  { id:'space', name:'Space Pack', desc:'Tema luar angkasa — planet, bintang, dan galaksi', price:250, icon:'🚀', color:'#A29BFE',
    icons:['🚀','🌍','🌙','⭐','🪐','☄️','🛸','👽','🌌','🔭','🌞','💫'] },
  { id:'sport', name:'Sport Pack', desc:'Peralatan olahraga dan aktivitas seru', price:200, icon:'⚽', color:'#00B894',
    icons:['⚽','🏀','🎾','🏐','🏈','⚾','🎱','🏓','🥊','🏹','🎣','🛹'] },
  { id:'flag', name:'Flag Pack', desc:'Bendera dari berbagai negara di dunia', price:200, icon:'🏳️', color:'#FD79A8',
    icons:['🇮🇩','🇯🇵','🇧🇷','🇺🇸','🇬🇧','🇫🇷','🇩🇪','🇰🇷','🇪🇸','🇮🇹','🇹🇭','🇲🇽'] },
  { id:'music', name:'Music Pack', desc:'Instrumen musik dan simbol melodi', price:300, icon:'🎵', color:'#E17055',
    icons:['🎸','🎹','🥁','🎺','🎷','🎻','🪗','🪘','🎤','🎧','🎼','🎵'] },
  { id:'fantasy', name:'Fantasy Pack', desc:'Makhluk mistis dan sihir dari dunia fantasi', price:350, icon:'🐉', color:'#6C5CE7',
    icons:['🐉','🧙','🧚','🦅','🗡️','🛡️','👑','💎','🔮','⚔️','🏰','🧝'] },
]

// ─── Snake Skin Packs (Slither Worm) ────────────────────────────────────────
export const SNAKE_SKINS = [
  { id:'default', name:'Tosca Classic', desc:'Warna tosca default yang elegan', price:0, icon:'🟢', color:'#4ECDC4',
    skin:{ head:'#4ecdc4', body:'#2eada4', glow:'#4ecdc4' } },
  { id:'neon-pink', name:'Neon Pink', desc:'Pink neon yang menyala terang di kegelapan', price:100, icon:'💗', color:'#FF6B9D',
    skin:{ head:'#FF6B9D', body:'#D4437A', glow:'#FF6B9D' } },
  { id:'golden-dragon', name:'Golden Dragon', desc:'Emas berkilau bak naga legendaris', price:200, icon:'🐲', color:'#FFD700',
    skin:{ head:'#FFD700', body:'#DAA520', glow:'#FFD700' } },
  { id:'ice-blue', name:'Ice Blue', desc:'Biru es yang dingin dan membekukan arena', price:150, icon:'🧊', color:'#74B9FF',
    skin:{ head:'#74B9FF', body:'#4A8DD8', glow:'#74B9FF' } },
  { id:'lava-red', name:'Lava Red', desc:'Merah lava panas membara dari kedalaman bumi', price:150, icon:'🌋', color:'#FF4757',
    skin:{ head:'#FF4757', body:'#C0392B', glow:'#FF4757' } },
  { id:'galaxy', name:'Galaxy Purple', desc:'Ungu galaksi yang misterius dan kosmik', price:250, icon:'🌌', color:'#A29BFE',
    skin:{ head:'#A29BFE', body:'#6C5CE7', glow:'#A29BFE' } },
  { id:'rainbow', name:'Rainbow', desc:'Pelangi warna-warni yang berubah-ubah!', price:300, icon:'🌈', color:'#FF6B6B',
    skin:{ head:'#FF6B6B', body:'#A29BFE', glow:'#FDCB6E', rainbow:true } },
]

// ─── Tile Theme Packs (Connect Blocks / 2048) ──────────────────────────────
export const TILE_THEMES = [
  { id:'default', name:'Classic', desc:'Warna klasik yang sudah familiar', price:0, icon:'🎨', color:'#4CAF50',
    colors:{
      2:{bg:'#4CAF50',dark:'#388E3C',text:'#fff'},4:{bg:'#FFC107',dark:'#F9A825',text:'#333'},
      8:{bg:'#9C27B0',dark:'#7B1FA2',text:'#fff'},16:{bg:'#E91E63',dark:'#C2185B',text:'#fff'},
      32:{bg:'#2196F3',dark:'#1565C0',text:'#fff'},64:{bg:'#FF5722',dark:'#D84315',text:'#fff'},
      128:{bg:'#00BCD4',dark:'#00838F',text:'#fff'},256:{bg:'#8BC34A',dark:'#558B2F',text:'#fff'},
      512:{bg:'#FF9800',dark:'#E65100',text:'#fff'},1024:{bg:'#3F51B5',dark:'#283593',text:'#fff'},
      2048:{bg:'#F44336',dark:'#B71C1C',text:'#fff'},
    }},
  { id:'ocean', name:'Ocean', desc:'Nuansa biru laut yang menenangkan', price:150, icon:'🌊', color:'#0984E3',
    colors:{
      2:{bg:'#74B9FF',dark:'#5A9FE6',text:'#fff'},4:{bg:'#0984E3',dark:'#0767B0',text:'#fff'},
      8:{bg:'#00CEC9',dark:'#00A8A3',text:'#fff'},16:{bg:'#006266',dark:'#004D50',text:'#fff'},
      32:{bg:'#1289A7',dark:'#0E6B83',text:'#fff'},64:{bg:'#3DC1D3',dark:'#2FA3B3',text:'#fff'},
      128:{bg:'#22A6B3',dark:'#1A8490',text:'#fff'},256:{bg:'#7ED6DF',dark:'#5FC0CC',text:'#333'},
      512:{bg:'#01A3A4',dark:'#007F80',text:'#fff'},1024:{bg:'#0652DD',dark:'#043DB0',text:'#fff'},
      2048:{bg:'#1B1464',dark:'#120D44',text:'#fff'},
    }},
  { id:'sunset', name:'Sunset', desc:'Gradien senja yang hangat dan romantis', price:150, icon:'🌅', color:'#E17055',
    colors:{
      2:{bg:'#FFECD2',dark:'#E8D4BA',text:'#5D4037'},4:{bg:'#FCAF45',dark:'#E09A30',text:'#fff'},
      8:{bg:'#F97F51',dark:'#D66A3E',text:'#fff'},16:{bg:'#EE5A24',dark:'#C44818',text:'#fff'},
      32:{bg:'#EA2027',dark:'#C01A1F',text:'#fff'},64:{bg:'#B53471',dark:'#8E2959',text:'#fff'},
      128:{bg:'#833471',dark:'#66285A',text:'#fff'},256:{bg:'#6F1E51',dark:'#56173F',text:'#fff'},
      512:{bg:'#FDA7DF',dark:'#E48EC6',text:'#333'},1024:{bg:'#D980FA',dark:'#BD66E0',text:'#fff'},
      2048:{bg:'#9B59B6',dark:'#7D3F94',text:'#fff'},
    }},
  { id:'mono', name:'Monochrome', desc:'Hitam putih minimalis — elegan dan bersih', price:100, icon:'⬛', color:'#636E72',
    colors:{
      2:{bg:'#DFE6E9',dark:'#B2BEC3',text:'#2D3436'},4:{bg:'#B2BEC3',dark:'#95A5A6',text:'#2D3436'},
      8:{bg:'#95A5A6',dark:'#7F8C8D',text:'#fff'},16:{bg:'#7F8C8D',dark:'#636E72',text:'#fff'},
      32:{bg:'#636E72',dark:'#4A5457',text:'#fff'},64:{bg:'#4A5457',dark:'#363D3F',text:'#fff'},
      128:{bg:'#2D3436',dark:'#1E2324',text:'#fff'},256:{bg:'#1E2324',dark:'#131818',text:'#fff'},
      512:{bg:'#0D1111',dark:'#060909',text:'#fff'},1024:{bg:'#000000',dark:'#000000',text:'#fff'},
      2048:{bg:'#2D3436',dark:'#1E2324',text:'#FDCB6E'},
    }},
  { id:'candy', name:'Candy Pastel', desc:'Warna pastel manis bak permen kapas', price:200, icon:'🍬', color:'#FD79A8',
    colors:{
      2:{bg:'#FFB8D0',dark:'#E8A0B8',text:'#5D4037'},4:{bg:'#B8E6FF',dark:'#A0CEE8',text:'#2D3436'},
      8:{bg:'#C8FFB8',dark:'#B0E8A0',text:'#2D3436'},16:{bg:'#FFE0B8',dark:'#E8C8A0',text:'#5D4037'},
      32:{bg:'#E0B8FF',dark:'#C8A0E8',text:'#2D3436'},64:{bg:'#FFFAB8',dark:'#E8E2A0',text:'#5D4037'},
      128:{bg:'#FD79A8',dark:'#D45E88',text:'#fff'},256:{bg:'#81ECEC',dark:'#5ED4D4',text:'#2D3436'},
      512:{bg:'#55EFC4',dark:'#3ED7AC',text:'#2D3436'},1024:{bg:'#A29BFE',dark:'#8880E0',text:'#fff'},
      2048:{bg:'#6C5CE7',dark:'#5544CC',text:'#fff'},
    }},
  { id:'neon', name:'Neon', desc:'Neon terang yang bersinar di kegelapan', price:200, icon:'💡', color:'#00FF88',
    colors:{
      2:{bg:'#00FF88',dark:'#00CC6E',text:'#0a0a1a'},4:{bg:'#00FFFF',dark:'#00CCCC',text:'#0a0a1a'},
      8:{bg:'#FF00FF',dark:'#CC00CC',text:'#fff'},16:{bg:'#FFFF00',dark:'#CCCC00',text:'#0a0a1a'},
      32:{bg:'#FF0066',dark:'#CC0052',text:'#fff'},64:{bg:'#0066FF',dark:'#0052CC',text:'#fff'},
      128:{bg:'#FF6600',dark:'#CC5200',text:'#fff'},256:{bg:'#9900FF',dark:'#7A00CC',text:'#fff'},
      512:{bg:'#00FF00',dark:'#00CC00',text:'#0a0a1a'},1024:{bg:'#FF0000',dark:'#CC0000',text:'#fff'},
      2048:{bg:'#FFFFFF',dark:'#CCCCCC',text:'#0a0a1a'},
    }},
]

// ─── Highlight Packs (Word Search) ──────────────────────────────────────────
export const HIGHLIGHT_PACKS = [
  { id:'default', name:'Rainbow', desc:'Warna pelangi yang ceria dan bervariasi', price:0, icon:'🌈', color:'#FF6B6B',
    colors:['#FF6B6B','#4ECDC4','#A29BFE','#FD79A8','#00B894','#FDCB6E','#6C5CE7','#E17055','#00CEC9','#0984E3','#E84393','#55EFC4','#81ECEC','#FAB1A0','#74B9FF'] },
  { id:'neon-glow', name:'Neon Glow', desc:'Neon terang yang menyala di kegelapan', price:100, icon:'💡', color:'#00FF88',
    colors:['#00FF88','#00FFFF','#FF00FF','#FFFF00','#FF0066','#0066FF','#FF6600','#9900FF','#00FF00','#FF3366','#33FFCC','#FF9900','#6633FF','#CCFF00','#FF0099'] },
  { id:'pastel', name:'Pastel Dream', desc:'Warna pastel lembut yang menenangkan mata', price:100, icon:'🎀', color:'#FFB8D0',
    colors:['#FFB8D0','#B8E6FF','#C8FFB8','#FFE0B8','#E0B8FF','#FFFAB8','#FFD1DC','#B8FFE0','#D4B8FF','#FFF0B8','#B8FFFA','#FFB8B8','#B8D4FF','#E8FFB8','#FFB8F0'] },
  { id:'fire', name:'Fire', desc:'Api membara dari merah ke kuning', price:150, icon:'🔥', color:'#FF4500',
    colors:['#FF0000','#FF2200','#FF4400','#FF6600','#FF8800','#FFAA00','#FFCC00','#FFE000','#FF3300','#FF5500','#FF7700','#FF9900','#FFBB00','#FFDD00','#FF1100'] },
  { id:'ocean-wave', name:'Ocean Wave', desc:'Gelombang laut biru yang menenangkan', price:150, icon:'🌊', color:'#0984E3',
    colors:['#0984E3','#74B9FF','#00CEC9','#00A8A3','#1289A7','#3DC1D3','#22A6B3','#7ED6DF','#01A3A4','#0652DD','#1B1464','#48DBFB','#0ABDE3','#54A0FF','#2E86DE'] },
  { id:'minimalist', name:'Minimalist', desc:'Warna netral yang bersih dan minimalis', price:100, icon:'⬜', color:'#636E72',
    colors:['#636E72','#95A5A6','#2D3436','#B2BEC3','#7F8C8D','#4A5457','#DFE6E9','#1E2324','#ABB2B9','#6C7A82','#3D4E56','#8395A7','#576574','#222F3E','#C8D6E5'] },
]

// ─── Ship Catalog (Space Shooter) ────────────────────────────────────────────
export const SHIP_CATALOG = [
  { id:'falcon', name:'Falcon', desc:'Pesawat standar yang seimbang — cocok untuk semua misi',
    price:0, icon:'🚀', color:'#4ECDC4',
    stats:{ speed:5, fireRate:8, bulletCount:1, maxHP:5, specialType:'bomb', specialCharge:300 },
    design:{ body:'#4ECDC4', wing:'#2d8a85', cockpit:'#74B9FF', engine:'#FDCB6E', accent:'#fff' }
  },
  { id:'viper', name:'Viper', desc:'Pesawat cepat dengan tembakan rapid — untuk pilot gesit',
    price:200, icon:'⚡', color:'#00FF88',
    stats:{ speed:7, fireRate:5, bulletCount:1, maxHP:4, specialType:'rapid', specialCharge:250 },
    design:{ body:'#00FF88', wing:'#00CC6E', cockpit:'#B8FFD0', engine:'#00FF88', accent:'#fff' }
  },
  { id:'titan', name:'Titan', desc:'Pesawat berat dengan armor tebal dan tembakan menyebar',
    price:350, icon:'🛡️', color:'#FF6B6B',
    stats:{ speed:3.5, fireRate:10, bulletCount:3, maxHP:8, specialType:'shield', specialCharge:200 },
    design:{ body:'#FF6B6B', wing:'#CC4444', cockpit:'#FFB8B8', engine:'#FF4444', accent:'#fff' }
  },
  { id:'phoenix', name:'Phoenix', desc:'Pesawat legendaris dengan jejak api yang membakar musuh',
    price:500, icon:'🔥', color:'#FF8C00',
    stats:{ speed:5.5, fireRate:7, bulletCount:2, maxHP:6, specialType:'firetrail', specialCharge:280 },
    design:{ body:'#FF8C00', wing:'#CC6600', cockpit:'#FFD700', engine:'#FF4500', accent:'#FFE0A0' }
  },
  { id:'shadow', name:'Shadow', desc:'Pesawat stealth — 20% chance critical hit 2× damage',
    price:700, icon:'👻', color:'#A29BFE',
    stats:{ speed:6, fireRate:7, bulletCount:2, maxHP:5, specialType:'cloak', specialCharge:260, critChance:0.2 },
    design:{ body:'#A29BFE', wing:'#6C5CE7', cockpit:'#D4CFFF', engine:'#A29BFE', accent:'#E0DDFF' }
  },
  { id:'nebula', name:'Nebula', desc:'Pesawat terkuat — senjata laser dan pertahanan maksimal',
    price:1000, icon:'💎', color:'#FFD700',
    stats:{ speed:5.5, fireRate:6, bulletCount:3, maxHP:7, specialType:'beam', specialCharge:350 },
    design:{ body:'#FFD700', wing:'#DAA520', cockpit:'#FFFACD', engine:'#FFA500', accent:'#FFF8DC' }
  },
]

// ─── Hangman Themes (Hangman) ────────────────────────────────────────────────
export const HANGMAN_THEMES = [
  { id:'default', name:'Classic', desc:'Tiang gantung klasik hitam-putih', price:0, icon:'💀', color:'#E17055',
    style:{ stick:'#ffffff', man:'#ffffff', bg:'transparent' } },
  { id:'neon', name:'Neon Glow', desc:'Garis neon yang menyala di kegelapan', price:100, icon:'💡', color:'#00FF88',
    style:{ stick:'#00FF88', man:'#00FFFF', bg:'transparent' } },
  { id:'sketch', name:'Pencil Sketch', desc:'Gaya sketsa pensil yang artistik', price:100, icon:'✏️', color:'#B2BEC3',
    style:{ stick:'#B2BEC3', man:'#DFE6E9', bg:'transparent' } },
  { id:'fire', name:'Fire Theme', desc:'Api neraka — tiang dan orang menyala!', price:150, icon:'🔥', color:'#FF4500',
    style:{ stick:'#FF6B6B', man:'#FF4500', bg:'transparent' } },
  { id:'ice', name:'Ice Theme', desc:'Tema es beku yang membekukan jiwa', price:150, icon:'🧊', color:'#74B9FF',
    style:{ stick:'#74B9FF', man:'#0984E3', bg:'transparent' } },
  { id:'galaxy', name:'Galaxy', desc:'Warna galaksi kosmik yang misterius', price:200, icon:'🌌', color:'#A29BFE',
    style:{ stick:'#A29BFE', man:'#6C5CE7', bg:'transparent' } },
  { id:'gold', name:'Golden', desc:'Emas berkilau untuk yang menghargai keindahan', price:250, icon:'👑', color:'#FFD700',
    style:{ stick:'#FFD700', man:'#DAA520', bg:'transparent' } },
]

// ─── Color Sort Themes (Color Sort) ─────────────────────────────────────────
export const TUBE_THEMES = [
  { id:'default', name:'Glass Tube', desc:'Tabung kaca bening klasik', price:0, icon:'🧪', color:'#6C5CE7',
    style:{ tube:'rgba(255,255,255,0.1)', border:'rgba(255,255,255,0.25)', shape:'round' } },
  { id:'flask', name:'Lab Flask', desc:'Labu erlenmeyer dari laboratorium sains', price:100, icon:'⚗️', color:'#00B894',
    style:{ tube:'rgba(0,184,148,0.08)', border:'rgba(0,184,148,0.3)', shape:'flask' } },
  { id:'bubble', name:'Bubble Jar', desc:'Toples gelembung yang lucu dan bulat', price:100, icon:'🫧', color:'#74B9FF',
    style:{ tube:'rgba(116,185,255,0.08)', border:'rgba(116,185,255,0.3)', shape:'bubble' } },
  { id:'neon', name:'Neon Tube', desc:'Tabung neon yang bersinar terang', price:150, icon:'💡', color:'#00FF88',
    style:{ tube:'rgba(0,255,136,0.06)', border:'rgba(0,255,136,0.35)', shape:'round' } },
  { id:'bamboo', name:'Bamboo', desc:'Ruas bambu alami dari hutan', price:150, icon:'🎋', color:'#55EFC4',
    style:{ tube:'rgba(85,239,196,0.08)', border:'rgba(85,239,196,0.3)', shape:'bamboo' } },
  { id:'crystal', name:'Crystal Vial', desc:'Botol kristal yang berkilauan', price:200, icon:'💎', color:'#A29BFE',
    style:{ tube:'rgba(162,155,254,0.08)', border:'rgba(162,155,254,0.35)', shape:'crystal' } },
  { id:'lava', name:'Lava Lamp', desc:'Lampu lava retro yang meleleh', price:250, icon:'🌋', color:'#FF6B6B',
    style:{ tube:'rgba(255,107,107,0.08)', border:'rgba(255,107,107,0.35)', shape:'round' } },
]

// ─── Sudoku Themes (Sudoku) ─────────────────────────────────────────────────
export const SUDOKU_THEMES = [
  { id:'default', name:'Classic Blue', desc:'Tema biru klasik yang bersih', price:0, icon:'🔢', color:'#0984E3',
    style:{ grid:'#0984E3', selected:'#74B9FF', given:'#ffffff', input:'#4ECDC4', error:'#FF6B6B', bg:'#0a1628' } },
  { id:'paper', name:'Newspaper', desc:'Gaya koran kertas dengan angka serif', price:100, icon:'📰', color:'#636E72',
    style:{ grid:'#636E72', selected:'#DFE6E9', given:'#2D3436', input:'#0984E3', error:'#E17055', bg:'#FFF9F0' } },
  { id:'mint', name:'Mint Fresh', desc:'Hijau mint segar yang menyegarkan mata', price:100, icon:'🌿', color:'#00B894',
    style:{ grid:'#00B894', selected:'#55EFC4', given:'#ffffff', input:'#00CEC9', error:'#FF6B6B', bg:'#0a2018' } },
  { id:'sunset', name:'Sunset', desc:'Warna sunset yang hangat dan indah', price:150, icon:'🌅', color:'#E17055',
    style:{ grid:'#E17055', selected:'#FAB1A0', given:'#ffffff', input:'#FDCB6E', error:'#FF6B6B', bg:'#1a0f0a' } },
  { id:'purple', name:'Royal Purple', desc:'Ungu kerajaan yang megah dan mewah', price:150, icon:'👑', color:'#6C5CE7',
    style:{ grid:'#6C5CE7', selected:'#A29BFE', given:'#ffffff', input:'#FD79A8', error:'#FF6B6B', bg:'#0d0a1e' } },
  { id:'matrix', name:'Matrix', desc:'Hijau terminal hacker — angka berjatuhan', price:200, icon:'💻', color:'#00FF41',
    style:{ grid:'#00FF41', selected:'#39FF14', given:'#00FF41', input:'#7CFF00', error:'#FF0040', bg:'#0a0a0a' } },
]

// ─── Jigsaw Themes (Jigsaw Puzzle) ──────────────────────────────────────────
export const JIGSAW_THEMES = [
  { id:'default', name:'Gradient', desc:'Gradien warna-warni yang indah', price:0, icon:'🧩', color:'#E84393',
    style:{ type:'gradient', colors:['#FF6B6B','#A29BFE','#FDCB6E','#4ECDC4'] } },
  { id:'ocean', name:'Ocean Blue', desc:'Gradien biru laut yang menenangkan', price:100, icon:'🌊', color:'#0984E3',
    style:{ type:'gradient', colors:['#0984E3','#74B9FF','#00CEC9','#48DBFB'] } },
  { id:'sunset', name:'Sunset Glow', desc:'Warna matahari terbenam yang spektakuler', price:100, icon:'🌅', color:'#E17055',
    style:{ type:'gradient', colors:['#FF6B6B','#E17055','#FDCB6E','#FD79A8'] } },
  { id:'forest', name:'Forest', desc:'Hijau hutan yang alami dan asri', price:150, icon:'🌲', color:'#00B894',
    style:{ type:'gradient', colors:['#00B894','#55EFC4','#00CEC9','#1DD1A1'] } },
  { id:'galaxy', name:'Galaxy', desc:'Warna galaksi ungu yang misterius', price:150, icon:'🌌', color:'#6C5CE7',
    style:{ type:'gradient', colors:['#6C5CE7','#A29BFE','#FD79A8','#E84393'] } },
  { id:'candy', name:'Candy Pop', desc:'Warna permen yang cerah dan manis', price:200, icon:'🍬', color:'#FD79A8',
    style:{ type:'gradient', colors:['#FD79A8','#FDCB6E','#6C5CE7','#00B894'] } },
  { id:'mono', name:'Monochrome', desc:'Hitam-putih minimalis yang elegan', price:200, icon:'⬛', color:'#636E72',
    style:{ type:'gradient', colors:['#2D3436','#636E72','#B2BEC3','#DFE6E9'] } },
]

// ─── Consumable Items ───────────────────────────────────────────────────────
export const CONSUMABLES = [
  { id:'extra-hints', name:'Extra Hints ×5', desc:'Tambah 5 hint di game yang mendukung hint', price:50, icon:'💡', color:'#FDCB6E', amount:5 },
  { id:'time-freeze', name:'Time Freeze +30s', desc:'Tambah 30 detik di game berbasis timer', price:40, icon:'⏱️', color:'#74B9FF', amount:30 },
]

// ─── Coin reward rates ──────────────────────────────────────────────────────
export const COIN_REWARDS = {
  gameWin:    { easy:15, medium:25, hard:40 },
  gameLose:   5,
  threeStars: 20,
  achievement:50,
  dailyLogin: [10,15,20,25,30,40,60],
  levelUp:    30,
}

// ─── Default state ──────────────────────────────────────────────────────────
function getDefaultCoinState() {
  return {
    balance:50, totalEarned:50, totalSpent:0,
    ownedPacks:['default'], activePack:'default',
    ownedSkins:['default'], activeSkin:'default',
    ownedTileThemes:['default'], activeTileTheme:'default',
    ownedHighlights:['default'], activeHighlight:'default',
    ownedShips:['falcon'], activeShip:'falcon',
    ownedHangmanThemes:['default'], activeHangmanTheme:'default',
    ownedTubeThemes:['default'], activeTubeTheme:'default',
    ownedSudokuThemes:['default'], activeSudokuTheme:'default',
    ownedJigsawThemes:['default'], activeJigsawTheme:'default',
    hints:0, timeFreezes:0,
    lastDailyClaim:null, dailyStreak:0, transactions:[],
  }
}

// ─── Provider ───────────────────────────────────────────────────────────────
export function CoinProvider({ children }) {
  const [state, setState] = useState(() => {
    const saved = getJSON(StorageKeys.COINS)
    return saved ? { ...getDefaultCoinState(), ...saved } : getDefaultCoinState()
  })
  const [coinAnim, setCoinAnim] = useState(null)

  useEffect(() => { setJSON(StorageKeys.COINS, state) }, [state])

  const earnCoins = useCallback((amount, desc='') => {
    if (amount <= 0) return
    setCoinAnim({ amount, desc })
    setTimeout(() => setCoinAnim(null), 2000)
    setState(s => {
      const tx = { type:'earn', amount, desc, date:Date.now() }
      const txs = [tx, ...(s.transactions||[])].slice(0,20)
      return { ...s, balance:s.balance+amount, totalEarned:(s.totalEarned||0)+amount, transactions:txs }
    })
  }, [])

  const spendCoins = useCallback((amount, desc='') => {
    return new Promise((resolve) => {
      setState(s => {
        if (s.balance < amount) { resolve(false); return s }
        const tx = { type:'spend', amount, desc, date:Date.now() }
        const txs = [tx, ...(s.transactions||[])].slice(0,20)
        resolve(true)
        return { ...s, balance:s.balance-amount, totalSpent:(s.totalSpent||0)+amount, transactions:txs }
      })
    })
  }, [])

  // Generic buy cosmetic
  const buyCosmetic = useCallback(async (type, itemId) => {
    const catalog = { packs:ICON_PACKS, skins:SNAKE_SKINS, tileThemes:TILE_THEMES, highlights:HIGHLIGHT_PACKS, ships:SHIP_CATALOG, hangmanThemes:HANGMAN_THEMES, tubeThemes:TUBE_THEMES, sudokuThemes:SUDOKU_THEMES, jigsawThemes:JIGSAW_THEMES }
    const ownedKey = { packs:'ownedPacks', skins:'ownedSkins', tileThemes:'ownedTileThemes', highlights:'ownedHighlights', ships:'ownedShips', hangmanThemes:'ownedHangmanThemes', tubeThemes:'ownedTubeThemes', sudokuThemes:'ownedSudokuThemes', jigsawThemes:'ownedJigsawThemes' }
    const items = catalog[type]; const key = ownedKey[type]
    if (!items||!key) return { success:false, reason:'Tipe tidak valid' }
    const item = items.find(i => i.id === itemId)
    if (!item) return { success:false, reason:'Item tidak ditemukan' }
    if ((state[key]||[]).includes(itemId)) return { success:false, reason:'Sudah dimiliki' }
    if (state.balance < item.price) return { success:false, reason:'Coin tidak cukup' }
    const ok = await spendCoins(item.price, `Beli ${item.name}`)
    if (ok) { setState(s => ({ ...s, [key]:[...(s[key]||[]), itemId] })); return { success:true } }
    return { success:false, reason:'Gagal membeli' }
  }, [state, spendCoins])

  const buyPack = useCallback((packId) => buyCosmetic('packs', packId), [buyCosmetic])

  const equipCosmetic = useCallback((type, itemId) => {
    const ownedKey  = { packs:'ownedPacks', skins:'ownedSkins', tileThemes:'ownedTileThemes', highlights:'ownedHighlights', ships:'ownedShips', hangmanThemes:'ownedHangmanThemes', tubeThemes:'ownedTubeThemes', sudokuThemes:'ownedSudokuThemes', jigsawThemes:'ownedJigsawThemes' }
    const activeKey = { packs:'activePack', skins:'activeSkin', tileThemes:'activeTileTheme', highlights:'activeHighlight', ships:'activeShip', hangmanThemes:'activeHangmanTheme', tubeThemes:'activeTubeTheme', sudokuThemes:'activeSudokuTheme', jigsawThemes:'activeJigsawTheme' }
    const key = ownedKey[type]; const aKey = activeKey[type]
    if (!key||!aKey) return
    if (!(state[key]||[]).includes(itemId)) return
    setState(s => ({ ...s, [aKey]:itemId }))
  }, [state])

  const setActivePack = useCallback((packId) => equipCosmetic('packs', packId), [equipCosmetic])

  const buyConsumable = useCallback(async (consumableId) => {
    const item = CONSUMABLES.find(c => c.id === consumableId)
    if (!item) return { success:false, reason:'Item tidak ditemukan' }
    if (state.balance < item.price) return { success:false, reason:'Coin tidak cukup' }
    const ok = await spendCoins(item.price, `Beli ${item.name}`)
    if (ok) {
      setState(s => {
        if (consumableId === 'extra-hints') return { ...s, hints:(s.hints||0)+item.amount }
        if (consumableId === 'time-freeze') return { ...s, timeFreezes:(s.timeFreezes||0)+item.amount }
        return s
      })
      return { success:true }
    }
    return { success:false, reason:'Gagal membeli' }
  }, [state.balance, spendCoins])

  const useHint = useCallback(() => {
    if ((state.hints||0) <= 0) return false
    setState(s => ({ ...s, hints:(s.hints||0)-1 })); return true
  }, [state.hints])

  const useTimeFreeze = useCallback(() => {
    if ((state.timeFreezes||0) <= 0) return false
    setState(s => ({ ...s, timeFreezes:(s.timeFreezes||0)-1 })); return true
  }, [state.timeFreezes])

  const claimDaily = useCallback(() => {
    const today = new Date().toDateString()
    if (state.lastDailyClaim === today) return { success:false, reason:'Sudah diklaim hari ini' }
    const yesterday = new Date(Date.now()-86400000).toDateString()
    let newStreak = state.lastDailyClaim === yesterday ? (state.dailyStreak||0)+1 : 1
    if (newStreak > 7) newStreak = 1
    const reward = COIN_REWARDS.dailyLogin[Math.min(newStreak-1, COIN_REWARDS.dailyLogin.length-1)]
    setState(s => ({ ...s, lastDailyClaim:today, dailyStreak:newStreak }))
    earnCoins(reward, `Login harian (hari ke-${newStreak})`)
    return { success:true, amount:reward, streak:newStreak }
  }, [state.lastDailyClaim, state.dailyStreak, earnCoins])

  const isDailyClaimable = state.lastDailyClaim !== new Date().toDateString()

  const getActiveIcons = useCallback(() => {
    const pack = ICON_PACKS.find(p => p.id === state.activePack)
    return pack ? pack.icons : ICON_PACKS[0].icons
  }, [state.activePack])

  const getActiveSkin = useCallback(() => {
    const s = SNAKE_SKINS.find(sk => sk.id === state.activeSkin)
    return s ? s.skin : SNAKE_SKINS[0].skin
  }, [state.activeSkin])

  const getActiveTileColors = useCallback(() => {
    const t = TILE_THEMES.find(th => th.id === state.activeTileTheme)
    return t ? t.colors : TILE_THEMES[0].colors
  }, [state.activeTileTheme])

  const getActiveHighlightColors = useCallback(() => {
    const p = HIGHLIGHT_PACKS.find(h => h.id === state.activeHighlight)
    return p ? p.colors : HIGHLIGHT_PACKS[0].colors
  }, [state.activeHighlight])

  const getActiveShip = useCallback(() => {
    const ship = SHIP_CATALOG.find(s => s.id === state.activeShip)
    return ship || SHIP_CATALOG[0]
  }, [state.activeShip])

  const getActiveHangmanTheme = useCallback(() => {
    const t = HANGMAN_THEMES.find(h => h.id === state.activeHangmanTheme)
    return t ? t.style : HANGMAN_THEMES[0].style
  }, [state.activeHangmanTheme])

  const getActiveTubeTheme = useCallback(() => {
    const t = TUBE_THEMES.find(h => h.id === state.activeTubeTheme)
    return t ? t.style : TUBE_THEMES[0].style
  }, [state.activeTubeTheme])

  const getActiveSudokuTheme = useCallback(() => {
    const t = SUDOKU_THEMES.find(h => h.id === state.activeSudokuTheme)
    return t ? t.style : SUDOKU_THEMES[0].style
  }, [state.activeSudokuTheme])

  const getActiveJigsawTheme = useCallback(() => {
    const t = JIGSAW_THEMES.find(h => h.id === state.activeJigsawTheme)
    return t ? t.style : JIGSAW_THEMES[0].style
  }, [state.activeJigsawTheme])

  return (
    <CoinContext.Provider value={{
      coins:state.balance, totalEarned:state.totalEarned, totalSpent:state.totalSpent,
      ownedPacks:state.ownedPacks||[], activePack:state.activePack,
      ownedSkins:state.ownedSkins||[], activeSkin:state.activeSkin,
      ownedTileThemes:state.ownedTileThemes||[], activeTileTheme:state.activeTileTheme,
      ownedHighlights:state.ownedHighlights||[], activeHighlight:state.activeHighlight,
      ownedShips:state.ownedShips||[], activeShip:state.activeShip,
      ownedHangmanThemes:state.ownedHangmanThemes||[], activeHangmanTheme:state.activeHangmanTheme,
      ownedTubeThemes:state.ownedTubeThemes||[], activeTubeTheme:state.activeTubeTheme,
      ownedSudokuThemes:state.ownedSudokuThemes||[], activeSudokuTheme:state.activeSudokuTheme,
      ownedJigsawThemes:state.ownedJigsawThemes||[], activeJigsawTheme:state.activeJigsawTheme,
      hints:state.hints||0, timeFreezes:state.timeFreezes||0,
      dailyStreak:state.dailyStreak, transactions:state.transactions||[],
      isDailyClaimable, coinAnim,
      earnCoins, spendCoins, buyPack, buyCosmetic, equipCosmetic,
      buyConsumable, useHint, useTimeFreeze,
      setActivePack, claimDaily,
      getActiveIcons, getActiveSkin, getActiveTileColors, getActiveHighlightColors, getActiveShip,
      getActiveHangmanTheme, getActiveTubeTheme, getActiveSudokuTheme, getActiveJigsawTheme,
    }}>
      {children}
    </CoinContext.Provider>
  )
}

export function useCoins() { return useContext(CoinContext) }
