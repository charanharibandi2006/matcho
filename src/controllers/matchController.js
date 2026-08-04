
// Create Match
const { matches, fixtures } = require("../data/dataStore");

const createMatch = (req, res) => {

    const {
        fixtureId,
        court,
        matchDate,
        startTime,
        endTime,
        referee
    } = req.body;

    // Check Fixture
    const fixture = fixtures.find(
        fixture => fixture.id === fixtureId
    );

    if (!fixture) {

        return res.status(404).json({
            success: false,
            message: "Fixture not found."
        });

    }

    // Already Scheduled
    const alreadyScheduled = matches.find(
        match => match.fixtureId === fixtureId
    );

    if (alreadyScheduled) {

        return res.status(400).json({
            success: false,
            message: "Fixture already scheduled."
        });

    }

    // Court Conflict
    // Check for overlapping schedules on the same court
    const courtBusy = matches.find(match => {

        if (
            match.court !== court ||
            match.matchDate !== matchDate
        ) {
            return false;
        }

        const existingStart = new Date(`1970-01-01T${match.startTime}:00`);
        const existingEnd = new Date(`1970-01-01T${match.endTime}:00`);

        const newStart = new Date(`1970-01-01T${startTime}:00`);
        const newEnd = new Date(`1970-01-01T${endTime}:00`);

        return newStart < existingEnd && newEnd > existingStart;

    });

        if (courtBusy) {

        return res.status(400).json({
            success: false,
            message: "Court already booked during the selected time slot."
        });

    }

    const newMatch = {

        id: matches.length + 1,

        fixtureId,

        tournamentId: fixture.tournamentId,

        court,

        matchDate,

        startTime,

        endTime,

        referee,

        status: "Scheduled"

    };

    matches.push(newMatch);

    res.status(201).json({

        success: true,

        message: "Match scheduled successfully.",

        match: newMatch

    });

    if (newEnd <= newStart) {
    return res.status(400).json({
        success: false,
        message: "End time must be after start time."
    });
}

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