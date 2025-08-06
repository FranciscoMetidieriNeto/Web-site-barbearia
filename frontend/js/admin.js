document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'http://localhost:3000/api';
    const mainTableBody = document.getElementById('appointments-table-body');
    const paginationControls = document.getElementById('main-pagination-controls');
    const professionalSchedulesContainer = document.getElementById('professional-schedules-container');
    const generateReportBtn = document.getElementById('generate-report-btn');
    const reportsContainer = document.getElementById('reports-container');
    const addEmployeeForm = document.getElementById('add-employee-form');

    let allAppointmentsData = []; // Variável para guardar todos os agendamentos para os relatórios

    // --- LÓGICA DE PROTEÇÃO DE ROTA E INICIALIZAÇÃO ---
    const token = localStorage.getItem('barber_token');
    const userRole = localStorage.getItem('barber_role');

    if (!token || userRole !== 'admin') {
        window.location.href = 'index.html';
        return;
    }
    
    // --- FUNÇÕES DE DADOS COM FETCH ---

    // 1. Busca dados paginados e totais do seu server.js
    async function loadAdminData(page = 1) {
        mainTableBody.innerHTML = `<tr><td colspan="5" class="text-center">Carregando...</td></tr>`;
        try {
            const response = await fetch(`${API_URL}/appointments?page=${page}`, { 
                headers: { 'Authorization': `Bearer ${token}` } 
            });
            if (!response.ok) throw new Error('Falha ao carregar agendamentos.');
            
            const data = await response.json();
            
            // Armazena a lista completa de agendamentos na primeira vez que a página carrega
            if (page === 1 && data.allAppointments) {
                allAppointmentsData = data.allAppointments;
                renderProfessionalTables(allAppointmentsData);
            }
            
            renderMainTable(data.appointments);
            renderPaginationControls(data.totalPages, data.currentPage);

        } catch (error) {
            console.error('Erro ao carregar dados do admin:', error);
            mainTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Erro ao carregar.</td></tr>`;
        }
    }

    // 2. Renderiza a tabela principal
    function renderMainTable(appointments) {
        if (!appointments || appointments.length === 0) {
            mainTableBody.innerHTML = `<tr><td colspan="5" class="text-center">Nenhum agendamento encontrado nesta página.</td></tr>`;
            return;
        }
        mainTableBody.innerHTML = '';
        appointments.forEach(app => {
            const date = new Date(`${app.date}T${app.time}`);
            const formattedDate = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${app.client_name || app.clientName}</td>
                <td>${app.client_phone || app.clientPhone}</td>
                <td>${app.serviceName || app.service_name}</td>
                <td>${formattedDate}</td>
                <td><strong>${app.professionalName || app.professional_name || 'N/A'}</strong></td>
            `;
            mainTableBody.appendChild(row);
        });
    }

    // 3. Renderiza os controlos de paginação
    function renderPaginationControls(totalPages, currentPage) {
        paginationControls.innerHTML = '';
        if (totalPages <= 1) return;
        const createPageLink = (page, text, isDisabled = false, isActive = false) => {
            const li = document.createElement('li');
            li.className = `page-item ${isDisabled ? 'disabled' : ''} ${isActive ? 'active' : ''}`;
            li.innerHTML = `<a class="page-link" href="#" data-page="${page}">${text}</a>`;
            return li;
        };
        paginationControls.appendChild(createPageLink(currentPage - 1, 'Anterior', currentPage === 1));
        for (let i = 1; i <= totalPages; i++) {
            paginationControls.appendChild(createPageLink(i, i, false, i === currentPage));
        }
        paginationControls.appendChild(createPageLink(currentPage + 1, 'Próximo', currentPage === totalPages));
    }

    // 4. Renderiza as tabelas por profissional
    function renderProfessionalTables(appointments) {
        if (appointments.length === 0) {
            professionalSchedulesContainer.innerHTML = `<p class="text-center">Nenhum agendamento para exibir.</p>`;
            return;
        }
        const grouped = appointments.reduce((acc, app) => {
            const profName = app.professionalName || app.professional_name || 'Não Atribuído';
            if (!acc[profName]) acc[profName] = [];
            acc[profName].push(app);
            return acc;
        }, {});
        professionalSchedulesContainer.innerHTML = '';
        for (const professionalName in grouped) {
            let rows = '';
            grouped[professionalName].forEach(app => {
                const date = new Date(`${app.date}T${app.time}`);
                const formattedDate = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
                rows += `<tr><td>${app.client_name || app.clientName}</td><td>${app.serviceName || app.service_name}</td><td>${formattedDate}</td></tr>`;
            });
            professionalSchedulesContainer.innerHTML += `<div class="mb-4"><h4 class="professional-name">${professionalName}</h4><div class="table-responsive"><table class="table table-sm table-striped table-hover"><thead><tr><th>Cliente</th><th>Serviço</th><th>Data e Hora</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
        }
    }
    
    // --- EVENT LISTENERS ---
    paginationControls.addEventListener('click', (e) => {
        e.preventDefault();
        const target = e.target;
        if (target.tagName === 'A' && !target.parentElement.classList.contains('disabled')) {
            loadAdminData(parseInt(target.dataset.page, 10));
        }
    });

    generateReportBtn.addEventListener('click', () => { 
        reportsContainer.innerHTML = `<p class="text-center">Calculando relatório...</p>`;
        const now = new Date();
        const currentMonthAppointments = allAppointmentsData.filter(app => {
            const appDate = new Date(app.date);
            return appDate.getMonth() === now.getMonth() && appDate.getFullYear() === now.getFullYear();
        });
        const groupedByProfessional = currentMonthAppointments.reduce((acc, app) => {
            const profName = app.professionalName || app.professional_name || 'Não Atribuído';
            if (!acc[profName]) acc[profName] = [];
            acc[profName].push(app);
            return acc;
        }, {});
        renderReports(groupedByProfessional);
    });

    function renderReports(groupedData) {
        reportsContainer.innerHTML = '';
        const commissionRate = 0.70;
        if (Object.keys(groupedData).length === 0) {
            reportsContainer.innerHTML = '<p class="text-center">Nenhum atendimento encontrado para o mês atual.</p>';
            return;
        }
        for (const professionalName in groupedData) {
            const appointments = groupedData[professionalName];
            const totalBruto = appointments.reduce((sum, app) => sum + (app.servicePrice || app.service_price || 0), 0);
            const valorAReceber = totalBruto * commissionRate;
            let tableRows = '';
            appointments.forEach(app => {
                const date = new Date(`${app.date}T${app.time}`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                tableRows += `<tr><td>${app.client_name || app.clientName}</td><td>${app.serviceName || app.service_name}</td><td>${date}</td><td>R$ ${Number(app.servicePrice || app.service_price || 0).toFixed(2)}</td></tr>`;
            });
            const safeProfName = professionalName.replace(/\s+/g, '');
            reportsContainer.innerHTML += `<div class="mb-5 report-card" id="report-${safeProfName}"><h4 class="professional-name">${professionalName}</h4><div class="report-summary"><p><strong>Total de Atendimentos:</strong> ${appointments.length}</p><p><strong>Total Bruto:</strong> R$ ${totalBruto.toFixed(2)}</p><p class="text-success"><strong>Valor a Receber (70%):</strong> R$ ${valorAReceber.toFixed(2)}</p></div><div class="my-3"><button class="btn btn-sm btn-secondary view-pdf-btn" data-table-id="table-${safeProfName}" data-professional-name="${professionalName}">Visualizar PDF</button> <button class="btn btn-sm btn-success download-pdf-btn" data-table-id="table-${safeProfName}" data-professional-name="${professionalName}">Baixar PDF</button></div><div class="table-responsive"><table class="table table-sm" id="table-${safeProfName}"><thead><tr><th>Cliente</th><th>Serviço</th><th>Data</th><th>Preço</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
        }
        addPdfButtonListeners();
    }

    function addPdfButtonListeners() {
        const { jsPDF } = window.jspdf;
        document.querySelectorAll('.view-pdf-btn, .download-pdf-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const tableId = e.currentTarget.dataset.tableId;
                const profName = e.currentTarget.dataset.professionalName;
                const doc = new jsPDF();
                doc.text(`Relatório de Atendimentos - ${profName}`, 14, 16);
                doc.autoTable({ html: `#${tableId}`, startY: 20, theme: 'grid' });
                if (e.currentTarget.classList.contains('download-pdf-btn')) {
                    doc.save(`Relatorio-${profName.replace(/\s+/g, '')}.pdf`);
                } else {
                    window.open(doc.output('bloburl'), '_blank');
                }
            });
        });
    }

    addEmployeeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        // Lógica de adicionar funcionário aqui, usando fetch para a sua API
    });

    // --- INICIALIZAÇÃO ---
    loadAdminData(1);
});