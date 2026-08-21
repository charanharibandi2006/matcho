import { Routes, Route } from "react-router-dom";

// ==============================
// AUTH / GENERAL PAGES
// ==============================

import Landing from "./pages/Landing.jsx";
import SignIn from "./pages/SignIn.jsx";
import SignUp from "./pages/SignUp.jsx";
import EnterEmail from "./pages/EnterEmail.jsx";
import OtpGenerater from "./pages/OtpGenerater.jsx";
import ForgotPasswordOtp from "./pages/ForgetPasswordOtp.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import Terms from "./pages/Terms.jsx";
import Privacy from "./pages/Privacy.jsx";
import ScoreViewDashboard from "./pages/ScoreViewDashboard";

// ==============================
// SPORTS / TOURNAMENT
// ==============================

import SelectSportPage from "./pages/SelectSportPage.jsx";
import CreateTournament from "./pages/CreateTournament.jsx";
import JoinTournament from "./pages/JoinTournament.jsx";
import TournamentManagement from "./pages/TournamentManagement.jsx";

// ==============================
// DASHBOARDS
// ==============================

import OrganizerDashboardHome from "./pages/OrganizerDashboardHome.jsx";

// ==============================
// SCORING
// ==============================

import ScoreUpdate from "./pages/ScoreUpdate.jsx";
import LiveScoringFullScreen from "./pages/LiveScoringFullScreen.jsx";
import ScoreboardDashboard from "./pages/ScoreboardDashboard.jsx";

// ==============================
// PROFILE
// ==============================

import Profile from "./pages/Profile.jsx";

// ==============================
// PROTECTION
// ==============================

import ProtectedRoute from "./components/ProtectedRoute.jsx";

// ==============================
// MOBILE NAVIGATION
// ==============================

import { MobileMenuProvider } from "./components/MobileMenuProvider.jsx";

// ==============================
// CONTEXT
// ==============================

import { LiveMatchProvider } from "./context/LiveMatchContext.jsx";

// ==============================
// GLOBAL CSS
// IMPORTANT:
// Keep MobileResponsiveFinal.css AFTER
// App.css so its mobile overrides win.
// ==============================

import "./App.css";
import "./MobileResponsiveFinal.css";

function App() {
  return (
    <LiveMatchProvider>
      <MobileMenuProvider>
        <main className="app-shell">
          <Routes>

            {/* =================================
                PUBLIC PAGES
            ================================= */}

            <Route
              path="/"
              element={<ScoreboardDashboard />}
            />

            <Route
              path="/signin"
              element={<SignIn />}
            />

            <Route
              path="/signup"
              element={<SignUp />}
            />

            <Route
              path="/enter-email"
              element={<EnterEmail />}
            />

            <Route
              path="/forgot-password-otp"
              element={<ForgotPasswordOtp />}
            />

            <Route
              path="/reset-password"
              element={<ResetPassword />}
            />

            <Route
              path="/otp-verification"
              element={<OtpGenerater />}
            />

            <Route
              path="/terms"
              element={<Terms />}
            />

            <Route
              path="/privacy"
              element={<Privacy />}
            />

            {/* =================================
                PUBLIC AUDIENCE SCOREBOARD
            ================================= */}

            <Route
              path="/scoreboard"
              element={<ScoreboardDashboard />}
            />

            <Route
              path="/score-view"
              element={<ScoreViewDashboard />}
            />

            {/* =================================
                ORGANIZER PROTECTED ROUTES
            ================================= */}

            <Route
              element={
                <ProtectedRoute
                  allowedRoles={["organizer"]}
                />
              }
            >
              <Route
                path="/organizer-dashboard"
                element={<OrganizerDashboardHome />}
              />

              <Route
                path="/select-sport"
                element={<SelectSportPage />}
              />

              <Route
                path="/create-tournament/*"
                element={<CreateTournament />}
              />

              <Route
                path="/tournament-management"
                element={<TournamentManagement />}
              />

              <Route
                path="/score-update"
                element={<ScoreUpdate />}
              />

              <Route
                path="/live-scoring/:matchId"
                element={<LiveScoringFullScreen />}
              />
            </Route>

            {/* =================================
                PUBLIC PLAYER REGISTRATION

                IMPORTANT:
                This route must NOT be wrapped
                inside ProtectedRoute.

                Shared tournament links should
                be able to open directly.
            ================================= */}

            <Route
              path="/join-tournament"
              element={<JoinTournament />}
            />

            {/* =================================
                PROFILE
                ORGANIZER
            ================================= */}

            <Route
              element={
                <ProtectedRoute
                  allowedRoles={["organizer"]}
                />
              }
            >
              <Route
                path="/profile"
                element={<Profile />}
              />
            </Route>

            {/* =================================
                FALLBACK
            ================================= */}

            <Route
              path="*"
              element={<Landing />}
            />

          </Routes>
        </main>
      </MobileMenuProvider>
    </LiveMatchProvider>
  );
}

export default App;