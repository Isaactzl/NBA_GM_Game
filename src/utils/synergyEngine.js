import { getGradeValue, isEliteGrade, isGodTierGrade } from './gradeUtils.js';

export const getPairSynergyMeta = (leftPlayer, rightPlayer) => {
  const leftPlaymaking = leftPlayer.attributes?.playmaking;
  const rightPlaymaking = rightPlayer.attributes?.playmaking;
  const leftFinishing = leftPlayer.attributes?.finishing;
  const rightFinishing = rightPlayer.attributes?.finishing;
  const leftShooting = leftPlayer.attributes?.shooting;
  const rightShooting = rightPlayer.attributes?.shooting;
  const leftDefense = leftPlayer.attributes?.defense;
  const rightDefense = rightPlayer.attributes?.defense;
  const leftRebounding = leftPlayer.attributes?.rebounding;
  const rightRebounding = rightPlayer.attributes?.rebounding;

  const godTierEngine =
    (isGodTierGrade(leftPlaymaking) && (isGodTierGrade(rightFinishing) || isGodTierGrade(rightShooting))) ||
    (isGodTierGrade(rightPlaymaking) && (isGodTierGrade(leftFinishing) || isGodTierGrade(leftShooting)));

  if (godTierEngine) {
    return { multiplier: 1.1, type: 'God-Tier Engine' };
  }

  const dynamicDuo =
    (isEliteGrade(leftPlaymaking) && (isEliteGrade(rightFinishing) || isEliteGrade(rightShooting))) ||
    (isEliteGrade(rightPlaymaking) && (isEliteGrade(leftFinishing) || isEliteGrade(leftShooting)));

  if (dynamicDuo) {
    return { multiplier: 1.06, type: 'Dynamic Duo' };
  }

  const glassWall =
    (isEliteGrade(leftDefense) && isEliteGrade(rightRebounding)) ||
    (isEliteGrade(rightDefense) && isEliteGrade(leftRebounding));

  if (glassWall) {
    return { multiplier: 1.04, type: 'Glass Wall' };
  }

  return { multiplier: 1, type: 'Balanced Core' };
};

export const calculatePairBaseScore = (leftPlayer, rightPlayer, attributeKeys, modeModifier = {}) =>
  attributeKeys.reduce((total, attributeKey) => {
    const leftValue = getGradeValue(leftPlayer.attributes?.[attributeKey]);
    const rightValue = getGradeValue(rightPlayer.attributes?.[attributeKey]);
    const modifier = modeModifier[attributeKey] ?? 0;

    return total + leftValue + rightValue + modifier;
  }, 0);

export const calculateRosterSynergy = (roster, attributeKeys, modeModifier = {}) => {
  if (!roster || roster.length < 2) {
    return {
      score: 0,
      pairs: [],
      topPair: null,
    };
  }

  const pairs = [];

  for (let i = 0; i < roster.length; i += 1) {
    for (let j = i + 1; j < roster.length; j += 1) {
      const left = roster[i];
      const right = roster[j];
      const pairBaseScore = calculatePairBaseScore(left, right, attributeKeys, modeModifier);
      const synergyMeta = getPairSynergyMeta(left, right);

      pairs.push({
        players: [left.name, right.name],
        score: Math.round(pairBaseScore * synergyMeta.multiplier),
        type: synergyMeta.type,
      });
    }
  }

  const totalScore = pairs.reduce((sum, pair) => sum + pair.score, 0);
  const score = Math.round(totalScore / pairs.length);
  const topPair = [...pairs].sort((left, right) => right.score - left.score)[0] ?? null;

  return {
    score,
    pairs,
    topPair,
  };
};
