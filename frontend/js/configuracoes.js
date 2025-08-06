document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'http://localhost:3000/api';
    const token = localStorage.getItem('barber_token');

    // Proteção de Rota: se não houver token, redireciona para a página inicial
    if (!token) {
        window.location.href = 'index.html';
        return;
    }

    // Elementos do formulário
    const settingsForm = document.getElementById('profile-settings-form');
    const nameInput = document.getElementById('name');
    const usernameInput = document.getElementById('username');
    const emailInput = document.getElementById('email');
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');

    // 1. Carrega os dados atuais do perfil do usuário do seu server.js
    async function loadProfileData() {
        try {
            const response = await fetch(`${API_URL}/user/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Não foi possível carregar os dados do perfil.');
            
            const profile = await response.json();
            
            // Preenche o formulário com os dados
            nameInput.value = profile.name;
            usernameInput.value = profile.username;
            emailInput.value = profile.email;

        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    }

    // 2. Lida com o envio do formulário de atualização para o seu server.js
    settingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        // Validação da senha
        if (newPassword && newPassword !== confirmPassword) {
            alert('As novas senhas não coincidem.');
            return;
        }

        const updatedData = {
            name: nameInput.value,
            username: usernameInput.value,
            email: emailInput.value
        };

        // Adiciona a senha ao payload apenas se ela foi alterada
        if (newPassword) {
            updatedData.password = newPassword;
        }

        try {
            const response = await fetch(`${API_URL}/user/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updatedData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message);
            }

            alert(result.message);

            // Atualiza o nome do usuário no localStorage para refletir na navbar
            localStorage.setItem('barber_user_name', result.user.name);
            setupNavbar(); // Função global do main.js para redesenhar a navbar

        } catch (error) {
            console.error(error);
            alert(`Erro ao atualizar o perfil: ${error.message}`);
        }
    });

    // Inicia o carregamento dos dados ao entrar na página
    loadProfileData();
});