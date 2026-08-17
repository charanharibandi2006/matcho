const bcrypt = require("bcrypt");
const pool = require("../config/db");
const { sendOTPEmail } = require("../services/emailService");

// ==========================================
// GENERATE 6-DIGIT OTP
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

        // --------------------------------
        // Validate required fields
        // --------------------------------

        if (
            !name ||
            !email ||
            !phone ||
            !password ||
            !role
        ) {
            return res.status(400).json({
                success: false,
                message: "All registration fields are required"
            });
        }

        // --------------------------------
        // Allowed registration roles
        // --------------------------------

        const allowedRoles = [
            "Score Viewer",
            "Player",
            "Organizer"
        ];

        if (!allowedRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                message: "Invalid registration role"
            });
        }

        // --------------------------------
        // Check existing user
        // Same email/phone can be used
        // for different roles
        // --------------------------------

        const existingUser = await pool.query(
            `
            SELECT id, email, phone, role
            FROM users
            WHERE
                (email = $1 AND role = $3)
                OR
                (phone = $2 AND role = $3)
            `,
            [email, phone, role]
        );

        if (existingUser.rows.length > 0) {

            const user = existingUser.rows[0];

            if (
                user.email === email &&
                user.role === role
            ) {
                return res.status(400).json({
                    success: false,
                    message: `Email already registered as ${role}`
                });
            }

            if (
                user.phone === phone &&
                user.role === role
            ) {
                return res.status(400).json({
                    success: false,
                    message: `Phone number already registered as ${role}`
                });
            }
        }

        // --------------------------------
        // Hash password temporarily
        // --------------------------------

        const passwordHash =
            await bcrypt.hash(password, 10);

        // --------------------------------
        // Generate OTP
        // --------------------------------

        const otp = generateOTP();

        // --------------------------------
        // Hash OTP
        // --------------------------------

        const otpHash =
            await bcrypt.hash(otp, 10);

        // --------------------------------
        // OTP expires in 5 minutes
        // --------------------------------

        const expiresAt = new Date(
            Date.now() + 5 * 60 * 1000
        );

        // --------------------------------
        // Delete previous registration OTP
        // --------------------------------

        await pool.query(
            `
            DELETE FROM otp_verifications
            WHERE email = $1
            AND role = $2
            AND purpose = 'registration'
            `,
            [email, role]
        );

        // --------------------------------
        // Store registration + OTP
        // --------------------------------

        await pool.query(
            `
            INSERT INTO otp_verifications
            (
                email,
                phone,
                full_name,
                password_hash,
                role,
                otp_hash,
                purpose,
                expires_at
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
                $7
            )
            `,
            [
                email,
                phone,
                name,
                passwordHash,
                role,
                otpHash,
                expiresAt
            ]
        );

        // --------------------------------
        // Send OTP email
        // --------------------------------

        await sendOTPEmail(
            email,
            otp,
            "registration"
        );

        return res.status(200).json({
            success: true,
            message: "OTP sent successfully"
        });

    } catch (error) {

        console.error(
            "Registration OTP Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to send OTP"
        });
    }
};

// ==========================================
// VERIFY REGISTRATION OTP
// ==========================================

const verifyRegistrationOTP = async (req, res) => {
    try {

        const {
            email,
            otp
        } = req.body;

        // --------------------------------
        // Validate
        // --------------------------------

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: "Email and OTP are required"
            });
        }

        // --------------------------------
        // Get latest registration OTP
        // --------------------------------

        const result = await pool.query(
            `
            SELECT *
            FROM otp_verifications
            WHERE email = $1
            AND purpose = 'registration'
            AND verified = FALSE
            ORDER BY created_at DESC
            LIMIT 1
            `,
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "OTP not found or already used"
            });
        }

        const otpRecord = result.rows[0];

        // --------------------------------
        // Check expiry
        // --------------------------------

        if (
            new Date() >
            new Date(otpRecord.expires_at)
        ) {
            return res.status(400).json({
                success: false,
                message: "OTP has expired"
            });
        }

        // --------------------------------
        // Check attempts
        // --------------------------------

        if (otpRecord.attempts >= 5) {
            return res.status(429).json({
                success: false,
                message: "Too many OTP attempts"
            });
        }

        // --------------------------------
        // Compare OTP
        // --------------------------------

        const isValid =
            await bcrypt.compare(
                otp,
                otpRecord.otp_hash
            );

        if (!isValid) {

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
                message: "Invalid OTP"
            });
        }

        // --------------------------------
        // Organizer status
        // --------------------------------

        const organizerStatus =
            otpRecord.role === "Organizer"
                ? "pending"
                : "not_required";

        // --------------------------------
        // Create user
        // --------------------------------

        const userResult = await pool.query(
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
                $5,
                $6
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
                otpRecord.password_hash,
                otpRecord.role,
                organizerStatus
            ]
        );

        // --------------------------------
        // Mark OTP verified
        // --------------------------------

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
            message: "Registration successful",
            user: userResult.rows[0]
        });

    } catch (error) {

        console.error(
            "Verify Registration OTP Error:",
            error
        );

        // PostgreSQL duplicate key
        if (error.code === "23505") {
            return res.status(400).json({
                success: false,
                message:
                    "Email or phone number is already registered"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Failed to verify OTP"
        });
    }
};

// ==========================================
// SEND FORGOT PASSWORD OTP
// ==========================================

const sendForgotPasswordOTP = async (req, res) => {
    try {

        const {
            identifier,
            role
        } = req.body;

        // --------------------------------
        // Validate
        // --------------------------------

        if (!identifier) {
            return res.status(400).json({
                success: false,
                message: "Email or phone is required"
            });
        }

        // --------------------------------
        // Find user
        // --------------------------------

        let result;

        if (role) {

            result = await pool.query(
                `
                SELECT id, email, phone, role
                FROM users
                WHERE
                    (email = $1 OR phone = $1)
                    AND role = $2
                LIMIT 1
                `,
                [identifier, role]
            );

        } else {

            result = await pool.query(
                `
                SELECT id, email, phone, role
                FROM users
                WHERE email = $1 OR phone = $1
                LIMIT 1
                `,
                [identifier]
            );
        }

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const user = result.rows[0];

        // --------------------------------
        // Generate OTP
        // --------------------------------

        const otp = generateOTP();

        const otpHash =
            await bcrypt.hash(otp, 10);

        // --------------------------------
        // OTP expires in 5 minutes
        // --------------------------------

        const expiresAt = new Date(
            Date.now() + 5 * 60 * 1000
        );

        // --------------------------------
        // Delete previous forgot password OTP
        // --------------------------------

        await pool.query(
            `
            DELETE FROM otp_verifications
            WHERE email = $1
            AND purpose = 'forgot_password'
            `,
            [user.email]
        );

        // --------------------------------
        // Store OTP
        // --------------------------------

        await pool.query(
            `
            INSERT INTO otp_verifications
            (
                email,
                phone,
                role,
                otp_hash,
                purpose,
                expires_at
            )
            VALUES
            (
                $1,
                $2,
                $3,
                $4,
                'forgot_password',
                $5
            )
            `,
            [
                user.email,
                user.phone,
                user.role,
                otpHash,
                expiresAt
            ]
        );

        // --------------------------------
        // Send OTP
        // --------------------------------

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

const verifyForgotPasswordOTP = async (req, res) => {
    try {

        const {
            identifier,
            role,
            otp
        } = req.body;

        // --------------------------------
        // Validate
        // --------------------------------

        if (!identifier || !otp) {
            return res.status(400).json({
                success: false,
                message:
                    "Email/Phone and OTP are required"
            });
        }

        // --------------------------------
        // Find user
        // --------------------------------

        let userResult;

        if (role) {

            userResult = await pool.query(
                `
                SELECT id, email, role
                FROM users
                WHERE
                    (email = $1 OR phone = $1)
                    AND role = $2
                LIMIT 1
                `,
                [identifier, role]
            );

        } else {

            userResult = await pool.query(
                `
                SELECT id, email, role
                FROM users
                WHERE email = $1 OR phone = $1
                LIMIT 1
                `,
                [identifier]
            );
        }

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const user = userResult.rows[0];

        // --------------------------------
        // Get latest OTP
        // --------------------------------

        const otpResult = await pool.query(
            `
            SELECT *
            FROM otp_verifications
            WHERE email = $1
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

        const otpRecord = otpResult.rows[0];

        // --------------------------------
        // Check expiry
        // --------------------------------

        if (
            new Date() >
            new Date(otpRecord.expires_at)
        ) {
            return res.status(400).json({
                success: false,
                message: "OTP has expired"
            });
        }

        // --------------------------------
        // Check attempts
        // --------------------------------

        if (otpRecord.attempts >= 5) {
            return res.status(429).json({
                success: false,
                message:
                    "Too many OTP attempts"
            });
        }

        // --------------------------------
        // Compare OTP
        // --------------------------------

        const isValid =
            await bcrypt.compare(
                otp,
                otpRecord.otp_hash
            );

        if (!isValid) {

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
                message: "Invalid OTP"
            });
        }

        // --------------------------------
        // Mark OTP verified
        // --------------------------------

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
            message: "Failed to verify OTP"
        });
    }
};

// ==========================================
// RESET PASSWORD
// ==========================================

const resetPassword = async (req, res) => {
    try {

        const {
            identifier,
            role,
            password
        } = req.body;

        // --------------------------------
        // Validate
        // --------------------------------

        if (
            !identifier ||
            !role ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Identifier, role and password are required"
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message:
                    "Password must be at least 8 characters"
            });
        }

        // --------------------------------
        // Find user
        // --------------------------------

        const userResult = await pool.query(
            `
            SELECT
                id,
                email,
                phone,
                role
            FROM users
            WHERE
                (email = $1 OR phone = $1)
                AND role = $2
            LIMIT 1
            `,
            [identifier, role]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message:
                    "User account not found"
            });
        }

        const user = userResult.rows[0];

        // --------------------------------
        // Check verified forgot-password OTP
        // --------------------------------

        const otpResult = await pool.query(
            `
            SELECT id
            FROM otp_verifications
            WHERE email = $1
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

        // --------------------------------
        // Hash new password
        // --------------------------------

        const hashedPassword =
            await bcrypt.hash(password, 10);

        // --------------------------------
        // Update password
        // --------------------------------

        const updateResult = await pool.query(
            `
            UPDATE users
            SET password = $1
            WHERE id = $2
            RETURNING id, email, role
            `,
            [
                hashedPassword,
                user.id
            ]
        );

        if (updateResult.rows.length === 0) {
            return res.status(500).json({
                success: false,
                message:
                    "Password update failed"
            });
        }

        // --------------------------------
        // Invalidate OTP
        // --------------------------------

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
// EXPORT ALL CONTROLLERS
// ==========================================

module.exports = {
    sendRegistrationOTP,
    verifyRegistrationOTP,
    sendForgotPasswordOTP,
    verifyForgotPasswordOTP,
    resetPassword
};