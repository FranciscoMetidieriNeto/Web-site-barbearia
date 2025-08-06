document.addEventListener('DOMContentLoaded', () => {
    // URL base da sua API LOCAL
    const API_URL = 'http://localhost:3000/api';

    // --- ELEMENTOS DO DOM ---
    const professionalSelect = document.getElementById('professional-select');
    const serviceSelect = document.getElementById('service-type');
    const scheduleSection = document.getElementById('schedule-section');
    const weekDisplay = document.getElementById('week-display');
    const prevWeekBtn = document.getElementById('prev-week-btn');
    const nextWeekBtn = document.getElementById('next-week-btn');
    const tableContainer = document.getElementById('schedule-table-container');
    const bookingFormContainer = document.getElementById('booking-form-container');
    const selectedSlotDisplay = document.getElementById('selected-slot-display');
    const bookingForm = document.getElementById('booking-form');

    // --- ESTADO DA APLICAÇÃO ---
    let currentWeekStart = getMonday(new Date());
    let selectedSlot = null;
    let selectedProfessionalId = null;

    // --- FUNÇÕES DE INICIALIZAÇÃO E LÓGICA ---

    const preencherNomeDoUsuarioLogado = () => {
        // Esta função usa o localStorage, que é preenchido pelo login-modal.js
        const userName = localStorage.getItem('barber_user_name');
        const nameInput = document.getElementById('name');
        if (userName && nameInput) {
            nameInput.value = userName;
        }
    };

    const preencherServicoPelaURL = (services) => {
        const params = new URLSearchParams(window.location.search);
        const serviceNameFromURL = params.get('servico');
        if (serviceNameFromURL && services.length > 0) {
            const matchedService = services.find(s => s.name === serviceNameFromURL);
            if (matchedService) {
                serviceSelect.value = matchedService.id;
            }
        }
    };

    // ATUALIZADO: Busca profissionais no seu server.js
    async function loadProfessionals() {
        try {
            const response = await fetch(`${API_URL}/professionals`);
            if (!response.ok) throw new Error("Não foi possível carregar os profissionais.");
            const professionals = await response.json();
            professionals.forEach(prof => {
                const option = document.createElement('option');
                option.value = prof.id;
                option.textContent = prof.name;
                professionalSelect.appendChild(option);
            });
        } catch (error) {
            console.error("Erro ao carregar profissionais:", error);
        }
    }

    // ATUALIZADO: Busca serviços no seu server.js
    async function loadServices() {
        try {
            const response = await fetch(`${API_URL}/services`);
            if (!response.ok) throw new Error("Não foi possível carregar os serviços.");
            const services = await response.json();
            services.forEach(service => {
                const option = document.createElement('option');
                option.value = service.id;
                option.textContent = `${service.name} (R$ ${Number(service.price).toFixed(2)})`;
                serviceSelect.appendChild(option);
            });
            return services;
        } catch (error) {
            console.error("Erro ao carregar serviços:", error);
            return [];
        }
    }

    // --- EVENT LISTENERS ---
    professionalSelect.addEventListener('change', () => {
        selectedProfessionalId = professionalSelect.value;
        bookingFormContainer.classList.add('d-none');
        renderSchedule(currentWeekStart);
    });

    // ATUALIZADO: Envia o agendamento para o seu server.js
    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!selectedSlot || !selectedProfessionalId) {
            alert('Por favor, selecione um profissional e um horário.');
            return;
        }

        // Não precisa mais de buscar o user_id, o server.js não o usa para criar
        const appointmentData = {
            clientName: document.getElementById('name').value,
            clientPhone: document.getElementById('phone').value,
            serviceId: parseInt(serviceSelect.value, 10),
            date: selectedSlot.date,
            time: selectedSlot.time,
            professionalId: parseInt(selectedProfessionalId, 10)
        };

        try {
            const response = await fetch(`${API_URL}/appointments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(appointmentData),
            });

            if (response.status === 201) {
                alert('Agendamento realizado com sucesso!');
                bookingForm.reset();
                bookingFormContainer.classList.add('d-none');
                preencherNomeDoUsuarioLogado();
                renderSchedule(currentWeekStart);
            } else {
                const errorData = await response.json();
                alert(`Erro ao agendar: ${errorData.message}`);
            }
        } catch (error) {
            console.error('Erro de rede:', error);
            alert('Não foi possível conectar ao servidor para realizar o agendamento.');
        }
    });

    // --- LÓGICA DA AGENDA ---
    
    // ATUALIZADO: Busca horários ocupados no seu server.js
    async function fetchBookedSlotsForWeek(startDate, professionalId) {
        if (!professionalId) return new Map();
        const isoDate = startDate.toISOString().split('T')[0];
        const url = `${API_URL}/appointments/booked?weekStart=${isoDate}&professionalId=${professionalId}`;
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Falha ao buscar horários.');
            const bookedSlots = await response.json();
            return new Map(bookedSlots.map(slot => [slot, true]));
        } catch (error) {
            console.error("Erro ao buscar horários:", error);
            return new Map();
        }
    }
    
    function getMonday(d) {
        d = new Date(d);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        d.setHours(0, 0, 0, 0);
        return new Date(d.setDate(diff));
    }

    async function renderSchedule(startDate) {
        tableContainer.innerHTML = `<div class="d-flex justify-content-center p-5"><div class="spinner-border text-light" role="status"></div></div>`;
        bookingFormContainer.classList.add('d-none');
        selectedSlot = null;
        const startOfWeek = new Date(startDate);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 5);
        weekDisplay.textContent = `${startOfWeek.toLocaleDateString('pt-BR')} - ${endOfWeek.toLocaleDateString('pt-BR')}`;
        const today = getMonday(new Date());
        prevWeekBtn.disabled = startOfWeek <= today;
        try {
            const bookedMap = await fetchBookedSlotsForWeek(startDate, selectedProfessionalId);
            generateTable(startOfWeek, bookedMap);
        } catch (error) {
            console.error(error);
            tableContainer.innerHTML = `<p class="text-danger text-center">Ocorreu um erro ao carregar a agenda.</p>`;
        }
    }

    function generateTable(startOfWeek, bookedMap) {
        const weekdays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const timeSlots = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
        let tableHtml = '<table class="schedule-table w-100"><thead><tr><th>Horário</th>';
        const weekDates = [];
        for (let i = 0; i < 6; i++) {
            const currentDate = new Date(startOfWeek);
            currentDate.setDate(startOfWeek.getDate() + i);
            weekDates.push(currentDate);
            tableHtml += `<th>${weekdays[i]}<br><small>${currentDate.toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})}</small></th>`;
        }
        tableHtml += '</tr></thead><tbody>';
        const now = new Date();
        timeSlots.forEach(time => {
            tableHtml += `<tr><td class="time-label">${time}</td>`;
            weekDates.forEach(date => {
                const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                const key = `${dateString}T${time}:00`;
                const isBooked = bookedMap.has(key);
                const [hour, minute] = time.split(':');
                const slotDateTime = new Date(date);
                slotDateTime.setHours(parseInt(hour), parseInt(minute), 0, 0);
                const isPast = slotDateTime < now;
                if (!selectedProfessionalId) {
                    tableHtml += `<td class="slot disabled" title="Selecione um profissional para ver os horários.">--</td>`;
                } else if (isBooked || isPast) {
                    tableHtml += `<td class="slot booked" title="Horário indisponível">--</td>`;
                } else {
                    tableHtml += `<td class="slot available" data-date="${dateString}" data-time="${time}:00">${time}</td>`;
                }
            });
            tableHtml += `</tr>`;
        });
        tableHtml += '</tbody></table>';
        tableContainer.innerHTML = tableHtml;
        addSlotClickListeners();
    }

    function addSlotClickListeners() {
        document.querySelectorAll('.slot.available').forEach(slot => {
            slot.addEventListener('click', (e) => {
                document.querySelector('.slot.selected')?.classList.remove('selected');
                const target = e.currentTarget;
                target.classList.add('selected');
                selectedSlot = { date: target.dataset.date, time: target.dataset.time };
                const displayDate = new Date(selectedSlot.date + 'T00:00:00').toLocaleDateString('pt-BR', {weekday: 'long', day: '2-digit', month: '2-digit'});
                selectedSlotDisplay.textContent = `${displayDate} às ${selectedSlot.time.substring(0, 5)}`;
                bookingFormContainer.classList.remove('d-none');
                bookingFormContainer.scrollIntoView({ behavior: 'smooth' });
            });
        });
    }

    prevWeekBtn.addEventListener('click', () => {
        currentWeekStart.setDate(currentWeekStart.getDate() - 7);
        renderSchedule(currentWeekStart);
    });

    nextWeekBtn.addEventListener('click', () => {
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        renderSchedule(currentWeekStart);
    });

    // --- INICIALIZAÇÃO ---
    async function initializePage() {
        await preencherNomeDoUsuarioLogado();
        await loadProfessionals();
        const services = await loadServices();
        preencherServicoPelaURL(services);
        renderSchedule(currentWeekStart);
    }

    initializePage();
});