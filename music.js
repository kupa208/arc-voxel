/* Procedural background music: one short, recognisable theme per map, generated with the Web Audio API (no audio files).
 * Usage: var m = ARC_MUSIC.create({ getCtx: () => AudioContext, isMuted: () => boolean }); m.setMap('korea'); m.setMode('play'); m.start();
 */
(function () {
  'use strict';

  // One entry per map id. root = MIDI note, scale = semitone offsets, prog = chord roots (scale degrees) per bar.
  var SPECS = {
    vietnam: { seed: 11, root: 50, scale: [0, 2, 4, 7, 9], bpm: 98, prog: [0, 3, 4, 2], lead: 'triangle', bass: 'sine', rhythm: 'straight', pluck: true },
    singapore: { seed: 23, root: 52, scale: [0, 2, 4, 5, 7, 9, 11], bpm: 118, prog: [0, 5, 3, 4], lead: 'square', bass: 'triangle', rhythm: 'busy', kick: 'four' },
    korea: { seed: 37, root: 49, scale: [0, 3, 5, 7, 10], bpm: 126, prog: [0, 3, 1, 4], lead: 'sawtooth', bass: 'square', rhythm: 'busy', kick: 'four' },
    uae: { seed: 41, root: 50, scale: [0, 1, 4, 5, 7, 8, 10], bpm: 92, prog: [0, 6, 5, 0], lead: 'triangle', bass: 'sine', rhythm: 'straight', drone: true },
    india: { seed: 53, root: 48, scale: [0, 1, 4, 5, 7, 8, 11], bpm: 84, prog: [0, 0, 3, 4], lead: 'triangle', bass: 'sine', rhythm: 'sparse', drone: true, pluck: true },
    france: { seed: 61, root: 53, scale: [0, 2, 4, 6, 7, 9, 11], bpm: 108, prog: [0, 4, 1, 3], lead: 'sine', bass: 'triangle', rhythm: 'straight' },
    brasil: { seed: 71, root: 55, scale: [0, 2, 4, 7, 9], bpm: 104, prog: [0, 2, 3, 1], lead: 'triangle', bass: 'sine', rhythm: 'syncopated', kick: 'samba' },
    argentina: { seed: 83, root: 45, scale: [0, 2, 3, 5, 7, 8, 11], bpm: 88, prog: [0, 5, 3, 4], lead: 'sawtooth', bass: 'triangle', rhythm: 'syncopated', soft: true },
    turkiye: { seed: 97, root: 47, scale: [0, 1, 3, 5, 7, 8, 10], bpm: 100, prog: [0, 1, 0, 6], lead: 'triangle', bass: 'sine', rhythm: 'busy', kick: 'samba' },
    bangladesh: { seed: 101, root: 52, scale: [0, 2, 3, 5, 7, 9, 10], bpm: 96, prog: [0, 3, 6, 4], lead: 'triangle', bass: 'sine', rhythm: 'straight', pluck: true },
    nigeria: { seed: 113, root: 50, scale: [0, 3, 5, 7, 10], bpm: 108, prog: [0, 3, 0, 4], lead: 'square', bass: 'triangle', rhythm: 'syncopated', kick: 'samba' },
    kenya: { seed: 127, root: 51, scale: [0, 2, 4, 5, 7, 9, 10], bpm: 112, prog: [0, 6, 3, 4], lead: 'triangle', bass: 'sine', rhythm: 'straight', kick: 'four' },
  };
  var STEPS = 64; // 4 bars of 16 steps
  var themeCache = {};

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  function degreeToMidi(spec, deg) {
    var n = spec.scale.length;
    var oct = Math.floor(deg / n);
    var idx = ((deg % n) + n) % n;
    return spec.root + spec.scale[idx] + 12 * oct;
  }

  /* Builds the fixed 64-step melody and bass line for a map once, so every map keeps its own tune. */
  function buildTheme(id) {
    if (themeCache[id]) return themeCache[id];
    var spec = SPECS[id] || SPECS.vietnam;
    var rnd = mulberry32(spec.seed);
    var n = spec.scale.length;
    var lead = [];
    var bass = [];
    var cur = n + 1;
    var syncopated = [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0];
    for (var i = 0; i < STEPS; i++) {
      var bar = Math.floor(i / 16);
      var chord = spec.prog[bar % spec.prog.length];
      var s = i % 16;
      var play;
      if (spec.rhythm === 'syncopated') play = syncopated[s] === 1 && rnd() > 0.1;
      else if (spec.rhythm === 'sparse') play = (s % 4 === 0 && rnd() > 0.15) || (s % 8 === 6 && rnd() > 0.5);
      else if (spec.rhythm === 'busy') play = s % 2 === 0 ? rnd() > 0.12 : rnd() > 0.7;
      else play = s % 2 === 0 ? rnd() > 0.28 : false;
      if (play) {
        if (s % 4 === 0) { // strong beats land on a chord tone
          var tone = [0, 2, 4][Math.floor(rnd() * 3)];
          cur = chord + tone + (rnd() < 0.35 ? n : 0);
        } else {
          cur += [-2, -1, -1, 1, 1, 2][Math.floor(rnd() * 6)];
        }
        cur = Math.max(n - 2, Math.min(n * 2 + 2, cur));
        lead.push(cur);
      } else {
        lead.push(-1000);
      }
      if (s % 4 === 0) bass.push(chord - n); else if (spec.rhythm === 'busy' && s % 4 === 2 && rnd() > 0.4) bass.push(chord - n); else bass.push(-1000);
    }
    themeCache[id] = { spec: spec, lead: lead, bass: bass };
    return themeCache[id];
  }

  function create(opts) {
    var ctx = null;
    var master = null;
    var noiseBuf = null;
    var timer = null;
    var themeId = 'vietnam';
    var mode = 'lobby'; // 'lobby' (title / after a run) or 'play'
    var wave = 1;
    var step = 0;
    var nextTime = 0;
    var running = false;

    function ensure() {
      if (ctx) return ctx;
      ctx = opts.getCtx();
      if (!ctx) return null;
      master = ctx.createGain();
      master.gain.value = 0.0001;
      master.connect(ctx.destination);
      return ctx;
    }

    function tone(t, midi, dur, type, vol, pluck) {
      var osc = ctx.createOscillator();
      var g = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(hz(midi), t);
      var d = pluck ? Math.min(dur, 0.22) : dur;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0005, t + d);
      osc.connect(g);
      g.connect(master);
      osc.start(t);
      osc.stop(t + d + 0.05);
    }

    function kick(t, vol) {
      var osc = ctx.createOscillator();
      var g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(130, t);
      osc.frequency.exponentialRampToValueAtTime(42, t + 0.13);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0005, t + 0.16);
      osc.connect(g);
      g.connect(master);
      osc.start(t);
      osc.stop(t + 0.2);
    }

    function hat(t, vol) {
      if (!noiseBuf) {
        noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.05), ctx.sampleRate);
        var d = noiseBuf.getChannelData(0);
        for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      var src = ctx.createBufferSource();
      var g = ctx.createGain();
      src.buffer = noiseBuf;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0005, t + 0.045);
      src.connect(g);
      g.connect(master);
      src.start(t);
    }

    function scheduleStep(t, idx) {
      var th = buildTheme(themeId);
      var spec = th.spec;
      var stepDur = 60 / spec.bpm / 4;
      var play = mode === 'play';
      var s = idx % STEPS;
      var leadDeg = th.lead[s];
      var calm = !play;
      // melody: in the lobby only every other note is played, and quieter
      if (leadDeg > -999 && (play || (s % 4 === 0 || s % 8 === 6))) {
        tone(t, degreeToMidi(spec, leadDeg) + 12, stepDur * (spec.pluck ? 2 : 3.2), spec.lead, (calm ? 0.026 : 0.036) * (spec.soft ? 0.8 : 1), spec.pluck);
      }
      var bassDeg = th.bass[s];
      if (bassDeg > -999) {
        tone(t, degreeToMidi(spec, bassDeg), stepDur * 3.4, spec.bass, calm ? 0.05 : 0.07, false);
      }
      if (spec.drone && s % 16 === 0) {
        tone(t, spec.root - 12, stepDur * 16, 'sine', calm ? 0.022 : 0.03, false);
        tone(t, spec.root - 5, stepDur * 16, 'sine', calm ? 0.012 : 0.018, false);
      }
      if (play) {
        var k = spec.kick;
        var s16 = s % 16;
        if (k === 'four' && s16 % 4 === 0) kick(t, 0.11);
        else if (k === 'samba' && (s16 === 0 || s16 === 6 || s16 === 10)) kick(t, 0.1);
        else if (!k && (s16 === 0 || s16 === 8)) kick(t, 0.07);
        if (wave >= 3 && s16 % 4 === 2) hat(t, 0.02);
        if (wave >= 6 && s16 % 2 === 1) hat(t, 0.012);
        if (wave >= 9 && leadDeg > -999 && s16 % 4 === 2) tone(t + stepDur * 0.5, degreeToMidi(spec, leadDeg) + 19, stepDur * 1.2, spec.lead, 0.014, true)
      }
    }

    function tick() {
      if (!running || !ctx) return;
      if (ctx.state === 'suspended') { nextTime = ctx.currentTime + 0.08; return; }
      var spec = buildTheme(themeId).spec;
      var stepDur = 60 / spec.bpm / 4;
      var guard = 0;
      while (nextTime < ctx.currentTime + 0.25 && guard++ < 16) {
        scheduleStep(nextTime, step);
        nextTime += stepDur;
        step = (step + 1) % STEPS;
      }
    }

    function fadeTo(v, sec) {
      if (!master || !ctx) return;
      try { master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setTargetAtTime(v, ctx.currentTime, sec); } catch (e) { /* ignore */ }
    }

    return {
      start: function () {
        if (opts.isMuted()) return;
        if (!ensure()) return;
        if (ctx.state === 'suspended' && ctx.resume) { try { ctx.resume(); } catch (e) { /* needs a user gesture */ } }
        if (!running) {
          running = true;
          step = 0;
          nextTime = ctx.currentTime + 0.1;
          timer = setInterval(tick, 40);
        }
        fadeTo(0.9, 0.25);
      },
      stop: function () {
        if (!running) return;
        running = false;
        if (timer) { clearInterval(timer); timer = null; }
        fadeTo(0.0001, 0.08);
      },
      setMap: function (id) {
        if (!SPECS[id] || id === themeId) return;
        themeId = id;
        step = 0;
        if (ctx) nextTime = ctx.currentTime + 0.1;
      },
      setMode: function (m) { mode = m === 'play' ? 'play' : 'lobby'; },
      setWave: function (w) { wave = w | 0; },
      isRunning: function () { return running; },
      ids: function () { return Object.keys(SPECS); },
      _tick: tick,
    };
  }

  window.ARC_MUSIC = { create: create };
}());
