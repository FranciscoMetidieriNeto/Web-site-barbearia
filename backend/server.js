// server.js

// --- 1. IMPORTAÇÕES E CONFIGURAÇÃO INICIAL ---
// Linhas novas
const dotenv = require('dotenv');
dotenv.config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg'); // Importa a biblioteca do PostgreSQL
const path = require('path');

const app = express();
const PORT = 3000;
const SECRET_KEY = 'sua-chave-secreta-super-dificil-de-adivinhar';

// --- 2. CONEXÃO COM A BASE DE DADOS SUPABASE ---
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// --- 3. MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// --- 4. MIDDLEWARES DE AUTENTICAÇÃO E AUTORIZAÇÃO ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);
    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Acesso negado.' });
    }
    next();
};

// --- 5. ROTAS DA API ---

// ROTAS DE AUTENTICAÇÃO
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];
        if (!user || !bcrypt.compareSync(password, user.password_hash)) {
            return res.status(401).json({ message: 'Usuário ou senha inválidos.' });
        }
        const tokenPayload = { id: user.id, username: user.username, role: user.role, professionalId: user.professional_id };
        const token = jwt.sign(tokenPayload, SECRET_KEY, { expiresIn: '8h' });
        res.json({ token, name: user.name, role: user.role });
    } catch (error) {
        console.error("Erro no login:", error);
        res.status(500).json({ message: 'Erro no servidor.' });
    }
});

app.post('/api/auth/register', async (req, res) => {
    const { email, username, password } = req.body;
    if (!email || !username || !password) return res.status(400).json({ message: 'E-mail, nome de usuário e senha são obrigatórios.' });
    try {
        const existingUser = await pool.query('SELECT * FROM users WHERE username = $1 OR email = $2', [username, email]);
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ message: 'Usuário ou e-mail já em uso.' });
        }
        const passwordHash = bcrypt.hashSync(password, 10);
        const query = 'INSERT INTO users (name, username, email, password_hash, role) VALUES ($1, $2, $3, $4, $5) RETURNING id';
        const values = [username, username, email, passwordHash, 'user'];
        await pool.query(query, values);
        res.status(201).json({ message: 'Usuário cadastrado com sucesso!' });
    } catch (error) {
        console.error("Erro no registro:", error);
        res.status(500).json({ message: 'Erro no servidor.' });
    }
});

// ROTAS DE DADOS (PROFISSIONAIS E SERVIÇOS)
app.get('/api/professionals', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM professionals ORDER BY name');
        res.json(result.rows);
    } catch (error) {
        console.error("Erro ao buscar profissionais:", error);
        res.status(500).json({ message: "Erro ao buscar profissionais." });
    }
});

app.get('/api/services', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM services ORDER BY name');
        res.json(result.rows);
    } catch (error) {
        console.error("Erro ao buscar serviços:", error);
        res.status(500).json({ message: "Erro ao buscar serviços." });
    }
});

// ROTAS DE AGENDAMENTO
app.post('/api/appointments', async (req, res) => {
    const { clientName, clientPhone, serviceId, professionalId, date, time } = req.body;
    try {
        const query = 'INSERT INTO appointments (client_name, client_phone, service_id, professional_id, date, "time") VALUES ($1, $2, $3, $4, $5, $6) RETURNING *';
        const values = [clientName, clientPhone, serviceId, professionalId, date, time];
        const result = await pool.query(query, values);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Erro ao criar agendamento:", error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

app.get('/api/appointments/booked', async (req, res) => {
    const { weekStart, professionalId } = req.query;
    if (!weekStart || !professionalId) return res.json([]);
    try {
        const startDate = new Date(weekStart).toISOString().split('T')[0];
        const endDate = new Date(weekStart);
        endDate.setDate(endDate.getDate() + 6);
        const endDateStr = endDate.toISOString().split('T')[0];

        const query = 'SELECT date, time FROM appointments WHERE professional_id = $1 AND date >= $2 AND date <= $3';
        const result = await pool.query(query, [professionalId, startDate, endDateStr]);
        res.json(result.rows.map(app => `${new Date(app.date).toISOString().split('T')[0]}T${app.time}`));
    } catch (error) {
        console.error("Erro ao buscar horários ocupados:", error);
        res.status(500).json({ message: "Erro interno do servidor." });
    }
});

// ROTAS PROTEGIDAS
app.get('/api/appointments', authenticateToken, isAdmin, async (req, res) => {
    const page = parseInt(req.query.page || '1', 10);
    const limit = 10;
    const offset = (page - 1) * limit;
    try {
        const appointmentsQuery = `
            SELECT a.id, a.client_name, a.client_phone, a.date, a.time, s.name as "serviceName", p.name as "professionalName", s.price as "servicePrice"
            FROM appointments a
            LEFT JOIN services s ON a.service_id = s.id
            LEFT JOIN professionals p ON a.professional_id = p.id
            ORDER BY a.date DESC, a.time DESC
            LIMIT $1 OFFSET $2
        `;
        const allAppointmentsQuery = `
            SELECT a.*, s.name as "serviceName", p.name as "professionalName", s.price as "servicePrice"
            FROM appointments a
            LEFT JOIN services s ON a.service_id = s.id
            LEFT JOIN professionals p ON a.professional_id = p.id
            ORDER BY a.date DESC, a.time DESC
        `;
        const countQuery = 'SELECT COUNT(*) FROM appointments';

        const appointmentsResult = await pool.query(appointmentsQuery, [limit, offset]);
        const allAppointmentsResult = await pool.query(allAppointmentsQuery);
        const countResult = await pool.query(countQuery);
        
        const totalAppointments = parseInt(countResult.rows[0].count, 10);
        const totalPages = Math.ceil(totalAppointments / limit);

        res.json({
            totalPages,
            currentPage: page,
            appointments: appointmentsResult.rows,
            allAppointments: allAppointmentsResult.rows
        });
    } catch (error) {
        console.error("Erro ao buscar agendamentos (admin):", error);
        res.status(500).json({ message: 'Erro no servidor.' });
    }
});

app.post('/api/admin/users', authenticateToken, isAdmin, async (req, res) => {
    const { name, username, email, password, role } = req.body;
    if (!name || !username || !email || !password || !role) return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
    try {
        const existingUser = await pool.query('SELECT * FROM users WHERE username = $1 OR email = $2', [username, email]);
        if (existingUser.rows.length > 0) return res.status(409).json({ message: 'Usuário ou e-mail já existem.' });

        let professionalId = null;
        if (role === 'funcionario' || role === 'admin') {
            const profResult = await pool.query('INSERT INTO professionals (name) VALUES ($1) RETURNING id', [name]);
            professionalId = profResult.rows[0].id;
        }

        const passwordHash = bcrypt.hashSync(password, 10);
        const query = 'INSERT INTO users (name, username, email, password_hash, role, professional_id) VALUES ($1, $2, $3, $4, $5, $6)';
        const values = [name, username, email, passwordHash, role, professionalId];
        await pool.query(query, values);

        res.status(201).json({ message: `Usuário com função '${role}' criado com sucesso!` });
    } catch (error) {
        console.error("Erro ao criar usuário (admin):", error);
        res.status(500).json({ message: 'Erro no servidor.' });
    }
});

app.get('/api/employee/dashboard', authenticateToken, async (req, res) => {
    if (req.user.role !== 'funcionario') return res.status(403).json({ message: 'Acesso negado.' });
    try {
        const professionalId = req.user.professionalId;
        const query = `
            SELECT a.*, s.name as "serviceName", s.price as "servicePrice"
            FROM appointments a
            JOIN services s ON a.service_id = s.id
            WHERE a.professional_id = $1
        `;
        const result = await pool.query(query, [professionalId]);
        const appointments = result.rows;

        const now = new Date();
        let totalBrutoMes = 0;
        const commissionRate = 0.70;
        
        const currentMonthAppointments = appointments.filter(app => {
            const appDate = new Date(app.date);
            return appDate.getMonth() === now.getMonth() && appDate.getFullYear() === now.getFullYear();
        });

        currentMonthAppointments.forEach(app => {
            totalBrutoMes += Number(app.servicePrice);
        });

        const valorAReceber = totalBrutoMes * commissionRate;
        res.json({
            appointments: appointments,
            earnings: { totalAtendimentos: currentMonthAppointments.length, totalBrutoMes, valorAReceber }
        });
    } catch (error) {
        console.error("Erro no dashboard do funcionário:", error);
        res.status(500).json({ message: 'Erro no servidor.' });
    }
});

app.get('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, username, email, role FROM users WHERE id = $1', [req.user.id]);
        if (result.rows.length === 0) return res.status(404).json({ message: 'Usuário não encontrado.' });
        res.json(result.rows[0]);
    } catch (error) {
        console.error("Erro ao buscar perfil:", error);
        res.status(500).json({ message: 'Erro no servidor.' });
    }
});

app.put('/api/user/profile', authenticateToken, async (req, res) => {
    const { name, username, email } = req.body;
    if (!name || !username || !email) return res.status(400).json({ message: 'Nome, nome de usuário e e-mail são obrigatórios.' });
    try {
        const existingUser = await pool.query('SELECT id FROM users WHERE (username = $1 OR email = $2) AND id != $3', [username, email, req.user.id]);
        if (existingUser.rows.length > 0) return res.status(409).json({ message: 'Nome de usuário ou e-mail já está em uso por outra conta.' });

        const query = 'UPDATE users SET name = $1, username = $2, email = $3 WHERE id = $4 RETURNING id, name, username, email, role';
        const values = [name, username, email, req.user.id];
        const result = await pool.query(query, values);
        res.json({ message: 'Perfil atualizado com sucesso!', user: result.rows[0] });
    } catch (error) {
        console.error("Erro ao atualizar perfil:", error);
        res.status(500).json({ message: 'Erro no servidor.' });
    }
});

app.get('/api/user/appointments', authenticateToken, async (req, res) => {
    try {
        const query = `
            SELECT a.id, a.date, a.time, s.name as "serviceName", p.name as "professionalName"
            FROM appointments a
            LEFT JOIN services s ON a.service_id = s.id
            LEFT JOIN professionals p ON a.professional_id = p.id
            WHERE a.client_name = $1
            ORDER BY a.date DESC, a.time DESC
        `;
        const result = await pool.query(query, [req.user.username]);
        res.json(result.rows);
    } catch (error) {
        console.error("Erro ao buscar agendamentos do usuário:", error);
        res.status(500).json({ message: 'Erro no servidor.' });
    }
});

app.delete('/api/appointments/:id', authenticateToken, async (req, res) => {
    const appointmentId = parseInt(req.params.id, 10);
    try {
        const appResult = await pool.query('SELECT client_name FROM appointments WHERE id = $1', [appointmentId]);
        if (appResult.rows.length === 0) return res.status(404).json({ message: "Agendamento não encontrado." });
        
        if (req.user.role !== 'admin' && appResult.rows[0].client_name !== req.user.username) {
            return res.status(403).json({ message: "Você não tem permissão para cancelar este agendamento." });
        }

        await pool.query('DELETE FROM appointments WHERE id = $1', [appointmentId]);
        res.json({ message: "Agendamento cancelado com sucesso!" });
    } catch (error) {
        console.error("Erro ao deletar agendamento:", error);
        res.status(500).json({ message: 'Erro no servidor.' });
    }
});

// --- 6. INICIAR O SERVIDOR ---
app.listen(PORT, () => {
    console.log(`Servidor backend rodando em http://localhost:${PORT}`);
});