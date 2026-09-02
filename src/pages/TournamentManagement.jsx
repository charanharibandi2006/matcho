import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { socket } from "../services/socket";

import { getRole } from "../utils/auth";

import matchoLogo from "../assets/images/logo.png";

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
  Trash2,
  Download,
  FileDown,
  FileText
} from "lucide-react";

import jsPDF from "jspdf";

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

const [fixtureSetup, setFixtureSetup] = useState({
  poolCount: 2,
  teamsPerPool: 2,
  groupMatchesPerTeam: 1,
  super8Enabled: false,
  super8MatchesPerTeam: 1,
});

const [fixtureSetupConfigured, setFixtureSetupConfigured] =
  useState(false);
const [fixtureSetupSaving, setFixtureSetupSaving] =
  useState(false);
const [fixtureSetupError, setFixtureSetupError] =
  useState("");

const [poolAssignments, setPoolAssignments] = useState([]);
const [poolAssignmentError, setPoolAssignmentError] = useState("");
const [loadingPoolAssignments, setLoadingPoolAssignments] = useState(false);
const [poolAssignmentSaving, setPoolAssignmentSaving] = useState(false);

const [selectedFixture, setSelectedFixture] = useState(null);
const [fixtureFilter, setFixtureFilter] =
  useState("all");

const [readyModalOpen, setReadyModalOpen] =
  useState(false);
const [readyFixture, setReadyFixture] =
  useState(null);
const [readySideA, setReadySideA] =
  useState(false);
const [readySideB, setReadySideB] =
  useState(false);

const [swapModalOpen, setSwapModalOpen] =
  useState(false);
const [swapFromSide, setSwapFromSide] =
  useState(null);
const [swapTarget, setSwapTarget] =
  useState(null);
const [swapSaving, setSwapSaving] =
  useState(false);

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

  async function imageUrlToDataUrl(url) {
  if (!url) return null;

  try {
    const resolvedUrl = new URL(
      String(url),
      window.location.origin
    ).href;

    const response = await fetch(
      resolvedUrl,
      {
        mode: "cors",
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error(
        `Unable to load tournament logo (${response.status})`
      );
    }

    const blob = await response.blob();

    return await new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onloadend = () => {
        resolve(reader.result);
      };

      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error(
      "Tournament logo PDF error:",
      error
    );

    return null;
  }
}

async function getTournamentLogoDataUrl() {
  let logoUrl =
    tournament?.icon_url || "";

  // If the selected tournament object does not contain icon_url,
  // fetch the complete tournament record from the backend.
  if (!logoUrl && tournament?.id) {
    try {
      const token =
        localStorage.getItem("matcho_token");

      const result = await apiRequest(
        `/tournaments/${tournament.id}`,
        {
          method: "GET",
          headers: token
            ? {
                Authorization:
                  `Bearer ${token}`,
              }
            : undefined,
        }
      );

      logoUrl =
        result?.tournament?.icon_url || "";
    } catch (error) {
      console.error(
        "Unable to fetch tournament logo URL:",
        error
      );
    }
  }

  if (!logoUrl) {
    return null;
  }

  return imageUrlToDataUrl(logoUrl);
}

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

function handleOpenScoring(match) {
  if (match.status === "Upcoming") {
    openReadyModal(match);
    return;
  }

  openFixtureScoring(match);
}

function openReadyModal(match) {
  setSelectedFixture(null);
  setReadyFixture(match);
  setReadySideA(false);
  setReadySideB(false);
  setSwapFromSide(null);
  setSwapTarget(null);
  setSwapModalOpen(false);
  setReadyModalOpen(true);
}

function closeReadyModal() {
  setReadyModalOpen(false);
  setReadyFixture(null);
  setReadySideA(false);
  setReadySideB(false);
  setSwapFromSide(null);
  setSwapTarget(null);
  setSwapModalOpen(false);
}

function getSwapCandidates(match) {
  if (!match || !swapFromSide) {
    return [];
  }

  const getSideId = (fixture, side) =>
    isDoubles
      ? (side === "A" ? fixture.team_a_id : fixture.team_b_id)
      : (side === "A" ? fixture.player_a_id : fixture.player_b_id);

  const samePair = (leftA, leftB, rightA, rightB) =>
    leftA != null &&
    leftB != null &&
    ((String(leftA) === String(rightA) && String(leftB) === String(rightB)) ||
      (String(leftA) === String(rightB) && String(leftB) === String(rightA)));

  const existingPairings = fixtures.filter((fixture) =>
    String(fixture.id) !== String(match.id)
  );

  const currentA = getSideId(match, "A");
  const currentB = getSideId(match, "B");

  return fixtures
    .filter((fixture) => {
      if (String(fixture.id) === String(match.id)) return false;
      if (String(fixture.tournament_id) !== String(match.tournament_id)) return false;
      if (fixture.status !== "Upcoming") return false;
      if (fixture.stage !== match.stage) return false;

      // Pool swaps stay inside the same pool.
      if (
        String(match.stage || "").toLowerCase() === "pool" &&
        String(fixture.pool_name || "") !== String(match.pool_name || "")
      ) {
        return false;
      }

      return true;
    })
    .flatMap((fixture) => {
      const results = [];
      const candidateA = getSideId(fixture, "A");
      const candidateB = getSideId(fixture, "B");

      ([
        ["A", candidateA, candidateB],
        ["B", candidateB, candidateA],
      ]).forEach(([side, candidateSelected, candidateOther]) => {
        if (candidateSelected == null || candidateOther == null) return;

        // The selected opponent cannot already be the other participant
        // in the current fixture or the candidate fixture.
        const duplicateInCurrentFixture =
          String(candidateSelected) === String(currentA) ||
          String(candidateSelected) === String(currentB);

        const duplicateWithCurrentOther =
          side === "A"
            ? String(candidateOther) === String(currentA) ||
              String(candidateOther) === String(currentB)
            : false;

        if (duplicateInCurrentFixture || duplicateWithCurrentOther) {
          return;
        }

        // After swapping, the new pairings would be:
        // currentOther vs candidateSelected
        // candidateOther vs currentSelected
        const currentSelected =
          swapFromSide === "A" ? currentA : currentB;
        const currentOther =
          swapFromSide === "A" ? currentB : currentA;

        if (currentSelected == null || currentOther == null) return;

        const createsExistingPair = existingPairings.some((otherFixture) => {
          if (String(otherFixture.id) === String(fixture.id)) return false;

          const otherA = getSideId(otherFixture, "A");
          const otherB = getSideId(otherFixture, "B");

          return (
            samePair(currentOther, candidateSelected, otherA, otherB) ||
            samePair(candidateOther, currentSelected, otherA, otherB)
          );
        });

        if (createsExistingPair) return;

        results.push({
          fixture,
          side,
          name:
            isDoubles
              ? (side === "A" ? fixture.team_a_name : fixture.team_b_name) || "TBD"
              : (side === "A" ? fixture.player_a_name : fixture.player_b_name) || "TBD",
          members:
            isDoubles
              ? getTeamMembers(candidateSelected)
              : [],
        });
      });

      return results;
    });
}

function openSwapModal(side) {
  if (!readyFixture) {
    return;
  }

  setSwapFromSide(side);
  setSwapTarget(null);
  setSwapModalOpen(true);
}

async function confirmSwap() {
  if (
    !readyFixture ||
    !swapFromSide ||
    !swapTarget
  ) {
    return;
  }

  try {
    setSwapSaving(true);
    setFixtureError("");
    setMessage("");

    const token =
      localStorage.getItem("matcho_token");

    if (!token) {
      throw new Error(
        "Please login as an organizer."
      );
    }

    const result =
      await apiRequest(
        "/fixtures/swap",
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${token}`,
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            fixtureId:
              readyFixture.id,
            fixtureSide:
              swapFromSide,
            swapFixtureId:
              swapTarget.fixture.id,
            swapSide:
              swapTarget.side,
          }),
        }
      );

    if (!result?.success) {
      throw new Error(
        result?.message ||
          "Unable to swap opponents."
      );
    }

    const refreshedFixtures =
      await loadFixtures(tournamentId);

    const refreshedFixture =
      refreshedFixtures.find(
        (fixture) =>
          String(fixture.id) ===
          String(readyFixture.id)
      );

    setSwapModalOpen(false);
    setSwapTarget(null);
    setReadySideA(false);
    setReadySideB(false);

    if (refreshedFixture) {
      setReadyFixture(
        refreshedFixture
      );
    }

    setMessage(
      "Opponents swapped successfully."
    );
  } catch (error) {
    console.error(
      "Swap Fixture Error:",
      error
    );

    setFixtureError(
      error.message ||
        "Unable to swap opponents."
    );
  } finally {
    setSwapSaving(false);
  }
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

    function getTeamMembers(teamId) {
  if (!isDoubles || !teamId) {
    return [];
  }

  const team = teams.find(
    (item) => String(item.id) === String(teamId)
  );

  if (!team || !Array.isArray(team.players)) {
    return [];
  }

  return team.players
    .map(
      (player) =>
        player.full_name ||
        player.name ||
        player.participant_name ||
        ""
    )
    .filter(Boolean);
}
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

      const rows =
        Array.isArray(result?.fixtures)
          ? result.fixtures
          : [];

      setFixtures(rows);

      return rows;
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
  // LOAD FIXTURE SETUP
  // =======================================================

  async function loadFixtureSetup(selectedTournamentId) {
    if (!selectedTournamentId) {
      setFixtureSetupConfigured(false);
      setFixtureSetupError("");
      return;
    }

    try {
      setFixtureSetupError("");

      const token = localStorage.getItem("matcho_token");

      if (!token) {
        setFixtureSetupConfigured(false);
        return;
      }

      const result = await apiRequest(
        `/fixtures/setup/${selectedTournamentId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (result?.setup) {
        const saved = result.setup;

        setFixtureSetup({
          poolCount: Number(saved.pool_count),
          teamsPerPool: Number(saved.teams_per_pool),
          groupMatchesPerTeam: Number(saved.group_matches_per_team),
          super8Enabled: Boolean(saved.super8_enabled),
          super8MatchesPerTeam: saved.super8_matches_per_team
            ? Number(saved.super8_matches_per_team)
            : 1,
        });

        setFixtureSetupConfigured(true);
      } else {
        setFixtureSetupConfigured(false);
      }
    } catch (error) {
      console.error("Load Fixture Setup Error:", error);
      setFixtureSetupConfigured(false);
    }
  }


  // =======================================================
  // LOAD POOL ASSIGNMENTS
  // =======================================================

  async function loadPoolAssignments(selectedTournamentId) {
    if (!selectedTournamentId) {
      setPoolAssignments([]);
      setPoolAssignmentError("");
      return;
    }

    try {
      setLoadingPoolAssignments(true);
      setPoolAssignmentError("");

      const token = localStorage.getItem("matcho_token");

      if (!token) {
        setPoolAssignments([]);
        return;
      }

      const result = await apiRequest(
        `/fixtures/pools/${selectedTournamentId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setPoolAssignments(
        Array.isArray(result?.pools)
          ? result.pools
          : []
      );
    } catch (error) {
      console.error("Load Pool Assignments Error:", error);
      setPoolAssignments([]);
    } finally {
      setLoadingPoolAssignments(false);
    }
  }

  async function randomizePools() {
    if (!tournamentId) return;

    try {
      setPoolAssignmentSaving(true);
      setPoolAssignmentError("");

      const token = localStorage.getItem("matcho_token");

      if (!token) {
        throw new Error("Please login as an organizer.");
      }

      const result = await apiRequest(
        `/fixtures/pools/${tournamentId}/random`,
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
          result?.message ||
          "Unable to randomly assign pools."
        );
      }

      setPoolAssignments(
        Array.isArray(result?.pools)
          ? result.pools
          : []
      );
      setMessage("Teams/players randomly assigned to pools.");
    } catch (error) {
      console.error("Random Pool Assignment Error:", error);
      setPoolAssignmentError(
        error.message ||
        "Unable to randomly assign pools."
      );
    } finally {
      setPoolAssignmentSaving(false);
    }
  }

  function getPoolForParticipant(participantId) {
    const pool = poolAssignments.find((item) =>
      (item.members || []).some(
        (member) => String(member.id) === String(participantId)
      )
    );

    return pool ? Number(pool.poolNumber) : "";
  }

  function manuallyAssignParticipant(participantId, poolNumber) {
    const targetPool = Number(poolNumber);

    if (!targetPool) {
      setPoolAssignments((current) =>
        current.map((pool) => ({
          ...pool,
          members: (pool.members || []).filter(
            (member) => String(member.id) !== String(participantId)
          ),
        }))
      );
      return;
    }

    const currentPool = getPoolForParticipant(participantId);

    if (
      currentPool &&
      currentPool !== targetPool
    ) {
      const destination = poolAssignments.find(
        (pool) => Number(pool.poolNumber) === targetPool
      );

      if (
        destination &&
        (destination.members || []).length >= calculatedTeamsPerPool
      ) {
        setPoolAssignmentError(
          `Pool ${String.fromCharCode(64 + targetPool)} is already full.`
        );
        return;
      }
    }

    setPoolAssignmentError("");

    setPoolAssignments((currentPools) => {
      const cleaned = currentPools.map((pool) => ({
        ...pool,
        members: (pool.members || []).filter(
          (member) => String(member.id) !== String(participantId)
        ),
      }));

      const target = cleaned.find(
        (pool) => Number(pool.poolNumber) === targetPool
      );

      if (!target) return cleaned;

      const list = isDoubles ? teams : participants;

      const participant = list.find((item) => {
        const id = isDoubles
          ? item.id
          : (item.player_id ?? item.id);
        return String(id) === String(participantId);
      });

      if (!participant) return cleaned;

      target.members.push({
        id: participantId,
        name: isDoubles
          ? (participant.team_name || participant.name || `Team ${participantId}`)
          : (participant.participant_name || participant.name || `Player ${participantId}`),
        type: isDoubles ? "team" : "player",
      });

      return cleaned;
    });
  }

  async function savePoolAssignments() {
    if (!tournamentId) return;

    try {
      setPoolAssignmentSaving(true);
      setPoolAssignmentError("");

      if (!calculatedTeamsPerPool) {
        throw new Error(
          "The number of teams/players cannot be divided equally among the selected pools."
        );
      }

      const pools = poolAssignments.map((pool) => ({
        poolNumber: Number(pool.poolNumber),
        participantIds: (pool.members || []).map(
          (member) => Number(member.id)
        ),
      }));

      if (pools.length !== poolCount) {
        throw new Error(
          `Configure all ${poolCount} pools before saving.`
        );
      }

      const totalAssigned = pools.reduce(
        (total, pool) => total + pool.participantIds.length,
        0
      );

      if (totalAssigned !== availableParticipants) {
        throw new Error(
          `Assign all ${availableParticipants} ${isDoubles ? "teams" : "players"} to pools.`
        );
      }

      for (const pool of pools) {
        if (pool.participantIds.length !== calculatedTeamsPerPool) {
          throw new Error(
            `Each pool must contain exactly ${calculatedTeamsPerPool} ${isDoubles ? "teams" : "players"}.`
          );
        }
      }

      const token = localStorage.getItem("matcho_token");

      if (!token) {
        throw new Error("Please login as an organizer.");
      }

      const result = await apiRequest(
        `/fixtures/pools/${tournamentId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ pools }),
        }
      );

      if (!result?.success) {
        throw new Error(
          result?.message ||
          "Unable to save pool assignments."
        );
      }

      setPoolAssignments(
        Array.isArray(result?.pools)
          ? result.pools
          : poolAssignments
      );
      setMessage("Pool assignments saved successfully.");
    } catch (error) {
      console.error("Save Pool Assignments Error:", error);
      setPoolAssignmentError(
        error.message ||
        "Unable to save pool assignments."
      );
    } finally {
      setPoolAssignmentSaving(false);
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
  setFixtureSetupError("");
  setFixtureSetupConfigured(false);
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

  useEffect(() => {
    if (tournamentId) {
      loadFixtureSetup(tournamentId);
    }
  }, [tournamentId]);

  useEffect(() => {
    if (tournamentId) {
      loadPoolAssignments(tournamentId);
    } else {
      setPoolAssignments([]);
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
  // Organizer-controlled for every tournament.
  // Group-stage matches and Super 8 matches are separate.
  // Super 8 always qualifies exactly 8 teams/players.
  // =======================================================

const isDoubles =
  String(tournament?.format || "")
    .toLowerCase() === "doubles";

const availableParticipants = isDoubles
  ? teams.length
  : participants.length;

const poolCount = Number(
  fixtureSetup.poolCount || 0
);

const teamsPerPool = Number(
  fixtureSetup.teamsPerPool || 0
);

const calculatedTeamsPerPool =
  poolCount > 0 &&
  availableParticipants > 0 &&
  availableParticipants % poolCount === 0
    ? availableParticipants / poolCount
    : 0;

const poolsAssignedComplete =
  calculatedTeamsPerPool > 0 &&
  poolAssignments.length === poolCount &&
  poolAssignments.every(
    (pool) => (pool.members || []).length === calculatedTeamsPerPool
  );

const groupMatchesPerTeam = Number(
  fixtureSetup.groupMatchesPerTeam || 0
);

const hasSuper8Format = Boolean(
  fixtureSetup.super8Enabled
);

const super8MatchesPerTeam = Number(
  fixtureSetup.super8MatchesPerTeam || 0
);

const qualifiersPerPool =
  poolCount > 0 && 8 % poolCount === 0
    ? 8 / poolCount
    : 0;

  useEffect(() => {
    if (calculatedTeamsPerPool > 0) {
      setFixtureSetup((current) => ({
        ...current,
        teamsPerPool: calculatedTeamsPerPool,
      }));
    }
  }, [calculatedTeamsPerPool]);

  useEffect(() => {
    if (poolCount > 0 && poolAssignments.length > 0 && poolAssignments.length !== poolCount) {
      setPoolAssignments([]);
    }
  }, [poolCount]);

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

    const add = (id, name, members = []) => {
  if (id === null || id === undefined) return;

  const key = String(id);

  if (!map.has(key)) {
    map.set(key, {
      id,
      name: name || `Participant ${id}`,
      members: Array.isArray(members)
        ? members
        : [],
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

const aMembers = isDoubles
  ? fixture.team_a_members
  : [];

const bMembers = isDoubles
  ? fixture.team_b_members
  : [];

const a = add(
  aId,
  aName,
  aMembers
);

const b = add(
  bId,
  bName,
  bMembers
);

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
    super8Fixtures.length > 0 &&
    super8Fixtures.every(
      (fixture) => fixture.status === "Completed"
    );

  const semifinalsComplete =
    semifinalFixtures.length === 2 &&
    semifinalFixtures.every(
      (fixture) => fixture.status === "Completed"
    );

  // =======================================================
  // SAVE FIXTURE SETUP
  // =======================================================

  async function saveFixtureSetup() {
    if (!tournamentId) {
      setFixtureSetupError("Please select a tournament first.");
      return;
    }

    if (!Number.isInteger(poolCount) || poolCount < 1) {
      setFixtureSetupError("Number of pools must be at least 1.");
      return;
    }

    if (!Number.isInteger(calculatedTeamsPerPool) || calculatedTeamsPerPool < 2) {
      setFixtureSetupError(
        "The selected number of pools cannot divide the current teams/players evenly."
      );
      return;
    }

    if (!Number.isInteger(groupMatchesPerTeam) || groupMatchesPerTeam < 1) {
      setFixtureSetupError("Group-stage matches per team must be at least 1.");
      return;
    }

    if (availableParticipants !== poolCount * calculatedTeamsPerPool) {
      setFixtureSetupError(
        `${availableParticipants} ${isDoubles ? "teams" : "players"} cannot be divided into ${poolCount} equal pools.`
      );
      return;
    }

    if (hasSuper8Format) {
      if (availableParticipants < 8) {
        setFixtureSetupError("At least 8 teams/players are required for Super 8.");
        return;
      }

      if (!Number.isInteger(super8MatchesPerTeam) || super8MatchesPerTeam < 1) {
        setFixtureSetupError("Super 8 matches per team must be at least 1.");
        return;
      }

      if (8 % poolCount !== 0) {
        setFixtureSetupError("For Super 8, use 1, 2, 4, or 8 pools.");
        return;
      }
    }

    try {
      setFixtureSetupSaving(true);
      setFixtureSetupError("");

      const token = localStorage.getItem("matcho_token");
      if (!token) {
        throw new Error("Please login as an organizer.");
      }

      const result = await apiRequest(
        `/fixtures/setup/${tournamentId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            poolCount,
            teamsPerPool,
            groupMatchesPerTeam,
            super8Enabled: hasSuper8Format,
            super8MatchesPerTeam: hasSuper8Format
              ? super8MatchesPerTeam
              : null,
          }),
        }
      );

      if (!result?.success) {
        throw new Error(
          result?.message || "Unable to save fixture setup."
        );
      }

      const saved = result.setup;

      if (saved) {
        setFixtureSetup({
          poolCount: Number(saved.pool_count),
          teamsPerPool: Number(saved.teams_per_pool),
          groupMatchesPerTeam: Number(saved.group_matches_per_team),
          super8Enabled: Boolean(saved.super8_enabled),
          super8MatchesPerTeam: saved.super8_matches_per_team
            ? Number(saved.super8_matches_per_team)
            : 1,
        });
      }

      setFixtureSetupConfigured(true);
      setMessage("Fixture setup saved successfully.");
    } catch (error) {
      console.error("Save Fixture Setup Error:", error);
      setFixtureSetupError(
        error.message || "Unable to save fixture setup."
      );
    } finally {
      setFixtureSetupSaving(false);
    }
  }

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

    if (!fixtureSetupConfigured) {
      setFixtureError("Save the fixture setup before generating fixtures.");
      setActiveSection("setup");
      return;
    }

    if (!poolsAssignedComplete) {
      setFixtureError("Assign all teams/players to pools and save the pool assignment before generating fixtures.");
      return;
    }

    if (availableParticipants !== poolCount * teamsPerPool) {
      setFixtureError(
        `${availableParticipants} ${isDoubles ? "teams" : "players"} do not match the saved fixture setup.`
      );
      return;
    }

    const confirmed = window.confirm(
      `Generate fixtures with ${poolCount} pools, ${teamsPerPool} ${isDoubles ? "teams" : "players"} per pool, ${groupMatchesPerTeam} group-stage matches per team${hasSuper8Format ? `, Super 8 enabled with ${super8MatchesPerTeam} matches per team, and exactly 8 qualifiers` : ", with no Super 8"}.`
    );

    if (!confirmed) {
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
        }
      );

      if (!result?.success) {
        throw new Error(
          result?.message || "Unable to generate fixtures."
        );
      }

      await loadFixtures(tournamentId);
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
  setEditLoading(true);

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
  // TOURNAMENT PDF REPORT
  // =======================================================

  async function buildTournamentPdf() {
    if (!tournament) {
      throw new Error(
        "Please select a tournament first."
      );
    }

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth =
      pdf.internal.pageSize.getWidth();

    const pageHeight =
      pdf.internal.pageSize.getHeight();

    const margin = 18;

    const contentWidth =
      pageWidth - margin * 2;

    let y = 18;

    const addPageIfNeeded = (
      height = 10
    ) => {
      if (
        y + height >
        pageHeight - 18
      ) {
        pdf.addPage();
        y = 20;
      }
    };

    // =======================================================
    // MATCHO LOGO - TOP CENTER
    // =======================================================

    pdf.addImage(
      matchoLogo,
      "PNG",
      pageWidth / 2 - 18,
      y,
      36,
      18
    );

    y += 27;

    // =======================================================
    // REPORT TITLE
    // =======================================================

    pdf.setTextColor(
      25,
      25,
      40
    );

    pdf.setFont(
      "helvetica",
      "bold"
    );

    pdf.setFontSize(20);

    pdf.text(
      "Teams & Pairs",
      pageWidth / 2,
      y,
      {
        align: "center",
      }
    );

    y += 13;

    // =======================================================
    // TOURNAMENT/APT LOGO + TOURNAMENT NAME
    // =======================================================

    const tournamentLogo =
      await getTournamentLogoDataUrl();

    const logoSize = 24;

    const nameX =
      tournamentLogo
        ? margin + logoSize + 8
        : margin;

    addPageIfNeeded(32);

    if (tournamentLogo) {
      const imageFormat =
        String(tournamentLogo)
          .toLowerCase()
          .startsWith(
            "data:image/jpeg"
          )
          ? "JPEG"
          : "PNG";

      pdf.addImage(
        tournamentLogo,
        imageFormat,
        margin,
        y - 4,
        logoSize,
        logoSize
      );
    }

    pdf.setTextColor(
      35,
      35,
      50
    );

    pdf.setFont(
      "helvetica",
      "bold"
    );

    pdf.setFontSize(14);

    const tournamentName =
      tournament?.name ||
      "Tournament";

    const titleLines =
      pdf.splitTextToSize(
        tournamentName,
        contentWidth -
          (nameX - margin)
      );

    pdf.text(
      titleLines,
      nameX,
      y + 7
    );

    y += Math.max(
      28,
      titleLines.length * 6 + 14
    );

    // =======================================================
    // TOTAL TEAMS
    // =======================================================

    addPageIfNeeded(25);

    pdf.setFillColor(
      246,
      243,
      255
    );

    pdf.roundedRect(
      margin,
      y - 5,
      contentWidth,
      18,
      3,
      3,
      "F"
    );

    pdf.setFont(
      "helvetica",
      "bold"
    );

    pdf.setFontSize(11);

    pdf.setTextColor(
      99,
      60,
      255
    );

    pdf.text(
      `Total Teams: ${teams.length}`,
      margin + 5,
      y + 6
    );

    y += 28;

    // =======================================================
    // TEAMS ONLY
    // =======================================================

    if (!teams.length) {
      pdf.setFont(
        "helvetica",
        "normal"
      );

      pdf.setFontSize(11);

      pdf.setTextColor(
        80,
        80,
        95
      );

      pdf.text(
        "No teams or pairs have been created yet.",
        margin,
        y
      );
    } else {
      teams.forEach(
        (team, index) => {
          const teamPlayers =
            Array.isArray(
              team.players
            )
              ? team.players
              : [];

          const cardHeight =
            Math.max(
              34,
              20 +
                teamPlayers.length *
                  10
            );

          addPageIfNeeded(
            cardHeight + 8
          );

          pdf.setDrawColor(
            226,
            222,
            242
          );

          pdf.setFillColor(
            252,
            251,
            255
          );

          pdf.roundedRect(
            margin,
            y,
            contentWidth,
            cardHeight,
            3,
            3,
            "FD"
          );

          pdf.setFont(
            "helvetica",
            "bold"
          );

          pdf.setFontSize(8);

          pdf.setTextColor(
            125,
            118,
            150
          );

          pdf.text(
            `TEAM ${index + 1}`,
            margin + 6,
            y + 8
          );

          pdf.setFontSize(12);

          pdf.setTextColor(
            30,
            30,
            45
          );

          pdf.text(
            team.team_name ||
              `Team ${index + 1}`,
            margin + 6,
            y + 15
          );

          let playerY =
            y + 25;

          if (
            !teamPlayers.length
          ) {
            pdf.setFont(
              "helvetica",
              "normal"
            );

            pdf.setFontSize(9.5);

            pdf.setTextColor(
              115,
              115,
              130
            );

            pdf.text(
              "No players assigned.",
              margin + 8,
              playerY
            );
          } else {
            teamPlayers.forEach(
              (
                player,
                playerIndex
              ) => {
                const playerName =
                  player.name ||
                  `Player ${player.id}`;

                pdf.setFillColor(
                  238,
                  233,
                  255
                );

                pdf.circle(
                  margin + 10,
                  playerY - 1.5,
                  3.5,
                  "F"
                );

                pdf.setFont(
                  "helvetica",
                  "bold"
                );

                pdf.setFontSize(8);

                pdf.setTextColor(
                  99,
                  60,
                  255
                );

                pdf.text(
                  String(
                    playerIndex + 1
                  ),
                  margin + 8.5,
                  playerY + 1
                );

                pdf.setFont(
                  "helvetica",
                  "normal"
                );

                pdf.setFontSize(10);

                pdf.setTextColor(
                  45,
                  45,
                  60
                );

                pdf.text(
                  playerName,
                  margin + 17,
                  playerY + 1
                );

                playerY += 10;
              }
            );
          }

          y +=
            cardHeight + 8;
        }
      );
    }

    // =======================================================
    // FOOTER
    // =======================================================

    const totalPages =
      pdf.getNumberOfPages();

    for (
      let page = 1;
      page <= totalPages;
      page += 1
    ) {
      pdf.setPage(page);

      pdf.setDrawColor(
        225,
        225,
        235
      );

      pdf.line(
        margin,
        pageHeight - 12,
        pageWidth - margin,
        pageHeight - 12
      );

      pdf.setFont(
        "helvetica",
        "normal"
      );

      pdf.setFontSize(7.5);

      pdf.setTextColor(
        130,
        130,
        145
      );

      pdf.text(
        "MATCHO • Teams & Pairs",
        margin,
        pageHeight - 6
      );

      pdf.text(
        `Page ${page} of ${totalPages}`,
        pageWidth - margin,
        pageHeight - 6,
        {
          align: "right",
        }
      );
    }

    return pdf;
  }

  function getTournamentPdfFileName() {
    const safeName = (tournament?.name || "Matcho-Tournament")
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "");

    return `${safeName || "Matcho-Tournament"}-Teams-Pairs.pdf`;
  }

  async function downloadTournamentPdf() {
    try {
      const pdf =
        await buildTournamentPdf();
      pdf.save(getTournamentPdfFileName());
      setMessage("Teams & Pairs PDF downloaded successfully.");
    } catch (error) {
      console.error("Teams & Pairs PDF download error:", error);
      setTeamError(
        error.message || "Unable to generate Teams & Pairs PDF."
      );
    }
  }

  async function shareTournamentPdf() {
    try {
      const pdf = await buildTournamentPdf();
      const blob = pdf.output("blob");
      const file = new File(
        [blob],
        getTournamentPdfFileName(),
        { type: "application/pdf" }
      );

      if (
        navigator.share &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          title: `${tournament?.name || "Tournament"} - Teams & Pairs`,
          text: "Teams & Pairs PDF",
          files: [file],
        });
        return;
      }

      pdf.save(getTournamentPdfFileName());
      setMessage(
        "PDF downloaded. Direct file sharing is not supported by this browser."
      );
    } catch (error) {
      if (error?.name === "AbortError") {
        return;
      }

      console.error("Teams & Pairs PDF share error:", error);
      setTeamError(
        error.message || "Unable to share Teams & Pairs PDF."
      );
    }
  }


  // =======================================================
  // FIXTURES PDF REPORT
  // =======================================================

  async function buildFixturesPdf() {
    if (!tournament) {
      throw new Error("Please select a tournament first.");
    }

    if (!fixtures.length) {
      throw new Error("No fixtures are available to export.");
    }

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 16;
    const contentWidth = pageWidth - margin * 2;
    let y = 18;

    const addPageIfNeeded = (height = 10) => {
      if (y + height > pageHeight - 18) {
        pdf.addPage();
        y = 18;
      }
    };

    // =====================================================
    // MATCHO LOGO
    // =====================================================

    pdf.addImage(
      matchoLogo,
      "PNG",
      pageWidth / 2 - 18,
      y,
      36,
      18
    );

    y += 27;

    // =====================================================
    // TITLE
    // =====================================================

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(20);
    pdf.setTextColor(25, 25, 40);

    pdf.text(
      "Fixtures",
      pageWidth / 2,
      y,
      { align: "center" }
    );

    y += 13;

    // =====================================================
    // TOURNAMENT LOGO + NAME
    // =====================================================

    const tournamentLogo =
      await getTournamentLogoDataUrl();

    const logoSize = 24;
    const nameX = tournamentLogo
      ? margin + logoSize + 8
      : margin;

    addPageIfNeeded(32);

    if (tournamentLogo) {
      const imageFormat = String(tournamentLogo)
        .toLowerCase()
        .startsWith("data:image/jpeg")
        ? "JPEG"
        : "PNG";

      pdf.addImage(
        tournamentLogo,
        imageFormat,
        margin,
        y - 4,
        logoSize,
        logoSize
      );
    }

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.setTextColor(35, 35, 50);

    const tournamentName =
      tournament?.name || "Tournament";

    const titleLines = pdf.splitTextToSize(
      tournamentName,
      contentWidth - (nameX - margin)
    );

    pdf.text(titleLines, nameX, y + 7);

    y += Math.max(28, titleLines.length * 6 + 14);

    // =====================================================
    // SUMMARY
    // =====================================================

    addPageIfNeeded(25);

    pdf.setFillColor(246, 243, 255);
    pdf.roundedRect(
      margin,
      y - 5,
      contentWidth,
      18,
      3,
      3,
      "F"
    );

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(99, 60, 255);

    pdf.text(
      `Total Fixtures: ${fixtures.length}`,
      margin + 5,
      y + 6
    );

    y += 28;

    // =====================================================
    // GROUP FIXTURES BY STAGE
    // =====================================================

    const stageOrder = [
      "Pool",
      "Super 8",
      "Semi Final",
      "Final",
    ];

    const stageMeta = {
      Pool: {
        eyebrow: "GROUP STAGE",
        title: "Group Stage",
      },
      "Super 8": {
        eyebrow: "KNOCKOUT STAGE",
        title: "Super 8",
      },
      "Semi Final": {
        eyebrow: "KNOCKOUT STAGE",
        title: "Semi Finals",
      },
      Final: {
        eyebrow: "CHAMPIONSHIP",
        title: "Final",
      },
    };

    const orderedStages = stageOrder
      .map((stage) => ({
        stage,
        items: fixtures.filter(
          (fixture) => fixture.stage === stage
        ),
      }))
      .filter((group) => group.items.length > 0);

    // Preserve any unexpected stage values at the end.
    const knownStageSet = new Set(stageOrder);

    const extraStages = fixtures
      .map((fixture) => fixture.stage)
      .filter(Boolean)
      .filter((stage, index, list) =>
        !knownStageSet.has(stage) &&
        list.indexOf(stage) === index
      );

    extraStages.forEach((stage) => {
      orderedStages.push({
        stage,
        items: fixtures.filter(
          (fixture) => fixture.stage === stage
        ),
      });
    });

    orderedStages.forEach(({ stage, items }) => {
      const meta =
        stageMeta[stage] || {
          eyebrow: "FIXTURES",
          title: stage || "Fixtures",
        };

      addPageIfNeeded(28);

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.setTextColor(125, 118, 150);

      pdf.text(
        meta.eyebrow,
        margin,
        y
      );

      y += 6;

      pdf.setFontSize(15);
      pdf.setTextColor(35, 35, 50);

      pdf.text(
        `${meta.title} (${items.length})`,
        margin,
        y
      );

      y += 10;

      // Pool-group the pool stage.
      const groups =
        stage === "Pool"
          ? poolNames
              .map((poolName) => ({
                label: poolName,
                items: items.filter(
                  (fixture) =>
                    fixture.pool_name === poolName
                ),
              }))
              .filter((group) => group.items.length > 0)
          : [
              {
                label: meta.title,
                items,
              },
            ];

      groups.forEach((group) => {
        if (stage === "Pool") {
          addPageIfNeeded(14);

          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(11);
          pdf.setTextColor(99, 60, 255);

          pdf.text(
            group.label,
            margin,
            y
          );

          y += 8;
        }

        group.items.forEach((match) => {
          const sideA = isDoubles
            ? match.team_a_name || "TBD"
            : match.player_a_name || "TBD";

          const sideB = isDoubles
            ? match.team_b_name || "TBD"
            : match.player_b_name || "TBD";

          const scoreA =
            Number(match.player_a_score) || 0;

          const scoreB =
            Number(match.player_b_score) || 0;

          const status =
            match.status || "Upcoming";

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
            String(winnerId) === String(sideAId)
              ? sideA
              : winnerId != null &&
                  String(winnerId) === String(sideBId)
                ? sideB
                : "Not declared";

          const matchLabel =
            match.match_number != null
              ? `Match ${match.match_number}`
              : match.round || "Match";

          const subLabel = [
            match.pool_name,
            match.round,
          ]
            .filter(Boolean)
            .filter(
              (value, index, array) =>
                array.indexOf(value) === index
            )
            .join(" • ");

          const cardHeight =
            status === "Completed"
              ? 42
              : 35;

          addPageIfNeeded(cardHeight + 7);

          pdf.setDrawColor(226, 222, 242);
          pdf.setFillColor(252, 251, 255);

          pdf.roundedRect(
            margin,
            y,
            contentWidth,
            cardHeight,
            3,
            3,
            "FD"
          );

          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(8);
          pdf.setTextColor(125, 118, 150);

          pdf.text(
            matchLabel,
            margin + 6,
            y + 8
          );

          if (subLabel) {
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(8);
            pdf.setTextColor(145, 140, 155);

            pdf.text(
              subLabel,
              pageWidth - margin - 6,
              y + 8,
              { align: "right" }
            );
          }

          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(10.5);
          pdf.setTextColor(40, 40, 55);

          pdf.text(
            sideA,
            margin + 8,
            y + 18
          );

          pdf.text(
            sideB,
            margin + 8,
            y + 27
          );

          pdf.setFontSize(11);
          pdf.setTextColor(99, 60, 255);

          pdf.text(
            `${scoreA} - ${scoreB}`,
            pageWidth - margin - 8,
            y + 22,
            { align: "right" }
          );

          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(8.5);
          pdf.setTextColor(
            status === "Completed"
              ? 55
              : status === "Live"
                ? 99
                : 115,
            status === "Completed"
              ? 120
              : status === "Live"
                ? 60
                : 115,
            status === "Completed"
              ? 90
              : status === "Live"
                ? 255
                : 130
          );

          pdf.text(
            status,
            pageWidth - margin - 8,
            y + 31,
            { align: "right" }
          );

          if (status === "Completed") {
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(8);
            pdf.setTextColor(45, 45, 60);

            pdf.text(
              `Winner: ${winnerName}`,
              margin + 8,
              y + 36
            );
          }

          y += cardHeight + 7;
        });
      });
    });

    // =====================================================
    // FOOTER
    // =====================================================

    const totalPages = pdf.getNumberOfPages();

    for (
      let page = 1;
      page <= totalPages;
      page += 1
    ) {
      pdf.setPage(page);

      pdf.setDrawColor(225, 225, 235);
      pdf.line(
        margin,
        pageHeight - 12,
        pageWidth - margin,
        pageHeight - 12
      );

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.5);
      pdf.setTextColor(130, 130, 145);

      pdf.text(
        "MATCHO • Fixtures",
        margin,
        pageHeight - 6
      );

      pdf.text(
        `Page ${page} of ${totalPages}`,
        pageWidth - margin,
        pageHeight - 6,
        { align: "right" }
      );
    }

    return pdf;
  }

  function getFixturesPdfFileName() {
    const safeName = (
      tournament?.name || "Matcho-Tournament"
    )
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "");

    return `${
      safeName || "Matcho-Tournament"
    }-Fixtures.pdf`;
  }

  async function downloadFixturesPdf() {
    try {
      const pdf = await buildFixturesPdf();

      pdf.save(
        getFixturesPdfFileName()
      );

      setMessage(
        "Fixtures PDF downloaded successfully."
      );
    } catch (error) {
      console.error(
        "Fixtures PDF download error:",
        error
      );

      setFixtureError(
        error.message ||
          "Unable to generate fixtures PDF."
      );
    }
  }

  async function shareFixturesPdf() {
    try {
      const pdf = await buildFixturesPdf();
      const blob = pdf.output("blob");

      const file = new File(
        [blob],
        getFixturesPdfFileName(),
        { type: "application/pdf" }
      );

      if (
        navigator.share &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          title: `${
            tournament?.name || "Tournament"
          } - Fixtures`,
          text: "Tournament Fixtures PDF",
          files: [file],
        });

        return;
      }

      pdf.save(
        getFixturesPdfFileName()
      );

      setMessage(
        "Fixtures PDF downloaded. Direct file sharing is not supported by this browser."
      );
    } catch (error) {
      if (error?.name === "AbortError") {
        return;
      }

      console.error(
        "Fixtures PDF share error:",
        error
      );

      setFixtureError(
        error.message ||
          "Unable to share fixtures PDF."
      );
    }
  }

  // =======================================================
  // STANDINGS PDF REPORT
  // =======================================================

  async function buildStandingsPdf() {
    if (!tournament) {
      throw new Error("Please select a tournament first.");
    }

    const hasPoolStandings =
      poolNames.some(
        (poolName) =>
          Array.isArray(poolStandings[poolName]) &&
          poolStandings[poolName].length > 0
      );

    const hasSuper8Standings =
      hasSuper8Format &&
      Array.isArray(super8Standings) &&
      super8Standings.length > 0;

    if (!hasPoolStandings && !hasSuper8Standings) {
      throw new Error("Standings are not available yet.");
    }

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 16;
    const contentWidth = pageWidth - margin * 2;
    let y = 18;

    const addPageIfNeeded = (height = 10) => {
      if (y + height > pageHeight - 18) {
        pdf.addPage();
        y = 18;
      }
    };

    // =====================================================
    // MATCHO LOGO
    // =====================================================

    pdf.addImage(
      matchoLogo,
      "PNG",
      pageWidth / 2 - 18,
      y,
      36,
      18
    );

    y += 27;

    // =====================================================
    // TITLE
    // =====================================================

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(20);
    pdf.setTextColor(25, 25, 40);

    pdf.text(
      "Standings",
      pageWidth / 2,
      y,
      { align: "center" }
    );

    y += 13;

    // =====================================================
    // TOURNAMENT LOGO + NAME
    // =====================================================

    const tournamentLogo =
      await getTournamentLogoDataUrl();

    const logoSize = 24;
    const nameX = tournamentLogo
      ? margin + logoSize + 8
      : margin;

    addPageIfNeeded(32);

    if (tournamentLogo) {
      const imageFormat =
        String(tournamentLogo)
          .toLowerCase()
          .startsWith("data:image/jpeg")
          ? "JPEG"
          : "PNG";

      pdf.addImage(
        tournamentLogo,
        imageFormat,
        margin,
        y - 4,
        logoSize,
        logoSize
      );
    }

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.setTextColor(35, 35, 50);

    const tournamentName =
      tournament?.name || "Tournament";

    const titleLines = pdf.splitTextToSize(
      tournamentName,
      contentWidth - (nameX - margin)
    );

    pdf.text(titleLines, nameX, y + 7);

    y += Math.max(28, titleLines.length * 6 + 14);

    // =====================================================
    // SUMMARY
    // =====================================================

    const totalTables =
      poolNames.filter(
        (poolName) =>
          Array.isArray(poolStandings[poolName]) &&
          poolStandings[poolName].length > 0
      ).length +
      (hasSuper8Standings ? 1 : 0);

    addPageIfNeeded(25);

    pdf.setFillColor(246, 243, 255);
    pdf.roundedRect(
      margin,
      y - 5,
      contentWidth,
      18,
      3,
      3,
      "F"
    );

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(99, 60, 255);

    pdf.text(
      `Points Tables: ${totalTables}`,
      margin + 5,
      y + 6
    );

    y += 28;

    // =====================================================
    // RENDER STANDINGS TABLE
    // =====================================================

    const renderTable = (title, rows) => {
      addPageIfNeeded(45);

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(14);
      pdf.setTextColor(35, 35, 50);
      pdf.text(title, margin, y);

      y += 8;

      const colX = {
        rank: margin + 2,
        name: margin + 16,
        played: pageWidth - 73,
        won: pageWidth - 58,
        lost: pageWidth - 45,
        points: pageWidth - 31,
        diff: pageWidth - 15,
      };

      pdf.setFillColor(246, 243, 255);
      pdf.roundedRect(
        margin,
        y - 4,
        contentWidth,
        9,
        2,
        2,
        "F"
      );

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7.5);
      pdf.setTextColor(110, 105, 130);

      pdf.text("#", colX.rank, y + 2);
      pdf.text("PLAYER / TEAM", colX.name, y + 2);
      pdf.text("P", colX.played, y + 2, { align: "center" });
      pdf.text("W", colX.won, y + 2, { align: "center" });
      pdf.text("L", colX.lost, y + 2, { align: "center" });
      pdf.text("PTS", colX.points, y + 2, { align: "center" });
      pdf.text("DIFF", colX.diff, y + 2, { align: "center" });

      y += 10;

      rows.forEach((row, index) => {
        addPageIfNeeded(10);

        if (index % 2 === 0) {
          pdf.setFillColor(252, 251, 255);
          pdf.rect(
            margin,
            y - 5,
            contentWidth,
            9,
            "F"
          );
        }

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8.5);
        pdf.setTextColor(
          index < 2 ? 99 : 70,
          index < 2 ? 60 : 70,
          index < 2 ? 255 : 80
        );
        pdf.text(
          String(index + 1),
          colX.rank,
          y + 1
        );

        pdf.setFont("helvetica", index < 2 ? "bold" : "normal");
        pdf.setFontSize(9);
        pdf.setTextColor(45, 45, 60);

        const name = String(row.name || "-");
        const nameLines = pdf.splitTextToSize(
          name,
          colX.played - colX.name - 5
        );

        pdf.text(
          nameLines.slice(0, 2),
          colX.name,
          y + 1
        );

        pdf.text(
          String(row.played ?? 0),
          colX.played,
          y + 1,
          { align: "center" }
        );
        pdf.text(
          String(row.won ?? 0),
          colX.won,
          y + 1,
          { align: "center" }
        );
        pdf.text(
          String(row.lost ?? 0),
          colX.lost,
          y + 1,
          { align: "center" }
        );

        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(99, 60, 255);
        pdf.text(
          String(row.points ?? 0),
          colX.points,
          y + 1,
          { align: "center" }
        );

        const diff = Number(row.difference) || 0;
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(
          diff > 0 ? 35 : diff < 0 ? 190 : 80,
          diff > 0 ? 130 : diff < 0 ? 60 : 80,
          diff > 0 ? 80 : diff < 0 ? 60 : 80
        );
        pdf.text(
          `${diff > 0 ? "+" : ""}${diff}`,
          colX.diff,
          y + 1,
          { align: "center" }
        );

        y += 9;
      });

      y += 8;
    };

    poolNames.forEach((poolName) => {
      const rows = poolStandings[poolName] || [];
      if (rows.length > 0) {
        renderTable(`${poolName} Points Table`, rows);
      }
    });

    if (hasSuper8Standings) {
      renderTable("Super 8 Points Table", super8Standings);
    }

    // =====================================================
    // FOOTER
    // =====================================================

    const totalPages = pdf.getNumberOfPages();

    for (let page = 1; page <= totalPages; page += 1) {
      pdf.setPage(page);

      pdf.setDrawColor(225, 225, 235);
      pdf.line(
        margin,
        pageHeight - 12,
        pageWidth - margin,
        pageHeight - 12
      );

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.5);
      pdf.setTextColor(130, 130, 145);

      pdf.text(
        "MATCHO • Standings",
        margin,
        pageHeight - 6
      );

      pdf.text(
        `Page ${page} of ${totalPages}`,
        pageWidth - margin,
        pageHeight - 6,
        { align: "right" }
      );
    }

    return pdf;
  }

  function getStandingsPdfFileName() {
    const safeName = (
      tournament?.name || "Matcho-Tournament"
    )
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "");

    return `${safeName || "Matcho-Tournament"}-Standings.pdf`;
  }

  async function downloadStandingsPdf() {
    try {
      const pdf = await buildStandingsPdf();

      pdf.save(
        getStandingsPdfFileName()
      );

      setMessage(
        "Standings PDF downloaded successfully."
      );
    } catch (error) {
      console.error(
        "Standings PDF download error:",
        error
      );

      setMessage(
        error.message ||
          "Unable to generate standings PDF."
      );
    }
  }

  async function shareStandingsPdf() {
    try {
      const pdf = await buildStandingsPdf();
      const blob = pdf.output("blob");

      const file = new File(
        [blob],
        getStandingsPdfFileName(),
        { type: "application/pdf" }
      );

      if (
        navigator.share &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          title: `${
            tournament?.name || "Tournament"
          } - Standings`,
          text: "Tournament Standings PDF",
          files: [file],
        });

        return;
      }

      pdf.save(
        getStandingsPdfFileName()
      );

      setMessage(
        "Standings PDF downloaded. Direct file sharing is not supported by this browser."
      );
    } catch (error) {
      if (error?.name === "AbortError") {
        return;
      }

      console.error(
        "Standings PDF share error:",
        error
      );

      setMessage(
        error.message ||
          "Unable to share standings PDF."
      );
    }
  }


  // =======================================================
  // PARTICIPANTS PDF REPORT
  // =======================================================

  async function buildParticipantsPdf() {
    if (!tournament) {
      throw new Error("Please select a tournament first.");
    }

    if (!participants.length) {
      throw new Error("No participants are available to export.");
    }

    // Landscape is used here because the participant report
    // contains several columns and must not overflow the page.
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const contentWidth = pageWidth - margin * 2;
    let y = 16;

    const addPageIfNeeded = (height = 10) => {
      if (y + height > pageHeight - 18) {
        pdf.addPage();
        y = 16;
      }
    };

    // Matcho logo
    pdf.addImage(
      matchoLogo,
      "PNG",
      pageWidth / 2 - 18,
      y,
      36,
      18
    );

    y += 26;

    // Title
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(19);
    pdf.setTextColor(25, 25, 40);
    pdf.text(
      "Registered Participants",
      pageWidth / 2,
      y,
      { align: "center" }
    );

    y += 11;

    // APT / tournament logo + tournament name
    const tournamentLogo = await getTournamentLogoDataUrl();
    const logoSize = 22;
    const nameX = tournamentLogo ? margin + logoSize + 7 : margin;

    addPageIfNeeded(30);

    if (tournamentLogo) {
      const imageFormat = String(tournamentLogo)
        .toLowerCase()
        .startsWith("data:image/jpeg")
        ? "JPEG"
        : "PNG";

      pdf.addImage(
        tournamentLogo,
        imageFormat,
        margin,
        y - 5,
        logoSize,
        logoSize
      );
    }

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13.5);
    pdf.setTextColor(35, 35, 50);

    const tournamentName = tournament.name || "Tournament";
    const titleLines = pdf.splitTextToSize(
      tournamentName,
      contentWidth - (nameX - margin)
    );

    pdf.text(titleLines, nameX, y + 7);
    y += Math.max(25, titleLines.length * 6 + 12);

    // Summary
    pdf.setFillColor(246, 243, 255);
    pdf.roundedRect(margin, y, contentWidth, 18, 3, 3, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10.5);
    pdf.setTextColor(99, 60, 255);
    pdf.text(
      `Participants: ${participants.length} / ${tournament.max_players || "-"}`,
      margin + 5,
      y + 7
    );
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    pdf.setTextColor(100, 95, 120);
    pdf.text(
      `Generated: ${new Date().toLocaleString("en-IN")}`,
      margin + 5,
      y + 13
    );
    y += 27;

    // Column widths are explicitly sized so their total is exactly
    // the available page width. This prevents Transaction ID text
    // from being drawn outside the page.
    const cols = [
      { label: "#", x: margin, width: 8 },
      { label: "Participant", x: margin + 8, width: 40 },
      { label: "Email", x: margin + 48, width: 74 },
      { label: "Phone", x: margin + 122, width: 28 },
      { label: "Gender", x: margin + 150, width: 24 },
      { label: "Flat", x: margin + 174, width: 20 },
      { label: "Transaction ID", x: margin + 194, width: 50 },
      { label: "Registered", x: margin + 244, width: 33 },
    ];

    const drawTableHeader = () => {
      pdf.setFillColor(99, 60, 255);
      pdf.roundedRect(margin, y, contentWidth, 10, 2, 2, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7.2);
      pdf.setTextColor(255, 255, 255);

      cols.forEach((col) => {
        pdf.text(col.label, col.x + 2, y + 6.5);
      });

      y += 13;
    };

    drawTableHeader();

    participants.forEach((participant, index) => {
      const participantName =
        participant.participant_name ||
        participant.name ||
        "Unnamed Player";
      const email = participant.email || "-";
      const phone = participant.phone || "-";
      const gender = participant.gender || "-";
      const flat = participant.c_flat_number || "-";
      const transaction = participant.transaction_id || "-";
      const registered = formatRegistrationDate(
        participant.registered_at
      );

      const nameLines = pdf.splitTextToSize(
        String(participantName),
        cols[1].width - 4
      );
      const emailLines = pdf.splitTextToSize(
        String(email),
        cols[2].width - 4
      );
      const transactionLines = pdf.splitTextToSize(
        String(transaction),
        cols[6].width - 4
      );
      const registeredLines = pdf.splitTextToSize(
        String(registered),
        cols[7].width - 4
      );

      const rowLines = Math.max(
        nameLines.length,
        emailLines.length,
        transactionLines.length,
        registeredLines.length,
        1
      );
      const rowHeight = Math.max(13, rowLines * 4 + 5);

      if (y + rowHeight > pageHeight - 18) {
        pdf.addPage();
        y = 16;
        drawTableHeader();
      }

      pdf.setFillColor(
        index % 2 === 0 ? 252 : 247,
        index % 2 === 0 ? 251 : 249,
        255
      );
      pdf.roundedRect(
        margin,
        y,
        contentWidth,
        rowHeight,
        1.5,
        1.5,
        "F"
      );

      pdf.setDrawColor(230, 227, 238);
      pdf.roundedRect(
        margin,
        y,
        contentWidth,
        rowHeight,
        1.5,
        1.5,
        "S"
      );

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.2);
      pdf.setTextColor(45, 45, 60);
      pdf.text(String(index + 1), cols[0].x + 2, y + 7);

      pdf.setFont("helvetica", "bold");
      pdf.text(nameLines, cols[1].x + 2, y + 6);

      pdf.setFont("helvetica", "normal");
      pdf.text(emailLines, cols[2].x + 2, y + 6);
      pdf.text(String(phone), cols[3].x + 2, y + 7);
      pdf.text(String(gender), cols[4].x + 2, y + 7);
      pdf.text(String(flat), cols[5].x + 2, y + 7);
      pdf.text(transactionLines, cols[6].x + 2, y + 6);
      pdf.text(registeredLines, cols[7].x + 2, y + 6);

      y += rowHeight + 3;
    });

    const totalPages = pdf.getNumberOfPages();
    for (let page = 1; page <= totalPages; page += 1) {
      pdf.setPage(page);
      pdf.setDrawColor(225, 225, 235);
      pdf.line(
        margin,
        pageHeight - 12,
        pageWidth - margin,
        pageHeight - 12
      );
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.5);
      pdf.setTextColor(130, 130, 145);
      pdf.text(
        "MATCHO • Registered Participants",
        margin,
        pageHeight - 6
      );
      pdf.text(
        `Page ${page} of ${totalPages}`,
        pageWidth - margin,
        pageHeight - 6,
        { align: "right" }
      );
    }

    return pdf;
  }

  async function downloadParticipantsPdf() {
    try {
      const pdf = await buildParticipantsPdf();
      const safeName = (tournament?.name || "Matcho-Tournament")
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-+|-+$/g, "");
      pdf.save(`${safeName || "Matcho-Tournament"}-Participants.pdf`);
    } catch (error) {
      console.error("Participants PDF download error:", error);
      setParticipantError(
        error.message || "Unable to generate participants PDF."
      );
    }
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
      <Users size={20} />
    </div>

    <div>
      <h3>
        Registered Participants
      </h3>

      <p>
        Players who have joined this
        tournament.
      </p>
    </div>

  </div>

  <div className="tm-overview-actions">

    <button
      type="button"
      className="tm-outline-btn"
      onClick={openEditTournament}
    >
      <Pencil size={14} />
      Edit Tournament
    </button>

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


                  <div className="tm-participant-actions">

                    <span className="tm-count-badge">

                      {participants.length}

                      {" / "}

                      {
                        tournament.max_players ||
                        "-"
                      }

                    </span>

                    <button
                      type="button"
                      className="tm-download-btn"
                      onClick={downloadParticipantsPdf}
                      disabled={participants.length === 0}
                      title={
                        participants.length === 0
                          ? "No participants to download"
                          : "Download participant PDF"
                      }
                    >
                      <Download size={15} />
                      <span>Download PDF</span>
                    </button>

                  </div>

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

                    <table className="tm-table tm-participants-table">

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
    className="tm-pdf-btn"
    onClick={downloadTournamentPdf}
  >
    <FileDown size={16} />
    Download PDF
  </button>

  <button
    type="button"
    className="tm-pdf-share-btn"
    onClick={shareTournamentPdf}
  >
    <Share2 size={16} />
    Share PDF
  </button>

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

                <div className="tm-fixture-setup-box">

                  <div className="tm-fixture-setup-grid">

                    <div className="tm-fixture-setup-field">
                      <label htmlFor="fixture-pool-count">
                        Number of Pools
                      </label>

                      <select
                        id="fixture-pool-count"
                        className="tm-select"
                        value={fixtureSetup.poolCount}
                        onChange={(event) =>
                          setFixtureSetup((current) => ({
                            ...current,
                            poolCount: Number(event.target.value),
                          }))
                        }
                        disabled={fixtures.length > 0 || fixtureSetupSaving}
                      >
                        <option value={1}>1 Pool</option>
                        <option value={2}>2 Pools</option>
                        <option value={4}>4 Pools</option>
                        <option value={8}>8 Pools</option>
                      </select>
                    </div>

                    <div className="tm-fixture-setup-field">
                      <label>
                        Teams / Players per Pool
                      </label>

                      <div className="tm-fixture-setup-readonly">
                        {calculatedTeamsPerPool || "Auto"}
                      </div>
                    </div>

                    <div className="tm-fixture-setup-field">
                      <label htmlFor="fixture-group-matches">
                        Group Stage Matches per Team
                      </label>

                      <input
                        id="fixture-group-matches"
                        className="tm-input"
                        type="number"
                        min="1"
                        value={fixtureSetup.groupMatchesPerTeam}
                        onChange={(event) =>
                          setFixtureSetup((current) => ({
                            ...current,
                            groupMatchesPerTeam: Number(event.target.value),
                          }))
                        }
                        disabled={fixtures.length > 0 || fixtureSetupSaving}
                      />
                    </div>

                    <div className="tm-fixture-setup-field">
                      <label htmlFor="fixture-super8">
                        Super 8
                      </label>

                      <select
                        id="fixture-super8"
                        className="tm-select"
                        value={fixtureSetup.super8Enabled ? "yes" : "no"}
                        onChange={(event) =>
                          setFixtureSetup((current) => ({
                            ...current,
                            super8Enabled: event.target.value === "yes",
                          }))
                        }
                        disabled={fixtures.length > 0 || fixtureSetupSaving}
                      >
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                    </div>

                    {fixtureSetup.super8Enabled && (
                      <div className="tm-fixture-setup-field">
                        <label htmlFor="fixture-super8-matches">
                          Super 8 Matches per Team
                        </label>

                        <input
                          id="fixture-super8-matches"
                          className="tm-input"
                          type="number"
                          min="1"
                          value={fixtureSetup.super8MatchesPerTeam}
                          onChange={(event) =>
                            setFixtureSetup((current) => ({
                              ...current,
                              super8MatchesPerTeam: Number(event.target.value),
                            }))
                          }
                          disabled={fixtures.length > 0 || fixtureSetupSaving}
                        />
                      </div>
                    )}

                  </div>

                  <div className="tm-fixture-setup-summary">
                    <div>
                      <span>Total {isDoubles ? "Teams" : "Players"}</span>
                      <strong>{availableParticipants}</strong>
                    </div>

                    <div>
                      <span>Configured per Pool</span>
                      <strong>
                        {poolCount > 0 && calculatedTeamsPerPool > 0
                          ? `${poolCount} × ${calculatedTeamsPerPool}`
                          : "-"}
                      </strong>
                    </div>

                    {fixtureSetup.super8Enabled && (
                      <div>
                        <span>Qualification</span>
                        <strong>
                          {qualifiersPerPool > 0
                            ? `Top ${qualifiersPerPool} / pool → 8`
                            : "Use 1, 2, 4, or 8 pools"}
                        </strong>
                      </div>
                    )}
                  </div>

                  {fixtureSetupError && (
                    <div className="tm-error">
                      {fixtureSetupError}
                    </div>
                  )}

                  {fixtureSetupConfigured && !fixtureSetupError && (
                    <div className="tm-setup-saved-message">
                      ✓ Fixture setup saved. You can generate fixtures now.
                    </div>
                  )}

                  <button
                    type="button"
                    className="tm-primary-btn"
                    onClick={saveFixtureSetup}
                    disabled={
                      fixtures.length > 0 ||
                      fixtureSetupSaving
                    }
                  >
                    {fixtureSetupSaving
                      ? "Saving Setup..."
                      : "Save Fixture Setup"}
                  </button>

                </div>



                <div className="tm-pool-assignment-box">

                  <div className="tm-pool-assignment-header">
                    <div>
                      <h4>Pool Assignment</h4>
                      <p>Assign each team/player to a pool manually or let Matcho distribute them randomly.</p>
                    </div>

                    <button
                      type="button"
                      className="tm-outline-btn tm-random-pools-btn"
                      onClick={randomizePools}
                      disabled={
                        fixtures.length > 0 ||
                        fixtureSetupSaving ||
                        poolAssignmentSaving ||
                        !fixtureSetupConfigured ||
                        !calculatedTeamsPerPool
                      }
                    >
                      <Dices size={15} />
                      {poolAssignmentSaving ? "Working..." : "Randomly Generate Pools"}
                    </button>
                  </div>

                  <div className="tm-pool-summary">
                    <div>
                      <span>Total {isDoubles ? "Teams" : "Players"}</span>
                      <strong>{availableParticipants}</strong>
                    </div>
                    <div>
                      <span>Pools</span>
                      <strong>{poolCount || "-"}</strong>
                    </div>
                    <div>
                      <span>{isDoubles ? "Teams" : "Players"} per Pool</span>
                      <strong>{calculatedTeamsPerPool || "-"}</strong>
                    </div>
                  </div>

                  <div className="tm-manual-pool-list">
                    {(isDoubles ? teams : participants).map((item) => {
                      const participantId = isDoubles
                        ? item.id
                        : (item.player_id ?? item.id);

                      const participantName = isDoubles
                        ? (item.team_name || item.name || `Team ${participantId}`)
                        : (item.participant_name || item.name || `Player ${participantId}`);

                      return (
                        <div
                          className="tm-manual-pool-row"
                          key={participantId}
                        >
                          <div className="tm-manual-pool-name">
                            {participantName}
                          </div>

                          <select
                            value={getPoolForParticipant(participantId)}
                            onChange={(event) =>
                              manuallyAssignParticipant(
                                participantId,
                                Number(event.target.value)
                              )
                            }
                            disabled={
                              fixtures.length > 0 ||
                              poolAssignmentSaving ||
                              !fixtureSetupConfigured
                            }
                          >
                            <option value="">
                              Select Pool
                            </option>

                            {Array.from(
                              { length: poolCount },
                              (_, index) => (
                                <option
                                  key={index + 1}
                                  value={index + 1}
                                >
                                  Pool {String.fromCharCode(65 + index)}
                                </option>
                              )
                            )}
                          </select>
                        </div>
                      );
                    })}
                  </div>

                  {loadingPoolAssignments && (
                    <div className="tm-pool-loading">
                      Loading pool assignments...
                    </div>
                  )}

                  {poolAssignmentError && (
                    <div className="tm-error">
                      {poolAssignmentError}
                    </div>
                  )}

                  <div className="tm-pool-columns">
                    {Array.from(
                      { length: poolCount },
                      (_, index) => {
                        const poolNumber = index + 1;
                        const pool =
                          poolAssignments.find(
                            (item) => Number(item.poolNumber) === poolNumber
                          ) || { members: [] };

                        return (
                          <div
                            className="tm-pool-column"
                            key={poolNumber}
                          >
                            <div className="tm-pool-column-header">
                              <strong>
                                Pool {String.fromCharCode(64 + poolNumber)}
                              </strong>
                              <span>
                                {(pool.members || []).length}
                                {calculatedTeamsPerPool
                                  ? ` / ${calculatedTeamsPerPool}`
                                  : ""}
                              </span>
                            </div>

                            <div className="tm-pool-members">
                              {(pool.members || []).map((member) => (
                                <div
                                  className="tm-pool-member"
                                  key={`${poolNumber}-${member.id}`}
                                >
                                  {member.name}
                                </div>
                              ))}

                              {(pool.members || []).length === 0 && (
                                <div className="tm-pool-empty">
                                  No teams/players assigned
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>

                  <button
                    type="button"
                    className="tm-primary-btn tm-save-pool-btn"
                    onClick={savePoolAssignments}
                    disabled={
                      fixtures.length > 0 ||
                      poolAssignmentSaving ||
                      !fixtureSetupConfigured ||
                      !poolsAssignedComplete
                    }
                  >
                    {poolAssignmentSaving
                      ? "Saving Pools..."
                      : "Save Pool Assignment"}
                  </button>

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
                      fixtureSetupSaving ||
                      fixtures.length > 0 ||
                      !fixtureSetupConfigured ||
                      !poolsAssignedComplete
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

                  <div className="tm-fixture-pdf-actions">
                    <button
                      type="button"
                      className="tm-pdf-btn"
                      onClick={downloadFixturesPdf}
                      disabled={fixtures.length === 0}
                      title={
                        fixtures.length === 0
                          ? "No fixtures to download"
                          : "Download fixtures PDF"
                      }
                    >
                      <FileDown size={16} />
                      Download PDF
                    </button>

                    <button
                      type="button"
                      className="tm-pdf-share-btn"
                      onClick={shareFixturesPdf}
                      disabled={fixtures.length === 0}
                      title={
                        fixtures.length === 0
                          ? "No fixtures to share"
                          : "Share fixtures PDF"
                      }
                    >
                      <Share2 size={16} />
                      Share PDF
                    </button>
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

                                      const sideAMembers = isDoubles
  ? getTeamMembers(match.team_a_id)
  : [];

const sideBMembers = isDoubles
  ? getTeamMembers(match.team_b_id)
  : [];

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

    <div className="tm-team-name">
      {sideA}
    </div>

    {isDoubles &&
      sideAMembers.length > 0 && (
        <div className="tm-team-members">
          {sideAMembers.map((member, index) => (
            <span key={`${member}-${index}`}>
              {member}
            </span>
          ))}
        </div>
      )}

  </div>


  {/* CENTER SCORE */}
  <div className="tm-center-score">

    <span className="tm-center-score-number">
      {Number(match.player_a_score) || 0}
    </span>

    <span className="tm-center-vs">
      VS
    </span>

    <span className="tm-center-score-number">
      {Number(match.player_b_score) || 0}
    </span>

  </div>


  {/* TEAM B */}
  <div className="tm-side tm-side-right">

    <div className="tm-team-name">
      {sideB}
    </div>

    {isDoubles &&
      sideBMembers.length > 0 && (
        <div className="tm-team-members tm-team-members-right">
          {sideBMembers.map((member, index) => (
            <span key={`${member}-${index}`}>
              {member}
            </span>
          ))}
        </div>
      )}

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
                                                  handleOpenScoring(
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

                                       {match.status === "Completed" && (
  <div className="tm-fixture-result">

    <div className="tm-fixture-result-left">
      <span className="tm-fixture-scoreline">
        Final:{" "}
        {Number(match.player_a_score) || 0}
        {" - "}
        {Number(match.player_b_score) || 0}
      </span>

      {(match.stage === "Semi Final" ||
        match.stage === "Final") &&
        Array.isArray(match.game_scores) &&
        match.game_scores.length > 0 && (
          <div className="tm-game-scores">
            {match.game_scores.map((game) => (
              <span
                key={game.game}
                className="tm-game-score"
              >
                G{game.game}{" "}
                <strong>
                  {game.a}–{game.b}
                </strong>
              </span>
            ))}
          </div>
        )}

      {(match.stage === "Semi Final" ||
        match.stage === "Final") &&
        Array.isArray(match.game_scores) &&
        match.game_scores.length > 0 && (
          <div className="tm-set-summary">
            Sets:{" "}
            {
              match.game_scores.filter(
                (game) => Number(game.a) > Number(game.b)
              ).length
            }
            –
            {
              match.game_scores.filter(
                (game) => Number(game.b) > Number(game.a)
              ).length
            }
          </div>
        )}
    </div>

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
                  <div>
                    <h2>Qualification Standings</h2>
                    <p>
                      Current standings based on completed fixtures.
                    </p>
                  </div>

                  <div className="tm-standings-pdf-actions">
                    <button
                      type="button"
                      className="tm-pdf-btn"
                      onClick={downloadStandingsPdf}
                      disabled={
                        !poolNames.some(
                          (poolName) =>
                            Array.isArray(poolStandings[poolName]) &&
                            poolStandings[poolName].length > 0
                        ) &&
                        !(hasSuper8Format && super8Standings.length > 0)
                      }
                      title="Download standings PDF"
                    >
                      <FileDown size={16} />
                      Download PDF
                    </button>

                    <button
                      type="button"
                      className="tm-pdf-share-btn"
                      onClick={shareStandingsPdf}
                      disabled={
                        !poolNames.some(
                          (poolName) =>
                            Array.isArray(poolStandings[poolName]) &&
                            poolStandings[poolName].length > 0
                        ) &&
                        !(hasSuper8Format && super8Standings.length > 0)
                      }
                      title="Share standings PDF"
                    >
                      <Share2 size={16} />
                      Share PDF
                    </button>
                  </div>
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
  isDoubles={isDoubles}
/>
                      ))}
                    </section>

                    {hasSuper8Format && super8Fixtures.length > 0 && (
                      <section className="tm-standings-grid">
                        <PointsTable
  title="Super 8"
  rows={super8Standings}
  isDoubles={isDoubles}
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
                    handleOpenScoring(match);
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
          READY TO START MODAL
      =================================================== */}

      {readyModalOpen && readyFixture && (
        <div
          className="tm-modal-overlay"
          onClick={closeReadyModal}
        >
          <div
            className="tm-match-summary-modal tm-ready-start-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ready-match-title"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="tm-summary-header">
              <div>
                <span className="tm-summary-label">
                  {readyFixture.pool_name ||
                    readyFixture.stage ||
                    "Match"}
                </span>

                <h2 id="ready-match-title">
                  Ready to Start?
                </h2>

                <p>
                  {readyFixture.round ||
                    `Match ${readyFixture.match_number}`}
                </p>
              </div>

              <button
                type="button"
                className="tm-summary-close"
                onClick={closeReadyModal}
                aria-label="Close ready dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="tm-ready-note">
              Confirm that both sides are ready before starting.
              Need a change? Swap an opponent with another upcoming
              fixture in the same stage.
            </div>

            <div className="tm-ready-teams">
              {["A", "B"].map((side) => {
                const isSideA = side === "A";
                const teamName = isDoubles
                  ? (isSideA
                      ? readyFixture.team_a_name
                      : readyFixture.team_b_name) || "TBD"
                  : (isSideA
                      ? readyFixture.player_a_name
                      : readyFixture.player_b_name) || "TBD";

                const members = isDoubles
                  ? getTeamMembers(
                      isSideA
                        ? readyFixture.team_a_id
                        : readyFixture.team_b_id
                    )
                  : [];

                const isReady = isSideA
                  ? readySideA
                  : readySideB;

                return (
                  <div
                    key={side}
                    className={`tm-ready-team ${
                      isReady
                        ? "confirmed"
                        : ""
                    }`}
                  >
                    <div className="tm-ready-team-top">
                      <span>
                        {isSideA
                          ? "SIDE A"
                          : "SIDE B"}
                      </span>

                      <button
                        type="button"
                        className="tm-ready-swap-btn"
                        onClick={() =>
                          openSwapModal(side)
                        }
                      >
                        Swap opponent
                      </button>
                    </div>

                    <strong>
                      {teamName}
                    </strong>

                    {members.length > 0 && (
                      <div className="tm-ready-members">
                        {members.map(
                          (member, index) => (
                            <span
                              key={`${member}-${index}`}
                            >
                              {member}
                            </span>
                          )
                        )}
                      </div>
                    )}

                    <label className="tm-ready-check">
                      <input
                        type="checkbox"
                        checked={isReady}
                        onChange={(event) => {
                          if (isSideA) {
                            setReadySideA(
                              event.target.checked
                            );
                          } else {
                            setReadySideB(
                              event.target.checked
                            );
                          }
                        }}
                      />

                      <span>
                        Team is ready
                      </span>
                    </label>
                  </div>
                );
              })}
            </div>

            {fixtureError && (
              <div className="tm-ready-error">
                {fixtureError}
              </div>
            )}

            {message && (
              <div className="tm-ready-success">
                {message}
              </div>
            )}

            <div className="tm-summary-actions">
              <button
                type="button"
                className="tm-outline-btn"
                onClick={closeReadyModal}
              >
                Cancel
              </button>

              <button
                type="button"
                className="tm-primary-btn"
                disabled={
                  !readySideA ||
                  !readySideB ||
                  fixtureSaving
                }
                onClick={() => {
                  const match =
                    readyFixture;

                  closeReadyModal();
                  openFixtureScoring(
                    match
                  );
                }}
              >
                {fixtureSaving
                  ? "Starting..."
                  : "Both Teams Ready · Start Match"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================
          SWAP OPPONENT MODAL
      =================================================== */}

      {swapModalOpen && readyFixture && (
        <div
          className="tm-modal-overlay"
          onClick={() =>
            setSwapModalOpen(false)
          }
        >
          <div
            className="tm-match-summary-modal tm-swap-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="swap-opponent-title"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="tm-summary-header">
              <div>
                <span className="tm-summary-label">
                  SWAP OPPONENT
                </span>

                <h2 id="swap-opponent-title">
                  Choose a replacement
                </h2>

                <p>
                  Only opponents that can be safely swapped are shown.
                  Both fixtures will exchange those opponents.
                </p>
              </div>

              <button
                type="button"
                className="tm-summary-close"
                onClick={() =>
                  setSwapModalOpen(false)
                }
                aria-label="Close swap dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="tm-swap-current">
              <span>
                Swapping{" "}
                {swapFromSide === "A"
                  ? readyFixture.team_a_name ||
                    readyFixture.player_a_name ||
                    "Side A"
                  : readyFixture.team_b_name ||
                    readyFixture.player_b_name ||
                    "Side B"}
              </span>

              <strong>
                Match{" "}
                {readyFixture.match_number}
              </strong>
            </div>

            <div className="tm-swap-list">
              {getSwapCandidates(
                readyFixture
              ).map((candidate) => {
                const selected =
                  swapTarget &&
                  String(
                    swapTarget.fixture.id
                  ) ===
                    String(
                      candidate.fixture.id
                    ) &&
                  swapTarget.side ===
                    candidate.side;

                return (
                  <button
                    type="button"
                    key={`${candidate.fixture.id}-${candidate.side}`}
                    className={`tm-swap-option ${
                      selected
                        ? "selected"
                        : ""
                    }`}
                    onClick={() =>
                      setSwapTarget(
                        candidate
                      )
                    }
                  >
                    <div>
                      <strong>
                        {candidate.name}
                      </strong>

                      {candidate.members.length >
                        0 && (
                        <small>
                          {candidate.members.join(
                            " · "
                          )}
                        </small>
                      )}

                      <span>
                        {candidate.fixture.pool_name ||
                          candidate.fixture.stage ||
                          "Match"}{" "}
                        · Match{" "}
                        {
                          candidate.fixture
                            .match_number
                        }
                      </span>
                    </div>

                    <span className="tm-swap-side-label">
                      Side{" "}
                      {candidate.side}
                    </span>
                  </button>
                );
              })}

              {getSwapCandidates(
                readyFixture
              ).length === 0 && (
                <div className="tm-empty-state">
                  No other upcoming fixture is available
                  for a safe swap in this stage.
                </div>
              )}
            </div>

            <div className="tm-summary-actions">
              <button
                type="button"
                className="tm-outline-btn"
                onClick={() =>
                  setSwapModalOpen(false)
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="tm-primary-btn"
                disabled={
                  !swapTarget ||
                  swapSaving
                }
                onClick={
                  confirmSwap
                }
              >
                {swapSaving
                  ? "Swapping..."
                  : "Swap Opponents"}
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
  {editLoading ? "Saving..." : "Save Changes"}
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
  isDoubles,
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
                    row.id
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
  <div className="tm-standings-team-name">
    {row.name}
  </div>

  {isDoubles &&
    Array.isArray(row.members) &&
    row.members.length > 0 && (
      <div className="tm-standings-team-members">
        {row.members.map(
          (member, memberIndex) => (
            <span key={member.id || memberIndex}>
              {member.name}
            </span>
          )
        )}
      </div>
    )}
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