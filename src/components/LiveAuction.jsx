import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGameContext } from '../context/GameContext.jsx';
import { PlayerCard } from './PlayerCard.jsx';

const AUCTION_SECONDS = 15;

const TIER_GLOW = {
  S: 'rgba(251, 191, 36, 0.16)',
  A: 'rgba(52, 211, 153, 0.16)',
  B: 'rgba(56, 189, 248, 0.14)',
  C: 'rgba(244, 114, 182, 0.14)',
  D: 'rgba(148, 163, 184, 0.14)',
};

export function LiveAuction({ selectedGM, draftComplete = false }) {
  const {
    players,
    gms,
    buyPlayer,
    assignPlayerCategory,
    setFranchisePlayerPosition,
    activePlayerId,
    MAX_ROSTER_SIZE,
    gameMode,
    FRANKENSTEIN_CATEGORIES,
    FRANCHISE_POSITIONS,
    showFranchisePositionHints,
    getFranchisePositionProfile,
  } = useGameContext();
  const [currentBid, setCurrentBid] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(AUCTION_SECONDS);
  const [highestBidderId, setHighestBidderId] = useState(null);
  const [pendingPlacement, setPendingPlacement] = useState(null);
  const [placementCategory, setPlacementCategory] = useState(null);
  const [franchisePlacement, setFranchisePlacement] = useState(null);
  const [franchisePosition, setFranchisePosition] = useState(null);
  const [draggedPlayerName, setDraggedPlayerName] = useState(null);
  const [showPlayerStats, setShowPlayerStats] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [franchiseReveal, setFranchiseReveal] = useState(null);
  const currentBidRef = useRef(0);
  const highestBidderRef = useRef(null);

  const clearAuctionState = useCallback(() => {
    setCurrentBid(0);
    setHighestBidderId(null);
    currentBidRef.current = 0;
    highestBidderRef.current = null;
  }, []);

  const franchisePositionOptions = useMemo(() => {
    if (!franchisePlacement) {
      return [];
    }

    return getFranchisePositionProfile(franchisePlacement.player).positions;
  }, [franchisePlacement, getFranchisePositionProfile]);

  const openSlotGms = useMemo(
    () => gms.filter((gm) => gm.roster.length < MAX_ROSTER_SIZE),
    [gms, MAX_ROSTER_SIZE],
  );

  const noMoneyOpenSlotGms = useMemo(
    () => openSlotGms.filter((gm) => gm.budget <= 0),
    [openSlotGms],
  );

  const forceRandomOpeningBid = useCallback(() => {
    const eligibleGms = gms
      .filter((gm) => gm.budget > 0 && gm.roster.length < MAX_ROSTER_SIZE)
      .map((gm) => ({
        ...gm,
        openSlots: MAX_ROSTER_SIZE - gm.roster.length,
      }));

    if (eligibleGms.length === 0) {
      return false;
    }

    const mostOpen = Math.max(...eligibleGms.map((gm) => gm.openSlots));
    const priorityGms = eligibleGms.filter((gm) => gm.openSlots === mostOpen);
    const forcedBidder = priorityGms[Math.floor(Math.random() * priorityGms.length)];

    setCurrentBid(1);
    setHighestBidderId(forcedBidder.id);
    currentBidRef.current = 1;
    highestBidderRef.current = forcedBidder.id;
    setSecondsLeft(AUCTION_SECONDS);
    return true;
  }, [gms, MAX_ROSTER_SIZE]);

  const resolveNoBidOutcome = useCallback(
    (player) => {
      if (!player) {
        return false;
      }

      if (openSlotGms.length === 0) {
        return false;
      }

      // Punishment path: if any open-slot GM has no money, force the player to that pool.
      if (noMoneyOpenSlotGms.length > 0) {
        const prioritized = noMoneyOpenSlotGms.map((gm) => ({
          ...gm,
          openSlots: MAX_ROSTER_SIZE - gm.roster.length,
        }));
        const mostOpen = Math.max(...prioritized.map((gm) => gm.openSlots));
        const tiedTargets = prioritized.filter((gm) => gm.openSlots === mostOpen);
        const forcedTarget = tiedTargets[Math.floor(Math.random() * tiedTargets.length)];
        const winner = buyPlayer(forcedTarget.id, player.id, 0);

        if (winner && gameMode === 'frankenstein') {
          setPendingPlacement({ gmId: forcedTarget.id, player: winner });
        } else if (winner && gameMode === 'the-franchise') {
          setFranchisePlacement({ gmId: forcedTarget.id, player: winner });
          setFranchisePosition(null);
          setIsPaused(true);
        }

        return Boolean(winner);
      }

      // Random opener only when every open-slot GM still has money.
      return forceRandomOpeningBid();
    },
    [openSlotGms, noMoneyOpenSlotGms, MAX_ROSTER_SIZE, buyPlayer, gameMode, forceRandomOpeningBid],
  );

  const availablePlayers = useMemo(
    () => players.filter((player) => player.available),
    [players],
  );

  const activePlayer = useMemo(
    () => availablePlayers.find((player) => player.id === activePlayerId) ?? availablePlayers[0],
    [activePlayerId, availablePlayers],
  );

  const auctionGlow = TIER_GLOW[activePlayer?.tier] ?? 'rgba(56, 189, 248, 0.12)';

  useEffect(() => {
    currentBidRef.current = currentBid;
  }, [currentBid]);

  useEffect(() => {
    highestBidderRef.current = highestBidderId;
  }, [highestBidderId]);

  useEffect(() => {
    clearAuctionState();
    setSecondsLeft(AUCTION_SECONDS);
  }, [activePlayer?.id, clearAuctionState]);

  useEffect(() => {
    if (!activePlayer || pendingPlacement || isPaused || draftComplete) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setSecondsLeft((value) => (value > 0 ? value - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [activePlayer, pendingPlacement, isPaused, draftComplete]);

  useEffect(() => {
    if (secondsLeft > 0 || !activePlayer || pendingPlacement || isPaused || draftComplete) {
      return;
    }

    if (highestBidderRef.current) {
      const winner = buyPlayer(highestBidderRef.current, activePlayer.id, currentBidRef.current);

      if (winner && gameMode === 'frankenstein') {
        setPendingPlacement({
          gmId: highestBidderRef.current,
          player: winner,
        });

        return;
      } else if (winner && gameMode === 'the-franchise') {
        setFranchisePlacement({ gmId: highestBidderRef.current, player: winner });
        setFranchisePosition(null);
        setIsPaused(true);
        return;
      }

      // Stale leader/bid guard: if bid resolution failed, reset and resolve as a no-bid case.
      clearAuctionState();
      resolveNoBidOutcome(activePlayer);
      return;
    }

    resolveNoBidOutcome(activePlayer);
  }, [
    secondsLeft,
    activePlayer,
    pendingPlacement,
    isPaused,
    draftComplete,
    buyPlayer,
    gameMode,
    clearAuctionState,
    resolveNoBidOutcome,
  ]);

  const handleRaiseBid = (gmId) => {
    if (!activePlayer || draftComplete) return;

    const gm = gms.find((entry) => entry.id === gmId);
    if (!gm || gm.budget <= currentBid || gm.roster.length >= MAX_ROSTER_SIZE) {
      return;
    }

    const nextBid = currentBid + 1;
    setCurrentBid(nextBid);
    setSecondsLeft(AUCTION_SECONDS);
    currentBidRef.current = nextBid;
    setHighestBidderId(gmId);
    highestBidderRef.current = gmId;
  };

  const togglePause = () => {
    if (draftComplete) return;
    setIsPaused((current) => !current);
  };

  const skipAuction = () => {
    if (draftComplete) return;

    if (currentBid > 0 && highestBidderRef.current) {
      if (!isPaused) {
        setSecondsLeft(1);
      }
      return;
    }

    resolveNoBidOutcome(activePlayer);
  };

  const confirmPlacement = () => {
    if (!pendingPlacement || !placementCategory) {
      return;
    }

    const placed = assignPlayerCategory(pendingPlacement.gmId, pendingPlacement.player.id, placementCategory);

    if (placed) {
      setPendingPlacement(null);
      setPlacementCategory(null);
      setDraggedPlayerName(null);
      setSecondsLeft(AUCTION_SECONDS);
      setIsPaused(true); // Hold for next player — resume when ready
    }
  };

  const confirmFranchisePlacement = () => {
    if (!franchisePlacement || !franchisePosition) {
      return;
    }

    const placed = setFranchisePlayerPosition(franchisePlacement.gmId, franchisePlacement.player.id, franchisePosition);

    if (placed) {
      setFranchiseReveal({
        gmId: franchisePlacement.gmId,
        player: { ...franchisePlacement.player, assignedPosition: franchisePosition },
        position: franchisePosition,
        fit: franchisePositionOptions.find((option) => option.position === franchisePosition) ?? null,
      });
      setFranchisePlacement(null);
      setFranchisePosition(null);
    }
  };

  const usedCategories = useMemo(() => {
    if (!pendingPlacement) {
      return [];
    }

    const winner = gms.find((gm) => gm.id === pendingPlacement.gmId);
    return winner?.roster.flatMap((player) => (player.assignedCategory ? [player.assignedCategory] : [])) ?? [];
  }, [gms, pendingPlacement]);

  const continueAuction = () => {
    setPendingPlacement(null);
    setPlacementCategory(null);
    setDraggedPlayerName(null);
    setSecondsLeft(AUCTION_SECONDS);
    setIsPaused(true); // Hold for next player — resume when ready
  };

  const closeFranchiseReveal = () => {
    setFranchiseReveal(null);
    setIsPaused(false);
    setSecondsLeft(AUCTION_SECONDS);
  };

  const activeFranchisePlacement = franchisePlacement ?? null;

  return (
    <div className="auction-row">
      <div className="auction-stage-shell" style={{ '--auction-glow': auctionGlow }}>
        {pendingPlacement ? (
          <div className="auction-card auction-placement-card">
            <div className="category-block-screen">
              <div className="category-lock-badge">Category Placement</div>
              <h3 className="category-block-name">{pendingPlacement.player.name}</h3>
              <p className="category-block-sub">
                {pendingPlacement.player.position} &middot; Tier {pendingPlacement.player.tier}
              </p>
              <p className="category-block-hint">Select a slot below, then confirm to lock this player in.</p>
            </div>
          </div>
        ) : activeFranchisePlacement ? (
          <div className="auction-card auction-placement-card franchise-placement-card">
            <div className="category-block-screen">
              <div className="category-lock-badge">Choose Position</div>
              <h3 className="category-block-name">{activeFranchisePlacement.player.name}</h3>
              <p className="category-block-sub">
                {activeFranchisePlacement.player.position} &middot; Tier {activeFranchisePlacement.player.tier}
              </p>
              <p className="category-block-hint">
                Pick the slot before you lock this player into the roster.
              </p>
            </div>

            <div className="franchise-position-grid">
              {franchisePositionOptions.map((option) => {
                const isSelected = franchisePosition === option.position;
                const isBest = option.position === franchisePositionOptions[0]?.position;
                const showFit = showFranchisePositionHints;

                return (
                  <button
                    key={option.position}
                    className={`franchise-position-btn ${isSelected ? 'is-selected' : ''} ${isBest ? 'is-best-fit' : ''}`}
                    onClick={() => setFranchisePosition(option.position)}
                  >
                    <strong>{option.position}</strong>
                    {showFit ? (
                      <span>{option.label} · {option.score}</span>
                    ) : (
                      <span>Hidden fit</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="franchise-position-footer">
              <div className="franchise-position-preview">
                <span>Selected slot</span>
                <strong>{franchisePosition ?? 'None yet'}</strong>
              </div>

              <div className="placement-actions franchise-placement-actions">
                <button className="primary-btn" onClick={confirmFranchisePlacement} disabled={!franchisePosition}>
                  Confirm position lock
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="auction-zone-grid">
            <div className="auction-card auction-scout-card">
              <div className="auction-header">
                <div className="auction-title-block">
                  <div>
                    <p className="label">{isPaused ? '⏸ Paused' : 'Active player'}</p>
                    <p className="auction-hint compact-hint">
                      {isPaused
                        ? 'Paused — press Resume when everyone is ready to bid.'
                        : 'Scout the player, then hit the market.'}
                    </p>
                  </div>
                  <div className={`timer-pill timer-pill-large ${secondsLeft <= 5 && !isPaused ? 'is-danger' : ''}`}>{secondsLeft}</div>
                </div>

                <div className="auction-control-row">
                  <button className="icon-btn auction-control-btn" onClick={togglePause}>
                    {isPaused ? 'Resume' : 'Pause'}
                  </button>
                  <button className="icon-btn auction-control-btn stats-toggle" onClick={() => setShowPlayerStats((current) => !current)}>
                    {showPlayerStats ? 'Hide stats' : 'Show stats'}
                  </button>
                </div>
              </div>

              <div className="active-player-wrapper">
                {gameMode === 'the-franchise' && franchiseReveal && (
                  <div className="franchise-reveal-overlay">
                    <div className="franchise-reveal-card">
                      <p className="eyebrow">Drafted Player</p>
                      <h3>{franchiseReveal.player.name}</h3>
                      <p>{franchiseReveal.position} • Tier {franchiseReveal.player.tier}</p>
                      <p className="franchise-reveal-position-fit">
                        {showFranchisePositionHints ? `${franchiseReveal.fit.label} (${franchiseReveal.fit.score})` : 'Fit revealed later'}
                      </p>
                      <div className="franchise-reveal-badge">Locked to {gms.find((gm) => gm.id === franchiseReveal.gmId)?.name ?? 'Unknown GM'}</div>
                      <button className="primary-btn" onClick={closeFranchiseReveal}>
                        Continue Draft
                      </button>
                    </div>
                  </div>
                )}
                <PlayerCard
                  player={activePlayer}
                  showStats={showPlayerStats}
                  className="tilt-player-card scouting-player-card"
                />
              </div>
            </div>

            <div className={`auction-economy-card trading-floor-card ${draftComplete || franchiseReveal ? 'is-locked' : ''}`}>
              <div className="auction-bid-box">
                <span>Current bid</span>
                <strong>${draftComplete ? 0 : currentBid}</strong>
                <span>
                  {draftComplete
                    ? 'Draft complete'
                    : franchiseReveal
                      ? 'Position locked'
                      : franchisePlacement
                        ? 'Choose position'
                    : highestBidderId
                      ? `Leader: ${gms.find((gm) => gm.id === highestBidderId)?.name ?? 'Unknown'}`
                      : 'No bids yet'}
                </span>
              </div>

              {!isPaused && !currentBid && !highestBidderId && !franchisePlacement && (
                <div className="auction-warning-pill">⚠ No bids yet. Timeout may hand this player away automatically.</div>
              )}

              <div className="bid-action-grid">
                {gms.map((gm) => {
                  const isRosterFull = gm.roster.length >= MAX_ROSTER_SIZE;
                  const isNoMoney = gm.budget <= currentBid;
                  const isDisabled = draftComplete || pendingPlacement || franchiseReveal || franchisePlacement || isNoMoney || isRosterFull;
                  const isLeading = gm.id === highestBidderId;
                  const statusLabel = isLeading
                    ? 'Leading'
                    : draftComplete
                      ? 'Locked'
                      : franchiseReveal
                        ? 'Locked in'
                        : franchisePlacement
                          ? 'Position pending'
                        : isRosterFull
                          ? 'Roster full'
                          : isNoMoney
                            ? 'No money'
                            : `Bid $${currentBid + 1}`;

                  return (
                    <button
                      key={gm.id}
                      className={`player-card bid-button arcade-bid-button ${isLeading ? 'is-leading' : ''}`}
                      style={{ '--gm-color': gm.color }}
                      onClick={() => handleRaiseBid(gm.id)}
                      disabled={isDisabled}
                    >
                      <strong>{isDisabled && !isLeading ? statusLabel : `BID $${currentBid + 1}`}</strong>
                      <span>{gm.name}</span>
                      <span>{`P${gms.indexOf(gm) + 1}: $${gm.budget}`}</span>
                    </button>
                  );
                })}
              </div>

              <button className="auction-pass-btn" onClick={skipAuction} disabled={draftComplete || franchiseReveal || franchisePlacement}>
                Pass (Skip Player)
              </button>
            </div>
          </div>
        )}
      </div>

      {gameMode === 'frankenstein' && pendingPlacement && !draftComplete && (
        <div className="placement-card">
          <div className="placement-header">
            <strong>{pendingPlacement.player.name}</strong>
            <span>Drag or tap a category, then confirm.</span>
          </div>

          <div className="placement-drop-grid">
            {FRANKENSTEIN_CATEGORIES.map((category) => {
              const isTaken = usedCategories.includes(category);

              return (
                <button
                  key={category}
                  className={`placement-target ${placementCategory === category ? 'is-selected' : ''} ${isTaken ? 'is-taken' : ''}`}
                  onClick={() => !isTaken && setPlacementCategory(category)}
                  onDragOver={(event) => {
                    if (!isTaken) {
                      event.preventDefault();
                    }
                  }}
                  onDrop={(event) => {
                    if (isTaken) {
                      return;
                    }

                    event.preventDefault();
                    setPlacementCategory(category);
                    setDraggedPlayerName(null);
                  }}
                  disabled={isTaken}
                >
                  {category}
                </button>
              );
            })}
          </div>

          <div
            className="placement-preview"
            draggable
            onDragStart={(event) => {
              event.dataTransfer.setData('text/plain', pendingPlacement.player.name);
              setDraggedPlayerName(pendingPlacement.player.name);
            }}
            onDragEnd={() => setDraggedPlayerName(null)}
          >
            <strong>{pendingPlacement.player.name}</strong>
            <span>{pendingPlacement.player.position} • Tier {pendingPlacement.player.tier}</span>
            <span>{draggedPlayerName ? 'Drop into a category' : 'Drag into a category'}</span>
          </div>

          <div className="placement-actions">
            <button className="primary-btn" onClick={confirmPlacement} disabled={!placementCategory}>
              Confirm category lock
            </button>
            <button className="secondary-btn" onClick={continueAuction}>
              Auction Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
