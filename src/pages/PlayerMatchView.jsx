import { useEffect, useMemo, useState } from "react";
import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import {
  ArrowLeft,
  RefreshCw,
  Trophy,
  Wifi,
  Clock3,
} from "lucide-react";

import { apiRequest } from "../services/api";

import "./StatsDashboard.css";

export default function PlayerMatchView() {
  const navigate = useNavigate();

  const [searchParams] =
    useSearchParams();

  const fixtureId =
    searchParams.get("fixtureId");

  const tournamentId =
    searchParams.get("tournamentId");

  const [fixture, setFixture] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [refreshing, setRefreshing] =
    useState(false);

  // =====================================================
  // LOAD FIXTURE
  // =====================================================

  async function loadFixture(
    showFullLoader = true
  ) {
    try {
      if (!fixtureId || !tournamentId) {
        setError(
          "Missing fixture or tournament information."
        );
        setLoading(false);
        return;
      }

      if (showFullLoader) {
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
        "Load Player Match Error:",
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
  }

  useEffect(() => {
    loadFixture(true);
  }, [fixtureId, tournamentId]);

  // =====================================================
  // MATCH DATA
  // =====================================================

  const sideA = useMemo(() => {
    if (!fixture) {
      return "Team A";
    }

    return (
      fixture.team_a_name ||
      fixture.player_a_name ||
      "Team A"
    );
  }, [fixture]);

  const sideB = useMemo(() => {
    if (!fixture) {
      return "Team B";
    }

    return (
      fixture.team_b_name ||
      fixture.player_b_name ||
      "Team B"
    );
  }, [fixture]);

  const scoreA =
    Number(
      fixture?.player_a_score
    ) || 0;

  const scoreB =
    Number(
      fixture?.player_b_score
    ) || 0;

  const status =
    String(
      fixture?.status ||
        "Scheduled"
    ).toLowerCase();

  const isLive =
    status === "live";

  const isCompleted =
    status === "completed";

  const winnerName = useMemo(() => {
    if (!fixture) {
      return null;
    }

    if (
      fixture.winner_team_id &&
      fixture.team_a_id &&
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
      fixture.winner_team_id &&
      fixture.team_b_id &&
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
      fixture.winner_player_id &&
      fixture.player_a_id &&
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
      fixture.winner_player_id &&
      fixture.player_b_id &&
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
  }, [
    fixture,
    sideA,
    sideB,
  ]);

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="stat-shell">
        <main
          className="stat-main"
          style={{
            marginLeft: 0,
            width: "100%",
          }}
        >
          <div
            className="stat-panel"
            style={{
              padding: 50,
              textAlign: "center",
            }}
          >
            <RefreshCw
              size={28}
              className="live-pulsing-dot"
            />

            <h3>
              Loading match...
            </h3>

            <p>
              Getting the latest score.
            </p>
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
      <div className="stat-shell">
        <main
          className="stat-main"
          style={{
            marginLeft: 0,
            width: "100%",
          }}
        >
          <div
            className="stat-panel"
            style={{
              maxWidth: 700,
              margin: "60px auto",
              padding: 40,
            }}
          >
            <h2>
              Unable to open match
            </h2>

            <p>
              {error ||
                "Match not found."}
            </p>

            <button
              type="button"
              className="stat-banner-btn"
              onClick={() =>
                navigate(-1)
              }
            >
              <ArrowLeft
                size={16}
              />
              Back to My Matches
            </button>
          </div>
        </main>
      </div>
    );
  }

  // =====================================================
  // MAIN VIEW
  // =====================================================

  return (
    <div className="stat-shell">

      <main
        className="stat-main"
        style={{
          marginLeft: 0,
          width: "100%",
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >

        {/* HEADER */}

        <div
          style={{
            display: "flex",
            alignItems:
              "center",
            justifyContent:
              "space-between",
            gap: 20,
            marginBottom: 24,
          }}
        >
          <button
            type="button"
            className="stat-banner-btn"
            onClick={() =>
              navigate(-1)
            }
          >
            <ArrowLeft
              size={16}
            />
            Back to My Matches
          </button>

          <button
            type="button"
            className="stat-banner-btn"
            onClick={() =>
              loadFixture(false)
            }
            disabled={refreshing}
          >
            <RefreshCw
              size={16}
              className={
                refreshing
                  ? "live-pulsing-dot"
                  : ""
              }
            />
            Refresh
          </button>
        </div>

        {/* TITLE */}

        <div
          style={{
            marginBottom: 24,
          }}
        >
          <div
            style={{
              color:
                "#6c3dff",
              fontWeight: 700,
              fontSize: 13,
              textTransform:
                "uppercase",
              letterSpacing:
                "0.08em",
            }}
          >
            {fixture.round ||
              "Match"}
          </div>

          <h1
            style={{
              margin:
                "6px 0",
            }}
          >
            {fixture.tournament_name ||
              fixture.tournament ||
              "Tournament"}
          </h1>

          <p>
            Match{" "}
            {fixture.match_number ||
              fixture.id}
          </p>
        </div>

        {/* STATUS */}

        <div
          className="stat-panel"
          style={{
            marginBottom: 20,
          }}
        >
          <div
            style={{
              display:
                "flex",
              justifyContent:
                "space-between",
              alignItems:
                "center",
              gap: 20,
            }}
          >
            <div>
              <strong>
                {isLive
                  ? "Match is Live"
                  : isCompleted
                  ? "Match Completed"
                  : "Match Scheduled"}
              </strong>

              <p
                style={{
                  margin:
                    "5px 0 0",
                }}
              >
                {isLive
                  ? "Live score updates are shown here."
                  : isCompleted
                  ? winnerName
                    ? `${winnerName} won the match.`
                    : "Final result available."
                  : "Match has not started yet."}
              </p>
            </div>

            <span
              className={
                isLive
                  ? "live-badge-pulse"
                  : "badge-green"
              }
            >
              {isLive
                ? "LIVE"
                : fixture.status ||
                  "Scheduled"}
            </span>
          </div>
        </div>

        {/* SCORE */}

        <div
          className="stat-panel"
          style={{
            padding:
              "40px 30px",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "1fr auto 1fr",
              alignItems:
                "center",
              gap: 30,
            }}
          >

            {/* SIDE A */}

            <div
              style={{
                textAlign:
                  "center",
              }}
            >
              <span
                style={{
                  display:
                    "block",
                  color:
                    "#8a8fa3",
                  fontSize: 13,
                  fontWeight: 700,
                  marginBottom: 8,
                }}
              >
                SIDE A
              </span>

              <h2
                style={{
                  margin:
                    "0 0 20px",
                  fontSize: 28,
                }}
              >
                {sideA}
              </h2>

              <div
                style={{
                  fontSize: 86,
                  lineHeight: 1,
                  fontWeight: 800,
                  color:
                    "#5f35f5",
                }}
              >
                {scoreA}
              </div>
            </div>

            {/* VS */}

            <div
              style={{
                textAlign:
                  "center",
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius:
                    "50%",
                  border:
                    "1px solid #ddd7f7",
                  display:
                    "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  fontWeight: 800,
                  color:
                    "#8a8fa3",
                  margin:
                    "0 auto 12px",
                }}
              >
                VS
              </div>

              <span
                style={{
                  color:
                    "#8a8fa3",
                  fontWeight: 600,
                }}
              >
                {fixture.format ||
                  "Match"}
              </span>
            </div>

            {/* SIDE B */}

            <div
              style={{
                textAlign:
                  "center",
              }}
            >
              <span
                style={{
                  display:
                    "block",
                  color:
                    "#8a8fa3",
                  fontSize: 13,
                  fontWeight: 700,
                  marginBottom: 8,
                }}
              >
                SIDE B
              </span>

              <h2
                style={{
                  margin:
                    "0 0 20px",
                  fontSize: 28,
                }}
              >
                {sideB}
              </h2>

              <div
                style={{
                  fontSize: 86,
                  lineHeight: 1,
                  fontWeight: 800,
                  color:
                    "#5f35f5",
                }}
              >
                {scoreB}
              </div>
            </div>

          </div>
        </div>

        {/* RESULT */}

        {isCompleted && (
          <div
            style={{
              padding:
                "20px 24px",
              border:
                "1px solid #d7f1e2",
              background:
                "#f0fff7",
              borderRadius:
                16,
              marginBottom: 20,
              display:
                "flex",
              alignItems:
                "center",
              gap: 12,
            }}
          >
            <Trophy
              size={22}
              color="#16a267"
            />

            <div>
              <strong>
                Match Result
              </strong>

              <p
                style={{
                  margin:
                    "3px 0 0",
                }}
              >
                {winnerName
                  ? `${winnerName} wins`
                  : "Winner not declared"}
              </p>
            </div>
          </div>
        )}

        {/* MATCH INFORMATION */}

        <div
          className="stat-panel"
        >
          <h4
            style={{
              marginBottom:
                20,
            }}
          >
            Match Information
          </h4>

          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(3, 1fr)",
              gap: 20,
            }}
          >
            <div>
              <span
                style={{
                  color:
                    "#8a8fa3",
                  fontSize:
                    12,
                }}
              >
                Tournament
              </span>

              <strong
                style={{
                  display:
                    "block",
                  marginTop:
                    4,
                }}
              >
                {fixture.tournament_name ||
                  "Tournament"}
              </strong>
            </div>

            <div>
              <span
                style={{
                  color:
                    "#8a8fa3",
                  fontSize:
                    12,
                }}
              >
                Round
              </span>

              <strong
                style={{
                  display:
                    "block",
                  marginTop:
                    4,
                }}
              >
                {fixture.round ||
                  "Group Stage"}
              </strong>
            </div>

            <div>
              <span
                style={{
                  color:
                    "#8a8fa3",
                  fontSize:
                    12,
                }}
              >
                Sync
              </span>

              <strong
                style={{
                  display:
                    "flex",
                  alignItems:
                    "center",
                  gap: 5,
                  marginTop:
                    4,
                  color:
                    "#16a267",
                }}
              >
                <Wifi size={14} />
                Synced
              </strong>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}