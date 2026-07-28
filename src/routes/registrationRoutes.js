const express = require("express");
const router = express.Router();

const {
    createRegistration,
    getAllRegistrations,
    getRegistrationById,
    deleteRegistration
} = require("../controllers/registrationController");

const authenticateUser = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/authorizeRoles");
const { registrationValidation } = require("../validators/registrationValidator");
const validate = require("../middleware/validate");

// Public Routes
router.get("/", getAllRegistrations);
router.get("/:id", getRegistrationById);

// Protected Routes
router.post(
    "/",
    authenticateUser,
    authorizeRoles("organizer", "admin"),
    registrationValidation,
    validate,
    createRegistration
);

router.delete(
    "/:id",
    authenticateUser,
    authorizeRoles("organizer", "admin"),
    deleteRegistration
);

module.exports = router;