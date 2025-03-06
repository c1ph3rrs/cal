const sql = require('mssql');

/**
 * SQL Server Configuration
 * Connection details for Azure SQL Database
 */
const config = {
    user: 'whisperadmin',
    password: '#pdx56PnA#',
    server: 'whisper.database.windows.net',
    database: 'whispercrm',
    options: {
        encrypt: true,
        trustServerCertificate: false,
        connectionTimeout: 30000,
        pool: {
            max: 10,
            min: 0,
            idleTimeoutMillis: 30000
        }
    }
};

/**
 * Establishes connection to SQL Server
 * @returns {Promise} SQL connection pool
 */
const connectToDatabase = async () => {
    try {
        const pool = await sql.connect(config);
        console.log('Successfully connected to SQL Server');
        return pool;
    } catch (error) {
        console.error('Failed to connect to SQL Server:', error);
        throw error;
    }
};

// Initialize database connection
connectToDatabase().catch(err => {
    console.error('Database initialization failed:', err);
    process.exit(1);
});

module.exports = {
    sql,
    connectToDatabase
};
