const express = require("express");
const router = express.Router();

const {
    getLeaderboard
} = require("../controllers/leaderboardController");

router.get("/:tournamentId", getLeaderboard);

module.exports = router;