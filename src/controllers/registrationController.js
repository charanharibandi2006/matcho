const pool = require("../config/db");

// ==========================================
// JOIN TOURNAMENT
// ==========================================

const registerForTournament = async (req, res, next) => {
    try {

        const {
            registrationCode,
            name
        } = req.body;

        // Logged-in player
        const playerId = req.user.id;

        // ------------------------------------------
        // Validate
        // ------------------------------------------

        if (!registrationCode || !name?.trim()) {
            return res.status(400).json({
                success: false,
                message:
                    "Registration code and participant name are required"
            });
        }

        const code =
            String(registrationCode)
                .trim()
                .toUpperCase();

        // ------------------------------------------
        // Find tournament
        // ------------------------------------------

        const tournamentResult = await pool.query(
            `
            SELECT
                id,
                name,
                sport,
                category,
                format,
                venue,
                start_date,
                end_date,
                max_players,
                status,
                registration_code
            FROM public.tournaments
            WHERE UPPER(registration_code) = $1
            LIMIT 1
            `,
            [code]
        );

        if (tournamentResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message:
                    "Tournament registration ID was not found."
            });
        }

        const tournament =
            tournamentResult.rows[0];

        // ------------------------------------------
        // Check registration status
        // ------------------------------------------

        if (
            tournament.status !==
            "Registration Open"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Registration is closed for this tournament."
            });
        }

        // ------------------------------------------
        // Check participant limit
        // ------------------------------------------

        const countResult = await pool.query(
            `
            SELECT COUNT(*)::int AS count
            FROM tournament_registrations
            WHERE tournament_id = $1
            `,
            [tournament.id]
        );

        const currentCount =
            countResult.rows[0].count;

        if (
            tournament.max_players &&
            currentCount >=
            tournament.max_players
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "This tournament is full."
            });
        }

        // ------------------------------------------
        // Check duplicate player
        // ------------------------------------------

        const existingRegistration =
            await pool.query(
                `
                SELECT id
                FROM tournament_registrations
                WHERE tournament_id = $1
                AND player_id = $2
                LIMIT 1
                `,
                [
                    tournament.id,
                    playerId
                ]
            );

        if (
            existingRegistration.rows.length > 0
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "You have already registered for this tournament."
            });
        }

        // ------------------------------------------
        // Register
        // ------------------------------------------

        const registrationResult =
            await pool.query(
                `
                INSERT INTO tournament_registrations
                (
                    tournament_id,
                    player_id,
                    participant_name
                )
                VALUES
                (
                    $1,
                    $2,
                    $3
                )
                RETURNING *
                `,
                [
                    tournament.id,
                    playerId,
                    name.trim()
                ]
            );

        return res.status(201).json({
            success: true,
            message:
                `You are registered for ${tournament.name}.`,
            registration:
                registrationResult.rows[0],
            tournament
        });

    } catch (error) {

        console.error(
            "Tournament Registration Error:",
            error
        );

        next(error);
    }
};
// ==========================================
// GET TOURNAMENT PARTICIPANTS
// ==========================================

const getTournamentParticipants = async (
    req,
    res,
    next
) => {
    try {

        const tournamentId =
            Number(req.params.tournamentId);

        const organizerId =
            req.user.id;

        if (!Number.isInteger(tournamentId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid tournament ID"
            });
        }

        // ------------------------------------------
        // Verify tournament belongs to organizer
        // ------------------------------------------

        const tournamentResult =
            await pool.query(
                `
                SELECT
                    id,
                    name,
                    sport,
                    category,
                    format,
                    max_players,
                    status,
                    registration_code
                FROM public.tournaments
                WHERE id = $1
                AND organizer_id = $2
                LIMIT 1
                `,
                [
                    tournamentId,
                    organizerId
                ]
            );

        if (
            tournamentResult.rows.length === 0
        ) {
            return res.status(404).json({
                success: false,
                message:
                    "Tournament not found"
            });
        }

        const tournament =
            tournamentResult.rows[0];

        // ------------------------------------------
        // Get participants
        // ------------------------------------------

        const participantsResult =
            await pool.query(
                `
                SELECT
                    tr.id,
                    tr.player_id,
                    tr.participant_name,
                    tr.registered_at,

                    u.email,
                    u.phone

                FROM public.tournament_registrations tr

                JOIN public.users u
                    ON u.id = tr.player_id

                WHERE tr.tournament_id = $1

                ORDER BY tr.registered_at ASC
                `,
                [tournamentId]
            );

        return res.status(200).json({
            success: true,

            tournament,

            participants:
                participantsResult.rows,

            count:
                participantsResult.rows.length
        });

    } catch (error) {

        console.error(
            "Get Tournament Participants Error:",
            error
        );

        next(error);
    }
};

module.exports = {
    registerForTournament,
    getTournamentParticipants
};