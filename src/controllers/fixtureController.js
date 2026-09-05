const pool = require("../config/db");

const parseBoolean = (value) => {
    if (typeof value === "boolean") return value;
    return String(value || "").trim().toLowerCase() === "true";
};


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

    if (poolSize < 2) {
        throw new Error(
            `Each pool must contain at least 2 participants.`
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
    if (participants.length < 2) {
        throw new Error(
            "At least 2 participants are required for fixture generation."
        );
    }

    const rotation = [...participants];

    // Add a BYE slot for odd-sized groups.
    if (rotation.length % 2 !== 0) {
        rotation.push(null);
    }

    const rounds = [];
    const totalRounds = rotation.length - 1;
    const fixed = rotation.shift();

    for (let round = 0; round < totalRounds; round += 1) {
        const current = [fixed, ...rotation];
        const matches = [];

        for (let i = 0; i < current.length / 2; i += 1) {
            const participantA = current[i];
            const participantB = current[current.length - 1 - i];

            if (participantA && participantB) {
                matches.push({
                    participantA,
                    participantB,
                });
            }
        }

        rounds.push(matches);
        rotation.unshift(rotation.pop());
    }

    return rounds;
};

const generateMatchesForParticipantCount = (
    participants,
    matchesPerParticipant
) => {
    const target = Number(matchesPerParticipant);

    if (!Number.isInteger(target) || target < 1) {
        throw new Error("Matches per team must be at least 1.");
    }

    if (participants.length < 2) {
        throw new Error("At least 2 participants are required for fixture generation.");
    }

    const counts = new Map(
        participants.map((participant) => [String(participant.id), 0])
    );
    const selected = [];
    let cycle = 0;

    while ([...counts.values()].some((count) => count < target)) {
        const rounds = generateRoundRobinRounds(shuffleArray(participants));
        let addedThisCycle = false;

        for (const round of rounds) {
            for (const match of round) {
                const aKey = String(match.participantA.id);
                const bKey = String(match.participantB.id);

                if (counts.get(aKey) < target && counts.get(bKey) < target) {
                    selected.push(match);
                    counts.set(aKey, counts.get(aKey) + 1);
                    counts.set(bKey, counts.get(bKey) + 1);
                    addedThisCycle = true;
                }
            }
        }

        cycle += 1;
        if (!addedThisCycle || cycle > target + 2) break;
    }

    if ([...counts.values()].some((count) => count < target)) {
        throw new Error(
            "Unable to generate fixtures for the selected matches-per-team configuration."
        );
    }

    return selected;
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
            COALESCE(r.participant_name, u.full_name) AS name
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
// FIXTURE SETUP
// =========================================================

const getFixtureSetup = async (req, res, next) => {
    try {
        const tournamentId = Number(req.params.tournamentId);

        if (!Number.isInteger(tournamentId) || tournamentId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid tournament ID.",
            });
        }

        const result = await pool.query(
            `
            SELECT
                id,
                tournament_id,
                pool_count,
                teams_per_pool,
                group_matches_per_team,
                super8_enabled,
                super8_qualifiers,
                created_at,
                updated_at,
                super8_matches_per_team
            FROM public.tournament_fixture_settings
            WHERE tournament_id = $1
            LIMIT 1
            `,
            [tournamentId]
        );

        return res.status(200).json({
            success: true,
            setup: result.rows[0] || null,
        });
    } catch (error) {
        console.error("Get Fixture Setup Error:", error);
        next(error);
    }
};

const saveFixtureSetup = async (req, res, next) => {
    try {
        const tournamentId = Number(req.params.tournamentId);
        const { poolCount, groupMatchesPerTeam, super8Enabled, super8MatchesPerTeam } = req.body;

        if (!Number.isInteger(tournamentId) || tournamentId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid tournament ID.",
            });
        }

        const normalizedPoolCount = Number(poolCount);
        const normalizedGroupMatches = Number(groupMatchesPerTeam);
        const wantsSuper8 = parseBoolean(super8Enabled);
        const normalizedSuper8Matches = Number(super8MatchesPerTeam);

        if (!Number.isInteger(normalizedPoolCount) || normalizedPoolCount < 1) {
            return res.status(400).json({
                success: false,
                message: "Number of pools must be at least 1.",
            });
        }

        if (!Number.isInteger(normalizedGroupMatches) || normalizedGroupMatches < 1) {
            return res.status(400).json({
                success: false,
                message: "Group-stage matches per team must be at least 1.",
            });
        }

        if (wantsSuper8) {
            if (!Number.isInteger(normalizedSuper8Matches) || normalizedSuper8Matches < 1) {
                return res.status(400).json({
                    success: false,
                    message: "Super 8 matches per team must be at least 1.",
                });
            }
            if (![1, 2, 4, 8].includes(normalizedPoolCount)) {
                return res.status(400).json({
                    success: false,
                    message: "When Super 8 is enabled, use 1, 2, 4, or 8 pools so exactly 8 teams can qualify evenly.",
                });
            }
        }

        const tournamentResult = await pool.query(
            `
            SELECT id, format
            FROM public.tournaments
            WHERE id = $1
            LIMIT 1
            `,
            [tournamentId]
        );

        if (tournamentResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Tournament not found.",
            });
        }

        const format = getTournamentFormat(tournamentResult.rows[0]);
        if (!format) {
            return res.status(400).json({
                success: false,
                message: "Tournament format must be Singles or Doubles.",
            });
        }

        const participants = await getFixtureParticipants(tournamentId, format);
        const totalParticipants = participants.length;

        if (totalParticipants < 2) {
            return res.status(400).json({
                success: false,
                message: "At least 2 teams/players are required before fixture setup.",
            });
        }

        if (totalParticipants % normalizedPoolCount !== 0) {
            return res.status(400).json({
                success: false,
                message: `${totalParticipants} teams/players cannot be divided equally into ${normalizedPoolCount} pools.`,
            });
        }

        const teamsPerPool = totalParticipants / normalizedPoolCount;

        if (teamsPerPool < 2) {
            return res.status(400).json({
                success: false,
                message: "Each pool must contain at least 2 teams/players.",
            });
        }

        if (wantsSuper8 && totalParticipants < 8) {
            return res.status(400).json({
                success: false,
                message: "At least 8 teams/players are required for Super 8.",
            });
        }

        const result = await pool.query(
            `
            INSERT INTO public.tournament_fixture_settings
            (
                tournament_id,
                pool_count,
                teams_per_pool,
                group_matches_per_team,
                super8_enabled,
                super8_qualifiers,
                super8_matches_per_team,
                updated_at
            )
            VALUES ($1, $2, $3, $4, $5, 8, $6, CURRENT_TIMESTAMP)
            ON CONFLICT (tournament_id)
            DO UPDATE SET
                pool_count = EXCLUDED.pool_count,
                teams_per_pool = EXCLUDED.teams_per_pool,
                group_matches_per_team = EXCLUDED.group_matches_per_team,
                super8_enabled = EXCLUDED.super8_enabled,
                super8_qualifiers = 8,
                super8_matches_per_team = EXCLUDED.super8_matches_per_team,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *
            `,
            [
                tournamentId,
                normalizedPoolCount,
                teamsPerPool,
                normalizedGroupMatches,
                wantsSuper8,
                wantsSuper8 ? normalizedSuper8Matches : null,
            ]
        );

        return res.status(200).json({
            success: true,
            message: "Fixture setup saved successfully.",
            setup: result.rows[0],
        });
    } catch (error) {
        console.error("Save Fixture Setup Error:", error);
        next(error);
    }
};

const getSavedFixtureSetup = async (tournamentId) => {
    const result = await pool.query(
        `
        SELECT
            pool_count,
            teams_per_pool,
            group_matches_per_team,
            super8_enabled,
            super8_qualifiers,
            super8_matches_per_team
        FROM public.tournament_fixture_settings
        WHERE tournament_id = $1
        LIMIT 1
        `,
        [tournamentId]
    );
    return result.rows[0] || null;
};

// =========================================================
// RANDOM INITIAL FIXTURE GENERATION
// =========================================================

const generateRandomFixtures = async (req, res, next) => {
    try {
        const tournamentId = Number(req.params.tournamentId);
        if (!Number.isInteger(tournamentId) || tournamentId <= 0) {
            return res.status(400).json({ success: false, message: "Invalid tournament ID." });
        }

        const tournament = await getTournament(tournamentId);
        if (!tournament) {
            return res.status(404).json({ success: false, message: "Tournament not found." });
        }

        const format = getTournamentFormat(tournament);
        if (!format) {
            return res.status(400).json({ success: false, message: "Tournament format must be Singles or Doubles." });
        }

        const setup = await getSavedFixtureSetup(tournamentId);
        if (!setup) {
            return res.status(400).json({ success: false, message: "Fixture setup has not been configured yet." });
        }

        const existingFixtures = await pool.query(
            `SELECT id FROM public.fixtures WHERE tournament_id = $1 LIMIT 1`,
            [tournamentId]
        );
        if (existingFixtures.rows.length > 0) {
            return res.status(400).json({ success: false, message: "Fixtures already generated for this tournament." });
        }

        const participants = await getFixtureParticipants(tournamentId, format);
        const poolCount = Number(setup.pool_count);
        const teamsPerPool = Number(setup.teams_per_pool);
        const groupMatchesPerTeam = Number(setup.group_matches_per_team);
        const super8Enabled = Boolean(setup.super8_enabled);
        const super8MatchesPerTeam = super8Enabled ? Number(setup.super8_matches_per_team) : 0;

        if (participants.length !== poolCount * teamsPerPool) {
            return res.status(400).json({
                success: false,
                message: `The current participant/team count (${participants.length}) does not match the saved setup (${poolCount} × ${teamsPerPool}).`,
            });
        }

        if (super8Enabled && (participants.length < 8 || ![1, 2, 4, 8].includes(poolCount))) {
            return res.status(400).json({
                success: false,
                message: "Invalid Super 8 configuration.",
            });
        }

        // Pool membership must be decided before fixtures are generated.
        // The organizer can either save it manually or generate it randomly
        // from the pool-assignment UI.
        const poolRows = await getPoolParticipantRows(
            tournamentId,
            format
        );

        if (poolRows.length !== participants.length) {
            return res.status(400).json({
                success: false,
                message:
                    "All teams/players must be assigned to pools before generating fixtures.",
            });
        }

        const participantMap = new Map(
            participants.map((participant) => [
                String(participant.id),
                participant,
            ])
        );

        const pools = Array.from(
            { length: poolCount },
            (_, index) => ({
                poolNumber: index + 1,
                participants: [],
            })
        );

        const seenParticipants = new Set();

        for (const row of poolRows) {
            const participantId =
                format === "Doubles"
                    ? row.team_id
                    : row.player_id;

            const poolNumber = Number(row.pool_number);

            if (
                !Number.isInteger(poolNumber) ||
                poolNumber < 1 ||
                poolNumber > poolCount
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid pool assignment found.",
                });
            }

            const participant =
                participantMap.get(String(participantId));

            if (!participant) {
                return res.status(400).json({
                    success: false,
                    message:
                        "A saved pool member no longer exists.",
                });
            }

            if (seenParticipants.has(String(participantId))) {
                return res.status(400).json({
                    success: false,
                    message:
                        "A team/player cannot belong to more than one pool.",
                });
            }

            seenParticipants.add(String(participantId));

            pools[poolNumber - 1].participants.push(
                participant
            );
        }

        if (seenParticipants.size !== participants.length) {
            return res.status(400).json({
                success: false,
                message:
                    "Every team/player must be assigned to exactly one pool.",
            });
        }

        for (const poolData of pools) {
            if (poolData.participants.length !== teamsPerPool) {
                return res.status(400).json({
                    success: false,
                    message:
                        `Pool ${String.fromCharCode(65 + poolData.poolNumber - 1)} must contain exactly ${teamsPerPool} teams/players.`,
                });
            }
        }

        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            const generatedFixtures = [];
            const poolSummary = [];

            for (let poolIndex = 0; poolIndex < pools.length; poolIndex += 1) {
                const poolName =
                    `Pool ${String.fromCharCode(65 + poolIndex)}`;

                const poolParticipants =
                    pools[poolIndex].participants;

                const matches =
                    generateMatchesForParticipantCount(
                        poolParticipants,
                        groupMatchesPerTeam
                    );

                poolSummary.push({
                    pool: poolName,
                    participantCount:
                        poolParticipants.length,
                    participantIds:
                        poolParticipants.map(
                            (participant) => participant.id
                        ),
                    matchCount: matches.length,
                });

                for (
                    let index = 0;
                    index < matches.length;
                    index += 1
                ) {
                    const match = matches[index];

                    generatedFixtures.push(
                        await insertFixture({
                            db: client,
                            tournamentId,
                            format,
                            stage: "Pool",
                            poolName,
                            round: "Pool Match",
                            matchNumber: index + 1,
                            participantAId:
                                match.participantA.id,
                            participantBId:
                                match.participantB.id,
                            bestOf: POOL_BEST_OF,
                        })
                    );
                }
            }

            await client.query("COMMIT");

            return res.status(201).json({
                success: true,
                message:
                    "Pool fixtures generated successfully.",
                configuration: {
                    poolCount,
                    teamsPerPool,
                    groupMatchesPerTeam,
                    super8Enabled,
                    super8MatchesPerTeam:
                        super8Enabled
                            ? super8MatchesPerTeam
                            : null,
                    super8Qualifiers:
                        super8Enabled ? 8 : 0,
                },
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
        console.error("Generate Fixtures Error:", error);
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

COALESCE(
    (
        SELECT JSON_AGG(
            JSON_BUILD_OBJECT(
                'id', tm.player_id,
                'name',
                COALESCE(
                    tr.participant_name,
                    u.full_name,
                    'Player'
                )
            )
            ORDER BY tm.id
        )
        FROM public.team_members tm
        LEFT JOIN public.tournament_registrations tr
            ON tr.tournament_id = f.tournament_id
           AND tr.player_id = tm.player_id
        LEFT JOIN public.users u
            ON u.id = tm.player_id
        WHERE tm.team_id = f.team_a_id
    ),
    '[]'::json
) AS team_a_members,

f.team_b_id,
tb.team_name AS team_b_name,

COALESCE(
    (
        SELECT JSON_AGG(
            JSON_BUILD_OBJECT(
                'id', tm.player_id,
                'name',
                COALESCE(
                    tr.participant_name,
                    u.full_name,
                    'Player'
                )
            )
            ORDER BY tm.id
        )
        FROM public.team_members tm
        LEFT JOIN public.tournament_registrations tr
            ON tr.tournament_id = f.tournament_id
           AND tr.player_id = tm.player_id
        LEFT JOIN public.users u
            ON u.id = tm.player_id
        WHERE tm.team_id = f.team_b_id
    ),
    '[]'::json
) AS team_b_members,

f.player_a_score,
f.player_b_score,
f.game_scores,

f.serving_side,

                f.winner_player_id,
                f.winner_team_id,

                f.status,
                f.best_of,
                f.created_at,
                f.completed_at

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
// UPDATE FIXTURE SCORE
// =========================================================

const updateFixtureScore = async (req, res, next) => {
    try {
        const fixtureId = Number(req.params.id);
        const {
            playerAScore,
            playerBScore,
            status,
            servingSide,
            gameScores
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

        if (
            servingSide !== undefined &&
            servingSide !== null &&
            servingSide !== "A" &&
            servingSide !== "B"
        ) {
            return res.status(400).json({
                success: false,
                message: "servingSide must be A or B.",
            });
        }

        if (
            gameScores !== undefined &&
            gameScores !== null &&
            !Array.isArray(gameScores)
        ) {
            return res.status(400).json({
                success: false,
                message: "gameScores must be an array.",
            });
        }

        const fixtureResult = await pool.query(
            `
            SELECT *
            FROM public.fixtures
            WHERE id = $1
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

        const nextServingSide =
            servingSide !== undefined
                ? servingSide
                : fixture.serving_side || null;

        const nextGameScores =
            gameScores !== undefined
                ? gameScores
                : Array.isArray(fixture.game_scores)
                    ? fixture.game_scores
                    : [];

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
                status = $5,
                serving_side = $6,
                game_scores = $7,
                completed_at = CASE
                    WHEN $5 = 'Completed' THEN COALESCE(completed_at, NOW())
                    ELSE completed_at
                END
            WHERE id = $8
            RETURNING *
            `,
            [
                playerAScore,
                playerBScore,
                winnerPlayerId,
                winnerTeamId,
                status,
                nextServingSide,
                JSON.stringify(nextGameScores),
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
        if (!Number.isInteger(tournamentId) || tournamentId <= 0) {
            return res.status(400).json({ success: false, message: "Invalid tournament ID." });
        }

        const tournament = await getTournament(tournamentId);
        if (!tournament) {
            return res.status(404).json({ success: false, message: "Tournament not found." });
        }

        const format = getTournamentFormat(tournament);
        if (!format) {
            return res.status(400).json({ success: false, message: "Tournament format must be Singles or Doubles." });
        }

        const setup = await getSavedFixtureSetup(tournamentId);
        if (!setup) {
            return res.status(400).json({ success: false, message: "Fixture setup not found." });
        }

        const result = await pool.query(
            `SELECT * FROM public.fixtures WHERE tournament_id = $1 ORDER BY id ASC`,
            [tournamentId]
        );
        const tournamentFixtures = result.rows;
        const poolFixtures = tournamentFixtures.filter((fixture) => fixture.stage === "Pool");
        const super8Fixtures = tournamentFixtures.filter((fixture) => fixture.stage === "Super 8");
        const semifinalFixtures = tournamentFixtures.filter((fixture) => fixture.stage === "Semi Final");
        const super8Enabled = Boolean(setup.super8_enabled);
        const poolCount = Number(setup.pool_count);
        const super8MatchesPerTeam = Number(setup.super8_matches_per_team);

        if (poolFixtures.length === 0) {
            return res.status(400).json({ success: false, message: "No pool fixtures found." });
        }

        if (poolFixtures.some((fixture) => fixture.status !== "Completed")) {
            return res.status(400).json({ success: false, message: "All pool matches must be completed before generating the next round." });
        }

        const client = await pool.connect();
        try {
            await client.query("BEGIN");

            // Pool -> Super 8
            if (super8Enabled && super8Fixtures.length === 0) {
                if (![1, 2, 4, 8].includes(poolCount)) {
                    return await rollbackAndSend(client, res, 400, "When Super 8 is enabled, the pool count must be 1, 2, 4, or 8.");
                }

                const poolNames = Array.from(
                    new Set(poolFixtures.map((fixture) => fixture.pool_name).filter(Boolean))
                ).sort();

                if (poolNames.length !== poolCount) {
                    return await rollbackAndSend(client, res, 400, "The saved pool configuration does not match the generated fixtures.");
                }

                const qualifiersPerPool = 8 / poolCount;
                const qualifiers = [];

                for (const poolName of poolNames) {
                    const rankings = calculateRankings(
                        poolFixtures.filter((fixture) => fixture.pool_name === poolName),
                        format === "Doubles"
                    );
                    if (rankings.length < qualifiersPerPool) {
                        return await rollbackAndSend(client, res, 400, `${poolName} does not have enough ranked participants.`);
                    }
                    qualifiers.push(...rankings.slice(0, qualifiersPerPool));
                }

                if (qualifiers.length !== 8) {
                    return await rollbackAndSend(client, res, 400, "Exactly 8 teams/players must qualify for the Super 8.");
                }

                const super8Participants = qualifiers.map((item) => ({ id: item.id, name: String(item.id) }));
                const matches = generateMatchesForParticipantCount(super8Participants, super8MatchesPerTeam);
                const generated = [];

                for (let i = 0; i < matches.length; i += 1) {
                    const match = matches[i];
                    generated.push(await insertFixture({
                        db: client,
                        tournamentId,
                        format,
                        stage: "Super 8",
                        poolName: "Super 8",
                        round: "Super 8 Match",
                        matchNumber: i + 1,
                        participantAId: match.participantA.id,
                        participantBId: match.participantB.id,
                        bestOf: SUPER8_BEST_OF,
                    }));
                }

                await client.query("COMMIT");
                return res.status(201).json({ success: true, message: "Super 8 fixtures generated successfully.", fixtures: generated });
            }

            // Super 8 -> Semi Finals
            if (super8Enabled && super8Fixtures.length > 0 && semifinalFixtures.length === 0) {
                if (super8Fixtures.some((fixture) => fixture.status !== "Completed")) {
                    await client.query("ROLLBACK");
                    return res.status(400).json({ success: false, message: "All Super 8 matches must be completed before generating the semi-finals." });
                }

                const rankings = calculateRankings(super8Fixtures, format === "Doubles");
                if (rankings.length !== 8) {
                    await client.query("ROLLBACK");
                    return res.status(400).json({ success: false, message: "The Super 8 must contain exactly 8 participants before generating the semi-finals." });
                }

                const semifinalMatches = [
                    [rankings[0].id, rankings[3].id],
                    [rankings[1].id, rankings[2].id],
                ];
                const generated = [];

                for (let i = 0; i < semifinalMatches.length; i += 1) {
                    generated.push(await insertFixture({
                        db: client,
                        tournamentId,
                        format,
                        stage: "Semi Final",
                        round: "Semi Final",
                        matchNumber: i + 1,
                        participantAId: semifinalMatches[i][0],
                        participantBId: semifinalMatches[i][1],
                        bestOf: KNOCKOUT_BEST_OF,
                    }));
                }

                await client.query("COMMIT");
                return res.status(201).json({ success: true, message: "Semi-final fixtures generated successfully.", fixtures: generated });
            }

            // No Super 8 -> Top 4 overall -> Semi Finals
            if (!super8Enabled && semifinalFixtures.length === 0) {
                const allRanked = [];
                const poolNames = Array.from(new Set(poolFixtures.map((fixture) => fixture.pool_name).filter(Boolean))).sort();

                for (const poolName of poolNames) {
                    const rankings = calculateRankings(
                        poolFixtures.filter((fixture) => fixture.pool_name === poolName),
                        format === "Doubles"
                    );
                    allRanked.push(...rankings);
                }

                allRanked.sort(
                    (a, b) =>
                        b.points - a.points ||
                        b.wins - a.wins ||
                        b.difference - a.difference ||
                        String(a.id).localeCompare(String(b.id))
                );

                const topFour = allRanked.slice(0, 4);
                if (topFour.length !== 4) {
                    await client.query("ROLLBACK");
                    return res.status(400).json({ success: false, message: "At least 4 qualified teams/players are required for the semi-finals." });
                }

                const generated = [];
                for (let i = 0; i < 4; i += 2) {
                    generated.push(await insertFixture({
                        db: client,
                        tournamentId,
                        format,
                        stage: "Semi Final",
                        round: "Semi Final",
                        matchNumber: i / 2 + 1,
                        participantAId: topFour[i].id,
                        participantBId: topFour[i + 1].id,
                        bestOf: KNOCKOUT_BEST_OF,
                    }));
                }

                await client.query("COMMIT");
                return res.status(201).json({ success: true, message: "Semi-final fixtures generated successfully.", fixtures: generated });
            }

            await client.query("ROLLBACK");
            return res.status(400).json({ success: false, message: "The next round is not available yet or has already been generated." });
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error("Generate Next Round Error:", error);
        next(error);
    }
};

const rollbackAndSend = async (client, res, status, message) => {
    await client.query("ROLLBACK");
    return res.status(status).json({ success: false, message });
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

        const format = getTournamentFormat(tournament);

        if (!format) {
            return res.status(400).json({
                success: false,
                message:
                    "Tournament format must be Singles or Doubles.",
            });
        }


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
            bestOf: KNOCKOUT_BEST_OF,
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


// =========================================================
// SWAP UPCOMING FIXTURE OPPONENTS
// =========================================================

const swapUpcomingFixtureSides = async (req, res, next) => {
    const client = await pool.connect();

    try {
        const {
            fixtureId,
            fixtureSide,
            swapFixtureId,
            swapSide,
        } = req.body;

        const firstFixtureId = Number(fixtureId);
        const secondFixtureId = Number(swapFixtureId);

        if (
            !Number.isInteger(firstFixtureId) ||
            !Number.isInteger(secondFixtureId) ||
            firstFixtureId === secondFixtureId
        ) {
            return res.status(400).json({
                success: false,
                message: "Two different fixture IDs are required.",
            });
        }

        if (
            !["A", "B"].includes(fixtureSide) ||
            !["A", "B"].includes(swapSide)
        ) {
            return res.status(400).json({
                success: false,
                message: "fixtureSide and swapSide must be A or B.",
            });
        }

        await client.query("BEGIN");

        const fixtureResult = await client.query(
            `
            SELECT
                id,
                tournament_id,
                stage,
                pool_name,
                status,
                player_a_id,
                player_b_id,
                team_a_id,
                team_b_id
            FROM public.fixtures
            WHERE id = ANY($1::int[])
            ORDER BY id
            FOR UPDATE
            `,
            [[firstFixtureId, secondFixtureId]]
        );

        if (fixtureResult.rows.length !== 2) {
            throw new Error(
                "One or both fixtures could not be found."
            );
        }

        const first =
            fixtureResult.rows.find(
                (fixture) =>
                    Number(fixture.id) === firstFixtureId
            );

        const second =
            fixtureResult.rows.find(
                (fixture) =>
                    Number(fixture.id) === secondFixtureId
            );

        if (
            first.status !== "Upcoming" ||
            second.status !== "Upcoming"
        ) {
            throw new Error(
                "Only upcoming fixtures can be swapped."
            );
        }

        if (
            Number(first.tournament_id) !==
            Number(second.tournament_id)
        ) {
            throw new Error(
                "Fixtures must belong to the same tournament."
            );
        }

        if (first.stage !== second.stage) {
            throw new Error(
                "Fixtures must belong to the same stage."
            );
        }

        if (
            String(first.stage || "").toLowerCase() ===
            "pool" &&
            String(first.pool_name || "") !==
            String(second.pool_name || "")
        ) {
            throw new Error(
                "Pool fixtures can only be swapped within the same pool."
            );
        }

        const isDoubles =
            first.team_a_id !== null ||
            first.team_b_id !== null ||
            second.team_a_id !== null ||
            second.team_b_id !== null;

        const firstA =
            isDoubles
                ? first.team_a_id
                : first.player_a_id;

        const firstB =
            isDoubles
                ? first.team_b_id
                : first.player_b_id;

        const secondA =
            isDoubles
                ? second.team_a_id
                : second.player_a_id;

        const secondB =
            isDoubles
                ? second.team_b_id
                : second.player_b_id;

        const firstSelected =
            fixtureSide === "A"
                ? firstA
                : firstB;

        const secondSelected =
            swapSide === "A"
                ? secondA
                : secondB;

        const firstOther =
            fixtureSide === "A"
                ? firstB
                : firstA;

        const secondOther =
            swapSide === "A"
                ? secondB
                : secondA;

        if (
            firstSelected === null ||
            firstSelected === undefined ||
            secondSelected === null ||
            secondSelected === undefined
        ) {
            throw new Error(
                "Both selected sides must contain a player or team."
            );
        }

        if (
            String(firstSelected) ===
            String(secondSelected)
        ) {
            throw new Error(
                "The selected opponents are already the same."
            );
        }

        if (
            String(secondSelected) ===
            String(firstOther)
        ) {
            throw new Error(
                "This swap would create a duplicate opponent in the first fixture."
            );
        }

        if (
            String(firstSelected) ===
            String(secondOther)
        ) {
            throw new Error(
                "This swap would create a duplicate opponent in the second fixture."
            );
        }

        // Make sure the new pairings do not already exist elsewhere
        // in this tournament/stage. This keeps swaps from creating
        // duplicate opponents later in the schedule.
        const participantColumnA = isDoubles
            ? "team_a_id"
            : "player_a_id";
        const participantColumnB = isDoubles
            ? "team_b_id"
            : "player_b_id";

        const pairingResult = await client.query(
            `
            SELECT
                id,
                ${participantColumnA} AS participant_a,
                ${participantColumnB} AS participant_b
            FROM public.fixtures
            WHERE tournament_id = $1
              AND stage = $2
              AND id NOT IN ($3, $4)
            `,
            [
                first.tournament_id,
                first.stage,
                firstFixtureId,
                secondFixtureId,
            ]
        );

        const hasPair = (a, b) =>
            pairingResult.rows.some((row) =>
                row.participant_a != null &&
                row.participant_b != null &&
                ((String(row.participant_a) === String(a) &&
                    String(row.participant_b) === String(b)) ||
                    (String(row.participant_a) === String(b) &&
                        String(row.participant_b) === String(a)))
            );

        // After the swap: firstOther vs secondSelected,
        // and secondOther vs firstSelected.
        if (hasPair(firstOther, secondSelected)) {
            throw new Error(
                "This swap would create a duplicate opponent in the first fixture."
            );
        }

        if (hasPair(secondOther, firstSelected)) {
            throw new Error(
                "This swap would create a duplicate opponent in the second fixture."
            );
        }

        if (isDoubles) {
            const firstColumn =
                fixtureSide === "A"
                    ? "team_a_id"
                    : "team_b_id";

            const secondColumn =
                swapSide === "A"
                    ? "team_a_id"
                    : "team_b_id";

            await client.query(
                `
                UPDATE public.fixtures
                SET ${firstColumn} = $1
                WHERE id = $2
                `,
                [secondSelected, firstFixtureId]
            );

            await client.query(
                `
                UPDATE public.fixtures
                SET ${secondColumn} = $1
                WHERE id = $2
                `,
                [firstSelected, secondFixtureId]
            );
        } else {
            const firstColumn =
                fixtureSide === "A"
                    ? "player_a_id"
                    : "player_b_id";

            const secondColumn =
                swapSide === "A"
                    ? "player_a_id"
                    : "player_b_id";

            await client.query(
                `
                UPDATE public.fixtures
                SET ${firstColumn} = $1
                WHERE id = $2
                `,
                [secondSelected, firstFixtureId]
            );

            await client.query(
                `
                UPDATE public.fixtures
                SET ${secondColumn} = $1
                WHERE id = $2
                `,
                [firstSelected, secondFixtureId]
            );
        }

        await client.query("COMMIT");

        return res.status(200).json({
            success: true,
            message: "Upcoming fixture opponents swapped successfully.",
            fixtureIds: [
                firstFixtureId,
                secondFixtureId,
            ],
        });
    } catch (error) {
        await client.query("ROLLBACK");

        console.error(
            "Swap Upcoming Fixtures Error:",
            error
        );

        return res.status(400).json({
            success: false,
            message:
                error.message ||
                "Unable to swap upcoming fixture opponents.",
        });
    } finally {
        client.release();
    }
};

// =========================================================
// POOL ASSIGNMENT HELPERS
// =========================================================

const getPoolParticipantRows = async (
    tournamentId,
    format
) => {
    const result = await pool.query(
        `
        SELECT
            tpm.id,
            tpm.tournament_id,
            tpm.pool_number,
            tpm.team_id,
            tpm.player_id,

            CASE
                WHEN $2 = 'Doubles'
                    THEN t.team_name
                ELSE COALESCE(u.full_name, tr.participant_name)
            END AS participant_name

        FROM public.tournament_pool_members tpm

        LEFT JOIN public.teams t
            ON t.id = tpm.team_id

        LEFT JOIN public.users u
            ON u.id = tpm.player_id

        LEFT JOIN public.tournament_registrations tr
            ON tr.tournament_id = tpm.tournament_id
            AND tr.player_id = tpm.player_id

        WHERE tpm.tournament_id = $1

        ORDER BY
            tpm.pool_number ASC,
            tpm.id ASC
        `,
        [tournamentId, format]
    );

    return result.rows;
};


// =========================================================
// VALIDATE SAVED POOLS
// =========================================================

const validatePoolAssignments = async (
    tournamentId,
    format,
    pools,
    setup
) => {
    const participants =
        await getFixtureParticipants(
            tournamentId,
            format
        );

    const expectedTotal =
        participants.length;

    const poolCount =
        Number(setup.pool_count);

    const teamsPerPool =
        Number(setup.teams_per_pool);

    if (
        !Number.isInteger(poolCount) ||
        poolCount < 1
    ) {
        throw new Error(
            "Invalid pool count."
        );
    }

    if (
        !Number.isInteger(teamsPerPool) ||
        teamsPerPool < 2
    ) {
        throw new Error(
            "Invalid teams per pool."
        );
    }

    if (
        !Array.isArray(pools) ||
        pools.length !== poolCount
    ) {
        throw new Error(
            `Exactly ${poolCount} pools are required.`
        );
    }

    const validIds = new Set(
        participants.map(
            (participant) =>
                String(participant.id)
        )
    );

    const seen = new Set();

    for (
        const poolData of pools
    ) {

        if (
            !Number.isInteger(
                Number(poolData.poolNumber)
            )
        ) {
            throw new Error(
                "Invalid pool number."
            );
        }

        const memberIds =
            Array.isArray(
                poolData.participantIds
            )
                ? poolData.participantIds
                : [];

        if (
            memberIds.length !==
            teamsPerPool
        ) {
            throw new Error(
                `Pool ${poolData.poolNumber} must contain exactly ${teamsPerPool} teams/players.`
            );
        }

        for (
            const rawId of memberIds
        ) {

            const id =
                String(rawId);

            if (
                !validIds.has(id)
            ) {
                throw new Error(
                    `Invalid team/player ID: ${rawId}`
                );
            }

            if (
                seen.has(id)
            ) {
                throw new Error(
                    "A team/player cannot belong to more than one pool."
                );
            }

            seen.add(id);
        }
    }

    if (
        seen.size !==
        expectedTotal
    ) {
        throw new Error(
            `All ${expectedTotal} teams/players must be assigned to a pool.`
        );
    }

    return participants;
};


// =========================================================
// GET POOL ASSIGNMENTS
// =========================================================

const getPoolAssignments = async (
    req,
    res,
    next
) => {

    try {

        const tournamentId =
            Number(
                req.params.tournamentId
            );

        if (
            !Number.isInteger(
                tournamentId
            ) ||
            tournamentId <= 0
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid tournament ID."
            });
        }

        const tournament =
            await getTournament(
                tournamentId
            );

        if (!tournament) {
            return res.status(404).json({
                success: false,
                message:
                    "Tournament not found."
            });
        }

        const format =
            getTournamentFormat(
                tournament
            );

        if (!format) {
            return res.status(400).json({
                success: false,
                message:
                    "Tournament format must be Singles or Doubles."
            });
        }

        const setup =
            await getSavedFixtureSetup(
                tournamentId
            );

        if (!setup) {
            return res.status(400).json({
                success: false,
                message:
                    "Fixture setup must be configured first."
            });
        }

        const rows =
            await getPoolParticipantRows(
                tournamentId,
                format
            );

        const poolCount =
            Number(setup.pool_count);

        const pools =
            Array.from(
                { length: poolCount },
                (_, index) => ({
                    poolNumber: index + 1,
                    members: []
                })
            );

        rows.forEach((row) => {

            const pool =
                pools.find(
                    (item) =>
                        item.poolNumber ===
                        Number(row.pool_number)
                );

            if (!pool) return;

            pool.members.push({
                id:
                    format === "Doubles"
                        ? row.team_id
                        : row.player_id,

                name:
                    row.participant_name ||
                    "Unnamed",

                type: format === "Doubles"
                    ? "team"
                    : "player"
            });
        });

        return res.status(200).json({
            success: true,
            tournamentId,
            poolCount,
            teamsPerPool:
                Number(setup.teams_per_pool),
            pools
        });

    } catch (error) {

        console.error(
            "Get Pool Assignments Error:",
            error
        );

        next(error);
    }
};


// =========================================================
// RANDOM POOL ASSIGNMENT
// =========================================================

const randomizePoolAssignments = async (
    req,
    res,
    next
) => {

    const client =
        await pool.connect();

    try {

        const tournamentId =
            Number(
                req.params.tournamentId
            );

        const tournament =
            await getTournament(
                tournamentId
            );

        if (!tournament) {
            return res.status(404).json({
                success: false,
                message:
                    "Tournament not found."
            });
        }

        const format =
            getTournamentFormat(
                tournament
            );

        const setup =
            await getSavedFixtureSetup(
                tournamentId
            );

        if (!setup) {
            return res.status(400).json({
                success: false,
                message:
                    "Save the fixture setup first."
            });
        }

        const existingFixtures =
            await pool.query(
                `
                SELECT id
                FROM public.fixtures
                WHERE tournament_id = $1
                LIMIT 1
                `,
                [tournamentId]
            );

        if (
            existingFixtures.rows.length
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Pools cannot be changed after fixtures have been generated."
            });
        }

        const participants =
            await getFixtureParticipants(
                tournamentId,
                format
            );

        const poolCount =
            Number(setup.pool_count);

        const teamsPerPool =
            Number(setup.teams_per_pool);

        if (
            participants.length !==
            poolCount * teamsPerPool
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Current team/player count does not match the saved fixture setup."
            });
        }

        const shuffled =
            shuffleArray(
                participants
            );

        await client.query(
            "BEGIN"
        );

        await client.query(
            `
            DELETE FROM public.tournament_pool_members
            WHERE tournament_id = $1
            `,
            [tournamentId]
        );

        for (
            let i = 0;
            i < shuffled.length;
            i++
        ) {

            const poolNumber =
                Math.floor(
                    i / teamsPerPool
                ) + 1;

            const participant =
                shuffled[i];

            if (
                format === "Doubles"
            ) {

                await client.query(
                    `
                    INSERT INTO public.tournament_pool_members
                    (
                        tournament_id,
                        pool_number,
                        team_id
                    )
                    VALUES ($1, $2, $3)
                    `,
                    [
                        tournamentId,
                        poolNumber,
                        participant.id
                    ]
                );

            } else {

                await client.query(
                    `
                    INSERT INTO public.tournament_pool_members
                    (
                        tournament_id,
                        pool_number,
                        player_id
                    )
                    VALUES ($1, $2, $3)
                    `,
                    [
                        tournamentId,
                        poolNumber,
                        participant.id
                    ]
                );
            }
        }

        await client.query(
            "COMMIT"
        );

        return getPoolAssignments(
            {
                params: {
                    tournamentId
                }
            },
            res,
            next
        );

    } catch (error) {

        await client.query(
            "ROLLBACK"
        );

        console.error(
            "Random Pool Assignment Error:",
            error
        );

        next(error);

    } finally {

        client.release();
    }
};


// =========================================================
// SAVE MANUAL POOL ASSIGNMENTS
// =========================================================

const savePoolAssignments = async (
    req,
    res,
    next
) => {

    const client =
        await pool.connect();

    try {

        const tournamentId =
            Number(
                req.params.tournamentId
            );

        const {
            pools
        } = req.body;

        const tournament =
            await getTournament(
                tournamentId
            );

        if (!tournament) {
            return res.status(404).json({
                success: false,
                message:
                    "Tournament not found."
            });
        }

        const format =
            getTournamentFormat(
                tournament
            );

        const setup =
            await getSavedFixtureSetup(
                tournamentId
            );

        if (!setup) {
            return res.status(400).json({
                success: false,
                message:
                    "Save the fixture setup first."
            });
        }

        const existingFixtures =
            await pool.query(
                `
                SELECT id
                FROM public.fixtures
                WHERE tournament_id = $1
                LIMIT 1
                `,
                [tournamentId]
            );

        if (
            existingFixtures.rows.length
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Pool assignments cannot be changed after fixtures are generated."
            });
        }

        await validatePoolAssignments(
            tournamentId,
            format,
            pools,
            setup
        );

        await client.query(
            "BEGIN"
        );

        await client.query(
            `
            DELETE FROM public.tournament_pool_members
            WHERE tournament_id = $1
            `,
            [tournamentId]
        );

        for (
            const poolData of pools
        ) {

            for (
                const participantId
                of poolData.participantIds
            ) {

                if (
                    format === "Doubles"
                ) {

                    await client.query(
                        `
                        INSERT INTO public.tournament_pool_members
                        (
                            tournament_id,
                            pool_number,
                            team_id
                        )
                        VALUES ($1, $2, $3)
                        `,
                        [
                            tournamentId,
                            Number(poolData.poolNumber),
                            Number(participantId)
                        ]
                    );

                } else {

                    await client.query(
                        `
                        INSERT INTO public.tournament_pool_members
                        (
                            tournament_id,
                            pool_number,
                            player_id
                        )
                        VALUES ($1, $2, $3)
                        `,
                        [
                            tournamentId,
                            Number(poolData.poolNumber),
                            Number(participantId)
                        ]
                    );
                }
            }
        }

        await client.query(
            "COMMIT"
        );

        return getPoolAssignments(
            {
                params: {
                    tournamentId
                }
            },
            res,
            next
        );

    } catch (error) {

        await client.query(
            "ROLLBACK"
        );

        console.error(
            "Save Pool Assignments Error:",
            error
        );

        return res.status(400).json({
            success: false,
            message:
                error.message ||
                "Unable to save pool assignments."
        });

    } finally {

        client.release();
    }
};


// =========================================================
// CLEAR POOL ASSIGNMENTS
// =========================================================

const clearPoolAssignments = async (
    req,
    res,
    next
) => {

    try {

        const tournamentId =
            Number(
                req.params.tournamentId
            );

        const result =
            await pool.query(
                `
                DELETE FROM public.tournament_pool_members
                WHERE tournament_id = $1
                `,
                [tournamentId]
            );

        return res.status(200).json({
            success: true,
            message:
                "Pool assignments cleared.",
            deleted:
                result.rowCount
        });

    } catch (error) {

        console.error(
            "Clear Pool Assignments Error:",
            error
        );

        next(error);
    }
};

module.exports = {
    generateRandomFixtures,
    getFixturesByTournament,
    updateFixtureScore,
    swapUpcomingFixtureSides,
    generateNextRound,
    generateFinal,
    getFixtureSetup,
    saveFixtureSetup,
    getPoolAssignments,
randomizePoolAssignments,
savePoolAssignments,
clearPoolAssignments,
};