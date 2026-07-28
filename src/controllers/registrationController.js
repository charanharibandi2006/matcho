const { registrations } = require("../data/dataStore");

// Register Player
const createRegistration = (req, res) => {

    const {
        tournamentId,
        playerName,
        college,
        phone
    } = req.body;

    // Duplicate player check
    const exists = registrations.find(
        registration =>
            registration.tournamentId == tournamentId &&
            registration.playerName.toLowerCase() === playerName.toLowerCase()
    );

    if (exists) {
        return res.status(400).json({
            success: false,
            message: "Player already registered."
        });
    }

    const newRegistration = {
        id: registrations.length + 1,
        tournamentId,
        playerName,
        college,
        phone,
        status: "Registered"
    };

    registrations.push(newRegistration);

    res.status(201).json({
        success: true,
        message: "Registration successful.",
        registration: newRegistration
    });

};

// Get All Registrations
const getAllRegistrations = (req, res) => {

    res.json({
        success: true,
        registrations
    });

};

// Get Registration By ID
const getRegistrationById = (req, res) => {

    const registration = registrations.find(
        registration => registration.id == req.params.id
    );

    if (!registration) {
        return res.status(404).json({
            success: false,
            message: "Registration not found."
        });
    }

    res.json({
        success: true,
        registration
    });

};

// Delete Registration
const deleteRegistration = (req, res) => {

    const index = registrations.findIndex(
        registration => registration.id == req.params.id
    );

    if (index === -1) {
        return res.status(404).json({
            success: false,
            message: "Registration not found."
        });
    }

    registrations.splice(index, 1);

    res.json({
        success: true,
        message: "Registration cancelled successfully."
    });

};

module.exports = {
    createRegistration,
    getAllRegistrations,
    getRegistrationById,
    deleteRegistration
};