const { Pool } = require("pg");

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});

pool.query(
    `
    SELECT
        current_database() AS database,
        current_schema() AS schema
    `,
    (error, result) => {
        if (error) {
            console.error(
                "Database identity error:",
                error
            );
        } else {
            console.log(
                "Backend DB:",
                result.rows[0]
            );
        }
    }
);

pool.connect()
    .then(() => console.log("✅ PostgreSQL Connected"))
    .catch(err => console.error("❌ Database Connection Error:", err));

module.exports = pool;