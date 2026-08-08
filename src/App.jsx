import { useMemo, useState } from 'react';
import { useGameContext } from './context/GameContext.jsx';
import { LiveAuction } from './components/LiveAuction.jsx';
import { RosterDashboard } from './components/RosterDashboard.jsx';
import { ResultsScreen } from './components/ResultsScreen.jsx';
import { WheelSpin } from './components/WheelSpin.jsx';

const HOW_TO_PLAY = {
  frankenstein: {
    title: 'Frankenstein Mode',
    objective: 'Build one super-player by locking one drafted NBA player into each of 8 attributes.',
    steps: [
      'Bid in live auctions. When a player is won, assign them to one category slot.',
      'Each category can only be used once: size, shooting, finishing, playmaking, iq, defense, rebounding, athleticism.',
      'If nobody bids on a timer expiry, the player is auto-assigned based on budget/slot rules.',
      'Complete all 8 slots, then compare category grades on the results screen.',
    ],
  },
  'the-franchise': {
    title: 'The Franchise Mode',
    objective: 'Draft a complete 5-player team, lock each player into a position, and maximize total roster + fit + synergy score.',
    steps: [
      'Bid in auctions and fill your roster up to 5 players.',
      'When you win a player, choose a position and confirm the lock before the draft continues.',
      'Some setups hide position fit hints until the end, so the final lock can be a pure ball-knowledge test.',
      'Manage your budget and fit choices so you can still compete late in the draft.',
    ],
  },
};

const ERA_HELP = {
  modern: {
    title: 'Modern',
    copy: 'Uses the current-player pool. Faster, tighter, and built around today\'s league shape.',
  },
  'all-time': {
    title: 'All-Time',
    copy: 'Uses the classic legends pool. Bigger ceiling, more iconic names, same draft rules.',
  },
};

const SYNERGY_BADGE_META = {
  'God-Tier Engine': { icon: '♛', className: 'god-tier' },
  'Dynamic Duo': { icon: '⚡', className: 'dynamic-duo' },
  'Glass Wall': { icon: '🛡', className: 'glass-wall' },
  'Balanced Core': { icon: '◈', className: 'balanced-core' },
};

const getSynergyBadgeMeta = (type) => SYNERGY_BADGE_META[type] ?? { icon: '◈', className: 'balanced-core' };

export default function App() {
  const {
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
    wheelState,
    MAX_ROSTER_SIZE,
    STARTING_BUDGET,
    countUnfilledSlots,
    gameMode,
    setGameMode,
    getSynergySummary,
    resetDraft,
    draftRound,
    currentTurnGMId,
    standings,
    draftComplete,
  } = useGameContext();

  const [screen, setScreen] = useState('setup');
  const [activeTab, setActiveTab] = useState('auction');
  const [showHowTo, setShowHowTo] = useState(false);
  const [howToMode, setHowToMode] = useState('frankenstein');

  const selectedGM = useMemo(
    () => gms.find((gm) => gm.id === currentTurnGMId) ?? gms[0],
    [currentTurnGMId, gms],
  );

  const synergySummary = useMemo(
    () => getSynergySummary(selectedGM?.roster ?? []),
    [getSynergySummary, selectedGM?.roster],
  );

  const openSlotsRemaining = useMemo(
    () => gms.reduce((total, gm) => total + countUnfilledSlots(gm), 0),
    [countUnfilledSlots, gms],
  );

  const modeLabel = gameMode === 'frankenstein' ? 'Frankenstein' : 'The Franchise';

  const TABS = [
    { id: 'auction', label: 'Auction' },
    { id: 'rosters', label: 'Rosters' },
    { id: 'standings', label: 'Standings' },
    { id: 'synergy', label: 'Synergy' },
  ];

  const handleGMNameChange = (index, value) => {
    setGMNames((current) => {
      const next = [...current];
      next[index] = value;
      return next;
    });
  };

  const adjustBudget = (delta) => {
    setBudgetAmount((current) => {
      const next = Number(current) + delta;
      return Math.max(MIN_BUDGET, Math.min(MAX_BUDGET, next));
    });
  };

  const startDraft = () => {
    resetDraft(gmCount, gmNames);
    setActiveTab('auction');
    setScreen('draft');
  };

  const openHowTo = () => {
    setHowToMode(gameMode);
    setShowHowTo(true);
  };

  return (
    <div className="app-shell">
      {screen === 'results' ? (
        <ResultsScreen
          standings={standings}
          gameMode={gameMode}
          onPlayAgain={() => setScreen('setup')}
        />
      ) : screen === 'setup' ? (
        <section className="panel setup-screen">
          <p className="eyebrow">Hardwood Hustle</p>
          <h1>The $25 GM</h1>
          <p className="setup-kicker">Lobby Setup</p>
          <p className="setup-copy">
            Set the table, name the players, and jump into a mobile-first couch co-op draft.
          </p>

          <div className="setup-command-center">
            <section className="setup-rules-panel">
              <div className="setup-panel-head">
                <h2>Draft Rules</h2>
                <span>Global Settings</span>
              </div>

              <div className="setup-rules-stack">
                <label className="setup-field">
                  <span>Players At The Table</span>
                  <select className="setup-control" value={gmCount} onChange={(event) => setGMCount(Number(event.target.value))}>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                    <option value={4}>4</option>
                    <option value={5}>5</option>
                    <option value={6}>6</option>
                    <option value={7}>7</option>
                    <option value={8}>8</option>
                  </select>
                </label>

                <div className="mode-era-stack">
                  <label className="setup-field">
                    <span>Mode</span>
                    <select className="setup-control" value={gameMode} onChange={(event) => setGameMode(event.target.value)}>
                      <option value="frankenstein">Frankenstein</option>
                      <option value="the-franchise">The Franchise</option>
                    </select>
                  </label>

                  <label className="setup-field">
                    <span>Era</span>
                    <div className={`setup-era-card ${rosterEra === 'all-time' ? 'is-all-time' : 'is-modern'}`}>
                      <select className="setup-control" value={rosterEra} onChange={(event) => setRosterEra(event.target.value)}>
                        <option value="modern">Modern</option>
                        <option value="all-time">All-Time</option>
                      </select>
                      <div className="setup-era-copy">
                        <strong>{ERA_HELP[rosterEra].title} roster pool</strong>
                        <span>{ERA_HELP[rosterEra].copy}</span>
                      </div>
                    </div>
                  </label>
                </div>

                <div className="setup-franchise-card">
                  <div className="setup-panel-head setup-franchise-head">
                    <h3>Draft Secrecy & Audio</h3>
                    <span>Global</span>
                  </div>

                  <div className="setup-toggle-stack">
                    <button
                      type="button"
                      className={`setup-toggle-chip ${hideScoutingStats ? 'is-active' : ''}`}
                      onClick={() => setHideScoutingStats((current) => !current)}
                    >
                      {hideScoutingStats ? 'Hidden Scouting ON' : 'Hidden Scouting OFF'}
                    </button>
                    <p className="setup-toggle-copy">
                      Hides player stats and tier during auctions. You can still toggle this in draft.
                    </p>

                    <button
                      type="button"
                      className={`setup-toggle-chip ${soundEnabled ? 'is-active' : ''}`}
                      onClick={() => setSoundEnabled((current) => !current)}
                    >
                      {soundEnabled ? 'Sound ON' : 'Sound OFF'}
                    </button>
                    <p className="setup-toggle-copy">
                      Arcade sounds for bids, timer pressure, wheel spins, and lock-ins.
                    </p>

                    <label className="setup-volume-stack" htmlFor="setup-volume">
                      <span>Volume: {Math.round(soundVolume * 100)}%</span>
                      <input
                        id="setup-volume"
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={Math.round(soundVolume * 100)}
                        onChange={(event) => setSoundVolume(Number(event.target.value) / 100)}
                        disabled={!soundEnabled}
                      />
                    </label>
                  </div>
                </div>

                {gameMode === 'the-franchise' && (
                  <div className="setup-franchise-card">
                    <div className="setup-panel-head setup-franchise-head">
                      <h3>Franchise Position Rules</h3>
                      <span>Optional</span>
                    </div>

                    <div className="setup-toggle-stack">
                      <button
                        type="button"
                        className={`setup-toggle-chip ${showFranchisePositionHints ? 'is-active' : ''}`}
                        onClick={() => setShowFranchisePositionHints((current) => !current)}
                      >
                        {showFranchisePositionHints ? 'Fit Hints Visible' : 'Fit Hints Hidden'}
                      </button>
                      <p className="setup-toggle-copy">
                        Hide the best-position hints if you want The Franchise to play like a blind fit test.
                      </p>

                      <button
                        type="button"
                        className={`setup-toggle-chip ${allowFranchisePositionShifts ? 'is-active' : ''}`}
                        onClick={() => setAllowFranchisePositionShifts((current) => !current)}
                      >
                        {allowFranchisePositionShifts ? 'Position Shifts Allowed' : 'Positions Locked After Confirm'}
                      </button>
                      <p className="setup-toggle-copy">
                        Turn this on if you want managers to be able to revisit and shift a drafted player later.
                      </p>
                    </div>
                  </div>
                )}

                <div className="setup-budget-card" aria-label="Budget controls">
                  <span className="setup-budget-label">Starting Budget</span>
                  <div className="setup-budget-row">
                    <button
                      type="button"
                      className="icon-btn setup-budget-btn"
                      onClick={() => adjustBudget(-BUDGET_STEP)}
                      disabled={budgetAmount <= MIN_BUDGET}
                      aria-label="Decrease budget"
                    >
                      −
                    </button>
                    <div className="setup-budget-value">${budgetAmount}</div>
                    <button
                      type="button"
                      className="icon-btn setup-budget-btn"
                      onClick={() => adjustBudget(BUDGET_STEP)}
                      disabled={budgetAmount >= MAX_BUDGET}
                      aria-label="Increase budget"
                    >
                      +
                    </button>
                  </div>
                  <p className="setup-budget-hint">Adjust in ${BUDGET_STEP} steps (max ${MAX_BUDGET})</p>
                </div>
              </div>
            </section>

            <section className="setup-lobby-panel">
              <div className="setup-panel-head setup-lobby-head">
                <h2>Couch GMs</h2>
                <span>{gmCount} Players</span>
              </div>

              <div className="setup-lobby-grid">
                {Array.from({ length: gmCount }, (_, index) => (
                  <label key={`gm-name-${index}`} className="setup-lobby-field">
                    <span>{`Player ${index + 1}`}</span>
                    <input
                      className="setup-lobby-input"
                      value={gmNames[index] ?? `Player ${index + 1}`}
                      onChange={(event) => handleGMNameChange(index, event.target.value)}
                      placeholder={`Player ${index + 1}`}
                    />
                  </label>
                ))}
              </div>

              <div className="setup-actions setup-actions-docked">
                <button className="secondary-btn" onClick={openHowTo}>
                  How To Play
                </button>
                <button className="primary-btn" onClick={startDraft}>
                  Enter Draft Room
                </button>
              </div>
            </section>
          </div>

          {showHowTo && (
            <div className="howto-overlay" role="dialog" aria-modal="true" aria-label="How to play">
              <div className="howto-modal">
                <div className="howto-header">
                  <div>
                    <p className="eyebrow">Game Guide</p>
                    <h2>How To Play</h2>
                  </div>
                  <button className="icon-btn" onClick={() => setShowHowTo(false)}>
                    Close
                  </button>
                </div>

                <div className="howto-mode-switch" role="tablist" aria-label="Game mode guide tabs">
                  <button
                    role="tab"
                    aria-selected={howToMode === 'frankenstein'}
                    className={`tab-btn ${howToMode === 'frankenstein' ? 'is-active' : ''}`}
                    onClick={() => setHowToMode('frankenstein')}
                  >
                    Frankenstein
                  </button>
                  <button
                    role="tab"
                    aria-selected={howToMode === 'the-franchise'}
                    className={`tab-btn ${howToMode === 'the-franchise' ? 'is-active' : ''}`}
                    onClick={() => setHowToMode('the-franchise')}
                  >
                    The Franchise
                  </button>
                </div>

                <div className="howto-content" role="tabpanel">
                  <h3>{HOW_TO_PLAY[howToMode].title}</h3>
                  <p>{HOW_TO_PLAY[howToMode].objective}</p>
                  <ol>
                    {HOW_TO_PLAY[howToMode].steps.map((step, index) => (
                      <li key={`${howToMode}-step-${index}`}>{step}</li>
                    ))}
                  </ol>
                </div>

                <div className="howto-era-note">
                  <p className="eyebrow">Roster Era</p>
                  <div className="howto-era-grid">
                    <div className={`howto-era-card ${rosterEra === 'modern' ? 'is-active' : ''}`}>
                      <strong>Modern</strong>
                      <span>Current-player roster pool</span>
                    </div>
                    <div className={`howto-era-card ${rosterEra === 'all-time' ? 'is-active' : ''}`}>
                      <strong>All-Time</strong>
                      <span>Legend roster pool</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      ) : (
        <>
          <header className="app-topbar">
            <div className="brand">
              <p className="eyebrow">Hardwood Hustle</p>
              <h1>The $25 GM</h1>
            </div>
            <button className="icon-btn" onClick={() => setScreen('setup')}>
              Setup
            </button>
          </header>

          <div className="meta-strip">
            <span>Round {draftRound}</span>
            <span className="dot">•</span>
            <span>{modeLabel} mode</span>
            <span className="dot">•</span>
            <span>{rosterEra === 'all-time' ? 'All-Time' : 'Modern'} era</span>
            <span className="dot">•</span>
            <span>{MAX_ROSTER_SIZE}-slot rosters</span>
            <span className="dot">•</span>
            <span>${STARTING_BUDGET} to spend</span>
            <span className="dot">•</span>
            <div className="meta-audio-controls">
              <button
                type="button"
                className={`meta-sound-btn ${soundEnabled ? 'is-on' : ''}`}
                onClick={() => setSoundEnabled((current) => !current)}
              >
                {soundEnabled ? 'Sound On' : 'Sound Off'}
              </button>
              <input
                className="meta-sound-slider"
                type="range"
                min="0"
                max="100"
                step="1"
                value={Math.round(soundVolume * 100)}
                onChange={(event) => setSoundVolume(Number(event.target.value) / 100)}
                disabled={!soundEnabled}
                aria-label="Draft sound volume"
              />
            </div>
          </div>

          <nav className="mobile-tab-bar" aria-label="Draft sections">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                className={`tab-btn ${activeTab === tab.id ? 'is-active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <main className="draft-layout split-horizon-layout">
            <section className={`panel draft-stage-panel top-stage-panel ${activeTab === 'auction' ? '' : 'mobile-hide'}`}>
              <div className="panel-heading">
                <h2>Live Auction</h2>
                <span className="spotlight-tag">Spotlight: {selectedGM?.name}</span>
              </div>

              <LiveAuction selectedGM={selectedGM} draftComplete={draftComplete} />
            </section>

            <section className={`panel synergy-panel top-aside-panel ${activeTab === 'synergy' ? '' : 'mobile-hide'}`}>
              <div className="panel-heading">
                <h2>Synergy Engine</h2>
                <span className="spotlight-tag">{selectedGM?.name}'s roster</span>
              </div>

              <div className="draft-status-card">
                <div className="draft-status-head">
                  <strong>Draft Status</strong>
                  <span>{draftComplete ? 'Complete' : 'Live'}</span>
                </div>
                <div className="draft-status-grid">
                  <div>
                    <span>Open slots</span>
                    <strong>{openSlotsRemaining}</strong>
                  </div>
                  <div>
                    <span>Leader</span>
                    <strong>{standings[0]?.name ?? '—'}</strong>
                  </div>
                </div>
              </div>

              <div className="synergy-score">Score: {synergySummary.score}</div>
              {synergySummary.topPair && (
                <div className="synergy-note">
                  <span>Best duo: {synergySummary.topPair.players.join(' + ')}</span>
                  <span className={`synergy-type-badge ${getSynergyBadgeMeta(synergySummary.topPair.type).className}`}>
                    <strong>{getSynergyBadgeMeta(synergySummary.topPair.type).icon}</strong>
                    <span>{synergySummary.topPair.type}</span>
                    <em>{synergySummary.topPair.score}</em>
                  </span>
                </div>
              )}

              <div className="synergy-list">
                {synergySummary.pairs.map((pair, index) => (
                  <div key={`${pair.players.join('-')}-${index}`} className="synergy-item">
                    <span>
                      {pair.players.join(' + ')}
                    </span>
                    <div className="synergy-item-meta">
                      <span className={`synergy-type-badge ${getSynergyBadgeMeta(pair.type).className}`}>
                        <strong>{getSynergyBadgeMeta(pair.type).icon}</strong>
                        <span>{pair.type}</span>
                      </span>
                      <strong>{pair.score}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className={`panel roster-panel bottom-board-panel ${activeTab === 'rosters' ? '' : 'mobile-hide'}`}>
              <div className="panel-heading">
                <h2>{gameMode === 'frankenstein' ? 'Global Draft Board' : 'Team Board'}</h2>
                <span>All selections live</span>
              </div>
              <RosterDashboard selectedGM={selectedGM} gms={gms} gameMode={gameMode} />
            </section>

            <section className={`panel standings-panel ${activeTab === 'standings' ? '' : 'mobile-hide'} mobile-standings-panel`}>
              <div className="panel-heading">
                <h2>Standings</h2>
                <span>Ranked by score</span>
              </div>

              <div className="standings-list">
                {gms.map((gm) => (
                  <div key={gm.id} className="standings-card" style={{ '--gm-color': gm.color }}>
                    <div className="standings-name-row">
                      <strong>{gm.name}</strong>
                      <span>{gm.id === currentTurnGMId ? 'On deck' : 'Waiting'}</span>
                    </div>
                    <div>Budget: ${gm.budget}</div>
                    <div>Roster: {gm.roster.length}/{MAX_ROSTER_SIZE}</div>
                    <div>Slots open: {countUnfilledSlots(gm)}</div>
                  </div>
                ))}
              </div>
            </section>

          </main>

          {draftComplete && (
            <div className="draft-complete-overlay">
              <div className="draft-complete-card">
                <div className="draft-complete-trophy">🏆</div>
                <p className="eyebrow">All rosters are locked</p>
                <h2>Draft Complete!</h2>
                <p className="draft-complete-copy">
                  Every GM has built their team. Time to crown a champion.
                </p>
                <button className="primary-btn" onClick={() => setScreen('results')}>
                  Show Results
                </button>
              </div>
            </div>
          )}
          {wheelState.visible && <WheelSpin />}
        </>
      )}
    </div>
  );
}
