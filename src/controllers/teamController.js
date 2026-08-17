const pool = require("../config/db");


// =========================================================
// HELPER - VERIFY ORGANIZER OWNS TOURNAMENT
// =========================================================

async function verifyTournamentOwnership(
    tournamentId,
    organizerId
) {
    const result = await pool.query(
        `
        SELECT
            id,
            name,
            category,
            sport,
            status
        FROM public.tournaments
        WHERE id = $1
          AND organizer_id = $2
        LIMIT 1
        `,
        [
            tournamentId,
            organizerId,
        ]
    );

    return result.rows[0] || null;
}


// =========================================================
// GET ALL TEAMS FOR TOURNAMENT
// =========================================================

const getTournamentTeams = async (
    req,
    res,
    next
) => {
    try {
        const {
            tournamentId,
        } = req.params;

        const organizerId =
            req.user.id;

        const tournament =
            await verifyTournamentOwnership(
                tournamentId,
                organizerId
            );

        if (!tournament) {
            return res.status(404).json({
                success: false,
                message:
                    "Tournament not found."
            });
        }

        const result =
            await pool.query(
                `
                SELECT
                    t.id,
                    t.team_name,
                    t.tournament_id,
                    t.created_at,

                    COALESCE(
                        JSON_AGG(
                            JSON_BUILD_OBJECT(
                                'id',
                                tm.player_id,
                                'name',
                                COALESCE(
                                    tr.participant_name,
                                    'Player'
                                )
                            )
                            ORDER BY tm.id
                        )
                        FILTER (
                            WHERE tm.id IS NOT NULL
                        ),
                        '[]'
                    ) AS players

                FROM public.teams t

                LEFT JOIN public.team_members tm
                    ON tm.team_id = t.id

                LEFT JOIN public.tournament_registrations tr
                    ON tr.tournament_id = t.tournament_id
                    AND tr.player_id = tm.player_id

                WHERE t.tournament_id = $1

                GROUP BY
                    t.id,
                    t.team_name,
                    t.tournament_id,
                    t.created_at

                ORDER BY
                    t.created_at ASC
                `,
                [
                    tournamentId,
                ]
            );

        return res.status(200).json({
            success: true,
            tournament,
            teams: result.rows,
        });

    } catch (error) {
        console.error(
            "Get Tournament Teams Error:",
            error
        );

        next(error);
    }
};


// =========================================================
// CREATE TEAM / PAIR
// =========================================================

const createTeam = async (
    req,
    res,
    next
) => {
    const client =
        await pool.connect();

    try {
        const {
            tournamentId,
        } = req.params;

        const {
            teamName,
            playerIds,
        } = req.body;

        const organizerId =
            req.user.id;

        // -------------------------------------------------
        // VALIDATION
        // -------------------------------------------------

        if (
            !teamName?.trim() ||
            !Array.isArray(playerIds)
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Team name and player IDs are required."
            });
        }

        if (playerIds.length !== 2) {
            return res.status(400).json({
                success: false,
                message:
                    "A doubles team must contain exactly 2 players."
            });
        }

        const uniquePlayerIds =
            [
                ...new Set(
                    playerIds.map(
                        Number
                    )
                ),
            ];

        if (
            uniquePlayerIds.length !== 2 ||
            uniquePlayerIds.some(
                (id) =>
                    !Number.isInteger(id)
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Please provide two valid and different players."
            });
        }


        // -------------------------------------------------
        // TOURNAMENT
        // -------------------------------------------------

        const tournament =
            await verifyTournamentOwnership(
                tournamentId,
                organizerId
            );

        if (!tournament) {
            return res.status(404).json({
                success: false,
                message:
                    "Tournament not found."
            });
        }


        // -------------------------------------------------
        // DOUBLES ONLY
        // -------------------------------------------------

        const category =
            String(
                tournament.category || ""
            ).toLowerCase();

        if (
            !category.includes(
                "doubles"
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Teams can only be created for doubles tournaments."
            });
        }


        await client.query(
            "BEGIN"
        );


        // -------------------------------------------------
        // VERIFY PLAYERS ARE REGISTERED
        // -------------------------------------------------

        const registrationResult =
            await client.query(
                `
                SELECT player_id
                FROM public.tournament_registrations
                WHERE tournament_id = $1
                  AND player_id = ANY($2::int[])
                `,
                [
                    tournamentId,
                    uniquePlayerIds,
                ]
            );

        if (
            registrationResult
                .rows.length !== 2
        ) {
            await client.query(
                "ROLLBACK"
            );

            return res.status(400).json({
                success: false,
                message:
                    "Both players must be registered for this tournament."
            });
        }


        // -------------------------------------------------
        // CHECK WHETHER PLAYER IS ALREADY IN A TEAM
        // -------------------------------------------------

        const existingMemberResult =
            await client.query(
                `
                SELECT
                    tm.player_id,
                    t.team_name

                FROM public.team_members tm

                INNER JOIN public.teams t
                    ON t.id = tm.team_id

                WHERE t.tournament_id = $1
                  AND tm.player_id = ANY($2::int[])
                `,
                [
                    tournamentId,
                    uniquePlayerIds,
                ]
            );

        if (
            existingMemberResult
                .rows.length > 0
        ) {
            await client.query(
                "ROLLBACK"
            );

            const playerNames =
                existingMemberResult.rows
                    .map(
                        (row) =>
                            `Player ${row.player_id} (${row.team_name})`
                    )
                    .join(", ");

            return res.status(409).json({
                success: false,
                message:
                    `${playerNames} already belong to a team.`
            });
        }


        // -------------------------------------------------
        // CREATE TEAM
        // -------------------------------------------------

        const teamResult =
            await client.query(
                `
                INSERT INTO public.teams
                (
                    tournament_id,
                    team_name
                )
                VALUES
                (
                    $1,
                    $2
                )
                RETURNING *
                `,
                [
                    tournamentId,
                    teamName.trim(),
                ]
            );

        const team =
            teamResult.rows[0];


        // -------------------------------------------------
        // ADD TEAM MEMBERS
        // -------------------------------------------------

        await client.query(
            `
            INSERT INTO public.team_members
            (
                team_id,
                player_id
            )
            VALUES
            ($1, $2),
            ($1, $3)
            `,
            [
                team.id,
                uniquePlayerIds[0],
                uniquePlayerIds[1],
            ]
        );


        await client.query(
            "COMMIT"
        );


        return res.status(201).json({
            success: true,
            message:
                "Team created successfully.",
            team: {
                ...team,
                players:
                    uniquePlayerIds.map(
                        (id) => ({
                            id,
                        })
                    ),
            },
        });

    } catch (error) {

        await client.query(
            "ROLLBACK"
        );

        console.error(
            "Create Team Error:",
            error
        );

        next(error);

    } finally {

        client.release();

    }
};


// =========================================================
// UPDATE TEAM / PAIR
// =========================================================

const updateTeam = async (
    req,
    res,
    next
) => {
    const client =
        await pool.connect();

    try {
        const {
            tournamentId,
            teamId,
        } = req.params;

        const {
            teamName,
            playerIds,
        } = req.body;

        const organizerId =
            req.user.id;


        // -------------------------------------------------
        // VALIDATE
        // -------------------------------------------------

        if (
            !teamName?.trim() ||
            !Array.isArray(playerIds) ||
            playerIds.length !== 2
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Team name and exactly 2 players are required."
            });
        }

        const uniquePlayerIds =
            [
                ...new Set(
                    playerIds.map(
                        Number
                    )
                ),
            ];

        if (
            uniquePlayerIds.length !== 2
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "A player cannot be selected twice."
            });
        }


        // -------------------------------------------------
        // VERIFY TOURNAMENT
        // -------------------------------------------------

        const tournament =
            await verifyTournamentOwnership(
                tournamentId,
                organizerId
            );

        if (!tournament) {
            return res.status(404).json({
                success: false,
                message:
                    "Tournament not found."
            });
        }


        await client.query(
            "BEGIN"
        );


        // -------------------------------------------------
        // VERIFY TEAM BELONGS TO TOURNAMENT
        // -------------------------------------------------

        const teamResult =
            await client.query(
                `
                SELECT id
                FROM public.teams
                WHERE id = $1
                  AND tournament_id = $2
                LIMIT 1
                `,
                [
                    teamId,
                    tournamentId,
                ]
            );

        if (
            teamResult.rows.length === 0
        ) {
            await client.query(
                "ROLLBACK"
            );

            return res.status(404).json({
                success: false,
                message:
                    "Team not found."
            });
        }


        // -------------------------------------------------
        // CHECK FIXTURES
        //
        // Don't modify a team once it is already used
        // in a fixture.
        // -------------------------------------------------

        const fixtureCheck =
            await client.query(
                `
                SELECT id
                FROM public.fixtures
                WHERE team_a_id = $1
                   OR team_b_id = $1
                LIMIT 1
                `,
                [
                    teamId,
                ]
            );

        if (
            fixtureCheck.rows.length > 0
        ) {
            await client.query(
                "ROLLBACK"
            );

            return res.status(409).json({
                success: false,
                message:
                    "This team is already used in fixtures and cannot be modified."
            });
        }


        // -------------------------------------------------
        // VERIFY PLAYERS REGISTERED
        // -------------------------------------------------

        const registrationResult =
            await client.query(
                `
                SELECT player_id
                FROM public.tournament_registrations
                WHERE tournament_id = $1
                  AND player_id = ANY($2::int[])
                `,
                [
                    tournamentId,
                    uniquePlayerIds,
                ]
            );

        if (
            registrationResult.rows.length !==
            2
        ) {
            await client.query(
                "ROLLBACK"
            );

            return res.status(400).json({
                success: false,
                message:
                    "Both players must be registered for this tournament."
            });
        }


        // -------------------------------------------------
        // CHECK OTHER TEAMS
        // -------------------------------------------------

        const duplicateCheck =
            await client.query(
                `
                SELECT
                    tm.player_id,
                    t.team_name

                FROM public.team_members tm

                INNER JOIN public.teams t
                    ON t.id = tm.team_id

                WHERE t.tournament_id = $1
                  AND t.id <> $2
                  AND tm.player_id = ANY($3::int[])
                `,
                [
                    tournamentId,
                    teamId,
                    uniquePlayerIds,
                ]
            );

        if (
            duplicateCheck.rows.length > 0
        ) {
            await client.query(
                "ROLLBACK"
            );

            return res.status(409).json({
                success: false,
                message:
                    "One or more selected players already belong to another team."
            });
        }


        // -------------------------------------------------
        // UPDATE TEAM NAME
        // -------------------------------------------------

        await client.query(
            `
            UPDATE public.teams

            SET
                team_name = $1

            WHERE id = $2
              AND tournament_id = $3
            `,
            [
                teamName.trim(),
                teamId,
                tournamentId,
            ]
        );


        // -------------------------------------------------
        // REPLACE MEMBERS
        // -------------------------------------------------

        await client.query(
            `
            DELETE FROM public.team_members
            WHERE team_id = $1
            `,
            [
                teamId,
            ]
        );


        await client.query(
            `
            INSERT INTO public.team_members
            (
                team_id,
                player_id
            )
            VALUES
            ($1, $2),
            ($1, $3)
            `,
            [
                teamId,
                uniquePlayerIds[0],
                uniquePlayerIds[1],
            ]
        );


        await client.query(
            "COMMIT"
        );


        return res.status(200).json({
            success: true,
            message:
                "Team updated successfully.",
        });

    } catch (error) {

        await client.query(
            "ROLLBACK"
        );

        console.error(
            "Update Team Error:",
            error
        );

        next(error);

    } finally {

        client.release();

    }
};


// =========================================================
// DELETE TEAM
// =========================================================

const deleteTeam = async (
    req,
    res,
    next
) => {
    const client =
        await pool.connect();

    try {
        const {
            tournamentId,
            teamId,
        } = req.params;

        const organizerId =
            req.user.id;


        const tournament =
            await verifyTournamentOwnership(
                tournamentId,
                organizerId
            );

        if (!tournament) {
            return res.status(404).json({
                success: false,
                message:
                    "Tournament not found."
            });
        }


        // -------------------------------------------------
        // CHECK FIXTURES
        // -------------------------------------------------

        const fixtureCheck =
            await client.query(
                `
                SELECT id
                FROM public.fixtures
                WHERE team_a_id = $1
                   OR team_b_id = $1
                LIMIT 1
                `,
                [
                    teamId,
                ]
            );

        if (
            fixtureCheck.rows.length > 0
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "This team is already used in fixtures and cannot be deleted."
            });
        }


        await client.query(
            "BEGIN"
        );


        // Delete members first because we
        // should not assume ON DELETE CASCADE.

        await client.query(
            `
            DELETE FROM public.team_members
            WHERE team_id = $1
            `,
            [
                teamId,
            ]
        );


        const deleteResult =
            await client.query(
                `
                DELETE FROM public.teams
                WHERE id = $1
                  AND tournament_id = $2
                RETURNING id
                `,
                [
                    teamId,
                    tournamentId,
                ]
            );


        if (
            deleteResult.rows.length === 0
        ) {
            await client.query(
                "ROLLBACK"
            );

            return res.status(404).json({
                success: false,
                message:
                    "Team not found."
            });
        }


        await client.query(
            "COMMIT"
        );


        return res.status(200).json({
            success: true,
            message:
                "Team deleted successfully.",
        });

    } catch (error) {

        await client.query(
            "ROLLBACK"
        );

        console.error(
            "Delete Team Error:",
            error
        );

        next(error);

    } finally {

        client.release();

    }
};


module.exports = {
    getTournamentTeams,
    createTeam,
    updateTeam,
    deleteTeam,
};