const getUsers = (req, res) => {
    res.status(200).json({
        message: "Users fetched successfully",
        users: [
            {
                id: 1,
                name: "Cheran",
                email: "cheran@gmail.com"
            }
        ]
    });
};

module.exports = {
    getUsers
};