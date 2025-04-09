/**
 * Script para o Menu Principal
 */

// Carregar dados para o menu principal
function carregarDadosMenuPrincipal() {
    carregarProximosAgendamentos();
    carregarProdutosEstoqueBaixo();
    atualizarNomeUsuario();
}

// Carregar os próximos agendamentos
function carregarProximosAgendamentos() {
    const hoje = new Date();
    const dataFormatada = formatarData(hoje);
    
    // Obter container
    const agendamentosContainer = document.getElementById('proximos-agendamentos-list');
    
    // Fazer requisição AJAX
    $.ajax({
        url: `/api/agendamentos/?data_inicio=${dataFormatada}&status=pendente&por_pagina=5`,
        type: 'GET',
        success: function(response) {
            if (!response.agendamentos || response.agendamentos.length === 0) {
                agendamentosContainer.innerHTML = `
                    <div class="text-center py-4">
                        <i class="fas fa-calendar-check fa-3x text-muted mb-3" style="opacity: 0.5;"></i>
                        <h5 class="text-muted">Nenhum agendamento próximo</h5>
                        <a href="/agenda" class="btn btn-sm btn-primary mt-2">
                            <i class="fas fa-plus-circle me-2"></i>Agendar Novo
                        </a>
                    </div>
                `;
                return;
            }
            
            // Ordenar agendamentos por data e hora
            const agendamentos = response.agendamentos.sort((a, b) => {
                const dataA = new Date(`${a.data}T${a.horario}`);
                const dataB = new Date(`${b.data}T${b.horario}`);
                return dataA - dataB;
            });
            
            // Construir lista HTML
            let html = '<div class="list-group list-group-flush">';
            
            agendamentos.forEach(agendamento => {
                const data = new Date(agendamento.data);
                const dataFormatada = new Intl.DateTimeFormat('pt-BR').format(data);
                const hora = agendamento.horario.substring(0, 5);
                
                const cliente = agendamento.cliente ? agendamento.cliente.nome : 'Cliente não informado';
                const barbeiro = agendamento.barbeiro ? agendamento.barbeiro.nome : 'Barbeiro não atribuído';
                const servico = agendamento.servico ? agendamento.servico.nome : 'Serviço não especificado';
                
                html += `
                    <div class="list-group-item border-start-0 border-end-0">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <strong>${cliente}</strong> - ${servico}
                                <div class="text-muted small">Com ${barbeiro}</div>
                            </div>
                            <div class="text-end">
                                <div class="badge bg-primary rounded-pill">${hora}</div>
                                <div class="text-muted small">${dataFormatada}</div>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
            agendamentosContainer.innerHTML = html;
        },
        error: function(xhr) {
            agendamentosContainer.innerHTML = `
                <div class="alert alert-danger" role="alert">
                    Erro ao carregar agendamentos: ${xhr.responseJSON?.message || 'Erro desconhecido'}
                </div>
            `;
        }
    });
}

// Carregar produtos com estoque baixo
function carregarProdutosEstoqueBaixo() {
    // Obter container
    const produtosContainer = document.getElementById('produtos-estoque-baixo-list');
    
    // Fazer requisição AJAX
    $.ajax({
        url: '/api/produtos/estoque-baixo',
        type: 'GET',
        success: function(response) {
            if (!response.produtos || response.produtos.length === 0) {
                produtosContainer.innerHTML = `
                    <div class="text-center py-4">
                        <i class="fas fa-box fa-3x text-muted mb-3" style="opacity: 0.5;"></i>
                        <h5 class="text-muted">Nenhum produto com estoque baixo</h5>
                        <a href="/produtos" class="btn btn-sm btn-primary mt-2">
                            <i class="fas fa-box me-2"></i>Gerenciar Produtos
                        </a>
                    </div>
                `;
                return;
            }
            
            // Construir lista HTML
            let html = '<div class="list-group list-group-flush">';
            
            response.produtos.forEach(produto => {
                const percentualEstoque = (produto.quantidade / produto.estoque_minimo) * 100;
                const barraClasse = percentualEstoque < 30 ? 'bg-danger' : 'bg-warning';
                
                html += `
                    <div class="list-group-item border-start-0 border-end-0">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <strong>${produto.nome}</strong>
                            <span class="badge bg-danger rounded-pill">${produto.quantidade} unid.</span>
                        </div>
                        <div class="progress" style="height: 6px;">
                            <div class="progress-bar ${barraClasse}" role="progressbar" 
                                 style="width: ${percentualEstoque}%" 
                                 aria-valuenow="${percentualEstoque}" 
                                 aria-valuemin="0" aria-valuemax="100"></div>
                        </div>
                        <div class="d-flex justify-content-between mt-1">
                            <small class="text-muted">Mín. ${produto.estoque_minimo} unidades</small>
                            <small class="text-muted">Preço: ${formatarMoeda(produto.preco_venda)}</small>
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
            produtosContainer.innerHTML = html;
        },
        error: function(xhr) {
            produtosContainer.innerHTML = `
                <div class="alert alert-danger" role="alert">
                    Erro ao carregar produtos: ${xhr.responseJSON?.message || 'Erro desconhecido'}
                </div>
            `;
        }
    });
}

// Atualizar nome do usuário logado
function atualizarNomeUsuario() {
    const usuarioData = JSON.parse(localStorage.getItem('usuario'));
    const userNameElement = document.getElementById('user-name');
    
    if (usuarioData && userNameElement) {
        userNameElement.textContent = usuarioData.nome || 'Usuário';
    }
}

// Função auxiliar para formatar data
function formatarData(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

// Função auxiliar para formatar moeda
function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(valor);
}

// Inicializar quando o documento estiver pronto
$(document).ready(function() {
    // Verificar se estamos na página do menu principal
    if (window.location.pathname === '/menu-principal' || window.location.pathname === '/') {
        carregarDadosMenuPrincipal();
        
        // Configurar botão de logout mobile
        $('#mobile-logout-btn').on('click', function() {
            // Usar a mesma lógica do botão principal de logout
            if (typeof Auth !== 'undefined' && typeof Auth.logout === 'function') {
                Auth.logout();
            } else {
                // Fallback - redirecionar para a página de login
                window.location.href = '/login';
            }
        });
        
        // Controlar classe do body quando offcanvas é aberto/fechado
        const offcanvasMenu = document.getElementById('mobile-menu');
        if (offcanvasMenu) {
            offcanvasMenu.addEventListener('show.bs.offcanvas', function () {
                document.body.classList.add('offcanvas-active');
            });
            
            offcanvasMenu.addEventListener('hide.bs.offcanvas', function () {
                document.body.classList.remove('offcanvas-active');
            });
        }
    }
}); 