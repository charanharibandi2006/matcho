const { body } = require("express-validator");

const matchValidation = [
    body("tournamentId")
        .notEmpty()
        .withMessage("Tournament ID is required"),

    body("teamA")
        .trim()
        .notEmpty()
        .withMessage("Team A is required"),

    body("teamB")
        .trim()
        .notEmpty()
        .withMessage("Team B is required")
        .custom((value, { req }) => {
            if (value.toLowerCase() === req.body.teamA.toLowerCase()) {
                throw new Error("Team A and Team B cannot be the same");
            }
            return true;
        }),

    body("venue")
        .trim()
        .notEmpty()
        .withMessage("Venue is required"),

    body("matchDate")
        .notEmpty()
        .withMessage("Match date is required"),

    body("matchTime")
        .notEmpty()
        .withMessage("Match time is required")
];

module.exports = {
    matchValidation
};