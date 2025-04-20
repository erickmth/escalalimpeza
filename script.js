// Configuração da API
const API_URL = 'https://erickmth.pythonanywhere.com/api';

// Função para fazer login
async function login(event) {
    event.preventDefault();
    
    const turma = document.getElementById('turma').value;
    const edv = document.getElementById('edv').value;
    const messageEl = document.getElementById('message');
    
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ turma, edv }),
        });
        
        if (!response.ok) throw new Error('Erro na requisição');
        
        const data = await response.json();
        
        if (data.success) {
            // Usando sessionStorage que limpa ao fechar o navegador
            sessionStorage.setItem('userData', JSON.stringify({
                nome: data.nome,
                turma: data.turma,
                ultimoAcesso: new Date().getTime() // Adiciona timestamp
            }));
            
            if (data.turma === 'Formare 2025') {
                window.location.href = 'formare.html';
            } else if (data.turma === 'Aprender A+ 2025') {
                window.location.href = 'aprender.html';
            }
        } else {
            showMessage('EDV ou turma incorretos. Por favor, tente novamente.', 'error');
        }
    } catch (error) {
        showMessage('Erro ao conectar com o servidor. Tente novamente mais tarde.', 'error');
        console.error('Erro:', error);
    }
}

// Função para carregar a escala
async function loadScheduleData(turma) {
    try {
        const response = await fetch(`${API_URL}/escala/${encodeURIComponent(turma)}`);
        if (!response.ok) throw new Error('Erro ao carregar escala');
        
        const data = await response.json();
        
        if (data.error) {
            console.error(data.error);
            return;
        }
        
        document.getElementById('currentWeek').textContent = data.semana_atual;
        const tbody = document.querySelector('#scheduleTable tbody');
        tbody.innerHTML = '';
        
        data.duplas.forEach(item => {
            const row = document.createElement('tr');
            
            const semanaCell = document.createElement('td');
            semanaCell.textContent = item.semana;
            
            const duplaCell = document.createElement('td');
            duplaCell.textContent = item.dupla;
            
            row.appendChild(semanaCell);
            row.appendChild(duplaCell);
            
            if (item.semana === data.semana_atual) {
                row.style.backgroundColor = '#e3f2fd';
                row.style.fontWeight = 'bold';
            }
            
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Erro ao carregar escala:', error);
        showMessage('Erro ao carregar a escala. Recarregue a página.', 'error');
    }
}

// Função para logout
function logout() {
    sessionStorage.removeItem('userData');
    localStorage.removeItem('userData'); // Limpa para garantir
    window.location.href = 'index.html';
}

// Função para mostrar mensagens
function showMessage(text, type) {
    const messageEl = document.getElementById('message');
    if (!messageEl) return;
    
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
    messageEl.style.display = 'block';
    
    setTimeout(() => {
        messageEl.style.display = 'none';
    }, 5000);
}

// Verificação de sessão e timeout (30 minutos)
function checkSession() {
    const userData = sessionStorage.getItem('userData');
    if (!userData) return false;
    
    const { ultimoAcesso } = JSON.parse(userData);
    const tempoAtual = new Date().getTime();
    const tempoDecorrido = (tempoAtual - ultimoAcesso) / (1000 * 60); // Em minutos
    
    if (tempoDecorrido > 30) { // 30 minutos de inatividade
        logout();
        return false;
    }
    
    return true;
}

// Configuração inicial
document.addEventListener('DOMContentLoaded', function() {
    // Configura botão de logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Página de login
    if (window.location.pathname.includes('index.html') || 
        window.location.pathname === '/' || 
        window.location.pathname === '/index') {
        
        if (checkSession()) {
            const { turma } = JSON.parse(sessionStorage.getItem('userData'));
            window.location.href = turma === 'Formare 2025' ? 'formare.html' : 'aprender.html';
        }
        
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', login);
        }
    }
    // Páginas internas
    else {
        if (!checkSession()) {
            window.location.href = 'index.html';
        } else {
            const userData = JSON.parse(sessionStorage.getItem('userData'));
            document.getElementById('welcome').textContent = `Bem-vindo(a), ${userData.nome}`;
            
            if (window.location.pathname.includes('formare.html')) {
                loadScheduleData('Formare 2025');
            } else if (window.location.pathname.includes('aprender.html')) {
                loadScheduleData('Aprender A+ 2025');
            }
        }
    }
});
