const teams = [];

// Create Team
const createTeam = (req, res) => {

    const { teamName, sport, captain } = req.body;

    const newTeam = {
        id: teams.length + 1,
        teamName,
        sport,
        captain
    };

    teams.push(newTeam);

    res.status(201).json({
        success: true,
        message: "Team created successfully",
        team: newTeam
    });
};

// Get All Teams
const getAllTeams = (req, res) => {

    res.json({
        success: true,
        teams
    });
};

// Get Team By ID
const getTeamById = (req, res) => {

    const id = parseInt(req.params.id);

    const team = teams.find(team => team.id === id);

    if (!team) {
        return res.status(404).json({
            success: false,
            message: "Team not found"
        });
    }

    res.json({
        success: true,
        team
    });
};

// Update Team
const updateTeam = (req, res) => {

    const id = parseInt(req.params.id);

    const team = teams.find(team => team.id === id);

    if (!team) {
        return res.status(404).json({
            success: false,
            message: "Team not found"
        });
    }

    Object.assign(team, req.body);

    res.json({
        success: true,
        message: "Team updated successfully",
        team
    });
};

// Delete Team
const deleteTeam = (req, res) => {

    const index = teams.findIndex(team => team.id === parseInt(req.params.id));

    if (index === -1) {
        return res.status(404).json({
            success: false,
            message: "Team not found"
        });
    }

    teams.splice(index, 1);

    res.json({
        success: true,
        message: "Team deleted successfully"
    });
};

module.exports = {
    createTeam,
    getAllTeams,
    getTeamById,
    updateTeam,
    deleteTeam
};