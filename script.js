// Configuração da API
const API_URL = 'https://erickmth.pythonanywhere.com/api';

// Armazena o token de autenticação
let authToken = sessionStorage.getItem('authToken') || null;

// Função para fazer login
async function login(event) {
    event.preventDefault();
    
    const turma = document.getElementById('turma').value;
    const edv = document.getElementById('edv').value;
    
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ turma, edv }),
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Salva o token no sessionStorage (vai sumir ao fechar o navegador)
            authToken = data.token;
            sessionStorage.setItem('authToken', authToken);
            
            // Redireciona para a página correta
            window.location.href = data.turma === 'Formare 2025' ? 'formare.html' : 'aprender.html';
        } else {
            alert('EDV ou turma incorretos!');
        }
    } catch (error) {
        alert('Erro ao conectar ao servidor. Tente novamente.');
        console.error(error);
    }
}

// Verifica se o token é válido
async function verifyToken() {
    if (!authToken) return false;
    
    try {
        const response = await fetch(`${API_URL}/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: authToken }),
        });
        
        const data = await response.json();
        return data.success ? data : false;
    } catch (error) {
        console.error("Erro ao verificar token:", error);
        return false;
    }
}

// Carrega os dados da escala
async function loadScheduleData(turma) {
    try {
        const response = await fetch(`${API_URL}/escala/${encodeURIComponent(turma)}?token=${authToken}`);
        const data = await response.json();
        
        if (data.error) throw new Error(data.error);
        
        // Atualiza a semana atual
        document.getElementById('currentWeek').textContent = data.semana_atual;
        
        // Preenche a tabela
        const tbody = document.querySelector('#scheduleTable tbody');
        tbody.innerHTML = '';
        
        data.duplas.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.semana}</td>
                <td>${item.dupla}</td>
            `;
            if (item.semana === data.semana_atual) {
                row.style.backgroundColor = '#e3f2fd';
                row.style.fontWeight = 'bold';
            }
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error("Erro ao carregar escala:", error);
        alert("Erro ao carregar a escala. Recarregue a página.");
    }
}

// Função de logout
function logout() {
    sessionStorage.removeItem('authToken');
    window.location.href = 'index.html';
}

// Inicialização da página
document.addEventListener('DOMContentLoaded', async function() {
    // Configura o botão de logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
    
    // Página de login
    if (window.location.pathname.includes('index.html')) {
        // Se já estiver logado, redireciona
        const userData = await verifyToken();
        if (userData) {
            window.location.href = userData.turma === 'Formare 2025' ? 'formare.html' : 'aprender.html';
        }
        // Configura o formulário de login
        document.getElementById('loginForm').addEventListener('submit', login);
        return;
    }
    
    // Páginas internas (Formare/Aprender)
    const userData = await verifyToken();
    if (!userData) {
        window.location.href = 'index.html';
        return;
    }
    
    // Mostra o nome do usuário
    document.getElementById('welcome').textContent = `Bem-vindo(a), ${userData.nome}`;
    
    // Carrega a escala
    if (window.location.pathname.includes('formare.html')) {
        loadScheduleData('Formare 2025');
    } else if (window.location.pathname.includes('aprender.html')) {
        loadScheduleData('Aprender A+ 2025');
    }
});
