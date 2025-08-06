document.addEventListener('DOMContentLoaded', () => {
    const loginModalElement = document.getElementById('loginModal');
    if (!loginModalElement) return;

    const loginForm = document.getElementById('login-modal-form');
    const registerForm = document.getElementById('register-modal-form');
    const loginError = document.getElementById('login-modal-error');
    const registerError = document.getElementById('register-modal-error');
    const registerSuccess = document.getElementById('register-modal-success');
    const loginModal = new bootstrap.Modal(loginModalElement);
    
    const API_URL = 'http://localhost:3000/api';

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginError.classList.add('d-none');
        const username = document.getElementById('username-modal').value;
        const password = document.getElementById('password-modal').value;

        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            const data = await response.json();
            if (response.ok) {
                localStorage.setItem('barber_token', data.token);
                localStorage.setItem('barber_user_name', data.name);
                localStorage.setItem('barber_role', data.role);
                loginModal.hide();
                if (data.role === 'admin') window.location.href = 'admin.html';
                else if (data.role === 'funcionario') window.location.href = 'funcionario.html';
                else location.reload();
            } else {
                loginError.textContent = data.message;
                loginError.classList.remove('d-none');
            }
        } catch (error) {
            loginError.textContent = 'Não foi possível conectar ao servidor.';
            loginError.classList.remove('d-none');
        }
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        registerError.classList.add('d-none');
        registerSuccess.classList.add('d-none');
        const email = document.getElementById('email-register').value;
        const username = document.getElementById('username-register').value;
        const password = document.getElementById('password-register').value;

        try {
            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, username, password }),
            });
            const data = await response.json();
            if (response.ok) {
                registerSuccess.textContent = data.message + ' Você já pode fazer o login.';
                registerSuccess.classList.remove('d-none');
                registerForm.reset();
            } else {
                registerError.textContent = data.message;
                registerError.classList.remove('d-none');
            }
        } catch (error) {
            registerError.textContent = 'Não foi possível conectar ao servidor.';
            registerError.classList.remove('d-none');
        }
    });
});