import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Trophy,
  CalendarDays,
  Radio,
  Users,
  RefreshCw,
} from "lucide-react";

import PlayerSidebar from "../components/PlayerSidebar";
import { apiRequest } from "../services/api";
import { socket } from "../services/socket";

import "./TournamentManagement.css";

export default function PlayerTournaments() {
  // =====================================================
  // STATE
  // =====================================================

  const [tournaments, setTournaments] =
    useState([]);

  const [selectedTournamentId, setSelectedTournamentId] =
    useState("");

  const [fixtures, setFixtures] =
    useState([]);

  const [activeSection, setActiveSection] =
    useState("fixtures");

  const [fixtureFilter, setFixtureFilter] =
    useState("all");

  const [loadingTournaments, setLoadingTournaments] =
    useState(true);

  const [loadingFixtures, setLoadingFixtures] =
    useState(false);

  const [error, setError] =
    useState("");

  const [fixtureError, setFixtureError] =
    useState("");

  // =====================================================
  // LOAD PLAYER TOURNAMENTS
  // =====================================================

  async function loadTournaments() {
    try {
      setLoadingTournaments(true);
      setError("");

      const result =
        await apiRequest(
          "/players/dashboard",
          {
            method: "GET",
          }
        );

      if (!result?.success) {
        throw new Error(
          result?.message ||
            "Unable to load your tournaments."
        );
      }

      const myTournaments =
        Array.isArray(
          result.tournaments
        )
          ? result.tournaments
          : [];

      setTournaments(
        myTournaments
      );

      // Keep current selection when possible.
      const currentStillExists =
        myTournaments.some(
          (tournament) =>
            String(tournament.id) ===
            String(
              selectedTournamentId
            )
        );

      if (
        !currentStillExists &&
        myTournaments.length > 0
      ) {
        setSelectedTournamentId(
          myTournaments[0].id
        );
      }

      if (
        myTournaments.length === 0
      ) {
        setSelectedTournamentId("");
      }

    } catch (err) {
      console.error(
        "Load Player Tournaments Error:",
        err
      );

      setError(
        err.message ||
          "Unable to load your tournaments."
      );

      setTournaments([]);
      setSelectedTournamentId("");

    } finally {
      setLoadingTournaments(false);
    }
  }

  // =====================================================
  // LOAD FIXTURES
  // =====================================================

  async function loadFixtures(
    tournamentId
  ) {
    if (!tournamentId) {
      setFixtures([]);
      return;
    }

    try {
      setLoadingFixtures(true);
      setFixtureError("");

      const result =
        await apiRequest(
          `/fixtures/${tournamentId}`,
          {
            method: "GET",
          }
        );

      const data =
        Array.isArray(
          result?.fixtures
        )
          ? result.fixtures
          : [];

      setFixtures(data);

    } catch (err) {
      console.error(
        "Load Player Fixtures Error:",
        err
      );

      setFixtures([]);

      setFixtureError(
        err.message ||
          "Unable to load fixtures."
      );

    } finally {
      setLoadingFixtures(false);
    }
  }

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    loadTournaments();
  }, []);

  // =====================================================
  // LOAD FIXTURES WHEN TOURNAMENT CHANGES
  // =====================================================

  useEffect(() => {
    setFixtureFilter("all");
    setActiveSection("fixtures");

    if (selectedTournamentId) {
      loadFixtures(
        selectedTournamentId
      );
    } else {
      setFixtures([]);
    }
  }, [selectedTournamentId]);

  useEffect(() => {
    if (!selectedTournamentId) {
      return;
    }

    if (!socket.connected) {
      socket.connect();
    }

    const roomId = String(
      selectedTournamentId
    );

    socket.emit(
      "join-tournament",
      roomId
    );

    const handleFixtureScoreUpdate = (
      updatedFixture
    ) => {
      if (!updatedFixture?.id) {
        return;
      }

      if (
        updatedFixture.tournament_id &&
        String(
          updatedFixture.tournament_id
        ) !== roomId
      ) {
        return;
      }

      setFixtures(
        (currentFixtures) =>
          currentFixtures.map(
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
      handleFixtureScoreUpdate
    );

    console.log(
      "🟢 Player Tournaments joined:",
      `tournament:${roomId}`
    );

    return () => {
      socket.off(
        "fixture-score-updated",
        handleFixtureScoreUpdate
      );

      socket.emit(
        "leave-tournament",
        roomId
      );
    };
  }, [selectedTournamentId]);

  // =====================================================
  // SELECTED TOURNAMENT
  // =====================================================

  const selectedTournament =
    tournaments.find(
      (tournament) =>
        String(tournament.id) ===
        String(
          selectedTournamentId
        )
    ) || null;

  const hasSuper8 = useMemo(
    () =>
      fixtures.some(
        (fixture) =>
          String(fixture?.stage || "").trim().toLowerCase() === "super 8"
      ),
    [fixtures]
  );

  // =====================================================
  // FIXTURE FILTER
  // =====================================================

  const filteredFixtures =
    useMemo(() => {
      return fixtures.filter(
        (fixture) => {
          const stage = String(
            fixture.stage ||
              ""
          ).toLowerCase();

          const poolName =
            String(
              fixture.pool_name ||
                ""
            ).toLowerCase();

          const round =
            String(
              fixture.round ||
                ""
            ).toLowerCase();

          // -----------------------------
          // GROUP STAGE
          // -----------------------------

          if (
            fixtureFilter ===
            "group"
          ) {
            return (
              stage === "pool" ||
              stage === "group" ||
              poolName !== ""
            );
          }

          // -----------------------------
          // SUPER 8
          // -----------------------------

          if (
            fixtureFilter ===
            "super8"
          ) {
            return (
              stage === "super 8" ||
              round === "super 8" ||
              stage === "super8" ||
              round === "super8"
            );
          }

          // -----------------------------
          // SEMI FINALS
          // -----------------------------

          if (
            fixtureFilter ===
            "semi"
          ) {
            return (
              stage === "semi final" ||
              stage === "semi-final" ||
              round === "semi final" ||
              round === "semi-final"
            );
          }

          // -----------------------------
          // FINAL
          // -----------------------------

          if (
            fixtureFilter ===
            "final"
          ) {
            return (
              stage === "final" &&
              round === "final"
            );
          }

          return true;
        }
      );
    }, [
      fixtures,
      fixtureFilter,
    ]);

  // =====================================================
  // STAGE LABEL
  // =====================================================

  function getStageLabel(
    fixture
  ) {
    const stage =
      String(
        fixture?.stage ||
          ""
      );

    const pool =
      fixture?.pool_name;

    if (pool) {
      return pool.toUpperCase();
    }

    if (stage) {
      return stage.toUpperCase();
    }

    return "FIXTURE";
  }

  // =====================================================
  // STATUS
  // =====================================================

  function getStatusClass(
    status
  ) {
    const normalized =
      String(
        status || ""
      ).toLowerCase();

    if (
      normalized ===
      "completed"
    ) {
      return "completed";
    }

    if (
      normalized === "live"
    ) {
      return "live";
    }

    return "";
  }

  // =====================================================
  // WINNER
  // =====================================================

  function getWinnerName(
    fixture
  ) {
    const isDoubles =
      Boolean(
        fixture?.team_a_id ||
          fixture?.team_b_id
      );

    const sideA =
      fixture?.team_a_name ||
      fixture?.player_a_name ||
      "TBD";

    const sideB =
      fixture?.team_b_name ||
      fixture?.player_b_name ||
      "TBD";

    if (isDoubles) {
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

      return null;
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

  // =====================================================
  // PLAYER-SIDE STANDINGS
  //
  // Uses pool_name from your actual fixture data.
  // This matches the same pool structure used by the
  // organizer fixture/standings logic.
  // =====================================================

  // =====================================================
  // STANDINGS CALCULATOR
  // Reusable for Pool and Super 8 stages.
  // =====================================================

  const calculateStageStandings = (stageName) => {
    const records = new Map();

    const stageFixtures = fixtures.filter((fixture) => {
      const stage = String(fixture?.stage || "").trim().toLowerCase();
      return stage === stageName.toLowerCase();
    });

    const ensure = (id, name, type) => {
      if (!name) return null;

      const key = `${type}-${id ?? name}`;

      if (!records.has(key)) {
        records.set(key, {
          key,
          id,
          name,
          played: 0,
          wins: 0,
          losses: 0,
          points: 0,
          difference: 0,
        });
      }

      return records.get(key);
    };

    // Add every participant even before any match is completed.
    stageFixtures.forEach((fixture) => {
      const isDoubles = Boolean(
        fixture?.team_a_id || fixture?.team_b_id
      );

      if (isDoubles) {
        ensure(
          fixture.team_a_id,
          fixture.team_a_name,
          "team"
        );
        ensure(
          fixture.team_b_id,
          fixture.team_b_name,
          "team"
        );
      } else {
        ensure(
          fixture.player_a_id,
          fixture.player_a_name,
          "player"
        );
        ensure(
          fixture.player_b_id,
          fixture.player_b_name,
          "player"
        );
      }
    });

    // Calculate only completed fixtures.
    stageFixtures
      .filter(
        (fixture) =>
          String(fixture?.status || "").toLowerCase() ===
          "completed"
      )
      .forEach((fixture) => {
        const isDoubles = Boolean(
          fixture?.team_a_id || fixture?.team_b_id
        );

        const type = isDoubles ? "team" : "player";

        const idA = isDoubles
          ? fixture.team_a_id
          : fixture.player_a_id;
        const idB = isDoubles
          ? fixture.team_b_id
          : fixture.player_b_id;

        const nameA = isDoubles
          ? fixture.team_a_name
          : fixture.player_a_name;
        const nameB = isDoubles
          ? fixture.team_b_name
          : fixture.player_b_name;

        const a = ensure(idA, nameA, type);
        const b = ensure(idB, nameB, type);

        if (!a || !b) return;

        const scoreA = Number(fixture.player_a_score) || 0;
        const scoreB = Number(fixture.player_b_score) || 0;

        a.played += 1;
        b.played += 1;
        a.difference += scoreA - scoreB;
        b.difference += scoreB - scoreA;

        const winnerId = isDoubles
          ? fixture.winner_team_id
          : fixture.winner_player_id;

        if (winnerId && String(winnerId) === String(idA)) {
          a.wins += 1;
          a.points += 2;
          b.losses += 1;
        } else if (
          winnerId &&
          String(winnerId) === String(idB)
        ) {
          b.wins += 1;
          b.points += 2;
          a.losses += 1;
        }
      });

    return Array.from(records.values()).sort(
      (a, b) =>
        b.points - a.points ||
        b.wins - a.wins ||
        b.difference - a.difference ||
        a.name.localeCompare(b.name)
    );
  };

  // Pool standings remain separated by actual pool name.
  const poolStandings = useMemo(() => {
    const poolFixtures = fixtures.filter((fixture) => {
      const stage = String(fixture?.stage || "")
        .trim()
        .toLowerCase();
      return stage === "pool" && Boolean(fixture?.pool_name);
    });

    const pools = {};

    poolFixtures.forEach((fixture) => {
      const poolName = fixture.pool_name;
      if (!pools[poolName]) pools[poolName] = [];
    });

    Object.keys(pools).forEach((poolName) => {
      const rows = calculateStageStandings("Pool").filter((row) =>
        poolFixtures.some((fixture) => {
          const isDoubles = Boolean(
            fixture?.team_a_id || fixture?.team_b_id
          );
          const id = isDoubles
            ? row.id
            : row.id;
          return (
            fixture.pool_name === poolName &&
            (String(fixture.team_a_id) === String(id) ||
              String(fixture.team_b_id) === String(id) ||
              String(fixture.player_a_id) === String(id) ||
              String(fixture.player_b_id) === String(id))
          );
        })
      );
      pools[poolName] = rows;
    });

    return Object.entries(pools)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([poolName, rows]) => ({ poolName, rows }));
  }, [fixtures]);

  const super8Standings = useMemo(
    () => calculateStageStandings("Super 8"),
    [fixtures]
  );

  // =====================================================
  // LOADING
  // =====================================================

  if (loadingTournaments) {
    return (
      <div className="tm-page player-tournament-page">
  <PlayerSidebar
    activeItem="Tournaments"
  />

  <main className="tm-main player-tournament-main">
    <div className="tm-content">
            <div className="tm-header">
              <div className="tm-eyebrow">
                <Trophy
                  size={14}
                />
                MY TOURNAMENTS
              </div>

              <h1>
                Tournaments
              </h1>

              <p>
                View your tournament,
                fixtures, and standings.
              </p>
            </div>

            <section className="tm-card">
              <div className="tm-loading">
                Loading your tournaments...
              </div>
            </section>
          </div>
        </main>
      </div>
    );
  }

  // =====================================================
  // MAIN UI
  // =====================================================

  return (
    <div className="tm-page player-tournament-page">

      {/* ================================================
          PLAYER SIDEBAR
      ================================================= */}

      <PlayerSidebar
        activeItem="Tournaments"
      />

      <main className="tm-main player-tournament-main">

        <div className="tm-content">

          {/* ==========================================
              HEADER
          =========================================== */}

          <div className="tm-header">

            <div className="tm-eyebrow">
              <Trophy
                size={14}
              />

              MY TOURNAMENTS
            </div>

            <h1>
              Tournaments
            </h1>

            <p>
              View your tournament,
              fixtures, results, and
              standings from one place.
            </p>

          </div>

          {/* ==========================================
              ERROR
          =========================================== */}

          {error && (
            <div className="tm-error">
              {error}
            </div>
          )}

          {/* ==========================================
              SELECT TOURNAMENT
          =========================================== */}

          <section className="tm-card">

            <div className="tm-card-heading">

              <div className="tm-heading-icon">
                <Trophy
                  size={20}
                />
              </div>

              <div>
                <h3>
                  Select Tournament
                </h3>

                <p>
                  Choose the tournament
                  you want to view.
                </p>
              </div>

            </div>

            {tournaments.length ===
            0 ? (
              <div className="tm-loading">
                You have no tournaments
                yet.
              </div>
            ) : (
              <div className="tm-selection-row">

                {/* Tournament Select */}

                <div className="tm-select-wrapper">

                  <Trophy
                    size={17}
                  />

                  <select
                    value={
                      selectedTournamentId
                    }
                    onChange={(
                      event
                    ) =>
                      setSelectedTournamentId(
                        event.target.value
                      )
                    }
                  >
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

                </div>

                {/* Tournament Information */}

                {selectedTournament && (
                  <div className="tm-meta-group">

                    <div className="tm-meta-item">
                      <span>
                        FORMAT
                      </span>

                      <strong>
                        {selectedTournament.format ||
                          "Tournament"}
                      </strong>
                    </div>

                    <div className="tm-meta-divider" />

                    <div className="tm-meta-item">
                      <span>
                        STATUS
                      </span>

                      <strong>
                        {selectedTournament.status ||
                          "Registered"}
                      </strong>
                    </div>

                    <div className="tm-meta-divider" />

                    <div className="tm-participants">

                      <Users
                        size={17}
                      />

                      <div>
                        <span>
                          MY TOURNAMENT
                        </span>

                        <strong>
                          Registered
                        </strong>
                      </div>

                    </div>

                  </div>
                )}

              </div>
            )}

          </section>

          {/* ==========================================
              FIXTURES / STANDINGS TABS
          =========================================== */}

          {selectedTournament && (
            <div className="tm-section-tabs">

              <button
                type="button"
                className={
                  activeSection ===
                  "fixtures"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setActiveSection(
                    "fixtures"
                  )
                }
              >
                <CalendarDays
                  size={15}
                />

                Fixtures
              </button>

              <button
                type="button"
                className={
                  activeSection ===
                  "standings"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setActiveSection(
                    "standings"
                  )
                }
              >
                <Radio
                  size={15}
                />

                Standings
              </button>

            </div>
          )}

          {/* ==========================================
              FIXTURES
          =========================================== */}

          {selectedTournament &&
            activeSection ===
              "fixtures" && (
              <section className="tm-card">

                <div className="tm-section-top">

                  <div className="tm-card-heading">

                    <div className="tm-heading-icon">
                      <CalendarDays
                        size={20}
                      />
                    </div>

                    <div>
                      <h3>
                        Scheduled Fixtures
                      </h3>

                      <p>
                        Matches generated
                        for this tournament.
                      </p>
                    </div>

                  </div>

                  <button
                    type="button"
                    className="tm-outline-btn"
                    onClick={() =>
                      loadFixtures(
                        selectedTournamentId
                      )
                    }
                  >
                    <RefreshCw
                      size={14}
                    />

                    Refresh
                  </button>

                </div>

                {/* STAGE FILTERS */}

                <div className="tm-section-tabs">

                  {[
                    ["all", "All"],
                    ["group", "Group Stage"],
                    ...(hasSuper8 ? [["super8", "Super 8"]] : []),
                    ["semi", "Semi Finals"],
                    ["final", "Final"],
                  ].map(
                    ([
                      value,
                      label,
                    ]) => (
                      <button
                        key={value}
                        type="button"
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

                {fixtureError && (
                  <div className="tm-error">
                    {fixtureError}
                  </div>
                )}

                {loadingFixtures ? (
                  <div className="tm-loading">
                    Loading fixtures...
                  </div>
                ) : filteredFixtures.length ===
                  0 ? (
                  <div className="tm-empty">
                    <div className="tm-empty-icon">
                      <CalendarDays
                        size={26}
                      />
                    </div>

                    <h3>
                      No fixtures yet
                    </h3>

                    <p>
                      Fixtures will appear
                      here once they are
                      generated for your
                      tournament.
                    </p>
                  </div>
                ) : (
                  <div className="tm-fixtures-grid">

                    {filteredFixtures.map(
                      (fixture) => {

                        const sideA =
                          fixture.team_a_name ||
                          fixture.player_a_name ||
                          "TBD";

                        const sideB =
                          fixture.team_b_name ||
                          fixture.player_b_name ||
                          "TBD";

                        const scoreA =
                          Number(
                            fixture.player_a_score
                          ) || 0;

                        const scoreB =
                          Number(
                            fixture.player_b_score
                          ) || 0;

                        const isDoubles =
                          Boolean(
                            fixture.team_a_id ||
                            fixture.team_b_id
                          ) ||
                          String(
                            selectedTournament?.format ||
                              ""
                          ).toLowerCase() ===
                            "doubles";

                        const winner =
                          getWinnerName(
                            fixture
                          );

                        return (
                          <div
                            key={
                              fixture.id
                            }
                            className="tm-fixture-card"
                            onClick={() =>
                              navigate(
                                `/score-view?fixtureId=${fixture.id}&tournamentId=${selectedTournamentId}`
                              )
                            }
                          >

                            {/* TOP */}

                            <div className="tm-fixture-top">

                              <span>
                                {getStageLabel(
                                  fixture
                                )}
                              </span>

                              <small>
                                Match{" "}
                                {fixture.match_number ||
                                  fixture.id}
                              </small>

                            </div>

                            {/* TEAMS */}

                            <div className="tm-matchup">

                              {/* TEAM A */}
                              <div className="tm-side tm-side-left">

                                <div className="tm-team-score-row">

                                  <strong>
                                    {sideA}
                                  </strong>

                                  <span className="tm-side-score">
                                    {scoreA}
                                  </span>

                                </div>

                              </div>

                              {/* VS */}
                              <span className="tm-vs">
                                VS
                              </span>

                              {/* TEAM B */}
                              <div className="tm-side tm-side-right">

                                <div className="tm-team-score-row">

                                  <span className="tm-side-score">
                                    {scoreB}
                                  </span>

                                  <strong>
                                    {sideB}
                                  </strong>

                                </div>

                              </div>

                            </div>


                            {/* BOTTOM */}

                            <div className="tm-fixture-bottom">

                              <span>
                                {fixture.round ||
                                  "Pool Match"}
                              </span>

                              <span
                                className={`tm-status ${getStatusClass(
                                  fixture.status
                                )}`}
                              >
                                {fixture.status ||
                                  "Upcoming"}
                              </span>

                            </div>

                            {/* WINNER */}

                            {winner &&
                              String(
                                fixture.status ||
                                  ""
                              ).toLowerCase() ===
                                "completed" && (
                                <div
                                  className="tm-fixture-result"
                                >
                                  <span className="tm-fixture-scoreline">
                                    Final:{" "}
                                    {scoreA} -{" "}
                                    {scoreB}
                                  </span>

                                  <strong>
                                    Winner:{" "}
                                    {winner}
                                  </strong>
                                </div>
                              )}

                          </div>
                        );
                      }
                    )}

                  </div>
                )}

              </section>
            )}

          {/* ==========================================
              STANDINGS
          =========================================== */}

          {selectedTournament &&
            activeSection ===
              "standings" && (
              <>
                <div className="tm-standings-header">
                  <h2>Qualification Standings</h2>
                  <p>
                    Current standings based on completed fixtures.
                  </p>
                </div>

                {poolStandings.length > 0 && (
                  <>
                    <div className="tm-stage-title">
                      <span>GROUP STAGE</span>
                      <h3>Pool Points Tables</h3>
                    </div>

                    <section className="tm-standings-grid">
                      {poolStandings.map(({ poolName, rows }) => (
                        <PointsTable
                          key={poolName}
                          title={poolName}
                          rows={rows}
                        />
                      ))}
                    </section>
                  </>
                )}

                {hasSuper8 && super8Standings.length > 0 && (
                  <>
                    <div className="tm-stage-title tm-stage-title-spaced">
                      <span>SUPER 8</span>
                      <h3>Super 8 Points Table</h3>
                    </div>

                    <section className="tm-standings-grid tm-super8-standings-grid">
                      <PointsTable
                        title="Super 8"
                        rows={super8Standings}
                      />
                    </section>
                  </>
                )}

                {poolStandings.length === 0 &&
                  (!hasSuper8 || super8Standings.length === 0) && (
                    <section className="tm-card">
                      <div className="tm-empty">
                        <div className="tm-empty-icon">
                          <Radio size={26} />
                        </div>

                        <h3>Standings not available</h3>

                        <p>
                          Complete fixtures to populate the points tables.
                        </p>
                      </div>
                    </section>
                  )}
              </>
            )}
        </div>

      </main>
    </div>
  );
}

// =====================================================
// POINTS TABLE
// Same organizer styling
// =====================================================

function PointsTable({
  title,
  rows,
}) {
  return (
    <section className="tm-card tm-points-card">

      <div className="tm-points-header">

        <div>

          <span className="tm-pool-label">
            GROUP STAGE
          </span>

          <h3>
            {title} Points Table
          </h3>

        </div>

        <div className="tm-points-icon">
          <Radio
            size={17}
          />
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

            {rows.map(
              (
                row,
                index
              ) => (
                <tr
                  key={
                    row.key ||
                    `${row.name}-${index}`
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
                      {index + 1}
                    </span>

                  </td>

                  <td>
                    <span className="tm-player-name">
                      {row.name}
                    </span>
                  </td>

                  <td>
                    {row.played}
                  </td>

                  <td>
                    {row.wins}
                  </td>

                  <td>
                    {row.losses}
                  </td>

                  <td>
                    <span className="tm-points">
                      {row.points}
                    </span>
                  </td>

                  <td>
                    <span className="tm-difference">
                      {row.difference > 0
                        ? `+${row.difference}`
                        : row.difference}
                    </span>
                  </td>

                </tr>
              )
            )}

          </tbody>

        </table>

      </div>

    </section>
  );
}