/* STEM Lab Escape Challenge: screens. Plain JavaScript, no build step. */
(function () {
  'use strict';
  var APP_VERSION = '1.0.0';
  var CFG = window.APP_CONFIG || {}, CH = window.STEM_CHALLENGES, DRAG = window.STATION_SWAPS || window.DRAG_OPTIONS || {}, PG = window.STEM_PLAYGROUNDS;
  var PUZZLE_IMG = 'art/i-love-stem.png';
  var app = document.getElementById('app'), overlay = document.getElementById('overlay');
  var params = new URLSearchParams(location.search);
  var S = Store.settings() || {};
  var st = Store.loadState();
  /* ?reset=1: clear this iPad's current run (progress, photos, answers, kept group #) and load fresh.
     ?reset=all: also erase finished records, unsent outbox and Teacher-mode settings (desktop testing). */
  if (params.get('reset')) {
    var hard = params.get('reset') === 'all';
    st = null; Store.clearState(); S.keepGroup = null; S.localCount = hard ? null : S.localCount;
    if (hard) { try { localStorage.removeItem('stemEscape.settings'); } catch (e) {} S = {}; } else Store.saveSettings(S);
    params.delete('reset');
    var fresh = location.pathname + (params.toString() ? '?' + params.toString() : '') + location.hash;
    Promise.all([Store.clearPhotos()].concat(hard ? [Store.clearRecords(), Store.clearOutbox()] : [])).then(function () { location.replace(fresh); });
    return;
  }
  var puzzleCtl = null, timerInt = null, previewStation = null;

  var COLORS = { blue: '#3a86ff', green: '#2bb24c', red: '#e63946', yellow: '#ffd60a', purple: '#8338ec', orange: '#ff8c1a', pink: '#d9668f', black: '#222', white: '#fff', brown: '#8d5524' };

  /* ---------- small helpers ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(id) { return document.getElementById(id); }
  function now() { return new Date().toISOString(); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function save() { if (st) Store.saveState(st); }
  function teacherEmail() { return S.email || CFG.TEACHER_EMAIL || ''; }
  function endpoint() { return S.endpoint || CFG.SUBMIT_ENDPOINT || ''; }
  function ghostOn() { return S.ghost == null ? CFG.PUZZLE_GHOST !== false : !!S.ghost; }
  function toast(msg, ms) { var t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(function () { t.classList.remove('show'); }, ms || 2600); }
  function gradeLabel(g) { return CH[g] ? CH[g].label : g; }
  function baseName(g) { return PG[CH[g].playground].base; }
  function stationsNow(g) { return Core.stationsFor(g, CH, DRAG, (S.swaps || {})[g]); }
  function pieceStyle(p, size) {
    return 'background-image:url(' + PUZZLE_IMG + ');background-size:' + (size * 5) + 'px ' + (size * 2) + 'px;background-position:' +
      (-(p % 5) * size) + 'px ' + (-Math.floor(p / 5) * size) + 'px';
  }
  function doneCount() { return st ? st.stations.filter(function (s) { return st.results[s.id] && st.results[s.id].doneAt; }).length : 0; }
  function currentIndex() { for (var i = 0; i < st.stations.length; i++) if (!(st.results[st.stations[i].id] || {}).doneAt) return i; return -1; }
  function speak(text) {
    try {
      var ss = window.speechSynthesis; if (!ss) return toast('Read-aloud is not available on this iPad.');
      ss.cancel();
      var u = new SpeechSynthesisUtterance(String(text).replace(/[“”]/g, '"'));
      u.rate = 0.85; u.lang = 'en-US';
      var v = ss.getVoices().filter(function (x) { return /en-US/.test(x.lang); });
      var pick = v.filter(function (x) { return /Samantha|Enhanced|Premium/.test(x.name); })[0] || v[0];
      if (pick) u.voice = pick;
      ss.speak(u);
    } catch (e) { toast('Read-aloud is not available on this iPad.'); }
  }

  /* ---------- tiles for drag stations ---------- */
  function shapeSvg(name, color) {
    var c = COLORS[color] || color || '#3a86ff', s = '#1d3557';
    var paths = {
      circle: '<circle cx="50" cy="50" r="40"/>', square: '<rect x="12" y="12" width="76" height="76" rx="6"/>',
      triangle: '<path d="M50 8 L92 88 H8z"/>', star: '<path d="M50 6 l12.5 27 29.5 3 -22 20 6.5 29 -26.5 -15 -26.5 15 6.5 -29 -22 -20 29.5 -3z"/>',
      heart: '<path d="M50 88 C10 60 6 30 26 18 C38 11 48 18 50 28 C52 18 62 11 74 18 C94 30 90 60 50 88z"/>', diamond: '<path d="M50 6 L90 50 L50 94 L10 50z"/>'
    };
    return '<svg viewBox="0 0 100 100" aria-hidden="true"><g fill="' + c + '" stroke="' + s + '" stroke-width="5" stroke-linejoin="round">' + (paths[name] || paths.circle) + '</g></svg>';
  }
  function tileInner(token) {
    var t = Core.parseTile(token);
    if (t.kind === 'c') return '<span class="dot" style="background:' + (COLORS[t.name] || t.name) + '"></span><span class="lbl">' + esc(t.name) + '</span>';
    if (t.kind === 's') return shapeSvg(t.name, t.color);
    return esc(t.value);
  }
  function tileLabel(token) { var t = Core.parseTile(token); return t.kind === 's' ? (t.color ? t.color + ' ' : '') + t.name : t.kind === 'c' ? t.name : t.value; }
  function tileClass(token) { return Core.parseTile(token).kind === 't' ? 'tile word' : 'tile'; }

  /* ---------- top bar ---------- */
  function setTop(showMap) {
    if (window.Camera) Camera.stopAll();
    $('mapBtn').hidden = !showMap;
    clearInterval(timerInt);
    var tm = $('timer');
    if (st && st.startedAt && !st.finishedAt) {
      var tick = function () { if (!st || !st.startedAt) { clearInterval(timerInt); tm.textContent = ''; return; } tm.textContent = '⏱ ' + Core.fmtDuration((Date.now() - Date.parse(st.startedAt)) / 1000); };
      tick(); timerInt = setInterval(tick, 1000);
    } else tm.textContent = '';
  }
  $('mapBtn').addEventListener('click', function () { if (st && st.phase === 'puzzle') renderPuzzle(); else renderTrail(); });
  (function longPress() {
    var b = $('brand'), t = null;
    function start() { t = setTimeout(function () { t = null; openTeacher(); }, 2000); }
    function stop() { if (t) clearTimeout(t); t = null; }
    b.addEventListener('pointerdown', start); b.addEventListener('pointerup', stop); b.addEventListener('pointerleave', stop); b.addEventListener('pointercancel', stop);
    b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  })();

  /* ---------- HOME ---------- */
  function renderHome() {
    previewStation = null; setTop(false); closeOverlay();
    var cont = '';
    if (st && st.phase !== 'done') {
      cont = '<div class="card center"><h2>Keep going, Group ' + esc(st.group.number) + '!</h2><p class="muted">' + esc(gradeLabel(st.grade)) +
        ' &middot; ' + doneCount() + ' of 10 pieces</p><button class="btn huge green" id="contBtn">▶ Continue</button>' +
        '<p class="small muted">New group on this iPad? Ask your teacher.</p></div>';
    } else if (st && st.phase === 'done') {
      cont = '<div class="card center"><h2>Group ' + esc(st.group.number) + ' finished! 🎉</h2><button class="btn ghost" id="finBtn">See the finish screen</button>' +
        ' <button class="btn" id="newBtn">New group</button></div>';
    }
    var only = params.get('grade'), gl = CH[only] ? [only] : ['1', '2', '4'];
    var picks = (!st || st.phase === 'done') ? '<h2 class="center">' + (gl.length > 1 ? 'Tap your grade to start' : 'Tap to start') + '</h2><div class="grades">' + gl.map(function (g) {
      return '<button class="grade g' + g + '" data-g="' + g + '"><b>' + g + (g === '1' ? 'st' : g === '2' ? 'nd' : 'th') + '</b><span>Grade</span><small>' +
        esc(PG[CH[g].playground].name) + '</small></button>';
    }).join('') + '</div>' : '';
    var kg = S.keepGroup && S.keepGroup.date === today() ? S.keepGroup : null;
    var keptNote = kg && (!st || st.phase === 'done') ? '<div class="kept"><b>Group ' + esc(kg.number) + '</b> is saved for ' + esc(gradeLabel(kg.grade)) +
      '. Tap ' + esc(gradeLabel(kg.grade)) + ' to start over as Group ' + esc(kg.number) + '.</div>' : '';
    app.innerHTML = '<div class="hero"><img src="' + PUZZLE_IMG + '" alt="I love STEM"></div>' + cont + keptNote + picks;
    app.querySelectorAll('[data-g]').forEach(function (b) { b.onclick = function () { app.querySelectorAll('[data-g]').forEach(function (x) { x.disabled = true; }); assignAndStart(b.dataset.g); }; });
    if ($('contBtn')) $('contBtn').onclick = function () { st.phase === 'puzzle' ? renderPuzzle() : renderTrail(); };
    if ($('finBtn')) $('finBtn').onclick = renderFinish;
    if ($('newBtn')) $('newBtn').onclick = function () { st = null; Store.clearState(); renderHome(); };
  }

  /* ---------- GROUP NUMBER (automatic) ----------
     Tap a grade -> next group number for that grade today -> Route = group number -> start. No typing.
     1. Shared counter in the Apps Script (first iPad to tap 1st grade = Group 1, next = Group 2, ...).
     2. Can't reach it (no Wi-Fi / not set up / slow)? Use the number the teacher set for this iPad, if any.
     3. Otherwise this iPad's own count for today (1, 2, 3...). The number is shown big so the teacher can check. */
  function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function localNext(g) {
    var lc = S.localCount && S.localCount.date === today() ? S.localCount : { date: today(), n: {} };
    lc.n[g] = (lc.n[g] || 0) + 1; S.localCount = lc; Store.saveSettings(S);
    return lc.n[g];
  }
  var assigning = false;
  function assignAndStart(g) {
    if (assigning || (st && st.phase !== 'done')) return;
    assigning = true; setTop(false);
    app.innerHTML = '<div class="card center"><h1>' + esc(gradeLabel(g)) + '</h1><div class="bignum wait">⏳</div><p class="prompt">Getting your group number…</p></div>';
    var kg = S.keepGroup;
    if (kg && kg.grade === g && kg.date === today()) {   // "Start over as Group N": reuse it, don't take a new number
      S.keepGroup = null; Store.saveSettings(S); assigning = false;
      startRun(g, { number: kg.number, from: (kg.from || 'kept') + ' (restarted)' }, Core.routeFor(kg.number));
      st.welcome = true; save(); return renderTrail();
    }
    var rid = uid();
    Send.nextGroup(g, CFG.COUNTER_TIMEOUT_MS || 4000, rid).then(function (r) { return { number: r.number, from: 'shared counter' }; }, function (e) {
      var fixed = Math.floor(+S.ipadGroup);
      if (fixed >= 1) return { number: fixed, from: 'teacher set this iPad', why: e && e.message };
      return { number: localNext(g), from: 'this iPad only', why: e && e.message };
    }).then(function (a) {
      assigning = false;
      startRun(g, { number: a.number, from: a.from }, Core.routeFor(a.number));
      st.welcome = true; save(); renderTrail();
    });
  }
  function startRun(g, group, route) {
    var built = stationsNow(g);
    st = { v: 1, runId: uid(), appVersion: APP_VERSION, grade: g, group: group, route: route,
      stations: Core.routeStations(route, built.stations), swapped: built.swapped,
      results: {}, pieceOrder: Core.shuffled(10), startedAt: now(), phase: 'stations', puzzle: {} };
    save(); Store.requestPersist();
    renderTrail();
  }

  /* ---------- TRAIL / PROGRESS ---------- */
  function trayHtml(newest) {
    var k = doneCount(), out = '';
    for (var i = 0; i < 10; i++) {
      if (i < k) out += '<div class="slot got' + (i === newest ? ' new' : '') + '" data-piece="' + st.pieceOrder[i] + '"></div>';
      else out += '<div class="slot"></div>';
    }
    return '<div class="tray" id="tray">' + out + '</div>';
  }
  function paintTray() {
    document.querySelectorAll('.slot.got').forEach(function (d) {
      var w = d.clientWidth || 60; d.setAttribute('style', pieceStyle(+d.dataset.piece, w));
    });
  }
  function renderTrail(newest) {
    previewStation = null; closeOverlay();
    if (!st) return renderHome();
    if (st.phase === 'puzzle') return renderPuzzle();
    if (st.phase === 'done') return renderFinish();
    setTop(false);
    var ci = currentIndex(), k = doneCount();
    var next;
    if (ci < 0) {
      next = '<div class="card center"><div style="font-size:4rem">🏕️</div><h1>All 10 pieces!</h1><p class="prompt">Go to ' + esc(baseName(st.grade)) +
        '.<br>Build the puzzle!</p><button class="btn huge green" id="pzBtn">🧩 Build the puzzle</button></div>';
    } else {
      var s = st.stations[ci];
      next = '<div class="card"><div class="small muted">Next stop: station ' + (ci + 1) + ' of 10</div><div class="next"><div class="ico">' + esc(s.icon || '⭐') + '</div><div>' +
        '<h2>' + esc(s.type === 'drag' ? s.at || s.place : s.place) + '</h2>' +
        (s.type === 'drag' ? '<span class="badge drag">🧩 ' + esc(s.place) + '</span>' : '') +
        (s.find ? '<div class="find">📍 ' + esc(s.find) + '</div>' : '') + '</div></div>' +
        refPhoto(s, st.grade) + '<button class="btn huge" id="goSt" style="margin-top:14px">We are here! ▶</button></div>';
    }
    var list = st.stations.map(function (s, i) {
      var r = st.results[s.id] || {}, cls = r.doneAt ? 'done' : (i === ci ? 'cur' : '');
      return '<li class="' + cls + '"><span class="n">' + (r.doneAt ? '✅' : i + 1) + '</span>' + esc(s.icon || '') + ' ' + esc(s.type === 'drag' ? (s.at || s.place) : s.place) +
        '</li>';
    }).join('');
    var hello = '';
    if (st.welcome || k === 0) hello = '<div class="card center hello"><div class="small muted">' + esc(gradeLabel(st.grade)) + '</div><div class="bignum">Group ' + esc(st.group.number) + '</div>' +
      '<div class="prompt">Route ' + esc(st.route) + '</div>' + (st.group.from && st.group.from !== 'shared counter' ? '<div class="small warnline">Number from ' + esc(st.group.from) + ': teacher, please check.</div>' : '') + '</div>';
    if (st.welcome) { st.welcome = false; save(); }
    app.innerHTML = hello + '<div class="card"><div class="progressline">Group ' + esc(st.group.number) +
      ' &middot; ' + k + ' of 10 puzzle pieces</div>' + trayHtml(newest) + '</div>' + next +
      '<div class="card"><h2>Your route (Route ' + esc(st.route) + ')</h2><ul class="stops">' + list + '</ul></div>';
    paintTray();
    if ($('goSt')) $('goSt').onclick = function () { renderStation(st.stations[ci]); };
    if ($('pzBtn')) $('pzBtn').onclick = function () { st.phase = 'puzzle'; save(); renderPuzzle(); };
  }

  /* ---------- STATION ---------- */
  function refSrc(s, grade) { return 'art/' + esc(grade) + '/' + esc(s.ownSpot ? s.id : (s.replacedId || s.id)) + '.jpg'; }
  function refPhoto(s, grade, solved) {
    if (s.noRef) return '';   // picture-clue station (e.g. zigzag): no photo, so the answer isn't given away
    var hide = s.refHide && !solved;
    return '<figure class="refwrap"><img class="ref' + (hide ? ' hide' : '') + '" alt="Photo of this spot (tap to make bigger)" src="' + refSrc(s, grade) +
      '" onerror="this.parentNode.remove()" onclick="this.classList.toggle(\'big\')">' +
      (hide ? '<figcaption class="small muted">Find this! The colors are hidden. Look at the real one.</figcaption>' : '') + '</figure>';
  }
  function renderStation(s, preview) {
    previewStation = preview ? s : null;
    setTop(!preview); closeOverlay();
    var grade = preview ? preview.grade : st.grade;
    var res = preview ? {} : (st.results[s.id] = st.results[s.id] || {});
    if (!preview && !res.startedAt) { res.startedAt = now(); save(); }
    var head = (preview ? '<div class="preview-banner">Teacher preview: nothing is saved. <button class="btn small ghost" id="pvBack">Back to Teacher mode</button></div>' : '') +
      '<div class="small muted">' + (preview ? 'Preview' : 'Station ' + (st.stations.indexOf(s) + 1) + ' of 10') + '</div>' +
      '<h1><span class="ico">' + esc(s.icon || '⭐') + '</span>' + esc(s.place) + '</h1>' +
      (s.type === 'drag' ? '<span class="badge drag">🧩 Drag and drop</span>' : '') +
      (s.type === 'drag' && s.at ? '<span class="badge">📍 at ' + esc(s.at) + '</span>' : '') +
      '<p class="prompt lvl' + esc(grade) + '" id="prompt">' + esc(s.text) + '</p>' +
      '<button class="say" id="sayBtn" type="button">🔊 Read it to me</button>' + refPhoto(s, grade);
    var body = '';
    if (s.type === 'photo') {
      body = shapesHelp(s) + '<div id="photoArea"></div>';
    } else if (s.type === 'number' || s.type === 'word') {
      var inAttrs = (s.type === 'number' ? 'inputmode="numeric" pattern="[0-9]*"' : 'autocapitalize="off"') + ' autocomplete="off" autocorrect="off" spellcheck="false" maxlength="20"';
      body = s.parts ?   // several numbers in one station, e.g. "how many ovals and how many triangles?"
        '<div class="parts">' + s.parts.map(function (p, k) {
          return '<label class="part"><span>' + esc(p.label) + '</span><input class="txt" id="' + (k ? 'ansIn' + k : 'ansIn') + '" ' + inAttrs + ' aria-label="' + esc(p.label) + '"></label>';
        }).join('') + '</div><div class="answer"><button class="btn green" id="ansBtn" style="min-width:160px">Check ✓</button></div><div class="fb" id="fb"></div>' :
        '<div class="answer"><input class="txt" id="ansIn" ' + inAttrs + ' aria-label="Your answer"><button class="btn green" id="ansBtn" style="min-width:160px">Check ✓</button></div><div class="fb" id="fb"></div>';
    } else if (s.type === 'drag') {
      body = dragHtml(s) + '<div class="fb" id="fb"></div>';
    }
    app.innerHTML = '<div class="card station">' + head + '<div style="margin-top:16px">' + body + '</div></div>' +
      (preview ? '' : '<div class="center"><button class="btn ghost small" id="toMap">🗺️ Back to the map</button></div>');
    if ($('pvBack')) $('pvBack').onclick = function () { previewStation = null; openTeacher(); };
    $('sayBtn').onclick = function () { speak(s.text); };
    if ($('toMap')) $('toMap').onclick = function () { renderTrail(); };
    if (CH[grade].readAloud && S.autoRead) setTimeout(function () { speak(s.text); }, 300);

    function complete(extra) {
      if (preview) { toast('Preview: this would unlock a puzzle piece.'); setTimeout(function () { openTeacher(); }, 1200); return; }
      Object.assign(res, extra || {}, { doneAt: now() }); save();
      showUnlock(s);
    }
    if (s.type === 'photo') wirePhoto(s, res, complete, preview);
    if (s.type === 'number' || s.type === 'word') {
      var tries = res.tries || [];
      var check = function () {
        var fb = $('fb'), v, r;
        if (s.parts) {
          var vals = s.parts.map(function (p, k) { return $(k ? 'ansIn' + k : 'ansIn').value; });
          if (vals.some(function (x) { return !String(x).trim(); })) { fb.className = 'fb bad'; fb.textContent = 'Type a number in every box.'; return; }
          var rs = s.parts.map(function (p, k) { return Core.checkAnswer({ type: 'number', accept: p.accept }, vals[k]); });
          v = s.parts.map(function (p, k) { return p.label + ' ' + String(vals[k]).trim(); }).join(', ');
          r = { ok: rs.every(function (x) { return x.ok; }), value: s.parts.map(function (p, k) { return p.label + ' ' + rs[k].value; }).join(', '),
                message: rs.some(function (x) { return x.message === 'notnumber'; }) ? 'notnumber' : 'wrong',
                detail: rs.some(function (x) { return x.ok; }) ? s.parts.map(function (p, k) { return p.label + (rs[k].ok ? ' ✓' : ' ✗'); }).join('  ') : '' };
        } else { v = $('ansIn').value; r = Core.checkAnswer(s, v); }
        if (!String(v).trim()) { fb.className = 'fb bad'; fb.textContent = 'Type your answer first.'; return; }
        tries.push(String(v).trim()); res.tries = tries; if (!preview) save();
        if (r.ok) {
          fb.className = 'fb good'; fb.textContent = 'Yes! 🎉' + (s.explain ? ' ' + s.explain : '');
          setTimeout(function () { complete({ answer: r.value, tries: tries }); }, s.explain ? 3500 : 600);
        }
        else {
          fb.className = 'fb bad';
          fb.textContent = r.message === 'notnumber' ? 'Type a number, like 5.' : 'Not quite. Try again!' + (r.detail ? ' (' + r.detail + ')' : '');
          if (tries.length >= (CFG.HINT_AFTER_TRIES || 2) && r.message !== 'notnumber') fb.textContent += ' Ask a grown-up for help.';
          $('ansIn').select();
        }
      };
      $('ansBtn').onclick = check;
      $('ansIn').addEventListener('keydown', function (e) { if (e.key === 'Enter') check(); });
    }
    if (s.type === 'drag') wireDrag(s, res, complete, preview);
  }

  /* photo capture: <input type=file capture> is the most reliable camera path in iPad Safari */
  function shrinkPhoto(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var max = 1024, w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, max / Math.max(w, h));
        var c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        var q = 0.72, d = c.toDataURL('image/jpeg', q);
        while (d.length > 260000 && q > 0.4) { q -= 0.1; d = c.toDataURL('image/jpeg', q); }
        resolve(d);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('Could not read that photo')); };
      img.src = url;
    });
  }
  function shapesHelp(s) {
    if (!s.shapes) return '';
    var pics = { triangle: ['<path d="M45 6 L84 64 H6z"/>', 'Triangle', '3 sides'],
               zigzag: ['<path fill="none" stroke-width="7" stroke-linecap="round" d="M6 52 L24 18 L42 52 L60 18 L78 52"/>', 'Zigzag', 'Find a BIG one!'],
                 trapezoid: ['<path d="M26 10 H64 L86 64 H4z"/>', 'Trapezoid', '4 sides, top and bottom are parallel'] };
    return '<div class="shapes">' + s.shapes.map(function (k) {
      var p = pics[k]; return '<figure' + (k === 'zigzag' ? ' class="clue"' : '') + '><svg viewBox="0 0 90 70" aria-hidden="true"><g fill="#ffe27a" stroke="#c1121f" stroke-width="5" stroke-linejoin="round">' + p[0] +
        '</g></svg><figcaption><b>' + p[1] + '</b><br><span class="small">' + p[2] + '</span></figcaption></figure>';
    }).join('') + '</div>';
  }
  /* Photos come only from the in-app live camera (js/camera.js); the photo library is not offered.
     If the camera is blocked, kids see "get your teacher". Teacher mode can allow a file-picker fallback
     (camera-first, and photos older than 2 minutes are refused). */
  function wirePhoto(s, res, complete, preview) {
    var area = $('photoArea'), need = s.photos || 1;
    var taken = (res.taken = res.taken || []), thumbs = {};
    function slotName(k) { return 'G' + (preview ? 0 : st.group.number) + '_' + (preview ? 0 : st.stations.indexOf(s) + 1) + '_' + s.id + (need > 1 ? '_' + (k + 1) : '') + '.jpg'; }
    function key(k) { return (preview ? 'preview' : st.runId) + ':' + s.id + (need > 1 ? ':' + k : ''); }
    function cur() { for (var k = 0; k < need; k++) if (!taken[k]) return k; return -1; }
    function slots() {
      if (need < 2) return '';
      var out = '<div class="slots">';
      for (var k = 0; k < need; k++) out += '<div class="pslot ' + (taken[k] ? 'done' : (k === cur() ? 'cur' : '')) + '">Photo ' + (k + 1) + ' ' +
        (taken[k] ? '✅' + (thumbs[k] ? '<img alt="" src="' + thumbs[k] + '">' : '') : '⬜') + '</div>';
      return out + '</div>';
    }
    function idle(msgHtml) {
      var k = cur();
      if (k < 0) return finish();
      area.innerHTML = slots() + (msgHtml || '') + '<button class="btn huge pink" id="openCam" type="button">📷 Open camera' + (need > 1 ? ' (photo ' + (k + 1) + ' of ' + need + ')' : '') + '</button>';
      $('openCam').onclick = openCam;
    }
    function openCam() {
      area.innerHTML = slots() + '<div id="camBox"></div>';
      Camera.open($('camBox'), { onPhoto: review, onClose: function () { idle(); }, onError: camError });
    }
    function camError(kind) {
      var why = kind === 'insecure' ? 'The camera only works on the real (https) website.' :
        kind === 'denied' ? 'The camera is turned off for this website.' :
        kind === 'busy' ? 'Another app is using the camera.' : 'The camera did not start.';
      var html = '<div class="cam-error">📷 ' + esc(why) + ' <b>Please get your teacher.</b>' +
        (kind === 'denied' ? '<div class="small" style="margin-top:6px">Teacher: tap <b>aA</b> in the address bar &gt; Website Settings &gt; Camera &gt; Allow, then try again. ' +
          '(Or Settings &gt; Apps &gt; Safari &gt; Camera &gt; Allow.)</div>' : '') + '</div>';
      area.innerHTML = slots() + html + '<div class="row" style="margin-top:10px"><button class="btn" id="retryCam" type="button">Try the camera again</button>' +
        (S.fileFallback ? '<label class="btn ghost">📷 Teacher fallback: take a photo<input type="file" accept="image/*" capture="environment" id="fbIn"></label>' : '') + '</div>';
      $('retryCam').onclick = openCam;
      if ($('fbIn')) $('fbIn').onchange = function () {
        var f = this.files && this.files[0]; if (!f) return;
        if (f.lastModified && Date.now() - f.lastModified > 120000) { toast('Please take a NEW photo with the camera.'); this.value = ''; return; }
        shrinkPhoto(f).then(review).catch(function () { toast('That photo did not work. Try again.'); });
      };
    }
    function review(d) {
      area.innerHTML = slots() + '<img class="preview" src="' + d + '" alt="Your photo"><div class="row" style="justify-content:center">' +
        '<button class="btn ghost" id="retake" type="button">↺ Take again</button>' +
        '<button class="btn green huge" id="useBtn" style="flex:1;max-width:420px">✅ Use this photo</button></div>';
      $('retake').onclick = openCam;
      $('useBtn').onclick = function () {
        var k = cur(); this.disabled = true;
        var done = function () { taken[k] = slotName(k); thumbs[k] = d; if (!preview) save(); idle(); };
        if (preview) return done();
        Store.putPhoto(key(k), d).then(done);
      };
    }
    function finish() {
      if (preview) return complete();
      complete({ photo: taken[0], photos: taken.slice(), photoKeys: taken.map(function (x, k) { return key(k); }) });
    }
    idle();
  }

  /* drag-and-drop pattern / order stations */
  function dragHtml(s) {
    var b = 0;
    var seq = s.sequence.map(function (tok) {
      if (tok === null) { var i = b++; return '<div class="' + (s.answer[i] && Core.parseTile(s.answer[i]).kind === 't' ? 'tile word' : 'tile') + ' blank" data-blank="' + i + '" aria-label="Empty spot ' + (i + 1) + '"></div>'; }
      return '<div class="' + tileClass(tok) + '" aria-label="' + esc(tileLabel(tok)) + '">' + tileInner(tok) + '</div>';
    }).join('');
    var bank = s.bank.map(function (tok) { return '<div class="' + tileClass(tok) + '" data-tok="' + esc(tok) + '" role="button" aria-label="' + esc(tileLabel(tok)) + '">' + tileInner(tok) + '</div>'; }).join('');
    return '<div class="seq" id="seq">' + seq + '</div><div class="small muted center">Drag a tile into an empty spot (or tap a tile, then tap the spot).</div><div class="bank" id="bank">' + bank + '</div>';
  }
  function wireDrag(s, res, complete, preview) {
    var filled = res.filled || {}, attempts = res.attempts || [], selected = null;
    var blanks = [].slice.call(document.querySelectorAll('#seq .blank'));
    blanks.forEach(function (el) {
      var i = +el.dataset.blank;
      if (filled[i]) fill(el, filled[i], true);
      el.addEventListener('click', function () { if (selected && !filled[i]) tryDrop(selected.dataset.tok, i, selected); });
    });
    function fill(el, tok, quiet) {
      el.classList.remove('blank'); el.classList.add('filled'); el.innerHTML = tileInner(tok); el.setAttribute('aria-label', tileLabel(tok));
      if (quiet) el.classList.remove('filled'), el.style.borderColor = '#14a865';
    }
    function allDone() { return blanks.every(function (el) { return filled[+el.dataset.blank]; }); }
    function tryDrop(tok, i, srcEl, ghost) {
      var ok = Core.dragCorrect(s, i, tok), el = blanks[i], fb = $('fb');
      attempts.push({ blank: i, tile: tileLabel(tok), ok: ok, at: now() });
      res.attempts = attempts;
      if (ok) {
        filled[i] = tok; res.filled = filled; fill(el, tok);
        if (ghost) ghost.remove();
        fb.className = 'fb good'; fb.textContent = allDone() ? 'You finished the pattern! 🎉' : 'Yes! Keep going.';
        if (!preview) save();
        if (allDone()) setTimeout(function () { complete({ attempts: attempts, filled: filled, wrongDrops: attempts.filter(function (a) { return !a.ok; }).length }); }, 800);
      } else {
        el.classList.remove('wrong'); void el.offsetWidth; el.classList.add('wrong');
        fb.className = 'fb bad'; fb.textContent = 'Not that one. Look at the pattern and try again!';
        if (ghost && srcEl) {
          var r = srcEl.getBoundingClientRect(); ghost.classList.add('back'); ghost.style.left = r.left + 'px'; ghost.style.top = r.top + 'px';
          setTimeout(function () { ghost.remove(); }, 320);
        } else if (ghost) ghost.remove();
        if (!preview) save();
      }
      if (selected) { selected.classList.remove('sel'); selected = null; }
    }
    function blankAt(x, y) {
      for (var k = 0; k < blanks.length; k++) {
        var i = +blanks[k].dataset.blank; if (filled[i]) continue;
        var r = blanks[k].getBoundingClientRect(), pad = 18;
        if (x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad) return i;
      }
      return -1;
    }
    document.querySelectorAll('#bank .tile').forEach(function (src) {
      var ghost = null, pid = null, sx = 0, sy = 0, offX = 0, offY = 0, moved = false;
      src.addEventListener('pointerdown', function (e) {
        if (pid !== null) return;
        e.preventDefault(); pid = e.pointerId; try { src.setPointerCapture(pid); } catch (er) {}
        var r = src.getBoundingClientRect(); sx = e.clientX; sy = e.clientY; offX = e.clientX - r.left; offY = e.clientY - r.top; moved = false;
        ghost = src.cloneNode(true); ghost.classList.add('floating'); ghost.style.left = r.left + 'px'; ghost.style.top = r.top + 'px';
        ghost.style.width = r.width + 'px'; ghost.style.height = r.height + 'px'; ghost.style.display = 'none';
        document.body.appendChild(ghost);
      });
      src.addEventListener('pointermove', function (e) {
        if (e.pointerId !== pid || !ghost) return;
        e.preventDefault();
        if (!moved && Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) > 8) { moved = true; ghost.style.display = ''; }
        if (!moved) return;
        ghost.style.left = (e.clientX - offX) + 'px'; ghost.style.top = (e.clientY - offY) + 'px';
        var i = blankAt(e.clientX, e.clientY);
        blanks.forEach(function (b) { b.classList.toggle('hover', +b.dataset.blank === i); });
      });
      function up(e) {
        if (e.pointerId !== pid) return;
        pid = null; blanks.forEach(function (b) { b.classList.remove('hover'); });
        if (!moved) {   // a tap: select this tile, then tap a spot
          if (ghost) ghost.remove(); ghost = null;
          if (selected) selected.classList.remove('sel');
          selected = selected === src ? null : src; if (selected) selected.classList.add('sel');
          return;
        }
        var i = e.type === 'pointercancel' ? -1 : blankAt(e.clientX, e.clientY);
        if (i < 0) {
          var r = src.getBoundingClientRect(); ghost.classList.add('back'); ghost.style.left = r.left + 'px'; ghost.style.top = r.top + 'px';
          var gg = ghost; setTimeout(function () { gg.remove(); }, 320);
        } else tryDrop(src.dataset.tok, i, src, ghost);
        ghost = null;
      }
      src.addEventListener('pointerup', up); src.addEventListener('pointercancel', up);
    });
  }

  function showUnlock(s) {
    var k = doneCount(), p = st.pieceOrder[k - 1], last = k >= 10;
    overlay.innerHTML = '<div class="card unlock"><h1>You got a puzzle piece! 🧩</h1><div class="piece" style="' + pieceStyle(p, 180) + '"></div>' +
      (s && s.refHide ? '<p class="small">You matched the real ' + esc((s.at || s.place).toLowerCase()) + '!</p><img class="ref" style="margin:0 auto" alt="" src="' + refSrc(s, st.grade) + '" onerror="this.remove()">' : '') +
      '<p class="progressline">' + k + ' of 10 pieces</p>' +
      '<button class="btn huge green" id="nextBtn">' + (last ? 'Go to Base Camp! 🏕️' : 'Next station ▶') + '</button></div>';
    overlay.hidden = false;
    $('nextBtn').onclick = function () { closeOverlay(); renderTrail(k - 1); };
  }
  function closeOverlay() { overlay.hidden = true; overlay.innerHTML = ''; }

  /* ---------- PUZZLE ---------- */
  function renderPuzzle() {
    if (!st) return renderHome();
    setTop(true);
    if (puzzleCtl) puzzleCtl.destroy();
    st.puzzle = st.puzzle || {};
    if (!st.puzzle.startedAt) { st.puzzle.startedAt = now(); save(); }
    var done = st.puzzle.locked && st.puzzle.locked.length === 10;
    app.innerHTML = '<div class="pz-wrap"><h2 class="center" style="margin:0">Build the picture! <span class="small muted">(' + esc(baseName(st.grade)) + ')</span></h2>' +
      '<div id="pz" style="width:100%"></div><div class="pz-bar"><button class="btn ghost" id="hintBtn">💡 Hint</button>' +
      '<button class="btn green" id="subBtn" ' + (done ? '' : 'disabled') + '>✅ Finish and send</button></div>' +
      '<div class="small muted center" id="pzMsg">' + (done ? 'You did it!' : 'Drag each piece to its spot. It clicks in when it is right.') + '</div></div>';
    puzzleCtl = Puzzle.mount($('pz'), {
      image: PUZZLE_IMG, ghost: ghostOn(), state: st.puzzle, reserve: 250,
      onChange: function () { save(); },
      onComplete: function () { st.puzzle.doneAt = st.puzzle.doneAt || now(); save(); $('subBtn').disabled = false; $('pzMsg').textContent = 'You did it! Tap Finish and send.'; toast('Puzzle complete! 🎉'); }
    });
    $('hintBtn').onclick = function () { puzzleCtl.hint(); };
    $('subBtn').onclick = function () { if (!this.disabled) submitRun(); };
  }

  /* ---------- SUBMIT ---------- */
  function buildRecord() {
    var stations = st.stations.map(function (s, i) {
      var r = st.results[s.id] || {};
      return { step: i + 1, id: s.id, place: s.place, at: s.at || '', text: s.text, type: s.type, freebie: !!s.freebie, replacedId: s.replacedId || '',
        startedAt: r.startedAt || '', doneAt: r.doneAt || '', done: !!r.doneAt, skipped: !!r.skipped,
        answer: r.answer == null ? null : r.answer, tries: r.tries || [], photo: r.photo || '', photos: r.photos || (r.photo ? [r.photo] : []),
        photoKeys: r.photoKeys || (r.photo ? [st.runId + ':' + s.id] : []), attempts: r.attempts || null };
    });
    var fin = st.finishedAt || now();
    return { recordId: st.runId, appVersion: APP_VERSION, grade: st.grade, gradeLabel: gradeLabel(st.grade), playground: PG[CH[st.grade].playground].name,
      base: baseName(st.grade), group: st.group, route: st.route, swapped: st.swapped || [], startedAt: st.startedAt, finishedAt: fin,
      durationSec: Math.round((Date.parse(fin) - Date.parse(st.startedAt)) / 1000),
      durationText: Core.fmtDuration((Date.parse(fin) - Date.parse(st.startedAt)) / 1000),
      stationsDone: stations.filter(function (x) { return x.done; }).length, stations: stations,
      puzzle: { complete: !!(st.puzzle.locked && st.puzzle.locked.length === 10), piecesPlaced: (st.puzzle.locked || []).length, moves: st.puzzle.moves || 0,
                hints: st.puzzle.hints || 0, startedAt: st.puzzle.startedAt || '', doneAt: st.puzzle.doneAt || '' },
      teacherEmail: teacherEmail(), device: navigator.userAgent };
  }
  function buildPackage() {
    var rec = buildRecord(), photos = [];
    var chain = Promise.resolve();
    rec.stations.forEach(function (s) {
      var keys = s.photoKeys || [];
      (s.photos || []).forEach(function (name, k) {
        chain = chain.then(function () { return Store.getPhoto(keys[k]).then(function (d) { if (d) photos.push({ name: name, stationId: s.id, dataUrl: d }); }); });
      });
      delete s.photoKeys;
    });
    return chain.then(function () { return { record: rec, photos: photos }; });
  }
  function submitRun() {
    st.finishedAt = st.finishedAt || now(); st.phase = 'done'; save();
    app.innerHTML = '<div class="card center"><h1>Sending to ' + esc(CFG.SIGNATURE || 'your teacher') + '…</h1><p>Hang on!</p></div>';
    buildPackage().then(function (pkg) {
      st.lastPackageId = pkg.record.recordId; save();
      return Send.submit(pkg).then(function (sent) { st.sent = !!sent; save(); renderFinish(); });
    });
  }
  function renderFinish() {
    setTop(false);
    if (!st) return renderHome();
    var sentMsg = st.sent ? '<p class="fb good">✅ Emailed to your teacher!</p>' :
      (endpoint() ? '<p class="fb" id="sendMsg">📮 Saved on this iPad. Not emailed yet: it will send when there is Wi-Fi.</p>' :
        '<div class="emailwarn" id="sendMsg">⚠️ <b>Email is not set up, so nothing was emailed.</b> The record is saved on this iPad.<br>' +
        '<span class="small">Teacher: paste your Apps Script web app URL into js/config.js (SUBMIT_ENDPOINT) or Teacher mode &gt; Sending. For now use <b>Download record</b>.</span></div>');
    app.innerHTML = '<div class="card center"><div style="font-size:4rem">🎉</div><h1>You escaped, Group ' + esc(st.group.number) + '!</h1>' +
      '<img src="' + PUZZLE_IMG + '" alt="I love STEM" style="width:min(600px,100%);border-radius:14px">' +
      '<p class="progressline">Time: ' + esc(Core.fmtDuration((Date.parse(st.finishedAt) - Date.parse(st.startedAt)) / 1000)) + '</p>' + sentMsg +
      '<p class="small muted">Show this screen to your teacher.</p>' +
      '<div class="row" style="justify-content:center"><button class="btn ghost small" id="dlBtn">⬇️ Download record</button>' +
      (Send.canShareFiles() ? '<button class="btn ghost small" id="shBtn">📤 Share with photos</button>' : '') +
      '<a class="btn ghost small" id="mtBtn" href="#">✉️ Open in Mail app (text only)</a></div>' +
      '<p class="small muted">"Open in Mail app" only opens a draft in this device\'s Mail app; you still press Send. It does nothing if no Mail app is set up.</p></div>';
    if (!st.sent && endpoint()) Store.outbox().then(function (ob) {   // say why it hasn't sent
      var p = ob.filter(function (x) { return x.record.recordId === st.lastPackageId; })[0], m = $('sendMsg');
      if (!p || !m || !p.lastResult || p.lastResult === 'sent') return;
      var why = { offline: 'this iPad has no Wi-Fi', network: 'the school network may be blocking script.google.com, or the URL is wrong',
        'bad-reply': 'the Apps Script URL did not answer like the STEM script (check the URL ends in /exec and access is "Anyone")' }[p.lastResult] ||
        ('the Apps Script said: ' + p.lastResult);
      m.innerHTML = '📮 <b>Not emailed yet</b>: ' + esc(why) + '. It is saved on this iPad and will keep trying. Teacher mode &gt; Send now to retry.';
      m.className = 'emailwarn';
    });
    var withPkg = function (fn) { buildPackage().then(fn); };
    $('dlBtn').onclick = function () { withPkg(Send.download); };
    if ($('shBtn')) $('shBtn').onclick = function () { withPkg(function (p) { Send.share(p).catch(function () {}); }); };
    $('mtBtn').onclick = function (e) { e.preventDefault(); withPkg(function (p) { location.href = Send.mailto(p); }); };
  }

  /* ---------- TEACHER MODE ---------- */
  function qrImg(text) {
    try { var q = qrcode(0, 'M'); q.addData(text); q.make(); return q.createDataURL(6, 2); } catch (e) { return ''; }
  }
  function siteUrl() {
    var here = location.origin + location.pathname.replace(/index\.html$/, '');
    if (/^https:/.test(location.protocol) && !/localhost|127\.0\.0\.1/.test(location.host)) return here;
    return CFG.APP_URL;
  }
  function openTeacher() {
    previewStation = null;
    Promise.all([Store.outbox(), Store.records()]).then(function (r) { renderTeacher(r[0], r[1]); });
  }
  function renderTeacher(outbox, records) {
    var cur = st ? 'Group ' + esc(st.group.number) + ' &middot; ' + esc(gradeLabel(st.grade)) + ' &middot; Route ' + esc(st.route) + ' &middot; ' + doneCount() + '/10 &middot; ' + esc(st.phase) : 'No group playing on this iPad.';
    var swaps = ['1', '2', '4'].map(function (g) {
      var sw = (S.swaps || {})[g] || { on: [], off: [] };
      return '<div><b>' + gradeLabel(g) + '</b>' + (DRAG[g] || []).map(function (d) {
        var orig = CH[g].stations.filter(function (x) { return x.id === d.replaces; })[0] || {};
        var active = (d.enabled && sw.off.indexOf(d.id) < 0) || sw.on.indexOf(d.id) >= 0;
        return '<label class="row small" style="gap:8px"><input type="checkbox" data-sw="' + g + '|' + d.id + '" ' + (active ? 'checked' : '') + '> ' + (d.idea ? '💡 ' : '') + esc(d.place) +
          ' (' + esc(d.text.slice(0, 40)) + '…) replaces <i>' + esc(orig.place || d.replaces) + '</i>' + (d.enabled ? ' <span class="badge">default</span>' : '') + '</label>';
      }).join('') + '</div>';
    }).join('');
    var routes = Core.buildRoutes(12);
    var gsel = st ? st.grade : '1';
    var url = siteUrl();
    var qrs = ['', '1', '2', '4'].map(function (g) {
      var u = url + (g ? '?grade=' + g : '');
      return '<figure><img alt="" src="' + qrImg(u) + '"><figcaption class="small">' + (g ? gradeLabel(g) : 'Any grade') + '</figcaption></figure>';
    }).join('');
    var recs = records.sort(function (a, b) { return a.record.startedAt < b.record.startedAt ? 1 : -1; }).map(function (p) {
      var waiting = outbox.some(function (o) { return o.record.recordId === p.record.recordId; });
      return '<div class="rec"><span>' + esc(p.record.gradeLabel) + ' Group ' + esc(p.record.group.number) + ' &middot; ' + esc(new Date(p.record.startedAt).toLocaleString()) +
        ' &middot; ' + (waiting ? '📮 waiting to send' : '✅ sent') + '</span><button class="btn small ghost" data-dl="' + esc(p.record.recordId) + '">Download</button>' +
        (Send.canShareFiles() ? '<button class="btn small ghost" data-sh="' + esc(p.record.recordId) + '">Share</button>' : '') + '</div>';
    }).join('') || '<p class="muted small">No finished groups yet.</p>';
    overlay.innerHTML = '<div class="card teacher"><div class="row" style="justify-content:space-between"><h1>Teacher mode</h1><button class="btn ghost small" id="tClose">Close ✕</button></div>' +
      '<p class="small muted">App ' + APP_VERSION + '. Changes here only affect this iPad.' + (Store.persistent() ? '' : ' <b>Storage is limited on this iPad (Private Browsing?): keep this tab open.</b>') + '</p>' +
      '<h2>This group</h2><p>' + cur + '</p><div class="row">' +
      (st && st.phase === 'stations' && currentIndex() >= 0 ? '<button class="btn small orange" id="tSkip">Unlock current station</button>' : '') +
      (st && st.phase === 'stations' ? '<button class="btn small orange" id="tAll">Unlock all → puzzle</button>' : '') +
      (st && st.phase === 'puzzle' ? '<button class="btn small orange" id="tSolve">Solve puzzle</button>' : '') +
      (st ? '<button class="btn small pink" id="tNew">End this group (start a new one)</button>' : '') + '</div>' +
      (st && st.phase === 'stations' ? '<div class="row"><label class="small">Change this group\'s number: <input class="txt mini" id="tNum" type="number" min="1" max="99" value="' + esc(st.group.number) + '"></label>' +
        '<button class="btn small" id="tNumBtn" type="button">Change</button></div><p class="small muted">If no station is done yet, the route changes to match.</p>' : '') +
      '<h2>Group numbers</h2><p class="small">Kids just tap their grade. The shared counter (in the Apps Script) gives Group 1, 2, 3… per grade, and starts over each day. Route = group number (13 → Route 1).</p>' +
      '<div id="tCount" class="small muted">Checking the shared counter…</div>' +
      '<div class="row"><button class="btn small pink" id="tCReset" type="button">Reset today\'s counter (all grades)</button></div>' +
      '<label class="row small">If the counter can\'t be reached, this iPad is group <input class="txt mini" id="tIpad" type="number" min="1" max="99" value="' + esc(S.ipadGroup || '') + '" placeholder="auto"></label>' +
      '<p class="small muted">Blank = this iPad counts by itself (1, 2, 3… today' + (S.localCount && S.localCount.date === today() ? ': so far ' + esc(JSON.stringify(S.localCount.n)) : '') + ').</p>' +
      '<h2>Sending</h2><label class="field"><span>Teacher email</span><input class="txt" id="tEmail" type="email" value="' + esc(teacherEmail()) + '" placeholder="you@school.org"></label>' +
      '<label class="field"><span>Apps Script web app URL</span><input class="txt" id="tUrl" value="' + esc(endpoint()) + '" placeholder="https://script.google.com/macros/s/…/exec"></label>' +
      (endpoint() ? '' : '<div class="emailwarn">⚠️ <b>Email is not set up on this iPad.</b> Finished groups are saved here but NOT emailed until you paste the Apps Script web app URL above (see README, "Email setup").</div>') +
      '<div id="tPing" class="small muted"></div>' +
      '<div class="row"><button class="btn small" id="tSave">Save</button><button class="btn small ghost" id="tPingBtn" type="button">Check the email link</button><button class="btn small ghost" id="tSend">Send waiting records now (' + outbox.length + ')</button></div>' +
      '<h2>Finished groups on this iPad</h2>' + recs +
      '<h2>Swap-in stations (this iPad)</h2><div class="row"><button class="btn small" id="tRec" type="button">Use the recommended set</button>' +
      '<button class="btn small ghost" id="tDef" type="button">Back to defaults</button></div><p class="small muted">💡 = suggestion (draft wording). Takes effect for the next new group.</p>' + swaps +
      '<h2>Options</h2><label class="row small"><input type="checkbox" id="tGhost" ' + (ghostOn() ? 'checked' : '') + '> Faint picture under the puzzle grid</label>' +
      '<label class="row small"><input type="checkbox" id="tFile" ' + (S.fileFallback ? 'checked' : '') + '> If the camera is blocked, allow a backup photo button (Safari&#39;s picker; refuses photos older than 2 minutes, but on some iPads it can still show the photo library)</label>' +
      '<label class="row small"><input type="checkbox" id="tRead" ' + (S.autoRead ? 'checked' : '') + '> Read each station aloud automatically (1st &amp; 2nd)</label>' +
      '<h2>Preview stations</h2><div class="row"><select class="sel" id="tGrade">' + ['1', '2', '4'].map(function (g) { return '<option value="' + g + '"' + (g === gsel ? ' selected' : '') + '>' + gradeLabel(g) + '</option>'; }).join('') +
      '</select></div><div id="tList"></div>' +
      '<h2>Start QR codes</h2><p class="small">' + esc(url) + (url === CFG.APP_URL ? ' <b>(placeholder until the site is hosted)</b>' : '') + '</p><div class="qrs">' + qrs + '</div>' +
      '<h2>Routes</h2><div id="tRoutes"></div>' +
      '<h2>Reset</h2><button class="btn small pink" id="tReset">Erase everything on this iPad</button></div>';
    overlay.hidden = false;
    function list() {
      var g = $('tGrade').value, sts = stationsNow(g).stations;
      $('tList').innerHTML = sts.map(function (s, i) {
        var ans = s.parts ? 'needs: ' + s.parts.map(function (p) { return p.label + ' ' + p.accept.join('/'); }).join(', ') : s.type === 'number' ? (s.accept && s.accept.length ? 'needs: ' + s.accept.join(', ') : 'any whole number') :
          s.type === 'word' ? 'accepts: ' + s.accept.join(', ') : s.type === 'drag' ? 'answer: ' + s.answer.map(tileLabel).join(', ') : 'photo';
        return '<div class="rec"><span>' + esc(s.icon) + ' <b>' + esc(s.place) + '</b>' + (s.freebie ? ' <span class="small muted">(easy)</span>' : '') + ' <span class="small muted">' + esc(s.type) + ', ' + esc(ans) + '</span></span>' +
          '<button class="btn small ghost" data-pv="' + i + '">Try it</button></div>';
      }).join('');
      $('tList').querySelectorAll('[data-pv]').forEach(function (b) { b.onclick = function () { closeOverlay(); renderStation(sts[+b.dataset.pv], { grade: g }); }; });
      var reg = sts.filter(function (s) { return !s.freebie; }), fr = sts.filter(function (s) { return s.freebie; });
      $('tRoutes').innerHTML = '<table><tr><th>Route</th>' + [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (n) { return '<th>' + n + '</th>'; }).join('') + '</tr>' +
        routes.map(function (r, i) {
          return '<tr><td><b>' + (i + 1) + '</b></td>' + r.map(function (sl) { var s = sl.k === 'r' ? reg[sl.i] : fr[sl.i]; return '<td>' + esc(s.type === 'drag' ? (s.at || s.place) : s.place) + (s.freebie ? ' *' : '') + '</td>'; }).join('') + '</tr>';
        }).join('') + '</table>';
    }
    list(); $('tGrade').onchange = list;
    $('tClose').onclick = function () { closeOverlay(); resume(); };
    $('tPingBtn').onclick = function () {
      var o = $('tPing'); o.textContent = 'Checking…';
      Send.ping().then(function (j) { o.innerHTML = '✅ The email link works (no email sent). Emails left today on that Google account: ' + esc(j.mailLeftToday) + '.'; },
        function (e) {
          var m = e && e.message;
          o.innerHTML = '⚠️ ' + (m === 'no-endpoint' ? 'No Apps Script URL yet. Paste it above and tap Save.' :
            m === 'not-stem-script' ? 'That URL answered, but it is not the STEM Escape script. Check it ends in /exec.' :
            'Could not reach it: check the URL, that access is set to "Anyone", and that school Wi-Fi allows script.google.com.');
        });
    };
    $('tSave').onclick = function () { S.email = $('tEmail').value.trim(); S.endpoint = $('tUrl').value.trim(); Store.saveSettings(S); toast('Saved'); Send.flush(); };
    $('tSend').onclick = function () { Send.flush().then(function () { toast('Tried sending.'); openTeacher(); }); };
    $('tGhost').onchange = function () { S.ghost = this.checked; Store.saveSettings(S); };
    $('tRec').onclick = function () {
      S.swaps = {}; Object.keys(window.RECOMMENDED || {}).forEach(function (g) { S.swaps[g] = { on: window.RECOMMENDED[g].slice(), off: [] }; });
      Store.saveSettings(S); toast('Recommended set on for this iPad'); openTeacher();
    };
    Send.counter('peek', '', 4000).then(function (j) {
      $('tCount').textContent = 'Shared counter today (' + j.date + '): ' + ['1', '2', '4'].map(function (g) { return gradeLabel(g) + ' ' + ((j.counts || {})[g] || 0) + ' groups'; }).join(', ');
    }, function (e) { $('tCount').textContent = 'Shared counter not reachable (' + (e && e.message) + '). Using the fallback below.'; });
    $('tCReset').onclick = function () {
      if (!confirm("Start today's group numbers over at 1 for every grade?")) return;
      S.localCount = null; Store.saveSettings(S);
      Send.counter('reset', '', 6000).then(function () { toast('Counter reset. Next group is Group 1.'); openTeacher(); },
        function () { toast('This iPad reset. Shared counter could not be reached.'); openTeacher(); });
    };
    $('tIpad').onchange = function () { var v = Math.floor(+this.value); S.ipadGroup = v >= 1 ? v : null; Store.saveSettings(S); toast(v >= 1 ? 'Fallback: Group ' + v : 'Fallback: count on this iPad'); };
    if ($('tNumBtn')) $('tNumBtn').onclick = function () {
      var v = Math.floor(+$('tNum').value); if (!(v >= 1 && v < 100)) return toast('Type a number 1-99');
      st.group.number = v; st.group.from = 'teacher changed';
      if (doneCount() === 0) { var b2 = stationsNow(st.grade); st.route = Core.routeFor(v); st.stations = Core.routeStations(st.route, b2.stations); st.swapped = b2.swapped; }
      save(); toast('Now Group ' + v + ', Route ' + st.route); openTeacher();
    };
    $('tDef').onclick = function () { S.swaps = {}; Store.saveSettings(S); toast('Defaults restored'); openTeacher(); };
    $('tFile').onchange = function () { S.fileFallback = this.checked; Store.saveSettings(S); };
    $('tRead').onchange = function () { S.autoRead = this.checked; Store.saveSettings(S); };
    overlay.querySelectorAll('[data-sw]').forEach(function (c) {
      c.onchange = function () {
        var p = c.dataset.sw.split('|'), g = p[0], id = p[1], d = DRAG[g].filter(function (x) { return x.id === id; })[0];
        S.swaps = S.swaps || {}; var sw = S.swaps[g] = S.swaps[g] || { on: [], off: [] };
        sw.on = sw.on.filter(function (x) { return x !== id; }); sw.off = sw.off.filter(function (x) { return x !== id; });
        if (c.checked && !d.enabled) sw.on.push(id);
        if (!c.checked && d.enabled) sw.off.push(id);
        Store.saveSettings(S); list();
      };
    });
    var find = function (id) { return records.filter(function (p) { return p.record.recordId === id; })[0]; };
    overlay.querySelectorAll('[data-dl]').forEach(function (b) { b.onclick = function () { Send.download(find(b.dataset.dl)); }; });
    overlay.querySelectorAll('[data-sh]').forEach(function (b) { b.onclick = function () { Send.share(find(b.dataset.sh)).catch(function () {}); }; });
    if ($('tSkip')) $('tSkip').onclick = function () {
      var s = st.stations[currentIndex()]; var r = st.results[s.id] = st.results[s.id] || {}; r.skipped = true; r.doneAt = now(); save(); closeOverlay(); showUnlock();
    };
    if ($('tAll')) $('tAll').onclick = function () {
      st.stations.forEach(function (s) { var r = st.results[s.id] = st.results[s.id] || {}; if (!r.doneAt) { r.skipped = true; r.doneAt = now(); } });
      st.phase = 'puzzle'; save(); closeOverlay(); renderPuzzle();
    };
    if ($('tSolve')) $('tSolve').onclick = function () { closeOverlay(); if (puzzleCtl) puzzleCtl.solveAll(); };
    if ($('tNew')) $('tNew').onclick = function () {
      if (!confirm('End Group ' + st.group.number + ' on this iPad and start fresh? Finished records stay saved.')) return;
      st = null; Store.clearState(); closeOverlay(); renderHome();
    };
    $('tReset').onclick = function () {
      var msg = outbox.length ? outbox.length + ' record(s) have NOT been sent yet. Download them first! Erase anyway?' : 'Erase all groups, photos and records on this iPad?';
      if (!confirm(msg)) return;
      Promise.all([Store.clearPhotos(), Store.clearRecords(), Store.clearOutbox()]).then(function () {
        st = null; Store.clearState(); try { localStorage.removeItem('stemEscape.settings'); } catch (e) {} S = {}; closeOverlay(); renderHome(); toast('This iPad is reset.');
      });
    };
  }
  function resume() {
    if (previewStation) return;
    if (!st) return renderHome();
    if (st.phase === 'puzzle') renderPuzzle(); else if (st.phase === 'done') renderFinish(); else renderTrail();
  }

  /* ---------- Start over (every screen, press and hold 2 s) ---------- */
  var HOLD_MS = 2000;
  (function restartHold() {
    var b = $('restartBtn'), t0 = 0, raf = null, fired = false;
    function paint(p) { b.style.setProperty('--p', p); }
    function stop() { if (raf) cancelAnimationFrame(raf); raf = null; b.classList.remove('holding'); paint(0); }
    function tick() {
      var p = Math.min(1, (Date.now() - t0) / HOLD_MS); paint(p);
      if (p >= 1) { stop(); fired = true; openRestart(); } else raf = requestAnimationFrame(tick);
    }
    b.addEventListener('pointerdown', function (e) {
      e.preventDefault(); fired = false; t0 = Date.now(); b.classList.add('holding');
      try { b.setPointerCapture(e.pointerId); } catch (x) {}
      raf = requestAnimationFrame(tick);
    });
    b.addEventListener('pointerup', function () { var short = raf && !fired; stop(); if (short) toast('Press and hold for 2 seconds to start over'); });
    b.addEventListener('pointercancel', stop);
    b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    b.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openRestart(); } });
  })();
  function openRestart() {
    if (window.Camera) Camera.stopAll();
    Store.outbox().then(function (ob) {
      var live = st && st.phase !== 'done', n = st ? st.group.number : null;
      var unsent = ob.length ? '<div class="unsent">📮 <b>' + ob.length + ' finished record' + (ob.length > 1 ? 's have' : ' has') + ' not been sent yet.</b> ' +
        'Starting over keeps ' + (ob.length > 1 ? 'them' : 'it') + ' saved on this iPad, but you can download ' + (ob.length > 1 ? 'them' : 'it') + ' first to be safe.' +
        '<div class="row" style="margin-top:8px">' + ob.map(function (p) {
          return '<button class="btn small" type="button" data-rdl="' + esc(p.record.recordId) + '">⬇ Download ' + esc(p.record.gradeLabel) + ' Group ' + esc(p.record.group.number) + '</button>';
        }).join('') + '</div></div>' : '';
      var body, choices;
      if (live) {
        body = '<p>This erases <b>Group ' + esc(n) + '</b>’s progress, photos and answers on this iPad (' + doneCount() + ' of 10 pieces) and goes back to the grade screen.</p>';
        choices = '<button class="btn huge green" id="rKeep" type="button">↺ Start over as Group ' + esc(n) + '</button>' +
          '<button class="btn" id="rNew" type="button">Start over as a new group (gets the next number)</button>';
      } else if (st) {
        body = '<p>Group ' + esc(n) + ' is finished and its record is saved. Go back to the grade screen for a new group?</p>';
        choices = '<button class="btn huge green" id="rNew" type="button">↺ Start a new group</button>';
      } else {
        body = '<p>Nothing in progress on this iPad. Reload the app fresh?</p>';
        choices = '<button class="btn huge green" id="rNew" type="button">↺ Reload fresh</button>';
      }
      overlay.innerHTML = '<div class="card sheet" role="dialog" aria-label="Start over"><h1>Start over?</h1>' + unsent + body +
        '<div class="choices">' + choices + '<button class="btn ghost" id="rCancel" type="button">Cancel, keep going</button></div></div>';
      overlay.hidden = false;
      overlay.querySelectorAll('[data-rdl]').forEach(function (b) {
        b.onclick = function () { var p = ob.filter(function (x) { return x.record.recordId === b.dataset.rdl; })[0]; if (p) Send.download(p); };
      });
      $('rCancel').onclick = function () { closeOverlay(); resume(); };
      if ($('rKeep')) $('rKeep').onclick = function () { doRestart(true); };
      $('rNew').onclick = function () { doRestart(false); };
    });
  }
  function doRestart(keep) {
    S.keepGroup = keep && st ? { grade: st.grade, number: st.group.number, from: String(st.group.from || '').replace(/ \(restarted\)$/, ''), date: today() } : null;
    Store.saveSettings(S);
    st = null; clearInterval(timerInt); Store.clearState(); closeOverlay();
    /* finished records already carry their own copies of the photos, so clearing the photo store is safe */
    Store.clearPhotos().then(function () {
      params.delete('reset'); params.delete('teacher');
      location.replace(location.pathname + (params.toString() ? '?' + params.toString() : ''));
    });
  }

  /* ---------- send status badge ---------- */
  function badge() {
    Store.outbox().then(function (o) {
      var b = $('sendBadge'); b.hidden = !o.length; b.textContent = '📮 ' + o.length + ' waiting';
      if (st && st.phase === 'done' && !st.sent && st.lastPackageId && !o.some(function (x) { return x.record.recordId === st.lastPackageId; })) {
        st.sent = true; save(); if (app.querySelector('#dlBtn')) renderFinish();
      }
    });
  }

  /* ---------- start ---------- */
  Send.init({ endpoint: endpoint, email: teacherEmail });
  Send.onChange(badge);
  Store.ready().then(function () {
    if (!Store.persistent()) { var w = $('warn'); w.hidden = false; w.textContent = 'This iPad can’t save for later (Private Browsing?). Keep this tab open until you finish.'; }
    badge();
  });
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }
  if (st) resume();
  else renderHome();
  if (params.get('teacher') === '1') openTeacher();
  window.__stem = { state: function () { return st; }, settings: function () { return S; } };   // for tests
})();
