// Configuração da API
const API_URL = 'https://erickmth.pythonanywhere.com/api';

// Variáveis para controle de tentativas
let loginAttempts = 0;
let blockedUntil = 0;
let nextBlockDuration = 1 * 60 * 1000; // 1 minuto inicialmente

// Função para verificar se o usuário está bloqueado
function isUserBlocked() {
    const now = Date.now();
    if (now < blockedUntil) {
        const remainingMinutes = Math.ceil((blockedUntil - now) / (60 * 1000));
        showMessage(`Você excedeu o número de tentativas. Tente novamente em ${remainingMinutes} minuto(s).`, 'error');
        return true;
    }
    return false;
}

// Função para bloquear o usuário
function blockUser() {
    const now = Date.now();
    blockedUntil = now + nextBlockDuration;
    
    // Aumenta o tempo de bloqueio progressivamente
    if (loginAttempts >= 15) {
        nextBlockDuration = 2 * 60 * 60 * 1000; // 2 horas
    } else if (loginAttempts >= 10) {
        nextBlockDuration = 30 * 60 * 1000; // 30 minutos
    } else if (loginAttempts >= 5) {
        nextBlockDuration = 1 * 60 * 1000; // 1 minuto
    }
    
    // Armazena no localStorage
    localStorage.setItem('blockedUntil', blockedUntil.toString());
    localStorage.setItem('loginAttempts', loginAttempts.toString());
    localStorage.setItem('nextBlockDuration', nextBlockDuration.toString());
}

// Função para carregar o estado do bloqueio
function loadBlockState() {
    const storedBlockedUntil = localStorage.getItem('blockedUntil');
    const storedAttempts = localStorage.getItem('loginAttempts');
    const storedDuration = localStorage.getItem('nextBlockDuration');
    
    if (storedBlockedUntil) blockedUntil = parseInt(storedBlockedUntil);
    if (storedAttempts) loginAttempts = parseInt(storedAttempts);
    if (storedDuration) nextBlockDuration = parseInt(storedDuration);
}

// Função para mostrar aviso de tentativas restantes
function showAttemptsWarning() {
    const remainingAttempts = 5 - loginAttempts;
    const warningEl = document.getElementById('attemptsWarning');
    
    if (loginAttempts >= 2 && loginAttempts < 5) {
        warningEl.textContent = `⚠️ Você teve ${loginAttempts} tentativas incorretas. Após ${remainingAttempts} tentativas erradas, seu acesso será bloqueado por 1 minuto.`;
        warningEl.style.display = 'block';
    } else {
        warningEl.style.display = 'none';
    }
}

// Função para fazer login
async function login(event) {
    event.preventDefault();
    
    // Verifica se o usuário está bloqueado
    if (isUserBlocked()) {
        return;
    }
    
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
            // Resetar contador de tentativas em caso de sucesso
            loginAttempts = 0;
            localStorage.removeItem('loginAttempts');
            localStorage.removeItem('blockedUntil');
            localStorage.removeItem('nextBlockDuration');
            
            // Redireciona imediatamente SEM salvar no storage
            if (data.turma === 'Formare 2025') {
                window.location.href = `formare.html?nome=${encodeURIComponent(data.nome)}`;
            } else if (data.turma === 'Aprender A+ 2025') {
                window.location.href = `aprender.html?nome=${encodeURIComponent(data.nome)}`;
            }
        } else {
            loginAttempts++;
            localStorage.setItem('loginAttempts', loginAttempts.toString());
            
            if (loginAttempts >= 5) {
                blockUser();
                showMessage('❌ Número máximo de tentativas excedido. Seu acesso foi bloqueado por 1 minuto.', 'error');
            } else {
                showMessage('EDV ou turma incorretos. Por favor, tente novamente.', 'error');
                showAttemptsWarning();
            }
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
    // Carrega o estado do bloqueio
    loadBlockState();
    
    // Página de login
    if (window.location.pathname.includes('index.html') || 
        window.location.pathname === '/' || 
        window.location.pathname === '/index') {
        
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', login);
            
            // Mostra aviso se já houver tentativas
            if (loginAttempts >= 2 && loginAttempts < 5) {
                showAttemptsWarning();
            } else if (isUserBlocked()) {
                const remainingMinutes = Math.ceil((blockedUntil - Date.now()) / (60 * 1000));
                showMessage(`⏳ Seu acesso está bloqueado. Tente novamente em ${remainingMinutes} minuto(s).`, 'error');
            }
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
            document.getElementById('welcome').textContent = `Bem-vindo(a), ${decodeURIComponent(nome)} 👋`;
            
            // Carrega a escala conforme a página
            if (window.location.pathname.includes('formare.html')) {
                loadScheduleData('Formare 2025');
            } else if (window.location.pathname.includes('aprender.html')) {
                loadScheduleData('Aprender A+ 2025');
            }
        }
    }
});