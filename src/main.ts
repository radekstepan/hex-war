import './style.css';
import { 
    ROWS, COLS, CLASSIC_MAP_LAYOUT, CLASSIC_TERRITORY_INFO, 
    CLASSIC_CONTINENT_DATA, CLASSIC_CONNECTIONS, PLAYER_COLORS 
} from './constants';
import { GameState, Territory, Player, AIDifficulty } from './types';
import { 
    calculateReinforcements, 
    calculateBattleOutcome, 
    countTerritories, 
    generateAdjacencyMap 
} from './core/logic';
import { getDeployments, getNextAttack, getFortification } from './core/ai';
import { hexToRgb } from './core/utils';
import { getTroopIcon } from './icons';

// --- CONFIGURATION ---
let CURRENT_MAP_LAYOUT = CLASSIC_MAP_LAYOUT;
let CURRENT_TERRITORY_INFO = CLASSIC_TERRITORY_INFO;
let CURRENT_CONTINENT_DATA = CLASSIC_CONTINENT_DATA;
let CURRENT_CONNECTIONS = CLASSIC_CONNECTIONS;

// --- GLOBAL STATE ---
let PLAYERS: Player[] = [];
let state: GameState = {
    turn: 0,
    phase: 'deploy',
    reinforcements: 5,
    selectedTerritory: null,
    hoveredTerritoryId: null,
    territories: {}, 
    gameOver: false,
    setupMode: true,
    moveData: null,
    fortifying: false
};

// --- TICKER SYSTEM TYPES & STATE ---
interface TickerMessage {
    text: string;
    priority: number; // 3: Critical (Player Events), 2: Major, 1: Info, 0: Ambient
    id: number;
}

interface ActiveTickerItem {
    el: HTMLElement;
    x: number;
    width: number;
}

const tickerQueue: TickerMessage[] = [];
const activeTickerItems: ActiveTickerItem[] = [];
const TICKER_SPEED_PPS = 30; // 30 Pixels Per Second
const TICKER_GAP = 100; // Pixels between messages
let lastTickerTime = 0;

let msgCounter = 0;
let defaultMsgIndex = 0;
const defaultMessages = [
    "WORLD DOMINATION PROTOCOL ACTIVE",
    "DEPLOY TROOPS TO STRATEGIC SECTORS",
    "MONITOR GLOBAL DEFCON LEVELS",
    "SECURE CONTINENT BONUSES FOR REINFORCEMENTS",
    "AI SYSTEMS CALCULATING OPTIMAL STRATEGIES"
];

// --- DOM ELEMENTS ---
const mainContainer = document.getElementById('main-container') as HTMLElement;
const mapGrid = document.getElementById('map-grid') as HTMLElement;
const badgesLayer = document.getElementById('badges-layer') as HTMLElement;
const connectionsLayer = document.getElementById('connections-layer') as HTMLElement;
const logContainer = document.getElementById('game-log') as HTMLElement;
const currentPlayerEl = document.getElementById('current-player') as HTMLElement;
const currentPhaseEl = document.getElementById('current-phase') as HTMLElement;
const endTurnBtn = document.getElementById('end-turn-btn') as HTMLButtonElement;
const tooltip = document.getElementById('tooltip') as HTMLElement;
const setupModal = document.getElementById('setup-modal') as HTMLElement;
const gameOverModal = document.getElementById('game-over-modal') as HTMLElement;
const strengthBar = document.getElementById('strength-bar') as HTMLElement;
const reinforcementStatusEl = document.getElementById('reinforcement-status') as HTMLElement;
const startBtn = document.getElementById('start-btn') as HTMLButtonElement;
const cpuCountInput = document.getElementById('cpu-count') as HTMLInputElement;
const difficultySelect = document.getElementById('difficulty-select') as HTMLSelectElement;
const tickerWrap = document.getElementById('ticker-wrap') as HTMLElement;

// --- INITIALIZATION ---

startBtn.onclick = startGame;

function startGame() {
    const cpuCount = parseInt(cpuCountInput.value);
    const difficulty = difficultySelect.value as AIDifficulty;
    
    PLAYERS = [{ id: 0, name: 'PLAYER 1', color: '#00ffff', type: 'HUMAN' }];
    for (let i = 0; i < cpuCount; i++) {
        PLAYERS.push({ 
            id: i + 1, 
            name: `PLAYER ${i + 2}`, 
            color: PLAYER_COLORS[i % PLAYER_COLORS.length],
            type: 'CPU',
            difficulty: difficulty
        });
    }
    
    state.setupMode = false;
    setupModal.style.display = 'none';
    log(`SYS: Init sequence. AI Level: ${difficulty}`, "text-white");
    
    // Start Ticker Loop
    addTickerUpdate("GLOBAL CONFLICT INITIATED // DEPLOYMENT PHASE ACTIVE", 3);
    requestAnimationFrame(tickerLoop);
    
    initGame();
}

function initGame() {
    createGridAndTerritories();
    calculateAdjacency();
    addManualConnections(); 
    drawConnections();
    assignTerritories();
    updateUI();
    setupOptimizedHover();
    log(`SYS: Global map loaded. ${PLAYERS.length} Players active.`, "text-white");
}

// --- TICKER LOGIC ---

function addTickerUpdate(text: string, priority: number = 1) {
    tickerQueue.push({ text: text + " //", priority, id: msgCounter++ });
    // Sort queue: Higher priority first, then older messages first
    tickerQueue.sort((a, b) => b.priority - a.priority || a.id - b.id);
}

function tickerLoop(timestamp: number) {
    if (!lastTickerTime) {
        lastTickerTime = timestamp;
    }

    // Calculate time delta in seconds
    const deltaTime = (timestamp - lastTickerTime) / 1000;
    lastTickerTime = timestamp;

    // Sanity check: if delta is huge (e.g. user tabbed away), don't jump
    if (deltaTime > 0.1) {
        requestAnimationFrame(tickerLoop);
        return;
    }

    const moveAmount = TICKER_SPEED_PPS * deltaTime;
    const containerWidth = tickerWrap.clientWidth;

    // 1. Move active items
    for (let i = activeTickerItems.length - 1; i >= 0; i--) {
        const item = activeTickerItems[i];
        item.x -= moveAmount;
        
        item.el.style.transform = `translate3d(${item.x}px, 0, 0)`;

        // Remove if off screen to the left
        if (item.x + item.width < -50) {
            item.el.remove();
            activeTickerItems.splice(i, 1);
        }
    }

    // 2. Check if we can spawn a new item
    let tailX = -1;
    if (activeTickerItems.length > 0) {
        const lastItem = activeTickerItems[activeTickerItems.length - 1];
        tailX = lastItem.x + lastItem.width;
    }

    // Spawn if space available (either empty, or tail + gap is visible)
    if (activeTickerItems.length === 0 || tailX < containerWidth - TICKER_GAP) {
        spawnNextTickerItem(containerWidth);
    }

    requestAnimationFrame(tickerLoop);
}

function spawnNextTickerItem(startPos: number) {
    let msgData: TickerMessage;

    if (tickerQueue.length > 0) {
        msgData = tickerQueue.shift()!;
    } else {
        // Use default ambient messages if queue is empty
        msgData = { 
            text: defaultMessages[defaultMsgIndex] + " //", 
            priority: 0, 
            id: -1 
        };
        defaultMsgIndex = (defaultMsgIndex + 1) % defaultMessages.length;
    }

    const el = document.createElement('div');
    el.className = 'ticker-item';
    el.innerText = msgData.text;

    el.style.transform = `translate3d(${startPos}px, 0, 0)`;
    tickerWrap.appendChild(el);

    const width = el.getBoundingClientRect().width;
    
    activeTickerItems.push({
        el: el,
        x: startPos,
        width: width
    });
}

// --- MAP GENERATION ---

function createGridAndTerritories() {
    mapGrid.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;
    mapGrid.style.gridTemplateRows = `repeat(${ROWS}, 1fr)`;
    mapGrid.innerHTML = ''; 
    badgesLayer.innerHTML = ''; 

    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            const tId = CURRENT_MAP_LAYOUT[y]?.[x] || 0; 
            const el = document.createElement('div');
            el.className = 'map-cell';
            
            if (tId === 0) {
                el.classList.add('cell-water');
            } else {
                el.classList.add('cell-land', 'continent-border');
                el.dataset.tid = tId.toString();
                
                const nTop = (y > 0) ? (CURRENT_MAP_LAYOUT[y-1][x] || 0) : 0;
                const nBot = (y < ROWS - 1) ? (CURRENT_MAP_LAYOUT[y+1][x] || 0) : 0;
                const nLeft = (x > 0) ? (CURRENT_MAP_LAYOUT[y][x-1] || 0) : 0;
                const nRight = (x < COLS - 1) ? (CURRENT_MAP_LAYOUT[y][x+1] || 0) : 0;

                if (tId !== nTop) el.style.borderTop = '2px solid #000';
                if (tId !== nBot) el.style.borderBottom = '2px solid #000';
                if (tId !== nLeft) el.style.borderLeft = '2px solid #000';
                if (tId !== nRight) el.style.borderRight = '2px solid #000';

                // Pass the event object to handle shift-clicks
                el.onclick = (e) => handleTerritoryClick(tId, e);

                if (!state.territories[tId]) {
                    state.territories[tId] = {
                        id: tId, owner: 0, troops: 0, cells: [],
                        center: {x: 0, y: 0, count: 0}, neighbors: new Set(),
                        centerPct: { x: 0, y: 0 }
                    };
                }
                state.territories[tId].cells.push(el);
                state.territories[tId].center.x += x;
                state.territories[tId].center.y += y;
                state.territories[tId].center.count++;
            }
            mapGrid.appendChild(el);
        }
    }

    Object.values(state.territories).forEach(t => {
        const avgX = (t.center.x / t.center.count) + 0.5;
        const avgY = (t.center.y / t.center.count) + 0.5;
        t.centerPct = { x: (avgX / COLS) * 100, y: (avgY / ROWS) * 100 };
        
        const badge = document.createElement('div');
        badge.className = 'troop-badge';
        badge.style.left = `${t.centerPct.x}%`;
        badge.style.top = `${t.centerPct.y}%`;
        badge.id = `badge-${t.id}`;
        
        // Render initial tank icon
        updateBadgeContent(badge, t.troops, PLAYERS[t.owner].color);
        
        badgesLayer.appendChild(badge);
    });
}

function drawConnections() {
    connectionsLayer.innerHTML = '';
    
    CURRENT_CONNECTIONS.forEach(([id1, id2]) => {
        const t1 = state.territories[id1];
        const t2 = state.territories[id2];
        if(t1 && t2) {
            const dist = Math.abs(t1.centerPct.x - t2.centerPct.x);
            // Wrap around line logic if distance is huge
            if (dist > 50) {
                const leftT = t1.centerPct.x < t2.centerPct.x ? t1 : t2;
                const rightT = t1.centerPct.x < t2.centerPct.x ? t2 : t1;

                const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line1.setAttribute('x1', leftT.centerPct.x + '%');
                line1.setAttribute('y1', leftT.centerPct.y + '%');
                line1.setAttribute('x2', '0%');
                line1.setAttribute('y2', leftT.centerPct.y + '%'); 
                line1.classList.add('connection-line');
                connectionsLayer.appendChild(line1);

                const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line2.setAttribute('x1', rightT.centerPct.x + '%');
                line2.setAttribute('y1', rightT.centerPct.y + '%');
                line2.setAttribute('x2', '100%');
                line2.setAttribute('y2', rightT.centerPct.y + '%');
                line2.classList.add('connection-line');
                connectionsLayer.appendChild(line2);

            } else {
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', t1.centerPct.x + '%');
                line.setAttribute('y1', t1.centerPct.y + '%');
                line.setAttribute('x2', t2.centerPct.x + '%');
                line.setAttribute('y2', t2.centerPct.y + '%');
                line.classList.add('connection-line');
                connectionsLayer.appendChild(line);
            }
        }
    });
}

function calculateAdjacency() {
    // Use the core logic function to get the adjacency map
    const adjMap = generateAdjacencyMap(ROWS, COLS, CURRENT_MAP_LAYOUT);
    
    // Merge into state
    for (const [idStr, neighbors] of Object.entries(adjMap)) {
        const id = parseInt(idStr);
        if (state.territories[id]) {
            neighbors.forEach(nid => state.territories[id].neighbors.add(nid));
        }
    }
}

function addManualConnections() {
    CURRENT_CONNECTIONS.forEach(([id1, id2]) => {
        if (state.territories[id1] && state.territories[id2]) {
            state.territories[id1].neighbors.add(id2);
            state.territories[id2].neighbors.add(id1);
        }
    });
}

function assignTerritories() {
    const tIds = Object.keys(state.territories).map(Number);
    tIds.sort(() => Math.random() - 0.5);
    tIds.forEach((id, index) => {
        const terr = state.territories[id];
        terr.owner = index % PLAYERS.length; 
        terr.troops = 1;
    });
    for(let i=0; i< (tIds.length * 2); i++) {
        const id = tIds[Math.floor(Math.random() * tIds.length)];
        state.territories[id].troops++;
    }
    renderMapState();
}

// --- INTERACTION ---

function handleTerritoryClick(tId: number, e: MouseEvent) {
    if (state.gameOver || state.setupMode) return;
    const player = PLAYERS[state.turn];
    if (player.type === 'CPU') return; // Cannot click during CPU turn

    const terr = state.territories[tId];

    if (state.phase === 'deploy') {
        if (terr.owner === state.turn) {
            if (state.reinforcements > 0) {
                // Shift-click deploys all remaining reinforcements
                let amount = 1;
                if (e.shiftKey) {
                    amount = state.reinforcements;
                }
                
                updateTroopCount(terr, amount); 
                state.reinforcements -= amount;
                updateUI();
                
                if (state.reinforcements === 0) {
                    setTimeout(() => {
                        state.phase = 'attack';
                        state.selectedTerritory = null;
                        updateUI();
                        renderMapState();
                        log("PHASE: Attack Engaged.", "text-red-500");
                    }, 300);
                }
            }
        } else {
            log("ERR: Invalid Deployment Zone", "text-red-500");
        }
    } 
    else if (state.phase === 'attack') {
        if (state.selectedTerritory === tId) {
            state.selectedTerritory = null;
            renderMapState();
            return;
        }
        if (terr.owner === state.turn) {
            if (terr.troops > 1) {
                state.selectedTerritory = tId;
                log(`CMD: ${CURRENT_TERRITORY_INFO[tId].name} selected.`, "text-white");
                renderMapState();
            } else {
                log("ERR: Not enough units (Need > 1).", "text-yellow-500");
            }
            return;
        }
        if (state.selectedTerritory && terr.owner !== state.turn) {
            const source = state.territories[state.selectedTerritory];
            if (source.neighbors.has(tId)) {
                resolveBattle(source, terr);
            }
        }
    }
    else if (state.phase === 'fortify') {
        if (state.selectedTerritory === tId && !state.fortifying) { 
            state.selectedTerritory = null;
            renderMapState();
            return;
        }
        
        if (!state.selectedTerritory) {
            if (terr.owner === state.turn && terr.troops > 1) {
                state.selectedTerritory = tId;
                log("CMD: Source selected. Click neighbor to move.", "text-white");
                renderMapState();
            } 
        } 
        else {
            const source = state.territories[state.selectedTerritory];
            
            if (terr.owner === state.turn && source.neighbors.has(tId)) {
                if (source.troops > 1) {
                    // Shift-click moves all available troops (leaving 1 behind)
                    let amount = 1;
                    if (e.shiftKey) {
                        amount = source.troops - 1;
                    }
                    
                    updateTroopCount(source, -amount, false); // False = Not damage
                    updateTroopCount(terr, amount, false);
                    
                    if (source.troops === 1) {
                        setTimeout(() => endTurn(), 300);
                    }
                } else {
                    log("ERR: Source depleted.", "text-yellow-500");
                }
            } 
            else if (terr.owner === state.turn && terr.troops > 1) {
                state.selectedTerritory = tId;
                renderMapState();
            }
        }
    }
}

function resolveBattle(attacker: Territory, defender: Territory) {
    const attName = CURRENT_TERRITORY_INFO[attacker.id].name;
    const defName = CURRENT_TERRITORY_INFO[defender.id].name;
    const oldOwner = defender.owner;
    
    // VISUAL FEEDBACK: Apply Flash Classes
    attacker.cells.forEach(c => {
        c.classList.remove('attacking-source');
        void c.offsetWidth; // Force reflow
        c.classList.add('attacking-source');
    });
    defender.cells.forEach(c => {
        c.classList.remove('under-attack');
        void c.offsetWidth;
        c.classList.add('under-attack');
    });
    // Remove after animation (500ms)
    setTimeout(() => {
        attacker.cells.forEach(c => c.classList.remove('attacking-source'));
        defender.cells.forEach(c => c.classList.remove('under-attack'));
    }, 500);
    
    if(state.turn === 0) log(`BATTLE: ${attName} -> ${defName}`, "text-neon-pink");

    // UNFAIR ADVANTAGE for Hard AI
    const attackerPlayer = PLAYERS[attacker.owner];
    let bonus = 0;
    if (attackerPlayer.type === 'CPU' && attackerPlayer.difficulty === 'HARD') {
        bonus = 15; // Significant statistical advantage to represent "Expert" luck
    }

    const result = calculateBattleOutcome(attacker.troops, defender.troops, bonus);

    if (result.success) {
        // Victory
        defender.troops = 0;
        defender.owner = attacker.owner;
        
        updateTroopCount(defender, result.moveAmount, false); 
        updateTroopCount(attacker, -result.moveAmount, false); // Moving out is not damage
        
        if(state.turn === 0) log(`VICTORY: ${defName} captured!`, "text-green-400");
        
        // Ticker Updates: Prioritize Player Events
        if (attacker.owner === 0) {
            // Player Won
            addTickerUpdate(`COMBAT UPDATE: YOU CAPTURED ${defName.toUpperCase()}`, 3);
        } else if (oldOwner === 0) {
            // Player Lost
            addTickerUpdate(`CRITICAL: ${defName.toUpperCase()} LOST TO ${PLAYERS[attacker.owner].name}`, 3);
        } else {
            // AI vs AI
            addTickerUpdate(`${PLAYERS[attacker.owner].name} ANNEXED ${defName.toUpperCase()}`, 1);
        }

        // Check for player elimination
        if (countTerritories(state.territories, oldOwner) === 0) {
            addTickerUpdate(`STATUS: ${PLAYERS[oldOwner].name} ELIMINATED FROM THE GRID`, 2);
        }

    } else {
        // Defeat
        updateTroopCount(attacker, -result.attackerLoss, true); // Damage
        if(state.turn === 0) log(`DEFEAT: Assault repelled.`, "text-red-500");
        
        // Ticker Updates for Defense
        if (defender.owner === 0) {
            // Player defended successfully
             addTickerUpdate(`DEFENSE: ${PLAYERS[attacker.owner].name} ATTACK ON ${defName.toUpperCase()} REPELLED`, 2);
        }
    }

    state.selectedTerritory = null;
    renderMapState();
    checkWinCondition();
}

function btnAction() {
    if (state.phase === 'deploy' && state.reinforcements === 0) {
        state.phase = 'attack';
        state.selectedTerritory = null;
        updateUI();
        renderMapState();
        log("PHASE: Attack Engaged.", "text-neon-pink");
    } else if (state.phase === 'attack') {
        state.phase = 'fortify';
        state.selectedTerritory = null;
        updateUI();
        renderMapState();
        log("PHASE: Fortification Engaged.", "text-[#00ff00]");
    } else if (state.phase === 'fortify') {
        endTurn();
    }
}

// --- GAME LOOP & AI ---

function endTurn() {
    if (state.gameOver) return;
    
    // Safety check: Human cannot skip deploy with troops remaining
    if (PLAYERS[state.turn].type === 'HUMAN' && state.phase === 'deploy' && state.reinforcements > 0) return;

    let attempts = 0;
    do {
        state.turn = (state.turn + 1) % PLAYERS.length;
        attempts++;
    } while (countTerritories(state.territories, state.turn) === 0 && attempts < PLAYERS.length);

    state.phase = 'deploy';
    state.selectedTerritory = null;
    
    state.reinforcements = calculateReinforcements(state.turn, state.territories, CURRENT_CONTINENT_DATA);
    
    // Log bonus for human
    if(state.turn === 0) {
       // Re-calculate simply to log
       let bonus = 0;
       for (const data of Object.values(CURRENT_CONTINENT_DATA)) {
           const ownsAll = data.territories.every(tid => state.territories[tid].owner === 0);
           if (ownsAll) bonus += data.bonus;
       }
       if(bonus > 0) log(`BONUS: Continent controlled! +${bonus}`, "text-[#ffff00]");
    }
    
    // Ticker: Announce Turn
    if (PLAYERS[state.turn].type === 'HUMAN') {
        addTickerUpdate("COMMAND UPLINK ESTABLISHED // AWAITING INSTRUCTIONS", 3);
    } else {
         addTickerUpdate(`INCOMING TRANSMISSION: ${PLAYERS[state.turn].name} MOVEMENTS DETECTED`, 1);
    }

    updateUI();
    
    if (PLAYERS[state.turn].type === 'CPU') {
        log(`SYS: ${PLAYERS[state.turn].name} calculating...`, "text-gray-500");
        setTimeout(cpuTurn, 800);
    } else {
        log("SYS: Player 1 Turn.", "text-cyan-400");
    }
}

async function cpuTurn() {
    if (state.gameOver) return;
    const player = PLAYERS[state.turn];
    if (player.type !== 'CPU') return;

    // Helper for delay
    const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // 1. DEPLOYMENT
    const deployments = getDeployments(
        player.id, 
        player.difficulty || 'MEDIUM', 
        state.reinforcements, 
        state.territories, 
        CURRENT_CONTINENT_DATA,
        CURRENT_TERRITORY_INFO
    );

    // Apply Deployments (visualize them adding up)
    for (const [tid, amount] of Object.entries(deployments)) {
        const id = Number(tid);
        if (state.territories[id]) {
            updateTroopCount(state.territories[id], amount);
            state.reinforcements -= amount;
        }
    }
    renderMapState();
    await wait(600);

    // 2. ATTACK
    state.phase = 'attack';
    updateUI();

    let attackCount = 0;
    // Cap attacks per turn to prevent infinite loops or boring 5 minute turns
    const maxAttacks = player.difficulty === 'HARD' ? 10 : (player.difficulty === 'MEDIUM' ? 5 : 3);

    while (attackCount < maxAttacks && !state.gameOver) {
        const attackMove = getNextAttack(
            player.id, 
            player.difficulty || 'MEDIUM', 
            state.territories,
            CURRENT_TERRITORY_INFO
        );

        if (!attackMove) break;

        // Execute Attack
        const source = state.territories[attackMove.sourceId];
        const target = state.territories[attackMove.targetId];
        
        if (source && target) {
            resolveBattle(source, target);
            await wait(800); // Visual pause between battles
        } else {
            break;
        }
        attackCount++;
    }

    // 3. FORTIFY
    state.phase = 'fortify';
    updateUI();
    await wait(300);

    const fortifyMove = getFortification(
        player.id,
        player.difficulty || 'MEDIUM',
        state.territories
    );

    if (fortifyMove) {
        const source = state.territories[fortifyMove.sourceId];
        const target = state.territories[fortifyMove.targetId];
        
        if (source && target) {
            updateTroopCount(source, -fortifyMove.amount, false);
            updateTroopCount(target, fortifyMove.amount, false);
            // Visual line or indicator could go here
            renderMapState();
            await wait(600);
        }
    }

    endTurn();
}

function checkWinCondition() {
    if (state.gameOver) return;
    const activePlayers = PLAYERS.filter(p => countTerritories(state.territories, p.id) > 0);
    
    if (activePlayers.length === 1) {
        state.gameOver = true;
        const winner = activePlayers[0];
        
        const title = document.getElementById('winner-title')!;
        const msg = document.getElementById('winner-msg')!;
        
        title.innerText = "VICTORY";
        msg.innerText = `${winner.name} CONQUERED THE GRID`;
        title.style.color = winner.color;
        
        addTickerUpdate(`GAME OVER: ${winner.name} CONQUERED THE GRID`, 3);

        gameOverModal.classList.remove('hidden');
        gameOverModal.style.display = 'flex';
    }
}

// --- VISUAL UPDATES ---

function renderMapState() {
    Object.values(state.territories).forEach(terr => {
        const player = PLAYERS[terr.owner];
        const pColor = player.color;
        
        terr.cells.forEach(cell => {
            cell.style.backgroundColor = `rgba(${hexToRgb(pColor)}, 0.6)`;
            cell.style.boxShadow = 'none'; 
            cell.classList.remove('selected-source', 'valid-target', 'valid-fortify');

            if (state.selectedTerritory === terr.id) cell.classList.add('selected-source');
            
            if (state.phase === 'attack' && state.selectedTerritory) {
                const selectedT = state.territories[state.selectedTerritory];
                if (selectedT.neighbors.has(terr.id) && terr.owner !== state.turn) {
                    cell.classList.add('valid-target');
                }
            }
            if (state.phase === 'fortify' && state.selectedTerritory) {
                const selectedT = state.territories[state.selectedTerritory];
                if (selectedT.neighbors.has(terr.id) && terr.owner === state.turn) {
                    cell.classList.add('valid-fortify');
                }
            }
        });
        
        const badge = document.getElementById(`badge-${terr.id}`);
        if(badge) {
            updateBadgeContent(badge, terr.troops, pColor);
        }
    });
    updateStrengthBar();
}

function updateTroopCount(terr: Territory, delta: number, isBattleDamage: boolean = true) {
    terr.troops += delta;
    const badge = document.getElementById(`badge-${terr.id}`);
    
    if(badge) {
        updateBadgeContent(badge, terr.troops, PLAYERS[terr.owner].color);
        
        let animClass = '';
        if (delta > 0) {
            animClass = 'anim-up';
        } else {
            // Delta < 0
            if (isBattleDamage) {
                animClass = 'anim-down'; // Red flash
            } else {
                animClass = 'anim-neutral'; // Neutral flash
            }
        }
        
        badge.classList.remove('anim-up', 'anim-down', 'anim-neutral');
        void badge.offsetWidth; // Trigger reflow
        badge.classList.add(animClass);
    }
    updateStrengthBar();
}

function updateBadgeContent(badge: HTMLElement, count: number, color: string) {
    let typeClass = '';
    let svg = '';

    if (count === 1) {
        typeClass = 'badge-soldier';
        svg = getTroopIcon('soldier', color);
    } else if (count < 5) {
        typeClass = 'badge-small';
        svg = getTroopIcon('small', color);
    } else {
        typeClass = 'badge-large';
        svg = getTroopIcon('large', color);
    }

    // Reset classes
    badge.classList.remove('badge-soldier', 'badge-small', 'badge-large');
    badge.classList.add(typeClass);

    // Number displayed ABOVE the icon via CSS positioning
    badge.innerHTML = `<span>${count}</span>${svg}`;
}

function updateStrengthBar() {
    // Calculate strength based on reinforcement potential
    const playerStrengths = PLAYERS.map(p => {
        return {
            player: p,
            strength: calculateReinforcements(p.id, state.territories, CURRENT_CONTINENT_DATA)
        };
    });

    const totalStrength = playerStrengths.reduce((acc, p) => acc + p.strength, 0);
    strengthBar.innerHTML = '';
    
    playerStrengths.forEach(pData => {
        if (pData.strength > 0) {
            const pct = (pData.strength / totalStrength) * 100;
            const el = document.createElement('div');
            el.style.width = `${pct}%`;
            el.style.backgroundColor = pData.player.color;
            el.title = `${pData.player.name}: Est. ${pData.strength} reinforcements/turn`;
            strengthBar.appendChild(el);
        }
    });
}

function updateUI() {
    const player = PLAYERS[state.turn];
    currentPlayerEl.innerText = player.name;
    currentPlayerEl.style.color = player.color;
    currentPlayerEl.style.textShadow = `0 0 10px ${player.color}`;
    currentPhaseEl.innerText = state.phase.toUpperCase();

    let borderColor = '';
    let phaseColor = '';

    if (player.type === 'CPU') {
        borderColor = 'var(--neon-blue)';
        phaseColor = '#00ffff';
    } else {
        switch(state.phase) {
            case 'deploy': 
                borderColor = 'var(--neon-yellow)'; 
                phaseColor = '#ffff00';
                break;
            case 'attack': 
                borderColor = 'var(--neon-pink)'; 
                phaseColor = '#ff00ff';
                break;
            case 'fortify': 
                borderColor = 'var(--neon-green)'; 
                phaseColor = '#00ff00';
                break;
            default: 
                borderColor = 'var(--neon-pink)';
                phaseColor = '#ff00ff';
        }
    }
    
    mainContainer.style.borderColor = borderColor;
    mainContainer.style.boxShadow = `0 0 20px ${borderColor}, inset 0 0 50px rgba(0,0,0,0.8)`;
    currentPhaseEl.style.color = phaseColor;

    const isHuman = (player.type === 'HUMAN');
    
    if (isHuman && state.phase === 'deploy' && state.reinforcements > 0) {
        reinforcementStatusEl.innerText = `REINFORCEMENTS: ${state.reinforcements}`;
        reinforcementStatusEl.style.opacity = '1';
    } else {
        reinforcementStatusEl.innerText = "";
        reinforcementStatusEl.style.opacity = '0';
    }
    
    if (isHuman) {
        endTurnBtn.style.display = 'block';
        endTurnBtn.classList.remove('opacity-50');
        endTurnBtn.disabled = false;

        if (state.phase === 'deploy') {
            if (state.reinforcements > 0) {
                endTurnBtn.innerText = "Deploying...";
                endTurnBtn.disabled = true;
                endTurnBtn.classList.add('opacity-50');
            } else {
                endTurnBtn.innerText = "Begin Attack Phase";
            }
        } else if (state.phase === 'attack') {
            endTurnBtn.innerText = "End Attack / Fortify";
        } else if (state.phase === 'fortify') {
            endTurnBtn.innerText = "End Turn";
        }
    } else {
        endTurnBtn.style.display = 'none';
    }
}

function setupOptimizedHover() {
    mapGrid.addEventListener('mouseover', handleGridHover);
    mapGrid.addEventListener('mouseout', (e) => {
            if (!mapGrid.contains(e.relatedTarget as Node)) clearHover();
    });
}

function handleGridHover(e: Event) {
    const target = e.target as HTMLElement;
    if (!target.classList.contains('cell-land')) return;
    const tId = parseInt(target.dataset.tid || "0");
    if (state.hoveredTerritoryId === tId) return; 

    clearHover();
    state.hoveredTerritoryId = tId;
    const terr = state.territories[tId];
    
    if (terr) {
        terr.cells.forEach(c => c.classList.add('region-hover'));
        const info = CURRENT_TERRITORY_INFO[tId];
        if(info) {
            tooltip.innerHTML = `<span style="color:${PLAYERS[terr.owner].color}">${info.name}</span>`;
            tooltip.style.left = terr.centerPct.x + '%';
            tooltip.style.top = terr.centerPct.y + '%';
            tooltip.style.opacity = '1';
        }
    }
}

function clearHover() {
    if (state.hoveredTerritoryId !== null) {
        const prevTerr = state.territories[state.hoveredTerritoryId];
        if (prevTerr) prevTerr.cells.forEach(c => c.classList.remove('region-hover'));
        state.hoveredTerritoryId = null;
        tooltip.style.opacity = '0';
    }
}

function log(msg: string, colorClass = "text-gray-400") {
    const entry = document.createElement('div');
    entry.className = colorClass;
    const time = new Date().toLocaleTimeString('en-US', {hour12: false, hour: "numeric", minute: "numeric", second: "numeric"});
    entry.innerText = `[${time}] ${msg}`;
    logContainer.appendChild(entry);
    logContainer.scrollTop = logContainer.scrollHeight;
}

endTurnBtn.onclick = btnAction;
