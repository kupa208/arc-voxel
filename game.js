/* Arc Voxel Survivors: Endless Overdrive — Hardcore 3D Endless Loop + Leaderboard + Arc L1 GameFi.
 * Endless scaling waves, telegraphed Charger Bulls, ranged Void Casters, bullet-hell Bosses,
 * 5 Heroes, 1-of-3 roguelite upgrades, and prominent Live Leaderboard on Title & Game Over cards. */
(function () {
  'use strict';

  var GAME = window.GAME || {};
  var canvas = document.getElementById('game');
  var parentWindow = window.parent && window.parent !== window ? window.parent : null;

  function post(message) {
    if (!parentWindow) return;
    message.source = 'dsh-game-studio';
    try { parentWindow.postMessage(message, '*'); } catch (e) { /* host gone */ }
  }
  function reportError(text) { post({ type: 'error', message: String(text).slice(0, 300) }); }
  window.addEventListener('error', function (event) { reportError(event.message || event.error || 'error'); });
  window.addEventListener('unhandledrejection', function (event) {
    var reason = event.reason;
    reportError((reason && reason.message) || reason || 'unhandled rejection');
  });

  /* 1. HERO ROSTER (8 Arc Viet Nam Contributors) */
  var HEROES = [
    {
      id: 'toan_nhu',
      short: 'Toàn Nhữ',
      nameEn: 'Toàn Nhữ · Technical Speaker',
      nameVi: 'Toàn Nhữ · Technical Speaker',
      tagEn: 'Dark Tee & Glasses · Arc Core Fireballs (4 HP)',
      tagVi: 'Kính gọng đen · Áo thun xanh than · Cầu lửa Arc Core (4 HP)',
      weaponId: 'dragon',
      hp: 4,
      speedMult: 1.0,
      magnet: 3.5,
      dashCd: 2.2,
      color: '#ff5c38',
      boxes: [
        [-1.1, 1, -0.8, 1.1, 2, 1.1, '#0f172a'], [1.1, 1, -0.8, 1.1, 2, 1.1, '#0f172a'],
        [0, 3.1, 0, 3.8, 2.7, 3.4, '#1e293b'], [0, 6.1, 0.2, 3.8, 3.2, 3.4, '#f8cfb0'],
        [2.4, 2.1, 1.4, 0.9, 0.9, 1.1, '#ff5c38', true],
      ],
    },
    {
      id: 'xuan_hai',
      short: 'Xuân Hải',
      nameEn: 'Xuân Hải · Technical Speaker',
      nameVi: 'Xuân Hải · Technical Speaker',
      tagEn: 'White Dress Shirt & Wire Glasses · Chain Lightning (3 HP)',
      tagVi: 'Kính mảnh vàng · Sơ mi trắng · Sét chuyền tốc độ (3 HP)',
      weaponId: 'lightning',
      hp: 3,
      speedMult: 1.24,
      magnet: 3.8,
      dashCd: 1.5,
      color: '#38bdf8',
      boxes: [
        [-1.0, 1, -0.7, 1.0, 2, 1.0, '#1e293b'], [1.0, 1, -0.7, 1.0, 2, 1.0, '#1e293b'],
        [0, 3.1, 0, 3.4, 2.7, 3.2, '#ffffff'], [0, 6.1, 0.2, 3.6, 3.1, 3.3, '#ffdec6'],
        [2.2, 2.1, 1.4, 0.85, 0.85, 1.1, '#38f2ff', true],
      ],
    },
    {
      id: 'elias_j',
      short: 'Elias J',
      nameEn: 'Elias J · Technical Speaker',
      nameVi: 'Elias J · Technical Speaker',
      tagEn: 'Royal Blue Polo · Homing Arc Bolts & Wide Magnet (4 HP)',
      tagVi: 'Tóc rẽ ngôi · Polo xanh dương · Tên bám đích (4 HP)',
      weaponId: 'coloa',
      hp: 4,
      speedMult: 1.06,
      magnet: 6.2,
      dashCd: 2.0,
      color: '#4ade80',
      boxes: [
        [-1.1, 1, -0.8, 1.1, 2, 1.1, '#0f172a'], [1.1, 1, -0.8, 1.1, 2, 1.1, '#0f172a'],
        [0, 3.1, 0, 3.7, 2.7, 3.4, '#1d4ed8'], [0, 6.1, 0.2, 3.7, 3.2, 3.3, '#ffd6b6'],
      ],
    },
    {
      id: 'lily_hoang',
      short: 'Lily Hoang',
      nameEn: 'Lily Hoang · Event Organizer',
      nameVi: 'Lily Hoang · Event Organizer',
      tagEn: 'Ivory Lace Top & Stage Mic · Sonic Shurikens (3 HP)',
      tagVi: 'Tóc dài nâu · Áo ren kem cầm Mic · Phi tiêu sóng âm (3 HP)',
      weaponId: 'shuriken',
      hp: 3,
      speedMult: 1.14,
      magnet: 4.0,
      dashCd: 1.85,
      color: '#fb923c',
      boxes: [
        [-1.0, 1, -0.7, 1.0, 2, 1.0, '#1e1b4b'], [1.0, 1, -0.7, 1.0, 2, 1.0, '#1e1b4b'],
        [0, 3.1, 0, 3.6, 2.7, 3.3, '#faf0e2'], [0, 6.1, 0.2, 3.6, 3.1, 3.3, '#ffe6d8'],
        [2.3, 2.1, 1.4, 0.9, 0.9, 1.1, '#fb923c', true],
      ],
    },
    {
      id: 'kien_trinh',
      short: 'Kien Trinh',
      nameEn: 'Kien Trinh · Event Organizer',
      nameVi: 'Kien Trinh · Event Organizer',
      tagEn: 'Undercut Black Polo & Mic · Armored Drill (6 HP)',
      tagVi: 'Tóc undercut · Polo đen cầm Mic · Mũi khoan giáp dày (6 HP)',
      weaponId: 'drill',
      hp: 6,
      speedMult: 0.95,
      magnet: 3.4,
      dashCd: 2.1,
      color: '#f43f5e',
      boxes: [
        [-1.3, 1, -0.8, 1.3, 2, 1.3, '#1f2937'], [1.3, 1, -0.8, 1.3, 2, 1.3, '#1f2937'],
        [0, 3.2, 0, 4.6, 2.9, 3.8, '#111827'], [0, 6.3, 0.2, 4.0, 3.3, 3.5, '#f5ceb0'],
        [2.8, 2.2, 0.9, 1.05, 0.7, 1.05, '#f43f5e', true],
      ],
    },
    {
      id: 'hieu_nguyen',
      short: 'Hieu Nguyen',
      nameEn: 'Hieu Nguyen · Chapter Manager',
      nameVi: 'Hieu Nguyen · Chapter Manager',
      tagEn: 'Forest Green Polo & Wire Glasses · Sonic Pulse: close-range shockwave that pushes mobs back (4 HP)',
      tagVi: 'Kính gọng mảnh · Polo xanh lá · Sóng âm cận chiến đẩy lùi quái (4 HP)',
      weaponId: 'pulse',
      hp: 4,
      speedMult: 1.04,
      magnet: 4.2,
      dashCd: 1.9,
      color: '#22c55e',
      boxes: [
        [-1.0, 1, -0.7, 1.0, 2, 1.0, '#1f2937'], [1.0, 1, -0.7, 1.0, 2, 1.0, '#1f2937'],
        [0, 3.1, 0, 3.6, 2.7, 3.3, '#15803d'], [0, 6.1, 0.2, 3.6, 3.1, 3.3, '#f5d0b0'],
        [2.3, 2.1, 1.4, 0.9, 0.9, 1.1, '#86efac', true],
      ],
    },
    {
      id: 'quoc_vuong',
      short: 'Quoc Vuong',
      nameEn: 'Quoc Vuong · Chapter Manager',
      nameVi: 'Quoc Vuong · Chapter Manager',
      tagEn: 'Brown Polo & Dark Frames · Returning Boomerang that hits twice (5 HP)',
      tagVi: 'Kính gọng đen · Polo nâu · Boomerang bay đi bay về, trúng hai lần (5 HP)',
      weaponId: 'boomerang',
      hp: 5,
      speedMult: 0.98,
      magnet: 3.7,
      dashCd: 2.1,
      color: '#d97706',
      boxes: [
        [-1.1, 1, -0.8, 1.1, 2, 1.1, '#1c1917'], [1.1, 1, -0.8, 1.1, 2, 1.1, '#1c1917'],
        [0, 3.1, 0, 3.9, 2.8, 3.4, '#5b3a2e'], [0, 6.1, 0.2, 3.8, 3.2, 3.4, '#f3c9a6'],
        [2.5, 2.1, 1.4, 0.95, 0.95, 1.1, '#fbbf24', true],
      ],
    },
    {
      id: 'miley_nguyen',
      short: 'Miley Nguyen',
      nameEn: 'Miley Nguyen · Chapter Manager',
      nameVi: 'Miley Nguyen · Chapter Manager',
      tagEn: 'Striped Shirt & Long Dark Hair · Proximity Mines for kiting, fast dash (3 HP)',
      tagVi: 'Tóc dài đen · Áo sơ mi kẻ sọc · Mìn cảm biến để thả khi chạy, lướt nhanh (3 HP)',
      weaponId: 'mines',
      hp: 3,
      speedMult: 1.18,
      magnet: 5.0,
      dashCd: 1.7,
      color: '#a78bfa',
      boxes: [
        [-1.0, 1, -0.7, 1.0, 2, 1.0, '#1e293b'], [1.0, 1, -0.7, 1.0, 2, 1.0, '#1e293b'],
        [0, 3.1, 0, 3.4, 2.7, 3.2, '#f1f5f9'], [0, 6.1, 0.2, 3.6, 3.1, 3.3, '#ffe3d1'],
        [2.2, 2.1, 1.4, 0.85, 0.85, 1.1, '#c4b5fd', true],
      ],
    },
  ];
  var selectedHeroIdx = 0;

  /* 1B. 12 ARC GLOBAL COMMUNITY MAPS (Themed Landscapes, Monsters & Unique Bosses) */
  var MAPS = [
    {
      id: 'vietnam', shape: 'cross', style: 'pagoda', seed: 11,
      nameEn: '🇻🇳 Vietnam', nameVi: '🇻🇳 Vietnam',
      skyTop: '#061a14', skyBottom: '#134e3a', fog: '#0b3024',
      grass: '#15803d', dirt: '#44403c', sand: '#dc2626', water: '#064e3b', waterGlow: false,
      pillarBody: '#78716c', pillarMid: '#a8a29e', glowA: '#fbbf24', glowB: '#ef4444',
      stoneA: '#57534e', stoneB: '#78716c', hemiSky: '#fef08a', hemiGnd: '#14532d', sun: '#fff3d6',
      mobs: {
        sShape: 'serpent', cShape: 'buffalo', mShape: 'lantern',
        namesVi: 'Thủy Quái · Trâu Vàng · Đèn Lồng', namesEn: 'Jade Serpent · Golden Buffalo · Palace Lantern',
        impBody: '#065f46', impWing: '#10b981', impCore: '#fbbf24',
        bullBody: '#92400e', bullArmor: '#f59e0b', bullGlow: '#fef08a',
        casterRobe: '#dc2626', casterGlow: '#fde047'
      },
      boss: { nameVi: '🐢 Kim Quy Thần Vương', nameEn: '🐢 Dragon Turtle Sovereign', crown: 'turtle', body: '#065f46', armor: '#d97706', glow: '#fbbf24', visor: '#fef08a', pattern: 'doubleRing' },
    },
    {
      id: 'singapore', shape: 'island', style: 'supertree', seed: 19,
      nameEn: '🇸🇬 Singapore', nameVi: '🇸🇬 Singapore',
      skyTop: '#041226', skyBottom: '#0c4a6e', fog: '#082f49',
      grass: '#0d9488', dirt: '#1e293b', sand: '#94a3b8', water: '#0369a1', waterGlow: false,
      pillarBody: '#334155', pillarMid: '#64748b', glowA: '#38f2ff', glowB: '#e879f9',
      stoneA: '#475569', stoneB: '#94a3b8', hemiSky: '#7dd3fc', hemiGnd: '#0f172a', sun: '#e0f2fe',
      mobs: {
        sShape: 'drone', cShape: 'lion', mShape: 'mandala',
        namesVi: 'Holo-Drone · Bạch Sư Merlion · Lan Cyber', namesEn: 'Holo-Drone · Silver Merlion · Cyber Orchid',
        impBody: '#0f172a', impWing: '#0284c7', impCore: '#38f2ff',
        bullBody: '#cbd5e1', bullArmor: '#38bdf8', bullGlow: '#e0f2fe',
        casterRobe: '#6b21a8', casterGlow: '#e879f9'
      },
      boss: { nameVi: '🦁 Merlion Hộ Quốc', nameEn: '🦁 Cyber Merlion Titan', crown: 'lion', body: '#e2e8f0', armor: '#0284c7', glow: '#38f2ff', visor: '#fbbf24', pattern: 'spread' },
    },
    {
      id: 'korea', shape: 'glacier', style: 'hanok', seed: 27,
      nameEn: '🇰🇷 Korea', nameVi: '🇰🇷 Korea',
      skyTop: '#120826', skyBottom: '#3b155e', fog: '#230d3d',
      grass: '#334155', dirt: '#1e293b', sand: '#cbd5e1', water: '#1e1b4b', waterGlow: false,
      pillarBody: '#991b1b', pillarMid: '#dc2626', glowA: '#2dd4bf', glowB: '#fb7185',
      stoneA: '#475569', stoneB: '#64748b', hemiSky: '#e9d5ff', hemiGnd: '#1e1b4b', sun: '#fae8ff',
      mobs: {
        sShape: 'oni', cShape: 'lion', mShape: 'lantern',
        namesVi: 'Quỷ Dokkaebi · Thú Haechi · Đèn Talchum', namesEn: 'Dokkaebi Goblin · Crimson Haechi · Talchum Lantern',
        impBody: '#312e81', impWing: '#6366f1', impCore: '#2dd4bf',
        bullBody: '#9f1239', bullArmor: '#fb7185', bullGlow: '#2dd4bf',
        casterRobe: '#be123c', casterGlow: '#2dd4bf'
      },
      boss: { nameVi: '👹 Haechi Seoul', nameEn: '👹 Neon Haechi Emperor', crown: 'horns', body: '#312e81', armor: '#e11d48', glow: '#2dd4bf', visor: '#fb7185', pattern: 'dashNova' },
    },
    {
      id: 'uae', shape: 'island', style: 'spire', seed: 35,
      nameEn: '🇦🇪 UAE', nameVi: '🇦🇪 UAE',
      skyTop: '#1a0f04', skyBottom: '#6b3e11', fog: '#422006',
      grass: '#d97706', dirt: '#78350f', sand: '#fde68a', water: '#0d9488', waterGlow: false,
      pillarBody: '#94a3b8', pillarMid: '#e2e8f0', glowA: '#fbbf24', glowB: '#38f2ff',
      stoneA: '#b45309', stoneB: '#d97706', hemiSky: '#fef3c7', hemiGnd: '#451a03', sun: '#fffbeb',
      mobs: {
        sShape: 'scarab', cShape: 'scorpion', mShape: 'pyramid',
        namesVi: 'Bọ Hung Vàng · Bò Cạp Cát · Kim Tự Tháp', namesEn: 'Gold Scarab · Dune Scorpion · Sun Obelisk',
        impBody: '#78350f', impWing: '#f59e0b', impCore: '#38f2ff',
        bullBody: '#b45309', bullArmor: '#fbbf24', bullGlow: '#ef4444',
        casterRobe: '#d97706', casterGlow: '#38f2ff'
      },
      boss: { nameVi: '☀️ Solar Pharaoh Titan', nameEn: '☀️ Solar Pharaoh Titan', crown: 'sun', body: '#451a03', armor: '#fbbf24', glow: '#38f2ff', visor: '#fef08a', pattern: 'spiral' },
    },
    {
      id: 'india', shape: 'cross', style: 'stupa', seed: 43,
      nameEn: '🇮🇳 India', nameVi: '🇮🇳 India',
      skyTop: '#1f081a', skyBottom: '#6b1d45', fog: '#3d0f28',
      grass: '#c2410c', dirt: '#7c2d12', sand: '#fed7aa', water: '#4c1d95', waterGlow: false,
      pillarBody: '#db2777', pillarMid: '#f59e0b', glowA: '#fde047', glowB: '#f472b6',
      stoneA: '#9d174d', stoneB: '#fb923c', hemiSky: '#fed7aa', hemiGnd: '#4c1d95', sun: '#ffedd5',
      mobs: {
        sShape: 'bird', cShape: 'elephant', mShape: 'mandala',
        namesVi: 'Chim Garuda · Voi Chiến Ngà Trắng · Luân Xa', namesEn: 'Garuda Bird · Tusked War Elephant · Chakra Wheel',
        impBody: '#9d174d', impWing: '#f472b6', impCore: '#fde047',
        bullBody: '#64748b', bullArmor: '#db2777', bullGlow: '#fde047',
        casterRobe: '#f59e0b', casterGlow: '#f472b6'
      },
      boss: { nameVi: '🐘 Maharaja Mech Titan', nameEn: '🐘 Maharaja Mech Titan', crown: 'tusks', body: '#831843', armor: '#f59e0b', glow: '#fde047', visor: '#fb7185', pattern: 'doubleRing' },
    },
    {
      id: 'france', shape: 'glacier', style: 'eiffel', seed: 51,
      nameEn: '🇫🇷 France', nameVi: '🇫🇷 France',
      skyTop: '#081029', skyBottom: '#1e3a8a', fog: '#112257',
      grass: '#475569', dirt: '#334155', sand: '#cbd5e1', water: '#1e40af', waterGlow: false,
      pillarBody: '#78350f', pillarMid: '#d97706', glowA: '#fef08a', glowB: '#60a5fa',
      stoneA: '#64748b', stoneB: '#94a3b8', hemiSky: '#dbeafe', hemiGnd: '#1e293b', sun: '#eff6ff',
      mobs: {
        sShape: 'bird', cShape: 'knight', mShape: 'clock',
        namesVi: 'Thú Đá Gargoyle · Hiệp Sĩ Kị Thương · Tháp Đồng Hồ', namesEn: 'Stone Gargoyle · Lancer Knight · Clockwork Sentinel',
        impBody: '#334155', impWing: '#94a3b8', impCore: '#fef08a',
        bullBody: '#1e3a8a', bullArmor: '#e2e8f0', bullGlow: '#60a5fa',
        casterRobe: '#b45309', casterGlow: '#fef08a'
      },
      boss: { nameVi: '⚜️ Arc Lumière Colossus', nameEn: '⚜️ Arc Lumière Colossus', crown: 'tower', body: '#1e293b', armor: '#d97706', glow: '#fef08a', visor: '#60a5fa', pattern: 'spiral' },
    },
    {
      id: 'brasil', shape: 'caldera', style: 'jungle', seed: 59,
      nameEn: '🇧🇷 Brasil', nameVi: '🇧🇷 Brasil',
      skyTop: '#031d13', skyBottom: '#0f5c3e', fog: '#073824',
      grass: '#16a34a', dirt: '#3f2e21', sand: '#fde047', water: '#0e7490', waterGlow: false,
      pillarBody: '#5c3a21', pillarMid: '#15803d', glowA: '#facc15', glowB: '#4ade80',
      stoneA: '#3f6212', stoneB: '#84cc16', hemiSky: '#d9f99d', hemiGnd: '#14532d', sun: '#fef9c3',
      mobs: {
        sShape: 'serpent', cShape: 'tiger', mShape: 'totem',
        namesVi: 'Rắn Lông Vũ · Báo Đốm Jaguar · Mặt Nạ Carnaval', namesEn: 'Feathered Viper · Spotted Jaguar · Carnival Totem',
        impBody: '#15803d', impWing: '#facc15', impCore: '#4ade80',
        bullBody: '#eab308', bullArmor: '#18181b', bullGlow: '#4ade80',
        casterRobe: '#be123c', casterGlow: '#facc15'
      },
      boss: { nameVi: '🐆 Jaguar Chúa Rừng', nameEn: '🐆 Jaguar Sun Warlord', crown: 'horns', body: '#14532d', armor: '#eab308', glow: '#4ade80', visor: '#facc15', pattern: 'dashNova' },
    },
    {
      id: 'argentina', shape: 'glacier', style: 'crystal', seed: 67,
      nameEn: '🇦🇷 Argentina', nameVi: '🇦🇷 Argentina',
      skyTop: '#05142e', skyBottom: '#0c4a6e', fog: '#082f49',
      grass: '#38bdf8', dirt: '#1e3a5f', sand: '#e0f2fe', water: '#0284c7', waterGlow: false,
      pillarBody: '#0369a1', pillarMid: '#38bdf8', glowA: '#f0f9ff', glowB: '#7dd3fc',
      stoneA: '#60a5fa', stoneB: '#bae6fd', hemiSky: '#e0f2fe', hemiGnd: '#0c4a6e', sun: '#f8fafc',
      mobs: {
        sShape: 'bird', cShape: 'icebeast', mShape: 'pyramid',
        namesVi: 'Kền Kền Băng · Quái Thú Gai Tuyết · Tinh Thể Andes', namesEn: 'Frost Condor · Spiked Ice Beast · Glacial Prism',
        impBody: '#0369a1', impWing: '#bae6fd', impCore: '#ffffff',
        bullBody: '#1e3a5f', bullArmor: '#e0f2fe', bullGlow: '#38f2ff',
        casterRobe: '#0284c7', casterGlow: '#e0f2fe'
      },
      boss: { nameVi: '❄️ Vua Kền Kền Andes', nameEn: '❄️ Andean Condor King', crown: 'wings', body: '#0c4a6e', armor: '#e0f2fe', glow: '#38f2ff', visor: '#ffffff', pattern: 'spread' },
    },
    {
      id: 'turkiye', shape: 'caldera', style: 'balloon', seed: 75,
      nameEn: '🇹🇷 Türkiye', nameVi: '🇹🇷 Türkiye',
      skyTop: '#1c0609', skyBottom: '#61181c', fog: '#3b0c10',
      grass: '#b45309', dirt: '#451a03', sand: '#fed7aa', water: '#0f766e', waterGlow: true,
      pillarBody: '#78350f', pillarMid: '#c2410c', glowA: '#fb923c', glowB: '#2dd4bf',
      stoneA: '#7c2d12', stoneB: '#c2410c', hemiSky: '#ffedd5', hemiGnd: '#450a0a', sun: '#fff7ed',
      mobs: {
        sShape: 'scarab', cShape: 'icebeast', mShape: 'lamp',
        namesVi: 'Chim Lửa Roc · Bò Mộng Nham Thạch · Đèn Thần Djinn', namesEn: 'Ember Roc · Magma Minotaur · Ottoman Djinn Lamp',
        impBody: '#7f1d1d', impWing: '#f97316', impCore: '#fef08a',
        bullBody: '#450a0a', bullArmor: '#ea580c', bullGlow: '#fbbf24',
        casterRobe: '#0f766e', casterGlow: '#fb923c'
      },
      boss: { nameVi: '🔥 Ottoman Ifrit Lord', nameEn: '🔥 Ottoman Ifrit Lord', crown: 'djinn', body: '#450a0a', armor: '#ea580c', glow: '#fbbf24', visor: '#2dd4bf', pattern: 'spiral' },
    },
    {
      id: 'bangladesh', shape: 'island', style: 'monsoon', seed: 83,
      nameEn: '🇧🇩 Bangladesh', nameVi: '🇧🇩 Bangladesh',
      skyTop: '#031c15', skyBottom: '#065f46', fog: '#043b2c',
      grass: '#059669', dirt: '#3f2e21', sand: '#b91c1c', water: '#0e7490', waterGlow: false,
      pillarBody: '#991b1b', pillarMid: '#15803d', glowA: '#34d399', glowB: '#f87171',
      stoneA: '#7f1d1d', stoneB: '#065f46', hemiSky: '#a7f3d0', hemiGnd: '#064e3b', sun: '#ecfdf5',
      mobs: {
        sShape: 'bird', cShape: 'tiger', mShape: 'totem',
        namesVi: 'Ưng Sông Hằng · Hổ Vằn Bengal · Thần Bão Gió Mùa', namesEn: 'Delta Hawk · Striped Bengal Tiger · Monsoon Spirit',
        impBody: '#047857', impWing: '#34d399', impCore: '#f87171',
        bullBody: '#f97316', bullArmor: '#18181b', bullGlow: '#fef08a',
        casterRobe: '#0284c7', casterGlow: '#34d399'
      },
      boss: { nameVi: '🐯 Bengal Storm Titan', nameEn: '🐯 Bengal Storm Titan', crown: 'stripes', body: '#7c2d12', armor: '#16a34a', glow: '#fb923c', visor: '#fef08a', pattern: 'dashNova' },
    },
    {
      id: 'nigeria', shape: 'caldera', style: 'cyberpillar', seed: 91,
      nameEn: '🇳🇬 Nigeria', nameVi: '🇳🇬 Nigeria',
      skyTop: '#091c12', skyBottom: '#14532d', fog: '#0c331c',
      grass: '#16a34a', dirt: '#3f2718', sand: '#d97706', water: '#1e1b4b', waterGlow: false,
      pillarBody: '#1e293b', pillarMid: '#16a34a', glowA: '#4ade80', glowB: '#fbbf24',
      stoneA: '#78350f', stoneB: '#15803d', hemiSky: '#bbf7d0', hemiGnd: '#14532d', sun: '#f0fdf4',
      mobs: {
        sShape: 'oni', cShape: 'rhino', mShape: 'totem',
        namesVi: 'Mặt Nạ Đồng · Tê Giác Thép · Trống Griot', namesEn: 'Bronze Spirit Mask · Armored Rhino · Neon Griot Drum',
        impBody: '#92400e', impWing: '#22c55e', impCore: '#4ade80',
        bullBody: '#57534e', bullArmor: '#16a34a', bullGlow: '#fbbf24',
        casterRobe: '#14532d', casterGlow: '#4ade80'
      },
      boss: { nameVi: '🦏 Bronze Rhino Overlord', nameEn: '🦏 Bronze Rhino Overlord', crown: 'rhino', body: '#451a03', armor: '#16a34a', glow: '#4ade80', visor: '#fbbf24', pattern: 'dashNova' },
    },
    {
      id: 'kenya', shape: 'island', style: 'acacia', seed: 99,
      nameEn: '🇰🇪 Kenya', nameVi: '🇰🇪 Kenya',
      skyTop: '#1c1205', skyBottom: '#653e0c', fog: '#3d2506',
      grass: '#65a30d', dirt: '#451a03', sand: '#eab308', water: '#0f766e', waterGlow: false,
      pillarBody: '#5c3a21', pillarMid: '#65a30d', glowA: '#fde047', glowB: '#ef4444',
      stoneA: '#57534e', stoneB: '#a16207', hemiSky: '#fef08a', hemiGnd: '#422006', sun: '#fefce8',
      mobs: {
        sShape: 'bird', cShape: 'lion', mShape: 'totem',
        namesVi: 'Đại Bàng Rift · Sư Tử Bờm Đỏ · Thầy Tế Maasai', namesEn: 'Savanna Eagle · Red-Mane Warlion · Maasai Shaman',
        impBody: '#4d7c0f', impWing: '#eab308', impCore: '#ef4444',
        bullBody: '#b45309', bullArmor: '#dc2626', bullGlow: '#fde047',
        casterRobe: '#991b1b', casterGlow: '#fde047'
      },
      boss: { nameVi: '🦁 Kilimanjaro Warlion', nameEn: '🦁 Kilimanjaro Warlion', crown: 'mane', body: '#78350f', armor: '#ef4444', glow: '#fde047', visor: '#ffffff', pattern: 'spread' },
    },
  ];
  var selectedMapIdx = 0;

  /* 1C. ENDLESS DIFFICULTY PROGRESSION TIERS */
  var THREAT_TIERS = [
    { minWave: 1, nameVi: 'Khởi Động', nameEn: 'Warmup', col: '#4ade80', hpBonus: 0, spdCap: 1.15, spawnFloor: 0.72, maxMobs: 28, eliteChance: 0, casterRatio: 0.18, chargerRatio: 0.28 },
    { minWave: 3, nameVi: 'Áp Lực', nameEn: 'Pressure', col: '#facc15', hpBonus: 0.35, spdCap: 1.28, spawnFloor: 0.56, maxMobs: 34, eliteChance: 0.08, casterRatio: 0.22, chargerRatio: 0.34 },
    { minWave: 5, nameVi: 'Cuồng Nộ', nameEn: 'Frenzy', col: '#fb923c', hpBonus: 0.85, spdCap: 1.42, spawnFloor: 0.42, maxMobs: 40, eliteChance: 0.16, casterRatio: 0.28, chargerRatio: 0.36 },
    { minWave: 8, nameVi: 'Quá Tải', nameEn: 'Overdrive', col: '#f43f5e', hpBonus: 1.6, spdCap: 1.56, spawnFloor: 0.32, maxMobs: 46, eliteChance: 0.22, casterRatio: 0.32, chargerRatio: 0.38 },
    { minWave: 11, nameVi: 'Vô Cực Omega', nameEn: 'Omega Abyss', col: '#e879f9', hpBonus: 2.4, spdCap: 1.68, spawnFloor: 0.24, maxMobs: 52, eliteChance: 0.28, casterRatio: 0.35, chargerRatio: 0.38 },
  ];
  function getThreatTier(w) {
    var chosen = THREAT_TIERS[0];
    for (var i = 0; i < THREAT_TIERS.length; i++) if (w >= THREAT_TIERS[i].minWave) chosen = THREAT_TIERS[i];
    return chosen;
  }

  var BENCHMARK_RIVALS = [
    { name: 'Arc Sovereign [NPC]', hero: 'Toàn Nhữ', score: 4500, wave: 9, kills: 165, source: 'npc' },
    { name: 'Cyber Valkyrie [NPC]', hero: 'Xuân Hải', score: 2400, wave: 6, kills: 92, source: 'npc' },
    { name: 'Stage Maestro [NPC]', hero: 'Lily Hoang', score: 1200, wave: 4, kills: 48, source: 'npc' },
    { name: 'Isle Challenger [NPC]', hero: 'Elias J', score: 500, wave: 2, kills: 22, source: 'npc' },
  ];

  /* 2. BILINGUAL I18N */
  var STRINGS = {
    en: {
      title: 'Arc Voxel Quest · Survive on Arc',
      subtitle: 'Survive ever stronger waves on Arc! Dodge charging bulls, weave through boss plasma, then save your best run onchain and climb the leaderboard.',
      chooseHero: 'Select Hero (Arc VN):',
      chooseMap: 'Arc Community Arena:',
      roadmapLabel: 'W1-2 Warmup → W3-4 Pressure → W5-7 Elites → W8+ Overdrive',
      nickPlaceholder: 'Callsign (e.g. AceVN)',
      startBtn: 'Enter the Arc Arena',
      badgeRoadmapTitle: '🏅 Badge roadmap',
      milestonesTitle: 'Side milestones',
      msRuns5: 'Persistent: save 5 runs', msRuns25: 'Veteran: save 25 runs', msRuns100: 'Unbreakable: save 100 runs',
      msGems500: 'Gem Hunter: collect 500 gems', msGems5000: 'Gem Tycoon: collect 5,000 gems',
      msCombo5: 'Combo x5: reach a x5 multiplier', msCombo10: 'Combo Master: reach the x10 multiplier',
      msStreak3: 'On a roll: a 3-day play streak', msStreak7: 'Weekly warrior: a 7-day play streak',
      badgeReq: 'Save a run of {n}+ points (about {g} in-game points)',
      badgeChampionReq: 'Win a daily season: finish first on the season leaderboard',
      badgeEarned: 'Earned',
      badgeNextGoal: 'Next goal: {tier} badge. {n} more points to go (about {g} in-game points).',
      badgeAllScore: 'You hold every score badge. Win a daily season to earn the Champion badge.',
      badgeFirstGoal: 'Goal: save one run of 300+ points (about 6,000 in-game points) to earn your first badge, Scout.',
      badgeTipsTitle: 'How to climb',
      badgeTips: [
        'Keep your combo alive: every 4 kills in a row raises the score multiplier, up to x10.',
        'Defeat bosses: each one is worth 300 base points before your multiplier.',
        'Pick up gems to level up and unlock stronger weapons.',
        'Buy upgrade NFTs in the shop to widen your item pickup range.',
        'Enter the daily season to fight for the Champion badge and the USDC prize pool.'
      ],
      featuresTitle: '🗺️ Arc Quest Board',
      boardDone: 'done',
      questNext: 'NEXT',
      qConnectT: 'Connect your wallet', qConnectD: 'Sign in with email or use any wallet. It unlocks every quest.',
      qPlayT: 'Play your first run', qPlayD: 'Survive the waves and rack up points.',
      qSaveT: 'Save a score onchain', qSaveD: 'Free gas. Earn ARCQ, and a Scout badge from 300 points.',
      qSeasonT: 'Enter the daily season', qSeasonD: 'Pay 1 USDC. The top 3 share the prize pool.',
      qDailyT: 'Finish a daily quest', qDailyD: 'Quests and streaks pay up to 80 ARCQ a day.',
      qHeroT: 'Buy an upgrade NFT', qHeroD: 'Each level widens your item pickup range.',
      surrenderBtn: '🏳️ End run', surrenderConfirm: 'Tap again to end',
      connectWalletShort: 'Connect Wallet',
      accountTitle: 'My Account',
      noWalletDetected: 'No browser wallet detected yet. Install MetaMask or Rabby in this browser, then reload the page.',
      noWalletInFrame: 'You are viewing the game inside a preview frame, and wallet extensions are often blocked there. If you already installed a wallet, open the game outside the frame, or connect from a phone wallet with WalletConnect (set WALLETCONNECT_PROJECT_ID).',
      detectAgain: 'Detect again',
      noWalletDetected: 'Chưa phát hiện ví nào trong trình duyệt này. Hãy cài MetaMask hoặc Rabby vào trình duyệt này rồi tải lại trang.',
      noWalletInFrame: 'Bạn đang xem game trong khung xem trước, nơi tiện ích ví thường bị chặn. Nếu đã cài ví mà vẫn không thấy, hãy mở game ngoài khung, hoặc kết nối bằng ví điện thoại qua WalletConnect (cần WALLETCONNECT_PROJECT_ID).',
      detectAgain: 'Dò lại',
      yourWallets: 'OTHER WALLETS',
      installedInBrowser: 'Installed in browser',
      installLink: 'Install',
      wcTitle: 'WalletConnect',
      wcDesc: 'Scan with a phone wallet',
      wcNeedsSetup: 'WalletConnect needs a Project ID: add WALLETCONNECT_PROJECT_ID to .env.local',
      connectTitle: 'Connect wallet',
      connectSub: 'Connect a wallet to play on Arc Testnet.',
      noBrowserWallet: 'No browser wallet found. Install MetaMask or Rabby, then reload the page.',
      walletLabel: 'Wallet',
      claimingWallet: 'Confirm the transaction in your wallet...',
      claimingPasskey: 'Confirm with your passkey (fingerprint, face or Windows Hello)...',
      passkeyTitle: 'Create a wallet with a passkey',
      passkeyNote: 'No extension, no seed phrase. Confirm every transaction with your fingerprint, face or Windows Hello. Gas is free.',
      passkeyNamePh: 'Wallet name (e.g. your nickname)',
      passkeyCreateBtn: 'Create my wallet',
      passkeyLoginBtn: 'Use an existing passkey',
      passkeyWorking: 'Waiting for your passkey',
      passkeySetup: 'Passkey wallets are not set up on this server yet. Add CIRCLE_CLIENT_KEY to .env.local and restart. In Circle Console, set the Client Key Allowed Domain and the Passkey Domain Name to exactly:',
      passkeyDomainErr: 'This passkey belongs to a different address than the game. In Circle Console, set the Passkey Domain Name to:',
      passkeyExists: 'That passkey already exists on this device. Press "Use an existing passkey" instead.',
      googleBtn: 'Continue with Google',
      googleOpening: 'Opening Google',
      googleFinishing: 'Finishing your Google sign-in',
      googleLabel: 'Google account',
      emailTitle: 'Sign in with email',
      emailNote: 'Use your Gmail or any email. Circle sends a one-time code, you set a PIN once, and your Arc wallet is created. Gas is free. Keep your PIN safe: nobody can recover it for you.',
      emailPh: 'you@gmail.com',
      emailSendBtn: 'Send me a code',
      emailEnterBtn: 'Enter the code',
      emailOtherBtn: 'Use another email',
      emailSending: 'Sending the code',
      emailSent: 'Code sent to {email}. Check your inbox and spam folder, then press "Enter the code".',
      emailWaitCode: 'Waiting for your code',
      emailWaitPin: 'Set your PIN in the Circle window',
      emailWaitWallet: 'Creating your wallet',
      emailBad: 'Enter a valid email address.',
      emailSetup: 'Email sign-in is not ready yet: the email provider (SMTP) still has to be set up in Circle Console.',
      emailSendFirst: 'Request a code first.',
      emailPending: 'Your wallet is still being created. Wait a moment and sign in again.',
      emailSigninAgain: 'Your email sign-in expired. Sign in with email again to approve transactions.',
      emailSigninBtn: 'Sign in again',
      emailErrExpired: 'That code expired. Request a new one.',
      emailErrWrong: 'That code is not correct. Try again.',
      emailErrLocked: 'Too many wrong codes. Request a new one.',
      emailErrRate: 'Too many requests. Wait a few minutes and try again.',
      emailErrSend: 'The email could not be sent. Try again in a moment.',
      emailErrPin: 'That PIN is not correct.',
      emailErrPinLocked: 'Your PIN is locked after too many wrong tries. Try again later.',
      emailLabel: 'Email',
      claimingEmail: 'Approve with your PIN in the Circle window...',
      emailGasNote: 'Gas is free for this wallet. You approve every transaction with your PIN. You only need USDC for the season entry fee. Send USDC to the address above (testnet faucet) to enter a season.',
      confirmTitle: 'Confirm transaction',
      confirmBtn: 'Confirm',
      rejectBtn: 'Cancel',
      confirmNetwork: 'Network',
      confirmGas: 'Gas fee',
      confirmGasFree: 'Free (sponsored)',
      confirmWallet: 'Your wallet',
      confirmEnter: 'Enter the daily season. Entry fee: {fee} USDC.',
      confirmBuy: 'Buy upgrade NFT level {lvl} ({name}) for {cost} ARCQ (burned). +{bonus}% pickup range.',
      confirmEquip: 'Use the level {lvl} NFT ({name}) colors on your hero.',
      confirmUnequip: 'Remove the NFT colors from your hero.',
      confirmClaim: 'Claim your prize for season #{season}, rank {rank}.',
      confirmRollover: 'Move the prize pool of empty season #{season} to the current season.',
      confirmSave: 'Save this run onchain: {points} points.',
      confirmGeneric: 'Send this transaction to the Arc Voxel contract.',
      emailLabel: 'Email',
      googleNote: 'Get a wallet with your Google account. You set a PIN, and you approve every transaction with it.',
      googleSetup: 'Email sign-in is not set up on this server yet. Add GOOGLE_CLIENT_ID to .env.local, restart the server, and allow this address as an Authorized JavaScript origin in Google Cloud:',
      creatingWallet: 'Creating your wallet... finish the PIN setup in the Circle window.',
      creatingWalletShort: 'Creating wallet',
      finishWalletHint: 'signed in. Finish creating your wallet.',
      finishWalletBtn: 'Create my wallet',
      walletRequired: 'Connect your wallet to play.',
      walletAddrLabel: 'Wallet address',
      logoutBtn: 'Disconnect',
      copyBtn: 'Copy address',
      copied: 'Address copied',
      passkeyGasNote: 'Gas is free for this wallet. You only need USDC for the season entry fee. Send USDC to the address above (testnet faucet) to enter a season.',
      fundHint: 'This wallet pays gas in USDC. Copy the address, then request test USDC at the faucet.',
      noGasWarn: 'This wallet has 0 USDC, so it cannot pay gas yet.',
      needGas: 'Your wallet needs USDC for gas. Fund it from the faucet, then try again.',
      playAgainBtn: 'Run Again',
      dashBtn: 'DASH',
      lvlShort: 'LV',
      waveShort: 'WAVE',
      killsShort: 'KILLS',
      multShort: 'MULT',
      bossTitle: 'VOID OVERLORD',
      bossIncoming: 'BOSS SPAWNED — DODGE METEORS & BULLET RINGS!',
      bossDefeated: 'BOSS SLAIN! +300 PTS',
      waveBanner: 'WAVE',
      waveWarn: 'ENEMIES FASTER & DEADLIER!',
      abyssWarn: 'FELL INTO THE ABYSS! -1 HP',
      levelUpTitle: 'LEVEL UP! Draft 1 Power-Up',
      levelUpHint: 'Click card or press 1 · 2 · 3',
      scoreLabel: 'Score',
      bestLabel: 'Best',
      waveLabel: 'Wave',
      timeLabel: 'Survived',
      killsLabel: 'Kills',
      lbTitle: '🏆 Arc Onchain Leaderboard (Top 6)',
      lbColTx: 'Tx',
      lbEmpty: 'No verified runs yet. Play, then press Record Score to be the first on the board.',
      lbSyncing: 'Syncing chain data...',
      lbColPlayer: 'Player',
      lbColHero: 'Hero',
      lbColWave: 'Wave',
      lbColScore: 'Score',
      lbColTag: 'Mode',
      wonTitle: 'Run Complete!',
      lostTitle: 'Defeated in Wave',
      pausedTitle: 'Paused',
      pausedBody: 'Press P or tap Resume to continue.',
      resumeBtn: 'Resume',
      pauseTitle: 'Pause',
      hintControls: 'WASD / Arrows / Drag to move · Space / DASH to dodge i-frame & smash · 1-3 for Upgrades',
      tutStep1: 'Dodge red charge lines & magenta bullets! Stay off the water edge!',
      tutStep2: 'SPACE / DASH grants brief invulnerability & clears projectiles!',
      claimChainBtn: 'Submit Score On-Chain (Arc L1)',
      claimGaslessBtn: 'Save Score · free gas',
      claimOwnBtn: 'Save with my wallet (pay gas)',
      claimingFree: 'Saving your run onchain (free)...',
      shareBtn: 'Share score',
      shareCopied: 'Card downloaded and text copied',
      claimDemoBtn: 'Save to Ranked Leaderboard',
      claimedOk: 'Score recorded on Arc L1!',
      claimedDemoOk: 'Rank saved!',
      viewTx: 'View TX on Arc Explorer',
      tabProfile: 'Profile',
      tabQuests: 'Daily',
      tabShop: 'Shop',
      lbAll: 'All time',
      lbSeasonF: 'This season',
      streakLabel: 'Day streak',
      recentRuns: 'Recent runs',
      noRuns: 'No saved runs yet.',
      badgeArtTitle: 'Your badge',
      noBadge: 'Save a run of 300+ points to earn your first badge (Scout).',
      skinsOwnedTitle: 'Your skins',
      questsTitle: 'Daily quests',
      questHint: 'Rewards are paid automatically when you save the run. They reset every UTC day.',
      questFirst: 'Save a run today',
      questFirstR: '5 ARCQ x streak (up to 7)',
      questThree: 'Save 3 runs today',
      questThreeR: '15 ARCQ',
      questBig: 'Save one run of 1,000+ points',
      questBigR: '30 ARCQ',
      questDone: 'Done',
      runsTodayLabel: 'Runs today',
      shopTitle: 'Upgrade NFT shop',
      magnetLvLabel: 'Pickup level',
      magnetBonusLabel: 'Item pickup range',
      magnetShort: 'pickup range',
      levelWord: 'Level',
      lockedBtn: 'Locked',
      totalWord: 'total',
      shopHint: 'Each NFT you own is one level. Every level widens the range that pulls items to you, and each one adds more than the last (+4%, +6%, +8%, +10%, +12%, +15%). Buy them in order. They are soulbound (you keep them, no trading) and the ARCQ you spend is burned. An owned NFT can also tint your hero.',
      buyBtn: 'Buy',
      equipBtn: 'Equip',
      unequipBtn: 'Unequip',
      equippedLabel: 'Equipped',
      ownedLabel: 'Owned',
      skinNames: ['', 'Ruby', 'Amber', 'Emerald', 'Violet', 'Frost', 'Gold'],
      joinBtn: 'Join',
      leaveRoomBtn: 'Stop playing in this room',
      refundBtn: 'Get my fee back',
      roomEndsIn: 'Ends in',
      roomEntrants: 'players',
      roomPool: 'Pool',
      seasonPillLabel: 'Season',
      prizeAlert: 'Prizes waiting',
      tabSeason: 'Season',
      seasonTitle: 'Daily Season',
      seasonLabel: 'Season',
      poolLabel: 'Prize pool',
      entrantsLabel: 'Entrants',
      endsInLabel: 'Ends in',
      usdcBalLabel: 'USDC balance',
      enterBtn: 'Enter season (1 USDC)',
      enteredLabel: 'Entered: your runs rank this season',
      notEnteredLabel: 'Not entered: runs earn ARCQ but do not rank',
      seasonHint: 'On-chain points = game score ÷ 20. Entry fees fill the prize pool. After a season ends, the top 3 split it 50/30/20 (60/40 with 2 players).',
      prizesTitle: 'Prizes from ended seasons',
      noPrizes: 'No prizes to claim yet.',
      claimPrizeBtn: 'Claim',
      rolloverBtn: 'Roll pool into current season',
      upgradeTitle: 'Hero Upgrade (burns ARCQ)',
      heroLvLabel: 'Hero level',
      upgradeBtn: 'Upgrade',
      upgradeCostLabel: 'Next level costs',
      upgradeBonus: 'Level 2 and 4: +1 heart. Every level: +10% pickup magnet range.',
      maxLevel: 'MAX',
      needUsdc: 'You need 1 USDC. Use Get test USDC in the sidebar or the faucet link.',
      needWallet: 'Connect your wallet first.',
      noContractMsg: 'Set the game contract in the L1 & Contract tab.',
      cancelled: 'Cancelled in wallet.',
      tabWallet: 'Wallet & Stats',
      nickBoxTitle: 'Leaderboard nickname',
      nickBoxHint: '3-16 characters. Shown on the leaderboard instead of your wallet address. Leave empty to remove it.',
      nickSaveBtn: 'Save nickname',
      nickSavedMsg: 'Nickname saved',
      nickLoginMsg: 'Connect a wallet to set a leaderboard nickname.',
      nickLabel: 'Nickname',
      tabLeaderboard: 'Full Rankings',
      tabNetwork: 'L1 & Contract',
      connectWallet: 'Connect Wallet',
      switchArc: 'Switch / Add Arc Testnet',
      refreshChain: 'Refresh On-Chain',
      faucetLink: 'Get Testnet USDC (Faucet)',
      watchUsdcBtn: 'Add USDC Asset',
      noWalletTitle: 'No Browser Wallet Detected',
      noWalletDesc: 'Install MetaMask or Rabby for Arc Testnet on-chain leaderboard, or compete on the Local Ranked Board.',
      networkLabel: 'Active L1 Network',
      accountLabel: 'Account',
      gasBalLabel: 'USDC (gas + play)',
      arcqBalLabel: 'ARCQ Earned',
      badgeLabel: 'Explorer NFT',
      runsLabel: 'On-Chain Runs',
      tiers: ['None', 'Scout', 'Vanguard', 'Striker', 'Sentinel', 'Warlord', 'Titan', 'Overlord', 'Arc Legend', 'Champion'],
      contractLabel: 'ArcVoxelGameFi Contract Address',
      saveContract: 'Save Contract',
      contractHint: 'Leave empty for Local Ranked mode. Deploy contracts/ArcVoxelGameFi.sol and paste its address here.',
      customL1Title: 'Switch / Custom EVM L1',
      applyNetwork: 'Apply Network',
      resetArc: 'Reset to Arc Testnet',
      lbModeDemo: 'Merged Local + Arc Rivals Leaderboard',
      lbModeChain: 'Top scores with a transaction on Arc Testnet',
      soundOn: 'Sound On',
      soundOff: 'Muted',
      statusSavedContract: 'Contract saved!',
      statusSwitchedNet: 'Network updated!',
      upgrades: {
        dragon: { name: 'Dragon Fireball', desc: 'Explosive dragon fire blasts + AoE burn.' },
        lightning: { name: 'Arc Chain Lightning', desc: 'Zaps and chains across nearby monsters.' },
        shuriken: { name: 'Cyclone Shuriken', desc: 'Piercing spinning blades in wide volleys.' },
        coloa: { name: 'Co Loa Wave Arrows', desc: 'Homing energy bolts curving into targets.' },
        drill: { name: 'Bamboo Drill Lance', desc: 'Heavy piercing lance knocking back elites.' },
        pulse: { name: 'Sonic Pulse', desc: 'Shockwave around you: damages and pushes back every mob in range.' },
        boomerang: { name: 'Returning Boomerang', desc: 'Flies out and comes back, hitting mobs on both passes. Lv.4 throws two.' },
        mines: { name: 'Proximity Mines', desc: 'Drops mines as you move. They blast mobs that step close.' },
        blades: { name: 'Orbiting Plasma Blades', desc: 'Spinning barrier slicing foes & melee threats.' },
        orbital: { name: 'Arc Orbital Strike', desc: 'Calls down orbital beams on dense packs.' },
        overclock: { name: 'Overclock Core', desc: '+20% Fire Rate & -18% Dash Cooldown.' },
        magnet: { name: 'Arc Magnet Field', desc: '+45% Pickup Range & +14% Move Speed.' },
        vitality: { name: 'Emergency Medic', desc: 'Restore +2 HP (and +1 Max HP on Lv.1).' },
      },
    },
    vi: {
      title: 'Arc Voxel Quest · Sinh Tồn Trên Arc',
      subtitle: 'Sống sót qua những đợt quái ngày càng mạnh trên Arc! Né bò húc đỏ, luồn lách mưa đạn Boss, rồi ghi điểm cao nhất lên chuỗi để leo bảng xếp hạng.',
      chooseHero: 'Chọn Nhân Vật (Arc VN):',
      chooseMap: 'Bản Đồ Cộng Đồng Arc:',
      roadmapLabel: 'W1-2 Khởi Động → W3-4 Áp Lực → W5-7 Quái Tinh Anh → W8+ Quá Tải',
      nickPlaceholder: 'Biệt danh (VD: HungVN)',
      startBtn: 'Vào Đấu Trường Arc',
      badgeRoadmapTitle: '🏅 Lộ trình huy hiệu',
      milestonesTitle: 'Cột mốc phụ',
      msRuns5: 'Kiên trì: ghi 5 ván', msRuns25: 'Cựu binh: ghi 25 ván', msRuns100: 'Bất khuất: ghi 100 ván',
      msGems500: 'Thợ săn gem: nhặt 500 gem', msGems5000: 'Đại gia gem: nhặt 5.000 gem',
      msCombo5: 'Combo x5: đạt hệ số x5', msCombo10: 'Bậc thầy combo: đạt hệ số x10',
      msStreak3: 'Đà thắng lợi: chơi liên tục 3 ngày', msStreak7: 'Chiến binh tuần: chơi liên tục 7 ngày',
      badgeReq: 'Ghi một ván từ {n} điểm (khoảng {g} điểm trong ván)',
      badgeChampionReq: 'Thắng một mùa giải hằng ngày: đứng nhất bảng xếp hạng mùa',
      badgeEarned: 'Đã đạt',
      badgeNextGoal: 'Mục tiêu tiếp theo: huy hiệu {tier}. Còn {n} điểm nữa (khoảng {g} điểm trong ván).',
      badgeAllScore: 'Bạn đã có đủ huy hiệu điểm. Hãy thắng một mùa giải để nhận huy hiệu Quán quân.',
      badgeFirstGoal: 'Mục tiêu: ghi một ván từ 300 điểm (khoảng 6.000 điểm trong ván) để nhận huy hiệu đầu tiên: Trinh Sát.',
      badgeTipsTitle: 'Mẹo để leo hạng',
      badgeTips: [
        'Giữ combo liên tục: cứ 4 lần hạ liên tiếp, hệ số điểm tăng thêm, tối đa x10.',
        'Hạ Boss: mỗi con có 300 điểm cơ bản trước khi nhân hệ số.',
        'Nhặt gem để lên cấp và mở vũ khí mạnh hơn.',
        'Mua NFT nâng cấp trong cửa hàng để mở rộng tầm hút vật phẩm.',
        'Vào mùa giải hằng ngày để tranh huy hiệu Quán quân và quỹ thưởng USDC.'
      ],
      featuresTitle: '🗺️ Bảng Nhiệm Vụ Arc',
      boardDone: 'hoàn thành',
      questNext: 'TIẾP THEO',
      qConnectT: 'Kết nối ví', qConnectD: 'Đăng nhập bằng email hoặc dùng ví có sẵn. Mở khóa mọi nhiệm vụ.',
      qPlayT: 'Chơi ván đầu tiên', qPlayD: 'Sống sót qua các đợt quái để lấy điểm.',
      qSaveT: 'Ghi điểm lên chuỗi', qSaveD: 'Miễn phí gas. Nhận ARCQ, và huy hiệu Trinh Sát từ 300 điểm.',
      qSeasonT: 'Vào mùa giải hằng ngày', qSeasonD: 'Đóng 1 USDC. Top 3 chia quỹ thưởng.',
      qDailyT: 'Hoàn thành nhiệm vụ ngày', qDailyD: 'Nhiệm vụ và chuỗi ngày chơi trả tới 80 ARCQ mỗi ngày.',
      qHeroT: 'Mua NFT nâng cấp', qHeroD: 'Mỗi cấp mở rộng tầm hút vật phẩm.',
      surrenderBtn: '🏳️ Kết thúc sớm', surrenderConfirm: 'Bấm lần nữa để kết thúc',
      connectWalletShort: 'Kết Nối Ví',
      accountTitle: 'Tài khoản của tôi',
      yourWallets: 'VÍ KHÁC',
      installedInBrowser: 'Đã cài trong trình duyệt',
      installLink: 'Cài đặt',
      wcTitle: 'WalletConnect',
      wcDesc: 'Quét bằng ví trên điện thoại',
      wcNeedsSetup: 'WalletConnect cần Project ID: thêm WALLETCONNECT_PROJECT_ID vào .env.local',
      connectTitle: 'Kết nối ví',
      connectSub: 'Kết nối ví để chơi trên Arc Testnet.',
      noBrowserWallet: 'Không thấy ví trình duyệt. Hãy cài MetaMask hoặc Rabby rồi tải lại trang.',
      walletLabel: 'Ví',
      claimingWallet: 'Hãy xác nhận giao dịch trong ví của bạn...',
      claimingPasskey: 'Hãy xác nhận bằng passkey (vân tay, khuôn mặt hoặc Windows Hello)...',
      passkeyTitle: 'Tạo ví bằng passkey',
      passkeyNote: 'Không cần cài tiện ích, không có cụm từ khôi phục. Xác nhận mọi giao dịch bằng vân tay, khuôn mặt hoặc Windows Hello. Miễn phí gas.',
      passkeyNamePh: 'Tên ví (ví dụ biệt danh của bạn)',
      passkeyCreateBtn: 'Tạo ví của tôi',
      passkeyLoginBtn: 'Dùng passkey có sẵn',
      passkeyWorking: 'Đang chờ passkey của bạn',
      passkeySetup: 'Ví passkey chưa được cấu hình trên server. Thêm CIRCLE_CLIENT_KEY vào .env.local rồi khởi động lại. Trong Circle Console, đặt Allowed Domain của Client Key và Passkey Domain Name đúng bằng:',
      passkeyDomainErr: 'Passkey này thuộc về một địa chỉ khác với game. Trong Circle Console, hãy đặt Passkey Domain Name là:',
      passkeyExists: 'Passkey này đã có trên thiết bị. Hãy bấm "Dùng passkey có sẵn".',
      googleBtn: 'Tiếp tục với Google',
      googleOpening: 'Đang mở Google',
      googleFinishing: 'Đang hoàn tất đăng nhập Google',
      googleLabel: 'Tài khoản Google',
      emailTitle: 'Đăng nhập bằng email',
      emailNote: 'Dùng Gmail hoặc email bất kỳ. Circle gửi mã dùng một lần, bạn đặt mã PIN một lần và ví Arc của bạn được tạo. Miễn phí gas. Hãy giữ kỹ mã PIN: không ai khôi phục được giúp bạn.',
      emailPh: 'ban@gmail.com',
      emailSendBtn: 'Gửi mã cho tôi',
      emailEnterBtn: 'Nhập mã',
      emailOtherBtn: 'Dùng email khác',
      emailSending: 'Đang gửi mã',
      emailSent: 'Đã gửi mã tới {email}. Hãy kiểm tra hộp thư và thư rác, rồi bấm "Nhập mã".',
      emailWaitCode: 'Đang chờ mã của bạn',
      emailWaitPin: 'Hãy đặt mã PIN trong cửa sổ Circle',
      emailWaitWallet: 'Đang tạo ví của bạn',
      emailBad: 'Hãy nhập địa chỉ email hợp lệ.',
      emailSetup: 'Đăng nhập bằng email chưa sẵn sàng: cần cấu hình nhà cung cấp email (SMTP) trong Circle Console.',
      emailSendFirst: 'Hãy yêu cầu mã trước.',
      emailPending: 'Ví của bạn vẫn đang được tạo. Hãy chờ một chút rồi đăng nhập lại.',
      emailSigninAgain: 'Phiên đăng nhập email đã hết hạn. Hãy đăng nhập lại bằng email để xác nhận giao dịch.',
      emailSigninBtn: 'Đăng nhập lại',
      emailErrExpired: 'Mã đã hết hạn. Hãy yêu cầu mã mới.',
      emailErrWrong: 'Mã chưa đúng. Hãy thử lại.',
      emailErrLocked: 'Nhập sai quá nhiều lần. Hãy yêu cầu mã mới.',
      emailErrRate: 'Quá nhiều yêu cầu. Hãy chờ vài phút rồi thử lại.',
      emailErrSend: 'Không gửi được email. Hãy thử lại sau ít phút.',
      emailErrPin: 'Mã PIN chưa đúng.',
      emailErrPinLocked: 'PIN bị khóa do nhập sai nhiều lần. Hãy thử lại sau.',
      emailLabel: 'Email',
      claimingEmail: 'Hãy xác nhận bằng mã PIN trong cửa sổ Circle...',
      emailGasNote: 'Ví này miễn phí gas. Bạn xác nhận mỗi giao dịch bằng mã PIN. Bạn chỉ cần USDC để đóng phí vào mùa giải. Hãy gửi USDC testnet vào địa chỉ ở trên để vào mùa.',
      confirmTitle: 'Xác nhận giao dịch',
      confirmBtn: 'Xác nhận',
      rejectBtn: 'Hủy',
      confirmNetwork: 'Mạng',
      confirmGas: 'Phí gas',
      confirmGasFree: 'Miễn phí (được tài trợ)',
      confirmWallet: 'Ví của bạn',
      confirmEnter: 'Vào mùa giải hằng ngày. Phí vào: {fee} USDC.',
      confirmBuy: 'Mua NFT nâng cấp cấp {lvl} ({name}) giá {cost} ARCQ (bị đốt). +{bonus}% tầm hút.',
      confirmEquip: 'Dùng màu của NFT cấp {lvl} ({name}) cho tướng của bạn.',
      confirmUnequip: 'Bỏ màu NFT khỏi tướng của bạn.',
      confirmClaim: 'Nhận thưởng mùa giải #{season}, hạng {rank}.',
      confirmRollover: 'Chuyển quỹ thưởng của mùa trống #{season} sang mùa hiện tại.',
      confirmSave: 'Ghi ván này lên chuỗi: {points} điểm.',
      confirmGeneric: 'Gửi giao dịch này tới contract Arc Voxel.',
      emailLabel: 'Email',
      googleNote: 'Nhận ví bằng tài khoản Google. Bạn đặt mã PIN và dùng PIN để duyệt mọi giao dịch.',
      googleSetup: 'Đăng nhập bằng email chưa được cấu hình trên server. Thêm GOOGLE_CLIENT_ID vào .env.local, khởi động lại server và thêm địa chỉ này vào Authorized JavaScript origins trong Google Cloud:',
      creatingWallet: 'Đang tạo ví... hãy hoàn tất đặt PIN trong cửa sổ Circle.',
      creatingWalletShort: 'Đang tạo ví',
      finishWalletHint: 'đã đăng nhập. Hãy hoàn tất tạo ví.',
      finishWalletBtn: 'Tạo ví của tôi',
      walletRequired: 'Hãy kết nối ví để chơi.',
      walletAddrLabel: 'Địa chỉ ví',
      logoutBtn: 'Ngắt kết nối',
      copyBtn: 'Sao chép địa chỉ',
      copied: 'Đã sao chép địa chỉ',
      passkeyGasNote: 'Ví này miễn phí gas. Bạn chỉ cần USDC để đóng phí vào mùa giải. Hãy gửi USDC testnet vào địa chỉ ở trên để vào mùa.',
      fundHint: 'Ví này trả gas bằng USDC. Hãy sao chép địa chỉ rồi xin USDC thử nghiệm ở faucet.',
      noGasWarn: 'Ví đang có 0 USDC nên chưa trả được gas.',
      needGas: 'Ví của bạn cần USDC để trả gas. Hãy nạp từ faucet rồi thử lại.',
      playAgainBtn: 'Đấu Lại Ngay',
      dashBtn: 'LƯỚT',
      lvlShort: 'CẤP',
      waveShort: 'WAVE',
      killsShort: 'HẠ',
      multShort: 'NHÂN',
      bossTitle: 'CHÚA TỂ HƯ KHÔNG',
      bossIncoming: 'BOSS XUẤT HIỆN — NÉ MƯA ĐẠN & THIÊN THẠCH ĐỎ!',
      bossDefeated: 'HẠ BOSS! +300 ĐIỂM',
      waveBanner: 'WAVE',
      waveWarn: 'QUÁI NHANH & ĐÔNG HƠN!',
      abyssWarn: 'RƠI XUỐNG VỰC! -1 MÁU',
      levelUpTitle: 'LÊN CẤP! Chọn 1 Sức Mạnh',
      levelUpHint: 'Bấm thẻ hoặc nhấn phím 1 · 2 · 3',
      scoreLabel: 'Điểm',
      bestLabel: 'Kỷ lục',
      waveLabel: 'Wave',
      timeLabel: 'Sống sót',
      killsLabel: 'Đã hạ',
      lbTitle: '🏆 Bảng Xếp Hạng Onchain Arc (Top 6)',
      lbColTx: 'Tx',
      lbEmpty: 'Chưa có ván nào được xác thực. Hãy chơi rồi bấm Ghi Điểm để đứng đầu bảng.',
      lbSyncing: 'Đang đồng bộ dữ liệu chuỗi...',
      lbColPlayer: 'Người chơi',
      lbColHero: 'Tướng',
      lbColWave: 'Wave',
      lbColScore: 'Điểm',
      lbColTag: 'Loại',
      wonTitle: 'Hoàn Thành Lượt Đấu!',
      lostTitle: 'Thất Thủ Tại Wave',
      pausedTitle: 'Tạm dừng',
      pausedBody: 'Bấm P hoặc nút Tiếp tục để chơi tiếp.',
      resumeBtn: 'Tiếp tục',
      pauseTitle: 'Tạm dừng',
      hintControls: 'WASD / Mũi tên / Kéo để né · Space / LƯỚT để bất tử thoáng chốc & phá đạn · 1-3 chọn thẻ',
      tutStep1: 'Né vạch húc đỏ & đạn tím! Đừng bước ra mép nước kẻo mất máu!',
      tutStep2: 'Bấm SPACE / LƯỚT để né sát thương & thổi bay đạn địch!',
      claimChainBtn: 'Ghi Điểm Lên Arc L1',
      claimGaslessBtn: 'Ghi điểm · miễn phí gas',
      claimOwnBtn: 'Ghi bằng ví của tôi (trả gas)',
      claimingFree: 'Đang ghi ván lên chuỗi (miễn phí)...',
      shareBtn: 'Chia sẻ điểm',
      shareCopied: 'Đã tải ảnh và sao chép nội dung',
      claimDemoBtn: 'Lưu Lên Bảng Xếp Hạng',
      claimedOk: 'Đã ghi điểm lên Arc L1!',
      claimedDemoOk: 'Đã cập nhật Bảng Xếp Hạng!',
      viewTx: 'Xem TX trên ArcScan',
      tabProfile: 'Hồ sơ',
      tabQuests: 'Hằng ngày',
      tabShop: 'Cửa hàng',
      lbAll: 'Mọi thời đại',
      lbSeasonF: 'Mùa này',
      streakLabel: 'Chuỗi ngày chơi',
      recentRuns: 'Ván gần đây',
      noRuns: 'Chưa có ván nào được ghi.',
      badgeArtTitle: 'Huy hiệu của bạn',
      noBadge: 'Ghi một ván từ 300 điểm để nhận huy hiệu đầu tiên (Trinh Sát).',
      skinsOwnedTitle: 'Skin của bạn',
      questsTitle: 'Nhiệm vụ hằng ngày',
      questHint: 'Thưởng tự trả khi bạn ghi ván. Làm mới mỗi ngày theo giờ UTC.',
      questFirst: 'Ghi một ván hôm nay',
      questFirstR: '5 ARCQ x chuỗi ngày (tối đa 7)',
      questThree: 'Ghi 3 ván hôm nay',
      questThreeR: '15 ARCQ',
      questBig: 'Ghi một ván từ 1.000 điểm',
      questBigR: '30 ARCQ',
      questDone: 'Xong',
      runsTodayLabel: 'Số ván hôm nay',
      shopTitle: 'Cửa hàng NFT nâng cấp',
      magnetLvLabel: 'Cấp tầm hút',
      magnetBonusLabel: 'Tầm hút vật phẩm',
      magnetShort: 'tầm hút',
      levelWord: 'Cấp',
      lockedBtn: 'Chưa mở',
      totalWord: 'tổng',
      shopHint: 'Mỗi NFT bạn sở hữu là một cấp. Mỗi cấp mở rộng tầm hút kéo vật phẩm về phía bạn, và cấp sau cộng nhiều hơn cấp trước (+4%, +6%, +8%, +10%, +12%, +15%). Hãy mua lần lượt. NFT gắn chặt vào ví (giữ mãi, không chuyển nhượng) và ARCQ đã tiêu sẽ bị đốt. NFT đang sở hữu còn đổi được màu tướng.',
      buyBtn: 'Mua',
      equipBtn: 'Trang bị',
      unequipBtn: 'Bỏ trang bị',
      equippedLabel: 'Đang dùng',
      ownedLabel: 'Đã sở hữu',
      skinNames: ['', 'Hồng ngọc', 'Hổ phách', 'Lục bảo', 'Tím', 'Băng giá', 'Vàng kim'],
      joinBtn: 'Tham gia',
      leaveRoomBtn: 'Thôi không chơi trong phòng này',
      refundBtn: 'Nhận lại phí',
      roomEndsIn: 'Kết thúc sau',
      roomEntrants: 'người chơi',
      roomPool: 'Quỹ',
      seasonPillLabel: 'Mùa',
      prizeAlert: 'Có thưởng chờ nhận',
      tabSeason: 'Mùa giải',
      seasonTitle: 'Mùa giải hằng ngày',
      seasonLabel: 'Mùa',
      poolLabel: 'Quỹ thưởng',
      entrantsLabel: 'Số người tham gia',
      endsInLabel: 'Kết thúc sau',
      usdcBalLabel: 'Số dư USDC',
      enterBtn: 'Vào mùa giải (1 USDC)',
      enteredLabel: 'Đã tham gia: điểm của bạn được xếp hạng mùa này',
      notEnteredLabel: 'Chưa tham gia: chơi vẫn nhận ARCQ nhưng không vào BXH',
      seasonHint: 'Điểm onchain = điểm game ÷ 20. Phí vào mùa tạo quỹ thưởng. Sau khi mùa kết thúc, top 3 chia 50/30/20 (60/40 nếu chỉ có 2 người).',
      prizesTitle: 'Thưởng từ các mùa đã kết thúc',
      noPrizes: 'Chưa có thưởng để nhận.',
      claimPrizeBtn: 'Nhận',
      rolloverBtn: 'Chuyển quỹ sang mùa hiện tại',
      upgradeTitle: 'Nâng cấp tướng (đốt ARCQ)',
      heroLvLabel: 'Cấp tướng',
      upgradeBtn: 'Nâng cấp',
      upgradeCostLabel: 'Cấp tiếp theo tốn',
      upgradeBonus: 'Cấp 2 và 4: +1 tim. Mỗi cấp: +10% tầm hút vật phẩm.',
      maxLevel: 'TỐI ĐA',
      needUsdc: 'Bạn cần 1 USDC. Dùng Get test USDC ở thanh bên hoặc liên kết faucet.',
      needWallet: 'Hãy kết nối ví trước.',
      noContractMsg: 'Hãy đặt địa chỉ contract ở tab Mạng L1 & Contract.',
      cancelled: 'Đã hủy trong ví.',
      tabWallet: 'Ví & Chỉ số',
      nickBoxTitle: 'Biệt danh trên bảng xếp hạng',
      nickBoxHint: '3-16 ký tự. Hiện trên bảng xếp hạng thay cho địa chỉ ví. Để trống để xóa.',
      nickSaveBtn: 'Lưu biệt danh',
      nickSavedMsg: 'Đã lưu biệt danh',
      nickLoginMsg: 'Hãy kết nối ví để đặt biệt danh trên bảng xếp hạng.',
      nickLabel: 'Biệt danh',
      tabLeaderboard: 'Bảng Xếp Hạng',
      tabNetwork: 'Mạng L1 & Contract',
      connectWallet: 'Kết nối ví',
      switchArc: 'Thêm / Chuyển Arc Testnet',
      refreshChain: 'Làm mới dữ liệu',
      faucetLink: 'Lấy USDC Testnet (Faucet)',
      watchUsdcBtn: 'Thêm token USDC',
      noWalletTitle: 'Chưa thấy ví Web3 trên trình duyệt',
      noWalletDesc: 'Cài MetaMask hoặc Rabby để ghi BXH thật trên Arc Testnet, hoặc đua top trực tiếp trên BXH cục bộ.',
      networkLabel: 'Mạng L1 đang dùng',
      accountLabel: 'Địa chỉ ví',
      gasBalLabel: 'USDC (gas + chơi)',
      arcqBalLabel: 'Token ARCQ',
      badgeLabel: 'Huy hiệu NFT',
      runsLabel: 'Số lượt On-Chain',
      tiers: ['Chưa có', 'Trinh Sát', 'Tiên Phong', 'Xung Kích', 'Hộ Vệ', 'Thống Soái', 'Cự Thần', 'Bá Chủ', 'Huyền Thoại Arc', 'Quán Quân'],
      contractLabel: 'Địa chỉ Contract ArcVoxelGameFi',
      saveContract: 'Lưu Contract',
      contractHint: 'Để trống nếu dùng BXH cục bộ. Sau khi deploy contracts/ArcVoxelGameFi.sol, dán địa chỉ vào đây.',
      customL1Title: 'Tùy chỉnh mạng EVM L1 khác',
      applyNetwork: 'Áp dụng mạng',
      resetArc: 'Về mặc định Arc Testnet',
      lbModeDemo: 'BXH Hợp Nhất (Người chơi + Đối thủ Arc)',
      lbModeChain: 'Điểm cao nhất có giao dịch trên Arc Testnet',
      soundOn: 'Đang bật tiếng',
      soundOff: 'Đang tắt tiếng',
      statusSavedContract: 'Đã lưu địa chỉ Contract!',
      statusSwitchedNet: 'Đã cập nhật cấu hình mạng L1!',
      upgrades: {
        dragon: { name: 'Rồng Thăng Long', desc: 'Phóng cầu lửa nổ lan diện rộng.' },
        lightning: { name: 'Tia Chớp Sông Hồng', desc: 'Giật sét chuyền qua nhiều mục tiêu.' },
        shuriken: { name: 'Phi Tiêu Lốc Xoáy', desc: 'Ném phi tiêu xuyên thấu nhiều quái.' },
        coloa: { name: 'Cung Tên Cổ Loa', desc: 'Mũi tên tự đuổi bám mục tiêu.' },
        drill: { name: 'Mũi Khoan Tre', desc: 'Mũi khoan hạng nặng đẩy lùi quái tinh anh.' },
        pulse: { name: 'Sóng Âm', desc: 'Sóng xung quanh bạn: gây sát thương và đẩy lùi mọi quái trong tầm.' },
        boomerang: { name: 'Boomerang Quay Về', desc: 'Bay ra rồi quay về, trúng quái cả hai lượt. Lv.4 ném hai cái.' },
        mines: { name: 'Mìn Cảm Biến', desc: 'Thả mìn khi di chuyển. Quái bước lại gần sẽ bị nổ.' },
        blades: { name: 'Kiếm Plasma Hộ Thân', desc: 'Lưỡi kiếm xoay quanh chém quái áp sát.' },
        orbital: { name: 'Thiên Lôi Arc', desc: 'Giáng sét hủy diệt xuống cụm đông địch.' },
        overclock: { name: 'Ép Xung Năng Lượng', desc: '+20% Tốc độ bắn & -18% Hồi chiêu Lướt.' },
        magnet: { name: 'Từ Trường Arc', desc: '+45% Tầm hút ngọc & +14% Tốc chạy.' },
        vitality: { name: 'Tiếp Tế Khẩn Cấp', desc: 'Hồi ngay +2 Máu (+1 Máu tối đa ở Lv.1).' },
      },
    },
  };

  var lang = 'vi';
  var playerName = 'Player';
  try {
    var savedLang = window.localStorage.getItem('arc-voxel-quest:lang');
    if (savedLang === 'en' || savedLang === 'vi') lang = savedLang;
    else if (!/^vi\b/iu.test(String(window.navigator.language || 'vi'))) lang = 'en'; // first visit: follow the browser language
    var savedHero = Number(window.localStorage.getItem('arc-voxel-quest:hero-idx'));
    if (Number.isInteger(savedHero) && savedHero >= 0 && savedHero < HEROES.length) selectedHeroIdx = savedHero;
    var savedMap = Number(window.localStorage.getItem('arc-voxel-quest:map-idx'));
    if (Number.isInteger(savedMap) && savedMap >= 0 && savedMap < MAPS.length) selectedMapIdx = savedMap;
    var savedNick = window.localStorage.getItem('arc-voxel-quest:nick');
    if (savedNick && savedNick.trim()) playerName = savedNick.trim().slice(0, 18);
  } catch (e) { /* ignore */ }
  function t(key) { return (STRINGS[lang] && STRINGS[lang][key]) || STRINGS.en[key] || key; }

  /* 3. RULES */
  var DEFAULTS = {
    duration: 0, // 0 = Endless Mode! Non-zero only when playtest overrides rules
    hearts: 4,
    heroSpeed: 8.6,
    enemySpeed: 3.8,
    enemySpeedGrowth: 0.06,
    enemySpawnEvery: 0.9,
    maxEnemies: 36,
    maxPickups: 6,
    bossEvery: 30,
    heroSize: 1.9,
    enemySize: 1.65,
    pickupSize: 1.15,
    shield: { enabled: false, every: 15, seconds: 2 },
    worldSize: 38,
    seed: 11,
    palette: {
      skyTop: '#060b1e', skyBottom: '#183363', fog: '#102347',
      grass: '#226f68', dirt: '#2c324f', sand: '#6b99b2', water: '#083a61', accent: '#38f2ff',
    },
  };
  function merge(fallback, value) {
    if (typeof fallback === 'number') return typeof value === 'number' && isFinite(value) ? value : fallback;
    if (typeof fallback === 'string') return typeof value === 'string' && value ? value : fallback;
    if (typeof fallback === 'boolean') return typeof value === 'boolean' ? value : fallback;
    var out = {};
    for (var key in fallback) out[key] = merge(fallback[key], value && typeof value === 'object' ? value[key] : undefined);
    return out;
  }
  var R = merge(DEFAULTS, GAME.rules || {});
  var SLOTS = GAME.slots || {};
  var ASSETS = GAME.assets || {};
  function customArt(slot) { return !!(SLOTS[slot] && SLOTS[slot].custom && ASSETS[slot]); }

  /* 4. THREE.JS RENDERER */
  var THREE = window.THREE;
  var renderer;
  try {
    if (!THREE) throw new Error('the three.js runtime is missing');
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (error) {
    var note = document.createElement('div');
    note.textContent = 'WebGL unavailable: ' + ((error && error.message) || error);
    note.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:24px;color:#fff;font:16px system-ui,sans-serif;background:#060b1e';
    document.body.appendChild(note);
    reportError('WebGL unavailable: ' + ((error && error.message) || error));
    window.__gameState = function () { return { phase: 'error', score: 0, renderer: 'none' }; };
    return;
  }
  renderer.setPixelRatio(Math.min(window.innerWidth < 820 ? 1.5 : 2, window.devicePixelRatio || 1)); // a lower cap on phones keeps the game smooth
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);
  canvas.style.background = 'linear-gradient(to bottom,' + R.palette.skyTop + ' 0%,' + R.palette.skyTop + ' 20%,' + R.palette.skyBottom + ' 100%)';

  var scene = new THREE.Scene();
  scene.fog = new THREE.Fog(R.palette.fog, 32, 95);
  var camera = new THREE.PerspectiveCamera(38, 1, 0.1, 500);

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function lerp(a, b, tVal) { return a + (b - a) * tVal; }
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var tVal = a;
      tVal = Math.imul(tVal ^ (tVal >>> 15), tVal | 1);
      tVal ^= tVal + Math.imul(tVal ^ (tVal >>> 7), tVal | 61);
      return ((tVal ^ (tVal >>> 14)) >>> 0) / 4294967296;
    };
  }
  var rand = mulberry32(Math.round(R.seed) * 2654435761);
  var hashSeed = Math.round(R.seed) * 374761393;
  function hash2(x, z) {
    var h = (x * 374761393 + z * 668265263 + hashSeed) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function smooth(tVal) { return tVal * tVal * (3 - 2 * tVal); }
  function valueNoise(x, z) {
    var xi = Math.floor(x), zi = Math.floor(z), xf = smooth(x - xi), zf = smooth(z - zi);
    return lerp(lerp(hash2(xi, zi), hash2(xi + 1, zi), xf), lerp(hash2(xi, zi + 1), hash2(xi + 1, zi + 1), xf), zf);
  }
  function fbm(x, z) { return valueNoise(x, z) * 0.62 + valueNoise(x * 2.1 + 17, z * 2.1 + 5) * 0.28 + valueNoise(x * 4.3 + 3, z * 4.3 + 11) * 0.1; }
  function color(hex) { return new THREE.Color(hex); }

  function radialTexture(stops, size) {
    var c = document.createElement('canvas');
    c.width = c.height = size || 128;
    var g = c.getContext('2d');
    var grad = g.createRadialGradient(c.width / 2, c.height / 2, 0, c.width / 2, c.height / 2, c.width / 2);
    for (var i = 0; i < stops.length; i++) grad.addColorStop(stops[i][0], stops[i][1]);
    g.fillStyle = grad;
    g.fillRect(0, 0, c.width, c.height);
    var texture = new THREE.CanvasTexture(c);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }
  var GLOW = radialTexture([[0, 'rgba(190,255,255,1)'], [0.28, 'rgba(56,242,255,0.58)'], [1, 'rgba(56,242,255,0)']]);
  var BLOB = radialTexture([[0, 'rgba(0,0,0,0.55)'], [0.6, 'rgba(0,0,0,0.28)'], [1, 'rgba(0,0,0,0)']], 64);

  function voxelModel(boxes) {
    var parts = [[], []];
    for (var i = 0; i < boxes.length; i++) parts[boxes[i][7] ? 1 : 0].push(boxes[i]);
    var group = new THREE.Group();
    for (var p = 0; p < 2; p++) {
      if (!parts[p].length) continue;
      var positions = [], normals = [], colors = [], indices = [];
      for (var b = 0; b < parts[p].length; b++) {
        var box = parts[p][b];
        var geo = new THREE.BoxGeometry(box[3], box[4], box[5]);
        geo.translate(box[0], box[1], box[2]);
        var pos = geo.attributes.position, nor = geo.attributes.normal, base = positions.length / 3;
        var tint = color(box[6]);
        for (var v = 0; v < pos.count; v++) {
          positions.push(pos.getX(v), pos.getY(v), pos.getZ(v));
          normals.push(nor.getX(v), nor.getY(v), nor.getZ(v));
          colors.push(tint.r, tint.g, tint.b);
        }
        var index = geo.index.array;
        for (var k = 0; k < index.length; k++) indices.push(base + index[k]);
        geo.dispose();
      }
      var merged = new THREE.BufferGeometry();
      merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      merged.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      merged.setIndex(indices);
      merged.computeBoundingSphere();
      var material = p === 0 ? new THREE.MeshLambertMaterial({ vertexColors: true }) : new THREE.MeshBasicMaterial({ vertexColors: true });
      var mesh = new THREE.Mesh(merged, material);
      mesh.castShadow = p === 0;
      group.add(mesh);
    }
    return group;
  }

  /* 5. CYBER-VOXEL ARENA (Multi-Map Engine) */
  function activeMapSpec() { return MAPS[selectedMapIdx] || MAPS[0]; }
  var N = clamp(Math.round(R.worldSize), 20, 64);
  var HALF = N / 2;
  var WATER_Y = 0.55;
  var height = new Int8Array(N * N);
  var sandy = new Uint8Array(N * N);
  var solid = new Uint8Array(N * N);
  function cell(x, z) {
    var cx = Math.floor(x + HALF), cz = Math.floor(z + HALF);
    return cx < 0 || cz < 0 || cx >= N || cz >= N ? -1 : cx * N + cz;
  }
  function groundAt(x, z) { var c = cell(x, z); return c < 0 ? 0 : height[c]; }
  function walkable(x, z) { var c = cell(x, z); return c >= 0 && height[c] > 0 && !solid[c]; }
  function cellCenter(index) { return { x: Math.floor(index / N) - HALF + 0.5, z: (index % N) - HALF + 0.5 }; }
  function isShore(index) {
    var cx = Math.floor(index / N), cz = index % N;
    if (!height[index]) return false;
    for (var dx = -1; dx <= 1; dx++) for (var dz = -1; dz <= 1; dz++) {
      var x = cx + dx, z = cz + dz;
      if (x < 0 || z < 0 || x >= N || z >= N || !height[x * N + z]) return true;
    }
    return false;
  }

  var BOX = new THREE.BoxGeometry(1, 1, 1);
  var dummy = new THREE.Object3D();
  var arenaGroup = new THREE.Group();
  scene.add(arenaGroup);

  function blockMesh(count, material, parentGroup) {
    var mesh = new THREE.InstancedMesh(BOX, material, Math.max(1, count));
    mesh.count = 0;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    (parentGroup || scene).add(mesh);
    return mesh;
  }
  function addBlock(mesh, x, y, z, sx, sy, sz, tint) {
    dummy.position.set(x, y, z);
    dummy.scale.set(sx, sy, sz);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(mesh.count, dummy.matrix);
    mesh.setColorAt(mesh.count, tint);
    mesh.count++;
  }

  var groundTexture = null;
  if (customArt('background')) {
    groundTexture = new THREE.TextureLoader().load(ASSETS.background);
    groundTexture.colorSpace = THREE.SRGBColorSpace;
  }

  var water = new THREE.Mesh(new THREE.CircleGeometry(N * 2.2, 48), new THREE.MeshLambertMaterial({ color: MAPS[0].water, transparent: true, opacity: 0.88 }));
  water.rotation.x = -Math.PI / 2;
  water.position.y = WATER_Y;
  water.receiveShadow = true;
  scene.add(water);
  var floor = new THREE.Mesh(new THREE.CircleGeometry(N * 2.2, 32), new THREE.MeshBasicMaterial({ color: color(MAPS[0].water).multiplyScalar(0.3) }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.6;
  scene.add(floor);

  var hemiLight = new THREE.HemisphereLight('#7cdbff', '#262b4d', 1.15);
  scene.add(hemiLight);
  var sun = new THREE.DirectionalLight('#cceeff', 2.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = sun.shadow.camera.bottom = -25;
  sun.shadow.camera.right = sun.shadow.camera.top = 25;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 80;
  sun.shadow.bias = -0.0008;
  scene.add(sun, sun.target);

  function buildArena(mapIdx) {
    selectedMapIdx = clamp(Math.floor(mapIdx || 0), 0, MAPS.length - 1);
    var mp = activeMapSpec();
    if (typeof musicSync === 'function' && typeof music !== 'undefined' && music) musicSync();
    while (arenaGroup.children.length) {
      var old = arenaGroup.children.pop();
      if (old.material) old.material.dispose();
    }
    height.fill(0); sandy.fill(0); solid.fill(0);
    hashSeed = (Math.round(R.seed) + mp.seed * 7) * 374761393;
    rand = mulberry32((Math.round(R.seed) + mp.seed) * 2654435761);

    for (var gx = 0; gx < N; gx++) {
      for (var gz = 0; gz < N; gz++) {
        var wx = gx - HALF + 0.5, wz = gz - HALF + 0.5;
        var radial = Math.sqrt(wx * wx + wz * wz) / HALF;
        var n = fbm(gx * 0.11, gz * 0.11);
        var i0 = gx * N + gz;
        if (mp.shape === 'cross') {
          var inCenter = radial < 0.52 + (n - 0.5) * 0.1;
          var inBridge = (Math.abs(wx) < 4.5 || Math.abs(wz) < 4.5) && Math.abs(wx) < HALF - 1.5 && Math.abs(wz) < HALF - 1.5;
          if (!inCenter && !inBridge) continue;
          var isEdge = !inCenter && (Math.abs(wx) > 3.2 && Math.abs(wz) > 3.2);
          height[i0] = radial < 0.24 ? 2 : 1;
          if (isEdge || Math.abs(wx) > HALF - 2.6 || Math.abs(wz) > HALF - 2.6) sandy[i0] = 1;
        } else if (mp.shape === 'caldera') {
          var crater = 1 - radial + (n - 0.5) * 0.28;
          if (crater < 0.08 && radial > 0.25) continue;
          var ring = Math.exp(-Math.pow((radial - 0.64) / 0.19, 2)) * 1.9;
          height[i0] = clamp(1 + Math.floor(ring + n * 0.8), 1, 3);
          if (crater < 0.19 && radial > 0.35) { height[i0] = 1; sandy[i0] = 1; }
        } else if (mp.shape === 'glacier') {
          var dBox = Math.max(Math.abs(wx), Math.abs(wz)) / HALF;
          var blend = dBox * 0.62 + radial * 0.42;
          var landG = 1 - blend + (n - 0.5) * 0.24;
          if (landG < 0.08 && blend > 0.25) continue;
          height[i0] = clamp(1 + Math.floor(landG * 2.1 + n * 0.8), 1, 3);
          if (landG < 0.22) { height[i0] = 1; sandy[i0] = 1; }
        } else {
          var land = 1 - radial + (n - 0.5) * 0.35;
          if (land < 0.08 && radial > 0.25) continue;
          height[i0] = clamp(1 + Math.floor(clamp(land, 0, 1) * 1.8 + n * 0.9), 1, 3);
          if (land < 0.17 && radial > 0.3) { height[i0] = 1; sandy[i0] = 1; }
        }
      }
    }

    var pillars = [], rocks = [];
    for (var tr = 0; tr < N * N; tr++) {
      if (!height[tr] || sandy[tr] || isShore(tr)) continue;
      var at = cellCenter(tr);
      if (Math.abs(at.x) < 5 && Math.abs(at.z) < 5) continue;
      var r = rand();
      if (r < (mp.shape === 'cross' ? 0.017 : 0.015)) { pillars.push(tr); solid[tr] = 1; }
      else if (r < 0.028) { rocks.push(tr); solid[tr] = 1; }
    }

    var columns = 0, stacked = 0;
    for (var q = 0; q < N * N; q++) if (height[q]) { columns++; stacked += height[q]; }
    var tops = blockMesh(columns, new THREE.MeshLambertMaterial(groundTexture ? { map: groundTexture } : {}), arenaGroup);
    var sides = blockMesh(stacked, new THREE.MeshLambertMaterial(), arenaGroup);
    var tint = new THREE.Color();
    for (var s = 0; s < N * N; s++) {
      if (!height[s]) continue;
      var c0 = cellCenter(s), top = height[s];
      var jitter = 0.9 + hash2(s, 99) * 0.16;
      if (groundTexture) tint.setRGB(jitter, jitter, jitter);
      else tint.set(sandy[s] ? mp.sand : mp.grass).multiplyScalar(jitter);
      addBlock(tops, c0.x, top - 0.5, c0.z, 1, 1, 1, tint);
      for (var y = 0; y < top - 1; y++) {
        tint.set(sandy[s] ? mp.sand : mp.dirt).multiplyScalar((0.75 + y * 0.06) * (0.92 + hash2(s, y) * 0.1));
        addBlock(sides, c0.x, y + 0.5, c0.z, 1, 1, 1, tint);
      }
    }
    tops.instanceMatrix.needsUpdate = sides.instanceMatrix.needsUpdate = true;

    var pillarBodies = blockMesh(pillars.length * 6, new THREE.MeshLambertMaterial(), arenaGroup);
    var pillarGlows = blockMesh(pillars.length * 4, new THREE.MeshBasicMaterial(), arenaGroup);
    var stones = blockMesh(rocks.length * 2, new THREE.MeshLambertMaterial(), arenaGroup);
    pillars.forEach(function (index, k) {
      var p = cellCenter(index), base = height[index];
      var st = mp.style;
      if (st === 'pagoda' || st === 'hanok') {
        addBlock(pillarBodies, p.x, base + 0.5, p.z, 0.9, 1.0, 0.9, tint.set(mp.pillarBody));
        addBlock(pillarBodies, p.x, base + 1.35, p.z, 1.45, 0.35, 1.45, tint.set(mp.pillarMid));
        addBlock(pillarBodies, p.x, base + 1.85, p.z, 0.85, 0.65, 0.85, tint.set(mp.pillarBody));
        addBlock(pillarGlows, p.x, base + 2.35, p.z, 0.5, 0.5, 0.5, tint.set(k % 2 ? mp.glowA : mp.glowB));
      } else if (st === 'supertree') {
        addBlock(pillarBodies, p.x, base + 1.15, p.z, 0.52, 2.3, 0.52, tint.set(mp.pillarBody));
        addBlock(pillarGlows, p.x, base + 2.45, p.z, 2.0, 0.28, 2.0, tint.set(mp.glowA));
        addBlock(pillarGlows, p.x, base + 2.75, p.z, 1.15, 0.3, 1.15, tint.set(mp.glowB));
      } else if (st === 'eiffel' || st === 'spire') {
        addBlock(pillarBodies, p.x, base + 0.45, p.z, 0.98, 0.9, 0.98, tint.set(mp.pillarBody));
        addBlock(pillarBodies, p.x, base + 1.4, p.z, 0.62, 1.0, 0.62, tint.set(mp.pillarMid));
        addBlock(pillarBodies, p.x, base + 2.3, p.z, 0.34, 0.95, 0.34, tint.set(mp.pillarMid));
        addBlock(pillarGlows, p.x, base + 3.0, p.z, 0.2, 0.7, 0.2, tint.set(mp.glowA));
      } else if (st === 'stupa') {
        addBlock(pillarBodies, p.x, base + 0.4, p.z, 1.15, 0.8, 1.15, tint.set(mp.pillarBody));
        addBlock(pillarBodies, p.x, base + 1.15, p.z, 0.85, 0.7, 0.85, tint.set(mp.pillarMid));
        addBlock(pillarGlows, p.x, base + 1.85, p.z, 0.45, 0.7, 0.45, tint.set(mp.glowA));
      } else if (st === 'jungle' || st === 'monsoon' || st === 'acacia') {
        addBlock(pillarBodies, p.x, base + 0.95, p.z, 0.46, 1.9, 0.46, tint.set(mp.pillarBody));
        var cw = st === 'acacia' ? 2.35 : 1.7;
        addBlock(pillarBodies, p.x, base + 2.05, p.z, cw, 0.55, cw, tint.set(mp.pillarMid));
        addBlock(pillarGlows, p.x, base + 2.5, p.z, cw * 0.55, 0.35, cw * 0.55, tint.set(k % 2 ? mp.glowA : mp.glowB));
      } else if (st === 'balloon') {
        addBlock(pillarBodies, p.x, base + 0.35, p.z, 0.65, 0.7, 0.65, tint.set(mp.pillarBody));
        addBlock(pillarGlows, p.x, base + 2.4, p.z, 1.15, 1.35, 1.15, tint.set(k % 2 ? mp.glowA : mp.glowB));
      } else {
        addBlock(pillarBodies, p.x, base + 0.35, p.z, 0.8, 0.7, 0.8, tint.set(mp.pillarBody));
        addBlock(pillarBodies, p.x, base + 1.35, p.z, 0.52, 1.4, 0.52, tint.set(mp.pillarMid));
        addBlock(pillarBodies, p.x, base + 2.2, p.z, 0.74, 0.3, 0.74, tint.set(mp.pillarBody));
        addBlock(pillarGlows, p.x, base + 2.65, p.z, 0.36, 0.45, 0.36, tint.set(k % 2 ? mp.glowA : mp.glowB));
      }
    });
    rocks.forEach(function (index, k) {
      var p = cellCenter(index), base = height[index];
      addBlock(stones, p.x, base + 0.3, p.z, 0.82, 0.6, 0.75, tint.set(mp.stoneA));
      if (k % 2) addBlock(stones, p.x + 0.15, base + 0.75, p.z - 0.1, 0.46, 0.35, 0.46, tint.set(mp.stoneB));
    });
    [pillarBodies, pillarGlows, stones].forEach(function (mesh) { mesh.instanceMatrix.needsUpdate = true; });

    canvas.style.background = 'linear-gradient(to bottom,' + mp.skyTop + ' 0%,' + mp.skyTop + ' 20%,' + mp.skyBottom + ' 100%)';
    scene.fog.color.set(mp.fog);
    water.material.color.set(mp.water);
    water.material.emissive.set(mp.waterGlow ? '#b93805' : '#000000');
    water.material.opacity = mp.waterGlow ? 0.94 : 0.88;
    floor.material.color.copy(color(mp.water).multiplyScalar(0.32));
    hemiLight.color.copy(color(mp.hemiSky).lerp(color('#fff5ec'), 0.45));
    hemiLight.groundColor.set(mp.hemiGnd);
    sun.color.copy(color(mp.sun).lerp(color('#fff7ed'), 0.4));
    if (typeof sparkMesh !== 'undefined' && sparkMesh) sparkMesh.material.color.set(mp.glowA);
    if (typeof hero !== 'undefined' && hero) hero.y = Math.max(1, groundAt(hero.x, hero.z));
  }
  buildArena(selectedMapIdx);

  var starGeo = new THREE.BufferGeometry(), starPos = [];
  for (var st = 0; st < 280; st++) {
    var theta = rand() * Math.PI * 2, phi = 0.12 + rand() * 0.55;
    starPos.push(Math.cos(theta) * Math.cos(phi) * 180, Math.sin(phi) * 180, Math.sin(theta) * Math.cos(phi) * 180);
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  var stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: '#c8f8ff', size: 1.7, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.88 }));
  scene.add(stars);
  var moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTexture([[0, '#e8feff'], [0.42, '#8cf5ff'], [0.55, 'rgba(56,242,255,0.28)'], [1, 'rgba(56,242,255,0)']]), fog: false, depthWrite: false }));
  moon.scale.set(24, 24, 1);
  scene.add(moon);

  /* 6. ENEMIES (Stalker, Charger Bull, Void Caster, Boss) & RELICS */
  var STALKER_BOXES = [
    [0, 1.4, 0, 2.8, 2.4, 2.8, '#4c1d95'],
    [-0.7, 1.8, 1.45, 0.65, 0.55, 0.2, '#f43f5e', true], [0.7, 1.8, 1.45, 0.65, 0.55, 0.2, '#f43f5e', true],
    [-1.6, 2.2, 0, 0.7, 1.2, 0.7, '#7c3aed'], [1.6, 2.2, 0, 0.7, 1.2, 0.7, '#7c3aed'],
  ];
  var CHARGER_BOXES = [
    [-1.3, 0.6, 0, 1.2, 1.2, 2.0, '#450a0a'], [1.3, 0.6, 0, 1.2, 1.2, 2.0, '#450a0a'],
    [0, 2.8, 0, 4.4, 3.6, 5.2, '#991b1b'], [0, 3.0, 2.7, 2.2, 1.6, 0.4, '#fb923c', true],
    [-1.4, 4.8, 2.2, 0.7, 1.6, 1.5, '#fde047', true], [1.4, 4.8, 2.2, 0.7, 1.6, 1.5, '#fde047', true],
  ];
  var CASTER_BOXES = [
    [0, 2.8, 0, 2.8, 4.2, 2.8, '#312e81'], [0, 5.2, 0, 2.2, 1.6, 2.2, '#4338ca'],
    [0, 5.2, 1.2, 1.2, 0.8, 0.3, '#e879f9', true],
    [-1.8, 3.8, 0.4, 0.8, 2.0, 0.8, '#ec4899', true], [1.8, 3.8, 0.4, 0.8, 2.0, 0.8, '#ec4899', true],
  ];
  var BOSS_BOXES = [
    [-2.0, 0.8, 0, 1.8, 1.6, 2.4, '#180d29'], [2.0, 0.8, 0, 1.8, 1.6, 2.4, '#180d29'],
    [0, 4.2, 0, 6.2, 5.6, 5.6, '#2b124a'], [0, 4.4, 0, 6.8, 1.4, 6.0, '#6b21a8'],
    [0, 4.2, 2.9, 2.2, 2.0, 0.5, '#ff2e63', true],
    [-1.5, 5.6, 2.95, 1.2, 0.9, 0.3, '#fde047', true], [1.5, 5.6, 2.95, 1.2, 0.9, 0.3, '#fde047', true],
    [-2.6, 8.2, 0, 1.2, 2.8, 1.2, '#f43f5e', true], [2.6, 8.2, 0, 1.2, 2.8, 1.2, '#f43f5e', true],
    [-3.8, 5.0, 0.4, 1.4, 3.2, 1.6, '#4c1d95'], [3.8, 5.0, 0.4, 1.4, 3.2, 1.6, '#4c1d95'],
  ];
  var SHARD_BOXES = [
    [0, 0.6, 0, 2.0, 0.6, 2.0, '#1e355d'],
    [0, 2.5, 0, 1.9, 2.8, 1.9, '#ffd166', true],
    [0, 2.5, 0, 2.4, 1.3, 2.4, '#38f2ff', true],
    [0, 4.4, 0, 1.2, 1.0, 1.2, '#ffffff', true],
  ];
  var HERO_LOOKS = {
    toan_nhu: {
      skin: '#f8cfb0', blush: '#e6947c', brow: '#18181b', eye: '#ff7b24',
      hair: '#14161f', hairStyle: 'short_wavy', glasses: 'thick',
      coat: '#1e293b', coatDark: '#162032', inner: '#273549', pants: '#0f172a',
      boot: '#1e293b', trim: '#ff5c38', glow: '#ff6b35', scarf: '#1e293b',
      shortSleeve: true, capeStyle: 'none', width: 1.0, smile: 'warm', weapon: 'dragon_halberd'
    },
    xuan_hai: {
      skin: '#ffdec6', blush: '#efa08c', brow: '#111827', eye: '#38bdf8',
      hair: '#111827', hairStyle: 'neat_short', glasses: 'wire',
      coat: '#ffffff', coatDark: '#dbe4f0', inner: '#f1f5f9', pants: '#1e293b',
      boot: '#0f172a', trim: '#38f2ff', glow: '#70f8ff', scarf: '#0ea5e9',
      shortSleeve: false, capeStyle: 'none', width: 0.95, collar: true, smile: 'calm', weapon: 'twin_tonfa'
    },
    elias_j: {
      skin: '#ffd6b6', blush: '#ea9880', brow: '#111827', eye: '#4ade80',
      hair: '#111827', hairStyle: 'side_part',
      coat: '#1d4ed8', coatDark: '#1e3a8a', inner: '#2563eb', pants: '#0f172a',
      boot: '#1e293b', trim: '#4ade80', glow: '#4ade80', scarf: '#1d4ed8',
      shortSleeve: true, capeStyle: 'none', width: 0.97, collar: true, smile: 'calm', weapon: 'coloa_crossbow'
    },
    lily_hoang: {
      skin: '#ffe6d8', blush: '#f5a3ad', brow: '#4e2b18', eye: '#8b4513',
      hair: '#6b3e24', hair2: '#4e2a16', hairStyle: 'long_chestnut',
      coat: '#fcf4e8', coatDark: '#e3cbb0', inner: '#fffaf2', pants: '#1e1b4b',
      boot: '#312e81', trim: '#fb923c', glow: '#fb923c', scarf: '#6b3e24',
      shortSleeve: true, lace: true, capeStyle: 'long_hair', width: 0.90, mic: true, smile: 'coral', weapon: 'cyclone_shuriken'
    },
    kien_trinh: {
      skin: '#f5ceb0', blush: '#df8a74', brow: '#111827', eye: '#f43f5e',
      hair: '#111827', hair2: '#3f3f46', hairStyle: 'undercut',
      coat: '#111827', coatDark: '#1f2937', inner: '#18181b', pants: '#090d16',
      boot: '#18181b', trim: '#f43f5e', glow: '#f43f5e', scarf: '#18181b',
      shortSleeve: true, capeStyle: 'none', width: 1.08, collar: true, mic: true, smile: 'calm', weapon: 'drill_lance'
    },
    hieu_nguyen: {
      skin: '#f5d0b0', blush: '#e39a82', brow: '#111827', eye: '#22c55e',
      hair: '#111827', hairStyle: 'neat_short', glasses: 'wire',
      coat: '#15803d', coatDark: '#14532d', inner: '#166534', pants: '#1f2937',
      boot: '#111827', trim: '#86efac', glow: '#4ade80', scarf: '#15803d',
      shortSleeve: true, capeStyle: 'none', width: 1.0, collar: true, mic: true, smile: 'warm', weapon: 'pulse_amp'
    },
    quoc_vuong: {
      skin: '#f3c9a6', blush: '#df8f76', brow: '#111827', eye: '#d97706',
      hair: '#1c1917', hairStyle: 'side_part', glasses: 'thick',
      coat: '#5b3a2e', coatDark: '#3f2a21', inner: '#6b4636', pants: '#1c1917',
      boot: '#1c1917', trim: '#fbbf24', glow: '#f59e0b', scarf: '#5b3a2e',
      shortSleeve: true, capeStyle: 'none', width: 1.04, collar: true, smile: 'calm', weapon: 'boomerang_blade'
    },
    miley_nguyen: {
      skin: '#ffe3d1', blush: '#f2a0a8', brow: '#1c1917', eye: '#6d28d9',
      hair: '#1c1917', hair2: '#292524', hairStyle: 'long_chestnut',
      coat: '#f1f5f9', coatDark: '#94a3b8', inner: '#ffffff', pants: '#1e293b',
      boot: '#334155', trim: '#a78bfa', glow: '#a78bfa', scarf: '#334155',
      shortSleeve: false, capeStyle: 'long_hair', width: 0.9, collar: true, smile: 'coral', weapon: 'mine_case'
    }
  };

  function makePivotPart(boxes, px, py, pz) {
    var pivot = new THREE.Group();
    pivot.position.set(px || 0, py || 0, pz || 0);
    if (boxes && boxes.length) pivot.add(voxelModel(boxes));
    return pivot;
  }

  function buildWeaponMesh(kind, trimCol, glowCol) {
    var boxes = [];
    if (kind === 'dragon_halberd') {
      boxes.push(
        [0, 0.4, 1.1, 0.34, 0.34, 4.4, '#78350f'],
        [0, 1.45, 2.55, 0.54, 1.85, 0.48, trimCol, true],
        [0, 0.95, 3.25, 0.42, 1.25, 1.35, glowCol, true],
        [0, 1.85, 3.35, 0.28, 0.9, 0.95, '#fff3c4', true],
        [0, 0.1, 2.25, 0.72, 0.46, 0.46, trimCol]
      );
    } else if (kind === 'twin_tonfa') {
      boxes.push(
        [0, -0.05, 0.65, 0.32, 0.32, 2.35, '#0f172a'],
        [0, 0.28, 0.95, 0.24, 0.28, 2.65, glowCol, true],
        [0, 0.15, 2.35, 0.18, 0.42, 0.55, '#e0ffff', true],
        [0, 0.18, 0.25, 0.34, 0.62, 0.34, trimCol]
      );
    } else if (kind === 'cyclone_shuriken') {
      boxes.push(
        [0, 0, 0, 0.48, 0.48, 0.48, '#1e1b4b'],
        [0, 0, 0, 0.28, 2.85, 0.28, trimCol, true],
        [0, 0, 0, 2.85, 0.28, 0.28, glowCol, true],
        [0.85, 0.75, 0, 0.65, 0.65, 0.22, '#fff7ed', true],
        [-0.85, -0.75, 0, 0.65, 0.65, 0.22, '#fff7ed', true],
        [0, 0, 0, 0.78, 0.78, 0.32, '#facc15', true]
      );
    } else if (kind === 'coloa_crossbow') {
      boxes.push(
        [0, 0.15, 1.15, 0.42, 0.44, 2.4, '#78350f'],
        [0, 0.32, 1.85, 2.55, 0.3, 0.42, trimCol],
        [0, 0.34, 1.7, 2.85, 0.18, 0.22, glowCol, true],
        [0, 0.46, 1.55, 0.22, 0.22, 2.25, '#bbf7d0', true],
        [0, 0.48, 2.75, 0.46, 0.32, 0.52, '#4ade80', true]
      );
    } else if (kind === 'drill_lance') {
      boxes.push(
        [0, 0.1, 0.55, 1.15, 1.15, 1.05, '#475569'],
        [0, 0.1, 1.15, 1.24, 1.24, 0.28, trimCol],
        [0, 0.1, 1.7, 0.96, 0.96, 0.88, glowCol, true],
        [0, 0.1, 2.4, 0.68, 0.68, 0.72, '#fda4af', true],
        [0, 0.1, 2.95, 0.38, 0.38, 0.65, '#ffd166', true]
      );
    } else if (kind === 'pulse_amp') {
      boxes.push(
        [0, 0.2, 0.5, 0.9, 0.9, 0.7, '#14532d'],
        [0, 0.2, 0.9, 0.7, 0.7, 0.12, glowCol, true],
        [0, 0.2, 0.92, 0.3, 0.3, 0.14, '#ecfdf5', true]
      );
    } else if (kind === 'boomerang_blade') {
      boxes.push(
        [0, 0.2, 0.9, 0.38, 0.22, 2.0, '#7c2d12'],
        [0.62, 0.2, 1.78, 1.3, 0.22, 0.38, '#7c2d12'],
        [0, 0.3, 0.9, 0.18, 0.26, 1.9, glowCol, true],
        [0.62, 0.3, 1.78, 1.2, 0.26, 0.18, glowCol, true]
      );
    } else if (kind === 'mine_case') {
      boxes.push(
        [0, 0.2, 0.55, 0.9, 0.5, 0.9, '#312e81'],
        [0, 0.5, 0.55, 0.5, 0.14, 0.5, glowCol, true],
        [0, 0.62, 0.55, 0.18, 0.18, 0.18, '#ede9fe', true]
      );
    } else if (kind === 'stage_mic') {
      boxes.push(
        [0, 0.2, 0.32, 0.28, 1.35, 0.28, '#18181b'],
        [0, 0.85, 0.44, 0.42, 0.22, 0.42, '#38f2ff', true],
        [0, 1.15, 0.48, 0.58, 0.58, 0.58, '#cbd5e1']
      );
    }
    return voxelModel(boxes);
  }

  function buildArticulatedHero(hSpec) {
    var st = HERO_LOOKS[hSpec.id] || HERO_LOOKS.toan_nhu;
    var w = st.width || 1.0;
    var root = new THREE.Group();

    // Articulated Legs (ground y=0 -> hip y=2.55)
    function makeLeg(side) {
      var boxes = [
        [0, -0.52, 0, 1.02 * w, 1.1, 1.06, st.pants],
        [0, -1.04, 0.12, 1.08 * w, 0.32, 0.94, st.trim],
        [0, -1.66, 0.04, 1.08 * w, 1.06, 1.12, st.boot],
        [0, -2.35, 0.2, 1.14 * w, 0.4, 1.44, st.coatDark],
        [0, -1.9, 0.62, 0.52, 0.22, 0.14, st.glow, true]
      ];
      return makePivotPart(boxes, side * 0.68 * w, 2.55, 0);
    }
    var legL = makeLeg(1);
    var legR = makeLeg(-1);

    // Sculpted Streetwear / Speaker Torso
    var torsoBoxes = [
      [0, 2.68, 0, 2.38 * w, 0.62, 1.48, st.pants],
      [0, 3.04, 0, 2.52 * w, 0.34, 1.6, st.coatDark],
      [0, 4.18, 0.06, 2.52 * w, 2.02, 1.58, st.coat],
      [0, 4.25, -0.78, 1.8 * w, 1.66, 0.32, st.coatDark],
      [0.62, 4.58, 0.87, 0.34, 0.34, 0.1, st.coatDark],
      [0.62, 4.58, 0.92, 0.2, 0.2, 0.08, st.glow, true],
      [0, 5.38, 0, 0.96, 0.56, 0.96, st.skin]
    ];
    if (st.collar) {
      torsoBoxes.push(
        [0, 4.28, 0.85, 0.22, 1.62, 0.08, st.coatDark],
        [0.46, 5.18, 0.64, 0.44, 0.32, 0.46, st.coat],
        [-0.46, 5.18, 0.64, 0.44, 0.32, 0.46, st.coat]
      );
    } else if (st.lace) {
      torsoBoxes.push(
        [-0.55, 4.55, 0.86, 0.42, 0.35, 0.08, st.coatDark],
        [0.15, 3.85, 0.86, 0.48, 0.42, 0.08, st.coatDark],
        [-0.45, 3.55, 0.86, 0.36, 0.36, 0.08, st.coatDark],
        [0.65, 4.1, 0.86, 0.35, 0.45, 0.08, st.coatDark],
        [0, 5.16, 0.68, 1.15, 0.22, 0.26, st.skin]
      );
    } else {
      torsoBoxes.push([0, 5.16, 0.64, 1.12, 0.24, 0.34, st.inner]);
    }
    var torso = makePivotPart(torsoBoxes, 0, 0, 0);

    // Flowing Long Hair or Subtle Collar/Cape
    var capeBoxes = [];
    if (st.capeStyle === 'long_hair') {
      capeBoxes.push(
        [0, -0.35, -0.15, 3.22, 2.6, 0.52, st.hair],
        [0, -1.85, -0.32, 2.8, 1.45, 0.44, st.hair2 || st.hair],
        [1.18, -0.58, 1.0, 0.52, 1.85, 0.44, st.hair],
        [-1.18, -0.58, 1.0, 0.52, 1.85, 0.44, st.hair]
      );
    } else if (st.capeStyle === 'cape_short') {
      capeBoxes.push(
        [0, 0.12, 0.64, 2.35 * w, 0.32, 1.52, st.coatDark],
        [0, -0.6, -0.45, 2.1 * w, 1.15, 0.3, st.scarf]
      );
    } else {
      capeBoxes.push([0, 0.14, 0.6, 2.2 * w, 0.26, 1.45, st.coatDark]);
    }
    var cape = makePivotPart(capeBoxes, 0, 5.14, -0.82);

    // Fitted Short or Long Sleeve Arms
    function makeArm(side) {
      var bx = st.shortSleeve ? [
        [side * 0.08, -0.12, 0, 0.96, 0.88, 1.02, st.coat],
        [0, -1.0, 0.02, 0.78, 1.15, 0.78, st.skin],
        [0, -1.78, 0.05, 0.8, 0.62, 0.82, st.skin],
        [0, -1.42, 0.05, 0.84, 0.16, 0.86, st.trim, true]
      ] : [
        [side * 0.08, -0.08, 0, 0.96, 0.85, 1.02, st.coat],
        [0, -0.88, 0, 0.88, 1.18, 0.88, st.coat],
        [0, -1.52, 0.02, 0.92, 0.2, 0.92, st.coatDark],
        [0, -1.82, 0.05, 0.8, 0.62, 0.82, st.skin]
      ];
      return makePivotPart(bx, side * 1.62 * w, 4.95, 0);
    }
    var armL = makeArm(1);
    var armR = makeArm(-1);

    // Weapon Pivot(s) + Optional Stage Mic
    var weaponPivot = new THREE.Group();
    weaponPivot.position.set(-0.08, -1.85, 0.32);
    var wMesh = buildWeaponMesh(st.weapon, st.trim, st.glow);
    if (st.weapon === 'dragon_halberd') { wMesh.scale.setScalar(0.78); weaponPivot.rotation.y = -0.25; }
    weaponPivot.add(wMesh);
    if (st.weapon === 'cyclone_shuriken') {
      weaponPivot.position.set(-0.22, -1.7, 0.72);
      weaponPivot.rotation.y = Math.PI * 0.15;
    } else if (st.weapon === 'coloa_crossbow') {
      weaponPivot.position.set(0.18, -1.65, 0.2);
    }
    armR.add(weaponPivot);
    if (st.weapon === 'twin_tonfa') {
      var leftTonfa = buildWeaponMesh('twin_tonfa', st.trim, st.glow);
      leftTonfa.position.set(0, -1.85, 0.35);
      armL.add(leftTonfa);
    } else if (st.mic) {
      var micMesh = buildWeaponMesh('stage_mic', st.trim, st.glow);
      micMesh.position.set(0, -1.72, 0.45);
      micMesh.rotation.x = -0.35;
      armL.add(micMesh);
    }

    // Refined Realistic-Chibi Portrait Head
    var headBoxes = [
      [0, 1.48, 0, 3.16, 2.94, 2.9, st.skin],
      [1.64, 1.24, -0.05, 0.3, 0.68, 0.52, st.skin],
      [-1.64, 1.24, -0.05, 0.3, 0.68, 0.52, st.skin],
      [0, 1.02, 1.47, 0.24, 0.32, 0.16, st.blush],
      [1.08, 0.76, 1.46, 0.42, 0.22, 0.08, st.blush],
      [-1.08, 0.76, 1.46, 0.42, 0.22, 0.08, st.blush],
      [0.68, 1.3, 1.47, 0.68, 0.68, 0.1, '#f4f8ff', true],
      [-0.68, 1.3, 1.47, 0.68, 0.68, 0.1, '#f4f8ff', true],
      [0.65, 1.28, 1.52, 0.42, 0.52, 0.08, '#111827'],
      [-0.65, 1.28, 1.52, 0.42, 0.52, 0.08, '#111827'],
      [0.65, 1.18, 1.54, 0.32, 0.18, 0.08, st.eye, true],
      [-0.65, 1.18, 1.54, 0.32, 0.18, 0.08, st.eye, true],
      [0.52, 1.48, 1.55, 0.18, 0.18, 0.08, '#ffffff', true],
      [-0.78, 1.48, 1.55, 0.18, 0.18, 0.08, '#ffffff', true],
      [0.48, 1.76, 1.51, 0.38, 0.18, 0.1, st.brow],
      [-0.48, 1.76, 1.51, 0.38, 0.18, 0.1, st.brow],
      [0.84, 1.84, 1.51, 0.4, 0.18, 0.1, st.brow],
      [-0.84, 1.84, 1.51, 0.4, 0.18, 0.1, st.brow]
    ];
    if (st.glasses === 'thick') {
      headBoxes.push(
        [0.68, 1.68, 1.59, 0.9, 0.1, 0.1, '#111827'], [-0.68, 1.68, 1.59, 0.9, 0.1, 0.1, '#111827'],
        [0.68, 0.92, 1.59, 0.9, 0.1, 0.1, '#111827'], [-0.68, 0.92, 1.59, 0.9, 0.1, 0.1, '#111827'],
        [1.1, 1.3, 1.59, 0.1, 0.78, 0.1, '#111827'], [-1.1, 1.3, 1.59, 0.1, 0.78, 0.1, '#111827'],
        [0.26, 1.3, 1.59, 0.1, 0.78, 0.1, '#111827'], [-0.26, 1.3, 1.59, 0.1, 0.78, 0.1, '#111827'],
        [0, 1.5, 1.6, 0.44, 0.1, 0.1, '#111827'],
        [1.6, 1.5, 0.8, 0.1, 0.1, 1.6, '#111827'], [-1.6, 1.5, 0.8, 0.1, 0.1, 1.6, '#111827']
      );
    } else if (st.glasses === 'wire') {
      headBoxes.push(
        [0.68, 1.66, 1.58, 0.88, 0.06, 0.08, '#e5c158'], [-0.68, 1.66, 1.58, 0.88, 0.06, 0.08, '#e5c158'],
        [0.68, 0.94, 1.58, 0.88, 0.06, 0.08, '#e5c158'], [-0.68, 0.94, 1.58, 0.88, 0.06, 0.08, '#e5c158'],
        [1.1, 1.3, 1.58, 0.06, 0.74, 0.08, '#e5c158'], [-1.1, 1.3, 1.58, 0.06, 0.74, 0.08, '#e5c158'],
        [0.28, 1.3, 1.58, 0.06, 0.74, 0.08, '#e5c158'], [-0.28, 1.3, 1.58, 0.06, 0.74, 0.08, '#e5c158'],
        [0, 1.48, 1.59, 0.44, 0.06, 0.08, '#e5c158'],
        [1.6, 1.48, 0.8, 0.06, 0.06, 1.6, '#e5c158'], [-1.6, 1.48, 0.8, 0.06, 0.06, 1.6, '#e5c158']
      );
    }

    if (st.smile === 'warm') {
      headBoxes.push(
        [0, 0.5, 1.46, 0.76, 0.14, 0.08, '#9e4b45'],
        [0, 0.52, 1.47, 0.42, 0.06, 0.08, '#f5e6e4']
      );
    } else if (st.smile === 'coral') {
      headBoxes.push([0, 0.52, 1.46, 0.58, 0.13, 0.08, '#df6c75']);
    } else {
      headBoxes.push([0, 0.5, 1.46, 0.54, 0.12, 0.08, '#935249']);
    }

    // Hair cap & back locks + 5 Portrait-Matched Hair Styles
    headBoxes.push(
      [0, 2.75, -0.08, 3.42, 0.72, 3.12, st.hair],
      [0, 1.65, -1.46, 3.36, 2.15, 0.42, st.hair],
      [1.58, 1.95, -0.35, 0.34, 1.55, 2.08, st.hair],
      [-1.58, 1.95, -0.35, 0.34, 1.55, 2.08, st.hair]
    );
    if (st.hairStyle === 'short_wavy') {
      headBoxes.push(
        [-0.35, 2.18, 1.48, 1.3, 0.52, 0.32, st.hair],
        [0.75, 2.15, 1.48, 1.1, 0.46, 0.32, st.hair],
        [0, 3.18, 0.05, 2.9, 0.52, 2.75, st.hair]
      );
    } else if (st.hairStyle === 'neat_short') {
      headBoxes.push(
        [0, 2.28, 1.48, 2.9, 0.46, 0.3, st.hair],
        [0.95, 2.12, 1.48, 0.85, 0.42, 0.3, st.hair],
        [-0.95, 2.12, 1.48, 0.85, 0.42, 0.3, st.hair],
        [0, 3.16, -0.1, 2.8, 0.44, 2.7, st.hair]
      );
    } else if (st.hairStyle === 'side_part') {
      headBoxes.push(
        [0.45, 2.22, 1.5, 1.95, 0.56, 0.34, st.hair],
        [-0.95, 2.25, 1.5, 1.05, 0.48, 0.34, st.hair],
        [0.2, 3.22, 0.15, 2.8, 0.56, 2.8, st.hair]
      );
    } else if (st.hairStyle === 'long_chestnut') {
      // Center-parted (rẽ ngôi giữa) framing bangs + silky brown locks
      headBoxes.push(
        [1.42, 1.2, 0.65, 0.48, 2.5, 1.25, st.hair],
        [-1.42, 1.2, 0.65, 0.48, 2.5, 1.25, st.hair],
        [0.92, 2.1, 1.48, 0.95, 0.82, 0.28, st.hair],
        [-0.92, 2.1, 1.48, 0.95, 0.82, 0.28, st.hair],
        [0, 3.04, -0.22, 3.3, 0.46, 2.95, st.hair2 || st.hair],
        [0, 0.85, -1.48, 3.3, 2.4, 0.42, st.hair]
      );
    } else {
      headBoxes.push(
        [1.58, 1.55, -0.25, 0.3, 1.45, 1.88, st.hair2 || '#3f3f46'],
        [-1.58, 1.55, -0.25, 0.3, 1.45, 1.88, st.hair2 || '#3f3f46'],
        [0, 3.24, 0.2, 2.35, 0.66, 2.65, st.hair],
        [0.55, 2.22, 1.5, 1.2, 0.56, 0.34, st.hair],
        [-0.65, 2.34, 1.5, 0.9, 0.44, 0.34, st.hair]
      );
    }
    var head = makePivotPart(headBoxes, 0, 5.45, 0);

    root.add(legL, legR, torso, cape, armL, armR, head);
    root.userData.rig = {
      type: 'hero',
      weaponKind: st.weapon,
      hasMic: !!st.mic,
      legL: legL,
      legR: legR,
      armL: armL,
      armR: armR,
      cape: cape,
      head: head,
      weapon: weaponPivot
    };
    return root;
  }

  function buildEnemyRig(type, mapSpec, isElite) {
    var mp = mapSpec || activeMapSpec();
    var mb = mp.mobs || MAPS[0].mobs;
    var root = new THREE.Group();
    if (type === 'stalker') {
      var ss = mb.sShape || 'bird';
      var stBoxes = [];
      var wingLBoxes = [], wingRBoxes = [];
      if (ss === 'serpent') {
        stBoxes.push(
          [0, 1.35, 0.9, 1.5, 1.4, 1.4, mb.impBody],
          [0, 1.0, -0.5, 1.2, 1.0, 1.8, mb.impWing],
          [0, 0.75, -2.1, 0.85, 0.8, 1.6, mb.impBody],
          [0, 2.35, 0.9, 0.42, 0.8, 1.1, mb.impCore, true],
          [0.45, 1.65, 1.65, 0.36, 0.28, 0.14, '#fde047', true],
          [-0.45, 1.65, 1.65, 0.36, 0.28, 0.14, '#fde047', true]
        );
        wingLBoxes.push([0.55, 0, 0, 1.1, 0.28, 0.65, mb.impCore, true]);
        wingRBoxes.push([-0.55, 0, 0, 1.1, 0.28, 0.65, mb.impCore, true]);
      } else if (ss === 'drone') {
        stBoxes.push(
          [0, 2.1, 0, 1.85, 0.75, 1.85, mb.impBody],
          [0, 2.1, 0.95, 1.1, 0.45, 0.2, mb.impCore, true],
          [0, 2.55, 0, 0.8, 0.35, 0.8, mb.impCore, true]
        );
        wingLBoxes.push([0.9, 0.35, 0.65, 1.4, 0.2, 0.4, mb.impWing], [0.9, 0.35, -0.65, 1.4, 0.2, 0.4, mb.impCore, true]);
        wingRBoxes.push([-0.9, 0.35, 0.65, 1.4, 0.2, 0.4, mb.impWing], [-0.9, 0.35, -0.65, 1.4, 0.2, 0.4, mb.impCore, true]);
      } else if (ss === 'oni') {
        stBoxes.push(
          [0, 1.5, 0, 2.15, 2.0, 1.9, mb.impBody],
          [0.55, 2.85, 0.55, 0.38, 0.95, 0.38, mb.impCore, true],
          [-0.55, 2.85, 0.55, 0.38, 0.95, 0.38, mb.impCore, true],
          [0.5, 1.9, 0.98, 0.42, 0.3, 0.14, '#fde047', true],
          [-0.5, 1.9, 0.98, 0.42, 0.3, 0.14, '#fde047', true],
          [0, 1.35, 1.0, 1.1, 0.45, 0.2, mb.impCore, true]
        );
        wingLBoxes.push([0.45, -0.2, 0.4, 0.65, 1.4, 0.65, mb.impWing]);
        wingRBoxes.push([-0.45, -0.1, 0.8, 0.5, 0.5, 1.9, mb.impCore, true]);
      } else if (ss === 'scarab') {
        stBoxes.push(
          [0, 1.3, 0, 2.25, 1.45, 2.45, mb.impBody],
          [0, 2.1, -0.1, 1.85, 0.55, 1.95, mb.impWing],
          [0, 1.45, 1.26, 0.95, 0.65, 0.24, mb.impCore, true],
          [0.45, 1.8, 1.25, 0.35, 0.28, 0.14, '#fde047', true],
          [-0.45, 1.8, 1.25, 0.35, 0.28, 0.14, '#fde047', true]
        );
        wingLBoxes.push([0.75, 0.2, -0.15, 1.4, 0.2, 1.1, mb.impWing]);
        wingRBoxes.push([-0.75, 0.2, -0.15, 1.4, 0.2, 1.1, mb.impWing]);
      } else {
        // Wide-wing Raptor / Garuda / Condor / Gargoyle
        stBoxes.push(
          [0, 1.5, 0, 1.75, 1.85, 2.0, mb.impBody],
          [0, 2.45, 0.6, 1.25, 0.95, 1.2, mb.impBody],
          [0, 2.25, 1.32, 0.45, 0.42, 0.72, '#fbbf24', true],
          [0.42, 2.55, 1.2, 0.32, 0.26, 0.14, '#ffffff', true],
          [-0.42, 2.55, 1.2, 0.32, 0.26, 0.14, '#ffffff', true]
        );
        wingLBoxes.push([0.95, 0.25, 0, 1.95, 0.26, 1.05, mb.impWing], [1.65, 0.5, -0.15, 1.05, 0.3, 0.7, mb.impCore, true]);
        wingRBoxes.push([-0.95, 0.25, 0, 1.95, 0.26, 1.05, mb.impWing], [-1.65, 0.5, -0.15, 1.05, 0.3, 0.7, mb.impCore, true]);
      }
      if (isElite) stBoxes.push([0, 3.2, 0.1, 1.5, 0.35, 1.5, '#ffd166', true]);
      var body = makePivotPart(stBoxes, 0, 0, 0);
      var wingL = makePivotPart(wingLBoxes, 0.85, 1.75, -0.2);
      var wingR = makePivotPart(wingRBoxes, -0.85, 1.75, -0.2);
      root.add(body, wingL, wingR);
      root.userData.rig = { type: 'stalker', wingL: wingL, wingR: wingR };
      return root;
    }
    if (type === 'charger') {
      var cs = mb.cShape || 'buffalo';
      var chBoxes = [
        [0, 2.55, 0, 3.3, 2.5, 3.4, mb.bullBody],
        [0, 3.35, 1.65, 2.1, 1.75, 1.85, mb.bullBody],
        [0.58, 3.7, 2.58, 0.46, 0.32, 0.14, '#fde047', true],
        [-0.58, 3.7, 2.58, 0.46, 0.32, 0.14, '#fde047', true]
      ];
      if (cs === 'elephant') {
        chBoxes.push(
          [0, 3.9, -0.1, 3.6, 0.6, 2.6, mb.bullArmor],
          [0, 2.5, 2.75, 0.68, 2.0, 0.72, mb.bullBody],
          [1.05, 2.6, 3.1, 0.42, 0.45, 2.35, '#fef9c3', true],
          [-1.05, 2.6, 3.1, 0.42, 0.45, 2.35, '#fef9c3', true],
          [1.6, 3.5, 1.4, 0.4, 1.6, 1.2, mb.bullArmor],
          [-1.6, 3.5, 1.4, 0.4, 1.6, 1.2, mb.bullArmor]
        );
      } else if (cs === 'scorpion') {
        chBoxes.push(
          [1.95, 2.2, 2.1, 0.95, 0.85, 1.85, mb.bullArmor],
          [-1.95, 2.2, 2.1, 0.95, 0.85, 1.85, mb.bullArmor],
          [0, 3.9, -1.75, 0.85, 2.1, 0.85, mb.bullArmor],
          [0, 5.4, -0.7, 0.72, 0.85, 2.1, mb.bullArmor],
          [0, 5.1, 0.65, 0.65, 0.95, 0.95, mb.bullGlow, true]
        );
      } else if (cs === 'knight') {
        chBoxes.push(
          [0, 4.7, 1.5, 0.65, 1.2, 1.5, '#ef4444', true],
          [-1.75, 2.8, 2.45, 0.5, 0.5, 3.8, mb.bullArmor],
          [-1.75, 2.8, 4.35, 0.35, 0.35, 1.1, '#ffffff', true],
          [1.75, 2.7, 0.8, 0.45, 1.8, 1.75, mb.bullArmor]
        );
      } else if (cs === 'tiger') {
        chBoxes.push(
          [0, 3.88, -0.8, 3.45, 0.32, 0.52, '#18181b'],
          [0, 3.88, 0.1, 3.45, 0.32, 0.52, '#18181b'],
          [0, 3.88, 1.0, 3.45, 0.32, 0.52, '#18181b'],
          [0.85, 4.5, 1.5, 0.55, 0.6, 0.45, mb.bullBody],
          [-0.85, 4.5, 1.5, 0.55, 0.6, 0.45, mb.bullBody],
          [0, 2.9, -2.3, 0.5, 0.5, 1.9, mb.bullArmor]
        );
      } else if (cs === 'rhino') {
        chBoxes.push(
          [0, 3.45, 2.95, 0.65, 1.55, 0.95, mb.bullGlow, true],
          [0, 4.1, 0.1, 3.7, 0.8, 2.9, mb.bullArmor]
        );
      } else if (cs === 'lion') {
        chBoxes.push(
          [0, 3.5, 1.35, 3.3, 3.1, 1.45, mb.bullArmor],
          [0, 4.9, 1.35, 2.6, 0.7, 1.2, mb.bullGlow, true],
          [0, 2.9, -2.1, 0.48, 0.48, 1.6, mb.bullGlow, true]
        );
      } else if (cs === 'icebeast') {
        chBoxes.push(
          [0, 4.2, -0.8, 0.9, 1.6, 0.9, mb.bullGlow, true],
          [0, 4.5, 0.3, 1.05, 1.9, 1.05, mb.bullArmor, true],
          [1.3, 4.4, 1.7, 0.52, 1.3, 1.1, mb.bullGlow, true],
          [-1.3, 4.4, 1.7, 0.52, 1.3, 1.1, mb.bullGlow, true]
        );
      } else {
        // Wide Crescent Buffalo Horns (Vietnam Trâu Vàng)
        chBoxes.push(
          [1.85, 4.15, 1.7, 1.9, 0.48, 0.58, '#18181b'],
          [-1.85, 4.15, 1.7, 1.9, 0.48, 0.58, '#18181b'],
          [2.75, 4.55, 2.25, 0.48, 0.95, 0.75, mb.bullGlow, true],
          [-2.75, 4.55, 2.25, 0.48, 0.95, 0.75, mb.bullGlow, true],
          [0, 2.6, 1.68, 1.3, 1.0, 0.25, mb.bullArmor, true],
          [0, 2.9, 2.62, 0.68, 0.36, 0.28, '#fbbf24', true]
        );
      }
      if (isElite) chBoxes.push([0, 5.4, 1.2, 1.9, 0.42, 1.7, '#ffd166', true]);
      var chargerMain = makePivotPart(chBoxes, 0, 0, 0);
      var cLegL = makePivotPart([[0, -0.7, 0, 1.15, 1.4, 1.25, '#18181b']], 1.05, 1.4, 0);
      var cLegR = makePivotPart([[0, -0.7, 0, 1.15, 1.4, 1.25, '#18181b']], -1.05, 1.4, 0);
      root.add(chargerMain, cLegL, cLegR);
      root.userData.rig = { type: 'charger', legL: cLegL, legR: cLegR };
      return root;
    }
    if (type === 'caster') {
      var ms = mb.mShape || 'lantern';
      var cBoxes = [];
      if (ms === 'lantern') {
        cBoxes.push(
          [0, 3.2, 0, 2.75, 2.8, 2.75, mb.casterRobe, true],
          [0, 4.8, 0, 3.2, 0.48, 3.2, '#18181b'],
          [0, 1.6, 0, 2.95, 0.45, 2.95, '#18181b'],
          [0, 0.9, 0, 0.55, 1.2, 0.55, mb.casterGlow, true],
          [0, 5.4, 0, 0.65, 0.85, 0.65, mb.casterGlow, true]
        );
      } else if (ms === 'pyramid') {
        cBoxes.push(
          [0, 1.6, 0, 3.3, 0.9, 3.3, mb.casterRobe],
          [0, 2.6, 0, 2.5, 1.0, 2.5, mb.casterRobe],
          [0, 3.65, 0, 1.65, 1.1, 1.65, mb.casterGlow, true],
          [0, 4.7, 0, 0.85, 1.0, 0.85, '#ffffff', true]
        );
      } else if (ms === 'mandala' || ms === 'clock') {
        cBoxes.push(
          [0, 3.4, 0, 2.2, 2.2, 1.2, mb.casterRobe],
          [0, 3.4, 0, 3.6, 0.75, 0.75, mb.casterGlow, true],
          [0, 3.4, 0, 0.75, 3.6, 0.75, mb.casterGlow, true],
          [0, 5.6, 0, 0.9, 0.9, 0.9, '#ffffff', true]
        );
      } else if (ms === 'lamp') {
        cBoxes.push(
          [0, 1.7, 0, 2.8, 0.9, 2.8, '#b45309'],
          [0, 2.7, 0, 1.9, 1.2, 1.9, mb.casterRobe],
          [0, 3.2, 1.5, 0.6, 0.7, 1.3, '#f59e0b'],
          [0, 4.3, 0, 1.3, 1.7, 1.3, mb.casterGlow, true]
        );
      } else {
        // Floating Masked Totem / Drum Sentinel
        cBoxes.push(
          [0, 2.9, 0, 2.35, 3.4, 2.1, mb.casterRobe],
          [0, 3.6, 1.12, 1.85, 0.7, 0.25, mb.casterGlow, true],
          [0, 5.1, 0, 3.2, 0.55, 2.4, '#fbbf24', true],
          [0, 1.9, 1.12, 1.4, 0.55, 0.2, '#ffffff', true]
        );
      }
      var robe = makePivotPart(cBoxes, 0, 0, 0);
      var orbiters = makePivotPart([
        [2.3, 0, 0, 0.62, 1.05, 0.62, mb.casterGlow, true],
        [-1.15, 0.2, 1.95, 0.62, 1.05, 0.62, isElite ? '#ffd166' : '#38f2ff', true],
        [-1.15, -0.2, -1.95, 0.62, 1.05, 0.62, mb.casterGlow, true]
      ], 0, 3.3, 0);
      root.add(robe, orbiters);
      root.userData.rig = { type: 'caster', orbiters: orbiters };
      return root;
    }
    // Unique Per-Country Boss Titan
    var bs = mp.boss || MAPS[0].boss;
    var bBoxes = [
      [0, 4.3, 0, 4.6, 3.4, 3.2, bs.body],
      [0, 4.5, 1.65, 1.65, 1.65, 0.35, bs.glow, true],
      [0, 4.5, 1.82, 0.78, 0.78, 0.2, bs.visor, true],
      [2.6, 5.4, 0, 1.6, 1.8, 2.5, bs.armor],
      [-2.6, 5.4, 0, 1.6, 1.8, 2.5, bs.armor],
      [2.85, 6.4, 0, 0.72, 1.0, 0.72, bs.glow, true],
      [-2.85, 6.4, 0, 0.72, 1.0, 0.72, bs.glow, true],
      [0, 6.8, 0.1, 2.9, 2.3, 2.65, '#111827'],
      [0, 6.85, 1.44, 2.25, 0.54, 0.2, bs.visor, true],
      [0, 3.6, -1.85, 4.0, 4.6, 0.4, bs.armor]
    ];
    if (bs.crown === 'turtle') {
      bBoxes.push([0, 4.4, -2.55, 4.8, 4.8, 1.4, bs.armor], [0, 8.35, 0.1, 3.4, 0.7, 2.9, '#ffd166', true], [0, 9.4, 0.2, 0.45, 1.9, 0.45, '#38f2ff', true]);
    } else if (bs.crown === 'lion' || bs.crown === 'mane') {
      bBoxes.push([0, 7.0, -0.3, 4.4, 3.9, 2.1, bs.armor], [0, 8.9, 0.2, 3.2, 0.8, 2.2, bs.glow, true]);
    } else if (bs.crown === 'sun') {
      bBoxes.push([0, 8.4, 0.1, 3.0, 0.6, 2.6, '#fbbf24'], [0, 9.2, -0.9, 3.6, 3.6, 0.35, '#fde047', true]);
    } else if (bs.crown === 'tower') {
      bBoxes.push([0, 8.2, 0.1, 2.6, 0.6, 2.6, bs.armor], [0, 9.3, 0.1, 1.5, 1.6, 1.5, bs.armor], [0, 10.6, 0.1, 0.5, 1.5, 0.5, '#fef08a', true]);
    } else if (bs.crown === 'tusks') {
      bBoxes.push([1.15, 5.7, 2.2, 0.48, 0.48, 2.4, '#fef9c3', true], [-1.15, 5.7, 2.2, 0.48, 0.48, 2.4, '#fef9c3', true], [0, 8.3, 0.1, 3.0, 0.7, 2.6, '#f59e0b', true]);
    } else if (bs.crown === 'rhino') {
      bBoxes.push([0, 6.5, 2.3, 0.65, 1.5, 1.3, bs.glow, true], [0, 6.2, 1.6, 0.5, 0.9, 0.7, '#ffd166', true]);
    } else if (bs.crown === 'wings') {
      bBoxes.push([4.2, 5.8, -1.2, 3.2, 2.4, 0.4, bs.armor], [-4.2, 5.8, -1.2, 3.2, 2.4, 0.4, bs.armor], [0, 8.4, 0.2, 2.8, 0.8, 2.4, '#38f2ff', true]);
    } else {
      bBoxes.push([0, 8.2, 0.2, 3.1, 0.55, 2.8, '#fbbf24'], [1.15, 8.9, 0.35, 0.52, 1.15, 0.52, bs.glow, true], [-1.15, 8.9, 0.35, 0.52, 1.15, 0.52, bs.glow, true]);
    }
    var bossBody = makePivotPart(bBoxes, 0, 0, 0);
    var bLegL = makePivotPart([[0, -1.1, 0, 1.55, 2.2, 1.75, bs.armor], [0, -2.25, 0.25, 1.75, 0.6, 2.15, '#111827']], 1.25, 2.55, 0);
    var bLegR = makePivotPart([[0, -1.1, 0, 1.55, 2.2, 1.75, bs.armor], [0, -2.25, 0.25, 1.75, 0.6, 2.15, '#111827']], -1.25, 2.55, 0);
    var bArmL = makePivotPart([[0, -1.2, 0, 1.25, 2.4, 1.25, bs.armor], [0, -2.5, 0.3, 1.35, 0.95, 1.45, bs.glow, true]], 3.1, 5.1, 0);
    var bArmR = makePivotPart([[0, -1.2, 0, 1.25, 2.4, 1.25, bs.armor], [0, -2.5, 0.3, 1.35, 0.95, 1.45, bs.glow, true]], -3.1, 5.1, 0);
    var bOrbiters = makePivotPart([[4.1, 0.3, 0, 0.85, 1.3, 0.85, bs.glow, true], [-4.1, 0.3, 0, 0.85, 1.3, 0.85, bs.visor, true]], 0, 6.2, 0);
    root.add(bossBody, bLegL, bLegR, bArmL, bArmR, bOrbiters);
    root.userData.rig = { type: 'boss', legL: bLegL, legR: bLegR, armL: bArmL, armR: bArmR, orbiters: bOrbiters };
    return root;
  }

  function buildPickupRig() {
    var root = new THREE.Group();
    root.add(voxelModel([
      [0, 1.3, 0, 1.0, 0.8, 1.0, '#0284c7'],
      [0, 2.15, 0, 1.8, 1.0, 1.8, '#0ea5e9'],
      [0, 2.95, 0, 2.25, 1.15, 2.25, '#38f2ff', true],
      [0, 3.85, 0, 1.45, 0.95, 1.45, '#a5f3fc', true],
      [0, 4.6, 0, 0.72, 0.72, 0.72, '#ffffff', true],
      [1.45, 2.95, 0, 0.34, 0.34, 2.4, '#ffd166', true],
      [-1.45, 2.95, 0, 0.34, 0.34, 2.4, '#ffd166', true]
    ]));
    return root;
  }

  var MODELS = { hero: HEROES[0].boxes, enemy: BOSS_BOXES, pickup: SHARD_BOXES };
  var MODEL_HEIGHT = { hero: 9.0, stalker: 3.8, charger: 5.8, caster: 6.2, enemy: 9.6, boss: 9.6, pickup: 5.0 };

  var spriteTextures = {};
  function spriteTexture(slot) {
    if (!spriteTextures[slot]) {
      var texture = new THREE.TextureLoader().load(ASSETS[slot]);
      texture.colorSpace = THREE.SRGBColorSpace;
      spriteTextures[slot] = texture;
    }
    return spriteTextures[slot];
  }

  function buildModelForKey(key, boxes, hSpec, mapSpec, isElite) {
    if (key === 'hero') return buildArticulatedHero(hSpec || activeHeroSpec());
    if (key === 'stalker' || key === 'charger' || key === 'caster' || key === 'boss' || key === 'enemy') {
      return buildEnemyRig(key === 'enemy' ? 'boss' : key, mapSpec || activeMapSpec(), !!isElite);
    }
    if (key === 'pickup') return buildPickupRig();
    return voxelModel(boxes);
  }

  function makeCharacter(slot, size, boxes, heightKey, mapSpec, isElite) {
    var holder = new THREE.Group();
    var body;
    var key = heightKey || slot;
    if (customArt(slot)) {
      body = new THREE.Sprite(new THREE.SpriteMaterial({ map: spriteTexture(slot), alphaTest: 0.08 }));
      body.center.set(0.5, 0.02);
      body.scale.set(size * 1.25, size * 1.25, 1);
      body.userData.sprite = true;
    } else {
      body = buildModelForKey(key, boxes, slot === 'hero' ? activeHeroSpec() : null, mapSpec, isElite);
      body.scale.setScalar(size / (MODEL_HEIGHT[key] || 9.0));
    }
    holder.add(body);
    var shadow = new THREE.Mesh(new THREE.PlaneGeometry(size * 0.9, size * 0.9), new THREE.MeshBasicMaterial({ map: BLOB, transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.03;
    holder.add(shadow);
    if (slot === 'hero' || isElite) {
      var auraCol = slot === 'hero' ? activeHeroSpec().color : '#ffd166';
      var aura = new THREE.Mesh(
        new THREE.RingGeometry(size * 0.42, size * 0.56, 28),
        new THREE.MeshBasicMaterial({ color: auraCol, transparent: true, opacity: slot === 'hero' ? 0.72 : 0.85, side: THREE.DoubleSide, depthWrite: false })
      );
      aura.rotation.x = -Math.PI / 2;
      aura.position.y = 0.05;
      holder.add(aura);
      holder.userData.aura = aura;
    }
    holder.userData.body = body;
    scene.add(holder);
    return holder;
  }

  var hero = { x: 0, z: 0, y: groundAt(0, 0), vx: 0, vz: 0, facing: 0, node: makeCharacter('hero', R.heroSize, HEROES[selectedHeroIdx].boxes, 'hero') };
  var heroMode = customArt('hero') ? 'sprite' : 'voxel';
  var bubble = new THREE.Mesh(new THREE.SphereGeometry(R.heroSize * 0.85, 20, 14), new THREE.MeshBasicMaterial({ color: '#63f7ff', transparent: true, opacity: 0.24, depthWrite: false, blending: THREE.AdditiveBlending }));
  bubble.position.y = R.heroSize * 0.5;
  bubble.visible = false;
  hero.node.add(bubble);

  function rebuildHeroMesh() {
    var oldBody = hero.node.userData.body;
    if (oldBody) {
      hero.node.remove(oldBody);
      oldBody.traverse(function (n) { if (n.geometry) n.geometry.dispose(); if (n.material) n.material.dispose(); });
    }
    var hSpec = activeHeroSpec();
    MODELS.hero = hSpec.boxes;
    var body;
    if (customArt('hero')) {
      body = new THREE.Sprite(new THREE.SpriteMaterial({ map: spriteTexture('hero'), alphaTest: 0.08 }));
      body.center.set(0.5, 0.02);
      body.scale.set(R.heroSize * 1.25, R.heroSize * 1.25, 1);
      body.userData.sprite = true;
    } else {
      body = buildModelForKey('hero', hSpec.boxes, hSpec);
      body.scale.setScalar(R.heroSize / MODEL_HEIGHT.hero);
    }
    var skinHex = skinTintHex();
    if (skinHex && !body.userData.sprite) {
      // Equipped skin (soulbound NFT): tint a private copy of every material of the hero model.
      var skinColor = new THREE.Color(skinHex);
      body.traverse(function (n) {
        if (n.material && n.material.color) { n.material = n.material.clone(); n.material.color.lerp(skinColor, 0.5); }
      });
    }
    hero.node.add(body);
    hero.node.userData.body = body;
    if (hero.node.userData.aura) hero.node.userData.aura.material.color.set(skinHex || hSpec.color);
  }

  var pulseRing = new THREE.Mesh(new THREE.RingGeometry(0.6, 1.0, 28), new THREE.MeshBasicMaterial({ color: '#38f2ff', side: THREE.DoubleSide, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  pulseRing.rotation.x = -Math.PI / 2;
  pulseRing.visible = false;
  scene.add(pulseRing);

  function disposeNode(obj) {
    if (!obj) return;
    obj.traverse(function (n) {
      if (n.geometry && !n.userData.sharedGeo) n.geometry.dispose();
      if (n.material) n.material.dispose();
    });
  }

  var bladeGroup = new THREE.Group();
  hero.node.add(bladeGroup);
  function syncBladesMesh(count) {
    while (bladeGroup.children.length > count) {
      disposeNode(bladeGroup.children.pop());
    }
    while (bladeGroup.children.length < count) {
      var bg = new THREE.Group();
      var outer = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 1.55), new THREE.MeshBasicMaterial({ color: '#38f2ff' }));
      var inner = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 1.15), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
      var hilt = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.26), new THREE.MeshBasicMaterial({ color: '#ffd166' }));
      hilt.position.z = -0.62;
      bg.add(outer, inner, hilt);
      bladeGroup.add(bg);
    }
  }

  var SPARKS = 110, sparks = [];
  var sparkMesh = new THREE.InstancedMesh(BOX, new THREE.MeshBasicMaterial({ color: activeMapSpec().glowA }), SPARKS);
  sparkMesh.frustumCulled = false;
  for (var sp = 0; sp < SPARKS; sp++) sparks.push({ life: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 });
  scene.add(sparkMesh);
  function burst(x, y, z, count) {
    var made = 0;
    for (var i = 0; i < SPARKS && made < (count || 14); i++) {
      var p = sparks[i];
      if (p.life > 0) continue;
      var a = Math.random() * Math.PI * 2;
      p.life = 0.45 + Math.random() * 0.35;
      p.x = x; p.y = y; p.z = z;
      p.vx = Math.cos(a) * (1.2 + Math.random() * 2.8);
      p.vz = Math.sin(a) * (1.2 + Math.random() * 2.8);
      p.vy = 2.0 + Math.random() * 3.2;
      made++;
    }
  }

  var PROJ_GEO = new THREE.BoxGeometry(0.45, 0.45, 0.45);
  var EBULLET_GEO = new THREE.SphereGeometry(0.34, 8, 8);
  var GEM_GEO = new THREE.OctahedronGeometry(0.42, 0);
  var STRIKE_GEO = new THREE.RingGeometry(0.25, 2.3, 24);
  var HAZARD_GEO = new THREE.RingGeometry(0.2, 2.6, 24);

  /* 7. AUDIO */
  var audio = null, muted = false;
  function blip(freq, duration, type, volume, slideTo) {
    if (muted) return;
    try {
      if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended' && audio.resume) audio.resume();
      var now = audio.currentTime, osc = audio.createOscillator(), gain = audio.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, now);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
      gain.gain.setValueAtTime(volume || 0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(gain).connect(audio.destination);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    } catch (e) { /* audio optional */ }
  }

  /* Background music: a short procedural theme per map (see music.js). It follows the sound button and the current map. */
  var music = window.ARC_MUSIC ? window.ARC_MUSIC.create({
    getCtx: function () {
      if (!audio) { try { audio = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { audio = null; } }
      return audio;
    },
    isMuted: function () { return muted; },
  }) : null;
  function musicSync() {
    if (!music) return;
    if (muted || document.hidden) { music.stop(); return; }
    music.setMap(activeMapSpec().id);
    music.setMode(phase === 'playing' && !paused ? 'play' : 'lobby');
    music.start();
  }
  // Browsers only allow sound after a tap or key press: start the music on the first one.
  function unlockMusic() { if (audio && audio.state === 'suspended' && audio.resume) { try { audio.resume(); } catch (e) { /* ignore */ } } musicSync(); }
  window.addEventListener('pointerdown', unlockMusic);
  window.addEventListener('keydown', unlockMusic);
  document.addEventListener('visibilitychange', musicSync);

  /* 8. HUD, LIVE LEADERBOARD & WEB3 UI */
  var web3 = window.ARC_WEB3 ? window.ARC_WEB3.createClient(window.ARC_WEB3_CONFIG) : null;
  // The old on-device ranking is retired: only runs with an onchain transaction count.
  try { window.localStorage.removeItem('arc-voxel-quest:ranked-lb'); } catch (e) { /* ignore */ }

  function explorerTx(hash) {
    var base = ((web3 && web3.state.network.blockExplorerUrls && web3.state.network.blockExplorerUrls[0]) || '').replace(/\/+$/u, '');
    return base && hash ? base + '/tx/' + hash : '';
  }
  function escHtml(v) {
    return String(v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function getMergedLeaderboard() {
    if (!web3) return [];
    return web3.state.board.map(function (e) {
      return { mine: Boolean(web3.state.account) && String(e.player).toLowerCase() === String(web3.state.account).toLowerCase(), name: e.nickname || window.ARC_WEB3.shortAddr(e.player), addr: window.ARC_WEB3.shortAddr(e.player), hasNick: !!e.nickname, score: e.score, wave: e.wave, heroName: (HEROES[e.hero] && HEROES[e.hero].short) || '', txHash: e.txHash, url: explorerTx(e.txHash) };
    });
  }
  function boardSyncNote() {
    var info = web3 && web3.state.boardInfo;
    return info && info.behind > 600 ? t('lbSyncing') + ' (' + info.behind + ')' : '';
  }

  var styleEl = document.createElement('style');
  styleEl.textContent = ''
    + '.avq-btn{pointer-events:auto;cursor:pointer;border:1px solid rgba(110,235,255,.38);background:linear-gradient(180deg,rgba(24,52,96,.92),rgba(13,26,56,.95));color:#eefaff;border-radius:999px;padding:7px 14px;font-weight:700;font-size:inherit;transition:transform .14s cubic-bezier(.34,1.56,.64,1),box-shadow .14s,border-color .14s;box-shadow:0 4px 0 rgba(7,15,36,.75),0 6px 14px rgba(0,0,0,.35);display:inline-flex;align-items:center;gap:6px;white-space:nowrap}'
    + '.avq-btn:hover{transform:translateY(-2px);border-color:#63f7ff}'
    + '.avq-btn:active{transform:translateY(2px) scale(.96);box-shadow:0 1px 0 rgba(7,15,36,.85)}'
    + '.avq-btn.pri{background:linear-gradient(180deg,#38f2ff,#0ea5e9);color:#062038;border-color:#b8fbff;box-shadow:0 4px 0 #075985,0 8px 18px rgba(56,242,255,.32)}'
    + '.avq-btn.gold{background:linear-gradient(180deg,#ffe07d,#f59e0b);color:#2b1600;border-color:#fff3b0;box-shadow:0 4px 0 #92400e,0 8px 18px rgba(245,158,11,.3)}'
    + '.avq-btn.hero-on{border-color:#ffd166;background:linear-gradient(180deg,rgba(45,78,135,.98),rgba(20,42,82,.98));box-shadow:0 0 14px rgba(255,209,102,.35)}'
    + '.avq-btn.map-on{border-color:#38f2ff;background:linear-gradient(180deg,rgba(18,74,110,.98),rgba(10,36,68,.98));box-shadow:0 0 12px rgba(56,242,255,.38)}'
    + '.avq-btn:disabled{opacity:.55;cursor:not-allowed;transform:none}'
    + '.avq-pill{padding:5px 11px;border-radius:999px;background:rgba(10,18,40,.7);border:1px solid rgba(120,230,255,.24);backdrop-filter:blur(8px);display:flex;gap:8px;align-items:center;font-weight:700}'
    + '.avq-card{pointer-events:auto;cursor:pointer;flex:1 1 150px;background:linear-gradient(180deg,rgba(19,38,76,.95),rgba(9,19,44,.98));border:1px solid rgba(99,247,255,.4);border-radius:16px;padding:12px;text-align:left;display:flex;flex-direction:column;gap:6px;transition:transform .14s cubic-bezier(.34,1.56,.64,1),border-color .14s}'
    + '.avq-card:hover{transform:translateY(-4px);border-color:#ffd166;box-shadow:0 8px 24px rgba(56,242,255,.25)}'
    + '.avq-input{width:100%;box-sizing:border-box;background:#091224;border:1px solid rgba(120,230,255,.28);color:#eefaff;border-radius:10px;padding:7px 10px;font-size:13px;font-family:ui-monospace,monospace;outline:none}'
    + '.avq-input:focus{border-color:#38f2ff}'
    + '.avq-lb{width:100%;border-collapse:collapse;font-size:12px;text-align:left;font-family:ui-monospace,monospace}'
    + '.avq-lb th{opacity:.7;padding:3px 6px;border-bottom:1px solid rgba(120,230,255,.2)}'
    + '.avq-lb td{padding:4px 6px;border-bottom:1px solid rgba(120,230,255,.08)}'
    + '.avq-pop{position:fixed;pointer-events:none;font-weight:900;color:#63f7ff;text-shadow:0 2px 8px rgba(0,0,0,.85);transform:translate(-50%,-50%);font-size:14px}';
  document.head.appendChild(styleEl);

  function el(tag, css, parent) {
    var node = document.createElement(tag);
    if (css) node.style.cssText = css;
    (parent || document.body).appendChild(node);
    return node;
  }
  function stopPtr(node) {
    node.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    node.addEventListener('click', function (e) { e.stopPropagation(); });
  }

  var FONT = 'font-family:system-ui,-apple-system,"Segoe UI",sans-serif;';
  var hud = el('div', 'position:fixed;inset:0;pointer-events:none;user-select:none;color:#eefaff;' + FONT + 'font-size:clamp(12px,1.8vmin,15px);text-shadow:0 2px 6px rgba(0,0,0,.55)');

  var topBar = el('div', 'position:fixed;top:10px;left:10px;right:10px;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;pointer-events:none;z-index:10', hud);
  var leftGroup = el('div', 'display:flex;align-items:center;gap:6px;flex-wrap:wrap', topBar);
  var statPill = el('div', '', leftGroup); statPill.className = 'avq-pill';
  var heartsEl = el('span', 'color:#ff7b9c;letter-spacing:.04em', statPill);
  var scoreEl = el('span', 'color:#63f7ff', statPill);
  var waveEl = el('span', 'color:#f43f5e', statPill);
  var lvlEl = el('span', 'color:#ffd166', statPill);
  var killsEl = el('span', 'color:#aef9ff;font-size:.9em', statPill);
  var timeEl = el('span', 'color:#cfe9ff;font-size:.9em;font-variant-numeric:tabular-nums', statPill);
  var multBadge = el('span', 'color:#fb923c;font-size:.9em;display:none', statPill);

  var rightGroup = el('div', 'display:flex;align-items:center;gap:6px;flex-wrap:wrap', topBar);
  var langBtn = el('button', '', rightGroup); langBtn.className = 'avq-btn'; stopPtr(langBtn);
  var soundBtn = el('button', '', rightGroup); soundBtn.className = 'avq-btn'; stopPtr(soundBtn);
  var pauseBtn = el('button', 'display:none', rightGroup); pauseBtn.className = 'avq-btn'; pauseBtn.textContent = '⏸'; stopPtr(pauseBtn);
  var web3Btn = el('button', '', rightGroup); web3Btn.className = 'avq-btn'; stopPtr(web3Btn);
  var seasonPill = el('button', 'display:none', rightGroup); seasonPill.className = 'avq-btn'; stopPtr(seasonPill);
  var surrenderBtn = el('button', 'display:none', rightGroup); surrenderBtn.className = 'avq-btn'; stopPtr(surrenderBtn);
  var surrenderArmedAt = 0;
  surrenderBtn.onclick = function () {
    if (phase !== 'playing') return;
    var now = performance.now();
    if (now - surrenderArmedAt < 3000) { surrenderArmedAt = 0; surrenderBtn.textContent = t('surrenderBtn'); finish(false); return; }
    surrenderArmedAt = now; // first tap only arms it, so a stray tap cannot throw away a good run
    surrenderBtn.textContent = t('surrenderConfirm');
    setTimeout(function () { if (surrenderArmedAt === now) { surrenderArmedAt = 0; surrenderBtn.textContent = t('surrenderBtn'); } }, 3000);
  };

  var xpWrap = el('div', 'position:fixed;top:0;left:0;right:0;height:5px;background:rgba(10,18,40,.7);z-index:15', hud);
  var xpBar = el('div', 'height:100%;width:0%;background:linear-gradient(90deg,#38f2ff,#ffd166);transition:width .15s', xpWrap);
  var bossBarWrap = el('div', 'position:fixed;top:52px;left:50%;transform:translateX(-50%);width:min(82vw,420px);background:rgba(18,10,32,.86);border:1px solid rgba(244,63,94,.7);border-radius:12px;padding:6px 10px;display:none;z-index:11', hud);
  var bossBarTitle = el('div', 'font-size:12px;font-weight:900;color:#fda4af;display:flex;justify-content:space-between;margin-bottom:4px', bossBarWrap);
  var bossBarTrack = el('div', 'height:8px;border-radius:99px;background:rgba(255,255,255,.12);overflow:hidden', bossBarWrap);
  var bossBarFill = el('div', 'height:100%;width:100%;background:linear-gradient(90deg,#f43f5e,#fb923c);transition:width .1s', bossBarTrack);

  var dashBtn = el('button', 'position:fixed;right:18px;bottom:18px;width:74px;height:74px;border-radius:50%;justify-content:center;font-size:13px;display:none;z-index:12', hud);
  dashBtn.className = 'avq-btn pri';
  stopPtr(dashBtn);
  var tutEl = el('div', 'position:fixed;bottom:18px;left:50%;transform:translateX(-50%);padding:8px 16px;border-radius:999px;background:rgba(8,18,40,.88);border:1px solid rgba(244,63,94,.6);color:#ffe4e6;font-weight:700;font-size:13px;text-align:center;max-width:90vw;display:none;z-index:11', hud);
  var bannerEl = el('div', 'position:fixed;top:92px;left:50%;transform:translateX(-50%);padding:8px 18px;border-radius:999px;background:rgba(120,18,48,.92);border:1px solid rgba(251,113,133,.8);color:#ffe4e6;font-weight:900;font-size:13px;display:none;z-index:14', hud);

  var joyBase = el('div', 'position:fixed;width:92px;height:92px;margin:-46px 0 0 -46px;border-radius:50%;border:2px solid rgba(99,247,255,.45);background:rgba(56,242,255,.08);display:none;pointer-events:none', hud);
  var joyKnob = el('div', 'position:absolute;left:50%;top:50%;width:40px;height:40px;margin:-20px 0 0 -20px;border-radius:50%;background:rgba(99,247,255,.65);box-shadow:0 2px 8px rgba(0,0,0,.35)', joyBase);

  var popupsEl = el('div', 'position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:9', hud);
  var popups = [];

  // Title / Game Over Center Card (with Hero Picker + Embedded Live Leaderboard!)
  var card = el('div', 'position:fixed;left:50%;top:76px;transform:translateX(-50%);text-align:center;width:min(94vw,680px);max-height:calc(100dvh - 90px);overflow-y:auto;padding:14px 18px;border-radius:22px;background:rgba(7,13,32,.97);border:1px solid rgba(99,247,255,.6);backdrop-filter:blur(12px);pointer-events:auto;z-index:20;box-shadow:0 0 0 1px rgba(99,247,255,.18),0 0 34px rgba(56,242,255,.22),0 22px 56px rgba(0,0,0,.72)', hud);
  /* The top bar wraps onto several rows on narrow screens: keep the card fully below it and scrollable instead of hidden behind it. */
  function layoutCard() {
    if (!card.offsetHeight) return;
    var bar = topBar.getBoundingClientRect();
    var top = Math.max(56, Math.ceil(bar.bottom) + 10);
    var avail = window.innerHeight - top - 12;
    var h = card.scrollHeight;
    if (h < avail) top += Math.floor((avail - h) * 0.4); // sit a little lower than the top when there is room
    card.style.top = top + 'px';
    card.style.maxHeight = Math.max(160, window.innerHeight - top - 12) + 'px';
  }
  window.addEventListener('resize', layoutCard);
  stopPtr(card);
  var cardTitle = el('div', 'font-size:1.85em;font-weight:900;color:#63f7ff;line-height:1.15', card);
  var cardBody = el('div', 'margin-top:6px;opacity:.94;line-height:1.4;font-size:.96em', card);

  // Feature showcase: newcomers see everything the game offers on the home card; each tile opens the matching tab.
  var featBox = el('div', 'margin-top:10px;padding:10px;border-radius:14px;background:rgba(7,14,32,.68);border:1px solid rgba(255,209,102,.28)', card);
  var featTitle = el('div', 'font-weight:900;font-size:13px;color:#ffd166;margin-bottom:8px', featBox);
  var featBar = el('div', 'height:6px;border-radius:99px;background:rgba(120,230,255,.16);overflow:hidden;margin-bottom:8px', featBox);
  var featBarFill = el('div', 'height:100%;width:0%;background:linear-gradient(90deg,#38f2ff,#ffd166);transition:width .3s', featBar);
  var featGrid = el('div', 'display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:6px;text-align:left', featBox);
  /* Quests follow a new player's journey; `done` reads the live wallet state, so ticks appear as they play. */
  function qState() {
    var st = web3 && web3.state;
    return {
      connected: Boolean(st && st.account),
      played: best > 0 || Boolean(st && st.profile && st.profile.totalRuns > 0),
      saved: Boolean(st && st.profile && st.profile.totalRuns > 0),
      entered: Boolean(st && st.playerState && st.playerState.entered),
      daily: Boolean(st && st.questState && st.questState.mask > 0),
      hero: Boolean(st && st.skinState && st.skinState.owned > 0),
    };
  }
  function openTab(tab) { activeTab = tab; if (web3 && web3.state.account) openWeb3Modal(); else openConnectModal(); }
  var QUESTS = [
    { icon: '🔌', t: 'qConnectT', d: 'qConnectD', done: function (q) { return q.connected; }, go: function () { if (web3 && web3.state.account) openWeb3Modal(); else openConnectModal(); } },
    { icon: '⚔️', t: 'qPlayT', d: 'qPlayD', done: function (q) { return q.played; }, go: function () { requestStart(); } },
    { icon: '⛓️', t: 'qSaveT', d: 'qSaveD', done: function (q) { return q.saved; }, go: function () { openTab('profile'); } },
    { icon: '🏁', t: 'qSeasonT', d: 'qSeasonD', done: function (q) { return q.entered; }, go: function () { openTab('season'); } },
    { icon: '📅', t: 'qDailyT', d: 'qDailyD', done: function (q) { return q.daily; }, go: function () { openTab('quests'); } },
    { icon: '🛒', t: 'qHeroT', d: 'qHeroD', done: function (q) { return q.hero; }, go: function () { openTab('shop'); } },
  ];
  var QUEST_ROW = 'display:flex;gap:8px;align-items:flex-start;padding:7px 10px;border-radius:12px;background:#0a1630;border:1px solid rgba(120,230,255,.22);color:#eefaff;cursor:pointer;text-align:left;font:inherit;min-width:0';
  var questRows = QUESTS.map(function (qd) {
    var b = el('button', QUEST_ROW, featGrid);
    var mark = el('span', 'font-size:17px;line-height:1.15;flex:none;width:22px;text-align:center', b);
    var col = el('span', 'display:flex;flex-direction:column;min-width:0;flex:1', b);
    var head = el('span', 'display:flex;align-items:center;gap:6px', col);
    var ti = el('span', 'font-weight:800;font-size:12.5px;color:#aef9ff', head);
    var tag = el('span', 'font-size:9.5px;font-weight:900;letter-spacing:.06em;color:#08202f;background:#ffd166;border-radius:99px;padding:1px 7px;display:none', head);
    var de = el('span', 'font-size:11.5px;opacity:.82;line-height:1.35', col);
    b.onclick = qd.go;
    return { qd: qd, b: b, mark: mark, ti: ti, tag: tag, de: de };
  });
  function refreshFeatureTexts() {
    var q = qState();
    var tracked = QUESTS.filter(function (x) { return x.done; });
    var doneCount = tracked.filter(function (x) { return x.done(q); }).length;
    var nextFound = false;
    featTitle.textContent = t('featuresTitle') + ' · ' + doneCount + '/' + tracked.length + ' ' + t('boardDone');
    featBarFill.style.width = Math.round((doneCount / tracked.length) * 100) + '%';
    questRows.forEach(function (r) {
      var isDone = r.qd.done ? r.qd.done(q) : false;
      var isNext = !nextFound && r.qd.done && !isDone;
      if (isNext) nextFound = true;
      r.ti.textContent = t(r.qd.t);
      r.de.textContent = t(r.qd.d);
      r.mark.textContent = r.qd.done ? (isDone ? '✅' : '⬜') : r.qd.icon;
      r.ti.style.textDecoration = isDone ? 'line-through' : 'none';
      r.b.style.opacity = isDone ? '.62' : '1';
      r.b.style.borderColor = isNext ? '#ffd166' : 'rgba(120,230,255,.22)';
      r.tag.style.display = isNext ? 'inline' : 'none';
      r.tag.textContent = t('questNext');
    });
  }

  var heroBox = el('div', 'margin-top:8px;padding:10px;border-radius:14px;background:rgba(7,14,32,.68);border:1px solid rgba(120,230,255,.22)', card);
  var mapRow = el('div', 'display:flex;flex-direction:column;align-items:center;gap:5px;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid rgba(120,230,255,.14)', heroBox);
  var mapHeadRow = el('div', 'display:flex;align-items:center;justify-content:space-between;width:100%;gap:8px;flex-wrap:wrap', mapRow);
  var mapBoxLbl = el('span', 'font-weight:800;font-size:12px;color:#63f7ff', mapHeadRow);
  var roadmapEl = el('span', 'font-size:11px;color:#ffd166;opacity:.9;font-weight:700', mapHeadRow);
  var mapListEl = el('div', 'display:flex;justify-content:center;gap:4px;flex-wrap:wrap', mapRow);
  var mapDescEl = el('div', 'font-size:11.5px;color:#e0f2fe;opacity:.92;font-weight:700', mapRow);
  var heroTopRow = el('div', 'display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px', heroBox);
  var heroBoxLbl = el('div', 'font-weight:800;font-size:12px;color:#ffd166', heroTopRow);
  var nickInput = el('input', 'width:170px;padding:4px 8px;font-size:12px', heroTopRow); nickInput.className = 'avq-input';
  nickInput.value = playerName;
  nickInput.maxLength = 16;
  var nickNote = el('div', 'flex-basis:100%;font-size:11px;min-height:14px;text-align:right', heroTopRow);
  /* Saves the nickname locally and, when a wallet is connected, on the leaderboard server. */
  function saveNickname(value) {
    var clean = String(value || '').trim().slice(0, 16);
    playerName = clean || 'Player';
    try { window.localStorage.setItem('arc-voxel-quest:nick', playerName); } catch (e) { /* ignore */ }
    if (!web3 || !web3.state.session) return Promise.resolve({ ok: true, local: true });
    return web3.setNickname(clean).then(function () {
      return web3.refreshBoard(true).then(function () { renderEmbeddedLeaderboard(); return { ok: true }; });
    }).catch(function (err) { return { ok: false, message: (err && err.message) || String(err) }; });
  }
  nickInput.onchange = function () {
    nickNote.style.color = '#aef9ff';
    nickNote.textContent = '...';
    saveNickname(nickInput.value).then(function (res) {
      nickInput.value = playerName;
      nickNote.style.color = res.ok ? '#7dffb1' : '#ff9a9a';
      nickNote.textContent = res.ok ? (res.local ? '' : '✅ ' + t('nickSavedMsg')) : '⚠️ ' + res.message;
    });
  };
  var heroMainRow = el('div', 'display:flex;align-items:center;gap:12px;flex-wrap:wrap;justify-content:center', heroBox);
  var heroPreviewBox = el('div', 'width:102px;height:110px;border-radius:14px;border:1px solid rgba(56,242,255,.38);background:radial-gradient(circle at 50% 42%,rgba(56,242,255,.22),rgba(7,12,28,.95));display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;flex-shrink:0;box-shadow:inset 0 0 18px rgba(56,242,255,.15)', heroMainRow);
  var heroPreviewCanvas = document.createElement('canvas');
  heroPreviewCanvas.width = 140; heroPreviewCanvas.height = 152;
  heroPreviewCanvas.style.cssText = 'width:100%;height:100%;display:block';
  heroPreviewBox.appendChild(heroPreviewCanvas);
  var heroPreviewCtx = heroPreviewCanvas.getContext('2d');
  var heroRightCol = el('div', 'flex:1;min-width:210px;display:flex;flex-direction:column;align-items:center;gap:6px', heroMainRow);
  var heroListEl = el('div', 'display:flex;justify-content:center;gap:6px;flex-wrap:wrap', heroRightCol);
  var heroDescEl = el('div', 'font-size:12.5px;color:#aef9ff;font-weight:600;text-align:center', heroRightCol);

  var cardStats = el('div', 'margin-top:10px;display:flex;justify-content:center;gap:14px;flex-wrap:wrap;font-weight:800;color:#ffd166', card);
  var cardActions = el('div', 'margin-top:12px;display:flex;justify-content:center;gap:10px;flex-wrap:wrap', card);
  var cardPlayBtn = el('button', '', cardActions); cardPlayBtn.className = 'avq-btn pri';
  var cardClaimBtn = el('button', 'display:none', cardActions); cardClaimBtn.className = 'avq-btn gold';
  var cardClaimOwnBtn = el('button', 'display:none', cardActions); cardClaimOwnBtn.className = 'avq-btn';
  var cardShareBtn = el('button', 'display:none', cardActions); cardShareBtn.className = 'avq-btn';
  var cardClaimStatus = el('div', 'margin-top:8px;font-size:12.5px;min-height:16px;color:#aef9ff', card);
  var cardGoal = el('div', 'margin-top:6px;font-size:12px;color:#ffd166;font-weight:700;line-height:1.4', card);

  // Embedded Live Leaderboard directly on Title / End Card
  var cardLbBox = el('div', 'margin-top:10px;padding:10px;border-radius:14px;background:rgba(5,10,24,.75);border:1px solid rgba(255,209,102,.24);text-align:left', card);
  var cardLbTitle = el('div', 'font-weight:800;font-size:12.5px;color:#ffd166;margin-bottom:6px', cardLbBox);
  var cardLbTable = el('table', '', cardLbBox); cardLbTable.className = 'avq-lb';
  var cardHint = el('div', 'margin-top:8px;font-size:11.5px;opacity:.76;line-height:1.35', card);

  // Level-up 1-of-3 Modal
  var lvlOverlay = el('div', 'position:fixed;inset:0;background:rgba(4,9,24,.74);backdrop-filter:blur(6px);display:none;align-items:center;justify-content:center;padding:16px;pointer-events:auto;z-index:25', hud);
  stopPtr(lvlOverlay);
  var lvlModal = el('div', 'width:min(94vw,620px);background:#0b1530;border:1px solid rgba(255,209,102,.48);border-radius:20px;padding:18px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.7)', lvlOverlay);
  var lvlTitleEl = el('div', 'font-size:20px;font-weight:900;color:#ffd166', lvlModal);
  var lvlCardsEl = el('div', 'margin-top:14px;display:flex;gap:10px;flex-wrap:wrap;justify-content:center', lvlModal);
  var lvlHintEl = el('div', 'margin-top:10px;font-size:12px;opacity:.75', lvlModal);

  // Web3 / Arc L1 Modal
  var w3Overlay = el('div', 'position:fixed;inset:0;background:rgba(4,8,20,.72);backdrop-filter:blur(6px);display:none;align-items:center;justify-content:center;padding:16px;pointer-events:auto;z-index:30', hud);
  stopPtr(w3Overlay);
  var w3Modal = el('div', 'width:min(94vw,520px);max-height:86vh;overflow-y:auto;background:#0d1730;border:1px solid rgba(99,247,255,.35);border-radius:18px;padding:18px;box-shadow:0 20px 60px rgba(0,0,0,.65);display:flex;flex-direction:column;gap:12px', w3Overlay);
  var w3Head = el('div', 'display:flex;justify-content:space-between;align-items:center;gap:8px', w3Modal);
  var w3Title = el('div', 'font-size:18px;font-weight:900;color:#63f7ff', w3Head);
  var w3Close = el('button', 'padding:4px 10px', w3Head); w3Close.className = 'avq-btn'; w3Close.textContent = '✕';
  var w3Tabs = el('div', 'display:flex;gap:6px;flex-wrap:wrap', w3Modal);
  var tabBtns = { profile: el('button', '', w3Tabs), season: el('button', '', w3Tabs), quests: el('button', '', w3Tabs), shop: el('button', '', w3Tabs), leaderboard: el('button', '', w3Tabs), wallet: el('button', '', w3Tabs), network: el('button', '', w3Tabs) };
  Object.keys(tabBtns).forEach(function (k) { tabBtns[k].className = 'avq-btn'; });
  var w3Body = el('div', 'display:flex;flex-direction:column;gap:10px;font-size:13px;line-height:1.45', w3Modal);
  var w3Status = el('div', 'font-size:12px;color:#ffd166;min-height:16px', w3Modal);

  // Connect-wallet dialog: popular wallets (same pattern as other Web3 apps)
  var cnOverlay = el('div', 'position:fixed;inset:0;background:rgba(4,8,20,.78);backdrop-filter:blur(6px);display:none;align-items:center;justify-content:center;padding:16px;pointer-events:auto;z-index:40', hud);
  stopPtr(cnOverlay);
  var cnModal = el('div', 'position:relative;width:min(94vw,460px);max-height:92vh;overflow-y:auto;background:#0d1730;border:1px solid rgba(99,247,255,.35);border-radius:22px;padding:22px 18px 16px;box-shadow:0 20px 60px rgba(0,0,0,.65);display:flex;flex-direction:column;gap:12px', cnOverlay);
  var cnClose = el('button', 'position:absolute;top:10px;right:10px;padding:4px 10px', cnModal); cnClose.className = 'avq-btn'; cnClose.textContent = '✕';
  var cnBody = el('div', 'display:flex;flex-direction:column;gap:12px', cnModal);
  var cnStatus = el('div', 'font-size:12px;color:#ffd166;min-height:16px;text-align:center', cnModal);

  // Transaction confirmation, like a wallet popup: shown before the passkey prompt so the player sees exactly what they approve.
  var txOverlay = el('div', 'position:fixed;inset:0;background:rgba(4,8,20,.78);backdrop-filter:blur(6px);display:none;align-items:center;justify-content:center;padding:16px;pointer-events:auto;z-index:60', hud);
  stopPtr(txOverlay);
  var txModal = el('div', 'width:min(94vw,420px);background:#0d1730;border:1px solid rgba(99,247,255,.5);border-radius:18px;padding:18px;box-shadow:0 20px 60px rgba(0,0,0,.7);display:flex;flex-direction:column;gap:10px;color:#eefaff', txOverlay);
  function describeTx(info) {
    var p = info.params || {};
    switch (info.action) {
      case 'enter': return fill(t('confirmEnter'), { fee: '1' });
      case 'buy-skin': return fill(t('confirmBuy'), { lvl: p.id, name: t('skinNames')[p.id] || '', cost: fmtN(SKIN_COSTS[p.id] || 0), bonus: pct(MAGNET_STEPS[(p.id || 1) - 1] || 0) });
      case 'equip': return p.id ? fill(t('confirmEquip'), { lvl: p.id, name: t('skinNames')[p.id] || '' }) : t('confirmUnequip');
      case 'claim': return fill(t('confirmClaim'), { season: Number(p.season) + 1, rank: Number(p.rank) + 1 });
      case 'rollover': return fill(t('confirmRollover'), { season: Number(p.season) + 1 });
      case 'submit-run': return fill(t('confirmSave'), { points: fmtN(info.points || 0) });
      default: return t('confirmGeneric');
    }
  }
  function confirmTx(info) {
    return new Promise(function (resolve) {
      txModal.innerHTML = '';
      el('div', 'font-size:18px;font-weight:900;color:#63f7ff', txModal).textContent = '🔐 ' + t('confirmTitle');
      el('div', 'font-size:14px;line-height:1.5;padding:10px 12px;border-radius:12px;background:rgba(120,230,255,.08)', txModal).textContent = describeTx(info);
      function line(label, value) {
        var r = el('div', 'display:flex;justify-content:space-between;gap:8px;font-size:12.5px', txModal);
        el('span', 'opacity:.7', r).textContent = label;
        el('span', 'font-weight:700;color:#aef9ff;text-align:right;word-break:break-all', r).textContent = value;
      }
      line(t('confirmNetwork'), web3.state.network.chainName);
      line(t('confirmWallet'), window.ARC_WEB3.shortAddr(web3.state.account));
      line(t('confirmGas'), t('confirmGasFree'));
      var row = el('div', 'display:flex;gap:8px;margin-top:6px', txModal);
      var no = el('button', 'flex:1;justify-content:center', row); no.className = 'avq-btn'; no.textContent = t('rejectBtn');
      var ok = el('button', 'flex:1;justify-content:center', row); ok.className = 'avq-btn pri'; ok.textContent = t('confirmBtn');
      function done(v) { txOverlay.style.display = 'none'; resolve(v); }
      no.onclick = function () { done(false); };
      ok.onclick = function () { done(true); };
      txOverlay.style.display = 'flex';
    });
  }
  if (web3) web3.onConfirm = confirmTx;

  var activeTab = 'profile', claimStatusText = '', lastTxExplorerUrl = '', runClaimed = false;

  /* 9. ENDLESS SURVIVOR STATE */
  var phase = 'title', paused = false, levelUpChoices = null;
  var score = 0, best = 0, gems = 0, kills = 0, streak = 0, maxCombo = 1, streakTimer = 0;
  var telemetry = [], lastCpAt = 0, runHeroShort = '', lastSkinTint = '', prizeAlert = false;
  var level = 1, xp = 0, xpNeed = 35, wave = 1;
  var maxHearts = 4, hearts = 4, timeLeft = 0, elapsed = 0, spawnTimer = 0, nextBossAt = 25;
  var invulnerable = 0, dashCooldown = 0, dashTimer = 0, pulseWaveTimer = 0, endedAt = 0, fps = 60;
  var bannerTimer = 0;
  var tutorialStage = 0;
  try {
    best = Number(window.localStorage.getItem('arc-voxel-quest:best')) || 0;
    tutorialStage = window.localStorage.getItem('arc-voxel-quest:tut-done') === '1' ? 0 : 1;
  } catch (e) { tutorialStage = 1; }

  var upLevels = {};
  var fireRateMult = 1, speedStatMult = 1, magnetMult = 1;
  var wTimers = { dragon: 0, lightning: 0, shuriken: 0, coloa: 0, drill: 0, orbital: 0, pulse: 0, boomerang: 0, mines: 0 };
  var enemies = [], pickups = [], projectiles = [], enemyBullets = [], hazards = [], bolts = [], strikes = [], fxRings = [], mines = [];

  function saveBest(val) {
    try { window.localStorage.setItem('arc-voxel-quest:best', String(val)); } catch (e) { /* ignore */ }
  }
  function activeHeroSpec() { return HEROES[selectedHeroIdx]; }
  /* Every upgrade NFT the wallet owns is one level; each level widens the item pickup range by 20%. */
  var MAGNET_STEPS = [0.04, 0.06, 0.08, 0.10, 0.12, 0.15]; // each level adds a bit more than the one before: +4% ... +15%
  function magnetBonus(level) { var sum = 0; for (var i = 0; i < Math.min(6, level); i++) sum += MAGNET_STEPS[i]; return sum; }
  function pct(x) { return Math.round(x * 100); }
  function magnetLevel() {
    var ss = web3 && web3.state.account && web3.state.skinState;
    var n = 0;
    for (var b = ss ? ss.owned : 0; b > 0; b >>= 1) n += b & 1;
    return Math.min(6, n);
  }

  function renderEmbeddedLeaderboard() {
    var rows = getMergedLeaderboard().slice(0, 6);
    cardLbTitle.textContent = t('lbTitle');
    var html = '<tr><th>#</th><th>' + t('lbColPlayer') + '</th><th>' + t('lbColScore') + '</th><th>' + t('lbColTx') + '</th></tr>';
    rows.forEach(function (r, idx) {
      var link = r.url ? '<a href="' + r.url + '" target="_blank" rel="noreferrer" style="color:#4ade80;text-decoration:none">↗</a>' : '—';
      html += '<tr' + (r.mine ? ' style="background:rgba(56,242,255,.16)"' : '') + '><td>' + (idx + 1) + '</td><td style="font-weight:700" title="' + escHtml(r.addr) + '">' + escHtml(r.name) + '</td><td style="color:#ffd166;font-weight:800">' + r.score + '</td><td>' + link + '</td></tr>';
    });
    if (!rows.length) html += '<tr><td colspan="4" style="opacity:.75;text-align:center;padding:8px">' + (boardSyncNote() || t('lbEmpty')) + '</td></tr>';
    cardLbTable.innerHTML = html;
  }

  function renderMapSelector() {
    mapListEl.innerHTML = '';
    MAPS.forEach(function (mp, idx) {
      var b = document.createElement('button');
      b.className = 'avq-btn' + (idx === selectedMapIdx ? ' map-on' : '');
      b.style.padding = '3px 8px';
      b.style.fontSize = '11px';
      b.textContent = lang === 'vi' ? mp.nameVi : mp.nameEn;
      stopPtr(b);
      b.onclick = function () {
        if (selectedMapIdx === idx) return;
        selectedMapIdx = idx;
        try { window.localStorage.setItem('arc-voxel-quest:map-idx', String(idx)); } catch (e) { /* ignore */ }
        if (phase !== 'playing') clearArena();
        buildArena(idx);
        renderMapSelector();
      };
      mapListEl.appendChild(b);
    });
    var curMap = activeMapSpec();
    var bossName = lang === 'vi' ? curMap.boss.nameVi : curMap.boss.nameEn;
    var mobNames = lang === 'vi' ? curMap.mobs.namesVi : curMap.mobs.namesEn;
    if (typeof mapDescEl !== 'undefined') mapDescEl.textContent = (lang === 'vi' ? '🐾 Quái: ' : '🐾 Mobs: ') + mobNames + ' · Boss: ' + bossName;
  }

  function renderHeroSelector() {
    heroListEl.innerHTML = '';
    HEROES.forEach(function (h, idx) {
      var b = document.createElement('button');
      b.className = 'avq-btn' + (idx === selectedHeroIdx ? ' hero-on' : '');
      b.style.padding = '5px 10px';
      b.style.fontSize = '12px';
      b.textContent = h.short;
      stopPtr(b);
      b.onclick = function () {
        selectedHeroIdx = idx;
        try { window.localStorage.setItem('arc-voxel-quest:hero-idx', String(idx)); } catch (e) { /* ignore */ }
        rebuildHeroMesh();
        renderHeroSelector();
        if (typeof renderHeroPreview === 'function') renderHeroPreview(performance.now(), true);
      };
      heroListEl.appendChild(b);
    });
    var cur = activeHeroSpec();
    heroDescEl.textContent = (lang === 'vi' ? cur.nameVi + ' — ' + cur.tagVi : cur.nameEn + ' — ' + cur.tagEn);
    if (typeof heroPreviewBox !== 'undefined') heroPreviewBox.style.borderColor = cur.color;
  }

  function randomLand(minFromHero, shoreOnly) {
    for (var tries = 0; tries < 400; tries++) {
      var index = Math.floor(Math.random() * N * N);
      if (!height[index] || solid[index] || (shoreOnly && !isShore(index))) continue;
      var p = cellCenter(index);
      if (Math.hypot(p.x - hero.x, p.z - hero.z) < minFromHero) continue;
      return p;
    }
    return null;
  }

  function addShard(xOpt, zOpt, valueOpt, isXp) {
    var p = (xOpt !== undefined) ? { x: xOpt, z: zOpt } : randomLand(4, false);
    if (!p) return;
    if (isXp) {
      var mesh = new THREE.Mesh(GEM_GEO, new THREE.MeshBasicMaterial({ color: valueOpt >= 20 ? '#ffd166' : '#38f2ff' }));
      mesh.position.set(p.x, (groundAt(p.x, p.z) || 1) + 0.55, p.z);
      scene.add(mesh);
      pickups.push({ x: p.x, z: p.z, phase: Math.random() * 6, xp: valueOpt || 8, scoreVal: valueOpt >= 20 ? 25 : 8, isXp: true, node: mesh });
    } else {
      var node = makeCharacter('pickup', R.pickupSize, MODELS.pickup, 'pickup');
      var glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: '#ffd166', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      glow.scale.set(R.pickupSize * 2.5, R.pickupSize * 2.5, 1);
      glow.position.y = R.pickupSize * 0.5;
      node.add(glow);
      pickups.push({ x: p.x, z: p.z, phase: Math.random() * 6, xp: 18, scoreVal: 40, isXp: false, node: node });
    }
  }

  function spawnEnemy(kind) {
    var p = randomLand(11, true) || randomLand(8, false);
    if (!p) return;
    var mp = activeMapSpec();
    var tier = getThreatTier(wave);
    var wScale = 1 + tier.hpBonus + (wave - 1) * 0.24;
    var spdScale = Math.min(tier.spdCap, 1 + (wave - 1) * 0.09);
    var isElite = kind !== 'boss' && Math.random() < tier.eliteChance;
    var eMultHp = isElite ? 2.4 : 1.0;
    var eMultSize = isElite ? 1.32 : 1.0;
    if (kind === 'boss') {
      var bossLabel = lang === 'vi' ? mp.boss.nameVi : mp.boss.nameEn;
      enemies.push({
        kind: 'boss', type: 'boss', bossName: bossLabel, bossPattern: mp.boss.pattern, bossGlow: mp.boss.glow,
        x: p.x, z: p.z, y: groundAt(p.x, p.z),
        hp: Math.round(36 * wScale), maxHp: Math.round(36 * wScale),
        speed: R.enemySpeed * 0.72 * spdScale, radius: 1.55, wobble: 0, flash: 0,
        aiTimer: 2.0, meteorTimer: 3.4,
        node: makeCharacter('enemy', 3.4, BOSS_BOXES, 'boss', mp, false),
      });
      showBanner('💀 ' + bossLabel + ' · ' + (lang === 'vi' ? 'XUẤT HIỆN!' : 'AWAKENED!'));
      blip(130, 0.45, 'sawtooth', 0.08, 70);
    } else if (kind === 'charger') {
      var telGeo = new THREE.PlaneGeometry(0.9, 10);
      var telMesh = new THREE.Mesh(telGeo, new THREE.MeshBasicMaterial({ color: '#ef4444', side: THREE.DoubleSide, transparent: true, opacity: 0.65 }));
      telMesh.rotation.order = 'YXZ';
      telMesh.rotation.x = -Math.PI / 2;
      telMesh.visible = false;
      scene.add(telMesh);
      enemies.push({
        kind: 'charger', type: 'charger', isElite: isElite, x: p.x, z: p.z, y: groundAt(p.x, p.z),
        hp: Math.round(5 * wScale * eMultHp), maxHp: Math.round(5 * wScale * eMultHp),
        speed: R.enemySpeed * 0.85 * spdScale, radius: 0.95 * eMultSize, wobble: Math.random() * 6, flash: 0,
        state: 'chase', stateTimer: 2.2 + Math.random() * 1.5, dirX: 0, dirZ: 0, telMesh: telMesh,
        node: makeCharacter('enemy', R.enemySize * 1.18 * eMultSize, CHARGER_BOXES, 'charger', mp, isElite),
      });
    } else if (kind === 'caster') {
      enemies.push({
        kind: 'caster', type: 'caster', isElite: isElite, x: p.x, z: p.z, y: groundAt(p.x, p.z),
        hp: Math.round(3.5 * wScale * eMultHp), maxHp: Math.round(3.5 * wScale * eMultHp),
        speed: R.enemySpeed * 0.75 * spdScale, radius: 0.85 * eMultSize, wobble: Math.random() * 6, flash: 0,
        aiTimer: 1.6 + Math.random(),
        node: makeCharacter('enemy', 1.72 * eMultSize, CASTER_BOXES, 'caster', mp, isElite),
      });
    } else {
      enemies.push({
        kind: 'stalker', type: 'stalker', isElite: isElite, x: p.x, z: p.z, y: groundAt(p.x, p.z),
        hp: Math.round(2.5 * wScale * eMultHp), maxHp: Math.round(2.5 * wScale * eMultHp),
        speed: R.enemySpeed * 1.08 * spdScale, radius: 0.74 * eMultSize, wobble: Math.random() * 6, flash: 0,
        node: makeCharacter('enemy', 1.48 * eMultSize, STALKER_BOXES, 'stalker', mp, isElite),
      });
    }
  }

  function removeEnemyVisual(e) {
    scene.remove(e.node);
    disposeNode(e.node);
    if (e.telMesh) { scene.remove(e.telMesh); e.telMesh.geometry.dispose(); e.telMesh.material.dispose(); }
  }

  function clearArena() {
    enemies.forEach(removeEnemyVisual);
    pickups.forEach(function (e) { scene.remove(e.node); disposeNode(e.node); });
    projectiles.forEach(function (pr) { scene.remove(pr.mesh); disposeNode(pr.mesh); });
    enemyBullets.forEach(function (eb) { scene.remove(eb.mesh); eb.mesh.material.dispose(); });
    hazards.forEach(function (hz) { scene.remove(hz.mesh); hz.mesh.material.dispose(); });
    bolts.forEach(function (bl) { scene.remove(bl.line); disposeNode(bl.line); });
    strikes.forEach(function (st) { scene.remove(st.mesh); st.mesh.material.dispose(); });
    mines.forEach(function (mn) { scene.remove(mn.mesh); disposeNode(mn.mesh); });
    fxRings.forEach(function (fx) { scene.remove(fx.mesh); disposeNode(fx.mesh); });
    enemies = []; pickups = []; projectiles = []; enemyBullets = []; hazards = []; bolts = []; strikes = []; fxRings = []; mines = [];
    syncBladesMesh(0);
  }

  function showBanner(text) {
    bannerEl.textContent = text;
    bannerEl.style.display = 'block';
    bannerTimer = 2.8;
  }

  function spawnPopup(worldX, worldY, worldZ, text, col) {
    if (popups.length > 18) return;
    var node = document.createElement('div');
    node.className = 'avq-pop';
    node.textContent = text;
    if (col) node.style.color = col;
    popupsEl.appendChild(node);
    popups.push({ x: worldX, y: worldY, z: worldZ, life: 0.85, el: node });
  }

  /* 10. UPGRADES & COMBAT */
  var UPGRADE_POOL = ['dragon', 'lightning', 'shuriken', 'coloa', 'drill', 'pulse', 'boomerang', 'mines', 'blades', 'orbital', 'overclock', 'magnet', 'vitality'];
  function openLevelUp() {
    var available = UPGRADE_POOL.filter(function (id) { return (upLevels[id] || 0) < 5; });
    if (available.length === 0) return;
    for (var i = available.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = available[i]; available[i] = available[j]; available[j] = tmp;
    }
    levelUpChoices = available.slice(0, 3);
    renderLevelUpModal();
    lvlOverlay.style.display = 'flex';
  }

  function applyUpgrade(id) {
    upLevels[id] = (upLevels[id] || 0) + 1;
    if (id === 'blades') syncBladesMesh(Math.min(5, upLevels.blades + 1));
    else if (id === 'overclock') fireRateMult += 0.2;
    else if (id === 'magnet') { magnetMult += 0.45; speedStatMult += 0.14; }
    else if (id === 'vitality') {
      if (upLevels.vitality === 1) maxHearts += 1;
      hearts = Math.min(maxHearts, hearts + 2);
    }
    levelUpChoices = null;
    lvlOverlay.style.display = 'none';
    blip(780, 0.18, 'triangle', 0.07, 1180);
  }

  function renderLevelUpModal() {
    lvlTitleEl.textContent = t('levelUpTitle');
    lvlHintEl.textContent = t('levelUpHint');
    lvlCardsEl.innerHTML = '';
    var dict = t('upgrades');
    (levelUpChoices || []).forEach(function (id, idx) {
      var info = dict[id] || { name: id, desc: '' };
      var curLv = upLevels[id] || 0;
      var c = document.createElement('button');
      c.className = 'avq-card';
      stopPtr(c);
      c.innerHTML = '<div style="display:flex;justify-content:space-between;width:100%;font-weight:900;color:#63f7ff">'
        + '<span>[' + (idx + 1) + '] ' + info.name + '</span>'
        + '<span style="color:#ffd166">Lv.' + (curLv + 1) + '</span></div>'
        + '<div style="font-size:12px;color:#dbeafe;opacity:.92">' + info.desc + '</div>';
      c.onclick = function () { applyUpgrade(id); };
      lvlCardsEl.appendChild(c);
    });
  }

  function nearestEnemy(maxDist) {
    var bestE = null, bestD = maxDist || 999;
    for (var i = 0; i < enemies.length; i++) {
      var d = Math.hypot(enemies[i].x - hero.x, enemies[i].z - hero.z);
      if (d < bestD) { bestD = d; bestE = enemies[i]; }
    }
    return bestE;
  }

  function spawnFxRing(x, y, z, col, s0, s1, dur, isPillar) {
    if (fxRings.length > 26) {
      var drop = fxRings.shift();
      scene.remove(drop.mesh); disposeNode(drop.mesh);
    }
    var geo = isPillar
      ? new THREE.CylinderGeometry(0.45, 1.15, 22, 12)
      : new THREE.RingGeometry(0.42, 0.72, 24);
    var mat = new THREE.MeshBasicMaterial({ color: col || '#38f2ff', side: THREE.DoubleSide, transparent: true, opacity: isPillar ? 0.78 : 0.88, depthWrite: false, blending: THREE.AdditiveBlending });
    var mesh = new THREE.Mesh(geo, mat);
    if (isPillar) mesh.position.set(x, y + 11, z);
    else { mesh.rotation.x = -Math.PI / 2; mesh.position.set(x, y, z); }
    scene.add(mesh);
    fxRings.push({ mesh: mesh, life: dur || 0.35, maxLife: dur || 0.35, s0: s0 || 0.8, s1: s1 || 4.0, isPillar: !!isPillar });
  }

  function damageEnemy(e, dmg, kx, kz) {
    e.hp -= dmg;
    e.flash = 0.12;
    if ((kx || kz) && e.kind !== 'boss') moveOnIsland(e, kx, kz, 0.35);
    if (e.hp <= 0) {
      var idx = enemies.indexOf(e);
      if (idx >= 0) enemies.splice(idx, 1);
      removeEnemyVisual(e);
      kills += 1;
      streak += 1;
      streakTimer = 4.0;
      var mult = Math.min(10, 1 + Math.floor(streak / 4));
      if (mult > maxCombo) maxCombo = mult;
      var basePts = e.kind === 'boss' ? 300 : ((e.kind === 'charger' || e.kind === 'caster' ? 28 : 12) * (e.isElite ? 2 : 1));
      var pts = basePts * mult;
      score += pts;
      burst(e.x, e.y + 1.0, e.z, e.kind === 'boss' ? 36 : (e.isElite ? 22 : 12));
      if (e.isElite || e.kind === 'boss') spawnFxRing(e.x, (groundAt(e.x, e.z) || 1) + 0.15, e.z, e.kind === 'boss' ? '#ff2e63' : '#ffd166', 0.8, e.kind === 'boss' ? 6.5 : 3.4, 0.36, false);
      spawnPopup(e.x, e.y + 1.4, e.z, '+' + pts + (mult > 1 ? ' ×' + mult : ''), e.kind === 'boss' || e.isElite ? '#ffd166' : '#aef9ff');
      if (e.kind === 'boss') {
        showBanner(t('bossDefeated'));
        for (var b = 0; b < 6; b++) addShard(e.x + (Math.random() - 0.5) * 3, e.z + (Math.random() - 0.5) * 3, 25, true);
        blip(520, 0.35, 'triangle', 0.08, 1040);
      } else if (e.isElite) {
        for (var eb2 = 0; eb2 < 3; eb2++) addShard(e.x + (eb2 - 1) * 0.7, e.z + (Math.random() - 0.5) * 0.6, 25, true);
      } else {
        addShard(e.x, e.z, e.kind !== 'stalker' ? 20 : 10, true);
      }
      post({ type: 'state', phase: phase, score: score });
    }
  }

  function spawnProjectile(vx, vz, dmg, colorHex, pierce, homing, explosive, kindOpt) {
    var mesh = new THREE.Group();
    var k = kindOpt || (explosive ? 'dragon' : (homing ? 'coloa' : ((pierce || 1) >= 4 ? 'drill' : 'shuriken')));
    if (k === 'dragon') {
      var core = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), new THREE.MeshBasicMaterial({ color: '#fffbeb' }));
      var flame = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.72, 0.72), new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.78, blending: THREE.AdditiveBlending }));
      flame.rotation.set(0.6, 0.6, 0);
      mesh.add(core, flame);
    } else if (k === 'shuriken') {
      var b1 = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.12, 0.24), new THREE.MeshBasicMaterial({ color: colorHex }));
      var b2 = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 1.15), new THREE.MeshBasicMaterial({ color: '#fff7ed' }));
      var hub = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.32), new THREE.MeshBasicMaterial({ color: '#ffd166' }));
      mesh.add(b1, b2, hub);
    } else if (k === 'coloa') {
      var shaft = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 1.15), new THREE.MeshBasicMaterial({ color: colorHex }));
      var tip = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.36), new THREE.MeshBasicMaterial({ color: '#ecfdf5' }));
      tip.position.z = 0.55;
      mesh.add(shaft, tip);
      mesh.rotation.y = Math.atan2(vx, vz);
    } else if (k === 'boomerang') {
      var bm1 = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.16, 0.3), new THREE.MeshBasicMaterial({ color: colorHex }));
      var bm2 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 1.1), new THREE.MeshBasicMaterial({ color: '#fde68a' }));
      bm2.position.set(0.6, 0, 0.5);
      mesh.add(bm1, bm2);
    } else {
      var d1 = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.65), new THREE.MeshBasicMaterial({ color: colorHex }));
      var d2 = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.55), new THREE.MeshBasicMaterial({ color: '#ffd166' }));
      d2.position.z = 0.5;
      mesh.add(d1, d2);
      mesh.rotation.y = Math.atan2(vx, vz);
    }
    mesh.position.set(hero.x, hero.y + 0.9, hero.z);
    scene.add(mesh);
    projectiles.push({
      x: hero.x, z: hero.z, vx: vx, vz: vz, dmg: dmg, kind: k, pierce: pierce || 1,
      homing: Boolean(homing), explosive: Boolean(explosive), life: 1.8, hitIds: [], mesh: mesh,
    });
  }

  function spawnEnemyBullet(x, z, vx, vz, colorHex) {
    var mesh = new THREE.Mesh(EBULLET_GEO, new THREE.MeshBasicMaterial({ color: colorHex || '#f43f5e' }));
    mesh.position.set(x, (groundAt(x, z) || 1) + 1.0, z);
    scene.add(mesh);
    enemyBullets.push({ x: x, z: z, vx: vx, vz: vz, life: 3.4, mesh: mesh });
  }

  function spawnMeteorHazard(x, z) {
    var mesh = new THREE.Mesh(HAZARD_GEO, new THREE.MeshBasicMaterial({ color: '#ff2e63', side: THREE.DoubleSide, transparent: true, opacity: 0.78 }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, (groundAt(x, z) || 1) + 0.14, z);
    scene.add(mesh);
    hazards.push({ x: x, z: z, delay: 1.15, radius: 2.6, mesh: mesh });
  }

  function fireChainLightning(lv) {
    if (enemies.length === 0) return;
    var hitSet = [], curX = hero.x, curY = hero.y + 1.0, curZ = hero.z, chains = 2 + lv;
    var pts = [new THREE.Vector3(curX, curY, curZ)];
    for (var c = 0; c < chains; c++) {
      var target = null, bestD = 12;
      for (var i = 0; i < enemies.length; i++) {
        if (hitSet.indexOf(enemies[i]) >= 0) continue;
        var d = Math.hypot(enemies[i].x - curX, enemies[i].z - curZ);
        if (d < bestD) { bestD = d; target = enemies[i]; }
      }
      if (!target) break;
      hitSet.push(target);
      var ty = target.y + 0.9;
      for (var seg = 1; seg <= 3; seg++) {
        var frac = seg / 4;
        pts.push(new THREE.Vector3(
          lerp(curX, target.x, frac) + (Math.random() - 0.5) * 0.9,
          lerp(curY, ty, frac) + (Math.random() - 0.5) * 0.7 + 0.35,
          lerp(curZ, target.z, frac) + (Math.random() - 0.5) * 0.9
        ));
      }
      pts.push(new THREE.Vector3(target.x, ty, target.z));
      spawnFxRing(target.x, (groundAt(target.x, target.z) || 1) + 0.2, target.z, '#70f8ff', 0.4, 2.1, 0.2, false);
      curX = target.x; curY = ty; curZ = target.z;
      damageEnemy(target, 1.8 + lv * 0.75, 0, 0);
    }
    if (pts.length > 1) {
      var boltGroup = new THREE.Group();
      var geo1 = new THREE.BufferGeometry().setFromPoints(pts);
      boltGroup.add(new THREE.Line(geo1, new THREE.LineBasicMaterial({ color: '#38f2ff' })));
      var pts2 = pts.map(function (pt, idx2) { return idx2 === 0 ? pt : new THREE.Vector3(pt.x + 0.14, pt.y + 0.18, pt.z - 0.12); });
      boltGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts2), new THREE.LineBasicMaterial({ color: '#ffffff' })));
      scene.add(boltGroup);
      bolts.push({ line: boltGroup, life: 0.22 });
      blip(920, 0.08, 'sine', 0.04, 540);
    }
  }

  function spawnOrbitalStrike(lv) {
    var tEnemy = nearestEnemy(18);
    if (!tEnemy) return;
    var mesh = new THREE.Mesh(STRIKE_GEO, new THREE.MeshBasicMaterial({ color: '#38f2ff', side: THREE.DoubleSide, transparent: true, opacity: 0.78 }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(tEnemy.x, (groundAt(tEnemy.x, tEnemy.z) || 1) + 0.14, tEnemy.z);
    scene.add(mesh);
    strikes.push({ x: tEnemy.x, z: tEnemy.z, delay: 0.65, dmg: 3.5 + lv * 1.5, radius: 2.9 + lv * 0.25, mesh: mesh });
  }

  function triggerHeroDamage(knockX, knockZ, reasonText) {
    if (invulnerable > 0 || dashTimer > 0) return;
    hearts -= 1;
    streak = 0; streakTimer = 0;
    invulnerable = 1.0;
    if (knockX || knockZ) moveOnIsland(hero, knockX, knockZ, 0.35);
    blip(160, 0.28, 'square', 0.07, 80);
    if (reasonText) showBanner(reasonText);
    if (hearts <= 0) finish(false);
  }

  function triggerPulseDash() {
    if (phase !== 'playing' || paused || levelUpChoices || dashCooldown > 0) return;
    var hSpec = activeHeroSpec();
    dashCooldown = hSpec.dashCd / (1 + (upLevels.overclock || 0) * 0.18);
    dashTimer = 0.42;
    invulnerable = Math.max(invulnerable, 0.55);
    pulseWaveTimer = 0.38;
    pulseRing.position.set(hero.x, (groundAt(hero.x, hero.z) || 1) + 0.14, hero.z);
    pulseRing.material.color.set(hSpec.color);
    pulseRing.visible = true;
    spawnFxRing(hero.x, (groundAt(hero.x, hero.z) || 1) + 0.25, hero.z, hSpec.color, 0.9, 6.2, 0.35, false);
    blip(380, 0.2, 'sawtooth', 0.06, 920);
    if (tutorialStage === 2) {
      tutorialStage = 0;
      try { window.localStorage.setItem('arc-voxel-quest:tut-done', '1'); } catch (e) { /* ignore */ }
    }
    // Dash clears nearby enemy bullets & knocks back monsters
    for (var b = enemyBullets.length - 1; b >= 0; b--) {
      if (Math.hypot(enemyBullets[b].x - hero.x, enemyBullets[b].z - hero.z) < 5.6) {
        scene.remove(enemyBullets[b].mesh); enemyBullets[b].mesh.material.dispose();
        enemyBullets.splice(b, 1);
      }
    }
    for (var i = enemies.length - 1; i >= 0; i--) {
      var e = enemies[i];
      var dx = e.x - hero.x, dz = e.z - hero.z, dist = Math.hypot(dx, dz) || 1;
      if (dist < 5.2) damageEnemy(e, 2.5 + level * 0.45, (dx / dist) * 2.8, (dz / dist) * 2.8);
    }
    burst(hero.x, hero.y + 0.8, hero.z, 18);
  }

  /* 11. UI REFRESH & PHASE FLOW */
  function refreshStaticTexts() {
    setTimeout(layoutCard, 0);
    musicSync();
    cardGoal.textContent = phase === 'playing' ? '' : badgeGoalText();
    refreshFeatureTexts();
    featBox.style.display = phase === 'title' ? 'block' : 'none';
    if (!surrenderArmedAt) surrenderBtn.textContent = t('surrenderBtn');
    langBtn.textContent = lang === 'vi' ? '🌐 VI' : '🌐 EN';
    soundBtn.textContent = muted ? '🔇' : '🔊';
    soundBtn.title = muted ? t('soundOff') : t('soundOn');
    pauseBtn.title = t('pauseTitle');
    var connected = web3 && web3.state.account;
    var web3Label = connected ? ('🟢 ' + window.ARC_WEB3.shortAddr(web3.state.account) + (prizeAlert ? ' 🏆' : '')) : ('🔌 ' + t('connectWalletShort'));
    web3Btn.textContent = web3Label;
    var seasonInfo = web3 && web3.state.season;
    seasonPill.style.display = seasonInfo ? 'inline-flex' : 'none';
    if (seasonInfo) {
      seasonPill.textContent = '🏁 ' + t('seasonPillLabel') + ' #' + (seasonInfo.id + 1) + ' · ' + fmtLeft(seasonInfo.endsAt - Math.floor(Date.now() / 1000)) + (prizeAlert ? ' · 🏆 ' + t('prizeAlert') : '');
    }
    web3Btn.className = connected ? 'avq-btn' : 'avq-btn pri';
    var skinNow = skinTintHex();
    if (skinNow !== lastSkinTint) { lastSkinTint = skinNow; if (phase !== 'playing') rebuildHeroMesh(); }
    heroBoxLbl.textContent = t('chooseHero');
    mapBoxLbl.textContent = t('chooseMap');
    if (typeof roadmapEl !== 'undefined') roadmapEl.textContent = t('roadmapLabel');
    nickInput.placeholder = t('nickPlaceholder');
    w3Title.textContent = '⛓️ ' + t('accountTitle');
    tabBtns.profile.textContent = t('tabProfile');
    tabBtns.quests.textContent = t('tabQuests');
    tabBtns.shop.textContent = t('tabShop');
    tabBtns.season.textContent = t('tabSeason');
    tabBtns.wallet.textContent = t('tabWallet');
    tabBtns.leaderboard.textContent = t('tabLeaderboard');
    tabBtns.network.textContent = t('tabNetwork');
    renderMapSelector();
    renderHeroSelector();
    renderEmbeddedLeaderboard();
    updateCardTexts();
  }

  function formatDuration(sec) {
    var s = Math.max(0, Math.floor(sec));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }

  function updateCardTexts() {
    if (phase === 'title') {
      card.style.display = 'block';
      setTimeout(layoutCard, 0);
      heroBox.style.display = 'block';
      cardLbBox.style.display = 'block';
      cardTitle.textContent = t('title');
      cardBody.textContent = t('subtitle');
      cardStats.innerHTML = '';
      cardPlayBtn.textContent = t('startBtn');
      cardClaimBtn.style.display = 'none';
      cardClaimOwnBtn.style.display = 'none';
      cardShareBtn.style.display = 'none';
      cardClaimStatus.textContent = '';
      cardHint.textContent = t('hintControls');
    } else if (phase === 'playing') {
      card.style.display = paused ? 'block' : 'none';
      setTimeout(layoutCard, 0);
      heroBox.style.display = 'none';
      cardLbBox.style.display = 'none';
      if (paused) {
        cardTitle.textContent = t('pausedTitle');
        cardBody.textContent = t('pausedBody');
        cardStats.innerHTML = '';
        cardPlayBtn.textContent = t('resumeBtn');
        cardClaimBtn.style.display = 'none';
        cardClaimOwnBtn.style.display = 'none';
        cardShareBtn.style.display = 'none';
        cardClaimStatus.textContent = '';
        cardHint.textContent = '';
      }
    } else {
      card.style.display = 'block';
      setTimeout(layoutCard, 0);
      heroBox.style.display = 'block';
      cardLbBox.style.display = 'block';
      cardTitle.textContent = phase === 'won' ? t('wonTitle') : (t('lostTitle') + ' ' + wave + '!');
      cardBody.textContent = '';
      cardStats.innerHTML = ''
        + '<span>' + t('scoreLabel') + ': ' + score + '</span>'
        + '<span>' + t('bestLabel') + ': ' + best + '</span>'
        + '<span>' + t('waveLabel') + ': ' + wave + '</span>'
        + '<span>' + t('timeLabel') + ': ' + formatDuration(elapsed) + '</span>'
        + '<span>' + t('killsLabel') + ': ' + kills + '</span>';
      cardPlayBtn.textContent = t('playAgainBtn');
      var relayOn = Boolean(web3 && web3.state.setup && web3.state.setup.relay && web3.state.setup.relay.enabled);
      if (score > 0 && !runClaimed) {
        var canRealChain = web3 && web3.state.account && window.ARC_WEB3.isValidAddress(web3.state.contractAddress);
        cardClaimBtn.style.display = 'inline-flex';
        cardClaimBtn.textContent = canRealChain ? (relayOn ? t('claimGaslessBtn') : t('claimChainBtn')) : t('claimDemoBtn');
        cardClaimOwnBtn.style.display = canRealChain && relayOn ? 'inline-flex' : 'none';
        cardClaimOwnBtn.textContent = t('claimOwnBtn');
      } else {
        cardClaimBtn.style.display = 'none';
        cardClaimOwnBtn.style.display = 'none';
      }
      cardShareBtn.style.display = runClaimed ? 'inline-flex' : 'none';
      cardShareBtn.textContent = '📤 ' + t('shareBtn');
      cardClaimStatus.textContent = claimStatusText;
      if (lastTxExplorerUrl) {
        // Built with DOM nodes (not innerHTML) so wallet or server error text can never inject markup.
        var txLink = document.createElement('a');
        txLink.href = lastTxExplorerUrl; txLink.target = '_blank'; txLink.rel = 'noreferrer';
        txLink.style.cssText = 'color:#63f7ff;text-decoration:underline;margin-left:6px';
        txLink.textContent = t('viewTx');
        cardClaimStatus.appendChild(txLink);
      }
      cardHint.textContent = t('hintControls');
    }
  }

  function setPhase(next) {
    phase = next;
    endedAt = performance.now();
    if (next !== 'playing' && drag) { drag = null; joyBase.style.display = 'none'; }
    dashBtn.style.display = next === 'playing' ? 'inline-flex' : 'none';
    surrenderBtn.style.display = next === 'playing' ? 'inline-flex' : 'none';
    pauseBtn.style.display = next === 'playing' ? 'inline-flex' : 'none';
    if (next === 'playing') { surrenderArmedAt = 0; surrenderBtn.textContent = t('surrenderBtn'); }
    if (next !== 'playing') { bossBarWrap.style.display = 'none'; lvlOverlay.style.display = 'none'; levelUpChoices = null; }
    refreshStaticTexts();
    post({ type: 'state', phase: phase, score: score });
  }

  /* Playing requires a connected wallet that has signed in (free message signature). */
  function needsWallet() {
    return Boolean(web3) && !web3.state.account;
  }
  var pendingStart = false;
  /* A connected wallet is required to play; after connecting, the pending run starts automatically. */
  function requestStart() {
    if (needsWallet()) {
      pendingStart = true;
      openConnectModal();
      return;
    }
    start();
  }

  function afterLogin() {
    refreshStaticTexts();
    closeConnectModal();
    if (pendingStart && web3.state.account) {
      pendingStart = false;
      start();
    } else if (w3Overlay.style.display === 'flex') {
      renderWeb3Modal();
    }
  }

  function start() {
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    canvas.focus();
    clearArena();
    rebuildHeroMesh();
    var hSpec = activeHeroSpec();
    score = 0; gems = 0; kills = 0; streak = 0; maxCombo = 1; streakTimer = 0;
    level = 1; xp = 0; xpNeed = 35; wave = 1;
    maxHearts = hSpec.hp;
    hearts = maxHearts;
    timeLeft = R.duration > 0 ? R.duration : 0;
    elapsed = 0; spawnTimer = 0; nextBossAt = R.duration > 0 ? Math.min(R.bossEvery, Math.max(8, R.duration * 0.5)) : R.bossEvery;
    invulnerable = 0; dashCooldown = 0; dashTimer = 0; paused = false; levelUpChoices = null;
    runClaimed = false; claimStatusText = ''; lastTxExplorerUrl = '';
    telemetry = []; lastCpAt = 0; runHeroShort = hSpec.short;
    fireRateMult = 1; speedStatMult = hSpec.speedMult; magnetMult = 1 + magnetBonus(magnetLevel());
    upLevels = {};
    upLevels[hSpec.weaponId] = 1;
    wTimers = { dragon: 0.2, lightning: 0.2, shuriken: 0.2, coloa: 0.2, drill: 0.2, orbital: 1.5, pulse: 0.3, boomerang: 0.3, mines: 0.4 };
    hero.x = 0; hero.z = 0; hero.vx = hero.vz = 0;
    for (var i = 0; i < R.maxPickups; i++) addShard(undefined, undefined, 15, false);
    spawnEnemy('stalker'); spawnEnemy('charger'); spawnEnemy('caster');
    blip(520, 0.12, 'triangle', 0.07, 780);
    if (web3 && web3.state.account && window.ARC_WEB3.isValidAddress(web3.state.contractAddress)) {
      web3.startRun({ hero: selectedHeroIdx }).catch(function () { /* claim will explain if the anti-cheat server is unreachable */ });
    }
    setPhase('playing');
  }

  function finish(won) {
    if (score > best) { best = score; saveBest(best); }
    blip(won ? 660 : 200, 0.5, won ? 'triangle' : 'sawtooth', 0.06, won ? 990 : 90);
    setPhase(won ? 'won' : 'lost');
  }
  function canRestart() { return performance.now() - endedAt > 500; }

  /* 12. WEB3 MODAL */
  // Contract custom errors reach the wallet as bare 4-byte selectors: translate them for players.
  var CONTRACT_ERRORS = {
    '0x78636683': ['You already entered this season.', 'Bạn đã vào mùa giải này rồi.'],
    '0xdbd05e83': ['This empty season was already rolled over.', 'Mùa trống này đã được chuyển quỹ rồi.'],
    '0x5cd5d233': ['The run ticket does not match this season or was altered. Play a new run.', 'Vé ván chơi không khớp mùa giải này. Hãy chơi ván mới.'],
    '0x203d82d8': ['The run ticket expired. Play a new run and save it sooner.', 'Vé ván chơi đã hết hạn. Hãy chơi ván mới và ghi điểm sớm hơn.'],
    '0x13be252b': ['USDC allowance is too low. Try again to approve it first.', 'Hạn mức USDC chưa đủ. Hãy thử lại để cấp quyền trước.'],
    '0xf4d678b8': ['Not enough ARCQ for this upgrade.', 'Không đủ ARCQ để nâng cấp.'],
    '0x40f6b1bc': ['Your hero is already at the maximum level.', 'Tướng của bạn đã đạt cấp tối đa.'],
    '0xae958a40': ['That rank has no prize.', 'Hạng đó không có thưởng.'],
    '0x15561365': ['The score is not valid for this contract.', 'Điểm không hợp lệ với contract.'],
    '0x70d3cfbb': ['You did not join that room.', 'Bạn chưa tham gia phòng đó.'],
    '0xc4e42d0c': ['That room is closed.', 'Phòng đó đã đóng.'],
    '0x3fe028f7': ['That room has not ended yet.', 'Phòng đó chưa kết thúc.'],
    '0x4c06417a': ['That room has winners, so it cannot be refunded.', 'Phòng đó đã có người thắng nên không hoàn phí được.'],
    '0x7697c5dd': ['You already got your fee back.', 'Bạn đã nhận lại phí rồi.'],
    '0x6fe6a4c9': ['The entry fee must be between 0.1 and 100 USDC.', 'Phí vào phải từ 0,1 đến 100 USDC.'],
    '0x76166401': ['A room lasts between 1 hour and 7 days.', 'Phòng kéo dài từ 1 giờ đến 7 ngày.'],
    '0x4d95c334': ['You already own this skin.', 'Bạn đã sở hữu skin này.'],
    '0x0c98ead5': ['You do not own this skin yet.', 'Bạn chưa sở hữu skin này.'],
    '0x4363a3f3': ['That skin does not exist.', 'Skin đó không tồn tại.'],
    '0x5c79bc39': ['That hero id is not valid.', 'Mã tướng không hợp lệ.'],
    '0xa4420a95': ['Skins are soulbound and cannot be transferred.', 'Skin gắn chặt vào ví và không chuyển được.'],
    '0x353cbf17': ['That room does not exist.', 'Phòng đó không tồn tại.'],
    '0xd4bd01c5': ['The game is paused for new runs and entries. Claims and upgrades still work.', 'Game đang tạm dừng ván mới và vào mùa. Nhận thưởng và nâng cấp vẫn dùng được.'],
    '0xc2356312': ['This prize was already claimed.', 'Phần thưởng này đã được nhận.'],
    '0xb6fba8f8': ['This run was already saved.', 'Ván này đã được ghi rồi.'],
    '0x7221b37b': ['This season has not ended yet.', 'Mùa giải này chưa kết thúc.'],
    '0xfd828399': ['The USDC transfer failed. Check your USDC balance.', 'Chuyển USDC thất bại. Hãy kiểm tra số dư USDC.'],
    '0xbdf1ba38': ['There is no prize pool to roll over.', 'Không có quỹ thưởng để chuyển.'],
    '0x109c167d': ['This season has winners, so its pool cannot be rolled over.', 'Mùa này đã có người thắng nên không chuyển quỹ được.']
  };
  function contractErrorText(err) {
    var blob = '';
    try { blob = JSON.stringify(err, function (k, v) { return typeof v === 'bigint' ? v.toString() : v; }); } catch (e) { /* circular */ }
    blob += ' ' + String((err && err.message) || '') + ' ' + String((err && err.data) || '');
    var keys = Object.keys(CONTRACT_ERRORS);
    for (var i = 0; i < keys.length; i++) {
      if (blob.indexOf(keys[i]) !== -1) return CONTRACT_ERRORS[keys[i]][lang === 'vi' ? 1 : 0];
    }
    return '';
  }
  var EMAIL_ERR = {
    155104: 'emailSigninAgain', 155105: 'emailSigninAgain', 155130: 'emailErrExpired', 155131: 'emailErrExpired', 155132: 'emailErrExpired',
    155133: 'emailErrWrong', 155134: 'emailErrWrong', 155141: 'emailErrLocked', 155146: 'emailErrLocked', 155142: 'emailErrRate',
    155135: 'emailBad', 155138: 'emailErrSend', 155150: 'emailSetup', 503: 'emailSetup', 155112: 'emailErrPin', 155119: 'emailErrPinLocked', 429: 'emailErrRate',
  };
  function friendlyTxError(err) {
    var msg = (err && err.message) || String(err);
    if (err && err.code === 4001) return t('cancelled');
    if (err && err.emailCode && EMAIL_ERR[err.emailCode]) return t(EMAIL_ERR[err.emailCode]);
    if (msg === 'EMAIL_SIGNIN_AGAIN') return t('emailSigninAgain');
    if (msg === 'EMAIL_NOT_CONFIGURED') return t('emailSetup');
    if (msg === 'EMAIL_WALLET_PENDING') return t('emailPending');
    if (msg === 'EMAIL_NO_CODE') return t('emailSendFirst');
    if (msg === 'GOOGLE_NOT_CONFIGURED') return lang === 'vi' ? 'Đăng nhập Google chưa được cài đặt trên server.' : 'Google sign-in is not set up on this server yet.';
    var known = contractErrorText(err);
    if (known) return known;
    if (msg === 'NEED_USDC') return t('needUsdc');
    if (msg === 'NEED_LOGIN' || msg === 'NO_ACCOUNT') return t('walletRequired');
    if (msg === 'WC_NOT_CONFIGURED') return t('wcNeedsSetup');
    if (msg === 'PASSKEY_NOT_CONFIGURED') return t('passkeySetup') + ' ' + window.location.hostname;
    if (err && err.name === 'NotAllowedError') return t('cancelled');
    if (err && err.name === 'SecurityError') return t('passkeyDomainErr') + ' ' + window.location.hostname;
    if (err && err.name === 'InvalidStateError') return t('passkeyExists');
    if (msg === 'NO_WALLET') return t('needWallet');
    if (msg === 'NO_CONTRACT') return t('noContractMsg');
    return msg;
  }

  function runTx(label, fn) {
    w3Status.textContent = '⏳ ' + label + '...';
    return fn().then(function (res) {
      w3Status.textContent = '✅ ' + label;
      refreshStaticTexts();
      renderWeb3Modal();
      return res;
    }).catch(function (err) {
      w3Status.textContent = '⚠️ ' + friendlyTxError(err);
    });
  }

  function formatCountdown(endsAtSec) {
    var left = Math.max(0, endsAtSec - Math.floor(Date.now() / 1000));
    var h = Math.floor(left / 3600), m = Math.floor((left % 3600) / 60);
    return h + 'h ' + m + 'm';
  }

  var SKIN_COLORS = ['', '#ff4d6d', '#ffb703', '#2ecc71', '#9b5de5', '#6ee7ff', '#ffd700'];

  /* Upgrade-NFT icon: the Arc Voxel "A" arch logo (blue to purple to pink) on a tile tinted by level, with one dot per level. */
  var LOGO_PATH = 'M14 94 L36 94 L38 66 C39 50 44 40 52 40 C60 40 64 50 65 66 L67 94 L90 94 L84 56 C80 26 66 8 50 8 C34 8 20 26 16 56 Z';
  function levelIconUri(sid) {
    var c = SKIN_COLORS[sid] || '#6ee7ff';
    var dots = '';
    for (var i = 0; i < sid; i++) dots += '<circle cx="' + (50 + (i - (sid - 1) / 2) * 11) + '" cy="91" r="3.6" fill="' + c + '" stroke="#fff" stroke-width="1"/>';
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
      + '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2230a8"/><stop offset=".5" stop-color="#6a2fb0"/><stop offset="1" stop-color="#e0366a"/></linearGradient>'
      + '<radialGradient id="b" cx=".5" cy=".42" r=".75"><stop offset="0" stop-color="' + c + '" stop-opacity=".6"/><stop offset="1" stop-color="#070d20"/></radialGradient></defs>'
      + '<rect x="2" y="2" width="96" height="96" rx="20" fill="url(#b)" stroke="' + c + '" stroke-width="3"/>'
      + (window.GAME_LOGO
        // The exact project logo (vendor/logo.*). A filter turns its white background transparent so only the mark remains.
        ? '<filter id="k" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -1.6 -1.6 -1.6 0 4.2"/></filter>'
          + '<image href="' + window.GAME_LOGO + '" x="14" y="5" width="72" height="72" preserveAspectRatio="xMidYMid meet" filter="url(#k)"/>'
        : '<path d="' + LOGO_PATH + '" fill="url(#g)" stroke="rgba(255,255,255,.55)" stroke-width="1.6" transform="translate(15 4) scale(.7)"/>')
      + dots + '</svg>';
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }
  var SKIN_COSTS = [0, 1000, 2000, 3000, 5000, 8000, 12000];

  function panel(parent) {
    return el('div', 'background:#091224;border:1px solid rgba(120,230,255,.2);border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:6px', parent);
  }
  function kv(parent, lbl, val) {
    var r = el('div', 'display:flex;justify-content:space-between;gap:8px', parent);
    el('span', 'opacity:.75', r).textContent = lbl;
    el('span', 'font-weight:700;font-family:ui-monospace,monospace;color:#aef9ff;text-align:right;word-break:break-all', r).textContent = val;
  }
  function heading(parent, text) { el('div', 'font-weight:800;color:#ffd166', parent).textContent = text; }
  function hint(parent, text) { el('div', 'opacity:.7;font-size:12px', parent).textContent = text; }
  function fmtUsdc(v) { return window.ARC_WEB3.formatUnits(v, 6, 2) + ' USDC'; }
  function arcq(wei) { return window.ARC_WEB3.formatUnits(wei, 18, 1) + ' ARCQ'; }
  function fmtLeft(secs) {
    var left = Math.max(0, secs);
    var d = Math.floor(left / 86400), h = Math.floor((left % 86400) / 3600), m = Math.floor((left % 3600) / 60);
    return (d ? d + 'd ' : '') + h + 'h ' + m + 'm';
  }

  /* Nickname box: the name shown on the leaderboard instead of the wallet address. */
  function renderNicknameBox(parent) {
    var st = web3.state;
    var box = panel(parent);
    heading(box, t('nickBoxTitle'));
    if (!st.session) { el('div', 'opacity:.8;font-size:12px', box).textContent = t('nickLoginMsg'); return; }
    var row = el('div', 'display:flex;gap:8px;align-items:center;flex-wrap:wrap', box);
    var inp = el('input', 'flex:1;min-width:140px', row); inp.className = 'avq-input';
    inp.maxLength = 16; inp.placeholder = t('nickPlaceholder'); inp.value = st.nickname || '';
    var btn = el('button', '', row); btn.className = 'avq-btn pri'; btn.textContent = t('nickSaveBtn');
    var note = el('div', 'font-size:12px;min-height:16px', box);
    el('div', 'opacity:.7;font-size:12px', box).textContent = t('nickBoxHint');
    function save() {
      btn.disabled = true; note.style.color = '#aef9ff'; note.textContent = '...';
      saveNickname(inp.value).then(function (res) {
        btn.disabled = false;
        if (res.ok) {
          nickInput.value = playerName;
          note.style.color = '#7dffb1'; note.textContent = '✅ ' + t('nickSavedMsg');
        } else { note.style.color = '#ff9a9a'; note.textContent = '⚠️ ' + res.message; }
      });
    }
    btn.onclick = save;
    inp.onkeydown = function (ev) { if (ev.key !== 'Escape') ev.stopPropagation(); if (ev.key === 'Enter') save(); };
    inp.onkeyup = function (ev) { ev.stopPropagation(); };
  }

  /* Profile: balances, badge and skin art, recent saved runs with transaction links. */
  function renderProfileTab() {
    var A = window.ARC_WEB3, st = web3.state;
    if (!st.account) { renderLoginPanel(w3Body); return; }
    var box = panel(w3Body);
    heading(box, t('tabProfile'));
    kv(box, t('walletAddrLabel'), st.account);
    if (st.nickname) kv(box, t('nickLabel'), st.nickname);
    kv(box, t('usdcBalLabel'), fmtUsdc(st.usdcBalance));
    if (st.profile) {
      kv(box, t('arcqBalLabel'), arcq(st.profile.arcqBalanceWei));
      kv(box, t('badgeLabel'), t('tiers')[st.profile.badgeTier] || t('tiers')[0]);
      kv(box, t('runsLabel'), st.profile.totalRuns + ' (Best ' + st.profile.bestScore + ')');
    }
    kv(box, t('magnetLvLabel'), magnetLevel() + ' / 6 (+' + pct(magnetBonus(magnetLevel())) + '%)');
    if (st.questState) kv(box, t('streakLabel'), String(st.questState.streak));

    renderBadgeRoadmap(w3Body);
    var art = panel(w3Body);
    heading(art, t('badgeArtTitle'));
    var artRow = el('div', 'display:flex;gap:10px;flex-wrap:wrap;align-items:center', art);
    artRow.textContent = '...';
    web3.loadArt().then(function (res) {
      if (!artRow.isConnected) return;
      artRow.textContent = '';
      if (res && res.badge) { var im = el('img', 'width:84px;height:84px;border-radius:12px;background:#050b18', artRow); im.src = res.badge; im.alt = ''; }
      else el('div', 'opacity:.75', artRow).textContent = t('noBadge');
      var owned = (web3.state.skinState && web3.state.skinState.owned) || 0;
      for (var sid = 1; sid <= 6; sid++) {
        if ((owned & (1 << (sid - 1))) === 0) continue;
        var sk = el('img', 'width:64px;height:64px;border-radius:12px', artRow); sk.src = levelIconUri(sid); sk.alt = t('levelWord') + ' ' + sid; sk.title = t('levelWord') + ' ' + sid + ' · ' + (t('skinNames')[sid] || '');
      }
    });

    var hist = panel(w3Body);
    heading(hist, t('recentRuns'));
    var list = el('div', 'display:flex;flex-direction:column;gap:4px;font-family:ui-monospace,monospace', hist);
    list.textContent = '...';
    web3.loadHistory().then(function (res) {
      if (!list.isConnected) return;
      list.textContent = '';
      (res.history || []).forEach(function (r) {
        var line = el('div', 'display:flex;justify-content:space-between;gap:8px', list);
        el('span', '', line).textContent = r.score + ' pts · W' + r.wave + ' · ' + ((HEROES[r.hero] && HEROES[r.hero].short) || '—') + (r.roomId ? ' · room #' + r.roomId : '');
        var url = explorerTx(r.txHash);
        if (url) { var a = el('a', 'color:#4ade80;text-decoration:none', line); a.href = url; a.target = '_blank'; a.rel = 'noreferrer'; a.textContent = 'tx ↗'; }
      });
      if (!(res.history || []).length) list.textContent = t('noRuns');
    });
  }

  /* Daily quests are paid automatically when a run is saved. */
  function renderQuestsTab() {
    var st = web3.state;
    if (!st.account) { renderLoginPanel(w3Body); return; }
    var q = st.questState || { streak: 0, runsToday: 0, mask: 0 };
    var box = panel(w3Body);
    heading(box, t('questsTitle'));
    kv(box, t('streakLabel'), String(q.streak));
    kv(box, t('runsTodayLabel'), String(q.runsToday));
    var defs = [
      [0, t('questFirst'), t('questFirstR')],
      [1, t('questThree'), t('questThreeR')],
      [2, t('questBig'), t('questBigR')]
    ];
    defs.forEach(function (d) {
      var done = (q.mask & (1 << d[0])) !== 0;
      var row = el('div', 'display:flex;justify-content:space-between;gap:8px;padding:6px 8px;border-radius:10px;background:' + (done ? 'rgba(74,222,128,.12)' : 'rgba(120,230,255,.06)'), box);
      var left = el('div', 'display:flex;flex-direction:column', row);
      el('span', 'font-weight:700', left).textContent = (done ? '✅ ' : '⬜ ') + d[1];
      el('span', 'font-size:12px;opacity:.7', left).textContent = d[2];
      el('span', 'color:' + (done ? '#7dffb1' : '#ffd166') + ';font-weight:800', row).textContent = done ? t('questDone') : '';
    });
    hint(box, t('questHint'));
  }

  /* Badge roadmap: what each badge needs, how far the player is, and tips to climb. */
  var SCORE_DIVISOR = 20; // in-game score / 20 = onchain points (same rule the server applies)
  var BADGE_STEPS = [
    { tier: 1, pts: 300, icon: '🔰' }, { tier: 2, pts: 700, icon: '🛡️' }, { tier: 3, pts: 1500, icon: '⚔️' }, { tier: 4, pts: 3000, icon: '🏰' },
    { tier: 5, pts: 6000, icon: '🔥' }, { tier: 6, pts: 12000, icon: '🗿' }, { tier: 7, pts: 25000, icon: '⚡' }, { tier: 8, pts: 40000, icon: '🌟' },
  ];
  var CHAMPION_TIER = 9;
  var MILESTONES = [
    { key: 'msRuns5', icon: '🎮', ok: function (p) { return p.totalRuns >= 5; } },
    { key: 'msRuns25', icon: '🏅', ok: function (p) { return p.totalRuns >= 25; } },
    { key: 'msRuns100', icon: '🛡️', ok: function (p) { return p.totalRuns >= 100; } },
    { key: 'msGems500', icon: '💎', ok: function (p) { return p.totalGems >= 500; } },
    { key: 'msGems5000', icon: '👛', ok: function (p) { return p.totalGems >= 5000; } },
    { key: 'msCombo5', icon: '🔗', ok: function (p) { return p.maxCombo >= 5; } },
    { key: 'msCombo10', icon: '⚡', ok: function (p) { return p.maxCombo >= 10; } },
    { key: 'msStreak3', icon: '📅', ok: function (p, qs) { return Boolean(qs) && qs.streak >= 3; } },
    { key: 'msStreak7', icon: '🗓️', ok: function (p, qs) { return Boolean(qs) && qs.streak >= 7; } },
  ];
  function tierName(i) { return String((t('tiers')[i] || '')).replace(/\s*\(.*\)\s*$/, ''); }
  function fmtN(n) { return Number(n).toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US'); }
  function fill(str, vars) { return String(str).replace(/\{(\w+)\}/g, function (m, k) { return vars[k] === undefined ? m : vars[k]; }); }
  function badgeBest() { return web3 && web3.state.account && web3.state.profile ? Number(web3.state.profile.bestScore) : 0; }
  function badgeGoalText() {
    var best = badgeBest();
    for (var i = 0; i < BADGE_STEPS.length; i++) {
      var step = BADGE_STEPS[i];
      if (best < step.pts) {
        if (!(web3 && web3.state.account) || best === 0) return i === 0 ? t('badgeFirstGoal') : '';
        return fill(t('badgeNextGoal'), { tier: tierName(step.tier), n: fmtN(step.pts - best), g: fmtN((step.pts - best) * SCORE_DIVISOR) });
      }
    }
    return t('badgeAllScore');
  }
  function renderBadgeRoadmap(parent) {
    var st = web3.state;
    var best = badgeBest();
    var tier = st.profile ? st.profile.badgeTier : 0;
    var box = panel(parent);
    heading(box, t('badgeRoadmapTitle'));
    var next = null;
    BADGE_STEPS.forEach(function (step) {
      var done = best >= step.pts; // score tiers depend on the best run only: the Champion tier (9) must not tick them all
      if (!done && !next) next = step;
      var row = el('div', 'display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:10px;background:' + (done ? 'rgba(74,222,128,.12)' : 'rgba(120,230,255,.06)') + ';border:1px solid ' + (next === step ? '#ffd166' : 'transparent'), box);
      el('span', 'font-size:20px;flex:none;width:26px;text-align:center', row).textContent = step.icon;
      var col = el('div', 'display:flex;flex-direction:column;flex:1;min-width:0', row);
      el('span', 'font-weight:800', col).textContent = tierName(step.tier);
      el('span', 'font-size:12px;opacity:.75', col).textContent = fill(t('badgeReq'), { n: fmtN(step.pts), g: fmtN(step.pts * SCORE_DIVISOR) });
      el('span', 'font-weight:800;color:' + (done ? '#7dffb1' : '#ffd166'), row).textContent = done ? '✅ ' + t('badgeEarned') : '';
    });
    var champ = tier >= CHAMPION_TIER;
    var crow = el('div', 'display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:10px;background:' + (champ ? 'rgba(74,222,128,.12)' : 'rgba(120,230,255,.06)'), box);
    el('span', 'font-size:20px;flex:none;width:26px;text-align:center', crow).textContent = '👑';
    var ccol = el('div', 'display:flex;flex-direction:column;flex:1;min-width:0', crow);
    el('span', 'font-weight:800', ccol).textContent = tierName(CHAMPION_TIER);
    el('span', 'font-size:12px;opacity:.75', ccol).textContent = t('badgeChampionReq');
    el('span', 'font-weight:800;color:#7dffb1', crow).textContent = champ ? '✅ ' + t('badgeEarned') : '';
    if (next) { // progress toward the next score badge (the first step starts from zero)
      var prevPts = next.tier === 1 ? 0 : BADGE_STEPS[next.tier - 2].pts;
      var pct = Math.max(0, Math.min(100, Math.round(((best - prevPts) / (next.pts - prevPts)) * 100)));
      var bar = el('div', 'height:6px;border-radius:99px;background:rgba(120,230,255,.16);overflow:hidden;margin-top:2px', box);
      el('div', 'height:100%;width:' + pct + '%;background:linear-gradient(90deg,#38f2ff,#ffd166)', bar);
    }
    el('div', 'color:#ffd166;font-weight:700;font-size:12.5px', box).textContent = badgeGoalText();
    if (st.profile) {
      heading(box, t('milestonesTitle'));
      var grid = el('div', 'display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:4px', box);
      MILESTONES.forEach(function (m) {
        var d = m.ok(st.profile, st.questState);
        el('div', 'font-size:12px;padding:4px 8px;border-radius:8px;background:' + (d ? 'rgba(74,222,128,.12)' : 'rgba(120,230,255,.05)') + ';opacity:' + (d ? '1' : '.7'), grid).textContent = (d ? '✅ ' : m.icon + ' ') + t(m.key);
      });
    }
    heading(box, t('badgeTipsTitle'));
    (t('badgeTips') || []).forEach(function (tip) { el('div', 'font-size:12.5px;opacity:.88;line-height:1.4', box).textContent = '• ' + tip; });
  }

  function skinTintHex() {
    var ss = web3 && web3.state.account && web3.state.skinState;
    return ss && ss.equipped ? SKIN_COLORS[ss.equipped] : '';
  }

  /* Upgrade-NFT shop: soulbound NFTs paid by burning ARCQ. Each NFT owned is one level; each level widens the pickup range. */
  function renderShopTab() {
    var st = web3.state;
    if (!st.account) { renderLoginPanel(w3Body); return; }
    var ss = st.skinState || { owned: 0, equipped: 0 };
    var bal = st.profile ? st.profile.arcqBalanceWei : 0n;
    var lvl = magnetLevel();
    var nextId = 0;
    for (var n = 1; n <= 6 && !nextId; n++) if ((ss.owned & (1 << (n - 1))) === 0) nextId = n;
    var box = panel(w3Body);
    heading(box, t('shopTitle'));
    kv(box, t('arcqBalLabel'), arcq(bal));
    kv(box, t('magnetLvLabel'), lvl + ' / 6');
    kv(box, t('magnetBonusLabel'), '+' + pct(magnetBonus(lvl)) + '%');
    hint(box, t('shopHint'));
    for (var id = 1; id <= 6; id++) {
      (function (sid) {
        var owned = (ss.owned & (1 << (sid - 1))) !== 0;
        var isNext = sid === nextId;
        var row = el('div', 'display:flex;align-items:center;gap:10px;padding:7px 8px;border-radius:10px;background:rgba(120,230,255,.06);border:1px solid ' + (isNext ? '#ffd166' : 'transparent') + ';opacity:' + (owned || isNext ? '1' : '.7'), box);
        var ico = el('img', 'width:44px;height:44px;border-radius:10px;flex:none;filter:' + (owned || isNext ? 'none' : 'grayscale(.75) brightness(.8)'), row);
        ico.src = levelIconUri(sid); ico.alt = '';
        var txt = el('div', 'display:flex;flex-direction:column;flex:1;min-width:0', row);
        el('span', 'font-weight:800', txt).textContent = t('levelWord') + ' ' + sid + ' · ' + t('skinNames')[sid];
        el('span', 'font-size:12px;opacity:.75', txt).textContent = '+' + pct(MAGNET_STEPS[sid - 1]) + '% ' + t('magnetShort') + ' (' + t('totalWord') + ' +' + pct(magnetBonus(sid)) + '%) · ' + (owned ? (ss.equipped === sid ? t('equippedLabel') : t('ownedLabel')) : SKIN_COSTS[sid].toLocaleString() + ' ARCQ');
        var b = el('button', '', row); b.className = 'avq-btn' + (owned && ss.equipped !== sid ? ' pri' : '');
        if (!owned) {
          b.textContent = isNext ? t('buyBtn') : '🔒 ' + t('lockedBtn');
          b.disabled = !isNext || bal < BigInt(SKIN_COSTS[sid]) * 10n ** 18n;
          b.onclick = function () { runTx(t('buyBtn') + ' ' + t('levelWord') + ' ' + sid, function () { return web3.buySkin(sid); }); };
        } else if (ss.equipped === sid) {
          b.textContent = t('unequipBtn');
          b.onclick = function () { runTx(t('unequipBtn'), function () { return web3.equipSkin(0); }); };
        } else {
          b.textContent = t('equipBtn');
          b.onclick = function () { runTx(t('equipBtn') + ' ' + t('skinNames')[sid], function () { return web3.equipSkin(sid); }); };
        }
      })(id);
    }
  }


  function renderLoginPanel(parent) {
    var b = el('button', 'align-self:flex-start', parent); b.className = 'avq-btn pri'; b.textContent = t('connectWalletShort');
    b.onclick = function () { closeWeb3Modal(); openConnectModal(); };
  }

  function openConnectModal() {
    cnOverlay.style.display = 'flex';
    cnStatus.textContent = '';
    renderConnectModal();
  }
  function closeConnectModal() { cnOverlay.style.display = 'none'; }

  function walletBadge(parent, w) {
    if (w.icon) {
      var img = el('img', 'width:38px;height:38px;border-radius:10px;flex:none', parent);
      img.src = w.icon; img.alt = '';
      return img;
    }
    var b = el('div', 'width:38px;height:38px;border-radius:10px;flex:none;display:flex;align-items:center;justify-content:center;font-weight:900;color:#fff;background:' + (w.color || '#3b82f6'), parent);
    b.textContent = (w.name || '?').charAt(0);
    return b;
  }

  function connectWith(factory, label) {
    cnStatus.textContent = '⏳ ' + label + '...';
    factory().then(function () { cnStatus.textContent = ''; afterLogin(); })
      .catch(function (err) { cnStatus.textContent = '⚠️ ' + friendlyTxError(err); });
  }

  /* Wallet tab: shows a masked email for wallets created earlier with an emailed code. */
  function maskEmail(addr) {
    var parts = String(addr || '').split('@');
    if (parts.length !== 2) return '';
    return parts[0].slice(0, 2) + '***@' + parts[1];
  }
  /* Sign in with Google: one tap, Google confirms who the player is, so no emailed code. The page leaves for Google and comes back. */
  function renderGoogleBox(parent) {
    var box = el('div', 'display:flex;flex-direction:column;gap:8px;padding:12px;border-radius:14px;background:rgba(66,133,244,.10);border:1px solid rgba(66,133,244,.5)', parent);
    el('div', 'font-size:12.5px;opacity:.9;line-height:1.45', box).textContent = t('googleNote');
    var b = el('button', 'justify-content:center', box); b.className = 'avq-btn pri'; b.textContent = 'G  ' + t('googleBtn');
    b.onclick = function () {
      b.disabled = true;
      cnStatus.textContent = '⏳ ' + t('googleOpening') + '...';
      web3.startGoogleLogin().catch(function (err) { b.disabled = false; cnStatus.textContent = '⚠️ ' + friendlyTxError(err); });
    };
  }

  function renderConnectModal() {
    var st = web3.state;
    cnBody.innerHTML = '';
    var head = el('div', 'display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center', cnBody);
    var logo = el('div', 'width:64px;height:64px;border-radius:18px;background:linear-gradient(135deg,#1e3a8a,#0ea5e9);display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(14,165,233,.35);overflow:hidden', head);
    if (window.GAME && window.GAME.assets && window.GAME.assets.hero) {
      var li = el('img', 'width:52px;height:52px;object-fit:contain', logo); li.src = window.GAME.assets.hero; li.alt = '';
    } else {
      logo.textContent = '⛓️';
    }
    el('div', 'font-size:22px;font-weight:900;color:#eefaff', head).textContent = t('connectTitle');
    el('div', 'opacity:.75;font-size:13px', head).textContent = t('connectSub');

    if (web3.googleEnabled()) renderGoogleBox(cnBody);

    // Other wallets (installed ones connect directly, others link to their install page)
    el('div', 'font-size:11px;font-weight:800;letter-spacing:.08em;opacity:.65;margin-top:4px', cnBody).textContent = t('yourWallets');
    var grid = el('div', 'display:grid;grid-template-columns:1fr 1fr;gap:8px', cnBody);
    var CARD = 'display:flex;align-items:center;gap:10px;padding:10px;border-radius:14px;background:#091224;border:1px solid rgba(120,230,255,.25);color:#eefaff;cursor:pointer;text-align:left;font:inherit;min-width:0';
    web3.listWalletOptions().then(function (opts) {
      if (!grid.isConnected) return;
      opts.forEach(function (w) {
        var c = el('button', CARD, grid);
        walletBadge(c, w);
        var txt = el('div', 'display:flex;flex-direction:column;min-width:0', c);
        el('span', 'font-weight:800;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis', txt).textContent = w.name;
        el('span', 'font-size:11px;opacity:.7;color:' + (w.installed ? '#7dffb1' : '#aef9ff'), txt).textContent = w.installed ? t('installedInBrowser') : (t('installLink') + ' ↗');
        c.onclick = function () {
          if (w.installed) { connectWith(function () { return web3.connectBrowserWallet(w); }, w.name); }
          else if (w.url) { window.open(w.url, '_blank', 'noopener'); }
        };
      });
      if (!opts.some(function (w) { return w.installed; })) {
        var inFrame = false;
        try { inFrame = window.self !== window.top; } catch (e) { inFrame = true; }
        var note = el('div', 'grid-column:1 / -1;padding:10px 12px;border-radius:12px;background:rgba(255,209,102,.1);border:1px solid rgba(255,209,102,.4);font-size:12px;line-height:1.5;color:#ffe9a8', grid);
        note.textContent = t('noWalletDetected') + (inFrame ? ' ' + t('noWalletInFrame') : '');
        var again = el('button', 'margin-top:6px;display:block', note); again.className = 'avq-btn'; again.textContent = t('detectAgain');
        again.onclick = function () { renderConnectModal(); };
      }
    });
    var wcOn = Boolean(st.setup && st.setup.walletConnectProjectId);
    if (!wcOn) return; // WalletConnect stays hidden until WALLETCONNECT_PROJECT_ID is configured
    var wc = el('button', CARD + ';grid-column:1 / -1;justify-content:space-between;' + (wcOn ? '' : 'opacity:.75'), cnBody);
    var wcLeft = el('div', 'display:flex;align-items:center;gap:10px', wc);
    walletBadge(wcLeft, { name: 'W', color: '#3b99fc' });
    var wcTxt = el('div', 'display:flex;flex-direction:column', wcLeft);
    el('span', 'font-weight:800;font-size:13px', wcTxt).textContent = t('wcTitle');
    el('span', 'font-size:11px;opacity:.7', wcTxt).textContent = wcOn ? t('wcDesc') : t('wcNeedsSetup');
    el('span', 'font-size:20px;opacity:.6', wc).textContent = '›';
    wc.onclick = function () {
      if (!wcOn) { cnStatus.textContent = '⚠️ ' + t('wcNeedsSetup'); return; }
      connectWith(function () { return web3.connectWalletConnectWallet(); }, t('wcTitle'));
    };
  }

  function renderSeasonTab() {
    var A = window.ARC_WEB3, st = web3.state;
    if (!st.account) renderLoginPanel(w3Body);
    var box = el('div', 'background:#091224;border:1px solid rgba(120,230,255,.2);border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:6px', w3Body);
    function row(parent, lbl, val) {
      var r = el('div', 'display:flex;justify-content:space-between;gap:8px', parent);
      el('span', 'opacity:.75', r).textContent = lbl;
      el('span', 'font-weight:700;font-family:ui-monospace,monospace;color:#aef9ff;text-align:right', r).textContent = val;
    }
    el('div', 'font-weight:800;color:#ffd166', box).textContent = t('seasonTitle');
    if (!A.isValidAddress(st.contractAddress)) {
      el('div', 'opacity:.9', box).textContent = t('noContractMsg');
      return;
    }
    var season = st.season, ps = st.playerState;
    if (season) {
      row(box, t('seasonLabel'), '#' + (season.id + 1));
      row(box, t('poolLabel'), A.formatUnits(season.poolUsdc, 6, 2) + ' USDC');
      row(box, t('entrantsLabel'), String(season.entrants));
      row(box, t('endsInLabel'), formatCountdown(season.endsAt));
    }
    if (st.account) row(box, t('usdcBalLabel'), A.formatUnits(st.usdcBalance, 6, 2) + ' USDC');
    if (ps) {
      el('div', 'margin-top:2px;color:' + (ps.entered ? '#7dffb1' : '#ffd166'), box).textContent = ps.entered ? t('enteredLabel') : t('notEnteredLabel');
    }
    el('div', 'opacity:.7;font-size:12px', box).textContent = t('seasonHint');
    var btns = el('div', 'display:flex;gap:8px;flex-wrap:wrap;align-items:center', box);
    var bEnter = el('button', '', btns); bEnter.className = 'avq-btn pri'; bEnter.textContent = t('enterBtn');
    bEnter.disabled = !st.account || Boolean(ps && ps.entered);
    bEnter.onclick = function () { runTx(t('enterBtn'), function () { return web3.enterSeason(); }); };
    if (st.network.faucetUrl) {
      var fl = el('a', 'color:#63f7ff;text-decoration:underline;font-weight:700', btns);
      fl.href = st.network.faucetUrl; fl.target = '_blank'; fl.rel = 'noreferrer'; fl.textContent = t('faucetLink');
    }

    // Prizes from ended seasons
    var prizeBox = el('div', 'background:#091224;border:1px solid rgba(120,230,255,.2);border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:6px', w3Body);
    el('div', 'font-weight:800;color:#ffd166', prizeBox).textContent = t('prizesTitle');
    var prizeList = el('div', 'display:flex;flex-direction:column;gap:6px', prizeBox);
    prizeList.textContent = '...';
    if (!season || season.id === 0) { prizeList.textContent = t('noPrizes'); return; }
    var ids = [];
    for (var sid = season.id - 1; sid >= 0 && ids.length < 3; sid--) ids.push(sid);
    Promise.all(ids.map(function (id) { return web3.getPrizeStatus(id).catch(function () { return null; }); })).then(function (list) {
      if (!prizeList.isConnected) return;
      prizeList.textContent = '';
      var any = false;
      list.forEach(function (ps2) {
        if (!ps2) return;
        if (ps2.board.length === 0 && ps2.poolUsdc > 0n) {
          any = true;
          var rr = el('div', 'display:flex;justify-content:space-between;gap:8px;align-items:center', prizeList);
          el('span', '', rr).textContent = '#' + (ps2.id + 1) + ' · ' + A.formatUnits(ps2.poolUsdc, 6, 2) + ' USDC';
          var bRo = el('button', '', rr); bRo.className = 'avq-btn'; bRo.textContent = t('rolloverBtn');
          bRo.onclick = function () { runTx(t('rolloverBtn'), function () { return web3.rolloverEmptySeason(ps2.id); }); };
          return;
        }
        ps2.board.slice(0, 3).forEach(function (entry, rank) {
          if (ps2.claimedMask & (1 << rank)) return;
          any = true;
          var r2 = el('div', 'display:flex;justify-content:space-between;gap:8px;align-items:center', prizeList);
          el('span', 'font-family:ui-monospace,monospace', r2).textContent = '#' + (ps2.id + 1) + ' · Top ' + (rank + 1) + ' · ' + A.shortAddr(entry.player) + ' · ' + entry.bestScore + ' pts';
          var bC = el('button', '', r2); bC.className = 'avq-btn'; bC.textContent = t('claimPrizeBtn');
          bC.onclick = function () { runTx(t('claimPrizeBtn'), function () { return web3.claimPrize(ps2.id, rank); }); };
        });
      });
      if (!any) prizeList.textContent = t('noPrizes');
    });
  }

  function renderWeb3Modal() {
    Object.keys(tabBtns).forEach(function (k) { tabBtns[k].className = k === activeTab ? 'avq-btn pri' : 'avq-btn'; });
    w3Body.innerHTML = '';
    if (!web3) {
      el('div', 'opacity:.9', w3Body).textContent = lang === 'vi'
        ? 'Đang chạy bản offline (CSP chặn mạng). Hãy chạy `bun server.mjs` để mở game kết nối ví MetaMask/Rabby & Arc L1.'
        : 'Running offline sandbox build (network disabled by CSP). Run `bun server.mjs` to open the game with a live EVM wallet & Arc L1 RPC.';
      return;
    }
    var st = web3.state, demo = web3.getDemoVault(), tiers = t('tiers');
    if (activeTab === 'profile') {
      renderProfileTab();
    } else if (activeTab === 'quests') {
      renderQuestsTab();
    } else if (activeTab === 'shop') {
      renderShopTab();
    } else if (activeTab === 'season') {
      renderSeasonTab();
    } else if (activeTab === 'wallet') {
      if (!st.account) renderLoginPanel(w3Body);
      var infoBox = el('div', 'background:#091224;border:1px solid rgba(120,230,255,.2);border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:6px', w3Body);
      function row(lbl, val) {
        var r = el('div', 'display:flex;justify-content:space-between;gap:8px', infoBox);
        el('span', 'opacity:.75', r).textContent = lbl;
        el('span', 'font-weight:700;font-family:ui-monospace,monospace;color:#aef9ff;text-align:right;word-break:break-all', r).textContent = val;
      }
      row(t('networkLabel'), st.network.chainName + ' (' + st.network.chainIdDec + ')');
      if (st.account) {
        row(t('walletLabel'), st.walletName || '—');
        row(t('walletAddrLabel'), st.account);
        row(t('gasBalLabel'), window.ARC_WEB3.formatUnits(st.usdcBalance, 6, 2) + ' USDC');
        if (st.kind === 'email' && st.email) row(t('emailLabel'), maskEmail(st.email));
        if (st.kind === 'email' && web3.emailNeedsSignin()) {
          var reBox = el('div', 'display:flex;flex-direction:column;gap:6px;padding:8px 10px;border-radius:10px;background:rgba(255,209,102,.08);border:1px dashed rgba(255,209,102,.45);font-size:12px;color:#ffe9a8', infoBox);
          el('div', '', reBox).textContent = t('emailSigninAgain');
          var bRe = el('button', 'align-self:flex-start', reBox); bRe.className = 'avq-btn'; bRe.textContent = t('emailSigninBtn');
          bRe.onclick = function () { web3.logout().then(function () { refreshStaticTexts(); closeWeb3Modal(); openConnectModal(); }); };
        }
        if (st.kind === 'passkey') {
          el('div', 'opacity:.8;font-size:12px', infoBox).textContent = t('passkeyGasNote');
        } else if (st.kind === 'email') {
          el('div', 'opacity:.8;font-size:12px', infoBox).textContent = t('emailGasNote');
        } else {
          if (st.usdcBalance === 0n) el('div', 'color:#ffd166;font-weight:700', infoBox).textContent = t('noGasWarn');
          el('div', 'opacity:.7;font-size:12px', infoBox).textContent = t('fundHint');
        }
      }
      if (st.profile) {
        row(t('arcqBalLabel'), window.ARC_WEB3.formatUnits(st.profile.arcqBalanceWei, 18, 1) + ' ARCQ');
        row(t('badgeLabel'), tiers[st.profile.badgeTier] || tiers[0]);
        row(t('runsLabel'), String(st.profile.totalRuns) + ' (Best ' + st.profile.bestScore + ')');
      }
      if (st.account) renderNicknameBox(w3Body);
      var btns = el('div', 'display:flex;gap:8px;flex-wrap:wrap;align-items:center', w3Body);
      if (st.account) {
        var bCopy = el('button', '', btns); bCopy.className = 'avq-btn pri'; bCopy.textContent = t('copyBtn');
        bCopy.onclick = function () {
          try { navigator.clipboard.writeText(st.account); w3Status.textContent = '✅ ' + t('copied'); }
          catch (err) { w3Status.textContent = st.account; }
        };
        var bRefresh = el('button', '', btns); bRefresh.className = 'avq-btn'; bRefresh.textContent = t('refreshChain');
        bRefresh.onclick = async function () {
          w3Status.textContent = '...';
          try { await web3.refreshChainState(); await web3.refreshBoard(true); w3Status.textContent = '✅ OK'; renderWeb3Modal(); renderEmbeddedLeaderboard(); }
          catch (err) { w3Status.textContent = '⚠️ ' + ((err && err.message) || err); }
        };
      }
      if (st.network.faucetUrl) {
        var fLink = el('a', 'color:#63f7ff;text-decoration:underline;font-weight:700', btns);
        fLink.href = st.network.faucetUrl; fLink.target = '_blank'; fLink.rel = 'noreferrer'; fLink.textContent = t('faucetLink');
      }
      if (st.session) {
        var bOut = el('button', '', btns); bOut.className = 'avq-btn'; bOut.textContent = t('logoutBtn');
        bOut.onclick = function () { web3.logout().then(function () { refreshStaticTexts(); renderWeb3Modal(); }); };
      }
    } else if (activeTab === 'leaderboard') {
      el('div', 'font-weight:800;color:#ffd166', w3Body).textContent = t('lbModeChain');
      var filters = el('div', 'display:flex;gap:6px', w3Body);
      [['all', t('lbAll')], ['season', t('lbSeasonF')]].forEach(function (f) {
        var fb = el('button', '', filters); fb.className = 'avq-btn' + (st.boardScope === f[0] ? ' pri' : ''); fb.textContent = f[1];
        fb.onclick = function () { web3.refreshBoard(true, f[0]).then(function () { renderWeb3Modal(); renderEmbeddedLeaderboard(); }); };
      });
      var listBox = el('div', 'background:#091224;border:1px solid rgba(120,230,255,.2);border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:6px', w3Body);
      var lbRows = getMergedLeaderboard();
      lbRows.forEach(function (entry, idx) {
        var r = el('div', 'display:flex;justify-content:space-between;gap:8px;font-family:ui-monospace,monospace', listBox);
        var link = entry.url ? ' <a href="' + entry.url + '" target="_blank" rel="noreferrer" style="color:#4ade80;text-decoration:none">tx ↗</a>' : '';
        if (entry.mine) r.style.cssText += ';background:rgba(56,242,255,.16);border-radius:8px;padding:2px 6px';
        r.innerHTML = '<span title="' + escHtml(entry.addr) + '">#' + (idx + 1) + ' ' + escHtml(entry.name) + (entry.hasNick ? ' <span style="opacity:.55;font-size:11px">' + escHtml(entry.addr) + '</span>' : '') + (entry.wave ? ' · W' + entry.wave : '') + (entry.heroName ? ' · ' + escHtml(entry.heroName) : '') + '</span><span style="color:#ffd166">' + entry.score + ' pts' + link + '</span>';
      });
      if (!lbRows.length) el('div', 'opacity:.75', listBox).textContent = boardSyncNote() || t('lbEmpty');
    } else {
      el('div', 'font-weight:700', w3Body).textContent = t('contractLabel');
      var cInput = el('input', '', w3Body); cInput.className = 'avq-input'; cInput.placeholder = '0x...'; cInput.value = st.contractAddress || '';
      el('div', 'opacity:.72;font-size:12px', w3Body).textContent = t('contractHint');
      var bSaveC = el('button', 'align-self:flex-start', w3Body); bSaveC.className = 'avq-btn pri'; bSaveC.textContent = t('saveContract');
      bSaveC.onclick = function () {
        try { web3.setContractAddress(cInput.value); w3Status.textContent = '✅ ' + t('statusSavedContract'); refreshStaticTexts(); }
        catch (err) { w3Status.textContent = '⚠️ ' + ((err && err.message) || err); }
      };
      el('div', 'font-weight:700;margin-top:6px;color:#ffd166', w3Body).textContent = t('customL1Title');
      var nName = el('input', '', w3Body); nName.className = 'avq-input'; nName.value = st.network.chainName;
      var nId = el('input', '', w3Body); nId.className = 'avq-input'; nId.value = String(st.network.chainIdDec);
      var nRpc = el('input', '', w3Body); nRpc.className = 'avq-input'; nRpc.value = st.network.rpcUrls[0] || '';
      var nSym = el('input', '', w3Body); nSym.className = 'avq-input'; nSym.value = st.network.nativeCurrency.symbol;
      var nExp = el('input', '', w3Body); nExp.className = 'avq-input'; nExp.value = (st.network.blockExplorerUrls && st.network.blockExplorerUrls[0]) || '';
      var nRow = el('div', 'display:flex;gap:8px;flex-wrap:wrap', w3Body);
      var bApplyNet = el('button', '', nRow); bApplyNet.className = 'avq-btn pri'; bApplyNet.textContent = t('applyNetwork');
      bApplyNet.onclick = function () {
        try { web3.setCustomNetwork({ chainName: nName.value, chainIdDec: nId.value, rpcUrl: nRpc.value, symbol: nSym.value, explorerUrl: nExp.value }); w3Status.textContent = '✅ ' + t('statusSwitchedNet'); renderWeb3Modal(); }
        catch (err) { w3Status.textContent = '⚠️ ' + ((err && err.message) || err); }
      };
      var bResetNet = el('button', '', nRow); bResetNet.className = 'avq-btn'; bResetNet.textContent = t('resetArc');
      bResetNet.onclick = function () { web3.resetDefaultNetwork(); w3Status.textContent = '✅ Arc Testnet (5042002)'; renderWeb3Modal(); };
    }
  }

  function openWeb3Modal() { w3Overlay.style.display = 'flex'; w3Status.textContent = ''; renderWeb3Modal(); }
  function closeWeb3Modal() { w3Overlay.style.display = 'none'; }

  langBtn.onclick = function () {
    lang = lang === 'vi' ? 'en' : 'vi';
    try { window.localStorage.setItem('arc-voxel-quest:lang', lang); } catch (e) { /* ignore */ }
    refreshStaticTexts();
    if (levelUpChoices) renderLevelUpModal();
    if (w3Overlay.style.display === 'flex') renderWeb3Modal();
    if (cnOverlay.style.display === 'flex') renderConnectModal();
  };
  soundBtn.onclick = function () { muted = !muted; refreshStaticTexts(); };
  seasonPill.onclick = function () { activeTab = 'season'; if (web3 && web3.state.account) openWeb3Modal(); else openConnectModal(); };
  web3Btn.onclick = function () { if (!web3 || web3.state.account) openWeb3Modal(); else openConnectModal(); };
  w3Close.onclick = closeWeb3Modal;
  cnClose.onclick = function () { pendingStart = false; closeConnectModal(); };
  cnOverlay.addEventListener('click', function (e) { if (e.target === cnOverlay) { pendingStart = false; closeConnectModal(); } });
  w3Overlay.addEventListener('click', function (e) { if (e.target === w3Overlay) closeWeb3Modal(); });
  Object.keys(tabBtns).forEach(function (k) { tabBtns[k].onclick = function () { activeTab = k; renderWeb3Modal(); }; });
  /* Pausing from the keyboard (P), the pause button, or automatically when the tab is hidden. */
  function setPaused(value) {
    if (phase !== 'playing' || paused === value) return;
    paused = value;
    updateCardTexts();
    musicSync();
  }
  pauseBtn.onclick = function () { setPaused(!paused); };
  document.addEventListener('visibilitychange', function () { if (document.hidden && !levelUpChoices) setPaused(true); });
  cardPlayBtn.onclick = function () {
    if (phase === 'playing' && paused) { setPaused(false); return; } // the pause card resumes the run instead of restarting it
    requestStart();
  };
  dashBtn.addEventListener('pointerdown', function (e) { e.stopPropagation(); triggerPulseDash(); });
  async function doClaim(freeGas) {
    if (score <= 0 || runClaimed) return;
    if (!web3) {
      runClaimed = true;
      claimStatusText = t('claimedDemoOk') + ' (+' + score + ' ARCQ)';
      updateCardTexts();
      return;
    }
    var canRealChain = web3.state.account && window.ARC_WEB3.isValidAddress(web3.state.contractAddress);
    if (!canRealChain) {
      var resDemo = web3.claimDemoRun({ score: score, gems: gems, maxCombo: maxCombo });
      runClaimed = true;
      claimStatusText = t('claimedDemoOk') + ' (+' + score + ' ARCQ, TX ' + window.ARC_WEB3.shortAddr(resDemo.txHash) + ')';
      updateCardTexts();
      return;
    }
    if (!freeGas && web3.state.kind !== 'passkey' && web3.state.kind !== 'email' && web3.state.usdcBalance === 0n) { // passkey and email wallets never pay gas
      claimStatusText = '⚠️ ' + t('needGas');
      updateCardTexts();
      return;
    }
    cardClaimBtn.disabled = true;
    cardClaimOwnBtn.disabled = true;
    claimStatusText = t(freeGas ? 'claimingFree' : (web3.state.kind === 'passkey' ? 'claimingPasskey' : (web3.state.kind === 'email' ? 'claimingEmail' : 'claimingWallet')));
    updateCardTexts();
    var run = { score: score, gems: gems, maxCombo: maxCombo, wave: wave, elapsed: Math.floor(elapsed), telemetry: telemetry };
    try {
      var txRes = freeGas ? await web3.submitRunGasless(run) : await web3.submitRunOnChain(run);
      runClaimed = true;
      claimStatusText = t('claimedOk') + ' (+' + ((txRes.points || 0) * 0.2).toFixed(1).replace(/\.0$/u, '') + ' ARCQ, ' + (txRes.points || 0) + ' pts)';
      lastTxExplorerUrl = txRes.explorerUrl || '';
      web3.refreshBoard(true).then(renderEmbeddedLeaderboard);
    } catch (err) {
      claimStatusText = '⚠️ ' + friendlyTxError(err);
    } finally {
      cardClaimBtn.disabled = false;
      cardClaimOwnBtn.disabled = false;
      updateCardTexts();
    }
  }
  cardClaimBtn.onclick = function () { doClaim(Boolean(web3 && web3.state.setup && web3.state.setup.relay && web3.state.setup.relay.enabled)); };
  cardClaimOwnBtn.onclick = function () { doClaim(false); };

  /* Share card: a PNG with the score and a link to the onchain transaction. */
  function makeShareCard() {
    var c = document.createElement('canvas');
    c.width = 1080; c.height = 1080;
    var g = c.getContext('2d');
    var bg = g.createLinearGradient(0, 0, 1080, 1080);
    bg.addColorStop(0, '#0b1a3d'); bg.addColorStop(1, '#0b6a8f');
    g.fillStyle = bg; g.fillRect(0, 0, 1080, 1080);
    g.fillStyle = 'rgba(99,247,255,.12)';
    for (var i = 0; i < 9; i++) g.fillRect(60 + i * 110, 880 - ((i * 53) % 260), 80, 260 + ((i * 53) % 260));
    g.textAlign = 'center';
    g.fillStyle = '#63f7ff'; g.font = '900 56px system-ui,sans-serif'; g.fillText('ARC VOXEL QUEST', 540, 150);
    g.fillStyle = '#eefaff'; g.font = '700 40px system-ui,sans-serif'; g.fillText('Survived on Arc Testnet', 540, 215);
    g.fillStyle = '#ffd166'; g.font = '900 210px system-ui,sans-serif'; g.fillText(String(score), 540, 500);
    g.fillStyle = '#aef9ff'; g.font = '700 46px system-ui,sans-serif';
    g.fillText('Wave ' + wave + '  ·  ' + formatDuration(elapsed) + '  ·  ' + kills + ' kills', 540, 590);
    g.fillText((runHeroShort || activeHeroSpec().short), 540, 655);
    var pts = Math.min(50000, Math.floor(score / 20));
    g.fillStyle = '#7dffb1'; g.font = '800 44px system-ui,sans-serif'; g.fillText('Saved onchain: ' + pts + ' pts', 540, 760);
    g.fillStyle = '#eefaff'; g.font = '600 32px ui-monospace,monospace';
    g.fillText(web3 && web3.state.account ? window.ARC_WEB3.shortAddr(web3.state.account) : '', 540, 830);
    if (lastTxExplorerUrl) { g.fillStyle = '#9fb7d9'; g.font = '500 24px ui-monospace,monospace'; g.fillText(lastTxExplorerUrl.replace(/^https?:\/\//u, '').slice(0, 64), 540, 1000); }
    return c;
  }
  cardShareBtn.onclick = function () {
    var text = 'I scored ' + score + ' (wave ' + wave + ') in Arc Voxel Quest on Arc Testnet.' + (lastTxExplorerUrl ? ' Verified onchain: ' + lastTxExplorerUrl : '');
    makeShareCard().toBlob(function (blob) {
      if (!blob) return;
      var file = new File([blob], 'arc-voxel-score.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
        navigator.share({ files: [file], text: text }).catch(function () { /* cancelled */ });
        return;
      }
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'arc-voxel-score.png';
      document.body.appendChild(a); a.click(); a.remove();
      try { navigator.clipboard.writeText(text); } catch (e) { /* clipboard unavailable */ }
      claimStatusText = t('shareCopied');
      updateCardTexts();
    }, 'image/png');
  };

  /* 13. INPUT */
  var keys = {};
  var KEYMAP = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
  window.addEventListener('keydown', function (event) {
    if (document.activeElement === nickInput) return;
    if (cnOverlay.style.display === 'flex') { if (event.code === 'Escape') closeConnectModal(); return; }
    if (w3Overlay.style.display === 'flex') { if (event.code === 'Escape') closeWeb3Modal(); return; }
    if (levelUpChoices) {
      if (event.code === 'Digit1' && levelUpChoices[0]) applyUpgrade(levelUpChoices[0]);
      else if (event.code === 'Digit2' && levelUpChoices[1]) applyUpgrade(levelUpChoices[1]);
      else if (event.code === 'Digit3' && levelUpChoices[2]) applyUpgrade(levelUpChoices[2]);
      return;
    }
    if (event.code === 'KeyM') { muted = !muted; refreshStaticTexts(); return; }
    if (phase === 'playing' && event.code === 'KeyP') { setPaused(!paused); return; }
    if (phase === 'playing' && (event.code === 'Space' || event.code === 'ShiftLeft' || event.code === 'ShiftRight')) {
      event.preventDefault(); triggerPulseDash(); return;
    }
    if (KEYMAP[event.code]) { keys[KEYMAP[event.code]] = true; event.preventDefault(); }
    if (phase !== 'playing' && canRestart() && (event.code === 'Enter' || event.code === 'Space')) requestStart();
  });
  window.addEventListener('keyup', function (event) { if (KEYMAP[event.code]) keys[KEYMAP[event.code]] = false; });
  window.addEventListener('blur', function () { keys = {}; });

  var drag = null;
  canvas.addEventListener('pointerdown', function (event) {
    canvas.focus();
    if (w3Overlay.style.display === 'flex' || cnOverlay.style.display === 'flex' || levelUpChoices) return;
    if (phase !== 'playing') { if (canRestart()) requestStart(); return; }
    if (!drag) {
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, dx: 0, dy: 0 };
      joyBase.style.display = 'block';
      joyBase.style.left = event.clientX + 'px';
      joyBase.style.top = event.clientY + 'px';
      joyKnob.style.transform = 'translate(0px,0px)';
      try { canvas.setPointerCapture(event.pointerId); } catch (e) { /* ignore */ }
    }
  });
  canvas.addEventListener('pointermove', function (event) {
    if (!drag || event.pointerId !== drag.id) return;
    drag.dx = event.clientX - drag.x; drag.dy = event.clientY - drag.y;
    var r = 42, d = Math.hypot(drag.dx, drag.dy);
    joyKnob.style.transform = 'translate(' + (d > r ? (drag.dx / d) * r : drag.dx).toFixed(1) + 'px,' + (d > r ? (drag.dy / d) * r : drag.dy).toFixed(1) + 'px)';
  });
  function endDrag(event) { if (drag && event.pointerId === drag.id) { drag = null; joyBase.style.display = 'none'; } }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  function inputDirection() {
    var x = (keys.right ? 1 : 0) - (keys.left ? 1 : 0), z = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
    if (drag) {
      var length = Math.hypot(drag.dx, drag.dy);
      if (length > 10) { x = drag.dx / length; z = drag.dy / length; }
    }
    var magnitude = Math.hypot(x, z);
    return magnitude > 0 ? { x: x / magnitude, z: z / magnitude } : { x: 0, z: 0 };
  }

  function moveOnIsland(entity, dx, dz, radius, allowAbyss) {
    var nx = entity.x + dx;
    if (walkable(nx + Math.sign(dx) * radius, entity.z) && walkable(nx, entity.z)) entity.x = nx;
    else if (allowAbyss && groundAt(nx, entity.z) === 0) entity.x = nx;
    var nz = entity.z + dz;
    if (walkable(entity.x, nz + Math.sign(dz) * radius) && walkable(entity.x, nz)) entity.z = nz;
    else if (allowAbyss && groundAt(entity.x, nz) === 0) entity.z = nz;
  }

  /* 14. UPDATE LOOP */
  function update(dt, now) {
    var tNow = now / 1000;
    if (bannerTimer > 0) {
      bannerTimer = Math.max(0, bannerTimer - dt);
      if (bannerTimer === 0) bannerEl.style.display = 'none';
    }

    if (phase === 'playing' && !paused && !levelUpChoices) {
      elapsed += dt;
      // Telemetry for the server's plausibility check: a checkpoint every few seconds, sparser in very long runs.
      if (elapsed - lastCpAt >= 5 + Math.floor(elapsed / 600) * 5 && telemetry.length < 390) {
        lastCpAt = Math.floor(elapsed);
        telemetry.push({ t: lastCpAt, s: score, k: kills, g: gems, w: wave });
      }
      if (R.duration > 0) timeLeft = Math.max(0, timeLeft - dt);
      invulnerable = Math.max(0, invulnerable - dt);
      dashCooldown = Math.max(0, dashCooldown - dt);
      dashTimer = Math.max(0, dashTimer - dt);
      if (streakTimer > 0) {
        streakTimer = Math.max(0, streakTimer - dt);
        if (streakTimer === 0) streak = 0;
      }

      // Escalating Endless Wave every 20 seconds using Threat Tier Roadmap
      var newWave = 1 + Math.floor(elapsed / 20);
      if (newWave > wave) {
        var prevTier = getThreatTier(wave);
        wave = newWave;
        var nextTier = getThreatTier(wave);
        var tierLbl = lang === 'vi' ? nextTier.nameVi : nextTier.nameEn;
        var tierMsg = nextTier !== prevTier
          ? (t('waveBanner') + ' ' + wave + ' · 🔥 ' + tierLbl.toUpperCase() + '!' + (nextTier.eliteChance > 0 ? (lang === 'vi' ? ' (TINH ANH XUẤT HIỆN!)' : ' (ELITES UNLOCKED!)') : ''))
          : (t('waveBanner') + ' ' + wave + ' · ' + tierLbl + ' · ' + t('waveWarn'));
        showBanner(tierMsg);
        blip(620, 0.2, 'triangle', 0.06, 980);
      }

      var dir = inputDirection();
      if (tutorialStage === 1 && (Math.hypot(dir.x, dir.z) > 0.2 || elapsed > 4.5)) tutorialStage = 2;
      if (tutorialStage === 2 && elapsed > 10) {
        tutorialStage = 0;
        try { window.localStorage.setItem('arc-voxel-quest:tut-done', '1'); } catch (e) { /* ignore */ }
      }
      var speedMult = speedStatMult * (dashTimer > 0 ? 2.1 : 1.0);
      hero.vx = lerp(hero.vx, dir.x * R.heroSpeed * speedMult, Math.min(1, dt * 14));
      hero.vz = lerp(hero.vz, dir.z * R.heroSpeed * speedMult, Math.min(1, dt * 14));
      moveOnIsland(hero, hero.vx * dt, hero.vz * dt, 0.32, true);
      if (Math.abs(hero.vx) + Math.abs(hero.vz) > 0.4) hero.facing = Math.atan2(hero.vx, hero.vz);

      // Abyss check (punishes careless edge running)
      if (groundAt(hero.x, hero.z) === 0) {
        var safeSpot = randomLand(2, false) || { x: 0, z: 0 };
        hero.x = safeSpot.x; hero.z = safeSpot.z; hero.vx = hero.vz = 0;
        triggerHeroDamage(0, 0, t('abyssWarn'));
        if (phase !== 'playing') return;
      }

      // Wave spawner & Boss trigger
      spawnTimer += dt;
      var curTier = getThreatTier(wave);
      var curSpawnEvery = Math.max(curTier.spawnFloor, R.enemySpawnEvery - (wave - 1) * 0.09);
      var waveMaxEnemies = Math.min(54, curTier.maxMobs + (wave - 1) * 2);
      if (spawnTimer >= curSpawnEvery && enemies.length < waveMaxEnemies) {
        spawnTimer = 0;
        var roll = Math.random();
        if (curTier.casterRatio > 0 && roll < curTier.casterRatio) spawnEnemy('caster');
        else if (roll < curTier.casterRatio + curTier.chargerRatio) spawnEnemy('charger');
        else spawnEnemy('stalker');
      }
      if (elapsed >= nextBossAt) {
        nextBossAt += R.bossEvery;
        spawnEnemy('boss');
      }

      // Auto-Weapons firing
      for (var wk in wTimers) wTimers[wk] -= dt * fireRateMult;
      if (upLevels.dragon && wTimers.dragon <= 0) {
        wTimers.dragon = Math.max(0.4, 0.98 - upLevels.dragon * 0.1);
        var tgt = nearestEnemy(18);
        var ang = tgt ? Math.atan2(tgt.x - hero.x, tgt.z - hero.z) : hero.facing;
        var countD = upLevels.dragon >= 3 ? 2 : 1;
        for (var di = 0; di < countD; di++) {
          var aD = ang + (countD > 1 ? (di - 0.5) * 0.22 : 0);
          spawnProjectile(Math.sin(aD) * 15, Math.cos(aD) * 15, 2.2 + upLevels.dragon * 0.85, '#ff5c38', 1, false, true, 'dragon');
        }
        blip(420, 0.05, 'triangle', 0.03, 280);
      }
      if (upLevels.lightning && wTimers.lightning <= 0) {
        wTimers.lightning = Math.max(0.5, 1.25 - upLevels.lightning * 0.13);
        fireChainLightning(upLevels.lightning);
      }
      if (upLevels.shuriken && wTimers.shuriken <= 0) {
        wTimers.shuriken = Math.max(0.38, 0.88 - upLevels.shuriken * 0.09);
        var sCount = 2 + upLevels.shuriken, baseAng = tNow * 2.4;
        for (var si = 0; si < sCount; si++) {
          var aS = baseAng + (si * Math.PI * 2) / sCount;
          spawnProjectile(Math.sin(aS) * 14, Math.cos(aS) * 14, 1.5 + upLevels.shuriken * 0.45, '#fb923c', 2 + upLevels.shuriken, false, false, 'shuriken');
        }
      }
      if (upLevels.coloa && wTimers.coloa <= 0) {
        wTimers.coloa = Math.max(0.38, 0.86 - upLevels.coloa * 0.08);
        var tgtC = nearestEnemy(20);
        if (tgtC) {
          var aC = Math.atan2(tgtC.x - hero.x, tgtC.z - hero.z);
          var nArrows = 1 + Math.floor(upLevels.coloa / 2);
          for (var ci = 0; ci < nArrows; ci++) {
            var spread = (ci - (nArrows - 1) / 2) * 0.25;
            spawnProjectile(Math.sin(aC + spread) * 16, Math.cos(aC + spread) * 16, 1.9 + upLevels.coloa * 0.65, '#4ade80', 1, true, false, 'coloa');
          }
        }
      }
      if (upLevels.drill && wTimers.drill <= 0) {
        wTimers.drill = Math.max(0.5, 1.05 - upLevels.drill * 0.09);
        var tgtDr = nearestEnemy(18);
        var aDr = tgtDr ? Math.atan2(tgtDr.x - hero.x, tgtDr.z - hero.z) : hero.facing;
        spawnProjectile(Math.sin(aDr) * 17, Math.cos(aDr) * 17, 3.2 + upLevels.drill * 1.15, '#f43f5e', 4 + upLevels.drill, false, false, 'drill');
      }
      if (upLevels.orbital && wTimers.orbital <= 0) {
        wTimers.orbital = Math.max(1.1, 2.5 - upLevels.orbital * 0.28);
        spawnOrbitalStrike(upLevels.orbital);
      }
      // Sonic Pulse: a shockwave around the hero, fired only when something is in range
      if (upLevels.pulse && wTimers.pulse <= 0) {
        var lvP = upLevels.pulse, rP = 3.4 + lvP * 0.45, dP = 3.0 + lvP * 0.8, nearP = 0;
        for (var ep0 = 0; ep0 < enemies.length; ep0++) if (Math.hypot(enemies[ep0].x - hero.x, enemies[ep0].z - hero.z) <= rP + enemies[ep0].radius) nearP++;
        if (!nearP) {
          wTimers.pulse = 0.2;
        } else {
          wTimers.pulse = Math.max(0.7, 1.5 - lvP * 0.15);
          for (var ep = enemies.length - 1; ep >= 0; ep--) {
            var enP = enemies[ep], dxP = enP.x - hero.x, dzP = enP.z - hero.z, dstP = Math.hypot(dxP, dzP) || 1;
            if (dstP <= rP + enP.radius) damageEnemy(enP, dP, (dxP / dstP) * 1.5, (dzP / dstP) * 1.5);
          }
          spawnFxRing(hero.x, (groundAt(hero.x, hero.z) || 1) + 0.2, hero.z, '#4ade80', 0.8, rP * 1.15, 0.34, false);
          blip(320, 0.08, 'sine', 0.05, 540);
        }
      }
      // Returning Boomerang: flies out, turns back to the hero, and hits on both passes (Lv.4 throws two)
      if (upLevels.boomerang && wTimers.boomerang <= 0) {
        var lvB = upLevels.boomerang, tgtB = nearestEnemy(16);
        wTimers.boomerang = Math.max(0.8, 1.55 - lvB * 0.14);
        var aB0 = tgtB ? Math.atan2(tgtB.x - hero.x, tgtB.z - hero.z) : hero.facing;
        var nBoom = lvB >= 4 ? 2 : 1;
        for (var bmi = 0; bmi < nBoom; bmi++) {
          var aBm = aB0 + bmi * Math.PI;
          spawnProjectile(Math.sin(aBm) * 12, Math.cos(aBm) * 12, 2.6 + lvB * 0.75, '#d97706', 99, false, false, 'boomerang');
          projectiles[projectiles.length - 1].life = 2.6;
        }
        blip(380, 0.06, 'triangle', 0.03, 300);
      }
      // Proximity Mines: dropped where the hero walks, armed after a moment, blast when a mob steps close
      if (upLevels.mines && wTimers.mines <= 0) {
        var lvM = upLevels.mines, tooClose = false;
        for (var mj = 0; mj < mines.length; mj++) if (Math.hypot(mines[mj].x - hero.x, mines[mj].z - hero.z) < 1.4) tooClose = true;
        if (tooClose || mines.length >= 4 + lvM) {
          wTimers.mines = 0.3;
        } else {
          wTimers.mines = Math.max(0.9, 1.9 - lvM * 0.2);
          var mineMesh = new THREE.Group();
          mineMesh.add(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.22, 0.9), new THREE.MeshBasicMaterial({ color: '#4c1d95' })));
          var mineCore = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.4), new THREE.MeshBasicMaterial({ color: '#c4b5fd', transparent: true, opacity: 0.9 }));
          mineCore.position.set(0, 0.2, 0);
          mineMesh.add(mineCore);
          mineMesh.position.set(hero.x, (groundAt(hero.x, hero.z) || 1) + 0.15, hero.z);
          scene.add(mineMesh);
          mines.push({ x: hero.x, z: hero.z, life: 10, arm: 0.5, dmg: 4.2 + lvM * 1.1, radius: 2.8 + lvM * 0.25, mesh: mineMesh });
        }
      }
      for (var mi = mines.length - 1; mi >= 0; mi--) {
        var mn = mines[mi];
        mn.life -= dt; mn.arm -= dt;
        mn.mesh.children[1].material.opacity = 0.55 + Math.sin(tNow * 8 + mi) * 0.35;
        var boom = false;
        if (mn.arm <= 0) {
          for (var me = 0; me < enemies.length; me++) {
            if (Math.hypot(enemies[me].x - mn.x, enemies[me].z - mn.z) < 1.5 + enemies[me].radius) { boom = true; break; }
          }
        }
        if (boom) {
          var my = (groundAt(mn.x, mn.z) || 1) + 0.25;
          burst(mn.x, my + 0.7, mn.z, 16);
          spawnFxRing(mn.x, my, mn.z, '#a78bfa', 0.8, mn.radius * 1.2, 0.34, false);
          blip(240, 0.14, 'sawtooth', 0.05, 110);
          for (var mk = enemies.length - 1; mk >= 0; mk--) {
            if (Math.hypot(enemies[mk].x - mn.x, enemies[mk].z - mn.z) <= mn.radius + enemies[mk].radius) damageEnemy(enemies[mk], mn.dmg, (enemies[mk].x - mn.x) * 0.3, (enemies[mk].z - mn.z) * 0.3);
          }
        }
        if (boom || mn.life <= 0) { scene.remove(mn.mesh); disposeNode(mn.mesh); mines.splice(mi, 1); }
      }

      if (upLevels.blades) {
        bladeGroup.rotation.y = tNow * (3.5 + upLevels.blades * 0.35);
        var bCount = bladeGroup.children.length;
        for (var bi = 0; bi < bCount; bi++) {
          var ba = (bi * Math.PI * 2) / bCount, br = 2.6;
          bladeGroup.children[bi].position.set(Math.sin(ba) * br, 0.9, Math.cos(ba) * br);
          bladeGroup.children[bi].rotation.y = ba;
          var wxB = hero.x + Math.sin(ba + bladeGroup.rotation.y) * br;
          var wzB = hero.z + Math.cos(ba + bladeGroup.rotation.y) * br;
          for (var ei = enemies.length - 1; ei >= 0; ei--) {
            var enB = enemies[ei];
            if (Math.hypot(enB.x - wxB, enB.z - wzB) < enB.radius + 0.75) {
              damageEnemy(enB, (2.0 + upLevels.blades * 0.65) * dt * 8, 0, 0);
            }
          }
        }
      }

      // Player Projectiles
      for (var pi = projectiles.length - 1; pi >= 0; pi--) {
        var pr = projectiles[pi];
        pr.life -= dt;
        if (pr.homing) {
          var ht = nearestEnemy(15);
          if (ht) {
            var dxH = ht.x - pr.x, dzH = ht.z - pr.z, dH = Math.hypot(dxH, dzH) || 1;
            pr.vx = lerp(pr.vx, (dxH / dH) * 16, dt * 6);
            pr.vz = lerp(pr.vz, (dzH / dH) * 16, dt * 6);
            pr.mesh.rotation.y = Math.atan2(pr.vx, pr.vz);
          }
        }
        if (pr.kind === 'boomerang' && pr.life < 1.6) {
          if (!pr.returning) { pr.returning = true; pr.hitIds = []; } // can hit every mob again on the way back
          var dxR = hero.x - pr.x, dzR = hero.z - pr.z, dR = Math.hypot(dxR, dzR) || 1;
          pr.vx = lerp(pr.vx, (dxR / dR) * 15, dt * 8);
          pr.vz = lerp(pr.vz, (dzR / dR) * 15, dt * 8);
          if (dR < 1.1) pr.life = 0;
        }
        pr.x += pr.vx * dt; pr.z += pr.vz * dt;
        pr.mesh.position.set(pr.x, (groundAt(pr.x, pr.z) || 1) + 0.9, pr.z);
        if (pr.kind === 'shuriken') pr.mesh.rotation.y += dt * 16;
        else if (pr.kind === 'boomerang') pr.mesh.rotation.y += dt * 18;
        else if (pr.kind === 'drill') pr.mesh.rotation.z += dt * 20;
        else if (pr.kind === 'dragon') { pr.mesh.rotation.x += dt * 8; pr.mesh.rotation.y += dt * 8; }
        var dead = pr.life <= 0 || Math.abs(pr.x) > N || Math.abs(pr.z) > N;
        if (!dead) {
          for (var ej = enemies.length - 1; ej >= 0; ej--) {
            var targetE = enemies[ej];
            if (pr.hitIds.indexOf(targetE) >= 0) continue;
            if (Math.hypot(targetE.x - pr.x, targetE.z - pr.z) < targetE.radius + 0.55) {
              pr.hitIds.push(targetE);
              pr.pierce -= 1;
              if (pr.explosive) {
                burst(pr.x, targetE.y + 0.9, pr.z, 12);
                spawnFxRing(pr.x, (groundAt(pr.x, pr.z) || 1) + 0.25, pr.z, '#ff6b35', 0.8, 4.8, 0.3, false);
                for (var ek = enemies.length - 1; ek >= 0; ek--) {
                  if (Math.hypot(enemies[ek].x - pr.x, enemies[ek].z - pr.z) < 3.1) {
                    damageEnemy(enemies[ek], pr.dmg, (enemies[ek].x - pr.x) * 0.4, (enemies[ek].z - pr.z) * 0.4);
                  }
                }
              } else {
                damageEnemy(targetE, pr.dmg, pr.vx * 0.04, pr.vz * 0.04);
              }
              if (pr.pierce <= 0) { dead = true; break; }
            }
          }
        }
        if (dead) { scene.remove(pr.mesh); disposeNode(pr.mesh); projectiles.splice(pi, 1); }
      }

      // Enemy Projectiles (Dodging challenge!)
      for (var ebi = enemyBullets.length - 1; ebi >= 0; ebi--) {
        var eb = enemyBullets[ebi];
        eb.life -= dt;
        eb.x += eb.vx * dt; eb.z += eb.vz * dt;
        eb.mesh.position.set(eb.x, (groundAt(eb.x, eb.z) || 1) + 1.0, eb.z);
        if (Math.hypot(eb.x - hero.x, eb.z - hero.z) < 0.95) {
          scene.remove(eb.mesh); eb.mesh.material.dispose(); enemyBullets.splice(ebi, 1);
          triggerHeroDamage((eb.vx * 0.08), (eb.vz * 0.08));
          if (phase !== 'playing') return;
          continue;
        }
        if (eb.life <= 0 || Math.abs(eb.x) > N || Math.abs(eb.z) > N) {
          scene.remove(eb.mesh); eb.mesh.material.dispose(); enemyBullets.splice(ebi, 1);
        }
      }

      // Boss Meteor Hazards
      for (var hi = hazards.length - 1; hi >= 0; hi--) {
        var hz = hazards[hi];
        hz.delay -= dt;
        hz.mesh.scale.setScalar(1.15 - Math.max(0, hz.delay) * 0.4);
        if (hz.delay <= 0) {
          var hy = (groundAt(hz.x, hz.z) || 1) + 0.25;
          burst(hz.x, hy + 0.6, hz.z, 20);
          spawnFxRing(hz.x, hy, hz.z, '#ff2e63', 0.8, 3.8, 0.34, false);
          blip(200, 0.25, 'sawtooth', 0.06, 70);
          if (Math.hypot(hero.x - hz.x, hero.z - hz.z) < hz.radius) {
            triggerHeroDamage((hero.x - hz.x) * 0.5, (hero.z - hz.z) * 0.5);
            if (phase !== 'playing') return;
          }
          scene.remove(hz.mesh); hz.mesh.material.dispose(); hazards.splice(hi, 1);
        }
      }

      // Orbital strikes, lightning lines & VFX Rings
      for (var si2 = strikes.length - 1; si2 >= 0; si2--) {
        var st2 = strikes[si2];
        st2.delay -= dt;
        st2.mesh.scale.setScalar(1.2 - Math.max(0, st2.delay) * 0.5);
        if (st2.delay <= 0) {
          var sy = (groundAt(st2.x, st2.z) || 1) + 0.2;
          burst(st2.x, sy + 0.9, st2.z, 24);
          spawnFxRing(st2.x, sy, st2.z, '#38f2ff', 0.9, 1.3, 0.4, true);
          spawnFxRing(st2.x, sy + 0.05, st2.z, '#70f8ff', 0.9, 5.2, 0.36, false);
          blip(260, 0.25, 'sawtooth', 0.06, 90);
          for (var es = enemies.length - 1; es >= 0; es--) {
            if (Math.hypot(enemies[es].x - st2.x, enemies[es].z - st2.z) <= st2.radius) damageEnemy(enemies[es], st2.dmg, 0, 0);
          }
          scene.remove(st2.mesh); st2.mesh.material.dispose(); strikes.splice(si2, 1);
        }
      }
      for (var bi2 = bolts.length - 1; bi2 >= 0; bi2--) {
        bolts[bi2].life -= dt;
        if (bolts[bi2].life <= 0) {
          scene.remove(bolts[bi2].line); disposeNode(bolts[bi2].line);
          bolts.splice(bi2, 1);
        }
      }

      // Update Enemies AI & Unique Country Boss Patterns
      var activeBoss = null;
      for (var i = 0; i < enemies.length; i++) {
        var e = enemies[i], tx = hero.x - e.x, tz = hero.z - e.z, dist = Math.hypot(tx, tz) || 1;
        if (e.flash > 0) e.flash = Math.max(0, e.flash - dt);

        if (e.kind === 'boss') {
          activeBoss = e;
          e.aiTimer -= dt;
          e.meteorTimer -= dt;
          if (e.aiTimer <= 0) {
            e.aiTimer = Math.max(1.7, 3.0 - wave * 0.14);
            var bCol = e.bossGlow || '#ff2e63';
            if (e.bossPattern === 'spread') {
              var aim = Math.atan2(tx, tz);
              for (var spB = -2; spB <= 2; spB++) {
                var aSp = aim + spB * 0.24;
                spawnEnemyBullet(e.x, e.z, Math.sin(aSp) * 9.0, Math.cos(aSp) * 9.0, bCol);
              }
            } else if (e.bossPattern === 'spiral') {
              var sc = 10 + Math.min(6, wave);
              for (var spI = 0; spI < sc; spI++) {
                var aSpi = tNow * 1.8 + (spI * Math.PI * 2) / sc;
                spawnEnemyBullet(e.x, e.z, Math.sin(aSpi) * 7.6, Math.cos(aSpi) * 7.6, bCol);
              }
            } else if (e.bossPattern === 'dashNova') {
              moveOnIsland(e, (tx / dist) * 2.2, (tz / dist) * 2.2, 0.4);
              spawnFxRing(e.x, (groundAt(e.x, e.z) || 1) + 0.2, e.z, bCol, 0.8, 3.6, 0.3, false);
              for (var dI = 0; dI < 8; dI++) {
                var aDn = tNow + (dI * Math.PI * 2) / 8;
                spawnEnemyBullet(e.x, e.z, Math.sin(aDn) * 7.8, Math.cos(aDn) * 7.8, bCol);
              }
            } else {
              var ringCount = 8 + Math.min(8, wave);
              var phaseOffset = tNow * 0.7;
              for (var rb = 0; rb < ringCount; rb++) {
                var ba2 = phaseOffset + (rb * Math.PI * 2) / ringCount;
                spawnEnemyBullet(e.x, e.z, Math.sin(ba2) * 7.2, Math.cos(ba2) * 7.2, bCol);
                if (e.bossPattern === 'doubleRing' && rb % 2 === 0) {
                  spawnEnemyBullet(e.x, e.z, Math.sin(ba2 + 0.2) * 5.2, Math.cos(ba2 + 0.2) * 5.2, '#ffd166');
                }
              }
            }
          }
          if (e.meteorTimer <= 0) {
            e.meteorTimer = Math.max(1.9, 3.6 - wave * 0.14);
            spawnMeteorHazard(hero.x + (Math.random() - 0.5) * 2.5, hero.z + (Math.random() - 0.5) * 2.5);
          }
          moveOnIsland(e, (tx / dist) * e.speed * dt, (tz / dist) * e.speed * dt, 0.4);
        } else if (e.kind === 'charger') {
          e.stateTimer -= dt;
          if (e.state === 'chase') {
            moveOnIsland(e, (tx / dist) * e.speed * dt, (tz / dist) * e.speed * dt, 0.35);
            if (e.stateTimer <= 0 && dist < 11) {
              e.state = 'telegraph';
              e.stateTimer = 0.75;
              e.dirX = tx / dist; e.dirZ = tz / dist;
              if (e.telMesh) {
                e.telMesh.visible = true;
                e.telMesh.position.set(e.x + e.dirX * 5, (groundAt(e.x, e.z) || 1) + 0.15, e.z + e.dirZ * 5);
                e.telMesh.rotation.y = Math.atan2(e.dirX, e.dirZ);
              }
            }
          } else if (e.state === 'telegraph') {
            if (e.stateTimer <= 0) {
              e.state = 'dash';
              e.stateTimer = 0.65;
              if (e.telMesh) e.telMesh.visible = false;
              blip(280, 0.12, 'sawtooth', 0.04, 140);
            }
          } else {
            moveOnIsland(e, e.dirX * (e.speed * 3.2) * dt, e.dirZ * (e.speed * 3.2) * dt, 0.35);
            if (e.stateTimer <= 0) { e.state = 'chase'; e.stateTimer = 2.4; }
          }
        } else if (e.kind === 'caster') {
          e.aiTimer -= dt;
          if (dist > 8.5) moveOnIsland(e, (tx / dist) * e.speed * dt, (tz / dist) * e.speed * dt, 0.35);
          else if (dist < 5.5) moveOnIsland(e, (-tx / dist) * e.speed * 0.7 * dt, (-tz / dist) * e.speed * 0.7 * dt, 0.35);
          if (e.aiTimer <= 0) {
            e.aiTimer = Math.max(1.5, 2.7 - wave * 0.1);
            spawnEnemyBullet(e.x, e.z, (tx / dist) * (8.2 + Math.min(3.5, wave * 0.3)), (tz / dist) * (8.2 + Math.min(3.5, wave * 0.3)), '#e879f9');
          }
        } else {
          var ax = tx / dist, az = tz / dist;
          for (var j = 0; j < enemies.length; j++) {
            if (i === j) continue;
            var ox = e.x - enemies[j].x, oz = e.z - enemies[j].z, od = Math.hypot(ox, oz);
            if (od > 0 && od < 1.45) { ax += (ox / od) * 0.85; az += (oz / od) * 0.85; }
          }
          var al = Math.hypot(ax, az) || 1;
          moveOnIsland(e, (ax / al) * e.speed * dt, (az / al) * e.speed * dt, 0.32);
        }

        if (dist < e.radius + 0.68) {
          if (dashTimer > 0) moveOnIsland(e, (-tx / dist) * 1.6, (-tz / dist) * 1.6, 0.35);
          else {
            triggerHeroDamage((-tx / dist) * 1.4, (-tz / dist) * 1.4);
            if (phase !== 'playing') return;
          }
        }
      }

      if (activeBoss) {
        bossBarWrap.style.display = 'block';
        bossBarTitle.innerHTML = '<span>' + (activeBoss.bossName || t('bossTitle')) + '</span><span>' + Math.ceil(activeBoss.hp) + ' / ' + activeBoss.maxHp + '</span>';
        bossBarFill.style.width = clamp((activeBoss.hp / activeBoss.maxHp) * 100, 0, 100) + '%';
      } else {
        bossBarWrap.style.display = 'none';
      }

      // Magnet pull & XP pickup
      var magRadius = activeHeroSpec().magnet * magnetMult;
      for (var k = pickups.length - 1; k >= 0; k--) {
        var p = pickups[k];
        var dp = Math.hypot(p.x - hero.x, p.z - hero.z);
        if (dp < magRadius && dp > 0.1) {
          p.x = lerp(p.x, hero.x, Math.min(1, dt * 8));
          p.z = lerp(p.z, hero.z, Math.min(1, dt * 8));
        }
        if (dp < 1.35) {
          scene.remove(p.node);
          pickups.splice(k, 1);
          gems += 1;
          score += p.scoreVal;
          xp += p.xp;
          burst(p.x, (groundAt(p.x, p.z) || 1) + 0.8, p.z, 8);
          blip(840 + Math.min(400, level * 30), 0.08, 'triangle', 0.04, 1260);
          if (xp >= xpNeed) {
            xp -= xpNeed;
            level += 1;
            xpNeed = Math.round(xpNeed * 1.32 + 15);
            openLevelUp();
          }
          post({ type: 'state', phase: phase, score: score });
        }
      }
      var ambientCount = pickups.filter(function (pk) { return !pk.isXp; }).length;
      while (ambientCount < R.maxPickups) { addShard(undefined, undefined, 15, false); ambientCount++; }
      if (R.duration > 0 && timeLeft <= 0) finish(true);
    }

    function lerpAngle(a, b, tVal) {
      var TAU = Math.PI * 2;
      var d = ((((b - a) % TAU) + TAU + Math.PI) % TAU) - Math.PI;
      return a + d * tVal;
    }

    // Visual animations
    hero.y = lerp(hero.y, Math.max(1, groundAt(hero.x, hero.z)), Math.min(1, dt * 14));
    var moving = Math.hypot(hero.vx, hero.vz) > 0.5 && phase === 'playing';
    var heroBody = hero.node.userData.body;
    hero.node.position.set(hero.x, hero.y + (moving ? Math.abs(Math.sin(tNow * 14)) * 0.14 : Math.sin(tNow * 2.4) * 0.03), hero.z);
    if (heroBody.userData.sprite) heroBody.material.rotation = moving ? Math.sin(tNow * 12) * 0.06 : 0;
    else {
      heroBody.rotation.y = lerpAngle(heroBody.rotation.y, hero.facing, Math.min(1, dt * 12));
      animateRig(heroBody.userData.rig, moving, tNow, 0, '');
    }
    if (hero.node.userData.aura) {
      hero.node.userData.aura.scale.setScalar(1 + Math.sin(tNow * 4) * 0.06);
      hero.node.userData.aura.material.opacity = dashTimer > 0 ? 0.95 : 0.65;
    }
    hero.node.visible = invulnerable <= 0 || dashTimer > 0 || Math.floor(tNow * 12) % 2 === 0;
    bubble.visible = dashTimer > 0;

    if (pulseWaveTimer > 0) {
      pulseWaveTimer = Math.max(0, pulseWaveTimer - dt);
      var prog = 1 - pulseWaveTimer / 0.38;
      pulseRing.scale.setScalar(0.8 + prog * 5.2);
      pulseRing.material.opacity = (1 - prog) * 0.85;
      if (pulseWaveTimer === 0) pulseRing.visible = false;
    }

    for (var m = 0; m < enemies.length; m++) {
      var en = enemies[m], body = en.node.userData.body;
      en.y = lerp(en.y, Math.max(1, groundAt(en.x, en.z)), Math.min(1, dt * 10));
      var hoverLift = en.type === 'caster' ? 0.35 + Math.sin(tNow * 3.4 + en.wobble) * 0.18 : Math.abs(Math.sin(tNow * 6 + en.wobble)) * 0.1;
      en.node.position.set(en.x, en.y + hoverLift, en.z);
      en.node.scale.setScalar(en.flash > 0 ? 1.12 : 1.0);
      if (!body.userData.sprite) {
        body.rotation.y = Math.atan2(hero.x - en.x, hero.z - en.z) + Math.sin(tNow * 5 + en.wobble) * 0.12;
        body.rotation.x = en.type === 'charger' && en.state === 'charge' ? 0.24 : 0;
        animateRig(body.userData.rig, true, tNow, en.wobble, en.state);
      }
    }
    for (var n = 0; n < pickups.length; n++) {
      var pk = pickups[n];
      pk.node.position.set(pk.x, (groundAt(pk.x, pk.z) || 1) + (pk.isXp ? 0.5 : 0.18) + Math.sin(tNow * 3 + pk.phase) * 0.14, pk.z);
      pk.node.rotation.y = tNow * 1.5 + pk.phase;
    }
    for (var q = 0; q < SPARKS; q++) {
      var s = sparks[q];
      if (s.life > 0) { s.life -= dt; s.vy -= 9 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt; }
      dummy.position.set(s.x, s.y, s.z);
      dummy.rotation.set(tNow * 3 + q, tNow * 2, 0);
      dummy.scale.setScalar(s.life > 0 ? 0.16 * Math.min(1, s.life * 2) : 0);
      dummy.updateMatrix();
      sparkMesh.setMatrixAt(q, dummy.matrix);
    }
    sparkMesh.instanceMatrix.needsUpdate = true;
    for (var fi2 = fxRings.length - 1; fi2 >= 0; fi2--) {
      var fx = fxRings[fi2];
      fx.life -= dt;
      if (fx.life <= 0) { scene.remove(fx.mesh); disposeNode(fx.mesh); fxRings.splice(fi2, 1); continue; }
      var prg = 1 - fx.life / fx.maxLife;
      var scF = lerp(fx.s0, fx.s1, prg);
      if (fx.isPillar) fx.mesh.scale.set(1.0 - prg * 0.55, 1, 1.0 - prg * 0.55);
      else fx.mesh.scale.setScalar(scF);
      fx.mesh.material.opacity = (1 - prg) * (fx.isPillar ? 0.78 : 0.9);
    }
    water.material.color.set(activeMapSpec().water).multiplyScalar(0.94 + Math.sin(tNow * 0.8) * 0.05);

    for (var ppi = popups.length - 1; ppi >= 0; ppi--) {
      var pp = popups[ppi];
      pp.life -= dt; pp.y += dt * 1.7;
      if (pp.life <= 0) { popupsEl.removeChild(pp.el); popups.splice(ppi, 1); continue; }
      var proj = new THREE.Vector3(pp.x, pp.y, pp.z).project(camera);
      pp.el.style.left = ((proj.x * 0.5 + 0.5) * window.innerWidth) + 'px';
      pp.el.style.top = ((-proj.y * 0.5 + 0.5) * window.innerHeight) + 'px';
      pp.el.style.opacity = String(Math.min(1, pp.life * 2));
    }
  }

  /* 15. CAMERA & LOOP */
  var PITCH = 47 * Math.PI / 180;
  var focus = new THREE.Vector3(0, groundAt(0, 0), 0);
  function cameraDistance() {
    var aspect = camera.aspect;
    return aspect >= 1 ? 34 : 34 + (1 - aspect) * 34;
  }
  function placeCamera(dt) {
    focus.x = lerp(focus.x, hero.x, Math.min(1, dt * 5));
    focus.z = lerp(focus.z, hero.z, Math.min(1, dt * 5));
    focus.y = lerp(focus.y, hero.y, Math.min(1, dt * 4));
    var distance = cameraDistance();
    camera.position.set(focus.x, focus.y + Math.sin(PITCH) * distance, focus.z + Math.cos(PITCH) * distance);
    camera.lookAt(focus.x, focus.y + 0.6, focus.z);
    scene.fog.near = distance * 1.05;
    scene.fog.far = distance * 2.45;
    sun.position.set(focus.x - 18, focus.y + 15, focus.z + 8);
    sun.target.position.copy(focus);
    moon.position.set(camera.position.x + 60, camera.position.y + 30, camera.position.z - 150);
    stars.position.set(camera.position.x, 0, camera.position.z);
  }

  function resize() {
    var width = window.innerWidth || 1, heightPx = window.innerHeight || 1;
    renderer.setSize(width, heightPx, false);
    camera.aspect = width / heightPx;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  var last = performance.now();
  function frame(now) {
    var dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    if (dt > 0) fps = lerp(fps, 1 / dt, 0.05);
    try {
      update(dt, now);
      placeCamera(dt);
      heartsEl.textContent = '♥'.repeat(Math.max(0, hearts)) + '♡'.repeat(Math.max(0, maxHearts - hearts));
      scoreEl.textContent = '✦ ' + score;
      var cTier = getThreatTier(wave);
      waveEl.textContent = t('waveShort') + ' ' + wave + ' · ' + (lang === 'vi' ? cTier.nameVi : cTier.nameEn);
      waveEl.style.color = cTier.col;
      if (music) music.setWave(wave);
      lvlEl.textContent = t('lvlShort') + ' ' + level;
      killsEl.textContent = '⚔ ' + kills;
      var curMult = Math.min(10, 1 + Math.floor(streak / 4));
      multBadge.style.display = curMult > 1 ? 'inline' : 'none';
      multBadge.textContent = '×' + curMult;
      xpBar.style.width = clamp((xp / xpNeed) * 100, 0, 100) + '%';
      timeEl.textContent = '⏱ ' + (R.duration > 0 ? formatDuration(Math.ceil(timeLeft)) : formatDuration(elapsed));
      dashBtn.textContent = dashCooldown > 0 ? Math.ceil(dashCooldown) + 's' : t('dashBtn');
      dashBtn.disabled = dashCooldown > 0;
      if (phase === 'playing' && !levelUpChoices && tutorialStage > 0) {
        tutEl.style.display = 'block';
        tutEl.textContent = tutorialStage === 1 ? t('tutStep1') : t('tutStep2');
      } else {
        tutEl.style.display = 'none';
      }
      if (phase !== 'playing' && card.style.display !== 'none' && heroBox.style.display !== 'none') {
        renderHeroPreview(now, false);
      }
      renderer.render(scene, camera);
    } catch (error) {
      reportError((error && error.message) || error);
      throw error;
    }
    requestAnimationFrame(frame);
  }
  setPhase('title');
  if (web3) {
    web3.onChange = function () {
      var serverNick = web3.state.nickname;
      if (serverNick && serverNick !== playerName && document.activeElement !== nickInput) {
        playerName = serverNick; nickInput.value = serverNick;
        try { window.localStorage.setItem('arc-voxel-quest:nick', playerName); } catch (e) { /* ignore */ }
      }
      refreshStaticTexts(); if (w3Overlay.style.display === 'flex') renderWeb3Modal(); if (cnOverlay.style.display === 'flex') renderConnectModal(); };
    if (web3.googleRedirectPending()) {
      // The player just came back from Google: finish the sign-in (Circle reads Google's answer from the page address).
      openConnectModal();
      cnStatus.textContent = '⏳ ' + t('googleFinishing') + '...';
      web3.resumeGoogleLogin(function (step) {
        cnStatus.textContent = '⏳ ' + t(step === 'pin' ? 'emailWaitPin' : step === 'wallet' ? 'emailWaitWallet' : 'googleFinishing') + '...';
      }).then(function (st) {
        if (st) { cnStatus.textContent = ''; afterLogin(); }
      }).catch(function (err) { cnStatus.textContent = '⚠️ ' + friendlyTxError(err); renderConnectModal(); });
    } else {
      web3.restoreSession().then(function (restored) { if (restored) refreshStaticTexts(); });
    }
    web3.refreshBoard(false).then(renderEmbeddedLeaderboard);
    function checkPrizes() {
      var st = web3.state;
      if (!st.account || !st.season || st.season.id === 0) { prizeAlert = false; return; }
      var ids = [];
      for (var sid = st.season.id - 1; sid >= 0 && ids.length < 3; sid--) ids.push(sid);
      Promise.all(ids.map(function (id) { return web3.getPrizeStatus(id).catch(function () { return null; }); })).then(function (list) {
        var me = st.account.toLowerCase();
        prizeAlert = list.some(function (ps) {
          if (!ps) return false;
          if (ps.board.length === 0) return ps.poolUsdc > 0n;
          return ps.board.slice(0, 3).some(function (e, rank) { return e.player.toLowerCase() === me && !(ps.claimedMask & (1 << rank)); });
        });
        refreshStaticTexts();
      });
    }
    setInterval(function () {
      if (phase === 'playing') return;
      web3.refreshChainState().then(function () { refreshStaticTexts(); checkPrizes(); }).catch(function () { /* next tick */ });
    }, 45000);
    web3.refreshChainState().then(function () { refreshStaticTexts(); checkPrizes(); }).catch(function () { /* optional */ });
    setInterval(function () { if (phase !== 'playing') web3.refreshBoard(false).then(renderEmbeddedLeaderboard); }, 20000);
  }
  requestAnimationFrame(frame);

  function heroOnScreen() {
    var v = new THREE.Vector3(hero.x, hero.y + R.heroSize * 0.5, hero.z).project(camera);
    return Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1;
  }

  /* 16. STUDIO CONTRACTS (__renderSlots, __gameState, __autoplay) */
  function animateRig(rig, moving, tSec, wobble, state) {
    if (!rig) return;
    if (rig.type === 'hero') {
      var stride = moving ? Math.sin(tSec * 14) * 0.62 : Math.sin(tSec * 2.2) * 0.08;
      var armSw = moving ? Math.sin(tSec * 14) * 0.5 : Math.sin(tSec * 2.2) * 0.07;
      rig.legL.rotation.x = stride;
      rig.legR.rotation.x = -stride;
      rig.armL.rotation.x = rig.hasMic ? (-0.75 + Math.sin(tSec * 2.4) * 0.08) : -armSw;
      rig.armR.rotation.x = moving ? armSw * 0.7 - 0.34 : -0.3 + Math.sin(tSec * 2.6) * 0.08;
      rig.cape.rotation.x = 0.24 + (moving ? 0.52 + Math.sin(tSec * 18) * 0.22 : 0.1 + Math.sin(tSec * 3.1) * 0.08);
      rig.head.rotation.y = moving ? Math.sin(tSec * 7) * 0.05 : Math.sin(tSec * 1.4) * 0.08;
      if (rig.weaponKind === 'cyclone_shuriken') rig.weapon.rotation.z = -tSec * 7.5;
      else if (rig.weaponKind === 'drill_lance') rig.weapon.rotation.z = tSec * 11;
    } else if (rig.type === 'stalker') {
      var flap = Math.sin(tSec * 16 + wobble) * 0.55;
      rig.wingL.rotation.z = flap;
      rig.wingR.rotation.z = -flap;
    } else if (rig.type === 'charger') {
      var stomps = Math.sin(tSec * (state === 'charge' ? 18 : 10) + wobble) * 0.55;
      rig.legL.rotation.x = stomps;
      rig.legR.rotation.x = -stomps;
    } else if (rig.type === 'caster') {
      rig.orbiters.rotation.y = tSec * 2.8 + wobble;
      rig.orbiters.position.y = 3.15 + Math.sin(tSec * 4 + wobble) * 0.28;
    } else if (rig.type === 'boss') {
      var bWalk = Math.sin(tSec * 7 + wobble) * 0.38;
      rig.legL.rotation.x = bWalk;
      rig.legR.rotation.x = -bWalk;
      rig.armL.rotation.x = -bWalk * 0.8 - 0.2;
      rig.armR.rotation.x = bWalk * 0.8 - 0.2;
      rig.orbiters.rotation.y = -tSec * 2.1;
    }
  }

  var renderer3 = null;
  function ensureRenderer3(w, h) {
    h = h || w;
    if (!renderer3) {
      var c = document.createElement('canvas');
      renderer3 = new THREE.WebGLRenderer({ canvas: c, antialias: true, alpha: true, preserveDrawingBuffer: true });
      renderer3.setClearColor(0x000000, 0);
      renderer3.toneMapping = renderer.toneMapping;
      renderer3.toneMappingExposure = renderer.toneMappingExposure;
    }
    renderer3.setPixelRatio(1);
    renderer3.setSize(w, h, false);
  }

  var previewStage = null, previewCam = null, previewModel = null, previewHeroId = '', lastPreviewMs = -999;
  function renderHeroPreview(nowMs, force) {
    if (!heroPreviewCtx || window.__inRenderSlots) return;
    if (!force && nowMs - lastPreviewMs < 42) return;
    lastPreviewMs = nowMs;
    var spec = activeHeroSpec();
    ensureRenderer3(140, 152);
    if (!previewStage) {
      previewStage = new THREE.Scene();
      previewStage.add(new THREE.HemisphereLight('#fff5ec', '#32294a', 1.65));
      var pk = new THREE.DirectionalLight('#fffaf5', 2.05);
      pk.position.set(-3, 6, 7);
      previewStage.add(pk);
      var rim = new THREE.DirectionalLight('#38f2ff', 0.72);
      rim.position.set(5, 4, -5);
      previewStage.add(rim);
      previewCam = new THREE.PerspectiveCamera(32, 140 / 152, 0.1, 100);
      previewCam.position.set(1.5, 5.9, 16.4);
      previewCam.lookAt(0, 4.45, 0);
    }
    if (!previewModel || previewHeroId !== spec.id) {
      if (previewModel) {
        previewStage.remove(previewModel);
        previewModel.traverse(function (n) { if (n.geometry) n.geometry.dispose(); if (n.material) n.material.dispose(); });
      }
      previewHeroId = spec.id;
      previewModel = buildArticulatedHero(spec);
      previewStage.add(previewModel);
    }
    var ts = nowMs * 0.001;
    previewModel.rotation.y = Math.sin(ts * 1.1) * 0.52 + 0.12;
    animateRig(previewModel.userData.rig, false, ts, 0, '');
    renderer3.render(previewStage, previewCam);
    heroPreviewCtx.clearRect(0, 0, 140, 152);
    heroPreviewCtx.drawImage(renderer3.domElement, 0, 0, 140, 152);
  }

  function renderSlots(size) {
    size = size || 256;
    ensureRenderer3(size, size);
    var out = {};
    Object.keys(MODELS).forEach(function (slot) {
      if (!SLOTS[slot] || customArt(slot)) return;
      var stage = new THREE.Scene();
      stage.add(new THREE.HemisphereLight('#fff5ec', '#32294a', 1.65));
      var key = new THREE.DirectionalLight('#fffaf5', 2.1);
      key.position.set(-3, 5, 5);
      stage.add(key);
      var model = buildModelForKey(slot, MODELS[slot], activeHeroSpec(), activeMapSpec(), false);
      stage.add(model);
      var box = new THREE.Box3().setFromObject(model), center = box.getCenter(new THREE.Vector3()), extent = box.getSize(new THREE.Vector3());
      var cam = new THREE.PerspectiveCamera(30, 1, 0.1, 500);
      var distance = Math.max(extent.x, extent.y, extent.z) / (2 * Math.tan(15 * Math.PI / 180)) * 1.25;
      cam.position.copy(center).add(new THREE.Vector3(0.55, 0.45, 1).normalize().multiplyScalar(distance));
      cam.lookAt(center);
      renderer3.render(stage, cam);
      out[slot] = renderer3.domElement.toDataURL('image/png');
      model.traverse(function (node) { if (node.geometry) node.geometry.dispose(); if (node.material) node.material.dispose(); });
    });
    return out;
  }
  window.__renderSlots = renderSlots;
  setTimeout(function () {
    if (!parentWindow) return;
    try { post({ type: 'renders', renders: renderSlots(256) }); } catch (error) { reportError('character renders failed: ' + ((error && error.message) || error)); }
  }, 400);

  window.__autoplay = function () {
    if (levelUpChoices && levelUpChoices[0]) { applyUpgrade(levelUpChoices[0]); return; }
    if (phase !== 'playing') return;
    var closeEnemy = nearestEnemy(4.2);
    if (closeEnemy && dashCooldown <= 0) triggerPulseDash();
    var dx = 0, dz = 0;
    // Stay well inside island bounds so autoplay doesn't walk off abyss
    var edgeR = Math.hypot(hero.x, hero.z);
    if (edgeR > HALF * 0.6) {
      dx -= hero.x / (edgeR || 1) * 2.5;
      dz -= hero.z / (edgeR || 1) * 2.5;
    } else {
      var bestP = null, bestPD = 999;
      for (var i = 0; i < pickups.length; i++) {
        if (groundAt(pickups[i].x, pickups[i].z) === 0) continue;
        var d = Math.hypot(pickups[i].x - hero.x, pickups[i].z - hero.z);
        if (d < bestPD) { bestPD = d; bestP = pickups[i]; }
      }
      if (bestP) {
        dx = (bestP.x - hero.x) / (bestPD || 1);
        dz = (bestP.z - hero.z) / (bestPD || 1);
      }
    }
    for (var j = 0; j < enemies.length; j++) {
      var ed = Math.hypot(hero.x - enemies[j].x, hero.z - enemies[j].z);
      if (ed > 0 && ed < 5.0) {
        dx += ((hero.x - enemies[j].x) / ed) * 2.4;
        dz += ((hero.z - enemies[j].z) / ed) * 2.4;
      }
    }
    keys.left = dx < -0.25;
    keys.right = dx > 0.25;
    keys.up = dz < -0.25;
    keys.down = dz > 0.25;
  };

  window.__gameState = function () {
    return {
      phase: phase, paused: paused, heroId: activeHeroSpec().id, wave: wave, level: level, kills: kills,
      score: score, best: best, gems: gems, combo: maxCombo, maxCombo: maxCombo, lang: lang,
      time: R.duration > 0 ? Math.round(timeLeft * 100) / 100 : Math.round(elapsed * 100) / 100,
      hearts: hearts, dashCooldown: Math.round(dashCooldown * 100) / 100,
      hero: { x: Math.round(hero.x * 100) / 100, y: Math.round(hero.z * 100) / 100 },
      pickups: pickups.map(function (p) { return { x: p.x, y: p.z }; }),
      enemies: enemies.map(function (e) { return { x: Math.round(e.x * 100) / 100, y: Math.round(e.z * 100) / 100 }; }),
      world: { size: N },
      fps: Math.round(fps),
      renderer: 'webgl',
      heroMode: heroMode,
      heroOnScreen: heroOnScreen(),
    };
  };
})();
