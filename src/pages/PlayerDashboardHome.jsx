import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";

import {
  Trophy,
  Swords,
  Target,
  Medal,
  Radio,
  CalendarDays,
  Users,
  RefreshCw,
} from "lucide-react";

import PlayerSidebar from "../components/PlayerSidebar";
import { apiRequest } from "../services/api";
import { setRole } from "../utils/auth";
import { io } from "socket.io-client";

import "./StatsDashboard.css";

const EMPTY_STATS = {
  tournamentsPlayed: 0,
  matchesPlayed: 0,
  wins: 0,
  losses: 0,
  winRate: 0,
  championships: 0,
};


function getSocketUrl() {
  const configured =
    import.meta.env.VITE_SOCKET_URL ||
    import.meta.env.VITE_API_URL ||
    "http://localhost:5000/api";

  return configured.replace(/\/api\/?$/, "");
}

function getFixtureFromSocketPayload(payload) {
  return (
    payload?.fixture ||
    payload?.match ||
    payload?.data?.fixture ||
    payload?.data?.match ||
    payload?.data ||
    payload
  );
}

export default function PlayerDashboardHome() {
  const navigate = useNavigate();
  const socketRef = useRef(null);

  // =====================================================
  // USER
  // =====================================================

  const storedUser =
    localStorage.getItem("matcho_user");

  let localUser = null;

  try {
    localUser = storedUser
      ? JSON.parse(storedUser)
      : null;
  } catch (error) {
    console.error(
      "Unable to parse matcho_user:",
      error
    );
  }

  // =====================================================
  // STATE
  // =====================================================

  const [player, setPlayer] = useState(
    localUser || null
  );

  const [stats, setStats] =
    useState(EMPTY_STATS);

  const [tournaments, setTournaments] =
    useState([]);

  const [teams, setTeams] =
    useState([]);

  const [matches, setMatches] =
    useState([]);

  const [activeTab, setActiveTab] =
    useState("all");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  // =====================================================
  // PLAYER ROLE
  // =====================================================

  useEffect(() => {
    setRole("player");
  }, []);

  // =====================================================
  // LOAD PLAYER DASHBOARD
  // =====================================================

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

      const token =
        localStorage.getItem(
          "matcho_token"
        );

      if (!token) {
        setError(
          "Please login as a player."
        );
        return;
      }

      const result =
        await apiRequest(
          "/players/dashboard",
          {
            method: "GET",
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      if (!result?.success) {
        throw new Error(
          result?.message ||
            "Unable to load player dashboard."
        );
      }

      setPlayer(
        result.player || localUser
      );

      setStats({
        ...EMPTY_STATS,
        ...(result.stats || {}),
      });

      setTournaments(
        Array.isArray(
          result.tournaments
        )
          ? result.tournaments
          : []
      );

      setTeams(
        Array.isArray(result.teams)
          ? result.teams
          : []
      );

      setMatches(
        Array.isArray(result.matches)
          ? result.matches
          : []
      );

    } catch (err) {
      console.error(
        "Player Dashboard Error:",
        err
      );

      setError(
        err.message ||
          "Unable to load dashboard."
      );

      setStats(EMPTY_STATS);
      setTournaments([]);
      setTeams([]);
      setMatches([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  // =====================================================
  // SOCKET.IO REAL-TIME UPDATES
  // =====================================================

  useEffect(() => {
    const socket = io(getSocketUrl(), {
      transports: ["websocket", "polling"],
      withCredentials: true,
      autoConnect: true,
    });

    socketRef.current = socket;

    const joinTournamentRooms = (currentMatches) => {
      const tournamentIds = [
        ...new Set(
          (currentMatches || [])
            .map((match) => match?.tournamentId ?? match?.tournament_id)
            .filter(Boolean)
            .map(String)
        ),
      ];

      tournamentIds.forEach((tournamentId) => {
        socket.emit("join-tournament", tournamentId);
      });
    };

    const refreshDashboard = async () => {
      if (!navigator.onLine) return;

      try {
        const token = localStorage.getItem("matcho_token");
        if (!token) return;

        const result = await apiRequest("/players/dashboard", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (result?.success && Array.isArray(result.matches)) {
          setMatches(result.matches);
          joinTournamentRooms(result.matches);
        }
      } catch (error) {
        console.warn("Realtime player dashboard refresh failed:", error);
      }
    };

    const applyFixtureUpdate = (payload) => {
      const fixture = getFixtureFromSocketPayload(payload);
      if (!fixture) return;

      const fixtureId = fixture.id ?? fixture.fixtureId ?? fixture.fixture_id;
      if (!fixtureId) return;

      setMatches((previous) =>
        previous.map((match) => {
          if (String(match.id) !== String(fixtureId)) return match;

          return {
            ...match,
            status: fixture.status ?? fixture.match_status ?? match.status,
            scoreA: fixture.player_a_score ?? fixture.scoreA ?? fixture.score_a ?? match.scoreA,
            scoreB: fixture.player_b_score ?? fixture.scoreB ?? fixture.score_b ?? match.scoreB,
            winnerName: fixture.winner_name ?? fixture.winnerName ?? match.winnerName,
            winner: fixture.winner_name ?? fixture.winnerName ?? match.winner,
            round: fixture.round ?? match.round,
            matchNumber: fixture.match_number ?? fixture.matchNumber ?? match.matchNumber,
            tournamentId: fixture.tournament_id ?? fixture.tournamentId ?? match.tournamentId,
            tournament: fixture.tournament_name ?? fixture.tournament ?? match.tournament,
          };
        })
      );
    };

    const handleConnect = () => {
      console.log("🟢 Player Dashboard Socket.IO connected:", socket.id);
      joinTournamentRooms(matches);
    };

    const handleDisconnect = (reason) => {
      console.log("🟠 Player Dashboard Socket.IO disconnected:", reason);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    // Exact event emitted by the backend after PostgreSQL is updated.
    socket.on("fixture-score-updated", applyFixtureUpdate);

    const refreshInterval = window.setInterval(refreshDashboard, 10000);

    const handleOnline = () => {
      socket.connect();
      refreshDashboard();
    };

    window.addEventListener("online", handleOnline);

    return () => {
      window.clearInterval(refreshInterval);
      window.removeEventListener("online", handleOnline);
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("fixture-score-updated", applyFixtureUpdate);
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket?.connected) return;

    const tournamentIds = [
      ...new Set(
        matches
          .map((match) => match?.tournamentId ?? match?.tournament_id)
          .filter(Boolean)
          .map(String)
      ),
    ];

    tournamentIds.forEach((tournamentId) => {
      socket.emit("join-tournament", tournamentId);
    });
  }, [matches]);

  // =====================================================
  // PLAYER NAME
  // =====================================================

  const playerName =
    player?.name ||
    player?.full_name ||
    localUser?.name ||
    "Player";

  // =====================================================
  // LIVE COUNT
  // =====================================================

  const liveCount = useMemo(
    () =>
      matches.filter(
        (match) =>
          String(
            match?.status || ""
          ).toLowerCase() === "live"
      ).length,
    [matches]
  );

  // =====================================================
  // FILTER MATCHES
  // =====================================================

  const filteredMatches = useMemo(() => {
    return matches.filter((match) => {
      const status =
        String(
          match?.status || ""
        ).toLowerCase();

      if (activeTab === "live") {
        return status === "live";
      }

      if (activeTab === "upcoming") {
        return (
          status === "upcoming" ||
          status === "scheduled"
        );
      }

      if (activeTab === "completed") {
        return status === "completed";
      }

      return true;
    });
  }, [matches, activeTab]);

  // =====================================================
  // FORMAT DATE
  // =====================================================

  function formatDate(dateValue) {
    if (!dateValue) {
      return "Date not set";
    }

    const date =
      new Date(dateValue);

    if (
      Number.isNaN(date.getTime())
    ) {
      return String(dateValue);
    }

    return date.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  }

  // =====================================================
  // FORMAT TOURNAMENT STATUS
  // =====================================================

  function tournamentStatusLabel(
    status
  ) {
    if (!status) {
      return "Upcoming";
    }

    const value =
      String(status)
        .toLowerCase();

    if (value === "ongoing") {
      return "Ongoing";
    }

    if (value === "completed") {
      return "Completed";
    }

    if (value === "upcoming") {
      return "Upcoming";
    }

    return status;
  }

  // =====================================================
  // OPEN MATCH
  // ====================================================

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="stat-shell">
        <PlayerSidebar
          activeItem="Dashboard"
        />

        <main className="stat-main">
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
              Loading your dashboard...
            </h3>

            <p>
              Fetching your tournaments and
              matches.
            </p>
          </div>
        </main>
      </div>
    );
  }

  // =====================================================
  // ERROR
  // =====================================================

  if (error) {
    return (
      <div className="stat-shell">
        <PlayerSidebar
          activeItem="Dashboard"
        />

        <main className="stat-main">
          <div
            className="stat-panel"
            style={{
              padding: 40,
              textAlign: "center",
            }}
          >
            <h3>
              Unable to load dashboard
            </h3>

            <p>
              {error}
            </p>

            <button
              type="button"
              className="stat-banner-btn primary"
              onClick={loadDashboard}
            >
              Try Again
            </button>
          </div>
        </main>
      </div>
    );
  }

  // =====================================================
  // MAIN UI
  // =====================================================

  return (
    <div className="stat-shell">

      {/* ===========================================
          SIDEBAR
      ============================================ */}

      <PlayerSidebar
        activeItem="Dashboard"
      />

      {/* ===========================================
          MAIN
      ============================================ */}

      <main className="stat-main">

        {/* =========================================
            HEADER
        ========================================== */}

        <div className="dash-header-flex">
          <div>
            <h1>
              Player Dashboard
            </h1>

            <p>
              Track your tournaments,
              matches, and live scores.
            </p>
          </div>

          <button
            type="button"
            className="stat-banner-btn primary"
            onClick={() =>
              navigate(
                "/join-tournament"
              )
            }
          >
            + Join New Tournament
          </button>
        </div>

        {/* =========================================
            WELCOME
        ========================================== */}

        <div className="stat-banner">

          <div>
            <h2>
              Welcome back, {playerName}!
            </h2>

            <p>
              You have{" "}
              <strong>
                {liveCount}{" "}
                {liveCount === 1
                  ? "match"
                  : "matches"}
              </strong>{" "}
              currently LIVE.
            </p>

            
          </div>

          <div className="stat-banner-icon">
            🏸
          </div>

        </div>

        {/* =========================================
            STATS
        ========================================== */}

        <div className="stat-cards">

          <div className="stat-card">
            <div className="stat-card-icon icon-purple">
              <Trophy size={20} />
            </div>

            <div>
              <h3>
                {stats.tournamentsPlayed}
              </h3>

              <span>
                Tournaments Played
              </span>

              <br />

              <span
                style={{
                  color: "#8a8fa3",
                }}
              >
                Registered tournaments
              </span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-icon icon-green">
              <Swords size={20} />
            </div>

            <div>
              <h3>
                {stats.matchesPlayed}
              </h3>

              <span>
                Matches Played
              </span>

              <br />

              <span
                style={{
                  color: "#8a8fa3",
                }}
              >
                {stats.wins} Wins /{" "}
                {stats.losses} Losses
              </span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-icon icon-blue">
              <Target size={20} />
            </div>

            <div>
              <h3>
                {stats.winRate}%
              </h3>

              <span>
                Win Rate
              </span>

              <br />

              <span
                style={{
                  color: "#8a8fa3",
                }}
              >
                Based on completed matches
              </span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-icon icon-yellow">
              <Medal size={20} />
            </div>

            <div>
              <h3>
                {stats.championships || 0}
              </h3>

              <span>
                Championships
              </span>

              <br />

              <span
                style={{
                  color: "#8a8fa3",
                }}
              >
                Tournament wins
              </span>
            </div>
          </div>

        </div>

        {/* =========================================
            MY TOURNAMENTS
        ========================================== */}

        <div
          className="stat-panel"
          style={{
            marginBottom: 24,
          }}
        >

          <div className="stat-panel-head">
            <div className="flex-head">
              <h4>
                My Tournaments
              </h4>
            </div>
          </div>

          {tournaments.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "35px 20px",
              }}
            >
              <Trophy
                size={30}
                style={{
                  opacity: 0.45,
                  marginBottom: 10,
                }}
              />

              <h4>
                No tournaments yet
              </h4>

              <p>
                Join a tournament to see
                it here.
              </p>

              <button
                type="button"
                className="stat-banner-btn primary"
                onClick={() =>
                  navigate(
                    "/join-tournament"
                  )
                }
              >
                Join Tournament
              </button>
            </div>
          ) : (
            <div
              className="live-matches-grid"
            >
              {tournaments.map(
                (tournament) => {

                  const team =
                    teams.find(
                      (item) =>
                        String(
                          item.tournamentId
                        ) ===
                        String(
                          tournament.id
                        )
                    );

                  return (
                    <div
                      key={
                        tournament.id
                      }
                      className="live-match-card"
                    >
                      <div className="live-card-top">

                        <span className="sport-tag">
                          🏸{" "}
                          {tournament.format ||
                            "Tournament"}
                        </span>

                        <span
                          className={
                            tournamentStatusLabel(
                              tournament.status
                            ) ===
                            "Ongoing"
                              ? "live-badge-pulse"
                              : "badge-green"
                          }
                        >
                          {tournamentStatusLabel(
                            tournament.status
                          )}
                        </span>

                      </div>

                      <div
                        className="live-card-body"
                      >
                        <h3
                          style={{
                            margin:
                              "0 0 8px",
                          }}
                        >
                          {tournament.name}
                        </h3>

                        <div
                          style={{
                            display:
                              "flex",
                            flexDirection:
                              "column",
                            gap: 6,
                            color:
                              "#8a8fa3",
                            fontSize:
                              13,
                          }}
                        >
                          <span>
                            <CalendarDays
                              size={14}
                              style={{
                                marginRight: 6,
                                verticalAlign:
                                  "-2px",
                              }}
                            />
                            {formatDate(
                              tournament.startDate
                            )}
                          </span>

                          <span>
                            <Users
                              size={14}
                              style={{
                                marginRight: 6,
                                verticalAlign:
                                  "-2px",
                              }}
                            />

                            {team
                              ? team.name
                              : tournament.format ===
                                "Doubles"
                              ? "Team not created yet"
                              : "Singles"}
                          </span>
                        </div>
                      </div>

                      <div
                        className="live-card-foot"
                      >
                        <span>
                          {tournament.venue ||
                            "Venue TBA"}
                        </span>

                        <span
                          className="click-view"
                          onClick={() =>
                            document
                              .getElementById(
                                "player-matches"
                              )
                              ?.scrollIntoView({
                                behavior:
                                  "smooth",
                              })
                          }
                        >
                          View Matches →
                        </span>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}

        </div>

        {/* =========================================
            MY MATCHES
        ========================================== */}

        <div
          id="player-matches"
          className="stat-panel"
        >

          <div className="stat-panel-head">

            <div className="flex-head">
              <h4>
                My Tournament Matches
              </h4>

              {liveCount > 0 && (
                <span className="live-pill-sm">
                  <Radio
                    size={12}
                    className="live-pulsing-dot"
                  />

                  {liveCount} LIVE NOW
                </span>
              )}
            </div>

            <div className="filter-tabs-sm">

              <button
                type="button"
                className={`tab-btn ${
                  activeTab === "all"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setActiveTab("all")
                }
              >
                All
              </button>

              <button
                type="button"
                className={`tab-btn ${
                  activeTab === "live"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setActiveTab("live")
                }
              >
                Live
              </button>

              <button
                type="button"
                className={`tab-btn ${
                  activeTab === "upcoming"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setActiveTab("upcoming")
                }
              >
                Upcoming
              </button>

              <button
                type="button"
                className={`tab-btn ${
                  activeTab === "completed"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setActiveTab(
                    "completed"
                  )
                }
              >
                Completed
              </button>

            </div>
          </div>

          {/* MATCH LIST */}

          <div className="live-matches-grid">

            {filteredMatches.length === 0 ? (
              <div
                style={{
                  gridColumn:
                    "1 / -1",
                  textAlign:
                    "center",
                  padding:
                    "50px 20px",
                }}
              >
                <Swords
                  size={30}
                  style={{
                    opacity: 0.45,
                    marginBottom: 10,
                  }}
                />

                <h4>
                  No matches found
                </h4>

                <p>
                  Your tournament matches
                  will appear here once
                  fixtures are generated.
                </p>
              </div>
            ) : (
              filteredMatches.map(
                (match) => {

                  const status =
                    String(
                      match.status ||
                        ""
                    ).toLowerCase();

                  const isLive =
                    status === "live";

                  return (
                    <div
                      key={match.id}
                      className={`live-match-card ${
                        isLive
                          ? "is-live"
                          : ""
                      }`}
                    >

                      {/* TOP */}

                      <div className="live-card-top">

                        <span className="sport-tag">
                          🏸{" "}
                          {match.format ===
                          "Doubles"
                            ? "Doubles"
                            : "Singles"}
                        </span>

                        {isLive ? (
                          <span className="live-badge-pulse">
                            <Radio
                              size={10}
                              className="live-pulsing-dot"
                            />
                            LIVE
                          </span>
                        ) : (
                          <span className="badge-green">
                            {match.status}
                          </span>
                        )}

                      </div>

                      {/* TOURNAMENT */}

                      <div
                        style={{
                          padding:
                            "8px 16px 0",
                          fontSize: 12,
                          color:
                            "#8a8fa3",
                        }}
                      >
                        {match.tournament}
                      </div>

                      {/* MATCH */}

                      <div className="live-card-body">

                        <div className="team-row">
                          <span className="team-n">
                            {match.sideA}
                          </span>

                          <strong className="team-s">
                            {match.scoreA}
                          </strong>
                        </div>

                        <div className="team-row">
                          <span className="team-n">
                            {match.sideB}
                          </span>

                          <strong className="team-s">
                            {match.scoreB}
                          </strong>
                        </div>

                      </div>

                      {/* MATCH DETAILS */}

                      <div
                        style={{
                          padding:
                            "0 16px 12px",
                          fontSize: 12,
                          color:
                            "#8a8fa3",
                        }}
                      >
                        <span>
                          {match.round ||
                            "Group Stage"}

                          {match.matchNumber
                            ? ` · Match ${match.matchNumber}`
                            : ""}
                        </span>
                      </div>

                      {/* FOOTER */}

                      <div className="live-card-foot">

                        <span>
                          <span>
    {match.winnerName &&
    status === "completed"
      ? `Winner: ${match.winnerName}`
      : status === "completed"
      ? "Match completed"
      : "Match scheduled"}
  </span>
                        </span>

          

                      </div>

                    </div>
                  );
                }
              )
            )}

          </div>
        </div>

      </main>
    </div>
  );
}