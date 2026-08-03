import { Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing.jsx";
import SignIn from "./pages/SignIn.jsx";
import SignUp from "./pages/SignUp.jsx";
import EnterEmail from "./pages/EnterEmail.jsx";
import OtpVerification from "./pages/OtpGenerater.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Terms from "./pages/Terms.jsx";
import Privacy from "./pages/Privacy.jsx";
import "./App.css";
import OrganizerLogin from "./pages/organizerlogin.jsx";
import PlayerLogin from "./pages/playerlogin.jsx";
import SelectSportPage from "./pages/SelectSportPage.jsx";
import PlayerRegistration from "./pages/PlayerRegistration.jsx";
import OrganizerRegistration from "./pages/OrganizerRegistration.jsx";
import PlayerDashboardHome from "./pages/PlayerDashboardHome.jsx";
import OrganizerDashboardHome from "./pages/OrganizerDashboardHome.jsx";
import CreateTournament from "./pages/CreateTournament.jsx";
import ScoreUpdate from "./pages/ScoreUpdate.jsx";
import Profile from "./pages/Profile.jsx";
import { LiveMatchProvider } from "./context/LiveMatchContext.jsx";

function App() {
  return (
    <LiveMatchProvider>
      <main className="app-shell">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/enter-email" element={<EnterEmail />} />
          <Route path="/otp" element={<OtpVerification />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/organizerlogin" element={<OrganizerLogin />} />
          <Route path="/playerlogin" element={<PlayerLogin />} />
          <Route path="/select-sport" element={<SelectSportPage />} />
          <Route path="/player-registration" element={<PlayerRegistration />} />
          <Route path="/organizer-registration" element={<OrganizerRegistration />} />
          <Route path="/player-dashboard" element={<PlayerDashboardHome />} />
          <Route path="/organizer-dashboard" element={<OrganizerDashboardHome />} />
          <Route path="/create-tournament" element={<CreateTournament />} />
          <Route path="/score-update" element={<ScoreUpdate />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </main>
    </LiveMatchProvider>
  );
}

export default App;
