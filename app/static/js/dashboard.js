/**
 * Funções para gerenciamento do dashboard
 */

// Carregar dados do dashboard
function loadDashboardData() {
    // Carregar contadores
    loadDashboardCounters();
    
    // Carregar gráfico de faturamento
    loadFaturamentoChart();
    
    // Carregar agendamentos do dia
    loadAgendamentosHoje();
    
    // Carregar produtos com estoque baixo
    loadProdutosEstoqueBaixo();
}

// Carregar contadores do dashboard
function loadDashboardCounters() {
    // Fazer requisição AJAX
    $.ajax({
        url: '/api/dashboard/counters',
        type: 'GET',
        success: function(response) {
            // Atualizar contadores
            $('#agendamentos-hoje-count').text(response.agendamentos_hoje || 0);
            $('#faturamento-hoje-count').text(formatCurrency(response.faturamento_hoje || 0));
            $('#clientes-ativos-count').text(response.clientes_ativos || 0);
            $('#produtos-estoque-baixo-count').text(response.produtos_estoque_baixo || 0);
        },
        error: function(xhr) {
            console.error('Erro ao carregar contadores:', xhr.responseJSON?.message || 'Erro desconhecido');
        }
    });
}

// Carregar gráfico de faturamento
function loadFaturamentoChart(periodo = 30) {
    // Exibir loading
    $('#faturamento-chart-container').html('<div class="text-center my-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Carregando...</span></div></div>');
    
    // Fazer requisição AJAX
    $.ajax({
        url: `/api/dashboard/faturamento?periodo=${periodo}`,
        type: 'GET',
        success: function(response) {
            if (!response.faturamento || response.faturamento.length === 0) {
                $('#faturamento-chart-container').html(`
                    <div class="alert alert-info" role="alert">
                        Não há dados de faturamento disponíveis para o período selecionado.
                    </div>
                `);
                return;
            }
            
            // Criar chart de faturamento
            createFaturamentoChart(response.faturamento, periodo);
        },
        error: function(xhr) {
            $('#faturamento-chart-container').html(`
                <div class="alert alert-danger" role="alert">
                    Erro ao carregar faturamento: ${xhr.responseJSON?.message || 'Erro desconhecido'}
                </div>
            `);
        }
    });
}

// Criar gráfico de faturamento
function createFaturamentoChart(dados, periodo) {
    // Preparar dados para o gráfico
    const labels = dados.map(item => item.data);
    const faturamento = dados.map(item => item.valor);
    const agendamentos = dados.map(item => item.agendamentos);
    
    // Calcular totais
    const totalFaturamento = faturamento.reduce((sum, value) => sum + value, 0);
    const totalAgendamentos = agendamentos.reduce((sum, value) => sum + value, 0);
    const mediaFaturamento = totalFaturamento / faturamento.length;
    
    // Remover chart existente se houver
    if (window.faturamentoChart) {
        window.faturamentoChart.destroy();
    }
    
    // Criar novo chart
    const ctx = document.getElementById('chart-faturamento');
    window.faturamentoChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Faturamento (R$)',
                    data: faturamento,
                    backgroundColor: 'rgba(75, 192, 192, 0.7)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Agendamentos',
                    data: agendamentos,
                    backgroundColor: 'rgba(54, 162, 235, 0.7)',
                    borderColor: 'rgba(54, 162, 235, 1)',
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
                        text: 'Faturamento (R$)'
                    }
                },
                y1: {
                    beginAtZero: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Agendamentos'
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });
    
    // Exibir dados no container
    $('#faturamento-chart-container').html(`
        <div class="card shadow-sm">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h5 class="card-title mb-0">Faturamento</h5>
                <div class="btn-group" role="group">
                    <button type="button" class="btn btn-sm btn-outline-primary periodo-btn ${periodo === 7 ? 'active' : ''}" data-periodo="7">7 dias</button>
                    <button type="button" class="btn btn-sm btn-outline-primary periodo-btn ${periodo === 30 ? 'active' : ''}" data-periodo="30">30 dias</button>
                    <button type="button" class="btn btn-sm btn-outline-primary periodo-btn ${periodo === 90 ? 'active' : ''}" data-periodo="90">90 dias</button>
                </div>
            </div>
            <div class="card-body">
                <div class="d-flex justify-content-around mb-4 text-center">
                    <div>
                        <h6>Faturamento Total</h6>
                        <h4 class="text-primary">${formatCurrency(totalFaturamento)}</h4>
                    </div>
                    <div>
                        <h6>Média Diária</h6>
                        <h4 class="text-success">${formatCurrency(mediaFaturamento)}</h4>
                    </div>
                    <div>
                        <h6>Agendamentos</h6>
                        <h4 class="text-info">${totalAgendamentos}</h4>
                    </div>
                </div>
                <canvas id="chart-faturamento"></canvas>
            </div>
        </div>
    `);
    
    // Adicionar evento para botões de período
    $('.periodo-btn').on('click', function() {
        const novoPeriodo = $(this).data('periodo');
        $('.periodo-btn').removeClass('active');
        $(this).addClass('active');
        loadFaturamentoChart(novoPeriodo);
    });
}

// Carregar agendamentos de hoje
function loadAgendamentosHoje() {
    // Data de hoje
    const hoje = new Date();
    const dataHoje = formatDate(hoje);
    
    // Exibir loading
    $('#agendamentos-hoje-list').html('<div class="text-center my-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Carregando...</span></div></div>');
    
    // Fazer requisição AJAX
    $.ajax({
        url: `/api/agendamentos/dia/${dataHoje}`,
        type: 'GET',
        success: function(response) {
            if (response.agendamentos.length === 0) {
                // Exibir mensagem de lista vazia
                $('#agendamentos-hoje-list').html(`
                    <div class="text-center my-4">
                        <img src="/static/img/empty-calendar.svg" alt="Calendário vazio" class="img-fluid mb-3" style="max-height: 120px;">
                        <h5>Nenhum agendamento para hoje</h5>
                        <p class="text-muted">Clique no botão abaixo para criar um novo agendamento</p>
                        <button id="btn-novo-agendamento-dashboard" class="btn btn-sm btn-primary">
                            <i class="fas fa-plus-circle me-2"></i> Novo Agendamento
                        </button>
                    </div>
                `);
                
                // Evento para o botão de novo agendamento
                $('#btn-novo-agendamento-dashboard').on('click', function() {
                    showAgenda();
                    openModalAgendamento(null, null, dataHoje);
                });
            } else {
                // Ordenar agendamentos por horário
                const agendamentosOrdenados = [...response.agendamentos].sort((a, b) => {
                    return new Date(`${a.data}T${a.horario}`) - new Date(`${b.data}T${b.horario}`);
                });
                
                // Limitar a 5 agendamentos
                const agendamentosLimitados = agendamentosOrdenados.slice(0, 5);
                
                // Renderizar lista de agendamentos
                let html = '<div class="list-group list-group-flush">';
                
                agendamentosLimitados.forEach(agendamento => {
                    // Formatar horário
                    const horario = agendamento.horario.substring(0, 5); // HH:MM
                    
                    // Definir classe de status
                    let statusClass = 'bg-secondary';
                    let statusText = 'Pendente';
                    
                    if (agendamento.status === 'concluido') {
                        statusClass = 'bg-success';
                        statusText = 'Concluído';
                    } else if (agendamento.status === 'cancelado') {
                        statusClass = 'bg-danger';
                        statusText = 'Cancelado';
                    } else if (agendamento.status === 'em_andamento') {
                        statusClass = 'bg-primary';
                        statusText = 'Em Andamento';
                    } else if (agendamento.status === 'confirmado') {
                        statusClass = 'bg-info';
                        statusText = 'Confirmado';
                    }
                    
                    html += `
                        <a href="#" class="list-group-item list-group-item-action" onclick="showAgenda(); return false;">
                            <div class="d-flex w-100 justify-content-between align-items-center">
                                <div>
                                    <span class="fw-bold">${horario}</span> - 
                                    <span>${agendamento.cliente_nome}</span>
                                </div>
                                <span class="badge ${statusClass}">${statusText}</span>
                            </div>
                            <div class="d-flex justify-content-between align-items-center mt-2">
                                <small class="text-muted">
                                    <i class="fas fa-cut me-1"></i> ${agendamento.servico_nome} |
                                    <i class="fas fa-user me-1"></i> ${agendamento.barbeiro_nome}
                                </small>
                                <span class="text-primary">${formatCurrency(agendamento.valor || 0)}</span>
                            </div>
                        </a>
                    `;
                });
                
                html += '</div>';
                
                // Se houver mais agendamentos, adicionar botão para ver todos
                if (response.agendamentos.length > 5) {
                    html += `
                        <div class="text-center mt-3">
                            <button id="btn-ver-todos-agendamentos" class="btn btn-sm btn-outline-primary">
                                Ver todos (${response.agendamentos.length})
                            </button>
                        </div>
                    `;
                }
                
                $('#agendamentos-hoje-list').html(html);
                
                // Evento para o botão de ver todos
                $('#btn-ver-todos-agendamentos').on('click', function() {
                    showAgenda();
                });
            }
        },
        error: function(xhr) {
            $('#agendamentos-hoje-list').html(`
                <div class="alert alert-danger" role="alert">
                    Erro ao carregar agendamentos: ${xhr.responseJSON?.message || 'Erro desconhecido'}
                </div>
            `);
        }
    });
}

// Carregar produtos com estoque baixo
function loadProdutosEstoqueBaixo() {
    // Exibir loading
    $('#produtos-estoque-baixo-list').html('<div class="text-center my-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Carregando...</span></div></div>');
    
    // Fazer requisição AJAX
    $.ajax({
        url: '/api/produtos/estoque-baixo',
        type: 'GET',
        success: function(response) {
            if (response.produtos.length === 0) {
                // Exibir mensagem de lista vazia
                $('#produtos-estoque-baixo-list').html(`
                    <div class="text-center my-4">
                        <img src="/static/img/check-mark.svg" alt="Tudo certo" class="img-fluid mb-3" style="max-height: 120px;">
                        <h5>Estoque regularizado</h5>
                        <p class="text-muted">Não há produtos com estoque baixo</p>
                    </div>
                `);
            } else {
                // Limitar a 5 produtos
                const produtosLimitados = response.produtos.slice(0, 5);
                
                // Renderizar lista de produtos
                let html = '<div class="list-group list-group-flush">';
                
                produtosLimitados.forEach(produto => {
                    // Calcular percentual de estoque
                    const percentual = Math.round((produto.quantidade / produto.estoque_minimo) * 100);
                    
                    // Definir classe de percentual
                    let percentualClass = 'bg-danger';
                    if (percentual > 70) {
                        percentualClass = 'bg-warning';
                    }
                    
                    html += `
                        <a href="#" class="list-group-item list-group-item-action" onclick="showProdutos(); return false;">
                            <div class="d-flex w-100 justify-content-between align-items-center">
                                <h6 class="mb-1">${produto.nome}</h6>
                                <span class="badge bg-danger">Estoque Baixo</span>
                            </div>
                            <div class="d-flex justify-content-between align-items-center mt-2">
                                <div style="width: 70%">
                                    <div class="progress" style="height: 10px;">
                                        <div class="progress-bar ${percentualClass}" role="progressbar" style="width: ${percentual}%;" 
                                            aria-valuenow="${percentual}" aria-valuemin="0" aria-valuemax="100"></div>
                                    </div>
                                </div>
                                <small class="text-muted">
                                    ${produto.quantidade} / ${produto.estoque_minimo} unidades
                                </small>
                            </div>
                        </a>
                    `;
                });
                
                html += '</div>';
                
                // Se houver mais produtos, adicionar botão para ver todos
                if (response.produtos.length > 5) {
                    html += `
                        <div class="text-center mt-3">
                            <button id="btn-ver-todos-produtos" class="btn btn-sm btn-outline-primary">
                                Ver todos (${response.produtos.length})
                            </button>
                        </div>
                    `;
                }
                
                $('#produtos-estoque-baixo-list').html(html);
                
                // Evento para o botão de ver todos
                $('#btn-ver-todos-produtos').on('click', function() {
                    showProdutos();
                });
            }
        },
        error: function(xhr) {
            $('#produtos-estoque-baixo-list').html(`
                <div class="alert alert-danger" role="alert">
                    Erro ao carregar produtos: ${xhr.responseJSON?.message || 'Erro desconhecido'}
                </div>
            `);
        }
    });
}

// Utilitário: Formatar moeda
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

// Utilitário: Formatar data (YYYY-MM-DD)
function formatDate(date) {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();
    
    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;
    
    return [year, month, day].join('-');
}

// Iniciar dashboard quando documento estiver pronto
$(document).ready(function() {
    // Carregar dados do dashboard
    if ($('#dashboard-container').length > 0) {
        loadDashboardData();
    }
}); 