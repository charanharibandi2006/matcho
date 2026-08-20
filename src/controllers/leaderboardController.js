const { tournaments, fixtures } = require("../data/dataStore");

// =====================================
// Get Tournament Leaderboard
// =====================================
const getLeaderboard = (req, res) => {

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

    // Completed Fixtures Only
    const completedFixtures = fixtures.filter(
        fixture =>
            fixture.tournamentId === tournamentId &&
            fixture.status === "Completed"
    );

    if (completedFixtures.length === 0) {
        return res.status(404).json({
            success: false,
            message: "No completed matches found."
        });
    }

    const leaderboard = {};

    completedFixtures.forEach(fixture => {

        const participantA = fixture.playerA;
        const participantB = fixture.playerB;

        // Skip BYE
        if (participantB === "BYE") {

            if (!leaderboard[participantA]) {

                leaderboard[participantA] = {
                    name: participantA,
                    matches: 0,
                    wins: 0,
                    losses: 0
                };

            }

            leaderboard[participantA].wins++;

            return;
        }

        if (!leaderboard[participantA]) {

            leaderboard[participantA] = {
                name: participantA,
                matches: 0,
                wins: 0,
                losses: 0
            };

        }

        if (!leaderboard[participantB]) {

            leaderboard[participantB] = {
                name: participantB,
                matches: 0,
                wins: 0,
                losses: 0
            };

        }

        leaderboard[participantA].matches++;
        leaderboard[participantB].matches++;

        if (fixture.winner === participantA) {

            leaderboard[participantA].wins++;
            leaderboard[participantB].losses++;

        } else {

            leaderboard[participantB].wins++;
            leaderboard[participantA].losses++;

        }

    });

    const standings = Object.values(leaderboard);

    standings.sort((a, b) => {

        if (b.wins !== a.wins)
            return b.wins - a.wins;

        return a.losses - b.losses;

    });

    standings.forEach((participant, index) => {

        participant.rank = index + 1;

    });

    res.status(200).json({

        success: true,

        tournament: tournament.name,

        leaderboard: standings

    });

};

module.exports = {
    getLeaderboard
};