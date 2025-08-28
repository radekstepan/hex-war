// --- GAME STATE ---
export let gameState = {};

export function initGameState() {
    gameState = {
        players: [],
        territories: {},
        currentPlayerIndex: 0,
        gamePhase: 'SETUP', // SETUP, CARD_PLAY_ROUND, REINFORCE, ATTACK, FORTIFY
        deck: [],
        discardPile: [],
        selectedTerritory: null,
        fortify: {
            hasFortified: false,
            source: null,
            target: null
        },
        aiBattleSpeed: 1500, // Default speed in ms
        isBlitzing: false,
        attackContext: {},
        revealedTerritories: new Set(),
        modifiedTerritories: new Set(),
    };
}

// --- STATE GETTERS ---
export const getCurrentPlayer = () => gameState.players[gameState.currentPlayerIndex];
export const getPlayerById = (id) => gameState.players.find(p => p.id === id);

// --- STATE SETTERS ---
export function setPlayers(players) {
    gameState.players = players;
}

export function setTerritories(territories) {
    gameState.territories = territories;
}

export function setGamePhase(phase) {
    gameState.gamePhase = phase;
    gameState.selectedTerritory = null;
}

export function nextPlayer() {
    gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
    gameState.selectedTerritory = null;
    gameState.fortify = { hasFortified: false, source: null, target: null };
    gameState.modifiedTerritories.clear();
}

export function setSelectedTerritory(tId) {
    gameState.selectedTerritory = tId;
}

export function setFortifySource(tId) {
    gameState.fortify.source = tId;
}

export function setFortifyTarget(tId) {
    gameState.fortify.target = tId;
}

export function setFortified() {
    gameState.fortify.hasFortified = true;
}

export function clearFortify() {
    gameState.fortify = { hasFortified: false, source: null, target: null };
}

export function setAttackContext(sourceId, targetId) {
    gameState.attackContext = { sourceId, targetId };
}

export function setBlitzing(status) {
    gameState.isBlitzing = status;
}

export function setDeck(deck) {
    gameState.deck = deck;
    gameState.discardPile = [];
}

export function drawCard() {
    if (gameState.deck.length === 0) {
        console.warn("Deck is empty! The game should reshuffle the discard pile.");
        return null;
    }
    return gameState.deck.pop();
}

export function addToDiscardPile(cards) {
    if (!Array.isArray(cards)) {
        cards = [cards];
    }
    gameState.discardPile.push(...cards);
}
