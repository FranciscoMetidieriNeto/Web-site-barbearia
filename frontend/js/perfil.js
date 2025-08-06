document.addEventListener('DOMContentLoaded', () => {
    const userNameElement = document.getElementById('user-name');
    const tableBody = document.getElementById('user-appointments-table-body');
    
    // Usa o token do localStorage e a URL do seu servidor
    const token = localStorage.getItem('barber_token');
    const userName = localStorage.getItem('barber_user_name');
    const API_URL = 'http://localhost:3000/api';

    // --- LÓGICA DE PROTEÇÃO DE ROTA E INICIALIZAÇÃO ---
    function initializeProfile() {
        // Se não houver token, o usuário não está logado
        if (!token) {
            window.location.href = 'index.html';
            return;
        }
        
        // Preenche o nome do usuário no título da página
        if (userNameElement && userName) {
            userNameElement.textContent = userName;
        }

        // Busca os agendamentos do usuário através do seu server.js
        fetchUserAppointments();
    }

    // --- FUNÇÕES DE DADOS COM FETCH ---

    // 1. Busca os agendamentos do usuário na sua API
    async function fetchUserAppointments() {
        tableBody.innerHTML = `<tr><td colspan="4" class="text-center">Carregando seus agendamentos...</td></tr>`;
        try {
            const response = await fetch(`${API_URL}/user/appointments`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Falha ao buscar agendamentos.');
            
            const appointments = await response.json();
            renderAppointmentsTable(appointments);

        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="4" class="text-danger text-center">Erro ao carregar agendamentos.</td></tr>`;
            console.error("Erro ao buscar agendamentos:", error);
        }
    }

    // 2. Renderiza os agendamentos na tabela
    function renderAppointmentsTable(appointments) {
        if (appointments.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" class="text-center">Você ainda não possui agendamentos.</td></tr>`;
            return;
        }

        tableBody.innerHTML = '';
        appointments.forEach(app => {
            const date = new Date(`${app.date}T${app.time}`);
            const formattedDate = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const formattedTime = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            const row = document.createElement('tr');
            row.id = `appointment-row-${app.id}`;
            row.innerHTML = `
                <td>${app.serviceName}</td>
                <td><strong>${app.professionalName}</strong></td>
                <td>${formattedDate} às ${formattedTime}</td>
                <td class="appointment-actions">
                    <button class="btn btn-sm btn-outline-light edit-btn" data-id="${app.id}">
                        <i class="bi bi-pencil"></i> Editar
                    </button>
                    <button class="btn btn-sm btn-outline-danger cancel-btn" data-id="${app.id}">
                        <i class="bi bi-trash"></i> Cancelar
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        addEventListenersToButtons();
    }

    // 3. Adiciona os eventos de clique aos botões
    function addEventListenersToButtons() {
        document.querySelectorAll('.edit-btn').forEach(button => {
            button.addEventListener('click', () => {
                alert('Funcionalidade de Edição em desenvolvimento.');
            });
        });

        document.querySelectorAll('.cancel-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const appointmentId = e.currentTarget.dataset.id;
                if (confirm('Tem certeza que deseja cancelar este agendamento?')) {
                    await cancelAppointment(appointmentId);
                }
            });
        });
    }

    // 4. Cancela um agendamento através da sua API
    async function cancelAppointment(id) {
        try {
            const response = await fetch(`${API_URL}/appointments/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message);
            }
            document.getElementById(`appointment-row-${id}`).remove();
            alert('Agendamento cancelado com sucesso!');
        } catch (error) {
            alert(`Erro ao cancelar: ${error.message}`);
            console.error("Erro ao cancelar agendamento:", error);
        }
    }

    // --- INICIALIZAÇÃO ---
    initializeProfile();
});