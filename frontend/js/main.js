document.addEventListener('DOMContentLoaded', async () => {
    try {
        const placeholder = document.getElementById('navbar-placeholder');
        if (!placeholder) return;
        const response = await fetch('navbar.html');
        if (!response.ok) throw new Error('Arquivo navbar.html não encontrado.');
        const navbarHtml = await response.text();
        placeholder.innerHTML = navbarHtml;
        setupNavbar();
        highlightActiveLink();
        // initializeAdvancedCarousel(); // Se estiver usando o carrossel avançado
    } catch (error) {
        console.error('Falha ao inicializar a aplicação:', error);
    }
});

function setupNavbar() {
    const token = localStorage.getItem('barber_token');
    const userName = localStorage.getItem('barber_user_name');
    const userRole = localStorage.getItem('barber_role');
    const userProfileLink = document.getElementById('user-profile-link');
    const employeeDashboardLink = document.getElementById('employee-dashboard-link');
    const adminLink = document.getElementById('admin-link');
    const authButtonContainer = document.getElementById('auth-button-container');

    if (!authButtonContainer) return;

    if (userProfileLink) userProfileLink.classList.add('d-none');
    if (employeeDashboardLink) employeeDashboardLink.classList.add('d-none');
    if (adminLink) adminLink.classList.add('d-none');

    if (token && userName && userRole) {
        authButtonContainer.innerHTML = `
            <div class="dropdown">
                <button class="nav-link dropdown-toggle user-menu-button" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                    <i class="bi bi-person-circle"></i> Olá, ${userName.split(' ')[0]}
                </button>
                <ul class="dropdown-menu dropdown-menu-end">
                    <li><a class="dropdown-item d-flex align-items-center settings-link" href="configuracoes.html"><i class="bi bi-gear me-2"></i><span>Configurações</span></a></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><button id="logout-button" class="dropdown-item d-flex align-items-center logout-link"><i class="bi bi-box-arrow-right me-2"></i><span>Sair</span></button></li>
                </ul>
            </div>`;
        document.getElementById('logout-button').addEventListener('click', handleLogout);

        if (userRole === 'admin') adminLink.classList.remove('d-none');
        else if (userRole === 'funcionario') employeeDashboardLink.classList.remove('d-none');
        else if (userRole === 'user') userProfileLink.classList.remove('d-none');
    } else {
        authButtonContainer.innerHTML = `<button type="button" class="nav-link auth-link-button" data-bs-toggle="modal" data-bs-target="#loginModal">Logar</button>`;
    }
}

function handleLogout() {
    localStorage.removeItem('barber_token');
    localStorage.removeItem('barber_user_name');
    localStorage.removeItem('barber_role');
    window.location.href = 'index.html';
}

function highlightActiveLink() {
    const navLinks = document.querySelectorAll('.navbar-nav a.nav-link');
    const currentPage = window.location.pathname.split('/').pop();
    navLinks.forEach(link => {
        const linkHref = link.getAttribute('href');
        if (linkHref) {
            const linkPage = linkHref.split('/').pop();
            link.classList.remove('active-link');
            if (linkPage === currentPage) {
                link.classList.add('active-link');
            }
        }
    });
}