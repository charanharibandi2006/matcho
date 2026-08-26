const crypto = require("crypto");
const bcrypt = require("bcrypt");

const pool = require("../config/db");

// =========================================================
// PUBLIC PLAYER REGISTRATION
// No player account/login is required.
//
// Player selects a tournament from the public dashboard
// and submits:
// - Name
// - Gender
// - C-Flat Number
// - Mobile Number
//
// A lightweight Player record is created internally only
// because the existing team/fixture system uses player_id.
// The player does NOT receive login credentials.
// =========================================================

const publicRegisterForTournament = async (req, res, next) => {
    try {
        const {
            tournamentId,
            name,
            gender,
            cFlatNumber,
            mobile,
            transactionId
        } = req.body;

        // =====================================================
        // CLEAN INPUT
        // =====================================================

        const parsedTournamentId = Number(tournamentId);

        const cleanName =
            String(name || "").trim();

        const cleanGender =
            String(gender || "").trim();

            const normalizedGender =
    cleanGender.toLowerCase();

if (
    !["male", "female"].includes(
        normalizedGender
    )
) {
    return res.status(400).json({
        success: false,
        message:
            "Please select a valid gender."
    });
}

        const cleanFlat =
            String(cFlatNumber || "").trim();

        const cleanMobile =
            String(mobile || "").replace(/\D/g, "");

        const cleanTransactionId =
            String(transactionId || "").trim();

        // =====================================================
        // VALIDATION
        // =====================================================

        if (
            !Number.isInteger(parsedTournamentId) ||
            parsedTournamentId <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid tournament."
            });
        }

        if (!cleanName) {
            return res.status(400).json({
                success: false,
                message: "Name is required."
            });
        }

        if (!cleanGender) {
            return res.status(400).json({
                success: false,
                message: "Gender is required."
            });
        }

        if (!cleanFlat) {
            return res.status(400).json({
                success: false,
                message: "C-Flat number is required."
            });
        }

        if (!cleanMobile) {
            return res.status(400).json({
                success: false,
                message: "Mobile number is required."
            });
        }

        if (!cleanTransactionId) {
            return res.status(400).json({
                success: false,
                message: "Transaction ID is required."
            });
        }

        if (
            cleanName.length < 2 ||
            cleanName.length > 100
        ) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid name."
            });
        }

        if (!/^[0-9]{10}$/.test(cleanMobile)) {
            return res.status(400).json({
                success: false,
                message:
                    "Please enter a valid 10-digit mobile number."
            });
        }

        // =====================================================
        // FIND TOURNAMENT
        // =====================================================

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
            WHERE id = $1
            LIMIT 1
            `,
            [parsedTournamentId]
        );

        if (tournamentResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Tournament not found."
            });
        }

        const tournament =
            tournamentResult.rows[0];

            // =====================================================
// GENDER VALIDATION FOR DOUBLES
// =====================================================

const tournamentCategory =
    String(tournament.category || "")
        .trim()
        .toLowerCase();

if (
    tournamentCategory === "men's doubles" &&
    cleanGender.toLowerCase() !== "male"
) {
    return res.status(400).json({
        success: false,
        message:
            "Only male players can register for Men's Doubles tournaments."
    });
}

if (
    tournamentCategory === "women's doubles" &&
    cleanGender.toLowerCase() !== "female"
) {
    return res.status(400).json({
        success: false,
        message:
            "Only female players can register for Women's Doubles tournaments."
    });
}

        // =====================================================
        // CHECK REGISTRATION STATUS
        // =====================================================

        if (
            tournament.status !==
            "Registration Open"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Registration is not open for this tournament."
            });
        }

        // =====================================================
        // CHECK PLAYER LIMIT
        // =====================================================

        const countResult = await pool.query(
            `
            SELECT COUNT(*)::int AS count
            FROM public.tournament_registrations
            WHERE tournament_id = $1
            `,
            [tournament.id]
        );

        const currentCount =
            Number(countResult.rows[0].count);

        if (
            tournament.max_players &&
            currentCount >=
            Number(tournament.max_players)
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "This tournament is full."
            });
        }

        // =====================================================
        // FIND OR CREATE INTERNAL PLAYER RECORD
        //
        // IMPORTANT:
        // This is NOT a player login account.
        //
        // We keep a users record because the existing
        // team/fixture system expects tournament_registrations
        // to have a player_id.
        // =====================================================

        let playerResult = await pool.query(
            `
            SELECT
                id,
                full_name,
                email,
                phone
            FROM public.users
            WHERE phone = $1
            AND role = 'Player'
            LIMIT 1
            `,
            [cleanMobile]
        );

        let playerId;

        // =====================================================
        // EXISTING PLAYER
        // =====================================================

        if (playerResult.rows.length > 0) {

            playerId =
                playerResult.rows[0].id;

            // Keep the latest submitted name
            // in sync with the registration.
            await pool.query(
                `
                UPDATE public.users
                SET full_name = $1
                WHERE id = $2
                `,
                [
                    cleanName,
                    playerId
                ]
            );

        }

        // =====================================================
        // NEW PLAYER
        // =====================================================

        else {

            const syntheticEmail =
                `player.${cleanMobile}@matcho.local`;

            const randomPassword =
                crypto
                    .randomBytes(32)
                    .toString("hex");

            const passwordHash =
                await bcrypt.hash(
                    randomPassword,
                    10
                );

            const createdPlayer =
                await pool.query(
                    `
                    INSERT INTO public.users
                    (
                        full_name,
                        email,
                        phone,
                        password,
                        role
                    )
                    VALUES
                    (
                        $1,
                        $2,
                        $3,
                        $4,
                        'Player'
                    )
                    RETURNING id
                    `,
                    [
                        cleanName,
                        syntheticEmail,
                        cleanMobile,
                        passwordHash
                    ]
                );

            playerId =
                createdPlayer.rows[0].id;
        }

        // =====================================================
        // CHECK DUPLICATE REGISTRATION
        //
        // A player cannot register twice for the same
        // tournament using the same mobile number.
        // =====================================================

        const duplicateResult =
            await pool.query(
                `
                SELECT
                    tr.id
                FROM public.tournament_registrations tr

                LEFT JOIN public.users u
                    ON u.id = tr.player_id

                WHERE tr.tournament_id = $1

                AND (
                    tr.player_id = $2
                    OR u.phone = $3
                    OR tr.mobile_number = $3
                )

                LIMIT 1
                `,
                [
                    tournament.id,
                    playerId,
                    cleanMobile
                ]
            );

        if (
            duplicateResult.rows.length > 0
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "This mobile number is already registered for this tournament."
            });
        }

        // =====================================================
        // CREATE TOURNAMENT REGISTRATION
        // =====================================================

        const registrationResult =
            await pool.query(
                `
                INSERT INTO public.tournament_registrations
                (
                    tournament_id,
                    player_id,
                    participant_name,
                    gender,
                    c_flat_number,
                    mobile_number,
                    transaction_id
                )
                VALUES
                (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    $6,
                    $7
                )
                RETURNING
                    id,
                    tournament_id,
                    player_id,
                    participant_name,
                    gender,
                    c_flat_number,
                    mobile_number,
                    transaction_id,
                    registered_at
                `,
                [
                    tournament.id,
                    playerId,
                    cleanName,
                    cleanGender,
                    cleanFlat,
                    cleanMobile,
                    cleanTransactionId
                ]
            );

        // =====================================================
        // SUCCESS RESPONSE
        // =====================================================

        return res.status(201).json({
            success: true,

            message:
                `You are registered for ${tournament.name}.`,

            registration:
                registrationResult.rows[0],

            tournament: {
                id: tournament.id,
                name: tournament.name,
                sport: tournament.sport,
                category: tournament.category,
                format: tournament.format,
                venue: tournament.venue,
                start_date: tournament.start_date,
                end_date: tournament.end_date
            }
        });

    } catch (error) {

        console.error(
            "Public Tournament Registration Error:",
            error
        );

        // PostgreSQL unique constraint
        if (error.code === "23505") {
            return res.status(409).json({
                success: false,
                message:
                    "This participant is already registered for this tournament."
            });
        }

        next(error);
    }
};


// =========================================================
// GET TOURNAMENT PARTICIPANTS
//
// Organizer only.
//
// The organizer can see the players registered for
// tournaments that belong to them.
// =========================================================

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

        // =====================================================
        // VALIDATE TOURNAMENT ID
        // =====================================================

        if (
            !Number.isInteger(tournamentId) ||
            tournamentId <= 0
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid tournament ID."
            });
        }

        // =====================================================
        // VERIFY ORGANIZER OWNS TOURNAMENT
        // =====================================================

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
                    "Tournament not found."
            });
        }

        const tournament =
            tournamentResult.rows[0];

        // =====================================================
        // GET PARTICIPANTS
        // =====================================================

        const participantsResult =
            await pool.query(
                `
                SELECT
                    tr.id,
                    tr.player_id,
                    tr.participant_name,
                    tr.gender,
                    tr.c_flat_number,
                    tr.mobile_number,
                    tr.transaction_id,
                    tr.registered_at,

                    u.email,
                    u.phone

                FROM public.tournament_registrations tr

                JOIN public.users u
                    ON u.id = tr.player_id

                WHERE tr.tournament_id = $1

                ORDER BY
                    tr.registered_at ASC
                `,
                [tournamentId]
            );

        // =====================================================
        // SUCCESS
        // =====================================================

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


// =========================================================
// EXPORTS
// =========================================================

module.exports = {
    publicRegisterForTournament,
    getTournamentParticipants
};