const pool = require("../config/db");

// Temporary storage
const { playerProfiles } = require("../data/dataStore");

// =====================================================
// EXISTING PLAYER PROFILE FUNCTIONS
// =====================================================

// Create Player Profile
const createPlayerProfile = (req, res) => {
    const {
        fullName,
        mobile,
        email,
        dob,
        gender,
        profilePhoto
    } = req.body;

    const existingProfile = playerProfiles.find(
        profile => profile.email === email
    );

    if (existingProfile) {
        return res.status(400).json({
            success: false,
            message: "Player profile already exists."
        });
    }

    const newProfile = {
        id: playerProfiles.length + 1,
        userId: req.user.id,
        fullName,
        mobile,
        email,
        dob,
        gender,
        profilePhoto
    };

    playerProfiles.push(newProfile);

    res.status(201).json({
        success: true,
        message: "Player profile created successfully.",
        profile: newProfile
    });
};

// Get Player Profile
const getPlayerProfile = (req, res) => {

    const profile = playerProfiles.find(
        profile => profile.userId === req.user.id
    );

    if (!profile) {
        return res.status(404).json({
            success: false,
            message: "Player profile not found."
        });
    }

    res.status(200).json({
        success: true,
        profile
    });
};

// Update Player Profile
const updatePlayerProfile = (req, res) => {

    const profile = playerProfiles.find(
        profile => profile.userId === req.user.id
    );

    if (!profile) {
        return res.status(404).json({
            success: false,
            message: "Player profile not found."
        });
    }

    Object.assign(profile, req.body);

    res.status(200).json({
        success: true,
        message: "Player profile updated successfully.",
        profile
    });
};


// =====================================================
// PLAYER DASHBOARD
// =====================================================

const getPlayerDashboard = async (req, res, next) => {
    try {
        const playerId = Number(req.user?.id);

        if (!Number.isInteger(playerId)) {
            return res.status(401).json({
                success: false,
                message: "Invalid authenticated user."
            });
        }

        // -------------------------------------------------
        // PLAYER
        // -------------------------------------------------

        const playerResult = await pool.query(
            `
            SELECT
                id,
                full_name,
                email,
                phone,
                role
            FROM users
            WHERE id = $1
            LIMIT 1
            `,
            [playerId]
        );

        if (playerResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Player not found."
            });
        }

        const player = playerResult.rows[0];


        // -------------------------------------------------
        // TOURNAMENTS THE PLAYER REGISTERED FOR
        // -------------------------------------------------

       const tournamentsResult = await pool.query(
    `
    SELECT
        t.id,
        t.name,
        t.description,
        t.format,
        t.venue,
        t.start_date,
        t.registration_deadline,
        t.status
    FROM tournament_registrations tr
    INNER JOIN tournaments t
        ON t.id = tr.tournament_id
    WHERE tr.player_id = $1
    ORDER BY
        t.start_date DESC NULLS LAST,
        t.id DESC
    `,
    [playerId]
);

        const tournaments =
    tournamentsResult.rows.map(
        tournament => ({
            id: tournament.id,
            name: tournament.name,
            description:
                tournament.description,
            format: tournament.format,
            venue: tournament.venue,
            startDate:
                tournament.start_date,
            registrationDeadline:
                tournament.registration_deadline,
            status:
                tournament.status,
            registrationStatus:
                "Registered"
        })
    );


        // -------------------------------------------------
        // PLAYER'S DOUBLES TEAMS
        // -------------------------------------------------

        const teamsResult = await pool.query(
            `
            SELECT
                t.id,
                t.team_name,
                t.tournament_id
            FROM team_members tm
            INNER JOIN teams t
                ON t.id = tm.team_id
            WHERE tm.player_id = $1
            ORDER BY t.id
            `,
            [playerId]
        );

        const teams =
            teamsResult.rows.map(team => ({
                id: team.id,
                name: team.team_name,
                tournamentId:
                    team.tournament_id
            }));


        // -------------------------------------------------
        // PLAYER FIXTURES
        //
        // Singles:
        // player_a_id / player_b_id
        //
        // Doubles:
        // team_a_id / team_b_id
        // -------------------------------------------------

        const fixturesResult = await pool.query(
            `
            SELECT
                f.id,
                f.tournament_id,
                f.round,
                f.match_number,
                f.player_a_id,
                f.player_b_id,
                f.team_a_id,
                f.team_b_id,
                f.player_a_score,
                f.player_b_score,
                f.winner_player_id,
                f.winner_team_id,
                f.status,

                t.name AS tournament_name,
                t.format AS tournament_format,

                pa.full_name AS player_a_name,
                pb.full_name AS player_b_name,

                ta.team_name AS team_a_name,
                tb.team_name AS team_b_name

            FROM fixtures f

            INNER JOIN tournaments t
                ON t.id = f.tournament_id

            LEFT JOIN users pa
                ON pa.id = f.player_a_id

            LEFT JOIN users pb
                ON pb.id = f.player_b_id

            LEFT JOIN teams ta
                ON ta.id = f.team_a_id

            LEFT JOIN teams tb
                ON tb.id = f.team_b_id

            WHERE
                f.player_a_id = $1
                OR f.player_b_id = $1
                OR f.team_a_id IN (
                    SELECT team_id
                    FROM team_members
                    WHERE player_id = $1
                )
                OR f.team_b_id IN (
                    SELECT team_id
                    FROM team_members
                    WHERE player_id = $1
                )

            ORDER BY
                f.id DESC
            `,
            [playerId]
        );


        // -------------------------------------------------
        // FORMAT MATCH DATA FOR FRONTEND
        // -------------------------------------------------

        const matches =
            fixturesResult.rows.map(
                fixture => {

                    const isDoubles =
                        String(
                            fixture.tournament_format ||
                            ""
                        ).toLowerCase() ===
                        "doubles";

                    const sideA = isDoubles
                        ? fixture.team_a_name ||
                          "TBD"
                        : fixture.player_a_name ||
                          "TBD";

                    const sideB = isDoubles
                        ? fixture.team_b_name ||
                          "TBD"
                        : fixture.player_b_name ||
                          "TBD";

                    const rawStatus =
                        String(
                            fixture.status ||
                            "Upcoming"
                        ).toLowerCase();

                    let status = "Upcoming";

                    if (
                        rawStatus ===
                        "live"
                    ) {
                        status = "Live";
                    } else if (
                        rawStatus ===
                        "completed"
                    ) {
                        status =
                            "Completed";
                    } else if (
                        rawStatus ===
                            "scheduled" ||
                        rawStatus ===
                            "upcoming"
                    ) {
                        status =
                            "Upcoming";
                    }

                    let winnerName = null;

                    if (isDoubles) {

                        if (
                            fixture.winner_team_id &&
                            Number(
                                fixture.winner_team_id
                            ) ===
                                Number(
                                    fixture.team_a_id
                                )
                        ) {
                            winnerName =
                                sideA;
                        }

                        if (
                            fixture.winner_team_id &&
                            Number(
                                fixture.winner_team_id
                            ) ===
                                Number(
                                    fixture.team_b_id
                                )
                        ) {
                            winnerName =
                                sideB;
                        }

                    } else {

                        if (
                            fixture.winner_player_id &&
                            Number(
                                fixture.winner_player_id
                            ) ===
                                Number(
                                    fixture.player_a_id
                                )
                        ) {
                            winnerName =
                                sideA;
                        }

                        if (
                            fixture.winner_player_id &&
                            Number(
                                fixture.winner_player_id
                            ) ===
                                Number(
                                    fixture.player_b_id
                                )
                        ) {
                            winnerName =
                                sideB;
                        }
                    }

                    return {
                        id: fixture.id,

                        tournamentId:
                            fixture.tournament_id,

                        tournament:
                            fixture.tournament_name,

                        format:
                            fixture.tournament_format,

                        round:
                            fixture.round,

                        matchNumber:
                            fixture.match_number,

                        status,

                        sideA,
                        sideB,

                        scoreA:
                            Number(
                                fixture.player_a_score
                            ) || 0,

                        scoreB:
                            Number(
                                fixture.player_b_score
                            ) || 0,

                        winnerName,

                        isDoubles
                    };
                }
            );


        // -------------------------------------------------
        // STATS
        // -------------------------------------------------

        const completedMatches =
            fixturesResult.rows.filter(
                fixture =>
                    String(
                        fixture.status ||
                        ""
                    ).toLowerCase() ===
                    "completed"
            );

        const matchesPlayed =
            completedMatches.length;

        let wins = 0;

        const teamIds =
            teams.map(team =>
                Number(team.id)
            );

        completedMatches.forEach(
            fixture => {

                const isDoubles =
                    fixture.team_a_id !==
                        null ||
                    fixture.team_b_id !==
                        null;

                if (!isDoubles) {

                    if (
                        Number(
                            fixture.winner_player_id
                        ) === playerId
                    ) {
                        wins++;
                    }

                } else {

                    if (
                        fixture.winner_team_id &&
                        teamIds.includes(
                            Number(
                                fixture.winner_team_id
                            )
                        )
                    ) {
                        wins++;
                    }
                }
            }
        );

        const losses =
            Math.max(
                matchesPlayed - wins,
                0
            );

        const winRate =
            matchesPlayed > 0
                ? Number(
                      (
                          (wins /
                              matchesPlayed) *
                          100
                      ).toFixed(1)
                  )
                : 0;


        // -------------------------------------------------
        // CHAMPIONSHIPS
        // -------------------------------------------------

        const championResult =
            await pool.query(
                `
                SELECT COUNT(*)::int AS count
                FROM tournaments
                WHERE champion_id = $1
                `,
                [playerId]
            );

        const championships =
            Number(
                championResult.rows[0]?.count
            ) || 0;


        // -------------------------------------------------
        // RESPONSE
        // -------------------------------------------------

        return res.status(200).json({
            success: true,

            player: {
                id: player.id,
                name: player.full_name,
                email: player.email,
                phone: player.phone,
                role: player.role
            },

            stats: {
                tournamentsPlayed:
                    tournaments.length,

                matchesPlayed,

                wins,

                losses,

                winRate,

                championships
            },

            tournaments,

            teams,

            matches
        });

    } catch (error) {

        console.error(
            "Get Player Dashboard Error:",
            error
        );

        next(error);
    }
};


module.exports = {
    createPlayerProfile,
    getPlayerProfile,
    updatePlayerProfile,
    getPlayerDashboard
};