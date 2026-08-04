const { body } = require("express-validator");

const matchValidation = [

    body("fixtureId")
        .notEmpty()
        .withMessage("Fixture ID is required")
        .isInt({ min: 1 })
        .withMessage("Fixture ID must be a positive integer"),

    body("court")
        .trim()
        .notEmpty()
        .withMessage("Court is required"),

    body("matchDate")
        .notEmpty()
        .withMessage("Match date is required")
        .isISO8601()
        .withMessage("Match date must be in YYYY-MM-DD format"),

    body("startTime")
        .notEmpty()
        .withMessage("Start time is required"),

    body("endTime")
        .notEmpty()
        .withMessage("End time is required"),

    body("referee")
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage("Referee name must be between 2 and 100 characters")

];

module.exports = {
    matchValidation
};