const express = require("express");

const router = express.Router();

const authenticateUser =
    require("../middleware/authMiddleware");

const authorizeRoles =
    require("../middleware/authorizeRoles");

const {
    createPlayerProfile,
    getPlayerProfile,
    updatePlayerProfile,
    getPlayerDashboard,
} = require("../controllers/playerController");

// ==========================================
// CREATE PLAYER PROFILE
// ==========================================

router.post(
    "/profile",
    authenticateUser,
    authorizeRoles("Player"),
    createPlayerProfile
);

// ==========================================
// GET PLAYER PROFILE
// ==========================================

router.get(
    "/profile",
    authenticateUser,
    authorizeRoles("Player"),
    getPlayerProfile
);

// ==========================================
// UPDATE PLAYER PROFILE
// ==========================================

router.put(
    "/profile",
    authenticateUser,
    authorizeRoles("Player"),
    updatePlayerProfile
);

// ==========================================
// PLAYER DASHBOARD
// ==========================================

router.get(
    "/dashboard",
    authenticateUser,
    authorizeRoles("Player"),
    getPlayerDashboard
);

module.exports = router;