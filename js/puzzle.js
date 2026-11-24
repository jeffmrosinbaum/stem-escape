/* Final 10-piece puzzle (5 x 2). Pointer Events so finger, Apple Pencil and mouse all work.
   Positions are kept in "cell" units (board top-left = 0,0) so the layout survives rotating the iPad. */
(function (root) {
  'use strict';
  var COLS = 5, ROWS = 2;

  function mount(el, opts) {
    var state = opts.state;   // { pos: {piece: [x,y]}, locked: [ids], moves }
    var img = opts.image, cell = 100, pieces = [], stage, board, grid, trayZone;
    if (!state.pos) {
      state.pos = {}; state.locked = []; state.moves = 0;
      var order = Core.shuffled(10);
      order.forEach(function (p, k) { state.pos[p] = trayXY(k); });
    }
    function trayXY(k) { return [(k % COLS) * 1.0 + (Math.random() * 0.08 - 0.04), 2.3 + Math.floor(k / COLS) * 1.08]; }

    el.innerHTML = '';
    stage = document.createElement('div'); stage.className = 'pz-stage';
    board = document.createElement('div'); board.className = 'pz-board';
    if (opts.ghost) { var g = document.createElement('div'); g.className = 'pz-ghost'; g.style.backgroundImage = 'url(' + img + ')'; board.appendChild(g); }
    grid = document.createElement('div'); grid.className = 'pz-grid';
    for (var i = 0; i < 10; i++) grid.appendChild(document.createElement('div'));
    board.appendChild(grid);
    trayZone = document.createElement('div'); trayZone.className = 'pz-trayzone';
    stage.appendChild(board); stage.appendChild(trayZone);
    el.appendChild(stage);

    for (var p = 0; p < 10; p++) {
      var d = document.createElement('div'); d.className = 'pz-piece'; d.dataset.piece = p;
      d.style.backgroundImage = 'url(' + img + ')';
      d.setAttribute('role', 'img'); d.setAttribute('aria-label', 'Puzzle piece');
      stage.appendChild(d); pieces.push(d); wire(d, p);
    }

    function layout() {
      var availW = Math.min(el.clientWidth || root.innerWidth - 32, 1080);
      var availH = Math.max(320, root.innerHeight - (opts.reserve || 230));
      cell = Math.floor(Math.min(availW / COLS, availH / 4.5));
      stage.style.width = cell * COLS + 'px'; stage.style.height = Math.round(cell * 4.5) + 'px';
      board.style.width = cell * COLS + 'px'; board.style.height = cell * ROWS + 'px';
      trayZone.style.top = Math.round(cell * 2.2) + 'px'; trayZone.style.width = cell * COLS + 'px'; trayZone.style.height = Math.round(cell * 2.3) + 'px';
      pieces.forEach(function (d, p) {
        d.style.width = cell + 'px'; d.style.height = cell + 'px';
        d.style.backgroundSize = (cell * COLS) + 'px ' + (cell * ROWS) + 'px';
        d.style.backgroundPosition = (-(p % COLS) * cell) + 'px ' + (-Math.floor(p / COLS) * cell) + 'px';
        place(d, p);
      });
    }
    function place(d, p) {
      var xy = state.pos[p];
      d.style.left = Math.round(xy[0] * cell) + 'px'; d.style.top = Math.round(xy[1] * cell) + 'px';
      d.classList.toggle('locked', state.locked.indexOf(p) >= 0);
    }
    function wire(d, p) {
      var sx, sy, ox, oy, dragging = false, pid = null;
      d.addEventListener('pointerdown', function (e) {
        if (state.locked.indexOf(p) >= 0 || pid !== null) return;
        e.preventDefault();
        pid = e.pointerId; try { d.setPointerCapture(pid); } catch (er) {}
        dragging = true; sx = e.clientX; sy = e.clientY; ox = state.pos[p][0]; oy = state.pos[p][1];
        d.classList.add('drag');
      });
      d.addEventListener('pointermove', function (e) {
        if (!dragging || e.pointerId !== pid) return;
        e.preventDefault();
        var x = ox + (e.clientX - sx) / cell, y = oy + (e.clientY - sy) / cell;
        x = Math.max(-0.2, Math.min(COLS - 0.8, x)); y = Math.max(-0.2, Math.min(4.5 - 0.8, y));
        state.pos[p] = [x, y]; place(d, p);
      });
      function end(e) {
        if (!dragging || e.pointerId !== pid) return;
        dragging = false; pid = null; d.classList.remove('drag');
        var xy = state.pos[p];
        if (Math.abs(xy[0] - ox) > 0.02 || Math.abs(xy[1] - oy) > 0.02) state.moves++;
        if (Core.snapCheck(p, xy[0], xy[1], 0.35)) {
          state.pos[p] = [p % COLS, Math.floor(p / COLS)];
          state.locked.push(p); place(d, p);
          if (opts.onSnap) opts.onSnap(p);
        }
        if (opts.onChange) opts.onChange(state);
        if (state.locked.length === 10 && opts.onComplete) { stage.classList.add('pz-done'); opts.onComplete(state); }
      }
      d.addEventListener('pointerup', end);
      d.addEventListener('pointercancel', end);
    }
    function hint() {
      var left = []; for (var p = 0; p < 10; p++) if (state.locked.indexOf(p) < 0) left.push(p);
      if (!left.length) return;
      var p = left[Math.floor(Math.random() * left.length)];
      var cellEl = grid.children[p], pe = pieces[p];
      cellEl.classList.add('hint'); pe.classList.add('glow');
      setTimeout(function () { cellEl.classList.remove('hint'); pe.classList.remove('glow'); }, 3200);
      state.hints = (state.hints || 0) + 1; if (opts.onChange) opts.onChange(state);
    }
    function solveAll() {   // teacher only
      for (var p = 0; p < 10; p++) if (state.locked.indexOf(p) < 0) { state.pos[p] = [p % COLS, Math.floor(p / COLS)]; state.locked.push(p); }
      layout(); if (opts.onChange) opts.onChange(state); if (opts.onComplete) opts.onComplete(state);
    }
    var onR = function () { layout(); };
    root.addEventListener('resize', onR);
    layout();
    return { hint: hint, solveAll: solveAll, layout: layout, destroy: function () { root.removeEventListener('resize', onR); },
             cellSize: function () { return cell; }, stage: stage };
  }
  root.Puzzle = { mount: mount };
})(this);
