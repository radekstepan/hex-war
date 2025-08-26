import { ui, renderMap, setupPanZoom } from './ui.js';
import { setupGame } from './game.js';

// --- INITIALIZATION ---
window.onload = () => {
    renderMap();
    setupPanZoom();

    ui.startGameBtn.addEventListener('click', () => {
        const numAI = parseInt(ui.aiPlayerSelect.value);
        const aiSpeed = parseInt(ui.aiSpeedSelect.value);
        ui.startupModal.classList.add('hidden');
        ui.gameContainer.style.display = 'flex';
        setupGame(numAI, aiSpeed);
    });

    ui.restartGameBtn.addEventListener('click', () => {
        ui.winnerModal.classList.add('hidden');
        ui.gameContainer.style.display = 'none';
        ui.startupModal.classList.remove('hidden');
        // Reset pan/zoom for next game
        setupPanZoom();
    });
};
