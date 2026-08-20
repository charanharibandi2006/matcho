const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

// ==========================================
// REGISTER ORGANIZER
// ==========================================

const register = async (req, res) => {
    try {
        const {
            role,
            name,
            email,
            phone,
            password
        } = req.body;

        console.log("========== REGISTRATION ==========");
        console.log("Name:", name);
        console.log("Email:", email);
        console.log("Phone:", phone);
        console.log("Role:", role);
        console.log("==================================");

        // ------------------------------------------
        // Validate fields
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
                message: "All registration fields are required"
            });
        }

        // ------------------------------------------
        // Only Organizer registration
        // ------------------------------------------

        if (role !== "Organizer") {
            return res.status(400).json({
                success: false,
                message: "Only Organizer registration is allowed"
            });
        }

        // ------------------------------------------
        // Password validation
        // ------------------------------------------

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters"
            });
        }

        // ------------------------------------------
        // Normalize values
        // ------------------------------------------

        const normalizedEmail = email.trim().toLowerCase();
        const normalizedPhone = phone.trim();

        // ------------------------------------------
        // Check duplicate email / phone
        // ------------------------------------------

        const existingUser = await pool.query(
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
            const existing = existingUser.rows[0];

            if (
                existing.email &&
                existing.email.toLowerCase() === normalizedEmail
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Email is already registered"
                });
            }

            if (
                existing.phone &&
                existing.phone === normalizedPhone
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Phone number is already registered"
                });
            }
        }

        // ------------------------------------------
        // Hash password
        // ------------------------------------------

        const hashedPassword = await bcrypt.hash(
            password,
            10
        );

        // ------------------------------------------
        // Create Organizer
        // ------------------------------------------

        const result = await pool.query(
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
                name.trim(),
                normalizedEmail,
                normalizedPhone,
                hashedPassword,
                "Organizer",
                "pending"
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Organizer registered successfully",
            user: result.rows[0]
        });

    } catch (error) {

        console.error(
            "Registration Error:",
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
            message: "Internal server error"
        });
    }
};


// ==========================================
// LOGIN
// Email OR Phone + Password
// ==========================================

const login = async (req, res) => {
    try {

        const identifier =
            req.body.identifier?.trim();

        const password =
            req.body.password;

        const role =
            req.body.role?.trim();

        console.log("========== LOGIN ==========");
        console.log("Identifier:", identifier);
        console.log("Role:", role);
        console.log("===========================");

        // ------------------------------------------
        // Validate
        // ------------------------------------------

        if (
            !identifier ||
            !password ||
            !role
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Account type, email/phone and password are required"
            });
        }

        // ------------------------------------------
        // Only Organizer login
        // ------------------------------------------

        if (role !== "Organizer") {
            return res.status(400).json({
                success: false,
                message: "Invalid account type"
            });
        }

        // ------------------------------------------
        // Normalize identifier
        // ------------------------------------------

        const normalizedIdentifier =
            identifier.toLowerCase();

        // ------------------------------------------
        // Find Organizer
        // ------------------------------------------

        const result = await pool.query(
            `
            SELECT
                id,
                full_name,
                email,
                phone,
                password,
                role,
                organizer_status
            FROM users
            WHERE
                (
                    LOWER(email) = $1
                    OR phone = $2
                )
                AND role = 'Organizer'
            LIMIT 1
            `,
            [
                normalizedIdentifier,
                identifier
            ]
        );

        // ------------------------------------------
        // User not found
        // ------------------------------------------

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message:
                    "No Organizer account found with this email/phone"
            });
        }

        const user = result.rows[0];

        // ------------------------------------------
        // Check password
        // ------------------------------------------

        const isMatch =
            await bcrypt.compare(
                password,
                user.password
            );

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid password"
            });
        }

        // ------------------------------------------
        // Generate JWT
        // ------------------------------------------

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "24h"
            }
        );

        // ------------------------------------------
        // Successful login
        // ------------------------------------------

        return res.status(200).json({
            success: true,
            message: "Login successful",
            token,

            user: {
                id: user.id,
                name: user.full_name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                organizer_status:
                    user.organizer_status
            }
        });

    } catch (error) {

        console.error(
            "Login Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};


// ==========================================
// EXPORT
// ==========================================

module.exports = {
    register,
    login
};