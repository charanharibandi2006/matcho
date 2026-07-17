const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// Temporary storage
const users = [];

// Register
const register = async (req, res) => {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = users.find(user => user.email === email);

    if (existingUser) {
        return res.status(400).json({
            message: "User already exists"
        });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
        id: users.length + 1,
        name,
        email,
        password: hashedPassword
    };

    users.push(newUser);

    res.status(201).json({
        message: "User registered successfully"
    });
};

// Login
const login = async (req, res) => {

    const { email, password } = req.body;

    const user = users.find(user => user.email === email);

    if (!user) {
        return res.status(404).json({
            message: "User not found"
        });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
        return res.status(401).json({
            message: "Invalid password"
        });
    }

    const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
    );

    res.json({
        message: "Login successful",
        token
    });
};

module.exports = {
    register,
    login
};