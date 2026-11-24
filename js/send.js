/* Sending finished records to Mr. Jeff.
   1. POST to the Apps Script web app (APP_CONFIG.SUBMIT_ENDPOINT), which emails the record with photos.
   2. If there is no URL, no Wi-Fi, or school Wi-Fi blocks script.google.com, the record waits in the
      iPad's outbox and is retried automatically (every minute, when Wi-Fi comes back, and on reload).
   3. Backups that need no internet setup: Download record (one HTML file with photos inside),
      Share (iPad share sheet -> Mail/AirDrop/Files with the photos attached), and a plain email summary. */
(function (root) {
  'use strict';
  var busy = false, timer = null, listeners = [], backoff = 30000;
  var endpointFn = function () { return ''; }, emailFn = function () { return ''; };

  function emit() { listeners.forEach(function (f) { try { f(); } catch (e) {} }); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function payload(pkg) {
    return JSON.stringify({
      kind: 'stem-escape-record', teacherEmail: emailFn(), record: pkg.record,
      photos: (pkg.photos || []).map(function (p) {
        return { name: p.name, stationId: p.stationId, mimeType: 'image/jpeg', data: String(p.dataUrl).split(',')[1] || '' };
      })
    });
  }

  function postOne(pkg) {
    var url = endpointFn();
    if (!url) return Promise.resolve({ ok: false, why: 'no-endpoint' });
    if (root.navigator && navigator.onLine === false) return Promise.resolve({ ok: false, why: 'offline' });
    var ctl = root.AbortController ? new AbortController() : null;
    var to = setTimeout(function () { if (ctl) ctl.abort(); }, 60000);
    /* text/plain keeps this a "simple" request: no CORS preflight, which Apps Script can't answer. */
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: payload(pkg),
                        redirect: 'follow', signal: ctl ? ctl.signal : undefined })
      .then(function (r) { return r.text(); })
      .then(function (t) {
        clearTimeout(to);
        var j; try { j = JSON.parse(t); } catch (e) { return { ok: false, why: 'bad-reply' }; }
        return j && j.ok ? { ok: true, reply: j } : { ok: false, why: (j && j.error) || 'server' };
      })
      .catch(function (e) { clearTimeout(to); return { ok: false, why: 'network' }; });
  }

  /* Shared group counter (Apps Script doGet ?action=next). Resolves {number, date}; rejects on any problem
     so the app can fall back. GET is a simple request (no preflight). rid makes a retried tap get the same number. */
  function counter(action, grade, ms, rid) {
    var url = endpointFn();
    if (!url) return Promise.reject(new Error('no-endpoint'));
    if (root.navigator && navigator.onLine === false) return Promise.reject(new Error('offline'));
    var ctl = root.AbortController ? new AbortController() : null, done = false;
    var q = url + (url.indexOf('?') < 0 ? '?' : '&') + 'action=' + encodeURIComponent(action) +
      (grade ? '&grade=' + encodeURIComponent(grade) : '') + (rid ? '&rid=' + encodeURIComponent(rid) : '') + '&t=' + Date.now();
    return new Promise(function (resolve, reject) {
      var to = setTimeout(function () { done = true; if (ctl) ctl.abort(); reject(new Error('timeout')); }, ms || 4000);
      fetch(q, { method: 'GET', redirect: 'follow', cache: 'no-store', signal: ctl ? ctl.signal : undefined })
        .then(function (r) { return r.json(); })
        .then(function (j) { clearTimeout(to); if (done) return; if (j && j.ok) resolve(j); else reject(new Error((j && j.error) || 'server')); })
        .catch(function (e) { clearTimeout(to); if (!done) reject(e); });
    });
  }
  /* Teacher mode "Check the email link": plain GET, sends no email. Resolves the script's hello ({ok, app, mailLeftToday}). */
  function ping(ms) {
    var url = endpointFn();
    if (!url) return Promise.reject(new Error('no-endpoint'));
    var ctl = root.AbortController ? new AbortController() : null;
    var to = setTimeout(function () { if (ctl) ctl.abort(); }, ms || 8000);
    return fetch(url + (url.indexOf('?') < 0 ? '?' : '&') + 't=' + Date.now(), { redirect: 'follow', cache: 'no-store', signal: ctl ? ctl.signal : undefined })
      .then(function (r) { return r.json(); })
      .then(function (j) { clearTimeout(to); if (j && j.ok && /STEM/.test(j.app || '')) return j; throw new Error('not-stem-script'); },
            function (e) { clearTimeout(to); throw e; });
  }
  function nextGroup(grade, ms, rid) {
    return counter('next', grade, ms, rid).then(function (j) {
      var n = Math.floor(+j.number);
      if (!(n >= 1 && n < 1000)) throw new Error('bad-number');
      return { number: n, date: j.date };
    });
  }

  function flush() {
    if (busy) return Promise.resolve();
    busy = true;
    return Store.outbox().then(function (items) {
      var chain = Promise.resolve(), anyFail = false;
      items.forEach(function (pkg) {
        chain = chain.then(function () {
          return postOne(pkg).then(function (res) {
            pkg.lastTry = new Date().toISOString(); pkg.lastResult = res.ok ? 'sent' : res.why;
            if (res.ok) {
              pkg.record.sentAt = pkg.lastTry; pkg.status = 'sent';
              return Store.putRecord(pkg).then(function () { return Store.delOutbox(pkg.record.recordId); });
            }
            anyFail = true; pkg.status = 'waiting';
            return Store.putOutbox(pkg).then(function () { return Store.putRecord(pkg); });
          });
        });
      });
      return chain.then(function () {
        busy = false; emit();
        clearTimeout(timer);
        if (anyFail && endpointFn()) { timer = setTimeout(flush, backoff); backoff = Math.min(backoff * 2, 10 * 60000); }
        else backoff = 30000;
      });
    }).catch(function () { busy = false; emit(); });
  }

  function submit(pkg) {
    pkg.status = 'waiting';
    return Store.putRecord(pkg).then(function () { return Store.putOutbox(pkg); }).then(flush).then(function () {
      return Store.outbox().then(function (o) { return !o.some(function (x) { return x.record.recordId === pkg.record.recordId; }); });
    });
  }

  function summaryLines(r) {
    var L = [];
    L.push('STEM Lab Escape Challenge record');
    L.push('Group ' + r.group.number + ' | ' + r.gradeLabel + ' | Route ' + r.route + (r.group.from ? ' | number from: ' + r.group.from : ''));
    L.push('Started: ' + new Date(r.startedAt).toLocaleString() + '   Finished: ' + (r.finishedAt ? new Date(r.finishedAt).toLocaleString() : '-'));
    L.push('Time: ' + r.durationText + '   Puzzle: ' + (r.puzzle.complete ? 'complete' : 'not complete') + '   Stations: ' + r.stationsDone + '/10');
    L.push('');
    r.stations.forEach(function (s) {
      var v = s.type === 'photo' ? ((s.photos || []).length ? 'photo ' + s.photos.join(', ') : 'no photo') :
              s.type === 'drag' ? (s.done ? 'pattern finished' : 'not finished') + (s.attempts ? ' (' + s.attempts.length + ' drops, ' + s.attempts.filter(function (a) { return !a.ok; }).length + ' wrong)' : '') :
              'answer: ' + (s.answer == null ? '-' : s.answer) + (s.tries && s.tries.length > 1 ? ' (tries: ' + s.tries.join(', ') + ')' : '');
      L.push(s.step + '. ' + s.place + (s.freebie ? ' (easy)' : '') + ' - ' + v + (s.skipped ? ' [skipped by teacher]' : ''));
    });
    return L;
  }

  function recordHtml(pkg) {
    var r = pkg.record, photos = {};
    (pkg.photos || []).forEach(function (p) { photos[p.name] = p.dataUrl; });
    var rows = r.stations.map(function (s) {
      var detail;
      if (s.type === 'photo') detail = (s.photos || []).filter(function (n) { return photos[n]; }).map(function (n) { return '<img src="' + photos[n] + '" alt="">'; }).join(' ') || '<i>no photo</i>';
      else if (s.type === 'drag') detail = (s.done ? 'Finished' : 'Not finished') + ' &middot; ' + (s.attempts || []).length + ' drops (' +
        (s.attempts || []).filter(function (a) { return !a.ok; }).length + ' wrong)<br><small>' +
        esc((s.attempts || []).map(function (a) { return 'spot ' + (a.blank + 1) + ': ' + a.tile + (a.ok ? ' ✓' : ' ✗'); }).join(', ')) + '</small>';
      else detail = '<b>' + esc(s.answer == null ? '-' : s.answer) + '</b>' + (s.tries && s.tries.length > 1 ? '<br><small>tries: ' + esc(s.tries.join(', ')) + '</small>' : '');
      return '<tr><td>' + s.step + '</td><td><b>' + esc(s.place) + '</b>' + (s.freebie ? ' <span class="f">easy</span>' : '') +
        '<br><small>' + esc(s.text) + '</small></td><td>' + detail + (s.skipped ? '<br><small>skipped by teacher</small>' : '') +
        '</td><td><small>' + (s.doneAt ? new Date(s.doneAt).toLocaleTimeString() : '') + '</small></td></tr>';
    }).join('');
    return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>STEM Escape - Group ' + esc(r.group.number) + '</title><style>body{font-family:-apple-system,Segoe UI,Arial,sans-serif;margin:20px;color:#222}' +
      'table{border-collapse:collapse;width:100%}td{border:1px solid #ccc;padding:6px;vertical-align:top}img{max-width:320px;border-radius:6px}' +
      '.f{background:#ffe27a;border-radius:8px;padding:0 6px;font-size:12px}</style></head><body>' +
      '<h1>STEM Lab Escape Challenge</h1><p>' + summaryLines(r).slice(1, 5).map(esc).join('<br>') + '</p>' +
      '<table><tr><th>#</th><th>Station</th><th>Result</th><th>Done</th></tr>' + rows + '</table>' +
      '<p><small>Record ' + esc(r.recordId) + ' &middot; app ' + esc(r.appVersion) + '</small></p></body></html>';
  }

  function fileName(r, ext) {
    var d = new Date(r.startedAt);
    return 'STEM-Escape_' + r.gradeLabel.replace(/\s/g, '') + '_Group' + r.group.number + '_' +
      d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2) + '.' + ext;
  }
  function download(pkg) {
    var blob = new Blob([recordHtml(pkg)], { type: 'text/html' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = fileName(pkg.record, 'html');
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }
  function dataUrlToFile(d, name) {
    var b = atob(String(d).split(',')[1] || ''), u = new Uint8Array(b.length);
    for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
    return new File([u], name, { type: 'image/jpeg' });
  }
  function canShareFiles() {
    try { return !!(navigator.canShare && navigator.canShare({ files: [new File(['x'], 'x.txt', { type: 'text/plain' })] })); } catch (e) { return false; }
  }
  function share(pkg) {
    var files = [new File([recordHtml(pkg)], fileName(pkg.record, 'html'), { type: 'text/html' })];
    (pkg.photos || []).forEach(function (p) { files.push(dataUrlToFile(p.dataUrl, p.name)); });
    return navigator.share({ title: 'STEM Escape - Group ' + pkg.record.group.number, text: summaryLines(pkg.record).join('\n'), files: files });
  }
  function mailto(pkg) {
    var r = pkg.record;
    return 'mailto:' + encodeURIComponent(emailFn() || '') + '?subject=' + encodeURIComponent('STEM Escape: ' + r.gradeLabel + ' Group ' + r.group.number) +
      '&body=' + encodeURIComponent(summaryLines(r).join('\n') + '\n\n(Photos are not in this email. They are saved on the iPad.)');
  }

  root.Send = {
    init: function (opts) {
      endpointFn = opts.endpoint; emailFn = opts.email;
      root.addEventListener && root.addEventListener('online', function () { backoff = 30000; flush(); });
      setInterval(function () { if (!busy) flush(); }, 60000);
      flush();
    },
    submit: submit, flush: flush, nextGroup: nextGroup, counter: counter, ping: ping, onChange: function (f) { listeners.push(f); },
    recordHtml: recordHtml, summaryLines: summaryLines, download: download, share: share, canShareFiles: canShareFiles, mailto: mailto,
    payload: payload
  };
})(this);
