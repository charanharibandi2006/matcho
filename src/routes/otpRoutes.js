const express = require("express");

const router = express.Router();

const {
    sendRegistrationOTP,
    verifyRegistrationOTP,
    sendForgotPasswordOTP,
    verifyForgotPasswordOTP
} = require("../controllers/otpController");


// Send registration OTP
router.post(
    "/register/send-otp",
    sendRegistrationOTP
);


// Verify registration OTP
router.post(
    "/register/verify-otp",
    verifyRegistrationOTP
);

// Send forgot-password OTP
router.post(
    "/forgot-password/send-otp",
    sendForgotPasswordOTP
);

// Verify forgot-password OTP
router.post(
    "/forgot-password/verify-otp",
    verifyForgotPasswordOTP
);


module.exports = router;