document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'http://localhost:3000/api';

    // --- ELEMENTOS DO DOM ---
    const loginScreen = document.getElementById('login-screen');
    const adminPanel = document.getElementById('admin-panel');
    const loginForm = document.getElementById('login-form');
    const navbarPlaceholder = document.getElementById('navbar-placeholder');
    const appointmentsTableBody = document.getElementById('appointments-table-body');
    const galleryUploadForm = document.getElementById('gallery-upload-form');

    // --- LÓGICA DE AUTENTICAÇÃO E UI ---

    /**
     * Carrega a navbar e a adapta para a visão do admin,
     * trocando o botão 'Admin' por um ícone e status de logado.
     */
    async function loadAndConfigureNavbar() {
        try {
            const response = await fetch('navbar.html');
            if (!response.ok) throw new Error('Navbar não encontrada.');
            
            navbarPlaceholder.innerHTML = await response.text();
            
            const navContainer = navbarPlaceholder.querySelector('.navbar-collapse .navbar-nav:last-child');
            const adminButtonLink = navContainer.querySelector('.admin-link-button');

            if (navContainer && adminButtonLink) {
                // Modifica o botão 'Admin' para um status de 'Logado' com ícone
                adminButtonLink.innerHTML = `<i class="bi bi-shield-lock-fill me-2"></i>Admin`;
                adminButtonLink.classList.remove('admin-link-button');
                adminButtonLink.classList.add('disabled');

                // Cria e adiciona o botão 'Sair'
                const logoutLi = document.createElement('li');
                logoutLi.className = 'nav-item ms-2';
                logoutLi.innerHTML = '<button id="logout-button-nav" class="btn btn-danger btn-sm">Sair</button>';
                navContainer.appendChild(logoutLi);

                // Adiciona o evento de clique ao novo botão de logout
                logoutLi.querySelector('#logout-button-nav').addEventListener('click', handleLogout);
            }
        } catch (error) {
            console.error('Falha ao carregar ou configurar a navbar:', error);
        }
    }

    /**
     * Lida com o logout do usuário.
     */
    function handleLogout() {
        localStorage.removeItem('barber_token');
        checkLoginStatus();
    }

    /**
     * Verifica o status de login e atualiza a interface.
     */
    function checkLoginStatus() {
        const token = localStorage.getItem('barber_token');
        if (token) {
            loginScreen.classList.add('d-none');
            adminPanel.classList.remove('d-none');
            loadAndConfigureNavbar();
            loadAppointments(token);
        } else {
            loginScreen.classList.remove('d-none');
            adminPanel.classList.add('d-none');
            navbarPlaceholder.innerHTML = '';
        }
    }

    /**
     * Lida com o envio do formulário de login.
     */
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('barber_token', data.token);
                checkLoginStatus();
            } else {
                alert('Usuário ou senha inválidos.');
            }
        } catch (error) {
            console.error('Erro de login:', error);
            alert('Erro ao tentar conectar ao servidor.');
        }
    });

    // --- LÓGICA DE GERENCIAMENTO DE AGENDAMENTOS ---
    async function loadAppointments(token) {
        appointmentsTableBody.innerHTML = '<tr><td colspan="4" class="text-center">Carregando agendamentos...</td></tr>';
        try {
            const response = await fetch(`${API_URL}/appointments`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                if(response.status === 401 || response.status === 403) {
                   handleLogout();
                }
                throw new Error('Falha ao carregar agendamentos.');
            }
            
            const appointments = await response.json();
            if (appointments.length === 0) {
                appointmentsTableBody.innerHTML = '<tr><td colspan="4" class="text-center">Nenhum agendamento encontrado.</td></tr>';
                return;
            }

            appointmentsTableBody.innerHTML = '';
            appointments.forEach(app => {
                const date = new Date(`${app.date}T${app.time}`);
                const formattedDate = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${app.clientName}</td>
                    <td>${app.clientPhone}</td>
                    <td>${app.service}</td>
                    <td>${formattedDate}</td>
                `;
                appointmentsTableBody.appendChild(row);
            });
        } catch (error) {
            console.error('Erro ao carregar agendamentos:', error);
            appointmentsTableBody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Erro ao carregar agendamentos.</td></tr>';
        }
    }

    // --- LÓGICA DE UPLOAD ---
    galleryUploadForm.addEventListener('submit', (e) => {
        e.preventDefault();
        alert('Funcionalidade de upload ainda em desenvolvimento.');
    });

    // --- INICIALIZAÇÃO ---
    checkLoginStatus();
});