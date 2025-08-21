import * as state from './state.js';
import * as ui from './ui.js';
import { PLAYER_COLORS, territoriesData, continentsData } from './constants.js';
import { executeAITurn } from './ai.js';

// --- GAME SETUP & FLOW ---
export function setupGame(numAI) {
    state.initGameState();
    const totalPlayers = numAI + 1;
    const startingArmiesMap = { 2: 40, 3: 35, 4: 30, 5: 25 };
    const startingArmies = startingArmiesMap[totalPlayers];

    // Create players
    const players = [];
    players.push({ id: 1, name: 'You', color: PLAYER_COLORS[0], isAI: false });
    for (let i = 0; i < numAI; i++) {
        players.push({ id: i + 2, name: `AI ${i + 1}`, color: PLAYER_COLORS[i + 1], isAI: true });
    }
    state.setPlayers(players);

    // Assign territories
    const territories = {};
    const territoryIds = Object.keys(territoriesData);
    territoryIds.sort(() => Math.random() - 0.5);
    territoryIds.forEach((tId, index) => {
        const owner = state.gameState.players[index % totalPlayers];
        territories[tId] = { ownerId: owner.id, armies: 1 };
    });

    // Distribute armies
    state.gameState.players.forEach(player => {
        const myTerritories = territoryIds.filter(tId => territories[tId].ownerId === player.id);
        let armiesToPlace = startingArmies - myTerritories.length;
        for (let i = 0; i < armiesToPlace; i++) {
            const randTerritory = myTerritories[Math.floor(Math.random() * myTerritories.length)];
            territories[randTerritory].armies++;
        }
    });
    state.setTerritories(territories);

    ui.clearLog();
    ui.logMessage('Game started! Your turn.');
    startTurn();
}

function startTurn() {
    if (checkForWinner()) return;

    const currentPlayer = state.getCurrentPlayer();
    const playerTerritoryCount = Object.values(state.gameState.territories).filter(t => t.ownerId === currentPlayer.id).length;

    if (playerTerritoryCount === 0) {
        ui.logMessage(`${currentPlayer.name} has been eliminated.`, 'text-gray-500');
        state.nextPlayer();
        startTurn();
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
    if (state.getCurrentPlayer().isAI) return;
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
                if (territoryState.ownerId === currentPlayer.id && tId !== fortify.source && isPathBetween(fortify.source, tId, currentPlayer.id)) {
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
        const rect = document.getElementById(`rect-${targetId}`);
        if (rect) {
            rect.classList.add('conquered');
            setTimeout(() => rect.classList.remove('conquered'), 800);
        }
        const armiesToMove = Math.min(attackerDiceCount, sourceState.armies -1);
        targetState.armies = armiesToMove > 0 ? armiesToMove : 1;
        sourceState.armies -= armiesToMove > 0 ? armiesToMove : 1;
        ui.closeAttackModal();
        if(checkForWinner()) return;
    } else {
        ui.updateAttackModalAfterBattle();
    }
    ui.updateUI();
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
    changePhase('FORTIFY');
}

export function endTurn() {
    advanceToNextPlayer();
}

// --- UTILITY FUNCTIONS ---
function calculateReinforcements(playerId) {
    const playerTerritories = Object.keys(state.gameState.territories).filter(tId => state.gameState.territories[tId].ownerId === playerId);
    if (playerTerritories.length === 0) {
        return 0;
    }
    let reinforcements = Math.max(3, Math.floor(playerTerritories.length / 3));
    for (const continentName in continentsData) {
        const continentTerritories = Object.keys(territoriesData).filter(tId => territoriesData[tId].continent === continentName);
        const controlsContinent = continentTerritories.every(tId => state.gameState.territories[tId]?.ownerId === playerId);
        if(controlsContinent) {
            const bonus = continentsData[continentName].bonus;
            reinforcements += bonus;
            ui.logMessage(`${state.getPlayerById(playerId).name} controls ${continentName} (+${bonus})`, 'text-green-400');
        }
    }
    return reinforcements;
}

function isPathBetween(startNode, endNode, playerId) {
    let queue = [startNode], visited = new Set([startNode]);
    while (queue.length > 0) {
        let currentNode = queue.shift();
        if (currentNode === endNode) return true;
        for (const neighbor of territoriesData[currentNode].adj) {
            if (!visited.has(neighbor) && state.gameState.territories[neighbor]?.ownerId === playerId) {
                visited.add(neighbor);
                queue.push(neighbor);
            }
        }
    }
    return false;
}

export function rollDice(count) {
    return Array.from({length: count}, () => Math.floor(Math.random() * 6) + 1);
}

function checkForWinner() {
    const activePlayers = state.gameState.players.filter(p =>
        Object.values(state.gameState.territories).some(t => t.ownerId === p.id)
    );
    if (activePlayers.length === 1) {
        const winner = activePlayers[0];
        ui.showWinnerModal(winner);
        return true;
    }
    return false;
}
