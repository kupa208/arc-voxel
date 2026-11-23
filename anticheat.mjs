/**
 * Run plausibility checks for Arc Voxel Quest.
 *
 * The game runs in the player's browser, so the server cannot replay it. Instead the client sends
 * telemetry checkpoints (about one every 5 seconds: time, score, kills, gems, wave) and the server
 * checks that the whole story is internally consistent and physically plausible:
 *   - checkpoints are ordered, spaced, and end close to the server-measured play time
 *   - score, kills, gems and wave never go down
 *   - between checkpoints, score gain is bounded by the time passed AND by the kills and gems reported
 *   - the wave is the one the game would be on at that time (a new wave every 20 seconds)
 *   - the final numbers continue the last checkpoint
 * This raises the cost of cheating but is NOT proof of honest play: a script that fabricates consistent
 * telemetry while waiting in real time can still pass. Do not hold real value in prize pools on this alone.
 */

export const LIMITS = {
  SCORE_PER_SECOND: 1_500, // game score per second, including bursts
  SCORE_BURST: 2_000, // extra headroom per checkpoint gap
  KILLS_PER_SECOND: 25,
  KILLS_BURST: 12,
  GEMS_PER_SECOND: 8,
  GEMS_BURST: 10,
  MAX_SCORE_PER_KILL: 3_000, // a boss kill at x10 combo is 300 * 10
  SCORE_PER_GEM: 40,
  SCORE_SLACK: 600,
  WAVE_SECONDS: 20,
  MIN_GAP_S: 3,
  MAX_CHECKPOINTS: 400,
}

const num = (v) => (Number.isFinite(Number(v)) ? Math.floor(Number(v)) : NaN)

/**
 * @param {unknown} raw checkpoints from the client: [{t, s, k, g, w}, ...]
 * @param {{elapsed: number, score: number, gems: number, wave: number, serverElapsed: number}} final
 * @returns {{ok: true} | {ok: false, reason: string}}
 */
export function verifyTelemetry(raw, final) {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > LIMITS.MAX_CHECKPOINTS) return { ok: false, reason: 'telemetry missing' }
  const cps = raw.map((c) => ({ t: num(c?.t), s: num(c?.s), k: num(c?.k), g: num(c?.g), w: num(c?.w) }))
  if (cps.some((c) => [c.t, c.s, c.k, c.g, c.w].some((v) => !Number.isFinite(v) || v < 0))) return { ok: false, reason: 'telemetry malformed' }

  let prev = { t: 0, s: 0, k: 0, g: 0, w: 1 }
  for (const c of cps) {
    const dt = c.t - prev.t
    if (dt < LIMITS.MIN_GAP_S) return { ok: false, reason: 'checkpoints too close' }
    const ds = c.s - prev.s, dk = c.k - prev.k, dg = c.g - prev.g
    if (ds < 0 || dk < 0 || dg < 0 || c.w < prev.w) return { ok: false, reason: 'telemetry went backwards' }
    if (ds > LIMITS.SCORE_PER_SECOND * dt + LIMITS.SCORE_BURST) return { ok: false, reason: 'score gain too fast' }
    if (dk > LIMITS.KILLS_PER_SECOND * dt + LIMITS.KILLS_BURST) return { ok: false, reason: 'kills too fast' }
    if (dg > LIMITS.GEMS_PER_SECOND * dt + LIMITS.GEMS_BURST) return { ok: false, reason: 'gems too fast' }
    if (ds > dk * LIMITS.MAX_SCORE_PER_KILL + dg * LIMITS.SCORE_PER_GEM + LIMITS.SCORE_SLACK) return { ok: false, reason: 'score not explained by kills' }
    if (Math.abs(c.w - (1 + Math.floor(c.t / LIMITS.WAVE_SECONDS))) > 1) return { ok: false, reason: 'wave does not match time' }
    prev = c
  }

  // The run must continue from the last checkpoint to the reported end, and match real elapsed time.
  const last = cps[cps.length - 1]
  const tail = Math.max(0, final.elapsed - last.t)
  if (tail > 30) return { ok: false, reason: 'telemetry ends too early' }
  if (last.t > final.elapsed + 3) return { ok: false, reason: 'telemetry longer than the run' }
  if (final.elapsed > final.serverElapsed + 5) return { ok: false, reason: 'run longer than server time' }
  if (final.score < last.s) return { ok: false, reason: 'final score below checkpoint' }
  if (final.score - last.s > LIMITS.SCORE_PER_SECOND * (tail + 1) + LIMITS.SCORE_BURST) return { ok: false, reason: 'final jump too large' }
  if (final.gems < last.g) return { ok: false, reason: 'final gems below checkpoint' }
  if (Math.abs(final.wave - (1 + Math.floor(final.elapsed / LIMITS.WAVE_SECONDS))) > 1) return { ok: false, reason: 'final wave does not match time' }
  return { ok: true }
}
