/* In-app live camera (no photo library). Uses getUserMedia, which needs a secure page:
   https:// (any real hosting) or http://localhost. Rear camera first; kids can switch.
   Every stream is stopped when the screen changes, the app is hidden, or a photo is taken. */
(function (root) {
  'use strict';
  var live = [];
  function stopAll() {
    live.forEach(function (c) { try { c.stop(); } catch (e) {} });
    live = [];
  }
  function supported() { return !!(root.isSecureContext !== false && navigator.mediaDevices && navigator.mediaDevices.getUserMedia); }
  function errKind(e) {
    var n = e && e.name;
    if (n === 'NotAllowedError' || n === 'SecurityError' || n === 'PermissionDeniedError') return 'denied';
    if (n === 'NotFoundError' || n === 'DevicesNotFoundError' || n === 'OverconstrainedError') return 'nocamera';
    if (n === 'NotReadableError' || n === 'AbortError') return 'busy';
    return 'other';
  }
  function grab(video) {
    var w = video.videoWidth, h = video.videoHeight;
    if (!w || !h) return null;
    var k = Math.min(1, 1024 / Math.max(w, h)), c = document.createElement('canvas');
    c.width = Math.round(w * k); c.height = Math.round(h * k);
    c.getContext('2d').drawImage(video, 0, 0, c.width, c.height);
    var q = 0.72, d = c.toDataURL('image/jpeg', q);
    while (d.length > 260000 && q > 0.4) { q -= 0.1; d = c.toDataURL('image/jpeg', q); }
    return d;
  }
  /* open(el, { onPhoto(dataUrl), onError(kind) }) -> controller */
  function open(el, opts) {
    stopAll();
    var facing = 'environment', stream = null, stopped = false;
    el.innerHTML = '<div class="cam"><video playsinline autoplay muted></video><div class="cam-msg">Starting the camera…</div></div>' +
      '<div class="cam-bar"><button class="btn ghost" type="button" data-cam="switch" aria-label="Switch camera" hidden>🔄</button>' +
      '<button class="btn huge pink" type="button" data-cam="shoot" disabled>📸 Take photo</button>' +
      '<button class="btn ghost" type="button" data-cam="close" aria-label="Close camera">✕</button></div>';
    var video = el.querySelector('video'), msg = el.querySelector('.cam-msg');
    var shoot = el.querySelector('[data-cam=shoot]'), sw = el.querySelector('[data-cam=switch]');
    var ctl = {
      stop: function () {
        stopped = true;
        if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
        stream = null; try { video.srcObject = null; } catch (e) {}
      }
    };
    live.push(ctl);
    function start(constraints) {
      if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
      shoot.disabled = true; msg.hidden = false; msg.textContent = 'Starting the camera…';
      return navigator.mediaDevices.getUserMedia(constraints).then(function (s) {
        if (stopped) { s.getTracks().forEach(function (t) { t.stop(); }); return; }
        stream = s; video.srcObject = s;
        video.classList.toggle('mirror', facing === 'user');
        var p = video.play(); if (p && p.catch) p.catch(function () {});
        var ready = function () { if (video.videoWidth) { msg.hidden = true; shoot.disabled = false; } };
        video.onloadedmetadata = ready; video.onplaying = ready; setTimeout(ready, 600);
        if (navigator.mediaDevices.enumerateDevices) navigator.mediaDevices.enumerateDevices().then(function (d) {
          sw.hidden = d.filter(function (x) { return x.kind === 'videoinput'; }).length < 2;
        }).catch(function () {});
      });
    }
    function begin() {
      if (!supported()) { ctl.stop(); return opts.onError('insecure'); }
      start({ audio: false, video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1440 } } })
        .catch(function (e) {
          if (errKind(e) === 'nocamera') return start({ audio: false, video: true });
          throw e;
        })
        .catch(function (e) { ctl.stop(); opts.onError(errKind(e), e); });
    }
    shoot.onclick = function () {
      var d = grab(video); if (!d) return;
      ctl.stop(); opts.onPhoto(d);
    };
    sw.onclick = function () { facing = facing === 'environment' ? 'user' : 'environment'; begin(); };
    el.querySelector('[data-cam=close]').onclick = function () { ctl.stop(); if (opts.onClose) opts.onClose(); };
    begin();
    return ctl;
  }
  document.addEventListener('visibilitychange', function () { if (document.hidden) stopAll(); });
  root.addEventListener('pagehide', stopAll);
  root.Camera = { open: open, stopAll: stopAll, supported: supported, active: function () { return live.length; } };
})(this);
