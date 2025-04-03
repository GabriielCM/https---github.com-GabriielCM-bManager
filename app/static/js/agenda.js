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
        dataType: 'json',
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
            
            if (xhr.status === 401 || xhr.status === 403) {
                // Erro de autenticação
                $('#agenda-lista').html('<tr><td colspan="6" class="text-center text-danger">Erro de autenticação. Faça login novamente.</td></tr>');
                verificarAutenticacao();
            } else if (xhr.responseText && xhr.responseText.indexOf('<!doctype') >= 0) {
                // Resposta HTML em vez de JSON
                $('#agenda-lista').html('<tr><td colspan="6" class="text-center text-danger">Erro: API retornou HTML em vez de JSON. Verifique a configuração do servidor.</td></tr>');
                console.error('Resposta HTML recebida:', xhr.responseText.substring(0, 100) + '...');
            } else {
                $('#agenda-lista').html('<tr><td colspan="6" class="text-center text-danger">Erro ao carregar agendamentos. Tente novamente.</td></tr>');
            }
            
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
        dataType: 'json',
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
            
            if (xhr.status === 401 || xhr.status === 403) {
                // Erro de autenticação
                $('#proximos-agenda').html('<div class="alert alert-danger">Erro de autenticação. Faça login novamente.</div>');
                verificarAutenticacao();
            } else if (xhr.responseText && xhr.responseText.indexOf('<!doctype') >= 0) {
                // Resposta HTML em vez de JSON
                $('#proximos-agenda').html('<div class="alert alert-danger">Erro: API retornou HTML em vez de JSON. Verifique a configuração do servidor.</div>');
                console.error('Resposta HTML recebida:', xhr.responseText.substring(0, 100) + '...');
            } else {
                $('#proximos-agenda').html('<div class="alert alert-danger">Erro ao carregar agendamentos futuros.</div>');
            }
        }
    });
}

// Carregar barbeiros disponíveis para o horário selecionado
function loadBarbeirosDisponiveis(date, horario = '', callback = null) {
    console.log('Carregando barbeiros disponíveis para:', date, horario);
    
    const barbeiroSelect = $('#barbeiro-select');
    
    // Limpar e adicionar opção padrão
    barbeiroSelect.empty();
    barbeiroSelect.append('<option value="">Selecione um barbeiro</option>');
    
    // Mostrar loader no select enquanto carrega
    barbeiroSelect.prop('disabled', true);
    
    // Se data ou horário não forem fornecidos, carregar todos os barbeiros
    if (!date || !horario) {
        // Obter token JWT
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        
        // Carregar todos os barbeiros
        $.ajax({
            url: `${API_URL}/barbeiros`,
            method: 'GET',
            headers: headers,
            timeout: 10000,
            success: function(response) {
                handleBarbeirosResponse(response, barbeiroSelect, callback);
            },
            error: function(xhr, status, error) {
                handleBarbeirosError(xhr, status, error, barbeiroSelect, callback);
            }
        });
        return;
    }
    
    // Parâmetros para a consulta
    let params = `data=${date}&hora=${horario}`;
    
    // Obter token JWT
    const token = localStorage.getItem('token');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    
    // Fazer a requisição à API usando o endpoint específico para barbeiros disponíveis
    $.ajax({
        url: `${API_URL}/barbeiros/disponiveis?${params}`,
        method: 'GET',
        headers: headers,
        timeout: 10000, // 10 segundos de timeout
        success: function(response) {
            handleBarbeirosResponse(response, barbeiroSelect, callback);
        },
        error: function(xhr, status, error) {
            handleBarbeirosError(xhr, status, error, barbeiroSelect, callback);
        }
    });
}

// Função auxiliar para processar a resposta do servidor
function handleBarbeirosResponse(response, barbeiroSelect, callback) {
    console.log('Barbeiros disponíveis carregados:', response);
    
    // Habilitar select
    barbeiroSelect.prop('disabled', false);
    
    // Adicionar opções ao select
    if (response && response.length > 0) {
        response.forEach(barbeiro => {
            // Criar texto informativo com especialidades (se houver)
            let infoTexto = '';
            if (barbeiro.especialidades && barbeiro.especialidades.length > 0) {
                infoTexto = ` - ${barbeiro.especialidades.join(', ')}`;
            }
            
            // Adicionar opção ao select
            barbeiroSelect.append(
                `<option value="${barbeiro.id}" 
                  data-email="${barbeiro.email || ''}" 
                  data-telefone="${barbeiro.telefone || ''}"
                  data-agendamentos="${barbeiro.agendamentos_hoje || 0}"
                  ${!barbeiro.disponivel ? 'disabled' : ''}>
                  ${barbeiro.nome}${infoTexto}
                </option>`
            );
        });
        
        // Se for apenas um barbeiro, seleciona-o automaticamente
        if (response.length === 1) {
            barbeiroSelect.val(response[0].id);
            // Disparar evento de mudança para atualizar campos dependentes
            barbeiroSelect.trigger('change');
        }
    } else {
        barbeiroSelect.append('<option value="" disabled>Nenhum barbeiro disponível para este horário</option>');
        // Mostrar mensagem amigável ao usuário
        mostrarNotificacao('Não há barbeiros disponíveis para este horário. Por favor, escolha outro horário.', 'warning');
    }
    
    // Executar callback se fornecido
    if (typeof callback === 'function') {
        callback();
    }
}

// Função auxiliar para processar erros
function handleBarbeirosError(xhr, status, error, barbeiroSelect, callback) {
    // Habilitar select
    barbeiroSelect.prop('disabled', false);
    
    console.error('Erro ao carregar barbeiros:', xhr.responseText);
    barbeiroSelect.append('<option value="" disabled>Erro ao carregar barbeiros</option>');
    
    // Extrair mensagem de erro da resposta (se possível)
    let mensagemErro = 'Erro ao carregar barbeiros disponíveis.';
    try {
        if (xhr.responseJSON && xhr.responseJSON.erro) {
            mensagemErro = xhr.responseJSON.erro;
        } else if (xhr.responseText) {
            const response = JSON.parse(xhr.responseText);
            if (response.erro) mensagemErro = response.erro;
        }
    } catch (e) {
        // Se falhar ao parsear JSON, usar mensagem padrão
    }
    
    // Mostrar erro apenas se não for 404 (recurso não encontrado)
    if (xhr.status !== 404) {
        mostrarNotificacao(mensagemErro, 'error');
    }
    
    // Executar callback se fornecido
    if (typeof callback === 'function') {
        callback();
    }
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
    console.log('Abrindo modal de agendamento:', { id, clienteId, dataString });
    
    // Resetar o formulário e as listas
    $('#agendamentoForm')[0].reset();
    servicosSelecionados = [];
    duracaoTotal = 0;
    valorTotal = 0;
    $('#servicos-selecionados').empty();
    $('#resumo-duracao').text('0 minutos');
    $('#resumo-valor').text('R$ 0,00');
    $('.is-invalid').removeClass('is-invalid');
    $('.alert-danger').addClass('d-none');
    
    // Definir o título do modal
    if (id) {
        $('#agendamentoModalLabel').text('Editar Agendamento');
        modoEdicao = true;
        $('#agendamentoModal').data('agendamento-id', id);
    } else {
        $('#agendamentoModalLabel').text('Novo Agendamento');
        modoEdicao = false;
        $('#agendamentoModal').removeData('agendamento-id');
    }
    
    // Se for fornecida uma data, preencher o campo
    if (dataString) {
        const data = parseDate(dataString);
        $('#data-agendamento').val(formatDate(data));
        
        // Definir horário padrão como agora (arredondado para próximos 30 minutos)
        const agora = new Date();
        const minutos = Math.ceil(agora.getMinutes() / 30) * 30;
        agora.setMinutes(minutos, 0, 0);
        
        const horas = agora.getHours().toString().padStart(2, '0');
        const mins = agora.getMinutes().toString().padStart(2, '0');
        $('#hora-agendamento').val(`${horas}:${mins}`);
    } else {
        // Definir data padrão como hoje
        const hoje = new Date();
        $('#data-agendamento').val(formatDate(hoje));
        
        // Definir horário padrão como agora (arredondado para próximos 30 minutos)
        const minutos = Math.ceil(hoje.getMinutes() / 30) * 30;
        hoje.setMinutes(minutos, 0, 0);
        
        const horas = hoje.getHours().toString().padStart(2, '0');
        const mins = hoje.getMinutes().toString().padStart(2, '0');
        $('#hora-agendamento').val(`${horas}:${mins}`);
    }
    
    // Se for fornecido um ID de cliente, selecionar
    if (clienteId) {
        $('#cliente-select').val(clienteId);
    }
    
    // Carregar os barbeiros disponíveis
    loadBarbeirosDisponiveis($('#data-agendamento').val(), $('#hora-agendamento').val());
    
    // Se estiver editando, carregar os dados do agendamento
    if (id) {
        // Mostrar loader
        const modalBody = $('#agendamentoModal .modal-body');
        modalBody.append('<div id="loading-agendamento" class="text-center py-4"><div class="spinner-border text-primary" role="status"></div><p class="mt-2">Carregando dados do agendamento...</p></div>');
        
        // Obter o token JWT
        const token = localStorage.getItem('token');
        
        // Fazer a requisição à API
        $.ajax({
            url: `${API_URL}/agendamentos/${id}`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            success: function(response) {
                console.log('Dados do agendamento carregados:', response);
                
                // Preencher o formulário
                $('#cliente-select').val(response.cliente_id);
                
                // Formatar a data e hora
                const dataHora = new Date(response.data_hora_inicio);
                const data = formatDate(dataHora);
                
                const horas = dataHora.getHours().toString().padStart(2, '0');
                const minutos = dataHora.getMinutes().toString().padStart(2, '0');
                const hora = `${horas}:${minutos}`;
                
                $('#data-agendamento').val(data);
                $('#hora-agendamento').val(hora);
                $('#observacoes-agendamento').val(response.observacoes);
                
                // Carregar barbeiros antes de selecionar
                loadBarbeirosDisponiveis(data, hora, function() {
                    $('#barbeiro-select').val(response.barbeiro_id);
                });
                
                // Adicionar serviços
                if (response.servicos && response.servicos.length > 0) {
                    for (const servico of response.servicos) {
                        adicionarServicoSelecionado(
                            servico.id,
                            servico.nome,
                            servico.preco,
                            servico.duracao_estimada_min
                        );
                    }
                }
            },
            error: function(xhr, status, error) {
                console.error('Erro ao carregar agendamento:', xhr.responseText);
                mostrarNotificacao('Erro ao carregar dados do agendamento', 'error');
            },
            complete: function() {
                // Remover loader
                $('#loading-agendamento').remove();
            }
        });
    }
    
    // Abrir o modal
    const modal = new bootstrap.Modal(document.getElementById('agendamentoModal'));
    modal.show();
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
    console.log('Concluindo agendamento ID:', id);
    
    // Verificar autenticação
    if (!verificarAutenticacao()) {
        return;
    }
    
    // Confirmar antes de concluir
    $('#confirmacao-titulo').text('Concluir Agendamento');
    $('#confirmacao-mensagem').text('Tem certeza que deseja marcar este agendamento como concluído?');
    $('#confirmacao-btn').removeClass('btn-danger').addClass('btn-success').text('Concluir');
    
    // Configurar ação de confirmação
    $('#confirmacao-btn').off('click').on('click', function() {
        // Fechar modal de confirmação
        $('#confirmacaoModal').modal('hide');
        
        // Obter token
        const token = localStorage.getItem('token');
        
        // Fazer requisição à API
        $.ajax({
            url: `${API_URL}/agendamentos/${id}/concluir`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            contentType: 'application/json',
            data: JSON.stringify({}),
            success: function(response) {
                console.log('Agendamento concluído com sucesso:', response);
                
                // Atualizar lista de agendamentos
                loadAgendamentosDia(currentDate);
                loadProximosAgendamentos();
                
                // Mostrar notificação de sucesso
                mostrarNotificacao(response.mensagem || 'Agendamento concluído com sucesso!', 'success');
            },
            error: function(xhr, status, error) {
                console.error('Erro ao concluir agendamento:', xhr.responseText);
                
                // Verificar se é erro de autenticação
                if (handleAuthError(xhr)) {
                    return;
                }
                
                let mensagemErro = 'Erro ao concluir agendamento.';
                
                try {
                    const resposta = JSON.parse(xhr.responseText);
                    if (resposta.erro) {
                        mensagemErro = resposta.erro;
                    }
                } catch (e) {
                    // Se não conseguir parsear, usar mensagem genérica
                }
                
                mostrarNotificacao(mensagemErro, 'error');
            }
        });
    });
    
    // Mostrar modal de confirmação
    const modal = new bootstrap.Modal(document.getElementById('confirmacaoModal'));
    modal.show();
}

// Função para cancelar um agendamento
function cancelarAgendamento(id) {
    console.log('Cancelando agendamento ID:', id);
    
    // Verificar autenticação
    if (!verificarAutenticacao()) {
        return;
    }
    
    // Confirmar antes de cancelar
    $('#confirmacao-titulo').text('Cancelar Agendamento');
    $('#confirmacao-mensagem').text('Tem certeza que deseja cancelar este agendamento? Esta ação não pode ser desfeita.');
    $('#confirmacao-btn').removeClass('btn-success').addClass('btn-danger').text('Cancelar');
    
    // Configurar ação de confirmação
    $('#confirmacao-btn').off('click').on('click', function() {
        // Fechar modal de confirmação
        $('#confirmacaoModal').modal('hide');
        
        // Obter token
        const token = localStorage.getItem('token');
        
        // Fazer requisição à API
        $.ajax({
            url: `${API_URL}/agendamentos/${id}/cancelar`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            contentType: 'application/json',
            data: JSON.stringify({
                motivo: 'Cancelado pelo usuário'
            }),
            success: function(response) {
                console.log('Agendamento cancelado com sucesso:', response);
                
                // Atualizar lista de agendamentos
                loadAgendamentosDia(currentDate);
                loadProximosAgendamentos();
                
                // Mostrar notificação de sucesso
                mostrarNotificacao(response.mensagem || 'Agendamento cancelado com sucesso!', 'success');
            },
            error: function(xhr, status, error) {
                console.error('Erro ao cancelar agendamento:', xhr.responseText);
                
                // Verificar se é erro de autenticação
                if (handleAuthError(xhr)) {
                    return;
                }
                
                let mensagemErro = 'Erro ao cancelar agendamento.';
                
                try {
                    const resposta = JSON.parse(xhr.responseText);
                    if (resposta.erro) {
                        mensagemErro = resposta.erro;
                    }
                } catch (e) {
                    // Se não conseguir parsear, usar mensagem genérica
                }
                
                mostrarNotificacao(mensagemErro, 'error');
            }
        });
    });
    
    // Mostrar modal de confirmação
    const modal = new bootstrap.Modal(document.getElementById('confirmacaoModal'));
    modal.show();
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
    console.log('Salvando agendamento...');
    
    // Validar formulário
    if (!validarFormularioAgendamento()) {
        return;
    }
    
    // Obter os dados do formulário
    const clienteId = $('#cliente-select').val();
    const barbeiroId = $('#barbeiro-select').val();
    const dataAgendamento = $('#data-agendamento').val();
    const horaAgendamento = $('#hora-agendamento').val();
    const observacoes = $('#observacoes-agendamento').val();
    
    // Verificar se há serviços selecionados
    if (servicosSelecionados.length === 0) {
        mostrarNotificacao('Selecione pelo menos um serviço para o agendamento.', 'warning');
        return;
    }
    
    // Montar a data completa no formato ISO
    const dataHoraInicio = new Date(`${dataAgendamento}T${horaAgendamento}`);
    
    // Montar os serviços no formato esperado pela API
    const servicos = servicosSelecionados.map(s => ({ servico_id: parseInt(s.id) }));
    
    // Dados para enviar à API
    const dadosAgendamento = {
        cliente_id: parseInt(clienteId),
        barbeiro_id: parseInt(barbeiroId),
        data_hora_inicio: dataHoraInicio.toISOString(),
        servicos: servicos,
        observacoes: observacoes
    };
    
    console.log('Dados do agendamento:', dadosAgendamento);
    
    // Mostrar loader
    $('#btn-salvar-agendamento').prop('disabled', true);
    $('#btn-salvar-agendamento').html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Salvando...');
    
    // URL e método para a requisição
    let url = `${API_URL}/agendamentos/`;
    let method = 'POST';
    
    // Se estiver editando um agendamento existente
    const agendamentoId = $('#agendamentoModal').data('agendamento-id');
    if (agendamentoId && modoEdicao) {
        url = `${API_URL}/agendamentos/${agendamentoId}`;
        method = 'PUT';
    }
    
    // Obter o token JWT do localStorage
    const token = localStorage.getItem('token');
    
    if (!token) {
        mostrarNotificacao('Você precisa estar autenticado para realizar esta ação.', 'error');
        $('#btn-salvar-agendamento').prop('disabled', false);
        $('#btn-salvar-agendamento').html('Salvar');
        return;
    }
    
    // Fazer a requisição à API
    $.ajax({
        url: url,
        method: method,
        headers: {
            'Authorization': `Bearer ${token}`
        },
        contentType: 'application/json',
        data: JSON.stringify(dadosAgendamento),
        success: function(response) {
            console.log('Agendamento salvo com sucesso:', response);
            
            // Resetar formulário e fechar modal
            $('#agendamentoForm')[0].reset();
            servicosSelecionados = [];
            duracaoTotal = 0;
            valorTotal = 0;
            $('#servicos-selecionados').empty();
            $('#resumo-duracao').text('0 minutos');
            $('#resumo-valor').text('R$ 0,00');
            
            // Fechar modal
            $('#agendamentoModal').modal('hide');
            
            // Atualizar lista de agendamentos
            loadAgendamentosDia(currentDate);
            loadProximosAgendamentos();
            
            // Mostrar notificação de sucesso
            mostrarNotificacao(response.mensagem || 'Agendamento realizado com sucesso!', 'success');
        },
        error: function(xhr, status, error) {
            console.error('Erro ao salvar agendamento:', xhr.responseText);
            let mensagemErro = 'Erro ao salvar agendamento.';
            
            try {
                const resposta = JSON.parse(xhr.responseText);
                
                if (resposta.erro) {
                    mensagemErro = resposta.erro;
                    
                    // Caso específico: Horário indisponível
                    if (mensagemErro.includes('Horário não disponível')) {
                        mensagemErro = `O horário selecionado não está disponível para o barbeiro escolhido. 
                                        Por favor, selecione outro horário ou outro profissional.`;
                    }
                    
                    // Detalhes adicionais de validação
                    if (resposta.detalhes) {
                        const detalhes = Object.entries(resposta.detalhes)
                            .map(([campo, erro]) => `${campo}: ${erro}`)
                            .join(', ');
                        
                        mensagemErro += ` Detalhes: ${detalhes}`;
                    }
                }
            } catch (e) {
                // Se não conseguir parsear a resposta, usar mensagem genérica
                if (xhr.status === 401) {
                    mensagemErro = 'Sua sessão expirou. Por favor, faça login novamente.';
                    // Redirecionar para login
                    setTimeout(() => {
                        window.location.href = '/login';
                    }, 2000);
                } else if (xhr.status === 403) {
                    mensagemErro = 'Você não tem permissão para realizar esta ação.';
                } else if (xhr.status === 404) {
                    mensagemErro = 'Recurso não encontrado.';
                } else if (xhr.status === 500) {
                    mensagemErro = 'Erro interno do servidor. Por favor, tente novamente mais tarde.';
                }
            }
            
            mostrarNotificacao(mensagemErro, 'error');
        },
        complete: function() {
            // Resetar botão
            $('#btn-salvar-agendamento').prop('disabled', false);
            $('#btn-salvar-agendamento').html('Salvar');
        }
    });
}

// Validar formulário de agendamento
function validarFormularioAgendamento() {
    console.log('Validando formulário de agendamento...');
    
    let formValido = true;
    
    // Remover classes de erro anteriores
    $('.is-invalid').removeClass('is-invalid');
    $('.alert-danger').addClass('d-none');
    
    // Validar cliente
    const clienteId = $('#cliente-select').val();
    if (!clienteId) {
        $('#cliente-select').addClass('is-invalid');
        formValido = false;
    }
    
    // Validar barbeiro
    const barbeiroId = $('#barbeiro-select').val();
    if (!barbeiroId) {
        $('#barbeiro-select').addClass('is-invalid');
        formValido = false;
    }
    
    // Validar data
    const dataAgendamento = $('#data-agendamento').val();
    if (!dataAgendamento) {
        $('#data-agendamento').addClass('is-invalid');
        formValido = false;
    } else {
        // Verificar se a data não é anterior à data atual
        const dataAtual = new Date();
        dataAtual.setHours(0, 0, 0, 0);
        
        const dataSelecionada = new Date(dataAgendamento);
        dataSelecionada.setHours(0, 0, 0, 0);
        
        if (dataSelecionada < dataAtual) {
            $('#data-agendamento').addClass('is-invalid');
            $('#data-agendamento').next('.invalid-feedback').text('A data não pode ser anterior à data atual');
            formValido = false;
        }
    }
    
    // Validar hora
    const horaAgendamento = $('#hora-agendamento').val();
    if (!horaAgendamento) {
        $('#hora-agendamento').addClass('is-invalid');
        formValido = false;
    } else {
        // Verificar se, para hoje, a hora não é anterior à hora atual
        const dataAtual = new Date();
        const dataSelecionada = new Date(dataAgendamento);
        
        if (dataSelecionada.toDateString() === dataAtual.toDateString()) {
            const [hora, minuto] = horaAgendamento.split(':').map(Number);
            const horaSelecionada = new Date();
            horaSelecionada.setHours(hora, minuto, 0, 0);
            
            if (horaSelecionada < dataAtual) {
                $('#hora-agendamento').addClass('is-invalid');
                $('#hora-agendamento').next('.invalid-feedback').text('A hora não pode ser anterior à hora atual');
                formValido = false;
            }
        }
    }
    
    // Validar serviços
    if (servicosSelecionados.length === 0) {
        $('#servicos-erro').removeClass('d-none');
        formValido = false;
    }
    
    if (!formValido) {
        mostrarNotificacao('Por favor, corrija os erros no formulário.', 'warning');
    }
    
    return formValido;
}

// Mostrar notificação
function mostrarNotificacao(mensagem, tipo) {
    console.log(`Notificação: ${mensagem} (${tipo})`);
    
    // Mapear tipo para classes do Bootstrap
    const classesTipo = {
        'success': 'alert-success',
        'error': 'alert-danger',
        'warning': 'alert-warning',
        'info': 'alert-info'
    };
    
    // Usar alert-info como padrão se o tipo não for reconhecido
    const classeAlerta = classesTipo[tipo] || 'alert-info';
    
    // Criar o elemento de notificação
    const notificacao = document.createElement('div');
    notificacao.className = `alert ${classeAlerta} alert-dismissible fade show notification-toast`;
    notificacao.role = 'alert';
    notificacao.innerHTML = `
        ${mensagem}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
    `;
    
    // Adicionar estilo para posicionar no topo direito
    notificacao.style.position = 'fixed';
    notificacao.style.top = '20px';
    notificacao.style.right = '20px';
    notificacao.style.minWidth = '300px';
    notificacao.style.maxWidth = '500px';
    notificacao.style.zIndex = '9999';
    
    // Adicionar ao corpo do documento
    document.body.appendChild(notificacao);
    
    // Criar instância do Bootstrap Alert
    const bsAlert = new bootstrap.Alert(notificacao);
    
    // Remover automaticamente após 5 segundos
    setTimeout(() => {
        bsAlert.close();
    }, 5000);
}

// Função para lidar com erros de autenticação
function handleAuthError(xhr) {
    if (xhr.status === 401) {
        // Token expirado ou inválido
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        
        mostrarNotificacao(
            'Sua sessão expirou. Por favor, faça login novamente.',
            'warning'
        );
        
        // Redirecionar para login após 2 segundos
        setTimeout(() => {
            window.location.href = '/login';
        }, 2000);
        
        return true;
    }
    
    return false;
}

// Função para verificar autenticação antes de ações protegidas
function verificarAutenticacao() {
    const token = localStorage.getItem('token');
    
    if (!token) {
        mostrarNotificacao(
            'Você precisa estar autenticado para realizar esta ação.',
            'warning'
        );
        
        // Redirecionar para login após 2 segundos
        setTimeout(() => {
            window.location.href = '/login';
        }, 2000);
        
        return false;
    }
    
    return true;
}

// Salvar cliente rápido
function salvarClienteRapido() {
    console.log('Salvando cliente rápido...');
    
    // Validar dados básicos
    const nome = $('#cliente-nome').val().trim();
    const telefone = $('#cliente-telefone').val().trim();
    const email = $('#cliente-email').val().trim();
    
    if (!nome) {
        mostrarNotificacao('O nome do cliente é obrigatório.', 'warning');
        return;
    }
    
    if (!telefone) {
        mostrarNotificacao('O telefone do cliente é obrigatório.', 'warning');
        return;
    }
    
    // Verificar autenticação
    if (!verificarAutenticacao()) {
        return;
    }
    
    // Obter token
    const token = localStorage.getItem('token');
    
    // Mostrar loader
    $('#btn-salvar-cliente-rapido').prop('disabled', true);
    $('#btn-salvar-cliente-rapido').html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Salvando...');
    
    // Dados do cliente
    const dadosCliente = {
        nome: nome,
        telefone: telefone,
        email: email || null,
        observacoes: 'Cliente cadastrado via agendamento rápido'
    };
    
    // Fazer requisição à API
    $.ajax({
        url: `${API_URL}/clientes`,
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        contentType: 'application/json',
        data: JSON.stringify(dadosCliente),
        success: function(response) {
            console.log('Cliente salvo com sucesso:', response);
            
            // Fechar modal
            $('#novoClienteModal').modal('hide');
            
            // Limpar formulário
            $('#form-cliente-rapido')[0].reset();
            
            // Adicionar o novo cliente ao select e selecioná-lo
            const clienteId = response.cliente.id;
            const clienteNome = response.cliente.nome;
            
            // Verificar se o cliente já existe no select
            if ($(`#cliente-select option[value="${clienteId}"]`).length === 0) {
                $('#cliente-select').append(`<option value="${clienteId}">${clienteNome}</option>`);
            }
            
            // Selecionar o cliente
            $('#cliente-select').val(clienteId);
            
            // Atualizar barbeiros disponíveis com base no novo cliente
            const dataAgendamento = $('#data-agendamento').val();
            const horaAgendamento = $('#hora-agendamento').val();
            
            if (dataAgendamento && horaAgendamento) {
                loadBarbeirosDisponiveis(dataAgendamento, horaAgendamento);
            }
            
            // Mostrar notificação de sucesso
            mostrarNotificacao(response.mensagem || 'Cliente cadastrado com sucesso!', 'success');
        },
        error: function(xhr, status, error) {
            console.error('Erro ao salvar cliente:', xhr.responseText);
            
            // Verificar se é erro de autenticação
            if (handleAuthError(xhr)) {
                return;
            }
            
            let mensagemErro = 'Erro ao cadastrar cliente.';
            
            try {
                const resposta = JSON.parse(xhr.responseText);
                if (resposta.erro) {
                    mensagemErro = resposta.erro;
                    
                    // Detalhes adicionais
                    if (resposta.detalhes) {
                        const detalhes = Object.entries(resposta.detalhes)
                            .map(([campo, erro]) => `${campo}: ${erro}`)
                            .join(', ');
                        
                        mensagemErro += ` Detalhes: ${detalhes}`;
                    }
                }
            } catch (e) {
                // Se não conseguir parsear, usar mensagem genérica
            }
            
            mostrarNotificacao(mensagemErro, 'error');
        },
        complete: function() {
            // Resetar botão
            $('#btn-salvar-cliente-rapido').prop('disabled', false);
            $('#btn-salvar-cliente-rapido').html('Salvar');
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