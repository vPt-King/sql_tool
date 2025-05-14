const { Pool } = require('pg');

// Cấu hình kết nối
const pool = new Pool({
    user: 'postgres',
    host: '192.168.50.35',
    database: 'postgres',
    password: 'postgres',
    port: 5432, // port mặc định của PostgreSQL
});

// Kiểm tra kết nối
pool.connect((err, client, release) => {
    if (err) {
        console.error('Error acquiring client', err.stack);
        return;
    }
    console.log('Connected to PostgreSQL successfully!');
    release();
});

// Hàm thực thi query
const query = async (text, params) => {
    try {
        const result = await pool.query(text, params);
        return result;
    } catch (error) {
        console.error('Error executing query:', error.stack);
        throw error;
    }
};

// Export các hàm và đối tượng cần thiết
module.exports = {
    pool,
    query
}; 