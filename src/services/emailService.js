const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
    }
});

const sendOTPEmail = async (email, otp, purpose) => {

    const subject =
        purpose === "registration"
            ? "Matcho Registration OTP"
            : "Matcho Password Reset OTP";

    const message =
        purpose === "registration"
            ? "Use this OTP to verify your Matcho account."
            : "Use this OTP to reset your Matcho password.";

    await transporter.sendMail({
        from: `"Matcho" <${process.env.EMAIL_USER}>`,
        to: email,
        subject,
        text: `${message}\n\nYour OTP is: ${otp}\n\nThis OTP expires in 5 minutes.`
    });
};

module.exports = {
    sendOTPEmail
};