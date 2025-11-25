import './style.css';

/**
 * CONFIGURATION & CONSTANTS
 */
const ROWS = 28; 
const COLS = 40; 

let CURRENT_MAP_LAYOUT = [];
let CURRENT_TERRITORY_INFO = {};
let CURRENT_CONTINENT_DATA = {};
let CURRENT_CONNECTIONS = [];

// --- CLASSIC MAP DATA ---
const CLASSIC_MAP_LAYOUT = [
    [0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ],
    [11,11,11,12,12,12,12,12,13,13,13,13,13,13,0 ,31,31,0 ,0 ,0 ,0 ,0 ,52,52,52,52,52,53,53,53,53,53,54,54,54,0 ,0 ,0 ,0 ,0 ],
    [11,11,12,12,12,12,12,12,13,13,13,13,13,13,0 ,31,31,0 ,32,32,32,32,52,52,52,52,55,55,55,53,53,53,54,54,54,0 ,0 ,0 ,0 ,0 ],
    [11,11,12,12,12,12,12,12,13,13,13,13,13,13,0 ,31,31,0 ,32,32,32,32,52,52,52,52,55,55,55,53,53,53,54,54,54,0 ,0 ,0 ,0 ,0 ], 
    [0 ,0 ,14,14,14,15,15,15,16,16,16,0 ,0 ,0 ,0 ,0 ,0 ,0 ,32,32,37,37,51,51,51,52,55,55,56,56,56,57,57,57,57,0 ,0 ,0 ,0 ,0 ],
    [0 ,17,14,14,14,15,15,15,16,16,16,0 ,0 ,0 ,0 ,33,33,33,34,34,34,37,37,37,37,51,51,51,59,59,56,56,56,57,57,57,57,57,57,0 ],
    [0 ,17,14,14,14,15,15,15,16,16,16,0 ,0 ,0 ,0 ,33,33,33,34,34,34,37,37,37,37,51,51,51,59,59,56,56,56,57,57,57,57,57,57,0 ], 
    [0 ,17,17,17,17,18,18,18,18,0 ,0 ,0 ,0 ,0 ,0 ,33,33,35,35,34,34,37,37,60,60,59,59,59,59,57,57,57,57,57,57,0 ,58,58,0 ,0 ],
    [0 ,17,17,17,17,18,18,18,18,0 ,0 ,0 ,0 ,0 ,0 ,0 ,35,35,36,36,36,60,60,60,60,59,59,61,61,61,61,62,62,0 ,0 ,0 ,58,58,0 ,0 ],
    [0 ,17,17,17,17,18,18,18,18,0 ,0 ,0 ,0 ,0 ,0 ,0 ,35,35,36,36,36,60,60,60,60,59,59,61,61,61,61,62,62,0 ,0 ,0 ,58,58,0 ,0 ], 
    [0 ,0 ,19,19,19,19,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,36,36,0 ,60,60,0 ,0 ,61,61,61,62,62,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ],
    [0 ,0 ,0 ,19,19,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,41,41,41,41,41,0 ,42,42,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,71,71,71,72,72,72,0 ,0 ,0 ,0 ],
    [0 ,0 ,0 ,21,21,21,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,41,41,41,43,43,43,43,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,71,71,71,72,72,72,0 ,0 ,0 ,0 ],
    [0 ,0 ,0 ,21,21,21,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,41,41,44,44,43,43,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ],
    [0 ,0 ,0 ,21,21,21,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,41,41,44,44,43,43,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ], 
    [0 ,0 ,22,22,23,23,23,23,0 ,0 ,0 ,0 ,0 ,0 ,44,44,44,44,44,43,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,73,73,73,73,74,74,74,0 ,0 ,0 ],
    [0 ,0 ,22,22,23,23,23,23,0 ,0 ,0 ,0 ,0 ,0 ,44,44,44,44,44,46,46,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,73,73,73,73,74,74,74,0 ,0 ,0 ],
    [0 ,0 ,22,22,23,23,23,23,0 ,0 ,0 ,0 ,0 ,0 ,44,44,44,44,44,46,46,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,73,73,73,73,74,74,74,0 ,0 ,0 ], 
    [0 ,0 ,22,24,24,24,24,0 ,0 ,0 ,0 ,0 ,0 ,0 ,44,44,45,45,45,46,46,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,73,73,73,73,74,74,74,0 ,0 ,0 ],
    [0 ,0 ,0 ,24,24,24,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,45,45,45,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ],
    [0 ,0 ,0 ,24,24,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ],
    [0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ],
    [0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ],
    [0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ],
    [0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ],
    [0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ],
    [0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ],
    [0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ,0 ]
];

const CLASSIC_TERRITORY_INFO = {
    11: { name: 'ALASKA', continent: 1 }, 12: { name: 'NORTHWEST TERR.', continent: 1 }, 13: { name: 'GREENLAND', continent: 1 }, 14: { name: 'ALBERTA', continent: 1 }, 15: { name: 'ONTARIO', continent: 1 }, 16: { name: 'QUEBEC', continent: 1 }, 17: { name: 'WESTERN U.S.', continent: 1 }, 18: { name: 'EASTERN U.S.', continent: 1 }, 19: { name: 'CENTRAL AMERICA', continent: 1 },
    21: { name: 'VENEZUELA', continent: 2 }, 22: { name: 'PERU', continent: 2 }, 23: { name: 'BRAZIL', continent: 2 }, 24: { name: 'ARGENTINA', continent: 2 },
    31: { name: 'ICELAND', continent: 3 }, 32: { name: 'SCANDINAVIA', continent: 3 }, 33: { name: 'GREAT BRITAIN', continent: 3 }, 34: { name: 'N. EUROPE', continent: 3 }, 35: { name: 'W. EUROPE', continent: 3 }, 36: { name: 'S. EUROPE', continent: 3 }, 37: { name: 'UKRAINE', continent: 3 },
    41: { name: 'N. AFRICA', continent: 4 }, 42: { name: 'EGYPT', continent: 4 }, 43: { name: 'E. AFRICA', continent: 4 }, 44: { name: 'CONGO', continent: 4 }, 45: { name: 'S. AFRICA', continent: 4 }, 46: { name: 'MADAGASCAR', continent: 4 },
    51: { name: 'URAL', continent: 5 }, 52: { name: 'SIBERIA', continent: 5 }, 53: { name: 'YAKUTSK', continent: 5 }, 54: { name: 'KAMCHATKA', continent: 5 }, 55: { name: 'IRKUTSK', continent: 5 }, 56: { name: 'MONGOLIA', continent: 5 }, 57: { name: 'CHINA', continent: 5 }, 58: { name: 'JAPAN', continent: 5 }, 59: { name: 'AFGHANISTAN', continent: 5 }, 60: { name: 'MIDDLE EAST', continent: 5 }, 61: { name: 'INDIA', continent: 5 }, 62: { name: 'SIAM', continent: 5 },
    71: { name: 'INDONESIA', continent: 6 }, 72: { name: 'NEW GUINEA', continent: 6 }, 73: { name: 'W. AUSTRALIA', continent: 6 }, 74: { name: 'E. AUSTRALIA', continent: 6 },
};

const CLASSIC_CONTINENT_DATA = {
    1: { name: 'NORTH AMERICA', bonus: 5, territories: [11, 12, 13, 14, 15, 16, 17, 18, 19] },
    2: { name: 'SOUTH AMERICA', bonus: 2, territories: [21, 22, 23, 24] },
    3: { name: 'EUROPE', bonus: 5, territories: [31, 32, 33, 34, 35, 36, 37] },
    4: { name: 'AFRICA', bonus: 3, territories: [41, 42, 43, 44, 45, 46] },
    5: { name: 'ASIA', bonus: 7, territories: [51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62] },
    6: { name: 'OCEANIA', bonus: 2, territories: [71, 72, 73, 74] }
};

const CLASSIC_CONNECTIONS = [
    [11, 54], [13, 31], [23, 41], [31, 33], [31, 32], [42, 36], [41, 36], [41, 35], [62, 71], [73, 71], [72, 71], [72, 74]
];

const PLAYER_COLORS = ['#ff00ff', '#ffff00', '#00ff00', '#ff8800', '#ff0000'];

// Global State
let PLAYERS = [];
let state = {
    turn: 0,
    phase: 'deploy',
    reinforcements: 5,
    selectedTerritory: null,
    hoveredTerritoryId: null,
    territories: {}, 
    gameOver: false,
    setupMode: true,
    moveData: null
};

const mainContainer = document.getElementById('main-container');
const mapGrid = document.getElementById('map-grid');
const badgesLayer = document.getElementById('badges-layer');
const connectionsLayer = document.getElementById('connections-layer');
const logContainer = document.getElementById('game-log');
const currentPlayerEl = document.getElementById('current-player');
const currentPhaseEl = document.getElementById('current-phase');
const endTurnBtn = document.getElementById('end-turn-btn');
const tooltip = document.getElementById('tooltip');
const setupModal = document.getElementById('setup-modal');
const gameOverModal = document.getElementById('game-over-modal');
const strengthBar = document.getElementById('strength-bar');
const reinforcementStatusEl = document.getElementById('reinforcement-status');

// --- SETUP & INIT ---

function startGame() {
    const cpuCount = parseInt(document.getElementById('cpu-count').value);
    
    PLAYERS = [{ id: 0, name: 'PLAYER 1', color: '#00ffff' }];
    for (let i = 0; i < cpuCount; i++) {
        PLAYERS.push({ 
            id: i + 1, 
            name: `PLAYER ${i + 2}`, 
            color: PLAYER_COLORS[i % PLAYER_COLORS.length] 
        });
    }
    
    state.setupMode = false;
    setupModal.style.display = 'none';
    log("SYS: Initialization sequence started...", "text-white");
    
    useClassicMap();
    initGame();
}

// Expose startGame to window so HTML onclick works
window.startGame = startGame;

function useClassicMap() {
    CURRENT_MAP_LAYOUT = CLASSIC_MAP_LAYOUT;
    CURRENT_TERRITORY_INFO = CLASSIC_TERRITORY_INFO;
    CURRENT_CONTINENT_DATA = CLASSIC_CONTINENT_DATA;
    CURRENT_CONNECTIONS = CLASSIC_CONNECTIONS;
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

// --- MAP GENERATION ---

function createGridAndTerritories() {
    mapGrid.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;
    mapGrid.style.gridTemplateRows = `repeat(${ROWS}, 1fr)`;
    mapGrid.innerHTML = ''; // Clear previous
    badgesLayer.innerHTML = ''; // Clear previous

    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            const tId = CURRENT_MAP_LAYOUT[y]?.[x] || 0; 
            const el = document.createElement('div');
            el.className = 'map-cell';
            
            if (tId === 0) {
                el.classList.add('cell-water');
            } else {
                el.classList.add('cell-land', 'continent-border');
                el.dataset.tid = tId;
                
                const nTop = (y > 0) ? (CURRENT_MAP_LAYOUT[y-1][x] || 0) : 0;
                const nBot = (y < ROWS - 1) ? (CURRENT_MAP_LAYOUT[y+1][x] || 0) : 0;
                const nLeft = (x > 0) ? (CURRENT_MAP_LAYOUT[y][x-1] || 0) : 0;
                const nRight = (x < COLS - 1) ? (CURRENT_MAP_LAYOUT[y][x+1] || 0) : 0;

                if (tId !== nTop) el.style.borderTop = '2px solid #000';
                if (tId !== nBot) el.style.borderBottom = '2px solid #000';
                if (tId !== nLeft) el.style.borderLeft = '2px solid #000';
                if (tId !== nRight) el.style.borderRight = '2px solid #000';

                el.onclick = () => handleTerritoryClick(tId);

                if (!state.territories[tId]) {
                    state.territories[tId] = {
                        id: tId, owner: null, troops: 0, cells: [],
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

function setupOptimizedHover() {
    mapGrid.addEventListener('mouseover', handleGridHover);
    mapGrid.addEventListener('mouseout', (e) => {
            if (!mapGrid.contains(e.relatedTarget)) clearHover();
    });
}

function handleGridHover(e) {
    const target = e.target;
    if (!target.classList.contains('cell-land')) return;
    const tId = parseInt(target.dataset.tid);
    if (state.hoveredTerritoryId === tId) return; 

    clearHover();
    state.hoveredTerritoryId = tId;
    const terr = state.territories[tId];
    
    if (terr) {
        terr.cells.forEach(c => c.classList.add('region-hover'));
        const info = CURRENT_TERRITORY_INFO[tId];
        if(info) {
            tooltip.innerHTML = `<span style="color:${PLAYERS[terr.owner].color}">${info.name}</span><br>Troops: ${terr.troops}<br>Owner: ${PLAYERS[terr.owner].name}`;
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

function calculateAdjacency() {
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            const currentId = CURRENT_MAP_LAYOUT[y]?.[x];
            if (!currentId) continue;
            [[0,1], [1,0], [0,-1], [-1,0]].forEach(([dx, dy]) => {
                const nx = x + dx, ny = y + dy;
                if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS) {
                    const neighborId = CURRENT_MAP_LAYOUT[ny][nx];
                    if (neighborId && neighborId !== currentId) {
                        state.territories[currentId].neighbors.add(neighborId);
                        state.territories[neighborId].neighbors.add(currentId);
                    }
                }
            });
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
    const tIds = Object.keys(state.territories);
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

// --- RENDERING ---

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
        badge.innerText = terr.troops;
        badge.style.borderColor = pColor;
        badge.style.boxShadow = `0 0 5px ${pColor}`;
    });
    updateStrengthBar();
}

function updateStrengthBar() {
    const totalTroops = Object.values(state.territories).reduce((acc, t) => acc + t.troops, 0);
    strengthBar.innerHTML = '';
    
    PLAYERS.forEach(p => {
        const pTroops = Object.values(state.territories)
            .filter(t => t.owner === p.id)
            .reduce((acc, t) => acc + t.troops, 0);
        
        if (pTroops > 0) {
            const pct = (pTroops / totalTroops) * 100;
            const el = document.createElement('div');
            el.style.width = `${pct}%`;
            el.style.backgroundColor = p.color;
            el.title = `${p.name}: ${pTroops} units`;
            strengthBar.appendChild(el);
        }
    });
}

function hexToRgb(hex) {
    const bigint = parseInt(hex.slice(1), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `${r}, ${g}, ${b}`;
}

function updateTroopCount(terr, delta) {
    terr.troops += delta;
    const badge = document.getElementById(`badge-${terr.id}`);
    badge.innerText = terr.troops;
    
    const animClass = delta > 0 ? 'anim-up' : 'anim-down';
    badge.classList.remove('anim-up', 'anim-down');
    void badge.offsetWidth; 
    badge.classList.add(animClass);
    updateStrengthBar();
}

function updateUI() {
    const player = PLAYERS[state.turn];
    currentPlayerEl.innerText = player.name;
    currentPlayerEl.style.color = player.color;
    currentPlayerEl.style.textShadow = `0 0 10px ${player.color}`;
    currentPhaseEl.innerText = state.phase.toUpperCase();

    // Update Container Border Color based on Phase
    let borderColor = '';
    let phaseColor = '';

    if (state.turn !== 0) {
        // CPU Turn - Blue
        borderColor = 'var(--neon-blue)';
        phaseColor = '#00ffff';
    } else {
        // Human Turn - Phase Colors
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

    const isHuman = (state.turn === 0);
    
    // Handle new Reinforcement Status Bar
    if (isHuman && state.phase === 'deploy' && state.reinforcements > 0) {
        reinforcementStatusEl.innerText = `REINFORCEMENTS: ${state.reinforcements}`;
        reinforcementStatusEl.style.opacity = 1;
    } else {
        reinforcementStatusEl.innerText = "";
        reinforcementStatusEl.style.opacity = 0;
    }
    
    if (isHuman) {
        endTurnBtn.style.display = 'block';
        endTurnBtn.classList.remove('opacity-50');
        endTurnBtn.disabled = false;

        if (state.phase === 'deploy') {
            if (state.reinforcements > 0) {
                // Button logic handled by separate status bar now, so disable button until done
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

function log(msg, colorClass = "text-gray-400") {
    const entry = document.createElement('div');
    entry.className = colorClass;
    const time = new Date().toLocaleTimeString('en-US', {hour12: false, hour: "numeric", minute: "numeric", second: "numeric"});
    entry.innerText = `[${time}] ${msg}`;
    logContainer.appendChild(entry);
    logContainer.scrollTop = logContainer.scrollHeight;
}

// --- GAMEPLAY LOGIC ---

function handleTerritoryClick(tId) {
    if (state.gameOver || state.setupMode) return;
    if (state.turn !== 0) return;

    const terr = state.territories[tId];

    if (state.phase === 'deploy') {
        if (terr.owner === state.turn) {
            if (state.reinforcements > 0) {
                updateTroopCount(terr, 1); 
                state.reinforcements--;
                updateUI();
                
                // Auto-Transition to Attack if reinforcements depleted
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
                    updateTroopCount(source, -1);
                    updateTroopCount(terr, 1);
                    
                    // Auto-End Turn if Source Depleted
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

function btnAction() {
    if (state.phase === 'deploy' && state.reinforcements === 0) {
        // Manual click fallback if logic fails (but auto-transition should handle this)
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

function resolveBattle(attacker, defender) {
    const attName = CURRENT_TERRITORY_INFO[attacker.id].name;
    const defName = CURRENT_TERRITORY_INFO[defender.id].name;
    
    if(state.turn === 0) log(`BATTLE: ${attName} -> ${defName}`, "text-neon-pink");

    const attRoll = Math.floor(Math.random() * attacker.troops * 10);
    const defRoll = Math.floor(Math.random() * defender.troops * 10) + 5; 

    if (attRoll > defRoll) {
        // Victory Logic
        const remaining = attacker.troops - 1;
        const moveAmount = Math.max(1, Math.floor(remaining / 2)); // Ensure at least 1 moves
        
        // 1. Wipe out the defeated defenders
        defender.troops = 0;
        defender.owner = attacker.owner;
        
        // 2. Move troops in
        updateTroopCount(defender, moveAmount); 
        
        // 3. Remove from attacker
        updateTroopCount(attacker, -moveAmount); 
        
        if(state.turn === 0) log(`VICTORY: ${defName} captured!`, "text-green-400");
    } else {
        // Defeat Logic
        const loss = Math.ceil(attacker.troops / 2);
        // Ensure we don't go below 1
        const actualLoss = Math.min(loss, attacker.troops - 1);
        updateTroopCount(attacker, -actualLoss);
        
        if(state.turn === 0) log(`DEFEAT: Assault repelled.`, "text-red-500");
    }

    state.selectedTerritory = null;
    renderMapState();
    checkWinCondition();
}

function endTurn() {
    if (state.gameOver) return;
    if (state.phase === 'deploy' && state.reinforcements > 0) return;

    let attempts = 0;
    do {
        state.turn = (state.turn + 1) % PLAYERS.length;
        attempts++;
    } while (countTerritories(state.turn) === 0 && attempts < PLAYERS.length);

    state.phase = 'deploy';
    state.selectedTerritory = null;
    
    // RISK REINFORCEMENT LOGIC
    state.reinforcements = calculateReinforcements(state.turn);
    
    updateUI();
    
    if (state.turn !== 0) {
        log(`SYS: ${PLAYERS[state.turn].name} calculating...`, "text-gray-500");
        setTimeout(cpuTurn, 800);
    } else {
        log("SYS: Player 1 Turn.", "text-cyan-400");
    }
}

function calculateReinforcements(pid) {
    let count = countTerritories(pid);
    let base = Math.max(3, Math.floor(count / 3));
    let bonus = 0;

    for (const [contId, data] of Object.entries(CURRENT_CONTINENT_DATA)) {
        const ownsAll = data.territories.every(tid => state.territories[tid].owner === pid);
        if (ownsAll) {
            bonus += data.bonus;
            if (pid === 0) log(`BONUS: ${data.name} controlled! +${data.bonus}`, "text-[#ffff00]");
        }
    }
    return base + bonus;
}

function countTerritories(playerId) {
    return Object.values(state.territories).filter(t => t.owner === playerId).length;
}

function cpuTurn() {
    if (state.gameOver) return;
    const myTerrs = Object.values(state.territories).filter(t => t.owner === state.turn);
    if (myTerrs.length === 0) { endTurn(); return; } 

    // 1. Deploy
    while(state.reinforcements > 0) {
        const t = myTerrs[Math.floor(Math.random() * myTerrs.length)];
        updateTroopCount(t, 1);
        state.reinforcements--;
    }
    renderMapState();

    // 2. Attack
    let attacks = 0;
    const attackInt = setInterval(() => {
        if (state.gameOver || attacks >= 3) { 
            clearInterval(attackInt);
            if (!state.gameOver) endTurn();
            return;
        }
        const strongTerrs = Object.values(state.territories).filter(t => t.owner === state.turn && t.troops > 2);
        if (strongTerrs.length > 0) {
            const source = strongTerrs[Math.floor(Math.random() * strongTerrs.length)];
            const enemyNeighbors = Array.from(source.neighbors).map(nid => state.territories[nid]).filter(n => n.owner !== state.turn);
            if (enemyNeighbors.length > 0) {
                const target = enemyNeighbors[Math.floor(Math.random() * enemyNeighbors.length)];
                resolveBattle(source, target);
            }
        }
        attacks++;
    }, 600);
}

function checkWinCondition() {
    if (state.gameOver) return;
    const activePlayers = PLAYERS.filter(p => countTerritories(p.id) > 0);
    
    if (activePlayers.length === 1) {
        state.gameOver = true;
        const winner = activePlayers[0];
        
        // Show Custom Modal instead of Alert
        document.getElementById('winner-title').innerText = "VICTORY";
        document.getElementById('winner-msg').innerText = `${winner.name} CONQUERED THE GRID`;
        document.getElementById('winner-title').style.color = winner.color;
        
        gameOverModal.classList.remove('hidden');
        gameOverModal.style.display = 'flex';
    }
}

endTurnBtn.onclick = btnAction;
