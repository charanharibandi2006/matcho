import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import {
  Trophy,
  ClipboardList,
  Calendar,
  Flame,
  CheckCircle2,
  Radio,
  Lock,
  Check,
  Hourglass,
  Circle,
  Share2,
  Users,
  Edit,
  Download,
  MoreVertical,
  Search,
} from "lucide-react";

import OrganizerSidebar from "../components/OrganizerSidebar";
import { apiRequest } from "../services/api";
import { useLiveMatch } from "../context/LiveMatchContext";
import { setRole } from "../utils/auth";

import "./OrganizerDashboard.css";
import "./StatsDashboard.css";


// ==========================================
// TABS
// ==========================================

const TABS = [
  {
    id: "all",
    label: "All",
  },
  {
    id: "Registration Open",
    label: "Registration Open",
  },
  {
    id: "Upcoming",
    label: "Upcoming",
  },
  {
    id: "Ongoing",
    label: "Ongoing",
  },
  {
    id: "Completed",
    label: "Completed",
  },
];


// ==========================================
// FORMAT DATE RANGE
// ==========================================

function formatDateRange(start, end) {
  if (!start && !end) {
    return "TBD";
  }

  const opts = {
    day: "2-digit",
    month: "short",
  };

  const startLabel = start
    ? new Date(start).toLocaleDateString(
        "en-GB",
        opts
      )
    : "TBD";

  const endLabel = end
    ? new Date(end).toLocaleDateString(
        "en-GB",
        opts
      )
    : "TBD";

  return `${startLabel} - ${endLabel}`;
}


// ==========================================
// DAYS LEFT
// ==========================================

function daysLeft(endDate) {
  if (!endDate) {
    return null;
  }

  const diff = Math.ceil(
    (new Date(endDate) - new Date()) /
      (1000 * 60 * 60 * 24)
  );

  return diff > 0 ? diff : null;
}


function getTournamentProgress(tournament) {
  const status =
    tournament?.status ||
    "Registration Open";

  return {
    registrationOpen:
      status === "Registration Open",

    registrationClosed:
      ["Upcoming", "Ongoing", "Completed"].includes(status),

    setupComplete:
      ["Ongoing", "Completed"].includes(status),

    readyToStart:
      ["Ongoing", "Completed"].includes(status),

    ongoing:
      ["Ongoing", "Completed"].includes(status),

    completed:
      status === "Completed",
  };
}



// ==========================================
// ORGANIZER DASHBOARD
// ==========================================

export default function OrganizerDashboardHome() {
  const navigate = useNavigate();

  const {
    matches,
    notifications,
  } = useLiveMatch();

  // ==========================================
  // TOURNAMENT STATE
  // ==========================================

  const [tournaments, setTournaments] =
    useState([]);

  const [
    loadingTournaments,
    setLoadingTournaments,
  ] = useState(true);

  const [
    tournamentError,
    setTournamentError,
  ] = useState("");

  const [
    activeTab,
    setActiveTab,
  ] = useState(
    "Registration Open"
  );

  const [search, setSearch] =
    useState("");


  // ==========================================
  // LOAD TOURNAMENTS FROM BACKEND
  // ==========================================

  async function loadMyTournaments() {
    try {
      setLoadingTournaments(true);
      setTournamentError("");

      const token =
        localStorage.getItem(
          "matcho_token"
        );

      if (!token) {
        setTournamentError(
          "Please login as an organizer."
        );

        setTournaments([]);

        return;
      }

      const result =
        await apiRequest(
          "/tournaments/my",
          {
            method: "GET",

            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      const backendTournaments =
        Array.isArray(
          result?.tournaments
        )
          ? result.tournaments
          : [];

      const formattedTournaments =
        backendTournaments.map(
          (tournament) => {

            const sport =
              tournament.sport ||
              "";

            const sportName =
              sport
                ? sport
                    .charAt(0)
                    .toUpperCase() +
                  sport.slice(1)
                : "Unknown";

            return {
              ...tournament,

              // Frontend-friendly fields
              sportName,

              participants:
                Number(
                  tournament.participant_count ||
                  0
                ),

              maxParticipants:
                Number(
                  tournament.max_players ||
                  0
                ),

              regStart:
                tournament.start_date,

              regEnd:
                tournament.end_date,

              startDate:
                tournament.start_date,

              endDate:
                tournament.end_date,

              registrationCode:
                tournament.registration_code,

              status:
                tournament.status ||
                "Registration Open",
            };
          }
        );

      setTournaments(
        formattedTournaments
      );

    } catch (error) {
      console.error(
        "Load My Tournaments Error:",
        error
      );

      setTournamentError(
        error.message ||
          "Unable to load tournaments."
      );

      setTournaments([]);

    } finally {
      setLoadingTournaments(false);
    }
  }


  // ==========================================
  // INITIAL LOAD
  // ==========================================

  useEffect(() => {
    setRole("organizer");
    loadMyTournaments();
  }, []);


  // ==========================================
  // LIVE MATCHES
  // ==========================================

  const liveMatches =
    Array.isArray(matches)
      ? matches.filter(
          (match) =>
            match.status === "LIVE"
        )
      : [];


  // ==========================================
  // STATS
  // ==========================================

  const stats = useMemo(
    () => ({
      total: tournaments.length,

      regOpen:
        tournaments.filter(
          (tournament) =>
            tournament.status ===
            "Registration Open"
        ).length,

      upcoming:
        tournaments.filter(
          (tournament) =>
            tournament.status ===
            "Upcoming"
        ).length,

      ongoing:
        tournaments.filter(
          (tournament) =>
            tournament.status ===
            "Ongoing"
        ).length,

      completed:
        tournaments.filter(
          (tournament) =>
            tournament.status ===
            "Completed"
        ).length,
    }),
    [tournaments]
  );


  // ==========================================
  // FILTERED TOURNAMENTS
  // ==========================================

  const filteredTournaments =
    useMemo(() => {

      let list = [
        ...tournaments,
      ];

      if (activeTab !== "all") {
        list = list.filter(
          (tournament) =>
            tournament.status ===
            activeTab
        );
      }

      if (search.trim()) {
        const query =
          search
            .trim()
            .toLowerCase();

        list = list.filter(
          (tournament) => {

            const name =
              String(
                tournament.name || ""
              ).toLowerCase();

            const sport =
              String(
                tournament.sportName ||
                  tournament.sport ||
                  ""
              ).toLowerCase();

            const category =
              String(
                tournament.category ||
                  ""
              ).toLowerCase();

            const registrationCode =
              String(
                tournament.registrationCode ||
                  ""
              ).toLowerCase();

            return (
              name.includes(query) ||
              sport.includes(query) ||
              category.includes(query) ||
              registrationCode.includes(
                query
              )
            );
          }
        );
      }

      return list;

    }, [
      tournaments,
      activeTab,
      search,
    ]);


  // ==========================================
  // STAT CARDS
  // ==========================================

  const STAT_CARDS = [
    {
      icon: Trophy,
      cls: "icon-purple",
      value: stats.total,
      label: "Total Tournaments",
      sub: "All time",
    },

    {
      icon: ClipboardList,
      cls: "icon-green",
      value: stats.regOpen,
      label: "Registration Open",
      sub: "Accepting registrations",
    },

    {
      icon: Calendar,
      cls: "icon-blue",
      value: stats.upcoming,
      label: "Upcoming",
      sub: "Starting soon",
    },

    {
      icon: Flame,
      cls: "icon-orange",
      value: stats.ongoing,
      label: "Ongoing",
      sub: "Live now",
    },

    {
      icon: CheckCircle2,
      cls: "icon-yellow",
      value: stats.completed,
      label: "Completed",
      sub: "Finished",
    },
  ];


  // ==========================================
  // LIVE MATCH CLICK
  // ==========================================

  const handleLiveMatchClick =
    (match) => {
      navigate(
        `/live-scoring/${match.id}`
      );
    };


  // ==========================================
  // SHARE TOURNAMENT
  // ==========================================

  async function handleShareTournament(
    tournament
  ) {
    if (
      !tournament?.registrationCode
    ) {
      return;
    }

    const code =
      tournament.registrationCode;

    const shareUrl =
      `${window.location.origin}/join-tournament?code=${encodeURIComponent(
        code
      )}`;

    const shareText =
      `Join my ${tournament.name} tournament on Matcho.\n\nRegistration Code: ${code}\n\nJoin here: ${shareUrl}`;

    try {

      if (
        navigator.share
      ) {
        await navigator.share({
          title:
            tournament.name ||
            "Matcho Tournament",

          text: shareText,

          url: shareUrl,
        });

        return;
      }

      await navigator.clipboard.writeText(
        shareText
      );

      alert(
        "Tournament registration link copied!"
      );

    } catch (error) {

      if (
        error?.name ===
        "AbortError"
      ) {
        return;
      }

      console.error(
        "Share Tournament Error:",
        error
      );
    }
  }


  // ==========================================
  // VIEW REGISTRATIONS
  // ==========================================

  function handleViewRegistrations(
    tournament
  ) {
    if (!tournament?.id) {
      return;
    }

    navigate(
      `/tournament-management?tournamentId=${tournament.id}`
    );
  }


  // ==========================================
  // EDIT TOURNAMENT
  // ==========================================

  function handleEditTournament(
    tournament
  ) {
    if (!tournament?.id) {
      return;
    }

    navigate(
      `/tournament-management?tournamentId=${tournament.id}`
    );
  }


  // ==========================================
  // VIEW TOURNAMENT
  // ==========================================

  function handleViewTournament(
    tournament
  ) {
    if (!tournament?.id) {
      return;
    }

    navigate(
      `/tournament-management?tournamentId=${tournament.id}`
    );
  }

  // ==========================================
// TOURNAMENT MANAGEMENT NAVIGATION
// ==========================================

function openTournamentManagement(
  tournament,
  view = "overview",
  action = ""
) {
  if (!tournament?.id) {
    return;
  }

  const params =
    new URLSearchParams();

  params.set(
    "tournamentId",
    tournament.id
  );

  if (view) {
    params.set("view", view);
  }

  if (action) {
    params.set("action", action);
  }

  navigate(
    `/tournament-management?${params.toString()}`
  );
}


// ==========================================
// SELECTED TOURNAMENT
// ==========================================

const selectedTournament =
  filteredTournaments[0] ||
  tournaments[0] ||
  null;


// ==========================================
// TOURNAMENT USED FOR SETUP
// Prefer a tournament whose registrations
// are already closed. This prevents the
// setup buttons from staying disabled just
// because the dashboard filter is currently
// on "Registration Open".
// ==========================================

const setupTournament =
  tournaments.find(
    (item) =>
      item.status !==
      "Registration Open"
  ) ||
  selectedTournament ||
  null;

const setupLocked =
  !setupTournament ||
  setupTournament.status ===
    "Registration Open";

const progress =
  getTournamentProgress(
    selectedTournament
  );


// ==========================================
// TEAM SETUP
// ==========================================

function handleTeamSetup(
  action
) {
  openTournamentManagement(
    setupTournament,
    "teams",
    action
  );
}


// ==========================================
// FIXTURE SETUP
// ==========================================

function handleFixtureSetup(
  action
) {
  openTournamentManagement(
    setupTournament,
    "fixtures",
    action
  );
}


  // ==========================================
  // REFRESH
  // ==========================================

  function handleRefresh() {
    loadMyTournaments();
  }


  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="org-layout">

      {/* ======================================
          SIDEBAR
      ====================================== */}

      <OrganizerSidebar
        activeItem="Dashboard"
      />


      {/* ======================================
          MAIN
      ====================================== */}

      <div className="org-main">

        <div className="org-content">


          {/* ==================================
              HEADER
          ================================== */}

          <div className="org-header">

            <div>

              <h1>
                Organizer Dashboard
              </h1>

              <p>
                Manage your tournaments
                and track progress.
              </p>

            </div>


            <div className="org-header-right">

              <button
                className="org-btn-primary"
                onClick={() =>
                  navigate(
                    "/select-sport",
                    {
                      state: {
                        mode:
                          "organizer",
                      },
                    }
                  )
                }
              >
                + Create Tournament
              </button>

            </div>

          </div>


          {/* ==================================
              STATS
          ================================== */}

          <div className="org-stats-row">

            {STAT_CARDS.map(
              ({
                icon: Icon,
                cls,
                value,
                label,
                sub,
              }) => (

                <div
                  className="org-stat-card"
                  key={label}
                >

                  <div
                    className={`org-stat-icon ${cls}`}
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

                    <small>
                      {sub}
                    </small>

                  </div>

                </div>
              )
            )}

          </div>


          {/* ==================================
              LIVE MATCHES
          ================================== */}

          {liveMatches.length > 0 && (

            <div className="org-panel">

              <div className="org-panel-head">

                <h4>

                  Live Matches

                  <span
                    className="live-pill-sm"
                    style={{
                      marginLeft: 10,
                    }}
                  >
                    <Radio
                      size={10}
                      className="live-pulsing-dot"
                    />

                    {" "}

                    {liveMatches.length}
                    {" "}
                    LIVE

                  </span>

                </h4>


                <span
                  style={{
                    fontSize: 12,
                    color: "#8a8fa3",
                  }}
                >
                  Click a match to open
                  full-screen scoring
                </span>

              </div>


              <div className="org-live-grid">

                {liveMatches.map(
                  (match) => (

                    <div
                      key={match.id}
                      className="org-live-card is-live"
                      onClick={() =>
                        handleLiveMatchClick(
                          match
                        )
                      }
                    >

                      <div
                        className="org-live-card-top"
                      >

                        <span className="sport-tag">
                          {match.sportIcon}
                          {" "}
                          {match.sportName}
                        </span>


                        <span className="live-badge-pulse">

                          <Radio
                            size={10}
                            className="live-pulsing-dot"
                          />

                          {" "}
                          LIVE

                        </span>

                      </div>


                      <p
                        style={{
                          margin:
                            "4px 0",
                          fontSize: 12,
                          color:
                            "#8a8fa3",
                        }}
                      >
                        {match.tournament}
                        {" · "}
                        {match.round}
                      </p>


                      <div className="org-live-scores">

                        <div>

                          <div className="org-live-score-big blue">
                            {
                              match
                                .player1
                                .score
                            }
                          </div>

                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color:
                                "#2563eb",
                            }}
                          >
                            {
                              match
                                .player1
                                .shortName ||
                              match
                                .player1
                                .name
                            }
                          </div>

                        </div>


                        <span
                          style={{
                            color:
                              "#c8cad8",
                            fontWeight: 700,
                          }}
                        >
                          VS
                        </span>


                        <div
                          style={{
                            textAlign:
                              "right",
                          }}
                        >

                          <div className="org-live-score-big pink">
                            {
                              match
                                .player2
                                .score
                            }
                          </div>

                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color:
                                "#ec4899",
                            }}
                          >
                            {
                              match
                                .player2
                                .shortName ||
                              match
                                .player2
                                .name
                            }
                          </div>

                        </div>

                      </div>


                      <div className="org-live-card-foot">

                        <span>
                          {
                            match.court ||
                            match.field ||
                            "Court 1"
                          }
                        </span>

                        <span className="org-open-fullscreen">
                          Open Full Screen →
                        </span>

                      </div>

                    </div>
                  )
                )}

              </div>

            </div>
          )}


          {/* ==================================
              MY TOURNAMENTS
          ================================== */}

          <div className="org-panel">

            <div className="org-panel-head">

              <h4>
                My Tournaments
              </h4>


              <div className="org-search-row">

                <div
                  style={{
                    position:
                      "relative",
                  }}
                >

                  <Search
                    size={14}
                    style={{
                      position:
                        "absolute",
                      left: 10,
                      top: 10,
                      color:
                        "#9aa0b4",
                    }}
                  />


                  <input
                    className="org-search-input"
                    style={{
                      paddingLeft: 32,
                    }}
                    placeholder="Search..."
                    value={search}
                    onChange={(event) =>
                      setSearch(
                        event.target.value
                      )
                    }
                  />

                </div>


                <button
                  className="org-filter-btn"
                  type="button"
                  onClick={() =>
                    setActiveTab("all")
                  }
                >
                  All
                </button>


              </div>

            </div>


            {/* ==================================
                TABS
            ================================== */}

            <div className="org-tabs">

              {TABS.map(
                (tab) => {

                  const count =
                    tab.id === "all"
                      ? tournaments.length
                      : tournaments.filter(
                          (tournament) =>
                            tournament.status ===
                            tab.id
                        ).length;

                  return (

                    <button
                      type="button"
                      key={tab.id}
                      className={`org-tab ${
                        activeTab ===
                        tab.id
                          ? "active"
                          : ""
                      }`}
                      onClick={() =>
                        setActiveTab(
                          tab.id
                        )
                      }
                    >

                      {tab.label}

                      <span className="org-tab-count">
                        ({count})
                      </span>

                    </button>

                  );
                }
              )}

            </div>


            {/* ==================================
                TABLE
            ================================== */}

            <div className="stat-table-wrap">

              <table className="org-table">

                <thead>
  <tr>
    <th>Tournament</th>
    <th>Sport</th>
    <th>Tournament Dates</th>
    <th>Participants</th>
    <th>Status</th>
    <th>Standings</th>
    <th>Schedule</th>
  </tr>
</thead>


                <tbody>

                  {loadingTournaments ? (

                    <tr>

                      <td
                        colSpan={7}
                        className="stat-empty"
                      >
                        Loading your tournaments...
                      </td>

                    </tr>

                  ) : tournamentError ? (

                    <tr>

                      <td
                        colSpan={7}
                        className="stat-empty"
                      >

                        {tournamentError}

                        <div
                          style={{
                            marginTop: 12,
                          }}
                        >

                          <button
                            type="button"
                            className="org-view-btn"
                            onClick={
                              handleRefresh
                            }
                          >
                            Try Again
                          </button>

                        </div>

                      </td>

                    </tr>

                  ) : filteredTournaments.length ===
                    0 ? (

                    <tr>

                      <td
                        colSpan={7}
                        className="stat-empty"
                      >

                        {search.trim()
                          ? "No tournaments match your search."
                          : "No tournaments found. Click \"+ Create Tournament\" to get started."}

                      </td>

                    </tr>

                  ) : (

                    filteredTournaments.map(
                      (tournament) => {

                        const left =
                          daysLeft(
                            tournament.regEnd
                          );

                        return (

                         <tr key={tournament.id}>

  {/* TOURNAMENT */}
  <td>
    <div className="org-table-tournament">
      {tournament.name}
    </div>

    <div className="org-table-sub">
      {tournament.category || "-"}
      {" • "}
      {tournament.format || "-"}
    </div>

    {tournament.registrationCode && (
      <div
        className="org-table-sub"
        style={{ marginTop: 3 }}
      >
        ID: {tournament.registrationCode}
      </div>
    )}
  </td>


  {/* SPORT */}
  <td>
    <span className="org-sport-name">
      {tournament.sportName ||
        tournament.sport ||
        "-"}
    </span>
  </td>


  {/* TOURNAMENT DATES */}
  <td>
    {formatDateRange(
      tournament.startDate,
      tournament.endDate
    )}

    {left &&
      tournament.status ===
        "Registration Open" && (
        <div className="org-days-left">
          {left} days left
        </div>
      )}
  </td>


  {/* PARTICIPANTS */}
  <td>
    <span className="org-participant-count">
      {tournament.participants}
    </span>

    {" / "}

    {tournament.maxParticipants}
  </td>


  {/* STATUS */}
  <td>
    {tournament.status ===
    "Registration Open" ? (
      <span className="org-status-open">
        Registration Open
      </span>
    ) : tournament.status ===
      "Ongoing" ? (
      <span className="status-pill">
        Ongoing
      </span>
    ) : tournament.status ===
      "Upcoming" ? (
      <span className="badge-blue">
        Upcoming
      </span>
    ) : (
      <span className="badge-green">
        {tournament.status}
      </span>
    )}
  </td>


  {/* STANDINGS */}
  <td>
    <button
  type="button"
  className="org-table-action standings-btn"
  onClick={() =>
    navigate(
      `/tournament-management?tournamentId=${tournament.id}&section=standings`
    )
  }
>
  Points Table
</button>
  </td>


  {/* SCHEDULE */}
  <td>
    <button
  type="button"
  className="org-table-action schedule-btn"
  onClick={() =>
    navigate(
      `/tournament-management?tournamentId=${tournament.id}&section=fixtures`
    )
  }
>
  Fixtures
</button>
  </td>

</tr>

                        );
                      }
                    )

                  )}

                </tbody>

              </table>

            </div>


            <button
  type="button"
  className="org-view-all-btn"
  onClick={() => {
    setActiveTab("all");
    setSearch("");

    setTimeout(() => {
      document
        .querySelector(".org-panel")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 50);
  }}
>
  <span>View All Tournaments</span>
  <span>→</span>
</button>

          </div>


          {/* ==================================
              BOTTOM GRID
          ================================== */}

          <div className="org-bottom-grid">


            {/* ==================================
                TOURNAMENT SETUP
            ================================== */}

            <div className="org-panel org-setup-card">

              <h5>
                Tournament Setup
              </h5>

              {/* TEAM SETUP */}

<div className="org-setup-step">
  <strong>1. Team Setup</strong>

  <button
    type="button"
    className="org-setup-link"
    onClick={() => {
      if (!selectedTournament) return;

      navigate(
        `/tournament-management?tournamentId=${selectedTournament.id}&section=teams`
      );
    }}
  >
    Go to Team Setup
  </button>
</div>


              {/* FIXTURE SETUP */}

             {/* FIXTURE SETUP */}

<div className="org-setup-step">
  <strong>2. Fixture Setup</strong>

  <button
    type="button"
    className="org-setup-link"
    onClick={() => {
      if (!selectedTournament) return;

      navigate(
        `/tournament-management?tournamentId=${selectedTournament.id}&section=setup`
      );
    }}
  >
    Go to Fixture Setup
  </button>
</div>


              {/* STATUS MESSAGE */}

              <div
                className={
                  setupLocked
                    ? "org-locked-banner"
                    : "org-setup-ready-banner"
                }
              >

                <Lock size={14} />

                {setupLocked
                  ? "Registrations must be closed to access setup"
                  : `Setup available for ${setupTournament?.name || "the selected tournament"}.`}

              </div>

            </div>


            {/* ==================================
                TOURNAMENT PROGRESS
            ================================== */}

            <div className="org-panel">

              <h5
                style={{
                  margin:
                    "0 0 14px",
                  fontSize: 14,
                }}
              >
                Tournament Progress
              </h5>


              <ul className="org-progress-list">

                <li className="org-progress-item">
                  <span className="org-progress-dot done">
                    <Check size={12} />
                  </span>
                  Tournament Created
                </li>

                <li className="org-progress-item">
                  <span
                    className={
                      progress.registrationOpen
                        ? "org-progress-dot active"
                        : "org-progress-dot done"
                    }
                  >
                    {progress.registrationOpen ? (
                      <Hourglass size={12} />
                    ) : (
                      <Check size={12} />
                    )}
                  </span>
                  Registration Open
                </li>

                <li className="org-progress-item">
                  <span
                    className={
                      progress.registrationClosed
                        ? "org-progress-dot done"
                        : "org-progress-dot pending"
                    }
                  >
                    {progress.registrationClosed ? (
                      <Check size={12} />
                    ) : (
                      <Circle size={10} />
                    )}
                  </span>
                  Registration Closed
                </li>

                <li className="org-progress-item">
                  <span
                    className={
                      progress.setupComplete
                        ? "org-progress-dot done"
                        : progress.registrationClosed
                        ? "org-progress-dot active"
                        : "org-progress-dot pending"
                    }
                  >
                    {progress.setupComplete ? (
                      <Check size={12} />
                    ) : progress.registrationClosed ? (
                      <Hourglass size={12} />
                    ) : (
                      <Circle size={10} />
                    )}
                  </span>
                  Setup Complete
                </li>

                <li className="org-progress-item">
                  <span
                    className={
                      progress.readyToStart
                        ? "org-progress-dot done"
                        : "org-progress-dot pending"
                    }
                  >
                    {progress.readyToStart ? (
                      <Check size={12} />
                    ) : (
                      <Circle size={10} />
                    )}
                  </span>
                  Ready to Start
                </li>

                <li className="org-progress-item">
                  <span
                    className={
                      progress.ongoing
                        ? "org-progress-dot active"
                        : "org-progress-dot pending"
                    }
                  >
                    {progress.ongoing ? (
                      <Flame size={12} />
                    ) : (
                      <Circle size={10} />
                    )}
                  </span>
                  Ongoing
                </li>

                <li className="org-progress-item">
                  <span
                    className={
                      progress.completed
                        ? "org-progress-dot done"
                        : "org-progress-dot pending"
                    }
                  >
                    {progress.completed ? (
                      <Check size={12} />
                    ) : (
                      <Circle size={10} />
                    )}
                  </span>
                  Completed
                </li>

              </ul>

            </div>


            {/* ==================================
                QUICK ACTIONS
            ================================== */}

            <div className="org-panel">

              <h5
                style={{
                  margin:
                    "0 0 14px",
                  fontSize: 14,
                }}
              >
                Quick Actions
              </h5>


              <div
                className="org-quick-action"
                onClick={() =>
                  selectedTournament
                    ? handleShareTournament(
                        selectedTournament
                      )
                    : null
                }
              >

                <Share2
                  size={16}
                />

                Share Registration Link

              </div>


              <div
  className="org-quick-action"
  onClick={() => {
    if (!filteredTournaments[0]) return;

    navigate(
      `/tournament-management?tournamentId=${filteredTournaments[0].id}&section=participants`
    );
  }}
>
  <Users size={16} />
  View Registrations
</div>


              <div
                className="org-quick-action"
                onClick={() =>
                  selectedTournament
                    ? handleEditTournament(
                        selectedTournament
                      )
                    : null
                }
              >

                <Edit
                  size={16}
                />

                Edit Tournament

              </div>


            


              <div className="org-note-box">

                <strong>
                  Important Note
                </strong>

                {setupLocked
                  ? "Team and fixture setup is locked while registrations are open."
                  : "Registrations are closed. Team and fixture setup is available."}

              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}