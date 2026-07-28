const tournaments = [
    {
        id: 1,
        name: "Inter College Badminton Championship",
        sport: "Badminton",
        format: "Singles",
        date: "2026-08-10",
        status: "Upcoming",
        champion: null
    }
];
const players = [];
const teams = [];
const matches = [];
const fixtures = [];
const registrations = [
    {
        id: 1,
        tournamentId: 1,
        playerName: "Cheran",
        college: "Vardhaman College of Engineering",
        phone: "9876543210",
        status: "Registered"
    },
    {
        id: 2,
        tournamentId: 1,
        playerName: "Rahul",
        college: "Vardhaman College of Engineering",
        phone: "9876543211",
        status: "Registered"
    },
    {
        id: 3,
        tournamentId: 1,
        playerName: "Ranga",
        college: "CBIT",
        phone: "9876543212",
        status: "Registered"
    },
    {
        id: 4,
        tournamentId: 1,
        playerName: "Damodhar",
        college: "MGIT",
        phone: "9876543213",
        status: "Registered"
    },
    {
        id: 5,
        tournamentId: 1,
        playerName: "Raju",
        college: "VNR VJIET",
        phone: "9876543214",
        status: "Registered"
    },
    {
        id: 6,
        tournamentId: 1,
        playerName: "Sai",
        college: "JNTUH",
        phone: "9876543215",
        status: "Registered"
    },
    {
        id: 7,
        tournamentId: 1,
        playerName: "Varun",
        college: "GRIET",
        phone: "9876543216",
        status: "Registered"
    },
    {
        id: 8,
        tournamentId: 1,
        playerName: "Pranav",
        college: "CBIT",
        phone: "9876543217",
        status: "Registered"
    }
];

module.exports = {
    tournaments,
    players,
    teams,
    matches,
    registrations,
    fixtures
};