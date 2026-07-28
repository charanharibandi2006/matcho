// Temporary storage
const { playerProfiles } = require("../data/dataStore");

// Create Player Profile
const createPlayerProfile = (req, res) => {
    const {
        fullName,
        mobile,
        email,
        dob,
        gender,
        profilePhoto
    } = req.body;

    const existingProfile = playerProfiles.find(
        profile => profile.email === email
    );

    if (existingProfile) {
        return res.status(400).json({
            success: false,
            message: "Player profile already exists."
        });
    }

    const newProfile = {
        id: playerProfiles.length + 1,
        userId: req.user.id,
        fullName,
        mobile,
        email,
        dob,
        gender,
        profilePhoto
    };

    playerProfiles.push(newProfile);

    res.status(201).json({
        success: true,
        message: "Player profile created successfully.",
        profile: newProfile
    });
};

// Get Player Profile
const getPlayerProfile = (req, res) => {

    const profile = playerProfiles.find(
        profile => profile.userId === req.user.id
    );

    if (!profile) {
        return res.status(404).json({
            success: false,
            message: "Player profile not found."
        });
    }

    res.status(200).json({
        success: true,
        profile
    });
};

// Update Player Profile
const updatePlayerProfile = (req, res) => {

    const profile = playerProfiles.find(
        profile => profile.userId === req.user.id
    );

    if (!profile) {
        return res.status(404).json({
            success: false,
            message: "Player profile not found."
        });
    }

    Object.assign(profile, req.body);

    res.status(200).json({
        success: true,
        message: "Player profile updated successfully.",
        profile
    });
};

module.exports = {
    createPlayerProfile,
    getPlayerProfile,
    updatePlayerProfile
};