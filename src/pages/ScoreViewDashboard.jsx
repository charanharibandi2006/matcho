import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ArrowLeft,
  RefreshCw,
  Trophy,
  Wifi,
  Clock3,
  Radio,
  CalendarDays,
  MapPin,
} from "lucide-react";
import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import PlayerSidebar from "../components/PlayerSidebar";
import { apiRequest } from "../services/api";

import "./ScoreViewDashboard.css";

function normalizeStatus(status) {
  return String(
    status || ""
  ).toLowerCase();
}

function getParticipantName(
  fixture,
  side
) {
  if (side === "A") {
    return (
      fixture?.team_a_name ||
      fixture?.player_a_name ||
      "TBD"
    );
  }

  return (
    fixture?.team_b_name ||
    fixture?.player_b_name ||
    "TBD"
  );
}

function getWinnerName(fixture) {
  const sideA =
    getParticipantName(
      fixture,
      "A"
    );

  const sideB =
    getParticipantName(
      fixture,
      "B"
    );

  if (
    fixture?.winner_team_id &&
    fixture?.team_a_id &&
    String(
      fixture.winner_team_id
    ) ===
      String(
        fixture.team_a_id
      )
  ) {
    return sideA;
  }

  if (
    fixture?.winner_team_id &&
    fixture?.team_b_id &&
    String(
      fixture.winner_team_id
    ) ===
      String(
        fixture.team_b_id
      )
  ) {
    return sideB;
  }

  if (
    fixture?.winner_player_id &&
    fixture?.player_a_id &&
    String(
      fixture.winner_player_id
    ) ===
      String(
        fixture.player_a_id
      )
  ) {
    return sideA;
  }

  if (
    fixture?.winner_player_id &&
    fixture?.player_b_id &&
    String(
      fixture.winner_player_id
    ) ===
      String(
        fixture.player_b_id
      )
  ) {
    return sideB;
  }

  return null;
}

function getStageLabel(fixture) {
  const stage =
    String(
      fixture?.stage || ""
    ).trim();

  const pool =
    String(
      fixture?.pool_name || ""
    ).trim();

  if (stage === "Pool") {
    return pool || "Group Stage";
  }

  return stage || "Match";
}

function getScoringRule(fixture) {
  const stage =
    String(
      fixture?.stage || ""
    ).trim();

  if (
    stage === "Semi Final" ||
    stage === "Final"
  ) {
    return {
      title:
        "Badminton 21-point scoring",
      description:
        "First to 21, win by 2. At 20–20, continue until a 2-point lead. At 29–29, the next point wins.",
      badge:
        "Best of 3 games",
    };
  }

  return {
    title:
      "Pool / Super 8 scoring",
    description:
      "7–0 wins immediately. Otherwise continue to 21; at 20–20, win by 2. At 29–29, the next point wins.",
    badge:
      "Single game",
  };
}

export default function ScoreViewDashboard() {
  const navigate =
    useNavigate();

  const [
    searchParams,
  ] = useSearchParams();

  const fixtureId =
    searchParams.get(
      "fixtureId"
    );

  const tournamentId =
    searchParams.get(
      "tournamentId"
    );

  const [
    fixture,
    setFixture,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const loadFixture = async (
    showLoader = true
  ) => {
    if (
      !fixtureId ||
      !tournamentId
    ) {
      setError(
        "Missing fixture or tournament information."
      );
      setLoading(false);
      return;
    }

    try {
      if (showLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError("");

      const result =
        await apiRequest(
          `/fixtures/${tournamentId}`,
          {
            method: "GET",
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

      setFixture(selected);
    } catch (err) {
      console.error(
        "Score viewer error:",
        err
      );

      setError(
        err.message ||
          "Unable to load match."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadFixture(true);
  }, [
    fixtureId,
    tournamentId,
  ]);

  // Automatically refresh while the match is live.
  useEffect(() => {
    if (!fixture) {
      return undefined;
    }

    if (
      normalizeStatus(
        fixture.status
      ) !== "live"
    ) {
      return undefined;
    }

    const interval =
      setInterval(() => {
        loadFixture(false);
      }, 5000);

    return () =>
      clearInterval(interval);
  }, [fixture?.status, fixtureId, tournamentId]);

  const sideA =
    useMemo(
      () =>
        getParticipantName(
          fixture,
          "A"
        ),
      [fixture]
    );

  const sideB =
    useMemo(
      () =>
        getParticipantName(
          fixture,
          "B"
        ),
      [fixture]
    );

  const scoreA =
    Number(
      fixture?.player_a_score
    ) || 0;

  const scoreB =
    Number(
      fixture?.player_b_score
    ) || 0;

  const status =
    normalizeStatus(
      fixture?.status
    );

  const isLive =
    status === "live";

  const isCompleted =
    status === "completed";

  const winnerName =
    getWinnerName(
      fixture
    );

  const scoringRule =
    getScoringRule(
      fixture
    );

  const tournamentName =
    fixture?.tournament_name ||
    fixture?.tournament ||
    "Tournament";

  const stageLabel =
    getStageLabel(
      fixture
    );

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="score-view-page">

        <PlayerSidebar />

        <main className="score-view-main">

          <div className="score-view-content">

            <section className="score-view-loading">
              <RefreshCw
                size={30}
                className="score-view-spin"
              />

              <h2>
                Loading match...
              </h2>

              <p>
                Getting the latest
                score.
              </p>
            </section>

          </div>

        </main>

      </div>
    );
  }

  // =====================================================
  // ERROR
  // =====================================================

  if (error || !fixture) {
    return (
      <div className="score-view-page">

        <PlayerSidebar />

        <main className="score-view-main">

          <div className="score-view-content">

            <section className="score-view-error">

              <div className="score-view-error-icon">
                <Radio size={24} />
              </div>

              <h2>
                Unable to open match
              </h2>

              <p>
                {error ||
                  "Match not found."}
              </p>

              <button
                type="button"
                className="score-view-secondary-btn"
                onClick={() =>
                  navigate(-1)
                }
              >
                <ArrowLeft
                  size={16}
                />
                Back
              </button>

            </section>

          </div>

        </main>

      </div>
    );
  }

  return (
    <div className="score-view-page">

      <PlayerSidebar />

      <main className="score-view-main">

        <div className="score-view-content">

          {/* ==========================================
              HEADER
          =========================================== */}

          <header className="score-view-header">

            <div className="score-view-header-left">

              <button
                type="button"
                className="score-view-back-btn"
                onClick={() =>
                  navigate(-1)
                }
                aria-label="Back"
              >
                <ArrowLeft
                  size={18}
                />
              </button>

              <div>
                <span className="score-view-kicker">
                  {stageLabel}
                </span>

                <h1>
                  {fixture?.pool_name
                    ? `${fixture.pool_name} · Match ${fixture.match_number}`
                    : `Match ${fixture.match_number || fixture.id}`}
                </h1>

                <div className="score-view-meta">

                  <span>
                    <Clock3
                      size={14}
                    />
                    Score Viewer
                  </span>

                  <span>
                    <Trophy
                      size={14}
                    />
                    {scoringRule.badge}
                  </span>

                  <span>
                    <Wifi
                      size={14}
                    />
                    Auto synced
                  </span>

                </div>

              </div>

            </div>

            <div className="score-view-header-actions">

              <span
                className={
                  isLive
                    ? "score-view-status live"
                    : isCompleted
                    ? "score-view-status completed"
                    : "score-view-status scheduled"
                }
              >
                <span className="score-view-status-dot" />

                {isLive
                  ? "LIVE"
                  : isCompleted
                  ? "COMPLETED"
                  : "UPCOMING"}
              </span>

              <button
                type="button"
                className="score-view-refresh"
                onClick={() =>
                  loadFixture(false)
                }
                disabled={
                  refreshing
                }
              >
                <RefreshCw
                  size={15}
                  className={
                    refreshing
                      ? "score-view-spin"
                      : ""
                  }
                />

                Refresh
              </button>

            </div>

          </header>

          {/* ==========================================
              LIVE NOTICE
          =========================================== */}

          {isLive && (
            <div className="score-view-live-notice">
              <span className="score-view-live-pulse" />

              <div>
                <strong>
                  Live score
                </strong>

                <p>
                  This page automatically
                  refreshes every 5 seconds.
                </p>
              </div>
            </div>
          )}

          {/* ==========================================
              SCORE CARD
          =========================================== */}

          <section className="score-view-board">

            <div className="score-view-board-top">

              <div>
                <span>
                  {isCompleted
                    ? "FINAL RESULT"
                    : isLive
                    ? "CURRENT SCORE"
                    : "UPCOMING MATCH"}
                </span>

                <strong>
                  {fixture.round ||
                    "Pool Match"}
                </strong>
              </div>

              <div className="score-view-match-number">
                Match{" "}
                {fixture.match_number ||
                  fixture.id}
              </div>

            </div>

            <div className="score-view-scoreboard">

              {/* SIDE A */}

              <div className="score-view-team">

                <span className="score-view-side">
                  SIDE A
                </span>

                <h2>
                  {sideA}
                </h2>

                <div className="score-view-score">
                  {scoreA}
                </div>

                {winnerName ===
                  sideA && (
                  <span className="score-view-winner-pill">
                    <Trophy
                      size={13}
                    />
                    Winner
                  </span>
                )}

              </div>

              {/* VS */}

              <div className="score-view-vs">

                <div className="score-view-vs-circle">
                  VS
                </div>

                <span>
                  {isLive
                    ? "LIVE"
                    : fixture.status ||
                      "Scheduled"}
                </span>

              </div>

              {/* SIDE B */}

              <div className="score-view-team">

                <span className="score-view-side">
                  SIDE B
                </span>

                <h2>
                  {sideB}
                </h2>

                <div className="score-view-score">
                  {scoreB}
                </div>

                {winnerName ===
                  sideB && (
                  <span className="score-view-winner-pill">
                    <Trophy
                      size={13}
                    />
                    Winner
                  </span>
                )}

              </div>

            </div>

          </section>

          {/* ==========================================
              WINNER
          =========================================== */}

          {isCompleted && (
            <section className="score-view-winner-card">

              <div className="score-view-winner-icon">
                <Trophy
                  size={22}
                />
              </div>

              <div>
                <span>
                  MATCH WINNER
                </span>

                <h2>
                  {winnerName ||
                    "Winner not declared"}
                </h2>

                <p>
                  Final score:{" "}
                  {scoreA} -{" "}
                  {scoreB}
                </p>
              </div>

            </section>
          )}

          {/* ==========================================
              SCORING RULE
          =========================================== */}

          <section className="score-view-rule-card">

            <div>

              <strong>
                {scoringRule.title}
              </strong>

              <p>
                {scoringRule.description}
              </p>

            </div>

            <span>
              {scoringRule.badge}
            </span>

          </section>

          {/* ==========================================
              MATCH INFORMATION
          =========================================== */}

          <section className="score-view-info-card">

            <div className="score-view-section-title">
              <div>
                <span>
                  MATCH INFORMATION
                </span>

                <h3>
                  {tournamentName}
                </h3>
              </div>
            </div>

            <div className="score-view-info-grid">

              <div className="score-view-info-item">
                <span>
                  Stage
                </span>

                <strong>
                  {stageLabel}
                </strong>
              </div>

              <div className="score-view-info-item">
                <span>
                  Match
                </span>

                <strong>
                  #{fixture.match_number ||
                    fixture.id}
                </strong>
              </div>

              <div className="score-view-info-item">
                <span>
                  Format
                </span>

                <strong>
                  {fixture.format ||
                    "Singles / Doubles"}
                </strong>
              </div>

              <div className="score-view-info-item">
                <span>
                  Status
                </span>

                <strong>
                  {fixture.status ||
                    "Upcoming"}
                </strong>
              </div>

              {fixture.venue && (
                <div className="score-view-info-item">
                  <span>
                    Venue
                  </span>

                  <strong>
                    <MapPin
                      size={14}
                    />
                    {fixture.venue}
                  </strong>
                </div>
              )}

              {fixture.start_date && (
                <div className="score-view-info-item">
                  <span>
                    Date
                  </span>

                  <strong>
                    <CalendarDays
                      size={14}
                    />
                    {new Date(
                      fixture.start_date
                    ).toLocaleDateString(
                      "en-IN"
                    )}
                  </strong>
                </div>
              )}

            </div>

          </section>

          {/* ==========================================
              VIEWER NOTICE
          =========================================== */}

          <div className="score-view-readonly">
            <Wifi size={16} />

            <span>
              View-only score dashboard.
              Match scores can only be
              updated by the authorized
              tournament scorer.
            </span>
          </div>

        </div>

      </main>

    </div>
  );
}