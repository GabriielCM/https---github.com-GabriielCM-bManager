/**
 * Funções para gerenciamento de barbeiros
 */

// Carregar lista de barbeiros
function loadBarbeiros() {
    // Exibir loading
    $('#barbeiros-list').html('<div class="text-center my-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Carregando...</span></div></div>');
    
    // Fazer requisição AJAX
    $.ajax({
        url: '/api/barbeiros',
        type: 'GET',
        success: function(response) {
            if (response.barbeiros.length === 0) {
                // Exibir mensagem de lista vazia
                $('#barbeiros-list').html(`
                    <div class="text-center my-5">
                        <img src="/static/img/empty-list.svg" alt="Lista vazia" class="img-fluid mb-3" style="max-height: 150px;">
                        <h5>Nenhum barbeiro cadastrado</h5>
                        <p class="text-muted">Cadastre o primeiro barbeiro para começar</p>
                        <button id="barbeiro-novo-btn-empty" class="btn btn-primary">
                            <i class="fas fa-plus-circle me-2"></i> Novo Barbeiro
                        </button>
                    </div>
                `);
            } else {
                // Renderizar lista de barbeiros
                let html = '';
                response.barbeiros.forEach(barbeiro => {
                    // Definir classe de status
                    let statusClass = 'bg-success';
                    let statusText = 'Ativo';
                    
                    if (barbeiro.status === 'inativo') {
                        statusClass = 'bg-danger';
                        statusText = 'Inativo';
                    } else if (barbeiro.status === 'ferias') {
                        statusClass = 'bg-warning';
                        statusText = 'Em Férias';
                    }
                    
                    html += `
                        <div class="col-md-4 mb-4">
                            <div class="card h-100 shadow-sm">
                                <div class="card-header d-flex justify-content-between align-items-center">
                                    <span class="badge ${statusClass}">${statusText}</span>
                                    <div class="dropdown">
                                        <button class="btn btn-sm btn-light" type="button" data-bs-toggle="dropdown">
                                            <i class="fas fa-ellipsis-v"></i>
                                        </button>
                                        <ul class="dropdown-menu dropdown-menu-end">
                                            <li><a class="dropdown-item" href="#" onclick="openModalBarbeiro(${barbeiro.id})"><i class="fas fa-edit me-2"></i> Editar</a></li>
                                            <li><a class="dropdown-item" href="#" onclick="verDetalhesBarbeiro(${barbeiro.id})"><i class="fas fa-clipboard-list me-2"></i> Ver Detalhes</a></li>
                                            <li><hr class="dropdown-divider"></li>
                                            <li><a class="dropdown-item text-success" href="#" onclick="alterarStatusBarbeiro(${barbeiro.id}, 'ativo')"><i class="fas fa-check-circle me-2"></i> Marcar como Ativo</a></li>
                                            <li><a class="dropdown-item text-warning" href="#" onclick="alterarStatusBarbeiro(${barbeiro.id}, 'ferias')"><i class="fas fa-umbrella-beach me-2"></i> Marcar como Férias</a></li>
                                            <li><a class="dropdown-item text-danger" href="#" onclick="alterarStatusBarbeiro(${barbeiro.id}, 'inativo')"><i class="fas fa-times-circle me-2"></i> Marcar como Inativo</a></li>
                                        </ul>
                                    </div>
                                </div>
                                <div class="card-body text-center">
                                    <div class="mb-3">
                                        <img src="${barbeiro.foto || '/static/img/avatar-placeholder.png'}" alt="${barbeiro.nome}" class="rounded-circle" width="80" height="80">
                                    </div>
                                    <h5 class="card-title">${barbeiro.nome}</h5>
                                    <p class="card-text text-muted">
                                        <i class="fas fa-phone me-1"></i> ${barbeiro.telefone || 'Não informado'}<br>
                                        <i class="fas fa-envelope me-1"></i> ${barbeiro.email || 'Não informado'}
                                    </p>
                                </div>
                                <div class="card-footer bg-transparent">
                                    <div class="d-flex justify-content-between">
                                        <small class="text-muted"><i class="fas fa-calendar-check me-1"></i> ${barbeiro.agendamentos_count || 0} atendimentos</small>
                                        <small class="text-muted"><i class="fas fa-star me-1"></i> ${barbeiro.avaliacao || 'N/A'}</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                });
                
                $('#barbeiros-list').html(`<div class="row">${html}</div>`);
            }
        },
        error: function(xhr) {
            $('#barbeiros-list').html(`
                <div class="alert alert-danger" role="alert">
                    Erro ao carregar barbeiros: ${xhr.responseJSON?.message || 'Erro desconhecido'}
                </div>
            `);
        }
    });
    
    // Carregar desempenho dos barbeiros
    loadDesempenhoBarbeiros();
}

// Carregar desempenho dos barbeiros
function loadDesempenhoBarbeiros(periodo = 30) {
    // Exibir loading
    $('#desempenho-barbeiros').html('<div class="text-center my-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Carregando...</span></div></div>');
    
    // Fazer requisição AJAX
    $.ajax({
        url: `/api/barbeiros/desempenho?periodo=${periodo}`,
        type: 'GET',
        success: function(response) {
            if (!response.desempenho || response.desempenho.length === 0) {
                $('#desempenho-barbeiros').html(`
                    <div class="alert alert-info" role="alert">
                        Não há dados de desempenho disponíveis para o período selecionado.
                    </div>
                `);
                return;
            }
            
            // Criar chart de desempenho
            createDesempenhoChart(response.desempenho);
        },
        error: function(xhr) {
            $('#desempenho-barbeiros').html(`
                <div class="alert alert-danger" role="alert">
                    Erro ao carregar desempenho: ${xhr.responseJSON?.message || 'Erro desconhecido'}
                </div>
            `);
        }
    });
}

// Criar gráfico de desempenho dos barbeiros
function createDesempenhoChart(dados) {
    // Preparar dados para o gráfico
    const barbeiros = dados.map(item => item.nome);
    const atendimentos = dados.map(item => item.total_atendimentos);
    const faturamento = dados.map(item => item.faturamento);
    
    // Remover chart existente se houver
    if (window.desempenhoChart) {
        window.desempenhoChart.destroy();
    }
    
    // Criar novo chart
    const ctx = document.getElementById('chart-desempenho-barbeiros');
    window.desempenhoChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: barbeiros,
            datasets: [
                {
                    label: 'Atendimentos',
                    data: atendimentos,
                    backgroundColor: 'rgba(54, 162, 235, 0.7)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Faturamento (R$)',
                    data: faturamento,
                    backgroundColor: 'rgba(75, 192, 192, 0.7)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1,
                    type: 'line',
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Atendimentos'
                    }
                },
                y1: {
                    beginAtZero: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Faturamento (R$)'
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });
    
    // Exibir dados no container
    $('#desempenho-barbeiros').html(`
        <div class="card shadow-sm">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h5 class="card-title mb-0">Desempenho dos Barbeiros</h5>
                <div class="btn-group" role="group">
                    <button type="button" class="btn btn-sm btn-outline-primary periodo-btn ${periodo === 7 ? 'active' : ''}" data-periodo="7">7 dias</button>
                    <button type="button" class="btn btn-sm btn-outline-primary periodo-btn ${periodo === 30 ? 'active' : ''}" data-periodo="30">30 dias</button>
                    <button type="button" class="btn btn-sm btn-outline-primary periodo-btn ${periodo === 90 ? 'active' : ''}" data-periodo="90">90 dias</button>
                </div>
            </div>
            <div class="card-body">
                <canvas id="chart-desempenho-barbeiros"></canvas>
            </div>
        </div>
    `);
    
    // Adicionar evento para botões de período
    $('.periodo-btn').on('click', function() {
        const novoPeriodo = $(this).data('periodo');
        $('.periodo-btn').removeClass('active');
        $(this).addClass('active');
        loadDesempenhoBarbeiros(novoPeriodo);
    });
}

// Abrir modal para adicionar/editar barbeiro
function openModalBarbeiro(id = null) {
    // Limpar formulário
    $('#form-barbeiro')[0].reset();
    $('#form-barbeiro .alert').addClass('d-none');
    $('#form-barbeiro .is-invalid').removeClass('is-invalid');
    
    // Definir título do modal
    $('#modalBarbeiroTitle').text(id ? 'Editar Barbeiro' : 'Novo Barbeiro');
    
    // Se for edição, carregar dados do barbeiro
    if (id) {
        // Mostrar loading
        $('#modal-barbeiro-loading').removeClass('d-none');
        $('#form-barbeiro-content').addClass('d-none');
        
        // Fazer requisição AJAX
        $.ajax({
            url: `/api/barbeiros/${id}`,
            type: 'GET',
            success: function(response) {
                // Preencher formulário
                $('#barbeiro-id').val(response.barbeiro.id);
                $('#barbeiro-nome').val(response.barbeiro.nome);
                $('#barbeiro-email').val(response.barbeiro.email);
                $('#barbeiro-telefone').val(response.barbeiro.telefone);
                $('#barbeiro-status').val(response.barbeiro.status);
                
                // Exibir formulário
                $('#modal-barbeiro-loading').addClass('d-none');
                $('#form-barbeiro-content').removeClass('d-none');
            },
            error: function(xhr) {
                // Mostrar erro
                $('#modal-barbeiro-loading').addClass('d-none');
                $('#form-barbeiro-content').removeClass('d-none');
                $('#form-barbeiro .alert-danger').text(`Erro ao carregar barbeiro: ${xhr.responseJSON?.message || 'Erro desconhecido'}`).removeClass('d-none');
            }
        });
    }
    
    // Abrir modal
    const modal = new bootstrap.Modal(document.getElementById('modalBarbeiro'));
    modal.show();
}

// Salvar barbeiro
function salvarBarbeiro() {
    // Validar formulário
    if (!validarFormulario('#form-barbeiro')) {
        return;
    }
    
    // Desabilitar botão de salvar
    $('#btn-salvar-barbeiro').prop('disabled', true).html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Salvando...');
    
    // Pegar ID (se for edição)
    const id = $('#barbeiro-id').val();
    
    // Preparar dados
    const dados = {
        nome: $('#barbeiro-nome').val(),
        email: $('#barbeiro-email').val(),
        telefone: $('#barbeiro-telefone').val(),
        status: $('#barbeiro-status').val()
    };
    
    // Definir método e URL
    const metodo = id ? 'PUT' : 'POST';
    const url = id ? `/api/barbeiros/${id}` : '/api/barbeiros';
    
    // Fazer requisição AJAX
    $.ajax({
        url: url,
        type: metodo,
        data: JSON.stringify(dados),
        contentType: 'application/json',
        success: function(response) {
            // Fechar modal
            bootstrap.Modal.getInstance(document.getElementById('modalBarbeiro')).hide();
            
            // Exibir mensagem de sucesso
            showAlert('success', response.message || 'Barbeiro salvo com sucesso!');
            
            // Recarregar lista de barbeiros
            loadBarbeiros();
        },
        error: function(xhr) {
            // Mostrar erro
            $('#form-barbeiro .alert-danger').text(xhr.responseJSON?.message || 'Erro ao salvar barbeiro').removeClass('d-none');
            
            // Habilitar botão de salvar
            $('#btn-salvar-barbeiro').prop('disabled', false).text('Salvar');
        },
        complete: function() {
            // Habilitar botão de salvar
            $('#btn-salvar-barbeiro').prop('disabled', false).text('Salvar');
        }
    });
}

// Alterar status do barbeiro
function alterarStatusBarbeiro(id, novoStatus) {
    // Confirmar alteração
    if (!confirm(`Deseja realmente alterar o status deste barbeiro para ${novoStatus}?`)) {
        return;
    }
    
    // Fazer requisição AJAX
    $.ajax({
        url: `/api/barbeiros/${id}/status`,
        type: 'PUT',
        data: JSON.stringify({ status: novoStatus }),
        contentType: 'application/json',
        success: function(response) {
            // Exibir mensagem de sucesso
            showAlert('success', response.message || 'Status alterado com sucesso!');
            
            // Recarregar lista de barbeiros
            loadBarbeiros();
        },
        error: function(xhr) {
            // Mostrar erro
            showAlert('danger', xhr.responseJSON?.message || 'Erro ao alterar status do barbeiro');
        }
    });
}

// Ver detalhes do barbeiro
function verDetalhesBarbeiro(id) {
    alert('Funcionalidade em desenvolvimento: Ver detalhes do barbeiro ' + id);
}

// Eventos
$(document).ready(function() {
    // Evento para salvar barbeiro
    $('#btn-salvar-barbeiro').on('click', function() {
        salvarBarbeiro();
    });
    
    // Máscara para telefone
    $('#barbeiro-telefone').mask('(00) 00000-0000');
}); 