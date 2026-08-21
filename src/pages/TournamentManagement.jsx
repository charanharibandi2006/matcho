import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { socket } from "../services/socket";

import { getRole } from "../utils/auth";

import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import {
  CalendarDays,
  ChevronDown,
  Dices,
  GitBranch,
  Radio,
  Trophy,
  Users,
  Share2,
  Copy,
  Check,
  Pencil,
  X,
  UserPlus,
  Trash2
} from "lucide-react";

import RoleSidebar from "../components/RoleSidebar";

import { apiRequest } from "../services/api";

import "./OrganizerDashboard.css";
import "./StatsDashboard.css";
import "./TournamentManagement.css";


// =========================================================
// CUSTOM TOURNAMENT DROPDOWN
// =========================================================

function DesktopTournamentDropdown({
  tournaments,
  value,
  onChange,
}) {
  const [open, setOpen] = useState(false);

  const dropdownRef = useRef(null);

  const selectedTournament =
    tournaments.find(
      (item) =>
        String(item.id) ===
        String(value)
    );

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(
          event.target
        )
      ) {
        setOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  return (
    <div
      className="tm-dropdown"
      ref={dropdownRef}
    >
      <button
        type="button"
        className={`tm-dropdown-trigger ${
          open ? "open" : ""
        }`}
        onClick={() =>
          setOpen(
            (previous) => !previous
          )
        }
      >
        <Trophy size={18} />

        <span
          className={
            !selectedTournament
              ? "placeholder"
              : ""
          }
        >
          {selectedTournament
            ? selectedTournament.name
            : "Select a tournament"}
        </span>

        <ChevronDown
          size={17}
          className={`tm-dropdown-arrow ${
            open ? "rotate" : ""
          }`}
        />
      </button>

      {open && (
        <div className="tm-dropdown-menu">
          <button
            type="button"
            className={`tm-dropdown-option placeholder-option ${
              !value ? "selected" : ""
            }`}
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
          >
            Select a tournament
          </button>

          {tournaments.map((item) => (
            <button
              type="button"
              key={item.id}
              className={`tm-dropdown-option ${
                String(item.id) ===
                String(value)
                  ? "selected"
                  : ""
              }`}
              onClick={() => {
                onChange(item.id);
                setOpen(false);
              }}
            >
              <span>{item.name}</span>

              {String(item.id) ===
                String(value) && (
                <span className="tm-dropdown-check">
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TournamentDropdown({
  tournaments,
  value,
  onChange,
}) {
  const selectedTournament =
    tournaments.find(
      (item) =>
        String(item.id) ===
        String(value)
    );

  return (
    <div className="tm-dropdown">

      {/* =========================================
          DESKTOP DROPDOWN
      ========================================== */}
      <div className="tm-desktop-dropdown">
        <DesktopTournamentDropdown
          tournaments={tournaments}
          value={value}
          onChange={onChange}
        />
      </div>

      {/* =========================================
          MOBILE DROPDOWN
          Native select = no clipping/overflow
      ========================================== */}
      <div className="tm-mobile-dropdown">
        <div className="tm-mobile-select-wrap">
          <Trophy
            size={18}
            className="tm-mobile-select-icon"
          />

          <select
            value={value || ""}
            onChange={(event) =>
              onChange(event.target.value)
            }
            className="tm-mobile-select"
          >
            <option value="">
              Select a tournament
            </option>

            {tournaments.map((item) => (
              <option
                key={item.id}
                value={item.id}
              >
                {item.name}
              </option>
            ))}
          </select>

          <ChevronDown
            size={17}
            className="tm-mobile-select-arrow"
          />
        </div>
      </div>

    </div>
  );
}


// =========================================================
// STANDINGS CALCULATION
// =========================================================

function standings(
  players,
  fixtures
) {
  return players
    .map((player) => {

      const record = {
        name:
          player.name ||
          player.participant_name ||
          "",
        played: 0,
        won: 0,
        lost: 0,
        points: 0,
        difference: 0,
      };

      fixtures
        .filter(
          (match) =>
            match.status ===
            "COMPLETED"
        )
        .forEach((match) => {

          const player1Name =
            match.player1?.name;

          const player2Name =
            match.player2?.name;

          if (
            ![
              player1Name,
              player2Name,
            ].includes(
              record.name
            )
          ) {
            return;
          }

          const isP1 =
            player1Name ===
            record.name;

          const own =
            Number(
              isP1
                ? match.player1?.score
                : match.player2?.score
            ) || 0;

          const opponent =
            Number(
              isP1
                ? match.player2?.score
                : match.player1?.score
            ) || 0;

          record.played += 1;

          record.difference +=
            own - opponent;

          if (
            match.winner ===
            record.name
          ) {
            record.won += 1;
            record.points += 2;
          } else {
            record.lost += 1;
          }
        });

      return record;

    })
    .sort(
      (a, b) =>
        b.points -
          a.points ||
        b.difference -
          a.difference ||
        a.name.localeCompare(
          b.name
        )
    );
}


// =========================================================
// MAIN COMPONENT
// =========================================================

export default function TournamentManagement() {

  const navigate =
    useNavigate();

  const [searchParams] = useSearchParams();

const [
  activeSection,
  setActiveSection,
] = useState(
  () =>
    searchParams.get("section") || "overview"
);

useEffect(() => {
  const section =
    searchParams.get("section");

  if (section) {
    setActiveSection(section);
  }
}, [searchParams]);


  // =======================================================
  // ROLE PROTECTION
  // =======================================================

  useEffect(() => {

    if (
      getRole() !==
      "organizer"
    ) {
      navigate(
        "/join-tournament",
        {
          replace: true,
        }
      );
    }

  }, [navigate]);


  // =======================================================
  // STATE
  // =======================================================

  const [
    tournaments,
    setTournaments,
  ] = useState([]);

  const [
    participants,
    setParticipants,
  ] = useState([]);

  const [
    tournamentId,
    setTournamentId,
  ] = useState("");

  const [
  format,
  setFormat,
] = useState("Doubles");

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    loadingTournaments,
    setLoadingTournaments,
  ] = useState(true);

  const [
    loadingParticipants,
    setLoadingParticipants,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    participantError,
    setParticipantError,
  ] = useState("");

  const [
    copiedCode,
    setCopiedCode,
  ] = useState(false);

  const [teams, setTeams] = useState([]);

const [loadingTeams, setLoadingTeams] =
  useState(false);

const [teamError, setTeamError] =
  useState("");

const [teamModalOpen, setTeamModalOpen] =
  useState(false);

const [editingTeam, setEditingTeam] =
  useState(null);

const [teamName, setTeamName] =
  useState("");

const [selectedPlayers, setSelectedPlayers] =
  useState([]);

  const [teamSaving, setTeamSaving] =
    useState(false);

    const [pairConfirmOpen, setPairConfirmOpen] = useState(false);
const [pairGenerating, setPairGenerating] = useState(false);

    const [fixtures, setFixtures] = useState([]);
const [loadingFixtures, setLoadingFixtures] = useState(false);
const [fixtureError, setFixtureError] = useState("");
const [fixtureSaving, setFixtureSaving] = useState(false);

const [selectedFixture, setSelectedFixture] = useState(null);
const [fixtureFilter, setFixtureFilter] =
  useState("all");

  const filteredFixtures = useMemo(() => {
  switch (fixtureFilter) {
    case "group":
      return fixtures.filter(
        (fixture) => fixture.stage === "Pool"
      );

    case "super8":
      return fixtures.filter(
        (fixture) => fixture.stage === "Super 8"
      );

    case "semi":
      return fixtures.filter(
        (fixture) => fixture.stage === "Semi Final"
      );

    case "final":
      return fixtures.filter(
        (fixture) => fixture.stage === "Final"
      );

    default:
      return fixtures;
  }
}, [fixtures, fixtureFilter]);
  // =======================================================
  // EDIT TOURNAMENT STATE
  // =======================================================

  const [
    isEditingTournament,
    setIsEditingTournament,
  ] = useState(false);

  const [
    editLoading,
    setEditLoading,
  ] = useState(false);

  const [
    editError,
    setEditError,
  ] = useState("");

  const [
    editForm,
    setEditForm,
  ] = useState({
    name: "",
    category: "",
    startDate: "",
    endDate: "",
    location: "",
    maxParticipants: "",
    description: "",
    format: "",
    status: "",
  });


  // =======================================================
  // LOAD ORGANIZER TOURNAMENTS
  // =======================================================

  async function loadMyTournaments() {

    try {

      setLoadingTournaments(
        true
      );

      setError("");

      const token =
        localStorage.getItem(
          "matcho_token"
        );

      if (!token) {

        setError(
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

      const formatted =
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

              sportName,

              registrationCode:
                tournament.registration_code,

              maxParticipants:
                Number(
                  tournament.max_players ||
                    0
                ),

              participants:
                Number(
                  tournament.participant_count ||
                    0
                ),
            };
          }
        );

      setTournaments(
        formatted
      );


      // =============================================
      // AUTO SELECT FROM URL
      // =============================================

      const urlTournamentId =
  searchParams.get("tournamentId");

if (urlTournamentId) {
  const matchingTournament =
    formatted.find(
      (item) =>
        String(item.id) ===
        String(urlTournamentId)
    );

  if (matchingTournament) {
    setTournamentId(
      matchingTournament.id
    );

    setFormat(
      String(
        matchingTournament.format || ""
      ).toLowerCase() === "singles"
        ? "Singles"
        : "Doubles"
    );

    return;
  }
}

/* Automatically select first tournament */
if (formatted.length > 0) {
  setTournamentId(
    formatted[0].id
  );

  setFormat(
    String(
      formatted[0].format || ""
    ).toLowerCase() === "singles"
      ? "Singles"
      : "Doubles"
  );
}

      if (urlTournamentId) {

        const matchingTournament =
          formatted.find(
            (item) =>
              String(item.id) ===
              String(
                urlTournamentId
              )
          );

        if (
          matchingTournament
        ) {

          setTournamentId(
            matchingTournament.id
          );

          setFormat(
  String(
    matchingTournament.format || ""
  ).toLowerCase() === "singles"
    ? "Singles"
    : "Doubles"
);
        }

      } else if (
        formatted.length === 1
      ) {

        setTournamentId(
          formatted[0].id
        );
        setFormat(
  String(
    formatted[0].format || ""
  ).toLowerCase() === "singles"
    ? "Singles"
    : "Doubles"
);
      }

    } catch (err) {

      console.error(
        "Load tournaments error:",
        err
      );

      setError(
        err.message ||
          "Unable to load tournaments."
      );

      setTournaments([]);

    } finally {

      setLoadingTournaments(
        false
      );
    }
  }


  // =======================================================
  // INITIAL LOAD
  // =======================================================

  useEffect(() => {

    loadMyTournaments();

  }, []);

  function openCreateTeam() {
  setEditingTeam(null);

  setTeamName(
    `Team ${teams.length + 1}`
  );

  setSelectedPlayers([]);

  setTeamError("");

  setTeamModalOpen(true);
}
function openEditTeam(team) {
  setEditingTeam(team);

  setTeamName(
    team.team_name || ""
  );

  setSelectedPlayers(
    (team.players || []).map(
      (player) =>
        Number(player.id)
    )
  );

  setTeamError("");

  setTeamModalOpen(true);
}

function togglePlayer(
  playerId
) {
  const id =
    Number(playerId);

  setSelectedPlayers(
    (previous) => {

      if (
        previous.includes(id)
      ) {
        return previous.filter(
          (item) =>
            item !== id
        );
      }

      if (
        previous.length >= 2
      ) {
        return previous;
      }

      return [
        ...previous,
        id,
      ];
    }
  );
}

async function openFixtureScoring(match) {
  try {
    setFixtureSaving(true);
    setFixtureError("");
    setMessage("");

    const token =
      localStorage.getItem("matcho_token");

    if (!token) {
      throw new Error(
        "Please login as an organizer."
      );
    }

    // Start the match only if it is still Upcoming
    if (match.status === "Upcoming") {
      await apiRequest(
        `/fixtures/score/${match.id}`,
        {
          method: "PUT",

          headers: {
            Authorization:
              `Bearer ${token}`,
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            playerAScore: 0,
            playerBScore: 0,
            status: "Live",
          }),
        }
      );
    }

    // Open scoring for this exact fixture
    navigate(
  `/score-update?fixtureId=${match.id}&tournamentId=${tournamentId}`
);

  } catch (error) {
    console.error(
      "Open Scoring Error:",
      error
    );

    setFixtureError(
      error.message ||
        "Unable to open scoring."
    );

  } finally {
    setFixtureSaving(false);
  }
}

function openMatchSummary(match) {
  setSelectedFixture(match);
}

async function saveTeam(event) {
  event.preventDefault();

  setTeamError("");

  if (!teamName.trim()) {
    setTeamError(
      "Team name is required."
    );
    return;
  }

  if (
    selectedPlayers.length !== 2
  ) {
    setTeamError(
      "Select exactly 2 players for a doubles pair."
    );
    return;
  }

  try {
    setTeamSaving(true);

    const token =
      localStorage.getItem(
        "matcho_token"
      );

    const isEditing =
      Boolean(editingTeam);

    const url = isEditing
      ? `/tournaments/${tournamentId}/teams/${editingTeam.id}`
      : `/tournaments/${tournamentId}/teams`;

    const result =
      await apiRequest(
        url,
        {
          method:
            isEditing
              ? "PUT"
              : "POST",

          headers: {
            Authorization:
              `Bearer ${token}`,

            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            teamName:
              teamName.trim(),

            playerIds:
              selectedPlayers,
          }),
        }
      );

    if (!result?.success) {
      throw new Error(
        result?.message ||
          "Unable to save team."
      );
    }

    setTeamModalOpen(
      false
    );

    setEditingTeam(null);

    setTeamName("");

    setSelectedPlayers([]);

    await loadTeams(
      tournamentId
    );

  } catch (error) {
    console.error(
      "Save Team Error:",
      error
    );

    setTeamError(
      error.message ||
        "Unable to save team."
    );

  } finally {
    setTeamSaving(false);
  }
}



async function deleteTeam(
  team
) {
  const confirmed =
    window.confirm(
      `Remove ${team.team_name}?`
    );

  if (!confirmed) {
    return;
  }

  try {
    const token =
      localStorage.getItem(
        "matcho_token"
      );

    const result =
      await apiRequest(
        `/tournaments/${tournamentId}/teams/${team.id}`,
        {
          method: "DELETE",

          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

    if (!result?.success) {
      throw new Error(
        result?.message ||
          "Unable to delete team."
      );
    }

    await loadTeams(
      tournamentId
    );

  } catch (error) {
    console.error(
      "Delete Team Error:",
      error
    );

    setTeamError(
      error.message ||
        "Unable to delete team."
    );
  }
}

// =======================================================
// RANDOMLY GENERATE DOUBLES PAIRS
// =======================================================

async function autoGenerateTeams() {
  if (!tournamentId) {
    setTeamError("Please select a tournament first.");
    return;
  }

  if (fixtures.length > 0) {
    setTeamError(
      "Pairs cannot be randomized after fixtures have been generated."
    );
    return;
  }

  if (unpairedPlayers.length < 2) {
    setTeamError(
      "At least 2 unpaired players are required."
    );
    return;
  }

  if (unpairedPlayers.length % 2 !== 0) {
    setTeamError(
      "You need an even number of unpaired players to create complete pairs."
    );
    return;
  }


  try {
    setTeamError("");
    setMessage("");
    setTeamSaving(true);

    const token =
      localStorage.getItem("matcho_token");

    if (!token) {
      throw new Error(
        "Please login as an organizer."
      );
    }

    // Copy the players so the original state is not changed
    const shuffledPlayers = [
      ...unpairedPlayers,
    ];

    // Fisher-Yates shuffle
    for (
      let i = shuffledPlayers.length - 1;
      i > 0;
      i--
    ) {
      const j = Math.floor(
        Math.random() * (i + 1)
      );

      [
        shuffledPlayers[i],
        shuffledPlayers[j],
      ] = [
        shuffledPlayers[j],
        shuffledPlayers[i],
      ];
    }

    const existingTeamCount =
      teams.length;

    // Create pairs
    for (
      let i = 0;
      i < shuffledPlayers.length;
      i += 2
    ) {
      const playerA =
        shuffledPlayers[i];

      const playerB =
        shuffledPlayers[i + 1];

      const playerAId = Number(playerA.player_id);
const playerBId = Number(playerB.player_id);

if (!Number.isInteger(playerAId) || !Number.isInteger(playerBId)) {
  throw new Error(
    `Invalid player IDs for pair: ${playerA.participant_name} / ${playerB.participant_name}`
  );
}

      await apiRequest(
        `/tournaments/${tournamentId}/teams`,
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${token}`,
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
  teamName: `Team ${
    existingTeamCount + i / 2 + 1
  }`,
  playerIds: [
    playerAId,
    playerBId,
  ],
}),
        }
      );
    }

    await loadTeams(tournamentId);

    await loadParticipants(
      tournamentId
    );

    setMessage(
      `${shuffledPlayers.length / 2} random pairs generated successfully.`
    );
  } catch (error) {
    console.error(
      "Auto Generate Teams Error:",
      error
    );

    setTeamError(
      error.message ||
        "Unable to generate random pairs."
    );
  } finally {
    setTeamSaving(false);
  }
}

  // =======================================================
  // SELECTED TOURNAMENT
  // =======================================================

  const tournament =
    tournaments.find(
      (item) =>
        String(item.id) ===
        String(tournamentId)
    ) || null;
  // =======================================================
  // LOAD PARTICIPANTS
  // =======================================================

  async function loadParticipants(
    selectedTournamentId
  ) {

    if (
      !selectedTournamentId
    ) {

      setParticipants([]);

      return;
    }

    try {

      setLoadingParticipants(
        true
      );

      setParticipantError("");

      const token =
        localStorage.getItem(
          "matcho_token"
        );

      if (!token) {

        setParticipantError(
          "Please login as an organizer."
        );

        return;
      }

      const result =
        await apiRequest(
          `/tournaments/${selectedTournamentId}/participants`,
          {
            method: "GET",

            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      const backendParticipants =
        Array.isArray(
          result?.participants
        )
          ? result.participants
          : [];

      setParticipants(
        backendParticipants
      );

    } catch (err) {

      console.error(
        "Load participants error:",
        err
      );

      setParticipantError(
        err.message ||
          "Unable to load participants."
      );

      setParticipants([]);

    } finally {

      setLoadingParticipants(
        false
      );
    }
  }

  async function loadTeams(
  selectedTournamentId
) {
  if (!selectedTournamentId) {
    setTeams([]);
    return;
  }

  try {
    setLoadingTeams(true);
    setTeamError("");

    const token =
      localStorage.getItem(
        "matcho_token"
      );

    if (!token) {
      setTeamError(
        "Please login as an organizer."
      );
      return;
    }

    const result =
      await apiRequest(
        `/tournaments/${selectedTournamentId}/teams`,
        {
          method: "GET",
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

    setTeams(
      Array.isArray(result?.teams)
        ? result.teams
        : []
    );

  } catch (error) {
    console.error(
      "Load Teams Error:",
      error
    );

    setTeamError(
      error.message ||
        "Unable to load teams."
    );

    setTeams([]);

  } finally {
    setLoadingTeams(false);
  }
}

  async function loadFixtures(selectedTournamentId) {
    if (!selectedTournamentId) {
      setFixtures([]);
      return;
    }

    try {
      setLoadingFixtures(true);
      setFixtureError("");

      const token = localStorage.getItem("matcho_token");

      if (!token) {
        setFixtureError("Please login as an organizer.");
        setFixtures([]);
        return;
      }

      const result = await apiRequest(
        `/fixtures/${selectedTournamentId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setFixtures(
        Array.isArray(result?.fixtures)
          ? result.fixtures
          : []
      );
    } catch (err) {
      console.error("Load fixtures error:", err);
      setFixtureError(
        err.message || "Unable to load fixtures."
      );
      setFixtures([]);
    } finally {
      setLoadingFixtures(false);
    }
  }

  // =======================================================
  // TOURNAMENT CHANGE
  // =======================================================

  function handleTournamentChange(value) {
  setTournamentId(value);
  setMessage("");
  setParticipantError("");
  setParticipants([]);
  setFixtures([]);
  setFixtureError("");
  setActiveSection("overview");

  const selected = tournaments.find(
    (item) =>
      String(item.id) === String(value)
  );

  if (selected) {
    setFormat(
      String(selected.format || "")
        .toLowerCase() === "singles"
        ? "Singles"
        : "Doubles"
    );
  }
}


  // =======================================================
  // LOAD PARTICIPANTS WHEN TOURNAMENT CHANGES
  // =======================================================

  useEffect(() => {

    if (tournamentId) {

      loadParticipants(
        tournamentId
      );
    }

  }, [tournamentId]);

  useEffect(() => {
  if (tournamentId) {
    loadTeams(tournamentId);
  } else {
    setTeams([]);
  }
}, [tournamentId]);

  useEffect(() => {
    if (tournamentId) {
      loadFixtures(tournamentId);
    } else {
      setFixtures([]);
    }
  }, [tournamentId]);

  // =======================================================
// SOCKET.IO - LIVE FIXTURE SCORE UPDATES
// =======================================================

useEffect(() => {
  if (!tournamentId) {
    return;
  }

  // Make sure the socket is connected.
  if (!socket.connected) {
    socket.connect();
  }

  const roomId = String(tournamentId);

  // Join the selected tournament room.
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

    // Ignore updates belonging to another tournament.
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
    "🟢 Tournament Management joined:",
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
}, [tournamentId]);


  // =======================================================
  // DATABASE PARTICIPANTS
  // =======================================================

  const players = participants.map((participant) => ({
    id: participant.player_id || participant.id,
    name:
      participant.participant_name ||
      participant.name ||
      "Unnamed Player",
    email: participant.email || "",
    phone: participant.phone || "",
    registeredAt: participant.registered_at,
  }));

  // =======================================================
  // TEAM / PAIR SUMMARY
  // =======================================================

  const pairedPlayerIds = new Set(
    teams.flatMap((team) =>
      (team.players || []).map((player) => Number(player.id))
    )
  );

  const unpairedPlayers = participants.filter((participant) => {
    const playerId = Number(
      participant.player_id ?? participant.id
    );
    return !pairedPlayerIds.has(playerId);
  });

  // =======================================================
  // FIXTURE CONFIGURATION
  // Men's  -> 4 pools -> Super 8
  // Women's -> 2 pools -> Semi-finals
  // =======================================================

 const category = String(
  tournament?.category || ""
).toLowerCase();

const isWomen =
  category.includes("women") ||
  category.includes("female") ||
  category.includes("girls");

const isDoubles =
  String(tournament?.format || "")
    .toLowerCase() === "doubles" ||
  category.includes("doubles");

// Women's tournament changes to large format at 48+ registered participants
const largeWomensFormat =
  isWomen && participants.length >= 48;

// Small women's format:
//   2 pools → semifinals → final
//
// Large women's / men's format:
//   4 pools → Super 8 → semifinals → final
const poolCount =
  isWomen && !largeWomensFormat
    ? 2
    : 4;

const matchesPerTeam = 3;
const qualifiersPerPool = 2;

const hasSuper8Format =
  !isWomen || largeWomensFormat;

// For doubles, fixtures are generated from teams.
// For singles, from participants.
const availableParticipants = isDoubles
  ? teams.length
  : participants.length;

const minimumParticipants =
  poolCount * 4;

  const poolFixtures = useMemo(
    () =>
      fixtures.filter(
        (fixture) => fixture.stage === "Pool"
      ),
    [fixtures]
  );

  const super8Fixtures = useMemo(
    () =>
      fixtures.filter(
        (fixture) => fixture.stage === "Super 8"
      ),
    [fixtures]
  );

  const semifinalFixtures = useMemo(
    () =>
      fixtures.filter(
        (fixture) => fixture.stage === "Semi Final"
      ),
    [fixtures]
  );

  const finalFixtures = useMemo(
    () =>
      fixtures.filter(
        (fixture) => fixture.stage === "Final"
      ),
    [fixtures]
  );

  const poolNames = useMemo(() => {
    const names = new Set(
      poolFixtures
        .map((fixture) => fixture.pool_name)
        .filter(Boolean)
    );
    return Array.from(names).sort();
  }, [poolFixtures]);

  function calculateStandings(fixtureList) {
    const map = new Map();

    const add = (id, name) => {
      if (id === null || id === undefined) return;
      const key = String(id);
      if (!map.has(key)) {
        map.set(key, {
          id,
          name: name || `Participant ${id}`,
          played: 0,
          won: 0,
          lost: 0,
          points: 0,
          difference: 0,
        });
      }
      return map.get(key);
    };

    fixtureList.forEach((fixture) => {
      const aId = isDoubles
        ? fixture.team_a_id
        : fixture.player_a_id;
      const bId = isDoubles
        ? fixture.team_b_id
        : fixture.player_b_id;

      const aName = isDoubles
        ? fixture.team_a_name
        : fixture.player_a_name;
      const bName = isDoubles
        ? fixture.team_b_name
        : fixture.player_b_name;

      const a = add(aId, aName);
      const b = add(bId, bName);

      if (!a || !b) return;

      if (fixture.status !== "Completed") return;

      const scoreA = Number(fixture.player_a_score) || 0;
      const scoreB = Number(fixture.player_b_score) || 0;

      a.played += 1;
      b.played += 1;
      a.difference += scoreA - scoreB;
      b.difference += scoreB - scoreA;

      const winnerId = isDoubles
        ? fixture.winner_team_id
        : fixture.winner_player_id;

      if (String(winnerId) === String(aId)) {
        a.won += 1;
        a.points += 2;
        b.lost += 1;
      } else if (String(winnerId) === String(bId)) {
        b.won += 1;
        b.points += 2;
        a.lost += 1;
      }
    });

    return Array.from(map.values()).sort(
      (a, b) =>
        b.points - a.points ||
        b.won - a.won ||
        b.difference - a.difference ||
        a.name.localeCompare(b.name)
    );
  }

  const poolStandings = useMemo(() => {
    const result = {};
    poolNames.forEach((poolName) => {
      result[poolName] = calculateStandings(
        poolFixtures.filter(
          (fixture) => fixture.pool_name === poolName
        )
      );
    });
    return result;
  }, [poolFixtures, poolNames, isDoubles]);

  const super8Standings = useMemo(
    () => calculateStandings(super8Fixtures),
    [super8Fixtures, isDoubles]
  );

  const poolStageComplete =
    poolFixtures.length > 0 &&
    poolFixtures.every(
      (fixture) => fixture.status === "Completed"
    );

  const super8Complete =
    super8Fixtures.length === 8 &&
    super8Fixtures.every(
      (fixture) => fixture.status === "Completed"
    );

  const semifinalsComplete =
    semifinalFixtures.length === 2 &&
    semifinalFixtures.every(
      (fixture) => fixture.status === "Completed"
    );

  // =======================================================
  // GENERATE INITIAL FIXTURES
  // =======================================================

  async function generate() {
    if (!tournamentId) {
      setMessage("Please select a tournament first.");
      return;
    }

    if (fixtures.length > 0) {
      setMessage("Fixtures are already generated for this tournament.");
      return;
    }

    if (availableParticipants < minimumParticipants) {
      setMessage(
        `${isWomen ? "Women's" : "Men's"} format requires at least ${minimumParticipants} ${isDoubles ? "teams" : "players"}.`
      );
      return;
    }

    if (availableParticipants % poolCount !== 0) {
      setMessage(
        `Participants must divide evenly across ${poolCount} pools.`
      );
      return;
    }

    try {
      setFixtureSaving(true);
      setFixtureError("");
      setMessage("");

      const token = localStorage.getItem("matcho_token");
      if (!token) {
        throw new Error("Please login as an organizer.");
      }

      const result = await apiRequest(
        `/fixtures/random/${tournamentId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            poolCount,
            matchesPerTeam,
            qualifiersPerPool,
            super8: hasSuper8Format,
            poolBestOf: 1,
            super8BestOf: hasSuper8Format ? 1 : null,
            semiFinalBestOf: 3,
            finalBestOf: 3,
          }),
        }
      );

      if (!result?.success) {
        throw new Error(
          result?.message || "Unable to generate fixtures."
        );
      }

      await loadFixtures(tournamentId);
      setMessage(
        result.message || "Fixtures generated successfully."
      );
      setActiveSection("fixtures");
    } catch (error) {
      console.error("Generate Fixtures Error:", error);
      setFixtureError(
        error.message || "Unable to generate fixtures."
      );
    } finally {
      setFixtureSaving(false);
    }
  }

  // =======================================================
  // GENERATE NEXT ROUND
  // =======================================================

  async function generateNextRound() {
    if (!tournamentId) return;

    try {
      setFixtureSaving(true);
      setFixtureError("");
      setMessage("");

      const token = localStorage.getItem("matcho_token");
      if (!token) {
        throw new Error("Please login as an organizer.");
      }

      const result = await apiRequest(
        `/fixtures/next-round/${tournamentId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!result?.success) {
        throw new Error(
          result?.message || "Unable to generate the next round."
        );
      }

      await loadFixtures(tournamentId);
      setMessage(
        result.message || "Next round generated successfully."
      );
      setActiveSection("fixtures");
    } catch (error) {
      console.error("Generate Next Round Error:", error);
      setFixtureError(
        error.message || "Unable to generate the next round."
      );
    } finally {
      setFixtureSaving(false);
    }
  }

  // =======================================================
  // GENERATE FINAL
  // =======================================================

  async function generateFinalRound() {
    if (!tournamentId) return;

    try {
      setFixtureSaving(true);
      setFixtureError("");
      setMessage("");

      const token = localStorage.getItem("matcho_token");
      if (!token) {
        throw new Error("Please login as an organizer.");
      }

      const result = await apiRequest(
        `/fixtures/final/${tournamentId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!result?.success) {
        throw new Error(
          result?.message || "Unable to generate the final."
        );
      }

      await loadFixtures(tournamentId);
      setMessage(
        result.message || "Final generated successfully."
      );
      setActiveSection("fixtures");
    } catch (error) {
      console.error("Generate Final Error:", error);
      setFixtureError(
        error.message || "Unable to generate the final."
      );
    } finally {
      setFixtureSaving(false);
    }
  }

  // =======================================================
  // COPY REGISTRATION CODE
  // =======================================================

  async function copyRegistrationCode() {

    if (
      !tournament?.registrationCode
    ) {
      return;
    }

    try {

      await navigator.clipboard.writeText(
        tournament.registrationCode
      );

      setCopiedCode(true);

      setTimeout(() => {
        setCopiedCode(false);
      }, 2000);

    } catch (error) {

      console.error(
        "Copy registration code error:",
        error
      );
    }
  }


  // =======================================================
  // SHARE TOURNAMENT
  // =======================================================

  async function shareTournament() {

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
            tournament.name,
          text:
            shareText,
          url:
            shareUrl,
        });

        return;
      }

      await navigator.clipboard.writeText(
        shareText
      );

      setMessage(
        "Tournament share link copied!"
      );

    } catch (error) {

      if (
        error?.name ===
        "AbortError"
      ) {
        return;
      }

      console.error(
        "Share tournament error:",
        error
      );
    }
  }


  // =======================================================
  // OPEN EDIT TOURNAMENT
  // =======================================================

  function openEditTournament() {

    if (!tournament) {
      return;
    }

    setEditForm({
      name:
        tournament.name ||
        "",

      category:
        tournament.category ||
        "",

      startDate:
        tournament.start_date ||
        "",

      endDate:
        tournament.end_date ||
        "",

      location:
        tournament.venue ||
        "",

      maxParticipants:
        tournament.max_players ||
        "",

      description:
        tournament.description ||
        "",

      format:
  String(
    tournament.format || ""
  ).toLowerCase() === "singles"
    ? "Singles"
    : "Doubles",

      status:
        tournament.status ||
        "Registration Open",
    });

    setEditError("");

    setIsEditingTournament(
      true
    );
  }


  // =======================================================
  // SAVE EDITED TOURNAMENT
  // =======================================================

  async function handleUpdateTournament(
    event
  ) {

    event.preventDefault();

    if (!tournament) {
      return;
    }

    setEditError("");

    if (
      !editForm.name.trim()
    ) {

      setEditError(
        "Tournament name is required."
      );

      return;
    }

    if (
      !editForm.category
    ) {

      setEditError(
        "Please select a category."
      );

      return;
    }

    if (
      !editForm.startDate
    ) {

      setEditError(
        "Start date is required."
      );

      return;
    }

    if (
      !editForm.endDate
    ) {

      setEditError(
        "End date is required."
      );

      return;
    }

    if (
      editForm.endDate <
      editForm.startDate
    ) {

      setEditError(
        "End date cannot be before the start date."
      );

      return;
    }

    if (
      !editForm.location.trim()
    ) {

      setEditError(
        "Location is required."
      );

      return;
    }

    const maxParticipants =
      Number(
        editForm.maxParticipants
      );

    if (
      !Number.isInteger(
        maxParticipants
      ) ||
      maxParticipants < 2
    ) {

      setEditError(
        "Maximum participants must be at least 2."
      );

      return;
    }


    // Don't allow a lower limit
    // than already registered players.

    if (
      maxParticipants <
      participants.length
    ) {

      setEditError(
        `Maximum participants cannot be lower than the ${participants.length} players already registered.`
      );

      return;
    }


    try {

      setEditLoading(
        true
      );

      const token =
        localStorage.getItem(
          "matcho_token"
        );

      if (!token) {

        setEditError(
          "Please login as an organizer."
        );

        return;
      }


      const result =
        await apiRequest(
          `/tournaments/${tournament.id}`,
          {
            method: "PUT",

            headers: {
              Authorization:
                `Bearer ${token}`,

              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                name:
                  editForm.name.trim(),

                category:
                  editForm.category,

                startDate:
                  editForm.startDate,

                endDate:
                  editForm.endDate,

                location:
                  editForm.location.trim(),

                maxParticipants,

                description:
                  editForm.description.trim(),

                format:
                  editForm.format,

                status:
                  editForm.status,
              }),
          }
        );


      const updated =
        result?.tournament;


      if (!updated) {
        throw new Error(
          "Tournament update response was invalid."
        );
      }


      setTournaments(
        (previous) =>
          previous.map(
            (item) => {

              if (
                String(item.id) !==
                String(updated.id)
              ) {
                return item;
              }

              return {
                ...item,

                ...updated,

                sportName:
                  item.sportName ||
                  updated.sport,

                registrationCode:
                  updated.registration_code ||
                  item.registrationCode,

                maxParticipants:
                  Number(
                    updated.max_players ||
                    0
                  ),

                participants:
                  item.participants,

                format:
                  updated.format ||
                  item.format,
              };
            }
          )
      );

      setIsEditingTournament(
        false
      );

      setMessage(
        "Tournament updated successfully."
      );

    } catch (error) {

      console.error(
        "Update Tournament Error:",
        error
      );

      setEditError(
        error.message ||
          "Unable to update tournament."
      );

    } finally {

      setEditLoading(
        false
      );
    }
  }


  // =======================================================
  // DATE FORMAT
  // =======================================================

  function formatDate(
    dateValue
  ) {

    if (!dateValue) {
      return "-";
    }

    const date =
      new Date(dateValue);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return dateValue;
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


  // =======================================================
  // REGISTRATION DATE
  // =======================================================

  function formatRegistrationDate(
    dateValue
  ) {
    return formatDate(
      dateValue
    );
  }


  // =======================================================
  // UI
  // =======================================================

  return (
    <div className="org-layout">

      <RoleSidebar
        activeItem="Tournaments"
      />


      <div className="org-main">

        <div className="org-content">


          {/* =================================================
              HEADER
          ================================================= */}

          <div className="tm-header">

            <div className="tm-eyebrow">

              <Trophy
                size={14}
              />

              TOURNAMENT MANAGEMENT

            </div>


            <h1>
              Tournaments
            </h1>


            <p>
              Manage your tournament,
              participants, setup,
              fixtures, and standings
              from one place.
            </p>

          </div>


          {/* =================================================
              ERROR
          ================================================= */}

          {error && (

            <div className="tm-error">

              {error}

            </div>

          )}


          {/* =================================================
              SELECT TOURNAMENT
          ================================================= */}

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
                  you want to manage.
                </p>

              </div>

            </div>


            {loadingTournaments ? (

              <div className="tm-loading">

                Loading your tournaments...

              </div>

            ) : tournaments.length ===
              0 ? (

              <div className="tm-loading">

                You have no tournaments yet.

              </div>

            ) : (

              <>

                <div className="tm-selection-row">

                  <TournamentDropdown
                    tournaments={
                      tournaments
                    }

                    value={
                      tournamentId
                    }

                    onChange={
                      handleTournamentChange
                    }
                  />


                  {tournament && (

                    <div className="tm-meta-group">

                      <div className="tm-meta-item">

                        <span>
                          REGISTRATION ID
                        </span>

                        <strong>
                          {
                            tournament.registrationCode ||
                            "N/A"
                          }
                        </strong>

                      </div>


                      <div className="tm-meta-divider" />


                      <div className="tm-participants">

                        <Users
                          size={17}
                        />

                        <div>

                          <span>
                            REGISTERED
                          </span>

                          <strong>
                            {
                              loadingParticipants
                                ? "Loading..."
                                : `${participants.length} ${
                                    participants.length ===
                                    1
                                      ? "Player"
                                      : "Players"
                                  }`
                            }
                          </strong>

                        </div>

                      </div>

                    </div>

                  )}

                </div>


                {tournament && (

                  <div className="tm-top-actions">

                    <button
                      type="button"
                      className="tm-outline-btn"
                      onClick={
                        copyRegistrationCode
                      }
                    >

                      {copiedCode ? (
                        <>
                          <Check
                            size={15}
                          />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy
                            size={15}
                          />
                          Copy ID
                        </>
                      )}

                    </button>


                    <button
                      type="button"
                      className="tm-primary-btn"
                      onClick={
                        shareTournament
                      }
                    >

                      <Share2
                        size={15}
                      />

                      Share Tournament

                    </button>

                  </div>

                )}

              </>

            )}

          </section>


          {/* =================================================
              TABS
          ================================================= */}

          {tournament && (

            <div className="tm-section-tabs">

              <button
                type="button"
                className={
                  activeSection === "overview"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setActiveSection("overview")
                }
              >
                Overview
              </button>


              <button
                type="button"
                className={
                  activeSection === "participants"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setActiveSection("participants")
                }
              >
                Participants

                <span>
                  {participants.length}
                </span>
              </button>


              {tournament.category
                ?.toLowerCase()
                .includes("doubles") && (

                <button
                  type="button"
                  className={
                    activeSection === "teams"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setActiveSection("teams")
                  }
                >
                  Teams

                  <span>
                    {teams.length}
                  </span>
                </button>

              )}


              <button
                type="button"
                className={
                  activeSection === "setup"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setActiveSection("setup")
                }
              >
                Setup
              </button>


              <button
                type="button"
                className={
                  activeSection === "fixtures"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setActiveSection("fixtures")
                }
              >
                Fixtures

                <span>
                  {fixtures.length}
                </span>
              </button>


              <button
                type="button"
                className={
                  activeSection === "standings"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setActiveSection("standings")
                }
              >
                Standings
              </button>

            </div>

          )}


          {/* =================================================
              OVERVIEW
          ================================================= */}

          {tournament &&
            activeSection ===
              "overview" && (

              <section className="tm-card">

                <div className="tm-section-top">

                  <div className="tm-card-heading">

                    <div className="tm-heading-icon">

                      <Trophy
                        size={20}
                      />

                    </div>


                    <div>

                      <h3>
                        {tournament.name}
                      </h3>

                      <p>
                        {
                          tournament.category ||
                          "Tournament"
                        }

                        {" • "}

                        {
                          tournament.format ||
                          "Format not set"
                        }
                      </p>

                    </div>

                  </div>


                  <div className="tm-overview-actions">

                    <button
                      type="button"
                      className="tm-outline-btn"
                      onClick={
                        openEditTournament
                      }
                    >

                      <Pencil
                        size={14}
                      />

                      Edit Tournament

                    </button>


                    <span className="tm-sport-badge">

                      {
                        tournament.sportName ||
                        "Badminton"
                      }

                    </span>

                  </div>

                </div>


                <div className="tm-overview-grid">

                  <div className="tm-overview-item">

                    <span>
                      SPORT
                    </span>

                    <strong>
                      {
                        tournament.sportName ||
                        tournament.sport ||
                        "-"
                      }
                    </strong>

                  </div>


                  <div className="tm-overview-item">

                    <span>
                      CATEGORY
                    </span>

                    <strong>
                      {
                        tournament.category ||
                        "-"
                      }
                    </strong>

                  </div>


                  <div className="tm-overview-item">

                    <span>
                      FORMAT
                    </span>

                    <strong>
                      {
                        tournament.format ||
                        "-"
                      }
                    </strong>

                  </div>


                  <div className="tm-overview-item">

                    <span>
                      REGISTRATION ID
                    </span>

                    <strong>
                      {
                        tournament.registrationCode ||
                        "-"
                      }
                    </strong>

                  </div>


                  <div className="tm-overview-item">

                    <span>
                      PARTICIPANTS
                    </span>

                    <strong>
                      {participants.length}

                      {" / "}

                      {
                        tournament.max_players ||
                        "-"
                      }

                    </strong>

                  </div>


                  <div className="tm-overview-item">

                    <span>
                      STATUS
                    </span>

                    <strong>
                      {
                        tournament.status ||
                        "-"
                      }
                    </strong>

                  </div>


                  <div className="tm-overview-item">

                    <span>
                      START DATE
                    </span>

                    <strong>
                      {formatDate(
                        tournament.start_date
                      )}
                    </strong>

                  </div>


                  <div className="tm-overview-item">

                    <span>
                      END DATE
                    </span>

                    <strong>
                      {formatDate(
                        tournament.end_date
                      )}
                    </strong>

                  </div>


                  <div className="tm-overview-item tm-overview-wide">

                    <span>
                      VENUE
                    </span>

                    <strong>
                      {
                        tournament.venue ||
                        "-"
                      }
                    </strong>

                  </div>


                  <div className="tm-overview-item">

                    <span>
                      CREATED
                    </span>

                    <strong>
                      {formatDate(
                        tournament.created_at
                      )}
                    </strong>

                  </div>

                </div>

              </section>

            )}


          {/* =================================================
              PARTICIPANTS
          ================================================= */}

          {tournament &&
            activeSection ===
              "participants" && (

              <section className="tm-card">

                <div className="tm-section-top">

                  <div className="tm-card-heading">

                    <div className="tm-heading-icon">

                      <Users
                        size={20}
                      />

                    </div>


                    <div>

                      <h3>
                        Registered Participants
                      </h3>

                      <p>
                        Players who have
                        joined this
                        tournament.
                      </p>

                    </div>

                  </div>


                  <span className="tm-count-badge">

                    {participants.length}

                    {" / "}

                    {
                      tournament.max_players ||
                      "-"
                    }

                  </span>

                </div>


                {loadingParticipants ? (

                  <div className="tm-loading">

                    Loading participants...

                  </div>

                ) : participantError ? (

                  <div className="tm-error">

                    {participantError}

                  </div>

                ) : participants.length ===
                  0 ? (

                  <div className="tm-empty-state">

                    <Users
                      size={30}
                    />

                    <h4>
                      No participants yet
                    </h4>

                    <p>
                      Share the tournament
                      registration link
                      to start receiving
                      players.
                    </p>

                  </div>

                ) : (

                  <div className="tm-table-wrap">

                    <table className="tm-table">

                      <thead>

                        <tr>

                          <th>
                            #
                          </th>

                          <th>
                            Participant
                          </th>

                          <th>
                            Email
                          </th>

                          <th>
                            Phone
                          </th>

                          <th>
                            Gender
                          </th>

                          <th>Flat Number</th>
                          <th>Transaction ID</th>
                          <th>Registered</th>

                        </tr>

                      </thead>


                      <tbody>

                        {participants.map(
                          (
                            participant,
                            index
                          ) => (

                            <tr
                              key={
                                participant.id
                              }
                            >

                              <td>
                                {index + 1}
                              </td>


                              <td className="tm-player-name">

                                {
                                  participant.participant_name ||
                                  participant.name ||
                                  "Unnamed Player"
                                }

                              </td>


                              <td>

                                {
                                  participant.email ||
                                  "-"
                                }

                              </td>


                              <td>

                                {
                                  participant.phone ||
                                  "-"
                                }

                              </td>


                              <td>
                                {participant.gender || "-"}
                              </td>

                              <td>
  {participant.c_flat_number || "-"}
</td>

<td>
  {participant.transaction_id || "-"}
</td>

<td>
  {formatRegistrationDate(participant.registered_at)}
</td>

                            </tr>

                          )
                        )}

                      </tbody>

                    </table>

                  </div>

                )}

              </section>

            )}

          {/* =================================================
              TEAMS / PAIRS
          ================================================= */}

          {tournament &&
            activeSection === "teams" && (

            <section className="tm-card">

              <div className="tm-section-top">

                <div className="tm-card-heading">

                  <div className="tm-heading-icon">
                    <Users size={20} />
                  </div>

                  <div>
                    <h3>Teams &amp; Pairs</h3>
                    <p>
                      Create and manage doubles pairs for this tournament.
                    </p>
                  </div>

                </div>

           <div className="tm-team-header-actions">

  <button
    type="button"
    className="tm-outline-btn"
    onClick={() => setPairConfirmOpen(true)}
    disabled={
      teamSaving ||
      fixtures.length > 0 ||
      unpairedPlayers.length < 2 ||
      unpairedPlayers.length % 2 !== 0
    }
  >
    <Dices size={16} />
    {teamSaving
      ? "Generating..."
      : "Randomly Generate Pairs"}
  </button>

  <button
    type="button"
    className="tm-primary-btn"
    onClick={openCreateTeam}
    disabled={
      teamSaving ||
      participants.length < 2 ||
      unpairedPlayers.length < 2
    }
  >
    <UserPlus size={16} />
    Create Pair
  </button>

</div>

              </div>

              <div className="tm-team-summary">

                <div>
                  <strong>{participants.length}</strong>
                  <span>Registered</span>
                </div>

                <div>
                  <strong>{teams.length}</strong>
                  <span>Teams</span>
                </div>

                <div>
                  <strong>{unpairedPlayers.length}</strong>
                  <span>Unpaired</span>
                </div>

              </div>

              {loadingTeams ? (

                <div className="tm-loading">
                  Loading teams...
                </div>

              ) : teamError ? (

                <div className="tm-error">
                  {teamError}
                </div>

              ) : teams.length === 0 ? (

                <div className="tm-empty-state">
                  <Users size={30} />

                  <h4>No teams created yet</h4>

                  <p>
                    Pair two registered players together to create the first doubles team.
                  </p>

                  <button
                    type="button"
                    className="tm-primary-btn"
                    onClick={openCreateTeam}
                    disabled={participants.length < 2}
                  >
                    <UserPlus size={16} />
                    Create First Pair
                  </button>
                </div>

              ) : (

                <div className="tm-teams-grid">

                  {teams.map((team, index) => (

                    <div
                      key={team.id}
                      className="tm-team-card"
                    >

                      <div className="tm-team-card-top">

                        <div>
                          <span>TEAM {index + 1}</span>
                          <h4>{team.team_name}</h4>
                        </div>

                        <div className="tm-team-actions">

                          <button
                            type="button"
                            onClick={() => openEditTeam(team)}
                            title="Edit team"
                          >
                            <Pencil size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteTeam(team)}
                            title="Remove team"
                          >
                            <Trash2 size={15} />
                          </button>

                        </div>

                      </div>

                      <div className="tm-team-players">

                        {(team.players || []).map((player) => (
                          <div
                            className="tm-team-player"
                            key={player.id}
                          >
                            <div className="tm-player-avatar">
                              {(player.name || "P")
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <span>
                              {player.name || `Player ${player.id}`}
                            </span>
                          </div>
                        ))}

                      </div>

                    </div>
                  ))}

                </div>
              )}

              {unpairedPlayers.length > 0 && (
                <div className="tm-unpaired">

                  <div>
                    <strong>Unpaired Players</strong>
                    <span>
                      These registered players haven't been assigned to a team yet.
                    </span>
                  </div>

                  <div className="tm-unpaired-list">
                    {unpairedPlayers.map((player) => (
                      <span key={player.id}>
                        {player.participant_name || player.name}
                      </span>
                    ))}
                  </div>

                </div>
              )}

            </section>
          )}


          {/* =================================================
              SETUP
          ================================================= */}

          {tournament &&
            activeSection === "setup" && (

              <section className="tm-card">

                <div className="tm-section-top">

                  <div className="tm-card-heading">

                    <div className="tm-heading-icon">
                      <GitBranch size={20} />
                    </div>

                    <div>
                      <h3>Tournament Setup</h3>
                      <p>Generate the fixtures automatically.</p>
                    </div>

                  </div>

                  <span className="tm-sport-badge">
                    {tournament.sportName || "Badminton"}
                  </span>

                </div>

               <div className="tm-fixture-generator-simple">

  <div className="tm-generator-field">

    <label htmlFor="fixture-format">
      Tournament Type
    </label>

    <select
      id="fixture-format"
      className="tm-select"
      value={format}
      onChange={(event) =>
        setFormat(event.target.value)
      }
    >
      <option value="Singles">
        Singles
      </option>

      <option value="Doubles">
        Doubles
      </option>
    </select>

  </div>

  <button
    type="button"
    className="tm-primary-btn tm-generate-fixtures-btn"
    disabled={
      fixtureSaving ||
      fixtures.length > 0
    }
    onClick={generate}
  >
    <Dices size={18} />

    {fixtureSaving
      ? "Generating Fixtures..."
      : "Generate Fixtures"}
  </button>

</div>

                {fixtureError && (
                  <div className="tm-error">
                    {fixtureError}
                  </div>
                )}

                {message && (
                  <div className="tm-success">
                    ✓ {message}
                  </div>
                )}

              </section>

            )}



          {/* =================================================
              FIXTURES
          ================================================= */}

          {tournament &&
            activeSection === "fixtures" && (
              <section className="tm-card">

                <div className="tm-section-top">
                  <div className="tm-card-heading">

                    <div className="tm-heading-icon">
                      <CalendarDays size={20} />
                    </div>

                    <div>
                      <h3>Scheduled Fixtures</h3>
                      <p>
                        {fixtures.length} fixture
                        {fixtures.length === 1 ? "" : "s"} generated for this tournament.
                      </p>
                    </div>

                  </div>
                </div>

                {loadingFixtures ? (
                  <div className="tm-loading">
                    Loading fixtures...
                  </div>
                ) : fixtureError ? (
                  <div className="tm-error">
                    {fixtureError}
                  </div>
                ) : fixtures.length === 0 ? (
                  <div className="tm-empty-state">
                    <CalendarDays size={30} />
                    <h4>No fixtures yet</h4>
                    <p>
                      Generate fixtures from the Setup tab.
                    </p>

                    <button
                      type="button"
                      className="tm-primary-btn"
                      onClick={() =>
                        setActiveSection("setup")
                      }
                    >
                      Go to Setup
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="tm-fixture-filters">

                      {[
                        {
                          key: "all",
                          label: "All",
                        },
                        {
                          key: "group",
                          label: "Group Stage",
                        },
                        {
                          key: "super8",
                          label: "Super 8",
                        },
                        {
                          key: "semi",
                          label: "Semi Finals",
                        },
                        {
                          key: "final",
                          label: "Final",
                        },
                      ].map((filter) => (
                        <button
                          key={filter.key}
                          type="button"
                          className={
                            fixtureFilter === filter.key
                              ? "active"
                              : ""
                          }
                          onClick={() =>
                            setFixtureFilter(filter.key)
                          }
                        >
                          {filter.label}
                        </button>
                      ))}

                    </div>

                    <div className="tm-fixture-stage-sections">

                      {[
                        {
                          key: "Pool",
                          title: "Group Stage",
                          eyebrow: "GROUP STAGE",
                          items: filteredFixtures.filter(
                            (fixture) =>
                              fixture.stage === "Pool"
                          ),
                        },
                        ...(hasSuper8Format
                          ? [
                              {
                                key: "Super 8",
                                title: "Super 8",
                                eyebrow: "KNOCKOUT STAGE",
                                items: filteredFixtures.filter(
                                  (fixture) =>
                                    fixture.stage === "Super 8"
                                ),
                              },
                            ]
                          : []),
                        {
                          key: "Semi Final",
                          title: "Semi Finals",
                          eyebrow: "KNOCKOUT STAGE",
                          items: filteredFixtures.filter(
                            (fixture) =>
                              fixture.stage === "Semi Final"
                          ),
                        },
                        {
                          key: "Final",
                          title: "Final",
                          eyebrow: "CHAMPIONSHIP",
                          items: filteredFixtures.filter(
                            (fixture) =>
                              fixture.stage === "Final"
                          ),
                        },
                      ].map((stage) => {

                        if (stage.items.length === 0) {
                          return null;
                        }

                        const grouped =
                          stage.key === "Pool"
                            ? poolNames
                                .map((poolName) => ({
                                  label: poolName,
                                  items: stage.items.filter(
                                    (fixture) =>
                                      fixture.pool_name === poolName
                                  ),
                                }))
                                .filter(
                                  (group) =>
                                    group.items.length > 0
                                )
                            : [
                                {
                                  label: stage.title,
                                  items: stage.items,
                                },
                              ];

                        return (
                          <section
                            key={stage.key}
                            className="tm-fixture-stage-block"
                          >

                            <div className="tm-stage-heading">
                              <div>
                                <span>{stage.eyebrow}</span>
                                <h3>{stage.title}</h3>
                              </div>

                              <small>
                                {stage.items.length} match
                                {stage.items.length === 1
                                  ? ""
                                  : "es"}
                              </small>
                            </div>

                            {grouped.map((group) => (
                              <div
                                key={`${stage.key}-${group.label}`}
                                className="tm-fixture-group"
                              >

                                {stage.key === "Pool" && (
                                  <div className="tm-fixture-group-heading">
                                    <h4>{group.label}</h4>

                                    <span>
                                      {group.items.length} match
                                      {group.items.length === 1
                                        ? ""
                                        : "es"}
                                    </span>
                                  </div>
                                )}

                                <div className="tm-fixtures-grid">

                                  {group.items.map((match) => {
                                    const sideA = isDoubles
                                      ? match.team_a_name
                                      : match.player_a_name;

                                    const sideB = isDoubles
                                      ? match.team_b_name
                                      : match.player_b_name;

                                    const winnerId = isDoubles
                                      ? match.winner_team_id
                                      : match.winner_player_id;

                                    const sideAId = isDoubles
                                      ? match.team_a_id
                                      : match.player_a_id;

                                    const sideBId = isDoubles
                                      ? match.team_b_id
                                      : match.player_b_id;

                                    const winnerName =
                                      winnerId != null &&
                                      String(winnerId) ===
                                        String(sideAId)
                                        ? sideA
                                        : winnerId != null &&
                                            String(winnerId) ===
                                              String(sideBId)
                                          ? sideB
                                          : "Not declared";

                                    return (
                                      <div
                                        key={match.id}
                                        className="tm-fixture-card tm-fixture-card-clickable"
                                        onClick={() =>
                                          openMatchSummary(match)
                                        }
                                      >

                                        <div className="tm-fixture-top">
                                          <span>
                                            {match.pool_name ||
                                              match.stage}
                                          </span>

                                          <small>
                                            {match.round ||
                                              `Match ${match.match_number}`}
                                          </small>
                                        </div>

                       <div className="tm-matchup">

                        {/* TEAM A */}
                        <div className="tm-side tm-side-left">

                          <div className="tm-team-score-row">

                            <strong>
                              {sideA}
                            </strong>

                            <span className="tm-side-score">
                              {Number(
                                match.player_a_score
                              ) || 0}
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
                              {Number(
                                match.player_b_score
                              ) || 0}
                            </span>

                            <strong>
                              {sideB}
                            </strong>

                          </div>

                        </div>

                      </div>

<div className="tm-fixture-bottom">

                                          <span>
                                            Match{" "}
                                            {match.match_number}
                                          </span>

                                          <div className="tm-fixture-actions">

                                            <span
                                              className={`tm-status ${
                                                match.status ===
                                                "Completed"
                                                  ? "completed"
                                                  : match.status ===
                                                      "Live"
                                                    ? "live"
                                                    : ""
                                              }`}
                                            >
                                              {match.status}
                                            </span>

                                            {match.status !==
                                              "Completed" && (
                                              <button
                                                type="button"
                                                className="tm-score-match-btn"
                                                onClick={(event) => {
                                                  event.stopPropagation();
                                                  openFixtureScoring(
                                                    match
                                                  );
                                                }}
                                                disabled={
                                                  fixtureSaving
                                                }
                                              >
                                                {fixtureSaving
                                                  ? "Opening..."
                                                  : "Open Scoring"}
                                              </button>
                                            )}

                                          </div>
                                        </div>

                                        {match.status ===
                                          "Completed" && (
                                          <div className="tm-fixture-result">

                                            <span className="tm-fixture-scoreline">
                                              Final:{" "}
                                              {Number(
                                                match.player_a_score
                                              ) || 0}
                                              {" - "}
                                              {Number(
                                                match.player_b_score
                                              ) || 0}
                                            </span>

                                            <strong>
                                              Winner:{" "}
                                              {winnerName}
                                            </strong>

                                          </div>
                                        )}

                                      </div>
                                    );
                                  })}

                                </div>

                              </div>
                            ))}

                          </section>
                        );
                      })}

                    </div>

                    {fixtureFilter !== "all" &&
                      filteredFixtures.length === 0 && (
                        <div className="tm-empty-state">
                          <CalendarDays size={30} />
                          <h4>No matches in this stage</h4>
                          <p>
                            There are no fixtures available for the selected filter yet.
                          </p>
                        </div>
                      )}

                    {filteredFixtures.length > 0 &&
                      poolStageComplete &&
                      ((hasSuper8Format &&
                        super8Fixtures.length === 0) ||
                        (!hasSuper8Format &&
                          semifinalFixtures.length === 0)) && (
                        <div className="tm-knockout-action">
                          <div>
                            <strong>
                              {hasSuper8Format
                                ? "Ready for the Super 8?"
                                : "Ready for the semi-finals?"}
                            </strong>

                            <span>
                              {hasSuper8Format
                                ? "Complete the pool stage and generate the Super 8 fixtures."
                                : "Complete the pool stage and generate the semi-final fixtures."}
                            </span>
                          </div>

                          <button
                            type="button"
                            className="tm-primary-btn"
                            onClick={
                              generateNextRound
                            }
                            disabled={
                              fixtureSaving ||
                              !poolStageComplete
                            }
                          >
                            <CalendarDays size={17} />
                            Generate Next Round
                          </button>
                        </div>
                      )}

                    {hasSuper8Format &&
                      super8Complete &&
                      semifinalFixtures.length === 0 && (
                        <div className="tm-knockout-action">
                          <div>
                            <strong>
                              Ready for the semi-finals?
                            </strong>

                            <span>
                              All Super 8 matches are complete.
                            </span>
                          </div>

                          <button
                            type="button"
                            className="tm-primary-btn"
                            onClick={
                              generateNextRound
                            }
                            disabled={fixtureSaving}
                          >
                            <CalendarDays size={17} />
                            Generate Semi-finals
                          </button>
                        </div>
                      )}

                    {semifinalsComplete &&
                      finalFixtures.length === 0 && (
                        <div className="tm-knockout-action">
                          <div>
                            <strong>
                              Ready for the final?
                            </strong>

                            <span>
                              Both semi-finals are complete.
                            </span>
                          </div>

                          <button
                            type="button"
                            className="tm-primary-btn"
                            onClick={
                              generateFinalRound
                            }
                            disabled={fixtureSaving}
                          >
                            <Trophy size={17} />
                            Generate Final
                          </button>
                        </div>
                      )}

                  </>
                )}

              </section>
            )}


          {/* =================================================
              STANDINGS
          ================================================= */}

          {tournament &&
            activeSection === "standings" && (

              <>
                <div className="tm-standings-header">
                  <h2>Qualification Standings</h2>
                  <p>
                    Current standings based on completed fixtures.
                  </p>
                </div>

                {poolNames.length === 0 ? (
                  <section className="tm-card">
                    <div className="tm-empty-state">
                      <Radio size={30} />
                      <h4>Standings not available</h4>
                      <p>
                        Generate fixtures and complete matches to populate the points tables.
                      </p>
                    </div>
                  </section>
                ) : (
                  <>
                    <section className="tm-standings-grid">
                      {poolNames.map((poolName) => (
                        <PointsTable
                          key={poolName}
                          title={poolName}
                          rows={poolStandings[poolName] || []}
                        />
                      ))}
                    </section>

                    {hasSuper8Format && super8Fixtures.length > 0 && (
                      <section className="tm-standings-grid">
                        <PointsTable
                          title="Super 8"
                          rows={super8Standings}
                        />
                      </section>
                    )}
                  </>
                )}
              </>
            )}

        </div>

      </div>


      {/* ===================================================
          MATCH SUMMARY MODAL
      =================================================== */}

      {selectedFixture && (
        <div
          className="tm-modal-overlay"
          onClick={() => setSelectedFixture(null)}
        >
          <div
            className="tm-match-summary-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="match-summary-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="tm-summary-header">
              <div>
                <span className="tm-summary-label">
                  {selectedFixture.pool_name || selectedFixture.stage || "Match"}
                </span>
                <h2 id="match-summary-title">Match Summary</h2>
                <p>
                  {selectedFixture.round || `Match ${selectedFixture.match_number}`}
                </p>
              </div>

              <button
                type="button"
                className="tm-summary-close"
                onClick={() => setSelectedFixture(null)}
                aria-label="Close match summary"
              >
                <X size={18} />
              </button>
            </div>

            <div className="tm-summary-status-row">
              <span
                className={`tm-status ${
                  selectedFixture.status === "Completed"
                    ? "completed"
                    : selectedFixture.status === "Live"
                      ? "live"
                      : ""
                }`}
              >
                {selectedFixture.status}
              </span>

              <span className="tm-summary-stage">
                {selectedFixture.stage || "Pool Match"}
              </span>
            </div>

            <div className="tm-summary-match">
              <div className="tm-summary-team">
                <span>SIDE A</span>
                <strong>
                  {isDoubles
                    ? selectedFixture.team_a_name || "TBD"
                    : selectedFixture.player_a_name || "TBD"}
                </strong>
                <b>{Number(selectedFixture.player_a_score) || 0}</b>
              </div>

              <div className="tm-summary-vs">VS</div>

              <div className="tm-summary-team">
                <span>SIDE B</span>
                <strong>
                  {isDoubles
                    ? selectedFixture.team_b_name || "TBD"
                    : selectedFixture.player_b_name || "TBD"}
                </strong>
                <b>{Number(selectedFixture.player_b_score) || 0}</b>
              </div>
            </div>

            {selectedFixture.status === "Completed" && (
              <div className="tm-summary-winner">
                <span>WINNER</span>
                <strong>
                  {(() => {
                    const winnerId = isDoubles
                      ? selectedFixture.winner_team_id
                      : selectedFixture.winner_player_id;

                    const sideAId = isDoubles
                      ? selectedFixture.team_a_id
                      : selectedFixture.player_a_id;

                    const sideBId = isDoubles
                      ? selectedFixture.team_b_id
                      : selectedFixture.player_b_id;

                    const sideAName = isDoubles
                      ? selectedFixture.team_a_name
                      : selectedFixture.player_a_name;

                    const sideBName = isDoubles
                      ? selectedFixture.team_b_name
                      : selectedFixture.player_b_name;

                    if (winnerId != null && String(winnerId) === String(sideAId)) {
                      return sideAName || "Side A";
                    }

                    if (winnerId != null && String(winnerId) === String(sideBId)) {
                      return sideBName || "Side B";
                    }

                    return "Not declared";
                  })()}
                </strong>
              </div>
            )}

            <div className="tm-summary-actions">
              {selectedFixture.status !== "Completed" && (
                <button
                  type="button"
                  className="tm-primary-btn"
                  onClick={() => {
                    const match = selectedFixture;
                    setSelectedFixture(null);
                    openFixtureScoring(match);
                  }}
                >
                  Open Scoring
                </button>
              )}

              <button
                type="button"
                className="tm-outline-btn"
                onClick={() => setSelectedFixture(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================
          EDIT TOURNAMENT MODAL
      =================================================== */}

      {teamModalOpen && (

        <div className="tm-edit-overlay">

          <div
            className="tm-team-modal"
            role="dialog"
            aria-modal="true"
          >

            <div className="tm-edit-header">

              <div>
                <span className="tm-eyebrow">
                  {editingTeam ? "EDIT PAIR" : "CREATE PAIR"}
                </span>

                <h2>
                  {editingTeam ? "Edit Team" : "Create Doubles Pair"}
                </h2>

                <p>
                  Select exactly two registered players.
                </p>
              </div>

              <button
                type="button"
                className="tm-edit-close"
                onClick={() => setTeamModalOpen(false)}
                disabled={teamSaving}
                aria-label="Close"
              >
                <X size={18} />
              </button>

            </div>

            {teamError && (
              <div className="tm-error">
                {teamError}
              </div>
            )}

            <form
              onSubmit={saveTeam}
              className="tm-team-form"
            >

              <div className="tm-edit-field">
                <label>Team Name</label>
                <input
                  value={teamName}
                  onChange={(event) => setTeamName(event.target.value)}
                  placeholder="e.g. Smash Brothers"
                  maxLength={50}
                />
              </div>

              <div className="tm-team-select-heading">
                <div>
                  <strong>Select Players</strong>
                  <span>{selectedPlayers.length} / 2 selected</span>
                </div>
              </div>

              <div className="tm-player-selection">

                {participants.map((participant) => {
                  const playerId = Number(
                    participant.player_id ?? participant.id
                  );

                  const isSelected = selectedPlayers.includes(playerId);

                  const belongsToOtherTeam = teams.some((team) => {
                    if (editingTeam && Number(team.id) === Number(editingTeam.id)) {
                      return false;
                    }

                    return (team.players || []).some(
                      (player) => Number(player.id) === playerId
                    );
                  });

                  return (
                    <button
                      type="button"
                      key={participant.id ?? participant.player_id}
                      className={`tm-player-select ${
                        isSelected ? "selected" : ""
                      } ${belongsToOtherTeam ? "disabled" : ""}`}
                      disabled={belongsToOtherTeam}
                      onClick={() => togglePlayer(playerId)}
                    >

                      <div className="tm-player-avatar">
                        {(participant.participant_name || participant.name || "P")
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div className="tm-player-select-info">
                        <strong>
                          {participant.participant_name ||
                            participant.name ||
                            `Player ${playerId}`}
                        </strong>
                        <span>
                          {belongsToOtherTeam
                            ? "Already paired"
                            : isSelected
                            ? "Selected"
                            : "Available"}
                        </span>
                      </div>

                      <div className="tm-player-checkbox">
                        {isSelected ? "✓" : ""}
                      </div>

                    </button>
                  );
                })}

              </div>

              <div className="tm-edit-actions">

                <button
                  type="button"
                  className="tm-outline-btn"
                  onClick={() => setTeamModalOpen(false)}
                  disabled={teamSaving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="tm-primary-btn"
                  disabled={teamSaving || selectedPlayers.length !== 2}
                >
                  {teamSaving
                    ? "Saving..."
                    : editingTeam
                    ? "Save Team"
                    : "Create Pair"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}
      {pairConfirmOpen && (
  <div
    className="tm-edit-overlay"
    onClick={() => {
      if (!pairGenerating) {
        setPairConfirmOpen(false);
      }
    }}
  >
    <div
      className="tm-team-modal tm-pair-confirm-modal"
      role="dialog"
      aria-modal="true"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="tm-edit-header">
        <div>
          <span className="tm-eyebrow">
            RANDOM PAIRING
          </span>

          <h2>Generate Random Pairs?</h2>

          <p>
            Matcho will randomly pair all{" "}
            <strong>
              {unpairedPlayers.length}
            </strong>{" "}
            unpaired players.
          </p>
        </div>

        <button
          type="button"
          className="tm-edit-close"
          onClick={() =>
            setPairConfirmOpen(false)
          }
          disabled={pairGenerating}
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>

      <div className="tm-pair-confirm-info">
        <div>
          <strong>
            {Math.floor(
              unpairedPlayers.length / 2
            )}
          </strong>
          <span>Pairs</span>
        </div>

        <div>
          <strong>
            {unpairedPlayers.length}
          </strong>
          <span>Players</span>
        </div>
      </div>

      <div className="tm-pair-confirm-note">
        <Dices size={18} />

        <span>
          Players will be shuffled randomly and
          paired automatically. You can review
          the generated teams before creating
          fixtures.
        </span>
      </div>

      <div className="tm-edit-actions">
        <button
          type="button"
          className="tm-outline-btn"
          onClick={() =>
            setPairConfirmOpen(false)
          }
          disabled={pairGenerating}
        >
          Cancel
        </button>

        <button
          type="button"
          className="tm-primary-btn"
          onClick={async () => {
            setPairGenerating(true);

            try {
              await autoGenerateTeams();
              setPairConfirmOpen(false);
            } finally {
              setPairGenerating(false);
            }
          }}
          disabled={pairGenerating}
        >
          <Dices size={16} />

          {pairGenerating
            ? "Generating..."
            : "Generate Pairs"}
        </button>
      </div>
    </div>
  </div>
)}

      {isEditingTournament && (

        <div className="tm-edit-overlay">

          <div
            className="tm-edit-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-tournament-title"
          >

            <div className="tm-edit-header">

              <div>

                <span className="tm-eyebrow">

                  EDIT TOURNAMENT

                </span>


                <h2 id="edit-tournament-title">

                  {tournament?.name}

                </h2>


                <p>
                  Update your tournament
                  details.
                </p>

              </div>


              <button
                type="button"
                className="tm-edit-close"
                onClick={() =>
                  setIsEditingTournament(
                    false
                  )
                }
                disabled={
                  editLoading
                }
                aria-label="Close"
              >

                <X size={18} />

              </button>

            </div>


            {editError && (

              <div className="tm-error">

                {editError}

              </div>

            )}


            <form
              className="tm-edit-form"
              onSubmit={
                handleUpdateTournament
              }
            >

              <div className="tm-edit-grid">


                {/* NAME */}

                <div className="tm-edit-field full">

                  <label>
                    Tournament Name
                  </label>

                  <input
                    type="text"
                    value={
                      editForm.name
                    }
                    maxLength={60}
                    onChange={(event) =>
                      setEditForm(
                        (previous) => ({
                          ...previous,
                          name:
                            event.target
                              .value,
                        })
                      )
                    }
                  />

                </div>


                {/* CATEGORY */}

                <div className="tm-edit-field">

                  <label>
                    Category
                  </label>

                  <select
                    value={
                      editForm.category
                    }
                    onChange={(event) =>
                      setEditForm(
                        (previous) => ({
                          ...previous,
                          category:
                            event.target
                              .value,
                        })
                      )
                    }
                  >

                    <option value="">
                      Select category
                    </option>

                    <option value="Men's Singles">
                      Men's Singles
                    </option>

                    <option value="Men's Doubles">
                      Men's Doubles
                    </option>

                    <option value="Women's Singles">
                      Women's Singles
                    </option>

                    <option value="Women's Doubles">
                      Women's Doubles
                    </option>

                  </select>

                </div>


                {/* STATUS */}

                <div className="tm-edit-field">

                  <label>
                    Status
                  </label>

                 <select
  value={editForm.status}
  className={
    editForm.status ===
    "Registration Open"
      ? "tm-status-open"
      : editForm.status ===
        "Upcoming"
      ? "tm-status-upcoming"
      : editForm.status ===
        "Ongoing"
      ? "tm-status-ongoing"
      : editForm.status ===
        "Completed"
      ? "tm-status-completed"
      : ""
  }
  onChange={(event) =>
    setEditForm((previous) => ({
      ...previous,
      status: event.target.value,
    }))
  }
>
  <option value="Registration Open">
    Registration Open
  </option>

  <option value="Upcoming">
    Upcoming
  </option>

  <option value="Ongoing">
    Ongoing — registration closed
  </option>

  <option value="Completed">
    Completed — tournament finished
  </option>
</select>

                </div>


                {/* START DATE */}

                <div className="tm-edit-field">

                  <label>
                    Start Date
                  </label>

                  <input
                    type="date"
                    value={
                      editForm.startDate
                    }
                    onChange={(event) =>
                      setEditForm(
                        (previous) => ({
                          ...previous,
                          startDate:
                            event.target
                              .value,
                        })
                      )
                    }
                  />

                </div>


                {/* END DATE */}

                <div className="tm-edit-field">

                  <label>
                    End Date
                  </label>

                  <input
                    type="date"
                    value={
                      editForm.endDate
                    }
                    onChange={(event) =>
                      setEditForm(
                        (previous) => ({
                          ...previous,
                          endDate:
                            event.target
                              .value,
                        })
                      )
                    }
                  />

                </div>


                {/* LOCATION */}

                <div className="tm-edit-field">

                  <label>
                    Location / Venue
                  </label>

                  <input
                    type="text"
                    value={
                      editForm.location
                    }
                    onChange={(event) =>
                      setEditForm(
                        (previous) => ({
                          ...previous,
                          location:
                            event.target
                              .value,
                        })
                      )
                    }
                  />

                </div>


                {/* MAX PARTICIPANTS */}

                <div className="tm-edit-field">

                  <label>
                    Max Participants
                  </label>

                  <input
                    type="number"
                    min="2"
                    value={
                      editForm.maxParticipants
                    }
                    onChange={(event) =>
                      setEditForm(
                        (previous) => ({
                          ...previous,
                          maxParticipants:
                            event.target
                              .value,
                        })
                      )
                    }
                  />

                </div>


                {/* FORMAT */}

                {/* TOURNAMENT TYPE */}

<div className="tm-edit-field full">
  <label>
    Tournament Type
  </label>

  <select
    value={editForm.format}
    onChange={(event) =>
      setEditForm((previous) => ({
        ...previous,
        format: event.target.value,
      }))
    }
  >
    <option value="Singles">
      Singles
    </option>

    <option value="Doubles">
      Doubles
    </option>
  </select>

  <small className="tm-edit-hint">
    Fixture structure is automatically determined
    from the tournament type and category.
  </small>
</div>

                {/* DESCRIPTION */}

                <div className="tm-edit-field full">

                  <label>
                    Description
                  </label>

                  <textarea
                    rows={4}
                    maxLength={1000}
                    value={
                      editForm.description
                    }
                    onChange={(event) =>
                      setEditForm(
                        (previous) => ({
                          ...previous,
                          description:
                            event.target
                              .value,
                        })
                      )
                    }
                  />

                </div>

              </div>


              {/* ACTIONS */}

              <div className="tm-edit-actions">

                <button
                  type="button"
                  className="tm-outline-btn"
                  onClick={() =>
                    setIsEditingTournament(
                      false
                    )
                  }
                  disabled={
                    editLoading
                  }
                >
                  Cancel
                </button>


                <button
                  type="submit"
                  className="tm-primary-btn"
                  disabled={
                    editLoading
                  }
                >
                  {editLoading
                    ? "Saving..."
                    : "Save Changes"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}


// =========================================================
// POINTS TABLE
// =========================================================

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

              <th>
                #
              </th>

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
                    row.name
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


                  <td className="tm-player-name">
                    {row.name}
                  </td>


                  <td>
                    {row.played}
                  </td>


                  <td>
                    {row.won}
                  </td>


                  <td>
                    {row.lost}
                  </td>


                  <td className="tm-points">
                    {row.points}
                  </td>

                  <td
                    className={
                      row.difference > 0
                        ? "tm-difference positive"
                        : row.difference < 0
                          ? "tm-difference negative"
                          : "tm-difference"
                    }
                  >
                    {row.difference > 0 ? "+" : ""}{row.difference}
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