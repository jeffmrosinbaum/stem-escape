/* STEM Lab Escape Challenge: core logic (no screen code). Works in the browser and in Node tests. */
(function (root) {
  'use strict';

  /* ---------- stations for a grade (with optional drag swaps) ---------- */
  /* swaps = { on: [drag ids turned on for this iPad], off: [drag ids turned off for this iPad] } */
  function stationsFor(grade, challenges, dragOptions, swaps) {
    var g = challenges[grade]; if (!g) throw new Error('Unknown grade ' + grade);
    var list = g.stations.map(function (s) { return Object.assign({}, s); });
    swaps = swaps || {};
    var on = {}, off = {};
    (swaps.on || []).forEach(function (id) { on[id] = 1; });
    (swaps.off || []).forEach(function (id) { off[id] = 1; });
    var used = {}, swapped = [];
    /* stations the teacher turned on for this iPad go first, so they win over a default swap for the same spot */
    var opts = ((dragOptions || {})[grade] || []).slice();
    opts.sort(function (a, b) { return (on[b.id] ? 1 : 0) - (on[a.id] ? 1 : 0); });
    opts.forEach(function (d) {
      if (!((d.enabled && !off[d.id]) || on[d.id])) return;
      var idx = -1;
      list.forEach(function (s, i) { if (s.id === d.replaces) idx = i; });
      /* a freebie can only be swapped for another easy one (swap marked freebie: true), so there are always 3; never the same station twice */
      if (idx < 0 || !!list[idx].freebie !== !!d.freebie || used[d.replaces]) return;
      used[d.replaces] = 1;
      var orig = list[idx];
      list[idx] = Object.assign({}, d, { replacedId: orig.id, at: d.at || orig.place, find: d.find || orig.find });
      swapped.push({ id: d.id, replaced: orig.id });
    });
    return { stations: list, swapped: swapped };
  }

  function validateGrade(stations) {
    var errs = [], ids = {};
    if (stations.length !== 10) errs.push('needs exactly 10 stations (has ' + stations.length + ')');
    var nf = stations.filter(function (s) { return s.freebie; }).length;
    if (nf !== 3) errs.push('needs exactly 3 freebies (has ' + nf + ')');
    stations.forEach(function (s) {
      if (ids[s.id]) errs.push('duplicate id ' + s.id); ids[s.id] = 1;
      if (['photo', 'number', 'word', 'drag'].indexOf(s.type) < 0) errs.push(s.id + ': unknown type ' + s.type);
      if (s.type === 'word' && !(s.accept && s.accept.length)) errs.push(s.id + ': word station needs accept words');
      if (s.parts && !(s.type === 'number' && s.parts.length && s.parts.every(function (p) { return p.label && p.accept && p.accept.length; }))) errs.push(s.id + ': parts need a label and accept numbers');
      if (s.type === 'drag') {
        var blanks = (s.sequence || []).filter(function (x) { return x === null; }).length;
        if (!blanks || blanks !== (s.answer || []).length) errs.push(s.id + ': blanks and answer count differ');
        (s.answer || []).forEach(function (a) { if ((s.bank || []).indexOf(a) < 0) errs.push(s.id + ': answer ' + a + ' missing from bank'); });
      }
    });
    return errs;
  }

  /* ---------- routes ----------
     A route is 10 slots: {k:'r', i} = i-th regular station, {k:'f', i} = i-th freebie.
     Freebie slots (1-based) are one early (2-4), one middle (5-7), one late (8-10), never touching.
     Regular stations follow a rotation (offset + stride, 7 is prime so every stride visits all 7).
     Routes are picked greedily so groups starting together are at different stations as much as possible. */
  function freebiePatterns() {
    var out = [];
    for (var a = 2; a <= 4; a++) for (var b = 5; b <= 7; b++) for (var c = 8; c <= 10; c++)
      if (b - a > 1 && c - b > 1) out.push([a, b, c]);
    out.sort(function (x, y) { return spreadScore(x) - spreadScore(y); });
    return out;
  }
  function spreadScore(p) { return Math.abs(p[0] - 3) + Math.abs(p[1] - 6) + Math.abs(p[2] - 9); }
  var PERMS3 = [[0, 1, 2], [1, 2, 0], [2, 0, 1], [0, 2, 1], [2, 1, 0], [1, 0, 2]];

  function makeRoute(pattern, offset, stride, perm) {
    var slots = [], r = 0, f = 0;
    for (var pos = 1; pos <= 10; pos++) {
      if (pattern.indexOf(pos) >= 0) slots.push({ k: 'f', i: perm[f++] });
      else slots.push({ k: 'r', i: (offset + stride * (r++)) % 7 });
    }
    return slots;
  }
  function cost(a, b) {
    var c = 0;
    for (var p = 0; p < 10; p++) if (a[p].k === b[p].k && a[p].i === b[p].i) c += a[p].k === 'r' ? 1 : 0.3;
    return c;
  }
  var _routes = null;
  function buildRoutes(count) {
    count = count || 12;
    if (_routes && _routes.length >= count) return _routes.slice(0, count);
    var pats = freebiePatterns(), cands = [];
    pats.forEach(function (pt) {
      for (var s = 1; s <= 6; s++) for (var o = 0; o < 7; o++) PERMS3.forEach(function (pm) { cands.push(makeRoute(pt, o, s, pm)); });
    });
    var chosen = [cands[0]];
    while (chosen.length < count) {
      var best = null, bestC = Infinity;
      for (var i = 0; i < cands.length; i++) {
        var c = 0;
        for (var j = 0; j < chosen.length && c < bestC; j++) {
          var cc = cost(cands[i], chosen[j]);
          if (cc >= 10) { c = Infinity; break; }  // identical route
          c += cc * cc;                            // punish piling up on one pair
        }
        if (c < bestC) { bestC = c; best = cands[i]; }
      }
      chosen.push(best);
    }
    _routes = chosen;
    return chosen.slice(0, count);
  }
  /* Route = group number. Groups 13+ wrap around: 13 -> Route 1, 14 -> Route 2 ... (12 routes). */
  function routeFor(groupNumber) { var n = Math.max(1, Math.floor(+groupNumber) || 1); return ((n - 1) % 12) + 1; }
  function routeStations(routeNumber, stations) {
    var routes = buildRoutes(12);
    var r = routes[(routeNumber - 1) % routes.length];
    var reg = stations.filter(function (s) { return !s.freebie; });
    var fr = stations.filter(function (s) { return s.freebie; });
    return r.map(function (slot) { return slot.k === 'r' ? reg[slot.i] : fr[slot.i]; });
  }

  /* ---------- typed answers ---------- */
  var NUMWORDS = { zero: 0, oh: 0, none: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
    twenty: 20, thirty: 30, forty: 40, fourty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
  function norm(s) { return String(s == null ? '' : s).toLowerCase().replace(/[\u2018\u2019\u201c\u201d"'`.,!?;:()]/g, '').replace(/\s+/g, ' ').trim(); }
  function parseWholeNumber(s) {
    var t = norm(s).replace(/-/g, ' ');
    if (/^\d{1,4}$/.test(t.replace(/\s/g, ''))) return parseInt(t.replace(/\s/g, ''), 10);
    var parts = t.split(' ').filter(Boolean), total = 0;
    if (!parts.length) return null;
    if (parts.length > 1 && parts[0] === 'a' && parts[1] === 'hundred') parts.splice(0, 2, 'one', 'hundred');
    var cur = 0;
    for (var i = 0; i < parts.length; i++) {
      var w = parts[i];
      if (w === 'and') continue;
      if (w === 'hundred') { cur = (cur || 1) * 100; continue; }
      if (!(w in NUMWORDS)) return null;
      cur += NUMWORDS[w];
    }
    total += cur;
    return total;
  }
  function lev(a, b) {
    var m = a.length, n = b.length, d = [], i, j;
    for (i = 0; i <= m; i++) d[i] = [i];
    for (j = 0; j <= n; j++) d[0][j] = j;
    for (i = 1; i <= m; i++) for (j = 1; j <= n; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[m][n];
  }
  /* returns { ok, value, message } */
  function checkAnswer(station, input) {
    var raw = String(input == null ? '' : input).trim();
    if (!raw) return { ok: false, value: '', message: 'empty' };
    var acc = station.accept || [];
    if (station.type === 'number') {
      var n = /\d\s*[.,\/]\s*\d/.test(raw) ? null : parseWholeNumber(raw);
      if (n === null || n < 0 || n > 9999) return { ok: false, value: raw, message: 'notnumber' };
      if (!acc.length) return { ok: true, value: n, any: true };
      var hit = acc.some(function (a) {
        var m = String(a).match(/^\s*(\d+)\s*-\s*(\d+)\s*$/);
        if (m) return n >= +m[1] && n <= +m[2];
        return parseWholeNumber(a) === n;
      });
      return { ok: hit, value: n, message: hit ? '' : 'wrong' };
    }
    if (station.type === 'word') {
      var t = norm(raw).replace(/\s/g, '');
      var ok = acc.some(function (a) {
        var w = norm(a).replace(/\s/g, '');
        return t === w || (w.length >= 5 && lev(t, w) <= 1);
      });
      return { ok: ok, value: norm(raw), message: ok ? '' : 'wrong' };
    }
    return { ok: false, value: raw, message: 'type' };
  }

  /* ---------- drag-and-drop pattern stations ---------- */
  function blankIndexes(station) {
    var out = []; (station.sequence || []).forEach(function (x, i) { if (x === null) out.push(i); }); return out;
  }
  /* blankNo = 0-based position among the blanks */
  function dragCorrect(station, blankNo, token) { return (station.answer || [])[blankNo] === token; }
  function parseTile(token) {
    var p = String(token).split(':');
    return { kind: p[0], value: p.slice(1).join(':'), name: p[1], color: p[2] };
  }

  /* ---------- puzzle ---------- */
  var COLS = 5, ROWS = 2;
  /* x, y = piece's top-left inside the board, in cell units. Snaps if within tolerance of its own cell. */
  function snapCheck(piece, x, y, tol) {
    tol = tol == null ? 0.35 : tol;
    var cx = piece % COLS, cy = Math.floor(piece / COLS);
    return Math.abs(x - cx) <= tol && Math.abs(y - cy) <= tol;
  }
  function shuffled(n, rnd) {
    rnd = rnd || Math.random;
    var a = []; for (var i = 0; i < n; i++) a.push(i);
    for (i = n - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function fmtDuration(sec) {
    sec = Math.max(0, Math.round(sec || 0));
    var h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
    return (h ? h + 'h ' : '') + m + 'm ' + (s < 10 ? '0' : '') + s + 's';
  }
  function cleanFirstName(s) {
    var w = String(s || '').trim().split(/\s+/)[0] || '';
    w = w.replace(/[^A-Za-z\u00C0-\u024F'\-]/g, '').slice(0, 15);
    return w ? w.charAt(0).toUpperCase() + w.slice(1) : '';
  }

  var api = { routeFor: routeFor, stationsFor: stationsFor, validateGrade: validateGrade, buildRoutes: buildRoutes, routeStations: routeStations,
    freebiePatterns: freebiePatterns, routeCost: cost, checkAnswer: checkAnswer, parseWholeNumber: parseWholeNumber, norm: norm,
    blankIndexes: blankIndexes, dragCorrect: dragCorrect, parseTile: parseTile, snapCheck: snapCheck, shuffled: shuffled,
    fmtDuration: fmtDuration, cleanFirstName: cleanFirstName, COLS: COLS, ROWS: ROWS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Core = api;
})(this);
