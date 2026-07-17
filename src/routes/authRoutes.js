const express = require("express");
const router = express.Router();

const { register, login } = require("../controllers/authController");

const { registerValidation } = require("../validators/authValidator");

const validate = require("../middleware/validate");

router.post(
    "/register",
    registerValidation,
    validate,
    register
);

router.post("/login", login);

module.exports = router;