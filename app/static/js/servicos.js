/**
 * Funções para gerenciamento de serviços
 */

// Carregar lista de serviços
function loadServicos() {
    // Exibir loading
    $('#servicos-list').html('<div class="text-center my-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Carregando...</span></div></div>');
    
    // Fazer requisição AJAX
    $.ajax({
        url: '/api/servicos',
        type: 'GET',
        success: function(response) {
            if (response.servicos.length === 0) {
                // Exibir mensagem de lista vazia
                $('#servicos-list').html(`
                    <div class="text-center my-5">
                        <img src="/static/img/empty-list.svg" alt="Lista vazia" class="img-fluid mb-3" style="max-height: 150px;">
                        <h5>Nenhum serviço cadastrado</h5>
                        <p class="text-muted">Cadastre o primeiro serviço para começar</p>
                        <button id="servico-novo-btn-empty" class="btn btn-primary">
                            <i class="fas fa-plus-circle me-2"></i> Novo Serviço
                        </button>
                    </div>
                `);
            } else {
                // Renderizar lista de serviços
                let html = '';
                response.servicos.forEach(servico => {
                    // Calcular classe de popularidade
                    let popularidadeClass = 'bg-secondary';
                    let popularidadeText = 'Novo';
                    
                    if (servico.popularidade > 75) {
                        popularidadeClass = 'bg-success';
                        popularidadeText = 'Alta';
                    } else if (servico.popularidade > 25) {
                        popularidadeClass = 'bg-info';
                        popularidadeText = 'Média';
                    } else if (servico.popularidade > 0) {
                        popularidadeClass = 'bg-warning';
                        popularidadeText = 'Baixa';
                    }
                    
                    // Formatar valor com R$
                    const valorFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(servico.valor);
                    
                    // Calcular duração em minutos
                    const duracaoMin = Math.round(servico.duracao / 60);
                    
                    html += `
                        <div class="col-md-4 mb-4">
                            <div class="card h-100 shadow-sm">
                                <div class="card-header d-flex justify-content-between align-items-center">
                                    <span class="badge ${popularidadeClass}">${popularidadeText}</span>
                                    <div class="dropdown">
                                        <button class="btn btn-sm btn-light" type="button" data-bs-toggle="dropdown">
                                            <i class="fas fa-ellipsis-v"></i>
                                        </button>
                                        <ul class="dropdown-menu dropdown-menu-end">
                                            <li><a class="dropdown-item" href="#" onclick="openModalServico(${servico.id})"><i class="fas fa-edit me-2"></i> Editar</a></li>
                                            <li><a class="dropdown-item text-danger" href="#" onclick="excluirServico(${servico.id})"><i class="fas fa-trash me-2"></i> Excluir</a></li>
                                        </ul>
                                    </div>
                                </div>
                                <div class="card-body">
                                    <h5 class="card-title">${servico.nome}</h5>
                                    <p class="card-text text-muted">${servico.descricao || 'Sem descrição'}</p>
                                </div>
                                <div class="card-footer bg-transparent">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <span class="badge bg-primary rounded-pill">${valorFormatado}</span>
                                        <span><i class="far fa-clock me-1"></i> ${duracaoMin} min</span>
                                        <span><i class="fas fa-calendar-check me-1"></i> ${servico.agendamentos_count || 0}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                });
                
                $('#servicos-list').html(`<div class="row">${html}</div>`);
                
                // Criar gráfico de serviços
                createServicosChart(response.servicos);
            }
        },
        error: function(xhr) {
            $('#servicos-list').html(`
                <div class="alert alert-danger" role="alert">
                    Erro ao carregar serviços: ${xhr.responseJSON?.message || 'Erro desconhecido'}
                </div>
            `);
        }
    });
}

// Criar gráfico de serviços
function createServicosChart(servicos) {
    // Ordenar serviços por popularidade e pegar os 5 mais populares
    const servicosOrdenados = [...servicos].sort((a, b) => b.agendamentos_count - a.agendamentos_count).slice(0, 5);
    
    // Preparar dados para o gráfico
    const labels = servicosOrdenados.map(s => s.nome);
    const data = servicosOrdenados.map(s => s.agendamentos_count || 0);
    
    // Remover chart existente se houver
    if (window.servicosChart) {
        window.servicosChart.destroy();
    }
    
    // Se não houver dados suficientes, não criar o gráfico
    if (servicosOrdenados.length === 0) {
        $('#servicos-chart-container').html(`
            <div class="alert alert-info" role="alert">
                Não há dados suficientes para exibir o gráfico de serviços.
            </div>
        `);
        return;
    }
    
    // Criar novo chart
    const ctx = document.getElementById('chart-servicos');
    window.servicosChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(255, 159, 64, 0.7)',
                    'rgba(153, 102, 255, 0.7)'
                ],
                borderColor: [
                    'rgba(54, 162, 235, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(255, 99, 132, 1)',
                    'rgba(255, 159, 64, 1)',
                    'rgba(153, 102, 255, 1)'
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
                    text: 'Serviços Mais Populares'
                }
            }
        }
    });
    
    // Exibir o gráfico
    $('#servicos-chart-container').html(`
        <div class="card shadow-sm">
            <div class="card-header">
                <h5 class="card-title mb-0">Serviços Mais Populares</h5>
            </div>
            <div class="card-body">
                <canvas id="chart-servicos"></canvas>
            </div>
        </div>
    `);
}

// Abrir modal para adicionar/editar serviço
function openModalServico(id = null) {
    // Limpar formulário
    $('#form-servico')[0].reset();
    $('#form-servico .alert').addClass('d-none');
    $('#form-servico .is-invalid').removeClass('is-invalid');
    
    // Definir título do modal
    $('#modalServicoTitle').text(id ? 'Editar Serviço' : 'Novo Serviço');
    
    // Se for edição, carregar dados do serviço
    if (id) {
        // Mostrar loading
        $('#modal-servico-loading').removeClass('d-none');
        $('#form-servico-content').addClass('d-none');
        
        // Fazer requisição AJAX
        $.ajax({
            url: `/api/servicos/${id}`,
            type: 'GET',
            success: function(response) {
                // Preencher formulário
                $('#servico-id').val(response.servico.id);
                $('#servico-nome').val(response.servico.nome);
                $('#servico-descricao').val(response.servico.descricao);
                $('#servico-valor').val(response.servico.valor);
                $('#servico-duracao').val(Math.round(response.servico.duracao / 60)); // Converter segundos para minutos
                
                // Exibir formulário
                $('#modal-servico-loading').addClass('d-none');
                $('#form-servico-content').removeClass('d-none');
            },
            error: function(xhr) {
                // Mostrar erro
                $('#modal-servico-loading').addClass('d-none');
                $('#form-servico-content').removeClass('d-none');
                $('#form-servico .alert-danger').text(`Erro ao carregar serviço: ${xhr.responseJSON?.message || 'Erro desconhecido'}`).removeClass('d-none');
            }
        });
    }
    
    // Abrir modal
    const modal = new bootstrap.Modal(document.getElementById('modalServico'));
    modal.show();
}

// Salvar serviço
function salvarServico() {
    // Validar formulário
    if (!validarFormulario('#form-servico')) {
        return;
    }
    
    // Desabilitar botão de salvar
    $('#btn-salvar-servico').prop('disabled', true).html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Salvando...');
    
    // Pegar ID (se for edição)
    const id = $('#servico-id').val();
    
    // Preparar dados
    const dados = {
        nome: $('#servico-nome').val(),
        descricao: $('#servico-descricao').val(),
        valor: parseFloat($('#servico-valor').val().replace(',', '.')),
        duracao: parseInt($('#servico-duracao').val()) * 60 // Converter minutos para segundos
    };
    
    // Definir método e URL
    const metodo = id ? 'PUT' : 'POST';
    const url = id ? `/api/servicos/${id}` : '/api/servicos';
    
    // Fazer requisição AJAX
    $.ajax({
        url: url,
        type: metodo,
        data: JSON.stringify(dados),
        contentType: 'application/json',
        success: function(response) {
            // Fechar modal
            bootstrap.Modal.getInstance(document.getElementById('modalServico')).hide();
            
            // Exibir mensagem de sucesso
            showAlert('success', response.message || 'Serviço salvo com sucesso!');
            
            // Recarregar lista de serviços
            loadServicos();
        },
        error: function(xhr) {
            // Mostrar erro
            $('#form-servico .alert-danger').text(xhr.responseJSON?.message || 'Erro ao salvar serviço').removeClass('d-none');
            
            // Habilitar botão de salvar
            $('#btn-salvar-servico').prop('disabled', false).text('Salvar');
        },
        complete: function() {
            // Habilitar botão de salvar
            $('#btn-salvar-servico').prop('disabled', false).text('Salvar');
        }
    });
}

// Excluir serviço
function excluirServico(id) {
    // Confirmar exclusão
    if (!confirm('Tem certeza que deseja excluir este serviço? Esta ação não pode ser desfeita.')) {
        return;
    }
    
    // Fazer requisição AJAX
    $.ajax({
        url: `/api/servicos/${id}`,
        type: 'DELETE',
        success: function(response) {
            // Exibir mensagem de sucesso
            showAlert('success', response.message || 'Serviço excluído com sucesso!');
            
            // Recarregar lista de serviços
            loadServicos();
        },
        error: function(xhr) {
            // Mostrar erro
            showAlert('danger', xhr.responseJSON?.message || 'Erro ao excluir serviço');
        }
    });
}

// Eventos
$(document).ready(function() {
    // Evento para salvar serviço
    $('#btn-salvar-servico').on('click', function() {
        salvarServico();
    });
    
    // Máscara para valor monetário
    $('#servico-valor').mask('#.##0,00', {reverse: true});
}); 