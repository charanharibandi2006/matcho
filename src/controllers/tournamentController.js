const pool = require("../config/db");

// ==========================================
// GENERATE REGISTRATION CODE
// ==========================================

const generateRegistrationCode = async () => {
    for (let attempt = 0; attempt < 5; attempt++) {

        const code =
            `MCH-${Math.random()
                .toString(36)
                .slice(2, 6)
                .toUpperCase()}-${Math.floor(
                    1000 + Math.random() * 9000
                )}`;

        const existing = await pool.query(
            `
            SELECT 1
            FROM tournaments
            WHERE registration_code = $1
            LIMIT 1
            `,
            [code]
        );

        if (existing.rows.length === 0) {
            return code;
        }
    }

    throw new Error(
        "Unable to generate a unique registration code"
    );
};


// ==========================================
// CREATE TOURNAMENT
// ==========================================

const createTournament = async (req, res, next) => {

    try {

        const {
            name,
            sport,
            category,
            startDate,
            endDate,
            location,
            maxParticipants,
            description,
            format
        } = req.body;


        // ------------------------------------------
        // Logged-in Organizer
        // ------------------------------------------

        const organizerId = req.user.id;


        // ------------------------------------------
        // Required field validation
        // ------------------------------------------

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Tournament name is required"
            });
        }

        if (!sport) {
            return res.status(400).json({
                success: false,
                message: "Sport is required"
            });
        }

        if (!category) {
            return res.status(400).json({
                success: false,
                message: "Category is required"
            });
        }

        if (!startDate) {
            return res.status(400).json({
                success: false,
                message: "Start date is required"
            });
        }

        if (!endDate) {
            return res.status(400).json({
                success: false,
                message: "End date is required"
            });
        }

        if (!location || !location.trim()) {
            return res.status(400).json({
                success: false,
                message: "Location is required"
            });
        }

        if (
            maxParticipants === undefined ||
            maxParticipants === null ||
            Number(maxParticipants) < 2
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Maximum participants must be at least 2"
            });
        }

        if (!format || !String(format).trim()) {
            return res.status(400).json({
                success: false,
                message: "Tournament format is required"
            });
        }


        // ------------------------------------------
        // Date validation
        // ------------------------------------------

        if (
            new Date(endDate) <
            new Date(startDate)
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "End date cannot be before start date"
            });
        }


        // ------------------------------------------
        // Currently supported sport
        // ------------------------------------------

        if (
            String(sport).toLowerCase() !==
            "badminton"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Only Badminton tournament creation is currently available"
            });
        }


        // ------------------------------------------
        // Format validation
        // ------------------------------------------

        const standardFormats = [
            "Knockout",
            "Round Robin",
            "Round Robin + Knockout"
        ];

        const cleanedFormat =
            String(format).trim();

        // Either one of our standard formats
        // OR a custom format description.
        const isStandardFormat =
            standardFormats.includes(
                cleanedFormat
            );

        if (
            !isStandardFormat &&
            cleanedFormat.length < 5
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Custom tournament format is too short"
            });
        }


        // ------------------------------------------
        // Generate Registration Code
        // ------------------------------------------

        const registrationCode =
            await generateRegistrationCode();


        // ------------------------------------------
        // Create Tournament
        // ------------------------------------------

        const result = await pool.query(
            `
            INSERT INTO tournaments
            (
                organizer_id,
                name,
                sport,
                category,
                description,
                format,
                fixture_type,
                venue,
                start_date,
                end_date,
                registration_deadline,
                max_players,
                status,
                champion_id,
                registration_code
            )
            VALUES
            (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7,
                $8,
                $9,
                $10,
                $11,
                $12,
                $13,
                $14,
                $15
            )
            RETURNING *
            `,
            [
                organizerId,

                name.trim(),

                sport,

                category,

                description
                    ? description.trim()
                    : null,

                // IMPORTANT:
                // Save the format selected
                // by the organizer.
                cleanedFormat,

                null,

                location.trim(),

                startDate,

                endDate,

                null,

                Number(maxParticipants),

                "Registration Open",

                null,

                registrationCode
            ]
        );


        // ------------------------------------------
        // Response
        // ------------------------------------------

        return res.status(201).json({
            success: true,
            message:
                "Tournament created successfully",
            tournament: result.rows[0]
        });

    } catch (error) {

        console.error(
            "Create Tournament Error:",
            error
        );

        next(error);
    }
};


// ==========================================
// GET ALL TOURNAMENTS
// ==========================================

const getAllTournaments = async (
    req,
    res,
    next
) => {

    try {

        const result = await pool.query(
            `
            SELECT
                t.*,
                u.full_name AS organizer_name
            FROM tournaments t
            JOIN users u
                ON u.id = t.organizer_id
            ORDER BY t.id DESC
            `
        );

        return res.status(200).json({
            success: true,
            tournaments: result.rows
        });

    } catch (error) {

        console.error(
            "Get All Tournaments Error:",
            error
        );

        next(error);
    }
};


// ==========================================
// GET TOURNAMENT BY ID
// ==========================================

const getTournamentById = async (
    req,
    res,
    next
) => {

    try {

        const id = Number(
            req.params.id
        );


        // ------------------------------------------
        // Validate ID
        // ------------------------------------------

        if (
            !Number.isInteger(id) ||
            id <= 0
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid tournament ID"
            });
        }


        // ------------------------------------------
        // Get Tournament
        // ------------------------------------------

        const result = await pool.query(
            `
            SELECT
                t.*,
                u.full_name AS organizer_name
            FROM tournaments t
            JOIN users u
                ON u.id = t.organizer_id
            WHERE t.id = $1
            `,
            [id]
        );


        if (
            result.rows.length === 0
        ) {
            return res.status(404).json({
                success: false,
                message:
                    "Tournament not found"
            });
        }


        return res.status(200).json({
            success: true,
            tournament:
                result.rows[0]
        });

    } catch (error) {

        console.error(
            "Get Tournament Error:",
            error
        );

        next(error);
    }
};


// ==========================================
// UPDATE TOURNAMENT
// ==========================================

const updateTournament = async (
    req,
    res,
    next
) => {

    try {

        const id = Number(
            req.params.id
        );


        // ------------------------------------------
        // Validate ID
        // ------------------------------------------

        if (
            !Number.isInteger(id) ||
            id <= 0
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid tournament ID"
            });
        }


        const {
            name,
            sport,
            category,
            description,
            startDate,
            endDate,
            location,
            maxParticipants,
            format,
            status
        } = req.body;


        // ------------------------------------------
        // Logged-in Organizer
        // ------------------------------------------

        const organizerId = req.user.id;


        // ------------------------------------------
        // Date validation
        // ------------------------------------------

        if (
            startDate &&
            endDate &&
            new Date(endDate) <
            new Date(startDate)
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "End date cannot be before start date"
            });
        }


        // ------------------------------------------
        // Format validation
        // ------------------------------------------

        if (
            format !== undefined &&
            format !== null &&
            String(format).trim() === ""
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Tournament format cannot be empty"
            });
        }


        // ------------------------------------------
        // Update ONLY owner's tournament
        // ------------------------------------------

        const result = await pool.query(
    `
    UPDATE tournaments
    SET
        name = COALESCE($1, name),
        sport = COALESCE($2, sport),
        category = COALESCE($3, category),
        description = COALESCE($4, description),
        venue = COALESCE($5, venue),
        start_date = COALESCE($6, start_date),
        end_date = COALESCE($7, end_date),
        max_players = COALESCE($8, max_players),
        status = COALESCE($9, status),
        format = COALESCE($10, format),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $11
    AND organizer_id = $12
    RETURNING *
    `,
    [
        name || null,
        sport || null,
        category || null,
        description || null,
        location || null,
        startDate || null,
        endDate || null,
        maxParticipants || null,
        status || null,
        format || null,
        id,
        organizerId
    ]
);


        if (
            result.rows.length === 0
        ) {
            return res.status(404).json({
                success: false,
                message:
                    "Tournament not found"
            });
        }


        return res.status(200).json({
            success: true,
            message:
                "Tournament updated successfully",
            tournament:
                result.rows[0]
        });

    } catch (error) {

        console.error(
            "Update Tournament Error:",
            error
        );

        next(error);
    }
};


// ==========================================
// DELETE TOURNAMENT
// ==========================================

const deleteTournament = async (
    req,
    res,
    next
) => {

    try {

        const id = Number(
            req.params.id
        );


        // ------------------------------------------
        // Validate ID
        // ------------------------------------------

        if (
            !Number.isInteger(id) ||
            id <= 0
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid tournament ID"
            });
        }


        // ------------------------------------------
        // Logged-in Organizer
        // ------------------------------------------

        const organizerId = req.user.id;


        // ------------------------------------------
        // Delete ONLY owner's tournament
        // ------------------------------------------

        const result = await pool.query(
            `
            DELETE FROM tournaments
            WHERE id = $1
            AND organizer_id = $2
            RETURNING id
            `,
            [
                id,
                organizerId
            ]
        );


        if (
            result.rows.length === 0
        ) {
            return res.status(404).json({
                success: false,
                message:
                    "Tournament not found"
            });
        }


        return res.status(200).json({
            success: true,
            message:
                "Tournament deleted successfully"
        });

    } catch (error) {

        console.error(
            "Delete Tournament Error:",
            error
        );

        next(error);
    }
};

const getTournamentByRegistrationCode = async (
    req,
    res,
    next
) => {
    try {
        const code = String(
            req.params.code || ""
        )
            .trim()
            .toUpperCase();

        if (!code) {
            return res.status(400).json({
                success: false,
                message: "Registration code is required"
            });
        }

        const result = await pool.query(
            `
            SELECT
                t.*,
                u.full_name AS organizer_name
            FROM public.tournaments t
            JOIN public.users u
                ON u.id = t.organizer_id
            WHERE UPPER(t.registration_code) = $1
            LIMIT 1
            `,
            [code]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message:
                    "Tournament registration ID was not found."
            });
        }

        const tournament = result.rows[0];

        if (tournament.status === "Completed") {
            return res.status(400).json({
                success: false,
                message:
                    "Registration is closed for this tournament."
            });
        }

        return res.status(200).json({
            success: true,
            tournament
        });

    } catch (error) {
        console.error(
            "Get Tournament By Registration Code Error:",
            error
        );

        next(error);
    }
};

// ==========================================
// GET MY TOURNAMENTS
// ==========================================

const getMyTournaments = async (req, res, next) => {
    try {
        const organizerId = req.user.id;

        const result = await pool.query(
            `
            SELECT
                t.*,
                u.full_name AS organizer_name,

                (
                    SELECT COUNT(*)::int
                    FROM tournament_registrations tr
                    WHERE tr.tournament_id = t.id
                ) AS participant_count

            FROM public.tournaments t

            JOIN public.users u
                ON u.id = t.organizer_id

            WHERE t.organizer_id = $1

            ORDER BY t.created_at DESC
            `,
            [organizerId]
        );

        return res.status(200).json({
            success: true,
            tournaments: result.rows
        });

    } catch (error) {
        console.error(
            "Get My Tournaments Error:",
            error
        );

        next(error);
    }
};


// ==========================================
// EXPORT
// ==========================================

module.exports = {
    createTournament,
    getAllTournaments,
    getTournamentById,
    getTournamentByRegistrationCode,
    getMyTournaments,
    updateTournament,
    deleteTournament
};