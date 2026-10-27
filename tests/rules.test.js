// Lancer avec : npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rollDie, rollDice, resolve } from '../rules.js';

test('3 dés contre 2 : deux duels, l\'attaquant gagne les deux', () => {
  const r = resolve([2, 6, 4], [5, 3]);
  assert.deepEqual(r.attack, [6, 4, 2]);
  assert.deepEqual(r.defense, [5, 3]);
  assert.equal(r.pairs.length, 2);
  assert.equal(r.defenderLosses, 2);
  assert.equal(r.attackerLosses, 0);
});

test('égalité : le défenseur gagne', () => {
  const r = resolve([5], [5]);
  assert.equal(r.pairs[0].winner, 'defense');
  assert.equal(r.attackerLosses, 1);
  assert.equal(r.defenderLosses, 0);
});

test('double égalité : l\'attaquant perd deux armées', () => {
  const r = resolve([6, 3, 1], [6, 3]);
  assert.equal(r.attackerLosses, 2);
  assert.equal(r.defenderLosses, 0);
});

test('1 dé contre 2 : un seul duel', () => {
  const r = resolve([4], [6, 1]);
  assert.equal(r.pairs.length, 1);
  assert.equal(r.attackerLosses, 1);
});

test('3 dés contre 1 : un seul duel, contre le meilleur dé de l\'attaquant', () => {
  const r = resolve([1, 2, 6], [5]);
  assert.equal(r.pairs.length, 1);
  assert.deepEqual(r.pairs[0], { attack: 6, defense: 5, winner: 'attack' });
});

test('match nul possible : chacun perd une armée', () => {
  const r = resolve([6, 2], [5, 4]);
  assert.equal(r.attackerLosses, 1);
  assert.equal(r.defenderLosses, 1);
});

test('les valeurs rejetées (biais) sont relancées', () => {
  const values = [4294967295, 4294967292, 7];
  const source = (b) => { b[0] = values.shift(); };
  assert.equal(rollDie(source), (7 % 6) + 1);
  assert.equal(values.length, 0);
});

test('1 million de lancers : chaque face sort environ 1 fois sur 6', () => {
  const N = 1_000_000;
  const counts = [0, 0, 0, 0, 0, 0];
  for (const v of rollDice(N)) counts[v - 1]++;
  for (const c of counts) {
    assert.ok(Math.abs(c / N - 1 / 6) < 0.002, `fréquence hors tolérance : ${c / N}`);
  }
});
