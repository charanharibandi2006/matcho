const { body } = require("express-validator");

const teamValidation = [
    body("teamName")
        .notEmpty()
        .withMessage("Team name is required"),

    body("sport")
        .notEmpty()
        .withMessage("Sport is required"),

    body("captain")
        .notEmpty()
        .withMessage("Captain name is required")
];

module.exports = {
    teamValidation
};