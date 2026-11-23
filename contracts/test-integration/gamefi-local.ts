/**
 * End-to-end local test: anvil + server.mjs + ArcVoxelGameFi v4.
 * Run: bun contracts/test-integration/gamefi-local.ts
 */
import { readFileSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { createPublicClient, createWalletClient, encodeAbiParameters, http, keccak256, toHex, type Hex } from 'viem'
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts'
import { foundry } from 'viem/chains'

const root = '/home/user/app'
const art = (f: string, n: string) => JSON.parse(readFileSync(`${root}/contracts/out/${f}/${n}.json`, 'utf8'))
const envLocal = readFileSync(`${root}/.env.local`, 'utf8')
const signerPk = envLocal.match(/GAME_SIGNER_PRIVATE_KEY=(0x[0-9a-fA-F]{64})/)![1] as Hex
const signerAddr = privateKeyToAccount(signerPk).address

const RPC = 'http://127.0.0.1:8546'
const API = 'http://127.0.0.1:5199'
const procs: any[] = []
let pass = 0, fail = 0
const ok = (name: string, cond: boolean, extra = '') => { cond ? pass++ : fail++; console.log(`${cond ? 'PASS' : 'FAIL'} ${name} ${extra}`) }
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const sel = (name: string) => keccak256(toHex(`${name}()`)).slice(0, 10)
const reverts = async (p: Promise<any>, name: string) => {
  try { await p; return false } catch (e: any) {
    let text = ''
    try { text = JSON.stringify(e, (_k, v) => (typeof v === 'bigint' ? v.toString() : v)) } catch { /* circular */ }
    text += String(e.shortMessage || '') + String(e.details || '') + String(e.message || '')
    return text.includes(name) || text.includes(sel(name))
  }
}
const toWire = (t: any) => [{ player: t.player, score: BigInt(t.score), gems: BigInt(t.gems), maxCombo: BigInt(t.maxCombo), wave: BigInt(t.wave), hero: t.hero, roomId: BigInt(t.roomId), runId: t.runId, deadline: BigInt(t.deadline) }, t.signature]
/** Telemetry a real client would send: a checkpoint every 5 seconds. */
const telemetry = (score: number, elapsed: number) => {
  const cps: any[] = []
  for (let t = 5; t <= elapsed; t += 5) { const s = Math.floor((score * t) / elapsed), k = Math.ceil(s / 200); cps.push({ t, s, k, g: Math.floor(k / 4), w: 1 + Math.floor(t / 20) }) }
  return cps
}

async function main() {
  procs.push(spawn('anvil', ['--port', '8546', '--chain-id', '31337', '--silent'], { stdio: 'ignore' }))
  await sleep(1500)
  const pub = createPublicClient({ chain: foundry, transport: http(RPC) })
  const mk = (pk: Hex) => createWalletClient({ chain: foundry, transport: http(RPC), account: privateKeyToAccount(pk) })
  const relayerPk = generatePrivateKey()
  const deployer = mk(generatePrivateKey()), alice = mk(generatePrivateKey()), bob = mk(generatePrivateKey()), carol = mk(generatePrivateKey()), dave = mk(generatePrivateKey()), relayerW = mk(relayerPk)
  for (const w of [deployer, alice, bob, carol, dave, relayerW]) await pub.request({ method: 'anvil_setBalance' as any, params: [w.account.address, '0x56BC75E2D63100000'] as any })

  const usdcA = art('MockUSDC.sol', 'MockUSDC'), gameA = art('ArcVoxelGameFi.sol', 'ArcVoxelGameFi'), skinsA = art('ArcVoxelGameFi.sol', 'ArcVoxelSkins'), badgeA = art('ArcVoxelGameFi.sol', 'ArcExplorerBadge')
  const dep = async (a: any, args: any[] = []) => (await pub.waitForTransactionReceipt({ hash: await deployer.deployContract({ abi: a.abi, bytecode: a.bytecode.object, args }) })).contractAddress as Hex
  const usdc = await dep(usdcA)
  const game = await dep(gameA, [signerAddr, deployer.account.address, usdc]) // deployer plays the guardian role
  const wait = (h: Hex) => pub.waitForTransactionReceipt({ hash: h })
  const gAbi = gameA.abi, uAbi = usdcA.abi
  const call = (fn: string, args: any[] = []) => pub.readContract({ address: game, abi: gAbi, functionName: fn, args }) as Promise<any>
  const send = async (w: any, fn: string, args: any[] = []) => wait(await w.writeContract({ address: game, abi: gAbi, functionName: fn, args }))
  const usdcBal = async (a: Hex) => (await pub.readContract({ address: usdc, abi: uAbi, functionName: 'balanceOf', args: [a] })) as bigint
  for (const w of [alice, bob, carol, relayerW]) await wait(await deployer.writeContract({ address: usdc, abi: uAbi, functionName: 'mint', args: [w.account.address, 10_000_000n] }))

  procs.push(spawn('bun', [`${root}/server.mjs`, '5199'], { cwd: root, stdio: process.env.VERBOSE ? 'inherit' : 'ignore', env: { ...process.env, GAME_CONTRACT: game, GAME_CHAIN_ID: '31337', GAME_TEST_AUTH: '1', GAME_RPC_URL: RPC, GAME_DEPLOY_BLOCK: '0', GAME_DATA_FILE: '/tmp/lb-test.json', GAME_STATE_FILE: '/tmp/state-test.json', RELAYER_PRIVATE_KEY: relayerPk, GAME_USDC: usdc } }))
  await sleep(1800)
  const post = async (path: string, body: any) => { const r = await fetch(API + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); return { status: r.status, body: await r.json() } }
  const get = async (path: string) => (await fetch(API + path)).json() as Promise<any>

  const tokens: Record<string, string> = {}
  const login = async (w: any) => {
    const n = await get(`/api/auth/nonce?player=${w.account.address}`)
    const r = await post('/api/auth/wallet', { player: w.account.address, signature: await w.signMessage({ message: n.message }) })
    tokens[w.account.address] = r.body.session
    return r
  }
  const forgedNonce = await get(`/api/auth/nonce?player=${alice.account.address}`)
  const forged = await post('/api/auth/wallet', { player: alice.account.address, signature: await bob.signMessage({ message: forgedNonce.message }) })
  ok('wallet login rejects a signature from another wallet', forged.status === 401, forged.body.error)

  // passkey-style smart contract wallet (ERC-1271): the owner's signature is accepted for the contract address, nobody else's
  const mockA = art('Mock1271Account.sol', 'Mock1271Account')
  const mockHash = await deployer.deployContract({ abi: mockA.abi, bytecode: mockA.bytecode.object, args: [dave.account.address] } as any)
  const mockAddr = (await pub.waitForTransactionReceipt({ hash: mockHash })).contractAddress as Hex
  const nm = await get(`/api/auth/nonce?player=${mockAddr}`)
  const smartLogin = await post('/api/auth/wallet', { player: mockAddr, signature: await dave.signMessage({ message: nm.message }) })
  ok('smart contract wallet login (ERC-1271) accepts the owner signature', smartLogin.status === 200 && Boolean(smartLogin.body.session), smartLogin.body.error)
  const nm2 = await get(`/api/auth/nonce?player=${mockAddr}`)
  const smartBad = await post('/api/auth/wallet', { player: mockAddr, signature: await alice.signMessage({ message: nm2.message }) })
  ok('smart contract wallet login rejects someone who is not the owner', smartBad.status === 401, smartBad.body.error)
  const smartRun = await post('/api/run/start', { session: smartLogin.body.session, hero: 0 })
  ok('a smart wallet session can start a run', smartRun.status === 200 && Boolean(smartRun.body.runId), smartRun.body.error)
  const noAuth = await post('/api/run/start', { session: 'nope' })
  ok('run start requires sign-in session', noAuth.status === 401, noAuth.body.error)
  for (const w of [alice, bob, carol, dave]) await login(w)
  const cfg = await get('/api/config')
  ok('server reports the gasless relayer', cfg.relay.enabled === true && cfg.relay.address.toLowerCase() === relayerW.account.address.toLowerCase())

  // season entry first, so every ranked run counts
  for (const w of [alice, bob]) {
    await wait(await w.writeContract({ address: usdc, abi: uAbi, functionName: 'approve', args: [game, 1_000_000n] }))
    await send(w, 'enterSeason')
  }
  ok('enter twice reverts', await reverts(alice.writeContract({ address: game, abi: gAbi, functionName: 'enterSeason' }), 'AlreadyEntered'))
  ok('pool = 2 USDC', (await call('getSeasonInfo', [0n]))[0] === 2_000_000n)

  const runVia = async (path: string, w: any, score: number, wait_s: number, tele: any = undefined, extra: any = {}) => {
    const s = await post('/api/run/start', { session: tokens[w.account.address], hero: 1, ...extra })
    await sleep(wait_s * 1000)
    const cps = tele ?? telemetry(score, wait_s)
    return post(path, { session: tokens[w.account.address], runId: s.body.runId, score, gems: cps.length ? cps[cps.length - 1].g : 0, maxCombo: 3, wave: 1 + Math.floor(wait_s / 20), elapsed: wait_s, telemetry: cps })
  }

  // anti-cheat server (short and impossible runs)
  const sShort = await post('/api/run/start', { session: tokens[carol.account.address] })
  const early = await post('/api/run/finish', { session: tokens[carol.account.address], runId: sShort.body.runId, score: 100, gems: 1, maxCombo: 1, wave: 1, elapsed: 1, telemetry: [{ t: 5, s: 100, k: 1, g: 0, w: 1 }] })
  ok('server rejects too-short run', early.status === 400, early.body.error)
  const noTele = await runVia('/api/run/finish', dave, 6000, 11, [])
  ok('server rejects a run without telemetry', noTele.status === 422, noTele.body.error)

  // alice (finish), bob (gasless relay), carol (finish) and dave (faked telemetry) play in parallel
  const bobBefore = await pub.getBalance({ address: bob.account.address })
  const fakedTele = telemetry(60000, 11).map((c) => ({ ...c, k: 0, g: 0 })) // score with no kills
  const [ta, rb, tc, td] = await Promise.all([
    runVia('/api/run/finish', alice, 60000, 41),
    runVia('/api/run/relay', bob, 6000, 11),
    runVia('/api/run/finish', carol, 2400, 11, undefined, { roomId: 999 }),
    runVia('/api/run/finish', dave, 6000, 11, fakedTele),
  ])
  ok('tickets issued, relay sent', ta.status === 200 && rb.status === 200 && tc.status === 200, JSON.stringify([ta.status, rb.status, tc.status, rb.body.error || '']))
  ok('score not explained by kills is rejected', td.status === 422, td.body.error)
  ok('a ticket for a room that does not exist is downgraded to a normal run', tc.body.roomId === 0)
  ok('gasless relay: bob paid no gas and his run was saved', (await pub.getBalance({ address: bob.account.address })) === bobBefore && (await call('getPlayerProfile', [bob.account.address]))[1] === 1n)
  ok('relay transaction hash returned', /^0x[0-9a-f]{64}$/.test(rb.body.txHash))

  const tampered = { ...ta.body, score: ta.body.score + 1 }
  ok('tampered ticket is rejected', await reverts(alice.writeContract({ address: game, abi: gAbi, functionName: 'submitRun', args: toWire(tampered) as any }), 'BadSignature'))
  await wait(await alice.writeContract({ address: game, abi: gAbi, functionName: 'submitRun', args: toWire(ta.body) as any }))
  // anyone can submit a ticket, but rewards go to the ticket's player
  const bobRunsBefore = (await call('getPlayerProfile', [bob.account.address]))[1]
  await wait(await bob.writeContract({ address: game, abi: gAbi, functionName: 'submitRun', args: toWire(tc.body) as any }))
  ok('a relayer-style submit credits the ticket player, not the sender', (await call('getPlayerProfile', [carol.account.address]))[1] === 1n && (await call('getPlayerProfile', [bob.account.address]))[1] === bobRunsBefore)
  ok('replay reverts', await reverts(alice.writeContract({ address: game, abi: gAbi, functionName: 'submitRun', args: toWire(ta.body) as any }), 'RunAlreadyUsed'))

  const lbApi = await get('/api/leaderboard?refresh=1')
  ok('indexed leaderboard lists every onchain run with its tx hash', lbApi.entries.length === 3 && [lbApi.entries[0].score, lbApi.entries[1].score, lbApi.entries[2].score].join() === '3000,300,120' && /^0x[0-9a-f]{64}$/.test(lbApi.entries[0].txHash), JSON.stringify(lbApi.entries.map((e: any) => e.score)))
  ok('board carries wave, hero and season', lbApi.entries[0].wave === 3 && lbApi.entries[0].hero === 1 && lbApi.entries[0].season === 0, JSON.stringify([lbApi.entries[0].wave, lbApi.entries[0].hero]))
  const seasonBoard = await get('/api/leaderboard?scope=season&season=0')
  ok('season filter returns the same runs', seasonBoard.entries.length === 3 && seasonBoard.scope === 'season')
  ok('indexer reports it is caught up', lbApi.indexing.behind === 0 && lbApi.indexing.healthy === true)
  const health = await get('/api/health')
  ok('health endpoint reports indexer and funded relayer', health.ok === true && health.relayer.enabled && health.relayer.funded)

  const prof: any = await call('getPlayerProfile', [alice.account.address])
  ok('alice: 150 ARCQ from the run + 35 from quests, Sentinel badge (tier 4)', prof[4] === 185n * 10n ** 18n && prof[5] === 4, `${prof[4]} tier ${prof[5]}`)
  const profBob: any = await call('getPlayerProfile', [bob.account.address])
  const profCarol: any = await call('getPlayerProfile', [carol.account.address])
  ok('badge tiers follow the score: 300 points is Scout (1), 120 points has no badge (0)', profBob[5] === 1 && profCarol[5] === 0, `${profBob[5]} / ${profCarol[5]}`)
  const q: any = await call('getQuestState', [alice.account.address])
  ok('quest state: streak 1, 1 run today, quests 0 and 2 done', q[0] === 1n && q[1] === 1n && q[2] === 5, JSON.stringify(q.map(String)))
  const lb: any = await call('getLeaderboard')
  ok('board has alice then bob only (carol not entered)', lb[0].length === 2 && lb[0][0].toLowerCase() === alice.account.address.toLowerCase() && lb[1][0] === 3000n && lb[1][1] === 300n)

  ok('alice cannot afford a hero upgrade yet (185 ARCQ)', await reverts(alice.writeContract({ address: game, abi: gAbi, functionName: 'upgradeHero' }), 'InsufficientBalance'))
  ok('carol cannot upgrade without ARCQ', await reverts(carol.writeContract({ address: game, abi: gAbi, functionName: 'upgradeHero' }), 'InsufficientBalance'))

  // guardian + pause
  const guardianOnly = async (fn: string, w: any, args: any[] = []) => reverts(w.writeContract({ address: game, abi: gAbi, functionName: fn, args }), 'NotGuardian')
  ok('signer cannot rotate itself (guardian only)', await guardianOnly('setSigner', alice, [alice.account.address]))
  ok('non-guardian cannot pause', await guardianOnly('pause', alice))
  await send(deployer, 'pause')
  const dummy = { ...ta.body, runId: ('0x' + 'ab'.repeat(32)) as Hex }
  ok('paused: submitRun is blocked', await reverts(alice.writeContract({ address: game, abi: gAbi, functionName: 'submitRun', args: toWire(dummy) as any }), 'Paused_'))
  ok('paused: enterSeason, createRoom and joinRoom are blocked', (await reverts(carol.writeContract({ address: game, abi: gAbi, functionName: 'enterSeason' }), 'Paused_')) && (await reverts(carol.writeContract({ address: game, abi: gAbi, functionName: 'createRoom', args: [1_000_000n, 3600] }), 'Paused_')))
  ok('paused: upgrades are not blocked by pause', await reverts(alice.writeContract({ address: game, abi: gAbi, functionName: 'upgradeHero' }), 'InsufficientBalance'))
  await send(deployer, 'unpause')

  // manual tickets signed with the real signer key (no waiting): quests, skins, rooms
  let seq = 0x100
  const signTicket = async (player: Hex, score: number, season: bigint, roomId = 0, deadlineOverride?: bigint) => {
    const blk = await pub.getBlock()
    const deadline = deadlineOverride ?? blk.timestamp + 1_000_000n
    const runId = ('0x' + (seq++).toString(16).padStart(64, '0')) as Hex
    const digest = keccak256(encodeAbiParameters(
      [{ type: 'uint256' }, { type: 'address' }, { type: 'address' }, { type: 'uint256' }, { type: 'uint256' }, { type: 'bytes32' }, { type: 'uint256' }, { type: 'uint256' }, { type: 'uint256' }, { type: 'uint256' }, { type: 'uint256' }, { type: 'uint256' }],
      [31337n, game, player, season, BigInt(roomId), runId, BigInt(score), 1n, 1n, 2n, 0n, deadline]))
    const signature = await privateKeyToAccount(signerPk).signMessage({ message: { raw: digest } })
    return { player, score, gems: 1, maxCombo: 1, wave: 2, hero: 0, roomId, runId, deadline: deadline.toString(), signature }
  }
  const sub = (w: any, t: any) => w.writeContract({ address: game, abi: gAbi, functionName: 'submitRun', args: toWire(t) as any })

  const r1 = await wait(await sub(deployer, await signTicket(alice.account.address, 50000, 0n))) // big run, submitted by a third party
  const r2 = await wait(await sub(deployer, await signTicket(alice.account.address, 10, 0n))) // third run today
  const q2: any = await call('getQuestState', [alice.account.address])
  ok('third run of the day pays its quest, no double pay for the big run', q2[1] === 3n && q2[2] === 7, JSON.stringify(q2.map(String)))
  const bal2 = (await call('balanceOf', [alice.account.address])) as bigint
  ok('ARCQ = 185 + 2500 (50,000 pts) + 0.5 + 15 (third-run quest)', bal2 === 27005n * 10n ** 17n, String(bal2))

  // badge restore: transfer the badge away, the next run re-issues it at the earned tier
  const badgeAddr0: any = await call('badgeNft')
  const tokA = (await pub.readContract({ address: badgeAddr0, abi: badgeA.abi, functionName: 'tokenOf', args: [alice.account.address] })) as bigint
  await wait(await alice.writeContract({ address: badgeAddr0, abi: badgeA.abi, functionName: 'transferFrom', args: [alice.account.address, carol.account.address, tokA] }))
  await wait(await sub(deployer, await signTicket(alice.account.address, 20, 0n))) // +1 ARCQ
  const tokA2 = (await pub.readContract({ address: badgeAddr0, abi: badgeA.abi, functionName: 'tokenOf', args: [alice.account.address] })) as bigint
  const tierA2 = (await pub.readContract({ address: badgeAddr0, abi: badgeA.abi, functionName: 'tierOf', args: [tokA2] })) as number
  ok('a transferred badge is re-issued at the earned tier (8: best run 50,000 pts)', tokA2 !== 0n && tokA2 !== tokA && tierA2 === 8, `token ${tokA2} tier ${tierA2}`)

  // skins shop (soulbound)
  const skins = (await call('skins')) as Hex
  await send(alice, 'buySkin', [1])
  const own: any = await call('getSkins', [alice.account.address])
  ok('skin 1 bought for 1000 ARCQ (balance 1701.5)', own[0] === 1 && ((await call('balanceOf', [alice.account.address])) as bigint) === 17015n * 10n ** 17n)
  await send(alice, 'equipSkin', [1])
  ok('skin equipped', ((await call('getSkins', [alice.account.address])) as any)[1] === 1)
  ok('cannot buy the same skin twice', await reverts(alice.writeContract({ address: game, abi: gAbi, functionName: 'buySkin', args: [1] }), 'SkinAlreadyOwned'))
  ok('unknown skin id is rejected', await reverts(alice.writeContract({ address: game, abi: gAbi, functionName: 'buySkin', args: [9] }), 'InvalidSkin'))
  ok('skins cannot be equipped without owning them', await reverts(bob.writeContract({ address: game, abi: gAbi, functionName: 'equipSkin', args: [1] }), 'SkinNotOwned'))
  ok('skin NFT is soulbound', await reverts(alice.writeContract({ address: skins, abi: skinsA.abi, functionName: 'transferFrom', args: [alice.account.address, bob.account.address, 1n] }), 'Soulbound'))
  const sUri: string = (await pub.readContract({ address: skins, abi: skinsA.abi, functionName: 'tokenURI', args: [1n] })) as string
  ok('skin tokenURI is valid JSON with SVG image', JSON.parse(Buffer.from(sUri.split(',')[1], 'base64').toString()).image.startsWith('data:image/svg+xml;base64,'))

  // rooms
  await wait(await carol.writeContract({ address: usdc, abi: uAbi, functionName: 'approve', args: [game, 5_000_000n] }))
  await send(carol, 'createRoom', [1_000_000n, 3600])
  ok('bad entry fee / duration are rejected', (await reverts(carol.writeContract({ address: game, abi: gAbi, functionName: 'createRoom', args: [1n, 3600] }), 'InvalidEntryFee')) && (await reverts(carol.writeContract({ address: game, abi: gAbi, functionName: 'createRoom', args: [1_000_000n, 5] }), 'InvalidDuration')))
  for (const w of [alice, bob]) {
    await wait(await w.writeContract({ address: usdc, abi: uAbi, functionName: 'approve', args: [game, 1_000_000n] }))
    await send(w, 'joinRoom', [1n])
  }
  ok('room pool is 2 USDC with 2 entrants', ((await call('getRoom', [1n])) as any)[4] === 2_000_000n && ((await call('getRoom', [1n])) as any)[5] === 2)
  ok('a run for a room you did not join reverts', await reverts(sub(deployer, await signTicket(carol.account.address, 500, 1n, 1)), 'NotInRoom'))
  await wait(await sub(deployer, await signTicket(alice.account.address, 100, 1n - 1n, 1)))
  await wait(await sub(deployer, await signTicket(bob.account.address, 200, 0n, 1)))
  const rlb: any = await call('getRoomLeaderboard', [1n])
  ok('room leaderboard ranks bob above alice', rlb[0].length === 2 && rlb[0][0].toLowerCase() === bob.account.address.toLowerCase() && rlb[1][0] === 200n)
  await send(carol, 'createRoom', [500_000n, 3600]) // room 2 stays empty
  await wait(await carol.writeContract({ address: game, abi: gAbi, functionName: 'joinRoom', args: [2n] }))
  ok('room prizes cannot be claimed before the room ends', await reverts(carol.writeContract({ address: game, abi: gAbi, functionName: 'claimRoomPrize', args: [1n, 0n] }), 'RoomNotEnded'))
  await pub.request({ method: 'evm_increaseTime' as any, params: [3601] as any })
  await pub.request({ method: 'evm_mine' as any, params: [] as any })
  const a0 = await usdcBal(alice.account.address), b0 = await usdcBal(bob.account.address)
  await send(carol, 'claimRoomPrize', [1n, 0n])
  await send(carol, 'claimRoomPrize', [1n, 1n])
  ok('room prize split 60/40 of 2 USDC to bob and alice', (await usdcBal(bob.account.address)) - b0 === 1_200_000n && (await usdcBal(alice.account.address)) - a0 === 800_000n)
  ok('room prize cannot be claimed twice', await reverts(carol.writeContract({ address: game, abi: gAbi, functionName: 'claimRoomPrize', args: [1n, 0n] }), 'PrizeAlreadyClaimed'))
  ok('a finished room rejects new joins and runs', await reverts(sub(deployer, await signTicket(alice.account.address, 50, 0n, 1)), 'RoomClosed'))
  const c0 = await usdcBal(carol.account.address)
  await send(carol, 'claimRoomRefund', [2n])
  ok('empty room: entrant gets the fee back', (await usdcBal(carol.account.address)) - c0 === 500_000n)
  ok('refund cannot be claimed twice', await reverts(carol.writeContract({ address: game, abi: gAbi, functionName: 'claimRoomRefund', args: [2n] }), 'RefundAlreadyClaimed'))
  ok('rooms with winners cannot be refunded', await reverts(alice.writeContract({ address: game, abi: gAbi, functionName: 'claimRoomRefund', args: [1n] }), 'RoomHasWinners'))

  // seasons: the claim window and season-bound tickets
  ok('season prize cannot be claimed before the season ends', await reverts(alice.writeContract({ address: game, abi: gAbi, functionName: 'claimPrize', args: [0n, 0n] }), 'SeasonNotEnded'))
  await pub.request({ method: 'evm_increaseTime' as any, params: [86400 + 5] as any })
  await pub.request({ method: 'evm_mine' as any, params: [] as any })
  ok('ticket signed for an earlier season is rejected', await reverts(sub(deployer, await signTicket(carol.account.address, 50, 0n)), 'BadSignature'))
  await wait(await sub(deployer, await signTicket(carol.account.address, 50, 1n)))
  ok('ticket signed for the current season is accepted', true)
  const sa0 = await usdcBal(alice.account.address), sb0 = await usdcBal(bob.account.address)
  await send(carol, 'claimPrize', [0n, 0n])
  await send(carol, 'claimPrize', [0n, 1n])
  ok('season: 2 winners split 60/40 of 2 USDC', (await usdcBal(alice.account.address)) - sa0 === 1_200_000n && (await usdcBal(bob.account.address)) - sb0 === 800_000n)
  const profWin: any = await call('getPlayerProfile', [alice.account.address])
  ok('season winner holds the Champion badge (tier 9)', profWin[5] === 9, String(profWin[5]))
  ok('season prize cannot be claimed twice', await reverts(carol.writeContract({ address: game, abi: gAbi, functionName: 'claimPrize', args: [0n, 0n] }), 'PrizeAlreadyClaimed'))
  ok('contract holds 0 USDC after all payouts', (await usdcBal(game)) === 0n, String(await usdcBal(game)))
  const badgeAddr: any = await call('badgeNft')
  const uri: string = (await pub.readContract({ address: badgeAddr, abi: badgeA.abi, functionName: 'tokenURI', args: [1n] })) as string
  ok('badge tokenURI is valid JSON with SVG image', JSON.parse(Buffer.from(uri.split(',')[1], 'base64').toString()).image.startsWith('data:image/svg+xml;base64,'))
  console.log(`\n${pass} passed, ${fail} failed`)
}

main().catch((e) => { console.error(e); fail++ }).finally(() => { procs.forEach((p) => p.kill()); process.exit(fail ? 1 : 0) })
