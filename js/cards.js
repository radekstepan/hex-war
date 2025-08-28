import { CARD_SUITS, CARD_RANKS, POKER_HANDS } from './constants.js';

/**
 * Creates a standard 52-card deck.
 * @returns {Array<Object>} An array of card objects.
 */
export function createDeck() {
    const deck = [];
    for (const suit of CARD_SUITS) {
        for (const rank of CARD_RANKS) {
            deck.push({ suit, rank });
        }
    }
    return deck;
}

/**
 * Shuffles an array in place using the Fisher-Yates algorithm.
 * @param {Array} deck The deck to be shuffled.
 */
export function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

/**
 * Converts a card rank (e.g., 'K', '7') to a numerical value for sorting.
 * @param {string} rank The rank of the card.
 * @returns {number} The numerical value of the rank.
 */
function getRankValue(rank) {
    if (!isNaN(rank)) return parseInt(rank);
    return { 'J': 11, 'Q': 12, 'K': 13, 'A': 14 }[rank];
}

/**
 * Evaluates a 3-card hand and determines if it forms a poker set.
 * @param {Array<Object>} hand An array of 3 card objects.
 * @returns {Object|null} The hand's info from POKER_HANDS if it's a valid set, otherwise null.
 */
export function evaluateHand(hand) {
    if (hand.length !== 3) return null;

    const ranks = hand.map(c => getRankValue(c.rank)).sort((a, b) => a - b);
    const suits = hand.map(c => c.suit);

    const isFlush = suits.every(s => s === suits[0]);
    
    // Check for Ace-low straight (A, 2, 3)
    const isAceLowStraight = ranks[0] === 2 && ranks[1] === 3 && ranks[2] === 14;
    const isNormalStraight = ranks[0] + 1 === ranks[1] && ranks[1] + 1 === ranks[2];
    const isStraight = isNormalStraight || isAceLowStraight;

    if (isStraight && isFlush) return POKER_HANDS.STRAIGHT_FLUSH;

    const rankCounts = ranks.reduce((acc, rank) => {
        acc[rank] = (acc[rank] || 0) + 1;
        return acc;
    }, {});

    const counts = Object.values(rankCounts);
    if (counts.includes(3)) return POKER_HANDS.THREE_OF_A_KIND;

    if (isStraight) return POKER_HANDS.STRAIGHT;
    if (isFlush) return POKER_HANDS.FLUSH;
    if (counts.includes(2)) return POKER_HANDS.PAIR;

    return null;
}
