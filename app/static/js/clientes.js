/**
 * Funções para gerenciamento de clientes
 */

// Carregar lista de clientes com paginação
function loadClientes(page = 1, search = '') {
    // Atualizar variáveis de estado
    currentPage = page;
    
    // Exibir loading
    $('#clientes-list').html('<div class="text-center my-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Carregando...</span></div></div>');
    
    // Fazer requisição AJAX
    $.ajax({
        url: `/api/clientes?page=${page}&search=${search}`,
        type: 'GET',
        success: function(response) {
            if (response.clientes.length === 0 && search === '') {
                // Exibir mensagem de lista vazia (sem pesquisa)
                $('#clientes-list').html(`
                    <div class="text-center my-5">
                        <img src="/static/img/empty-list.svg" alt="Lista vazia" class="img-fluid mb-3" style="max-height: 150px;">
                        <h5>Nenhum cliente cadastrado</h5>
                        <p class="text-muted">Cadastre o primeiro cliente para começar</p>
                        <button id="btn-novo-cliente-empty" class="btn btn-primary">
                            <i class="fas fa-plus-circle me-2"></i> Novo Cliente
                        </button>
                    </div>
                `);
                
                // Evento para o botão de novo cliente
                $('#btn-novo-cliente-empty').on('click', function() {
                    openModalCliente();
                });
            } else if (response.clientes.length === 0 && search !== '') {
                // Exibir mensagem de pesquisa sem resultados
                $('#clientes-list').html(`
                    <div class="text-center my-5">
                        <img src="/static/img/no-results.svg" alt="Sem resultados" class="img-fluid mb-3" style="max-height: 150px;">
                        <h5>Nenhum cliente encontrado</h5>
                        <p class="text-muted">Tente usar termos de pesquisa diferentes</p>
                        <button id="btn-limpar-pesquisa" class="btn btn-outline-secondary">
                            <i class="fas fa-times me-2"></i> Limpar Pesquisa
                        </button>
                    </div>
                `);
                
                // Evento para limpar pesquisa
                $('#btn-limpar-pesquisa').on('click', function() {
                    $('#cliente-search').val('');
                    loadClientes(1, '');
                });
            } else {
                // Renderizar lista de clientes
                let html = '<div class="table-responsive">';
                html += `
                    <table class="table table-hover align-middle">
                        <thead class="table-light">
                            <tr>
                                <th scope="col">Nome</th>
                                <th scope="col">Contato</th>
                                <th scope="col">Atendimentos</th>
                                <th scope="col">Última Visita</th>
                                <th scope="col">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                `;
                
                response.clientes.forEach(cliente => {
                    const ultimaVisita = cliente.ultima_visita ? new Date(cliente.ultima_visita).toLocaleDateString('pt-BR') : 'Nunca';
                    
                    // Definir classe baseado na frequência de visitas
                    let statusClass = '';
                    let statusText = '';
                    
                    if (cliente.status === 'frequent') {
                        statusClass = 'bg-success';
                        statusText = 'Frequente';
                    } else if (cliente.status === 'regular') {
                        statusClass = 'bg-info';
                        statusText = 'Regular';
                    } else if (cliente.status === 'occasional') {
                        statusClass = 'bg-warning text-dark';
                        statusText = 'Ocasional';
                    } else if (cliente.status === 'inactive') {
                        statusClass = 'bg-danger';
                        statusText = 'Inativo';
                    } else {
                        statusClass = 'bg-secondary';
                        statusText = 'Novo';
                    }
                    
                    html += `
                        <tr>
                            <td>
                                <div class="d-flex align-items-center">
                                    <div class="me-3">
                                        <div class="avatar-sm rounded-circle bg-light d-flex align-items-center justify-content-center">
                                            <span class="text-primary">${cliente.nome.charAt(0).toUpperCase()}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <h6 class="mb-0">${cliente.nome}</h6>
                                        <span class="badge ${statusClass}">${statusText}</span>
                                    </div>
                                </div>
                            </td>
                            <td>
                                <div><i class="fas fa-phone me-1 text-muted"></i> ${cliente.telefone || 'Não informado'}</div>
                                <div><i class="fas fa-envelope me-1 text-muted"></i> ${cliente.email || 'Não informado'}</div>
                            </td>
                            <td>
                                <h6 class="mb-0">${cliente.agendamentos_count || 0}</h6>
                                <small class="text-muted">atendimentos</small>
                            </td>
                            <td>${ultimaVisita}</td>
                            <td>
                                <div class="btn-group" role="group">
                                    <button type="button" class="btn btn-sm btn-outline-primary" onclick="openModalCliente(${cliente.id})">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button type="button" class="btn btn-sm btn-outline-success" onclick="openModalAgendamento(null, ${cliente.id})">
                                        <i class="fas fa-calendar-plus"></i>
                                    </button>
                                    <button type="button" class="btn btn-sm btn-outline-info" onclick="verPerfilCliente(${cliente.id})">
                                        <i class="fas fa-user"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `;
                });
                
                html += '</tbody></table></div>';
                
                // Adicionar paginação
                html += '<div id="clientes-pagination" class="d-flex justify-content-center mt-4"></div>';
                
                $('#clientes-list').html(html);
                
                // Gerar paginação
                generatePagination('#clientes-pagination', page, response.total_pages, (newPage) => {
                    loadClientes(newPage, search);
                });
            }
        },
        error: function(xhr) {
            $('#clientes-list').html(`
                <div class="alert alert-danger" role="alert">
                    Erro ao carregar clientes: ${xhr.responseJSON?.message || 'Erro desconhecido'}
                </div>
            `);
        }
    });
    
    // Carregar estatísticas de clientes
    loadClientesStats();
}

// Gerar paginação
function generatePagination(selector, currentPage, totalPages, callback) {
    if (totalPages <= 1) {
        $(selector).html('');
        return;
    }
    
    let html = '<nav aria-label="Paginação"><ul class="pagination">';
    
    // Botão anterior
    html += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" aria-label="Anterior" data-page="${currentPage - 1}">
                <span aria-hidden="true">&laquo;</span>
            </a>
        </li>
    `;
    
    // Páginas
    const maxPages = 5; // Máximo de páginas para mostrar
    let startPage = Math.max(1, currentPage - Math.floor(maxPages / 2));
    let endPage = Math.min(totalPages, startPage + maxPages - 1);
    
    if (endPage - startPage + 1 < maxPages) {
        startPage = Math.max(1, endPage - maxPages + 1);
    }
    
    // Primeira página
    if (startPage > 1) {
        html += `<li class="page-item"><a class="page-link" href="#" data-page="1">1</a></li>`;
        if (startPage > 2) {
            html += `<li class="page-item disabled"><a class="page-link" href="#">...</a></li>`;
        }
    }
    
    // Páginas do meio
    for (let i = startPage; i <= endPage; i++) {
        html += `<li class="page-item ${i === currentPage ? 'active' : ''}"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
    }
    
    // Última página
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<li class="page-item disabled"><a class="page-link" href="#">...</a></li>`;
        }
        html += `<li class="page-item"><a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a></li>`;
    }
    
    // Botão próximo
    html += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" aria-label="Próximo" data-page="${currentPage + 1}">
                <span aria-hidden="true">&raquo;</span>
            </a>
        </li>
    `;
    
    html += '</ul></nav>';
    
    $(selector).html(html);
    
    // Adicionar eventos
    $(`${selector} .page-link`).on('click', function(e) {
        e.preventDefault();
        const page = $(this).data('page');
        if (page && !isNaN(page) && page !== currentPage) {
            callback(page);
        }
    });
}

// Carregar estatísticas de clientes
function loadClientesStats() {
    $.ajax({
        url: '/api/clientes/stats',
        type: 'GET',
        success: function(response) {
            // Atualizar contadores
            $('#clientes-total-count').text(response.total || 0);
            $('#clientes-novos-count').text(response.novos_mes || 0);
            $('#clientes-retornos-count').text(response.retornos_mes || 0);
            
            // Criar gráfico de frequência
            createClientesChart(response.frequencia);
        },
        error: function(xhr) {
            console.error('Erro ao carregar estatísticas de clientes:', xhr.responseJSON?.message || 'Erro desconhecido');
        }
    });
}

// Criar gráfico de frequência de clientes
function createClientesChart(dados) {
    // Remover chart existente se houver
    if (window.clientesChart) {
        window.clientesChart.destroy();
    }
    
    // Se não houver dados, não criar o gráfico
    if (!dados) {
        $('#clientes-chart-container').html(`
            <div class="alert alert-info" role="alert">
                Não há dados suficientes para exibir o gráfico de frequência de clientes.
            </div>
        `);
        return;
    }
    
    // Preparar dados para o gráfico
    const labels = ['Frequentes', 'Regulares', 'Ocasionais', 'Inativos', 'Novos'];
    const data = [
        dados.frequent || 0,
        dados.regular || 0,
        dados.occasional || 0,
        dados.inactive || 0,
        dados.new || 0
    ];
    
    // Criar novo chart
    const ctx = document.getElementById('chart-clientes');
    window.clientesChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    'rgba(40, 167, 69, 0.7)',    // Verde - Frequentes
                    'rgba(23, 162, 184, 0.7)',   // Ciano - Regulares
                    'rgba(255, 193, 7, 0.7)',    // Amarelo - Ocasionais
                    'rgba(220, 53, 69, 0.7)',    // Vermelho - Inativos
                    'rgba(108, 117, 125, 0.7)'   // Cinza - Novos
                ],
                borderColor: [
                    'rgba(40, 167, 69, 1)',
                    'rgba(23, 162, 184, 1)',
                    'rgba(255, 193, 7, 1)',
                    'rgba(220, 53, 69, 1)',
                    'rgba(108, 117, 125, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right',
                },
                title: {
                    display: true,
                    text: 'Frequência de Clientes'
                }
            }
        }
    });
    
    // Exibir o gráfico
    $('#clientes-chart-container').html(`
        <div class="card shadow-sm">
            <div class="card-header">
                <h5 class="card-title mb-0">Frequência de Clientes</h5>
            </div>
            <div class="card-body">
                <canvas id="chart-clientes"></canvas>
            </div>
        </div>
    `);
}

// Abrir modal para adicionar/editar cliente
function openModalCliente(id = null) {
    // Limpar formulário
    $('#form-cliente')[0].reset();
    $('#form-cliente .alert').addClass('d-none');
    $('#form-cliente .is-invalid').removeClass('is-invalid');
    
    // Definir título do modal
    $('#modalClienteTitle').text(id ? 'Editar Cliente' : 'Novo Cliente');
    
    // Se for edição, carregar dados do cliente
    if (id) {
        // Mostrar loading
        $('#modal-cliente-loading').removeClass('d-none');
        $('#form-cliente-content').addClass('d-none');
        
        // Fazer requisição AJAX
        $.ajax({
            url: `/api/clientes/${id}`,
            type: 'GET',
            success: function(response) {
                // Preencher formulário
                $('#cliente-id').val(response.cliente.id);
                $('#cliente-nome').val(response.cliente.nome);
                $('#cliente-email').val(response.cliente.email);
                $('#cliente-telefone').val(response.cliente.telefone);
                $('#cliente-data-nascimento').val(response.cliente.data_nascimento);
                $('#cliente-observacoes').val(response.cliente.observacoes);
                
                // Exibir formulário
                $('#modal-cliente-loading').addClass('d-none');
                $('#form-cliente-content').removeClass('d-none');
            },
            error: function(xhr) {
                // Mostrar erro
                $('#modal-cliente-loading').addClass('d-none');
                $('#form-cliente-content').removeClass('d-none');
                $('#form-cliente .alert-danger').text(`Erro ao carregar cliente: ${xhr.responseJSON?.message || 'Erro desconhecido'}`).removeClass('d-none');
            }
        });
    }
    
    // Abrir modal
    const modal = new bootstrap.Modal(document.getElementById('modalCliente'));
    modal.show();
}

// Salvar cliente
function salvarCliente() {
    // Validar formulário
    if (!validarFormulario('#form-cliente')) {
        return;
    }
    
    // Desabilitar botão de salvar
    $('#btn-salvar-cliente').prop('disabled', true).html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Salvando...');
    
    // Pegar ID (se for edição)
    const id = $('#cliente-id').val();
    
    // Preparar dados
    const dados = {
        nome: $('#cliente-nome').val(),
        email: $('#cliente-email').val(),
        telefone: $('#cliente-telefone').val(),
        data_nascimento: $('#cliente-data-nascimento').val(),
        observacoes: $('#cliente-observacoes').val()
    };
    
    // Definir método e URL
    const metodo = id ? 'PUT' : 'POST';
    const url = id ? `/api/clientes/${id}` : '/api/clientes';
    
    // Fazer requisição AJAX
    $.ajax({
        url: url,
        type: metodo,
        data: JSON.stringify(dados),
        contentType: 'application/json',
        success: function(response) {
            // Fechar modal
            bootstrap.Modal.getInstance(document.getElementById('modalCliente')).hide();
            
            // Exibir mensagem de sucesso
            showAlert('success', response.message || 'Cliente salvo com sucesso!');
            
            // Recarregar lista de clientes
            loadClientes(currentPage, $('#cliente-search').val());
        },
        error: function(xhr) {
            // Mostrar erro
            $('#form-cliente .alert-danger').text(xhr.responseJSON?.message || 'Erro ao salvar cliente').removeClass('d-none');
            
            // Habilitar botão de salvar
            $('#btn-salvar-cliente').prop('disabled', false).text('Salvar');
        },
        complete: function() {
            // Habilitar botão de salvar
            $('#btn-salvar-cliente').prop('disabled', false).text('Salvar');
        }
    });
}

// Ver perfil do cliente (a ser implementado)
function verPerfilCliente(id) {
    alert('Funcionalidade em desenvolvimento: Ver perfil do cliente ' + id);
}

// Eventos
$(document).ready(function() {
    // Evento para salvar cliente
    $('#btn-salvar-cliente').on('click', function() {
        salvarCliente();
    });
    
    // Evento para pesquisar clientes
    $('#btn-pesquisar-cliente').on('click', function() {
        const search = $('#cliente-search').val();
        loadClientes(1, search);
    });
    
    // Evento para pesquisar com Enter
    $('#cliente-search').on('keypress', function(e) {
        if (e.which === 13) {
            e.preventDefault();
            const search = $(this).val();
            loadClientes(1, search);
        }
    });
    
    // Máscara para telefone
    $('#cliente-telefone').mask('(00) 00000-0000');
}); 