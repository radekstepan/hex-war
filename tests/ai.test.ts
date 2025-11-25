import { describe, it, expect } from 'vitest';
import { getDeployments, getNextAttack, getFortification, analyzeMap } from '../src/core/ai';
import { Territory, Continent } from '../src/types';

describe('AI Logic', () => {

    const createTerritory = (id: number, owner: number, troops: number, neighbors: number[]): Territory => ({
        id, owner, troops, cells: [], center: {x:0,y:0,count:0}, centerPct: {x:0,y:0},
        neighbors: new Set(neighbors)
    });

    const mockContinentData: Record<number, Continent> = {
        1: { name: 'Cont1', bonus: 5, territories: [1, 2] },
        2: { name: 'Cont2', bonus: 3, territories: [3] }
    };

    const mockTerritoryInfo: Record<number, { continent: number }> = {
        1: { continent: 1 }, 2: { continent: 1 }, 3: { continent: 2 }, 4: { continent: 2 }
    };

    describe('analyzeMap', () => {
        it('identifies borders and internal territories', () => {
            const terrs = {
                1: createTerritory(1, 0, 10, [2]),
                2: createTerritory(2, 0, 10, [1, 3]),
                3: createTerritory(3, 1, 5, [2])
            };

            const result = analyzeMap(0, terrs, mockContinentData);

            expect(result.owned.length).toBe(2); // Owns 1 and 2
            expect(result.internal.map(t=>t.id)).toContain(1); // 1 only touches 2 (friendly)
            expect(result.borders.map(t=>t.id)).toContain(2); // 2 touches 3 (enemy)
            expect(result.threats[2]).toBe(5); // Enemy has 5 troops
        });
    });

    describe('getDeployments', () => {
        it('HARD: Prioritizes borders with threats', () => {
            const terrs = {
                1: createTerritory(1, 0, 1, [2]), // Border, threat=5
                2: createTerritory(2, 1, 5, [1]),
                3: createTerritory(3, 0, 1, [4]), // Internal/Safeish
                4: createTerritory(4, 0, 1, [3])
            };

            // Hard mode should put troops on 1 because it's threatened
            const deployments = getDeployments(0, 'HARD', 5, terrs, mockContinentData, mockTerritoryInfo);
            
            // Should have majority on 1
            expect(deployments[1]).toBeGreaterThan(deployments[3] || 0);
        });

        it('EASY: Random distribution', () => {
            const terrs = {
                1: createTerritory(1, 0, 1, [2]),
                2: createTerritory(2, 0, 1, [1])
            };
            const deployments = getDeployments(0, 'EASY', 5, terrs, mockContinentData, mockTerritoryInfo);
            
            // Just check total is 5
            const total = Object.values(deployments).reduce((a, b) => a + b, 0);
            expect(total).toBe(5);
        });
    });

    describe('getNextAttack', () => {
        it('Does not attack if troops are insufficient', () => {
            const terrs = {
                1: createTerritory(1, 0, 2, [2]),
                2: createTerritory(2, 1, 10, [1])
            };
            
            // 2 vs 10, Hard AI should not attack
            const move = getNextAttack(0, 'HARD', terrs, mockTerritoryInfo);
            expect(move).toBeNull();
        });

        it('HARD: Prioritizes weak targets', () => {
            const terrs = {
                1: createTerritory(1, 0, 10, [2, 3]),
                2: createTerritory(2, 1, 10, [1]), // Strong enemy
                3: createTerritory(3, 1, 1, [1])   // Weak enemy
            };
            
            const move = getNextAttack(0, 'HARD', terrs, mockTerritoryInfo);
            expect(move).not.toBeNull();
            expect(move?.targetId).toBe(3); // Should pick the weak one
        });
    });

    describe('getFortification', () => {
        it('Moves troops from internal to border', () => {
            const terrs = {
                1: createTerritory(1, 0, 10, [2]), // Internal
                2: createTerritory(2, 0, 1, [1, 3]), // Border
                3: createTerritory(3, 1, 5, [2])  // Enemy
            };

            const move = getFortification(0, 'MEDIUM', terrs);
            
            expect(move).not.toBeNull();
            expect(move?.sourceId).toBe(1);
            expect(move?.targetId).toBe(2);
            expect(move?.amount).toBe(9); // All but 1
        });

        it('EASY: Does not fortify', () => {
             const terrs = {
                1: createTerritory(1, 0, 10, [2]), 
                2: createTerritory(2, 0, 1, [1, 3]),
                3: createTerritory(3, 1, 5, [2])
            };
            const move = getFortification(0, 'EASY', terrs);
            expect(move).toBeNull();
        });
    });
});
