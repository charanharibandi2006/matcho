import {
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";

import {
  isAuthenticated,
  getUserRole,
} from "../utils/auth";

export default function ProtectedRoute({
  allowedRoles = [],
}) {
  const location =
    useLocation();

  if (!isAuthenticated()) {
    return (
      <Navigate
        to="/signin"
        replace
        state={{
          from:
            location.pathname +
            location.search,
        }}
      />
    );
  }

  const userRole =
    getUserRole();

  if (
    allowedRoles.length > 0 &&
    !allowedRoles.includes(
      userRole
    )
  ) {
    if (
      userRole === "organizer"
    ) {
      return (
        <Navigate
          to="/organizer-dashboard"
          replace
        />
      );
    }

    if (
      userRole === "player"
    ) {
      return (
        <Navigate
          to="/player-dashboard"
          replace
        />
      );
    }

    return (
      <Navigate
        to="/signin"
        replace
      />
    );
  }

  return <Outlet />;
}