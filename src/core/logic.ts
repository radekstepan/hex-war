import { Territory, Continent, BattleResult } from "../types";

/**
 * Counts territories owned by a player.
 */
export function countTerritories(territories: Record<number, Territory>, playerId: number): number {
    return Object.values(territories).filter(t => t.owner === playerId).length;
}

/**
 * Calculates reinforcement troops for a player based on territory count and continent bonuses.
 */
export function calculateReinforcements(
    playerId: number,
    territories: Record<number, Territory>,
    continentData: Record<number, Continent>
): number {
    const count = countTerritories(territories, playerId);
    if (count === 0) return 0;

    let base = Math.max(3, Math.floor(count / 3));
    let bonus = 0;

    for (const data of Object.values(continentData)) {
        // Check if continent has territories defined and if player owns all of them
        if (data.territories.length > 0) {
            const ownsAll = data.territories.every(tid => territories[tid] && territories[tid].owner === playerId);
            if (ownsAll) {
                bonus += data.bonus;
            }
        }
    }
    return base + bonus;
}

/**
 * Pure function to calculate battle result given attacker and defender troop counts.
 * Accepts an optional attackerBonus to skew RNG (e.g. for Hard AI).
 */
export function calculateBattleOutcome(
    attackerTroops: number,
    defenderTroops: number,
    attackerBonus: number = 0,
    randomFn: () => number = Math.random
): BattleResult {
    const attRoll = Math.floor(randomFn() * attackerTroops * 10) + attackerBonus;
    // Defenders get a small bonus in this logic
    const defRoll = Math.floor(randomFn() * defenderTroops * 10) + 5;

    const success = attRoll > defRoll;
    let attackerLoss = 0;
    let defenderLoss = 0;
    let conquered = false;
    let moveAmount = 0;

    if (success) {
        // Victory Logic
        defenderLoss = defenderTroops; // Wiped out
        conquered = true;
        const remainingAttacker = attackerTroops - 1; 
        
        // Move half of remaining, but at least 1
        moveAmount = Math.max(1, Math.floor(remainingAttacker / 2));
    } else {
        // Defeat Logic
        // Loss is half of attackers, rounded up
        const loss = Math.ceil(attackerTroops / 2);
        // Cannot lose more than available
        attackerLoss = Math.min(loss, attackerTroops); 
        moveAmount = 0;
    }

    return {
        success,
        attackerLoss,
        defenderLoss,
        conquered,
        moveAmount
    };
}

/**
 * Logic to check if a move is valid between neighbors
 */
export function isValidMove(
    sourceId: number,
    targetId: number,
    territories: Record<number, Territory>
): boolean {
    const source = territories[sourceId];
    if (!source) return false;
    return source.neighbors.has(targetId);
}

/**
 * Scans a 2D map layout and returns a map of territory IDs to their set of neighbors.
 */
export function generateAdjacencyMap(
    rows: number,
    cols: number,
    layout: number[][]
): Record<number, Set<number>> {
    const adjacency: Record<number, Set<number>> = {};

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const currentId = layout[y]?.[x];
            if (!currentId || currentId === 0) continue;

            if (!adjacency[currentId]) {
                adjacency[currentId] = new Set();
            }

            const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
            
            for (const [dy, dx] of directions) {
                const ny = y + dy;
                const nx = x + dx;
                
                if (ny >= 0 && ny < rows && nx >= 0 && nx < cols) {
                    const neighborId = layout[ny][nx];
                    if (neighborId && neighborId !== 0 && neighborId !== currentId) {
                        adjacency[currentId].add(neighborId);
                        
                        // Ensure neighbor entry exists and add back-link immediately
                        if (!adjacency[neighborId]) adjacency[neighborId] = new Set();
                        adjacency[neighborId].add(currentId);
                    }
                }
            }
        }
    }
    return adjacency;
}
