import * as state from './state.js';
import * as ui from './ui.js';
import { territoriesData } from './constants.js';
import { changePhase, rollDice, endTurn } from './game.js';

function executeAIReinforce() {
    const player = state.getCurrentPlayer();
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

    const goodAttacks = possibleAttacks.filter(attack => state.gameState.territories[attack.from].armies > state.gameState.territories[attack.to].armies);

    if (goodAttacks.length === 0 || Math.random() > 0.8) {
        ui.logMessage("AI concludes its attack phase.");
        callback();
        return;
    }

    const attack = goodAttacks.sort((a, b) => state.gameState.territories[b.from].armies - state.gameState.territories[a.from].armies)[0];

    ui.logMessage(`AI attacks ${territoriesData[attack.to].name} from ${territoriesData[attack.from].name}.`);
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
            toRect?.classList.add('conquered');
            setTimeout(() => toRect?.classList.remove('conquered'), 800);
            const armiesToMove = Math.max(1, attackerDice - attackerLosses);
            defenderState.armies = armiesToMove;
            attackerState.armies -= armiesToMove;
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

    myTerritories.forEach(tId => {
        if (state.gameState.territories[tId].armies > 1) {
            const isSafe = !territoriesData[tId].adj.some(adjId => state.gameState.territories[adjId].ownerId !== player.id);
            if (isSafe) {
                 myTerritories.forEach(destId => {
                    if (tId !== destId) {
                        const isBorder = territoriesData[destId].adj.some(adjId => state.gameState.territories[adjId].ownerId !== player.id);
                        if(isBorder) {
                            possibleMoves.push({ from: tId, to: destId, armies: state.gameState.territories[tId].armies - 1 });
                        }
                    }
                });
            }
        }
    });

    if (possibleMoves.length > 0) {
        const bestMove = possibleMoves.sort((a,b) => b.armies - a.armies)[0];
        state.gameState.territories[bestMove.from].armies -= bestMove.armies;
        state.gameState.territories[bestMove.to].armies += bestMove.armies;
        ui.logMessage(`AI fortified ${territoriesData[bestMove.to].name} from ${territoriesData[bestMove.from].name} with ${bestMove.armies} armies.`);
        ui.updateUI();
    } else {
        ui.logMessage("AI chooses not to fortify.");
    }
}

export function executeAITurn() {
    const phaseDelay = Math.max(250, state.gameState.aiBattleSpeed / 2);
    changePhase('REINFORCE');

    setTimeout(() => {
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
    }, phaseDelay);
}
