import { getRole } from "../utils/auth";
import PlayerSidebar from "./PlayerSidebar";
import OrganizerSidebar from "./OrganizerSidebar";
import Scoreboardsidebar from "./Scoreboardsidebar";

// Pages like Tournament Management, Score Update, and Live Scoring are
// reachable from every portal's sidebar. This picks whichever sidebar
// matches the portal the user is currently in, so its "Dashboard" nav
// item (and logo) always routes back to the dashboard they came from
// instead of always jumping to the Organizer Dashboard.
export default function RoleSidebar({ activeItem }) {
  const role = getRole();

  if (role === "player") return <PlayerSidebar activeItem={activeItem} />;
  if (role === "score-viewing") {
  return <Scoreboardsidebar activeItem={activeItem} />;
}
  return <OrganizerSidebar activeItem={activeItem} />;
}
