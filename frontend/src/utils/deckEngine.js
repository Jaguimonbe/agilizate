/**
 * Motor de Mazo — Geometría Proyectiva Finita
 * Adaptado para Frontend
 */

import DEFAULT_SYMBOLS from './defaultSymbols';

export function generateCardIndices(n) {
  const cards = [];

  cards.push(Array.from({ length: n + 1 }, (_, i) => i));

  for (let j = 0; j < n; j++) {
    const card = [0];
    for (let i = 0; i < n; i++) {
      card.push(n + 1 + n * j + i);
    }
    cards.push(card);
  }

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const card = [i + 1];
      for (let k = 0; k < n; k++) {
        card.push(n + 1 + n * k + ((i * k + j) % n));
      }
      cards.push(card);
    }
  }

  return cards; 
}

export function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export function prepareDeck(n, customSymbols = []) {
  const required = n * n + n + 1;

  const defaults = DEFAULT_SYMBOLS.filter(s => !customSymbols.includes(s));
  let pool = [...customSymbols, ...defaults];

  if (pool.length < required) {
    throw new Error(
      `Se necesitan al menos ${required} símbolos únicos para n=${n}. Disponibles: ${pool.length}`
    );
  }

  pool = shuffle(pool).slice(0, required);
  const cardIndices = generateCardIndices(n);
  const deck = cardIndices.map(card => card.map(idx => pool[idx]));

  return {
    deck,
    totalSymbols: required,
    totalCards: deck.length,
    symbolsPerCard: n + 1,
  };
}
