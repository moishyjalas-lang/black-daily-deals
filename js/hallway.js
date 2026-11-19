/* Everyday Black Friday — the hallway backdrop.
 *
 * The showroom hallway sits BEHIND every page. As the shopper scrolls
 * down through the deals, the room walks forward around them: each scene
 * eases into the next, so the whole site feels like one long stroll
 * through the store.
 *
 * No controls, no captions, no counter. It is scenery, not a page.
 * The readability scrim lives in css/stage.css and sits on top of this,
 * underneath the content, so text stays easy to read.
 */
(function () {
  'use strict';

  var BASE = '/showroom/images/';

  /* The route, in order — the same walk MJ laid out. */
  var SCENES = [
    '0', 'added-0', 'added-1', '1',
    'extension-01', 'extension-02', 'extension-03', 'extension-04',
    'variety-0', 'category-1', 'extension-06', 'category-3',
    'extension-08', 'variety-1', 'category-2', 'extension-10',
    'extension-11', 'added-2', 'variety-2', 'category-4',
    'extension-13', 'extension-14', 'added-3', '2',
    'added-4', 'added-5', '3', 'added-6',
    'added-7', 'added-12', 'added-13', 'extension-15',
    'extension-16', 'extension-17', 'extension-18', 'added-14',
    'extension-19', 'extension-20', 'extension-21', 'extension-22',
    'extension-23', 'added-15', 'extension-24', 'extension-25',
    'extension-26', 'extension-27', '4', 'extension-28',
    'extension-29', 'extension-30', 'extension-31', 'extension-32',
    'added-8', 'added-9', '5', 'added-10',
    'category-5', 'extension-34', 'extension-35', 'added-11'
  ];

  var last = SCENES.length - 1;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  var layer, front, back;
  var position = 0, current = -1, frame = 0, lastTime = 0;
  var cache = {};

  function src(i) { return BASE + SCENES[Math.max(0, Math.min(last, i))] + '.jpg'; }

  /* Pull the next few scenes down quietly so the walk never stutters. */
  function warm(i) {
    for (var n = i; n <= i + 2 && n <= last; n++) {
      if (!cache[n]) { cache[n] = new Image(); cache[n].src = src(n); }
    }
  }

  function build() {
    layer = document.createElement('div');
    layer.className = 'hallway';
    layer.setAttribute('aria-hidden', 'true');

    front = document.createElement('img');
    back = document.createElement('img');
    front.alt = '';
    back.alt = '';
    back.style.opacity = '0';
    front.src = src(0);
    back.src = src(1);

    layer.appendChild(front);
    layer.appendChild(back);
    document.body.insertBefore(layer, document.body.firstChild);
    warm(0);
  }

  /* How far down the page we are, 0 to 1. */
  function progress() {
    var doc = document.documentElement;
    var runway = (doc.scrollHeight || 0) - window.innerHeight;
    if (runway <= 40) return 0;
    var y = window.pageYOffset || doc.scrollTop || 0;
    return Math.max(0, Math.min(1, y / runway));
  }

  function target() { return progress() * last; }

  function paint() {
    var index = Math.min(last, Math.floor(position));
    var frac = position - index;

    if (index !== current) {
      front.src = src(index);
      back.src = src(index + 1);
      back.style.opacity = '0';
      current = index;
      warm(index);
    }

    /* Ease the next scene in over the back half of each step. */
    var blend = Math.max(0, Math.min(1, (frac - 0.3) / 0.7));
    blend = blend * blend * (3 - 2 * blend);
    back.style.opacity = (back.complete && back.naturalWidth) ? blend : 0;

    /* A gentle push forward, so it reads as walking rather than sliding. */
    var push = 1 + frac * 0.05;
    front.style.transform = 'scale(' + push + ')';
    back.style.transform = 'scale(' + (push + 0.02) + ')';
  }

  function render(time) {
    frame = 0;
    var elapsed = lastTime ? Math.min(64, time - lastTime) : 16;
    lastTime = time;

    var want = target();
    var gap = want - position;

    /* Follow the scroll closely, but smooth out the jitter. */
    position += gap * (1 - Math.exp(-elapsed / 90));
    if (Math.abs(want - position) < 0.0005) position = want;

    paint();

    if (Math.abs(target() - position) > 0.0005) {
      frame = requestAnimationFrame(render);
    } else {
      lastTime = 0;
    }
  }

  function queue() { if (!frame) frame = requestAnimationFrame(render); }

  function start() {
    if (!document.body || document.querySelector('.hallway')) return;
    build();

    if (reduced.matches) { position = 0; paint(); return; }

    position = target();
    paint();
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue, { passive: true });
    back.addEventListener('load', queue);
    front.addEventListener('load', queue);
    queue();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
