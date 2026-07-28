const { matches } = require("../data/dataStore");

// Create Match
const createMatch = (req, res) => {

    const {
        tournamentId,
        teamA,
        teamB,
        venue,
        matchDate,
        matchTime
    } = req.body;

    if (teamA.toLowerCase() === teamB.toLowerCase()) {
    return res.status(400).json({
        success: false,
        message: "A team cannot play against itself."
    });
}

    const newMatch = {
        id: matches.length + 1,
        tournamentId,
        teamA,
        teamB,
        venue,
        matchDate,
        matchTime,
        status: "Upcoming",
        winner: null
    };


    matches.push(newMatch);

    res.status(201).json({
        success: true,
        message: "Match created successfully",
        match: newMatch
    });
};

// Get All Matches
const getAllMatches = (req, res) => {

    res.json({
        success: true,
        matches
    });
};

// Get Match By ID
const getMatchById = (req, res) => {

    const id = parseInt(req.params.id);

    const match = matches.find(match => match.id === id);

    if (!match) {
        return res.status(404).json({
            success: false,
            message: "Match not found"
        });
    }

    res.json({
        success: true,
        match
    });
};

// Update Match
const updateMatch = (req, res) => {

    const id = parseInt(req.params.id);

    const match = matches.find(match => match.id === id);

    if (!match) {
        return res.status(404).json({
            success: false,
            message: "Match not found"
        });
    }

    Object.assign(match, req.body);

    res.json({
        success: true,
        message: "Match updated successfully",
        match
    });
};

// Delete Match
const deleteMatch = (req, res) => {

    const index = matches.findIndex(
        match => match.id === parseInt(req.params.id)
    );

    if (index === -1) {
        return res.status(404).json({
            success: false,
            message: "Match not found"
        });
    }

    matches.splice(index, 1);

    res.json({
        success: true,
        message: "Match deleted successfully"
    });
};

module.exports = {
    createMatch,
    getAllMatches,
    getMatchById,
    updateMatch,
    deleteMatch
};