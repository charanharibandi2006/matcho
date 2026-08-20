require("dotenv").config();

const http = require("http");
const { Server } = require("socket.io");

const app = require("./app");
const pool = require("./config/db");

const PORT =
    process.env.PORT || 5000;

// =========================================================
// HTTP SERVER
// =========================================================

const server =
    http.createServer(app);

// =========================================================
// SOCKET.IO
// =========================================================

const io = new Server(server, {
    cors: {
        origin: [
            "http://localhost:5173",
            process.env.FRONTEND_URL,
        ].filter(Boolean),

        methods: [
            "GET",
            "POST",
        ],

        credentials: true,
    },
});

// =========================================================
// SOCKET CONNECTION
// =========================================================

io.on("connection", (socket) => {

    console.log(
        "Socket connected:",
        socket.id
    );

    // -----------------------------------------------------
    // JOIN TOURNAMENT ROOM
    // -----------------------------------------------------

    socket.on(
        "join-tournament",
        (tournamentId) => {

            if (!tournamentId) {
                return;
            }

            const room =
                `tournament:${tournamentId}`;

            socket.join(room);

            console.log(
                `Socket ${socket.id} joined ${room}`
            );
        }
    );

    // -----------------------------------------------------
    // LEAVE TOURNAMENT ROOM
    // -----------------------------------------------------

    socket.on(
        "leave-tournament",
        (tournamentId) => {

            if (!tournamentId) {
                return;
            }

            const room =
                `tournament:${tournamentId}`;

            socket.leave(room);

            console.log(
                `Socket ${socket.id} left ${room}`
            );
        }
    );

    // -----------------------------------------------------
    // DISCONNECT
    // -----------------------------------------------------

    socket.on(
        "disconnect",
        (reason) => {

            console.log(
                "Socket disconnected:",
                socket.id,
                reason
            );
        }
    );

});

// Make Socket.IO available to controllers
app.set(
    "io",
    io
);

// =========================================================
// TEST DATABASE
// =========================================================

app.get(
    "/test-db",
    async (req, res) => {

        try {

            const result =
                await pool.query(
                    "SELECT NOW()"
                );

            res.json({
                success: true,
                time:
                    result.rows[0],
            });

        } catch (error) {

            res.status(500).json({
                success: false,
                message:
                    error.message,
            });

        }

    }
);

// =========================================================
// START SERVER
// =========================================================

server.listen(
    PORT,
    () => {
        console.log(
            `🚀 Server running on http://localhost:${PORT}`
        );

        console.log(
            "🔌 Socket.IO enabled"
        );
    }
);