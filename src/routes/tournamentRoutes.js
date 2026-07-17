const express = require("express");
const router = express.Router();
const { tournamentValidation } = require("../validators/tournamentValidator");
const validate = require("../middleware/validate");
const {
    createTournament,
    getAllTournaments,
    getTournamentById,
    updateTournament,
    deleteTournament
} = require("../controllers/tournamentController");

router.post(
    "/",
    tournamentValidation,
    validate,
    createTournament
);
router.get("/", getAllTournaments);
router.get("/:id", getTournamentById);
router.put("/:id", updateTournament);
router.delete("/:id", deleteTournament);

module.exports = router;