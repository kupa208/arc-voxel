/* Zero-dependency EVM / Arc L1 Web3 helper for Arc Voxel Quest.
 * Works as a classic browser script (attaching `window.ARC_WEB3`) and in Node tests. */
(function (root) {
  'use strict';

  var DEFAULT_NETWORKS = {
    'arc-testnet': {
      chainId: '0x4cef52',
      chainIdDec: 5042002,
      chainName: 'Arc Testnet',
      nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
      rpcUrls: ['https://rpc.testnet.arc.io', 'https://rpc.blockdaemon.testnet.arc.io', 'https://rpc.drpc.testnet.arc.io'],
      blockExplorerUrls: ['https://explorer.testnet.arc.io/'],
      faucetUrl: 'https://faucet.circle.com/',
      erc20Usdc: '0x3600000000000000000000000000000000000000',
    },
  };

  /* --- 1. Pure-JS Keccak-256 (BigInt 64-bit lanes) --- */
  var MASK64 = 0xffffffffffffffffn;
  var KECCAK_RC = [
    0x0000000000000001n, 0x0000000000008082n, 0x800000000000808an, 0x8000000080008000n,
    0x000000000000808bn, 0x0000000080000001n, 0x8000000080008081n, 0x8000000000008009n,
    0x000000000000008an, 0x0000000000000088n, 0x0000000080008009n, 0x000000008000000an,
    0x000000008000808bn, 0x800000000000008bn, 0x8000000000008089n, 0x8000000000008003n,
    0x8000000000008002n, 0x8000000000000080n, 0x000000000000800an, 0x800000008000000an,
    0x8000000080008081n, 0x8000000000008080n, 0x0000000080000001n, 0x8000000080008008n,
  ];
  var ROTC = [
    [0, 36, 3, 41, 18],
    [1, 44, 10, 45, 2],
    [62, 6, 43, 15, 61],
    [28, 55, 25, 21, 56],
    [27, 20, 39, 8, 14],
  ];

  function rotl64(x, n) {
    if (n === 0) return x;
    var s = BigInt(n);
    return ((x << s) | (x >> (64n - s))) & MASK64;
  }

  function keccakF1600(state) {
    for (var round = 0; round < 24; round++) {
      var c = [0n, 0n, 0n, 0n, 0n];
      for (var x = 0; x < 5; x++) {
        c[x] = state[x] ^ state[x + 5] ^ state[x + 10] ^ state[x + 15] ^ state[x + 20];
      }
      var d = [0n, 0n, 0n, 0n, 0n];
      for (x = 0; x < 5; x++) {
        d[x] = c[(x + 4) % 5] ^ rotl64(c[(x + 1) % 5], 1);
      }
      for (var y = 0; y < 5; y++) {
        for (x = 0; x < 5; x++) state[y * 5 + x] ^= d[x];
      }
      var b = new Array(25);
      for (y = 0; y < 5; y++) {
        for (x = 0; x < 5; x++) {
          var nx = y;
          var ny = (2 * x + 3 * y) % 5;
          b[ny * 5 + nx] = rotl64(state[y * 5 + x], ROTC[x][y]);
        }
      }
      for (y = 0; y < 5; y++) {
        for (x = 0; x < 5; x++) {
          state[y * 5 + x] = b[y * 5 + x] ^ ((~b[y * 5 + ((x + 1) % 5)] & MASK64) & b[y * 5 + ((x + 2) % 5)]);
        }
      }
      state[0] ^= KECCAK_RC[round];
    }
  }

  function utf8Bytes(str) {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(str);
    var out = [];
    for (var i = 0; i < str.length; i++) out.push(str.charCodeAt(i) & 0xff);
    return new Uint8Array(out);
  }

  function keccak256(input) {
    var bytes = typeof input === 'string' ? utf8Bytes(input) : new Uint8Array(input);
    var rate = 136; // 1088 bits
    var total = Math.floor(bytes.length / rate) * rate + rate;
    var padded = new Uint8Array(total);
    padded.set(bytes);
    padded[bytes.length] ^= 0x01; // Ethereum Keccak-256 domain byte
    padded[total - 1] ^= 0x80;

    var state = new Array(25).fill(0n);
    for (var off = 0; off < total; off += rate) {
      for (var lane = 0; lane < 17; lane++) {
        var idx = off + lane * 8;
        var v = 0n;
        for (var j = 0; j < 8; j++) v |= BigInt(padded[idx + j]) << BigInt(j * 8);
        state[lane] ^= v;
      }
      keccakF1600(state);
    }

    var hex = '0x';
    for (var outLane = 0; outLane < 4; outLane++) {
      var val = state[outLane];
      for (var k = 0; k < 8; k++) {
        var byte = Number((val >> BigInt(k * 8)) & 0xffn);
        hex += byte.toString(16).padStart(2, '0');
      }
    }
    return hex;
  }

  function fnSelector(signature) {
    return keccak256(signature).slice(0, 10);
  }

  /* --- 2. Minimal EVM ABI Encoder / Decoder --- */
  function padWord(hexWithoutPrefix) {
    return hexWithoutPrefix.toLowerCase().replace(/^0x/u, '').padStart(64, '0').slice(-64);
  }

  function encodeUint256(val) {
    var n = typeof val === 'bigint' ? val : BigInt(Math.max(0, Math.floor(Number(val) || 0)));
    return padWord(n.toString(16));
  }

  function encodeAddress(addr) {
    if (!/^0x[0-9a-fA-F]{40}$/u.test(String(addr || ''))) {
      throw new Error('Invalid EVM address');
    }
    return padWord(addr);
  }

  function encodeGetPlayerProfile(addr) {
    return fnSelector('getPlayerProfile(address)') + encodeAddress(addr);
  }

  function encodeGetLeaderboard() {
    return fnSelector('getLeaderboard()');
  }

  /* Generic call encoder: supports uint*, address, bytes32 and dynamic bytes. */
  function encodeCall(sig, args) {
    var types = sig.slice(sig.indexOf('(') + 1, sig.lastIndexOf(')')).split(',').filter(Boolean);
    var head = '';
    var tail = '';
    var headSize = types.length * 32;
    types.forEach(function (ty, i) {
      var a = args[i];
      if (ty === 'bytes') {
        var hex = String(a).replace(/^0x/u, '');
        head += encodeUint256(BigInt(headSize + tail.length / 2));
        tail += encodeUint256(BigInt(hex.length / 2)) + hex + '0'.repeat((64 - (hex.length % 64)) % 64);
      } else if (ty === 'address') {
        head += encodeAddress(a);
      } else if (ty === 'bytes32') {
        head += String(a).replace(/^0x/u, '').padStart(64, '0');
      } else {
        head += encodeUint256(typeof a === 'bigint' ? a : BigInt(a));
      }
    });
    return fnSelector(sig) + head + tail;
  }

  /* submitRun takes a static struct (9 words, inline) followed by the signature bytes. */
  function encodeSubmitRun(t) {
    var sel = fnSelector('submitRun((address,uint256,uint256,uint256,uint256,uint8,uint256,bytes32,uint256),bytes)');
    var head = encodeAddress(t.player)
      + encodeUint256(BigInt(t.score)) + encodeUint256(BigInt(t.gems)) + encodeUint256(BigInt(t.maxCombo))
      + encodeUint256(BigInt(t.wave)) + encodeUint256(BigInt(t.hero)) + encodeUint256(BigInt(t.roomId))
      + String(t.runId).replace(/^0x/u, '').padStart(64, '0') + encodeUint256(BigInt(t.deadline));
    var sig = String(t.signature).replace(/^0x/u, '');
    return sel + head + encodeUint256(BigInt(10 * 32)) + encodeUint256(BigInt(sig.length / 2)) + sig + '0'.repeat((64 - (sig.length % 64)) % 64);
  }

  function decodeQuestState(hex) {
    var body = String(hex || '').replace(/^0x/u, '');
    if (body.length < 64 * 4) return null;
    return { streak: Number(readWord(body, 0)), runsToday: Number(readWord(body, 1)), mask: Number(readWord(body, 2)), day: Number(readWord(body, 3)) };
  }

  function decodeRoom(hex) {
    var body = String(hex || '').replace(/^0x/u, '');
    if (body.length < 64 * 7) return null;
    return {
      creator: readAddressWord(body, 0), start: Number(readWord(body, 1)), end: Number(readWord(body, 2)),
      entryFee: readWord(body, 3), pool: readWord(body, 4), entrants: Number(readWord(body, 5)), ended: readWord(body, 6) === 1n,
    };
  }

  function decodeRoomBoard(hex) {
    var body = String(hex || '').replace(/^0x/u, '');
    if (body.length < 64 * 2) return [];
    var offP = Number(readWord(body, 0)) / 32;
    var offS = Number(readWord(body, 1)) / 32;
    var len = Number(readWord(body, offP));
    var out = [];
    for (var i = 0; i < len && i < 10; i++) out.push({ player: readAddressWord(body, offP + 1 + i), score: Number(readWord(body, offS + 1 + i)) });
    return out;
  }

  function decodeString(hex) {
    var body = String(hex || '').replace(/^0x/u, '');
    if (body.length < 128) return '';
    var len = Number(readWord(body, 1));
    var raw = body.slice(128, 128 + len * 2);
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) bytes[i] = parseInt(raw.slice(i * 2, i * 2 + 2), 16);
    return new TextDecoder().decode(bytes);
  }

  function decodeSeasonInfo(hex) {
    var body = String(hex || '').replace(/^0x/u, '');
    if (body.length < 64 * 4) return null;
    return {
      poolUsdc: readWord(body, 0), // USDC ERC-20 base units (6 decimals)
      entrants: Number(readWord(body, 1)),
      endsAt: Number(readWord(body, 2)),
      ended: readWord(body, 3) === 1n,
    };
  }

  function decodePlayerState(hex) {
    var body = String(hex || '').replace(/^0x/u, '');
    if (body.length < 64 * 5) return null;
    return {
      entered: readWord(body, 0) === 1n,
      seasonBest: Number(readWord(body, 1)),
      heroLevel: Number(readWord(body, 2)),
      nextUpgradeCostWei: readWord(body, 3),
      rewardedToday: Number(readWord(body, 4)),
    };
  }

  function readWord(hex, wordIndex) {
    var body = String(hex || '').replace(/^0x/u, '');
    var start = wordIndex * 64;
    if (body.length < start + 64) return 0n;
    return BigInt('0x' + body.slice(start, start + 64));
  }

  function readAddressWord(hex, wordIndex) {
    var body = String(hex || '').replace(/^0x/u, '');
    var start = wordIndex * 64;
    if (body.length < start + 64) return '0x0000000000000000000000000000000000000000';
    return '0x' + body.slice(start + 24, start + 64).toLowerCase();
  }

  function decodePlayerProfile(hex) {
    var body = String(hex || '').replace(/^0x/u, '');
    if (body.length < 64 * 8) return null;
    return {
      bestScore: Number(readWord(body, 0)),
      totalRuns: Number(readWord(body, 1)),
      totalGems: Number(readWord(body, 2)),
      maxCombo: Number(readWord(body, 3)),
      totalTokensEarnedWei: readWord(body, 4),
      badgeTier: Number(readWord(body, 5)),
      arcqBalanceWei: readWord(body, 6),
      lastPlayedAt: Number(readWord(body, 7)),
    };
  }

  function decodeLeaderboard(hex) {
    var body = String(hex || '').replace(/^0x/u, '');
    if (body.length < 64 * 3) return [];
    var offPlayers = Number(readWord(body, 0)) / 32;
    var offScores = Number(readWord(body, 1)) / 32;
    var offTiers = Number(readWord(body, 2)) / 32;
    var len = Number(readWord(body, offPlayers));
    var out = [];
    for (var i = 0; i < len && i < 20; i++) {
      out.push({
        player: readAddressWord(body, offPlayers + 1 + i),
        bestScore: Number(readWord(body, offScores + 1 + i)),
        badgeTier: Number(readWord(body, offTiers + 1 + i)),
      });
    }
    return out;
  }

  function formatUnits(rawWei, decimals, precision) {
    var dec = decimals === undefined ? 18 : decimals;
    var prec = precision === undefined ? 3 : precision;
    var val = typeof rawWei === 'bigint' ? rawWei : BigInt(rawWei || 0);
    var base = 10n ** BigInt(dec);
    var whole = val / base;
    if (prec <= 0) return whole.toString();
    var frac = ((val % base) * (10n ** BigInt(prec))) / base;
    var fracStr = frac.toString().padStart(prec, '0').replace(/0+$/u, '');
    return fracStr ? whole.toString() + '.' + fracStr : whole.toString();
  }

  function isValidAddress(addr) {
    return /^0x[0-9a-fA-F]{40}$/u.test(String(addr || '').trim());
  }

  function shortAddr(addr) {
    var s = String(addr || '');
    return s.length >= 10 ? s.slice(0, 6) + '...' + s.slice(-4) : s;
  }

  /* --- 3. Wallet + Multi-L1 RPC Client (Arc Testnet default) --- */
  var ENTRY_FEE_USDC = 1000000n; // 1 USDC, ERC-20 view (6 decimals); matches ArcVoxelGameFi.ENTRY_FEE
  var LS_CONTRACT = 'arc-voxel-quest:contract';
  var LS_NET = 'arc-voxel-quest:custom-network';
  var LS_DEMO = 'arc-voxel-quest:demo-vault';
  var LS_AUTH = 'arc-voxel-quest:auth';
  var LS_FRIENDS = 'arc-voxel-quest:friends';

  function loadStorageJson(key, fallback) {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return fallback;
      var raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function saveStorageJson(key, val) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, JSON.stringify(val));
      }
    } catch (e) { /* ignore sandboxed storage */ }
  }

  function cloneNetwork(n) {
    return JSON.parse(JSON.stringify(n));
  }

  function createClient(config) {
    var cfg = config || (typeof window !== 'undefined' && window.ARC_WEB3_CONFIG) || {};
    var nets = cfg.networks || DEFAULT_NETWORKS;
    var defaultNet = cloneNetwork(nets[cfg.defaultNetwork || 'arc-testnet'] || DEFAULT_NETWORKS['arc-testnet']);
    var savedNet = loadStorageJson(LS_NET, null);
    var network = savedNet && savedNet.chainId && savedNet.rpcUrls && savedNet.rpcUrls.length ? savedNet : defaultNet;
    var savedContract = '';
    try {
      savedContract = (typeof window !== 'undefined' && window.localStorage && window.localStorage.getItem(LS_CONTRACT)) || '';
    } catch (e) { savedContract = ''; }
    var contractAddress = isValidAddress(savedContract) ? savedContract : (isValidAddress(cfg.defaultContract) ? cfg.defaultContract : '');

    var state = {
      account: '',
      chainId: '',
      nativeBalanceWei: 0n,
      profile: null,
      leaderboard: [],
      board: [],
      topBoard: [], // the all-time board shown on the menu and the results card, whatever filter the Full Rankings tab uses
      boardStatus: 'loading', // 'loading' | 'ok' | 'error'
      boardInfo: null,
      nickname: '',
      provider: '',
      boardScope: 'all',
      friends: loadStorageJson(LS_FRIENDS, []),
      questState: null,
      skinState: null,
      art: null,
      season: null,
      playerState: null,
      usdcBalance: 0n,
      usdcAllowance: 0n,
      network: network,
      contractAddress: contractAddress,
      lastTxHash: '',
      session: '',
      kind: '',
      walletName: '',
      walletId: '',
      email: '',
      setup: null,
      runId: '',
      runToken: '',
      busy: false,
    };

    async function rpcFetch(method, params) {
      var urls = (state.network && state.network.rpcUrls) || [];
      var lastErr = null;
      for (var i = 0; i < urls.length; i++) {
        try {
          var res = await fetch(urls[i], {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method: method, params: params || [] }),
          });
          var json = await res.json();
          if (json.error) throw new Error(json.error.message || JSON.stringify(json.error));
          return json.result;
        } catch (err) {
          lastErr = err;
        }
      }
      throw lastErr || new Error('No RPC endpoint configured');
    }

    function call(to, data) {
      return rpcFetch('eth_call', [{ to: to, data: data }, 'latest']);
    }

    /* Battle pass and weekly quests for the connected wallet. */
    async function loadPass(c) {
      try {
        var id = Number(readWord(await call(c, fnSelector('currentPass()')), 0));
        var h = await call(c, encodeCall('getPass(address,uint256)', [state.account, id]));
        state.pass = { id: id, xp: Number(readWord(h, 0)), premium: readWord(h, 1) !== 0n, freeClaimed: Number(readWord(h, 2)), premiumClaimed: Number(readWord(h, 3)), endsAt: Number(readWord(h, 4)) };
        var w = await call(c, encodeCall('getWeekly(address)', [state.account]));
        state.weekly = { runs: Number(readWord(w, 0)), points: Number(readWord(w, 1)), mask: Number(readWord(w, 2)), endsAt: Number(readWord(w, 3)) };
      } catch (e) { /* pass data is optional */ }
    }

    async function refreshChainState() {
      var c = state.contractAddress;
      var hasC = isValidAddress(c);
      var usdc = state.network.erc20Usdc;
      var jobs = [];
      if (state.account) {
        // Native balance is the same USDC pool as the ERC-20 view; it is only kept for gas checks.
        jobs.push(rpcFetch('eth_getBalance', [state.account, 'latest']).then(function (h) { state.nativeBalanceWei = BigInt(h || '0x0'); }));
        jobs.push(fetch('/api/nickname?address=' + encodeURIComponent(state.account)).then(function (r) { return r.json(); }).then(function (j) { state.nickname = (j && j.nickname) || ''; }).catch(function () { /* keep the last nickname */ }));
        if (usdc) {
          jobs.push(call(usdc, encodeCall('balanceOf(address)', [state.account])).then(function (h) { state.usdcBalance = readWord(h, 0); }));
          if (hasC) {
            jobs.push(call(usdc, encodeCall('allowance(address,address)', [state.account, c])).then(function (h) { state.usdcAllowance = readWord(h, 0); }));
          }
        }
      }
      if (hasC) {
        if (state.account) {
          jobs.push(call(c, encodeGetPlayerProfile(state.account)).then(function (h) { state.profile = decodePlayerProfile(h); }));
          jobs.push(call(c, encodeCall('getPlayerState(address)', [state.account])).then(function (h) { state.playerState = decodePlayerState(h); }));
          jobs.push(call(c, encodeCall('getQuestState(address)', [state.account])).then(function (h) { state.questState = decodeQuestState(h); }));
          jobs.push(call(c, encodeCall('getSkins(address)', [state.account])).then(function (h) {
            state.skinState = { owned: Number(readWord(h, 0)), equipped: Number(readWord(h, 1)), fx: Number(readWord(h, 2)) };
          }));
          jobs.push(call(c, encodeCall('getHeroMask(address)', [state.account])).then(function (h) { state.heroMask = Number(readWord(h, 0)); }));
          jobs.push(loadPass(c));
        }
        jobs.push(call(c, encodeGetLeaderboard()).then(function (h) { state.leaderboard = decodeLeaderboard(h); }));
        jobs.push(call(c, fnSelector('currentSeason()')).then(async function (h) {
          var id = Number(readWord(h, 0));
          var info = decodeSeasonInfo(await call(c, encodeCall('getSeasonInfo(uint256)', [id])));
          state.season = info ? Object.assign({ id: id }, info) : null;
        }));
      }
      await Promise.all(jobs);
      return state;
    }

    /* All-time board: best verified run per player, indexed by the server from onchain events (each entry has its tx hash). */
    async function fetchBoard(query, force) {
      var res = await fetch('/api/leaderboard' + query + (force ? '&refresh=1' : ''));
      if (!res.ok) throw new Error('board ' + res.status);
      return res.json();
    }
    /* Friends are kept in this browser: addresses, added by wallet address or by nickname. */
    function friendsList() {
      var mine = (state.account || '').toLowerCase();
      var list = (state.friends || []).slice();
      if (mine && list.indexOf(mine) === -1) list.push(mine); // you are always on your own friends board
      return list;
    }
    async function addFriend(input) {
      var v = String(input || '').trim();
      if (!v) throw new Error('Type a wallet address or a nickname.');
      var addr = v;
      if (!/^0x[0-9a-fA-F]{40}$/.test(v)) {
        var res = await fetch('/api/nickname/resolve?name=' + encodeURIComponent(v));
        if (!res.ok) throw new Error('No player found with that nickname.');
        addr = (await res.json()).address;
      }
      addr = addr.toLowerCase();
      if (state.friends.indexOf(addr) === -1) state.friends = state.friends.concat([addr]).slice(0, 29);
      saveStorageJson(LS_FRIENDS, state.friends);
      notify();
      return addr;
    }
    function removeFriend(addr) {
      state.friends = state.friends.filter(function (a) { return a !== String(addr).toLowerCase(); });
      saveStorageJson(LS_FRIENDS, state.friends);
      notify();
    }

    /* Boards for Endless and Boss Rush (kept by the server, not onchain). */
    async function fetchModeBoard(mode) {
      var res = await fetch('/api/mode/board?mode=' + encodeURIComponent(mode));
      if (!res.ok) throw new Error('mode board ' + res.status);
      return res.json();
    }
    async function submitMode(mode, run, extra) {
      if (!state.session || !state.runId) throw new Error('Sign in and start a run to be on this board.');
      return apiPost('/api/mode/finish', Object.assign({ mode: mode }, runPayload(run), extra || {}));
    }

    async function refreshBoard(force, scope, isRetry) {
      if (scope) state.boardScope = scope;
      if (!state.topBoard.length) state.boardStatus = 'loading';
      try {
        var q = '?scope=all';
        if ((state.boardScope === 'season' || state.boardScope === 'week') && state.season) q = '?scope=' + state.boardScope + '&season=' + state.season.id;
        else if (state.boardScope === 'friends') q = '?scope=friends&players=' + encodeURIComponent(friendsList().join(','));
        var json = await fetchBoard(q, force);
        state.board = json.entries || [];
        state.boardInfo = json.indexing || null;
        if (q === '?scope=all') state.topBoard = state.board;
        else state.topBoard = (await fetchBoard('?scope=all', false)).entries || [];
        state.boardStatus = 'ok';
      } catch (e) {
        // keep the previous board; try once more shortly before showing an error
        if (!isRetry) setTimeout(function () { refreshBoard(force, scope, true); }, 3000);
        else if (!state.topBoard.length) state.boardStatus = 'error';
      }
      notify();
    }

    /* Recent runs of one wallet, each with its transaction hash. */
    async function loadHistory(address) {
      try {
        var res = await fetch('/api/player?address=' + encodeURIComponent(address || state.account));
        return await res.json();
      } catch (e) {
        return { best: null, history: [] };
      }
    }

    /* Badge and skin NFT artwork are generated onchain: read them back from tokenURI. */
    async function loadArt() {
      if (!state.account || !isValidAddress(state.contractAddress)) return null;
      var c = state.contractAddress;
      var out = { badge: '', skins: {} };
      function parseUri(uri) {
        try { return JSON.parse(atob(uri.split(',')[1])).image || ''; } catch (e) { return ''; }
      }
      try {
        var badgeAddr = '0x' + (await call(c, fnSelector('badgeNft()'))).slice(26);
        var tid = readWord(await call(badgeAddr, encodeCall('tokenOf(address)', [state.account])), 0);
        if (tid > 0n) out.badge = parseUri(decodeString(await call(badgeAddr, encodeCall('tokenURI(uint256)', [tid]))));
        var skinsAddr = '0x' + (await call(c, fnSelector('skins()'))).slice(26);
        var owned = state.skinState ? state.skinState.owned : 0;
        for (var id = 1; id <= 12; id++) {
          if (!(owned & (1 << (id - 1)))) continue;
          var skinTid = readWord(await call(skinsAddr, encodeCall('tokenOf(address,uint8)', [state.account, id])), 0);
          if (skinTid > 0n) out.skins[id] = parseUri(decodeString(await call(skinsAddr, encodeCall('tokenURI(uint256)', [skinTid]))));
        }
      } catch (e) { /* art is optional */ }
      state.art = out;
      return out;
    }

    /* Newest rooms first, with my entry status. */
    async function loadRooms(limit) {
      var c = needContract();
      var count = Number(readWord(await call(c, fnSelector('roomCount()')), 0));
      var ids = [];
      for (var id = count; id >= 1 && ids.length < (limit || 8); id--) ids.push(id);
      var rooms = await Promise.all(ids.map(async function (rid) {
        var room = decodeRoom(await call(c, encodeCall('getRoom(uint256)', [rid])));
        if (!room) return null;
        room.id = rid;
        room.entered = state.account ? readWord(await call(c, encodeCall('roomEntered(uint256,address)', [rid, state.account])), 0) === 1n : false;
        room.claimedMask = Number(readWord(await call(c, encodeCall('roomClaimedMask(uint256)', [rid])), 0));
        room.board = decodeRoomBoard(await call(c, encodeCall('getRoomLeaderboard(uint256)', [rid])));
        return room;
      }));
      return rooms.filter(Boolean);
    }

    async function getSeasonBoard(seasonId) {
      if (!isValidAddress(state.contractAddress)) return [];
      return decodeLeaderboard(await call(state.contractAddress, encodeCall('getSeasonLeaderboard(uint256)', [seasonId])));
    }

    /* Ended-season prize status: top board, bitmask of claimed ranks, pool in USDC base units. */
    async function getPrizeStatus(seasonId) {
      var c = needContract();
      var results = await Promise.all([
        getSeasonBoard(seasonId),
        call(c, encodeCall('claimedMask(uint256)', [seasonId])),
        call(c, encodeCall('getSeasonInfo(uint256)', [seasonId])),
      ]);
      var info = decodeSeasonInfo(results[2]) || { poolUsdc: 0n };
      return { id: seasonId, board: results[0], claimedMask: Number(readWord(results[1], 0)), poolUsdc: info.poolUsdc };
    }

    var injected = null; // EIP-1193 provider of the connected browser wallet

    function sleep(ms) {
      return new Promise(function (r) { setTimeout(r, ms); });
    }

    function needContract() {
      if (!isValidAddress(state.contractAddress)) throw new Error('NO_CONTRACT');
      return state.contractAddress;
    }

    function notify() {
      if (client.onChange) client.onChange();
    }

    function clearSession() {
      state.session = '';
      state.kind = '';
      state.walletName = '';
      injected = null;
      passkey = null;
      emailCtx = null;
      emailLoginWaiter = null;
      saveEmailTokens(null);
      state.account = '';
      state.walletId = '';
      state.email = '';
      state.provider = '';
      state.profile = null;
      state.playerState = null;
      state.runId = '';
      state.runToken = '';
      state.usdcBalance = 0n;
      state.usdcAllowance = 0n;
      saveStorageJson(LS_AUTH, null);
      saveStorageJson(LS_PASSKEY, null);
      notify();
    }

    /* Nickname shown on the leaderboard (kept on the game server, tied to this wallet's sign-in). Empty clears it. */
    async function setNickname(name) {
      if (!state.session) throw new Error('Please connect your wallet');
      var r = await apiPost('/api/profile/nickname', { session: state.session, nickname: String(name || '') });
      state.nickname = r.nickname || '';
      notify();
      return state.nickname;
    }

    async function apiPost(path, body) {
      var res = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      var json = await res.json().catch(function () { return {}; });
      // An expired email sign-in (155104) only asks for a new code; the game session itself is still fine.
      if (res.status === 401 && body && body.session && json.code !== 155104) clearSession();
      if (!res.ok) {
        var err = new Error(json.error || ('Server error ' + res.status));
        err.status = res.status;
        if (json.code) err.code = json.code;
        throw err;
      }
      return json;
    }

    async function loadConfig() {
      if (state.setup) return state.setup;
      var res = await fetch('/api/config');
      state.setup = await res.json().catch(function () { return { configured: false, missing: ['Game server is not reachable'] }; });
      return state.setup;
    }

    /* Silent restore on page load: never opens a wallet popup. */
    async function restoreSession() {
      await loadConfig().catch(function () {});
      var saved = loadStorageJson(LS_AUTH, null);
      if (!saved || !saved.session || saved.exp < Date.now()) return false;
      state.session = saved.session;
      try {
        if (saved.kind === 'evm') {
          var w;
          if (saved.walletId === 'walletconnect') {
            var setup0 = await loadConfig();
            if (!setup0.walletConnectProjectId) return false;
            var wcp = await initWalletConnect(setup0.walletConnectProjectId);
            if (!wcp.session) return false;
            w = { id: 'walletconnect', name: 'WalletConnect', provider: wcp };
          } else {
            var wallets = await discoverWallets();
            w = wallets.filter(function (x) { return x.id === saved.walletId; })[0];
          }
          if (!w) return false;
          var accts = await w.provider.request({ method: 'eth_accounts' });
          var stEvm = await apiPost('/api/wallet/status', { session: state.session });
          if (!accts || !accts[0] || !stEvm.hasWallet || String(stEvm.address).toLowerCase() !== String(accts[0]).toLowerCase()) {
            clearSession();
            return false;
          }
          injected = w.provider;
          bindInjectedEvents(w.provider);
          state.kind = 'evm';
          state.walletName = w.name;
          state.account = String(stEvm.address).toLowerCase();
          await refreshChainState().catch(function () {});
          return true;
        }
        if (saved.kind === 'passkey') {
          var cred = loadStorageJson(LS_PASSKEY, null);
          if (!cred || !state.setup || !state.setup.passkey || !state.setup.passkey.enabled) return false;
          var stP = await apiPost('/api/wallet/status', { session: state.session });
          var acc = await buildPasskeyAccount(cred); // no prompt: the credential is only used when a signature is needed
          if (!stP.hasWallet || String(stP.address).toLowerCase() !== String(acc.address).toLowerCase()) { clearSession(); return false; }
          state.kind = 'passkey';
          state.walletName = 'Passkey wallet';
          state.account = String(stP.address).toLowerCase();
          await refreshChainState().catch(function () {});
          return true;
        }
        if (saved.kind === 'email') {
          var okEmail = state.setup && state.setup.email && state.setup.email.enabled;
          var okGoogle = state.setup && state.setup.google && state.setup.google.enabled;
          if (!okEmail && !okGoogle) return false;
          var stM = await apiPost('/api/wallet/status', { session: state.session });
          var tokens = loadEmailTokens(); // kept for this browser tab only; without them the player can look around but must sign in again to approve
          emailCtx = { userToken: tokens ? tokens.userToken : '', encryptionKey: tokens ? tokens.encryptionKey : '', email: saved.email || '' };
          state.kind = 'email';
          state.provider = saved.provider || '';
          state.walletName = saved.provider === 'google' ? 'Google wallet' : 'Email wallet';
          state.email = saved.email || '';
          state.account = String(stM.address).toLowerCase();
          await refreshChainState().catch(function () {});
          return true;
        }
        return false;
      } catch (e) {
        return false;
      }
    }

    /* ---- browser wallets (MetaMask, Rabby, Coinbase...): EIP-6963 discovery with window.ethereum fallback ---- */
    function toHexUtf8(str) {
      var bytes = utf8Bytes(str);
      var out = '0x';
      for (var i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, '0');
      return out;
    }

    function discoverWallets() {
      return new Promise(function (resolve) {
        var found = [];
        var seen = {};
        function add(info, provider) {
          var id = info.rdns || info.uuid || info.name;
          if (seen[id]) return;
          seen[id] = true;
          found.push({ id: id, name: info.name || 'Browser wallet', icon: info.icon || '', provider: provider });
        }
        function onAnnounce(ev) {
          if (ev && ev.detail && ev.detail.provider) add(ev.detail.info || {}, ev.detail.provider);
        }
        if (typeof window !== 'undefined' && window.addEventListener) {
          window.addEventListener('eip6963:announceProvider', onAnnounce);
          window.dispatchEvent(new Event('eip6963:requestProvider'));
        }
        setTimeout(function () {
          if (typeof window !== 'undefined' && window.removeEventListener) window.removeEventListener('eip6963:announceProvider', onAnnounce);
          if (!found.length && root.ethereum) add({ name: 'Browser wallet', rdns: 'window.ethereum' }, root.ethereum);
          resolve(found);
        }, 250);
      });
    }

    /* Popular wallets shown in the connect dialog: installed ones connect directly, the others link to their download page. */
    var WALLET_CATALOG = [
      { id: 'io.metamask', name: 'MetaMask', color: '#f6851b', url: 'https://metamask.io/download/' },
      { id: 'com.okex.wallet', name: 'OKX Wallet', color: '#1a1a1a', url: 'https://www.okx.com/web3' },
      { id: 'io.rabby', name: 'Rabby', color: '#7084ff', url: 'https://rabby.io/' },
      { id: 'com.coinbase.wallet', name: 'Coinbase Wallet', color: '#0052ff', url: 'https://www.coinbase.com/wallet/downloads' },
      { id: 'com.trustwallet.app', name: 'Trust Wallet', color: '#3375bb', url: 'https://trustwallet.com/download' },
      { id: 'com.bitget.web3', name: 'Bitget Wallet', color: '#00b8c4', url: 'https://web3.bitget.com/en/wallet-download' },
      { id: 'app.phantom', name: 'Phantom', color: '#ab9ff2', url: 'https://phantom.com/download' },
      { id: 'me.rainbow', name: 'Rainbow', color: '#e0457b', url: 'https://rainbow.me/en/download' },
      { id: 'io.zerion.wallet', name: 'Zerion', color: '#2962ef', url: 'https://zerion.io/download' },
      { id: 'com.brave.wallet', name: 'Brave Wallet', color: '#fb542b', url: 'https://brave.com/wallet/' },
    ];

    async function listWalletOptions() {
      var found = await discoverWallets();
      var used = {};
      var options = WALLET_CATALOG.map(function (c) {
        var hit = found.filter(function (f) { return f.id === c.id; })[0];
        if (hit) used[hit.id] = true;
        return { id: c.id, name: c.name, color: c.color, url: c.url, installed: Boolean(hit), icon: hit ? hit.icon : '', provider: hit ? hit.provider : null };
      });
      found.forEach(function (f) {
        if (used[f.id]) return;
        options.push({ id: f.id, name: f.name, color: '#3b82f6', url: '', installed: true, icon: f.icon, provider: f.provider });
      });
      options.sort(function (a, b) { return (b.installed ? 1 : 0) - (a.installed ? 1 : 0); });
      return options;
    }

    /* ---- WalletConnect: scan a QR code with a phone wallet. The ~2 MB bundle is only loaded when it is used. ---- */
    function reportClientError(message) {
      try { fetch('/api/client-error', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: String(message) }) }).catch(function () {}); } catch (e) { /* reporting must never break the flow */ }
    }

    function loadScriptOnce(src) {
      return new Promise(function (resolve, reject) {
        var el = document.createElement('script');
        el.src = src;
        el.async = true;
        el.onload = function () { resolve(); };
        el.onerror = function () { reject(new Error('Could not load ' + src.split('/').pop())); };
        document.head.appendChild(el);
      });
    }

    async function initWalletConnect(projectId) {
      if (!root.ARC_WC) {
        await loadScriptOnce('/vendor/walletconnect.js?v=' + ((state.setup && state.setup.assetVersion) || Date.now()));
        for (var w = 0; w < 40 && !root.ARC_WC && !root.ARC_WC_ERROR; w++) await sleep(100);
        if (!root.ARC_WC) { reportClientError('walletconnect load: ' + (root.ARC_WC_ERROR || 'did not register')); throw new Error('Could not load WalletConnect'); }
      }
      var net = state.network;
      var rpcMap = {};
      rpcMap[net.chainIdDec] = net.rpcUrls[0];
      return root.ARC_WC.EthereumProvider.init({
        projectId: projectId,
        optionalChains: [net.chainIdDec],
        rpcMap: rpcMap,
        showQrModal: true,
        metadata: { name: 'Arc Voxel Quest', description: 'Arc Voxel Quest GameFi on Arc Testnet', url: root.location.origin, icons: [] },
      });
    }

    async function connectWalletConnectWallet() {
      var setup = await loadConfig();
      if (!setup.walletConnectProjectId) throw new Error('WC_NOT_CONFIGURED');
      var provider = await initWalletConnect(setup.walletConnectProjectId);
      if (!provider.session) await provider.connect();
      return connectBrowserWallet({ id: 'walletconnect', name: 'WalletConnect', provider: provider });
    }

    async function ensureArcChain(provider) {
      var net = state.network;
      var current = String(await provider.request({ method: 'eth_chainId' })).toLowerCase();
      if (current === net.chainId.toLowerCase()) return;
      try {
        await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: net.chainId }] });
      } catch (err) {
        if (err && (err.code === 4902 || /unrecognized chain|4902/iu.test(String(err.message || '')))) {
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: net.chainId,
              chainName: net.chainName,
              nativeCurrency: net.nativeCurrency,
              rpcUrls: net.rpcUrls,
              blockExplorerUrls: net.blockExplorerUrls,
            }],
          });
        } else {
          throw err;
        }
      }
    }

    function bindInjectedEvents(provider) {
      if (!provider.on) return;
      provider.on('accountsChanged', function (accts) {
        var next = accts && accts[0] ? String(accts[0]).toLowerCase() : '';
        if (state.kind === 'evm' && next !== state.account) clearSession();
      });
    }

    /* Connect an existing wallet: add/switch to Arc Testnet, then sign a free message to prove ownership. */
    async function connectBrowserWallet(w) {
      var provider = w.provider;
      var accounts = await provider.request({ method: 'eth_requestAccounts' });
      var addr = accounts && accounts[0] ? String(accounts[0]) : '';
      if (!addr) throw new Error('NO_ACCOUNT');
      await ensureArcChain(provider);
      var res = await fetch('/api/auth/nonce?player=' + encodeURIComponent(addr));
      var ch = await res.json().catch(function () { return {}; });
      if (!res.ok || !ch.message) throw new Error(ch.error || 'Sign-in server unavailable');
      var signature = await provider.request({ method: 'personal_sign', params: [toHexUtf8(ch.message), addr] });
      var r = await apiPost('/api/auth/wallet', { player: addr, signature: signature });
      injected = provider;
      bindInjectedEvents(provider);
      state.session = r.session;
      state.kind = 'evm';
      state.walletName = w.name;
      state.email = '';
      state.account = String(r.address).toLowerCase();
      saveStorageJson(LS_AUTH, { session: r.session, kind: 'evm', walletId: w.id, exp: Date.now() + 23 * 3600 * 1000 });
      await refreshChainState().catch(function () {});
      notify();
      return state;
    }

    async function waitReceipt(txHash) {
      var end = Date.now() + 60000;
      while (Date.now() < end) {
        var receipt = await rpcFetch('eth_getTransactionReceipt', [txHash]).catch(function () { return null; });
        if (receipt && receipt.blockNumber) {
          if (receipt.status === '0x0') throw new Error('Transaction reverted on-chain');
          return receipt;
        }
        await sleep(1000);
      }
      throw new Error('Transaction not confirmed yet. Check the explorer, then refresh.');
    }

    /* The contract call behind every game action: { to, data, points }. */
    async function buildAction(action, params) {
      var contract = needContract();
      var to = contract;
      var data;
      var points = 0;
      if (action === 'approve') {
        to = state.network.erc20Usdc;
        data = encodeCall('approve(address,uint256)', [contract, params.amount ? BigInt(params.amount) : ENTRY_FEE_USDC]);
      } else if (action === 'enter') {
        data = fnSelector('enterSeason()');
      } else if (action === 'upgrade') {
        data = fnSelector('upgradeHero()');
      } else if (action === 'claim') {
        data = encodeCall('claimPrize(uint256,uint256)', [params.season, params.rank]);
      } else if (action === 'buy-skin') {
        data = encodeCall('buySkin(uint8)', [params.id]);
      } else if (action === 'equip') {
        data = encodeCall('equipSkin(uint8)', [params.id]);
      } else if (action === 'equip-fx') {
        data = encodeCall('equipFx(uint8)', [params.id]);
      } else if (action === 'unlock-hero') {
        data = encodeCall('unlockHero(uint8)', [params.hero]);
      } else if (action === 'buy-pass') {
        data = fnSelector('buyPass()');
      } else if (action === 'claim-pass') {
        data = encodeCall('claimPassReward(uint256,uint8,bool)', [params.passSeason, params.level, params.premium]);
      } else if (action === 'rollover') {
        data = encodeCall('rolloverEmptySeason(uint256)', [params.season]);
      } else if (action === 'submit-run') {
        var t = await apiPost('/api/run/finish', params);
        points = Number(t.score);
        data = encodeSubmitRun(t);
      } else {
        throw new Error('Unknown action');
      }
      return { to: to, data: data, points: points };
    }

    function explorerLink(txHash) {
      var explorerBase = ((state.network.blockExplorerUrls && state.network.blockExplorerUrls[0]) || '').replace(/\/+$/u, '');
      return explorerBase && txHash ? explorerBase + '/tx/' + txHash : '';
    }

    /* Browser wallet (MetaMask, Rabby...): the wallet signs and sends the transaction. */
    async function sendEvm(action, params, done) {
      var provider = injected;
      if (!provider) throw new Error('NEED_LOGIN');
      var built = await buildAction(action, params);
      await ensureArcChain(provider);
      var txHash = await provider.request({ method: 'eth_sendTransaction', params: [{ from: state.account, to: built.to, data: built.data }] });
      state.lastTxHash = String(txHash);
      await waitReceipt(txHash);
      await waitFor(done);
      return { txHash: state.lastTxHash, explorerUrl: explorerLink(state.lastTxHash), points: built.points };
    }

    /* ---- passkey wallets (Circle Modular Wallets): a smart account owned by a device passkey (fingerprint, face or Windows Hello).
       Every transaction is a sponsored user operation, so the player never pays gas. ---- */
    var LS_PASSKEY = 'arc-voxel-quest:passkey';
    var passkey = null; // { account, bundler, credential }

    function passkeyConfig() {
      var p = state.setup && state.setup.passkey;
      if (!p || !p.enabled) throw new Error('PASSKEY_NOT_CONFIGURED');
      return p;
    }

    async function loadPasskeyLib() {
      if (!root.ARC_PASSKEY) {
        var loadErrors = [];
        var onErr = function (ev) { loadErrors.push((ev && ev.message) || 'script error'); };
        window.addEventListener('error', onErr);
        try { await loadScriptOnce('/vendor/passkey.js?v=' + ((state.setup && state.setup.assetVersion) || Date.now())); } finally { window.removeEventListener('error', onErr); }
        for (var w = 0; w < 60 && !root.ARC_PASSKEY && !root.ARC_PASSKEY_ERROR; w++) await sleep(100); // the SDK initialises asynchronously
        if (!root.ARC_PASSKEY) {
          var why = root.ARC_PASSKEY_ERROR || loadErrors[0] || 'the script did not register itself';
          reportClientError('passkey sdk load: ' + why);
          throw new Error('Could not load the passkey wallet (' + why + ')');
        }
      }
      return root.ARC_PASSKEY;
    }

    function arcChainDef() {
      var n = state.network;
      return {
        id: n.chainIdDec, name: n.chainName, nativeCurrency: n.nativeCurrency,
        rpcUrls: { default: { http: n.rpcUrls } }, blockExplorers: { default: { name: 'Arc Explorer', url: (n.blockExplorerUrls || [''])[0] } },
      };
    }

    async function buildPasskeyAccount(credential) {
      var cfg = passkeyConfig();
      var lib = await loadPasskeyLib();
      var modular = lib.toModularTransport(cfg.clientUrl + '/arcTestnet', cfg.clientKey);
      var chain = arcChainDef();
      var client = lib.createPublicClient({ chain: chain, transport: modular });
      var account = await lib.toCircleSmartAccount({ client: client, owner: lib.toWebAuthnAccount({ credential: credential }) });
      var bundler = lib.createBundlerClient({ chain: chain, transport: modular });
      passkey = { account: account, bundler: bundler, credential: credential };
      return account;
    }

    /* Opens the account from a passkey credential and proves ownership to the game server with one signature. */
    async function finishPasskeyLogin(credential) {
      var account = await buildPasskeyAccount(credential);
      var addr = String(account.address).toLowerCase();
      var ch = await fetch('/api/auth/nonce?player=' + encodeURIComponent(addr)).then(function (r) { return r.json(); });
      if (!ch.message) throw new Error(ch.error || 'Sign-in server unavailable');
      var signature = await account.signMessage({ message: ch.message });
      var r = await apiPost('/api/auth/wallet', { player: addr, signature: signature });
      state.kind = 'passkey';
      state.session = r.session;
      state.account = addr;
      state.walletName = 'Passkey wallet';
      saveStorageJson(LS_AUTH, { session: r.session, kind: 'passkey', exp: Date.now() + 23 * 3600 * 1000 });
      saveStorageJson(LS_PASSKEY, credential);
      await refreshChainState().catch(function () {});
      notify();
      return state;
    }

    async function registerPasskey(username) {
      var cfg = passkeyConfig();
      var lib = await loadPasskeyLib();
      var name = String(username || '').trim().slice(0, 32) || 'player';
      var credential = await lib.toWebAuthnCredential({ transport: lib.toPasskeyTransport(cfg.clientUrl, cfg.clientKey), mode: lib.WebAuthnMode.Register, username: name });
      return finishPasskeyLogin(credential);
    }

    async function loginPasskey() {
      var cfg = passkeyConfig();
      var lib = await loadPasskeyLib();
      var credential = await lib.toWebAuthnCredential({ transport: lib.toPasskeyTransport(cfg.clientUrl, cfg.clientKey), mode: lib.WebAuthnMode.Login });
      return finishPasskeyLogin(credential);
    }

    /* Sponsored user operation: one passkey prompt, no gas. `calls` may batch several contract calls. */
    async function sendPasskey(action, params, done) {
      if (!passkey) throw new Error('NEED_LOGIN');
      var built = await buildAction(action, params);
      var calls = [{ to: built.to, data: built.data }];
      if (action === 'enter' && state.usdcAllowance < ENTRY_FEE_USDC) { // approve and enter in a single confirmation
        calls.unshift({ to: state.network.erc20Usdc, data: encodeCall('approve(address,uint256)', [needContract(), ENTRY_FEE_USDC]) });
      }
      if (client.onConfirm) {
        var okToGo = await client.onConfirm({ action: action, params: params || {}, points: built.points });
        if (!okToGo) { var cancelled = new Error('Cancelled'); cancelled.code = 4001; throw cancelled; }
      }
      var hash = await passkey.bundler.sendUserOperation({ account: passkey.account, calls: calls, paymaster: true });
      var res = await passkey.bundler.waitForUserOperationReceipt({ hash: hash });
      if (res && res.success === false) throw new Error('The transaction reverted');
      state.lastTxHash = String((res && res.receipt && res.receipt.transactionHash) || '');
      await waitFor(done);
      return { txHash: state.lastTxHash, explorerUrl: explorerLink(state.lastTxHash), points: built.points };
    }

    /* ---- email wallets (Circle user-controlled wallets): a one-time code sent to the player's email, then a PIN.
       The wallet is a smart account whose gas Circle sponsors. Every transaction is approved with the PIN in Circle's hosted window. ---- */
    var SS_EMAIL = 'arc-voxel-quest:email-auth';
    var emailCtx = null; // { sdk, deviceId, email, otpReady, userToken, encryptionKey }
    var emailLoginWaiter = null; // resolved by the SDK's login callback after the code is verified

    function loadEmailTokens() {
      try {
        var raw = window.sessionStorage.getItem(SS_EMAIL);
        var j = raw ? JSON.parse(raw) : null;
        return j && j.exp > Date.now() && j.userToken ? j : null;
      } catch (e) { return null; }
    }

    function saveEmailTokens(v) {
      try {
        if (typeof window === 'undefined' || !window.sessionStorage) return;
        if (v) window.sessionStorage.setItem(SS_EMAIL, JSON.stringify(v));
        else window.sessionStorage.removeItem(SS_EMAIL);
      } catch (e) { /* ignore */ }
    }

    function emailConfig() {
      var e = state.setup && state.setup.email;
      if (e && e.enabled && e.appId) return e;
      var g = state.setup && state.setup.google;
      if (g && g.enabled && g.appId) return g; // Google sign-in uses the same Circle app
      throw new Error('EMAIL_NOT_CONFIGURED');
    }

    /* Keeps Circle error codes on the error so the game can show a clear message. A closed PIN window is a plain cancel. */
    function wrapEmailError(err) {
      var code = Number(err && (err.circleCode || err.code)) || 0;
      if (code === 155701) { var cancelled = new Error('Cancelled'); cancelled.code = 4001; return cancelled; }
      var out = err instanceof Error ? err : new Error(String((err && err.message) || err || 'Email sign-in failed'));
      out.emailCode = code;
      return out;
    }

    async function getEmailSdk(loginConfigs, skipDeviceId) {
      var cfg = emailConfig();
      if (emailCtx && emailCtx.sdk) return emailCtx.sdk;
      if (!root.ARC_CIRCLE) {
        var loadErrors = [];
        var onErr = function (ev) { loadErrors.push((ev && ev.message) || 'script error'); };
        window.addEventListener('error', onErr);
        try { await loadScriptOnce('/vendor/circle-sdk.js?v=' + ((state.setup && state.setup.assetVersion) || Date.now())); } finally { window.removeEventListener('error', onErr); }
        for (var w = 0; w < 60 && !root.ARC_CIRCLE && !root.ARC_CIRCLE_ERROR; w++) await sleep(100);
        if (!root.ARC_CIRCLE) {
          var why = root.ARC_CIRCLE_ERROR || loadErrors[0] || 'the script did not register itself';
          reportClientError('circle sdk load: ' + why);
          throw new Error('Could not load email sign-in (' + why + ')');
        }
      }
      var sdk = new root.ARC_CIRCLE.W3SSdk(loginConfigs ? { appSettings: { appId: cfg.appId }, loginConfigs: loginConfigs } : { appSettings: { appId: cfg.appId } }, function (error, result) {
        var waiter = emailLoginWaiter;
        emailLoginWaiter = null;
        if (!waiter) return;
        if (error) waiter.reject(error); else waiter.resolve(result);
      });
      // Right after Google sends the player back, the SDK is already checking the page address by itself. Asking for the
      // device id at the same time would switch off its message listener, so resumeGoogleLogin asks for it afterwards.
      var deviceId = skipDeviceId ? '' : await sdk.getDeviceId(); // opens the session with Circle's hosted frame; execute() fails silently without it
      emailCtx = Object.assign(emailCtx || {}, { sdk: sdk, deviceId: deviceId });
      return sdk;
    }

    /* Step 1: Circle emails a one-time code to the player. */
    async function requestEmailCode(email) {
      try {
        var cfg = emailConfig();
        var sdk = await getEmailSdk();
        var r = await apiPost('/api/email/request-otp', { email: String(email || '').trim(), deviceId: emailCtx.deviceId });
        sdk.updateConfigs({
          appSettings: { appId: cfg.appId },
          loginConfigs: { deviceToken: r.deviceToken, deviceEncryptionKey: r.deviceEncryptionKey, otpToken: r.otpToken },
        });
        emailCtx.email = String(email).trim().toLowerCase();
        emailCtx.otpReady = true;
        emailCtx.userToken = '';
        return true;
      } catch (err) { throw wrapEmailError(err); }
    }

    function executeChallenge(challengeId) {
      return new Promise(function (resolve, reject) {
        emailCtx.sdk.execute(challengeId, function (error, result) {
          if (error) { var e = new Error(String(error.message || 'Circle could not complete this step')); e.circleCode = error.code; reject(wrapEmailError(e)); } else resolve(result);
        });
      });
    }

    /* Step 2: the player enters the code in Circle's window. First sign-in also sets a PIN and creates the wallet.
       `onStep` is called with 'code', 'pin' and 'wallet' so the game can say what is happening. */
    /* After Circle confirmed who the player is (code or Google): create or open the wallet, set a PIN the first time, and open a game session. */
    async function finishLogin(login, step, meta) {
      var sdk = emailCtx.sdk;
      emailCtx.userToken = login.userToken;
      emailCtx.encryptionKey = login.encryptionKey;
      emailCtx.otpReady = false;
      step('wallet');
      var init = await apiPost('/api/email/initialize', { userToken: login.userToken });
      if (init.challengeId) {
        step('pin');
        sdk.setAuthentication({ userToken: login.userToken, encryptionKey: login.encryptionKey });
        await executeChallenge(init.challengeId);
        step('wallet');
      }
      var s = null; // Circle creates the wallet a few seconds after the PIN is set
      for (var i = 0; i < 24; i++) {
        s = await apiPost('/api/email/session', { userToken: login.userToken });
        if (s.session) break;
        await sleep(1500);
      }
      if (!s || !s.session) throw new Error('EMAIL_WALLET_PENDING');
      var provider = (meta && meta.provider) || '';
      state.kind = 'email';
      state.provider = provider;
      state.session = s.session;
      state.account = String(s.address).toLowerCase();
      state.walletName = provider === 'google' ? 'Google wallet' : 'Email wallet';
      state.email = (meta && meta.email) || '';
      saveStorageJson(LS_AUTH, { session: s.session, kind: 'email', provider: provider, email: state.email, exp: Date.now() + 23 * 3600 * 1000 });
      saveEmailTokens({ userToken: login.userToken, encryptionKey: login.encryptionKey, exp: Date.now() + 55 * 60 * 1000 });
      await refreshChainState().catch(function () {});
      notify();
      return state;
    }

    async function verifyEmailCode(onStep) {
      var step = onStep || function () {};
      try {
        if (!emailCtx || !emailCtx.sdk || !emailCtx.otpReady) throw new Error('EMAIL_NO_CODE');
        var sdk = emailCtx.sdk;
        step('code');
        var login = await new Promise(function (resolve, reject) {
          emailLoginWaiter = { resolve: resolve, reject: reject };
          sdk.verifyOtp();
        });
        return await finishLogin(login, step, { email: emailCtx.email || '', provider: '' });
      } catch (err) { throw wrapEmailError(err); }
    }

    /* ---- Sign in with Google (Circle social login): the player picks their Google account, no code is emailed.
       The page leaves for Google and comes back, so the device token is kept in this tab's sessionStorage in between. ---- */
    var SS_SOCIAL = 'arc-voxel-quest:google-login';

    function googleCfg() {
      var g = state.setup && state.setup.google;
      return g && g.enabled && g.clientId && g.appId ? g : null;
    }

    function googleLoginConfigs(saved) {
      var g = googleCfg();
      return {
        deviceToken: saved.deviceToken,
        deviceEncryptionKey: saved.deviceEncryptionKey,
        google: { clientId: g.clientId, redirectUri: root.location.origin, selectAccountPrompt: true },
      };
    }

    function loadSocialPending() {
      try {
        var j = JSON.parse(root.sessionStorage.getItem(SS_SOCIAL) || 'null');
        return j && j.exp > Date.now() && j.deviceToken && j.deviceEncryptionKey ? j : null;
      } catch (e) { return null; }
    }

    /* Step 1: send the player to Google. The page reloads when they come back (see resumeGoogleLogin). */
    async function startGoogleLogin() {
      try {
        var g = googleCfg();
        if (!g) throw new Error('GOOGLE_NOT_CONFIGURED');
        var sdk = await getEmailSdk();
        var r = await apiPost('/api/email/social-token', { deviceId: emailCtx.deviceId });
        var saved = { deviceToken: r.deviceToken, deviceEncryptionKey: r.deviceEncryptionKey, exp: Date.now() + 15 * 60 * 1000 };
        root.sessionStorage.setItem(SS_SOCIAL, JSON.stringify(saved));
        sdk.updateConfigs({ appSettings: { appId: g.appId }, loginConfigs: googleLoginConfigs(saved) });
        await sdk.performLogin('Google');
        return true;
      } catch (err) { throw wrapEmailError(err); }
    }

    /* True when the page was just opened by Google's redirect and a Google sign-in is waiting to be finished. */
    function googleRedirectPending() {
      var h = String((root.location && root.location.hash) || '');
      return /(^#|&)(id_token|access_token|error)=/u.test(h) && Boolean(loadSocialPending());
    }

    /* Step 2 (after the redirect): Circle reads Google's answer from the page address, then the wallet is created or opened. */
    async function resumeGoogleLogin(onStep) {
      var step = onStep || function () {};
      await loadConfig().catch(function () {});
      var saved = loadSocialPending();
      if (!saved || !googleCfg()) return null;
      try {
        step('google');
        var waiting = new Promise(function (resolve, reject) {
          emailLoginWaiter = { resolve: resolve, reject: reject };
          setTimeout(function () { reject(new Error('Google sign-in did not finish. Try again.')); }, 60000);
        });
        emailCtx = null;
        await getEmailSdk(googleLoginConfigs(saved), true);
        var login = await waiting;
        emailCtx.deviceId = await emailCtx.sdk.getDeviceId(); // the PIN window needs this session
        root.sessionStorage.removeItem(SS_SOCIAL);
        try { root.history.replaceState(null, '', root.location.pathname + root.location.search); } catch (e) { /* keep the hash */ }
        return await finishLogin(login, step, { email: '', provider: 'google' });
      } catch (err) {
        // Only names are reported (never token values) so a failed sign-in can be diagnosed from the server log.
        try {
          var keys = String(root.location.hash || '').replace(/^#/u, '').split('&').map(function (kv) { return kv.split('=')[0]; }).filter(Boolean).join(',');
          reportClientError('google sign-in failed: ' + String((err && err.message) || err).slice(0, 120) + ' | code=' + ((err && err.code) || '') + ' | hash=' + keys
            + ' | provider=' + root.localStorage.getItem('socialLoginProvider') + ' | state=' + Boolean(root.localStorage.getItem('state')));
        } catch (e) { /* diagnostics only */ }
        root.sessionStorage.removeItem(SS_SOCIAL);
        try { root.history.replaceState(null, '', root.location.pathname + root.location.search); } catch (e) { /* ignore */ }
        throw wrapEmailError(err);
      }
    }

    /* Follows the newest transaction of this wallet until it has a hash. Returns '' when Circle is slow: the caller then checks the chain. */
    async function waitEmailTx(beforeId) {
      var end = Date.now() + 60000;
      while (Date.now() < end) {
        var r = await apiPost('/api/email/last-tx', { session: state.session, userToken: emailCtx.userToken }).catch(function () { return null; });
        if (r && r.id && r.id !== beforeId) {
          if (r.state === 'FAILED' || r.state === 'DENIED' || r.state === 'CANCELLED') throw new Error('The transaction did not go through (' + r.state.toLowerCase() + ').');
          if (r.txHash) return r.txHash;
        }
        await sleep(1500);
      }
      return '';
    }

    /* Email wallet: the PIN window approves a contract call that Circle sends and sponsors. */
    async function sendEmail(action, params, done) {
      if (!emailCtx || !emailCtx.userToken || !emailCtx.encryptionKey) throw wrapEmailError(Object.assign(new Error('EMAIL_SIGNIN_AGAIN'), { circleCode: 155104 }));
      try {
        var built = await buildAction(action, params);
        if (client.onConfirm) {
          var okToGo = await client.onConfirm({ action: action, params: params || {}, points: built.points });
          if (!okToGo) { var cancelled = new Error('Cancelled'); cancelled.code = 4001; throw cancelled; }
        }
        var sdk = await getEmailSdk();
        var cred = { session: state.session, userToken: emailCtx.userToken };
        var before = await apiPost('/api/email/last-tx', cred).catch(function () { return { id: '' }; });
        var ch = await apiPost('/api/email/challenge', Object.assign({ to: built.to, data: built.data }, cred));
        sdk.setAuthentication({ userToken: emailCtx.userToken, encryptionKey: emailCtx.encryptionKey });
        await executeChallenge(ch.challengeId);
        var hash = await waitEmailTx(before.id);
        if (hash) state.lastTxHash = hash;
        await waitFor(done);
        return { txHash: state.lastTxHash, explorerUrl: explorerLink(state.lastTxHash), points: built.points };
      } catch (err) {
        if (err && (err.code === 155104 || err.code === 155105 || err.emailCode === 155104 || err.emailCode === 155105)) {
          emailCtx.userToken = '';
          saveEmailTokens(null);
          throw wrapEmailError(Object.assign(new Error('EMAIL_SIGNIN_AGAIN'), { circleCode: 155104 }));
        }
        throw wrapEmailError(err);
      }
    }

    async function logout() {
      var token = state.session;
      clearSession();
      if (token) await apiPost('/api/auth/logout', { session: token }).catch(function () {});
    }

    async function waitFor(pred) {
      var end = Date.now() + 90000;
      while (Date.now() < end) {
        await refreshChainState().catch(function () {});
        if (await pred()) return true;
        await sleep(1500);
      }
      throw new Error('Still waiting for confirmation. Check the explorer, then press refresh.');
    }

    /* Every game action is a transaction the player's own wallet signs and sends. */
    async function sendAction(action, params, done) {
      if (!state.session || !state.account) throw new Error('NEED_LOGIN');
      if (state.kind === 'passkey') return sendPasskey(action, params, done);
      if (state.kind === 'email') return sendEmail(action, params, done);
      return sendEvm(action, params, done);
    }

    async function startRun(opts) {
      if (!state.session || !state.account) return null;
      opts = opts || {};
      var r = await apiPost('/api/run/start', { session: state.session, roomId: opts.roomId || 0, hero: opts.hero || 0, ranked: opts.ranked !== false });
      state.runId = r.runId;
      state.runToken = r.runToken || '';
      return r.runId;
    }

    function runPayload(run) {
      return {
        session: state.session, runId: state.runId, runToken: state.runToken, score: run.score, gems: run.gems, maxCombo: run.maxCombo,
        wave: run.wave, elapsed: run.elapsed, telemetry: run.telemetry || [],
      };
    }

    /* Save a run with the player's own wallet (the player pays gas). */
    async function submitRunOnChain(run) {
      needContract();
      if (!state.runId) throw new Error('No active run. Press Play to start a run first.');
      var before = state.profile ? state.profile.totalRuns : 0;
      var res = await sendAction('submit-run', Object.assign({ session: state.session }, runPayload(run)), function () { return state.profile && state.profile.totalRuns > before; });
      state.runId = '';
      state.runToken = '';
      return res;
    }

    /* Save a run for free: the server relays the signed ticket and pays the gas. */
    async function submitRunGasless(run) {
      needContract();
      if (!state.runId) throw new Error('No active run. Press Play to start a run first.');
      var before = state.profile ? state.profile.totalRuns : 0;
      var out = await apiPost('/api/run/relay', runPayload(run));
      state.runId = '';
      state.runToken = '';
      await waitFor(function () { return state.profile && state.profile.totalRuns > before; });
      var explorerBase = ((state.network.blockExplorerUrls && state.network.blockExplorerUrls[0]) || '').replace(/\/+$/u, '');
      state.lastTxHash = out.txHash;
      return { txHash: out.txHash, explorerUrl: explorerBase ? explorerBase + '/tx/' + out.txHash : '', points: Math.min(50000, Math.floor((run.score || 0) / 20)) };
    }

    async function enterSeason() {
      needContract();
      if (state.usdcBalance < ENTRY_FEE_USDC) throw new Error('NEED_USDC');
      if (state.usdcAllowance < ENTRY_FEE_USDC && state.kind !== 'passkey') {
        await sendAction('approve', {}, function () { return state.usdcAllowance >= ENTRY_FEE_USDC; });
      }
      return sendAction('enter', {}, function () { return state.playerState && state.playerState.entered; });
    }

    async function upgradeHero() {
      needContract();
      var before = state.playerState ? state.playerState.heroLevel : 0;
      return sendAction('upgrade', {}, function () { return state.playerState && state.playerState.heroLevel > before; });
    }

    async function claimPrize(seasonId, rank) {
      needContract();
      return sendAction('claim', { season: seasonId, rank: rank }, async function () {
        var ps = await getPrizeStatus(seasonId);
        return (ps.claimedMask & (1 << rank)) !== 0;
      });
    }

    async function buySkin(id) {
      needContract();
      return sendAction('buy-skin', { id: id }, function () { return state.skinState && (state.skinState.owned & (1 << (id - 1))) !== 0; });
    }

    async function equipSkin(id) {
      needContract();
      return sendAction('equip', { id: id }, function () { return state.skinState && state.skinState.equipped === id; });
    }

    async function equipFx(id) {
      needContract();
      return sendAction('equip-fx', { id: id }, function () { return state.skinState && state.skinState.fx === id; });
    }

    async function unlockHero(hero) {
      needContract();
      return sendAction('unlock-hero', { hero: hero }, function () { return state.heroMask && (state.heroMask & (1 << (hero - 8))) !== 0; });
    }

    var PASS_PRICE_USDC = 3000000n; // matches ArcVoxelGameFi.PASS_PRICE
    async function buyPass() {
      needContract();
      if (state.usdcBalance < PASS_PRICE_USDC) throw new Error('NEED_USDC');
      if (state.usdcAllowance < PASS_PRICE_USDC && state.kind !== 'passkey') {
        await sendAction('approve', { amount: PASS_PRICE_USDC }, function () { return state.usdcAllowance >= PASS_PRICE_USDC; });
      }
      return sendAction('buy-pass', {}, function () { return state.pass && state.pass.premium; });
    }

    async function claimPassReward(passSeason, level, premium) {
      needContract();
      var bit = 1 << (level - 1);
      return sendAction('claim-pass', { passSeason: passSeason, level: level, premium: premium }, function () {
        var p = state.pass; if (!p) return false;
        return ((premium ? p.premiumClaimed : p.freeClaimed) & bit) !== 0;
      });
    }

    /* The contract's own season rules (fee, length, places paid, days an empty pool rolls forward). */
    async function loadSeasonRules() {
      var h = await call(needContract(), fnSelector('seasonRules()'));
      return { fee: readWord(h, 0), length: Number(readWord(h, 1)), winnersPaid: Number(readWord(h, 2)), rollDays: Number(readWord(h, 3)) };
    }

    async function createRoom(feeUsdc, seconds) {
      needContract();
      var fee = BigInt(feeUsdc);
      var before = Number(readWord(await call(state.contractAddress, fnSelector('roomCount()')), 0));
      await sendAction('create-room', { fee: fee, seconds: seconds }, async function () {
        return Number(readWord(await call(state.contractAddress, fnSelector('roomCount()')), 0)) > before;
      });
      return before + 1;
    }

    async function joinRoom(id, feeUsdc) {
      needContract();
      var fee = BigInt(feeUsdc);
      if (state.usdcBalance < fee) throw new Error('NEED_USDC');
      var allowance = readWord(await call(state.network.erc20Usdc, encodeCall('allowance(address,address)', [state.account, state.contractAddress])), 0);
      if (allowance < fee) await sendAction('approve', { amount: fee }, function () { return state.usdcAllowance >= fee; });
      return sendAction('join-room', { id: id }, async function () {
        return readWord(await call(state.contractAddress, encodeCall('roomEntered(uint256,address)', [id, state.account])), 0) === 1n;
      });
    }

    async function claimRoomPrize(id, rank) {
      needContract();
      return sendAction('claim-room', { id: id, rank: rank }, async function () {
        return (Number(readWord(await call(state.contractAddress, encodeCall('roomClaimedMask(uint256)', [id])), 0)) & (1 << rank)) !== 0;
      });
    }

    async function claimRoomRefund(id) {
      needContract();
      var before = state.usdcBalance;
      return sendAction('refund-room', { id: id }, function () { return state.usdcBalance > before; });
    }

    async function rolloverEmptySeason(seasonId) {
      needContract();
      return sendAction('rollover', { season: seasonId }, async function () {
        var ps = await getPrizeStatus(seasonId);
        return ps.poolUsdc === 0n;
      });
    }

    function setContractAddress(addr) {
      var clean = String(addr || '').trim();
      if (clean && !isValidAddress(clean)) throw new Error('INVALID_ADDRESS');
      state.contractAddress = clean;
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          if (clean) window.localStorage.setItem(LS_CONTRACT, clean);
          else window.localStorage.removeItem(LS_CONTRACT);
        }
      } catch (e) { /* ignore */ }
      return clean;
    }

    function setCustomNetwork(opts) {
      var dec = Number(opts.chainIdDec);
      if (!Number.isInteger(dec) || dec <= 0) throw new Error('INVALID_CHAIN_ID');
      var rpc = String(opts.rpcUrl || '').trim();
      if (!/^https?:\/\//iu.test(rpc)) throw new Error('INVALID_RPC');
      var symbol = String(opts.symbol || 'USDC').trim().slice(0, 12) || 'USDC';
      var explorer = String(opts.explorerUrl || '').trim();
      state.network = {
        chainId: '0x' + dec.toString(16),
        chainIdDec: dec,
        chainName: String(opts.chainName || ('Chain ' + dec)).trim().slice(0, 48),
        nativeCurrency: { name: symbol, symbol: symbol, decimals: 18 },
        rpcUrls: [rpc],
        blockExplorerUrls: explorer ? [explorer] : [],
        faucetUrl: opts.faucetUrl || '',
        erc20Usdc: opts.erc20Usdc || '',
      };
      saveStorageJson(LS_NET, state.network);
      return state.network;
    }

    function resetDefaultNetwork() {
      state.network = cloneNetwork(defaultNet);
      try {
        if (typeof window !== 'undefined' && window.localStorage) window.localStorage.removeItem(LS_NET);
      } catch (e) { /* ignore */ }
      return state.network;
    }

    function getDemoVault() {
      return loadStorageJson(LS_DEMO, {
        bestScore: 0,
        totalRuns: 0,
        totalArcq: 0,
        badgeTier: 0,
        history: [],
      });
    }

    function claimDemoRun(run) {
      var vault = getDemoVault();
      var score = Math.max(0, Math.floor(Number(run.score) || 0));
      vault.totalRuns += 1;
      if (score > vault.bestScore) vault.bestScore = score;
      vault.totalArcq += score * 0.05; // same earning rate as the contract (0.05 ARCQ per point)
      var TIER_POINTS = [300, 700, 1500, 3000, 6000, 12000, 25000, 40000];
      var newTier = 0;
      for (var ti = 0; ti < TIER_POINTS.length; ti++) if (vault.bestScore >= TIER_POINTS[ti]) newTier = ti + 1;
      if (newTier > vault.badgeTier) vault.badgeTier = newTier;
      var pseudoHash = keccak256('demo:' + Date.now() + ':' + score + ':' + vault.totalRuns);
      vault.history.unshift({ score: score, gems: run.gems || 0, maxCombo: run.maxCombo || 1, hash: pseudoHash, at: new Date().toISOString() });
      vault.history = vault.history.slice(0, 8);
      saveStorageJson(LS_DEMO, vault);
      return { vault: vault, txHash: pseudoHash };
    }

    var client = {
      state: state,
      onChange: null,
      hasWallet: function () { return Boolean(root.ethereum); },
      loadConfig: loadConfig,
      discoverWallets: discoverWallets,
      registerPasskey: registerPasskey,
      loginPasskey: loginPasskey,
      passkeyEnabled: function () { return Boolean(state.setup && state.setup.passkey && state.setup.passkey.enabled); },
      googleEnabled: function () { return Boolean(googleCfg()); },
      startGoogleLogin: startGoogleLogin,
      googleRedirectPending: googleRedirectPending,
      resumeGoogleLogin: resumeGoogleLogin,
      emailEnabled: function () { return Boolean(state.setup && state.setup.email && state.setup.email.enabled); },
      emailNeedsSignin: function () { return state.kind === 'email' && !(emailCtx && emailCtx.userToken && emailCtx.encryptionKey); },
      requestEmailCode: requestEmailCode,
      verifyEmailCode: verifyEmailCode,
      onConfirm: null,
      listWalletOptions: listWalletOptions,
      connectWalletConnectWallet: connectWalletConnectWallet,
      connectBrowserWallet: connectBrowserWallet,
      restoreSession: restoreSession,
      logout: logout,
      refreshChainState: refreshChainState,
      refreshBoard: refreshBoard,
      addFriend: addFriend,
      removeFriend: removeFriend,
      fetchModeBoard: fetchModeBoard,
      submitMode: submitMode,
      setNickname: setNickname,
      submitRunOnChain: submitRunOnChain,
      submitRunGasless: submitRunGasless,
      loadHistory: loadHistory,
      loadArt: loadArt,
      loadRooms: loadRooms,
      buySkin: buySkin,
      equipFx: equipFx,
      unlockHero: unlockHero,
      buyPass: buyPass,
      claimPassReward: claimPassReward,
      loadSeasonRules: loadSeasonRules,
      equipSkin: equipSkin,
      createRoom: createRoom,
      joinRoom: joinRoom,
      claimRoomPrize: claimRoomPrize,
      claimRoomRefund: claimRoomRefund,
      startRun: startRun,
      enterSeason: enterSeason,
      upgradeHero: upgradeHero,
      claimPrize: claimPrize,
      getPrizeStatus: getPrizeStatus,
      rolloverEmptySeason: rolloverEmptySeason,
      getSeasonBoard: getSeasonBoard,
      setContractAddress: setContractAddress,
      setCustomNetwork: setCustomNetwork,
      resetDefaultNetwork: resetDefaultNetwork,
      getDemoVault: getDemoVault,
      claimDemoRun: claimDemoRun,
    };
    return client;
  }

  var api = {
    DEFAULT_NETWORKS: DEFAULT_NETWORKS,
    keccak256: keccak256,
    fnSelector: fnSelector,
    encodeUint256: encodeUint256,
    encodeAddress: encodeAddress,
    encodeCall: encodeCall,
    encodeSubmitRun: encodeSubmitRun,
    encodeGetPlayerProfile: encodeGetPlayerProfile,
    encodeGetLeaderboard: encodeGetLeaderboard,
    decodePlayerProfile: decodePlayerProfile,
    decodeLeaderboard: decodeLeaderboard,
    formatUnits: formatUnits,
    isValidAddress: isValidAddress,
    shortAddr: shortAddr,
    createClient: createClient,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.ARC_WEB3 = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
