// Règles du combat (Risk) et tirage des dés.
// Ce fichier ne contient que de la logique pure : aucun affichage, aucune animation.

export const MAX_ATTACK_DICE = 3;
export const MAX_DEFENSE_DICE = 2;

// 4294967292 est le plus grand multiple de 6 qui tient sur 32 bits (2^32 - 4).
// On rejette les valeurs au-delà pour que chaque face ait exactement 1 chance sur 6.
const LIMIT = 4294967292;

// randomSource(buffer) remplit un Uint32Array ; par défaut le générateur
// cryptographique du navigateur (ou de Node), qu'on ne peut ni prédire ni influencer.
export function rollDie(randomSource = (b) => crypto.getRandomValues(b)) {
  const buf = new Uint32Array(1);
  do {
    randomSource(buf);
  } while (buf[0] >= LIMIT);
  return (buf[0] % 6) + 1;
}

export function rollDice(count, randomSource) {
  return Array.from({ length: count }, () => rollDie(randomSource));
}

// Compare les dés : le plus haut de l'attaquant contre le plus haut du défenseur,
// puis le deuxième contre le deuxième. En cas d'égalité, le défenseur gagne.
export function resolve(attack, defense) {
  const a = [...attack].sort((x, y) => y - x);
  const d = [...defense].sort((x, y) => y - x);
  const pairs = [];
  let attackerLosses = 0;
  let defenderLosses = 0;
  for (let i = 0; i < Math.min(a.length, d.length); i++) {
    const attackerWins = a[i] > d[i];
    if (attackerWins) defenderLosses++;
    else attackerLosses++;
    pairs.push({ attack: a[i], defense: d[i], winner: attackerWins ? 'attack' : 'defense' });
  }
  return { attack: a, defense: d, pairs, attackerLosses, defenderLosses };
}
