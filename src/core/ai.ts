import { Territory, Continent, AIDifficulty } from "../types";

interface AIAnalysis {
    owned: Territory[];
    borders: Territory[]; // Owned territories adjacent to enemies
    internal: Territory[]; // Owned territories only adjacent to allies
    threats: Record<number, number>; // Territory ID -> Total Enemy Troops adjacent
    continentStatus: Record<number, { ownedCount: number, totalCount: number, isOwned: boolean }>;
    chokepoints: number[]; // IDs of critical territories protecting a continent
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
    const chokepoints: number[] = [];

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

    // Finalize continent ownership and Identify Chokepoints
    Object.keys(continentStatus).forEach(k => {
        const key = Number(k);
        continentStatus[key].isOwned = continentStatus[key].ownedCount === continentStatus[key].totalCount;

        // If we own this continent (or are very close), mark its borders as critical chokepoints
        if (continentStatus[key].ownedCount >= continentStatus[key].totalCount - 1) {
            const contTerritories = continentData[key].territories;
            contTerritories.forEach(tid => {
                const terr = territories[tid];
                if (terr && terr.owner === playerId && borders.includes(terr)) {
                    chokepoints.push(tid);
                }
            });
        }
    });

    return { owned, borders, internal, threats, continentStatus, chokepoints };
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

    // --- MEDIUM STRATEGY: Strategic Border Defense with Continent Awareness ---
    if (difficulty === 'MEDIUM') {
        // Identify target continent (simple version - highest completion %)
        let targetContinentId: number | null = null;
        let maxPct = 0;

        for (const [cIdStr, status] of Object.entries(analysis.continentStatus)) {
            const cId = Number(cIdStr);
            if (status.isOwned) continue;

            const pct = status.ownedCount / status.totalCount;
            if (pct > maxPct && pct > 0.4) { // Only consider if we own 40%+
                maxPct = pct;
                targetContinentId = cId;
            }
        }

        // Score territories for deployment
        const scores: Record<number, number> = {};

        analysis.owned.forEach(t => {
            let score = 0;
            const threat = analysis.threats[t.id] || 0;
            const isBorder = analysis.borders.includes(t);
            const currentTroops = t.troops;

            // Priority 1: Defend chokepoints (protect bonuses)
            if (analysis.chokepoints.includes(t.id)) {
                score += 200;
                if (currentTroops < threat * 1.3) score += 50;
            }

            // Priority 2: Push for target continent
            const tContinent = territoryInfo[t.id]?.continent;
            if (targetContinentId !== null && tContinent === targetContinentId) {
                score += 40;
                // Prioritize if bordering enemy in target continent
                const hasEnemyInContinent = Array.from(t.neighbors).some(nid => {
                    const n = territories[nid];
                    return n.owner !== playerId && territoryInfo[n.id]?.continent === targetContinentId;
                });
                if (hasEnemyInContinent) score += 50;
            }

            // Priority 3: General border defense
            if (isBorder) {
                score += 15;
                // Match threats
                if (threat > currentTroops) score += (threat - currentTroops);
            }

            scores[t.id] = score;
        });

        // Deploy with diminishing returns
        while (remaining > 0) {
            let bestId = -1;
            let maxScore = -1;

            for (const t of analysis.owned) {
                const added = deployments[t.id] || 0;
                const current = t.troops + added;
                let dynScore = scores[t.id];

                // Light diminishing returns
                const threat = analysis.threats[t.id] || 0;
                if (current > threat * 1.5 + 3 && threat > 0) dynScore /= 1.5;

                if (dynScore > maxScore) {
                    maxScore = dynScore;
                    bestId = t.id;
                }
            }

            if (bestId !== -1) {
                deployments[bestId] = (deployments[bestId] || 0) + 1;
            } else {
                const fallback = analysis.owned[0];
                deployments[fallback.id] = (deployments[fallback.id] || 0) + 1;
            }
            remaining--;
        }
        return deployments;
    }

    // --- HARD STRATEGY: CALCULATED DOMINATION ---
    if (difficulty === 'HARD') {
        // 1. Identify Target Continent (closest to completion with best bonus/size ratio)
        let targetContinentId: number | null = null;
        let maxScore = -1;

        for (const [cIdStr, status] of Object.entries(analysis.continentStatus)) {
            const cId = Number(cIdStr);
            if (status.isOwned) continue;

            const pct = status.ownedCount / status.totalCount;
            const bonusWeight = continentData[cId].bonus / 10;
            // Weighted score: Percent Complete + Raw Bonus Value
            const score = pct + bonusWeight;

            if (score > maxScore && pct > 0) {
                maxScore = score;
                targetContinentId = cId;
            }
        }

        // 2. Score every owned territory for deployment
        const scores: Record<number, number> = {};

        analysis.owned.forEach(t => {
            let score = 0;
            const threat = analysis.threats[t.id] || 0;
            const isBorder = analysis.borders.includes(t);
            const currentTroops = t.troops;

            // PRIORITY 1: Hold Chokepoints (Defend existing bonuses)
            if (analysis.chokepoints.includes(t.id)) {
                score += 500;
                // Ensure we have a safety buffer against threats
                if (currentTroops < threat * 1.5) score += 200;
            }

            // PRIORITY 2: Secure the Target Continent
            const tContinent = territoryInfo[t.id]?.continent;
            if (targetContinentId !== null && tContinent === targetContinentId) {
                score += 100;
                // If it borders an enemy inside the target continent, kill them
                const hasEnemyInContinent = Array.from(t.neighbors).some(nid => {
                    const n = territories[nid];
                    return n.owner !== playerId && territoryInfo[n.id]?.continent === targetContinentId;
                });
                if (hasEnemyInContinent) score += 150;
            }

            // PRIORITY 3: General Border Defense
            if (isBorder) {
                score += 20;
                // If vast enemy stack adjacent, match it or deter it
                if (threat > currentTroops) score += (threat - currentTroops) * 2;
            }

            scores[t.id] = score;
        });

        // 3. Greedy Weighted Deployment
        while (remaining > 0) {
            let bestId = -1;
            let maxScore = -9999;

            for (const t of analysis.owned) {
                const added = deployments[t.id] || 0;
                const current = t.troops + added;
                let dynScore = scores[t.id];

                // Diminishing returns: prevent infinite stacking if threat is low
                const threat = analysis.threats[t.id] || 0;
                if (current > threat * 2 + 5 && threat > 0) dynScore /= 2;

                if (dynScore > maxScore) {
                    maxScore = dynScore;
                    bestId = t.id;
                }
            }

            if (bestId !== -1) {
                deployments[bestId] = (deployments[bestId] || 0) + 1;
            } else {
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

                // --- DIFFICULTY LOGIC ---

                if (difficulty === 'EASY') {
                    if (source.troops > 1) {
                        score = Math.random() * 10;
                    }
                }
                else if (difficulty === 'MEDIUM') {
                    // More aggressive than before, but not as brutal as HARD

                    // 1. Basic force advantage
                    if (source.troops > target.troops) score += 15;
                    if (source.troops >= target.troops * 1.3) score += 30; // Good advantage
                    if (source.troops < target.troops) score -= 100; // Avoid bad battles

                    // 2. Try to break/prevent enemy bonuses
                    const targetCont = territoryInfo[target.id].continent;

                    let enemyContCount = 0;
                    let contSize = 0;
                    Object.values(territories).forEach(t => {
                        if (territoryInfo[t.id]?.continent === targetCont) {
                            contSize++;
                            if (t.owner === target.owner) enemyContCount++;
                        }
                    });

                    const enemyHasBonus = (enemyContCount === contSize);
                    const enemyNearBonus = (enemyContCount >= contSize - 1);

                    if (enemyHasBonus) {
                        score += 100; // Break enemy bonuses
                    } else if (enemyNearBonus) {
                        score += 40; // Prevent completion
                    }

                    // 3. Continent consolidation
                    const sourceCont = territoryInfo[source.id].continent;
                    if (sourceCont === targetCont) {
                        score += 30; // Expand in same continent
                    }

                    // 4. Opportunistic attacks
                    if (target.troops === 1 && source.troops > 2) score += 10;

                    // 5. Don't attack if likely to lose
                    if (source.troops <= target.troops && !enemyHasBonus) score = -500;
                }
                else if (difficulty === 'HARD') {
                    // --- BRUTAL LOGIC ---

                    // 1. Probability of Victory
                    if (source.troops > target.troops) score += 20;
                    if (source.troops >= target.troops * 1.5) score += 40; // Overwhelming force
                    if (source.troops < target.troops) score -= 200; // Avoid losing battles

                    // 2. Break Enemy Bonuses (Especially Human)
                    const targetCont = territoryInfo[target.id].continent;

                    // Scan continent to see if enemy owns most of it
                    let enemyContCount = 0;
                    let contSize = 0;
                    Object.values(territories).forEach(t => {
                        if (territoryInfo[t.id]?.continent === targetCont) {
                            contSize++;
                            if (t.owner === target.owner) enemyContCount++;
                        }
                    });

                    const enemyHasBonus = (enemyContCount === contSize);
                    const enemyNearBonus = (enemyContCount >= contSize - 1);

                    if (enemyHasBonus) {
                        score += 300; // PRIORITY #1: Break the bonus
                        if (target.owner === 0) score += 200; // PRIORITY #0: Screw the Human specifically
                    } else if (enemyNearBonus) {
                        score += 100; // Prevent them from getting it
                    }

                    // 3. Expansion (Connect Continents)
                    const sourceCont = territoryInfo[source.id].continent;
                    if (sourceCont === targetCont) {
                        score += 50; // Consolidating own continent
                    }

                    // 4. "The Blitz" - Keep momentum
                    // If we have a huge stack, keep moving to utilize the soldiers
                    if (source.troops > 8 && source.troops > target.troops * 2) score += 60;

                    // 5. Eliminate Weak Players
                    if (target.troops === 1) score += 15;

                    // Safety Check: Never attack if we are guaranteed to lose unless it breaks a bonus
                    if (source.troops <= target.troops + 1 && !enemyHasBonus) score = -1000;
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

    // EASY: Pick random from top
    if (difficulty === 'EASY') {
        const idx = Math.floor(Math.random() * candidates.length);
        return { sourceId: candidates[idx].source.id, targetId: candidates[idx].target.id };
    }

    // MEDIUM: Pick from top 3 to add some error
    if (difficulty === 'MEDIUM') {
        const topN = Math.min(candidates.length, 3);
        const idx = Math.floor(Math.random() * topN);
        return { sourceId: candidates[idx].source.id, targetId: candidates[idx].target.id };
    }

    // HARD: Pick the absolute best
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

    if (difficulty === 'EASY') return null;

    // Re-analyze for safety
    const analysis = analyzeMap(playerId, territories, {});

    // MEDIUM: Simple Internal -> Border logic (Move 1 step)
    if (difficulty === 'MEDIUM') {
        // Improved fortification: move towards threats
        let bestMove: { sourceId: number, targetId: number, amount: number, score: number } | null = null;
        const sources = [...analysis.internal, ...analysis.borders];

        for (const source of sources) {
            if (source.troops <= 1) continue;

            for (const nid of source.neighbors) {
                const target = territories[nid];
                if (target.owner !== playerId) continue;

                let score = 0;
                const targetThreat = analysis.threats[target.id] || 0;
                const sourceThreat = analysis.threats[source.id] || 0;

                // Move towards danger
                if (targetThreat > sourceThreat) {
                    score += (targetThreat - sourceThreat) * 5;
                }

                // Evacuate internal territories to borders
                if (analysis.internal.includes(source) && analysis.borders.includes(target)) {
                    score += 30;
                }

                if (score > 0 && (!bestMove || score > bestMove.score)) {
                    const amount = source.troops - 1;
                    if (amount > 0) {
                        bestMove = { sourceId: source.id, targetId: target.id, amount, score };
                    }
                }
            }
        }

        if (bestMove) {
            return { sourceId: bestMove.sourceId, targetId: bestMove.targetId, amount: bestMove.amount };
        }
        return null;
    }

    // HARD MODE: Frontline Stacking & Deathballing
    // Move from Safe -> Active Border
    // OR Move from Passive Border -> Active Border (if needed)

    let bestMove: { sourceId: number, targetId: number, amount: number, score: number } | null = null;
    const sources = [...analysis.internal, ...analysis.borders];

    for (const source of sources) {
        if (source.troops <= 1) continue;

        for (const nid of source.neighbors) {
            const target = territories[nid];
            // Must move to own territory
            if (target.owner !== playerId) continue;

            let score = 0;
            const targetThreat = analysis.threats[target.id] || 0;
            const sourceThreat = analysis.threats[source.id] || 0;

            // Logic 1: Move towards danger
            if (targetThreat > sourceThreat) {
                score += (targetThreat - sourceThreat) * 10;
            }

            // Logic 2: Evacuate internal territories completely
            if (analysis.internal.includes(source) && analysis.borders.includes(target)) {
                score += 50;
            }

            // Logic 3: Chokepoint Reinforcement
            // (Requires us to know if target is a chokepoint, but threat level usually correlates)

            // If the move makes sense
            if (score > 0 && (!bestMove || score > bestMove.score)) {
                const amount = source.troops - 1;
                if (amount > 0) {
                    bestMove = { sourceId: source.id, targetId: target.id, amount, score };
                }
            }
        }
    }

    if (bestMove) {
        return { sourceId: bestMove.sourceId, targetId: bestMove.targetId, amount: bestMove.amount };
    }

    return null;
}
