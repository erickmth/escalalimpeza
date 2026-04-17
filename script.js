const API_URL = 'https://erickmth.pythonanywhere.com/api';

let loginAttempts = 0;
let blockedUntil = 0;
let nextBlockDuration = 1 * 60 * 1000;

// ==================== FUNÇÕES DE BLOQUEIO ====================
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
    
    if (loginAttempts >= 15) nextBlockDuration = 2 * 60 * 60 * 1000;
    else if (loginAttempts >= 10) nextBlockDuration = 30 * 60 * 1000;
    else if (loginAttempts >= 5) nextBlockDuration = 1 * 60 * 1000;
    
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

// ==================== FUNÇÕES DE UI ====================
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

// ==================== LOGIN ====================
async function login(event) {
    event.preventDefault();
    
    const loginButton = document.getElementById('loginButton');
    loginButton.classList.add('loading');
    loginButton.disabled = true;
    
    if (checkBlockExpiration()) {
        const remaining = Math.ceil((blockedUntil - Date.now()) / (60 * 1000));
        showMessage(`⏳ Acesso bloqueado. Tente novamente em ${remaining} minuto(s).`, 'error');
        loginButton.classList.remove('loading');
        loginButton.disabled = false;
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

            sessionStorage.setItem('nome', data.nome);
            sessionStorage.setItem('admin', data.is_admin);
            sessionStorage.setItem('turma', turma);
            sessionStorage.setItem('loginTime', Date.now().toString());

            // Redirecionar para a página correta (ATUALIZADO)
            let page = '';
            if (turma.includes('Formare 2026')) page = 'formare.html';
            else if (turma.includes('Terça-Feira')) page = 'aprender_terca.html';
            else if (turma.includes('Quarta-Feira')) page = 'aprender_quarta.html';
            else if (turma.includes('Quinta-Feira')) page = 'aprender_quinta.html';
            else if (turma === 'Informática Básica (Curitiba)') page = 'informatica.html';
            else if (turma === 'Inglês Básico (Curitiba)') page = 'ingles.html';
            else if (turma === 'Informática II - Robótica (Curitiba)') page = 'robotica.html';
            else if (turma === 'Inglês Básico (Joinville)') page = 'ingles_joinville.html';
            else if (turma === 'Inglês Básico (Pomerode)') page = 'ingles_pomerode.html';
            else if (turma === 'Informática Básica (Joinville)') page = 'informatica_joinville.html';
            else page = 'escala.html';
            
            window.location.href = page;
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
            
            document.getElementById('edv').value = '';
            document.getElementById('edv').focus();
        }
    } catch (error) {
        showMessage('Erro de conexão com o servidor', 'error');
        console.error('Erro:', error);
    } finally {
        loginButton.classList.remove('loading');
        loginButton.disabled = false;
    }
}

// ==================== CARREGAR ESCALA ====================
async function loadScheduleData(turma) {
    // Turmas que NÃO têm escala (Robótica)
    const turmasSemEscala = [
        'Informática II - Robótica (Curitiba)',
        'Informática Básica (Joinville)',
        'Inglês Básico (Joinville)',
        'Inglês Básico (Pomerode)'
    ];
    
    if (turmasSemEscala.includes(turma)) {
        const tbody = document.querySelector('#scheduleTable tbody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="2" style="text-align: center; color: #e74c3c;">
                        🤖 Esta turma não possui escala de limpeza.
                    </td>
                </tr>
            `;
        }
        const currentWeekEl = document.getElementById('currentWeek');
        if (currentWeekEl) {
            currentWeekEl.textContent = 'Não se aplica';
        }
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/escala/${encodeURIComponent(turma)}`);
        
        if (!response.ok) {
            if (response.status === 403 || response.status === 401) {
                sessionStorage.clear();
                window.location.href = 'index.html';
                return;
            }
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
            console.error(data.error);
            showMessage(data.error, 'error');
            return;
        }
        
        const currentWeekEl = document.getElementById('currentWeek');
        if (currentWeekEl) {
            currentWeekEl.textContent = data.semana_atual || 'Carregando...';
        }
        
        const tbody = document.querySelector('#scheduleTable tbody');
        if (tbody) {
            if (data.duplas && data.duplas.length > 0) {
                tbody.innerHTML = '';
                
                data.duplas.forEach(item => {
                    const row = document.createElement('tr');
                    const semanaCell = document.createElement('td');
                    semanaCell.textContent = item.semana;
                    
                    const duplaCell = document.createElement('td');
                    duplaCell.textContent = item.dupla;
                    
                    row.append(semanaCell, duplaCell);
                    
                    if (item.semana === data.semana_atual || 
                        (data.semana_atual && item.semana.startsWith(data.semana_atual.split(':')[0]))) {
                        row.style.cssText = 'background-color: #e3f2fd; font-weight: bold;';
                    }
                    
                    tbody.appendChild(row);
                });
            } else {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="2" style="text-align: center; color: #e74c3c;">
                            Nenhuma escala disponível para esta turma
                        </td>
                    </tr>
                `;
            }
        }
        
    } catch (error) {
        console.error('Erro ao carregar escala:', error);
        showMessage('Erro ao carregar dados da escala', 'error');
        
        const tbody = document.querySelector('#scheduleTable tbody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="2" style="text-align: center; color: #e74c3c;">
                        ⚠️ Erro ao carregar escala. Verifique sua conexão.
                    </td>
                </tr>
            `;
        }
    }
}

// ==================== VERIFICAÇÃO DE ACESSO ====================
function checkAccess() {
    const nome = sessionStorage.getItem('nome');
    const turma = sessionStorage.getItem('turma');
    const loginTime = sessionStorage.getItem('loginTime');
    const currentPath = window.location.pathname;
    
    // Páginas que NÃO exigem login
    const publicPages = ['index.html', 'pratica.html', 'style.css', 'script.js'];
    const currentFile = currentPath.split('/').pop();
    
    if (publicPages.includes(currentFile)) {
        return true;
    }
    
    // Verificar se a sessão expirou (12 horas)
    if (loginTime) {
        const elapsed = Date.now() - parseInt(loginTime);
        if (elapsed > 12 * 60 * 60 * 1000) {
            sessionStorage.clear();
            window.location.href = 'index.html';
            return false;
        }
    }
    
    // Verificar se está logado
    if (!nome || !turma) {
        window.location.href = 'index.html';
        return false;
    }
    
    // Verificar se o usuário tem permissão para a página atual (ATUALIZADO)
    if (currentFile === 'formare.html' && !turma.includes('Formare 2026')) {
        window.location.href = 'index.html';
        return false;
    }
    if (currentFile === 'aprender_terca.html' && !turma.includes('Terça-Feira')) {
        window.location.href = 'index.html';
        return false;
    }
    if (currentFile === 'aprender_quarta.html' && !turma.includes('Quarta-Feira')) {
        window.location.href = 'index.html';
        return false;
    }
    if (currentFile === 'aprender_quinta.html' && !turma.includes('Quinta-Feira')) {
        window.location.href = 'index.html';
        return false;
    }
    if (currentFile === 'informatica.html' && turma !== 'Informática Básica (Curitiba)') {
        window.location.href = 'index.html';
        return false;
    }
    if (currentFile === 'ingles.html' && turma !== 'Inglês Básico (Curitiba)') {
        window.location.href = 'index.html';
        return false;
    }
    if (currentFile === 'robotica.html' && turma !== 'Informática II - Robótica (Curitiba)') {
        window.location.href = 'index.html';
        return false;
    }
    if (currentFile === 'ingles_joinville.html' && turma !== 'Inglês Básico (Joinville)') {
        window.location.href = 'index.html';
        return false;
    }
    if (currentFile === 'ingles_pomerode.html' && turma !== 'Inglês Básico (Pomerode)') {
        window.location.href = 'index.html';
        return false;
    }
    if (currentFile === 'informatica_joinville.html' && turma !== 'Informática Básica (Joinville)') {
        window.location.href = 'index.html';
        return false;
    }
    
    return true;
}

// ==================== INICIALIZAÇÃO ====================
function init() {
    const currentPath = window.location.pathname;
    const isLoginPage = currentPath.includes('index.html') || currentPath === '/' || currentPath.endsWith('/');
    
    if (isLoginPage) {
        // Página de login
        loadBlockState();
        
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', login);
            
            if (loginAttempts >= 2) showAttemptsWarning();
            if (blockedUntil > 0) {
                const remaining = Math.ceil((blockedUntil - Date.now()) / (60 * 1000));
                showMessage(`⏳ Acesso bloqueado. Tente novamente em ${remaining} minuto(s).`, 'error');
            }
            
            const edvInput = document.getElementById('edv');
            if (edvInput) {
                edvInput.addEventListener('input', function(e) {
                    this.value = this.value.replace(/[^\d]/g, '');
                });
            }
        }
    } else {
        // Páginas protegidas (escala, formare, etc.)
        if (checkAccess()) {
            const nome = sessionStorage.getItem('nome');
            const welcomeEl = document.getElementById('welcome');
            if (welcomeEl && nome) {
                welcomeEl.innerHTML = `<h2>Bem-vindo(a), ${decodeURIComponent(nome)} 👋</h2>`;
            }
            
            const turma = sessionStorage.getItem('turma');
            if (turma) {
                loadScheduleData(turma);
            }
        }
    }
}

// ==================== LOGOUT ====================
function logout() {
    sessionStorage.clear();
    window.location.href = 'index.html';
}

// ==================== EXECUTAR ====================
document.addEventListener('DOMContentLoaded', init);
window.logout = logout;
window.showMessage = showMessage;
