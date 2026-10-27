import { MAX_ATTACK_DICE, MAX_DEFENSE_DICE, rollDice, resolve } from './rules.js';
import * as sound from './audio.js';

// Position des points sur une grille 3×3, pour chaque valeur.
const PIPS = { 1: [4], 2: [2, 6], 3: [2, 4, 6], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
// Rotation du cube [X, Y] qui amène chaque face devant (voir .f1 à .f6 dans style.css).
const ORIENT = { 1: [0, 0], 2: [0, -90], 3: [-90, 0], 4: [90, 0], 5: [0, 90], 6: [0, 180] };
const ROMAN = ['I', 'II', 'III'];

// Chaque carte existe en deux versions : assets/cards/<id>-passive.webp et <id>-aggressive.webp,
// avec un cri de guerre dans assets/cries/<id>.mp3.
const CARDS = {
  attack: [
    { id: 'red-murat', name: 'Maréchal Murat' },
    { id: 'red-redcoat', name: 'Grenadier anglais' },
    { id: 'red-lancer', name: 'Lancier rouge' },
    { id: 'red-moore', name: 'Général Moore' },
  ],
  defense: [
    { id: 'blue-napoleon', name: 'Napoléon' },
    { id: 'blue-ney', name: 'Maréchal Ney' },
    { id: 'blue-grognard', name: 'Grognard' },
    { id: 'blue-hussar', name: 'Hussard' },
  ],
};

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const T = (ms) => (reducedMotion ? Math.round(ms * 0.35) : ms);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const vibrate = (pattern) => navigator.vibrate?.(pattern);
// Math.random ne sert qu'à varier l'animation ; les valeurs des dés viennent de rules.js.
const jitter = (min, max) => min + Math.random() * (max - min);

const board = document.getElementById('board');
const frontMsgs = document.querySelectorAll('.front .msg');

const sides = {
  attack: { max: MAX_ATTACK_DICE, count: 3 },
  defense: { max: MAX_DEFENSE_DICE, count: 2 },
};

let phase = 'choose'; // choose → rolling → result
let resultAt = 0;

for (const [name, side] of Object.entries(sides)) {
  const el = document.querySelector(`.half[data-side="${name}"]`);
  Object.assign(side, {
    name,
    el,
    tray: el.querySelector('.tray'),
    status: el.querySelector('.status'),
    readyBtn: el.querySelector('.ready'),
    countBtns: [...el.querySelectorAll('.count button')],
    card: el.querySelector('.card'),
    badge: el.querySelector('.badge'),
    ready: false,
    dice: [],
    current: null,
  });
  side.countBtns.forEach((btn) => btn.addEventListener('click', () => setCount(side, Number(btn.dataset.n))));
  side.readyBtn.addEventListener('click', () => toggleReady(side));
  side.card.addEventListener('animationend', () => side.card.classList.remove('flip', 'charge'));
  setCount(side, side.count);
  drawCard(side, false);
}

board.addEventListener('click', () => {
  if (phase === 'result' && Date.now() - resultAt > 700) newRound();
});

setFront('Aux armes !');
render();

// ---------- Dés ----------

function makeDie(value) {
  const slot = document.createElement('div');
  slot.className = 'slot';
  const toss = document.createElement('div');
  toss.className = 'toss';
  const cube = document.createElement('div');
  cube.className = 'cube';
  for (const c of ['c1', 'c2', 'c3']) {
    const core = document.createElement('div');
    core.className = `core ${c}`;
    cube.append(core);
  }
  for (let v = 1; v <= 6; v++) {
    const face = document.createElement('div');
    face.className = `face f${v}`;
    for (let i = 0; i < 9; i++) {
      const pip = document.createElement('i');
      if (PIPS[v].includes(i)) pip.className = 'p';
      face.append(pip);
    }
    cube.append(face);
  }
  const num = document.createElement('span');
  num.className = 'num';
  toss.append(cube);
  slot.append(toss, num);

  const die = { slot, toss, cube, num, value, rx: 0, ry: 0, rz: 0 };
  [die.rx, die.ry] = ORIENT[value];
  die.rz = jitter(-8, 8);
  orient(die, die.rx, die.ry, die.rz);
  return die;
}

function orient(die, rx, ry, rz) {
  die.slot.setAttribute('aria-label', `Dé : ${die.value}`);
  die.cube.style.transform = `rotateZ(${rz}deg) rotateX(${rx}deg) rotateY(${ry}deg)`;
}

// Le résultat est déjà tiré : l'animation fait tourner le cube plusieurs fois
// puis le fait atterrir exactement sur la face `value`.
function throwDie(die, value, index) {
  const duration = T(1600);
  const delay = index * T(60);

  die.cube.style.transition = 'none';
  orient(die, die.rx, die.ry, die.rz);
  die.cube.offsetWidth; // applique la position de départ avant de lancer la transition

  const [tx, ty] = ORIENT[value];
  const sign = () => (Math.random() < 0.5 ? -1 : 1);
  const spinX = (2 + Math.floor(jitter(0, 2))) * 360 * sign();
  const spinY = (1 + Math.floor(jitter(0, 2))) * 360 * sign();
  const rz = jitter(-14, 14);
  die.cube.style.transition = `transform ${duration}ms cubic-bezier(.15,.62,.2,1) ${delay}ms`;
  Object.assign(die, { value, rx: tx, ry: ty, rz });
  orient(die, tx + spinX, ty + spinY, rz);

  die.toss.style.setProperty('--dx', `${jitter(-50, 50)}px`);
  die.toss.style.setProperty('--roll', `${duration}ms`);
  die.toss.style.animationDelay = `${delay}ms`;
  die.toss.classList.remove('go');
  die.toss.offsetWidth;
  die.toss.classList.add('go');
}

// Range les dés du plus fort au plus faible, en les faisant glisser (technique FLIP).
// offsetLeft ignore la rotation de la moitié attaquant, donc le calcul reste juste des deux côtés.
function sortTray(side) {
  const before = new Map(side.dice.map((d) => [d, d.slot.offsetLeft]));
  side.dice.sort((a, b) => b.value - a.value);
  side.dice.forEach((d) => side.tray.append(d.slot));
  for (const d of side.dice) {
    const dx = before.get(d) - d.slot.offsetLeft;
    d.slot.style.transition = 'none';
    d.slot.style.transform = `translateX(${dx}px)`;
  }
  side.tray.offsetWidth;
  for (const d of side.dice) {
    d.slot.style.transition = `transform ${T(450)}ms cubic-bezier(.3,.7,.3,1), box-shadow .25s, filter .3s, opacity .3s`;
    d.slot.style.transform = '';
  }
}

// ---------- Cartes ----------

// Tire une carte différente de la précédente ; avec `animate`, la carte se retourne pendant l'échange.
function drawCard(side, animate) {
  const choices = CARDS[side.name].filter((c) => c !== side.current);
  const card = choices[Math.floor(Math.random() * choices.length)];
  side.current = card;
  const apply = () => {
    const [passive, aggressive] = side.card.querySelectorAll('.art');
    passive.src = `assets/cards/${card.id}-passive.webp`;
    aggressive.src = `assets/cards/${card.id}-aggressive.webp`;
    passive.alt = `${card.name}, au repos`;
    aggressive.alt = `${card.name}, à l’attaque`;
    side.card.querySelector('.name').textContent = card.name;
    side.cry = new Audio(`assets/cries/${card.id}.mp3`);
    side.cry.preload = 'auto';
  };
  if (!animate) return apply();
  side.card.classList.remove('flip', 'charge');
  side.card.offsetWidth;
  side.card.classList.add('flip');
  setTimeout(apply, T(300)); // à mi-retournement, quand la carte est vue de profil
}

function setPose(side, aggressive) {
  if (side.card.classList.contains('is-aggressive') === aggressive) return;
  side.card.classList.toggle('is-aggressive', aggressive);
  if (aggressive) {
    side.card.classList.remove('flip', 'charge');
    side.card.offsetWidth;
    side.card.classList.add('charge');
  }
}

// ---------- Interface ----------

function setCount(side, n) {
  if (phase !== 'choose' || side.ready) return;
  side.count = Math.min(Math.max(n, 1), side.max);
  side.countBtns.forEach((btn) => btn.setAttribute('aria-checked', String(Number(btn.dataset.n) === side.count)));
  while (side.dice.length > side.count) side.dice.pop().slot.remove();
  while (side.dice.length < side.count) {
    const die = makeDie(side.dice.length % 2 ? 5 : 6);
    side.dice.push(die);
    side.tray.append(die.slot);
  }
}

function toggleReady(side) {
  if (phase !== 'choose') return;
  sound.unlock();
  keepScreenOn();
  side.ready = !side.ready;
  setPose(side, side.ready);
  if (side.ready) {
    side.cry.currentTime = 0;
    side.cry.play().catch(() => {});
  } else {
    side.cry.pause();
  }
  vibrate(15);
  render();
  if (sides.attack.ready && sides.defense.ready) battle();
}

function render() {
  for (const side of Object.values(sides)) {
    const other = side.name === 'attack' ? sides.defense : sides.attack;
    const locked = phase !== 'choose' || side.ready;
    side.countBtns.forEach((btn) => (btn.disabled = locked));
    side.readyBtn.disabled = phase === 'rolling';
    side.readyBtn.classList.toggle('is-ready', side.ready && phase === 'choose');
    if (phase === 'choose') {
      side.readyBtn.textContent = side.ready ? 'Prêt ✓ · annuler' : 'Prêt';
      side.status.textContent = side.ready
        ? (other.ready ? '' : 'En attente de l’adversaire…')
        : 'Choisissez vos dés';
    } else {
      side.readyBtn.textContent = phase === 'rolling' ? 'Au combat…' : 'Nouvel assaut';
    }
  }
}

function setFront(text) {
  frontMsgs.forEach((m) => (m.textContent = text));
}

function showLosses(side, losses) {
  side.badge.textContent = losses;
  side.badge.classList.remove('stamp');
  side.badge.offsetWidth;
  side.badge.classList.add('stamp');
  side.status.textContent = losses === 0 ? 'Vos troupes tiennent bon !' : `Vous perdez ${losses} armée${losses > 1 ? 's' : ''}.`;
}

// ---------- Déroulé d'une bataille ----------

async function battle() {
  phase = 'rolling';
  render();
  const { attack, defense } = sides;

  const outcome = resolve(rollDice(attack.count), rollDice(defense.count));

  setFront('Les dés sont jetés…');
  attack.status.textContent = defense.status.textContent = '';
  sound.rattle(T(1600), attack.count + defense.count);
  vibrate([20, 60, 20, 60, 20]);
  // On lance les dés dans un ordre quelconque, puis on les range par valeur.
  shuffleInto(attack.dice, outcome.attack).forEach(([die, v], i) => throwDie(die, v, i));
  shuffleInto(defense.dice, outcome.defense).forEach(([die, v], i) => throwDie(die, v, i));
  await wait(T(1600) + T(60) * 2 + 250);

  sortTray(attack);
  sortTray(defense);
  await wait(T(500));

  attack.dice.forEach((d, i) => { if (i >= outcome.pairs.length) d.slot.classList.add('idle'); });
  defense.dice.forEach((d, i) => { if (i >= outcome.pairs.length) d.slot.classList.add('idle'); });

  for (const [i, pair] of outcome.pairs.entries()) {
    const a = attack.dice[i];
    const d = defense.dice[i];
    a.num.textContent = d.num.textContent = ROMAN[i];
    setFront(`Duel ${ROMAN[i]}`);
    a.slot.classList.add('fight');
    d.slot.classList.add('fight');
    await wait(T(320));
    const [winner, loser] = pair.winner === 'attack' ? [a, d] : [d, a];
    winner.slot.classList.add('win');
    loser.slot.classList.add('lose');
    vibrate(40);
    await wait(T(520));
  }

  showLosses(attack, outcome.attackerLosses);
  showLosses(defense, outcome.defenderLosses);
  setFront(''); // les pertes s'affichent sur la pastille de chaque carte
  vibrate([90, 50, 140]);

  attack.ready = defense.ready = false;
  phase = 'result';
  resultAt = Date.now();
  render();
}

// Associe aléatoirement les valeurs (déjà triées) aux dés, pour que le rangement final soit visible.
function shuffleInto(dice, values) {
  const shuffled = [...values];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return dice.map((die, i) => [die, shuffled[i]]);
}

function newRound() {
  phase = 'choose';
  for (const side of Object.values(sides)) {
    side.badge.textContent = '';
    side.badge.classList.remove('stamp');
    setPose(side, false);
    drawCard(side, true);
    for (const d of side.dice) {
      d.slot.classList.remove('fight', 'win', 'lose', 'idle');
      d.num.textContent = '';
    }
  }
  setFront('Aux armes !');
  render();
}

// ---------- Téléphone posé sur la table ----------

let wakeLock = null;
let wantWakeLock = false;
async function keepScreenOn() {
  wantWakeLock = true;
  if (wakeLock || !('wakeLock' in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => (wakeLock = null));
  } catch {
    wakeLock = null;
  }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && wantWakeLock) keepScreenOn();
});

// Pas de cache hors-ligne en local, pour voir les modifications tout de suite.
if ('serviceWorker' in navigator && location.hostname !== 'localhost') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
