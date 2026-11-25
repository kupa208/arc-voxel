/**
 * Email wallet backend tests with a fake Circle client (no network, no keys).
 * Run: bun contracts/test-integration/email-wallet.ts
 */
import { encodeFunctionData, parseAbi, toFunctionSelector } from 'viem'
// @ts-expect-error plain JS module
import { createEmailWallet, EmailError, normalizeEmail, hashEmail, circleError } from '../../email-wallet.mjs'

let pass = 0, fail = 0
const ok = (name: string, cond: boolean, extra = '') => { cond ? pass++ : fail++; console.log(`${cond ? 'PASS' : 'FAIL'} ${name} ${extra}`) }
const rejects = async (p: Promise<any>, status?: number) => { try { await p; return false } catch (e: any) { return e instanceof EmailError && (!status || e.status === status) } }

const GAME = '0xed4b23b962ce958d5f68cc779fe68eaa935986ae'
const USDC = '0x3600000000000000000000000000000000000000'
const WALLET = '0x1111111111111111111111111111111111111111'
const OTHER = '0x2222222222222222222222222222222222222222'
const TOKEN = 'user-token-'.padEnd(40, 'x')

const calls: any[] = []
let initialized = false
const fake = {
  async createDeviceTokenForSocialLogin(i: any) { calls.push(['social', i]); return { data: { deviceToken: 'sdt', deviceEncryptionKey: 'sdek' } } },
  async createDeviceTokenForEmailLogin(i: any) { calls.push(['otp', i]); return { data: { deviceToken: 'dt', deviceEncryptionKey: 'dek', otpToken: 'otp' } } },
  async listWallets(i: any) {
    calls.push(['list', i])
    if (!initialized) throw Object.assign(new Error('nope'), { response: { status: 404, data: { code: 155102 } } })
    return { data: { wallets: [{ id: 'w1', address: WALLET, blockchain: 'ARC-TESTNET', state: 'LIVE' }] } }
  },
  async createUserPinWithWallets(i: any) { calls.push(['pin', i]); return { data: { challengeId: 'ch-pin' } } },
  async createUserTransactionContractExecutionChallenge(i: any) { calls.push(['exec', i]); return { data: { challengeId: 'ch-exec' } } },
  async listTransactions(i: any) { calls.push(['txs', i]); return { data: { transactions: [{ id: 't1', state: 'COMPLETE', txHash: '0xabc' }] } } },
}

const sessions = new Map<string, any>()
const mk = () => createEmailWallet({
  getClient: async () => fake,
  getContract: async () => GAME,
  usdc: USDC,
  newSession: (d: any) => { const id = 's' + sessions.size; sessions.set(id, d); return id },
  sessionOf: (b: any) => { const s = sessions.get(String(b.session)); if (!s) throw new EmailError(401, 'Please connect your wallet', 401); return s },
})

async function main() {
  // validation
  ok('normalizes email', normalizeEmail('  Player@Gmail.COM ') === 'player@gmail.com')
  ok('rejects bad email', await rejects((async () => normalizeEmail('not-an-email'))(), 400))
  ok('rejects injection in email', await rejects((async () => normalizeEmail('a@b.com\r\nbcc:x@y.com'))(), 400))
  ok('email hash is short and not the address', hashEmail('a@b.com').length === 12 && !hashEmail('a@b.com').includes('@'))

  // otp + rate limits
  const ew = mk()
  const r = await ew.requestOtp({ email: 'Player@Gmail.com', deviceId: 'device-123456' }, '1.1.1.1')
  ok('otp returns Circle tokens', r.otpToken === 'otp' && r.deviceToken === 'dt')
  ok('otp call used the lowercase email', calls.find((c) => c[0] === 'otp')[1].email === 'player@gmail.com')
  await ew.requestOtp({ email: 'player@gmail.com', deviceId: 'device-123456' }, '1.1.1.1')
  await ew.requestOtp({ email: 'player@gmail.com', deviceId: 'device-123456' }, '1.1.1.1')
  ok('4th code for the same email is blocked', await rejects(ew.requestOtp({ email: 'player@gmail.com', deviceId: 'device-123456' }, '1.1.1.1'), 429))
  let blocked = false
  for (let i = 0; i < 12; i++) { try { await ew.requestOtp({ email: `p${i}@gmail.com`, deviceId: 'device-123456' }, '9.9.9.9') } catch (e: any) { if (e.status === 429) blocked = true } }
  ok('one network cannot request unlimited codes', blocked)
  const soc = await ew.requestSocialToken({ deviceId: 'device-123456' }, '3.3.3.3')
  ok('google sign-in returns the device token pair', soc.deviceToken === 'sdt' && soc.deviceEncryptionKey === 'sdek')
  ok('google sign-in without a device id is refused', await rejects(ew.requestSocialToken({ deviceId: '' }, '3.3.3.3'), 400))
  ok('missing device id is refused', await rejects(ew.requestOtp({ email: 'x@gmail.com', deviceId: '' }, '2.2.2.2'), 400))

  // initialize: new player gets the PIN challenge, existing gets the wallet
  const ew2 = mk()
  const i1 = await ew2.initialize({ userToken: TOKEN }, '3.3.3.3')
  ok('new player gets a PIN + wallet challenge', i1.challengeId === 'ch-pin' && calls.find((c) => c[0] === 'pin')[1].accountType === 'SCA')
  ok('wallet is requested on Arc Testnet only', JSON.stringify(calls.find((c) => c[0] === 'pin')[1].blockchains) === '["ARC-TESTNET"]')
  ok('no wallet yet: session is pending', (await ew2.session({ userToken: TOKEN }, '3.3.3.3')).pending === true)
  initialized = true
  const s = await ew2.session({ userToken: TOKEN }, '3.3.3.3')
  ok('session opens for the Circle wallet address', s.session && s.address === WALLET && sessions.get(s.session).address === WALLET && sessions.get(s.session).kind === 'email')
  const i2 = await mk().initialize({ userToken: TOKEN }, '4.4.4.4')
  ok('existing player gets the same wallet back', i2.wallet && i2.wallet.address === WALLET)
  ok('short token is refused', await rejects(ew2.session({ userToken: 'x' }, '3.3.3.3'), 400))

  // challenge allowlist
  const abi = parseAbi(['function enterSeason()', 'function approve(address,uint256) returns (bool)', 'function transfer(address,uint256) returns (bool)', 'function buySkin(uint8)'])
  const sess = s.session
  const enter = encodeFunctionData({ abi, functionName: 'enterSeason' })
  const c1 = await ew2.challenge({ session: sess, userToken: TOKEN, to: GAME, data: enter }, '5.5.5.5')
  ok('game call gets a PIN challenge', c1.challengeId === 'ch-exec')
  const exec = calls.filter((c) => c[0] === 'exec').pop()[1]
  ok('challenge is for the player wallet and the game contract', exec.walletId === 'w1' && exec.contractAddress === GAME && exec.callData === enter)
  const approveGame = encodeFunctionData({ abi, functionName: 'approve', args: [GAME, 1_000_000n] })
  ok('USDC approve for the game is allowed', (await ew2.challenge({ session: sess, userToken: TOKEN, to: USDC, data: approveGame }, '5.5.5.5')).challengeId === 'ch-exec')
  const approveOther = encodeFunctionData({ abi, functionName: 'approve', args: [OTHER, 1_000_000n] })
  ok('USDC approve for another address is refused', await rejects(ew2.challenge({ session: sess, userToken: TOKEN, to: USDC, data: approveOther }, '5.5.5.5'), 403))
  const transfer = encodeFunctionData({ abi, functionName: 'transfer', args: [OTHER, 1_000_000n] })
  ok('USDC transfer is refused', await rejects(ew2.challenge({ session: sess, userToken: TOKEN, to: USDC, data: transfer }, '5.5.5.5'), 403))
  ok('unknown contract is refused', await rejects(ew2.challenge({ session: sess, userToken: TOKEN, to: OTHER, data: enter }, '5.5.5.5'), 403))
  ok('unknown game function is refused', await rejects(ew2.challenge({ session: sess, userToken: TOKEN, to: GAME, data: '0xdeadbeef' }, '5.5.5.5'), 403))
  ok('garbage calldata is refused', await rejects(ew2.challenge({ session: sess, userToken: TOKEN, to: GAME, data: 'zzz' }, '5.5.5.5'), 400))
  ok('no game session is refused', await rejects(ew2.challenge({ session: 'nope', userToken: TOKEN, to: GAME, data: enter }, '5.5.5.5'), 401))
  const skin = encodeFunctionData({ abi, functionName: 'buySkin', args: [2] })
  ok('skin purchase is allowed', (await ew2.challenge({ session: sess, userToken: TOKEN, to: GAME, data: skin }, '5.5.5.5')).challengeId === 'ch-exec')

  // a saved run must name the signed-in player
  const submitSel = toFunctionSelector('submitRun((address,uint256,uint256,uint256,uint256,uint8,uint256,bytes32,uint256),bytes)')
  const word = (a: string) => a.slice(2).padStart(64, '0')
  const goodRun = submitSel + word(WALLET) + '0'.repeat(64 * 3)
  const badRun = submitSel + word(OTHER) + '0'.repeat(64 * 3)
  ok('run for the signed-in wallet is allowed', (() => { try { ew2.checkCall(GAME, goodRun, WALLET, GAME); return true } catch { return false } })())
  ok('run for another wallet is refused', (() => { try { ew2.checkCall(GAME, badRun, WALLET, GAME); return false } catch (e: any) { return e.status === 403 } })())

  // last tx + error mapping
  const lt = await ew2.lastTx({ session: sess, userToken: TOKEN })
  ok('last transaction is returned', lt.id === 't1' && lt.txHash === '0xabc')
  const e1 = circleError({ response: { status: 400, data: { code: 155134, message: 'x' } } })
  ok('wrong code maps to a clear message', e1.status === 400 && /not correct/.test(e1.message) && e1.code === 155134)
  const e2 = circleError({ response: { status: 401, data: { code: 155104 } } })
  ok('expired token maps to 401', e2.status === 401 && e2.code === 155104)
  const e3 = circleError({ response: { status: 403, data: { message: 'Forbidden', apiKey: 'SECRET' } } })
  ok('a refused API key never leaks into the message', e3.status === 503 && !/SECRET/.test(e3.message))

  const e4 = circleError({ message: 'The SMTP server configuration is not found.', code: 155150, status: 404 })
  ok('missing SMTP setup is reported as a server setup problem', e4.status === 503 && e4.code === 155150 && /not finished/.test(e4.message))
  const e5 = circleError({ message: 'bad otp', code: 155133, status: 400 })
  ok('SDK-shaped wrong code error is mapped too', e5.status === 400 && /not correct/.test(e5.message))

  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}

main().catch((e) => { console.error(e); process.exit(1) })
