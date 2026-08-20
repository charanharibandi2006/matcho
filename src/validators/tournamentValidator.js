const { body } = require("express-validator");

// ==========================================
// CREATE TOURNAMENT
// ==========================================

const tournamentValidation = [

    body("name")
        .trim()
        .notEmpty()
        .withMessage("Tournament name is required"),

    body("sport")
        .trim()
        .notEmpty()
        .withMessage("Sport is required"),

    body("category")
        .trim()
        .notEmpty()
        .withMessage("Category is required"),

    body("startDate")
        .notEmpty()
        .withMessage("Start date is required")
        .isISO8601()
        .withMessage("Start date must be a valid date"),

    body("endDate")
        .notEmpty()
        .withMessage("End date is required")
        .isISO8601()
        .withMessage("End date must be a valid date"),

    body("location")
        .trim()
        .notEmpty()
        .withMessage("Location is required"),

    body("maxParticipants")
        .notEmpty()
        .withMessage("Maximum participants is required")
        .isInt({ min: 2 })
        .withMessage("Maximum participants must be at least 2"),

    body("description")
        .optional()
        .trim()
];


// ==========================================
// UPDATE TOURNAMENT
// ==========================================

const tournamentUpdateValidation = [

    body("name")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("Tournament name cannot be empty"),

    body("sport")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("Sport cannot be empty"),

    body("category")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("Category cannot be empty"),

    body("startDate")
        .optional()
        .isISO8601()
        .withMessage("Start date must be a valid date"),

    body("endDate")
        .optional()
        .isISO8601()
        .withMessage("End date must be a valid date"),

    body("location")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("Location cannot be empty"),

    body("maxParticipants")
        .optional()
        .isInt({ min: 2 })
        .withMessage("Maximum participants must be at least 2"),

    body("description")
        .optional()
        .trim(),

    body("status")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("Status cannot be empty")
];


module.exports = {
    tournamentValidation,
    tournamentUpdateValidation
};