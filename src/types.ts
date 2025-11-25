export interface Player {
    id: number;
    name: string;
    color: string;
}

export interface Territory {
    id: number;
    owner: number;
    troops: number;
    // Visual properties
    cells: HTMLElement[];
    center: { x: number; y: number; count: number };
    centerPct: { x: number; y: number };
    neighbors: Set<number>;
}

export interface TerritoryInfo {
    name: string;
    continent: number;
}

export interface Continent {
    name: string;
    bonus: number;
    territories: number[];
}

export type GamePhase = 'deploy' | 'attack' | 'fortify';

export interface GameState {
    turn: number;
    phase: GamePhase;
    reinforcements: number;
    selectedTerritory: number | null;
    hoveredTerritoryId: number | null;
    territories: Record<number, Territory>;
    gameOver: boolean;
    setupMode: boolean;
    moveData: any;
    fortifying: boolean;
}

export interface BattleResult {
    success: boolean;
    attackerLoss: number;
    defenderLoss: number;
    conquered: boolean;
    moveAmount: number;
}
