#!/usr/bin/env node
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const req = createRequire(import.meta.url)

// 1. Syntax checks
for (const file of ['game.js', 'web3/arc-web3.js', 'build-dapp.mjs', 'serve-dapp.mjs']) {
  const res = spawnSync(process.execPath, ['--check', join(root, file)], { encoding: 'utf8' })
  assert.equal(res.status, 0, `Syntax check failed for ${file}: ${res.stderr}`)
}

// 2. Keccak-256 & ABI encoder/decoder tests
const web3 = req(join(root, 'web3', 'arc-web3.js'))
assert.equal(web3.keccak256(''), '0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470')
assert.equal(web3.fnSelector('transfer(address,uint256)'), '0xa9059cbb')
assert.equal(web3.fnSelector('balanceOf(address)'), '0x70a08231')

const submitCall = web3.encodeSubmitRun(320, 14, 4)
assert.equal(submitCall.length, 2 + 8 + 64 * 3)
assert.ok(submitCall.startsWith(web3.fnSelector('submitRun(uint256,uint256,uint256)')))
assert.equal(BigInt('0x' + submitCall.slice(10, 74)), 320n)
assert.equal(BigInt('0x' + submitCall.slice(74, 138)), 14n)
assert.equal(BigInt('0x' + submitCall.slice(138, 202)), 4n)

const addr = '0x1111111111111111111111111111111111111111'
const profCall = web3.encodeGetPlayerProfile(addr)
assert.equal(profCall.length, 2 + 8 + 64)

// Simulate ABI response for getPlayerProfile (8 words)
const mockProfileHex = '0x'
  + web3.encodeUint256(520)
  + web3.encodeUint256(3)
  + web3.encodeUint256(42)
  + web3.encodeUint256(5)
  + web3.encodeUint256(520n * 10n ** 18n)
  + web3.encodeUint256(3)
  + web3.encodeUint256(520n * 10n ** 18n)
  + web3.encodeUint256(1760000000)
const decodedProfile = web3.decodePlayerProfile(mockProfileHex)
assert.equal(decodedProfile.bestScore, 520)
assert.equal(decodedProfile.totalRuns, 3)
assert.equal(decodedProfile.badgeTier, 3)
assert.equal(web3.formatUnits(decodedProfile.arcqBalanceWei, 18, 2), '520')

// Simulate ABI response for getLeaderboard (3 offsets + 3 arrays of len 1)
const mockLbHex = '0x'
  + web3.encodeUint256(96) // offset players
  + web3.encodeUint256(160) // offset scores
  + web3.encodeUint256(224) // offset tiers
  + web3.encodeUint256(1) // players.length
  + web3.encodeAddress(addr)
  + web3.encodeUint256(1) // scores.length
  + web3.encodeUint256(520)
  + web3.encodeUint256(1) // tiers.length
  + web3.encodeUint256(3)
const decodedLb = web3.decodeLeaderboard(mockLbHex)
assert.equal(decodedLb.length, 1)
assert.equal(decodedLb[0].player, addr)
assert.equal(decodedLb[0].bestScore, 520)
assert.equal(decodedLb[0].badgeTier, 3)

// 3. Live read-only Arc Testnet RPC verification
const rpcRes = await fetch('https://rpc.testnet.arc.network', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_chainId', params: [] }),
})
const rpcJson = await rpcRes.json()
assert.equal(rpcJson.result.toLowerCase(), '0x4cef52')

// 4. Verify dapp/index.html bundle
const dappHtml = await readFile(join(root, 'dapp', 'index.html'), 'utf8')
assert.ok(dappHtml.includes('ARC_WEB3_CONFIG'))
assert.ok(dappHtml.includes('ARC_WEB3'))
assert.ok(dappHtml.includes('https://rpc.testnet.arc.network'))

console.log(JSON.stringify({ ok: true, rpcChainId: rpcJson.result, dappBytes: Buffer.byteLength(dappHtml) }))
