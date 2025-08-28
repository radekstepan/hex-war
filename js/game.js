import * as state from './state.js';
import * as ui from './ui.js';
import { PLAYER_COLORS, territoriesData, continentsData, CAPITAL_REINFORCEMENT_BONUS, TURNS_TO_ENTRENCH, ENTRENCHMENT_DEFENSE_BONUS } from './constants.js';
import { executeAITurn } from './ai.js';

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
export function setupGame(playerConfigs) {
    state.initGameState();
    state.gameState.aiBattleSpeed = 500; // Hardcode to "Fast"

    const totalPlayers = playerConfigs.length;
    const startingArmiesMap = { 2: 40, 3: 35, 4: 30, 5: 25 };
    const startingArmies = startingArmiesMap[totalPlayers] || 25;

    const players = playerConfigs.map((config, index) => ({
        id: index + 1,
        name: config.name,
        color: config.color,
        isAI: config.isAI,
        difficulty: config.difficulty, // Will be undefined for human
        capitalTerritory: null,
    }));
    state.setPlayers(players);

    const territories = {};
    const territoryIds = Object.keys(territoriesData);
    territoryIds.sort(() => Math.random() - 0.5);
    territoryIds.forEach((tId, index) => {
        const owner = state.gameState.players[index % totalPlayers];
        territories[tId] = { ownerId: owner.id, armies: 1, entrenchedTurns: 0 };
    });

    state.gameState.players.forEach(player => {
        const myTerritories = territoryIds.filter(tId => territories[tId].ownerId === player.id);
        let armiesToPlace = startingArmies - myTerritories.length;
        for (let i = 0; i < armiesToPlace; i++) {
            const randTerritory = myTerritories[Math.floor(Math.random() * myTerritories.length)];
            territories[randTerritory].armies++;
        }
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

    if (currentPlayer.isAI && handleAISurrender(currentPlayer)) {
        ui.updateUI();
        advanceToNextPlayer();
        return;
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
                territoryState.entrenchedTurns = 0;
                state.gameState.modifiedTerritories.add(tId);
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

    sourceState.entrenchedTurns = 0;
    state.gameState.modifiedTerritories.add(sourceId);

    const defenderDiceCount = Math.min(targetState.armies, 2);
    const attackerRolls = rollDice(attackerDiceCount).sort((a,b) => b-a);
    const defenderRolls = rollDice(defenderDiceCount).sort((a,b) => b-a);
    
    const isEntrenched = targetState.entrenchedTurns >= TURNS_TO_ENTRENCH;
    if (isEntrenched) {
        defenderRolls[0] += ENTRENCHMENT_DEFENSE_BONUS;
        ui.logMessage("Defender is entrenched! +1 to highest die.", "text-cyan-400");
    }

    ui.displayDice('attacker', attackerRolls);
    ui.displayDice('defender', defenderRolls);
    let attackerLosses = 0, defenderLosses = 0;
    for (let i = 0; i < Math.min(attackerRolls.length, defenderRolls.length); i++) {
        if (attackerRolls[i] > defenderRolls[i]) defenderLosses++;
        else attackerLosses++;
    }
    sourceState.armies -= attackerLosses;
    targetState.armies -= defenderLosses;
    
    document.getElementById('attacker-armies').textContent = sourceState.armies;
    document.getElementById('defender-armies').textContent = targetState.armies;
    document.getElementById('mini-armies-attacker').textContent = sourceState.armies;
    document.getElementById('mini-armies-defender').textContent = targetState.armies;

    if (attackerLosses > 0) {
        const tile = document.getElementById('mini-rect-attacker');
        tile.classList.add('losing-armies');
        setTimeout(() => tile.classList.remove('losing-armies'), 300);
    }
    if (defenderLosses > 0) {
        const tile = document.getElementById('mini-rect-defender');
        tile.classList.add('losing-armies');
        setTimeout(() => tile.classList.remove('losing-armies'), 300);
    }

    document.getElementById('attack-result').textContent = `Attacker loses ${attackerLosses}, Defender loses ${defenderLosses}.`;
    ui.logMessage(`${state.getCurrentPlayer().name} attacks ${territoriesData[targetId].name}. Result: Attacker loses ${attackerLosses}, Defender loses ${defenderLosses}.`, 'text-yellow-400');

    if (targetState.armies <= 0) {
        ui.logMessage(`${state.getCurrentPlayer().name} conquered ${territoriesData[targetId].name}!`, 'text-green-400');
        targetState.ownerId = state.getCurrentPlayer().id;
        targetState.entrenchedTurns = 0;
        state.gameState.modifiedTerritories.add(targetId);
        if (!state.getCurrentPlayer().isAI) updateRevealedTerritories();
        
        document.getElementById('mini-rect-defender').style.fill = state.getCurrentPlayer().color;
        
        const rect = document.getElementById(`rect-${targetId}`);
        if (rect) {
            rect.classList.add('conquered');
            setTimeout(() => rect.classList.remove('conquered'), 800);
        }
        
        const armiesToMove = Math.min(attackerDiceCount, sourceState.armies - 1);
        targetState.armies = armiesToMove > 0 ? armiesToMove : 1;
        sourceState.armies -= (armiesToMove > 0 ? armiesToMove : 0);
        if (sourceState.armies < 1) sourceState.armies = 1;


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
                stopBlitz(true); return;
            }

            sourceState.entrenchedTurns = 0;
            state.gameState.modifiedTerritories.add(sourceId);

            const attackerDiceCount = Math.min(3, sourceState.armies - 1);
            const defenderDiceCount = Math.min(2, targetState.armies);
            const attackerRolls = rollDice(attackerDiceCount).sort((a, b) => b - a);
            const defenderRolls = rollDice(defenderDiceCount).sort((a, b) => b - a);
            
            const isEntrenched = targetState.entrenchedTurns >= TURNS_TO_ENTRENCH;
            if (isEntrenched) defenderRolls[0] += ENTRENCHMENT_DEFENSE_BONUS;

            let attackerLosses = 0, defenderLosses = 0;
            for (let i = 0; i < Math.min(attackerRolls.length, defenderRolls.length); i++) {
                if (attackerRolls[i] > defenderRolls[i]) defenderLosses++;
                else attackerLosses++;
            }

            sourceState.armies -= attackerLosses;
            targetState.armies -= defenderLosses;

            document.getElementById('attacker-armies').textContent = sourceState.armies;
            document.getElementById('defender-armies').textContent = targetState.armies;
            document.getElementById('mini-armies-attacker').textContent = sourceState.armies;
            document.getElementById('mini-armies-defender').textContent = targetState.armies;

            if (attackerLosses > 0) {
                const tile = document.getElementById('mini-rect-attacker');
                tile.classList.add('losing-armies');
                setTimeout(() => tile.classList.remove('losing-armies'), 300);
            }
            if (defenderLosses > 0) {
                const tile = document.getElementById('mini-rect-defender');
                tile.classList.add('losing-armies');
                setTimeout(() => tile.classList.remove('losing-armies'), 300);
            }

            document.getElementById('attack-result').textContent = `Attacker loses ${attackerLosses}, Defender loses ${defenderLosses}.`;
            ui.updateUI();

            if (targetState.armies <= 0) {
                ui.logMessage(`${state.getCurrentPlayer().name} conquered ${territoriesData[targetId].name} via blitz!`, 'text-green-400');
                targetState.ownerId = state.getCurrentPlayer().id;
                targetState.entrenchedTurns = 0;
                state.gameState.modifiedTerritories.add(targetId);
                if (!state.getCurrentPlayer().isAI) updateRevealedTerritories();
                
                document.getElementById('mini-rect-defender').style.fill = state.getCurrentPlayer().color;

                const rect = document.getElementById(`rect-${targetId}`);
                if (rect) {
                    rect.classList.add('conquered');
                    setTimeout(() => rect.classList.remove('conquered'), 800);
                }
                
                const armiesToMove = Math.min(attackerDiceCount, sourceState.armies - 1);
                targetState.armies = armiesToMove > 0 ? armiesToMove : 1;
                sourceState.armies -= (armiesToMove > 0 ? armiesToMove : 0);
                if (sourceState.armies < 1) sourceState.armies = 1;

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

    state.gameState.territories[source].entrenchedTurns = 0;
    state.gameState.territories[target].entrenchedTurns = 0;
    state.gameState.modifiedTerritories.add(source);
    state.gameState.modifiedTerritories.add(target);

    state.setFortified();
    ui.logMessage(`${state.getCurrentPlayer().name} fortified ${territoriesData[target].name} with ${amount} armies.`);
    ui.closeFortifyModal();
    endTurn();
}

export function cancelFortify() {
    ui.closeFortifyModal();
}

export function endAttackPhase() {
    if (state.gameState.isBlitzing) return;
    changePhase('FORTIFY');
}

function updateEntrenchment() {
    const player = state.getCurrentPlayer();
    for (const tId in state.gameState.territories) {
        if (state.gameState.territories[tId].ownerId === player.id && !state.gameState.modifiedTerritories.has(tId)) {
            state.gameState.territories[tId].entrenchedTurns++;
        }
    }
}

export function endTurn() {
    updateEntrenchment();
    if (state.gameState.fortify.hasFortified) {
        advanceToNextPlayer();
    } else {
        advanceToNextPlayer();
    }
}

function calculateReinforcements(playerId) {
    const playerTerritories = Object.keys(state.gameState.territories).filter(tId => state.gameState.territories[tId].ownerId === playerId);
    if (playerTerritories.length === 0) return 0;
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
        const winner = activePlayers.length === 1 ? activePlayers[0] : null;
        if (winner) {
            ui.showWinnerModal(winner);
            return true;
        }
    }
    return false;
}
