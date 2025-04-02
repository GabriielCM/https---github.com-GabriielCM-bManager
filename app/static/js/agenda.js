/**
 * Funções para gerenciamento da agenda
 */

// Variáveis globais da agenda
let currentMonth;
let currentYear;

// Referências aos IDs de cliente e barbeiro
const clienteSelect = '#cliente-select';
const barbeiroSelect = '#barbeiro-select';

// Inicializar calendário
function initCalendar() {
    // Definir mês e ano atual
    const now = new Date();
    currentMonth = now.getMonth();
    currentYear = now.getFullYear();
    
    // Renderizar calendário
    renderCalendar(currentMonth, currentYear);
    
    // Adicionar eventos para navegação entre meses
    $('#prev-month').on('click', function() {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        renderCalendar(currentMonth, currentYear);
    });
    
    $('#next-month').on('click', function() {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        renderCalendar(currentMonth, currentYear);
    });
    
    // Carregar agendamentos para o dia atual
    loadAgendamentosDia(formatDate(now));
}

// Renderizar calendário
function renderCalendar(month, year) {
    // Atualizar título do mês
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    $('#current-month').text(`${monthNames[month]} ${year}`);
    
    // Limpar dias do calendário
    $('#calendar-days').empty();
    
    // Determinar primeiro dia do mês
    const firstDay = new Date(year, month, 1).getDay();
    
    // Determinar número de dias no mês
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Número de células a criar (7 colunas * 6 linhas)
    const totalCells = 42;
    
    // Data atual para destacar
    const today = new Date();
    const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;
    const currentDate = today.getDate();
    
    // Dia selecionado inicialmente (hoje se for o mês atual, primeiro dia do mês se não for)
    let selectedDate;
    if (isCurrentMonth) {
        selectedDate = currentDate;
    } else {
        selectedDate = 1;
    }
    
    // Criar células
    let date = 1;
    for (let i = 0; i < totalCells; i++) {
        // Criar célula
        const cell = document.createElement('div');
        cell.classList.add('calendar-cell');
        
        // Se a célula pertence ao mês atual
        if (i >= firstDay && date <= daysInMonth) {
            const dateString = formatDate(new Date(year, month, date));
            
            // Criar div para o dia
            const dayDiv = document.createElement('div');
            dayDiv.classList.add('calendar-day');
            dayDiv.dataset.date = dateString;
            dayDiv.innerText = date;
            
            // Destacar hoje
            if (isCurrentMonth && date === currentDate) {
                dayDiv.classList.add('today');
            }
            
            // Selecionar o dia inicial
            if (date === selectedDate) {
                dayDiv.classList.add('active');
            }
            
            // Adicionar div do dia à célula
            cell.appendChild(dayDiv);
            
            date++;
        }
        
        // Adicionar célula ao calendário
        $('#calendar-days').append(cell);
    }
}

// Carregar agendamentos para um dia específico
function loadAgendamentosDia(date) {
    // Atualizar data selecionada
    currentDate = date;
    
    // Formatar data para exibição (DD/MM/YYYY)
    const displayDate = formatDisplayDate(date);
    $('#selected-date').text(displayDate);
    
    // Exibir loading
    $('#agendamentos-dia').html('<div class="text-center my-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Carregando...</span></div></div>');
    
    // Fazer requisição AJAX
    $.ajax({
        url: `${API_URL}/agendamentos/data/${date}`,
        type: 'GET',
        success: function(response) {
            if (!response || response.length === 0) {
                // Exibir mensagem de lista vazia
                $('#agendamentos-dia').html(`
                    <div class="text-center my-4">
                        <img src="/static/img/empty-calendar.svg" alt="Calendário vazio" class="img-fluid mb-3" style="max-height: 150px;">
                        <h5>Nenhum agendamento para este dia</h5>
                        <p class="text-muted">Clique no botão abaixo para criar um novo agendamento</p>
                        <button id="btn-novo-agendamento-empty" class="btn btn-primary">
                            <i class="fas fa-plus-circle me-2"></i> Novo Agendamento
                        </button>
                    </div>
                `);
                
                // Evento para o botão de novo agendamento
                $('#btn-novo-agendamento-empty').on('click', function() {
                    openModalAgendamento(null, null, date);
                });
                
                // Limpar resumo do dia
                $('#agendamentos-resumo').html(`
                    <div class="small-stat-item">
                        <div class="small-stat-info">
                            <h6 class="mb-0">0</h6>
                            <small class="text-muted">Agendamentos</small>
                        </div>
                    </div>
                    <div class="small-stat-item">
                        <div class="small-stat-info">
                            <h6 class="mb-0">R$ 0,00</h6>
                            <small class="text-muted">Valor Total</small>
                        </div>
                    </div>
                    <div class="small-stat-item">
                        <div class="small-stat-info">
                            <h6 class="mb-0">0</h6>
                            <small class="text-muted">Clientes</small>
                        </div>
                    </div>
                `);
            } else {
                // Atualizar resumo do dia
                const totalAgendamentos = response.length;
                const valorTotal = response.reduce((sum, a) => sum + (a.valor || 0), 0);
                const valorFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorTotal);
                
                // Contar clientes únicos
                const clientesUnicos = new Set(response.map(a => a.cliente_id)).size;
                
                $('#agendamentos-resumo').html(`
                    <div class="small-stat-item">
                        <div class="small-stat-info">
                            <h6 class="mb-0">${totalAgendamentos}</h6>
                            <small class="text-muted">Agendamentos</small>
                        </div>
                    </div>
                    <div class="small-stat-item">
                        <div class="small-stat-info">
                            <h6 class="mb-0">${valorFormatado}</h6>
                            <small class="text-muted">Valor Total</small>
                        </div>
                    </div>
                    <div class="small-stat-item">
                        <div class="small-stat-info">
                            <h6 class="mb-0">${clientesUnicos}</h6>
                            <small class="text-muted">Clientes</small>
                        </div>
                    </div>
                `);
                
                // Renderizar lista de agendamentos
                renderizarAgendamentos(response);
            }
        },
        error: function(xhr) {
            $('#agendamentos-dia').html(`
                <div class="alert alert-danger" role="alert">
                    <i class="fas fa-exclamation-circle me-2"></i>
                    Erro ao carregar agendamentos: ${xhr.responseJSON?.erro || 'Erro de comunicação com o servidor'}
                </div>
            `);
        }
    });
}

// Função para renderizar a lista de agendamentos
function renderizarAgendamentos(agendamentos) {
    let html = '<div class="table-responsive">';
    html += `
        <table class="table table-hover align-middle">
            <thead>
                <tr>
                    <th>Horário</th>
                    <th>Cliente</th>
                    <th>Barbeiro</th>
                    <th>Serviço</th>
                    <th>Status</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    agendamentos.forEach(agendamento => {
        const dataHora = new Date(agendamento.data_hora_inicio);
        const hora = dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        
        // Obter o primeiro serviço (se houver)
        let servico = 'N/A';
        if (agendamento.servicos && agendamento.servicos.length > 0) {
            servico = agendamento.servicos[0].nome;
            if (agendamento.servicos.length > 1) {
                servico += ` (+${agendamento.servicos.length - 1})`;
            }
        }
        
        // Verificar se é possível concluir ou cancelar
        let acoesBotoes = '';
        if (agendamento.status === 'agendado') {
            acoesBotoes = `
                <button class="btn btn-sm btn-outline-success me-1" onclick="concluirAgendamento(${agendamento.id})">
                    <i class="fas fa-check"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="cancelarAgendamento(${agendamento.id})">
                    <i class="fas fa-times"></i>
                </button>
            `;
        }
        
        html += `
            <tr>
                <td>${hora}</td>
                <td>${agendamento.cliente_nome || 'N/A'}</td>
                <td>${agendamento.barbeiro_nome || 'N/A'}</td>
                <td>${servico}</td>
                <td><span class="status-badge status-${agendamento.status}">${agendamento.status}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1 action-icon edit" data-id="${agendamento.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${acoesBotoes}
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    $('#agendamentos-dia').html(html);
}

// Carregar barbeiros disponíveis para um determinado dia/horário
function loadBarbeirosDisponiveis(date, horario = '') {
    // Exibir loading
    $(barbeiroSelect).html('<option value="">Carregando...</option>');
    
    // Parâmetros para a consulta de disponibilidade
    const params = {
        data: date
    };
    
    if (horario) {
        params.horario = horario;
    }
    
    // Transformar parâmetros em query string
    const queryString = Object.keys(params)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
        .join('&');
    
    // Fazer requisição AJAX
    $.ajax({
        url: `${API_URL}/agendamentos/disponibilidade?${queryString}`,
        type: 'GET',
        success: function(response) {
            $(barbeiroSelect).empty();
            $(barbeiroSelect).append('<option value="">Selecione o barbeiro</option>');
            
            if (response && response.length > 0) {
                response.forEach(barbeiro => {
                    $(barbeiroSelect).append(`<option value="${barbeiro.id}">${barbeiro.nome}</option>`);
                });
            } else {
                $(barbeiroSelect).append('<option value="" disabled>Nenhum barbeiro disponível</option>');
            }
        },
        error: function(xhr) {
            $(barbeiroSelect).html('<option value="">Erro ao carregar barbeiros</option>');
            console.error('Erro ao carregar barbeiros:', xhr.responseJSON?.erro || 'Erro desconhecido');
        }
    });
}

// Carregar lista de clientes
function loadClientesSelect() {
    // Exibir loading
    $(clienteSelect).html('<option value="">Carregando...</option>');
    
    // Fazer requisição AJAX
    $.ajax({
        url: `${API_URL}/clientes`,
        type: 'GET',
        success: function(response) {
            $(clienteSelect).empty();
            $(clienteSelect).append('<option value="">Selecione o cliente</option>');
            
            if (response.clientes && response.clientes.length > 0) {
                response.clientes.forEach(cliente => {
                    $(clienteSelect).append(`<option value="${cliente.id}">${cliente.nome}</option>`);
                });
            } else {
                $(clienteSelect).append('<option value="" disabled>Nenhum cliente cadastrado</option>');
            }
        },
        error: function(xhr) {
            $(clienteSelect).html('<option value="">Erro ao carregar clientes</option>');
            console.error('Erro ao carregar clientes:', xhr.responseJSON?.erro || 'Erro desconhecido');
        }
    });
}

// Abrir modal de agendamento (novo ou editar)
function openModalAgendamento(id = null, clienteId = null, data = null) {
    // Resetar formulário
    $('#form-agendamento')[0].reset();
    $('#agendamento-id').val('');
    $('#servicos-ids').val('');
    $('#servicos-selecionados').empty();
    $('#agendamento-error').addClass('d-none');
    
    // Definir título do modal
    $('#modal-agendamento-title').text(id ? 'Editar Agendamento' : 'Novo Agendamento');
    
    // Preencher data (se fornecida)
    if (data) {
        $('#agendamento-data').val(data);
    } else {
        // Usar a data atual por padrão
        const today = new Date().toISOString().split('T')[0];
        $('#agendamento-data').val(today);
    }
    
    // Carregar listas de clientes, barbeiros e serviços
    loadClientesSelect();
    loadBarbeirosDisponiveis($('#agendamento-data').val(), $('#agendamento-horario').val());
    loadServicosDisponiveis();
    
    // Preencher cliente (se fornecido)
    if (clienteId) {
        $(clienteSelect).val(clienteId);
    }
    
    // Abrir o modal
    const modal = new bootstrap.Modal(document.getElementById('modal-agendamento'));
    modal.show();
    
    // Se for edição, carregar dados do agendamento
    if (id) {
        // Mostrar loading
        $('#modal-agendamento .modal-body').append('<div class="text-center my-3" id="loading-agendamento"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Carregando...</span></div></div>');
        
        // Fazer requisição AJAX
        $.ajax({
            url: `${API_URL}/agendamentos/${id}`,
            type: 'GET',
            success: function(response) {
                // Preencher campos do formulário
                $('#agendamento-id').val(response.id);
                
                // Extrair data e hora
                const dataHora = new Date(response.data_hora_inicio);
                const data = dataHora.toISOString().split('T')[0];
                const hora = dataHora.toTimeString().slice(0, 5);
                
                $('#agendamento-data').val(data);
                $('#agendamento-horario').val(hora);
                $(clienteSelect).val(response.cliente_id);
                $(barbeiroSelect).val(response.barbeiro_id);
                $('#agendamento-observacoes').val(response.observacoes);
                
                // Preencher serviços selecionados
                if (response.servicos && response.servicos.length > 0) {
                    const servicosIds = response.servicos.map(s => s.id);
                    $('#servicos-ids').val(servicosIds.join(','));
                    
                    // Atualizar UI de serviços selecionados
                    response.servicos.forEach(servico => {
                        adicionarServicoSelecionado(servico.id, servico.nome, servico.preco);
                    });
                    
                    // Atualizar valor total
                    atualizarValorTotal();
                }
                
                // Remover loading
                $('#loading-agendamento').remove();
            },
            error: function(xhr) {
                // Remover loading
                $('#loading-agendamento').remove();
                
                // Mostrar erro
                $('#agendamento-error').text(xhr.responseJSON?.erro || 'Erro ao carregar dados do agendamento').removeClass('d-none');
            }
        });
    }
}

// Carregar serviços disponíveis
function loadServicosDisponiveis() {
    // Exibir loading
    $('#servicos-disponiveis').html('<div class="text-center my-3"><div class="spinner-border spinner-border-sm text-primary" role="status"><span class="visually-hidden">Carregando...</span></div></div>');
    
    // Fazer requisição AJAX
    $.ajax({
        url: `${API_URL}/servicos`,
        type: 'GET',
        success: function(response) {
            // Limpar área de serviços
            $('#servicos-disponiveis').empty();
            
            if (!response || response.length === 0) {
                $('#servicos-disponiveis').html('<p class="text-muted">Nenhum serviço cadastrado</p>');
                return;
            }
            
            // Criar lista de serviços
            response.forEach(servico => {
                const servicoHtml = `
                    <div class="servico-item" data-id="${servico.id}" data-nome="${servico.nome}" data-preco="${servico.preco}">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <span class="fw-bold">${servico.nome}</span>
                                <br>
                                <small class="text-muted">${servico.duracao_estimada_min} min</small>
                            </div>
                            <div>
                                <span class="badge bg-primary">${formatarMoeda(servico.preco)}</span>
                                <button type="button" class="btn btn-sm btn-outline-primary ms-2 btn-add-servico">
                                    <i class="fas fa-plus"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                
                $('#servicos-disponiveis').append(servicoHtml);
            });
            
            // Adicionar evento para botões de adicionar serviço
            $('.btn-add-servico').on('click', function() {
                const servicoItem = $(this).closest('.servico-item');
                const id = servicoItem.data('id');
                const nome = servicoItem.data('nome');
                const preco = servicoItem.data('preco');
                
                // Verificar se o serviço já está selecionado
                if ($(`#servico-selecionado-${id}`).length > 0) {
                    return;
                }
                
                adicionarServicoSelecionado(id, nome, preco);
                atualizarValorTotal();
            });
        },
        error: function(xhr) {
            $('#servicos-disponiveis').html(`<p class="text-danger">Erro ao carregar serviços: ${xhr.responseJSON?.erro || 'Erro desconhecido'}</p>`);
        }
    });
}

// Adicionar serviço à lista de selecionados
function adicionarServicoSelecionado(id, nome, preco) {
    // Criar HTML do serviço selecionado
    const servicoHtml = `
        <div class="servico-selecionado" id="servico-selecionado-${id}" data-id="${id}" data-preco="${preco}">
            <div class="d-flex justify-content-between align-items-center">
                <span>${nome}</span>
                <div>
                    <span class="badge bg-primary">${formatarMoeda(preco)}</span>
                    <button type="button" class="btn btn-sm btn-outline-danger ms-2 btn-remove-servico">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Adicionar à lista de serviços selecionados
    $('#servicos-selecionados').append(servicoHtml);
    
    // Atualizar campo hidden com IDs dos serviços
    const servicosIds = $('#servicos-ids').val();
    const idsArray = servicosIds ? servicosIds.split(',') : [];
    idsArray.push(id);
    $('#servicos-ids').val(idsArray.join(','));
    
    // Adicionar evento para remover serviço
    $(`#servico-selecionado-${id} .btn-remove-servico`).on('click', function() {
        $(this).closest('.servico-selecionado').remove();
        
        // Atualizar campo hidden
        const servicosIds = $('#servicos-ids').val();
        const idsArray = servicosIds.split(',');
        const index = idsArray.indexOf(id.toString());
        if (index > -1) {
            idsArray.splice(index, 1);
        }
        $('#servicos-ids').val(idsArray.join(','));
        
        // Atualizar valor total
        atualizarValorTotal();
    });
}

// Atualizar valor total do agendamento
function atualizarValorTotal() {
    let total = 0;
    
    // Somar preço de todos os serviços selecionados
    $('.servico-selecionado').each(function() {
        total += parseFloat($(this).data('preco'));
    });
    
    // Atualizar valor total
    $('#valor-total').text(formatarMoeda(total));
}

// Formatar valor como moeda
function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

// Função para concluir um agendamento
function concluirAgendamento(id) {
    if (!confirm('Deseja marcar este agendamento como concluído?')) {
        return;
    }
    
    $.ajax({
        url: `${API_URL}/agendamentos/${id}/concluir`,
        type: 'POST',
        success: function(response) {
            // Recarregar agendamentos
            loadAgendamentosDia(currentDate);
            
            // Mostrar mensagem de sucesso
            showAlert('success', 'Agendamento concluído com sucesso!');
        },
        error: function(xhr) {
            showAlert('danger', `Erro ao concluir agendamento: ${xhr.responseJSON?.erro || 'Erro desconhecido'}`);
        }
    });
}

// Função para cancelar um agendamento
function cancelarAgendamento(id) {
    if (!confirm('Deseja cancelar este agendamento?')) {
        return;
    }
    
    $.ajax({
        url: `${API_URL}/agendamentos/${id}/cancelar`,
        type: 'POST',
        success: function(response) {
            // Recarregar agendamentos
            loadAgendamentosDia(currentDate);
            
            // Mostrar mensagem de sucesso
            showAlert('success', 'Agendamento cancelado com sucesso!');
        },
        error: function(xhr) {
            showAlert('danger', `Erro ao cancelar agendamento: ${xhr.responseJSON?.erro || 'Erro desconhecido'}`);
        }
    });
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

// Utilitário: Formatar data de exibição (DD/MM/YYYY)
function formatDisplayDate(dateString) {
    const parts = dateString.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// Função para salvar agendamento (criar ou atualizar)
function salvarAgendamento() {
    // Validar formulário
    if (!validarFormulario('#form-agendamento')) {
        return;
    }
    
    // Obter dados do formulário
    const id = $('#agendamento-id').val();
    const clienteId = $(clienteSelect).val();
    const barbeiroId = $(barbeiroSelect).val();
    const data = $('#agendamento-data').val();
    const horario = $('#agendamento-horario').val();
    const dataHoraInicio = `${data}T${horario}:00`;
    const servicosIds = $('#servicos-ids').val().split(',').filter(id => id !== '');
    const observacoes = $('#agendamento-observacoes').val();
    
    // Verificar se pelo menos um serviço foi selecionado
    if (servicosIds.length === 0) {
        $('#agendamento-error').text('Selecione pelo menos um serviço').removeClass('d-none');
        return;
    }
    
    // Transformar serviços em formato de API
    const servicos = servicosIds.map(servico_id => ({ servico_id: parseInt(servico_id) }));
    
    // Dados para enviar à API
    const dadosAgendamento = {
        cliente_id: parseInt(clienteId),
        barbeiro_id: parseInt(barbeiroId),
        data_hora_inicio: dataHoraInicio,
        servicos,
        observacoes
    };
    
    // URL e método da requisição (POST para criar, PUT para atualizar)
    let url = `${API_URL}/agendamentos`;
    let method = 'POST';
    
    if (id) {
        url += `/${id}`;
        method = 'PUT';
    }
    
    // Mostrar loading
    $('#btn-salvar-agendamento').prop('disabled', true).html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Salvando...');
    
    // Fazer requisição AJAX
    $.ajax({
        url,
        type: method,
        contentType: 'application/json',
        data: JSON.stringify(dadosAgendamento),
        success: function(response) {
            // Fechar modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('modal-agendamento'));
            modal.hide();
            
            // Atualizar lista de agendamentos
            loadAgendamentosDia(data);
            
            // Mostrar mensagem de sucesso
            showAlert('success', id ? 'Agendamento atualizado com sucesso!' : 'Agendamento criado com sucesso!');
        },
        error: function(xhr) {
            let erro = "Erro ao salvar agendamento";
            if (xhr.responseJSON && xhr.responseJSON.erro) {
                erro = xhr.responseJSON.erro;
                if (xhr.responseJSON.detalhes) {
                    erro += `: ${JSON.stringify(xhr.responseJSON.detalhes)}`;
                }
            }
            $('#agendamento-error').text(erro).removeClass('d-none');
        },
        complete: function() {
            $('#btn-salvar-agendamento').prop('disabled', false).html('Salvar');
        }
    });
}

// Eventos
$(document).ready(function() {
    // Evento para salvar agendamento
    $('#btn-salvar-agendamento').on('click', function() {
        salvarAgendamento();
    });
    
    // Eventos para atualizar barbeiros disponíveis quando mudar data ou horário
    $('#agendamento-data, #agendamento-horario').on('change', function() {
        const data = $('#agendamento-data').val();
        const horario = $('#agendamento-horario').val();
        if (data && horario) {
            loadBarbeirosDisponiveis(data, horario);
        }
    });
    
    // Adicionar evento de clique nos dias do calendário
    $(document).on('click', '.calendar-day', function() {
        $('.calendar-day').removeClass('active');
        $(this).addClass('active');
        
        const date = $(this).data('date');
        loadAgendamentosDia(date);
    });
    
    // Evento para novo agendamento
    $(document).on('click', '#btn-novo-agendamento, #btn-novo-agendamento-empty', function() {
        openModalAgendamento(null, null, currentDate);
    });
    
    // Evento para editar agendamento
    $(document).on('click', '.action-icon.edit', function() {
        const id = $(this).data('id');
        openModalAgendamento(id);
    });
    
    // Máscara para horário se o plugin estiver disponível
    if ($.fn.mask) {
        $('#agendamento-horario').mask('00:00');
    }
});

// Carregar barbeiros disponíveis com base na data e horário selecionados
function carregarBarbeirosDisponiveis() {
    const data = $('#agendamento-data').val();
    const horario = $('#agendamento-horario').val();
    
    if (!data || !horario) {
        return;
    }
    
    // Chamar a função loadBarbeirosDisponiveis com os parâmetros obtidos
    loadBarbeirosDisponiveis(data, horario);
} 