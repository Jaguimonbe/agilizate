/**
 * Motor de Mazo — Geometría Proyectiva Finita
 *
 * Para un primo n:
 *   - Símbolos por carta: n + 1
 *   - Total de cartas:    n² + n + 1
 *   - Total de símbolos:  n² + n + 1
 *   - Garantía: exactamente 1 símbolo en común entre cualquier par de cartas
 */

'use strict';

const DEFAULT_SYMBOLS = require('./defaultSymbols');

/**
 * Genera el mazo usando el plano proyectivo de orden n (n debe ser primo).
 * Retorna un array de cartas; cada carta es un array de índices de símbolos.
 */
function generateCardIndices(n) {
  const cards = [];

  // Carta 0: símbolos del 0 al n
  cards.push(Array.from({ length: n + 1 }, (_, i) => i));

  // n cartas de tipo 1
  for (let j = 0; j < n; j++) {
    const card = [0];
    for (let i = 0; i < n; i++) {
      card.push(n + 1 + n * j + i);
    }
    cards.push(card);
  }

  // n² cartas de tipo 2
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const card = [i + 1];
      for (let k = 0; k < n; k++) {
        card.push(n + 1 + n * k + ((i * k + j) % n));
      }
      cards.push(card);
    }
  }

  return cards; // length = n² + n + 1
}

/** Mezcla un array en sitio (Fisher-Yates) */
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Genera el mazo completo listo para jugar.
 *
 * @param {number}   n              - Orden primo (ej. 7 → 57 cartas, 8 símbolos/carta)
 * @param {string[]} customSymbols  - Símbolos personalizados del admin (URLs o emojis)
 * @returns {{ deck: string[][], totalSymbols: number, totalCards: number }}
 */
function prepareDeck(n, customSymbols = []) {
  const required = n * n + n + 1;

  // Construir pool de símbolos: personalizados primero, luego defaults
  const defaults = DEFAULT_SYMBOLS.filter(s => !customSymbols.includes(s));
  let pool = [...customSymbols, ...defaults];

  if (pool.length < required) {
    throw new Error(
      `Se necesitan al menos ${required} símbolos únicos para n=${n}. Disponibles: ${pool.length}`
    );
  }

  // Mezclar y tomar los primeros `required`
  pool = shuffle(pool).slice(0, required);

  // Generar índices del plano proyectivo y mapear a símbolos reales
  const cardIndices = generateCardIndices(n);
  const deck = cardIndices.map(card => card.map(idx => pool[idx]));

  return {
    deck,
    totalSymbols: required,
    totalCards: deck.length,
    symbolsPerCard: n + 1,
  };
}

/**
 * Valida que dos cartas tengan exactamente 1 símbolo en común (útil para tests).
 */
function validatePair(cardA, cardB) {
  const setA = new Set(cardA);
  const common = cardB.filter(s => setA.has(s));
  return common.length === 1 ? common[0] : null;
}

module.exports = { prepareDeck, generateCardIndices, validatePair, shuffle };
