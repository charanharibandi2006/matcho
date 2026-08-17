const express = require("express");

const router = express.Router();

// ==========================================
// AUTH CONTROLLER
// ==========================================

const {
    register,
    login
} = require("../controllers/authController");

// ==========================================
// OTP CONTROLLER
// ==========================================

const {
    sendRegistrationOTP,
    verifyRegistrationOTP,
    sendForgotPasswordOTP,
    verifyForgotPasswordOTP,
    resetPassword
} = require("../controllers/otpController");

// ==========================================
// VALIDATION
// ==========================================

const {
    registerValidation
} = require("../validators/authValidator");

const validate = require("../middleware/validate");



// ==========================================
// REGISTRATION OTP
// ==========================================

router.post(
    "/register/send-otp",
    sendRegistrationOTP
);

router.post(
    "/register/verify-otp",
    verifyRegistrationOTP
);

// ==========================================
// OLD REGISTER
// ==========================================

router.post(
    "/register",
    registerValidation,
    validate,
    register
);

// ==========================================
// LOGIN
// ==========================================

router.post(
    "/login",
    login
);

// ==========================================
// FORGOT PASSWORD
// ==========================================

router.post(
    "/forgot-password/send-otp",
    sendForgotPasswordOTP
);

router.post(
    "/forgot-password/verify-otp",
    verifyForgotPasswordOTP
);

router.post(
    "/forgot-password/reset-password",
    resetPassword
);

module.exports = router;