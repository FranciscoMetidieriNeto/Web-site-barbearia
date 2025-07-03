document.addEventListener('DOMContentLoaded', () => {
    // URL base da sua API
    const API_URL = 'http://localhost:3000/api';

    // Função para pré-selecionar o serviço vindo da URL
    const preencherServicoPelaURL = () => {
        const params = new URLSearchParams(window.location.search);
        const servicoSelecionado = params.get('servico');
        if (servicoSelecionado) {
            const selectServico = document.getElementById('service-type');
            if (selectServico) selectServico.value = servicoSelecionado;
        }
    };
    preencherServicoPelaURL();

    if (!document.getElementById('agendamento-semanal')) return;

    // --- ELEMENTOS DO DOM ---
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

    // --- LÓGICA DE COMUNICAÇÃO COM O BACKEND ---

    /**
     * Busca horários ocupados no backend para a semana especificada.
     */
    async function fetchBookedSlotsForWeek(startDate) {
        const isoDate = startDate.toISOString().split('T')[0]; // Formato YYYY-MM-DD
        try {
            const response = await fetch(`${API_URL}/appointments/booked?weekStart=${isoDate}`);
            if (!response.ok) throw new Error('Falha ao buscar horários.');
            const bookedSlots = await response.json(); // Espera um array de strings: ["2024-06-25T10:00", ...]
            return new Map(bookedSlots.map(slot => [slot, true]));
        } catch (error) {
            console.error("Erro ao buscar horários:", error);
            return new Map(); // Retorna um mapa vazio em caso de erro
        }
    }

    /**
     * Envia um novo agendamento para o backend.
     */
    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!selectedSlot) {
            alert('Por favor, selecione um horário.');
            return;
        }

        const clientName = document.getElementById('name').value;
        const clientPhone = document.getElementById('phone').value;
        const service = document.getElementById('service-type').value;

        const appointmentData = {
            clientName,
            clientPhone,
            service,
            date: selectedSlot.date,
            time: selectedSlot.time,
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
                renderSchedule(currentWeekStart); // Atualiza a tabela para mostrar o novo horário ocupado
            } else {
                const errorData = await response.json();
                alert(`Erro ao agendar: ${errorData.message}`);
            }
        } catch (error) {
            console.error('Erro de rede:', error);
            alert('Não foi possível conectar ao servidor para realizar o agendamento.');
        }
    });

    // --- FUNÇÕES DE RENDERIZAÇÃO DA TABELA (sem grandes mudanças) ---
    
    function getMonday(d) {
        d = new Date(d);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        d.setHours(0, 0, 0, 0);
        return new Date(d.setDate(diff));
    }

    async function renderSchedule(startDate) {
        tableContainer.innerHTML = `<div class="spinner-border text-light" role="status"><span class="visually-hidden">Carregando...</span></div>`;
        bookingFormContainer.classList.add('d-none');
        selectedSlot = null;

        const startOfWeek = new Date(startDate);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 5);
        weekDisplay.textContent = `${startOfWeek.toLocaleDateString('pt-BR')} - ${endOfWeek.toLocaleDateString('pt-BR')}`;
        
        const today = getMonday(new Date());
        prevWeekBtn.disabled = startOfWeek <= today;

        try {
            // **MUDANÇA PRINCIPAL: Chama a função que busca dados reais**
            const bookedMap = await fetchBookedSlotsForWeek(startOfWeek);
            generateTable(startOfWeek, bookedMap);
        } catch (error) {
            console.error(error);
            tableContainer.innerHTML = `<p class="text-danger">Ocorreu um erro ao carregar a agenda.</p>`;
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

        timeSlots.forEach(time => {
            tableHtml += `<tr><td class="time-label">${time}</td>`;
            weekDates.forEach(date => {
                const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                const key = `${dateString}T${time}`;
                const isBooked = bookedMap.has(key);
                const [hour, minute] = time.split(':');
                const slotDate = new Date(date);
                slotDate.setHours(parseInt(hour), parseInt(minute));
                const isPast = slotDate < new Date();

                if (isBooked || isPast) {
                    tableHtml += `<td class="slot booked" title="Horário indisponível">--</td>`;
                } else {
                    tableHtml += `<td class="slot available" data-date="${dateString}" data-time="${time}">${time}</td>`;
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
                selectedSlotDisplay.textContent = `${displayDate} às ${selectedSlot.time}`;
                bookingFormContainer.classList.remove('d-none');
                bookingFormContainer.scrollIntoView({ behavior: 'smooth' });
            });
        });
    }

    // --- EVENTOS DE NAVEGAÇÃO DA SEMANA ---
    prevWeekBtn.addEventListener('click', () => {
        currentWeekStart.setDate(currentWeekStart.getDate() - 7);
        renderSchedule(currentWeekStart);
    });

    nextWeekBtn.addEventListener('click', () => {
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        renderSchedule(currentWeekStart);
    });

    // --- INICIALIZAÇÃO ---
    renderSchedule(currentWeekStart);
});