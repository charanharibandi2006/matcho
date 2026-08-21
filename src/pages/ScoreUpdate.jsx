import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  Minus,
  Plus,
  RefreshCw,
  RotateCcw,
  Trophy,
  Undo2,
  Wifi,
  Zap,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import RoleSidebar from "../components/RoleSidebar";
import { apiRequest } from "../services/api";
import "./StatsDashboard.css";
import "./OrganizerDashboard.css";
import "./ScoreUpdate.css";

const POOL_POINTS_TO_WIN = 7;
const KNOCKOUT_POINTS_TO_WIN = 21;
const DEUCE_AT = 20;
const MAX_POINTS = 30;
const KNOCKOUT_GAMES_TO_WIN = 2;
const STORAGE_PREFIX = "matcho-badminton-score-";

function getGameWinner(scoreA, scoreB) {
  // Special 7-0 early win
  if (scoreA === 7 && scoreB === 0) {
    return "A";
  }

  if (scoreB === 7 && scoreA === 0) {
    return "B";
  }

  // Nobody can win before 21
  if (scoreA < 21 && scoreB < 21) {
    return null;
  }

  // At 21+, normal badminton-style win
  if (scoreA >= 21 || scoreB >= 21) {
    const difference =
      Math.abs(scoreA - scoreB);

    // Need 2-point lead, except 30-point cap
    if (difference >= 2) {
      return scoreA > scoreB ? "A" : "B";
    }

    // 30-29 wins
    if (scoreA >= 30) {
      return "A";
    }

    if (scoreB >= 30) {
      return "B";
    }
  }

  return null;
}

function readLocalState(fixtureId) {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${fixtureId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeLocalState(fixtureId, state) {
  try {
    localStorage.setItem(
      `${STORAGE_PREFIX}${fixtureId}`,
      JSON.stringify(state)
    );
  } catch {
    // Ignore storage failures; database state still works.
  }
}

function normalizeStatus(status) {
  return String(status || "").toLowerCase();
}

function getGameResult(a, b, useDeuceRules) {
  const max = Math.max(a, b);
  const min = Math.min(a, b);
  const diff = max - min;

  if (!useDeuceRules) {
    if (a === 7 && b === 0) {
      return {
        complete: true,
        winner: 1,
        label: "7-0 · Game won",
      };
    }

    if (b === 7 && a === 0) {
      return {
        complete: true,
        winner: 2,
        label: "0-7 · Game won",
      };
    }

    if (max < KNOCKOUT_POINTS_TO_WIN) {
      return {
        complete: false,
        winner: null,
        label: "7-0 wins early · otherwise play to 21",
      };
    }

    if (max >= MAX_POINTS) {
      return {
        complete: true,
        winner: a > b ? 1 : 2,
        label: `${max}-${min} · Game won`,
      };
    }

    if (max >= DEUCE_AT && diff < 2) {
      return {
        complete: false,
        winner: null,
        label:
          a === b
            ? "Deuce"
            : a > b
              ? "Advantage · Team A"
              : "Advantage · Team B",
      };
    }

    if (max >= KNOCKOUT_POINTS_TO_WIN && diff >= 2) {
      return {
        complete: true,
        winner: a > b ? 1 : 2,
        label: `${max}-${min} · Game won`,
      };
    }

    return {
      complete: false,
      winner: null,
      label: "7-0 wins early · otherwise play to 21",
    };
  }

  if (max < KNOCKOUT_POINTS_TO_WIN) {
    return {
      complete: false,
      winner: null,
      label: "First to 21 · win by 2",
    };
  }

  if (max >= MAX_POINTS) {
    return {
      complete: true,
      winner: a > b ? 1 : 2,
      label: `${max}-${min} · Set won`,
    };
  }

  if (max >= DEUCE_AT && diff < 2) {
    return {
      complete: false,
      winner: null,
      label:
        a === b
          ? "Deuce"
          : a > b
            ? "Advantage · Team A"
            : "Advantage · Team B",
    };
  }

  if (max >= KNOCKOUT_POINTS_TO_WIN && diff >= 2) {
    return {
      complete: true,
      winner: a > b ? 1 : 2,
      label: `${max}-${min} · Set won`,
    };
  }

  return {
    complete: false,
    winner: null,
    label: "First to 21 · win by 2",
  };
}


function defaultMatchState() {
  return {
    currentGame: 1,
    gamesWonA: 0,
    gamesWonB: 0,
    currentScoreA: 0,
    currentScoreB: 0,
    gameScores: [],
    server: 1,
    lastRally: null,
    locked: false,
    matchComplete: false,
    undoStack: [],
    ruleKey: "pool-7-0-otherwise-21",
    startedAt: Date.now(),
  };
}

export default function ScoreUpdate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const fixtureId = searchParams.get("fixtureId");
  const tournamentId = searchParams.get("tournamentId");

  const [fixture, setFixture] = useState(null);
  const [state, setState] = useState(defaultMatchState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const markPendingSync = (
    currentState,
    payload
  ) => {
    const nextState = {
      ...currentState,
      pendingSync: true,
      pendingPayload: {
        scoreA:
          Number(payload?.scoreA) || 0,
        scoreB:
          Number(payload?.scoreB) || 0,
        status:
          payload?.status ||
          (currentState.matchComplete
            ? "Completed"
            : "Live"),
        winnerId:
          payload?.winnerId || null,
      },
    };

    writeLocalState(
      fixtureId,
      nextState
    );

    return nextState;
  };

  const syncPendingScore =
  async (currentState) => {
    if (
      !currentState?.pendingSync ||
      !currentState?.pendingPayload
    ) {
      return;
    }

    const token =
      localStorage.getItem(
        "matcho_token"
      );

    if (!token) {
      throw new Error(
        "No authentication token."
      );
    }

    const payload =
      currentState.pendingPayload;

    await apiRequest(
      `/fixtures/score/${fixtureId}`,
      {
        method: "PUT",
        headers: {
          Authorization:
            `Bearer ${token}`,
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          playerAScore:
            payload.scoreA,
          playerBScore:
            payload.scoreB,
          status:
            payload.status,
          winnerId:
            payload.winnerId ||
            null,
        }),
      }
    );

    const syncedState = {
      ...currentState,
      pendingSync: false,
      pendingPayload: null,
    };

    setState(
      syncedState
    );

    writeLocalState(
      fixtureId,
      syncedState
    );

    setMessage(
      "Offline score synchronized."
    );
  };


  const loadFixture = async () => {
    if (!tournamentId || !fixtureId) {
      setError(
        "Missing fixture or tournament information."
      );
      setLoading(false);
      return;
    }

    const stored =
      readLocalState(fixtureId);

    // Show local state immediately so scoring survives
    // a refresh while the device is offline.
    if (stored) {
      setState({
        ...defaultMatchState(),
        ...stored,
        undoStack:
          stored.undoStack || [],
      });
    }

    try {
      setLoading(true);
      setError("");

      const token =
        localStorage.getItem(
          "matcho_token"
        );

      if (!token) {
        throw new Error(
          "Please login as an organizer."
        );
      }

      const result =
        await apiRequest(
          `/fixtures/${tournamentId}`,
          {
            method: "GET",
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      const allFixtures =
        Array.isArray(
          result?.fixtures
        )
          ? result.fixtures
          : [];

      const selected =
        allFixtures.find(
          (item) =>
            String(item.id) ===
            String(fixtureId)
        );

      if (!selected) {
        throw new Error(
          "Fixture not found."
        );
      }

      setFixture(
        selected
      );

      const loadedRuleKey =
        selected.stage === "Semi Final" ||
        selected.stage === "Final"
          ? "bo3-21"
          : "pool-7-0-otherwise-21";

      let nextLoadedState;

      if (
        stored &&
        stored.ruleKey ===
          loadedRuleKey
      ) {
        nextLoadedState = {
          ...defaultMatchState(),
          ...stored,
          undoStack:
            stored.undoStack || [],
          ruleKey:
            loadedRuleKey,
        };
      } else {
        nextLoadedState = {
          ...defaultMatchState(),
          ruleKey:
            loadedRuleKey,
        };
      }

      const hasPendingOffline =
        Boolean(
          nextLoadedState.pendingSync
        );

      if (!hasPendingOffline) {
        nextLoadedState.currentScoreA =
          Number(
            selected.player_a_score
          ) || 0;

        nextLoadedState.currentScoreB =
          Number(
            selected.player_b_score
          ) || 0;

        nextLoadedState.matchComplete =
          normalizeStatus(
            selected.status
          ) === "completed";

        if (
          nextLoadedState.matchComplete
        ) {
          const winnerSide =
            nextLoadedState.currentScoreA >
            nextLoadedState.currentScoreB
              ? 1
              : 2;

          nextLoadedState.gamesWonA =
            winnerSide === 1
              ? 1
              : 0;

          nextLoadedState.gamesWonB =
            winnerSide === 2
              ? 1
              : 0;

          nextLoadedState.locked =
            true;
        }
      }

      nextLoadedState.ruleKey =
        loadedRuleKey;

      setState(
        nextLoadedState
      );

      writeLocalState(
        fixtureId,
        nextLoadedState
      );

      if (
        nextLoadedState.pendingSync
      ) {
        try {
          await syncPendingScore(
            nextLoadedState
          );
        } catch (syncError) {
          console.warn(
            "Pending offline score not synced yet:",
            syncError
          );

          setState(
            nextLoadedState
          );

          writeLocalState(
            fixtureId,
            nextLoadedState
          );
        }
      }
    } catch (err) {
      if (stored) {
        setState({
          ...defaultMatchState(),
          ...stored,
          undoStack:
            stored.undoStack || [],
        });

        setError(
          stored.pendingSync
            ? "Offline mode: using locally saved score. It will sync when connection returns."
            : "Offline mode: using locally saved score."
        );
      } else {
        setError(
          "Unable to load fixture and no offline score is available."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFixture();
  }, [fixtureId, tournamentId]);

  // Automatically retry queued offline data as soon as
  // the browser reports that the network is back.
  useEffect(() => {
    const handleOnline =
      async () => {
        const stored =
          readLocalState(
            fixtureId
          );

        try {
          if (
            stored?.pendingSync
          ) {
            await syncPendingScore(
              stored
            );
          }

          await loadFixture();

          setMessage(
            stored?.pendingSync
              ? "Offline score synchronized successfully."
              : "Connection restored."
          );
        } catch (err) {
          console.error(
            "Offline sync failed:",
            err
          );

          const currentStored =
            readLocalState(
              fixtureId
            );

          if (currentStored) {
            setState(
              currentStored
            );
          }

          setError(
            "Connection restored, but the score could not be synchronized yet."
          );
        }
      };

    window.addEventListener(
      "online",
      handleOnline
    );

    return () => {
      window.removeEventListener(
        "online",
        handleOnline
      );
    };
  }, [fixtureId, tournamentId]);

  const teamA = useMemo(
    () =>
      fixture?.team_a_name ||
      fixture?.player_a_name ||
      "Team A",
    [fixture]
  );

  const teamB = useMemo(
    () =>
      fixture?.team_b_name ||
      fixture?.player_b_name ||
      "Team B",
    [fixture]
  );

  const isKnockout =
    fixture?.stage === "Semi Final" ||
    fixture?.stage === "Final";

  const bestOf = isKnockout ? 3 : 1;
  const pointsToWin = isKnockout
    ? KNOCKOUT_POINTS_TO_WIN
    : POOL_POINTS_TO_WIN;
  const gamesToWin = isKnockout
    ? KNOCKOUT_GAMES_TO_WIN
    : 1;
  const ruleKey = isKnockout
    ? "bo3-21"
    : "pool-7-0-otherwise-21";

  const gameStatus = useMemo(
    () =>
      getGameResult(
        state.currentScoreA,
        state.currentScoreB,
        isKnockout
      ),
    [
      state.currentScoreA,
      state.currentScoreB,
      pointsToWin,
      isKnockout,
    ]
  );

  const matchPointA =
    isKnockout &&
    state.gamesWonA === gamesToWin - 1 &&
    state.gamesWonB < gamesToWin &&
    !gameStatus.complete;

  const matchPointB =
    isKnockout &&
    state.gamesWonB === gamesToWin - 1 &&
    state.gamesWonA < gamesToWin &&
    !gameStatus.complete;

  const statusBanner =
    gameStatus.label === "Deuce"
      ? "DEUCE"
      : matchPointA || matchPointB
        ? "MATCH POINT"
        : gameStatus.label;

  const pushLocalState = (nextState) => {
    setState(nextState);
    writeLocalState(fixtureId, nextState);
  };

  const persistFixture = async ({
    scoreA,
    scoreB,
    status,
    winnerId = null,
  }) => {
    const token = localStorage.getItem("matcho_token");
    if (!token) {
      throw new Error("Please login as an organizer.");
    }

    await apiRequest(`/fixtures/score/${fixtureId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        playerAScore: scoreA,
        playerBScore: scoreB,
        status,
        winnerId,
      }),
    });
  };

  const startFixtureIfNeeded = async () => {
    if (normalizeStatus(fixture?.status) === "upcoming") {
      await persistFixture({
        scoreA: 0,
        scoreB: 0,
        status: "Live",
      });

      setFixture((previous) => ({
        ...previous,
        status: "Live",
      }));
    }
  };

  useEffect(() => {
    if (fixture && normalizeStatus(fixture.status) === "upcoming") {
      startFixtureIfNeeded().catch((err) => {
        console.error("Start fixture error:", err);
        setError(err.message || "Unable to start the fixture.");
      });
    }
  }, [fixture?.id]);
  const handlePoint = async (side) => {
    if (
      saving ||
      state.locked ||
      state.matchComplete ||
      gameStatus.complete
    ) {
      return;
    }

    const previousState = {
      ...state,
      undoStack: [],
    };

    const nextA =
      side === 1
        ? state.currentScoreA + 1
        : state.currentScoreA;

    const nextB =
      side === 2
        ? state.currentScoreB + 1
        : state.currentScoreB;

    const nextGameResult =
      getGameResult(
        nextA,
        nextB,
        isKnockout
      );

    const nextStateBase = {
      ...state,
      currentScoreA: nextA,
      currentScoreB: nextB,
      server: side,
      lastRally: side,
      pendingSync: false,
      pendingPayload: null,
      undoStack: [
        ...state.undoStack.slice(-19),
        previousState,
      ],
    };

    try {
      setSaving(true);
      setError("");
      setMessage("");

      if (!nextGameResult.complete) {
        const localState =
          markPendingSync(
            nextStateBase,
            {
              scoreA: nextA,
              scoreB: nextB,
              status: "Live",
              winnerId: null,
            }
          );

        setState(
          localState
        );

        try {
          await persistFixture({
            scoreA: nextA,
            scoreB: nextB,
            status: "Live",
            winnerId: null,
          });

          const syncedState = {
            ...localState,
            pendingSync: false,
            pendingPayload: null,
          };

          setState(
            syncedState
          );

          writeLocalState(
            fixtureId,
            syncedState
          );

          setMessage(
            "Score updated."
          );
        } catch (networkError) {
          console.warn(
            "Offline: score saved locally.",
            networkError
          );

          setMessage(
            "Offline: score saved locally. It will sync when connection returns."
          );
        }

        return;
      }

      const nextGamesWonA =
        state.gamesWonA +
        (nextGameResult.winner === 1
          ? 1
          : 0);

      const nextGamesWonB =
        state.gamesWonB +
        (nextGameResult.winner === 2
          ? 1
          : 0);

      const nextGameScores = [
        ...state.gameScores,
        {
          game:
            state.currentGame,
          a: nextA,
          b: nextB,
        },
      ];

      const matchComplete =
        nextGamesWonA >=
          gamesToWin ||
        nextGamesWonB >=
          gamesToWin;

      const winnerSide =
        nextGamesWonA >=
        gamesToWin
          ? 1
          : 2;

      const winnerId =
        winnerSide === 1
          ? fixture.team_a_id ||
            fixture.player_a_id
          : fixture.team_b_id ||
            fixture.player_b_id;

      const payload = {
        scoreA: nextA,
        scoreB: nextB,
        status:
          matchComplete
            ? "Completed"
            : "Live",
        winnerId:
          matchComplete
            ? winnerId
            : null,
      };

      const nextState = {
        ...nextStateBase,
        gamesWonA:
          nextGamesWonA,
        gamesWonB:
          nextGamesWonB,
        gameScores:
          nextGameScores,
        locked: true,
        matchComplete,
        pendingSync: true,
        undoStack: [
          ...state.undoStack.slice(-19),
          previousState,
        ],
      };

      const localState =
        markPendingSync(
          nextState,
          payload
        );

      setState(
        localState
      );

      try {
        await persistFixture(
          payload
        );

        const syncedState = {
          ...localState,
          pendingSync: false,
          pendingPayload: null,
        };

        setState(
          syncedState
        );

        writeLocalState(
          fixtureId,
          syncedState
        );

        if (matchComplete) {
          setFixture(
            (previous) => ({
              ...previous,
              status:
                "Completed",
            })
          );

          setMessage(
            `${winnerSide === 1 ? teamA : teamB} wins the match.`
          );
        } else {
          setMessage(
            `Game ${state.currentGame} complete. Start Game ${
              state.currentGame + 1
            }.`
          );
        }
      } catch (networkError) {
        console.warn(
          "Offline: completed score saved locally.",
          networkError
        );

        setMessage(
          matchComplete
            ? "Offline: completed result saved locally and will sync when connection returns."
            : "Offline: game result saved locally and will sync when connection returns."
        );
      }
    } catch (err) {
      console.error(
        "Score update error:",
        err
      );

      setError(
        err.message ||
          "Unable to update the score."
      );
    } finally {
      setSaving(false);
    }
  };

  const startNextGame = () => {
    if (!isKnockout || !state.locked || state.matchComplete) return;

    const nextState = {
      ...state,
      currentGame: state.currentGame + 1,
      currentScoreA: 0,
      currentScoreB: 0,
      locked: false,
      lastRally: null,
      undoStack: [],
    };

    pushLocalState(nextState);

    setMessage(
      `Game ${nextState.currentGame} started.`
    );
  };
  const undoPoint = async () => {
    if (
      !state.undoStack.length ||
      saving
    ) {
      return;
    }

    const previous =
      state.undoStack[
        state.undoStack.length - 1
      ];

    const restored = {
      ...previous,
      pendingSync: true,
      pendingPayload: null,
      undoStack:
        state.undoStack.slice(
          0,
          -1
        ),
    };

    const restoredWinnerId =
      restored.matchComplete
        ? (
            restored.gamesWonA >=
            gamesToWin
              ? (
                  fixture.team_a_id ||
                  fixture.player_a_id
                )
              : (
                  fixture.team_b_id ||
                  fixture.player_b_id
                )
          )
        : null;

    const localState =
      markPendingSync(
        restored,
        {
          scoreA:
            restored.currentScoreA,
          scoreB:
            restored.currentScoreB,
          status:
            restored.matchComplete
              ? "Completed"
              : "Live",
          winnerId:
            restoredWinnerId,
        }
      );

    try {
      setSaving(true);
      setError("");
      setMessage("");

      setState(
        localState
      );

      await persistFixture({
        scoreA:
          restored.currentScoreA,
        scoreB:
          restored.currentScoreB,
        status:
          restored.matchComplete
            ? "Completed"
            : "Live",
        winnerId:
          restoredWinnerId,
      });

      const syncedState = {
        ...localState,
        pendingSync: false,
        pendingPayload: null,
      };

      setState(
        syncedState
      );

      writeLocalState(
        fixtureId,
        syncedState
      );

      setFixture(
        (previousFixture) => ({
          ...previousFixture,
          status:
            restored.matchComplete
              ? "Completed"
              : "Live",
        })
      );

      setMessage(
        "Last rally undone and score synced."
      );
    } catch (err) {
      console.warn(
        "Offline: undo saved locally.",
        err
      );

      setMessage(
        "Offline: undo saved locally and will sync when connection returns."
      );
    } finally {
      setSaving(false);
    }
  };
  const resetCurrentGame = async () => {
    if (
      saving ||
      state.matchComplete
    ) {
      return;
    }

    const nextState = {
      ...state,
      currentScoreA: 0,
      currentScoreB: 0,
      locked: false,
      lastRally: null,
      pendingSync: true,
      pendingPayload: null,
      undoStack: [],
    };

    const localState =
      markPendingSync(
        nextState,
        {
          scoreA: 0,
          scoreB: 0,
          status: "Live",
          winnerId: null,
        }
      );

    try {
      setSaving(true);
      setError("");
      setMessage("");

      setState(
        localState
      );

      await persistFixture({
        scoreA: 0,
        scoreB: 0,
        status: "Live",
        winnerId: null,
      });

      const syncedState = {
        ...localState,
        pendingSync: false,
        pendingPayload: null,
      };

      setState(
        syncedState
      );

      writeLocalState(
        fixtureId,
        syncedState
      );

      setFixture(
        (previousFixture) => ({
          ...previousFixture,
          status: "Live",
          player_a_score: 0,
          player_b_score: 0,
          winner_player_id:
            null,
          winner_team_id:
            null,
        })
      );

      setMessage(
        `Game ${state.currentGame} reset and synced.`
      );
    } catch (err) {
      console.warn(
        "Offline: reset saved locally.",
        err
      );

      setMessage(
        "Offline: reset saved locally and will sync when connection returns."
      );
    } finally {
      setSaving(false);
    }
  };

  const refresh = async () => {
    await loadFixture();
    setMessage("Scoring data refreshed.");
  };

  const backToFixtures = () => {
  navigate(
    `/tournament-management?tournamentId=${tournamentId}&section=fixtures`
  );
};

  if (loading) {
    return (
      <div className="org-layout">
        <RoleSidebar activeItem="Live Scoring" />
        <main className="org-main">
          <div className="org-content">
            <section className="score-loading-card">
              Loading match...
            </section>
          </div>
        </main>
      </div>
    );
  }

  if (error && !fixture) {
    return (
      <div className="org-layout">
        <RoleSidebar activeItem="Live Scoring" />
        <main className="org-main">
          <div className="org-content">
            <section className="score-error-card">
              <strong>Unable to open scoring</strong>
              <p>{error}</p>
              <button
                type="button"
                className="score-secondary-btn"
                onClick={backToFixtures}
              >
                <ArrowLeft size={16} />
                Back to fixtures
              </button>
            </section>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="org-layout">
      <RoleSidebar activeItem="Live Scoring" />

      <main className="org-main">
        <div className="org-content">
          <section className="score-console">
            <header className="score-console-header">
              <div className="score-header-left">
                <button
                  type="button"
                  className="score-icon-btn"
                  onClick={backToFixtures}
                  aria-label="Back"
                >
                  <ChevronLeft size={19} />
                </button>

                <div>
                  <div className="score-kicker">
                    {fixture?.stage || "Pool Match"}
                  </div>

                  <h1>
                    {fixture?.pool_name
                      ? `${fixture.pool_name} · Match ${fixture.match_number}`
                      : `Match ${fixture?.match_number || ""}`}
                  </h1>

                  <div className="score-meta-row">
                    <span>
                      <Clock3 size={14} />
                      Live scoring
                    </span>
                    <span>
                      <Trophy size={14} />
                      Best of 3 games
                    </span>
                    <span>
                      <Wifi size={14} />
                      {state.pendingSync
                        ? "Pending sync"
                        : "Synced"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="score-header-right">
                <span className="score-live-pill">
                  <span className="score-live-dot" />
                  {state.matchComplete
                    ? "COMPLETED"
                    : "LIVE"}
                </span>

                <button
                  type="button"
                  className="score-secondary-btn"
                  onClick={refresh}
                  disabled={saving}
                >
                  <RefreshCw size={15} />
                  Refresh
                </button>
              </div>
            </header>

            {(error || message) && (
              <div
                className={
                  error
                    ? "score-alert error"
                    : "score-alert success"
                }
              >
                {error || message}
              </div>
            )}

            <div className="score-stage">
              <div className="score-stage-top">
                <div>
                  <span className="score-stage-label">
                    GAME {state.currentGame} OF {bestOf}
                  </span>
                  <strong>
                    {statusBanner}
                  </strong>
                </div>

                <div className="score-game-counter">
                  <span>
                    {teamA}
                    <b>{state.gamesWonA}</b>
                  </span>
                  <span className="score-game-vs">
                    -
                  </span>
                  <span>
                    <b>{state.gamesWonB}</b>
                    {teamB}
                  </span>
                </div>
              </div>

              <div className="score-main-board">
                <div className="score-team">
                  <div className="score-team-side">
                    <span className="score-team-tag">
                      SIDE A
                    </span>

                    <h2>{teamA}</h2>

                    {state.server === 1 && (
                      <span className="score-server-pill">
                        <Zap size={13} />
                        Serving
                      </span>
                    )}
                  </div>

                  <div className="score-number">
                    {state.currentScoreA}
                  </div>

                  <div className="score-point-actions">
                    <button
                      type="button"
                      className="score-point-btn minus"
                      onClick={undoPoint}
                      disabled={
                        !state.undoStack.length ||
                        saving
                      }
                      aria-label="Undo last rally"
                    >
                      <Undo2 size={18} />
                    </button>

                    <button
                      type="button"
                      className="score-point-btn plus"
                      onClick={() =>
                        handlePoint(1)
                      }
                      disabled={
                        saving ||
                        state.locked ||
                        state.matchComplete
                      }
                    >
                      <Plus size={23} />
                      <span>Point</span>
                    </button>
                  </div>
                </div>

                <div className="score-vs-column">
                  <span className="score-vs-circle">
                    VS
                  </span>

                  <span className="score-current-game">
                    {isKnockout
                      ? `Game ${state.currentGame} of ${bestOf}`
                      : "Single game"}
                  </span>

                  <div className="score-set-progress">
                    {Array.from({ length: bestOf }, (_, index) => index + 1).map((game) => {
                      const completed =
                        state.gameScores.find(
                          (item) =>
                            item.game === game
                        );

                      const active =
                        game === state.currentGame &&
                        !state.matchComplete;

                      return (
                        <div
                          key={game}
                          className={`score-set-dot ${
                            completed
                              ? "done"
                              : ""
                          } ${
                            active
                              ? "active"
                              : ""
                          }`}
                        >
                          {completed
                            ? `${completed.a}-${completed.b}`
                            : `G${game}`}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="score-team">
                  <div className="score-team-side right">
                    <span className="score-team-tag">
                      SIDE B
                    </span>

                    <h2>{teamB}</h2>

                    {state.server === 2 && (
                      <span className="score-server-pill">
                        <Zap size={13} />
                        Serving
                      </span>
                    )}
                  </div>

                  <div className="score-number">
                    {state.currentScoreB}
                  </div>

                  <div className="score-point-actions">
                    <button
                      type="button"
                      className="score-point-btn plus"
                      onClick={() =>
                        handlePoint(2)
                      }
                      disabled={
                        saving ||
                        state.locked ||
                        state.matchComplete
                      }
                    >
                      <Plus size={23} />
                      <span>Point</span>
                    </button>

                    <button
                      type="button"
                      className="score-point-btn minus"
                      onClick={undoPoint}
                      disabled={
                        !state.undoStack.length ||
                        saving
                      }
                      aria-label="Undo last rally"
                    >
                      <Undo2 size={18} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="score-rule-banner">
                <div>
                  <strong>
                    {isKnockout
                      ? "Badminton 21-point scoring"
                      : "Pool / Super 8 scoring"}
                    </strong>
                  <span>
                    {isKnockout
                      ? "At 20–20, continue until a 2-point lead. At 29–29, the next point wins."
                      : "7–0 wins immediately. Any other score continues to 21; at 20–20, win by 2. At 29–29, the next point wins."}
                  </span>
                </div>

                <span className="score-rule-chip">
                  First to 2 games
                </span>
              </div>
            </div>

            <section className="score-history-card">
              <div className="score-history-head">
                <div>
                  <span>
                    MATCH SCORECARD
                  </span>
                  <h3>
                    Game-by-game result
                  </h3>
                </div>

                <div className="score-history-actions">
                  <button
                    type="button"
                    className="score-secondary-btn"
                    onClick={resetCurrentGame}
                    disabled={
                      saving ||
                      state.matchComplete
                    }
                  >
                    <RotateCcw size={14} />
                    Reset game
                  </button>

                  {isKnockout &&
                    state.locked &&
                    !state.matchComplete && (
                      <button
                        type="button"
                        className="score-primary-btn"
                        onClick={startNextGame}
                      >
                        Start Game{" "}
                        {state.currentGame + 1}
                      </button>
                    )}
                </div>
              </div>

              <div className="score-history-table">
                <div className="score-history-row header">
                  <span>Game</span>
                  <span>{teamA}</span>
                  <span>{teamB}</span>
                  <span>Status</span>
                </div>

                {Array.from({ length: bestOf }, (_, index) => index + 1).map((game) => {
                  const row =
                    state.gameScores.find(
                      (item) =>
                        item.game === game
                    );

                  const isCurrent =
                    game ===
                    state.currentGame;

                  return (
                    <div
                      className={`score-history-row ${
                        isCurrent
                          ? "current"
                          : ""
                      }`}
                      key={game}
                    >
                      <span>
                        Game {game}
                      </span>

                      <strong>
                        {row?.a ?? "—"}
                      </strong>

                      <strong>
                        {row?.b ?? "—"}
                      </strong>

                      <span>
                        {row
                          ? row.a > row.b
                            ? `${teamA} won`
                            : `${teamB} won`
                          : isCurrent
                            ? "In progress"
                            : "Not played"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            {state.matchComplete && (
              <section className="score-winner-card">
                <div className="score-winner-icon">
                  <Trophy size={26} />
                </div>

                <div>
                  <span>FINAL RESULT</span>
                  <h2>
                    {state.gamesWonA >=
                    gamesToWin
                      ? teamA
                      : teamB}
                  </h2>
                  <p>
                    Match won{" "}
                    {Math.max(
                      state.gamesWonA,
                      state.gamesWonB
                    )}
                    -
                    {Math.min(
                      state.gamesWonA,
                      state.gamesWonB
                    )}
                  </p>
                </div>

                <CheckCircle2
                  size={28}
                  className="score-winner-check"
                />
              </section>
            )}

            <footer className="score-console-footer">
              <div className="score-footer-info">
                <span>
                  <Wifi size={14} />
                  Live updates enabled
                </span>
                <span>
                  <CheckCircle2 size={14} />
                  Scores are saved automatically
                </span>
              </div>

              <button
                type="button"
                className="score-secondary-btn"
                onClick={backToFixtures}
              >
                Back to fixtures
              </button>
            </footer>
          </section>
        </div>
      </main>
    </div>
  );
}