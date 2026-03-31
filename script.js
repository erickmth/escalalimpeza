const API_URL = 'https://erickmth.pythonanywhere.com/api';

let loginAttempts = 0;
let blockedUntil = 0;
let nextBlockDuration = 1 * 60 * 1000;

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
    if (!messageEl) return;
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
    messageEl.style.display = 'block';
    
    setTimeout(() => {
        messageEl.style.display = 'none';
    }, 5000);
}

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
            
            // Limpar campo EDV
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

async function loadScheduleData(turma) {
    try {
        // ✅ USANDO O ENDPOINT PÚBLICO (NÃO REQUER TOKEN)
        const response = await fetch(`${API_URL}/escala/${encodeURIComponent(turma)}`);
        
        if (!response.ok) {
            if (response.status === 403 || response.status === 401) {
                // Sessão expirada ou acesso negado
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
        
        // Atualizar semana atual
        const currentWeekEl = document.getElementById('currentWeek');
        if (currentWeekEl) {
            currentWeekEl.textContent = data.semana_atual || 'Carregando...';
        }
        
        // Atualizar tabela
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
                    
                    // Destacar semana atual
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
        
        // Mostrar mensagem amigável na tabela
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

function checkAccess() {
    const nome = sessionStorage.getItem('nome');
    const turma = sessionStorage.getItem('turma');
    const loginTime = sessionStorage.getItem('loginTime');
    const path = window.location.pathname;

    // Permite acesso à pratica.html sem login
    if (path.includes('pratica.html')) {
        return;
    }

    // Verificar se a sessão expirou (12 horas)
    if (loginTime) {
        const elapsed = Date.now() - parseInt(loginTime);
        if (elapsed > 12 * 60 * 60 * 1000) {
            sessionStorage.clear();
            window.location.href = 'index.html';
            return;
        }
    }

    // Para todas as outras páginas, verifica o login
    if (!nome || !turma) {
        window.location.href = 'index.html';
        return;
    }

    // Verificar permissão para a página específica
    if (path.includes('formare.html') && !turma.includes('Formare')) window.location.href = 'index.html';
    else if (path.includes('aprender_terca.html') && !turma.includes('Terça')) window.location.href = 'index.html';
    else if (path.includes('aprender_quarta.html') && !turma.includes('Quarta')) window.location.href = 'index.html';
    else if (path.includes('aprender_quinta.html') && !turma.includes('Quinta')) window.location.href = 'index.html';
    else if (path.includes('informatica.html') && !turma.includes('Informática')) window.location.href = 'index.html';
    else if (path.includes('ingles.html') && !turma.includes('Inglês')) window.location.href = 'index.html';
    else if (path.includes('escala.html') && sessionStorage.getItem('admin') !== 'true') window.location.href = 'index.html';
}

function checkAndLoadSchedule() {
    const turma = sessionStorage.getItem('turma');
    if (turma) {
        loadScheduleData(turma);
    } else {
        // Se não tem turma na sessão, redirecionar para login
        window.location.href = 'index.html';
    }
}

// Função para logout
function logout() {
    sessionStorage.clear();
    window.location.href = 'index.html';
}

// Verificar se é página de admin e adicionar funcionalidades extras
function initAdminFeatures() {
    const isAdmin = sessionStorage.getItem('admin') === 'true';
    const isAdminPage = window.location.pathname.includes('escala.html');
    
    if (isAdminPage && !isAdmin) {
        window.location.href = 'index.html';
        return;
    }
    
    if (isAdminPage && isAdmin) {
        // Adicionar botões de admin se necessário
        const contentDiv = document.querySelector('.content');
        if (contentDiv && !document.getElementById('adminPanel')) {
            // Opcional: adicionar painel admin
        }
    }
}

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
        
        // Validação em tempo real do EDV
        const edvInput = document.getElementById('edv');
        if (edvInput) {
            edvInput.addEventListener('input', function(e) {
                this.value = this.value.replace(/[^\d]/g, '');
            });
        }
    } else {
        // Páginas de escala/aluno
        checkAccess();
        initAdminFeatures();
        
        const nome = sessionStorage.getItem('nome');
        if (document.getElementById('welcome') && nome) {
            document.getElementById('welcome').innerHTML = `<h2>Bem-vindo(a), ${decodeURIComponent(nome)} 👋</h2>`;
        }
        
        checkAndLoadSchedule();
    }
});

// Exportar funções globais se necessário
window.logout = logout;
window.showMessage = showMessage;
