const { tournaments } = require("../data/dataStore");

// Create Tournament
const createTournament = (req, res, next) => {
    try {

        const {
        name,
        sport,
        format,
        fixtureType,
        date
    } = req.body;

        const newTournament = {
            id: tournaments.length + 1,
            name,
            sport,
            format,
            fixtureType,
            date,
            status: "Upcoming",
            champion: null
    };

        tournaments.push(newTournament);

        res.status(201).json({
            message: "Tournament created successfully",
            newTournament
        });
    } catch (err) {
        next(err);
    }
};

// Get All Tournaments
const getAllTournaments = (req, res) => {
    res.status(200).json(tournaments);
};

// Get Tournament By ID
const getTournamentById = (req, res) => {
    const id = Number(req.params.id);

    const tournament = tournaments.find(t => t.id === id);

    if (!tournament) {
        return res.status(404).json({
            message: "Tournament not found"
        });
    }

    res.status(200).json(tournament);
};

// Update Tournament
const updateTournament = (req, res) => {
    const id = Number(req.params.id);

    console.log("Updating ID:", id);
    console.log("Current tournaments:", tournaments);

    const tournament = tournaments.find(t => t.id === id);

    if (!tournament) {
        return res.status(404).json({
            message: "Tournament not found"
        });
    }

    tournament.name = req.body.name || tournament.name;
    tournament.sport = req.body.sport || tournament.sport;
    tournament.date = req.body.date || tournament.date;

    res.status(200).json({
        message: "Tournament updated successfully",
        tournament
    });
};

// Delete Tournament
const deleteTournament = (req, res) => {
    const id = Number(req.params.id);

    tournaments = tournaments.filter(t => t.id !== id);

    res.status(200).json({
        message: "Tournament deleted successfully"
    });
};

module.exports = {
    createTournament,
    getAllTournaments,
    getTournamentById,
    updateTournament,
    deleteTournament
};