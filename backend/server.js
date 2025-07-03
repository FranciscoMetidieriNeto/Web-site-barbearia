// server.js

// --- 1. IMPORTAÇÕES E CONFIGURAÇÃO INICIAL ---
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs'); // Módulo para ler e escrever arquivos
const path = require('path');

const app = express();
const PORT = 3000;
const SECRET_KEY = 'sua-chave-secreta-super-dificil-de-adivinhar'; // Troque por qualquer texto seguro
const DB_PATH = path.join(__dirname, 'db.json');

// --- 2. MIDDLEWARE ---
app.use(cors()); // Permite requisições de outras origens (do seu frontend)
app.use(express.json()); // Permite que o servidor entenda JSON no corpo das requisições

// --- 3. FUNÇÕES AUXILIARES PARA O "BANCO DE DADOS" ---
const readDB = () => JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
const writeDB = (data) => fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));

// --- 4. ROTAS DA API ---

// ROTA DE LOGIN
app.post('/api/auth/login', (req, res) => {
    console.log("\n--- Nova Tentativa de Login Recebida ---");

    const { username, password } = req.body;
    console.log("Dados que o servidor recebeu do formulário:", { username, password });

    const db = readDB();
    const user = db.users.find(u => u.username === username);

    if (!user) {
        console.log("VERIFICAÇÃO: Usuário não encontrado no arquivo db.json.");
        return res.status(401).json({ message: 'Usuário ou senha inválidos.' });
    }

    console.log("VERIFICAÇÃO: Usuário '" + user.username + "' encontrado. Comparando a senha agora...");
    console.log("Hash da senha que está no db.json:", user.passwordHash);

    // Use a senha '123456' para o usuário 'admin'
    const isPasswordCorrect = bcrypt.compareSync(password, user.passwordHash);

    console.log("VERIFICAÇÃO: A senha digitada está correta?", isPasswordCorrect);

    if (!isPasswordCorrect) {
        console.log("RESULTADO: A senha está incorreta.");
        return res.status(401).json({ message: 'Usuário ou senha inválidos.' });
    }

    // Se chegou até aqui, o login foi um sucesso.
    console.log("RESULTADO: Login bem-sucedido! Gerando o token de acesso.");
    const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '8h' });
    res.json({ token });
});

// ROTA PARA CRIAR UM NOVO AGENDAMENTO (PÚBLICA)
app.post('/api/appointments', (req, res) => {
    try {
        const db = readDB();
        const newAppointment = {
            id: Date.now(), // ID único simples
            ...req.body 
        };
        db.appointments.push(newAppointment);
        writeDB(db);
        console.log("Novo agendamento criado:", newAppointment);
        res.status(201).json(newAppointment);
    } catch (error) {
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

// ROTA PARA BUSCAR HORÁRIOS OCUPADOS (PÚBLICA E FILTRADA POR SEMANA) - CÓDIGO CORRIGIDO
app.get('/api/appointments/booked', (req, res) => {
    const db = readDB();
    const { weekStart } = req.query; // Pega a data de início da semana da URL

    // Se a data de início da semana for fornecida, filtre os resultados
    if (weekStart) {
        const startDate = new Date(weekStart + 'T00:00:00');
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6); // A semana tem 7 dias (do dia 0 ao 6)

        const bookedInWeek = db.appointments.filter(app => {
            const appDate = new Date(app.date + 'T00:00:00');
            return appDate >= startDate && appDate <= endDate;
        });

        // Mapeia apenas os agendamentos filtrados para o formato que o front-end espera
        const bookedSlots = bookedInWeek.map(app => `${app.date}T${app.time}`);
        res.json(bookedSlots);
    } else {
        // Comportamento antigo (fallback): Se nenhuma data for passada, retorna todos
        const bookedSlots = db.appointments.map(app => `${app.date}T${app.time}`);
        res.json(bookedSlots);
    }
});


// MIDDLEWARE DE AUTENTICAÇÃO (para proteger rotas)
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Formato: Bearer TOKEN

    if (!token) return res.sendStatus(401); // Não autorizado

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403); // Token inválido ou expirado
        req.user = user;
        next(); // Continua para a rota protegida
    });
};

// ROTA PARA BUSCAR TODOS OS AGENDAMENTOS (PROTEGIDA)
app.get('/api/appointments', authenticateToken, (req, res) => {
    const db = readDB();
    // Ordena os agendamentos por data, do mais recente para o mais antigo
    // CORREÇÃO: Usa template literals para criar o objeto Date
    const sortedAppointments = db.appointments.sort((a, b) => new Date(`${b.date}T${b.time}`) - new Date(`${a.date}T${a.time}`));
    res.json(sortedAppointments);
});

// --- 5. INICIAR O SERVIDOR ---
app.listen(PORT, () => {
    console.log(`Servidor backend rodando em http://localhost:${PORT}`);
});