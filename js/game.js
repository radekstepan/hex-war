import * as state from './state.js';
import * as ui from './ui.js';
import { PLAYER_COLORS, territoriesData, continentsData, CAPITAL_REINFORCEMENT_BONUS } from './constants.js';
import { executeAITurn } from './ai.js';

/**
 * Updates the set of territories visible to the human player.
 * A territory is revealed if it is owned by the human player or adjacent to one.
 * Once revealed, a territory remains visible for the rest of the game.
 */
function updateRevealedTerritories() {
    const humanPlayer = state.gameState.players.find(p => !p.isAI);
    if (!humanPlayer) return;

    for (const tId in state.gameState.territories) {
        if (state.gameState.territories[tId].ownerId === humanPlayer.id) {
            state.gameState.revealedTerritories.add(tId);
            territoriesData[tId].adj.forEach(adjId => {
                state.gameState.revealedTerritories.add(adjId);
            });
        }
    }
}

/**
 * Checks if the AI player is in a hopeless situation and should surrender.
 * @param {object} aiPlayer - The AI player object to check.
 * @returns {boolean} - True if the AI surrenders, otherwise false.
 */
function handleAISurrender(aiPlayer) {
    const SURRENDER_DOMINANCE_THRESHOLD = 0.65;
    const AI_WEAKNESS_THRESHOLD = 0.20;

    const allTerritoryIds = Object.keys(territoriesData);
    const totalTerritoryCount = allTerritoryIds.length;

    const playerTerritoryCounts = state.gameState.players.map(p => ({
        player: p,
        count: Object.values(state.gameState.territories).filter(t => t.ownerId === p.id).length
    })).filter(p => p.count > 0);

    const strongestPlayerStat = playerTerritoryCounts.reduce((strongest, current) => {
        return current.count > strongest.count ? current : strongest;
    }, { player: null, count: 0 });

    const aiPlayerStat = playerTerritoryCounts.find(p => p.player.id === aiPlayer.id);

    if (!strongestPlayerStat.player || !aiPlayerStat) return false;

    const strongestPlayerPercentage = strongestPlayerStat.count / totalTerritoryCount;
    const aiPlayerPercentage = aiPlayerStat.count / totalTerritoryCount;

    if (strongestPlayerStat.player.id !== aiPlayer.id &&
        strongestPlayerPercentage > SURRENDER_DOMINANCE_THRESHOLD &&
        aiPlayerPercentage < AI_WEAKNESS_THRESHOLD)
    {
        ui.logMessage(`${aiPlayer.name} has surrendered to the might of ${strongestPlayerStat.player.name}!`, 'text-orange-400');
        const aiTerritories = allTerritoryIds.filter(tId => state.gameState.territories[tId]?.ownerId === aiPlayer.id);
        aiTerritories.forEach(tId => {
            state.gameState.territories[tId].ownerId = strongestPlayerStat.player.id;
        });
        return true;
    }
    return false;
}

// --- GAME SETUP & FLOW ---
export function setupGame(numAI, aiSpeed) {
    state.initGameState();
    state.gameState.aiBattleSpeed = aiSpeed;

    const totalPlayers = numAI + 1;
    const startingArmiesMap = { 2: 40, 3: 35, 4: 30, 5: 25 };
    const startingArmies = startingArmiesMap[totalPlayers];

    const players = [];
    players.push({ id: 1, name: 'You', color: PLAYER_COLORS[0], isAI: false, capitalTerritory: null });
    for (let i = 0; i < numAI; i++) {
        players.push({ id: i + 2, name: `AI ${i + 1}`, color: PLAYER_COLORS[i + 1], isAI: true, capitalTerritory: null });
    }
    state.setPlayers(players);

    const territories = {};
    const territoryIds = Object.keys(territoriesData);
    territoryIds.sort(() => Math.random() - 0.5);
    territoryIds.forEach((tId, index) => {
        const owner = state.gameState.players[index % totalPlayers];
        territories[tId] = { ownerId: owner.id, armies: 1 };
    });

    state.gameState.players.forEach(player => {
        const myTerritories = territoryIds.filter(tId => territories[tId].ownerId === player.id);
        let armiesToPlace = startingArmies - myTerritories.length;
        for (let i = 0; i < armiesToPlace; i++) {
            const randTerritory = myTerritories[Math.floor(Math.random() * myTerritories.length)];
            territories[randTerritory].armies++;
        }
        // Assign a capital from their starting territories
        if (myTerritories.length > 0) {
            player.capitalTerritory = myTerritories[Math.floor(Math.random() * myTerritories.length)];
        }
    });
    state.setTerritories(territories);
    updateRevealedTerritories();

    ui.clearLog();
    ui.logMessage('Game started! Your turn.');
    startTurn();
}

function startTurn() {
    if (checkForWinner()) return;

    const currentPlayer = state.getCurrentPlayer();

    if (currentPlayer.isAI) {
        if (handleAISurrender(currentPlayer)) {
            ui.updateUI();
            advanceToNextPlayer();
            return;
        }
    }

    const playerTerritoryCount = Object.values(state.gameState.territories).filter(t => t.ownerId === currentPlayer.id).length;

    if (playerTerritoryCount === 0) {
        ui.logMessage(`${currentPlayer.name} has been eliminated.`, 'text-gray-500');
        advanceToNextPlayer();
        return;
    }

    const reinforcements = calculateReinforcements(currentPlayer.id);
    currentPlayer.armiesToDeploy = reinforcements;
    ui.logMessage(`${currentPlayer.name} gets ${reinforcements} reinforcements.`);

    if (currentPlayer.isAI) {
        setTimeout(executeAITurn, 1000);
    } else {
        changePhase('REINFORCE');
    }
}

export function changePhase(newPhase) {
    state.setGamePhase(newPhase);
    ui.updateUI();
}

function advanceToNextPlayer() {
    state.nextPlayer();
    startTurn();
}

// --- PLAYER ACTIONS ---
export function onTerritoryClick(tId) {
    if (state.getCurrentPlayer().isAI || state.gameState.isBlitzing) return;
    const { gamePhase, selectedTerritory, fortify } = state.gameState;
    const currentPlayer = state.getCurrentPlayer();
    const territoryState = state.gameState.territories[tId];

    switch(gamePhase) {
        case 'REINFORCE':
            if (territoryState.ownerId === currentPlayer.id) {
                territoryState.armies++;
                currentPlayer.armiesToDeploy--;
                if (currentPlayer.armiesToDeploy === 0) changePhase('ATTACK');
                ui.updateUI();
            }
            break;
        case 'ATTACK':
            if (!selectedTerritory) {
                if (territoryState.ownerId === currentPlayer.id && territoryState.armies > 1) state.setSelectedTerritory(tId);
            } else {
                if (territoryState.ownerId !== currentPlayer.id && territoriesData[selectedTerritory].adj.includes(tId)) {
                    ui.showAttackModal(selectedTerritory, tId);
                } else {
                    state.setSelectedTerritory((territoryState.ownerId === currentPlayer.id && territoryState.armies > 1) ? tId : null);
                }
            }
            ui.updateUI();
            break;
        case 'FORTIFY':
            if (fortify.hasFortified) return;
            if (!fortify.source) {
                if (territoryState.ownerId === currentPlayer.id && territoryState.armies > 1) state.setFortifySource(tId);
            } else {
                // MODIFIED: Check for adjacency instead of a path
                if (territoryState.ownerId === currentPlayer.id && tId !== fortify.source && territoriesData[fortify.source].adj.includes(tId)) {
                    state.setFortifyTarget(tId);
                    ui.showFortifyModal(fortify.source, tId);
                } else {
                    state.setFortifySource((territoryState.ownerId === currentPlayer.id && territoryState.armies > 1) ? tId : null);
                    state.setFortifyTarget(null);
                }
            }
            ui.updateUI();
            break;
    }
}

export function performAttack(attackerDiceCount) {
    const { sourceId, targetId } = state.gameState.attackContext;
    const sourceState = state.gameState.territories[sourceId];
    const targetState = state.gameState.territories[targetId];
    const defenderDiceCount = Math.min(targetState.armies, 2);
    const attackerRolls = rollDice(attackerDiceCount).sort((a,b) => b-a);
    const defenderRolls = rollDice(defenderDiceCount).sort((a,b) => b-a);
    ui.displayDice('attacker', attackerRolls);
    ui.displayDice('defender', defenderRolls);
    let attackerLosses = 0, defenderLosses = 0;
    for (let i = 0; i < Math.min(attackerRolls.length, defenderRolls.length); i++) {
        if (attackerRolls[i] > defenderRolls[i]) defenderLosses++;
        else attackerLosses++;
    }
    sourceState.armies -= attackerLosses;
    targetState.armies -= defenderLosses;
    document.getElementById('attack-result').textContent = `Attacker loses ${attackerLosses}, Defender loses ${defenderLosses}.`;
    ui.logMessage(`${state.getCurrentPlayer().name} attacks ${territoriesData[targetId].name}. Result: Attacker loses ${attackerLosses}, Defender loses ${defenderLosses}.`, 'text-yellow-400');
    document.getElementById('attacker-armies').textContent = sourceState.armies;
    document.getElementById('defender-armies').textContent = targetState.armies;

    if (targetState.armies <= 0) {
        ui.logMessage(`${state.getCurrentPlayer().name} conquered ${territoriesData[targetId].name}!`, 'text-green-400');
        targetState.ownerId = state.getCurrentPlayer().id;
        if (!state.getCurrentPlayer().isAI) {
            updateRevealedTerritories();
        }
        const rect = document.getElementById(`rect-${targetId}`);
        if (rect) {
            rect.classList.add('conquered');
            setTimeout(() => rect.classList.remove('conquered'), 800);
        }
        const armiesToMove = Math.min(attackerDiceCount, sourceState.armies - 1);
        targetState.armies = armiesToMove > 0 ? armiesToMove : 1;
        sourceState.armies -= armiesToMove > 0 ? armiesToMove : 1;
        ui.closeAttackModal();
        if(checkForWinner()) return;
    } else {
        ui.updateAttackModalAfterBattle();
    }
    ui.updateUI();
}

let blitzTimeout = null;
export function performBlitzAttack() {
    if (state.gameState.isBlitzing) return;
    state.setBlitzing(true);
    ui.showBlitzUI();
    ui.updateUI();

    document.getElementById('attack-result').textContent = 'Blitzing...';

    const blitzLoop = () => {
        try {
            const { sourceId, targetId } = state.gameState.attackContext;
            const sourceState = state.gameState.territories[sourceId];
            const targetState = state.gameState.territories[targetId];

            if (!state.gameState.isBlitzing || !sourceState || !targetState || sourceState.armies <= 1) {
                stopBlitz(true);
                return;
            }

            const attackerDiceCount = Math.min(3, sourceState.armies - 1);
            const defenderDiceCount = Math.min(2, targetState.armies);
            const attackerRolls = rollDice(attackerDiceCount).sort((a, b) => b - a);
            const defenderRolls = rollDice(defenderDiceCount).sort((a, b) => b - a);
            let attackerLosses = 0, defenderLosses = 0;
            for (let i = 0; i < Math.min(attackerRolls.length, defenderRolls.length); i++) {
                if (attackerRolls[i] > defenderRolls[i]) defenderLosses++;
                else attackerLosses++;
            }

            sourceState.armies -= attackerLosses;
            targetState.armies -= defenderLosses;

            document.getElementById('attacker-armies').textContent = sourceState.armies;
            document.getElementById('defender-armies').textContent = targetState.armies;
            document.getElementById('attack-result').textContent = `Attacker loses ${attackerLosses}, Defender loses ${defenderLosses}.`;
            ui.updateUI();

            if (targetState.armies <= 0) {
                ui.logMessage(`${state.getCurrentPlayer().name} conquered ${territoriesData[targetId].name} via blitz!`, 'text-green-400');
                targetState.ownerId = state.getCurrentPlayer().id;
                if (!state.getCurrentPlayer().isAI) {
                    updateRevealedTerritories();
                }
                const rect = document.getElementById(`rect-${targetId}`);
                if (rect) {
                    rect.classList.add('conquered');
                    setTimeout(() => rect.classList.remove('conquered'), 800);
                }
                const armiesToMove = sourceState.armies - 1;
                targetState.armies = armiesToMove > 0 ? armiesToMove : 1;
                sourceState.armies = 1;

                state.setBlitzing(false);
                ui.closeAttackModal();
                if (checkForWinner()) return;
                return;
            }
            blitzTimeout = setTimeout(blitzLoop, 250);
        } catch (error) {
            console.error("Error during blitz loop:", error);
            stopBlitz(true);
        }
    };
    blitzLoop();
}

export function stopBlitz(showContinueOptions = true) {
    clearTimeout(blitzTimeout);
    if (state.gameState.isBlitzing) {
        state.setBlitzing(false);
        document.getElementById('attack-result').textContent = 'Blitz stopped.';
        ui.updateAttackModalAfterBattle(showContinueOptions);
        ui.updateUI();
    }
}

export function confirmFortify(amount) {
    const { source, target } = state.gameState.fortify;
    state.gameState.territories[source].armies -= amount;
    state.gameState.territories[target].armies += amount;
    state.setFortified();
    ui.logMessage(`${state.getCurrentPlayer().name} fortified ${territoriesData[target].name} with ${amount} armies.`);
    ui.closeFortifyModal();
    advanceToNextPlayer();
}

export function cancelFortify() {
    ui.closeFortifyModal();
}

export function endAttackPhase() {
    if (state.gameState.isBlitzing) return;
    changePhase('FORTIFY');
}

export function endTurn() {
    advanceToNextPlayer();
}

function calculateReinforcements(playerId) {
    const playerTerritories = Object.keys(state.gameState.territories).filter(tId => state.gameState.territories[tId].ownerId === playerId);
    if (playerTerritories.length === 0) return 0;

    // 1. Territory-based reinforcements
    let reinforcements = Math.max(3, Math.floor(playerTerritories.length / 3));

    // 2. Continent-based reinforcements
    for (const continentName in continentsData) {
        const continentTerritories = Object.keys(territoriesData).filter(tId => territoriesData[tId].continent === continentName);
        const controlsContinent = continentTerritories.every(tId => state.gameState.territories[tId]?.ownerId === playerId);
        if(controlsContinent) {
            const bonus = continentsData[continentName].bonus;
            reinforcements += bonus;
            ui.logMessage(`${state.getPlayerById(playerId).name} controls ${continentName} (+${bonus})`, 'text-green-400');
        }
    }

    // 3. Capital-based reinforcements
    let capitalBonus = 0;
    state.gameState.players.forEach(player => {
        const capitalTId = player.capitalTerritory;
        if (capitalTId && state.gameState.territories[capitalTId]?.ownerId === playerId) {
            capitalBonus += CAPITAL_REINFORCEMENT_BONUS;
        }
    });

    if (capitalBonus > 0) {
        reinforcements += capitalBonus;
        ui.logMessage(`${state.getPlayerById(playerId).name} holds capitals (+${capitalBonus})`, 'text-yellow-400');
    }

    return reinforcements;
}

export function rollDice(count) {
    return Array.from({length: count}, () => Math.floor(Math.random() * 6) + 1);
}

function checkForWinner() {
    const activePlayers = state.gameState.players.filter(p =>
        Object.values(state.gameState.territories).some(t => t.ownerId === p.id)
    );
    if (activePlayers.length <= 1) {
        if (activePlayers.length === 1) {
            const winner = activePlayers[0];
            ui.showWinnerModal(winner);
            return true;
        } else if (Object.values(state.gameState.territories).some(t => t.ownerId !== null)) {
            const lastOwnerId = Object.values(state.gameState.territories).find(t => t.armies > 0)?.ownerId;
            if (lastOwnerId) {
                const winner = state.getPlayerById(lastOwnerId);
                ui.showWinnerModal(winner);
                return true;
            }
        }
    }
    return false;
}
