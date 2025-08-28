import { TILE_WIDTH, TILE_HEIGHT, TILE_GAP, territoriesData, continentsData, TURNS_TO_ENTRENCH, PLAYER_COLORS, AI_DIFFICULTIES, ENTRENCHMENT_DEFENSE_BONUS, AI_NAMES } from './constants.js';
import * as state from './state.js';
import { onTerritoryClick, performAttack, performBlitzAttack, stopBlitz, confirmFortify, cancelFortify, endAttackPhase, endTurn, playSelectedCards, discardCard, proceedToReinforce } from './game.js';
import { evaluateHand } from './cards.js';

// --- DOM ELEMENTS ---
export const ui = {
    gameContainer: document.getElementById('game-container'),
    startupModal: document.getElementById('startup-modal'),
    startGameBtn: document.getElementById('start-game-btn'),
    mapSvg: document.getElementById('map-svg'),
    playerNameEl: document.getElementById('player-name'),
    playerColorIndicatorEl: document.getElementById('player-color-indicator'),
    gamePhaseEl: document.getElementById('game-phase'),
    armiesToDeployEl: document.getElementById('armies-to-deploy'),
    reinforcementsInfoEl: document.getElementById('reinforcements-info'),
    nextPhaseBtn: document.getElementById('next-phase-btn'),
    lastLogMessageEl: document.getElementById('last-log-message'),
    attackModal: document.getElementById('attack-modal'),
    winnerModal: document.getElementById('winner-modal'),
    fortifyModal: document.getElementById('fortify-modal'),
    restartGameBtn: document.getElementById('restart-game-btn'),
    aiStatusEl: document.getElementById('ai-status'),
    balanceContainer: document.getElementById('balance-of-power-container'),
    blitzAttackBtn: document.getElementById('blitz-attack-btn'),
    blitzOptions: document.getElementById('blitz-options'),
    stopBlitzBtn: document.getElementById('stop-blitz-btn'),
    miniMapContainer: document.getElementById('mini-map-container'),
    playerConfigContainer: document.getElementById('player-config-container'),
    addAiBtn: document.getElementById('add-ai-btn'),
    playerBonusesContainer: document.getElementById('active-bonuses-list'),
    cardUiContainer: document.getElementById('card-ui-container'),
    playerHandContainer: document.getElementById('player-hand-container'),
    playCardsBtn: document.getElementById('play-cards-btn'),
    discardCardBtn: document.getElementById('discard-card-btn'),
    skipCardsBtn: document.getElementById('skip-cards-btn'),
};

let playerConfigs = [];
let selectedCardIndices = [];
let availableAiNames = [];

export function getPlayerConfigs() {
    return playerConfigs;
}

function renderPlayerConfigs() {
    ui.playerConfigContainer.innerHTML = '';
    const usedColors = playerConfigs.map(p => p.color);

    playerConfigs.forEach((player, index) => {
        const isAI = player.isAI;
        const div = document.createElement('div');
        div.className = 'flex items-center space-x-3 bg-gray-700 p-2 rounded-lg';

        const colorPalette = PLAYER_COLORS.map(color => {
            const isUsed = usedColors.includes(color) && player.color !== color;
            return `<div class="color-swatch ${isUsed ? 'disabled' : ''}" data-color="${color}" style="background-color: ${color}; border: ${player.color === color ? '2px solid white' : '2px solid transparent'};"></div>`;
        }).join('');

        const difficultyOptions = AI_DIFFICULTIES.map(d => `<option value="${d}" ${player.difficulty === d ? 'selected' : ''}>${d}</option>`).join('');

        div.innerHTML = `
            <div class="w-1/4 font-bold text-lg">${player.name}</div>
            <div class="w-1/2 flex justify-center space-x-2">${colorPalette}</div>
            <div class="w-1/4">
                ${isAI ? `
                    <select data-index="${index}" class="player-difficulty bg-gray-600 text-white p-1 rounded-md w-full">
                        ${difficultyOptions}
                    </select>
                ` : `<div class="text-sm text-gray-400">Human Player</div>`}
            </div>
            <button data-index="${index}" class="remove-ai-btn text-red-500 hover:text-red-400 font-bold ${!isAI || playerConfigs.filter(p => p.isAI).length <= 1 ? 'hidden' : ''}">X</button>
        `;
        ui.playerConfigContainer.appendChild(div);
    });

    ui.addAiBtn.disabled = playerConfigs.length >= 5;
}

export function setupPlayerConfigUI() {
    availableAiNames = [...AI_NAMES];
    // Shuffle the names for variety each time the game loads
    for (let i = availableAiNames.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableAiNames[i], availableAiNames[j]] = [availableAiNames[j], availableAiNames[i]];
    }

    playerConfigs = [
        { name: 'You', color: PLAYER_COLORS[0], isAI: false },
        { name: availableAiNames.pop() || 'AI Commander', color: PLAYER_COLORS[1], isAI: true, difficulty: 'Normal' }
    ];
    renderPlayerConfigs();

    ui.addAiBtn.onclick = () => {
        if (playerConfigs.length < 5) {
            const nextColor = PLAYER_COLORS.find(c => !playerConfigs.map(p => p.color).includes(c));
            playerConfigs.push({
                name: availableAiNames.pop() || `AI Opponent ${playerConfigs.filter(p => p.isAI).length}`,
                color: nextColor || '#ffffff',
                isAI: true,
                difficulty: 'Normal'
            });
            renderPlayerConfigs();
        }
    };

    ui.playerConfigContainer.addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('color-swatch') && !target.classList.contains('disabled')) {
            const color = target.dataset.color;
            const index = target.closest('.flex').parentElement.querySelector('.remove-ai-btn, .player-difficulty')?.dataset.index;
            if (index) {
                playerConfigs[index].color = color;
                renderPlayerConfigs();
            }
        }
        if (target.classList.contains('remove-ai-btn')) {
            const index = parseInt(target.dataset.index);
            const removedPlayerName = playerConfigs[index].name;
            if (AI_NAMES.includes(removedPlayerName)) {
                availableAiNames.push(removedPlayerName);
            }
            playerConfigs.splice(index, 1);
            renderPlayerConfigs();
        }
    });

    ui.playerConfigContainer.addEventListener('change', (e) => {
        if (e.target.classList.contains('player-difficulty')) {
            const index = parseInt(e.target.dataset.index);
            playerConfigs[index].difficulty = e.target.value;
        }
    });
}


// --- MAP RENDERING ---
function getTerritoryCenter(tId) {
    const territory = territoriesData[tId];
    if (!territory) return { x: 0, y: 0 };
    const x = territory.gridX * (TILE_WIDTH + TILE_GAP) + TILE_WIDTH / 2;
    const y = territory.gridY * (TILE_HEIGHT + TILE_GAP) + TILE_HEIGHT / 2;
    return { x, y };
}

export function renderMap() {
    ui.mapSvg.innerHTML = '';
    
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const connectionsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const territoriesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    
    g.appendChild(connectionsGroup);
    g.appendChild(territoriesGroup);
    ui.mapSvg.appendChild(g);

    const drawnConnections = new Set();
    for (const tId in territoriesData) {
        const territory = territoriesData[tId];
        const { x: x1, y: y1 } = getTerritoryCenter(tId);
        territory.adj.forEach(adjId => {
            const connId1 = `${tId}-${adjId}`, connId2 = `${adjId}-${tId}`;
            if (!drawnConnections.has(connId1) && !drawnConnections.has(connId2)) {
                const { x: x2, y: y2 } = getTerritoryCenter(adjId);
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('id', `line-${connId1}`);
                line.setAttribute('x1', x1); line.setAttribute('y1', y1); line.setAttribute('x2', x2); line.setAttribute('y2', y2);
                line.classList.add('connection-line');
                connectionsGroup.appendChild(line);
                drawnConnections.add(connId1);
            }
        });
    }
    for (const tId in territoriesData) {
        const territory = territoriesData[tId];
        const x = territory.gridX * (TILE_WIDTH + TILE_GAP);
        const y = territory.gridY * (TILE_HEIGHT + TILE_GAP);
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('id', `rect-${tId}`);
        rect.setAttribute('x', x); rect.setAttribute('y', y);
        rect.setAttribute('width', TILE_WIDTH); rect.setAttribute('height', TILE_HEIGHT);
        rect.setAttribute('fill', continentsData[territory.continent].color);
        rect.classList.add('territory-rect');
        rect.addEventListener('click', () => onTerritoryClick(tId));
        territoriesGroup.appendChild(rect);

        const nameLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        nameLabel.setAttribute('id', `name-label-${tId}`);
        nameLabel.setAttribute('x', x + TILE_WIDTH / 2); nameLabel.setAttribute('y', y + 20);
        nameLabel.classList.add('territory-name-label');
        
        const starTspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
        starTspan.setAttribute('id', `star-${tId}`);
        starTspan.classList.add('capital-star');
        starTspan.textContent = '★ ';
        starTspan.style.display = 'none';

        const nameTspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
        nameTspan.textContent = territory.name;

        nameLabel.appendChild(starTspan);
        nameLabel.appendChild(nameTspan);
        territoriesGroup.appendChild(nameLabel);
        
        const armyLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        armyLabel.setAttribute('id', `label-${tId}`);
        armyLabel.setAttribute('x', x + TILE_WIDTH / 2); armyLabel.setAttribute('y', y + TILE_HEIGHT / 2 + 15);
        armyLabel.classList.add('army-label');
        territoriesGroup.appendChild(armyLabel);
    }
    ui.playCardsBtn.onclick = () => { if (!ui.playCardsBtn.disabled) playSelectedCards(selectedCardIndices); };
    ui.discardCardBtn.onclick = () => { if (!ui.discardCardBtn.disabled) discardCard(selectedCardIndices[0]); };
    ui.skipCardsBtn.onclick = () => proceedToReinforce();
}

// --- UI UPDATES ---
function updateBalanceOfPower() {
    ui.balanceContainer.innerHTML = '';
    const totalTerritories = Object.keys(territoriesData).length;
    state.gameState.players.forEach((player) => {
        const playerTerritories = Object.values(state.gameState.territories).filter(t => t.ownerId === player.id).length;
        if (playerTerritories === 0) return;
        const percent = (playerTerritories / totalTerritories) * 100;
        const bar = document.createElement('div');
        bar.style.width = `${percent}%`;
        bar.style.backgroundColor = player.color;
        bar.classList.add('balance-bar', 'h-full', 'text-xs', 'flex', 'items-center', 'justify-center', 'text-white', 'font-bold');
        bar.textContent = percent > 10 ? `${Math.round(percent)}%` : '';
        ui.balanceContainer.appendChild(bar);
    });
}

function getSuitSymbol(suit) {
    return { 'hearts': '♥', 'diamonds': '♦', 'clubs': '♣', 'spades': '♠' }[suit];
}

function renderMiniCard(card) {
    const cardEl = document.createElement('div');
    cardEl.className = `mini-card ${card.suit}`;
    cardEl.innerHTML = `
        <span class="rank">${card.rank}</span>
        <span class="suit">${getSuitSymbol(card.suit)}</span>
    `;
    return cardEl;
}

function updatePlayerBonuses() {
    if (!ui.playerBonusesContainer) return;

    const playersWithBonuses = new Set(
        state.gameState.players.filter(p => p.attackBonus).map(p => p.id)
    );

    ui.playerBonusesContainer.querySelectorAll('.bonus-item').forEach(el => {
        const playerId = parseInt(el.dataset.playerId);
        if (!playersWithBonuses.has(playerId)) {
            el.classList.remove('visible');
            setTimeout(() => {
                if (!el.classList.contains('visible')) el.remove();
            }, 500);
        }
    });

    state.gameState.players.forEach(p => {
        if (p.attackBonus) {
            let bonusEl = document.getElementById(`bonus-player-${p.id}`);
            if (!bonusEl) {
                bonusEl = document.createElement('div');
                bonusEl.id = `bonus-player-${p.id}`;
                bonusEl.className = 'bonus-item';
                bonusEl.dataset.playerId = p.id;
                bonusEl.style.setProperty('--player-color', p.color);

                bonusEl.innerHTML = `
                    <div class="font-bold text-base text-white">${p.name}</div>
                    <div class="text-sm text-yellow-300">${p.attackBonus.name} (+${p.attackBonus.bonus} Attack)</div>
                    <div class="mini-card-container"></div>
                `;
                ui.playerBonusesContainer.appendChild(bonusEl);
                
                const miniCardContainer = bonusEl.querySelector('.mini-card-container');
                if (p.playedHand && miniCardContainer) {
                    p.playedHand.forEach(card => {
                        miniCardContainer.appendChild(renderMiniCard(card));
                    });
                }
                
                setTimeout(() => bonusEl.classList.add('visible'), 10);
            }
        }
    });
    
    const title = ui.playerBonusesContainer.querySelector('h3');
    if (playersWithBonuses.size > 0 && !title) {
        const titleEl = document.createElement('h3');
        titleEl.className = 'text-sm font-bold text-gray-300 uppercase tracking-wider px-3 pb-1';
        titleEl.textContent = 'Active Bonuses';
        ui.playerBonusesContainer.prepend(titleEl);
    } else if (playersWithBonuses.size === 0 && title) {
        title.remove();
    }
}

function renderCard(card, index, isClickable) {
    const cardEl = document.createElement('div');
    cardEl.className = `card ${card.suit}`;
    cardEl.dataset.index = index;

    cardEl.innerHTML = `
        <div class="rank">${card.rank}</div>
        <div class="suit">${getSuitSymbol(card.suit)}</div>
    `;

    if (isClickable) {
        cardEl.onclick = () => {
            const cardIndex = parseInt(cardEl.dataset.index);
            const selectionIndex = selectedCardIndices.indexOf(cardIndex);

            if (selectionIndex > -1) {
                selectedCardIndices.splice(selectionIndex, 1);
                cardEl.classList.remove('selected');
            } else {
                selectedCardIndices.push(cardIndex);
                cardEl.classList.add('selected');
            }
            updateCardActionButtons();
        };
    } else {
        cardEl.classList.add('disabled');
    }
    return cardEl;
}

function updateCardActionButtons() {
    const player = state.getCurrentPlayer();
    
    ui.discardCardBtn.disabled = selectedCardIndices.length !== 1;

    if (selectedCardIndices.length === 3) {
        const selectedCards = selectedCardIndices.map(i => player.hand[i]);
        const handValue = evaluateHand(selectedCards);
        ui.playCardsBtn.disabled = handValue === null;
    } else {
        ui.playCardsBtn.disabled = true;
    }
}

function updateCardUI() {
    const player = state.getCurrentPlayer();
    const humanPlayer = state.gameState.players.find(p => !p.isAI);

    if (!humanPlayer) {
        ui.cardUiContainer.classList.add('hidden');
        return;
    }

    const isMyCardPhase = player && !player.isAI && state.gameState.gamePhase === 'CARD_PLAY_ROUND';

    ui.cardUiContainer.classList.remove('hidden');
    ui.playerHandContainer.innerHTML = '';
    
    if (isMyCardPhase) {
        selectedCardIndices = [];
    }
    
    humanPlayer.hand.forEach((card, index) => {
        const cardEl = renderCard(card, index, isMyCardPhase);
        if (selectedCardIndices.includes(index)) {
            cardEl.classList.add('selected');
        }
        ui.playerHandContainer.appendChild(cardEl);
    });

    const actionsContainer = document.getElementById('card-actions-container');
    const message = document.getElementById('card-phase-message');
    
    actionsContainer.classList.toggle('hidden', !isMyCardPhase);
    message.classList.toggle('hidden', !isMyCardPhase);
    
    if (isMyCardPhase) {
        updateCardActionButtons();
    }
}

export function updateUI() {
    if (!state.gameState.players || state.gameState.players.length === 0) return;
    updateBalanceOfPower();
    updatePlayerBonuses();
    updateCardUI();

    const currentPlayer = state.getCurrentPlayer();
    ui.playerNameEl.textContent = currentPlayer.name;
    ui.playerColorIndicatorEl.style.backgroundColor = currentPlayer.color;
    ui.gamePhaseEl.textContent = state.gameState.gamePhase.replace(/_/g, ' ');
    ui.aiStatusEl.classList.toggle('hidden', !currentPlayer.isAI);

    if (state.gameState.gamePhase === 'REINFORCE' && !currentPlayer.isAI) {
        ui.reinforcementsInfoEl.classList.remove('hidden');
        ui.armiesToDeployEl.textContent = currentPlayer.armiesToDeploy;
        ui.nextPhaseBtn.classList.add('hidden');
    } else {
        ui.reinforcementsInfoEl.classList.add('hidden');
        ui.nextPhaseBtn.classList.remove('hidden');
    }

    const showNextPhaseButton = !currentPlayer.isAI && (state.gameState.gamePhase === 'ATTACK' || state.gameState.gamePhase === 'FORTIFY');
    ui.nextPhaseBtn.style.display = showNextPhaseButton ? 'block' : 'none';

    if (state.gameState.gamePhase === 'ATTACK') {
        ui.nextPhaseBtn.textContent = 'End Attack Phase';
        ui.nextPhaseBtn.onclick = endAttackPhase;
    } else if (state.gameState.gamePhase === 'FORTIFY') {
        ui.nextPhaseBtn.textContent = 'End Turn';
        ui.nextPhaseBtn.onclick = endTurn;
    }

    const drawnConnections = new Set();
    for (const tId in territoriesData) {
        territoriesData[tId].adj.forEach(adjId => {
            const connId1 = `${tId}-${adjId}`;
            const connId2 = `${adjId}-${tId}`;
            if (!drawnConnections.has(connId1) && !drawnConnections.has(connId2)) {
                const line = document.getElementById(`line-${connId1}`);
                if (line) {
                    const isVisible = state.gameState.revealedTerritories.has(tId) && state.gameState.revealedTerritories.has(adjId);
                    line.style.display = isVisible ? 'block' : 'none';
                }
                drawnConnections.add(connId1);
            }
        });
    }

    const capitalTerritories = new Set(state.gameState.players.map(p => p.capitalTerritory));

    for (const tId in territoriesData) {
        const rect = document.getElementById(`rect-${tId}`);
        const label = document.getElementById(`label-${tId}`);
        const nameLabel = document.getElementById(`name-label-${tId}`);
        const star = document.getElementById(`star-${tId}`);
        const territoryState = state.gameState.territories[tId];
        
        const isRevealed = state.gameState.revealedTerritories.has(tId);

        if (star) {
            star.style.display = capitalTerritories.has(tId) ? 'inline' : 'none';
        }

        if (!isRevealed) {
            if (rect) {
                rect.style.fill = '#2d3748';
                rect.style.setProperty('--glow-color', 'transparent');
                rect.classList.remove('selected', 'selectable', 'selectable-target', 'fighting', 'entrenched-fully');
            }
            if (label) label.textContent = '???';
            if (nameLabel) nameLabel.style.display = 'none';
            continue; 
        }

        if (nameLabel) nameLabel.style.display = 'block';

        if (territoryState && rect) {
            const owner = state.getPlayerById(territoryState.ownerId);
            label.textContent = territoryState.armies;
            if (owner) {
                rect.style.fill = owner.color;
                rect.style.setProperty('--glow-color', owner.color);
            } else {
                rect.style.setProperty('--glow-color', 'transparent');
            }

            rect.classList.remove('entrenched-fully');
            if (territoryState.entrenchedTurns >= TURNS_TO_ENTRENCH) {
                rect.classList.add('entrenched-fully');
            }
        }
        
        if (rect) rect.classList.remove('selected', 'selectable', 'selectable-target');
        
        if (currentPlayer.isAI) continue;

        if (state.gameState.gamePhase === 'ATTACK') {
            if (tId === state.gameState.selectedTerritory) rect?.classList.add('selected');
            else if (state.gameState.selectedTerritory && territoriesData[state.gameState.selectedTerritory].adj.includes(tId) && territoryState.ownerId !== currentPlayer.id) rect?.classList.add('selectable-target');
            else if (territoryState.ownerId === currentPlayer.id && territoryState.armies > 1) rect?.classList.add('selectable');
        } else if (state.gameState.gamePhase === 'FORTIFY' && !state.gameState.fortify.hasFortified) {
            if (tId === state.gameState.fortify.source) rect?.classList.add('selected');
            else if (territoryState.ownerId === currentPlayer.id) rect?.classList.add('selectable');
        }
    }
    ui.nextPhaseBtn.disabled = state.gameState.isBlitzing;
}


export function logMessage(message, colorClass = 'text-gray-300') {
    if (ui.lastLogMessageEl) {
        ui.lastLogMessageEl.innerHTML = `<span class="${colorClass}">${message}</span>`;
    }
}

export function clearLog() {
    if (ui.lastLogMessageEl) {
        ui.lastLogMessageEl.innerHTML = '';
    }
}

function createMiniTile(id, x, y, name, armies, color) {
    const TILE_W = 60;
    const TILE_H = 40;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('id', `mini-rect-${id}`);
    rect.setAttribute('x', x);
    rect.setAttribute('y', y);
    rect.setAttribute('width', TILE_W);
    rect.setAttribute('height', TILE_H);
    rect.setAttribute('fill', color);
    rect.classList.add('mini-tile-rect');

    const nameLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    nameLabel.setAttribute('x', x + TILE_W / 2);
    nameLabel.setAttribute('y', y + 10);
    nameLabel.classList.add('mini-tile-label');
    nameLabel.textContent = name;

    const armyLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    armyLabel.setAttribute('id', `mini-armies-${id}`);
    armyLabel.setAttribute('x', x + TILE_W / 2);
    armyLabel.setAttribute('y', y + 30);
    armyLabel.classList.add('mini-army-label');
    armyLabel.textContent = armies;

    g.appendChild(rect);
    g.appendChild(nameLabel);
    g.appendChild(armyLabel);
    return g;
}

// --- MODAL LOGIC ---
export function showAttackModal(sourceId, targetId) {
    state.setAttackContext(sourceId, targetId);
    const attacker = state.getCurrentPlayer();
    const defender = state.getPlayerById(state.gameState.territories[targetId].ownerId);
    const sourceState = state.gameState.territories[sourceId];
    const targetState = state.gameState.territories[targetId];

    document.getElementById('attacker-name').textContent = attacker.name;
    document.getElementById('attacker-territory').textContent = territoriesData[sourceId].name;
    document.getElementById('defender-name').textContent = defender.name;
    document.getElementById('defender-territory').textContent = territoriesData[targetId].name;
    document.getElementById('attacker-armies').textContent = sourceState.armies;
    document.getElementById('defender-armies').textContent = targetState.armies;

    // Mini Map
    ui.miniMapContainer.innerHTML = '';
    const miniSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    miniSvg.setAttribute('viewBox', '0 0 135 50');
    const attackerTile = createMiniTile('attacker', 5, 5, territoriesData[sourceId].name, sourceState.armies, attacker.color);
    const defenderTile = createMiniTile('defender', 70, 5, territoriesData[targetId].name, targetState.armies, defender.color);
    miniSvg.appendChild(attackerTile);
    miniSvg.appendChild(defenderTile);
    ui.miniMapContainer.appendChild(miniSvg);

    const attackerBonusDisplay = document.getElementById('attacker-bonus-display');
    const defenderBonusDisplay = document.getElementById('defender-bonus-display');
    const attackerBonus = attacker.attackBonus;
    if (attackerBonus) {
        attackerBonusDisplay.textContent = `+${attackerBonus.bonus} ${attackerBonus.name}`;
        attackerBonusDisplay.classList.remove('hidden');
    } else {
        attackerBonusDisplay.classList.add('hidden');
    }
    const isEntrenched = targetState.entrenchedTurns >= TURNS_TO_ENTRENCH;
    if (isEntrenched) {
        defenderBonusDisplay.textContent = `+${ENTRENCHMENT_DEFENSE_BONUS} Entrenched`;
        defenderBonusDisplay.classList.remove('hidden');
    } else {
        defenderBonusDisplay.classList.add('hidden');
    }

    document.getElementById('attack-result').textContent = '';
    document.getElementById('attacker-dice-container').innerHTML = '';
    document.getElementById('defender-dice-container').innerHTML = '';
    document.getElementById('continue-options').classList.add('hidden');
    document.getElementById('blitz-options').classList.add('hidden');
    document.getElementById('attack-options').classList.remove('hidden');

    const attackButtons = document.querySelectorAll('.attack-dice-btn');
    attackButtons.forEach(btn => {
        const numDice = parseInt(btn.dataset.dice);
        btn.disabled = sourceState.armies <= numDice;
        btn.onclick = () => performAttack(numDice);
    });

    const maxDice = Math.min(3, sourceState.armies - 1);
    ui.blitzAttackBtn.disabled = maxDice < 2;
    ui.blitzAttackBtn.onclick = () => performBlitzAttack();

    document.getElementById(`rect-${sourceId}`)?.classList.add('fighting');
    document.getElementById(`rect-${targetId}`)?.classList.add('fighting');
    ui.attackModal.classList.remove('hidden');
}

export function updateAttackModalAfterBattle(showContinue = true) {
    const { sourceId } = state.gameState.attackContext;
    const sourceState = state.gameState.territories[sourceId];

    document.getElementById('attack-options').classList.add('hidden');
    document.getElementById('blitz-options').classList.add('hidden');

    if (showContinue) {
        document.getElementById('continue-options').classList.remove('hidden');
        document.getElementById('continue-attack-btn').disabled = sourceState.armies <= 1;
        document.getElementById('continue-attack-btn').onclick = () => showAttackModal(sourceId, state.gameState.attackContext.targetId);
        document.getElementById('stop-attack-btn').onclick = closeAttackModal;
    }
}

export function showBlitzUI() {
    document.getElementById('attack-options').classList.add('hidden');
    document.getElementById('continue-options').classList.add('hidden');
    document.getElementById('blitz-options').classList.remove('hidden');
    document.getElementById('stop-blitz-btn').onclick = () => stopBlitz();
}


export function closeAttackModal() {
    if (state.gameState.attackContext.sourceId) {
        document.getElementById(`rect-${state.gameState.attackContext.sourceId}`)?.classList.remove('fighting');
        document.getElementById(`rect-${state.gameState.attackContext.targetId}`)?.classList.remove('fighting');
    }
    ui.attackModal.classList.add('hidden');
    state.setBlitzing(false);
    state.setSelectedTerritory(null);
    updateUI();
}


export function displayDice(type, rolls) {
    const container = document.getElementById(`${type}-dice-container`);
    container.innerHTML = '';
    rolls.forEach(roll => {
        const diceEl = document.createElement('div');
        diceEl.classList.add('dice', `${type}-dice`);
        diceEl.textContent = roll;
        container.appendChild(diceEl);
    });
}

export function showFortifyModal(sourceId, targetId) {
    const sourceState = state.gameState.territories[sourceId];
    document.getElementById('fortify-from').textContent = territoriesData[sourceId].name;
    document.getElementById('fortify-to').textContent = territoriesData[targetId].name;
    const slider = document.getElementById('fortify-slider');
    const countLabel = document.getElementById('fortify-count');
    const maxToMove = sourceState.armies - 1;
    slider.max = maxToMove > 0 ? maxToMove : 1;
    slider.value = 1;
    countLabel.textContent = 1;
    slider.oninput = () => { countLabel.textContent = slider.value; };
    document.getElementById('confirm-fortify-btn').onclick = () => {
        confirmFortify(parseInt(slider.value));
    };
    document.getElementById('cancel-fortify-btn').onclick = cancelFortify;
    ui.fortifyModal.classList.remove('hidden');
}

export function closeFortifyModal() {
    ui.fortifyModal.classList.add('hidden');
    state.clearFortify();
    updateUI();
}

export function showWinnerModal(winner) {
    document.getElementById('winner-name').textContent = `${winner.name} has conquered the world!`;
    ui.winnerModal.classList.remove('hidden');
}

// --- PAN & ZOOM ---
let scale = 1, pan = { x: 0, y: 0 };
let currentWheelListener, currentPointerDownListener, currentPointerMoveListener, currentPointerUpListener;

const updateTransform = () => {
    if (ui.mapSvg) {
        ui.mapSvg.style.transform = `translate(${pan.x}px, ${pan.y}px) scale(${scale})`;
    }
};

export function setupPanZoom() {
    const mapContainer = document.getElementById('map-container');
    let isPanning = false;
    let startPoint = { x: 0, y: 0 };
    
    scale = 1;
    pan = { x: 0, y: 0 };
    if (ui.mapSvg) {
         ui.mapSvg.style.transform = '';
    }

    const onWheel = e => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        const newScale = Math.max(0.5, Math.min(5, scale + delta));
        
        const rect = mapContainer.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        pan.x = mouseX - (mouseX - pan.x) * (newScale / scale);
        pan.y = mouseY - (mouseY - pan.y) * (newScale / scale);

        scale = newScale;
        updateTransform();
    };

    const onPointerDown = e => {
        if (e.target.closest('.territory-rect, .card')) return;
        isPanning = true;
        startPoint = { x: e.clientX, y: e.clientY };
        mapContainer.style.cursor = 'grabbing';
    };

    const onPointerMove = e => {
        if (!isPanning) return;
        pan.x += e.clientX - startPoint.x;
        pan.y += e.clientY - startPoint.y;
        startPoint = { x: e.clientX, y: e.clientY };
        updateTransform();
    };

    const onPointerUp = () => {
        isPanning = false;
        mapContainer.style.cursor = 'grab';
    };

    if (currentWheelListener) mapContainer.removeEventListener('wheel', currentWheelListener);
    if (currentPointerDownListener) mapContainer.removeEventListener('pointerdown', currentPointerDownListener);
    if (currentPointerMoveListener) window.removeEventListener('pointermove', currentPointerMoveListener);
    if (currentPointerUpListener) window.removeEventListener('pointerup', currentPointerUpListener);

    currentWheelListener = onWheel;
    currentPointerDownListener = onPointerDown;
    currentPointerMoveListener = onPointerMove;
    currentPointerUpListener = onPointerUp;

    mapContainer.addEventListener('wheel', currentWheelListener);
    mapContainer.addEventListener('pointerdown', currentPointerDownListener);
    window.addEventListener('pointermove', currentPointerMoveListener);
    window.addEventListener('pointerup', currentPointerUpListener);
}
