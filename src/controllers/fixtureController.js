const pool = require("../config/db");

// =========================================================
// FIXED MATCH FORMAT
// =========================================================
// Men's:
//   4 pools
//   4 matches per team/player
//   top 2 per pool -> Super 8
//   2 Super 8 matches per team/player
//   top 4 -> Semi-finals -> Final
//
// Women's:
//   < 48 registered participants -> 2 pools -> Semi-finals -> Final
//   >= 48 registered participants -> 4 pools -> Super 8 -> Semi-finals -> Final
// =========================================================

const POOL_BEST_OF = 1;
const SUPER8_BEST_OF = 1;
const KNOCKOUT_BEST_OF = 3;

const MEN_POOL_MATCHES_PER_PARTICIPANT = 4;
const WOMEN_SMALL_POOL_MATCHES_PER_PARTICIPANT = 3;
const WOMEN_LARGE_POOL_MATCHES_PER_PARTICIPANT = 4;

const SUPER8_MATCHES_PER_PARTICIPANT = 2;
const QUALIFIERS_PER_POOL = 2;

const isWomenCategory = (category) => {
    const value = String(category || "").toLowerCase();

    return (
        value.includes("women") ||
        value.includes("female") ||
        value.includes("girls")
    );
};

const getTournamentFormat = (tournament) => {
    const format = String(tournament?.format || "")
        .trim()
        .toLowerCase();

    if (format === "doubles") return "Doubles";
    if (format === "singles") return "Singles";

    return null;
};

const getTournamentRules = (
    tournament,
    registeredParticipantCount = 0
) => {
    const isWomen =
        isWomenCategory(
            tournament?.category
        );

    const largeWomensFormat =
        isWomen &&
        Number(
            registeredParticipantCount
        ) >= 48;

    const super8 =
        !isWomen ||
        largeWomensFormat;

    let poolCount;
    let matchesPerTeam;

    if (!isWomen) {
        // Men's
        poolCount = 4;
        matchesPerTeam =
            MEN_POOL_MATCHES_PER_PARTICIPANT;
    } else if (
        largeWomensFormat
    ) {
        // Women's 48+
        poolCount = 4;
        matchesPerTeam =
            WOMEN_LARGE_POOL_MATCHES_PER_PARTICIPANT;
    } else {
        // Women's under 48
        poolCount = 2;
        matchesPerTeam =
            WOMEN_SMALL_POOL_MATCHES_PER_PARTICIPANT;
    }

    return {
        isWomen,
        largeWomensFormat,
        poolCount,
        super8,
        matchesPerTeam,
        qualifiersPerPool:
            QUALIFIERS_PER_POOL,
        super8MatchesPerTeam:
            super8
                ? SUPER8_MATCHES_PER_PARTICIPANT
                : 0,
        poolBestOf:
            POOL_BEST_OF,
        super8BestOf:
            super8
                ? SUPER8_BEST_OF
                : null,
        semiFinalBestOf:
            KNOCKOUT_BEST_OF,
        finalBestOf:
            KNOCKOUT_BEST_OF,
    };
};

const getRegisteredParticipantCount = async (tournamentId) => {
    const result = await pool.query(
        `
        SELECT COUNT(*)::int AS count
        FROM public.tournament_registrations
        WHERE tournament_id = $1
        `,
        [tournamentId]
    );

    return result.rows[0]?.count || 0;
};

// =========================================================
// SHUFFLE
// =========================================================

const shuffleArray = (array) => {
    const shuffled = [...array];

    for (let i = shuffled.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
};

// =========================================================
// DISTRIBUTE PARTICIPANTS INTO POOLS
// =========================================================

const distributeIntoPools = (participants, poolCount) => {
    if (!Number.isInteger(poolCount) || poolCount < 1) {
        throw new Error("Invalid pool count.");
    }

    if (participants.length % poolCount !== 0) {
        throw new Error(
            `Participants must divide evenly across ${poolCount} pools.`
        );
    }

    const poolSize = participants.length / poolCount;

    if (poolSize < 4) {
        throw new Error(
            `Each pool must contain at least 4 participants.`
        );
    }

    if (poolSize % 2 !== 0) {
        throw new Error(
            `Each pool must contain an even number of participants.`
        );
    }

    const pools = [];

    for (let i = 0; i < poolCount; i += 1) {
        pools.push(
            participants.slice(
                i * poolSize,
                (i + 1) * poolSize
            )
        );
    }

    return pools;
};

// =========================================================
// ROUND-ROBIN SCHEDULE
// =========================================================
// For an even participant count, every participant appears once
// per round. Taking the first N rounds guarantees exactly N
// different opponents for every participant.
// =========================================================

const generateRoundRobinRounds = (participants) => {
    if (participants.length < 2 || participants.length % 2 !== 0) {
        throw new Error(
            "Round-robin scheduling requires an even number of participants."
        );
    }

    const rotation = [...participants];
    const fixed = rotation.shift();
    const rounds = [];
    const totalRounds = participants.length - 1;

    for (let round = 0; round < totalRounds; round += 1) {
        const current = [fixed, ...rotation];
        const matches = [];

        for (let i = 0; i < participants.length / 2; i += 1) {
            matches.push({
                participantA: current[i],
                participantB: current[current.length - 1 - i],
            });
        }

        rounds.push(matches);

        // Circle-method rotation: keep first participant fixed.
        rotation.unshift(rotation.pop());
    }

    return rounds;
};

const generateMatchesForParticipantCount = (
    participants,
    matchesPerParticipant
) => {
    if (participants.length % 2 !== 0) {
        throw new Error(
            "An even number of participants is required for this fixture format."
        );
    }

    if (
        matchesPerParticipant < 1 ||
        matchesPerParticipant > participants.length - 1
    ) {
        throw new Error(
            `A participant can play at most ${participants.length - 1} unique opponents in this group.`
        );
    }

    const rounds = generateRoundRobinRounds(participants);
    const selectedRounds = rounds.slice(0, matchesPerParticipant);

    return selectedRounds.flatMap((round) => round);
};

// =========================================================
// GET TOURNAMENT
// =========================================================

const getTournament = async (tournamentId) => {
    const result = await pool.query(
        `
        SELECT *
        FROM public.tournaments
        WHERE id = $1
        LIMIT 1
        `,
        [tournamentId]
    );

    return result.rows[0] || null;
};

// =========================================================
// TOURNAMENT OWNERSHIP CHECK
// =========================================================

const verifyTournamentOwnership = (req, tournament) => {
    return (
        String(tournament.organizer_id) ===
        String(req.user.id)
    );
};

// =========================================================
// PARTICIPANTS
// =========================================================

const getFixtureParticipants = async (tournamentId, format) => {
    if (format === "Doubles") {
        const result = await pool.query(
            `
            SELECT
                t.id,
                t.team_name AS name
            FROM public.teams t
            WHERE t.tournament_id = $1
            ORDER BY t.id ASC
            `,
            [tournamentId]
        );

        return result.rows.map((team) => ({
            id: team.id,
            name: team.name,
            type: "team",
        }));
    }

    const result = await pool.query(
        `
        SELECT
            r.player_id AS id,
            COALESCE(u.full_name, r.participant_name) AS name
        FROM public.tournament_registrations r
        LEFT JOIN public.users u
            ON u.id = r.player_id
        WHERE r.tournament_id = $1
        ORDER BY r.player_id ASC
        `,
        [tournamentId]
    );

    return result.rows.map((player) => ({
        id: player.id,
        name: player.name,
        type: "player",
    }));
};

// =========================================================
// INSERT FIXTURE
// =========================================================

const insertFixture = async ({
    db = pool,
    tournamentId,
    format,
    stage,
    poolName = null,
    round,
    matchNumber,
    participantAId,
    participantBId,
    bestOf,
}) => {
    if (format === "Doubles") {
        const result = await db.query(
            `
            INSERT INTO public.fixtures
            (
                tournament_id,
                stage,
                pool_name,
                round,
                match_number,
                team_a_id,
                team_b_id,
                player_a_score,
                player_b_score,
                winner_team_id,
                status,
                best_of
            )
            VALUES
            (
                $1, $2, $3, $4, $5,
                $6, $7,
                0, 0,
                NULL,
                'Upcoming',
                $8
            )
            RETURNING *
            `,
            [
                tournamentId,
                stage,
                poolName,
                round,
                matchNumber,
                participantAId,
                participantBId,
                bestOf,
            ]
        );

        return result.rows[0];
    }

    const result = await db.query(
        `
        INSERT INTO public.fixtures
        (
            tournament_id,
            stage,
            pool_name,
            round,
            match_number,
            player_a_id,
            player_b_id,
            player_a_score,
            player_b_score,
            winner_player_id,
            status,
            best_of
        )
        VALUES
        (
            $1, $2, $3, $4, $5,
            $6, $7,
            0, 0,
            NULL,
            'Upcoming',
            $8
        )
        RETURNING *
        `,
        [
            tournamentId,
            stage,
            poolName,
            round,
            matchNumber,
            participantAId,
            participantBId,
            bestOf,
        ]
    );

    return result.rows[0];
};

// =========================================================
// RANDOM INITIAL FIXTURE GENERATION
// =========================================================

const generateRandomFixtures = async (req, res, next) => {
    try {
        const tournamentId = Number(req.params.tournamentId);

        if (!Number.isInteger(tournamentId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid tournament ID.",
            });
        }

        const tournament = await getTournament(tournamentId);

        if (!tournament) {
            return res.status(404).json({
                success: false,
                message: "Tournament not found.",
            });
        }

        if (!verifyTournamentOwnership(req, tournament)) {
            return res.status(403).json({
                success: false,
                message:
                    "You do not have permission to manage this tournament.",
            });
        }

        const format = getTournamentFormat(tournament);

        if (!format) {
            return res.status(400).json({
                success: false,
                message:
                    "Tournament format must be Singles or Doubles.",
            });
        }

        const registeredParticipantCount =
            await getRegisteredParticipantCount(tournamentId);

        const rules = getTournamentRules(
            tournament,
            registeredParticipantCount
        );

        const existingFixtures = await pool.query(
            `
            SELECT id
            FROM public.fixtures
            WHERE tournament_id = $1
            LIMIT 1
            `,
            [tournamentId]
        );

        if (existingFixtures.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message:
                    "Fixtures already generated for this tournament.",
            });
        }

        const participants = await getFixtureParticipants(
            tournamentId,
            format
        );

        const minimumParticipants = rules.poolCount * 4;

        if (participants.length < minimumParticipants) {
            return res.status(400).json({
                success: false,
                message:
                    `${rules.isWomen ? "Women's" : "Men's"} ${format} requires at least ${minimumParticipants} ${format === "Doubles" ? "teams" : "players"}.`,
            });
        }

        if (participants.length % rules.poolCount !== 0) {
            return res.status(400).json({
                success: false,
                message:
                    `Participants must divide evenly across ${rules.poolCount} pools.`,
            });
        }

        const poolSize = participants.length / rules.poolCount;

        const minimumPoolSize = rules.matchesPerTeam + 1;

        if (poolSize < minimumPoolSize) {
            return res.status(400).json({
                success: false,
                message:
                    `Each pool must contain at least ${minimumPoolSize} ${format === "Doubles" ? "teams" : "players"} to play ${rules.matchesPerTeam} matches each.`,
            });
        }

        if (poolSize % 2 !== 0) {
            return res.status(400).json({
                success: false,
                message:
                    `Each pool must contain an even number of ${format === "Doubles" ? "teams" : "players"}.`,
            });
        }

        const client = await pool.connect();

        try {
            await client.query("BEGIN");

            const shuffled = shuffleArray(participants);
            const pools = distributeIntoPools(
                shuffled,
                rules.poolCount
            );

            const generatedFixtures = [];
            const poolSummary = [];

            for (let poolIndex = 0; poolIndex < pools.length; poolIndex += 1) {
                const poolName = `Pool ${String.fromCharCode(65 + poolIndex)}`;
                const poolParticipants = pools[poolIndex];

                const matches = generateMatchesForParticipantCount(
                    poolParticipants,
                    rules.matchesPerTeam
                );

                poolSummary.push({
                    pool: poolName,
                    participantCount: poolParticipants.length,
                    participantIds: poolParticipants.map(
                        (participant) => participant.id
                    ),
                    matchCount: matches.length,
                });

                for (let index = 0; index < matches.length; index += 1) {
                    const match = matches[index];

                    const fixture = await insertFixture({
                        db: client,
                        tournamentId,
                        format,
                        stage: "Pool",
                        poolName,
                        round: "Pool Match",
                        matchNumber: index + 1,
                        participantAId: match.participantA.id,
                        participantBId: match.participantB.id,
                        bestOf: rules.poolBestOf,
                    });

                    generatedFixtures.push(fixture);
                }
            }

            await client.query("COMMIT");

            return res.status(201).json({
                success: true,
                message: `Fixtures generated for ${rules.isWomen ? "women's" : "men's"} ${format} tournament.`,
                configuration: rules,
                pools: poolSummary,
                fixtures: generatedFixtures,
            });
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error(
            "Generate Fixtures Error:",
            error
        );
        next(error);
    }
};

// =========================================================
// GET FIXTURES
// =========================================================

const getFixturesByTournament = async (req, res, next) => {
    try {
        const tournamentId = Number(req.params.tournamentId);

        if (!Number.isInteger(tournamentId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid tournament ID.",
            });
        }

        const result = await pool.query(
            `
            SELECT
                f.id,
                f.tournament_id,
                f.stage,
                f.pool_name,
                f.round,
                f.match_number,

                f.player_a_id,
                ua.full_name AS player_a_name,

                f.player_b_id,
                ub.full_name AS player_b_name,

                f.team_a_id,
                ta.team_name AS team_a_name,

                f.team_b_id,
                tb.team_name AS team_b_name,

                f.player_a_score,
                f.player_b_score,

                f.winner_player_id,
                f.winner_team_id,

                f.status,
                f.best_of,
                f.created_at

            FROM public.fixtures f

            LEFT JOIN public.users ua
                ON ua.id = f.player_a_id

            LEFT JOIN public.users ub
                ON ub.id = f.player_b_id

            LEFT JOIN public.teams ta
                ON ta.id = f.team_a_id

            LEFT JOIN public.teams tb
                ON tb.id = f.team_b_id

            WHERE f.tournament_id = $1

            ORDER BY
                CASE f.stage
                    WHEN 'Pool' THEN 1
                    WHEN 'Super 8' THEN 2
                    WHEN 'Semi Final' THEN 3
                    WHEN 'Final' THEN 4
                    ELSE 5
                END,
                f.pool_name NULLS LAST,
                f.match_number
            `,
            [tournamentId]
        );

        return res.status(200).json({
            success: true,
            tournamentId,
            fixtureCount: result.rows.length,
            fixtures: result.rows,
        });
    } catch (error) {
        console.error(
            "Get Fixtures Error:",
            error
        );
        next(error);
    }
};

// =========================================================
// GET SINGLE FIXTURE
// =========================================================

const getFixtureById = async (req, res, next) => {
    try {
        const fixtureId = Number(req.params.id);

        if (!Number.isInteger(fixtureId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid fixture ID.",
            });
        }

        const result = await pool.query(
            `
            SELECT
                f.id,
                f.tournament_id,
                f.stage,
                f.pool_name,
                f.round,
                f.match_number,

                f.player_a_id,
                ua.full_name AS player_a_name,

                f.player_b_id,
                ub.full_name AS player_b_name,

                f.team_a_id,
                ta.team_name AS team_a_name,

                f.team_b_id,
                tb.team_name AS team_b_name,

                f.player_a_score,
                f.player_b_score,

                f.winner_player_id,
                f.winner_team_id,

                f.status,
                f.best_of,
                f.created_at

            FROM public.fixtures f

            LEFT JOIN public.users ua
                ON ua.id = f.player_a_id

            LEFT JOIN public.users ub
                ON ub.id = f.player_b_id

            LEFT JOIN public.teams ta
                ON ta.id = f.team_a_id

            LEFT JOIN public.teams tb
                ON tb.id = f.team_b_id

            WHERE f.id = $1
            LIMIT 1
            `,
            [fixtureId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Fixture not found.",
            });
        }

        return res.status(200).json({
            success: true,
            fixture: result.rows[0],
        });
    } catch (error) {
        console.error(
            "Get Fixture By ID Error:",
            error
        );

        next(error);
    }
};

// =========================================================
// UPDATE FIXTURE SCORE
// =========================================================

const updateFixtureScore = async (req, res, next) => {
    try {
        const fixtureId = Number(req.params.id);
        const {
            playerAScore,
            playerBScore,
            status,
        } = req.body;

        if (!Number.isInteger(fixtureId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid fixture ID.",
            });
        }

        if (
            !Number.isInteger(playerAScore) ||
            !Number.isInteger(playerBScore)
        ) {
            return res.status(400).json({
                success: false,
                message: "Scores must be integers.",
            });
        }

        if (playerAScore < 0 || playerBScore < 0) {
            return res.status(400).json({
                success: false,
                message: "Scores cannot be negative.",
            });
        }

        if (status !== "Live" && status !== "Completed") {
            return res.status(400).json({
                success: false,
                message: "Status must be Live or Completed.",
            });
        }

       const fixtureResult = await pool.query(
  `
  SELECT
    f.*,
    t.organizer_id
  FROM public.fixtures f
  INNER JOIN public.tournaments t
    ON t.id = f.tournament_id
  WHERE f.id = $1
  LIMIT 1
  `,
  [fixtureId]
);

        if (fixtureResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Fixture not found.",
            });
        }

        const fixture = fixtureResult.rows[0];

        if (
            String(fixture.organizer_id) !==
            String(req.user.id)
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "You do not have permission to update this fixture.",
            });
        }

        if (fixture.status === "Completed") {
            return res.status(400).json({
                success: false,
                message: "Fixture is already completed.",
            });
        }

        let winnerPlayerId = null;
        let winnerTeamId = null;

        if (status === "Completed") {
            const isKnockout =
                fixture.stage === "Semi Final" ||
                fixture.stage === "Final";

            const maxScore = Math.max(
                playerAScore,
                playerBScore
            );

            const minScore = Math.min(
                playerAScore,
                playerBScore
            );

            const scoreDifference =
                maxScore - minScore;

            // Pool / Super 8:
            // 7-0 wins immediately.
            // Any other score continues under 21-point scoring:
            // - Reach 21 with a 2-point lead to win.
            // - At 29-29, the next point (30-29) wins.
            if (!isKnockout) {
                const immediateSevenPointWin =
                    (playerAScore === 7 && playerBScore === 0) ||
                    (playerBScore === 7 && playerAScore === 0);

                const validTwentyOnePointWin =
                    maxScore >= 21 && scoreDifference >= 2;

                const validThirtyPointWin =
                    maxScore === 30 && minScore === 29;

                if (
                    !immediateSevenPointWin &&
                    !validTwentyOnePointWin &&
                    !validThirtyPointWin
                ) {
                    return res.status(400).json({
                        success: false,
                        message:
                            "The match is not over yet. Only 7-0 wins immediately; otherwise reach 21 with a 2-point lead, or win 30-29.",
                    });
                }
            } else {
                // Semi-final / Final: best of 3, each game uses 21-point badminton scoring.
                const validWinningScore =
                    maxScore === 30 ||
                    (maxScore >= 21 && scoreDifference >= 2);

                if (!validWinningScore) {
                    return res.status(400).json({
                        success: false,
                        message:
                            "The game is not over yet. Reach 21 with a 2-point lead, or win 30-29.",
                    });
                }
            }

            const playerAWins =
                playerAScore > playerBScore;

            if (fixture.player_a_id !== null) {
                winnerPlayerId = playerAWins
                    ? fixture.player_a_id
                    : fixture.player_b_id;
            } else {
                winnerTeamId = playerAWins
                    ? fixture.team_a_id
                    : fixture.team_b_id;
            }
        }

        const result = await pool.query(
            `
            UPDATE public.fixtures
            SET
                player_a_score = $1,
                player_b_score = $2,
                winner_player_id = $3,
                winner_team_id = $4,
                status = $5
            WHERE id = $6
            RETURNING *
            `,
            [
                playerAScore,
                playerBScore,
                winnerPlayerId,
                winnerTeamId,
                status,
                fixtureId,
            ]
        );

        const updatedFixture = result.rows[0];

        // --------------------------------------------------
        // SOCKET.IO BROADCAST
        // --------------------------------------------------
        // Broadcast only after PostgreSQL has successfully
        // updated the fixture so all connected viewers receive
        // the database-backed state.
        const io = req.app.get("io");

        if (io && updatedFixture) {
            io.to(
                `tournament:${updatedFixture.tournament_id}`
            ).emit(
                "fixture-score-updated",
                updatedFixture
            );
        }

        return res.status(200).json({
            success: true,
            message:
                status === "Live"
                    ? "Live score updated successfully."
                    : "Fixture completed successfully.",
            fixture: updatedFixture,
        });
    } catch (error) {
        console.error(
            "Update Fixture Score Error:",
            error
        );
        next(error);
    }
};

// =========================================================
// STANDINGS HELPER
// =========================================================

const calculateRankings = (fixtures, isDoubles) => {
    const records = new Map();

    const ensure = (id) => {
        if (id === null || id === undefined) return null;

        const key = String(id);

        if (!records.has(key)) {
            records.set(key, {
                id,
                played: 0,
                wins: 0,
                losses: 0,
                points: 0,
                difference: 0,
            });
        }

        return records.get(key);
    };

    fixtures.forEach((fixture) => {
        const aId = isDoubles
            ? fixture.team_a_id
            : fixture.player_a_id;
        const bId = isDoubles
            ? fixture.team_b_id
            : fixture.player_b_id;

        const a = ensure(aId);
        const b = ensure(bId);

        if (
            fixture.status !== "Completed" ||
            !a ||
            !b
        ) {
            return;
        }

        const scoreA = Number(fixture.player_a_score) || 0;
        const scoreB = Number(fixture.player_b_score) || 0;

        a.played += 1;
        b.played += 1;

        a.difference += scoreA - scoreB;
        b.difference += scoreB - scoreA;

        const winnerId = isDoubles
            ? fixture.winner_team_id
            : fixture.winner_player_id;

        if (String(winnerId) === String(aId)) {
            a.wins += 1;
            a.points += 2;
            b.losses += 1;
        } else if (
            String(winnerId) === String(bId)
        ) {
            b.wins += 1;
            b.points += 2;
            a.losses += 1;
        }
    });

    return Array.from(records.values()).sort(
        (a, b) =>
            b.points - a.points ||
            b.wins - a.wins ||
            b.difference - a.difference ||
            String(a.id).localeCompare(String(b.id))
    );
};

// =========================================================
// GENERATE NEXT ROUND
// =========================================================

const generateNextRound = async (req, res, next) => {
    try {
        const tournamentId = Number(req.params.tournamentId);

        if (!Number.isInteger(tournamentId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid tournament ID.",
            });
        }

        const tournament = await getTournament(tournamentId);

        if (!tournament) {
            return res.status(404).json({
                success: false,
                message: "Tournament not found.",
            });
        }

        if (!verifyTournamentOwnership(req, tournament)) {
            return res.status(403).json({
                success: false,
                message:
                    "You do not have permission to manage this tournament.",
            });
        }

        const format = getTournamentFormat(tournament);

        if (!format) {
            return res.status(400).json({
                success: false,
                message:
                    "Tournament format must be Singles or Doubles.",
            });
        }

        const registeredParticipantCount =
            await getRegisteredParticipantCount(tournamentId);

        const rules = getTournamentRules(
            tournament,
            registeredParticipantCount
        );

        const allFixturesResult = await pool.query(
            `
            SELECT *
            FROM public.fixtures
            WHERE tournament_id = $1
            ORDER BY id ASC
            `,
            [tournamentId]
        );

        const fixtures = allFixturesResult.rows;
        const poolFixtures = fixtures.filter(
            (fixture) => fixture.stage === "Pool"
        );
        const super8Fixtures = fixtures.filter(
            (fixture) => fixture.stage === "Super 8"
        );
        const semifinalFixtures = fixtures.filter(
            (fixture) => fixture.stage === "Semi Final"
        );

        if (poolFixtures.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No pool fixtures found.",
            });
        }

        const poolIncomplete = poolFixtures.filter(
            (fixture) => fixture.status !== "Completed"
        );

        if (poolIncomplete.length > 0) {
            return res.status(400).json({
                success: false,
                message:
                    "All pool matches must be completed before generating the next round.",
                remainingMatches: poolIncomplete.length,
            });
        }

        const client = await pool.connect();

        try {
            await client.query("BEGIN");

            // --------------------------------------------------
            // MEN'S: POOL -> SUPER 8
            // --------------------------------------------------

            if (rules.super8 && super8Fixtures.length === 0) {
                const poolStandings = {};

                const poolNames = Array.from(
                    new Set(
                        poolFixtures
                            .map((fixture) => fixture.pool_name)
                            .filter(Boolean)
                    )
                ).sort();

                if (poolNames.length !== 4) {
                    return await rollbackAndSend(
                        client,
                        res,
                        400,
                        "Men's tournaments require exactly 4 pools."
                    );
                }

                for (const poolName of poolNames) {
                    const poolRows = poolFixtures.filter(
                        (fixture) =>
                            fixture.pool_name === poolName
                    );

                    const rankings = calculateRankings(
                        poolRows,
                        format === "Doubles"
                    );

                    if (rankings.length < 2) {
                        return await rollbackAndSend(
                            client,
                            res,
                            400,
                            `${poolName} must have at least 2 participants.`
                        );
                    }

                    poolStandings[poolName] = rankings;
                }

                const qualifiers = poolNames.flatMap(
                    (poolName) =>
                        poolStandings[poolName].slice(
                            0,
                            rules.qualifiersPerPool
                        )
                );

                if (qualifiers.length !== 8) {
                    return await rollbackAndSend(
                        client,
                        res,
                        400,
                        "Exactly 8 teams/players must qualify for the Super 8."
                    );
                }

                const matches = generateMatchesForParticipantCount(
                    qualifiers.map((participant) => ({
                        id: participant.id,
                        name: String(participant.id),
                    })),
                    rules.super8MatchesPerTeam
                );

                const generated = [];

                for (let i = 0; i < matches.length; i += 1) {
                    const match = matches[i];

                    const fixture = await insertFixture({
                        db: client,
                        tournamentId,
                        format,
                        stage: "Super 8",
                        poolName: "Super 8",
                        round: "Super 8 Match",
                        matchNumber: i + 1,
                        participantAId: match.participantA.id,
                        participantBId: match.participantB.id,
                        bestOf: rules.super8BestOf,
                    });

                    generated.push(fixture);
                }

                await client.query("COMMIT");

                return res.status(201).json({
                    success: true,
                    message:
                        "Super 8 fixtures generated successfully.",
                    fixtures: generated,
                });
            }

            // --------------------------------------------------
            // MEN'S: SUPER 8 -> SEMI-FINALS
            // --------------------------------------------------

            if (
                rules.super8 &&
                super8Fixtures.length > 0 &&
                semifinalFixtures.length === 0
            ) {
                const super8Incomplete = super8Fixtures.filter(
                    (fixture) => fixture.status !== "Completed"
                );

                if (super8Incomplete.length > 0) {
                    await client.query("ROLLBACK");
                    return res.status(400).json({
                        success: false,
                        message:
                            "All Super 8 matches must be completed before generating the semi-finals.",
                        remainingMatches:
                            super8Incomplete.length,
                    });
                }

                const rankings = calculateRankings(
                    super8Fixtures,
                    format === "Doubles"
                );

                if (rankings.length !== 8) {
                    await client.query("ROLLBACK");
                    return res.status(400).json({
                        success: false,
                        message:
                            "The Super 8 must contain exactly 8 participants before generating the semi-finals.",
                    });
                }

                const semifinalParticipants = [
                    rankings[0],
                    rankings[1],
                    rankings[2],
                    rankings[3],
                ];

                const semifinalMatches = [
                    [
                        semifinalParticipants[0].id,
                        semifinalParticipants[3].id,
                    ],
                    [
                        semifinalParticipants[1].id,
                        semifinalParticipants[2].id,
                    ],
                ];

                const generated = [];

                for (let i = 0; i < semifinalMatches.length; i += 1) {
                    const [participantAId, participantBId] =
                        semifinalMatches[i];

                    const fixture = await insertFixture({
                        db: client,
                        tournamentId,
                        format,
                        stage: "Semi Final",
                        round: "Semi Final",
                        matchNumber: i + 1,
                        participantAId,
                        participantBId,
                        bestOf: rules.semiFinalBestOf,
                    });

                    generated.push(fixture);
                }

                await client.query("COMMIT");

                return res.status(201).json({
                    success: true,
                    message:
                        "Semi-final fixtures generated successfully.",
                    fixtures: generated,
                });
            }

            // --------------------------------------------------
            // WOMEN'S: POOL -> SEMI-FINALS
            // --------------------------------------------------

            if (!rules.super8 && semifinalFixtures.length === 0) {
                const poolNames = Array.from(
                    new Set(
                        poolFixtures
                            .map((fixture) => fixture.pool_name)
                            .filter(Boolean)
                    )
                ).sort();

                if (poolNames.length !== 2) {
                    return await rollbackAndSend(
                        client,
                        res,
                        400,
                        "Women's tournaments require exactly 2 pools."
                    );
                }

                const rankedA = calculateRankings(
                    poolFixtures.filter(
                        (fixture) =>
                            fixture.pool_name === poolNames[0]
                    ),
                    format === "Doubles"
                );

                const rankedB = calculateRankings(
                    poolFixtures.filter(
                        (fixture) =>
                            fixture.pool_name === poolNames[1]
                    ),
                    format === "Doubles"
                );

                if (rankedA.length < 2 || rankedB.length < 2) {
                    return await rollbackAndSend(
                        client,
                        res,
                        400,
                        "Each pool must have at least 2 participants."
                    );
                }

                const semifinalMatches = [
                    [rankedA[0].id, rankedB[1].id],
                    [rankedB[0].id, rankedA[1].id],
                ];

                const generated = [];

                for (let i = 0; i < semifinalMatches.length; i += 1) {
                    const [participantAId, participantBId] =
                        semifinalMatches[i];

                    const fixture = await insertFixture({
                        db: client,
                        tournamentId,
                        format,
                        stage: "Semi Final",
                        round: "Semi Final",
                        matchNumber: i + 1,
                        participantAId,
                        participantBId,
                        bestOf: rules.semiFinalBestOf,
                    });

                    generated.push(fixture);
                }

                await client.query("COMMIT");

                return res.status(201).json({
                    success: true,
                    message:
                        "Semi-final fixtures generated successfully.",
                    fixtures: generated,
                });
            }

            await client.query("ROLLBACK");

            return res.status(400).json({
                success: false,
                message:
                    "The next round is not available yet or has already been generated.",
            });
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error(
            "Generate Next Round Error:",
            error
        );
        next(error);
    }
};

const rollbackAndSend = async (
    client,
    res,
    status,
    message
) => {
    await client.query("ROLLBACK");
    return res.status(status).json({
        success: false,
        message,
    });
};

// =========================================================
// GENERATE FINAL
// =========================================================

const generateFinal = async (req, res, next) => {
    try {
        const tournamentId = Number(req.params.tournamentId);

        if (!Number.isInteger(tournamentId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid tournament ID.",
            });
        }

        const tournament = await getTournament(tournamentId);

        if (!tournament) {
            return res.status(404).json({
                success: false,
                message: "Tournament not found.",
            });
        }

        if (!verifyTournamentOwnership(req, tournament)) {
            return res.status(403).json({
                success: false,
                message:
                    "You do not have permission to manage this tournament.",
            });
        }

        const format = getTournamentFormat(tournament);

        if (!format) {
            return res.status(400).json({
                success: false,
                message:
                    "Tournament format must be Singles or Doubles.",
            });
        }

        const registeredParticipantCount =
            await getRegisteredParticipantCount(tournamentId);

        const rules = getTournamentRules(
            tournament,
            registeredParticipantCount
        );

        const existingFinal = await pool.query(
            `
            SELECT id
            FROM public.fixtures
            WHERE tournament_id = $1
              AND stage = 'Final'
            LIMIT 1
            `,
            [tournamentId]
        );

        if (existingFinal.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message:
                    "Final fixture has already been generated.",
            });
        }

        const semifinalResult = await pool.query(
            `
            SELECT
                id,
                match_number,
                player_a_id,
                player_b_id,
                team_a_id,
                team_b_id,
                winner_player_id,
                winner_team_id,
                status
            FROM public.fixtures
            WHERE tournament_id = $1
              AND stage = 'Semi Final'
            ORDER BY match_number ASC
            `,
            [tournamentId]
        );

        const semifinals = semifinalResult.rows;

        if (semifinals.length !== 2) {
            return res.status(400).json({
                success: false,
                message:
                    "Exactly 2 semifinal fixtures are required before generating the final.",
            });
        }

        if (
            semifinals.some(
                (semifinal) =>
                    semifinal.status !== "Completed"
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Both semifinal matches must be completed before generating the final.",
            });
        }

        const winnerA =
            format === "Doubles"
                ? semifinals[0].winner_team_id
                : semifinals[0].winner_player_id;

        const winnerB =
            format === "Doubles"
                ? semifinals[1].winner_team_id
                : semifinals[1].winner_player_id;

        if (!winnerA || !winnerB) {
            return res.status(400).json({
                success: false,
                message:
                    "Both semifinal winners are required to generate the final.",
            });
        }

        const final = await insertFixture({
            tournamentId,
            format,
            stage: "Final",
            round: "Final",
            matchNumber: 1,
            participantAId: winnerA,
            participantBId: winnerB,
            bestOf: rules.finalBestOf,
        });

        return res.status(201).json({
            success: true,
            message:
                "Final fixture generated successfully.",
            final,
        });
    } catch (error) {
        console.error(
            "Generate Final Error:",
            error
        );
        next(error);
    }
};

module.exports = {
    generateRandomFixtures,
    getFixturesByTournament,
    getFixtureById,
    updateFixtureScore,
    generateNextRound,
    generateFinal,
};