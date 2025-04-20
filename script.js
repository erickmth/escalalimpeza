// Configuração da API (substitua com sua URL do PythonAnywhere)
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
        
        // Verifica se a resposta é OK (status 200-299)
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            // Salva os dados do usuário no localStorage
            localStorage.setItem('userData', JSON.stringify({
                nome: data.nome,
                turma: data.turma
            }));
            
            // Redireciona para a página correta
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

// Função para carregar os dados da escala
async function loadScheduleData(turma) {
    try {
        const response = await fetch(`${API_URL}/escala/${encodeURIComponent(turma)}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
            console.error(data.error);
            return;
        }
        
        // Atualiza a semana atual
        document.getElementById('currentWeek').textContent = data.semana_atual;
        
        // Preenche a tabela
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
            
            // Destaca a semana atual
            if (item.semana === data.semana_atual) {
                row.style.backgroundColor = '#e3f2fd';
                row.style.fontWeight = 'bold';
            }
            
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Erro ao carregar escala:', error);
        showMessage('Erro ao carregar a escala. Tente recarregar a página.', 'error');
    }
}

// Função para mostrar mensagens
function showMessage(text, type) {
    const messageEl = document.getElementById('message');
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
    messageEl.style.display = 'block';
    
    // Esconde a mensagem após 5 segundos
    setTimeout(() => {
        messageEl.style.display = 'none';
    }, 5000);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Verifica se já está logado ao carregar a página de login
    if (window.location.pathname.includes('index.html') || 
        window.location.pathname === '/' || 
        window.location.pathname === '/index') {
        
        const userData = localStorage.getItem('userData');
        if (userData) {
            const { turma } = JSON.parse(userData);
            if (turma === 'Formare 2025') {
                window.location.href = 'formare.html';
            } else if (turma === 'Aprender A+ 2025') {
                window.location.href = 'aprender.html';
            }
        }
        
        // Configura o formulário de login
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', login);
        }
    }
});