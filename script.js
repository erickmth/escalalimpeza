// Configuração da API
const API_URL = 'https://erickmth.pythonanywhere.com/api';

// Variável global para armazenar os dados temporariamente
let currentUser = null;

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
            // Armazena em memória (não na URL)
            currentUser = {
                nome: data.nome,
                turma: data.turma
            };
            
            // Redireciona SEM parâmetros na URL
            if (data.turma === 'Formare 2025') {
                window.location.href = 'formare.html';
            } else {
                window.location.href = 'aprender.html';
            }
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
    // Se não tem usuário na memória, volta para login
    if (!currentUser) {
        window.location.href = 'index.html';
        return false;
    }
    
    // Verifica no servidor se a sessão ainda é válida
    try {
        const response = await fetch(`${API_URL}/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                turma: currentUser.turma,
                nome: currentUser.nome 
            }),
        });
        
        return response.ok;
    } catch (error) {
        return false;
    }
}

// Modifique o event listener
document.addEventListener('DOMContentLoaded', async function() {
    // Página de login
    if (window.location.pathname.endsWith('index.html')) {
        document.getElementById('loginForm').addEventListener('submit', login);
        return;
    }
    
    // Páginas internas
    if (!await checkAuth()) {
        window.location.href = 'index.html';
        return;
    }
    
    // Mostra os dados do usuário
    document.getElementById('welcome').textContent = `Bem-vindo(a), ${currentUser.nome}`;
    
    // Carrega a escala
    loadScheduleData(currentUser.turma);
});
