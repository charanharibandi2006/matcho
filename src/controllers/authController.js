const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

// ==========================================
// REGISTER
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

        console.log("========== REGISTRATION DEBUG ==========");
        console.log("Email:", email);
        console.log("Phone:", phone);
        console.log("Role:", role);
        console.log("========================================");

        // ------------------------------------------
        // Validate role
        // ------------------------------------------

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

        // ------------------------------------------
        // Check duplicate EMAIL/PHONE for SAME ROLE
        // ------------------------------------------

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
            const existing = existingUser.rows[0];

            if (
                existing.email === email &&
                existing.role === role
            ) {
                return res.status(400).json({
                    success: false,
                    message: `Email already registered as ${role}`
                });
            }

            if (
                existing.phone === phone &&
                existing.role === role
            ) {
                return res.status(400).json({
                    success: false,
                    message: `Phone number already registered as ${role}`
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
        // Create user
        // ------------------------------------------

        const result = await pool.query(
            `
            INSERT INTO users
            (
                full_name,
                email,
                phone,
                password,
                role
            )
            VALUES
            ($1, $2, $3, $4, $5)
            RETURNING
                id,
                full_name,
                email,
                phone,
                role
            `,
            [
                name,
                email,
                phone,
                hashedPassword,
                role
            ]
        );

        return res.status(201).json({
            success: true,
            message: "User registered successfully",
            user: result.rows[0]
        });

    } catch (error) {
        console.error("Registration Error:", error);

        // Handle PostgreSQL unique constraint errors
        if (error.code === "23505") {
            return res.status(400).json({
                success: false,
                message: "This email or phone number is already registered for this role."
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

        const identifier = req.body.identifier?.trim();
        const password = req.body.password;
        const role = req.body.role?.trim();

        console.log("========== LOGIN DEBUG ==========");
        console.log("Identifier:", identifier);
        console.log("Role:", role);
        console.log("=================================");

        // ------------------------------------------
        // Validate required fields
        // ------------------------------------------

        if (!identifier || !password || !role) {
            return res.status(400).json({
                success: false,
                message:
                    "Account type, email/phone and password are required"
            });
        }

        // ------------------------------------------
        // Validate role
        // ------------------------------------------

        const allowedRoles = [
            "Score Viewer",
            "Player",
            "Organizer"
        ];

        if (!allowedRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                message: "Invalid account type"
            });
        }

        // ------------------------------------------
        // Find account
        // ------------------------------------------

        const result = await pool.query(
            `
            SELECT
                id,
                full_name,
                email,
                phone,
                password,
                role
            FROM users
            WHERE
                (email = $1 OR phone = $1)
                AND role = $2
            LIMIT 1
            `,
            [
                identifier,
                role
            ]
        );

        // ------------------------------------------
        // Account not found
        // ------------------------------------------

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message:
                    `No ${role} account found with this email/phone`
            });
        }

        const user = result.rows[0];

        // ------------------------------------------
        // Check password
        // ------------------------------------------

        const isMatch = await bcrypt.compare(
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
                role: user.role
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


module.exports = {
    register,
    login
};