import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  MapPin,
  Users,
  Trophy,
  CheckCircle2,
  Search,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";

import { apiRequest } from "../services/api";

import "./StatsDashboard.css";
import "./RegisterForm.css";
import "./JoinTournament.css";

function formatDate(value) {
  if (!value) return "Date TBA";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function JoinTournament() {
  const navigate = useNavigate();

  const [tournaments, setTournaments] = useState([]);
  const [selected, setSelected] = useState(null);

  const [form, setForm] = useState({
    name: "",
    gender: "",
    cFlatNumber: "",
    mobile: "",
    transactionId: "",
});

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  /* =========================================================
     LOAD TOURNAMENTS
  ========================================================= */

  useEffect(() => {
    async function loadTournaments() {
      try {
        const result = await apiRequest(
          "/tournaments/public/registration"
        );

        setTournaments(result.tournaments || []);
      } catch (error) {
        setMessage(
          error.message ||
            "Unable to load available tournaments."
        );
      } finally {
        setLoading(false);
      }
    }

    loadTournaments();
  }, []);

  /* =========================================================
     SEARCH
  ========================================================= */

  const filteredTournaments = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return tournaments;
    }

    return tournaments.filter((tournament) =>
      [
        tournament.name,
        tournament.sport,
        tournament.category,
        tournament.venue,
        tournament.organizer_name,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLowerCase()
            .includes(term)
        )
    );
  }, [search, tournaments]);

  /* =========================================================
     FORM
  ========================================================= */

  const update = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const openForm = (tournament) => {
    setSelected(tournament);

    setMessage("");
    setSuccess(false);

    setForm({
      name: "",
      gender: "",
      cFlatNumber: "",
      mobile: "",
      transactionId: "",
    });
  };

  const closeForm = () => {
    if (submitting) return;

    setSelected(null);
    setMessage("");
    setSuccess(false);
  };

  /* =========================================================
     SUBMIT PLAYER REGISTRATION
  ========================================================= */

 async function handleSubmit(event) {
  event.preventDefault();

  if (!selected) return;

  setSubmitting(true);
  setMessage("");
  setSuccess(false);

  try {
    const result = await apiRequest(
      "/tournaments/join-public",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tournamentId: selected.id,
          ...form,
        }),
      }
    );

    // Update registered player count
    setTournaments((current) =>
      current.map((tournament) =>
        tournament.id === selected.id
          ? {
              ...tournament,
              registered_players:
                Number(
                  tournament.registered_players || 0
                ) + 1,
              joined: true,
            }
          : tournament
      )
    );

    // Close the form after successful registration
    setSelected(null);

    // Clear the form
    setForm({
      name: "",
      gender: "",
      cFlatNumber: "",
      mobile: "",
      transactionId: "",
    });

    setMessage("");
    setSuccess(false);

  } catch (error) {
    setMessage(
      error.message ||
        "Unable to join tournament."
    );
  } finally {
    setSubmitting(false);
  }
}

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="stat-shell join-tournament-page">
      <main className="reg-main join-tournament-main">

        {/* ===================================================
            HEADER
        =================================================== */}

        <div className="join-page-heading">
  <button
  type="button"
  className="join-back-btn"
  onClick={() => navigate("/")}
>
  <ArrowLeft size={18} />
  <span>Dashboard</span>
</button>

  <div className="join-heading-content">
    <p className="reg-page-title">Join a Tournament</p>
    <p className="join-page-subtitle">
      Choose a tournament that is currently accepting player registrations.
    </p>
  </div>
</div>


        {/* ===================================================
            SEARCH
        =================================================== */}

        <section className="join-search-section">

          <div className="join-search-box">

            <Search
              size={19}
              className="join-search-icon"
            />

            <input
              className="join-search-input"
              placeholder="Search tournaments, sports, colleges or venues..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />

            {search && (
              <button
                type="button"
                className="join-search-clear"
                onClick={() => setSearch("")}
              >
                Clear
              </button>
            )}

          </div>

        </section>


        {/* ===================================================
            CONTENT
        =================================================== */}

        <section className="join-tournament-content">

          <div className="join-section-heading">

            <div>
              <h2>
                Available Tournaments
              </h2>

              {!loading &&
                tournaments.length > 0 && (
                  <p>
                    {filteredTournaments.length}{" "}
                    tournament
                    {filteredTournaments.length !== 1
                      ? "s"
                      : ""}{" "}
                    available
                  </p>
                )}
            </div>

          </div>


          {/* =================================================
              LOADING
          ================================================= */}

          {loading && (
            <div className="join-status-card">

              <div className="join-loading-icon">
                <Trophy size={24} />
              </div>

              <h3>
                Finding tournaments
              </h3>

              <p>
                Loading events that are open
                for registration...
              </p>

            </div>
          )}


          {/* =================================================
              ERROR
          ================================================= */}

          {!loading &&
            message &&
            !selected && (
              <div className="tm-error join-error">
                {message}
              </div>
            )}


          {/* =================================================
              EMPTY STATE
          ================================================= */}

          {!loading &&
            !message &&
            filteredTournaments.length === 0 && (
              <div className="join-empty-state">

                <div className="join-empty-icon">
                  <Trophy size={27} />
                </div>

                <h2>
                  No tournaments available
                </h2>

                <p>
                  {search
                    ? "We couldn't find any tournaments matching your search."
                    : "There are no tournaments open for registration right now."}
                </p>

                {search && (
                  <button
                    type="button"
                    className="join-clear-search"
                    onClick={() => setSearch("")}
                  >
                    View all tournaments
                  </button>
                )}

              </div>
            )}


          {/* =================================================
              TOURNAMENT GRID
          ================================================= */}

          {!loading &&
            filteredTournaments.length > 0 && (
              <div className="join-tournament-grid">

                {filteredTournaments.map(
                  (tournament) => {
                    const registered = Number(
                      tournament.registered_players || 0
                    );

                    const max = Number(
                      tournament.max_players || 0
                    );

                    const isFull =
  max > 0 &&
  registered >= max;

const isJoined =
  tournament.joined === true;

                    return (
                      <article
                        key={tournament.id}
                        className="join-tournament-card"
                      >

                        {/* CARD TOP */}

                        <div className="join-card-top">

                          <div className="join-card-sport-icon">
                            <Trophy size={21} />
                          </div>

                          <span
                            className={
                              isFull
                                ? "join-status-badge full"
                                : "join-status-badge open"
                            }
                          >
                            {isFull
                              ? "Full"
                              : "Registration Open"}
                          </span>

                        </div>


                        {/* TITLE */}

                        <div className="join-card-title-area">

                          <h3>
                            {tournament.name}
                          </h3>

                          <p>
                            {tournament.sport
  ? tournament.sport.charAt(0).toUpperCase() +
    tournament.sport.slice(1)
  : ""}

                            {tournament.category
                              ? ` • ${tournament.category}`
                              : ""}
                          </p>

                        </div>


                        {/* DETAILS */}

                        <div className="join-card-details">

                          <div>
                            <CalendarDays size={16} />

                            <span>
                              {formatDate(
                                tournament.start_date
                              )}

                              {tournament.end_date &&
                                ` – ${formatDate(
                                  tournament.end_date
                                )}`}
                            </span>
                          </div>

                          <div>
                            <MapPin size={16} />

                            <span>
                              {tournament.venue ||
                                "Venue TBA"}
                            </span>
                          </div>

                          <div>
                            <Users size={16} />

                            <span>
                              {registered}

                              {max
                                ? ` / ${max}`
                                : ""}{" "}
                              players registered
                            </span>
                          </div>

                        </div>


                        {/* ORGANIZER */}

                        {tournament.organizer_name && (
                          <p className="join-card-organizer">
                            Organized by{" "}
                            <strong>
                              {
                                tournament.organizer_name
                              }
                            </strong>
                          </p>
                        )}


                        {/* ACTION */}

                        <button
  type="button"
  className={
    isJoined
      ? "join-card-button joined"
      : "join-card-button"
  }
  disabled={isFull || isJoined}
  onClick={() =>
    openForm(tournament)
  }
>
  {isFull
    ? "Tournament Full"
    : isJoined
    ? "Joined"
    : "Join Tournament"}

  {!isFull && !isJoined && (
    <ArrowRight size={16} />
  )}

  {isJoined && (
    <CheckCircle2 size={16} />
  )}
</button>

                      </article>
                    );
                  }
                )}

              </div>
            )}

        </section>


        {/* ===================================================
            REGISTRATION MODAL
        =================================================== */}

        {selected && (
          <div className="join-modal-overlay">

            <form
              className="join-modal"
              onSubmit={handleSubmit}
            >

              {/* MODAL HEADER */}

              <div className="join-modal-header">

                <div className="join-modal-icon">
                  <Trophy size={22} />
                </div>

                <div>
                  <h2>
                    Join as a Player
                  </h2>

                  <p>
                    {selected.name}
                  </p>
                </div>

              </div>


              <p className="join-modal-description">
                No account is required.
                Enter your details to join
                this tournament.
              </p>


              {/* NAME */}

              <label className="auth-label">
                Name
              </label>

              <input
                className="auth-input"
                placeholder="Full name"
                value={form.name}
                onChange={(event) =>
                  update(
                    "name",
                    event.target.value
                  )
                }
                required
              />


              {/* GENDER */}

              <label className="auth-label">
                Gender
              </label>

              <select
                className="auth-input"
                value={form.gender}
                onChange={(event) =>
                  update(
                    "gender",
                    event.target.value
                  )
                }
                required
              >
                <option value="">
                  Select gender
                </option>

                <option value="Male">
                  Male
                </option>

                <option value="Female">
                  Female
                </option>

                <option value="Other">
                  Other
                </option>
              </select>


              {/* C-FLAT */}

              <label className="auth-label">
                Flat Number(eg: C-101)
              </label>

              <input
                className="auth-input"
                placeholder="C-Flat number"
                value={form.cFlatNumber}
                onChange={(event) =>
                  update(
                    "cFlatNumber",
                    event.target.value
                  )
                }
                required
              />


              {/* MOBILE */}

              <label className="auth-label">
                Mobile Number
              </label>

              <input
                className="auth-input"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="10-digit mobile number"
                value={form.mobile}
                onChange={(event) =>
                  update(
                    "mobile",
                    event.target.value
                      .replace(/\D/g, "")
                      .slice(0, 10)
                  )
                }
                required
              />


{/* TRANSACTION ID */}

<label className="auth-label">
  Transaction ID
</label>

<input
  className="auth-input"
  type="text"
  placeholder="Enter payment transaction ID"
  value={form.transactionId}
  onChange={(event) =>
    update(
      "transactionId",
      event.target.value
    )
  }
  required
/>

              {/* MESSAGE */}

              

              {message && (
                <div
                  className={
                    success
                      ? "tm-success join-form-message"
                      : "tm-error join-form-message"
                  }
                >
                  {success && (
                    <CheckCircle2 size={17} />
                  )}

                  {message}
                </div>
              )}


              {/* BUTTONS */}

              <div className="join-modal-actions">

                <button
                  type="button"
                  className="join-cancel-button"
                  onClick={closeForm}
                  disabled={submitting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="join-submit-button"
                  disabled={
                    submitting || success
                  }
                >
                  {submitting
                    ? "Joining..."
                    : success
                    ? "Joined"
                    : "Join Tournament"}
                </button>

              </div>

            </form>

          </div>
        )}

      </main>
    </div>
  );
}