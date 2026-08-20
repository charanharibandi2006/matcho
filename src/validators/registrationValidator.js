const { body } = require("express-validator");

const registrationValidation = [
    body("tournamentId")
        .notEmpty()
        .withMessage("Tournament ID is required"),

    body("playerName")
        .notEmpty()
        .withMessage("Player name is required"),

    body("college")
        .notEmpty()
        .withMessage("College name is required"),

    body("phone")
        .notEmpty()
        .withMessage("Phone number is required")
];

module.exports = { registrationValidation };