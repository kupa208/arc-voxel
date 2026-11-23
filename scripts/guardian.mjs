#!/usr/bin/env bun
/**
 * Guardian tools for ArcVoxelGameFi v3.
 *   bun scripts/guardian.mjs status
 *   bun scripts/guardian.mjs pause | unpause
 *   bun scripts/guardian.mjs set-guardian 0xNewGuardian     (hand the admin role to a separate, safer wallet)
 *   bun scripts/guardian.mjs set-signer 0xNewSigner         (rotate the anti-cheat signer, e.g. after a key leak)
 * Writes are sent from GAME_SIGNER_PRIVATE_KEY (.env.local), which is the guardian until set-guardian is used.
 * That wallet needs a little USDC for gas. Never pass a private key on the command line.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPublicClient, createWalletClient, defineChain, http, isAddress, parseAbi } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const cfg = JSON.parse(readFileSync(join(root, 'web3-config.json'), 'utf8'))
const net = cfg.networks['arc-testnet']
const chain = defineChain({
  id: net.chainIdDec,
  name: net.chainName,
  nativeCurrency: net.nativeCurrency,
  rpcUrls: { default: { http: net.rpcUrls } },
})
const game = cfg.defaultContract
const abi = parseAbi([
  'function guardian() view returns (address)',
  'function signer() view returns (address)',
  'function paused() view returns (bool)',
  'function pause()',
  'function unpause()',
  'function setGuardian(address)',
  'function setSigner(address)',
])
const pub = createPublicClient({ chain, transport: http(net.rpcUrls[0]) })
const [cmd, arg] = process.argv.slice(2)

if (!cmd || cmd === 'status') {
  const [guardian, signer, paused] = await Promise.all(['guardian', 'signer', 'paused'].map((fn) => pub.readContract({ address: game, abi, functionName: fn })))
  console.log({ contract: game, guardian, signer, paused })
  process.exit(0)
}

const pk = readFileSync(join(root, '.env.local'), 'utf8').match(/GAME_SIGNER_PRIVATE_KEY=(0x[0-9a-fA-F]{64})/)?.[1]
if (!pk) throw new Error('GAME_SIGNER_PRIVATE_KEY not found in .env.local')
const account = privateKeyToAccount(pk)
const wallet = createWalletClient({ account, chain, transport: http(net.rpcUrls[0]) })

const calls = { pause: ['pause', []], unpause: ['unpause', []], 'set-guardian': ['setGuardian', [arg]], 'set-signer': ['setSigner', [arg]] }
const call = calls[cmd]
if (!call) throw new Error('Unknown command: ' + cmd)
if (cmd.startsWith('set-') && !isAddress(arg || '')) throw new Error('Pass a valid 0x address')
const hash = await wallet.writeContract({ address: game, abi, functionName: call[0], args: call[1] })
console.log('sent', hash)
await pub.waitForTransactionReceipt({ hash })
console.log('confirmed')
