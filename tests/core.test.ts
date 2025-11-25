import { describe, it, expect, beforeEach } from 'vitest';
import { 
    calculateReinforcements, 
    calculateBattleOutcome, 
    isValidMove, 
    generateAdjacencyMap, 
    countTerritories 
} from '../src/core/logic';
import { hexToRgb } from '../src/core/utils';
import { Territory, Continent } from '../src/types';

describe('Game Logic Core', () => {

    // Helper to create basic territories
    const createMockTerritories = (ownerId: number, count: number): Record<number, Territory> => {
        const terrs: Record<number, Territory> = {};
        for (let i = 1; i <= count; i++) {
            terrs[i] = { id: i, owner: ownerId, troops: 1, cells: [], center: {x:0,y:0,count:0}, centerPct: {x:0,y:0}, neighbors: new Set() };
        }
        return terrs;
    };

    describe('countTerritories', () => {
        it('returns 0 for empty territories', () => {
            expect(countTerritories({}, 0)).toBe(0);
        });

        it('counts correctly for a single player', () => {
            const terrs = createMockTerritories(0, 5);
            expect(countTerritories(terrs, 0)).toBe(5);
        });

        it('counts correctly with multiple players', () => {
            const terrs = createMockTerritories(0, 2);
            terrs[3] = { id: 3, owner: 1, troops: 1, cells: [], center: {x:0,y:0,count:0}, centerPct: {x:0,y:0}, neighbors: new Set() };
            expect(countTerritories(terrs, 0)).toBe(2);
            expect(countTerritories(terrs, 1)).toBe(1);
        });
    });

    describe('calculateReinforcements', () => {
        const mockContinentData: Record<number, Continent> = {
            1: { name: 'Test Cont', bonus: 5, territories: [101, 102] }
        };

        it('returns 0 if player has no territories', () => {
            expect(calculateReinforcements(0, {}, mockContinentData)).toBe(0);
        });

        it('returns minimum 3 reinforcements for small territory count', () => {
            const terrs = createMockTerritories(0, 5); // IDs 1..5
            expect(calculateReinforcements(0, terrs, mockContinentData)).toBe(3);
        });

        it('calculates base troops correctly for large territory count', () => {
            const terrs = createMockTerritories(0, 12); // IDs 1..12
            expect(calculateReinforcements(0, terrs, mockContinentData)).toBe(4);
        });

        it('adds continent bonus when player owns all territories in continent', () => {
            const terrs: Record<number, Territory> = {
                101: { id: 101, owner: 0, troops: 1, cells: [], center: {x:0,y:0,count:0}, centerPct: {x:0,y:0}, neighbors: new Set() },
                102: { id: 102, owner: 0, troops: 1, cells: [], center: {x:0,y:0,count:0}, centerPct: {x:0,y:0}, neighbors: new Set() }
            };
            // Base = floor(2/3)=0 -> min 3. Bonus=5. Total=8.
            expect(calculateReinforcements(0, terrs, mockContinentData)).toBe(8);
        });

        it('does not add bonus if one territory is missing', () => {
            const terrs: Record<number, Territory> = {
                101: { id: 101, owner: 0, troops: 1, cells: [], center: {x:0,y:0,count:0}, centerPct: {x:0,y:0}, neighbors: new Set() },
                102: { id: 102, owner: 1, troops: 1, cells: [], center: {x:0,y:0,count:0}, centerPct: {x:0,y:0}, neighbors: new Set() }
            };
            expect(calculateReinforcements(0, terrs, mockContinentData)).toBe(3);
        });
    });

    describe('calculateBattleOutcome', () => {
        it('attacker wins: defender wiped out and attacker moves in', () => {
            // Roll: Attacker=0.9, Defender=0.1
            let i = 0;
            const mockRandom = () => (i++ === 0 ? 0.9 : 0.1); 
            
            // Att=10, Def=5.
            // AttRoll=90, DefRoll=10. Success.
            // Move: floor((10-1)/2) = 4.
            const result = calculateBattleOutcome(10, 5, mockRandom);
            
            expect(result.success).toBe(true);
            expect(result.conquered).toBe(true);
            expect(result.defenderLoss).toBe(5);
            expect(result.moveAmount).toBe(4);
            expect(result.attackerLoss).toBe(0);
        });

        it('attacker wins small skirmish: moves minimum 1', () => {
            // Roll: Attacker=0.9, Defender=0.1
            let i = 0;
            const mockRandom = () => (i++ === 0 ? 0.9 : 0.1);
            
            // Att=3, Def=1.
            // AttRoll=27, DefRoll=6. Success.
            // Remaining=2. Move = max(1, 1) = 1.
            const result = calculateBattleOutcome(3, 1, mockRandom);
            
            expect(result.success).toBe(true);
            expect(result.moveAmount).toBe(1);
        });

        it('defender wins: attacker loses half (rounded up)', () => {
            // Roll: Attacker=0.1, Defender=0.9
            let i = 0;
            const mockRandom = () => (i++ === 0 ? 0.1 : 0.9);

            // Att=10. Loss = ceil(5) = 5.
            const result = calculateBattleOutcome(10, 5, mockRandom);
            
            expect(result.success).toBe(false);
            expect(result.defenderLoss).toBe(0);
            expect(result.attackerLoss).toBe(5);
        });

        it('defender wins: attacker with 1 unit loses it (theoretical)', () => {
            let i = 0;
            const mockRandom = () => (i++ === 0 ? 0.1 : 0.9);
            
            const result = calculateBattleOutcome(1, 1, mockRandom);
            expect(result.success).toBe(false);
            expect(result.attackerLoss).toBe(1);
        });
    });

    describe('isValidMove', () => {
        let terrs: Record<number, Territory>;
        
        beforeEach(() => {
            terrs = createMockTerritories(0, 2);
            terrs[1].neighbors.add(2);
            terrs[2].neighbors.add(1);
        });

        it('returns false if source territory does not exist', () => {
            expect(isValidMove(99, 1, terrs)).toBe(false);
        });

        it('returns true if target is a neighbor', () => {
            expect(isValidMove(1, 2, terrs)).toBe(true);
        });

        it('returns false if target is not a neighbor', () => {
            // Create a disconnected territory
            terrs[3] = { id: 3, owner: 0, troops: 1, cells: [], center: {x:0,y:0,count:0}, centerPct: {x:0,y:0}, neighbors: new Set() };
            expect(isValidMove(1, 3, terrs)).toBe(false);
        });
    });

    describe('generateAdjacencyMap', () => {
        it('identifies horizontal neighbors', () => {
            const layout = [
                [1, 2],
                [0, 0]
            ];
            const result = generateAdjacencyMap(2, 2, layout);
            
            expect(result[1].has(2)).toBe(true);
            expect(result[2].has(1)).toBe(true);
        });

        it('identifies vertical neighbors', () => {
            const layout = [
                [1],
                [2]
            ];
            const result = generateAdjacencyMap(2, 1, layout);
            expect(result[1].has(2)).toBe(true);
            expect(result[2].has(1)).toBe(true);
        });

        it('ignores water (0) cells', () => {
            const layout = [
                [1, 0, 2]
            ];
            const result = generateAdjacencyMap(1, 3, layout);
            expect(result[1].has(2)).toBe(false);
            expect(result[2]?.has(1)).toBe(false);
        });

        it('handles complex shapes', () => {
            const layout = [
                [1, 1],
                [1, 2]
            ];
            const result = generateAdjacencyMap(2, 2, layout);
            expect(result[1].has(2)).toBe(true);
            expect(result[2].has(1)).toBe(true);
        });
    });

});

describe('Utilities', () => {
    describe('hexToRgb', () => {
        it('converts standard hex codes correctly', () => {
            expect(hexToRgb('#ff0000')).toBe('255, 0, 0');
            expect(hexToRgb('#00ff00')).toBe('0, 255, 0');
            expect(hexToRgb('#0000ff')).toBe('0, 0, 255');
            expect(hexToRgb('#ffffff')).toBe('255, 255, 255');
            expect(hexToRgb('#000000')).toBe('0, 0, 0');
        });

        it('handles short hex codes', () => {
            expect(hexToRgb('#fff')).toBe('255, 255, 255');
            expect(hexToRgb('#000')).toBe('0, 0, 0');
            expect(hexToRgb('#f00')).toBe('255, 0, 0');
        });
    });
});
