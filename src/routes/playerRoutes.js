const express = require("express");
const router = express.Router();

const authenticateUser = require("../middleware/authMiddleware");

const {
    createPlayerProfile,
    getPlayerProfile,
    updatePlayerProfile
} = require("../controllers/playerController");

router.post(
    "/profile",
    authenticateUser,
    createPlayerProfile
);

router.get(
    "/profile",
    authenticateUser,
    getPlayerProfile
);

router.put(
    "/profile",
    authenticateUser,
    updatePlayerProfile
);

module.exports = router;