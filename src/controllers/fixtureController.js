const {
    tournaments,
    registrations,
    teams,
    fixtures
} = require("../data/dataStore");

// =====================================
// Shuffle Helper
// =====================================
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
// Get Next Round
// =====================================
const getNextRound = (currentRound) => {

    switch (currentRound) {

        case "Round of 32":
            return "Round of 16";

        case "Round of 16":
            return "Quarter Final";

        case "Quarter Final":
            return "Semi Final";

        case "Semi Final":
            return "Final";

        default:
            return null;

    }

};

// =====================================
// Get Latest Round
// =====================================
const getLatestRound = (fixtures) => {

    const rounds = [
        "Round of 32",
        "Round of 16",
        "Quarter Final",
        "Semi Final",
        "Final"
    ];

    for (let i = rounds.length - 1; i >= 0; i--) {

        const exists = fixtures.some(
            fixture => fixture.round === rounds[i]
        );

        if (exists) {
            return rounds[i];
        }

    }

    return null;

};

// =====================================
// Random Fixture Generation
// =====================================
const generateRandomFixtures = (req, res) => {

    const tournamentId = Number(req.params.tournamentId);

    const tournament = tournaments.find(
        tournament => tournament.id === tournamentId
    );

    if (!tournament) {

        return res.status(404).json({
            success: false,
            message: "Tournament not found."
        });

    }

    const alreadyGenerated = fixtures.some(
        fixture => fixture.tournamentId === tournamentId
    );

    if (alreadyGenerated) {

        return res.status(400).json({
            success: false,
            message: "Fixtures already generated."
        });

    }

    let participants = [];

    // ======================
    // Singles
    // ======================

    if (tournament.format === "Singles") {

        participants = registrations.filter(
            registration => registration.tournamentId === tournamentId
        );

        if (participants.length < 2) {

            return res.status(400).json({
                success: false,
                message: "At least 2 players are required."
            });

        }

    }

    // ======================
    // Doubles
    // ======================

    else if (tournament.format === "Doubles") {

        participants = teams.filter(
            team => team.tournamentId === tournamentId
        );

        if (participants.length < 2) {

            return res.status(400).json({
                success: false,
                message: "At least 2 teams are required."
            });

        }

    }

    else {

        return res.status(400).json({
            success: false,
            message: "Invalid tournament format."
        });

    }

    const shuffledParticipants = shuffleArray(participants);

    let roundName = "";

    if (participants.length <= 2)
        roundName = "Final";
    else if (participants.length <= 4)
        roundName = "Semi Final";
    else if (participants.length <= 8)
        roundName = "Quarter Final";
    else if (participants.length <= 16)
        roundName = "Round of 16";
    else
        roundName = "Round of 32";

    const generatedFixtures = [];

    for (let i = 0; i < shuffledParticipants.length; i += 2) {

        // --------------------
        // Normal Match
        // --------------------

        if (i + 1 < shuffledParticipants.length) {

            let sideA;
            let sideB;

            if (tournament.format === "Singles") {

                sideA = shuffledParticipants[i].playerName;
                sideB = shuffledParticipants[i + 1].playerName;

            } else {

                sideA = shuffledParticipants[i].teamName;
                sideB = shuffledParticipants[i + 1].teamName;

            }

            generatedFixtures.push({

                id: fixtures.length + generatedFixtures.length + 1,

                tournamentId,

                round: roundName,

                playerA: sideA,

                playerB: sideB,

                playerAScore: 0,

                playerBScore: 0,

                winner: null,

                status: "Upcoming"

            });

        }

        // --------------------
        // BYE
        // --------------------

        else {

            const byeParticipant =
                tournament.format === "Singles"
                    ? shuffledParticipants[i].playerName
                    : shuffledParticipants[i].teamName;

            generatedFixtures.push({

                id: fixtures.length + generatedFixtures.length + 1,

                tournamentId,

                round: roundName,

                playerA: byeParticipant,

                playerB: "BYE",

                playerAScore: 0,

                playerBScore: 0,

                winner: byeParticipant,

                status: "Completed"

            });

        }

    }

    fixtures.push(...generatedFixtures);

    tournament.status = "Ongoing";

    res.status(201).json({

        success: true,

        message: "Random fixtures generated successfully.",

        fixtures: generatedFixtures

    });

};

// =====================================
// Manual Fixture Generation
// =====================================
const generateManualFixtures = (req, res) => {

    const tournamentId = Number(req.params.tournamentId);

    const { fixtures: manualFixtures } = req.body;

    const tournament = tournaments.find(
        tournament => tournament.id === tournamentId
    );

    if (!tournament) {
        return res.status(404).json({
            success: false,
            message: "Tournament not found."
        });
    }

    // Prevent duplicate generation
    const alreadyGenerated = fixtures.some(
        fixture => fixture.tournamentId === tournamentId
    );

    if (alreadyGenerated) {
        return res.status(400).json({
            success: false,
            message: "Fixtures already generated."
        });
    }

    if (!Array.isArray(manualFixtures) || manualFixtures.length === 0) {
        return res.status(400).json({
            success: false,
            message: "Fixture list is required."
        });
    }

    let roundName = "";

    if (manualFixtures.length === 1)
        roundName = "Final";
    else if (manualFixtures.length === 2)
        roundName = "Semi Final";
    else if (manualFixtures.length === 4)
        roundName = "Quarter Final";
    else if (manualFixtures.length === 8)
        roundName = "Round of 16";
    else
        roundName = "Round of 32";

    const generatedFixtures = [];

    for (let i = 0; i < manualFixtures.length; i++) {

        generatedFixtures.push({

            id: fixtures.length + generatedFixtures.length + 1,

            tournamentId,

            round: roundName,

            playerA: manualFixtures[i].playerA,

            playerB: manualFixtures[i].playerB,

            playerAScore: 0,

            playerBScore: 0,

            winner: null,

            status: "Upcoming"

        });

    }

    fixtures.push(...generatedFixtures);

    tournament.status = "Ongoing";

    res.status(201).json({

        success: true,

        message: "Manual fixtures generated successfully.",

        fixtures: generatedFixtures

    });

};


// =====================================
// Get Fixtures By Tournament
// =====================================
const getFixturesByTournament = (req, res) => {

    const tournamentId = Number(req.params.tournamentId);

    const tournamentFixtures = fixtures.filter(
        fixture => fixture.tournamentId === tournamentId
    );

    if (tournamentFixtures.length === 0) {
        return res.status(404).json({
            success: false,
            message: "No fixtures found."
        });
    }

    res.status(200).json({
        success: true,
        fixtures: tournamentFixtures
    });

};

// =====================================
// Update Match Score
// =====================================
const updateScore = (req, res) => {

    const fixtureId = Number(req.params.id);

    const {
        playerAScore,
        playerBScore
    } = req.body;

    const fixture = fixtures.find(
        fixture => fixture.id === fixtureId
    );

    if (!fixture) {
        return res.status(404).json({
            success: false,
            message: "Fixture not found."
        });
    }

    if (fixture.status === "Completed") {
        return res.status(400).json({
            success: false,
            message: "Score already updated."
        });
    }

    if (playerAScore === playerBScore) {
        return res.status(400).json({
            success: false,
            message: "Badminton matches cannot end in a draw."
        });
    }

    fixture.playerAScore = playerAScore;
    fixture.playerBScore = playerBScore;

    fixture.winner =
        playerAScore > playerBScore
            ? fixture.playerA
            : fixture.playerB;

    fixture.status = "Completed";

    res.status(200).json({
        success: true,
        message: "Score updated successfully.",
        fixture
    });

};

// =====================================
// Generate Next Round
// =====================================
const generateNextRound = (req, res) => {

    const tournamentId = Number(req.params.tournamentId);

    const tournament = tournaments.find(
        tournament => tournament.id === tournamentId
    );

    if (!tournament) {
        return res.status(404).json({
            success: false,
            message: "Tournament not found."
        });
    }

    const tournamentFixtures = fixtures.filter(
        fixture => fixture.tournamentId === tournamentId
    );

    if (tournamentFixtures.length === 0) {
        return res.status(404).json({
            success: false,
            message: "No fixtures found."
        });
    }

    // Latest completed round
    const currentRound = getLatestRound(tournamentFixtures);

    const currentRoundFixtures = tournamentFixtures.filter(
        fixture => fixture.round === currentRound
    );

    // Pending Matches
    const pendingMatches = currentRoundFixtures.some(
        fixture => fixture.status !== "Completed"
    );

    if (pendingMatches) {

        return res.status(400).json({
            success: false,
            message: "Complete all matches before generating next round."
        });

    }

    // Tournament Completed
    if (currentRound === "Final") {

        tournament.status = "Completed";
        tournament.champion = currentRoundFixtures[0].winner;

        return res.status(200).json({

            success: true,

            message: "Tournament completed successfully.",

            champion: currentRoundFixtures[0].winner

        });

    }

    const nextRound = getNextRound(currentRound);

    if (!nextRound) {

        return res.status(400).json({
            success: false,
            message: "Unable to determine next round."
        });

    }

    // Prevent duplicate rounds
    const alreadyExists = tournamentFixtures.some(
        fixture => fixture.round === nextRound
    );

    if (alreadyExists) {

        return res.status(400).json({
            success: false,
            message: `${nextRound} fixtures already generated.`
        });

    }

    const winners = currentRoundFixtures.map(
        fixture => fixture.winner
    );

    const generatedFixtures = [];

    for (let i = 0; i < winners.length; i += 2) {

        if (i + 1 < winners.length) {

            generatedFixtures.push({

                id: fixtures.length + generatedFixtures.length + 1,

                tournamentId,

                round: nextRound,

                playerA: winners[i],

                playerB: winners[i + 1],

                playerAScore: 0,

                playerBScore: 0,

                winner: null,

                status: "Upcoming"

            });

        } else {

            generatedFixtures.push({

                id: fixtures.length + generatedFixtures.length + 1,

                tournamentId,

                round: nextRound,

                playerA: winners[i],

                playerB: "BYE",

                playerAScore: 0,

                playerBScore: 0,

                winner: winners[i],

                status: "Completed"

            });

        }

    }

    fixtures.push(...generatedFixtures);

    res.status(201).json({

        success: true,

        message: `${nextRound} fixtures generated successfully.`,

        fixtures: generatedFixtures

    });

};

// =====================================
// Exports
// =====================================

module.exports = {

    generateRandomFixtures,
    generateManualFixtures,
    getFixturesByTournament,
    updateScore,
    generateNextRound

};