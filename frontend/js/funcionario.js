document.addEventListener('DOMContentLoaded', () => {
    const employeeNameSpan = document.getElementById('employee-name');
    const totalAppointmentsSpan = document.getElementById('total-appointments');
    const totalBrutoSpan = document.getElementById('total-bruto');
    const totalGanhoSpan = document.getElementById('total-ganho');
    const tableBody = document.getElementById('employee-appointments-table-body');
    
    // Usa o token do localStorage e a URL do seu servidor
    const token = localStorage.getItem('barber_token');
    const userName = localStorage.getItem('barber_user_name');
    const userRole = localStorage.getItem('barber_role');
    const API_URL = 'http://localhost:3000/api';

    // --- LÓGICA DE PROTEÇÃO DE ROTA E INICIALIZAÇÃO ---
    function initializeDashboard() {
        // 1. Proteção de Rota: Apenas 'funcionarios' podem ver esta página
        if (!token || userRole !== 'funcionario') {
            window.location.href = 'index.html';
            return;
        }

        // Preenche o nome do funcionário no título
        if (employeeNameSpan && userName) {
            employeeNameSpan.textContent = userName;
        }

        // 2. Busca os dados do dashboard do funcionário no seu server.js
        loadEmployeeDashboard();
    }

    // --- FUNÇÕES DE DADOS COM FETCH ---

    // Busca os agendamentos e calcula os ganhos do funcionário
    async function loadEmployeeDashboard() {
        try {
            const response = await fetch(`${API_URL}/employee/dashboard`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                throw new Error('Falha ao carregar os dados do painel.');
            }
            const data = await response.json();

            // 3. Renderiza os dados na tela
            renderEarnings(data.earnings);
            renderAppointments(data.appointments);

        } catch (error) {
            console.error(error);
            tableBody.innerHTML = `<tr><td colspan="3" class="text-danger text-center">Não foi possível carregar seus dados.</td></tr>`;
        }
    }

    // Renderiza o resumo de ganhos do mês atual
    function renderEarnings(earnings) {
        totalAppointmentsSpan.textContent = earnings.totalAtendimentos;
        totalBrutoSpan.textContent = `R$ ${earnings.totalBrutoMes.toFixed(2)}`;
        totalGanhoSpan.textContent = `R$ ${earnings.valorAReceber.toFixed(2)}`;
    }

    // Renderiza a tabela de agendamentos
    function renderAppointments(appointments) {
        if (appointments.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="3" class="text-center">Você não possui agendamentos.</td></tr>`;
            return;
        }
        tableBody.innerHTML = '';
        appointments.forEach(app => {
            const date = new Date(`${app.date}T${app.time}`);
            const formattedDate = date.toLocaleDateString('pt-br', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const formattedTime = date.toLocaleTimeString('pt-br', { hour: '2-digit', minute: '2-digit' });

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${app.clientName}</td>
                <td>${app.serviceName}</td>
                <td>${formattedDate} às ${formattedTime}</td>
            `;
            tableBody.appendChild(row);
        });
    }

    // Inicia o carregamento dos dados
    initializeDashboard();
});