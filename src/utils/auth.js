// =========================================================
// MATCHO AUTH HELPERS
// =========================================================

const ROLE_KEY = "matcho_portal_role";
const USER_KEY = "matcho_user";
const TOKEN_KEY = "matcho_token";

// =========================================================
// DASHBOARD ROUTES
// =========================================================

export const DASHBOARD_ROUTES = {
  organizer: "/organizer-dashboard",
  "score-viewing": "/",
};

// =========================================================
// SAVE PORTAL ROLE
// =========================================================

export function setRole(role) {
  if (!DASHBOARD_ROUTES[role]) {
    return;
  }

  try {
    sessionStorage.setItem(
      ROLE_KEY,
      role
    );
  } catch {
    // Ignore sessionStorage errors.
  }
}

export function getPortalRole() {
  try {
    const stored =
      sessionStorage.getItem(
        ROLE_KEY
      );

    if (
      stored &&
      DASHBOARD_ROUTES[stored]
    ) {
      return stored;
    }
  } catch {
    // Ignore.
  }

  return null;
}

export function getUserRole() {
  const user =
    getCurrentUser();

  const role =
    String(
      user?.role || ""
    ).toLowerCase();

  if (role === "player") {
    return "player";
  }

  if (role === "organizer") {
    return "organizer";
  }

  if (role === "admin") {
    return "admin";
  }

  return null;
}

export function getRole() {
  return getPortalRole();
}
// =========================================================
// DASHBOARD PATH
// =========================================================

export function getDashboardPath(
  role = getRole()
) {
  return (
    DASHBOARD_ROUTES[role] ||
    "/signin"
  );
}

// =========================================================
// CURRENT USER
// =========================================================

export function getCurrentUser() {
  try {
    const saved =
      localStorage.getItem(
        USER_KEY
      );

    if (!saved) {
      return null;
    }

    return JSON.parse(
      saved
    );
  } catch {
    return null;
  }
}

// =========================================================
// TOKEN
// =========================================================

export function getToken() {
  try {
    return localStorage.getItem(
      TOKEN_KEY
    );
  } catch {
    return null;
  }
}

// =========================================================
// AUTHENTICATION CHECK
// =========================================================

export function isAuthenticated() {
  const token =
    getToken();

  const user =
    getCurrentUser();

  return Boolean(
    token && user
  );
}

// =========================================================
// LOGOUT
// =========================================================

export function logoutUser() {
  try {
    localStorage.removeItem(
      TOKEN_KEY
    );

    localStorage.removeItem(
      USER_KEY
    );

    localStorage.removeItem(
      ROLE_KEY
    );
  } catch {
    // Ignore localStorage errors.
  }
}