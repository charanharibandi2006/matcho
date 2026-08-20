const bcrypt = require("bcrypt");
const pool = require("../config/db");
const {
    sendOTPEmail
} = require("../services/emailService");


// ==========================================
// GENERATE 6 DIGIT OTP
// ==========================================

const generateOTP = () => {
    return Math.floor(
        100000 + Math.random() * 900000
    ).toString();
};


// ==========================================
// SEND REGISTRATION OTP
// ==========================================

const sendRegistrationOTP = async (req, res) => {
    try {

        const {
            name,
            email,
            phone,
            password,
            role
        } = req.body;

        // ------------------------------------------
        // Validate
        // ------------------------------------------

        if (
            !name ||
            !email ||
            !phone ||
            !password ||
            !role
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "All registration fields are required"
            });
        }

        // ------------------------------------------
        // Only Organizer
        // ------------------------------------------

        if (role !== "Organizer") {
            return res.status(400).json({
                success: false,
                message:
                    "Only Organizer registration is allowed"
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message:
                    "Password must be at least 8 characters"
            });
        }

        const normalizedEmail =
            email.trim().toLowerCase();

        const normalizedPhone =
            phone.trim();

        // ------------------------------------------
        // Check existing account
        // ------------------------------------------

        const existingUser =
            await pool.query(
                `
                SELECT id, email, phone, role
                FROM users
                WHERE
                    LOWER(email) = $1
                    OR phone = $2
                LIMIT 1
                `,
                [
                    normalizedEmail,
                    normalizedPhone
                ]
            );

        if (existingUser.rows.length > 0) {

            const existing =
                existingUser.rows[0];

            if (
                existing.email &&
                existing.email.toLowerCase() ===
                    normalizedEmail
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Email is already registered"
                });
            }

            if (
                existing.phone ===
                normalizedPhone
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Phone number is already registered"
                });
            }
        }

        // ------------------------------------------
        // Hash password
        // ------------------------------------------

        const passwordHash =
            await bcrypt.hash(
                password,
                10
            );

        // ------------------------------------------
        // Generate OTP
        // ------------------------------------------

        const otp =
            generateOTP();

        const otpHash =
            await bcrypt.hash(
                otp,
                10
            );

        const expiresAt =
            new Date(
                Date.now() +
                5 * 60 * 1000
            );

        // ------------------------------------------
        // Remove old registration OTP
        // ------------------------------------------

        await pool.query(
            `
            DELETE FROM otp_verifications
            WHERE email = $1
            AND purpose = 'registration'
            `,
            [normalizedEmail]
        );

        // ------------------------------------------
        // Store OTP
        // ------------------------------------------

        await pool.query(
            `
            INSERT INTO otp_verifications
            (
                full_name,
                email,
                phone,
                password_hash,
                role,
                otp_hash,
                purpose,
                expires_at,
                attempts,
                verified
            )
            VALUES
            (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                'registration',
                $7,
                0,
                FALSE
            )
            `,
            [
                name.trim(),
                normalizedEmail,
                normalizedPhone,
                passwordHash,
                "Organizer",
                otpHash,
                expiresAt
            ]
        );

        // ------------------------------------------
        // Send OTP
        // ------------------------------------------

        await sendOTPEmail(
            normalizedEmail,
            otp,
            "registration"
        );

        return res.status(200).json({
            success: true,
            message:
                "Registration OTP sent successfully"
        });

    } catch (error) {

        console.error(
            "Registration OTP Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to send registration OTP"
        });
    }
};


// ==========================================
// VERIFY REGISTRATION OTP
// ==========================================

const verifyRegistrationOTP = async (
    req,
    res
) => {

    try {

        const {
            email,
            otp
        } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message:
                    "Email and OTP are required"
            });
        }

        const normalizedEmail =
            email.trim().toLowerCase();

        // ------------------------------------------
        // Find OTP
        // ------------------------------------------

        const result =
            await pool.query(
                `
                SELECT *
                FROM otp_verifications
                WHERE
                    email = $1
                    AND purpose = 'registration'
                    AND verified = FALSE
                ORDER BY created_at DESC
                LIMIT 1
                `,
                [normalizedEmail]
            );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message:
                    "OTP not found or already used"
            });
        }

        const otpRecord =
            result.rows[0];

        // ------------------------------------------
        // Expiry
        // ------------------------------------------

        if (
            new Date() >
            new Date(otpRecord.expires_at)
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "OTP has expired"
            });
        }

        // ------------------------------------------
        // Attempts
        // ------------------------------------------

        if (
            Number(otpRecord.attempts || 0) >= 5
        ) {
            return res.status(429).json({
                success: false,
                message:
                    "Too many OTP attempts"
            });
        }

        // ------------------------------------------
        // Compare OTP
        // ------------------------------------------

        const valid =
            await bcrypt.compare(
                otp,
                otpRecord.otp_hash
            );

        if (!valid) {

            await pool.query(
                `
                UPDATE otp_verifications
                SET attempts = attempts + 1
                WHERE id = $1
                `,
                [otpRecord.id]
            );

            return res.status(400).json({
                success: false,
                message:
                    "Invalid OTP"
            });
        }

        // ------------------------------------------
        // Create Organizer
        // ------------------------------------------

        const userResult =
            await pool.query(
                `
                INSERT INTO users
                (
                    full_name,
                    email,
                    phone,
                    password,
                    role,
                    organizer_status
                )
                VALUES
                (
                    $1,
                    $2,
                    $3,
                    $4,
                    'Organizer',
                    'pending'
                )
                RETURNING
                    id,
                    full_name,
                    email,
                    phone,
                    role,
                    organizer_status
                `,
                [
                    otpRecord.full_name,
                    otpRecord.email,
                    otpRecord.phone,
                    otpRecord.password_hash
                ]
            );

        // ------------------------------------------
        // Mark OTP verified
        // ------------------------------------------

        await pool.query(
            `
            UPDATE otp_verifications
            SET verified = TRUE
            WHERE id = $1
            `,
            [otpRecord.id]
        );

        return res.status(201).json({
            success: true,
            message:
                "Organizer registration successful",
            user:
                userResult.rows[0]
        });

    } catch (error) {

        console.error(
            "Verify Registration OTP Error:",
            error
        );

        if (error.code === "23505") {
            return res.status(400).json({
                success: false,
                message:
                    "Email or phone number is already registered"
            });
        }

        return res.status(500).json({
            success: false,
            message:
                "Failed to verify registration OTP"
        });
    }
};


// ==========================================
// SEND FORGOT PASSWORD OTP
// ==========================================

const sendForgotPasswordOTP = async (
    req,
    res
) => {

    try {

        let {
            identifier,
            role
        } = req.body;

        identifier =
            identifier?.trim();

        role =
            role?.trim() || "Organizer";

        console.log(
            "========== FORGOT PASSWORD OTP =========="
        );

        console.log(
            "Identifier:",
            identifier
        );

        console.log(
            "Role:",
            role
        );

        // ------------------------------------------
        // Validate
        // ------------------------------------------

        if (!identifier) {
            return res.status(400).json({
                success: false,
                message:
                    "Email or phone is required"
            });
        }

        // ------------------------------------------
        // Only Organizer
        // ------------------------------------------

        if (role !== "Organizer") {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid account type"
            });
        }

        // ------------------------------------------
        // Find Organizer
        // ------------------------------------------

        const result =
            await pool.query(
                `
                SELECT
                    id,
                    full_name,
                    email,
                    phone,
                    role
                FROM users
                WHERE
                    (
                        LOWER(email) = LOWER($1)
                        OR phone = $1
                    )
                    AND role = 'Organizer'
                LIMIT 1
                `,
                [identifier]
            );

        console.log(
            "Users found:",
            result.rows.length
        );

        if (result.rows.length === 0) {

            return res.status(404).json({
                success: false,
                message:
                    "No Organizer account found with this email/phone"
            });
        }

        const user =
            result.rows[0];

        // ------------------------------------------
        // Generate OTP
        // ------------------------------------------

        const otp =
            generateOTP();

        const otpHash =
            await bcrypt.hash(
                otp,
                10
            );

        const expiresAt =
            new Date(
                Date.now() +
                5 * 60 * 1000
            );

        // ------------------------------------------
        // Delete old forgot password OTP
        // ------------------------------------------

        await pool.query(
            `
            DELETE FROM otp_verifications
            WHERE
                email = $1
                AND purpose = 'forgot_password'
            `,
            [user.email]
        );

        // ------------------------------------------
        // Insert new OTP
        // ------------------------------------------

        await pool.query(
            `
            INSERT INTO otp_verifications
            (
                email,
                phone,
                role,
                otp_hash,
                purpose,
                expires_at,
                attempts,
                verified
            )
            VALUES
            (
                $1,
                $2,
                'Organizer',
                $3,
                'forgot_password',
                $4,
                0,
                FALSE
            )
            `,
            [
                user.email,
                user.phone,
                otpHash,
                expiresAt
            ]
        );

        // ------------------------------------------
        // Send email
        // ------------------------------------------

        await sendOTPEmail(
            user.email,
            otp,
            "forgot_password"
        );

        return res.status(200).json({
            success: true,
            message:
                "Password reset OTP sent successfully"
        });

    } catch (error) {

        console.error(
            "Forgot Password OTP Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to send password reset OTP"
        });
    }
};


// ==========================================
// VERIFY FORGOT PASSWORD OTP
// ==========================================

const verifyForgotPasswordOTP = async (
    req,
    res
) => {

    try {

        let {
            identifier,
            role,
            otp
        } = req.body;

        identifier =
            identifier?.trim();

        role =
            role?.trim() || "Organizer";

        otp =
            otp?.trim();

        // ------------------------------------------
        // Validate
        // ------------------------------------------

        if (!identifier || !otp) {
            return res.status(400).json({
                success: false,
                message:
                    "Email/Phone and OTP are required"
            });
        }

        if (role !== "Organizer") {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid account type"
            });
        }

        // ------------------------------------------
        // Find user
        // ------------------------------------------

        const userResult =
            await pool.query(
                `
                SELECT
                    id,
                    email,
                    phone,
                    role
                FROM users
                WHERE
                    (
                        LOWER(email) = LOWER($1)
                        OR phone = $1
                    )
                    AND role = 'Organizer'
                LIMIT 1
                `,
                [identifier]
            );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message:
                    "No Organizer account found with this email/phone"
            });
        }

        const user =
            userResult.rows[0];

        // ------------------------------------------
        // Get latest OTP
        // ------------------------------------------

        const otpResult =
            await pool.query(
                `
                SELECT *
                FROM otp_verifications
                WHERE
                    email = $1
                    AND purpose = 'forgot_password'
                    AND verified = FALSE
                ORDER BY created_at DESC
                LIMIT 1
                `,
                [user.email]
            );

        if (otpResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message:
                    "OTP not found or already used"
            });
        }

        const otpRecord =
            otpResult.rows[0];

        // ------------------------------------------
        // Check expiry
        // ------------------------------------------

        if (
            new Date() >
            new Date(otpRecord.expires_at)
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "OTP has expired"
            });
        }

        // ------------------------------------------
        // Check attempts
        // ------------------------------------------

        if (
            Number(otpRecord.attempts || 0) >= 5
        ) {
            return res.status(429).json({
                success: false,
                message:
                    "Too many OTP attempts"
            });
        }

        // ------------------------------------------
        // Compare
        // ------------------------------------------

        const valid =
            await bcrypt.compare(
                otp,
                otpRecord.otp_hash
            );

        if (!valid) {

            await pool.query(
                `
                UPDATE otp_verifications
                SET attempts = attempts + 1
                WHERE id = $1
                `,
                [otpRecord.id]
            );

            return res.status(400).json({
                success: false,
                message:
                    "Invalid OTP"
            });
        }

        // ------------------------------------------
        // Mark verified
        // ------------------------------------------

        await pool.query(
            `
            UPDATE otp_verifications
            SET verified = TRUE
            WHERE id = $1
            `,
            [otpRecord.id]
        );

        return res.status(200).json({
            success: true,
            message:
                "OTP verified successfully"
        });

    } catch (error) {

        console.error(
            "Verify Forgot Password OTP Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to verify OTP"
        });
    }
};


// ==========================================
// RESET PASSWORD
// ==========================================

const resetPassword = async (
    req,
    res
) => {

    try {

        let {
            identifier,
            role,
            password
        } = req.body;

        identifier =
            identifier?.trim();

        role =
            role?.trim() || "Organizer";

        // ------------------------------------------
        // Validate
        // ------------------------------------------

        if (
            !identifier ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Identifier and password are required"
            });
        }

        if (role !== "Organizer") {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid account type"
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message:
                    "Password must be at least 8 characters"
            });
        }

        // ------------------------------------------
        // Find Organizer
        // ------------------------------------------

        const userResult =
            await pool.query(
                `
                SELECT
                    id,
                    email,
                    role
                FROM users
                WHERE
                    (
                        LOWER(email) = LOWER($1)
                        OR phone = $1
                    )
                    AND role = 'Organizer'
                LIMIT 1
                `,
                [identifier]
            );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message:
                    "No Organizer account found"
            });
        }

        const user =
            userResult.rows[0];

        // ------------------------------------------
        // Check verified OTP
        // ------------------------------------------

        const otpResult =
            await pool.query(
                `
                SELECT id
                FROM otp_verifications
                WHERE
                    email = $1
                    AND purpose = 'forgot_password'
                    AND verified = TRUE
                ORDER BY created_at DESC
                LIMIT 1
                `,
                [user.email]
            );

        if (otpResult.rows.length === 0) {
            return res.status(403).json({
                success: false,
                message:
                    "Please verify the OTP first"
            });
        }

        // ------------------------------------------
        // Hash new password
        // ------------------------------------------

        const hashedPassword =
            await bcrypt.hash(
                password,
                10
            );

        // ------------------------------------------
        // Update password
        // ------------------------------------------

        const updateResult =
            await pool.query(
                `
                UPDATE users
                SET password = $1
                WHERE id = $2
                RETURNING
                    id,
                    email,
                    role
                `,
                [
                    hashedPassword,
                    user.id
                ]
            );

        if (
            updateResult.rows.length === 0
        ) {
            return res.status(500).json({
                success: false,
                message:
                    "Password update failed"
            });
        }

        // ------------------------------------------
        // Invalidate OTP
        // ------------------------------------------

        await pool.query(
            `
            UPDATE otp_verifications
            SET verified = FALSE
            WHERE id = $1
            `,
            [otpResult.rows[0].id]
        );

        return res.status(200).json({
            success: true,
            message:
                "Password reset successfully"
        });

    } catch (error) {

        console.error(
            "Reset Password Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to reset password"
        });
    }
};


// ==========================================
// EXPORT
// ==========================================

module.exports = {
    sendRegistrationOTP,
    verifyRegistrationOTP,
    sendForgotPasswordOTP,
    verifyForgotPasswordOTP,
    resetPassword
};