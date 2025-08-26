import { TILE_WIDTH, TILE_HEIGHT, TILE_GAP, territoriesData, continentsData } from './constants.js';
import * as state from './state.js';
import { onTerritoryClick, performAttack, performBlitzAttack, stopBlitz, confirmFortify, cancelFortify, endAttackPhase, endTurn } from './game.js';

// --- DOM ELEMENTS ---
export const ui = {
    gameContainer: document.getElementById('game-container'),
    startupModal: document.getElementById('startup-modal'),
    startGameBtn: document.getElementById('start-game-btn'),
    aiPlayerSelect: document.getElementById('ai-player-select'),
    aiSpeedSelect: document.getElementById('ai-speed-select'),
    mapSvg: document.getElementById('map-svg'),
    playerNameEl: document.getElementById('player-name'),
    playerColorIndicatorEl: document.getElementById('player-color-indicator'),
    gamePhaseEl: document.getElementById('game-phase'),
    armiesToDeployEl: document.getElementById('armies-to-deploy'),
    reinforcementsInfoEl: document.getElementById('reinforcements-info'),
    nextPhaseBtn: document.getElementById('next-phase-btn'),
    logMessagesEl: document.getElementById('log-messages'),
    attackModal: document.getElementById('attack-modal'),
    winnerModal: document.getElementById('winner-modal'),
    fortifyModal: document.getElementById('fortify-modal'),
    restartGameBtn: document.getElementById('restart-game-btn'),
    aiStatusEl: document.getElementById('ai-status'),
    balanceContainer: document.getElementById('balance-of-power-container'),
    blitzAttackBtn: document.getElementById('blitz-attack-btn'),
    blitzOptions: document.getElementById('blitz-options'),
    stopBlitzBtn: document.getElementById('stop-blitz-btn'),
};

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
    const connectionsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const territoriesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const markersGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    markersGroup.id = 'capital-markers-group';

    ui.mapSvg.appendChild(connectionsGroup);
    ui.mapSvg.appendChild(territoriesGroup);
    ui.mapSvg.appendChild(markersGroup);

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
        nameLabel.textContent = territory.name;
        territoriesGroup.appendChild(nameLabel);
        const armyLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        armyLabel.setAttribute('id', `label-${tId}`);
        armyLabel.setAttribute('x', x + TILE_WIDTH / 2); armyLabel.setAttribute('y', y + TILE_HEIGHT / 2 + 15);
        armyLabel.classList.add('army-label');
        territoriesGroup.appendChild(armyLabel);
    }
}

export function renderCapitalMarkers(players) {
    const markersGroup = document.getElementById('capital-markers-group');
    if (!markersGroup) return;
    markersGroup.innerHTML = '';

    players.forEach(player => {
        const tId = player.capitalTerritory;
        if (!tId || !territoriesData[tId]) return;

        // FOG OF WAR: Only render capital markers for revealed territories
        if (!state.gameState.revealedTerritories.has(tId)) {
            return;
        }

        const territory = territoriesData[tId];
        const x = territory.gridX * (TILE_WIDTH + TILE_GAP);
        const y = territory.gridY * (TILE_HEIGHT + TILE_GAP);
        const starX = x + TILE_WIDTH - 20;
        const starY = y + 20;

        const star = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        star.setAttribute('d', 'M12 .587l3.668 7.568 8.332 1.151-6.064 5.828 1.48 8.279-7.416-3.967-7.417 3.967 1.481-8.279-6.064-5.828 8.332-1.151z');
        star.setAttribute('transform', `translate(${starX - 12}, ${starY - 12}) scale(0.8)`);
        star.classList.add('capital-marker');
        markersGroup.appendChild(star);
    });
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

export function updateUI() {
    if (!state.gameState.players || state.gameState.players.length === 0) return;
    updateBalanceOfPower();
    const currentPlayer = state.getCurrentPlayer();
    ui.playerNameEl.textContent = currentPlayer.name;
    ui.playerColorIndicatorEl.style.backgroundColor = currentPlayer.color;
    ui.gamePhaseEl.textContent = state.gameState.gamePhase.replace('_', ' ');
    ui.aiStatusEl.classList.toggle('hidden', !currentPlayer.isAI);

    if (state.gameState.gamePhase === 'REINFORCE' && !currentPlayer.isAI) {
        ui.reinforcementsInfoEl.classList.remove('hidden');
        ui.armiesToDeployEl.textContent = currentPlayer.armiesToDeploy;
        ui.nextPhaseBtn.classList.add('hidden');
    } else {
        ui.reinforcementsInfoEl.classList.add('hidden');
        ui.nextPhaseBtn.classList.remove('hidden');
    }

    ui.nextPhaseBtn.style.display = currentPlayer.isAI ? 'none' : 'block';
    if (state.gameState.gamePhase === 'ATTACK') {
        ui.nextPhaseBtn.textContent = 'End Attack Phase';
        ui.nextPhaseBtn.onclick = endAttackPhase;
    } else if (state.gameState.gamePhase === 'FORTIFY') {
        ui.nextPhaseBtn.textContent = 'End Turn';
        ui.nextPhaseBtn.onclick = endTurn;
    }

    // Update connection lines based on fog of war
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

    for (const tId in territoriesData) {
        const rect = document.getElementById(`rect-${tId}`);
        const label = document.getElementById(`label-${tId}`);
        const nameLabel = document.getElementById(`name-label-${tId}`);
        const territoryState = state.gameState.territories[tId];
        
        const isRevealed = state.gameState.revealedTerritories.has(tId);

        if (!isRevealed) {
            if (rect) {
                rect.style.fill = '#2d3748'; // dark grey fog color
                rect.style.setProperty('--glow-color', 'transparent');
                rect.classList.remove('selected', 'selectable', 'selectable-target', 'fighting');
            }
            if (label) label.textContent = '???';
            if (nameLabel) nameLabel.style.display = 'none';
            continue; // Skip to next territory
        }

        // --- RENDER REVEALED TERRITORY ---
        if (nameLabel) nameLabel.style.display = 'block';

        if (territoryState && rect) {
            const owner = state.getPlayerById(territoryState.ownerId);
            label.textContent = territoryState.armies;
            if (owner) {
                rect.style.fill = owner.color;
                // Set the CSS variable for the glow effect
                rect.style.setProperty('--glow-color', owner.color);
            } else {
                // If there is no owner, remove the glow
                rect.style.setProperty('--glow-color', 'transparent');
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

    renderCapitalMarkers(state.gameState.players);
    ui.nextPhaseBtn.disabled = state.gameState.isBlitzing;
}


export function logMessage(message, colorClass = 'text-gray-300') {
    const p = document.createElement('p');
    p.textContent = `> ${message}`;
    p.className = colorClass;
    ui.logMessagesEl.appendChild(p);
    ui.logMessagesEl.scrollTop = ui.logMessagesEl.scrollHeight;
}

export function clearLog() {
    ui.logMessagesEl.innerHTML = '';
}

// --- MODAL LOGIC (unchanged from previous version) ---
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
    document.getElementById('attack-result').textContent = '';
    document.getElementById('attacker-dice-container').innerHTML = '';
    document.getElementById('defender-dice-container').innerHTML = '';
    document.getElementById('continue-options').classList.add('hidden');
    document.getElementById('blitz-options').classList.add('hidden');
    document.getElementById('attack-options').classList.remove('hidden');

    const attackButtons = document.querySelectorAll('.attack-armies-btn');
    attackButtons.forEach(btn => {
        const numArmies = parseInt(btn.dataset.armies);
        btn.disabled = sourceState.armies <= numArmies;
        btn.onclick = () => performAttack(numArmies);
    });

    const maxDice = Math.min(3, sourceState.armies - 1);
    ui.blitzAttackBtn.disabled = maxDice < 2;
    ui.blitzAttackBtn.onclick = () => performBlitzAttack();

    document.getElementById(`rect-${sourceId}`)?.classList.add('fighting');
    document.getElementById(`rect-${targetId}`)?.classList.add('fighting');
    ui.attackModal.classList.remove('hidden');
}

export function updateAttackModalAfterBattle(showContinue = true) {
    const { sourceId, targetId } = state.gameState.attackContext;
    const sourceState = state.gameState.territories[sourceId];

    document.getElementById('attack-options').classList.add('hidden');
    document.getElementById('blitz-options').classList.add('hidden');

    if (showContinue) {
        document.getElementById('continue-options').classList.remove('hidden');
        document.getElementById('continue-attack-btn').disabled = sourceState.armies <= 1;
        document.getElementById('continue-attack-btn').onclick = () => showAttackModal(sourceId, targetId);
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
export function setupPanZoom() {
    const mapContainer = document.getElementById('map-container');
    let isPanning = false, scale = 1;
    let startPoint = { x: 0, y: 0 }, pan = { x: 0, y: 0 };
    const updateTransform = () => { ui.mapSvg.style.transform = `translate(${pan.x}px, ${pan.y}px) scale(${scale})`; };
    mapContainer.addEventListener('wheel', e => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        const newScale = Math.max(0.2, Math.min(3, scale + delta));
        const rect = ui.mapSvg.getBoundingClientRect();
        const mouseX = e.clientX - rect.left, mouseY = e.clientY - rect.top;
        pan.x = mouseX - (mouseX - pan.x) * (newScale / scale);
        pan.y = mouseY - (mouseY - pan.y) * (newScale / scale);
        scale = newScale;
        updateTransform();
    });
    mapContainer.addEventListener('pointerdown', e => {
        if (e.target.closest('.territory-rect')) return;
        isPanning = true;
        startPoint = { x: e.clientX, y: e.clientY };
        mapContainer.style.cursor = 'grabbing';
    });
    mapContainer.addEventListener('pointermove', e => {
        if (!isPanning) return;
        pan.x += e.clientX - startPoint.x;
        pan.y += e.clientY - startPoint.y;
        startPoint = { x: e.clientX, y: e.clientY };
        updateTransform();
    });
    window.addEventListener('pointerup', () => {
        isPanning = false;
        mapContainer.style.cursor = 'grab';
    });
}
