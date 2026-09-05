import { socket } from "../services/socket";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Bell,
  CalendarDays,
  Radio,
  Trophy,
   ShieldCheck,
  RefreshCw,
  ChevronDown,
  Search,
} from "lucide-react";

import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import Scoreboardsidebar from "../components/Scoreboardsidebar";
import { apiRequest } from "../services/api";
import { setRole } from "../utils/auth";
import ghbpllogo from "../assets/images/ghbpl.jpeg";

import "./StatsDashboard.css";
import "./ScoreboardDashboard.css";

/*
 * IMPORTANT:
 * This imports the same tournament CSS system used by the
 * Organizer Tournament page.
 *
 * If TournamentManagement.css is already imported globally,
 * this import can be removed.
 */
import "./TournamentManagement.css";

// =========================================================
// STATUS HELPERS
// =========================================================

function normalizeStatus(status) {
  return String(status || "")
    .trim()
    .toLowerCase();
}

function getStatus(status) {
  const value = normalizeStatus(status);

  if (value === "live") {
    return "LIVE";
  }

  if (value === "completed") {
    return "COMPLETED";
  }

  return "UPCOMING";
}

// =========================================================
// PARTICIPANT HELPERS
// =========================================================

function getParticipantName(fixture, side) {
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

function getParticipantId(fixture, side) {
  if (side === "A") {
    return (
      fixture?.team_a_id ||
      fixture?.player_a_id ||
      fixture?.team_a_name ||
      fixture?.player_a_name ||
      "A"
    );
  }

  return (
    fixture?.team_b_id ||
    fixture?.player_b_id ||
    fixture?.team_b_name ||
    fixture?.player_b_name ||
    "B"
  );
}

function isDoublesFixture(fixture) {
  return Boolean(
    fixture?.team_a_id ||
    fixture?.team_b_id ||
    (Array.isArray(fixture?.team_a_members) &&
      fixture.team_a_members.length > 0) ||
    (Array.isArray(fixture?.team_b_members) &&
      fixture.team_b_members.length > 0)
  );
}

function getTeamMembers(fixture, side) {
  const members =
    side === "A"
      ? fixture?.team_a_members
      : fixture?.team_b_members;

  if (!Array.isArray(members)) {
    return [];
  }

  return members
    .map((member, index) => ({
      id:
        member?.id ??
        member?.player_id ??
        member?.participant_id ??
        `${side}-${index}-${member?.name || member?.full_name || member?.participant_name || "player"}`,
      name:
        member?.name ||
        member?.full_name ||
        member?.participant_name ||
        member?.player?.name ||
        member?.participant?.name ||
        "Player",
    }))
    .filter((member) => member.name && member.name !== "Player");
}

function getWinnerName(fixture) {
  const sideA =
    getParticipantName(fixture, "A");

  const sideB =
    getParticipantName(fixture, "B");

  if (
    fixture?.winner_team_id &&
    fixture?.team_a_id &&
    String(fixture.winner_team_id) ===
      String(fixture.team_a_id)
  ) {
    return sideA;
  }

  if (
    fixture?.winner_team_id &&
    fixture?.team_b_id &&
    String(fixture.winner_team_id) ===
      String(fixture.team_b_id)
  ) {
    return sideB;
  }

  if (
    fixture?.winner_player_id &&
    fixture?.player_a_id &&
    String(fixture.winner_player_id) ===
      String(fixture.player_a_id)
  ) {
    return sideA;
  }

  if (
    fixture?.winner_player_id &&
    fixture?.player_b_id &&
    String(fixture.winner_player_id) ===
      String(fixture.player_b_id)
  ) {
    return sideB;
  }

  return null;
}

function getWinnerSide(fixture) {
  const winnerName =
    getWinnerName(fixture);

  const sideA =
    getParticipantName(fixture, "A");

  const sideB =
    getParticipantName(fixture, "B");

  if (!winnerName) {
    return null;
  }

  if (winnerName === sideA) {
    return "A";
  }

  if (winnerName === sideB) {
    return "B";
  }

  return null;
}

function getSportIcon() {
  return ghbpllogo;
}

function getStageLabel(fixture) {
  if (fixture?.pool_name) {
    return fixture.pool_name;
  }

  if (fixture?.stage === "Pool") {
    return "Group Stage";
  }

  return fixture?.stage || "Match";
}

// =========================================================
// DATE HELPERS
// =========================================================

function formatTournamentDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "short",
    }
  );
}

// =========================================================
// ROUND HELPERS
// =========================================================

function normalizeStage(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function matchesStage(
  fixture,
  filter
) {
  const stage =
    normalizeStage(
      fixture?.stage
    );

  const round =
    normalizeStage(
      fixture?.round
    );

  if (filter === "group") {
    return (
      stage === "pool" ||
      stage === "group" ||
      Boolean(fixture?.pool_name)
    );
  }

  if (filter === "super8") {
    return (
      stage === "super 8" ||
      stage === "super8" ||
      round === "super 8" ||
      round === "super8"
    );
  }

  if (filter === "semi") {
    return (
      stage === "semi" ||
      stage === "semi final" ||
      stage === "semi-final" ||
      round === "semi" ||
      round === "semi final" ||
      round === "semi-final"
    );
  }

  if (filter === "final") {
    return (
      stage === "final" ||
      round === "final"
    );
  }

  return true;
}

// =========================================================
// MATCH CARD
// =========================================================

function MatchCard({
  match,
  onOpenScore,
}) {
  const isDoubles = Boolean(
    match?.isDoubles
  );

  const membersA =
    Array.isArray(match?.player1?.members)
      ? match.player1.members
      : [];

  const membersB =
    Array.isArray(match?.player2?.members)
      ? match.player2.members
      : [];

  return (
    <article
      className={`live-match-card scoreboard-match-card ${
        match.status === "LIVE"
          ? "is-live"
          : ""
      }`}
    >
     <div className="live-card-top">
  <span className="scoreboard-match-tournament">
    {match.tournament}
  </span>

  <span
    className={
      match.status === "LIVE"
        ? "live-badge-pulse"
        : match.status === "UPCOMING"
          ? "upcoming-badge"
          : "badge-green"
    }
  >
    {match.status}
  </span>
</div>

      <p className="score-match-meta">
        {match.pool
          ? `${match.pool} · `
          : ""}
        {match.tournament}

        {match.round
          ? ` · ${match.round}`
          : ""}
      </p>

      <div className="score-match-score">

        <div className="score-match-side score-match-side-left">
          <strong className="score-match-team-name">
            {match.player1.name}
          </strong>

          {match.player1.members?.length > 0 && (
            <div className="score-match-members">
              {match.player1.members.map((member) => (
                <span key={member.id}>
                  {member.name}
                </span>
              ))}
            </div>
          )}

          {match.status === "LIVE" &&
            match.servingSide === "A" && (
              <span className="score-serving">
                ⚡ Serving
              </span>
            )}
        </div>

        <span className="score-match-center-score">
          {match.player1.score}
        </span>

        <span className="score-match-vs">
          VS
        </span>

        <span className="score-match-center-score">
          {match.player2.score}
        </span>

        <div className="score-match-side score-match-side-right">
          <strong className="score-match-team-name">
            {match.player2.name}
          </strong>

          {match.player2.members?.length > 0 && (
            <div className="score-match-members score-match-members-right">
              {match.player2.members.map((member) => (
                <span key={member.id}>
                  {member.name}
                </span>
              ))}
            </div>
          )}

          {match.status === "LIVE" &&
            match.servingSide === "B" && (
              <span className="score-serving">
                ⚡ Serving
              </span>
            )}
        </div>

      </div>

      {(match.stage === "Semi Final" ||
        match.stage === "Final") &&
        match.gameScores?.length > 0 && (
          <div className="score-match-game-scores">
            <div className="score-match-game-list">
              {match.gameScores.map((game) => (
                <span
                  key={`game-${game.game}`}
                  className="score-match-game-item"
                >
                  G{game.game}{" "}
                  <strong>
                    {game.a}–{game.b}
                  </strong>
                </span>
              ))}
            </div>

            <div className="score-match-sets">
              Sets:{" "}
              {match.gameScores.filter(
                (game) =>
                  Number(game?.a) >
                  Number(game?.b)
              ).length}
              –
              {match.gameScores.filter(
                (game) =>
                  Number(game?.b) >
                  Number(game?.a)
              ).length}
            </div>
          </div>
        )}

      <div className="live-card-foot">
        <span>
          Match{" "}
          {match.matchNumber}
        </span>

      </div>

      {match.status ===
        "COMPLETED" &&
        match.winnerName && (
          <div className="score-match-winner">
            Winner:{" "}
            {match.winnerName}
          </div>
        )}
    </article>
  );
}

// =========================================================
// MAIN COMPONENT
// =========================================================

export default function ScoreboardDashboard() {
  const navigate =
    useNavigate();

  const [
    searchParams,
  ] = useSearchParams();

  const activeSection =
    searchParams.get(
      "section"
    ) || "overview";

  const [
    tournaments,
    setTournaments,
  ] = useState([]);

  const [
    matches,
    setMatches,
  ] = useState([]);

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

  const [
    activeTab,
    setActiveTab,
  ] = useState("all");

  const [matchSearch, setMatchSearch] =
  useState("");

  const [
    selectedTournament,
    setSelectedTournament,
  ] = useState("all");

  const [
    showAllMatches,
    setShowAllMatches,
  ] = useState(false);

  const [
    fixtureFilter,
    setFixtureFilter,
  ] = useState("all");

  // =======================================================
  // ROLE
  // =======================================================

  useEffect(() => {
    setRole("score-viewing");
  }, []);

  // =======================================================
  // LOAD REAL TOURNAMENTS + FIXTURES
  // =======================================================

  async function loadDashboard(
    showLoader = true
  ) {
    try {
      if (showLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError("");

      const tournamentResponse =
        await apiRequest(
          "/tournaments",
          {
            method: "GET",
          }
        );

      const tournamentRows =
        Array.isArray(
          tournamentResponse?.tournaments
        )
          ? tournamentResponse.tournaments
          : Array.isArray(
              tournamentResponse?.data
            )
          ? tournamentResponse.data
          : [];

      setTournaments(
        tournamentRows
      );

      if (
        tournamentRows.length ===
        0
      ) {
        setMatches([]);
        return;
      }

      const fixtureResponses =
        await Promise.all(
          tournamentRows.map(
            async (tournament) => {
              try {
                const [fixtureResponse, teamResponse] =
                  await Promise.all([
                    apiRequest(
                      `/fixtures/${tournament.id}`,
                      {
                        method: "GET",
                      }
                    ),
                    apiRequest(
                      `/tournaments/${tournament.id}/teams`,
                      {
                        method: "GET",
                      }
                    ).catch(() => null),
                  ]);

                const rows =
                  Array.isArray(
                    fixtureResponse?.fixtures
                  )
                    ? fixtureResponse.fixtures
                    : [];

                const teamRows =
                  Array.isArray(
                    teamResponse?.teams
                  )
                    ? teamResponse.teams
                    : Array.isArray(
                        teamResponse?.data
                      )
                      ? teamResponse.data
                      : [];

                const teamMap =
                  new Map(
                    teamRows.map(
                      (team) => [
                        String(team.id),
                        team,
                      ]
                    )
                  );

                const getTeamMembersFromResponse =
                  (team) => {
                    if (!team) {
                      return [];
                    }

                    const members =
                      Array.isArray(team.players)
                        ? team.players
                        : Array.isArray(team.members)
                          ? team.members
                          : Array.isArray(team.participants)
                            ? team.participants
                            : Array.isArray(team.team_members)
                              ? team.team_members
                              : [
                                  team.player1,
                                  team.player2,
                                  team.player_a,
                                  team.player_b,
                                  team.member1,
                                  team.member2,
                                ].filter(Boolean);

                    return members
                      .map(
                        (member, index) => ({
                          id:
                            member?.id ??
                            member?.player_id ??
                            member?.participant_id ??
                            `${team.id}-${index}`,
                          name:
                            member?.name ||
                            member?.full_name ||
                            member?.participant_name ||
                            member?.player?.name ||
                            member?.participant?.name ||
                            "",
                        })
                      )
                      .filter(
                        (member) =>
                          member.name
                      );
                  };

                return rows.map(
                  (fixture) => {
                    const teamA =
                      teamMap.get(
                        String(
                          fixture.team_a_id
                        )
                      ) ||
                      teamRows.find(
                        (team) =>
                          String(
                            team?.name ||
                            team?.team_name ||
                            ""
                          ).trim().toLowerCase() ===
                          String(
                            fixture?.team_a_name ||
                            fixture?.player_a_name ||
                            ""
                          ).trim().toLowerCase()
                      );

                    const teamB =
                      teamMap.get(
                        String(
                          fixture.team_b_id
                        )
                      ) ||
                      teamRows.find(
                        (team) =>
                          String(
                            team?.name ||
                            team?.team_name ||
                            ""
                          ).trim().toLowerCase() ===
                          String(
                            fixture?.team_b_name ||
                            fixture?.player_b_name ||
                            ""
                          ).trim().toLowerCase()
                      );

                    const existingA =
                      Array.isArray(
                        fixture.team_a_members
                      )
                        ? fixture.team_a_members
                        : [];

                    const existingB =
                      Array.isArray(
                        fixture.team_b_members
                      )
                        ? fixture.team_b_members
                        : [];

                    return {
                      ...fixture,

                      team_a_id:
                        fixture.team_a_id ||
                        teamA?.id ||
                        null,

                      team_b_id:
                        fixture.team_b_id ||
                        teamB?.id ||
                        null,

                      team_a_members:
                        existingA.length > 0
                          ? existingA
                          : getTeamMembersFromResponse(
                              teamA
                            ),

                      team_b_members:
                        existingB.length > 0
                          ? existingB
                          : getTeamMembersFromResponse(
                              teamB
                            ),

                      tournament_id:
                        fixture.tournament_id ||
                        tournament.id,

                      tournament_name:
                        fixture.tournament_name ||
                        tournament.name,

                      tournament_format:
                        fixture.tournament_format ||
                        tournament.format,

                      tournament_venue:
                        fixture.venue ||
                        tournament.venue,

                      tournament_start_date:
                        tournament.start_date,
                    };
                  }
                );
              } catch (fixtureError) {
                console.error(
                  `Unable to load fixtures for tournament ${tournament.id}:`,
                  fixtureError
                );

                return [];
              }
            }
          )
        );

      setMatches(
        fixtureResponses.flat()
      );
    } catch (err) {
      console.error(
        "Scoreboard Dashboard Error:",
        err
      );

      setError(
        err.message ||
          "Unable to load scoreboard."
      );

      setMatches([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // =======================================================
  // INITIAL LOAD
  // =======================================================

  useEffect(() => {
    loadDashboard(true);
  }, []);

  // =======================================================
  // AUTO REFRESH
  // =======================================================

  useEffect(() => {
    const interval =
      setInterval(() => {
        loadDashboard(false);
      }, 10000);

    return () =>
      clearInterval(interval);
  }, []);

  // =======================================================
  // SOCKET.IO - LIVE SCORE UPDATES
  // =======================================================

  useEffect(() => {
    if (!tournaments.length) {
      return;
    }

    if (!socket.connected) {
      socket.connect();
    }

    const tournamentIds = tournaments.map(
      (tournament) =>
        String(tournament.id)
    );

    // Join every tournament room so the
    // audience dashboard can receive live
    // score changes immediately.
    tournamentIds.forEach(
      (tournamentId) => {
        socket.emit(
          "join-tournament",
          tournamentId
        );
      }
    );

    const handleScoreUpdate = (
      updatedFixture
    ) => {
      if (!updatedFixture?.id) {
        return;
      }

      setMatches(
        (currentMatches) =>
          currentMatches.map(
            (fixture) =>
              String(fixture.id) ===
              String(updatedFixture.id)
                ? {
                    ...fixture,
                    ...updatedFixture,
                  }
                : fixture
          )
      );
    };

    socket.on(
      "fixture-score-updated",
      handleScoreUpdate
    );

    return () => {
      socket.off(
        "fixture-score-updated",
        handleScoreUpdate
      );

      tournamentIds.forEach(
        (tournamentId) => {
          socket.emit(
            "leave-tournament",
            tournamentId
          );
        }
      );
    };
  }, [tournaments]);

  // =======================================================
  // SOCKET.IO CONNECTION STATUS
  // =======================================================

  useEffect(() => {
    const handleConnect = () => {
      console.log(
        "🟢 Socket.IO connected:",
        socket.id
      );
    };

    const handleDisconnect = (
      reason
    ) => {
      console.log(
        "🔴 Socket.IO disconnected:",
        reason
      );
    };

    socket.on(
      "connect",
      handleConnect
    );

    socket.on(
      "disconnect",
      handleDisconnect
    );

    return () => {
      socket.off(
        "connect",
        handleConnect
      );

      socket.off(
        "disconnect",
        handleDisconnect
      );
    };
  }, []);

  // =======================================================
  // FORMAT MATCH DATA
  // =======================================================

  const formattedMatches =
    useMemo(() => {
      return matches.map(
        (fixture) => {
          const status =
            getStatus(
              fixture.status
            );

          const tournamentId =
            fixture.tournament_id;

          return {
            ...fixture,

            id: fixture.id,

            tournamentId,

            tournament:
              fixture.tournament_name ||
              "Tournament",

            sport:
              "badminton",

            sportName:
              "Badminton",

            sportIcon:
              getSportIcon(),

            round:
              fixture.round ||
              getStageLabel(
                fixture
              ),

            stage:
              fixture.stage ||
              "Pool",

            pool:
              fixture.pool_name ||
              null,

            matchNumber:
              fixture.match_number ||
              fixture.id,

            isDoubles:
              isDoublesFixture(
                fixture
              ),

            player1: {
              id:
                getParticipantId(
                  fixture,
                  "A"
                ),

              name:
                getParticipantName(
                  fixture,
                  "A"
                ),

              members:
                getTeamMembers(
                  fixture,
                  "A"
                ),

              score:
                Number(
                  fixture.player_a_score
                ) || 0,
            },

            player2: {
              id:
                getParticipantId(
                  fixture,
                  "B"
                ),

              name:
                getParticipantName(
                  fixture,
                  "B"
                ),

              members:
                getTeamMembers(
                  fixture,
                  "B"
                ),

              score:
                Number(
                  fixture.player_b_score
                ) || 0,
            },

            winnerName:
              getWinnerName(
                fixture
              ),

            winnerSide:
              getWinnerSide(
                fixture
              ),

              servingSide:
              fixture.serving_side ||
              fixture.server_side ||
              fixture.server ||
              null,

            gameScores:
              Array.isArray(
                fixture.game_scores
              )
                ? fixture.game_scores
                : [],

            status,

            venue:
              fixture.tournament_venue ||
              "Venue TBA",

            startDate:
              fixture.tournament_start_date,
          };
        }
      );
    }, [matches]);

  // =======================================================
  // SELECTED TOURNAMENT
  // =======================================================

  const selectedTournamentData =
    useMemo(() => {
      if (
        selectedTournament ===
        "all"
      ) {
        return null;
      }

      return tournaments.find(
        (tournament) =>
          String(
            tournament.id
          ) ===
          String(
            selectedTournament
          )
      );
    }, [
      tournaments,
      selectedTournament,
    ]);

  // =======================================================
  // FILTER BY TOURNAMENT
  // =======================================================

  const tournamentMatches =
    useMemo(() => {
      if (
        selectedTournament ===
        "all"
      ) {
        return formattedMatches;
      }

      return formattedMatches.filter(
        (match) =>
          String(
            match.tournamentId
          ) ===
          String(
            selectedTournament
          )
      );
    }, [
      formattedMatches,
      selectedTournament,
    ]);

  // =======================================================
  // FILTER BY STATUS
  // =======================================================

  const matchesSearch = (match, searchValue) => {
  const search = searchValue.trim().toLowerCase();

  if (!search) return true;

  const memberNames = [
    ...(match.player1?.members || []),
    ...(match.player2?.members || []),
  ]
    .map((member) => member?.name || "")
    .join(" ");

  const text = [
    match.player1?.name,
    match.player2?.name,
    memberNames,
    match.tournament,
    match.round,
    match.stage,
    match.pool,
    String(match.matchNumber || ""),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return text.includes(search);
};

  const visibleMatches = useMemo(() => {
  let result = tournamentMatches;

  if (activeTab === "live") {
    result = result.filter(
      (match) => match.status === "LIVE"
    );
  }

  if (activeTab === "upcoming") {
    result = result.filter(
      (match) => match.status === "UPCOMING"
    );
  }

  if (activeTab === "completed") {
    result = result
      .filter(
        (match) => match.status === "COMPLETED"
      )
      .sort((a, b) => {
        const timeA = new Date(
          a.completed_at ||
            a.created_at ||
            0
        ).getTime();

        const timeB = new Date(
          b.completed_at ||
            b.created_at ||
            0
        ).getTime();

        return timeB - timeA;
      });
  }

  return result.filter((match) =>
    matchesSearch(match, matchSearch)
  );
}, [
  tournamentMatches,
  activeTab,
  matchSearch,
]);

  // =======================================================
  // PREVIEW
  // =======================================================

  const previewMatches =
    visibleMatches.slice(
      0,
      8
    );

  // =======================================================
  // STATS
  // =======================================================

  const liveMatches =
    formattedMatches.filter(
      (match) =>
        match.status ===
        "LIVE"
    );

  const upcomingMatches =
    formattedMatches.filter(
      (match) =>
        match.status ===
        "UPCOMING"
    );

  const completedMatches =
    useMemo(() => {
      return [...formattedMatches]
        .filter(
          (match) =>
            match.status ===
            "COMPLETED"
        )
        .sort((a, b) => {
          const timeA = new Date(
            a.completed_at ||
              a.created_at ||
              0
          ).getTime();

          const timeB = new Date(
            b.completed_at ||
              b.created_at ||
              0
          ).getTime();

          return timeB - timeA;
        });
    }, [formattedMatches]);

  const stats = [
    {
      icon: Radio,
      cls: "icon-orange",
      value:
        liveMatches.length,
      label:
        "Live Matches",
      sub:
        "Playing right now",
    },
    {
      icon: Trophy,
      cls: "icon-purple",
      value:
        formattedMatches.length,
      label:
        "Matches Tracked",
      sub:
        "Across all tournaments",
    },
    {
      icon: CalendarDays,
      cls: "icon-blue",
      value:
        upcomingMatches.length,
      label:
        "Upcoming Matches",
      sub:
        "Scheduled fixtures",
    },
    {
      icon: Bell,
      cls: "icon-green",
      value:
        completedMatches.length,
      label:
        "Completed Matches",
      sub:
        "Results available",
    },
  ];

  // =======================================================
  // TOURNAMENT CHANGE
  // =======================================================

  function handleTournamentChange(
    event
  ) {
    setSelectedTournament(
      event.target.value
    );

    setActiveTab(
      "all"
    );

    setFixtureFilter(
      "all"
    );

    setShowAllMatches(
      false
    );
  }

  // =======================================================
  // STANDINGS CALCULATION
  // =======================================================

  const standingsData =
    useMemo(() => {
      const result = {
        pools: {},
        super8: {},
      };

      /*
       * Only completed fixtures count
       * toward standings.
       */
      const completed =
        tournamentMatches.filter(
          (match) =>
            match.status ===
            "COMPLETED"
        );

      completed.forEach(
        (match) => {
          const stage =
            normalizeStage(
              match.stage
            );

          const isPool =
            stage ===
              "pool" ||
            Boolean(match.pool);

          const isSuper8 =
            stage ===
              "super 8" ||
            stage ===
              "super8";

          /*
           * We only calculate:
           * Pool standings
           * Super 8 standings
           *
           * Semi / Final are knockout
           * rounds and do not form points
           * tables.
           */
          if (
            !isPool &&
            !isSuper8
          ) {
            return;
          }

          const bucket =
            isSuper8
              ? result.super8
              : result.pools;

          const bucketName =
            isSuper8
              ? "Super 8"
              : match.pool ||
                "Group Stage";

          if (
            !bucket[
              bucketName
            ]
          ) {
            bucket[
              bucketName
            ] = {};
          }

          const playerA =
            match.player1;

          const playerB =
            match.player2;

          const keyA =
            String(
              playerA.id ||
                playerA.name
            );

          const keyB =
            String(
              playerB.id ||
                playerB.name
            );

          if (
            !bucket[
              bucketName
            ][keyA]
          ) {
            bucket[
              bucketName
            ][keyA] = {
              id:
                playerA.id,
              name:
                playerA.name,
              members:
                Array.isArray(playerA.members)
                  ? playerA.members
                  : [],
              played: 0,
              wins: 0,
              losses: 0,
              points: 0,
              difference: 0,
            };
          }

          if (
            !bucket[
              bucketName
            ][keyB]
          ) {
            bucket[
              bucketName
            ][keyB] = {
              id:
                playerB.id,
              name:
                playerB.name,
              members:
                Array.isArray(playerB.members)
                  ? playerB.members
                  : [],
              played: 0,
              wins: 0,
              losses: 0,
              points: 0,
              difference: 0,
            };
          }

          const rowA =
            bucket[
              bucketName
            ][keyA];

          const rowB =
            bucket[
              bucketName
            ][keyB];

          const scoreA =
            Number(
              playerA.score
            ) || 0;

          const scoreB =
            Number(
              playerB.score
            ) || 0;

          rowA.played += 1;
          rowB.played += 1;

          rowA.difference +=
            scoreA -
            scoreB;

          rowB.difference +=
            scoreB -
            scoreA;

          if (
            match.winnerSide ===
            "A"
          ) {
            rowA.wins += 1;
            rowA.points += 2;
            rowB.losses += 1;
          }

          if (
            match.winnerSide ===
            "B"
          ) {
            rowB.wins += 1;
            rowB.points += 2;
            rowA.losses += 1;
          }
        }
      );

      return result;
    }, [
      tournamentMatches,
    ]);

  // =======================================================
  // STANDINGS CARD
  // =======================================================

  function PointsTable({
    title,
    rows,
    label = "GROUP STAGE",
  }) {
    const sortedRows =
      [...rows].sort(
        (a, b) =>
          b.points -
            a.points ||
          b.difference -
            a.difference ||
          b.wins -
            a.wins ||
          a.name.localeCompare(
            b.name
          )
      );

    return (
      <div className="tm-points-card">

        <div className="tm-points-header">

          <div>
            <span className="tm-pool-label">
              {label}
            </span>

            <h3>
              {title}
            </h3>
          </div>

          <div className="tm-live-icon">
            <Radio size={16} />
          </div>

        </div>

        <div className="tm-table-wrap">

          <table className="tm-table">

            <thead>
              <tr>
                <th>#</th>

                <th>
                  Player / Team
                </th>

                <th>
                  P
                </th>

                <th>
                  W
                </th>

                <th>
                  L
                </th>

                <th>
                  Pts
                </th>

                <th>
                  Diff
                </th>
              </tr>
            </thead>

            <tbody>

              {sortedRows.map(
                (row, index) => (
                  <tr
                    key={
                      `${title}-${row.name}`
                    }
                  >

                    <td>
                      <span
                        className={`tm-rank ${
                          index < 2
                            ? "top"
                            : ""
                        }`}
                      >
                        {
                          index +
                          1
                        }
                      </span>
                    </td>

                    <td>
                      <div className="tm-standings-team-name">
                        {row.name}
                      </div>

                      {Array.isArray(row.members) &&
                        row.members.length > 0 && (
                          <div className="tm-team-members scoreboard-standings-members">
                            {row.members.map(
                              (member, memberIndex) => (
                                <span
                                  key={
                                    member.id ||
                                    memberIndex
                                  }
                                >
                                  {member.name}
                                </span>
                              )
                            )}
                          </div>
                        )}
                    </td>

                    <td>
                      {
                        row.played
                      }
                    </td>

                    <td>
                      {
                        row.wins
                      }
                    </td>

                    <td>
                      {
                        row.losses
                      }
                    </td>

                    <td>
                      <span className="tm-points">
                        {
                          row.points
                        }
                      </span>
                    </td>

                    <td>
                      {row.difference >=
                      0
                        ? `+${row.difference}`
                        : row.difference}
                    </td>

                  </tr>
                )
              )}

            </tbody>

          </table>

        </div>

      </div>
    );
  }

  // =======================================================
  // AUDIENCE FIXTURES
  // =======================================================

  function AudienceFixtures() {
    const [
      audienceFixtureSearch,
      setAudienceFixtureSearch,
    ] = useState("");

    const filteredFixtures =
      tournamentMatches
        .filter(
          (match) =>
            matchesStage(
              match,
              fixtureFilter
            )
        )
        .filter((match) =>
          matchesSearch(
            match,
            audienceFixtureSearch
          )
        );

    return (
      <div className="tm-card">

        <div className="tm-card-heading">

          <div>
            <span className="tm-eyebrow">
              TOURNAMENT
            </span>

            <h2>
              Tournament Fixtures
            </h2>

            <p>
              View fixtures and
              open any match to
              see its live score.
            </p>
          </div>

        </div>

        {/* SEARCH */}

        <div className="scoreboard-match-search">
          <Search size={17} />

          <input
            type="text"
            value={
              audienceFixtureSearch
            }
            onChange={(event) =>
              setAudienceFixtureSearch(
                event.target.value
              )
            }
            placeholder="Search player or team..."
            aria-label="Search tournament fixtures"
          />

          {audienceFixtureSearch && (
            <button
              type="button"
              onClick={() =>
                setAudienceFixtureSearch("")
              }
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        {/* FILTERS */}

        <div className="tm-section-tabs">

          {[
            ["all", "All"],
            [
              "group",
              "Group Stage",
            ],
            [
              "super8",
              "Super 8",
            ],
            [
              "semi",
              "Semi Finals",
            ],
            [
              "final",
              "Final",
            ],
          ].map(
            ([value, label]) => (
              <button
                type="button"
                key={value}
                className={
                  fixtureFilter ===
                  value
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setFixtureFilter(
                    value
                  )
                }
              >
                {label}
              </button>
            )
          )}

        </div>

        {filteredFixtures.length ===
        0 ? (
          <div className="scoreboard-empty">
            <CalendarDays
              size={30}
            />

            <h3>
              No fixtures found
            </h3>

            <p>
              No fixtures are
              available for this
              selection.
            </p>
          </div>
        ) : (
          <div className="tm-fixtures-grid">

            {filteredFixtures.map(
              (match) => (
                <div
                  key={match.id}
                  className="tm-fixture-card audience-fixture-card"
                >

                  <div className="tm-fixture-top">

                    <div>
                      <strong>
                        {
                          match.pool ||
                          match.stage ||
                          "MATCH"
                        }
                      </strong>
                    </div>

                    <span>
                      Match{" "}
                      {
                        match.matchNumber
                      }
                    </span>

                  </div>

                  <div className="tm-matchup">

                    <div className="tm-side tm-side-left">
                      <div className="tm-team-score-row">
                        <strong>
                          {match.player1.name}
                        </strong>

                        <span className="tm-side-score">
                          {match.player1.score}
                        </span>
                      </div>

                      {match.isDoubles &&
                        Array.isArray(match.player1.members) &&
                        match.player1.members.length > 0 && (
                          <div className="tm-team-members">
                            {match.player1.members.map(
                              (member) => (
                                <span
                                  key={member.id}
                                >
                                  {member.name}
                                </span>
                              )
                            )}
                          </div>
                        )}
                    </div>

                    <span className="tm-vs">
                      VS
                    </span>

                    <div className="tm-side tm-side-right">
                      <div className="tm-team-score-row">
                        <span className="tm-side-score">
                          {match.player2.score}
                        </span>

                        <strong>
                          {match.player2.name}
                        </strong>
                      </div>

                      {match.isDoubles &&
                        Array.isArray(match.player2.members) &&
                        match.player2.members.length > 0 && (
                          <div className="tm-team-members">
                            {match.player2.members.map(
                              (member) => (
                                <span
                                  key={member.id}
                                >
                                  {member.name}
                                </span>
                              )
                            )}
                          </div>
                        )}
                    </div>

                  </div>

                  {(match.stage === "Semi Final" ||
  match.stage === "Final") && (
  <div className="audience-fixture-game-scores">
    {[1, 2, 3].map((gameNumber) => {
      const game = Array.isArray(match.gameScores)
        ? match.gameScores.find(
            (item) =>
              Number(item?.game) === gameNumber
          )
        : null;

      return (
        <div
          key={`fixture-game-${gameNumber}`}
          className={`audience-fixture-game ${
            game ? "played" : ""
          }`}
        >
          <span>G{gameNumber}</span>

          <strong>
            {game
              ? `${game.a}–${game.b}`
              : "—"}
          </strong>
        </div>
      );
    })}

    <div className="audience-fixture-sets">
      Sets:{" "}
      {Array.isArray(match.gameScores)
        ? match.gameScores.filter(
            (game) =>
              Number(game?.a) >
              Number(game?.b)
          ).length
        : 0}
      –
      {Array.isArray(match.gameScores)
        ? match.gameScores.filter(
            (game) =>
              Number(game?.b) >
              Number(game?.a)
          ).length
        : 0}
    </div>
  </div>
)}

                  <div className="tm-fixture-bottom">

                    <span>
                      {
                        match.round ||
                        "Match"
                      }
                    </span>

                    <span
                      className={`tm-status ${
  match.status === "COMPLETED"
    ? "completed"
    : match.status === "LIVE"
      ? "live"
      : "upcoming"
}`}
                    >
                      {
                        match.status
                      }
                    </span>

                  </div>

                  {match.status === "COMPLETED" &&
  match.winnerName && (
    <div className="audience-fixture-winner">
      Winner:{" "}
      <strong>{match.winnerName}</strong>
    </div>
  )}

                </div>
              )
            )}

          </div>
        )}

      </div>
    );
  }

  // =======================================================
  // AUDIENCE STANDINGS
  // =======================================================

  function AudienceStandings() {
    const poolEntries =
      Object.entries(
        standingsData.pools
      );

    const super8Rows =
      Object.values(
        standingsData.super8[
          "Super 8"
        ] || {}
      );

    return (
      <>
        <div className="tm-standings-header">

          <span className="tm-eyebrow">
            TOURNAMENT
          </span>

          <h2>
            Qualification Standings
          </h2>

          <p>
            Current standings based
            on completed fixtures.
          </p>

        </div>

        {poolEntries.length >
        0 ? (
          <div className="tm-standings-grid">

            {poolEntries.map(
              ([
                poolName,
                rowsMap,
              ]) => (
                <PointsTable
                  key={
                    poolName
                  }
                  title={`${poolName} Points Table`}
                  rows={
                    Object.values(
                      rowsMap
                    )
                  }
                  label="GROUP STAGE"
                />
              )
            )}

          </div>
        ) : (
          <div className="tm-card scoreboard-empty">
            <CalendarDays
              size={30}
            />

            <h3>
              No group standings yet
            </h3>

            <p>
              Completed group-stage
              fixtures will appear
              here.
            </p>
          </div>
        )}

        {super8Rows.length >
          0 && (
          <div
            className="tm-standings-grid"
            style={{
              marginTop:
                "18px",
            }}
          >
            <PointsTable
              title="Super 8 Points Table"
              rows={
                super8Rows
              }
              label="SUPER 8"
            />
          </div>
        )}

      </>
    );
  }

  // =======================================================
  // LOADING
  // =======================================================

  if (loading) {
    return (
      <div className="stat-shell score-viewer-shell">

        <Scoreboardsidebar />

        <main className="stat-main">

          <div className="scoreboard-loading">

            <RefreshCw
              size={28}
              className="scoreboard-spin"
            />

            <h2>
              Loading scoreboard...
            </h2>

            <p>
              Getting the latest
              tournament scores.
            </p>

          </div>

        </main>

      </div>
    );
  }

  // =======================================================
  // OVERVIEW
  // =======================================================

  const renderOverview =
    () => (
      <>
        <div className="dash-header-flex">

          <div>
            <h1>Matcho Live</h1>
            <p>Live scores, fixtures, results and standings for every tournament.</p>
          </div>
          <div className="scoreboard-main-actions">

  <button
    type="button"
    className="public-header-btn public-header-btn-primary"
    onClick={() => navigate("/join-tournament")}
  >
    <Trophy size={16} />
    Join Tournament
  </button>

  <button
    type="button"
    className="public-header-btn public-header-btn-secondary"
    onClick={() => navigate("/signup")}
  >
    <ShieldCheck size={16} />
    Organizer Sign Up
  </button>

</div>

        </div>

        {/* WELCOME */}

        <section className="stat-banner score-viewer-banner">

          <div>

            <h2>
              Welcome to Matcho Live
            </h2>

            <p>
              <strong>
                {liveMatches.length}{" "}
                {liveMatches.length ===
                1
                  ? "match"
                  : "matches"}
              </strong>{" "}
              currently live.
              Follow every score
              in real time.
            </p>

            <button
              type="button"
              className="stat-banner-btn"
              onClick={() => {
                setActiveTab(
                  "live"
                );

                setTimeout(() => {
                  document
                    .getElementById(
                      "audience-live-matches"
                    )
                    ?.scrollIntoView({
                      behavior:
                        "smooth",
                      block:
                        "start",
                    });
                }, 50);
              }}
            >
              {liveMatches.length >
              0
                ? `View ${liveMatches.length} Live ${
                    liveMatches.length ===
                    1
                      ? "Match"
                      : "Matches"
                  } →`
                : "View Live Matches →"}
            </button>

          </div>

          <div className="stat-banner-icon">
            🏆
          </div>

        </section>

        {/* STATS */}

        <section className="stat-cards score-viewer-stats">

          {stats.map(
            ({
              icon: Icon,
              cls,
              value,
              label,
              sub,
            }) => (
              <div
                className="stat-card"
                key={label}
              >

                <div
                  className={`stat-card-icon ${cls}`}
                >
                  <Icon size={20} />
                </div>

                <div>

                  <h3>
                    {value}
                  </h3>

                  <span>
                    {label}
                  </span>

                  <br />

                  <span className="score-card-sub">
                    {sub}
                  </span>

                </div>

              </div>
            )
          )}

        </section>

        {/* TOURNAMENT DROPDOWN */}

        <section className="scoreboard-tournament-selector">

          <div className="scoreboard-tournament-title">

            <div className="scoreboard-tournament-icon">
              <Trophy size={17} />
            </div>

            <div>

              <span>
                TOURNAMENT
              </span>

              <strong>
                Select a tournament
              </strong>

            </div>

          </div>

          <div className="scoreboard-tournament-select-wrap">

            <select
              value={
                selectedTournament
              }
              onChange={
                handleTournamentChange
              }
              aria-label="Select tournament"
            >

              <option value="all">
                All Tournaments
              </option>

              {tournaments.map(
                (tournament) => (
                  <option
                    key={
                      tournament.id
                    }
                    value={
                      tournament.id
                    }
                  >
                    {tournament.name}
                  </option>
                )
              )}

            </select>

            <ChevronDown
              size={16}
              className="scoreboard-tournament-chevron"
            />

          </div>

        </section>

        {/* MATCH PREVIEW */}

        <section
          id="audience-live-matches"
          className="stat-panel score-live-panel"
        >

          <div className="stat-panel-head">

            <div className="flex-head">

              <div>

                <h4>
                  Real-Time Match
                  Scores
                </h4>

                <p className="score-panel-subtitle">
                  {visibleMatches.length}{" "}
                  {visibleMatches.length ===
                  1
                    ? "match"
                    : "matches"}{" "}
                  shown
                </p>

              </div>

              {liveMatches.length >
                0 && (
                <span className="live-pill-sm">

                  <Radio
                    size={12}
                    className="live-pulsing-dot"
                  />

                  {liveMatches.length}{" "}
                  LIVE NOW

                </span>
              )}

            </div>

            <div className="scoreboard-match-search">
              <Search size={17} />

              <input
                type="text"
                value={matchSearch}
                onChange={(event) =>
                  setMatchSearch(
                    event.target.value
                  )
                }
                placeholder="Search player or team..."
                aria-label="Search matches"
              />

              {matchSearch && (
                <button
                  type="button"
                  onClick={() =>
                    setMatchSearch("")
                  }
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>

            <div className="scoreboard-filter-tabs">

              {[
                ["all", "All"],
                ["live", "Live"],
                [
                  "upcoming",
                  "Upcoming",
                ],
                [
                  "completed",
                  "Completed",
                ],
              ].map(
                ([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={
                      activeTab ===
                      value
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setActiveTab(
                        value
                      )
                    }
                  >
                    {label}
                  </button>
                )
              )}

            </div>

          </div>

          {error && (
            <div className="scoreboard-error">
              {error}
            </div>
          )}

          {visibleMatches.length ===
          0 ? (
            <div className="scoreboard-empty">

              <CalendarDays
                size={30}
              />

              <h3>
                No matches found
              </h3>

              <p>
                There are no matches
                for the selected
                filter.
              </p>

            </div>
          ) : (
            <>
              <div className="live-matches-grid">

                {previewMatches.map(
                  (match) => (
                    <MatchCard
                      key={
                        match.id
                      }
                      match={
                        match
                      }
                    />
                  )
                )}

              </div>

              {visibleMatches.length >
                8 && (
                <div className="scoreboard-view-all-wrap">

                  <button
                    type="button"
                    className="scoreboard-view-all-btn"
                    onClick={() =>
                      setShowAllMatches(
                        true
                      )
                    }
                  >
                    View All Matches

                    <span>
                      (
                      {
                        visibleMatches.length
                      }
                      )
                    </span>

                  </button>

                </div>
              )}

            </>
          )}

        </section>

        {/* UPCOMING + RESULTS */}

        <section className="stat-panels two score-viewer-panels">

          {/* UPCOMING */}

          <div className="stat-panel">

            <div className="stat-panel-head">

              <div>

                <h4>
                  Upcoming Matches
                </h4>

              </div>

              <CalendarDays
                size={18}
              />

            </div>

            {upcomingMatches
              .filter(
                (match) =>
                  selectedTournament ===
                    "all" ||
                  String(
                    match.tournamentId
                  ) ===
                    String(
                      selectedTournament
                    )
              )
              .slice(0, 5)
              .map(
                (match) => (
                  <button
                    type="button"
                    className="stat-list-row scoreboard-list-button"
                    key={
                      match.id
                    }
                  >

                    <div className="stat-thumb icon-blue">
  <img
    src={match.sportIcon}
    alt=""
    className="scoreboard-list-logo"
  />
</div>

                    <div>

                      <p className="stat-row-title">
                        {
                          match.tournament
                        }
                      </p>

                      <p className="stat-row-sub">
  {match.player1.name} vs {match.player2.name}
</p>

<p className="stat-row-type">
  {match.round || match.stage || "Pool Match"}
</p>

                    </div>

                    <span className="stat-badge">
                      {match.startDate
                        ? formatTournamentDate(
                            match.startDate
                          )
                        : "Scheduled"}
                    </span>

                  </button>
                )
              )}

          </div>

          {/* RESULTS */}

          <div className="stat-panel scoreboard-results-panel">

            <div className="stat-panel-head scoreboard-results-header">

              <div>

                <h4>
                  Recent Results
                </h4>

                <p>
                  Latest completed
                  tournament matches
                </p>

              </div>

              <div className="scoreboard-results-icon">
                <Trophy size={17} />
              </div>

            </div>

            <div className="scoreboard-results-list">

              {completedMatches
                .filter(
                  (match) =>
                    selectedTournament ===
                      "all" ||
                    String(
                      match.tournamentId
                    ) ===
                      String(
                        selectedTournament
                      )
                )
                .slice(0, 5)
                .map(
                  (match) => (
                    <button
                      type="button"
                      className="scoreboard-result-item"
                      key={
                        match.id
                      }
                    >

                     <div className="scoreboard-result-sport">
  <img
    src={match.sportIcon}
    alt=""
    className="scoreboard-result-logo"
  />
</div>

                      <div className="scoreboard-result-main">

                        <div className="scoreboard-result-teams">

                          <strong>
                            {
                              match
                                .player1
                                .name
                            }
                          </strong>

                          <span className="scoreboard-result-score">
                            {
                              match
                                .player1
                                .score
                            }
                            {" – "}
                            {
                              match
                                .player2
                                .score
                            }
                          </span>

                          <strong>
                            {
                              match
                                .player2
                                .name
                            }
                          </strong>

                        </div>

                        <div className="scoreboard-result-meta">

                          <span>
                            {
                              match.tournament
                            }
                          </span>

                          <span>
                            {
                              match.round
                            }
                          </span>

                        </div>

                        {(match.stage === "Semi Final" ||
                          match.stage === "Final") &&
                          match.gameScores?.length > 0 && (
                            <div className="scoreboard-result-games">
                              <span>
                                {match.gameScores
                                  .map(
                                    (game) =>
                                      `G${game.game} ${game.a}–${game.b}`
                                  )
                                  .join(" · ")}
                              </span>

                              <strong>
                                Sets:{" "}
                                {
                                  match.gameScores.filter(
                                    (game) =>
                                      Number(game?.a) >
                                      Number(game?.b)
                                  ).length
                                }
                                –
                                {
                                  match.gameScores.filter(
                                    (game) =>
                                      Number(game?.b) >
                                      Number(game?.a)
                                  ).length
                                }
                              </strong>
                            </div>
                          )}

                      </div>

                      <div className="scoreboard-result-winner">

                        <span>
                          WINNER
                        </span>

                        <strong>
                          {
                            match.winnerName ||
                            "Completed"
                          }
                        </strong>

                      </div>

                    </button>
                  )
                )}

              {completedMatches.length ===
                0 && (
                <div className="scoreboard-mini-empty">
                  No completed matches.
                </div>
              )}

            </div>

          </div>

        </section>
      </>
    );

  // =======================================================
  // RENDER
  // =======================================================

  return (
    <div className="stat-shell score-viewer-shell">

      <Scoreboardsidebar />

      <main className="stat-main">

        {activeSection ===
          "overview" &&
          renderOverview()}

        {activeSection ===
          "fixtures" && (
          <>
            <div className="dash-header-flex">

              <div>
                <h1>
                  Fixtures
                </h1>

                <p>
                  View all tournament
                  fixtures and live
                  scores.
                </p>
              </div>

            </div>

            <section className="scoreboard-tournament-selector">

              <div className="scoreboard-tournament-title">

                <div className="scoreboard-tournament-icon">
                  <Trophy size={17} />
                </div>

                <div>

                  <span>
                    TOURNAMENT
                  </span>

                  <strong>
                    Select a tournament
                  </strong>

                </div>

              </div>

              <div className="scoreboard-tournament-select-wrap">

                <select
                  value={
                    selectedTournament
                  }
                  onChange={
                    handleTournamentChange
                  }
                >

                  <option value="all">
                    All Tournaments
                  </option>

                  {tournaments.map(
                    (tournament) => (
                      <option
                        key={
                          tournament.id
                        }
                        value={
                          tournament.id
                        }
                      >
                        {
                          tournament.name
                        }
                      </option>
                    )
                  )}

                </select>

                <ChevronDown
                  size={16}
                  className="scoreboard-tournament-chevron"
                />

              </div>

            </section>

            <AudienceFixtures />

          </>
        )}

        {activeSection ===
          "standings" && (
          <>
            <div className="dash-header-flex">

              <div>
                <h1>
                  Standings
                </h1>

                <p>
                  Follow qualification
                  standings and points
                  tables.
                </p>
              </div>

            </div>

            <section className="scoreboard-tournament-selector">

              <div className="scoreboard-tournament-title">

                <div className="scoreboard-tournament-icon">
                  <Trophy size={17} />
                </div>

                <div>

                  <span>
                    TOURNAMENT
                  </span>

                  <strong>
                    Select a tournament
                  </strong>

                </div>

              </div>

              <div className="scoreboard-tournament-select-wrap">

                <select
                  value={
                    selectedTournament
                  }
                  onChange={
                    handleTournamentChange
                  }
                >

                  <option value="all">
                    All Tournaments
                  </option>

                  {tournaments.map(
                    (tournament) => (
                      <option
                        key={
                          tournament.id
                        }
                        value={
                          tournament.id
                        }
                      >
                        {
                          tournament.name
                        }
                      </option>
                    )
                  )}

                </select>

                <ChevronDown
                  size={16}
                  className="scoreboard-tournament-chevron"
                />

              </div>

            </section>

            {selectedTournament ===
            "all" ? (
              <div className="tm-card scoreboard-empty">
                <Trophy
                  size={30}
                />

                <h3>
                  Select a tournament
                </h3>

                <p>
                  Select a tournament
                  above to view its
                  standings.
                </p>
              </div>
            ) : (
              <AudienceStandings />
            )}

          </>
        )}

      </main>

      {/* =================================================
          ALL MATCHES MODAL
      ================================================= */}

      {showAllMatches && (
        <div
          className="scoreboard-modal-overlay"
          onClick={() =>
            setShowAllMatches(false)
          }
        >

          <div
            className="scoreboard-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="scoreboard-modal-header">

              <div>

                <span>
                  MATCH CENTER
                </span>

                <h2>
                  {selectedTournament ===
                  "all"
                    ? "All Tournament Matches"
                    : `${
                        selectedTournamentData?.name ||
                        "Tournament"
                      } Matches`}
                </h2>

                <p>
                  {
                    visibleMatches.length
                  }{" "}
                  {visibleMatches.length ===
                  1
                    ? "match"
                    : "matches"}{" "}
                  available
                </p>

              </div>

              <button
                type="button"
                className="scoreboard-modal-close"
                onClick={() =>
                  setShowAllMatches(
                    false
                  )
                }
                aria-label="Close"
              >
                ×
              </button>

            </div>

            <div className="scoreboard-modal-filters">

              {[
                ["all", "All"],
                ["live", "Live"],
                [
                  "upcoming",
                  "Upcoming",
                ],
                [
                  "completed",
                  "Completed",
                ],
              ].map(
                ([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={
                      activeTab ===
                      value
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setActiveTab(
                        value
                      )
                    }
                  >
                    {label}
                  </button>
                )
              )}

            </div>

            <div className="scoreboard-modal-body">

              {visibleMatches.length ===
              0 ? (
                <div className="scoreboard-empty">

                  <CalendarDays
                    size={30}
                  />

                  <h3>
                    No matches found
                  </h3>

                  <p>
                    There are no matches
                    for this filter.
                  </p>

                </div>
              ) : (
                <div className="live-matches-grid">

                  {visibleMatches.map(
                    (match) => (
                      <MatchCard
  key={match.id}
  match={match}
/>
                    )
                  )}

                </div>
              )}

            </div>

          </div>

        </div>
      )}

    </div>
  );

 
}
