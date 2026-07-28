const {
    tournaments,
    registrations,
    fixtures
} = require("../data/dataStore");

// ==============================
// Shuffle Players
// ==============================
const shuffleArray = (array) => {
    const shuffled = [...array];

    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
};

// ==============================
// Get Next Round
// ==============================
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

// ==============================
// Get Latest Round
// ==============================
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

// ==============================
// Generate Initial Fixtures
// ==============================
const generateFixtures = (req, res) => {

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

    const players = registrations.filter(
        registration => registration.tournamentId === tournamentId
    );

    if (players.length < 2) {
        return res.status(400).json({
            success: false,
            message: "At least 2 players are required."
        });
    }

    const shuffledPlayers = shuffleArray(players);

    let roundName = "";

    if (players.length <= 2) {
        roundName = "Final";
    } else if (players.length <= 4) {
        roundName = "Semi Final";
    } else if (players.length <= 8) {
        roundName = "Quarter Final";
    } else if (players.length <= 16) {
        roundName = "Round of 16";
    } else {
        roundName = "Round of 32";
    }

    const generatedFixtures = [];

    for (let i = 0; i < shuffledPlayers.length; i += 2) {

        if (i + 1 < shuffledPlayers.length) {

            generatedFixtures.push({
                id: fixtures.length + generatedFixtures.length + 1,
                tournamentId,
                round: roundName,
                playerA: shuffledPlayers[i].playerName,
                playerB: shuffledPlayers[i + 1].playerName,
                playerAScore: 0,
                playerBScore: 0,
                winner: null,
                status: "Upcoming"
            });

        } else {

            generatedFixtures.push({
                id: fixtures.length + generatedFixtures.length + 1,
                tournamentId,
                round: roundName,
                playerA: shuffledPlayers[i].playerName,
                playerB: "BYE",
                playerAScore: 0,
                playerBScore: 0,
                winner: shuffledPlayers[i].playerName,
                status: "Completed"
            });

        }

    }

    fixtures.push(...generatedFixtures);

    tournament.status = "Ongoing";

    res.status(201).json({
        success: true,
        message: "Fixtures generated successfully.",
        fixtures: generatedFixtures
    });

};

// ==============================
// Get Fixtures By Tournament
// ==============================
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

// ==============================
// Update Match Score
// ==============================
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

    // Match already completed
    if (fixture.status === "Completed") {
        return res.status(400).json({
            success: false,
            message: "Score already updated."
        });
    }

    // Draw not allowed
    if (playerAScore === playerBScore) {
        return res.status(400).json({
            success: false,
            message: "Badminton matches cannot end in a draw."
        });
    }

    fixture.playerAScore = playerAScore;
    fixture.playerBScore = playerBScore;

    if (playerAScore > playerBScore) {
        fixture.winner = fixture.playerA;
    } else {
        fixture.winner = fixture.playerB;
    }

    fixture.status = "Completed";

    res.status(200).json({
        success: true,
        message: "Score updated successfully.",
        fixture
    });

};

// ==============================
// Generate Next Round
// ==============================
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

    // Get latest round
    const currentRound = getLatestRound(tournamentFixtures);

    const currentRoundFixtures = tournamentFixtures.filter(
        fixture => fixture.round === currentRound
    );

    // Check pending matches
    const pendingMatches = currentRoundFixtures.some(
        fixture => fixture.status !== "Completed"
    );

    if (pendingMatches) {
        return res.status(400).json({
            success: false,
            message: "Complete all matches before generating next round."
        });
    }

    // Final completed -> Champion
    if (currentRound === "Final") {

        const champion = currentRoundFixtures[0].winner;

        tournament.status = "Completed";
        tournament.champion = champion;

        return res.status(200).json({
            success: true,
            message: "Tournament completed successfully.",
            champion
        });

    }

    const nextRound = getNextRound(currentRound);

    if (!nextRound) {
        return res.status(400).json({
            success: false,
            message: "Unable to determine next round."
        });
    }

    // Prevent duplicate round generation
    const nextRoundExists = tournamentFixtures.some(
        fixture => fixture.round === nextRound
    );

    if (nextRoundExists) {
        return res.status(400).json({
            success: false,
            message: `${nextRound} fixtures already generated.`
        });
    }

    // Collect winners
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

            // BYE
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


module.exports = {
    generateFixtures,
    getFixturesByTournament,
    updateScore,
    generateNextRound
};