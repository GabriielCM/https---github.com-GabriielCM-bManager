/**
 * Funções para gerenciamento da agenda
 */

// URL base da API
const API_URL = '/api';

// Variáveis globais da agenda
let currentDate = new Date();  // Data selecionada atual
let currentMonth;              // Mês atual do calendário
let currentYear;               // Ano atual do calendário
let servicosSelecionados = []; // Lista de serviços selecionados para agendamento
let duracaoTotal = 0;          // Duração total em minutos dos serviços selecionados
let valorTotal = 0;            // Valor total dos serviços selecionados
let modoEdicao = false;        // Flag para saber se está editando um agendamento existente
let cliente_id_atual = null;   // Cliente selecionado

// IDs de seleções e elementos
const clienteSelect = '#cliente-select';
const barbeiroSelect = '#barbeiro-select';

// Inicializar a página da agenda
$(document).ready(function() {
    console.log('Página de agenda carregada');
    
    // Verificar se API está disponível (removido o teste para a raiz da API que não existe)
    
    // Inicializar calendário
    initCalendar();
    
    // Carregar agendamentos para hoje
    let hoje = formatDate(new Date());
    loadAgendamentosDia(hoje);
    loadProximosAgendamentos();
    
    // Configurar botões de navegação de datas
    $('#hoje-btn').on('click', function() {
        const hoje = new Date();
        loadAgendamentosDia(formatDate(hoje));
        highlightCalendarDay(formatDate(hoje));
    });
    
    $('#anterior-btn').on('click', function() {
        let data = parseDate(currentDate);
        data.setDate(data.getDate() - 1);
        loadAgendamentosDia(formatDate(data));
        highlightCalendarDay(formatDate(data));
    });
    
    $('#proximo-btn').on('click', function() {
        let data = parseDate(currentDate);
        data.setDate(data.getDate() + 1);
        loadAgendamentosDia(formatDate(data));
        highlightCalendarDay(formatDate(data));
    });
    
    // Configurar botão de novo agendamento
    console.log('Configurando botão de novo agendamento:', $('#agenda-novo-btn').length);
    $('#agenda-novo-btn, #agenda-novo-btn-empty').on('click', function() {
        console.log('Botão de novo agendamento clicado');
        openModalAgendamento();
    });
    
    // Carregar clientes e barbeiros
    loadClientesSelect();
    
    // Eventos do modal de agendamento
    $('#cliente-select').on('change', function() {
        cliente_id_atual = $(this).val();
        
        if (cliente_id_atual) {
            let dataAgendamento = $('#data-agendamento').val();
            let horaAgendamento = $('#hora-agendamento').val();
            
            if (dataAgendamento && horaAgendamento) {
                loadBarbeirosDisponiveis(dataAgendamento, horaAgendamento);
            }
        }
    });
    
    $('#data-agendamento, #hora-agendamento').on('change', function() {
        let dataAgendamento = $('#data-agendamento').val();
        let horaAgendamento = $('#hora-agendamento').val();
        
        if (dataAgendamento && horaAgendamento) {
            loadBarbeirosDisponiveis(dataAgendamento, horaAgendamento);
        }
    });
    
    // Carregar serviços ao abrir o modal
    $('#agendamentoModal').on('show.bs.modal', function() {
        loadServicosDisponiveis();
    });
    
    // Adicionar serviço à lista
    $('#btn-adicionar-servico').on('click', function() {
        const servicoSelect = $('#servico-select');
        const servicoId = servicoSelect.val();
        
        if (servicoId) {
            const servicoNome = $('#servico-select option:selected').text();
            const servicoPreco = $('#servico-select option:selected').data('preco');
            const servicoDuracao = $('#servico-select option:selected').data('duracao');
            
            adicionarServicoSelecionado(servicoId, servicoNome, servicoPreco, servicoDuracao);
            servicoSelect.val('');
        }
    });
    
    // Salvar agendamento
    $('#btn-salvar-agendamento').on('click', function() {
        salvarAgendamento();
    });
    
    // Abrir modal de novo cliente
    $('#btn-novo-cliente').on('click', function() {
        $('#novoClienteModal').modal('show');
    });
    
    // Salvar cliente rápido
    $('#btn-salvar-cliente-rapido').on('click', function() {
        salvarClienteRapido();
    });
    
    // Busca de agendamentos
    $('#agenda-busca-btn').on('click', function() {
        buscarAgendamentos();
    });
    
    $('#agenda-busca').on('keypress', function(e) {
        if (e.which == 13) {
            buscarAgendamentos();
        }
    });
    
    // Inicializar tooltips
    $('[data-bs-toggle="tooltip"]').tooltip();
});

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
    
    $('#current-month-btn').on('click', function() {
        const now = new Date();
        currentMonth = now.getMonth();
        currentYear = now.getFullYear();
        renderCalendar(currentMonth, currentYear);
        loadAgendamentosDia(formatDate(now));
    });
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
    const currentDay = today.getDate();
    
    // Dia selecionado inicialmente (hoje se for o mês atual, primeiro dia do mês se não for)
    let selectedDate;
    if (isCurrentMonth) {
        selectedDate = currentDay;
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
            if (isCurrentMonth && date === currentDay) {
                dayDiv.classList.add('today');
            }
            
            // Selecionar o dia inicial
            if (date === selectedDate && isCurrentMonth) {
                dayDiv.classList.add('active');
            }
            
            // Adicionar evento de clique
            dayDiv.addEventListener('click', function() {
                // Remover classe ativa de todos os dias
                document.querySelectorAll('.calendar-day').forEach(function(day) {
                    day.classList.remove('active');
                });
                
                // Adicionar classe ativa ao dia clicado
                this.classList.add('active');
                
                // Carregar agendamentos para o dia selecionado
                loadAgendamentosDia(this.dataset.date);
            });
            
            // Adicionar div do dia à célula
            cell.appendChild(dayDiv);
            
            date++;
        }
        
        // Adicionar célula ao calendário
        $('#calendar-days').append(cell);
    }
    
    // Verificar agendamentos para o mês atual para marcar dias com eventos
    checkAgendamentosDoMes(month, year);
}

// Verificar dias do mês com agendamentos
function checkAgendamentosDoMes(month, year) {
    // Formatar datas de início e fim do mês para a API
    const dataInicio = `${year}-${(month + 1).toString().padStart(2, '0')}-01`;
    const ultimoDia = new Date(year, month + 1, 0).getDate();
    const dataFim = `${year}-${(month + 1).toString().padStart(2, '0')}-${ultimoDia}`;
    
    // Fazer requisição AJAX para obter agendamentos do mês
    $.ajax({
        url: `${API_URL}/agendamentos?data_inicio=${dataInicio}&data_fim=${dataFim}`,
        type: 'GET',
        success: function(response) {
            if (response && response.items && response.items.length > 0) {
                // Criar um Map para armazenar quantidade de agendamentos por dia
                const diasComAgendamento = new Map();
                
                // Contar agendamentos por dia
                response.items.forEach(function(agendamento) {
                    const dataAgendamento = agendamento.data_hora_inicio.split('T')[0];
                    if (diasComAgendamento.has(dataAgendamento)) {
                        diasComAgendamento.set(dataAgendamento, diasComAgendamento.get(dataAgendamento) + 1);
                    } else {
                        diasComAgendamento.set(dataAgendamento, 1);
                    }
                });
                
                // Marcar dias com agendamentos no calendário
                diasComAgendamento.forEach(function(quantidade, data) {
                    const diaElement = document.querySelector(`.calendar-day[data-date="${data}"]`);
                    if (diaElement) {
                        diaElement.classList.add('has-events');
                        diaElement.setAttribute('title', `${quantidade} agendamento(s)`);
                        // Inicializar tooltip
                        new bootstrap.Tooltip(diaElement);
                    }
                });
            }
        }
    });
}

// Destacar dia no calendário
function highlightCalendarDay(dateString) {
    // Remover classe ativa de todos os dias
    document.querySelectorAll('.calendar-day').forEach(function(day) {
        day.classList.remove('active');
    });
    
    // Adicionar classe ativa ao dia correspondente à data
    const dayElement = document.querySelector(`.calendar-day[data-date="${dateString}"]`);
    if (dayElement) {
        dayElement.classList.add('active');
    }
}

// Carregar agendamentos para um dia específico
function loadAgendamentosDia(date) {
    currentDate = date;
    console.log('Carregando agendamentos para a data:', date);
    
    // Atualizar título com a data formatada
    $('#selected-date-display').text('Agendamentos do Dia: ' + formatDisplayDate(date));
    
    // Mostrar loader
    $('#agenda-loading').removeClass('d-none');
    $('#agenda-lista').html('');
    $('#agenda-empty').addClass('d-none');
    
    // Fazer requisição à API
    $.ajax({
        url: `${API_URL}/agendamentos/data/${date}`,
        type: 'GET',
        success: function(response) {
            console.log('Resposta da API:', response);
            $('#agenda-loading').addClass('d-none');
            
            if (response && response.length > 0) {
                renderizarAgendamentos(response);
                atualizarResumoDia(
                    response.length,
                    response.reduce((sum, agendamento) => {
                        return sum + agendamento.servicos.reduce((servSum, servico) => servSum + servico.preco, 0);
                    }, 0),
                    new Set(response.map(item => item.cliente_id)).size
                );
            } else {
                $('#agenda-empty').removeClass('d-none');
                atualizarResumoDia(0, 0, 0);
            }
        },
        error: function(xhr, status, error) {
            console.error('Erro ao carregar agendamentos:', xhr, status, error);
            $('#agenda-loading').addClass('d-none');
            $('#agenda-lista').html('<tr><td colspan="6" class="text-center text-danger">Erro ao carregar agendamentos. Tente novamente.</td></tr>');
            mostrarErroAPI('Erro ao carregar agendamentos. Verifique a conexão com o servidor.');
        }
    });
}

// Atualizar resumo do dia na UI
function atualizarResumoDia(totalAgendamentos, valorTotal, clientesUnicos) {
    const valorFormatado = formatarMoeda(valorTotal);
    
    $('#total-agendamentos').text(totalAgendamentos);
    $('#total-valor').text(valorFormatado);
    $('#total-clientes').text(clientesUnicos);
}

// Renderizar lista de agendamentos
function renderizarAgendamentos(agendamentos) {
    // Ordenar agendamentos por horário
    agendamentos.sort((a, b) => {
        return new Date(a.data_hora_inicio) - new Date(b.data_hora_inicio);
    });
    
    let html = '';
    
    agendamentos.forEach(function(agendamento) {
        const horaInicio = new Date(agendamento.data_hora_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const horaFim = new Date(agendamento.data_hora_fim).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const servicos = agendamento.servicos.map(s => s.nome).join(', ');
        
        // Definir classe CSS para status
        let statusClass = '';
        switch (agendamento.status) {
            case 'pendente': statusClass = 'status-pendente'; break;
            case 'concluido': statusClass = 'status-concluido'; break;
            case 'cancelado': statusClass = 'status-cancelado'; break;
            case 'em_andamento': statusClass = 'status-em-andamento'; break;
        }
        
        // Botões de ação com base no status
        let botoesAcao = '';
        
        if (agendamento.status === 'pendente') {
            botoesAcao = `
                <button class="btn btn-sm btn-outline-primary me-1" onclick="editarAgendamento(${agendamento.id})" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-success me-1" onclick="concluirAgendamento(${agendamento.id})" title="Concluir">
                    <i class="fas fa-check"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="cancelarAgendamento(${agendamento.id})" title="Cancelar">
                    <i class="fas fa-times"></i>
                </button>
            `;
        } else if (agendamento.status === 'em_andamento') {
            botoesAcao = `
                <button class="btn btn-sm btn-outline-success me-1" onclick="concluirAgendamento(${agendamento.id})" title="Concluir">
                    <i class="fas fa-check"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="cancelarAgendamento(${agendamento.id})" title="Cancelar">
                    <i class="fas fa-times"></i>
                </button>
            `;
        } else {
            botoesAcao = `
                <button class="btn btn-sm btn-outline-secondary" onclick="visualizarAgendamento(${agendamento.id})" title="Visualizar">
                    <i class="fas fa-eye"></i>
                </button>
            `;
        }
        
        html += `
            <tr>
                <td>${horaInicio} - ${horaFim}</td>
                <td>${agendamento.cliente_nome}</td>
                <td>${servicos}</td>
                <td>${agendamento.barbeiro_nome}</td>
                <td><span class="${statusClass}">${agendamento.status}</span></td>
                <td>${botoesAcao}</td>
            </tr>
        `;
    });
    
    $('#agenda-lista').html(html);
}

// Carregar próximos agendamentos
function loadProximosAgendamentos() {
    console.log('Carregando próximos agendamentos');
    
    // Mostrar loading
    $('#proximos-agenda').html('');
    $('#proximos-agenda-empty').addClass('d-none');
    $('#proximos-agenda-loading').removeClass('d-none');
    
    // Obter data atual formatada (YYYY-MM-DD)
    const hoje = formatDate(new Date());
    
    // Fazer requisição à API
    $.ajax({
        url: `${API_URL}/agendamentos?data_inicio=${hoje}&status=pendente&por_pagina=5`,
        type: 'GET',
        success: function(response) {
            console.log('Próximos agendamentos:', response);
            $('#proximos-agenda-loading').addClass('d-none');
            
            if (response && response.items && response.items.length > 0) {
                // Renderizar próximos agendamentos
                let html = '';
                
                response.items.forEach(agendamento => {
                    // Formatar data e hora
                    const dataHora = new Date(agendamento.data_hora_inicio);
                    const dataFormatada = dataHora.toLocaleDateString('pt-BR');
                    const horaFormatada = dataHora.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
                    
                    // Obter nome do serviço principal (primeiro)
                    let servicoNome = 'Sem serviço';
                    if (agendamento.servicos && agendamento.servicos.length > 0) {
                        servicoNome = agendamento.servicos[0].nome;
                        if (agendamento.servicos.length > 1) {
                            servicoNome += ` + ${agendamento.servicos.length - 1} serviço(s)`;
                        }
                    }
                    
                    html += `
                        <div class="agendamento-item" data-id="${agendamento.id}">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <div class="agendamento-horario">${dataFormatada} ${horaFormatada}</div>
                                    <div class="agendamento-cliente">${agendamento.cliente_nome}</div>
                                    <div class="small text-muted">${servicoNome}</div>
                                </div>
                                <button class="btn btn-sm btn-outline-primary" onclick="visualizarAgendamento(${agendamento.id})">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </div>
                        </div>
                    `;
                });
                
                $('#proximos-agenda').html(html);
            } else {
                $('#proximos-agenda-empty').removeClass('d-none');
            }
        },
        error: function(xhr, status, error) {
            console.error('Erro ao carregar próximos agendamentos:', xhr, status, error);
            $('#proximos-agenda-loading').addClass('d-none');
            $('#proximos-agenda').html('<div class="alert alert-danger">Erro ao carregar agendamentos futuros.</div>');
        }
    });
}

// Carregar barbeiros disponíveis para o horário selecionado
function loadBarbeirosDisponiveis(date, horario = '') {
    // Formatar horário para incluir na consulta se fornecido
    let url = `${API_URL}/barbeiros?disponivel=true`;
    
    if (date && horario) {
        // Formatar data e hora para enviar para a API
        const datetime = `${date}T${horario}`;
        url += `&data_hora=${datetime}`;
    }
    
    // Fazer requisição AJAX
    $.ajax({
        url: url,
        type: 'GET',
        success: function(response) {
            // Limpar select
            $(barbeiroSelect).empty();
            $(barbeiroSelect).append('<option value="">Selecione um barbeiro</option>');
            
            // Adicionar barbeiros disponíveis
            if (response && response.items && response.items.length > 0) {
                response.items.forEach(function(barbeiro) {
                    $(barbeiroSelect).append(`<option value="${barbeiro.id}">${barbeiro.nome}</option>`);
                });
            }
        }
    });
}

// Carregar lista de clientes
function loadClientesSelect() {
    $.ajax({
        url: `${API_URL}/clientes`,
        type: 'GET',
        success: function(response) {
            // Limpar select
            $(clienteSelect).empty();
            $(clienteSelect).append('<option value="">Selecione um cliente</option>');
            
            // Adicionar clientes
            if (response && response.items && response.items.length > 0) {
                response.items.forEach(function(cliente) {
                    $(clienteSelect).append(`<option value="${cliente.id}">${cliente.nome}</option>`);
                });
            }
        }
    });
}

// Abrir modal de agendamento
function openModalAgendamento(id = null, clienteId = null, dataString = null) {
    console.log('Abrindo modal de agendamento');
    
    // Limpar formulário
    $('#form-agendamento')[0].reset();
    $('#agendamento-id').val('');
    $('#servicos-selecionados').html('');
    $('#servicos-erro').addClass('d-none');
    
    // Resetar variáveis
    servicosSelecionados = [];
    duracaoTotal = 0;
    valorTotal = 0;
    $('#duracao-estimada').val('0');
    $('#valor-total').val('R$ 0,00');
    
    modoEdicao = false;
    
    // Atualizar título do modal
    $('#agendamentoModalLabel').text('Novo Agendamento');
    
    // Se for edição
    if (id) {
        console.log('Modo de edição, ID:', id);
        $('#agendamentoModalLabel').text('Editar Agendamento');
        $('#agendamento-id').val(id);
        modoEdicao = true;
        
        // Carregar dados do agendamento
        $.ajax({
            url: `${API_URL}/agendamentos/${id}`,
            type: 'GET',
            success: function(agendamento) {
                console.log('Dados do agendamento carregados:', agendamento);
                
                // Preencher campos
                $('#cliente-select').val(agendamento.cliente_id);
                $('#barbeiro-select').val(agendamento.barbeiro_id);
                
                // Formatar data e hora
                const dataHora = new Date(agendamento.data_hora_inicio);
                const data = dataHora.toISOString().split('T')[0];
                const hora = dataHora.toTimeString().slice(0, 5);
                
                $('#data-agendamento').val(data);
                $('#hora-agendamento').val(hora);
                $('#observacoes').val(agendamento.observacoes);
                
                // Adicionar serviços
                if (agendamento.servicos && agendamento.servicos.length > 0) {
                    agendamento.servicos.forEach(servico => {
                        adicionarServicoSelecionado(
                            servico.id,
                            servico.nome,
                            servico.preco,
                            servico.duracao_estimada_min
                        );
                    });
                }
            },
            error: function(xhr, status, error) {
                console.error('Erro ao carregar dados do agendamento:', xhr, status, error);
                mostrarNotificacao('Erro ao carregar dados do agendamento', 'danger');
            }
        });
    } else {
        // Se for novo agendamento, preencher com a data atual ou selecionada
        const hoje = new Date();
        const dataAgendamento = dataString ? new Date(dataString) : hoje;
        
        const dataFormatada = dataAgendamento.toISOString().split('T')[0];
        $('#data-agendamento').val(dataFormatada);
        
        // Horário padrão (9:00)
        $('#hora-agendamento').val('09:00');
        
        // Se foi informado um cliente, selecionar
        if (clienteId) {
            $('#cliente-select').val(clienteId);
        }
    }
    
    // Mostrar modal corretamente usando Bootstrap 5
    console.log("Modal element:", document.getElementById('agendamentoModal'));
    const modalElement = document.getElementById('agendamentoModal');
    
    if (modalElement) {
        try {
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
            console.log("Modal aberto com sucesso");
        } catch (error) {
            console.error("Erro ao abrir o modal:", error);
            alert("Erro ao abrir o modal. Verifique o console para mais detalhes.");
        }
    } else {
        console.error("Elemento do modal não encontrado!");
        alert("Elemento do modal não encontrado. Verifique se o ID está correto.");
    }
}

// Carregar lista de serviços
function loadServicosDisponiveis() {
    $.ajax({
        url: `${API_URL}/servicos`,
        type: 'GET',
        success: function(response) {
            // Limpar select
            $('#servico-select').empty();
            $('#servico-select').append('<option value="">Selecione um serviço para adicionar</option>');
            
            // Adicionar serviços
            if (response && response.items && response.items.length > 0) {
                response.items.forEach(function(servico) {
                    $('#servico-select').append(`
                        <option value="${servico.id}" 
                                data-preco="${servico.preco}" 
                                data-duracao="${servico.duracao_estimada_min}">
                            ${servico.nome}
                        </option>
                    `);
                });
            }
        }
    });
}

// Adicionar serviço à lista de selecionados
function adicionarServicoSelecionado(id, nome, preco, duracao) {
    // Verificar se o serviço já foi adicionado
    if (servicosSelecionados.find(s => s.id == id)) {
        return;
    }
    
    // Adicionar serviço à lista
    servicosSelecionados.push({
        id: id,
        nome: nome,
        preco: preco,
        duracao: duracao
    });
    
    // Atualizar duração e valor total
    duracaoTotal += parseInt(duracao);
    valorTotal += parseFloat(preco);
    
    // Atualizar campos
    $('#duracao-estimada').val(duracaoTotal);
    $('#valor-total').val(formatarMoeda(valorTotal));
    
    // Esconder erro se havia
    $('#servicos-erro').addClass('d-none');
    
    // Adicionar card do serviço à lista
    const servicoHtml = `
        <div class="servico-card" data-id="${id}">
            <div class="servico-info">
                <span class="servico-nome">${nome}</span>
                <span class="servico-preco">${formatarMoeda(preco)} | ${duracao} min</span>
            </div>
            <button type="button" class="btn-remover-servico" onclick="removerServicoSelecionado(${id})">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    $('#servicos-selecionados').append(servicoHtml);
}

// Remover serviço da lista de selecionados
function removerServicoSelecionado(id) {
    // Encontrar serviço na lista
    const servico = servicosSelecionados.find(s => s.id == id);
    if (!servico) return;
    
    // Atualizar duração e valor total
    duracaoTotal -= parseInt(servico.duracao);
    valorTotal -= parseFloat(servico.preco);
    
    // Atualizar campos
    $('#duracao-estimada').val(duracaoTotal);
    $('#valor-total').val(formatarMoeda(valorTotal));
    
    // Remover serviço da lista
    servicosSelecionados = servicosSelecionados.filter(s => s.id != id);
    
    // Remover card do serviço
    $(`.servico-card[data-id="${id}"]`).remove();
}

// Função para concluir um agendamento
function concluirAgendamento(id) {
    $('#confirmacao-titulo').text('Concluir Agendamento');
    $('#confirmacao-mensagem').text('Deseja marcar este agendamento como concluído?');
    $('#confirmacao-btn').removeClass('btn-danger').addClass('btn-success').text('Concluir');
    
    // Configurar ação do botão de confirmação
    $('#confirmacao-btn').off('click').on('click', function() {
        $.ajax({
            url: `${API_URL}/agendamentos/${id}/concluir`,
            type: 'POST',
            success: function() {
                $('#confirmacaoModal').modal('hide');
                loadAgendamentosDia(currentDate);
                loadProximosAgendamentos();
                mostrarNotificacao('Agendamento concluído com sucesso!', 'success');
            },
            error: function(xhr) {
                $('#confirmacaoModal').modal('hide');
                mostrarNotificacao('Erro ao concluir agendamento: ' + (xhr.responseJSON?.erro || 'Erro desconhecido'), 'danger');
            }
        });
    });
    
    $('#confirmacaoModal').modal('show');
}

// Função para cancelar um agendamento
function cancelarAgendamento(id) {
    $('#confirmacao-titulo').text('Cancelar Agendamento');
    $('#confirmacao-mensagem').text('Deseja realmente cancelar este agendamento?');
    $('#confirmacao-btn').removeClass('btn-success').addClass('btn-danger').text('Cancelar');
    
    // Configurar ação do botão de confirmação
    $('#confirmacao-btn').off('click').on('click', function() {
        $.ajax({
            url: `${API_URL}/agendamentos/${id}/cancelar`,
            type: 'POST',
            success: function() {
                $('#confirmacaoModal').modal('hide');
                loadAgendamentosDia(currentDate);
                loadProximosAgendamentos();
                mostrarNotificacao('Agendamento cancelado com sucesso!', 'success');
            },
            error: function(xhr) {
                $('#confirmacaoModal').modal('hide');
                mostrarNotificacao('Erro ao cancelar agendamento: ' + (xhr.responseJSON?.erro || 'Erro desconhecido'), 'danger');
            }
        });
    });
    
    $('#confirmacaoModal').modal('show');
}

// Visualizar agendamento
function visualizarAgendamento(id) {
    openModalAgendamento(id);
    
    // Desabilitar campos para visualização
    $('#cliente-select').prop('disabled', true);
    $('#barbeiro-select').prop('disabled', true);
    $('#data-agendamento').prop('disabled', true);
    $('#hora-agendamento').prop('disabled', true);
    $('#btn-adicionar-servico').prop('disabled', true);
    $('#btn-novo-cliente').prop('disabled', true);
    $('#observacoes').prop('disabled', true);
    $('.btn-remover-servico').prop('disabled', true);
    
    // Alterar botão salvar para fechar
    $('#btn-salvar-agendamento').text('Fechar').off('click').on('click', function() {
        $('#agendamentoModal').modal('hide');
    });
}

// Editar agendamento
function editarAgendamento(id) {
    openModalAgendamento(id);
}

// Formatar data para YYYY-MM-DD
function formatDate(date) {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();
    
    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;
    
    return [year, month, day].join('-');
}

// Converter string de data para Date
function parseDate(dateString) {
    if (typeof dateString === 'string') {
        return new Date(dateString);
    }
    return dateString;
}

// Formatar data para exibição (DD/MM/YYYY)
function formatDisplayDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
}

// Salvar agendamento
function salvarAgendamento() {
    // Validar formulário
    if (!validarFormularioAgendamento()) {
        return;
    }
    
    // Obter dados do formulário
    const clienteId = $('#cliente-select').val();
    const barbeiroId = $('#barbeiro-select').val();
    const data = $('#data-agendamento').val();
    const hora = $('#hora-agendamento').val();
    const observacoes = $('#observacoes').val();
    
    // Combinar data e hora
    const dataHoraInicio = `${data}T${hora}`;
    
    // Mapear serviços selecionados
    const servicos = servicosSelecionados.map(s => ({ servico_id: s.id }));
    
    // Construir payload
    const payload = {
        cliente_id: parseInt(clienteId),
        barbeiro_id: parseInt(barbeiroId),
        data_hora_inicio: dataHoraInicio,
        servicos: servicos,
        observacoes: observacoes
    };
    
    // ID do agendamento (se estiver editando)
    const agendamentoId = $('#agendamento-id').val();
    
    // URL e método da requisição
    let url = `${API_URL}/agendamentos`;
    let method = 'POST';
    
    if (agendamentoId) {
        url += `/${agendamentoId}`;
        method = 'PUT';
    }
    
    // Enviar requisição
    $.ajax({
        url: url,
        type: method,
        contentType: 'application/json',
        data: JSON.stringify(payload),
        success: function(response) {
            // Fechar modal
            $('#agendamentoModal').modal('hide');
            
            // Recarregar agendamentos
            loadAgendamentosDia(currentDate);
            loadProximosAgendamentos();
            
            // Notificar usuário
            if (agendamentoId) {
                mostrarNotificacao('Agendamento atualizado com sucesso!', 'success');
            } else {
                mostrarNotificacao('Agendamento criado com sucesso!', 'success');
            }
        },
        error: function(xhr) {
            let mensagem = 'Erro ao salvar agendamento';
            
            if (xhr.responseJSON && xhr.responseJSON.erro) {
                mensagem += ': ' + xhr.responseJSON.erro;
                
                // Tratar erros específicos
                if (xhr.responseJSON.erro.includes('disponível')) {
                    mostrarNotificacao('O horário selecionado não está disponível para este barbeiro', 'danger');
                    return;
                }
            }
            
            mostrarNotificacao(mensagem, 'danger');
        }
    });
}

// Validar formulário de agendamento
function validarFormularioAgendamento() {
    let valido = true;
    
    // Validar campos básicos
    if (!$('#cliente-select').val()) {
        mostrarNotificacao('Selecione um cliente', 'warning');
        valido = false;
    }
    
    if (!$('#barbeiro-select').val()) {
        mostrarNotificacao('Selecione um barbeiro', 'warning');
        valido = false;
    }
    
    if (!$('#data-agendamento').val()) {
        mostrarNotificacao('Selecione uma data', 'warning');
        valido = false;
    }
    
    if (!$('#hora-agendamento').val()) {
        mostrarNotificacao('Selecione um horário', 'warning');
        valido = false;
    }
    
    // Validar serviços
    if (servicosSelecionados.length === 0) {
        $('#servicos-erro').removeClass('d-none');
        mostrarNotificacao('Selecione pelo menos um serviço', 'warning');
        valido = false;
    }
    
    return valido;
}

// Mostrar notificação
function mostrarNotificacao(mensagem, tipo) {
    console.log(`Notificação: ${mensagem} (tipo: ${tipo})`);
    
    // Verificar se a função toast está disponível no escopo global
    if (typeof toast === 'function') {
        toast(mensagem, tipo);
    } else {
        // Fallback para alert se a função toast não estiver disponível
        alert(mensagem);
    }
}

// Salvar cliente rápido
function salvarClienteRapido() {
    // Validar formulário
    if (!$('#cliente-nome').val() || !$('#cliente-telefone').val()) {
        mostrarNotificacao('Preencha os campos obrigatórios', 'warning');
        return;
    }
    
    // Obter dados do formulário
    const nome = $('#cliente-nome').val();
    const telefone = $('#cliente-telefone').val();
    const email = $('#cliente-email').val();
    
    // Construir payload
    const payload = {
        nome: nome,
        telefone: telefone,
        email: email || null
    };
    
    // Enviar requisição
    $.ajax({
        url: `${API_URL}/clientes`,
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(payload),
        success: function(response) {
            // Fechar modal
            $('#novoClienteModal').modal('hide');
            
            // Recarregar select de clientes
            loadClientesSelect();
            
            // Selecionar o novo cliente (com timeout para garantir que os dados foram carregados)
            setTimeout(function() {
                $(clienteSelect).val(response.id);
                $(clienteSelect).trigger('change');
            }, 500);
            
            // Notificar usuário
            mostrarNotificacao('Cliente cadastrado com sucesso!', 'success');
        },
        error: function(xhr) {
            mostrarNotificacao('Erro ao cadastrar cliente: ' + (xhr.responseJSON?.erro || 'Erro desconhecido'), 'danger');
        }
    });
}

// Buscar agendamentos
function buscarAgendamentos() {
    const busca = $('#agenda-busca').val();
    
    if (!busca || busca.length < 3) {
        mostrarNotificacao('Digite pelo menos 3 caracteres para buscar', 'warning');
        return;
    }
    
    // Exibir loading
    $('#agenda-lista').html('');
    $('#agenda-loading').removeClass('d-none');
    $('#agenda-empty').addClass('d-none');
    
    // Fazer requisição AJAX
    $.ajax({
        url: `${API_URL}/agendamentos?busca=${encodeURIComponent(busca)}`,
        type: 'GET',
        success: function(response) {
            // Esconder loading
            $('#agenda-loading').addClass('d-none');
            
            if (!response || !response.items || response.items.length === 0) {
                // Exibir mensagem de lista vazia
                $('#agenda-empty').removeClass('d-none');
            } else {
                // Renderizar agendamentos
                renderizarAgendamentos(response.items);
                
                // Atualizar título
                $('#selected-date-display').text(`Resultados da busca: "${busca}"`);
            }
        },
        error: function() {
            // Esconder loading e exibir erro
            $('#agenda-loading').addClass('d-none');
            $('#agenda-lista').html(`
                <tr>
                    <td colspan="6" class="text-center text-danger">
                        <i class="fas fa-exclamation-circle me-2"></i>
                        Erro ao buscar agendamentos. Tente novamente.
                    </td>
                </tr>
            `);
        }
    });
}

// Formatar moeda
function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

// Função para mostrar erro global
function mostrarErroAPI(mensagem) {
    // Esconder loadings
    $('#agenda-loading').addClass('d-none');
    $('#proximos-agenda-loading').addClass('d-none');
    
    // Mostrar erro
    const alertaHtml = `
        <div class="alert alert-danger" role="alert">
            <h4 class="alert-heading">Erro de conexão!</h4>
            <p>${mensagem}</p>
            <hr>
            <p class="mb-0">Tente recarregar a página ou contacte o suporte técnico.</p>
        </div>
    `;
    
    $('#agenda-lista').html(`
        <tr>
            <td colspan="6" class="text-center">
                ${alertaHtml}
            </td>
        </tr>
    `);
    
    $('#proximos-agenda').html(alertaHtml);
    
    // Também mostrar uma notificação toast
    mostrarNotificacao(mensagem, 'danger');
} 