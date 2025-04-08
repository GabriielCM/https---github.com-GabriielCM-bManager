// Função para realizar login
function loginUsuario(email, senha, callback) {
    // Dados para enviar ao endpoint de login
    const dados = {
        email: email,
        senha: senha
    };
    
    // Fazer requisição à API
    $.ajax({
        url: API_URL + '/auth/login',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(dados),
        success: function(response) {
            console.log('Login realizado com sucesso:', response);
            
            // Armazenar token JWT e refresh token no localStorage
            localStorage.setItem('token', response.access_token);
            localStorage.setItem('refresh_token', response.refresh_token);
            
            // Armazenar dados do usuário
            localStorage.setItem('usuario', JSON.stringify(response.usuario));
            
            // Executar callback de sucesso
            if (typeof callback === 'function') {
                callback(true, response);
            }
        },
        error: function(xhr, status, error) {
            console.error('Erro ao realizar login:', xhr.responseText);
            
            // Obter mensagem de erro
            let mensagem = 'Erro ao realizar login. Tente novamente.';
            try {
                const resposta = JSON.parse(xhr.responseText);
                mensagem = resposta.erro || mensagem;
            } catch (e) {}
            
            // Executar callback de erro
            if (typeof callback === 'function') {
                callback(false, { mensagem: mensagem });
            }
        }
    });
}

// Função para verificar se o usuário está autenticado
function verificarAutenticacao() {
    const token = localStorage.getItem('token');
    
    if (!token) {
        return false;
    }
    
    // Verificar se o token está expirado
    try {
        const tokenParts = token.split('.');
        if (tokenParts.length !== 3) {
            // Token inválido
            return false;
        }
        
        const tokenPayload = JSON.parse(atob(tokenParts[1]));
        const expirationTime = tokenPayload.exp * 1000; // converter para milissegundos
        
        if (Date.now() >= expirationTime) {
            // Token expirado, tentar renovar
            const refreshToken = localStorage.getItem('refresh_token');
            if (refreshToken) {
                refreshTokenAsync();
            }
            return false;
        }
        
        return true;
    } catch (e) {
        console.error('Erro ao verificar token:', e);
        return false;
    }
}

// Função para renovar o token de forma assíncrona
function refreshTokenAsync() {
    const refreshToken = localStorage.getItem('refresh_token');
    
    if (!refreshToken) {
        return Promise.reject('Refresh token não encontrado');
    }
    
    return new Promise((resolve, reject) => {
        $.ajax({
            url: API_URL + '/auth/refresh',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${refreshToken}`
            },
            success: function(response) {
                console.log('Token renovado com sucesso:', response);
                
                // Atualizar token no localStorage
                localStorage.setItem('token', response.access_token);
                
                // Sincronizar com AppState do app.js se existir
                if (typeof AppState !== 'undefined') {
                    AppState.token = response.access_token;
                }
                
                resolve(response.access_token);
            },
            error: function(xhr, status, error) {
                console.error('Erro ao renovar token:', xhr.responseText);
                
                // Verificar se o erro é 401 (token inválido/expirado)
                if (xhr.status === 401) {
                    // Limpar tokens e dados do usuário
                    localStorage.removeItem('token');
                    localStorage.removeItem('refresh_token');
                    localStorage.removeItem('usuario');
                    
                    // Sincronizar com AppState do app.js se existir
                    if (typeof AppState !== 'undefined') {
                        AppState.token = null;
                        AppState.usuario = null;
                    }
                    
                    // Redirecionar para login após um pequeno delay
                    setTimeout(() => {
                        window.location.href = '/login';
                    }, 100);
                }
                
                reject(error);
            }
        });
    });
}

// Função para fazer logout
function logoutUsuario(callback) {
    // Remover tokens e dados do usuário
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('usuario');
    
    // Executar callback se fornecido
    if (typeof callback === 'function') {
        callback();
    }
}

// Verificar autenticação ao carregar a página
$(document).ready(function() {
    // Verificar se está na página de login
    if (window.location.pathname === '/login') {
        // Se estiver autenticado, redirecionar para a página inicial
        if (verificarAutenticacao()) {
            window.location.href = '/';
        }
    } else {
        // Em outras páginas, verificar se está autenticado
        if (!verificarAutenticacao()) {
            // Se houver refresh token, tentar renovar automaticamente
            const refreshToken = localStorage.getItem('refresh_token');
            if (refreshToken) {
                refreshTokenAsync()
                    .then(() => {
                        console.log('Token renovado automaticamente');
                        // Recarregar a página para aplicar o novo token
                        window.location.reload();
                    })
                    .catch(() => {
                        // Se falhar ao renovar, redirecionar para login
                        window.location.href = '/login';
                    });
            } else {
                // Se não houver refresh token, redirecionar para login
                window.location.href = '/login';
            }
        }
    }
}); 