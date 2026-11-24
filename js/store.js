/* Saving on the iPad.
   - Small game state: localStorage (falls back to memory if Safari blocks storage).
   - Photos, finished records and the send queue: IndexedDB (photos are too big for localStorage).
   If IndexedDB is not available (very old Safari private mode) everything lives in memory and the
   app warns "Keep this tab open". */
(function (root) {
  'use strict';
  var LS_KEY = 'stemEscape.v1', SET_KEY = 'stemEscape.settings', DB = 'stemEscape', VER = 1;
  var mem = {}, memDb = { photos: {}, outbox: {}, records: {} }, db = null, dbFailed = false, lsOk = true;

  try { localStorage.setItem('stemEscape.t', '1'); localStorage.removeItem('stemEscape.t'); } catch (e) { lsOk = false; }

  function getJSON(k, d) {
    try { var v = lsOk ? localStorage.getItem(k) : mem[k]; return v ? JSON.parse(v) : d; } catch (e) { return d; }
  }
  function setJSON(k, v) {
    var s = JSON.stringify(v);
    if (lsOk) { try { localStorage.setItem(k, s); return true; } catch (e) { lsOk = false; } }
    mem[k] = s; return false;
  }

  function openDb() {
    if (db || dbFailed) return Promise.resolve(db);
    return new Promise(function (res) {
      var done = false;
      function fin(v) { if (!done) { done = true; res(v); } }
      try {
        if (!root.indexedDB) { dbFailed = true; return fin(null); }
        var rq = root.indexedDB.open(DB, VER);
        rq.onupgradeneeded = function () {
          var d = rq.result;
          ['photos', 'outbox', 'records'].forEach(function (n) { if (!d.objectStoreNames.contains(n)) d.createObjectStore(n); });
        };
        rq.onsuccess = function () { db = rq.result; fin(db); };
        rq.onerror = function () { dbFailed = true; fin(null); };
        rq.onblocked = function () { dbFailed = true; fin(null); };
        setTimeout(function () { if (!done) { dbFailed = true; fin(null); } }, 4000);
      } catch (e) { dbFailed = true; fin(null); }
    });
  }
  function tx(store, mode, fn) {
    return openDb().then(function (d) {
      if (!d) return fn(null);
      return new Promise(function (res, rej) {
        try {
          var t = d.transaction(store, mode), os = t.objectStore(store), out;
          var r = fn(os); if (r && 'onsuccess' in r) r.onsuccess = function () { out = r.result; };
          t.oncomplete = function () { res(out); };
          t.onerror = t.onabort = function () { rej(t.error); };
        } catch (e) { rej(e); }
      });
    });
  }
  function put(store, key, val) {
    return tx(store, 'readwrite', function (os) { if (!os) { memDb[store][key] = val; return null; } return os.put(val, key); })
      .catch(function () { memDb[store][key] = val; });
  }
  function get(store, key) {
    return tx(store, 'readonly', function (os) { return os ? os.get(key) : null; })
      .then(function (v) { return v === undefined || v === null ? memDb[store][key] : v; })
      .catch(function () { return memDb[store][key]; });
  }
  function del(store, key) {
    delete memDb[store][key];
    return tx(store, 'readwrite', function (os) { return os ? os.delete(key) : null; }).catch(function () {});
  }
  function all(store) {
    return tx(store, 'readonly', function (os) { return os ? os.getAll() : null; })
      .then(function (v) { var m = Object.keys(memDb[store]).map(function (k) { return memDb[store][k]; }); return (v || []).concat(m); })
      .catch(function () { return Object.keys(memDb[store]).map(function (k) { return memDb[store][k]; }); });
  }
  function clearStore(store) {
    memDb[store] = {};
    return tx(store, 'readwrite', function (os) { return os ? os.clear() : null; }).catch(function () {});
  }

  var api = {
    loadState: function () { return getJSON(LS_KEY, null); },
    saveState: function (s) { return setJSON(LS_KEY, s); },
    clearState: function () { try { localStorage.removeItem(LS_KEY); } catch (e) {} delete mem[LS_KEY]; },
    settings: function () { return getJSON(SET_KEY, {}); },
    saveSettings: function (s) { return setJSON(SET_KEY, s); },
    putPhoto: function (key, dataUrl) { return put('photos', key, dataUrl); },
    getPhoto: function (key) { return get('photos', key); },
    clearPhotos: function () { return clearStore('photos'); },
    putOutbox: function (rec) { return put('outbox', rec.record.recordId, rec); },
    delOutbox: function (id) { return del('outbox', id); },
    outbox: function () { return all('outbox'); },
    putRecord: function (rec) { return put('records', rec.record.recordId, rec); },
    records: function () { return all('records'); },
    clearRecords: function () { return clearStore('records'); },
    clearOutbox: function () { return clearStore('outbox'); },
    ready: openDb,
    persistent: function () { return lsOk && !dbFailed; },
    requestPersist: function () { try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {} }
  };
  root.Store = api;
})(this);
