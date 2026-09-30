import { socket } from "../services/socket";

import {
  useEffect,
  useMemo,
  useState,
  useId,
  useRef,
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
  Moon,
  Sun,
  CircleUserRound,
  X,
} from "lucide-react";

import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import Scoreboardsidebar from "../components/Scoreboardsidebar";
import { apiRequest } from "../services/api";
import { setRole } from "../utils/auth";
import ghbpllogo from "../assets/images/ghbpl.jpeg";
import matchoLogo from "../assets/images/logo.png";

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

// =========================================================
// PREMIUM SPORT VISUALS
// High-detail SVG artwork for the ambient background.
// These are deliberately more dimensional and less icon-like.
// =========================================================

// =========================================================
// MATCHO PREMIUM SPORT ICONS
// =========================================================

function VolleyballSportIcon({ size = 24, ambient = false }) {
  const uid = useId().replace(/:/g, "");
  const gradientId = `vbGradient${uid}`;
  const shadowId = `vbShadow${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={
        ambient
          ? "matcho-sport-art matcho-volleyball-art"
          : ""
      }
    >
      <defs>
        <radialGradient
          id={gradientId}
          cx="31%"
          cy="24%"
          r="75%"
        >
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="18%" stopColor="#F0EAFF" />
          <stop offset="44%" stopColor="#B79BFF" />
          <stop offset="72%" stopColor="#7650EE" />
          <stop offset="100%" stopColor="#2F176E" />
        </radialGradient>

        <radialGradient
          id={shadowId}
          cx="50%"
          cy="50%"
          r="50%"
        >
          <stop
            offset="0%"
            stopColor="#120A2C"
            stopOpacity="0.50"
          />
          <stop
            offset="100%"
            stopColor="#120A2C"
            stopOpacity="0"
          />
        </radialGradient>
      </defs>

      <ellipse
        cx="50"
        cy="89"
        rx="34"
        ry="6"
        fill={`url(#${shadowId})`}
        opacity="0.32"
      />

      <circle
        cx="50"
        cy="48"
        r="35"
        fill={`url(#${gradientId})`}
      />

      <ellipse
        cx="39"
        cy="31"
        rx="13"
        ry="8"
        fill="#FFFFFF"
        opacity="0.28"
        transform="rotate(-24 39 31)"
      />

      <circle
        cx="50"
        cy="48"
        r="35"
        stroke="#FFFFFF"
        strokeOpacity="0.26"
        strokeWidth="1.6"
      />

      <path
        d="M17 42C33 34 46 37 57 46C65 53 70 64 72 77"
        stroke="#FFFFFF"
        strokeOpacity="0.73"
        strokeWidth="3"
        strokeLinecap="round"
      />

      <path
        d="M32 15C35 29 42 40 52 47C62 54 73 58 84 56"
        stroke="#FFFFFF"
        strokeOpacity="0.60"
        strokeWidth="2.7"
        strokeLinecap="round"
      />

      <path
        d="M23 72C32 63 41 59 51 60C63 60 74 68 81 80"
        stroke="#F4F0FF"
        strokeOpacity="0.42"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      <path
        d="M31 17C29 29 25 40 18 49"
        stroke="#3C1A92"
        strokeOpacity="0.88"
        strokeWidth="2.3"
        strokeLinecap="round"
      />

      <path
        d="M61 14C56 24 55 36 59 46"
        stroke="#4A25B3"
        strokeOpacity="0.74"
        strokeWidth="2.3"
        strokeLinecap="round"
      />
    </svg>
  );
}


function BasketballSportIcon({ size = 24, ambient = false }) {
  const uid = useId().replace(/:/g, "");
  const gradientId = `bbGradient${uid}`;
  const shadowId = `bbShadow${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={
        ambient
          ? "matcho-sport-art matcho-basketball-art"
          : ""
      }
    >
      <defs>
        <radialGradient
          id={gradientId}
          cx="28%"
          cy="23%"
          r="76%"
        >
          <stop offset="0%" stopColor="#F7F2FF" />
          <stop offset="16%" stopColor="#E6DAFF" />
          <stop offset="40%" stopColor="#B893FF" />
          <stop offset="67%" stopColor="#7443D9" />
          <stop offset="86%" stopColor="#4820A2" />
          <stop offset="100%" stopColor="#1A0C40" />
        </radialGradient>

        <radialGradient
          id={shadowId}
          cx="50%"
          cy="50%"
          r="50%"
        >
          <stop
            offset="0%"
            stopColor="#120A2C"
            stopOpacity="0.50"
          />
          <stop
            offset="100%"
            stopColor="#120A2C"
            stopOpacity="0"
          />
        </radialGradient>
      </defs>

      <ellipse
        cx="50"
        cy="89"
        rx="34"
        ry="6"
        fill={`url(#${shadowId})`}
        opacity="0.30"
      />

      <circle
        cx="50"
        cy="48"
        r="35"
        fill={`url(#${gradientId})`}
      />

      <ellipse
        cx="38"
        cy="30"
        rx="14"
        ry="8"
        fill="#FFF4E5"
        opacity="0.22"
        transform="rotate(-22 38 30)"
      />

      <circle
        cx="50"
        cy="48"
        r="35"
        stroke="#F2E9FF"
        strokeOpacity="0.26"
        strokeWidth="1.6"
      />

      <path
        d="M15 48C29 45 41 46 50 51C59 56 68 66 75 80"
        stroke="#25131A"
        strokeOpacity="0.94"
        strokeWidth="4"
        strokeLinecap="round"
      />

      <path
        d="M50 13C43 24 41 36 45 48C49 61 60 70 77 78"
        stroke="#25131A"
        strokeOpacity="0.96"
        strokeWidth="4"
        strokeLinecap="round"
      />

      <path
        d="M22 27C33 31 40 38 44 47C48 56 49 67 47 82"
        stroke="#25131A"
        strokeOpacity="0.90"
        strokeWidth="3.6"
        strokeLinecap="round"
      />

      <path
        d="M77 24C65 29 58 37 55 47C52 56 54 68 61 83"
        stroke="#EDE2FF"
        strokeOpacity="0.18"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
    </svg>
  );
}


function ThrowballSportIcon({ size = 24, ambient = false }) {
  const uid = useId().replace(/:/g, "");
  const gradientId = `tbGradient${uid}`;
  const shadowId = `tbShadow${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={
        ambient
          ? "matcho-sport-art matcho-throwball-art"
          : ""
      }
    >
      <defs>
        <radialGradient
          id={gradientId}
          cx="31%"
          cy="22%"
          r="75%"
        >
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="21%" stopColor="#EDE7FF" />
          <stop offset="49%" stopColor="#B49AFF" />
          <stop offset="73%" stopColor="#7452E6" />
          <stop offset="100%" stopColor="#301B82" />
        </radialGradient>

        <radialGradient
          id={shadowId}
          cx="50%"
          cy="50%"
          r="50%"
        >
          <stop
            offset="0%"
            stopColor="#120A2C"
            stopOpacity="0.42"
          />
          <stop
            offset="100%"
            stopColor="#120A2C"
            stopOpacity="0"
          />
        </radialGradient>
      </defs>

      <ellipse
        cx="50"
        cy="89"
        rx="33"
        ry="6"
        fill={`url(#${shadowId})`}
        opacity="0.28"
      />

      <circle
        cx="50"
        cy="48"
        r="35"
        fill={`url(#${gradientId})`}
      />

      <ellipse
        cx="38"
        cy="30"
        rx="14"
        ry="8"
        fill="#FFFFFF"
        opacity="0.24"
        transform="rotate(-25 38 30)"
      />

      <circle
        cx="50"
        cy="48"
        r="35"
        stroke="#FFFFFF"
        strokeOpacity="0.25"
        strokeWidth="1.7"
      />

      <path
        d="M16 35C31 42 43 42 53 36C63 30 74 29 84 34"
        stroke="#FFFFFF"
        strokeOpacity="0.71"
        strokeWidth="3"
        strokeLinecap="round"
      />

      <path
        d="M17 62C30 54 41 53 52 57C64 61 73 70 82 82"
        stroke="#FFFFFF"
        strokeOpacity="0.43"
        strokeWidth="2.7"
        strokeLinecap="round"
      />

      <path
        d="M28 15C31 29 28 43 22 55C18 63 17 71 18 79"
        stroke="#4527A8"
        strokeOpacity="0.88"
        strokeWidth="2.4"
        strokeLinecap="round"
      />

      <path
        d="M67 13C59 25 58 37 63 49C67 59 75 66 83 70"
        stroke="#4D2DB4"
        strokeOpacity="0.64"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}


function BadmintonSportIcon({ size = 24, ambient = false }) {
  const uid = useId().replace(/:/g, "");

  const frameId = `racquetFrame${uid}`;
  const gripId = `racquetGrip${uid}`;
  const shadowId = `racquetShadow${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={
        ambient
          ? "matcho-sport-art matcho-badminton-art"
          : ""
      }
    >
      <defs>
        <linearGradient
          id={frameId}
          x1="18"
          y1="97"
          x2="75"
          y2="17"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#2C156C" />
          <stop offset="38%" stopColor="#7050D8" />
          <stop offset="72%" stopColor="#D7CBFF" />
          <stop offset="100%" stopColor="#FFFFFF" />
        </linearGradient>

        <linearGradient
          id={gripId}
          x1="20"
          y1="108"
          x2="44"
          y2="67"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#150B38" />
          <stop offset="55%" stopColor="#4D32A0" />
          <stop offset="100%" stopColor="#C4B6FF" />
        </linearGradient>

        <radialGradient
          id={shadowId}
          cx="50%"
          cy="50%"
          r="50%"
        >
          <stop
            offset="0%"
            stopColor="#120A2C"
            stopOpacity="0.48"
          />
          <stop
            offset="100%"
            stopColor="#120A2C"
            stopOpacity="0"
          />
        </radialGradient>
      </defs>

      <ellipse
        cx="60"
        cy="104"
        rx="35"
        ry="6"
        fill={`url(#${shadowId})`}
        opacity="0.28"
      />

      <ellipse
        cx="56"
        cy="37"
        rx="27"
        ry="34"
        transform="rotate(34 56 37)"
        stroke={`url(#${frameId})`}
        strokeWidth="7"
      />

      <ellipse
        cx="56"
        cy="37"
        rx="22"
        ry="29"
        transform="rotate(34 56 37)"
        stroke="#FFFFFF"
        strokeOpacity="0.22"
        strokeWidth="1.7"
      />

      <path
        d="M34 17L76 63M30 25L69 67M29 35L60 69M32 46L51 68"
        stroke="#F5F2FF"
        strokeOpacity="0.36"
        strokeWidth="1.15"
        strokeLinecap="round"
      />

      <path
        d="M72 15L35 58M78 23L41 65M79 35L49 67M76 48L56 66"
        stroke="#F5F2FF"
        strokeOpacity="0.32"
        strokeWidth="1.15"
        strokeLinecap="round"
      />

      <path
        d="M44 64L26 99"
        stroke={`url(#${frameId})`}
        strokeWidth="7"
        strokeLinecap="round"
      />

      <path
        d="M26 99L14 113"
        stroke={`url(#${gripId})`}
        strokeWidth="9"
        strokeLinecap="round"
      />

      <path
        d="M20 103L30 108M17 108L27 113"
        stroke="#FFFFFF"
        strokeOpacity="0.22"
        strokeWidth="2.4"
        strokeLinecap="round"
      />

      <path
        d="M88 13L102 31L92 47L80 28L88 13Z"
        fill="#F6F3FF"
        fillOpacity="0.80"
      />

      <path
        d="M88 13L102 31M88 13L92 47M80 28L102 31"
        stroke="#8D70FF"
        strokeOpacity="0.75"
        strokeWidth="1.5"
      />

      <path
        d="M90 47C94 52 99 53 104 53"
        stroke="#FFFFFF"
        strokeOpacity="0.42"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}


function FootballSportIcon({ size = 24, ambient = false }) {
  const uid = useId().replace(/:/g, "");
  const gradientId = `footballGradient${uid}`;
  const shadowId = `footballShadow${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={
        ambient
          ? "matcho-sport-art matcho-football-art"
          : ""
      }
    >
      <defs>
        <radialGradient
          id={gradientId}
          cx="30%"
          cy="22%"
          r="78%"
        >
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="18%" stopColor="#EDE4FF" />
          <stop offset="42%" stopColor="#B999FF" />
          <stop offset="67%" stopColor="#7040D6" />
          <stop offset="86%" stopColor="#46209D" />
          <stop offset="100%" stopColor="#160C35" />
        </radialGradient>

        <radialGradient
          id={shadowId}
          cx="50%"
          cy="50%"
          r="50%"
        >
          <stop
            offset="0%"
            stopColor="#120A2C"
            stopOpacity="0.48"
          />
          <stop
            offset="100%"
            stopColor="#120A2C"
            stopOpacity="0"
          />
        </radialGradient>
      </defs>

      <ellipse
        cx="61"
        cy="102"
        rx="35"
        ry="6"
        fill={`url(#${shadowId})`}
        opacity="0.28"
      />

      <ellipse
        cx="58"
        cy="55"
        rx="43"
        ry="38"
        transform="rotate(-17 58 55)"
        fill={`url(#${gradientId})`}
      />

      <ellipse
        cx="44"
        cy="35"
        rx="15"
        ry="8"
        fill="#FFFFFF"
        opacity="0.25"
        transform="rotate(-18 44 35)"
      />

      <path
        d="M56 41L67 49L63 62L49 64L42 52L46 42Z"
        fill="#211B31"
        fillOpacity="0.90"
      />

      <path
        d="M46 42L56 41L67 49M42 52L49 64L63 62M49 64L42 52M63 62L67 49"
        stroke="#6C5E82"
        strokeOpacity="0.88"
        strokeWidth="1.8"
      />

      <path
        d="M46 42L34 31L24 40L29 55L42 52"
        stroke="#302842"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M67 49L79 39L91 49L85 63L70 63L63 62"
        stroke="#302842"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M56 41L58 25L71 20L79 39"
        stroke="#302842"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M42 52L31 63L35 78L49 84L58 72L49 64"
        stroke="#302842"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M70 63L80 75L73 87L58 91L49 84L58 72"
        stroke="#302842"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}


function KhoKhoSportIcon({ size = 24, ambient = false }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={
        ambient
          ? "matcho-sport-art matcho-khokho-art"
          : ""
      }
    >
      <defs>
        <linearGradient
          id={`khokhoGradient${useId().replace(/:/g, "")}`}
          x1="20"
          y1="80"
          x2="80"
          y2="15"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#32106F" />
          <stop offset="45%" stopColor="#7045D9" />
          <stop offset="100%" stopColor="#D8CDFF" />
        </linearGradient>
      </defs>

      <circle
        cx="53"
        cy="18"
        r="8"
        fill="#A98AFF"
      />

      <path
        d="M51 29L44 48L59 55L76 42"
        stroke="#6A40D1"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M45 47L25 68"
        stroke="#4D27B5"
        strokeWidth="7"
        strokeLinecap="round"
      />

      <path
        d="M58 54L73 77"
        stroke="#8A62F0"
        strokeWidth="7"
        strokeLinecap="round"
      />

      <path
        d="M47 33L69 31"
        stroke="#BCAAFF"
        strokeWidth="6"
        strokeLinecap="round"
      />

      <path
        d="M23 69L14 81M72 77L83 87"
        stroke="#CFC3FF"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}


function PickleballSportIcon({ size = 24, ambient = false }) {
  const uid = useId().replace(/:/g, "");

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 110 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={
        ambient
          ? "matcho-sport-art matcho-pickleball-art"
          : ""
      }
    >
      <defs>
        <linearGradient
          id={`pickleGradient${uid}`}
          x1="15"
          y1="15"
          x2="80"
          y2="75"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#EDE7FF" />
          <stop offset="38%" stopColor="#A985FF" />
          <stop offset="75%" stopColor="#6734D2" />
          <stop offset="100%" stopColor="#2B116A" />
        </linearGradient>
      </defs>

      <rect
        x="16"
        y="8"
        width="49"
        height="62"
        rx="15"
        fill={`url(#pickleGradient${uid})`}
        stroke="#4A24A7"
        strokeWidth="3"
      />

      <circle cx="29" cy="22" r="2.5" fill="#EDE8FF" />
      <circle cx="41" cy="20" r="2.5" fill="#EDE8FF" />
      <circle cx="53" cy="24" r="2.5" fill="#EDE8FF" />

      <circle cx="28" cy="35" r="2.5" fill="#EDE8FF" />
      <circle cx="40" cy="33" r="2.5" fill="#EDE8FF" />
      <circle cx="52" cy="37" r="2.5" fill="#EDE8FF" />

      <circle cx="30" cy="48" r="2.5" fill="#EDE8FF" />
      <circle cx="42" cy="46" r="2.5" fill="#EDE8FF" />
      <circle cx="54" cy="50" r="2.5" fill="#EDE8FF" />

      <path
        d="M48 69L69 91"
        stroke="#4522A5"
        strokeWidth="8"
        strokeLinecap="round"
      />

      <circle
        cx="86"
        cy="20"
        r="8"
        fill="#CFC0FF"
        stroke="#6B42D8"
        strokeWidth="3"
      />

      <circle cx="83" cy="17" r="2" fill="#FFFFFF" />
    </svg>
  );
}


function TableTennisSportIcon({ size = 24, ambient = false }) {
  const uid = useId().replace(/:/g, "");

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 110 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={
        ambient
          ? "matcho-sport-art matcho-tabletennis-art"
          : ""
      }
    >
      <defs>
        <linearGradient
          id={`tableTennisGradient${uid}`}
          x1="12"
          y1="15"
          x2="65"
          y2="70"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#EDE7FF" />
          <stop offset="35%" stopColor="#A88AFF" />
          <stop offset="72%" stopColor="#6132C9" />
          <stop offset="100%" stopColor="#2B116A" />
        </linearGradient>
      </defs>

      <ellipse
        cx="37"
        cy="39"
        rx="28"
        ry="33"
        transform="rotate(-22 37 39)"
        fill={`url(#tableTennisGradient${uid})`}
        stroke="#4721A7"
        strokeWidth="3"
      />

      <path
        d="M50 63L74 90"
        stroke="#43219D"
        strokeWidth="9"
        strokeLinecap="round"
      />

      <path
        d="M26 19C42 25 50 37 51 49"
        stroke="#FFFFFF"
        strokeOpacity="0.28"
        strokeWidth="3"
        strokeLinecap="round"
      />

      <circle
        cx="89"
        cy="18"
        r="7"
        fill="#F1EDFF"
        stroke="#7650DB"
        strokeWidth="2.5"
      />
    </svg>
  );
}

const SPORT_OPTIONS = [
  { key: "volleyball", label: "Volleyball", icon: "🏐" },
  { key: "badminton", label: "Badminton", icon: "🏸" },
  { key: "kho-kho", label: "Kho-Kho", icon: "🏃" },
  { key: "football", label: "Football", icon: "⚽" },
  { key: "throwball", label: "Throwball", icon: "🤾" },
  { key: "basketball", label: "Basketball", icon: "🏀" },
  { key: "pickleball", label: "Pickleball", icon: "🥎" },
  { key: "table-tennis", label: "Table Tennis", icon: "🏓" },
];

function normalizeSportKey(value) {
  const sport = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/\s+/g, "-");

  if (sport === "kho-kho" || sport === "khokho") return "kho-kho";
  if (sport === "table-tennis" || sport === "tabletennis" || sport === "ping-pong") return "table-tennis";
  if (sport === "volley-ball") return "volleyball";
  if (sport === "throw-ball") return "throwball";

  return sport;
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
// SMOOTH PURPLE AMBIENT BALLS
// Clean glossy spheres — no seam/grid patterns.
// =========================================================

function AmbientPurpleBall({ size = 100, variant = 1 }) {
  const uid = useId().replace(/:/g, "");
  const gradientId = `ambientBallGradient${uid}`;
  const shadowId = `ambientBallShadow${uid}`;

  const palettes = {
    1: ["#F6F0FF", "#B98BFF", "#713CE0", "#28105E"],
    2: ["#FFFFFF", "#CBA8FF", "#824BEB", "#301067"],
    3: ["#EFE5FF", "#A675FF", "#6334CD", "#210B51"],
    4: ["#FBF7FF", "#D1B6FF", "#8B56F0", "#351276"],
  };

  const [light, mid, deep, dark] = palettes[variant] || palettes[1];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="matcho-ambient-ball-art"
    >
      <defs>
        <radialGradient id={gradientId} cx="29%" cy="22%" r="78%">
          <stop offset="0%" stopColor={light} stopOpacity="0.98" />
          <stop offset="16%" stopColor={mid} stopOpacity="0.98" />
          <stop offset="49%" stopColor={mid} stopOpacity="0.96" />
          <stop offset="76%" stopColor={deep} stopOpacity="0.98" />
          <stop offset="100%" stopColor={dark} stopOpacity="1" />
        </radialGradient>
        <radialGradient id={shadowId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#160A36" stopOpacity="0.46" />
          <stop offset="100%" stopColor="#160A36" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="60" cy="105" rx="34" ry="7" fill={`url(#${shadowId})`} opacity="0.36" />
      <circle cx="60" cy="57" r="36" fill={`url(#${gradientId})`} />
      <ellipse
        cx="46"
        cy="38"
        rx="16"
        ry="10"
        fill="#FFFFFF"
        fillOpacity="0.22"
        transform="rotate(-28 46 38)"
      />
      <ellipse
        cx="39"
        cy="29"
        rx="7"
        ry="4"
        fill="#FFFFFF"
        fillOpacity="0.26"
        transform="rotate(-28 39 29)"
      />
      <path
        d="M77 82C68 91 54 95 42 91"
        stroke="#130727"
        strokeOpacity="0.28"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="60" cy="57" r="36" stroke="#FFFFFF" strokeOpacity="0.16" strokeWidth="1.5" />
    </svg>
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

  const [
    selectedSport,
    setSelectedSport,
  ] = useState();

  const [matchSearch, setMatchSearch] =
  useState("");

  const [
    selectedTournament,
    setSelectedTournament,
  ] = useState("all");

  const [
    tournamentDropdownOpen,
    setTournamentDropdownOpen,
  ] = useState(false);

  const [
    tournamentSearch,
    setTournamentSearch,
  ] = useState("");

  const tournamentSelectorRef =
    useRef(null);

  const [
    showAllMatches,
    setShowAllMatches,
  ] = useState(false);

  const [
    fixtureFilter,
    setFixtureFilter,
  ] = useState("all");

  const [
    audienceFixtureSearch,
    setAudienceFixtureSearch,
  ] = useState("");

  // =======================================================
  // TOP NAVBAR
  // =======================================================

  const [
    announcementsOpen,
    setAnnouncementsOpen,
  ] = useState(false);

  const [
    profileOpen,
    setProfileOpen,
  ] = useState(false);

  const [
    darkMode,
    setDarkMode,
  ] = useState(() =>
    localStorage.getItem("matcho_theme") === "dark"
  );

  const [
    profileName,
    setProfileName,
  ] = useState("Matcho User");

  // =======================================================
  // ROLE
  // =======================================================

  useEffect(() => {
    setRole("score-viewing");

    const storedName =
      localStorage.getItem("matcho_user_name") ||
      localStorage.getItem("username") ||
      localStorage.getItem("user_name") ||
      localStorage.getItem("name");

    if (storedName) {
      setProfileName(storedName);
    }
  }, []);

  useEffect(() => {
  document.documentElement.classList.toggle(
    "matcho-dark",
    darkMode
  );

  localStorage.setItem(
    "matcho_theme",
    darkMode ? "dark" : "light"
  );
}, [darkMode]);

  // =======================================================
  // SPORTS BACKGROUND PARALLAX
  // =======================================================

  useEffect(() => {
    const shell = document.querySelector(
      ".score-viewer-shell"
    );

    if (!shell) {
      return;
    }

    const handlePointerMove = (event) => {
      const x =
        event.clientX / window.innerWidth - 0.5;

      const y =
        event.clientY / window.innerHeight - 0.5;

      shell.style.setProperty(
        "--matcho-depth-1-x",
        `${x * 9}px`
      );

      shell.style.setProperty(
        "--matcho-depth-1-y",
        `${y * 7}px`
      );

      shell.style.setProperty(
        "--matcho-depth-2-x",
        `${x * 16}px`
      );

      shell.style.setProperty(
        "--matcho-depth-2-y",
        `${y * 12}px`
      );

      shell.style.setProperty(
        "--matcho-depth-3-x",
        `${x * 24}px`
      );

      shell.style.setProperty(
        "--matcho-depth-3-y",
        `${y * 18}px`
      );

      shell.style.setProperty(
        "--matcho-glitter-x",
        `${x * 30}px`
      );

      shell.style.setProperty(
        "--matcho-glitter-y",
        `${y * 22}px`
      );
    };

    const resetPointer = () => {
      shell.style.setProperty(
        "--matcho-depth-1-x",
        "0px"
      );

      shell.style.setProperty(
        "--matcho-depth-1-y",
        "0px"
      );

      shell.style.setProperty(
        "--matcho-depth-2-x",
        "0px"
      );

      shell.style.setProperty(
        "--matcho-depth-2-y",
        "0px"
      );

      shell.style.setProperty(
        "--matcho-depth-3-x",
        "0px"
      );

      shell.style.setProperty(
        "--matcho-depth-3-y",
        "0px"
      );

      shell.style.setProperty(
        "--matcho-glitter-x",
        "0px"
      );

      shell.style.setProperty(
        "--matcho-glitter-y",
        "0px"
      );
    };

    window.addEventListener(
      "pointermove",
      handlePointerMove,
      { passive: true }
    );

    window.addEventListener(
      "pointerleave",
      resetPointer
    );

    return () => {
      window.removeEventListener(
        "pointermove",
        handlePointerMove
      );

      window.removeEventListener(
        "pointerleave",
        resetPointer
      );
    };
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

                      tournament_sport:
                        fixture.tournament_sport ||
                        fixture.sport ||
                        fixture.sport_name ||
                        tournament.sport ||
                        tournament.sport_name ||
                        null,

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
              normalizeSportKey(
                fixture.sport ||
                fixture.sport_name ||
                fixture.tournament_sport ||
                "badminton"
              ),

            sportName:
              SPORT_OPTIONS.find(
                (sportOption) =>
                  sportOption.key ===
                  normalizeSportKey(
                    fixture.sport ||
                    fixture.sport_name ||
                    fixture.tournament_sport ||
                    "badminton"
                  )
              )?.label || "Badminton",

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
  // TOURNAMENTS FOR SELECTED SPORT
  // =======================================================

  const tournamentsForSelectedSport =
    useMemo(() => {
      if (!selectedSport) {
        return [];
      }

      // Prefer the tournament's own sport field.
      // If the API does not expose it, fall back to the
      // sport already detected from that tournament's fixtures.
      const sportByTournamentId =
        new Map();

      formattedMatches.forEach((match) => {
        const id = String(match.tournamentId ?? "");
        if (!id || sportByTournamentId.has(id)) {
          return;
        }

        const matchSport =
          normalizeSportKey(match.sport);

        if (matchSport) {
          sportByTournamentId.set(
            id,
            matchSport
          );
        }
      });

      return tournaments.filter((tournament) => {
        const explicitSport =
          normalizeSportKey(
            tournament?.sport ||
            tournament?.sport_name ||
            tournament?.tournament_sport ||
            tournament?.game_type ||
            tournament?.category ||
            tournament?.sportType ||
            ""
          );

        const fallbackSport =
          sportByTournamentId.get(
            String(tournament?.id ?? "")
          );

        return (
          explicitSport === selectedSport ||
          (!explicitSport &&
            fallbackSport === selectedSport)
        );
      });
    }, [
      tournaments,
      formattedMatches,
      selectedSport,
    ]);

  const filteredTournamentOptions =
    useMemo(() => {
      const search = tournamentSearch
        .trim()
        .toLowerCase();

      if (!search) {
        return tournamentsForSelectedSport;
      }

      return tournamentsForSelectedSport.filter(
        (tournament) =>
          String(tournament?.name || "")
            .toLowerCase()
            .includes(search)
      );
    }, [
      tournamentsForSelectedSport,
      tournamentSearch,
    ]);

  // =======================================================
  // FILTER BY SPORT
  // =======================================================

 const sportMatches =
  useMemo(() => {

    // Do not show any matches until a sport is selected
    if (!selectedSport) {
      return [];
    }

    return formattedMatches.filter(
      (match) =>
        normalizeSportKey(match.sport) ===
        selectedSport
    );

  }, [
    formattedMatches,
    selectedSport,
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
        return sportMatches;
      }

      return sportMatches.filter(
        (match) =>
          String(
            match.tournamentId
          ) ===
          String(
            selectedTournament
          )
      );
    }, [
      sportMatches,
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
  let result = [...tournamentMatches];

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
    result = result.filter(
      (match) => match.status === "COMPLETED"
    );
  }

  result = result.filter((match) =>
    matchesSearch(match, matchSearch)
  );

  /*
   * Match order:
   * 1. Completed matches first
   * 2. Most recently completed first
   * 3. Live matches next
   * 4. Upcoming matches last
   */
  result.sort((a, b) => {
    const statusOrder = {
      COMPLETED: 0,
      LIVE: 1,
      UPCOMING: 2,
    };

    const statusA =
      statusOrder[a.status] ?? 3;

    const statusB =
      statusOrder[b.status] ?? 3;

    if (statusA !== statusB) {
      return statusA - statusB;
    }

    if (a.status === "COMPLETED") {
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
    }

    return 0;
  });

  return result;
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
    sportMatches.filter(
      (match) =>
        match.status ===
        "LIVE"
    );

  const upcomingMatches =
    sportMatches.filter(
      (match) =>
        match.status ===
        "UPCOMING"
    );

  const completedMatches =
    useMemo(() => {
      return [...sportMatches]
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
    }, [sportMatches]);

  // Close the tournament dropdown when the user clicks outside it.
  useEffect(() => {
    if (!tournamentDropdownOpen) {
      return undefined;
    }

    const handleOutsidePointer = (event) => {
      if (
        tournamentSelectorRef.current &&
        !tournamentSelectorRef.current.contains(
          event.target
        )
      ) {
        setTournamentDropdownOpen(false);
      }
    };

    document.addEventListener(
      "pointerdown",
      handleOutsidePointer
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        handleOutsidePointer
      );
    };
  }, [tournamentDropdownOpen]);

  // =======================================================
  // SPORT CHANGE
  // =======================================================

  function handleSportChange(sportKey) {
    setSelectedSport(sportKey);
    setSelectedTournament("all");
    setTournamentSearch("");
    setTournamentDropdownOpen(false);
    setActiveTab("all");
    setFixtureFilter("all");
    setShowAllMatches(false);
    setMatchSearch("");
    setAudienceFixtureSearch("");
  }

  // =======================================================
  // TOURNAMENT CHANGE
  // =======================================================

  function handleTournamentChange(
    tournamentId
  ) {
    setSelectedTournament(
      tournamentId
    );

    setTournamentDropdownOpen(false);
    setTournamentSearch("");

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
      <div className="tm-card audience-fixtures-panel">

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
      <div className={`stat-shell score-viewer-shell ${darkMode ? "matcho-dark" : ""}`}>

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
        

        {/* DASHBOARD QUICK ACTIONS */}

<div className="scoreboard-dashboard-actions">

  <button
    type="button"
    className="dashboard-action dashboard-action-primary"
    onClick={() => navigate("/join-tournament")}
  >
    <span className="dashboard-action-icon">
      <Trophy size={16} />
    </span>

    <span className="dashboard-action-text">
      Join Tournament
    </span>
  </button>

  <button
    type="button"
    className="dashboard-action dashboard-action-secondary"
    onClick={() => navigate("/signup")}
  >
    <span className="dashboard-action-icon">
      <ShieldCheck size={16} />
    </span>

    <span className="dashboard-action-text">
      Organizer Sign Up
    </span>
  </button>

</div>

{/* SPORTS SELECTOR */}

<section
  className="scoreboard-sports-selector"
  aria-label="Select sport"
>
  {SPORT_OPTIONS.map((sport) => (
    <button
      key={sport.key}
      type="button"
      className={
        selectedSport === sport.key
          ? "scoreboard-sport-option active"
          : "scoreboard-sport-option"
      }
      onClick={() => handleSportChange(sport.key)}
      aria-pressed={selectedSport === sport.key}
    >
      <span
        className="scoreboard-sport-icon"
        aria-hidden="true"
      >
        {sport.icon}
      </span>

      <span className="scoreboard-sport-label">
        {sport.label}
      </span>
    </button>
  ))}
</section>

        {/* TOURNAMENT SELECTOR */}

       <section className="scoreboard-tournament-selector">
  <div className="scoreboard-tournament-title">

    <div className="scoreboard-tournament-icon">
      <Trophy size={17} />
    </div>

    <div>
      <span>TOURNAMENT</span>

      <strong>
        {selectedSport
          ? "Select a tournament"
          : "Select a sport first"}
      </strong>
    </div>

  </div>

  <div
    className="scoreboard-tournament-select-wrap"
    ref={tournamentSelectorRef}
  >

    <button
      type="button"
      className={
        selectedSport
          ? "scoreboard-tournament-select-trigger"
          : "scoreboard-tournament-select-trigger disabled"
      }
      onClick={() => {
        if (!selectedSport) {
          return;
        }

        setTournamentDropdownOpen(
          (open) => !open
        );
      }}
      disabled={!selectedSport}
      aria-haspopup="listbox"
      aria-expanded={
        tournamentDropdownOpen
      }
    >

      <span className="scoreboard-tournament-selected-text">
        {selectedTournament === "all"
          ? "All Tournaments"
          : selectedTournamentData?.name ||
            "Select a tournament"}
      </span>

      <ChevronDown
        size={16}
        className={
          tournamentDropdownOpen
            ? "scoreboard-tournament-chevron open"
            : "scoreboard-tournament-chevron"
        }
      />

    </button>

    {tournamentDropdownOpen && (
      <div
        className="scoreboard-tournament-dropdown"
        role="listbox"
        aria-label="Tournament list"
      >

        <div className="scoreboard-tournament-search">
          <Search size={16} />

          <input
            type="text"
            value={tournamentSearch}
            onChange={(event) =>
              setTournamentSearch(
                event.target.value
              )
            }
            placeholder="Search tournaments..."
            aria-label="Search tournaments"
            autoFocus
          />

          {tournamentSearch && (
            <button
              type="button"
              className="scoreboard-tournament-search-clear"
              onClick={() =>
                setTournamentSearch("")
              }
              aria-label="Clear tournament search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="scoreboard-tournament-options">

          <button
            type="button"
            role="option"
            aria-selected={
              selectedTournament === "all"
            }
            className={
              selectedTournament === "all"
                ? "scoreboard-tournament-option active"
                : "scoreboard-tournament-option"
            }
            onClick={() =>
              handleTournamentChange("all")
            }
          >
            All Tournaments
          </button>

          {filteredTournamentOptions.map(
            (tournament) => (
              <button
                key={tournament.id}
                type="button"
                role="option"
                aria-selected={
                  String(selectedTournament) ===
                  String(tournament.id)
                }
                className={
                  String(selectedTournament) ===
                  String(tournament.id)
                    ? "scoreboard-tournament-option active"
                    : "scoreboard-tournament-option"
                }
                onClick={() =>
                  handleTournamentChange(
                    tournament.id
                  )
                }
              >
                <span>
                  {tournament.name}
                </span>
              </button>
            )
          )}

          {filteredTournamentOptions.length === 0 && (
            <div className="scoreboard-tournament-no-results">
              <Search size={15} />

              <span>
                No tournaments found
              </span>
            </div>
          )}

        </div>
      </div>
    )}

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
    <div
      className={`stat-shell score-viewer-shell ${
        darkMode ? "matcho-dark" : ""
      }`}
    >

      {/* =================================================
          MATCHO SPORTS AMBIENT BACKGROUND — PURPLE BALLS + RAPID GLITTER
      ================================================= */}

      <div
        className="matcho-sports-background"
        aria-hidden="true"
      >
        {/* -------------------------------------------------------
            SPORTS ART — keep visible: bats/racquets + sports balls
        ------------------------------------------------------- */}
        <div className="matcho-bg-object matcho-bg-volleyball-one">
          <div className="matcho-bg-depth matcho-bg-depth-2">
            <VolleyballSportIcon size={118} ambient />
          </div>
        </div>

        <div className="matcho-bg-object matcho-bg-volleyball-two">
          <div className="matcho-bg-depth matcho-bg-depth-1">
            <VolleyballSportIcon size={74} ambient />
          </div>
        </div>

        <div className="matcho-bg-object matcho-bg-badminton-one">
          <div className="matcho-bg-depth matcho-bg-depth-3">
            <BadmintonSportIcon size={142} ambient />
          </div>
        </div>

        <div className="matcho-bg-object matcho-bg-badminton-two">
          <div className="matcho-bg-depth matcho-bg-depth-1">
            <BadmintonSportIcon size={94} ambient />
          </div>
        </div>

        <div className="matcho-bg-object matcho-bg-football-one">
          <div className="matcho-bg-depth matcho-bg-depth-2">
            <FootballSportIcon size={126} ambient />
          </div>
        </div>

        <div className="matcho-bg-object matcho-bg-basketball-one">
          <div className="matcho-bg-depth matcho-bg-depth-3">
            <BasketballSportIcon size={114} ambient />
          </div>
        </div>

        <div className="matcho-bg-object matcho-bg-throwball-one">
          <div className="matcho-bg-depth matcho-bg-depth-1">
            <ThrowballSportIcon size={96} ambient />
          </div>
        </div>

        {/* -------------------------------------------------------
            EXTRA SOFT PURPLE GLOW BALLS — no seam/grid pattern
        ------------------------------------------------------- */}
        <div className="matcho-bg-ball matcho-bg-ball-1">
          <div className="matcho-bg-depth matcho-bg-depth-2">
            <AmbientPurpleBall size={92} variant={1} />
          </div>
        </div>

        <div className="matcho-bg-ball matcho-bg-ball-2">
          <div className="matcho-bg-depth matcho-bg-depth-1">
            <AmbientPurpleBall size={68} variant={2} />
          </div>
        </div>

        <div className="matcho-bg-ball matcho-bg-ball-3">
          <div className="matcho-bg-depth matcho-bg-depth-3">
            <AmbientPurpleBall size={108} variant={3} />
          </div>
        </div>

        <div className="matcho-bg-ball matcho-bg-ball-4">
          <div className="matcho-bg-depth matcho-bg-depth-1">
            <AmbientPurpleBall size={76} variant={4} />
          </div>
        </div>

        <div className="matcho-bg-ball matcho-bg-ball-5">
          <div className="matcho-bg-depth matcho-bg-depth-2">
            <AmbientPurpleBall size={58} variant={1} />
          </div>
        </div>

        <div className="matcho-bg-ball matcho-bg-ball-6">
          <div className="matcho-bg-depth matcho-bg-depth-3">
            <AmbientPurpleBall size={86} variant={2} />
          </div>
        </div>

        <div className="matcho-bg-ball matcho-bg-ball-7">
          <div className="matcho-bg-depth matcho-bg-depth-1">
            <AmbientPurpleBall size={64} variant={3} />
          </div>
        </div>

        <div className="matcho-bg-ball matcho-bg-ball-8">
          <div className="matcho-bg-depth matcho-bg-depth-2">
            <AmbientPurpleBall size={98} variant={4} />
          </div>
        </div>

        {/* -------------------------------------------------------
            GLITTER — slow, steady, cursor-reactive
        ------------------------------------------------------- */}
        <div className="matcho-glitter-field">
          <div className="matcho-glitter-depth">
            {Array.from({ length: 36 }, (_, index) => (
              <span
                key={`glitter-${index + 1}`}
                className={`matcho-glitter g${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      <Scoreboardsidebar />

      <main className="stat-main">

        {/* =======================================================
            MATCHO TOP NAVBAR
        ======================================================= */}

        <header className="scoreboard-top-navbar">

          <div className="scoreboard-top-brand">
            <div className="scoreboard-top-logo-wrap">
              <img
                src={matchoLogo}
                alt="Matcho"
                className="scoreboard-top-logo"
              />
            </div>
          </div>

          <div className="scoreboard-top-nav-spacer" />

          <div className="scoreboard-top-actions">

            <div className="scoreboard-top-menu-wrap">
              <button
                type="button"
                className={
                  announcementsOpen
                    ? "scoreboard-top-icon-btn active"
                    : "scoreboard-top-icon-btn"
                }
                onClick={() => {
                  setAnnouncementsOpen((open) => !open);
                  setProfileOpen(false);
                }}
                aria-label="Announcements"
                aria-expanded={announcementsOpen}
              >
                <Bell size={18} />
                <span className="scoreboard-top-notification-dot" />
              </button>

              {announcementsOpen && (
                <div className="scoreboard-top-dropdown scoreboard-announcements-dropdown">
                  <div className="scoreboard-dropdown-head">
                    <div>
                      <span>UPDATES</span>
                      <strong>Announcements</strong>
                    </div>
                    <button
                      type="button"
                      className="scoreboard-dropdown-close"
                      onClick={() => setAnnouncementsOpen(false)}
                      aria-label="Close announcements"
                    >
                      <X size={15} />
                    </button>
                  </div>

                  <div className="scoreboard-announcement-empty">
                    <div className="scoreboard-announcement-icon">
                      <Bell size={18} />
                    </div>
                    <strong>No new announcements</strong>
                    <p>
                      Tournament updates and important notices will appear here.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <button
  type="button"
  className="scoreboard-top-icon-btn"
  onClick={() => {
    const root = document.documentElement;

    if (root.classList.contains("matcho-theme-transition")) {
      return;
    }

    root.classList.add("matcho-theme-transition");

    // Change theme at the middle of the transition
    window.setTimeout(() => {
      setDarkMode((value) => !value);
    }, 180);

    // Remove transition class
    window.setTimeout(() => {
      root.classList.remove("matcho-theme-transition");
    }, 520);
  }}
  aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
  title={darkMode ? "Light mode" : "Dark mode"}
>
  {darkMode ? <Sun size={18} /> : <Moon size={18} />}
</button>

            <div className="scoreboard-top-menu-wrap">
              <button
                type="button"
                className={
                  profileOpen
                    ? "scoreboard-profile-btn active"
                    : "scoreboard-profile-btn"
                }
                onClick={() => {
                  setProfileOpen((open) => !open);
                  setAnnouncementsOpen(false);
                }}
                aria-label="Profile"
                aria-expanded={profileOpen}
              >
                <span className="scoreboard-profile-avatar">
                  <CircleUserRound size={19} />
                </span>

                <span className="scoreboard-profile-copy">
                  <small>PROFILE</small>
                  <strong>{profileName}</strong>
                </span>

                <ChevronDown
                  size={15}
                  className={
                    profileOpen
                      ? "scoreboard-profile-chevron open"
                      : "scoreboard-profile-chevron"
                  }
                />
              </button>

              {profileOpen && (
                <div className="scoreboard-top-dropdown scoreboard-profile-dropdown">
                  <div className="scoreboard-profile-dropdown-top">
                    <div className="scoreboard-profile-avatar large">
                      <CircleUserRound size={22} />
                    </div>
                    <div>
                      <span>PROFILE</span>
                      <strong>{profileName}</strong>
                    </div>
                  </div>

                  <div className="scoreboard-profile-dropdown-note">
                    Score viewer account
                  </div>
                </div>
              )}
            </div>

          </div>

        </header>

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

              <section
  className="scoreboard-sports-selector page-sport-selector"
  aria-label="Select sport for fixtures"
>
  {SPORT_OPTIONS.map((sport) => (
    <button
      key={sport.key}
      type="button"
      className={
        selectedSport === sport.key
          ? "scoreboard-sport-option active"
          : "scoreboard-sport-option"
      }
      onClick={() =>
        handleSportChange(sport.key)
      }
      aria-pressed={
        selectedSport === sport.key
      }
    >
      <span
        className="scoreboard-sport-icon"
        aria-hidden="true"
      >
        {sport.icon}
      </span>

      <span className="scoreboard-sport-label">
        {sport.label}
      </span>
    </button>
  ))}
</section>

            </div>

            <section className="scoreboard-tournament-selector">
  <div className="scoreboard-tournament-title">

    <div className="scoreboard-tournament-icon">
      <Trophy size={17} />
    </div>

    <div>
      <span>TOURNAMENT</span>

      <strong>
        {selectedSport
          ? "Select a tournament"
          : "Select a sport first"}
      </strong>
    </div>

  </div>

  <div
    className="scoreboard-tournament-select-wrap"
    ref={tournamentSelectorRef}
  >

    <button
      type="button"
      className={
        selectedSport
          ? "scoreboard-tournament-select-trigger"
          : "scoreboard-tournament-select-trigger disabled"
      }
      onClick={() => {
        if (!selectedSport) return;

        setTournamentDropdownOpen(
          (open) => !open
        );
      }}
      disabled={!selectedSport}
      aria-haspopup="listbox"
      aria-expanded={tournamentDropdownOpen}
    >

      <span className="scoreboard-tournament-selected-text">
        {selectedTournament === "all"
          ? "All Tournaments"
          : selectedTournamentData?.name ||
            "Select a tournament"}
      </span>

      <ChevronDown
        size={16}
        className={
          tournamentDropdownOpen
            ? "scoreboard-tournament-chevron open"
            : "scoreboard-tournament-chevron"
        }
      />

    </button>

    {tournamentDropdownOpen && (
      <div
        className="scoreboard-tournament-dropdown"
        role="listbox"
        aria-label="Tournament list"
      >

        {/* TOURNAMENT SEARCH */}
        <div className="scoreboard-tournament-search">
          <Search size={16} />

          <input
            type="text"
            value={tournamentSearch}
            onChange={(event) =>
              setTournamentSearch(
                event.target.value
              )
            }
            placeholder="Search tournaments..."
            aria-label="Search tournaments"
            autoFocus
          />

          {tournamentSearch && (
            <button
              type="button"
              className="scoreboard-tournament-search-clear"
              onClick={() =>
                setTournamentSearch("")
              }
              aria-label="Clear tournament search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* SPORT-SPECIFIC TOURNAMENTS */}
        <div className="scoreboard-tournament-options">

          <button
            type="button"
            role="option"
            aria-selected={
              selectedTournament === "all"
            }
            className={
              selectedTournament === "all"
                ? "scoreboard-tournament-option active"
                : "scoreboard-tournament-option"
            }
            onClick={() =>
              handleTournamentChange("all")
            }
          >
            All Tournaments
          </button>

          {filteredTournamentOptions.map(
            (tournament) => (
              <button
                key={tournament.id}
                type="button"
                role="option"
                aria-selected={
                  String(selectedTournament) ===
                  String(tournament.id)
                }
                className={
                  String(selectedTournament) ===
                  String(tournament.id)
                    ? "scoreboard-tournament-option active"
                    : "scoreboard-tournament-option"
                }
                onClick={() =>
                  handleTournamentChange(
                    tournament.id
                  )
                }
              >
                <span>
                  {tournament.name}
                </span>
              </button>
            )
          )}

          {filteredTournamentOptions.length === 0 && (
            <div className="scoreboard-tournament-no-results">
              <Search size={15} />
              <span>
                No tournaments found
              </span>
            </div>
          )}

        </div>
      </div>
    )}

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

            <section
  className="scoreboard-sports-selector page-sport-selector"
  aria-label="Select sport for standings"
>
  {SPORT_OPTIONS.map((sport) => (
    <button
      key={sport.key}
      type="button"
      className={
        selectedSport === sport.key
          ? "scoreboard-sport-option active"
          : "scoreboard-sport-option"
      }
      onClick={() =>
        handleSportChange(sport.key)
      }
      aria-pressed={
        selectedSport === sport.key
      }
    >
      <span
        className="scoreboard-sport-icon"
        aria-hidden="true"
      >
        {sport.icon}
      </span>

      <span className="scoreboard-sport-label">
        {sport.label}
      </span>
    </button>
  ))}
</section>

            <section className="scoreboard-tournament-selector">
  <div className="scoreboard-tournament-title">

    <div className="scoreboard-tournament-icon">
      <Trophy size={17} />
    </div>

    <div>
      <span>TOURNAMENT</span>

      <strong>
        {selectedSport
          ? "Select a tournament"
          : "Select a sport first"}
      </strong>
    </div>

  </div>

  <div
    className="scoreboard-tournament-select-wrap"
    ref={tournamentSelectorRef}
  >

    <button
      type="button"
      className={
        selectedSport
          ? "scoreboard-tournament-select-trigger"
          : "scoreboard-tournament-select-trigger disabled"
      }
      onClick={() => {
        if (!selectedSport) return;

        setTournamentDropdownOpen(
          (open) => !open
        );
      }}
      disabled={!selectedSport}
      aria-haspopup="listbox"
      aria-expanded={tournamentDropdownOpen}
    >

      <span className="scoreboard-tournament-selected-text">
        {selectedTournament === "all"
          ? "All Tournaments"
          : selectedTournamentData?.name ||
            "Select a tournament"}
      </span>

      <ChevronDown
        size={16}
        className={
          tournamentDropdownOpen
            ? "scoreboard-tournament-chevron open"
            : "scoreboard-tournament-chevron"
        }
      />

    </button>

    {tournamentDropdownOpen && (
      <div
        className="scoreboard-tournament-dropdown"
        role="listbox"
        aria-label="Tournament list"
      >

        {/* TOURNAMENT SEARCH */}
        <div className="scoreboard-tournament-search">
          <Search size={16} />

          <input
            type="text"
            value={tournamentSearch}
            onChange={(event) =>
              setTournamentSearch(
                event.target.value
              )
            }
            placeholder="Search tournaments..."
            aria-label="Search tournaments"
            autoFocus
          />

          {tournamentSearch && (
            <button
              type="button"
              className="scoreboard-tournament-search-clear"
              onClick={() =>
                setTournamentSearch("")
              }
              aria-label="Clear tournament search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* SPORT-SPECIFIC TOURNAMENTS */}
        <div className="scoreboard-tournament-options">

          <button
            type="button"
            role="option"
            aria-selected={
              selectedTournament === "all"
            }
            className={
              selectedTournament === "all"
                ? "scoreboard-tournament-option active"
                : "scoreboard-tournament-option"
            }
            onClick={() =>
              handleTournamentChange("all")
            }
          >
            All Tournaments
          </button>

          {filteredTournamentOptions.map(
            (tournament) => (
              <button
                key={tournament.id}
                type="button"
                role="option"
                aria-selected={
                  String(selectedTournament) ===
                  String(tournament.id)
                }
                className={
                  String(selectedTournament) ===
                  String(tournament.id)
                    ? "scoreboard-tournament-option active"
                    : "scoreboard-tournament-option"
                }
                onClick={() =>
                  handleTournamentChange(
                    tournament.id
                  )
                }
              >
                <span>
                  {tournament.name}
                </span>
              </button>
            )
          )}

          {filteredTournamentOptions.length === 0 && (
            <div className="scoreboard-tournament-no-results">
              <Search size={15} />
              <span>
                No tournaments found
              </span>
            </div>
          )}

        </div>
      </div>
    )}

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
