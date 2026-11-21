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
      rpcUrls: ['https://rpc.testnet.arc.network', 'https://testnet-rpc.arc.network'],
      blockExplorerUrls: ['https://testnet.arcscan.app/'],
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

  function encodeSubmitRun(score, gems, maxCombo) {
    return fnSelector('submitRun(uint256,uint256,uint256)')
      + encodeUint256(score)
      + encodeUint256(gems)
      + encodeUint256(maxCombo);
  }

  function encodeGetPlayerProfile(addr) {
    return fnSelector('getPlayerProfile(address)') + encodeAddress(addr);
  }

  function encodeGetLeaderboard() {
    return fnSelector('getLeaderboard()');
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
  var LS_CONTRACT = 'arc-voxel-quest:contract';
  var LS_NET = 'arc-voxel-quest:custom-network';
  var LS_DEMO = 'arc-voxel-quest:demo-vault';

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
      network: network,
      contractAddress: contractAddress,
      lastTxHash: '',
      busy: false,
    };

    function getProvider() {
      return typeof window !== 'undefined' ? window.ethereum : null;
    }

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

    async function switchOrAddNetwork(targetNet) {
      var provider = getProvider();
      if (!provider) throw new Error('NO_WALLET');
      var net = targetNet || state.network;
      var hexChain = net.chainId;
      try {
        await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: hexChain }] });
      } catch (err) {
        if (err && (err.code === 4902 || /unrecognized chain|4902/iu.test(String(err.message || '')))) {
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: hexChain,
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
      state.chainId = String(await provider.request({ method: 'eth_chainId' })).toLowerCase();
      return state.chainId;
    }

    async function connectWallet() {
      var provider = getProvider();
      if (!provider) throw new Error('NO_WALLET');
      var accounts = await provider.request({ method: 'eth_requestAccounts' });
      state.account = (accounts && accounts[0]) ? String(accounts[0]) : '';
      if (!state.account) throw new Error('NO_ACCOUNT');
      state.chainId = String(await provider.request({ method: 'eth_chainId' })).toLowerCase();
      if (state.chainId !== state.network.chainId.toLowerCase()) {
        await switchOrAddNetwork(state.network);
      }
      await refreshChainState();
      return state;
    }

    async function refreshChainState() {
      if (state.account) {
        var balHex = await rpcFetch('eth_getBalance', [state.account, 'latest']);
        state.nativeBalanceWei = BigInt(balHex || '0x0');
      }
      if (isValidAddress(state.contractAddress)) {
        if (state.account) {
          var profHex = await rpcFetch('eth_call', [{ to: state.contractAddress, data: encodeGetPlayerProfile(state.account) }, 'latest']);
          state.profile = decodePlayerProfile(profHex);
        }
        var lbHex = await rpcFetch('eth_call', [{ to: state.contractAddress, data: encodeGetLeaderboard() }, 'latest']);
        state.leaderboard = decodeLeaderboard(lbHex);
      }
      return state;
    }

    async function submitRunOnChain(run) {
      var provider = getProvider();
      if (!provider || !state.account) throw new Error('NO_WALLET');
      if (!isValidAddress(state.contractAddress)) throw new Error('NO_CONTRACT');
      if (state.chainId !== state.network.chainId.toLowerCase()) {
        await switchOrAddNetwork(state.network);
      }
      var data = encodeSubmitRun(run.score, run.gems, run.maxCombo);
      var txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{ from: state.account, to: state.contractAddress, data: data }],
      });
      state.lastTxHash = String(txHash);
      var deadline = Date.now() + 45000;
      var receipt = null;
      while (Date.now() < deadline) {
        receipt = await rpcFetch('eth_getTransactionReceipt', [txHash]).catch(function () { return null; });
        if (receipt && receipt.blockNumber) break;
        await new Promise(function (r) { setTimeout(r, 1500); });
      }
      if (receipt && receipt.status === '0x0') {
        throw new Error('Transaction reverted on-chain');
      }
      await refreshChainState().catch(function () {});
      var explorerBase = ((state.network.blockExplorerUrls && state.network.blockExplorerUrls[0]) || '').replace(/\/+$/u, '');
      return {
        txHash: state.lastTxHash,
        explorerUrl: explorerBase ? explorerBase + '/tx/' + state.lastTxHash : '',
        receipt: receipt,
      };
    }

    async function watchUsdcToken() {
      var provider = getProvider();
      if (!provider || !state.network.erc20Usdc) throw new Error('NO_WALLET');
      return provider.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: state.network.erc20Usdc,
            symbol: 'USDC',
            decimals: 6,
          },
        },
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
      vault.totalArcq += score;
      var newTier = vault.bestScore >= 500 ? 3 : (vault.bestScore >= 250 ? 2 : (vault.bestScore >= 100 ? 1 : 0));
      if (newTier > vault.badgeTier) vault.badgeTier = newTier;
      var pseudoHash = keccak256('demo:' + Date.now() + ':' + score + ':' + vault.totalRuns);
      vault.history.unshift({ score: score, gems: run.gems || 0, maxCombo: run.maxCombo || 1, hash: pseudoHash, at: new Date().toISOString() });
      vault.history = vault.history.slice(0, 8);
      saveStorageJson(LS_DEMO, vault);
      return { vault: vault, txHash: pseudoHash };
    }

    return {
      state: state,
      hasWallet: function () { return Boolean(getProvider()); },
      connectWallet: connectWallet,
      switchOrAddNetwork: switchOrAddNetwork,
      refreshChainState: refreshChainState,
      submitRunOnChain: submitRunOnChain,
      watchUsdcToken: watchUsdcToken,
      setContractAddress: setContractAddress,
      setCustomNetwork: setCustomNetwork,
      resetDefaultNetwork: resetDefaultNetwork,
      getDemoVault: getDemoVault,
      claimDemoRun: claimDemoRun,
    };
  }

  var api = {
    DEFAULT_NETWORKS: DEFAULT_NETWORKS,
    keccak256: keccak256,
    fnSelector: fnSelector,
    encodeUint256: encodeUint256,
    encodeAddress: encodeAddress,
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
