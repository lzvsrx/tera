const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// GitHub Config
const GITHUB_USERNAME = 'lzvsrx';

// MySQL Connection
let dbConnected = false;
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'tera_db'
});

db.connect(err => {
    if (err) {
        console.warn('⚠️ MySQL not connected. Server will run in MOCK MODE for testing.');
        dbConnected = false;
    } else {
        console.log('✅ Connected to MySQL database.');
        dbConnected = true;
    }
});

// Mock Storage
let mockUsers = [];

// Function to add default user to mock storage
async function initMockData() {
    const hashedDefaultPassword = await bcrypt.hash('123456', 10);
    mockUsers.push({ 
        id: 1, 
        name: 'Admin', 
        password: hashedDefaultPassword 
    });
    console.log('👤 Default Mock User: Admin / 123456');
}
initMockData();

let mockProjects = [
    { id: 1, title: 'Cálculo III', description: 'Revisão de integrais triplas', category: 'study' },
    { id: 2, title: 'Manutenção Servidor', description: 'Upgrade de memória', category: 'tech' }
];
let mockErrors = [];

// Auth Routes
app.post('/api/register', async (req, res) => {
    const { name, password } = req.body;
    if (!name || !password) return res.status(400).json({ error: 'Nome e senha são obrigatórios' });
    
    if (!dbConnected) {
        if (mockUsers.find(u => u.name === name)) return res.status(400).json({ error: 'Nome já em uso (MOCK)' });
        const hashedPassword = await bcrypt.hash(password, 10);
        mockUsers.push({ id: Date.now(), name, password: hashedPassword });
        return res.status(201).json({ message: 'Usuário registrado (MOCK)' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const query = 'INSERT INTO users (name, password) VALUES (?, ?)';
        db.query(query, [name, hashedPassword], (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Este nome já está em uso' });
                return res.status(500).json({ error: 'Erro ao cadastrar usuário' });
            }
            res.status(201).json({ message: 'Usuário registrado com sucesso' });
        });
    } catch (e) {
        res.status(500).json({ error: 'Erro interno no servidor' });
    }
});

app.post('/api/login', (req, res) => {
    const { name, password } = req.body;
    
    if (!dbConnected) {
        const user = mockUsers.find(u => u.name === name);
        if (!user) return res.status(401).json({ error: 'Usuário não encontrado (MOCK)' });
        bcrypt.compare(password, user.password).then(isMatch => {
            if (!isMatch) return res.status(401).json({ error: 'Senha incorreta (MOCK)' });
            const token = jwt.sign({ id: user.id }, 'tera_secret_key', { expiresIn: '24h' });
            res.json({ token, user: { id: user.id, name: user.name } });
        });
        return;
    }

    const query = 'SELECT * FROM users WHERE name = ?';
    db.query(query, [name], async (err, results) => {
        if (err || results.length === 0) return res.status(401).json({ error: 'Usuário não encontrado' });
        
        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (!isMatch) return res.status(401).json({ error: 'Senha incorreta' });
        
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'tera_secret_key', { expiresIn: '24h' });
        res.json({ token, user: { id: user.id, name: user.name } });
    });
});

// Technical Data & Projects
app.get('/api/projects', async (req, res) => {
    try {
        // Fetch from GitHub API - Adding User-Agent as required by GitHub
        const githubResponse = await axios.get(`https://api.github.com/users/${GITHUB_USERNAME}/repos?sort=updated&per_page=15`, {
            headers: { 'User-Agent': 'Tera-AI-Assistant' }
        });
        
        const githubProjects = githubResponse.data.map(repo => ({
            id: repo.id,
            title: repo.name,
            description: repo.description || 'Sem descrição no repositório.',
            category: 'github',
            url: repo.html_url,
            language: repo.language || 'N/A'
        }));

        if (!dbConnected) {
            console.log(`✅ GitHub Projects loaded (${githubProjects.length}) in MOCK mode.`);
            return res.json(githubProjects);
        }
        
        db.query('SELECT * FROM projects', (err, dbResults) => {
            if (err) return res.json(githubProjects); 
            const combined = [...githubProjects, ...dbResults];
            res.json(combined);
        });
    } catch (error) {
        console.error("❌ GitHub API Error:", error.response ? error.response.data : error.message);
        // Fallback to local mock projects if GitHub fails
        const fallback = [...mockProjects];
        res.json(fallback);
    }
});

app.post('/api/projects', (req, res) => {
    const { title, description, category } = req.body;
    if (!dbConnected) {
        const newProject = { id: Date.now(), title, description, category };
        mockProjects.push(newProject);
        return res.status(201).json({ message: 'Projeto adicionado (MOCK)', project: newProject });
    }
    db.query('INSERT INTO projects (title, description, category) VALUES (?, ?, ?)', [title, description, category], (err, result) => {
        if (err) return res.status(500).json({ error: 'Erro ao salvar projeto' });
        res.status(201).json({ message: 'Projeto adicionado' });
    });
});

// Error Learning (Simple logging for now)
app.post('/api/errors', (req, res) => {
    const { error_msg, context } = req.body;
    if (!dbConnected) {
        mockErrors.push({ error_msg, context, created_at: new Date() });
        return res.json({ status: "Error logged for learning (MOCK)" });
    }
    db.query('INSERT INTO error_logs (error_msg, context) VALUES (?, ?)', [error_msg, context], (err, result) => {
        if (err) console.error("Failed to log error to DB");
        res.json({ status: "Error logged for learning" });
    });
});

const PORT = process.env.PORT || 41289;
app.listen(PORT, '0.0.0.0', () => console.log(`Tera Server running on port ${PORT}`));
