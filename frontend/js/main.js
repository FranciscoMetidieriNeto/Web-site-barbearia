/**
 * Função principal que inicializa a aplicação.
 * Carrega a navbar e inicializa os scripts globais.
 */
async function initializeApp() {
    // Passo 1: Carrega a navbar a partir do arquivo externo
    try {
        const response = await fetch('navbar.html');
        if (!response.ok) throw new Error('Navbar não encontrada.');
        const navbarHtml = await response.text();
        document.getElementById('navbar-placeholder').innerHTML = navbarHtml;
    } catch (error) {
        console.error('Falha ao carregar a navbar:', error);
        document.getElementById('navbar-placeholder').innerHTML = 
            '<p class="text-center bg-danger text-white p-2">Erro ao carregar o menu de navegação.</p>';
        return; 
    }
    
    // --- LÓGICA DE TEMA CLARO/ESCURO REMOVIDA ---

    // --- LÓGICA DE AUTENTICAÇÃO SIMPLIFICADA ---
    // Apenas exibe um botão de login fixo, já que não há backend.
    const authContainer = document.getElementById('auth-container');
    if (authContainer) {
        authContainer.innerHTML = `
            <button class="btn btn-primary btn-sm" disabled title="Login indisponível na demonstração">
                Login / Registrar
            </button>
        `;
    }
}

// Inicia a aplicação quando o conteúdo da página estiver totalmente carregado.
document.addEventListener('DOMContentLoaded', initializeApp);