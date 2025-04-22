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
            
            // Redirecionamento baseado na turma
            let page = 'escala';
            if (turma.includes('Formare')) page = 'formare';
            else if (turma.includes('Terça')) page = 'aprender_terca';
            else if (turma.includes('Quarta')) page = 'aprender_quarta';
            else if (turma.includes('Quinta')) page = 'aprender_quinta';
            else if (turma.includes('Informática')) page = 'informatica_ets';
            
            window.location.href = `${page}.html?nome=${encodeURIComponent(data.nome)}&admin=${data.is_admin}`;
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
        
        // Atualiza a semana atual
        if (document.getElementById('currentWeek')) {
            document.getElementById('currentWeek').textContent = data.semana_atual;
        }
        
        // Preenche a tabela de escalas
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
        
        // Verifica se é admin para mostrar controles adicionais
        const urlParams = new URLSearchParams(window.location.search);
        const isAdmin = urlParams.get('admin') === 'true';
        
        if (isAdmin && document.querySelector('.admin-controls')) {
            document.querySelector('.admin-controls').style.display = 'block';
        }
    } catch (error) {
        console.error('Erro ao carregar escala:', error);
        showMessage('Erro ao carregar dados da escala', 'error');
    }
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
        const nome = new URLSearchParams(window.location.search).get('nome');
        if (!nome) {
            window.location.href = 'index.html';
        } else {
            // Atualiza a mensagem de boas-vindas
            if (document.getElementById('welcome')) {
                document.getElementById('welcome').textContent = `Bem-vindo(a), ${decodeURIComponent(nome)} 👋`;
            }
            
            // Identifica a turma atual baseada na página
            let turma = '';
            const path = window.location.pathname;
            
            if (path.includes('formare.html')) turma = 'Formare 2025';
            else if (path.includes('aprender_terca.html')) turma = 'Aprender A+ (Terça-Feira)';
            else if (path.includes('aprender_quarta.html')) turma = 'Aprender A+ (Quarta-Feira)';
            else if (path.includes('aprender_quinta.html')) turma = 'Aprender A+ (Quinta-Feira)';
            else if (path.includes('informatica_ets.html')) turma = 'Informática ETS';
            
            if (turma) loadScheduleData(turma);
        }
    }
});