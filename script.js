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
        
        const data = await response.json();
        
        if (data.success) {
            // Redireciona imediatamente SEM salvar no storage
            if (data.turma === 'Formare 2025') {
                window.location.href = `formare.html?nome=${encodeURIComponent(data.nome)}`;
            } else if (data.turma === 'Aprender A+ 2025') {
                window.location.href = `aprender.html?nome=${encodeURIComponent(data.nome)}`;
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
    }
}

// Função para mostrar mensagens
function showMessage(text, type) {
    const messageEl = document.getElementById('message');
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
    messageEl.style.display = 'block';
    
    setTimeout(() => {
        messageEl.style.display = 'none';
    }, 5000);
}

// Verificação ao carregar a página
document.addEventListener('DOMContentLoaded', function() {
    // Página de login
    if (window.location.pathname.includes('index.html') || 
        window.location.pathname === '/' || 
        window.location.pathname === '/index') {
        
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', login);
        }
    }
    // Páginas internas (Formare/Aprender)
    else {
        // Pega o nome da URL
        const urlParams = new URLSearchParams(window.location.search);
        const nome = urlParams.get('nome');
        
        if (!nome) {
            // Se não tiver nome na URL, volta para login
            window.location.href = 'index.html';
        } else {
            // Mostra boas-vindas
            document.getElementById('welcome').textContent = `Bem-vindo(a), ${decodeURIComponent(nome)}`;
            
            // Carrega a escala conforme a página
            if (window.location.pathname.includes('formare.html')) {
                loadScheduleData('Formare 2025');
            } else if (window.location.pathname.includes('aprender.html')) {
                loadScheduleData('Aprender A+ 2025');
            }
        }
    }
});