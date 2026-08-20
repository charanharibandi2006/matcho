const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const tournamentRoutes = require("./routes/tournamentRoutes");
const playerRoutes = require("./routes/playerRoutes");
const teamRoutes = require("./routes/teamRoutes");
const matchRoutes = require("./routes/matchRoutes");
const registrationRoutes = require("./routes/registrationRoutes");
const fixtureRoutes = require("./routes/fixtureRoutes");
const leaderboardRoutes = require("./routes/leaderboardRoutes");
const otpRoutes = require("./routes/otpRoutes");


const app = express();

const errorHandler = require("./middleware/errorHandler");
// Middlewares
app.use(cors());
app.use(express.json());
app.use("/api/players", playerRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api", registrationRoutes);
app.use("/api",teamRoutes);
app.use("/api/fixtures", fixtureRoutes);

// Home Route
app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Welcome to Matcho Backend 🚀"
    });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/auth", otpRoutes);
app.use("/api/users", userRoutes);
app.use("/api/tournaments", tournamentRoutes);
app.use("/api/leaderboard", leaderboardRoutes);


// Error Handling Middleware
app.use(errorHandler);

module.exports = app;