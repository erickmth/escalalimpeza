// Configuração da API
const API_URL = 'https://erickmth.pythonanywhere.com/api';

// Variáveis para controle de tentativas
let loginAttempts = 0;
let blockedUntil = 0;
let nextBlockDuration = 1 * 60 * 1000; // 1 minuto inicialmente

// =============================================
// FUNÇÕES DE CONTROLE DE ACESSO
// =============================================

function checkBlockExpiration() {
    const now = Date.now();
    
    if (blockedUntil > 0 && now >= blockedUntil) {
        loginAttempts = 0;
        blockedUntil = 0;
        nextBlockDuration = 1 * 60 * 1000;
        localStorage.removeItem('loginAttempts');
        localStorage.removeItem('blockedUntil');
        localStorage.removeItem('nextBlockDuration');
        return false;
    }
    
    return blockedUntil > 0;
}

function blockUser() {
    const now = Date.now();
    blockedUntil = now + nextBlockDuration;
    
    if (loginAttempts >= 15) nextBlockDuration = 2 * 60 * 60 * 1000; // 2 horas
    else if (loginAttempts >= 10) nextBlockDuration = 30 * 60 * 1000; // 30 minutos
    else if (loginAttempts >= 5) nextBlockDuration = 1 * 60 * 1000; // 1 minuto
    
    localStorage.setItem('blockedUntil', blockedUntil.toString());
    localStorage.setItem('loginAttempts', loginAttempts.toString());
    localStorage.setItem('nextBlockDuration', nextBlockDuration.toString());
}

function loadBlockState() {
    const storedBlockedUntil = localStorage.getItem('blockedUntil');
    const storedAttempts = localStorage.getItem('loginAttempts');
    const storedDuration = localStorage.getItem('nextBlockDuration');
    
    if (storedBlockedUntil) blockedUntil = parseInt(storedBlockedUntil);
    if (storedAttempts) loginAttempts = parseInt(storedAttempts);
    if (storedDuration) nextBlockDuration = parseInt(storedDuration);
    
    checkBlockExpiration();
}

// =============================================
// FUNÇÕES DE INTERFACE
// =============================================

function showAttemptsWarning() {
    const warningEl = document.getElementById('attemptsWarning');
    
    if (loginAttempts >= 2 && loginAttempts < 5) {
        warningEl.textContent = `⚠️ Você teve ${loginAttempts} tentativas incorretas. Após ${5 - loginAttempts} tentativas, será bloqueado por 1 minuto.`;
        warningEl.style.display = 'block';
        
        setTimeout(() => {
            warningEl.style.display = 'none';
        }, 5000);
    } else {
        warningEl.style.display = 'none';
    }
}

function showMessage(text, type) {
    const messageEl = document.getElementById('message');
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
    messageEl.style.display = 'block';
    
    setTimeout(() => {
        messageEl.style.display = 'none';
    }, 5000);
}

// =============================================
// FUNÇÃO DE LOGIN
// =============================================

async function login(event) {
    event.preventDefault();
    
    if (checkBlockExpiration()) {
        const remaining = Math.ceil((blockedUntil - Date.now()) / (60 * 1000));
        showMessage(`⏳ Acesso bloqueado. Tente novamente em ${remaining} minuto(s).`, 'error');
        return;
    }
    
    const turma = document.getElementById('turma').value;
    const edv = document.getElementById('edv').value;
    
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ turma, edv })
        });
        
        const data = await response.json();
        
        if (data.success) {
            loginAttempts = 0;
            localStorage.removeItem('loginAttempts');
            localStorage.removeItem('blockedUntil');
            localStorage.removeItem('nextBlockDuration');

            // Guarda nome, admin e turma em sessionStorage
            sessionStorage.setItem('nome', data.nome);
            sessionStorage.setItem('admin', data.is_admin);
            sessionStorage.setItem('turma', turma);

            // Redirecionamento baseado na turma
            let page = 'escala';
            if (turma.includes('Formare')) page = 'formare';
            else if (turma.includes('Terça')) page = 'aprender_terca';
            else if (turma.includes('Quarta')) page = 'aprender_quarta';
            else if (turma.includes('Quinta')) page = 'aprender_quinta';
            else if (turma.includes('Informática')) page = 'informatica';
            else if (turma.includes('Inglês')) page = 'ingles';
            
            window.location.href = `${page}.html`;
        } else {
            loginAttempts++;
            localStorage.setItem('loginAttempts', loginAttempts.toString());
            
            if (loginAttempts >= 5) {
                blockUser();
                showMessage('🔒 Acesso bloqueado por 1 minuto', 'error');
            } else {
                showMessage('❌ EDV ou turma incorretos', 'error');
                showAttemptsWarning();
            }
        }
    } catch (error) {
        showMessage('Erro de conexão com o servidor', 'error');
        console.error('Erro:', error);
    }
}

// =============================================
// FUNÇÃO DE CARREGAR ESCALA
// =============================================

async function loadScheduleData(turma) {
    try {
        const response = await fetch(`${API_URL}/escala/${encodeURIComponent(turma)}`);
        const data = await response.json();
        
        if (data.error) {
            console.error(data.error);
            return;
        }
        
        if (document.getElementById('currentWeek')) {
            document.getElementById('currentWeek').textContent = data.semana_atual;
        }
        
        const tbody = document.querySelector('#scheduleTable tbody');
        if (tbody) {
            tbody.innerHTML = '';
            
            data.duplas.forEach(item => {
                const row = document.createElement('tr');
                const semanaCell = document.createElement('td');
                semanaCell.textContent = item.semana;
                
                const duplaCell = document.createElement('td');
                duplaCell.textContent = item.dupla;
                
                row.append(semanaCell, duplaCell);
                if (item.semana === data.semana_atual) {
                    row.style.cssText = 'background-color: #e3f2fd; font-weight: bold;';
                }
                tbody.appendChild(row);
            });
        }
    } catch (error) {
        console.error('Erro ao carregar escala:', error);
        showMessage('Erro ao carregar dados da escala', 'error');
    }
}

// =============================================
// VERIFICAR ACESSO NA PÁGINA
// =============================================

function checkAccess() {
    const nome = sessionStorage.getItem('nome');
    const turma = sessionStorage.getItem('turma');
    const admin = sessionStorage.getItem('admin') === 'true';
    const path = window.location.pathname;

    if (!nome || !turma) {
        window.location.href = 'index.html';
        return;
    }

    if (path.includes('formare.html') && !turma.includes('Formare')) window.location.href = 'index.html';
    else if (path.includes('aprender_terca.html') && !turma.includes('Terça')) window.location.href = 'index.html';
    else if (path.includes('aprender_quarta.html') && !turma.includes('Quarta')) window.location.href = 'index.html';
    else if (path.includes('aprender_quinta.html') && !turma.includes('Quinta')) window.location.href = 'index.html';
    else if (path.includes('informatica.html') && !turma.includes('Informática')) window.location.href = 'index.html';
    else if (path.includes('ingles.html') && !turma.includes('Inglês')) window.location.href = 'index.html';
    else if (path.includes('escala.html') && !admin) window.location.href = 'index.html';
}

// =============================================
// CARREGAMENTO INICIAL
// =============================================

document.addEventListener('DOMContentLoaded', function() {
    loadBlockState();
    
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', login);
        
        if (loginAttempts >= 2) showAttemptsWarning();
        if (blockedUntil > 0) {
            const remaining = Math.ceil((blockedUntil - Date.now()) / (60 * 1000));
            showMessage(`⏳ Acesso bloqueado. Tente novamente em ${remaining} minuto(s).`, 'error');
        }
    } else {
        checkAccess(); // Verifica se pode acessar esta página
        
        const nome = sessionStorage.getItem('nome');
        if (document.getElementById('welcome')) {
            document.getElementById('welcome').textContent = `Bem-vindo(a), ${decodeURIComponent(nome)} 👋`;
        }
        
        let turma = sessionStorage.getItem('turma') || '';

        if (turma) loadScheduleData(turma);
    }
});
