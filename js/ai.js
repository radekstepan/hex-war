import * as state from './state.js';
import * as ui from './ui.js';
import { territoriesData, TURNS_TO_ENTRENCH } from './constants.js';
import { changePhase, rollDice, endTurn, calculateReinforcements } from './game.js';
import { evaluateHand, shuffleDeck } from './cards.js';

function aiDrawCards(player, count) {
    for (let i = 0; i < count; i++) {
        if (state.gameState.deck.length === 0) {
            if (state.gameState.discardPile.length === 0) {
                console.error("AI cannot draw card, no cards left anywhere.");
                break; 
            }
            state.gameState.deck = state.gameState.discardPile;
            state.gameState.discardPile = [];
            shuffleDeck(state.gameState.deck);
        }
        const card = state.drawCard();
        if (card) player.hand.push(card);
    }
}

function executeAIReinforce() {
    const player = state.getCurrentPlayer();
    if (player.armiesToDeploy === 0) return;
    const myTerritories = Object.keys(state.gameState.territories).filter(tId => state.gameState.territories[tId].ownerId === player.id);

    if (myTerritories.length === 0) {
        return;
    }

    const borderTerritories = myTerritories.filter(tId =>
        territoriesData[tId].adj.some(adjId => state.gameState.territories[adjId].ownerId !== player.id)
    );

    const territoryToReinforce = borderTerritories.length > 0
        ? borderTerritories[Math.floor(Math.random() * borderTerritories.length)]
        : myTerritories[0];

    ui.logMessage(`AI reinforces ${territoriesData[territoryToReinforce].name} with ${player.armiesToDeploy} armies.`);
    state.gameState.territories[territoryToReinforce].armies += player.armiesToDeploy;
    state.gameState.territories[territoryToReinforce].entrenchedTurns = 0;
    state.gameState.modifiedTerritories.add(territoryToReinforce);
    player.armiesToDeploy = 0;
    ui.updateUI();
}

function executeAIAttacks(callback) {
    const player = state.getCurrentPlayer();
    const possibleAttacks = [];
    for (const tId in state.gameState.territories) {
        if (state.gameState.territories[tId].ownerId === player.id && state.gameState.territories[tId].armies > 1) {
            territoriesData[tId].adj.forEach(adjId => {
                if (state.gameState.territories[adjId].ownerId !== player.id) {
                    possibleAttacks.push({ from: tId, to: adjId });
                }
            });
        }
    }
    const attackBonusValue = player.attackBonus ? player.attackBonus.bonus : 0;
    const goodAttacks = possibleAttacks.filter(attack => {
        const isEntrenched = state.gameState.territories[attack.to].entrenchedTurns >= TURNS_TO_ENTRENCH;
        const defenseBonus = isEntrenched ? 2 : 0; // AI considers entrenchment worth ~2 armies
        return (state.gameState.territories[attack.from].armies + attackBonusValue / 2) > (state.gameState.territories[attack.to].armies + defenseBonus);
    });
    
    const attackProbability = { 'Easy': 0.5, 'Normal': 0.8, 'Hard': 1.0 };
    const willAttack = Math.random() < (attackProbability[player.difficulty] || 0.8);

    if (goodAttacks.length === 0 || !willAttack) {
        ui.logMessage("AI concludes its attack phase.");
        callback();
        return;
    }

    const attack = goodAttacks.sort((a, b) => state.gameState.territories[b.from].armies - state.gameState.territories[a.from].armies)[0];

    ui.logMessage(`AI attacks ${territoriesData[attack.to].name} from ${territoriesData[attack.from].name}.`);
    state.gameState.territories[attack.from].entrenchedTurns = 0;
    state.gameState.modifiedTerritories.add(attack.from);

    const fromRect = document.getElementById(`rect-${attack.from}`);
    const toRect = document.getElementById(`rect-${attack.to}`);
    fromRect?.classList.add('fighting');
    toRect?.classList.add('fighting');

    setTimeout(() => {
        const attackerState = state.gameState.territories[attack.from];
        const defenderState = state.gameState.territories[attack.to];

        if (!attackerState || !defenderState) {
            fromRect?.classList.remove('fighting');
            toRect?.classList.remove('fighting');
            executeAIAttacks(callback);
            return;
        }

        const attackerDice = Math.min(3, attackerState.armies - 1);
        const defenderDice = Math.min(2, defenderState.armies);
        const attackerRolls = rollDice(attackerDice).sort((a, b) => b - a);
        const defenderRolls = rollDice(defenderDice).sort((a, b) => b - a);
        
        if (player.attackBonus) {
            attackerRolls[0] += player.attackBonus.bonus;
        }

        const isEntrenched = defenderState.entrenchedTurns >= TURNS_TO_ENTRENCH;
        if (isEntrenched) {
            defenderRolls[0] += 1;
            ui.logMessage("Defender is entrenched! +1 to highest die.", "text-cyan-400");
        }

        let attackerLosses = 0, defenderLosses = 0;

        for (let i = 0; i < Math.min(attackerRolls.length, defenderRolls.length); i++) {
            if (attackerRolls[i] > defenderRolls[i]) defenderLosses++; else attackerLosses++;
        }

        attackerState.armies -= attackerLosses;
        defenderState.armies -= defenderLosses;
        ui.logMessage(`Battle Result: Attacker loses ${attackerLosses}, Defender loses ${defenderLosses}.`, 'text-yellow-400');

        if (defenderState.armies <= 0) {
            ui.logMessage(`AI conquered ${territoriesData[attack.to].name}!`, 'text-green-400');
            defenderState.ownerId = player.id;
            defenderState.entrenchedTurns = 0;
            state.gameState.modifiedTerritories.add(attack.to);
            toRect?.classList.add('conquered');
            setTimeout(() => toRect?.classList.remove('conquered'), 800);
            
            const armiesToMove = Math.min(attackerDice, attackerState.armies - 1);
            defenderState.armies = armiesToMove > 0 ? armiesToMove : 1;
            attackerState.armies -= (armiesToMove > 0 ? armiesToMove : 0);
            if (attackerState.armies < 1) attackerState.armies = 1;
        }

        ui.updateUI();
        fromRect?.classList.remove('fighting');
        toRect?.classList.remove('fighting');

        executeAIAttacks(callback);

    }, state.gameState.aiBattleSpeed);
}

function executeAIFortify() {
    const player = state.getCurrentPlayer();
    const myTerritories = Object.keys(state.gameState.territories).filter(tId => state.gameState.territories[tId].ownerId === player.id);
    const possibleMoves = [];

    const isBorderTerritory = (tId) => territoriesData[tId].adj.some(adjId => state.gameState.territories[adjId].ownerId !== player.id);

    myTerritories.forEach(fromId => {
        if (state.gameState.territories[fromId].armies > 1) {
            const isFromBorder = isBorderTerritory(fromId);
            territoriesData[fromId].adj.forEach(toId => {
                if (state.gameState.territories[toId].ownerId === player.id) {
                    const isToBorder = isBorderTerritory(toId);
                    if (!isFromBorder && isToBorder) {
                        const armiesToMove = state.gameState.territories[fromId].armies - 1;
                        possibleMoves.push({ from: fromId, to: toId, armies: armiesToMove });
                    }
                }
            });
        }
    });

    if (possibleMoves.length > 0) {
        const bestMove = possibleMoves.sort((a,b) => b.armies - a.armies)[0];
        state.gameState.territories[bestMove.from].armies -= bestMove.armies;
        state.gameState.territories[bestMove.to].armies += bestMove.armies;
        
        state.gameState.territories[bestMove.from].entrenchedTurns = 0;
        state.gameState.territories[bestMove.to].entrenchedTurns = 0;
        state.gameState.modifiedTerritories.add(bestMove.from);
        state.gameState.modifiedTerritories.add(bestMove.to);

        ui.logMessage(`AI fortified ${territoriesData[bestMove.to].name} from ${territoriesData[bestMove.from].name} with ${bestMove.armies} armies.`);
        ui.updateUI();
    } else {
        ui.logMessage("AI chooses not to fortify.");
    }
}

export function executeAICardPlay(callback) {
    const player = state.getCurrentPlayer();
    const hand = player.hand;
    let bestPlay = { combination: [], handInfo: null, score: -1 };

    if (hand.length >= 3) {
        for (let i = 0; i < hand.length - 2; i++) {
            for (let j = i + 1; j < hand.length - 1; j++) {
                for (let k = j + 1; k < hand.length; k++) {
                    const combination = [hand[i], hand[j], hand[k]];
                    const handInfo = evaluateHand(combination);
                    if (handInfo) {
                        const score = handInfo.bonus;
                        if (score > bestPlay.score) {
                            bestPlay = { combination, handInfo, score, indices: [i, j, k] };
                        }
                    }
                }
            }
        }
    }

    setTimeout(() => {
        if (bestPlay.handInfo) {
            player.attackBonus = bestPlay.handInfo;
            player.playedHand = [...bestPlay.combination];
            ui.logMessage(`AI ${player.name} played a ${bestPlay.handInfo.name} for +${bestPlay.handInfo.bonus} attack bonus!`, 'text-yellow-300');
            state.addToDiscardPile(bestPlay.combination);
            bestPlay.indices.sort((a, b) => b - a).forEach(index => player.hand.splice(index, 1));
            aiDrawCards(player, 3);
        } else {
            if (player.hand.length > 0) {
                const cardToDiscardIndex = Math.floor(Math.random() * player.hand.length);
                const cardToDiscard = player.hand[cardToDiscardIndex];
                state.addToDiscardPile(cardToDiscard);
                player.hand.splice(cardToDiscardIndex, 1);
                ui.logMessage(`AI ${player.name} discarded a card.`);
                aiDrawCards(player, 1);
            }
        }
        ui.updateUI();
        callback();
    }, 1000);
}

export function executeAIMainTurn() {
    const phaseDelay = Math.max(250, state.gameState.aiBattleSpeed / 2);
    
    changePhase('REINFORCE');
    executeAIReinforce();

    setTimeout(() => {
        changePhase('ATTACK');
        executeAIAttacks(() => {
            setTimeout(() => {
                changePhase('FORTIFY');
                executeAIFortify();
                setTimeout(() => {
                    endTurn();
                }, phaseDelay);
            }, phaseDelay);
        });
    }, phaseDelay);
}
