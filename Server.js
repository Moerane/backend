require('events').EventEmitter.defaultMaxListeners = 20;

require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');

const app = express();
const port = process.env.PORT || 5432;

// Enable CORS for all requests
app.use(cors());
// Parse incoming JSON requests
app.use(bodyParser.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,  // Allows self-signed certificates (useful for local or dev environments)
    },
});


// Test PostgreSQL connection
pool.connect((err, client, release) => {
    if (err) {
        console.error('Error connecting to PostgreSQL database:', err);
    } else {
        console.log('Connected to PostgreSQL database');
        release();
    }
});

// Root endpoint
app.get('/', (req, res) => {
    res.send('Welcome to the backend API');
});

// User signup
app.post('/api/signup', async (req, res) => {
    const { username, password } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING *',
            [username, hashedPassword]
        );
        res.status(201).send('Signup successful!');
    } catch (err) {
        console.error('Error signing up user:', err);
        res.status(400).send('Username already exists or invalid data');
    }
});

// User login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];

        if (user && (await bcrypt.compare(password, user.password))) {
            res.send(user);
        } else {
            res.status(401).send('Invalid username or password');
        }
    } catch (err) {
        console.error('Error during login:', err);
        res.status(500).send('Internal server error');
    }
});

// Fetch all users
app.get('/api/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM users');
        res.send(result.rows);
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).send('Error fetching users');
    }
});

// Fetch all products
app.get('/api/products', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM products');
        res.send(result.rows);
    } catch (err) {
        console.error('Error fetching products:', err);
        res.status(500).send('Error fetching products');
    }
});

// Add a product
app.post('/api/products', async (req, res) => {
    const { name, description, price, quantity } = req.body;

    try {
        await pool.query(
            'INSERT INTO products (name, description, price, quantity) VALUES ($1, $2, $3, $4)',
            [name, description, price, quantity]
        );
        res.send('Product added successfully!');
    } catch (err) {
        console.error('Error adding product:', err);
        res.status(500).send('Error adding product');
    }
});

// Update a product
app.put('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    const { name, description, price, quantity } = req.body;

    try {
        await pool.query(
            'UPDATE products SET name = $1, description = $2, price = $3, quantity = $4 WHERE id = $5',
            [name, description, price, quantity, id]
        );
        res.send('Product updated successfully!');
    } catch (err) {
        console.error('Error updating product:', err);
        res.status(500).send('Error updating product');
    }
});

// Delete a product
app.delete('/api/products/:id', async (req, res) => {
    const { id } = req.params;

    try {
        await pool.query('DELETE FROM products WHERE id = $1', [id]);
        res.send('Product deleted successfully!');
    } catch (err) {
        console.error('Error deleting product:', err);
        res.status(500).send('Error deleting product');
    }
});

// Update a user
app.put('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const { username, password } = req.body;

    try {
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            await pool.query(
                'UPDATE users SET username = $1, password = $2 WHERE id = $3',
                [username, hashedPassword, id]
            );
        } else {
            await pool.query(
                'UPDATE users SET username = $1 WHERE id = $2',
                [username, id]
            );
        }
        res.send('User updated successfully!');
    } catch (err) {
        console.error('Error updating user:', err);
        res.status(500).send('Error updating user');
    }
});

// Delete a user
app.delete('/api/users/:id', async (req, res) => {
    const { id } = req.params;

    try {
        await pool.query('DELETE FROM users WHERE id = $1', [id]);
        res.send('User deleted successfully!');
    } catch (err) {
        console.error('Error deleting user:', err);
        res.status(500).send('Error deleting user');
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
