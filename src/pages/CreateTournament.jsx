import { useEffect, useState } from "react";
import { apiRequest } from "../services/api";
import { uploadTournamentIcon } from "../services/supabase";
import {
  useNavigate,
  useLocation,
} from "react-router-dom";

import {
  Trophy,
  MapPin,
  CalendarDays,
  Users,
  ListChecks,
  ShieldCheck,
  FileText,
  Pencil,
  Copy,
  Check,
  Share2,
} from "lucide-react";

import "./RegisterForm.css";
import "./ExtraPages.css";

// ==========================================
// SPORT OPTIONS
// ==========================================

const SPORT_OPTIONS = [
  {
    id: "badminton",
    name: "Badminton",
    icon: "🏸",
  },
];

function getSportIcon(sportId) {
  return (
    SPORT_OPTIONS.find(
      (sport) => sport.id === sportId
    )?.icon || "🏆"
  );
}

// ==========================================
// RECOMMENDED FORMAT
// ==========================================

function getRecommendedFormat() {
  return {
    name: "Custom Format",
    reason:
      "Tournament format is automatically determined by Matcho based on the tournament category and participant count.",
  };
}

// ==========================================
// FORMAT OPTIONS
// ==========================================

const FORMAT_OPTIONS = [
  {
    value: "Custom Format",
    label: "Custom Format",
  },
];

// ==========================================
// CATEGORY OPTIONS
// ==========================================

const CATEGORY_OPTIONS = [
  "Men's Singles",
  "Men's Doubles",
  "Women's Singles",
  "Women's Doubles",
];

// ==========================================
// COMPONENT
// ==========================================

export default function CreateTournament() {
  const navigate = useNavigate();
  const location = useLocation();

  const preSelectedSport = location.state?.sport;

  // ==========================================
  // FORM STATE
  // ==========================================

  const [form, setForm] = useState({
    name: "",
    sport:
      preSelectedSport?.id || "badminton",
    category: "",
    startDate: "",
    endDate: "",
    location: "",
    maxParticipants: "",
    description: "",
  });

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);

    const [iconFile, setIconFile] = useState(null);
const [iconPreview, setIconPreview] = useState("");

  // ==========================================
  // DROPDOWN STATE
  // ==========================================

  const [categoryOpen, setCategoryOpen] =
    useState(false);

  const [formatOpen, setFormatOpen] =
    useState(false);

  // ==========================================
  // FORMAT STATE
  // ==========================================

  const participantLimit =
    Number(form.maxParticipants) || 0;

  const recommendedFormat =
    getRecommendedFormat();

  const [
    selectedFormat,
    setSelectedFormat,
  ] = useState(
    recommendedFormat.name
  );

  const [
    isEditingFormat,
    setIsEditingFormat,
  ] = useState(false);

  const [customFormat, setCustomFormat] =
    useState("");

  // ==========================================
  // SUCCESS MODAL STATE
  // ==========================================

  const [
    createdTournament,
    setCreatedTournament,
  ] = useState(null);

  const [
    showSuccessModal,
    setShowSuccessModal,
  ] = useState(false);

  const [
    copiedCode,
    setCopiedCode,
  ] = useState(false);

  // ==========================================
  // UPDATE AUTOMATIC FORMAT
  // ==========================================

  useEffect(() => {
    if (!isEditingFormat) {
      setSelectedFormat(
        recommendedFormat.name
      );
    }
  }, [
    recommendedFormat.name,
    isEditingFormat,
  ]);

  // ==========================================
  // UPDATE FORM
  // ==========================================

  function update(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setError("");
  }

  // ==========================================
  // BACK
  // ==========================================

  function handleBack() {
    navigate("/select-sport", {
      state: {
        mode: "organizer",
      },
    });
  }

  // ==========================================
  // CATEGORY
  // ==========================================

  function handleCategoryChange(value) {
    update("category", value);
    setCategoryOpen(false);
  }

  // ==========================================
  // FORMAT CHANGE
  // ==========================================

  function handleFormatChange(value) {
    setSelectedFormat(value);
    setFormatOpen(false);
    setIsEditingFormat(true);

    if (value !== "Custom Format") {
      setCustomFormat("");
    }

    setError("");
  }

  // ==========================================
  // COPY REGISTRATION CODE
  // ==========================================

  async function handleCopyCode() {
    const code =
      createdTournament?.registration_code;

    if (!code) {
      return;
    }

    try {
      await navigator.clipboard.writeText(code);

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
  async function handleShareTournament() {
  const code =
    createdTournament?.registration_code;

  if (!code) {
    return;
  }

  const shareUrl =
    `${window.location.origin}/join-tournament?code=${encodeURIComponent(code)}`;

  const shareText =
    `Join my ${createdTournament?.name || "tournament"} on Matcho.\n\nRegistration Code: ${code}\n\nJoin here: ${shareUrl}`;

  try {
    // Native share on mobile / supported browsers
    if (navigator.share) {
      await navigator.share({
        title:
          createdTournament?.name ||
          "Join Matcho Tournament",
        text: shareText,
        url: shareUrl,
      });

      return;
    }

    // Fallback for desktop browsers
    await navigator.clipboard.writeText(
      shareText
    );

    setCopiedCode(true);

    setTimeout(() => {
      setCopiedCode(false);
    }, 2000);

  } catch (error) {
    // User cancelled native share
    if (error?.name === "AbortError") {
      return;
    }

    console.error(
      "Share tournament error:",
      error
    );
  }
}

  // ==========================================
  // CLOSE SUCCESS MODAL
  // ==========================================

  function handleCloseSuccess() {
    setShowSuccessModal(false);
    navigate("/organizer-dashboard");
  }

  // ==========================================
  // SUBMIT
  // ==========================================

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");

    // ------------------------------------------
    // VALIDATION
    // ------------------------------------------

    if (!form.name.trim()) {
      setError(
        "Tournament name is required."
      );
      return;
    }

    if (!form.sport) {
      setError(
        "Please select a sport."
      );
      return;
    }

    if (
      form.sport !== "badminton"
    ) {
      setError(
        "Only Badminton tournaments are currently available."
      );
      return;
    }

    if (!form.category) {
      setError(
        "Please select a category."
      );
      return;
    }

    if (!form.startDate) {
      setError(
        "Start date is required."
      );
      return;
    }

    if (!form.endDate) {
      setError(
        "End date is required."
      );
      return;
    }

    if (
      form.endDate <
      form.startDate
    ) {
      setError(
        "End date cannot be before the start date."
      );
      return;
    }

    if (!form.location.trim()) {
      setError(
        "Location is required."
      );
      return;
    }

    if (participantLimit < 2) {
      setError(
        "Maximum participants must be at least 2."
      );
      return;
    }

    // ------------------------------------------
    // CUSTOM FORMAT
    // ------------------------------------------

    if (
      selectedFormat ===
        "Custom Format" &&
      !customFormat.trim()
    ) {
      setError(
        "Please describe your custom tournament format."
      );
      return;
    }

    const finalFormat =
      selectedFormat ===
      "Custom Format"
        ? customFormat.trim()
        : selectedFormat;

    // ------------------------------------------
    // AUTHENTICATION
    // ------------------------------------------

    const token =
      localStorage.getItem(
        "matcho_token"
      );

    if (!token) {
      setError(
        "Please login as an organizer first."
      );
      return;
    }

    // ------------------------------------------
    // API REQUEST
    // ------------------------------------------

    try {
      setLoading(true);

      const result =
        await apiRequest(
          "/tournaments",
          {
            method: "POST",

            headers: {
              Authorization:
                `Bearer ${token}`,
            },

            body: JSON.stringify({
              name:
                form.name.trim(),

              sport:
                form.sport,

              category:
                form.category,

              startDate:
                form.startDate,

              endDate:
                form.endDate,

              location:
                form.location.trim(),

              maxParticipants:
                Number(
                  form.maxParticipants
                ),

              description:
                form.description.trim(),

              format:
                finalFormat,
            }),
          }
        );

      console.log(
        "Tournament created:",
        result
      );

      const tournament =
        result.tournament;

      // ------------------------------------------
      // SHOW SUCCESS UI
      // ------------------------------------------

      setCreatedTournament(
        tournament
      );

      setShowSuccessModal(true);

    } catch (error) {
      console.error(
        "Create Tournament Error:",
        error
      );

      setError(
        error.message ||
          "Unable to create tournament."
      );

    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="reg-shell">

      <main className="reg-main">

        <p className="reg-page-title">
          Create Tournament
        </p>

        <form
          className="reg-layout"
          onSubmit={handleSubmit}
        >

          {/* ==================================
              MAIN CARD
          ================================== */}

          <div className="reg-card">

            <div className="create-title-row">

              <button
                type="button"
                className="create-back-btn"
                onClick={handleBack}
                aria-label="Back"
              >
                ←
              </button>

              <div>
                <h1>
                  Tournament Details
                </h1>

                <p>
                  Fill in the details to launch
                  your tournament
                </p>
              </div>

            </div>

            {/* ERROR */}

            {error && (
              <div className="ep-error-box">
                {error}
              </div>
            )}

            {/* ==================================
                TOURNAMENT NAME
            ================================== */}

            <div className="reg-row">

              <div className="reg-field full">

                <label>
                  Tournament Name{" "}
                  <span className="req">
                    *
                  </span>
                </label>

                <div className="reg-input-wrap">

                  <Trophy size={16} />

                  <input
                    type="text"
                    placeholder="e.g. Summer Badminton Cup 2026"
                    value={form.name}
                    maxLength={60}
                    onChange={(e) =>
                      update(
                        "name",
                        e.target.value
                      )
                    }
                    required
                  />

                </div>

              </div>

            </div>

            {/* ==================================
                SPORT + CATEGORY
            ================================== */}

            <div className="reg-row">

              {/* SPORT */}

              <div className="reg-field">

                <label>
                  Sport{" "}
                  <span className="req">
                    *
                  </span>
                </label>

                <div className="custom-dropdown">

                  <button
                    type="button"
                    className="custom-dropdown-trigger"
                    disabled
                  >

                    <span className="dropdown-icon">
  {getSportIcon(form.sport)}
</span>

                    <span className="dropdown-value">
                      Badminton
                    </span>

                    <span className="dropdown-chevron">
                      ⌄
                    </span>

                  </button>

                </div>

              </div>

              {/* CATEGORY */}

              <div className="reg-field">

                <label>
                  Category{" "}
                  <span className="req">
                    *
                  </span>
                </label>

                <div className="custom-dropdown">

                  <button
                    type="button"
                    className="custom-dropdown-trigger"
                    onClick={() => {

                      setCategoryOpen(
                        (previous) =>
                          !previous
                      );

                      setFormatOpen(false);

                    }}
                  >

                    <ListChecks
                      size={16}
                    />

                    <span
                      className={
                        form.category
                          ? "dropdown-value"
                          : "dropdown-placeholder"
                      }
                    >
                      {form.category ||
                        "Select category"}
                    </span>

                    <span
                      className={`dropdown-chevron ${
                        categoryOpen
                          ? "open"
                          : ""
                      }`}
                    >
                      ⌄
                    </span>

                  </button>

                  {categoryOpen && (

                    <div className="custom-dropdown-menu">

                      {CATEGORY_OPTIONS.map(
                        (category) => (

                          <button
                            type="button"
                            key={category}
                            className={`custom-dropdown-option ${
                              form.category ===
                              category
                                ? "selected"
                                : ""
                            }`}
                            onClick={() =>
                              handleCategoryChange(
                                category
                              )
                            }
                          >
                            {category}
                          </button>

                        )
                      )}

                    </div>

                  )}

                </div>

              </div>

            </div>

            {/* ==================================
                DATES
            ================================== */}

            <div className="reg-row">

              <div className="reg-field">

                <label>
                  Start Date{" "}
                  <span className="req">
                    *
                  </span>
                </label>

                <div className="reg-input-wrap">

                  <CalendarDays
                    size={16}
                  />

                  <input
                    type="date"
                    value={
                      form.startDate
                    }
                    onChange={(e) =>
                      update(
                        "startDate",
                        e.target.value
                      )
                    }
                    required
                  />

                </div>

              </div>

              <div className="reg-field">

                <label>
                  End Date{" "}
                  <span className="req">
                    *
                  </span>
                </label>

                <div className="reg-input-wrap">

                  <CalendarDays
                    size={16}
                  />

                  <input
                    type="date"
                    value={
                      form.endDate
                    }
                    onChange={(e) =>
                      update(
                        "endDate",
                        e.target.value
                      )
                    }
                    required
                  />

                </div>

              </div>

            </div>

            {/* ==================================
                LOCATION + PARTICIPANTS
            ================================== */}

            <div className="reg-row">

              <div className="reg-field">

                <label>
                  Location / Venue{" "}
                  <span className="req">
                    *
                  </span>
                </label>

                <div className="reg-input-wrap">

                  <MapPin
                    size={16}
                  />

                  <input
                    type="text"
                    placeholder="City / Venue"
                    value={
                      form.location
                    }
                    onChange={(e) =>
                      update(
                        "location",
                        e.target.value
                      )
                    }
                    required
                  />

                </div>

              </div>

              <div className="reg-field">

                <label>
                  Max Participants{" "}
                  <span className="req">
                    *
                  </span>
                </label>

                <div className="reg-input-wrap">

                  <Users
                    size={16}
                  />

                  <input
                    type="number"
                    min="2"
                    placeholder="e.g. 32"
                    value={
                      form.maxParticipants
                    }
                    onChange={(e) =>
                      update(
                        "maxParticipants",
                        e.target.value
                      )
                    }
                    required
                  />

                </div>

              </div>

            </div>

            {/* ==================================
                TOURNAMENT FORMAT
            ================================== */}

            <div className="reg-field full">

              <div className="format-heading-row">

                <label>
                  Tournament Format
                </label>

                {!isEditingFormat && (

                  <button
                    type="button"
                    className="format-edit-btn"
                    onClick={() => {

                      setIsEditingFormat(
                        true
                      );

                      setFormatOpen(false);
                      setCategoryOpen(false);

                    }}
                  >

                    <Pencil
                      size={14}
                    />

                    Edit

                  </button>

                )}

              </div>

              {/* DISPLAY */}

              {!isEditingFormat ? (

                <div className="reg-safe-box format-display">

                  <div className="reg-safe-icon">

                    <ListChecks
                      size={18}
                    />

                  </div>

                  <div className="format-display-content">

                    <strong>
                      {selectedFormat}
                    </strong>

                    <p>
                      {selectedFormat ===
                      recommendedFormat.name
                        ? recommendedFormat.reason
                        : "Format selected by the organizer."}
                    </p>

                  </div>

                </div>

              ) : (

                <div className="custom-dropdown format-dropdown">

                  <button
                    type="button"
                    className="custom-dropdown-trigger"
                    onClick={() => {

                      setFormatOpen(
                        (previous) =>
                          !previous
                      );

                      setCategoryOpen(false);

                    }}
                  >

                    <ListChecks
                      size={16}
                    />

                    <span className="dropdown-value">
                      {selectedFormat}
                    </span>

                    <span
                      className={`dropdown-chevron ${
                        formatOpen
                          ? "open"
                          : ""
                      }`}
                    >
                      ⌄
                    </span>

                  </button>

                  {formatOpen && (

                    <div className="custom-dropdown-menu">

                      {FORMAT_OPTIONS.map(
                        (option) => (

                          <button
                            type="button"
                            key={option.value}
                            className={`custom-dropdown-option ${
                              selectedFormat ===
                              option.value
                                ? "selected"
                                : ""
                            }`}
                            onClick={() =>
                              handleFormatChange(
                                option.value
                              )
                            }
                          >
                            {option.label}
                          </button>

                        )
                      )}

                    </div>

                  )}

                </div>

              )}

              {/* CUSTOM FORMAT */}

              {selectedFormat ===
                "Custom Format" && (

                <div className="reg-field full custom-format-field">

                  <label>
                    Custom Format Description{" "}
                    <span className="req">
                      *
                    </span>
                  </label>

                  <div className="reg-input-wrap ep-textarea-wrap">

                    <FileText
                      size={16}
                    />

                    <textarea
                      placeholder="Describe how your custom tournament format should work..."
                      value={
                        customFormat
                      }
                      onChange={(e) =>
                        setCustomFormat(
                          e.target.value
                        )
                      }
                      rows={3}
                      maxLength={300}
                    />

                  </div>

                </div>

              )}

            </div>

            {/* ==================================
                DESCRIPTION
            ================================== */}

            <div className="reg-field full description-field">

              <label>
                Description
              </label>

              <div className="reg-input-wrap ep-textarea-wrap">

                <FileText
                  size={16}
                />

                <textarea
                  placeholder="Tell players what this tournament is about..."
                  value={
                    form.description
                  }
                  onChange={(e) =>
                    update(
                      "description",
                      e.target.value
                    )
                  }
                  rows={4}
                  maxLength={1000}
                />

              </div>

            </div>

            {/* ==================================
                READY TO PUBLISH
            ================================== */}

            <div className="reg-safe-box">

              <div className="reg-safe-icon">

                <ShieldCheck
                  size={18}
                />

              </div>

              <div>

                <strong>
                  Ready to publish
                </strong>

                <p>
                  Your tournament will appear
                  on your dashboard and be open
                  for registrations.
                </p>

              </div>

            </div>

            {/* ==================================
                ACTIONS
            ================================== */}

            <div className="reg-actions">

              <button
                type="button"
                className="reg-cancel"
                onClick={handleBack}
                disabled={loading}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="reg-next"
                disabled={loading}
              >
                {loading
                  ? "Creating Tournament..."
                  : "Create Tournament"}
              </button>

            </div>

          </div>

          {/* ==================================
              RIGHT SIDE
          ================================== */}

          <aside className="reg-side">

            <h3>
              Tips for a great tournament
            </h3>

            <div className="reg-side-item">

              <div className="reg-side-icon">

                <Trophy
                  size={17}
                />

              </div>

              <div>

                <strong>
                  Pick a clear format
                </strong>

                <p>
                  The suggested format is based
                  on your participant limit, but
                  you can change it using Edit.
                </p>

              </div>

            </div>

            <div className="reg-side-item">

              <div className="reg-side-icon">

                <CalendarDays
                  size={17}
                />

              </div>

              <div>

                <strong>
                  Give enough time
                </strong>

                <p>
                  Leave a few days between
                  registration close and start
                  date.
                </p>

              </div>

            </div>

            <div className="reg-side-item">

              <div className="reg-side-icon">

                <Users
                  size={17}
                />

              </div>

              <div>

                <strong>
                  Set a realistic cap
                </strong>

                <p>
                  Max participants helps players
                  know how competitive the
                  tournament will be.
                </p>

              </div>

            </div>

          </aside>

        </form>

      </main>


      {/* ==========================================
          SUCCESS MODAL
      ========================================== */}

      {showSuccessModal && (

        <div className="tournament-success-overlay">

          <div className="tournament-success-modal">

            {/* CLOSE */}

            <button
              type="button"
              className="success-close-btn"
              onClick={handleCloseSuccess}
              aria-label="Close"
            >
              ×
            </button>


            {/* SUCCESS ICON */}

            <div className="success-check">
              ✓
            </div>


            {/* HEADING */}

            <h2>
              Tournament Created Successfully!
            </h2>

            <p className="success-message">
              Your tournament has been created
              and is now available for
              registration.
            </p>


            {/* REGISTRATION CODE */}

            <div className="success-registration-box">

  <span>
    Registration Code
  </span>

  <div className="success-code-row">

    <strong>
      {createdTournament?.registration_code ||
        "N/A"}
    </strong>

  </div>

  <div className="success-share-actions">

    <button
      type="button"
      className="success-copy-btn"
      onClick={handleCopyCode}
      title="Copy registration code"
    >
      {copiedCode ? (
        <>
          <Check size={15} />
          Copied
        </>
      ) : (
        <>
          <Copy size={15} />
          Copy Code
        </>
      )}
    </button>

    <button
      type="button"
      className="success-share-btn"
      onClick={handleShareTournament}
    >
      <Share2 size={15} />
      Share Tournament
    </button>

  </div>

</div>


            {/* DETAILS */}

            <div className="success-details">

              <div>

                <span>
                  Tournament
                </span>

                <strong>
                  {createdTournament?.name ||
                    form.name}
                </strong>

              </div>

              <div>

                <span>
                  Sport
                </span>

                <strong>
                  🏸 Badminton
                </strong>

              </div>

              <div>

                <span>
                  Format
                </span>

                <strong>
                  {createdTournament?.format ||
                    selectedFormat}
                </strong>

              </div>

            </div>


            {/* DASHBOARD */}

            <button
              type="button"
              className="success-dashboard-btn"
              onClick={() =>
                navigate(
                  "/organizer-dashboard"
                )
              }
            >
              Go to Organizer Dashboard
            </button>

          </div>

        </div>

      )}

    </div>
  );
}