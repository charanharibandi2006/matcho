const {
    teams,
    tournaments,
    registrations
} = require("../data/dataStore");

// Shuffle Helper
const shuffleArray = (array) => {

    const shuffled = [...array];

    for (let i = shuffled.length - 1; i > 0; i--) {

        const j = Math.floor(Math.random() * (i + 1));

        [shuffled[i], shuffled[j]] =
            [shuffled[j], shuffled[i]];
    }

    return shuffled;

};

// =====================================
// Manual Team Creation
// =====================================

const createTeam = (req, res) => {

    const {
        tournamentId,
        teamName,
        player1,
        player2
    } = req.body;

    // Tournament Exists
    const tournament = tournaments.find(
        tournament => tournament.id == tournamentId
    );

    if (!tournament) {

        return res.status(404).json({
            success: false,
            message: "Tournament not found."
        });

    }

    // Only Doubles
    if (tournament.format !== "Doubles") {

        return res.status(400).json({
            success: false,
            message: "Teams are allowed only for Doubles tournaments."
        });

    }

    // Same Player
    if (player1 === player2) {

        return res.status(400).json({
            success: false,
            message: "Both players cannot be the same."
        });

    }

    // Team Name Duplicate
    const teamExists = teams.find(team =>

        team.tournamentId == tournamentId &&
        team.teamName.toLowerCase() === teamName.toLowerCase()

    );

    if (teamExists) {

        return res.status(400).json({
            success: false,
            message: "Team name already exists."
        });

    }

    // Player Already Exists
    const playerExists = teams.find(team =>

        team.tournamentId == tournamentId &&

        (

            team.player1 === player1 ||

            team.player2 === player1 ||

            team.player1 === player2 ||

            team.player2 === player2

        )

    );

    if (playerExists) {

        return res.status(400).json({

            success: false,

            message: "One of the players already belongs to another team."

        });

    }

    const newTeam = {

        id: teams.length + 1,

        tournamentId,

        teamName,

        player1,

        player2,

        status: "Active"

    };

    teams.push(newTeam);

    res.status(201).json({

        success: true,

        message: "Team created successfully.",

        team: newTeam

    });

};

// =====================================
// Automatic Team Generation
// =====================================

const generateTeams = (req, res) => {

    const tournamentId = Number(req.params.tournamentId);

    // Tournament Exists
    const tournament = tournaments.find(
        tournament => tournament.id === tournamentId
    );

    if (!tournament) {
        return res.status(404).json({
            success: false,
            message: "Tournament not found."
        });
    }

    // Only Doubles
    if (tournament.format !== "Doubles") {
        return res.status(400).json({
            success: false,
            message: "Automatic team generation is only available for Doubles tournaments."
        });
    }

    // Prevent duplicate generation
    const existingTeams = teams.filter(
        team => team.tournamentId === tournamentId
    );

    if (existingTeams.length > 0) {
        return res.status(400).json({
            success: false,
            message: "Teams already generated for this tournament."
        });
    }

    // Get registered players
    const players = registrations.filter(
        registration => registration.tournamentId === tournamentId
    );

    if (players.length < 2) {
        return res.status(400).json({
            success: false,
            message: "At least 2 players are required."
        });
    }

    // Doubles needs even players
    if (players.length % 2 !== 0) {
        return res.status(400).json({
            success: false,
            message: "Doubles requires an even number of players."
        });
    }

    // Shuffle players
    const shuffledPlayers = shuffleArray(players);

    const generatedTeams = [];

    for (let i = 0; i < shuffledPlayers.length; i += 2) {

        const team = {

            id: teams.length + generatedTeams.length + 1,

            tournamentId,

            teamName: `Team ${generatedTeams.length + 1}`,

            player1: shuffledPlayers[i].playerName,

            player2: shuffledPlayers[i + 1].playerName,

            status: "Active"

        };

        generatedTeams.push(team);

    }

    teams.push(...generatedTeams);

    res.status(201).json({
        success: true,
        message: "Teams generated successfully.",
        teams: generatedTeams
    });

};

// Get All Teams
const getAllTeams = (req, res) => {

    res.json({
        success: true,
        teams
    });
};

// Get Team By ID
const getTeamById = (req, res) => {

    const id = parseInt(req.params.id);

    const team = teams.find(team => team.id === id);

    if (!team) {
        return res.status(404).json({
            success: false,
            message: "Team not found"
        });
    }

    res.json({
        success: true,
        team
    });
};

// Update Team
const updateTeam = (req, res) => {

    const id = parseInt(req.params.id);

    const team = teams.find(team => team.id === id);

    if (!team) {
        return res.status(404).json({
            success: false,
            message: "Team not found"
        });
    }

    Object.assign(team, req.body);

    res.json({
        success: true,
        message: "Team updated successfully",
        team
    });
};

// Delete Team
const deleteTeam = (req, res) => {

    const index = teams.findIndex(team => team.id === parseInt(req.params.id));

    if (index === -1) {
        return res.status(404).json({
            success: false,
            message: "Team not found"
        });
    }

    teams.splice(index, 1);

    res.json({
        success: true,
        message: "Team deleted successfully"
    });
};

module.exports = {
    createTeam,
    generateTeams,
    getAllTeams,
    getTeamById,
    updateTeam,
    deleteTeam
};