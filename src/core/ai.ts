import { Territory, Continent, AIDifficulty } from "../types";

interface AIAnalysis {
    owned: Territory[];
    borders: Territory[]; // Owned territories adjacent to enemies
    internal: Territory[]; // Owned territories only adjacent to allies
    threats: Record<number, number>; // Territory ID -> Total Enemy Troops adjacent
    continentStatus: Record<number, { ownedCount: number, totalCount: number, isOwned: boolean }>;
}

/**
 * Analyzes the map from the perspective of the current player.
 */
export function analyzeMap(
    playerId: number,
    territories: Record<number, Territory>,
    continentData: Record<number, Continent>
): AIAnalysis {
    const owned: Territory[] = [];
    const borders: Territory[] = [];
    const internal: Territory[] = [];
    const threats: Record<number, number> = {};
    
    // Continent Stats
    const continentStatus: Record<number, { ownedCount: number, totalCount: number, isOwned: boolean }> = {};
    Object.keys(continentData).forEach(k => {
        const key = Number(k);
        continentStatus[key] = { 
            ownedCount: 0, 
            totalCount: continentData[key].territories.length, 
            isOwned: false 
        };
    });

    Object.values(territories).forEach(t => {
        // Track continent ownership
        Object.entries(continentData).forEach(([cId, cData]) => {
            if (cData.territories.includes(t.id)) {
                if (t.owner === playerId) {
                    continentStatus[Number(cId)].ownedCount++;
                }
            }
        });

        if (t.owner === playerId) {
            owned.push(t);
            let isBorder = false;
            let threatLevel = 0;

            t.neighbors.forEach(nId => {
                const neighbor = territories[nId];
                if (neighbor && neighbor.owner !== playerId) {
                    isBorder = true;
                    threatLevel += neighbor.troops;
                }
            });

            if (isBorder) {
                borders.push(t);
                threats[t.id] = threatLevel;
            } else {
                internal.push(t);
            }
        }
    });

    // Finalize continent ownership boolean
    Object.keys(continentStatus).forEach(k => {
        const key = Number(k);
        continentStatus[key].isOwned = continentStatus[key].ownedCount === continentStatus[key].totalCount;
    });

    return { owned, borders, internal, threats, continentStatus };
}

/**
 * Calculates where to place reinforcements.
 * Returns a map of Territory ID -> Amount to deploy.
 */
export function getDeployments(
    playerId: number,
    difficulty: AIDifficulty,
    reinforcements: number,
    territories: Record<number, Territory>,
    continentData: Record<number, Continent>,
    territoryInfo: Record<number, { continent: number }>
): Record<number, number> {
    const analysis = analyzeMap(playerId, territories, continentData);
    const deployments: Record<number, number> = {};
    let remaining = reinforcements;

    if (analysis.owned.length === 0) return {};

    // --- EASY STRATEGY: Random Distribution ---
    if (difficulty === 'EASY') {
        while (remaining > 0) {
            const target = analysis.owned[Math.floor(Math.random() * analysis.owned.length)];
            deployments[target.id] = (deployments[target.id] || 0) + 1;
            remaining--;
        }
        return deployments;
    }

    // --- MEDIUM STRATEGY: Border Balance ---
    if (difficulty === 'MEDIUM') {
        // Filter only border territories
        const targets = analysis.borders.length > 0 ? analysis.borders : analysis.owned;
        
        // Try to even out borders based on local threat
        while (remaining > 0) {
            // Find the border with the lowest ratio of (Current Troops + Planned) / Threat
            // If threat is 0 (shouldn't happen for border), assume 1
            let bestTarget = targets[0];
            let minRatio = Number.MAX_VALUE;

            for (const t of targets) {
                const current = t.troops + (deployments[t.id] || 0);
                const threat = Math.max(1, analysis.threats[t.id] || 1);
                const ratio = current / threat;
                
                if (ratio < minRatio) {
                    minRatio = ratio;
                    bestTarget = t;
                }
            }
            
            deployments[bestTarget.id] = (deployments[bestTarget.id] || 0) + 1;
            remaining--;
        }
        return deployments;
    }

    // --- HARD STRATEGY: Continent Control & Critical Defense ---
    if (difficulty === 'HARD') {
        // 1. Identify Target Continent (closest to completion)
        let targetContinentId: number | null = null;
        let maxOwnershipPct = -1;

        for (const [cIdStr, status] of Object.entries(analysis.continentStatus)) {
            const cId = Number(cIdStr);
            if (status.isOwned) continue; // Already have it
            const pct = status.ownedCount / status.totalCount;
            if (pct > maxOwnershipPct && pct > 0) {
                maxOwnershipPct = pct;
                targetContinentId = cId;
            }
        }

        // 2. Score every owned territory
        const scores: Record<number, number> = {};
        
        analysis.owned.forEach(t => {
            let score = 0;
            const threat = analysis.threats[t.id] || 0;
            const isBorder = analysis.borders.includes(t);
            const tContinent = territoryInfo[t.id]?.continent;

            // Base Priority: Defend threats
            if (isBorder) {
                // If we are vastly outnumbered, panic defend
                if (t.troops < threat) score += 50; 
                // General border maintenance
                score += 10;
            }

            // Offensive Priority: Capture Target Continent
            if (targetContinentId !== null) {
                // If this territory is IN the target continent and borders an enemy IN the same continent
                if (tContinent === targetContinentId) {
                    const hasEnemyInContinent = Array.from(t.neighbors).some(nid => {
                        const n = territories[nid];
                        return n.owner !== playerId && territoryInfo[n.id]?.continent === targetContinentId;
                    });
                    if (hasEnemyInContinent) score += 100;
                }
                
                // If this territory borders the target continent (staging ground)
                const bordersTarget = Array.from(t.neighbors).some(nid => territoryInfo[nid]?.continent === targetContinentId);
                if (bordersTarget && tContinent !== targetContinentId) score += 20;
            }

            scores[t.id] = score;
        });

        // 3. Weighted Random Deployment based on Scores
        // To avoid being purely deterministic, we pick top 3 candidates and rotate, or weighted selection
        while (remaining > 0) {
            let bestId = -1;
            let maxScore = -9999;
            
            // Recalculate best dynamic choice
            for (const t of analysis.owned) {
                // Diminishing returns: Score decreases as we add troops to it this turn
                const added = deployments[t.id] || 0;
                const effectiveScore = scores[t.id] / (1 + added * 0.5); 
                
                if (effectiveScore > maxScore) {
                    maxScore = effectiveScore;
                    bestId = t.id;
                }
            }
            
            if (bestId !== -1) {
                deployments[bestId] = (deployments[bestId] || 0) + 1;
            } else {
                // Fallback
                const fallback = analysis.owned[0];
                deployments[fallback.id] = (deployments[fallback.id] || 0) + 1;
            }
            remaining--;
        }

        return deployments;
    }

    return {};
}

/**
 * Decides the next attack move.
 */
export function getNextAttack(
    playerId: number,
    difficulty: AIDifficulty,
    territories: Record<number, Territory>,
    territoryInfo: Record<number, { continent: number }>
): { sourceId: number, targetId: number } | null {

    const myTerritories = Object.values(territories).filter(t => t.owner === playerId && t.troops > 1);
    if (myTerritories.length === 0) return null;

    // Potential moves: { source, target, score }
    const candidates: { source: Territory, target: Territory, score: number }[] = [];

    for (const source of myTerritories) {
        source.neighbors.forEach(nid => {
            const target = territories[nid];
            if (target.owner !== playerId) {
                let score = 0;
                
                // Win Probability Heuristic
                // Source troops must be > 1 to attack.
                // Attacking with N troops vs M defenders. 
                // Basic rule: Need Source > Target.
                const diff = source.troops - target.troops;
                
                // --- DIFFICULTY LOGIC ---
                
                if (difficulty === 'EASY') {
                    // Random/Chaotic. Only cares if it's theoretically possible.
                    if (source.troops > 1) {
                        score = Math.random() * 10;
                    }
                }
                else if (difficulty === 'MEDIUM') {
                    // Conservative. Wants advantage.
                    if (source.troops > target.troops + 1) {
                        score = 50 + diff;
                    } else if (source.troops > 1 && target.troops === 1) {
                        // Pick off weaklings
                        score = 20;
                    } else {
                        score = -100; // Don't suicide
                    }
                }
                else if (difficulty === 'HARD') {
                    // Aggressive & Strategic
                    
                    // 1. Win Chance
                    if (source.troops > target.troops) score += 20;
                    if (source.troops > target.troops * 1.5) score += 20;
                    
                    // 2. Continent Bonus Breaking
                    // We don't have easy access to enemy continent wholeness here without expensive calc,
                    // but we can prioritize breaking into a new continent.
                    const sourceCont = territoryInfo[source.id].continent;
                    const targetCont = territoryInfo[target.id].continent;
                    if (sourceCont !== targetCont) score += 10; // Expansion

                    // 3. Chain Attack Potential
                    // If capture allows merging with another friendly territory
                    const connectsToFriendly = Array.from(target.neighbors).some(nnid => territories[nnid].owner === playerId);
                    if (connectsToFriendly) score += 15;

                    // 4. Eliminate Weak Player (Killer Instinct)
                    // (Simplified: just prioritize low troop targets)
                    if (target.troops === 1) score += 10;

                    // Safety Check: Never attack if we are guaranteed to lose majority
                    if (source.troops <= target.troops) score = -1000;
                }

                if (score > 0) {
                    candidates.push({ source, target, score });
                }
            }
        });
    }

    if (candidates.length === 0) return null;

    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);

    // EASY: Pick random from top 50%
    if (difficulty === 'EASY') {
        const idx = Math.floor(Math.random() * candidates.length);
        return { sourceId: candidates[idx].source.id, targetId: candidates[idx].target.id };
    }

    // MEDIUM/HARD: Pick the best
    return { sourceId: candidates[0].source.id, targetId: candidates[0].target.id };
}

/**
 * Decides fortification move.
 */
export function getFortification(
    playerId: number,
    difficulty: AIDifficulty,
    territories: Record<number, Territory>
): { sourceId: number, targetId: number, amount: number } | null {
    
    if (difficulty === 'EASY') return null; // Easy AI doesn't fortify

    // Analyze map
    // We assume analyzeMap is available or we re-implement simplified logic for speed
    // Find "Internal" territories (surrounded by friends) with troops > 1
    const internalSources: Territory[] = [];
    
    // Find "Border" territories (adjacent to enemy) that need help
    const borderTargets: Territory[] = [];
    const threats: Record<number, number> = {};

    Object.values(territories).forEach(t => {
        if (t.owner === playerId) {
            let isBorder = false;
            let enemyTroops = 0;
            t.neighbors.forEach(nid => {
                const n = territories[nid];
                if (n.owner !== playerId) {
                    isBorder = true;
                    enemyTroops += n.troops;
                }
            });

            if (isBorder) {
                borderTargets.push(t);
                threats[t.id] = enemyTroops;
            } else if (t.troops > 1) {
                internalSources.push(t);
            }
        }
    });

    // 1. Move from Internal to Border (Priority)
    if (internalSources.length > 0 && borderTargets.length > 0) {
        // Find pair with valid connection
        // BFS/Pathfinding is expensive for this scope, so we check direct neighbors 
        // OR neighbors of neighbors (simplified logic: only direct neighbors for now to be safe)
        
        for (const source of internalSources) {
            // Check immediate neighbors for a border needing help
            for (const nid of source.neighbors) {
                const target = territories[nid];
                if (target.owner === playerId && borderTargets.includes(target)) {
                    // Found a move!
                    return {
                        sourceId: source.id,
                        targetId: target.id,
                        amount: source.troops - 1
                    };
                }
            }
        }
    }

    // 2. HARD MODE: Balance Borders
    // If one border is weak and a neighbor border is strong, transfer.
    if (difficulty === 'HARD') {
        for (const source of borderTargets) {
            if (source.troops > 5) { // Only move if we have excess
                 for (const nid of source.neighbors) {
                     const target = territories[nid];
                     // Target must be ours, a border, and weaker
                     if (target.owner === playerId && borderTargets.includes(target)) {
                         if (target.troops < source.troops / 2) {
                             return {
                                 sourceId: source.id,
                                 targetId: target.id,
                                 amount: Math.floor(source.troops / 2)
                             };
                         }
                     }
                 }
            }
        }
    }

    return null;
}
