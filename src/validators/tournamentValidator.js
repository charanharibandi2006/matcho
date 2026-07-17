const { body } = require("express-validator");

const tournamentValidation = [
    body("name")
        .notEmpty()
        .withMessage("Tournament name is required"),

    body("sport")
        .notEmpty()
        .withMessage("Sport is required"),

    body("date")
        .notEmpty()
        .withMessage("Date is required")
];

module.exports = {
    tournamentValidation
};