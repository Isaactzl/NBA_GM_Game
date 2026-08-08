import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import modernPlayersSeed from '../../nba_modern_players_80.json';
import allTimePlayersSeed from '../../nba_all_time_players_80.json';
import { getGradeValue } from '../utils/gradeUtils.js';
import { calculateRosterSynergy } from '../utils/synergyEngine.js';

const DEFAULT_STARTING_BUDGET = 25;
const MIN_BUDGET = 5;
const MAX_BUDGET = 50;
const BUDGET_STEP = 5;
const MIN_GM_COUNT = 2;
const MAX_GM_COUNT = 8;
const DEFAULT_GM_NAMES = Array.from({ length: MAX_GM_COUNT }, (_, index) => `Player ${index + 1}`);
const ATTRIBUTE_KEYS = ['size', 'shooting', 'finishing', 'playmaking', 'iq', 'defense', 'rebounding', 'athleticism'];
const FRANKENSTEIN_CATEGORIES = [...ATTRIBUTE_KEYS];
const FRANCHISE_POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C'];
const TEAM_TIER_POINTS = { S: 5, A: 4, B: 3, C: 2, D: 1 };
const MODE_MODIFIERS = {
  frankenstein: { size: 1, athleticism: 1 },
  'the-franchise': { iq: 1, playmaking: 1 },
};
const MODE_ROSTER_SIZES = {
  frankenstein: 8,
  'the-franchise': 5,
};
const ERA_PLAYERS = {
  modern: modernPlayersSeed,
  'all-time': allTimePlayersSeed,
};
const GM_COLORS = ['#fbbf24', '#38bdf8', '#34d399', '#f472b6', '#fb7185', '#a78bfa', '#22d3ee', '#fb923c'];
const POSITION_FIT_WEIGHTS = {
  PG: { playmaking: 0.28, iq: 0.17, shooting: 0.16, athleticism: 0.12, finishing: 0.11, defense: 0.08, size: 0.05, rebounding: 0.03 },
  SG: { shooting: 0.23, finishing: 0.16, athleticism: 0.15, playmaking: 0.14, iq: 0.11, defense: 0.1, size: 0.06, rebounding: 0.05 },
  SF: { size: 0.16, shooting: 0.15, finishing: 0.15, playmaking: 0.12, iq: 0.12, defense: 0.14, rebounding: 0.08, athleticism: 0.08 },
  PF: { size: 0.2, finishing: 0.16, defense: 0.15, rebounding: 0.16, playmaking: 0.08, iq: 0.08, shooting: 0.09, athleticism: 0.08 },
  C: { size: 0.24, defense: 0.2, rebounding: 0.2, finishing: 0.14, iq: 0.08, athleticism: 0.06, shooting: 0.05, playmaking: 0.03 },
};
const POSITION_ROLE_BONUS = {
  PG: { PG: 16, SG: 10, SF: 0, PF: -10, C: -18 },
  SG: { PG: 10, SG: 16, SF: 9, PF: -8, C: -16 },
  SF: { PG: 0, SG: 9, SF: 16, PF: 10, C: -8 },
  PF: { PG: -8, SG: -2, SF: 10, PF: 16, C: 10 },
  C: { PG: -18, SG: -14, SF: -6, PF: 10, C: 16 },
};

const GameContext = createContext(null);

const normalizeBudgetAmount = (value) => {
  const parsed = Number(value);
  const fallback = Number.isFinite(parsed) ? parsed : DEFAULT_STARTING_BUDGET;
  const stepped = Math.round(fallback / BUDGET_STEP) * BUDGET_STEP;

  return Math.max(MIN_BUDGET, Math.min(MAX_BUDGET, stepped));
};

const makeInitialGMState = (
  count = 4,
  names = DEFAULT_GM_NAMES,
  startingBudget = DEFAULT_STARTING_BUDGET,
) =>
  Array.from({ length: count }, (_, index) => ({
    id: `gm-${index + 1}`,
    name: names[index]?.trim() || `Player ${index + 1}`,
    budget: normalizeBudgetAmount(startingBudget),
    roster: [],
    discipline: 'Couch GM',
    color: GM_COLORS[index % GM_COLORS.length],
  }));

const getMaxRosterSize = (mode) => MODE_ROSTER_SIZES[mode] ?? 5;
const countUnfilledSlots = (gm, mode) => Math.max(0, getMaxRosterSize(mode) - gm.roster.length);
const randomFromArray = (items) => items[Math.floor(Math.random() * items.length)];
const shuffleArray = (items) => {
  const next = [...items];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  return next;
};

const normalizeAttributes = (attributes = {}) => {
  const { mentality, rebounding, ...rest } = attributes;

  return {
    ...rest,
    rebounding: rebounding ?? mentality ?? 'D',
  };
};

const getPositionFitScore = (player, position) => {
  const weights = POSITION_FIT_WEIGHTS[position] ?? POSITION_FIT_WEIGHTS.SF;
  const basePosition = player?.position ?? 'SF';
  const roleBonus = POSITION_ROLE_BONUS[basePosition]?.[position] ?? 0;
  const versatilityScore = ATTRIBUTE_KEYS.reduce((sum, key) => sum + getGradeValue(player?.attributes?.[key]), 0) / ATTRIBUTE_KEYS.length;
  const versatilityBonus = Math.max(0, Math.round((versatilityScore - 55) / 3));

  return ATTRIBUTE_KEYS.reduce((sum, key) => sum + getGradeValue(player?.attributes?.[key]) * (weights[key] ?? 0), 0) + roleBonus + versatilityBonus;
};

const getPositionFitSummary = (player, position) => {
  const score = Math.round(getPositionFitScore(player, position));
  const multiplier = Number(Math.max(0.42, Math.min(1.28, 0.58 + score / 165)).toFixed(2));
  let label = 'Emergency';

  if (score >= 85) {
    label = 'Elite fit';
  } else if (score >= 72) {
    label = 'Strong fit';
  } else if (score >= 58) {
    label = 'Playable';
  } else if (score >= 44) {
    label = 'Risky fit';
  }

  return { score, multiplier, label };
};

const getFranchisePositionProfile = (player) => {
  const positions = FRANCHISE_POSITIONS.map((position) => ({
    position,
    ...getPositionFitSummary(player, position),
  })).sort((left, right) => right.score - left.score);

  const bestScore = positions[0]?.score ?? 0;
  const eligibleThreshold = Math.max(bestScore - 14, 50);

  return {
    positions,
    bestPosition: positions[0]?.position ?? null,
    bestScore,
    bestFitLabel: positions[0]?.label ?? 'Emergency',
    eligiblePositions: positions
      .filter((entry) => entry.score >= eligibleThreshold)
      .map((entry) => entry.position),
    allPositions: FRANCHISE_POSITIONS,
  };
};

const buildFreshPlayers = (
  auctionPlayerCount = DEFAULT_GM_NAMES.length * getMaxRosterSize('frankenstein'),
  rosterEra = 'modern',
) => {
  const safeCount = Math.max(0, Number(auctionPlayerCount) || 0);
  const playerSeed = ERA_PLAYERS[rosterEra] ?? modernPlayersSeed;

  return shuffleArray(playerSeed)
    .slice(0, safeCount)
    .map((player, index) => ({
      ...player,
      attributes: normalizeAttributes(player.attributes),
      draftIndex: index,
      available: true,
    }));
};

const addPlayerToRoster = (roster, player, maxRosterSize) => {
  if (roster.length >= maxRosterSize) {
    return roster;
  }

  if (roster.some((entry) => entry.id === player.id)) {
    return roster;
  }

  return [...roster, { ...player, assignedCategory: null, assignedPosition: null, positionLocked: false }];
};

export function GameProvider({ children }) {
  const [players, setPlayers] = useState([]);
  const [gmCount, setGMCount] = useState(4);
  const [gmNames, setGMNames] = useState(() => DEFAULT_GM_NAMES.slice(0, 4));
  const [budgetAmount, setBudgetAmount] = useState(DEFAULT_STARTING_BUDGET);
  const [gms, setGms] = useState(() => makeInitialGMState(4, DEFAULT_GM_NAMES.slice(0, 4), DEFAULT_STARTING_BUDGET));
  const [gameMode, setGameMode] = useState('frankenstein');
  const [rosterEra, setRosterEra] = useState('modern');
  const [hideScoutingStats, setHideScoutingStats] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundVolume, setSoundVolume] = useState(0.65);
  const [showFranchisePositionHints, setShowFranchisePositionHints] = useState(true);
  const [allowFranchisePositionShifts, setAllowFranchisePositionShifts] = useState(false);
  const [draftRound, setDraftRound] = useState(1);
  const [currentTurnGMId, setCurrentTurnGMId] = useState('gm-1');
  const [activePlayerId, setActivePlayerId] = useState(null);
  const [wheelState, setWheelState] = useState({
    visible: false,
    tiedGms: [],
    winnerId: null,
    spinning: false,
  });

  useEffect(() => {
    setPlayers(buildFreshPlayers(gmCount * getMaxRosterSize(gameMode), rosterEra));
  }, [gmCount, gameMode, rosterEra]);

  const getGMById = useCallback(
    (gmId) => gms.find((gm) => gm.id === gmId) ?? null,
    [gms],
  );

  const resetActivePlayer = useCallback(() => {
    setActivePlayerId(null);
  }, []);

  const advanceTurn = useCallback(() => {
    if (gms.length === 0) {
      return;
    }

    const currentIndex = gms.findIndex((gm) => gm.id === currentTurnGMId);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % gms.length;
    setCurrentTurnGMId(gms[nextIndex].id);
  }, [currentTurnGMId, gms]);

  const markPlayerUnavailableAndAdvance = useCallback((playerId) => {
    setPlayers((currentPlayers) => {
      const nextPlayers = currentPlayers.map((player) =>
        player.id === playerId ? { ...player, available: false } : player,
      );
      const availablePlayers = nextPlayers.filter((player) => player.available);

      if (availablePlayers.length === 0) {
        setActivePlayerId(null);
      } else {
        const randomPlayer = randomFromArray(availablePlayers);
        setActivePlayerId(randomPlayer.id);
      }

      return nextPlayers;
    });
  }, []);

  const countUnfilledSlotsForMode = useCallback(
    (gm) => countUnfilledSlots(gm, gameMode),
    [gameMode],
  );

  const resetDraft = useCallback((nextGMCount = gmCount, nextNames = gmNames) => {
    const safeCount = Math.max(MIN_GM_COUNT, Math.min(MAX_GM_COUNT, Number(nextGMCount) || 4));
    const safeNames = Array.from({ length: safeCount }, (_, index) => {
      const incoming = nextNames?.[index] ?? DEFAULT_GM_NAMES[index];
      return incoming?.trim() || `Player ${index + 1}`;
    });
    const safeBudget = normalizeBudgetAmount(budgetAmount);
    const auctionPoolSize = safeCount * getMaxRosterSize(gameMode);

    setGMCount(safeCount);
    setGMNames(safeNames);
    setBudgetAmount(safeBudget);
    setPlayers(buildFreshPlayers(auctionPoolSize, rosterEra));
    setGms(makeInitialGMState(safeCount, safeNames, safeBudget));
    setCurrentTurnGMId('gm-1');
    setDraftRound(1);
    setActivePlayerId(null);
    setWheelState({
      visible: false,
      tiedGms: [],
      winnerId: null,
      spinning: false,
    });
  }, [budgetAmount, gameMode, gmCount, gmNames, rosterEra]);

  const getSynergySummary = useCallback((roster) => {
    return calculateRosterSynergy(roster, ATTRIBUTE_KEYS, MODE_MODIFIERS[gameMode] ?? {});
  }, [gameMode]);

  const setFranchisePlayerPosition = useCallback((gmId, playerId, position) => {
    if (!FRANCHISE_POSITIONS.includes(position)) {
      return false;
    }

    const targetGM = gms.find((gm) => gm.id === gmId);
    if (!targetGM) {
      return false;
    }

    const targetPlayer = targetGM.roster.find((player) => player.id === playerId);
    if (!targetPlayer) {
      return false;
    }

    if (targetPlayer.assignedPosition && !allowFranchisePositionShifts) {
      return false;
    }

    setGms((currentGms) =>
      currentGms.map((gm) => {
        if (gm.id !== gmId) {
          return gm;
        }

        return {
          ...gm,
          roster: gm.roster.map((player) => {
            if (player.id !== playerId) {
              return player;
            }

            return {
              ...player,
              assignedPosition: position,
              positionLocked: true,
            };
          }),
        };
      }),
    );

    return true;
  }, [allowFranchisePositionShifts, gms]);

  const cycleFranchisePlayerPosition = useCallback((gmId, playerId) => {
    const targetGM = gms.find((gm) => gm.id === gmId);
    if (!targetGM) {
      return false;
    }

    const targetPlayer = targetGM.roster.find((player) => player.id === playerId);
    if (!targetPlayer) {
      return false;
    }

    const currentPosition = targetPlayer.assignedPosition ?? targetPlayer.position ?? FRANCHISE_POSITIONS[0];
    const currentIndex = FRANCHISE_POSITIONS.indexOf(currentPosition);
    const nextPosition = FRANCHISE_POSITIONS[(currentIndex + 1) % FRANCHISE_POSITIONS.length];

    return setFranchisePlayerPosition(gmId, playerId, nextPosition);
  }, [gms, setFranchisePlayerPosition]);

  const assignPlayerCategory = useCallback((gmId, playerId, category) => {
    const validCategory = FRANKENSTEIN_CATEGORIES.includes(category);

    if (!validCategory) {
      return false;
    }

    const targetGM = gms.find((gm) => gm.id === gmId);
    if (!targetGM) {
      return false;
    }

    const categoryAlreadyUsed = targetGM.roster.some((player) => player.assignedCategory === category);
    const playerAlreadyAssigned = targetGM.roster.some((player) => player.id === playerId && player.assignedCategory);

    if (categoryAlreadyUsed || playerAlreadyAssigned) {
      return false;
    }

    let didAssign = false;

    setGms((currentGms) =>
      currentGms.map((gm) => {
        if (gm.id !== gmId) {
          return gm;
        }

        const nextRoster = gm.roster.map((player) => {
          if (player.id !== playerId || player.assignedCategory) {
            return player;
          }

          didAssign = true;
          return {
            ...player,
            assignedCategory: category,
          };
        });

        return {
          ...gm,
          roster: nextRoster,
        };
      }),
    );

    return didAssign;
  }, [gms]);

  const getTeamScore = useCallback((roster) => {
    if (!roster || roster.length === 0) {
      return 0;
    }

    const baseScore = roster.reduce((sum, player) => sum + (TEAM_TIER_POINTS[player.tier] ?? 1), 0);
    const attributeScore = roster.reduce((sum, player) => {
      const attrValues = ATTRIBUTE_KEYS.map((key) => getGradeValue(player.attributes?.[key]));
      const baseAttributeScore = attrValues.reduce((total, value) => total + value, 0);
      const assignedPosition = player.assignedPosition ?? player.position ?? 'SF';
      const fitMultiplier = gameMode === 'the-franchise'
        ? getPositionFitSummary(player, assignedPosition).multiplier
        : 1;

      return sum + baseAttributeScore * fitMultiplier;
    }, 0);
    const synergyScore = getSynergySummary(roster).score;

    return Math.round(baseScore + attributeScore / roster.length + synergyScore);
  }, [gameMode, getSynergySummary]);

  const resolveForcedZeroDollarTake = useCallback(
    (passedPlayer) => {
      const brokeGms = gms
        .filter((gm) => gm.budget === 0 && gm.roster.length < getMaxRosterSize(gameMode))
        .map((gm) => ({
          ...gm,
          unfilledSlots: countUnfilledSlots(gm, gameMode),
        }));

      if (brokeGms.length === 0) {
        return null;
      }

      const highestUnfilled = Math.max(...brokeGms.map((gm) => gm.unfilledSlots));
      const tiedGms = brokeGms.filter((gm) => gm.unfilledSlots === highestUnfilled);

      if (tiedGms.length > 1) {
        setWheelState({
          visible: true,
          tiedGms: tiedGms.map((gm) => gm.id),
          winnerId: null,
          spinning: true,
        });

        const winner = randomFromArray(tiedGms);

        window.setTimeout(() => {
          setWheelState((current) => ({
            ...current,
            spinning: false,
            winnerId: winner.id,
          }));

          setGms((currentGms) =>
            currentGms.map((gm) => {
              if (gm.id !== winner.id) return gm;

              return {
                ...gm,
                roster: addPlayerToRoster(gm.roster, passedPlayer, getMaxRosterSize(gameMode)),
                budget: 0,
              };
            }),
          );

          setDraftRound((currentRound) => currentRound + 1);
          advanceTurn();
          markPlayerUnavailableAndAdvance(passedPlayer.id);
        }, 900);

        return winner.id;
      }

      const forcedTarget = brokeGms.find((gm) => gm.unfilledSlots === highestUnfilled);

      setGms((currentGms) =>
        currentGms.map((gm) => {
          if (gm.id !== forcedTarget.id) return gm;

          return {
            ...gm,
            roster: addPlayerToRoster(gm.roster, passedPlayer, getMaxRosterSize(gameMode)),
            budget: 0,
          };
        }),
      );

      setDraftRound((currentRound) => currentRound + 1);
      advanceTurn();
      markPlayerUnavailableAndAdvance(passedPlayer.id);
      return forcedTarget.id;
    },
    [advanceTurn, gameMode, gms, markPlayerUnavailableAndAdvance],
  );

  const buyPlayer = useCallback(
    (gmId, playerId, bidAmount) => {
      const targetGM = getGMById(gmId);
      const targetPlayer = players.find((entry) => entry.id === playerId);

      if (!targetGM || !targetPlayer) {
        return null;
      }

      const maxRosterSize = getMaxRosterSize(gameMode);

      if (targetGM.roster.length >= maxRosterSize) {
        return null;
      }

      if (targetGM.budget < bidAmount || !targetPlayer.available) {
        return null;
      }

      setGms((currentGms) =>
        currentGms.map((gm) => {
          if (gm.id !== gmId) return gm;

          return {
            ...gm,
            budget: Math.max(0, gm.budget - bidAmount),
            roster: addPlayerToRoster(gm.roster, targetPlayer, maxRosterSize),
          };
        }),
      );

      setDraftRound((currentRound) => currentRound + 1);
      advanceTurn();
      markPlayerUnavailableAndAdvance(playerId);
      return targetPlayer;
    },
    [advanceTurn, getGMById, markPlayerUnavailableAndAdvance, players],
  );

  const passPlayer = useCallback(
    (gmId, player) => {
      const targetGM = getGMById(gmId);

      if (!targetGM || !player) {
        return null;
      }

      if (targetGM.budget === 0) {
        return resolveForcedZeroDollarTake(player);
      }

      setDraftRound((currentRound) => currentRound + 1);
      advanceTurn();
      markPlayerUnavailableAndAdvance(player.id);
      return null;
    },
    [advanceTurn, getGMById, markPlayerUnavailableAndAdvance, resolveForcedZeroDollarTake],
  );

  const standings = useMemo(() => {
    const rows = gms.map((gm) => ({
      ...gm,
      teamScore: getTeamScore(gm.roster),
      synergyScore: getSynergySummary(gm.roster).score,
    }));

    return rows.sort((left, right) => right.teamScore - left.teamScore);
  }, [gms, getSynergySummary, getTeamScore]);

  const draftComplete = gms.every((gm) => {
    const rosterFilled = gm.roster.length >= getMaxRosterSize(gameMode);

    if (!rosterFilled) {
      return false;
    }

    if (gameMode !== 'frankenstein') {
      return gameMode !== 'the-franchise' ? true : gm.roster.every((player) => Boolean(player.assignedPosition));
    }

    return gm.roster.every((player) => Boolean(player.assignedCategory));
  });

  const value = useMemo(
    () => ({
      players,
      gms,
      gmCount,
      setGMCount,
      gmNames,
      setGMNames,
      budgetAmount,
      setBudgetAmount,
      MIN_BUDGET,
      MAX_BUDGET,
      BUDGET_STEP,
      rosterEra,
      setRosterEra,
      hideScoutingStats,
      setHideScoutingStats,
      soundEnabled,
      setSoundEnabled,
      soundVolume,
      setSoundVolume,
      showFranchisePositionHints,
      setShowFranchisePositionHints,
      allowFranchisePositionShifts,
      setAllowFranchisePositionShifts,
      activePlayerId,
      setActivePlayerId,
      buyPlayer,
      passPlayer,
      wheelState,
      gameMode,
      setGameMode,
      draftRound,
      currentTurnGMId,
      MAX_ROSTER_SIZE: getMaxRosterSize(gameMode),
      getMaxRosterSize,
      STARTING_BUDGET: budgetAmount,
      getGMById,
      countUnfilledSlots: countUnfilledSlotsForMode,
      resetActivePlayer,
      resetDraft,
      getSynergySummary,
      getTeamScore,
      assignPlayerCategory,
      setFranchisePlayerPosition,
      cycleFranchisePlayerPosition,
      getPositionFitSummary,
      getFranchisePositionProfile,
      FRANCHISE_POSITIONS,
      FRANKENSTEIN_CATEGORIES,
      standings,
      draftComplete,
    }),
    [players, gms, gmCount, gmNames, budgetAmount, rosterEra, hideScoutingStats, soundEnabled, soundVolume, showFranchisePositionHints, allowFranchisePositionShifts, activePlayerId, buyPlayer, passPlayer, wheelState, gameMode, draftRound, currentTurnGMId, getGMById, countUnfilledSlotsForMode, resetActivePlayer, resetDraft, getSynergySummary, getTeamScore, assignPlayerCategory, setFranchisePlayerPosition, cycleFranchisePlayerPosition, getPositionFitSummary, getFranchisePositionProfile, standings, draftComplete],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGameContext() {
  const context = useContext(GameContext);

  if (!context) {
    throw new Error('useGameContext must be used within a GameProvider');
  }

  return context;
}
