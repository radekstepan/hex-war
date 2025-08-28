import { ui, setupPlayerConfigUI, getPlayerConfigs } from './ui.js';
import { renderMap, setupPanZoom } from './ui.js';
import { setupGame } from './game.js';

// --- INITIALIZATION ---
window.onload = () => {
    renderMap();
    setupPanZoom();
    setupPlayerConfigUI();

    ui.startGameBtn.addEventListener('click', () => {
        const playerConfigs = getPlayerConfigs();
        if (playerConfigs.length < 2) {
            alert("You need at least one AI opponent to start the game.");
            return;
        }

        ui.startupModal.classList.add('hidden');
        ui.gameContainer.style.display = 'flex';
        setupGame(playerConfigs);
    });

    ui.restartGameBtn.addEventListener('click', () => {
        ui.winnerModal.classList.add('hidden');
        ui.gameContainer.style.display = 'none';
        ui.startupModal.classList.remove('hidden');
        setupPlayerConfigUI();
        setupPanZoom();
    });
};
