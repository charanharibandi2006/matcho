const {
    tournaments,
    registrations,
    teams,
    fixtures
} = require("../data/dataStore");

const pool = require("../config/db");

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
// FIXTURE SETUP HELPERS
// =====================================

const parseBoolean = (value) => {
    if (typeof value === "boolean") {
        return value;
    }

    return String(value || "")
        .trim()
        .toLowerCase() === "true";
};

const getSavedFixtureSetup = async (tournamentId) => {
    const result = await pool.query(
        `
        SELECT
            pool_count,
            teams_per_pool,
            group_matches_per_team,
            super8_enabled,
            super8_matches_per_team,
            super8_qualifiers
        FROM public.tournament_fixture_settings
        WHERE tournament_id = $1
        LIMIT 1
        `,
        [tournamentId]
    );

    return result.rows[0] || null;
};

const getTournamentFixtureTeams = (tournament) => {
    if (tournament.format === "Singles") {
        return registrations.filter(
            registration =>
                registration.tournamentId ===
                tournament.id
        );
    }

    if (tournament.format === "Doubles") {
        return teams.filter(
            team =>
                team.tournamentId ===
                tournament.id
        );
    }

    return [];
};

const getParticipantName = (
    participant,
    format
) => {
    return format === "Singles"
        ? participant.playerName
        : participant.teamName;
};

// =====================================
// ROUND-ROBIN MATCH GENERATION
// =====================================
// Generates the requested target number of
// matches per participant. The organizer decides
// the target; the scheduler does not impose a
// fixed application-level match limit. If more
// matches are requested than unique opponents,
// additional round-robin cycles are reused.
// =====================================

const generateRoundRobinMatches = (
    poolParticipants,
    matchesPerTeam
) => {
    const count = poolParticipants.length;

    if (count < 2) {
        return [];
    }

    const targetMatches =
        Number(matchesPerTeam);

    if (
        !Number.isInteger(targetMatches) ||
        targetMatches < 1
    ) {
        throw new Error(
            "Matches per team must be at least 1."
        );
    }

    const rounds =
        buildRoundRobinRounds(
            poolParticipants
        );

    if (rounds.length === 0) {
        return [];
    }

    /*
     * The organizer chooses the target number of matches.
     * We do not impose a product-level upper limit.
     *
     * If the requested number is greater than the number
     * of unique opponents, additional round-robin cycles
     * are repeated.
     *
     * For odd-sized pools with an odd target number,
     * an exactly equal schedule is mathematically impossible.
     * In that case the scheduler continues until every
     * participant has reached at least the requested target.
     */
    const playedCount = new Map();

    poolParticipants.forEach(
        participant => {
            playedCount.set(
                getParticipantKey(
                    participant
                ),
                0
            );
        }
    );

    const selected = [];

    let cycle = 0;

    while (
        Array.from(
            playedCount.values()
        ).some(
            count =>
                count < targetMatches
        )
    ) {
        const currentRounds =
            buildRoundRobinRounds(
                shuffleArray(
                    poolParticipants
                )
            );

        let addedInCycle = false;

        for (
            const roundMatches
            of currentRounds
        ) {
            for (
                const match
                of roundMatches
            ) {
                const aKey =
                    getParticipantKey(
                        match.participantA
                    );

                const bKey =
                    getParticipantKey(
                        match.participantB
                    );

                const aNeeds =
                    playedCount.get(
                        aKey
                    ) <
                    targetMatches;

                const bNeeds =
                    playedCount.get(
                        bKey
                    ) <
                    targetMatches;

                if (
                    !aNeeds &&
                    !bNeeds
                ) {
                    continue;
                }

                selected.push(
                    match
                );

                playedCount.set(
                    aKey,
                    (
                        playedCount.get(
                            aKey
                        ) || 0
                    ) + 1
                );

                playedCount.set(
                    bKey,
                    (
                        playedCount.get(
                            bKey
                        ) || 0
                    ) + 1
                );

                addedInCycle = true;
            }
        }

        cycle += 1;

        if (
            !addedInCycle ||
            cycle > targetMatches + 2
        ) {
            break;
        }
    }

    if (
        !poolParticipants.every(
            participant =>
                (
                    playedCount.get(
                        getParticipantKey(
                            participant
                        )
                    ) || 0
                ) >= targetMatches
        )
    ) {
        throw new Error(
            "Unable to generate fixtures for the selected matches-per-team configuration."
        );
    }

    return selected;
};

const buildRoundRobinRounds = (
    participants
) => {
    const rotation =
        [...participants];

    if (
        rotation.length % 2 !== 0
    ) {
        rotation.push(null);
    }

    const rounds = [];

    const fixed =
        rotation.shift();

    const totalRounds =
        rotation.length;

    for (
        let round = 0;
        round < totalRounds;
        round += 1
    ) {
        const current = [
            fixed,
            ...rotation
        ];

        const roundMatches = [];

        for (
            let i = 0;
            i < current.length / 2;
            i += 1
        ) {
            const participantA =
                current[i];

            const participantB =
                current[
                    current.length -
                    1 -
                    i
                ];

            if (
                participantA &&
                participantB
            ) {
                roundMatches.push({
                    participantA,
                    participantB
                });
            }
        }

        rounds.push(
            roundMatches
        );

        rotation.unshift(
            rotation.pop()
        );
    }

    return rounds;
};

const getParticipantKey = (participant) => {
    if (!participant) {
        return null;
    }

    return String(
        participant.id ??
        participant.playerId ??
        participant.teamId ??
        participant.playerName ??
        participant.teamName
    );
};

// =====================================
// GET FIXTURE SETUP
// =====================================

const getFixtureSetup = async (
    req,
    res,
    next
) => {
    try {
        const tournamentId =
            Number(req.params.tournamentId);

        if (
            !Number.isInteger(tournamentId) ||
            tournamentId <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid tournament ID."
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
                super8_matches_per_team,
                super8_qualifiers
            FROM public.tournament_fixture_settings
            WHERE tournament_id = $1
            LIMIT 1
            `,
            [tournamentId]
        );

        return res.status(200).json({
            success: true,
            setup:
                result.rows[0] || null
        });
    } catch (error) {
        console.error(
            "Get Fixture Setup Error:",
            error
        );

        next(error);
    }
};

// =====================================
// SAVE FIXTURE SETUP
// =====================================

const saveFixtureSetup = async (
    req,
    res,
    next
) => {
    try {
        const tournamentId =
            Number(req.params.tournamentId);

        const {
            poolCount,
            teamsPerPool,
            groupMatchesPerTeam,
            super8Enabled,
            super8MatchesPerTeam
        } = req.body;

        const normalizedPoolCount =
            Number(poolCount);

        const normalizedTeamsPerPool =
            Number(teamsPerPool);

        const normalizedGroupMatchesPerTeam =
            Number(groupMatchesPerTeam);

        const normalizedSuper8MatchesPerTeam =
            Number(super8MatchesPerTeam);

        const wantsSuper8 =
            parseBoolean(super8Enabled);

        if (
            !Number.isInteger(tournamentId) ||
            tournamentId <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid tournament ID."
            });
        }

        if (
            !Number.isInteger(
                normalizedPoolCount
            ) ||
            normalizedPoolCount < 1
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Number of pools must be at least 1."
            });
        }

        if (
            !Number.isInteger(
                normalizedTeamsPerPool
            ) ||
            normalizedTeamsPerPool < 2
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Each pool must contain at least 2 teams."
            });
        }

        if (
            !Number.isInteger(
                normalizedGroupMatchesPerTeam
            ) ||
            normalizedGroupMatchesPerTeam < 1
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Group stage matches per team must be at least 1."
            });
        }

        if (wantsSuper8) {
            if (
                !Number.isInteger(
                    normalizedSuper8MatchesPerTeam
                ) ||
                normalizedSuper8MatchesPerTeam < 1
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Super 8 matches per team must be at least 1."
                });
            }
        }

        const tournamentResult =
            await pool.query(
                `
                SELECT
                    id,
                    format,
                    category
                FROM public.tournaments
                WHERE id = $1
                LIMIT 1
                `,
                [tournamentId]
            );

        if (
            tournamentResult.rows.length === 0
        ) {
            return res.status(404).json({
                success: false,
                message: "Tournament not found."
            });
        }

        const tournament =
            tournamentResult.rows[0];

        const actualTeamResult =
            await pool.query(
                `
                SELECT COUNT(*)::int AS count
                FROM public.teams
                WHERE tournament_id = $1
                `,
                [tournamentId]
            );

        const actualRegistrationResult =
            await pool.query(
                `
                SELECT COUNT(*)::int AS count
                FROM public.tournament_registrations
                WHERE tournament_id = $1
                `,
                [tournamentId]
            );

        const totalTeams =
            tournament.format === "Doubles"
                ? Number(
                      actualTeamResult.rows[0]?.count ||
                      0
                  )
                : Number(
                      actualRegistrationResult
                          .rows[0]?.count || 0
                  );

        if (totalTeams < 2) {
            return res.status(400).json({
                success: false,
                message:
                    "At least 2 teams/players are required before fixture setup."
            });
        }

        if (
            totalTeams !==
            normalizedPoolCount *
                normalizedTeamsPerPool
        ) {
            return res.status(400).json({
                success: false,
                message:
                    `${totalTeams} teams/players cannot be divided into ${normalizedPoolCount} pools of ${normalizedTeamsPerPool}.`
            });
        }

        if (wantsSuper8) {
            if (totalTeams < 8) {
                return res.status(400).json({
                    success: false,
                    message:
                        "At least 8 teams are required for Super 8."
                });
            }

            if (
                8 %
                    normalizedPoolCount !==
                0
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "When Super 8 is enabled, choose 1, 2, 4, or 8 pools so exactly 8 teams can qualify."
                });
            }
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
                super8_matches_per_team,
                super8_qualifiers,
                updated_at
            )
            VALUES
            (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                8,
                CURRENT_TIMESTAMP
            )
            ON CONFLICT (tournament_id)
            DO UPDATE SET
                pool_count =
                    EXCLUDED.pool_count,
                teams_per_pool =
                    EXCLUDED.teams_per_pool,
                group_matches_per_team =
                    EXCLUDED.group_matches_per_team,
                super8_enabled =
                    EXCLUDED.super8_enabled,
                super8_matches_per_team =
                    EXCLUDED.super8_matches_per_team,
                super8_qualifiers = 8,
                updated_at =
                    CURRENT_TIMESTAMP
            RETURNING *
            `,
            [
                tournamentId,
                normalizedPoolCount,
                normalizedTeamsPerPool,
                normalizedGroupMatchesPerTeam,
                wantsSuper8,
                wantsSuper8
                    ? normalizedSuper8MatchesPerTeam
                    : null
            ]
        );

        return res.status(200).json({
            success: true,
            message:
                "Fixture setup saved successfully.",
            setup: result.rows[0]
        });
    } catch (error) {
        console.error(
            "Save Fixture Setup Error:",
            error
        );

        next(error);
    }
};

// =====================================
// Random Fixture Generation
// =====================================

const generateRandomFixtures = async (
    req,
    res
) => {
    try {
        const tournamentId =
            Number(req.params.tournamentId);

        const tournament =
            tournaments.find(
                tournament =>
                    tournament.id ===
                    tournamentId
            );

        if (!tournament) {
            return res.status(404).json({
                success: false,
                message: "Tournament not found."
            });
        }

        const alreadyGenerated =
            fixtures.some(
                fixture =>
                    fixture.tournamentId ===
                    tournamentId
            );

        if (alreadyGenerated) {
            return res.status(400).json({
                success: false,
                message:
                    "Fixtures already generated."
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
                    "Fixture setup has not been configured yet."
            });
        }

        const poolCount =
            Number(setup.pool_count);

        const teamsPerPool =
            Number(setup.teams_per_pool);

        const groupMatchesPerTeam =
            Number(setup.group_matches_per_team);

        const super8Enabled =
            parseBoolean(setup.super8_enabled);

        const super8MatchesPerTeam =
            super8Enabled
                ? Number(
                      setup.super8_matches_per_team
                  )
                : 0;

        const participants =
            getTournamentFixtureTeams(
                tournament
            );

        if (
            participants.length <
            teamsPerPool * poolCount
        ) {
            return res.status(400).json({
                success: false,
                message:
                    `Fixture setup expects ${poolCount * teamsPerPool} teams/players, but only ${participants.length} are available.`
            });
        }

        if (
            participants.length !==
            teamsPerPool * poolCount
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "The current participant/team count does not match the saved fixture setup."
            });
        }

        if (
            super8Enabled &&
            (participants.length < 8 ||
                8 %
                    poolCount !==
                0)
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid Super 8 configuration."
            });
        }

        const shuffledParticipants =
            shuffleArray(participants);

        const pools = [];

        for (
            let i = 0;
            i < poolCount;
            i += 1
        ) {
            pools.push(
                shuffledParticipants.slice(
                    i *
                        teamsPerPool,
                    (i + 1) *
                        teamsPerPool
                )
            );
        }

        const generatedFixtures = [];

        let fixtureId =
            fixtures.length + 1;

        pools.forEach(
            (poolParticipants, poolIndex) => {
                const poolName =
                    `Pool ${String.fromCharCode(
                        65 + poolIndex
                    )}`;

                const poolMatches =
                    generateRoundRobinMatches(
                        poolParticipants,
                        groupMatchesPerTeam
                    );

                poolMatches.forEach(
                    (match, matchIndex) => {
                        generatedFixtures.push({
                            id: fixtureId++,
                            tournamentId,
                            round: "Pool",
                            pool: poolName,
                            matchNumber:
                                matchIndex + 1,
                            playerA:
                                getParticipantName(
                                    match.participantA,
                                    tournament.format
                                ),
                            playerB:
                                getParticipantName(
                                    match.participantB,
                                    tournament.format
                                ),
                            playerAScore: 0,
                            playerBScore: 0,
                            winner: null,
                            status: "Upcoming"
                        });
                    }
                );
            }
        );

        fixtures.push(
            ...generatedFixtures
        );

        tournament.status = "Ongoing";

        return res.status(201).json({
            success: true,
            message:
                "Pool fixtures generated successfully.",
            setup: {
                poolCount,
                teamsPerPool,
                groupMatchesPerTeam,
                super8Enabled,
                super8MatchesPerTeam:
                    super8Enabled
                        ? super8MatchesPerTeam
                        : null,
                super8Qualifiers:
                    super8Enabled
                        ? 8
                        : 0
            },
            fixtures: generatedFixtures
        });
    } catch (error) {
        console.error(
            "Generate Fixture Error:",
            error
        );

        return res.status(400).json({
            success: false,
            message:
                error.message ||
                "Unable to generate fixtures."
        });
    }
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

const generateNextRound = async (
    req,
    res
) => {
    try {
        const tournamentId =
            Number(req.params.tournamentId);

        const tournament =
            tournaments.find(
                tournament =>
                    tournament.id ===
                    tournamentId
            );

        if (!tournament) {
            return res.status(404).json({
                success: false,
                message:
                    "Tournament not found."
            });
        }

        const tournamentFixtures =
            fixtures.filter(
                fixture =>
                    fixture.tournamentId ===
                    tournamentId
            );

        if (
            tournamentFixtures.length === 0
        ) {
            return res.status(404).json({
                success: false,
                message:
                    "No fixtures found."
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
                    "Fixture setup not found."
            });
        }

        const super8Enabled =
            Boolean(setup.super8_enabled);

        // -------------------------------------------------
        // POOL STAGE
        // -------------------------------------------------

        const poolFixtures =
            tournamentFixtures.filter(
                fixture =>
                    fixture.round ===
                    "Pool"
            );

        const pendingPoolMatches =
            poolFixtures.some(
                fixture =>
                    fixture.status !==
                    "Completed"
            );

        if (pendingPoolMatches) {
            return res.status(400).json({
                success: false,
                message:
                    "Complete all pool matches before generating the next round."
            });
        }

        // -------------------------------------------------
        // GENERATE SUPER 8
        // -------------------------------------------------

        const existingSuper8 =
            tournamentFixtures.filter(
                fixture =>
                    fixture.round ===
                    "Super 8"
            );

        if (
            super8Enabled &&
            existingSuper8.length === 0
        ) {
            const poolNames = [
                ...new Set(
                    poolFixtures.map(
                        fixture =>
                            fixture.pool
                    )
                )
            ];

            const standingsByPool = {};

            poolNames.forEach(
                poolName => {
                    standingsByPool[
                        poolName
                    ] = {};
                }
            );

            poolFixtures.forEach(
                fixture => {
                    if (
                        fixture.status !==
                            "Completed" ||
                        !fixture.winner
                    ) {
                        return;
                    }

                    const pool =
                        fixture.pool;

                    const a =
                        fixture.playerA;

                    const b =
                        fixture.playerB;

                    if (
                        !standingsByPool[
                            pool
                        ][a]
                    ) {
                        standingsByPool[
                            pool
                        ][a] = {
                            name: a,
                            played: 0,
                            wins: 0,
                            points: 0
                        };
                    }

                    if (
                        !standingsByPool[
                            pool
                        ][b]
                    ) {
                        standingsByPool[
                            pool
                        ][b] = {
                            name: b,
                            played: 0,
                            wins: 0,
                            points: 0
                        };
                    }

                    standingsByPool[
                        pool
                    ][a].played += 1;

                    standingsByPool[
                        pool
                    ][b].played += 1;

                    standingsByPool[
                        pool
                    ][fixture.winner]
                        .wins += 1;

                    standingsByPool[
                        pool
                    ][fixture.winner]
                        .points += 2;
                }
            );

            const qualifiersPerPool =
                8 /
                poolNames.length;

            const qualifiers = [];

            poolNames
                .sort()
                .forEach(
                    poolName => {
                        const rows =
                            Object.values(
                                standingsByPool[
                                    poolName
                                ]
                            ).sort(
                                (a, b) =>
                                    b.points -
                                        a.points ||
                                    b.wins -
                                        a.wins ||
                                    a.name.localeCompare(
                                        b.name
                                    )
                            );

                        qualifiers.push(
                            ...rows
                                .slice(
                                    0,
                                    qualifiersPerPool
                                )
                                .map(
                                    row =>
                                        row.name
                                )
                        );
                    }
                );

            if (
                qualifiers.length !==
                8
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Exactly 8 teams/players could not be selected for Super 8."
                });
            }

            const super8TargetMatches =
                Number(
                    setup.super8_matches_per_team
                );

            if (
                !Number.isInteger(
                    super8TargetMatches
                ) ||
                super8TargetMatches < 1
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Super 8 matches per team is not configured correctly."
                });
            }

            const shuffledQualifiers =
                shuffleArray(
                    qualifiers
                );

            // Convert qualifiers to the participant shape
            // expected by generateRoundRobinMatches.
            const qualifierParticipants =
                shuffledQualifiers.map(
                    qualifier => ({
                        id: qualifier,
                        playerName: qualifier,
                        teamName: qualifier
                    })
                );

            const super8Matches =
                generateRoundRobinMatches(
                    qualifierParticipants,
                    super8TargetMatches
                );

            const generatedFixtures = [];

            let fixtureId =
                fixtures.length + 1;

            super8Matches.forEach(
                (match, index) => {
                    generatedFixtures.push({
                        id: fixtureId++,
                        tournamentId,
                        round: "Super 8",
                        playerA:
                            getParticipantName(
                                match.participantA,
                                tournament.format
                            ),
                        playerB:
                            getParticipantName(
                                match.participantB,
                                tournament.format
                            ),
                        playerAScore: 0,
                        playerBScore: 0,
                        winner: null,
                        status: "Upcoming"
                    });
                }
            );

            fixtures.push(
                ...generatedFixtures
            );

            return res.status(201).json({
                success: true,
                message:
                    "Super 8 fixtures generated successfully.",
                fixtures:
                    generatedFixtures
            });
        }

        // -------------------------------------------------
        // SUPER 8 -> SEMI FINALS
        // -------------------------------------------------

        const super8Fixtures =
            tournamentFixtures.filter(
                fixture =>
                    fixture.round ===
                    "Super 8"
            );

        if (
            super8Enabled &&
            super8Fixtures.length > 0
        ) {
            const pendingSuper8 =
                super8Fixtures.some(
                    fixture =>
                        fixture.status !==
                        "Completed"
                );

            if (pendingSuper8) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Complete all Super 8 matches before generating the semi-finals."
                });
            }

            const existingSemi =
                tournamentFixtures.filter(
                    fixture =>
                        fixture.round ===
                        "Semi Final"
                );

            if (existingSemi.length === 0) {
                const winners =
                    super8Fixtures
                        .map(
                            fixture =>
                                fixture.winner
                        )
                        .filter(Boolean);

                if (
                    winners.length !==
                    4
                ) {
                    return res.status(400).json({
                        success: false,
                        message:
                            "Exactly 4 Super 8 winners are required for the semi-finals."
                    });
                }

                const generatedFixtures = [];

                let fixtureId =
                    fixtures.length + 1;

                for (
                    let i = 0;
                    i < winners.length;
                    i += 2
                ) {
                    generatedFixtures.push({
                        id: fixtureId++,
                        tournamentId,
                        round:
                            "Semi Final",
                        playerA:
                            winners[i],
                        playerB:
                            winners[
                                i + 1
                            ],
                        playerAScore: 0,
                        playerBScore: 0,
                        winner: null,
                        status: "Upcoming"
                    });
                }

                fixtures.push(
                    ...generatedFixtures
                );

                return res.status(201).json({
                    success: true,
                    message:
                        "Semi-final fixtures generated successfully.",
                    fixtures:
                        generatedFixtures
                });
            }
        }

        // -------------------------------------------------
        // NO SUPER 8 -> TOP 4 FROM POOLS
        // -------------------------------------------------

        if (!super8Enabled) {
            const existingSemi =
                tournamentFixtures.filter(
                    fixture =>
                        fixture.round ===
                        "Semi Final"
                );

            if (existingSemi.length === 0) {
                const records = {};

                poolFixtures.forEach(
                    fixture => {
                        if (
                            !records[
                                fixture.playerA
                            ]
                        ) {
                            records[
                                fixture.playerA
                            ] = {
                                name:
                                    fixture.playerA,
                                wins: 0,
                                points: 0
                            };
                        }

                        if (
                            !records[
                                fixture.playerB
                            ]
                        ) {
                            records[
                                fixture.playerB
                            ] = {
                                name:
                                    fixture.playerB,
                                wins: 0,
                                points: 0
                            };
                        }

                        if (
                            fixture.winner
                        ) {
                            records[
                                fixture.winner
                            ].wins += 1;

                            records[
                                fixture.winner
                            ].points +=
                                2;
                        }
                    }
                );

                const topFour =
                    Object.values(
                        records
                    )
                        .sort(
                            (a, b) =>
                                b.points -
                                    a.points ||
                                b.wins -
                                    a.wins ||
                                a.name.localeCompare(
                                    b.name
                                )
                        )
                        .slice(
                            0,
                            4
                        )
                        .map(
                            row =>
                                row.name
                        );

                if (
                    topFour.length !==
                    4
                ) {
                    return res.status(400).json({
                        success: false,
                        message:
                            "At least 4 qualified teams/players are required for the semi-finals."
                    });
                }

                const generatedFixtures = [];

                let fixtureId =
                    fixtures.length + 1;

                for (
                    let i = 0;
                    i <
                    topFour.length;
                    i += 2
                ) {
                    generatedFixtures.push({
                        id: fixtureId++,
                        tournamentId,
                        round:
                            "Semi Final",
                        playerA:
                            topFour[i],
                        playerB:
                            topFour[
                                i + 1
                            ],
                        playerAScore: 0,
                        playerBScore: 0,
                        winner: null,
                        status: "Upcoming"
                    });
                }

                fixtures.push(
                    ...generatedFixtures
                );

                return res.status(201).json({
                    success: true,
                    message:
                        "Semi-final fixtures generated successfully.",
                    fixtures:
                        generatedFixtures
                });
            }
        }

        // -------------------------------------------------
        // SEMI FINALS -> FINAL
        // -------------------------------------------------

        const semiFinals =
            tournamentFixtures.filter(
                fixture =>
                    fixture.round ===
                    "Semi Final"
            );

        if (
            semiFinals.length > 0
        ) {
            const pendingSemi =
                semiFinals.some(
                    fixture =>
                        fixture.status !==
                        "Completed"
                );

            if (pendingSemi) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Complete all semi-final matches before generating the final."
                });
            }

            const existingFinal =
                tournamentFixtures.filter(
                    fixture =>
                        fixture.round ===
                        "Final"
                );

            if (
                existingFinal.length ===
                0
            ) {
                const winners =
                    semiFinals
                        .map(
                            fixture =>
                                fixture.winner
                        )
                        .filter(Boolean);

                if (
                    winners.length !==
                    2
                ) {
                    return res.status(400).json({
                        success: false,
                        message:
                            "Exactly 2 semi-final winners are required for the final."
                    });
                }

                const finalFixture = {
                    id:
                        fixtures.length +
                        1,
                    tournamentId,
                    round: "Final",
                    playerA:
                        winners[0],
                    playerB:
                        winners[1],
                    playerAScore: 0,
                    playerBScore: 0,
                    winner: null,
                    status: "Upcoming"
                };

                fixtures.push(
                    finalFixture
                );

                return res.status(201).json({
                    success: true,
                    message:
                        "Final fixture generated successfully.",
                    fixtures: [
                        finalFixture
                    ]
                });
            }
        }

        // -------------------------------------------------
        // FINAL -> COMPLETE TOURNAMENT
        // -------------------------------------------------

        const finalFixtures =
            tournamentFixtures.filter(
                fixture =>
                    fixture.round ===
                    "Final"
            );

        if (
            finalFixtures.length > 0
        ) {
            const finalFixture =
                finalFixtures[0];

            if (
                finalFixture.status !==
                "Completed"
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Complete the final before finishing the tournament."
                });
            }

            tournament.status =
                "Completed";

            tournament.champion =
                finalFixture.winner;

            return res.status(200).json({
                success: true,
                message:
                    "Tournament completed successfully.",
                champion:
                    finalFixture.winner
            });
        }

        return res.status(400).json({
            success: false,
            message:
                "Unable to determine the next tournament round."
        });
    } catch (error) {
        console.error(
            "Generate Next Round Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                error.message ||
                "Unable to generate next round."
        });
    }
};

// =====================================
// Exports
// =====================================

module.exports = {

    generateRandomFixtures,
    generateManualFixtures,
    getFixturesByTournament,
    updateScore,
    generateNextRound,
    getFixtureSetup,
    saveFixtureSetup

};