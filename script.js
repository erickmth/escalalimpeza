// Configuração da API
const API_URL = 'https://erickmth.pythonanywhere.com/api';

// Variável para armazenar o token temporariamente
let authToken = sessionStorage.getItem('authToken') || null;

// Função para fazer login
async function login(event) {
    event.preventDefault();
    
    const turma = document.getElementById('turma').value;
    const edv = document.getElementById('edv').value;
    
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ turma, edv }),
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Armazena o token no sessionStorage
            authToken = data.token;
            sessionStorage.setItem('authToken', authToken);
            
            // Redireciona para a página correta
            window.location.href = data.turma === 'Formare 2025' 
                ? 'formare.html' 
                : 'aprender.html';
        } else {
            alert('EDV ou turma incorretos');
        }
    } catch (error) {
        alert('Erro ao conectar com o servidor');
        console.error(error);
    }
}

// Função para verificar autenticação
async function checkAuth() {
    if (!authToken) return false;
    
    try {
        const response = await fetch(`${API_URL}/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token: authToken }),
        });
        
        const data = await response.json();
        
        if (data.success) {
            return data; // Retorna os dados do usuário
        }
    } catch (error) {
        console.error('Erro ao verificar token:', error);
    }
    
    // Se falhar, limpa o token
    sessionStorage.removeItem('authToken');
    authToken = null;
    return false;
}

// Função para logout
function logout() {
    sessionStorage.removeItem('authToken');
    authToken = null;
    window.location.href = 'index.html';
}

// Inicialização da página
document.addEventListener('DOMContentLoaded', async function() {
    // Configura botão de logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
    
    // Página de login
    if (window.location.pathname.includes('index.html')) {
        // Se já estiver logado, redireciona
        if (await checkAuth()) {
            const userData = await checkAuth();
            window.location.href = userData.turma === 'Formare 2025' 
                ? 'formare.html' 
                : 'aprender.html';
        }
        return;
    }
    
    // Páginas internas
    const userData = await checkAuth();
    if (!userData) {
        window.location.href = 'index.html';
        return;
    }
    
    // Mostra os dados do usuário
    document.getElementById('welcome').textContent = `Bem-vindo(a), ${userData.nome}`;
    
    // Carrega a escala
    if (window.location.pathname.includes('formare.html')) {
        loadScheduleData('Formare 2025');
    } else if (window.location.pathname.includes('aprender.html')) {
        loadScheduleData('Aprender A+ 2025');
    }
});

// Função para carregar a escala (atualizada para enviar o token)
async function loadScheduleData(turma) {
    try {
        const response = await fetch(`${API_URL}/escala/${encodeURIComponent(turma)}?token=${authToken}`);
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        // ... (restante do código da função)
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao carregar dados. Tente novamente.');
    }
}
