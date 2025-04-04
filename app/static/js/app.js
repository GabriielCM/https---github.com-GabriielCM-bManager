/**
 * B-Manager - Sistema de Gerenciamento para Barbearias
 * Arquivo JS principal
 */

// Objeto global para gerenciar o estado da aplicação
const AppState = {
    token: localStorage.getItem('token') || null,
    usuario: JSON.parse(localStorage.getItem('usuario') || 'null'),
    isAuthenticated: function() {
        return !!this.token;
    }
};

// Funções para API
const API = {
    // URL base da API
    baseUrl: '/api',
    
    // Cabeçalhos padrão
    getHeaders: function(includeAuth = true) {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (includeAuth && AppState.token) {
            headers['Authorization'] = `Bearer ${AppState.token}`;
        }
        
        return headers;
    },
    
    // Utilitário para fazer chamadas à API
    call: async function(endpoint, method = 'GET', data = null, includeAuth = true) {
        const url = `${this.baseUrl}${endpoint}`;
        
        const options = {
            method: method,
            headers: this.getHeaders(includeAuth)
        };
        
        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            options.body = JSON.stringify(data);
        }
        
        try {
            const response = await fetch(url, options);
            
            // Verificar se a resposta é 401 (não autorizado)
            if (response.status === 401) {
                // Limpar token e dados de usuário
                Auth.logout();
                // Redirecionar para a página de login
                window.location.href = '/';
                throw new Error('Sessão expirada. Por favor, faça login novamente.');
            }
            
            // Parsear resposta como JSON
            const responseData = await response.json();
            
            // Se a resposta não for bem sucedida, lançar erro
            if (!response.ok) {
                throw new Error(responseData.erro || 'Erro na requisição');
            }
            
            return responseData;
        } catch (error) {
            console.error(`Erro na chamada à API (${endpoint}):`, error);
            throw error;
        }
    },
    
    // Autenticação
    auth: {
        login: async function(email, senha) {
            return API.call('/auth/login', 'POST', { email, senha }, false);
        },
        
        register: async function(userData) {
            return API.call('/auth/register', 'POST', userData, false);
        },
        
        me: async function() {
            return API.call('/auth/me', 'GET');
        },
        
        resetPassword: async function(email) {
            return API.call('/auth/solicitar-reset-senha', 'POST', { email }, false);
        }
    },
    
    // Barbeiros
    barbeiros: {
        listar: async function() {
            return API.call('/barbeiros', 'GET');
        },
        
        obter: async function(id) {
            return API.call(`/barbeiros/${id}`, 'GET');
        },
        
        criar: async function(barbeiro) {
            return API.call('/barbeiros', 'POST', barbeiro);
        },
        
        criarCompleto: async function(barbeiro) {
            return API.call('/barbeiros/completo', 'POST', barbeiro);
        },
        
        atualizar: async function(id, barbeiro) {
            return API.call(`/barbeiros/${id}`, 'PUT', barbeiro);
        },
        
        excluir: async function(id) {
            return API.call(`/barbeiros/${id}`, 'DELETE');
        }
    },
    
    // Outras funcionalidades serão adicionadas conforme necessário
};

// Módulo de autenticação
const Auth = {
    init: function() {
        this.setupLoginForm();
        this.setupLogoutButton();
        this.checkAuthentication();
    },
    
    setupLoginForm: function() {
        const loginForm = document.getElementById('form-login');
        if (!loginForm) return;
        
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');
            const loginError = document.getElementById('login-error');
            
            if (!emailInput || !passwordInput) return;
            
            const email = emailInput.value;
            const senha = passwordInput.value;
            
            // Limpar mensagens de erro
            if (loginError) {
                loginError.classList.add('d-none');
                loginError.textContent = '';
            }
            
            try {
                // Tentar fazer login
                const response = await API.auth.login(email, senha);
                
                // Login bem-sucedido
                console.log('Login bem-sucedido:', response);
                
                // Salvar token e dados do usuário
                localStorage.setItem('token', response.token);
                localStorage.setItem('usuario', JSON.stringify(response.usuario));
                
                // Atualizar estado da aplicação
                AppState.token = response.token;
                AppState.usuario = response.usuario;
                
                // Redirecionar para a página principal
                window.location.href = '/';
            } catch (error) {
                console.error('Erro ao fazer login:', error);
                
                // Mostrar mensagem de erro
                if (loginError) {
                    loginError.classList.remove('d-none');
                    loginError.textContent = 'Email ou senha incorretos. Tente novamente.';
                }
            }
        });
    },
    
    setupLogoutButton: function() {
        const logoutBtn = document.getElementById('logout-btn');
        if (!logoutBtn) return;
        
        logoutBtn.addEventListener('click', () => {
            this.logout();
            window.location.href = '/';
        });
    },
    
    logout: function() {
        // Limpar dados de autenticação
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        
        // Atualizar estado da aplicação
        AppState.token = null;
        AppState.usuario = null;
    },
    
    checkAuthentication: function() {
        // Verificar se estamos na página principal e o usuário está autenticado
        const isIndexPage = window.location.pathname === '/' || window.location.pathname === '/index.html';
        const loginForm = document.getElementById('login-form');
        const dashboardContainer = document.getElementById('dashboard-container');
        
        if (isIndexPage && loginForm && dashboardContainer) {
            if (AppState.isAuthenticated()) {
                // Usuário autenticado: mostrar dashboard, esconder login
                loginForm.classList.add('d-none');
                dashboardContainer.classList.remove('d-none');
                
                // Atualizar nome do usuário nas interfaces
                const userNameElements = document.querySelectorAll('.user-name');
                userNameElements.forEach(el => {
                    el.textContent = AppState.usuario?.nome || 'Usuário';
                });
            } else {
                // Usuário não autenticado: mostrar login, esconder dashboard
                loginForm.classList.remove('d-none');
                dashboardContainer.classList.add('d-none');
            }
        }
    }
};

// Utilitários
const Utils = {
    // Formatar data para o formato brasileiro
    formatDate: function(date) {
        if (!date) return '';
        
        const d = new Date(date);
        return new Intl.DateTimeFormat('pt-BR').format(d);
    },
    
    // Formatar moeda para o formato brasileiro
    formatCurrency: function(value) {
        if (value === undefined || value === null) return 'R$ 0,00';
        
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    },
    
    // Mostrar notificação
    showNotification: function(message, type = 'info') {
        // Implementar sistema de notificações
        if (typeof toast === 'function') {
            toast(message, type);
        } else {
            alert(message);
        }
    }
};

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    console.log('B-Manager: Inicializando aplicação...');
    
    // Inicializar autenticação
    Auth.init();
    
    // Inicializar links do sidebar
    initSidebarLinks();
});

// Inicializar links do sidebar
function initSidebarLinks() {
    console.log('Inicializando links do sidebar');
    
    // Link para agenda - permitir navegação normal para a página dedicada
    const agendaLink = document.getElementById('agenda-link');
    if (agendaLink) {
        console.log('Configurando link da agenda');
        agendaLink.setAttribute('href', '/agenda');
    }
    
    // Links para outros módulos - usar páginas dedicadas
    const links = {
        'clientes': '/clientes',
        'servicos': '/servicos',
        'produtos': '/produtos',
        'vendas': '/vendas',
        'barbeiros': '/barbeiros',
        'relatorios': '/relatorios',
        'configuracoes': '/configuracoes'
    };
    
    Object.entries(links).forEach(([key, path]) => {
        const link = document.getElementById(`${key}-link`);
        if (link) {
            link.setAttribute('href', path);
        }
    });
}