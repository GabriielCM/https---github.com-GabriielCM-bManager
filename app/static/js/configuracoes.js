/**
 * Scripts para a página de Configurações
 */

// Inicializar quando o documento estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    // Verificar se estamos na página de configurações
    if (window.location.pathname !== '/configuracoes') return;
    
    // Inicializar todos os componentes da página
    inicializarFormularios();
    inicializarAbas();
    carregarConfiguracoes();
});

// Inicializar formulários e validação
function inicializarFormularios() {
    // Formulário de configurações gerais
    const formGeral = document.getElementById('form-config-geral');
    if (formGeral) {
        formGeral.addEventListener('submit', function(e) {
            e.preventDefault();
            salvarConfiguracoesGerais();
        });
    }
    
    // Formulário de configurações de usuário
    const formUsuario = document.getElementById('form-config-usuario');
    if (formUsuario) {
        formUsuario.addEventListener('submit', function(e) {
            e.preventDefault();
            salvarConfiguracoesUsuario();
        });
    }
    
    // Formulário de segurança
    const formSeguranca = document.getElementById('form-config-seguranca');
    if (formSeguranca) {
        formSeguranca.addEventListener('submit', function(e) {
            e.preventDefault();
            alterarSenha();
        });
    }
    
    // Formulário de backup
    const formBackup = document.getElementById('form-config-backup');
    if (formBackup) {
        formBackup.addEventListener('submit', function(e) {
            e.preventDefault();
            realizarBackup();
        });
    }
}

// Inicializar sistema de abas
function inicializarAbas() {
    const abas = document.querySelectorAll('.nav-link[data-bs-toggle="tab"]');
    
    abas.forEach(aba => {
        aba.addEventListener('click', function() {
            // Remover classe ativa de todas as abas
            abas.forEach(a => a.classList.remove('active'));
            
            // Adicionar classe ativa à aba clicada
            this.classList.add('active');
            
            // Mostrar conteúdo correspondente
            const conteudoId = this.getAttribute('href');
            const conteudos = document.querySelectorAll('.tab-pane');
            
            conteudos.forEach(c => {
                c.classList.remove('show', 'active');
                if (c.id === conteudoId.substring(1)) {
                    c.classList.add('show', 'active');
                }
            });
        });
    });
}

// Carregar configurações atuais
function carregarConfiguracoes() {
    // Em um sistema real, isso seria carregado da API
    // Por enquanto, usamos dados estáticos
    
    // Configurações gerais da empresa
    const configEmpresa = {
        nome: 'Barbearia Modelo',
        cnpj: '12.345.678/0001-90',
        telefone: '(11) 1234-5678',
        email: 'contato@barbearia.com',
        endereco: 'Rua Exemplo, 123 - Centro',
        horario_funcionamento: '09:00 - 19:00',
        dias_funcionamento: 'Segunda a Sábado'
    };
    
    // Preencher formulário de configurações gerais
    document.getElementById('empresa-nome')?.setAttribute('value', configEmpresa.nome);
    document.getElementById('empresa-cnpj')?.setAttribute('value', configEmpresa.cnpj);
    document.getElementById('empresa-telefone')?.setAttribute('value', configEmpresa.telefone);
    document.getElementById('empresa-email')?.setAttribute('value', configEmpresa.email);
    document.getElementById('empresa-endereco')?.setAttribute('value', configEmpresa.endereco);
    document.getElementById('empresa-horario')?.setAttribute('value', configEmpresa.horario_funcionamento);
    document.getElementById('empresa-dias')?.setAttribute('value', configEmpresa.dias_funcionamento);
    
    // Configurações de notificações
    document.getElementById('notif-email')?.checked = true;
    document.getElementById('notif-sistema')?.checked = true;
    document.getElementById('notif-agendamento')?.checked = true;
    document.getElementById('notif-cancelamento')?.checked = true;
    document.getElementById('notif-estoque')?.checked = true;
}

// Salvar configurações gerais
function salvarConfiguracoesGerais() {
    const configs = {
        nome: document.getElementById('empresa-nome')?.value,
        cnpj: document.getElementById('empresa-cnpj')?.value,
        telefone: document.getElementById('empresa-telefone')?.value,
        email: document.getElementById('empresa-email')?.value,
        endereco: document.getElementById('empresa-endereco')?.value,
        horario: document.getElementById('empresa-horario')?.value,
        dias: document.getElementById('empresa-dias')?.value
    };
    
    console.log('Salvando configurações gerais:', configs);
    
    // Aqui você faria uma chamada à API para salvar
    // Por enquanto, apenas mostramos uma notificação
    
    exibirMensagem('Configurações gerais salvas com sucesso!', 'success');
}

// Salvar configurações de usuário
function salvarConfiguracoesUsuario() {
    const configUsuario = {
        nome: document.getElementById('usuario-nome')?.value,
        email: document.getElementById('usuario-email')?.value,
        telefone: document.getElementById('usuario-telefone')?.value,
        foto: document.getElementById('usuario-foto')?.files[0]?.name
    };
    
    console.log('Salvando configurações de usuário:', configUsuario);
    
    // Aqui você faria o upload da foto e chamaria a API
    
    exibirMensagem('Configurações de usuário salvas com sucesso!', 'success');
}

// Alterar senha
function alterarSenha() {
    const senhaAtual = document.getElementById('senha-atual')?.value;
    const senhaNova = document.getElementById('senha-nova')?.value;
    const senhaConfirm = document.getElementById('senha-confirmar')?.value;
    
    // Validação básica
    if (!senhaAtual || !senhaNova || !senhaConfirm) {
        exibirMensagem('Todos os campos de senha são obrigatórios!', 'danger');
        return;
    }
    
    if (senhaNova !== senhaConfirm) {
        exibirMensagem('A nova senha e a confirmação não coincidem!', 'danger');
        return;
    }
    
    console.log('Alterando senha...');
    
    // Aqui você faria uma chamada à API para alterar a senha
    
    // Limpar campos
    document.getElementById('senha-atual').value = '';
    document.getElementById('senha-nova').value = '';
    document.getElementById('senha-confirmar').value = '';
    
    exibirMensagem('Senha alterada com sucesso!', 'success');
}

// Realizar backup
function realizarBackup() {
    console.log('Iniciando backup...');
    
    // Aqui você faria uma chamada à API para iniciar o backup
    
    exibirMensagem('Backup iniciado! Você receberá uma notificação quando estiver concluído.', 'info');
}

// Exibir mensagem de notificação
function exibirMensagem(mensagem, tipo) {
    const alerta = document.createElement('div');
    alerta.className = `alert alert-${tipo} alert-dismissible fade show`;
    alerta.setAttribute('role', 'alert');
    
    alerta.innerHTML = `
        ${mensagem}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
    `;
    
    // Adicionar à página
    const alertContainer = document.getElementById('alert-container');
    if (alertContainer) {
        alertContainer.appendChild(alerta);
        
        // Remover após 5 segundos
        setTimeout(() => {
            alerta.classList.remove('show');
            setTimeout(() => alerta.remove(), 150);
        }, 5000);
    } else {
        // Fallback - mostrar um alerta se não houver container
        alert(mensagem);
    }
} 