// --- GAME STATE ---
export let gameState = {};

export function initGameState() {
    gameState = {
        players: [],
        territories: {},
        currentPlayerIndex: 0,
        gamePhase: 'SETUP', // SETUP, REINFORCE, ATTACK, FORTIFY
        selectedTerritory: null,
        fortify: {
            hasFortified: false,
            source: null,
            target: null
        },
        attackContext: {}
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
