/**
 * Funções para gerenciamento de barbeiros
 */

// URL base da API
const API_URL = '/api';

// Inicializar a página de barbeiros
$(document).ready(function() {
    console.log('Página de barbeiros carregada');
    
    // Carregar lista de barbeiros
    carregarBarbeiros();
    
    // Adicionar evento ao botão de novo barbeiro
    $('#barbeiro-novo-btn, #barbeiro-novo-btn-empty').on('click', function() {
        abrirModalBarbeiro();
    });
    
    // Adicionar evento de busca
    $('#barbeiro-busca-btn').on('click', function() {
        buscarBarbeiros();
    });
    
    $('#barbeiro-busca').on('keypress', function(e) {
        if (e.which == 13) {
            buscarBarbeiros();
        }
    });
    
    // Inicializar a data de disponibilidade como hoje
    $('#disponibilidade-data').val(formatDate(new Date()));
    $('#disponibilidade-data').on('change', function() {
        carregarDisponibilidadeBarbeiros($(this).val());
    });
    
    // Carregar dados iniciais
    carregarDesempenhoBarbeiros();
    carregarDisponibilidadeBarbeiros($('#disponibilidade-data').val());
    carregarServicosPorBarbeiro();
});

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

// Função para carregar lista de barbeiros
function carregarBarbeiros() {
    console.log('Carregando lista de barbeiros...');
    
    // Mostrar loading
    $('#barbeiros-lista').html('');
    $('#barbeiros-empty').addClass('d-none');
    $('#barbeiros-loading').removeClass('d-none');
    
    // Fazer requisição à API (usando endpoint público)
    $.ajax({
        url: `${API_URL}/barbeiros/disponiveis`,
        method: 'GET',
        success: function(response) {
            console.log('Barbeiros carregados:', response);
            
            // Esconder loading
            $('#barbeiros-loading').addClass('d-none');
            
            // Verificar se há barbeiros
            if (response && response.length > 0) {
                // Renderizar lista de barbeiros
                let html = '';
                
                response.forEach(barbeiro => {
                    const bgColor = barbeiro.disponivel ? 'bg-success' : 'bg-danger';
                    const statusText = barbeiro.disponivel ? 'Disponível' : 'Indisponível';
                    const especialidades = barbeiro.especialidades && barbeiro.especialidades.length > 0 
                        ? barbeiro.especialidades.join(', ') 
                        : 'Sem especialidades';
                    
                    html += `
                        <div class="col-lg-4 col-md-6 mb-4">
                            <div class="card h-100 shadow-sm">
                                <div class="card-header py-2 d-flex justify-content-between align-items-center">
                                    <span class="badge ${bgColor} text-white">${statusText}</span>
                                    <div class="dropdown">
                                        <button class="btn btn-sm btn-outline-secondary border-0" type="button" id="dropdownMenuButton${barbeiro.id}" data-bs-toggle="dropdown" aria-expanded="false">
                                            <i class="fas fa-ellipsis-v"></i>
                                        </button>
                                        <ul class="dropdown-menu" aria-labelledby="dropdownMenuButton${barbeiro.id}">
                                            <li><a class="dropdown-item" href="#" onclick="editarBarbeiro(${barbeiro.id})"><i class="fas fa-edit me-2"></i>Editar</a></li>
                                            <li><a class="dropdown-item" href="#" onclick="toggleDisponibilidade(${barbeiro.id}, ${!barbeiro.disponivel})"><i class="fas fa-${barbeiro.disponivel ? 'times' : 'check'} me-2"></i>${barbeiro.disponivel ? 'Marcar como Indisponível' : 'Marcar como Disponível'}</a></li>
                                            <li><hr class="dropdown-divider"></li>
                                            <li><a class="dropdown-item text-danger" href="#" onclick="excluirBarbeiro(${barbeiro.id})"><i class="fas fa-trash me-2"></i>Excluir</a></li>
                                        </ul>
                                    </div>
                                </div>
                                <div class="card-body text-center">
                                    <div class="my-3">
                                        <div class="barbeiro-avatar rounded-circle bg-light d-flex align-items-center justify-content-center mx-auto" style="width: 80px; height: 80px;">
                                            <i class="fas fa-user-tie fa-2x text-secondary"></i>
                                        </div>
                                    </div>
                                    <h5 class="card-title mb-1">${barbeiro.nome || 'Sem nome'}</h5>
                                    <p class="text-muted small mb-2">${especialidades}</p>
                                    <div class="d-flex justify-content-center text-muted small">
                                        <div class="me-3">
                                            <i class="fas fa-clock me-1"></i>${barbeiro.comissao_percentual}% comissão
                                        </div>
                                        <div>
                                            <i class="fas fa-calendar-alt me-1"></i>${barbeiro.agendamentos_hoje || 0} hoje
                                        </div>
                                    </div>
                                </div>
                                <div class="card-footer bg-transparent border-top-0 text-center">
                                    <button class="btn btn-sm btn-primary" onclick="verAgendaBarbeiro(${barbeiro.id})">
                                        <i class="fas fa-calendar me-1"></i>Ver Agenda
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                });
                
                $('#barbeiros-lista').html(html);
            } else {
                // Mostrar mensagem de lista vazia
                $('#barbeiros-empty').removeClass('d-none');
            }
        },
        error: function(xhr, status, error) {
            console.error('Erro ao carregar barbeiros:', xhr.responseText);
            
            // Esconder loading
            $('#barbeiros-loading').addClass('d-none');
            
            // Mostrar mensagem de erro
            $('#barbeiros-lista').html(`
                <div class="col-12">
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-circle me-2"></i>
                        Erro ao carregar barbeiros: ${xhr.status === 401 ? 'Você precisa estar autenticado' : 'Erro na conexão com o servidor'}
                    </div>
                </div>
            `);
        }
    });
}

// Função para abrir modal de novo barbeiro
function abrirModalBarbeiro(id = null) {
    // Título do modal baseado em criar novo ou editar existente
    const modalTitulo = id ? 'Editar Barbeiro' : 'Novo Barbeiro';
    
    // HTML do modal
    const modalHTML = `
    <div class="modal fade" id="barbeiro-modal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">${modalTitulo}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
                </div>
                <div class="modal-body">
                    <form id="barbeiro-form">
                        <input type="hidden" id="barbeiro-id" value="${id || ''}">
                        
                        <ul class="nav nav-tabs mb-3" id="barbeiro-tabs" role="tablist">
                            <li class="nav-item" role="presentation">
                                <button class="nav-link active" id="info-tab" data-bs-toggle="tab" data-bs-target="#info-tab-pane" type="button" role="tab" aria-controls="info-tab-pane" aria-selected="true">Informações Básicas</button>
                            </li>
                            <li class="nav-item" role="presentation">
                                <button class="nav-link" id="especialidades-tab" data-bs-toggle="tab" data-bs-target="#especialidades-tab-pane" type="button" role="tab" aria-controls="especialidades-tab-pane" aria-selected="false">Especialidades</button>
                            </li>
                            <li class="nav-item" role="presentation">
                                <button class="nav-link" id="financeiro-tab" data-bs-toggle="tab" data-bs-target="#financeiro-tab-pane" type="button" role="tab" aria-controls="financeiro-tab-pane" aria-selected="false">Financeiro</button>
                            </li>
                        </ul>
                        
                        <div class="tab-content" id="barbeiro-tabs-content">
                            <!-- Aba de Informações Básicas -->
                            <div class="tab-pane fade show active" id="info-tab-pane" role="tabpanel" aria-labelledby="info-tab">
                                <div class="row mb-3">
                                    <div class="col-md-6">
                                        <label for="barbeiro-nome" class="form-label">Nome Completo *</label>
                                        <input type="text" class="form-control" id="barbeiro-nome" required>
                                    </div>
                                    <div class="col-md-6">
                                        <label for="barbeiro-telefone" class="form-label">Telefone</label>
                                        <input type="text" class="form-control" id="barbeiro-telefone">
                                    </div>
                                </div>
                                <div class="row mb-3">
                                    <div class="col-md-6">
                                        <label for="barbeiro-email" class="form-label">Email *</label>
                                        <input type="email" class="form-control" id="barbeiro-email" required>
                                    </div>
                                    <div class="col-md-6" id="senha-container">
                                        <label for="barbeiro-senha" class="form-label">Senha *</label>
                                        <input type="password" class="form-control" id="barbeiro-senha">
                                        <small class="text-muted">Mínimo de 6 caracteres</small>
                                    </div>
                                </div>
                                <div class="form-check form-switch mb-3">
                                    <input class="form-check-input" type="checkbox" id="barbeiro-disponivel" checked>
                                    <label class="form-check-label" for="barbeiro-disponivel">Disponível para agendamentos</label>
                                </div>
                            </div>
                            
                            <!-- Aba de Especialidades -->
                            <div class="tab-pane fade" id="especialidades-tab-pane" role="tabpanel" aria-labelledby="especialidades-tab">
                                <div class="mb-3">
                                    <label for="barbeiro-especialidades" class="form-label">Especialidades (separe por vírgula)</label>
                                    <textarea class="form-control" id="barbeiro-especialidades" rows="3" placeholder="Ex: Corte masculino, Barba, Fade, Progressiva, etc"></textarea>
                                </div>
                                
                                <div class="border p-3 rounded mb-3">
                                    <p class="mb-2"><strong>Especialidades populares:</strong></p>
                                    <div id="tags-especialidades" class="d-flex flex-wrap gap-2">
                                        <span class="badge bg-secondary" data-value="Corte masculino">Corte masculino</span>
                                        <span class="badge bg-secondary" data-value="Barba">Barba</span>
                                        <span class="badge bg-secondary" data-value="Fade">Fade</span>
                                        <span class="badge bg-secondary" data-value="Degradê">Degradê</span>
                                        <span class="badge bg-secondary" data-value="Coloração">Coloração</span>
                                        <span class="badge bg-secondary" data-value="Progressiva">Progressiva</span>
                                        <span class="badge bg-secondary" data-value="Alisamento">Alisamento</span>
                                        <span class="badge bg-secondary" data-value="Relaxamento">Relaxamento</span>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Aba Financeiro -->
                            <div class="tab-pane fade" id="financeiro-tab-pane" role="tabpanel" aria-labelledby="financeiro-tab">
                                <div class="mb-3">
                                    <label for="barbeiro-comissao" class="form-label">Percentual de Comissão (%)</label>
                                    <input type="number" class="form-control" id="barbeiro-comissao" min="0" max="100" value="50">
                                    <small class="text-muted">Percentual que o barbeiro recebe sobre o valor dos serviços realizados</small>
                                </div>
                            </div>
                        </div>
                        
                        <div class="alert alert-danger d-none" id="barbeiro-form-erro"></div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                    <button type="button" class="btn btn-primary" id="barbeiro-salvar">Salvar</button>
                </div>
            </div>
        </div>
    </div>
    `;
    
    // Remover qualquer modal existente e adicionar o novo
    $('#barbeiro-modal').remove();
    $('body').append(modalHTML);
    
    // Inicializar o modal
    const modal = new bootstrap.Modal(document.getElementById('barbeiro-modal'));
    modal.show();
    
    // Se for edição, carregar dados do barbeiro
    if (id) {
        $('#senha-container').append('<small class="form-text text-muted d-block">Deixe em branco para manter a senha atual</small>');
        carregarDadosBarbeiro(id);
    }
    
    // Evento para adicionar tags de especialidades
    $('#tags-especialidades .badge').on('click', function() {
        const especialidade = $(this).data('value');
        let especialidades = $('#barbeiro-especialidades').val();
        
        if (especialidades) {
            // Verificar se já contém a especialidade
            const especialidadesArray = especialidades.split(',').map(e => e.trim());
            if (!especialidadesArray.includes(especialidade)) {
                especialidades += ', ' + especialidade;
            }
        } else {
            especialidades = especialidade;
        }
        
        $('#barbeiro-especialidades').val(especialidades);
    });
    
    // Evento para salvar barbeiro
    $('#barbeiro-salvar').on('click', function() {
        salvarBarbeiro();
    });
}

// Função para carregar dados de um barbeiro existente
function carregarDadosBarbeiro(id) {
    // Obter token JWT
    const token = localStorage.getItem('token');
    
    // Fazer requisição à API
    $.ajax({
        url: `${API_URL}/barbeiros/${id}`,
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        success: function(response) {
            console.log('Dados do barbeiro carregados:', response);
            
            // Preencher campos do formulário
            $('#barbeiro-nome').val(response.nome);
            $('#barbeiro-email').val(response.email);
            $('#barbeiro-telefone').val(response.telefone || '');
            $('#barbeiro-disponivel').prop('checked', response.disponivel);
            $('#barbeiro-especialidades').val(response.especialidades_texto || '');
            $('#barbeiro-comissao').val(response.comissao_percentual);
        },
        error: function(xhr, status, error) {
            console.error('Erro ao carregar dados do barbeiro:', xhr.responseText);
            $('#barbeiro-form-erro').removeClass('d-none').text('Erro ao carregar dados do barbeiro. Tente novamente.');
        }
    });
}

// Função para salvar barbeiro (novo ou existente)
function salvarBarbeiro() {
    // Obter dados do formulário
    const id = $('#barbeiro-id').val();
    const nome = $('#barbeiro-nome').val();
    const email = $('#barbeiro-email').val();
    const senha = $('#barbeiro-senha').val();
    const telefone = $('#barbeiro-telefone').val();
    const disponivel = $('#barbeiro-disponivel').is(':checked');
    const especialidades = $('#barbeiro-especialidades').val();
    const comissao = $('#barbeiro-comissao').val();
    
    // Validar campos obrigatórios
    if (!nome || !email) {
        $('#barbeiro-form-erro').removeClass('d-none').text('Preencha todos os campos obrigatórios.');
        return;
    }
    
    // Validar senha para novo barbeiro
    if (!id && !senha) {
        $('#barbeiro-form-erro').removeClass('d-none').text('Senha é obrigatória para novo barbeiro.');
        return;
    }
    
    // Dados para enviar à API
    const dados = {
        nome: nome,
        email: email,
        telefone: telefone,
        disponivel: disponivel,
        especialidades: especialidades,
        comissao_percentual: parseFloat(comissao)
    };
    
    // Adicionar senha apenas se for fornecida
    if (senha) {
        dados.senha = senha;
    }
    
    // Obter token JWT
    const token = localStorage.getItem('token');
    
    // URL e método da requisição
    const url = id 
        ? `${API_URL}/barbeiros/${id}` 
        : `${API_URL}/barbeiros/completo`;
    const metodo = id ? 'PUT' : 'POST';
    
    // Fazer requisição à API
    $.ajax({
        url: url,
        method: metodo,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        data: JSON.stringify(dados),
        success: function(response) {
            console.log('Barbeiro salvo com sucesso:', response);
            
            // Fechar modal
            $('#barbeiro-modal').modal('hide');
            
            // Exibir notificação
            mostrarNotificacao(
                id ? 'Barbeiro atualizado com sucesso!' : 'Novo barbeiro criado com sucesso!',
                'success'
            );
            
            // Recarregar lista de barbeiros
            carregarBarbeiros();
        },
        error: function(xhr, status, error) {
            console.error('Erro ao salvar barbeiro:', xhr.responseText);
            
            let mensagemErro = 'Erro ao salvar barbeiro. Tente novamente.';
            
            // Tentar extrair mensagem de erro da resposta
            try {
                const resposta = JSON.parse(xhr.responseText);
                mensagemErro = resposta.erro || resposta.detalhes || mensagemErro;
            } catch (e) {
                console.error('Erro ao parsear resposta:', e);
            }
            
            $('#barbeiro-form-erro').removeClass('d-none').text(mensagemErro);
        }
    });
}

// Função para editar barbeiro
function editarBarbeiro(id) {
    abrirModalBarbeiro(id);
}

// Função para alternar disponibilidade do barbeiro
function toggleDisponibilidade(id, novoStatus) {
    console.log('Alterando disponibilidade do barbeiro #' + id + ' para ' + novoStatus);
    
    if (!confirm('Tem certeza que deseja alterar a disponibilidade deste barbeiro?')) {
        return;
    }
    
    // Obter token JWT
    const token = localStorage.getItem('token');
    
    // Fazer requisição à API
    $.ajax({
        url: `${API_URL}/barbeiros/${id}`,
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        data: JSON.stringify({
            disponivel: novoStatus
        }),
        success: function(response) {
            console.log('Disponibilidade atualizada:', response);
            mostrarNotificacao(
                'Disponibilidade do barbeiro atualizada com sucesso!',
                'success'
            );
            
            // Recarregar lista de barbeiros
            carregarBarbeiros();
        },
        error: function(xhr, status, error) {
            console.error('Erro ao atualizar disponibilidade:', xhr.responseText);
            mostrarNotificacao(
                'Erro ao atualizar disponibilidade do barbeiro.',
                'error'
            );
        }
    });
}

// Função para excluir barbeiro
function excluirBarbeiro(id) {
    if (!confirm('Tem certeza que deseja excluir este barbeiro? Esta ação não pode ser desfeita.')) {
        return;
    }
    
    // Obter token JWT
    const token = localStorage.getItem('token');
    
    // Fazer requisição à API
    $.ajax({
        url: `${API_URL}/barbeiros/${id}`,
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        success: function(response) {
            console.log('Barbeiro excluído:', response);
            mostrarNotificacao(
                'Barbeiro excluído com sucesso!',
                'success'
            );
            
            // Recarregar lista de barbeiros
            carregarBarbeiros();
        },
        error: function(xhr, status, error) {
            console.error('Erro ao excluir barbeiro:', xhr.responseText);
            
            let mensagemErro = 'Erro ao excluir barbeiro.';
            try {
                const resposta = JSON.parse(xhr.responseText);
                if (resposta.erro) {
                    mensagemErro = resposta.erro;
                }
            } catch (e) {}
            
            mostrarNotificacao(mensagemErro, 'error');
        }
    });
}

// Função para ver agenda do barbeiro
function verAgendaBarbeiro(id) {
    // Redirecionar para a página de agenda com filtro por barbeiro
    window.location.href = `/agenda?barbeiro=${id}`;
}

// Função para buscar barbeiros
function buscarBarbeiros() {
    const termoBusca = $('#barbeiro-busca').val().trim();
    
    if (!termoBusca) {
        // Se a busca estiver vazia, carregar todos os barbeiros
        carregarBarbeiros();
        return;
    }
    
    console.log('Buscando barbeiros:', termoBusca);
    
    // Mostrar loading
    $('#barbeiros-lista').html('');
    $('#barbeiros-empty').addClass('d-none');
    $('#barbeiros-loading').removeClass('d-none');
    
    // Fazer requisição à API pública
    $.ajax({
        url: `${API_URL}/barbeiros/disponiveis?busca=${encodeURIComponent(termoBusca)}`,
        method: 'GET',
        success: function(response) {
            // Processar resposta
            console.log('Resultado da busca:', response);
            
            // Esconder loading
            $('#barbeiros-loading').addClass('d-none');
            
            // Filtrar os resultados no cliente já que o endpoint não suporta busca
            const resultadosFiltrados = response.filter(barbeiro => {
                // Buscar no nome do barbeiro
                if (barbeiro.nome && barbeiro.nome.toLowerCase().includes(termoBusca.toLowerCase())) {
                    return true;
                }
                
                // Buscar nas especialidades
                if (barbeiro.especialidades && barbeiro.especialidades.some(esp => 
                    esp.toLowerCase().includes(termoBusca.toLowerCase()))) {
                    return true;
                }
                
                return false;
            });
            
            // Verificar se há resultados
            if (resultadosFiltrados && resultadosFiltrados.length > 0) {
                // Renderizar resultados (usando o mesmo formato da função carregarBarbeiros)
                let html = '';
                
                resultadosFiltrados.forEach(barbeiro => {
                    const bgColor = barbeiro.disponivel ? 'bg-success' : 'bg-danger';
                    const statusText = barbeiro.disponivel ? 'Disponível' : 'Indisponível';
                    const especialidades = barbeiro.especialidades && barbeiro.especialidades.length > 0 
                        ? barbeiro.especialidades.join(', ') 
                        : 'Sem especialidades';
                    
                    html += `
                        <div class="col-lg-4 col-md-6 mb-4">
                            <div class="card h-100 shadow-sm">
                                <div class="card-header py-2 d-flex justify-content-between align-items-center">
                                    <span class="badge ${bgColor} text-white">${statusText}</span>
                                    <div class="dropdown">
                                        <button class="btn btn-sm btn-outline-secondary border-0" type="button" id="dropdownMenuButton${barbeiro.id}" data-bs-toggle="dropdown" aria-expanded="false">
                                            <i class="fas fa-ellipsis-v"></i>
                                        </button>
                                        <ul class="dropdown-menu" aria-labelledby="dropdownMenuButton${barbeiro.id}">
                                            <li><a class="dropdown-item" href="#" onclick="editarBarbeiro(${barbeiro.id})"><i class="fas fa-edit me-2"></i>Editar</a></li>
                                            <li><a class="dropdown-item" href="#" onclick="toggleDisponibilidade(${barbeiro.id}, ${!barbeiro.disponivel})"><i class="fas fa-${barbeiro.disponivel ? 'times' : 'check'} me-2"></i>${barbeiro.disponivel ? 'Marcar como Indisponível' : 'Marcar como Disponível'}</a></li>
                                            <li><hr class="dropdown-divider"></li>
                                            <li><a class="dropdown-item text-danger" href="#" onclick="excluirBarbeiro(${barbeiro.id})"><i class="fas fa-trash me-2"></i>Excluir</a></li>
                                        </ul>
                                    </div>
                                </div>
                                <div class="card-body text-center">
                                    <div class="my-3">
                                        <div class="barbeiro-avatar rounded-circle bg-light d-flex align-items-center justify-content-center mx-auto" style="width: 80px; height: 80px;">
                                            <i class="fas fa-user-tie fa-2x text-secondary"></i>
                                        </div>
                                    </div>
                                    <h5 class="card-title mb-1">${barbeiro.nome || 'Sem nome'}</h5>
                                    <p class="text-muted small mb-2">${especialidades}</p>
                                    <div class="d-flex justify-content-center text-muted small">
                                        <div class="me-3">
                                            <i class="fas fa-clock me-1"></i>${barbeiro.comissao_percentual}% comissão
                                        </div>
                                        <div>
                                            <i class="fas fa-calendar-alt me-1"></i>${barbeiro.agendamentos_hoje || 0} hoje
                                        </div>
                                    </div>
                                </div>
                                <div class="card-footer bg-transparent border-top-0 text-center">
                                    <button class="btn btn-sm btn-primary" onclick="verAgendaBarbeiro(${barbeiro.id})">
                                        <i class="fas fa-calendar me-1"></i>Ver Agenda
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                });
                
                $('#barbeiros-lista').html(html);
                
                // Mostrar mensagem informativa sobre a busca
                mostrarNotificacao(`Foram encontrados ${resultadosFiltrados.length} barbeiros para "${termoBusca}"`, 'info');
            } else {
                // Mostrar mensagem de nenhum resultado
                $('#barbeiros-lista').html(`
                    <div class="col-12 text-center py-5">
                        <i class="fas fa-search fa-3x text-muted mb-3"></i>
                        <h5>Nenhum barbeiro encontrado</h5>
                        <p class="text-muted">Sua busca por "${termoBusca}" não retornou resultados.</p>
                        <button class="btn btn-primary" onclick="carregarBarbeiros()">
                            <i class="fas fa-sync-alt me-2"></i>Mostrar Todos
                        </button>
                    </div>
                `);
            }
        },
        error: function(xhr, status, error) {
            console.error('Erro na busca de barbeiros:', xhr.responseText);
            
            // Esconder loading
            $('#barbeiros-loading').addClass('d-none');
            
            // Mostrar mensagem de erro
            $('#barbeiros-lista').html(`
                <div class="col-12">
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-circle me-2"></i>
                        Erro ao buscar barbeiros: Erro na conexão com o servidor
                    </div>
                </div>
            `);
        }
    });
}

// Função para carregar desempenho dos barbeiros
function carregarDesempenhoBarbeiros() {
    console.log('Carregando desempenho dos barbeiros...');
    
    // Simular dados para manter simples neste exemplo
    const dados = [
        { barbeiro: 'Carlos Silva', atendimentos: 32, avaliacao: 4.8, faturamento: 1760.00 },
        { barbeiro: 'João Barbosa', atendimentos: 28, avaliacao: 4.5, faturamento: 1540.00 },
        { barbeiro: 'Marcos Oliveira', atendimentos: 22, avaliacao: 4.7, faturamento: 1210.00 }
    ];
    
    // Preencher tabela de desempenho
    let html = '';
    
    dados.forEach(item => {
        // Gerar estrelas para avaliação
        let estrelas = '';
        for (let i = 0; i < 5; i++) {
            if (i < Math.floor(item.avaliacao)) {
                estrelas += '<i class="fas fa-star text-warning"></i>';
            } else if (i < item.avaliacao) {
                estrelas += '<i class="fas fa-star-half-alt text-warning"></i>';
            } else {
                estrelas += '<i class="far fa-star text-warning"></i>';
            }
        }
        
        html += `
            <tr>
                <td>${item.barbeiro}</td>
                <td>${item.atendimentos}</td>
                <td>${estrelas} <span class="small text-muted">(${item.avaliacao})</span></td>
                <td>R$ ${item.faturamento.toFixed(2)}</td>
            </tr>
        `;
    });
    
    $('#barbeiros-desempenho').html(html);
}

// Função para carregar disponibilidade dos barbeiros
function carregarDisponibilidadeBarbeiros(data) {
    console.log('Carregando disponibilidade dos barbeiros para a data:', data);
    
    // Implementar lógica para mostrar uma timeline de disponibilidade
    // Exemplo: Mostrar disponibilidade em intervalos de 1 hora das 8h às 20h
    
    const horasDisponiveis = [
        { hora: '08:00', barbeiros: ['Carlos Silva', 'João Barbosa'] },
        { hora: '09:00', barbeiros: ['Carlos Silva', 'João Barbosa', 'Marcos Oliveira'] },
        { hora: '10:00', barbeiros: ['João Barbosa', 'Marcos Oliveira'] },
        { hora: '11:00', barbeiros: ['Carlos Silva', 'Marcos Oliveira'] },
        { hora: '12:00', barbeiros: [] }, // Almoço
        { hora: '13:00', barbeiros: [] }, // Almoço
        { hora: '14:00', barbeiros: ['Carlos Silva', 'João Barbosa', 'Marcos Oliveira'] },
        { hora: '15:00', barbeiros: ['Carlos Silva', 'João Barbosa', 'Marcos Oliveira'] },
        { hora: '16:00', barbeiros: ['Carlos Silva', 'João Barbosa'] },
        { hora: '17:00', barbeiros: ['Carlos Silva', 'Marcos Oliveira'] },
        { hora: '18:00', barbeiros: ['João Barbosa', 'Marcos Oliveira'] },
        { hora: '19:00', barbeiros: ['João Barbosa'] }
    ];
    
    let html = '<div class="disponibilidade-grid">';
    
    horasDisponiveis.forEach(slot => {
        const numDisponiveis = slot.barbeiros.length;
        let classeDisponibilidade = 'disponibilidade-nenhum';
        
        if (numDisponiveis > 0) {
            classeDisponibilidade = numDisponiveis === 1 ? 'disponibilidade-baixo' :
                                   numDisponiveis === 2 ? 'disponibilidade-medio' :
                                                         'disponibilidade-alto';
        }
        
        html += `
            <div class="disponibilidade-slot">
                <span class="disponibilidade-hora">${slot.hora}</span>
                <div class="disponibilidade-barra ${classeDisponibilidade}" 
                     data-bs-toggle="tooltip" 
                     title="${numDisponiveis} barbeiro(s) disponível(is): ${slot.barbeiros.join(', ')}">
                    <span class="disponibilidade-contador">${numDisponiveis}</span>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    
    $('#disponibilidade-timeline').html(html);
    
    // Inicializar tooltips
    $('[data-bs-toggle="tooltip"]').tooltip();
}

// Função para carregar gráfico de serviços por barbeiro
function carregarServicosPorBarbeiro() {
    console.log('Carregando gráfico de serviços por barbeiro...');
    
    // Simular dados
    const dados = {
        labels: ['Carlos Silva', 'João Barbosa', 'Marcos Oliveira'],
        datasets: [
            {
                label: 'Corte de cabelo',
                backgroundColor: 'rgba(54, 162, 235, 0.8)',
                data: [65, 59, 70]
            },
            {
                label: 'Barba',
                backgroundColor: 'rgba(255, 99, 132, 0.8)',
                data: [40, 45, 30]
            },
            {
                label: 'Pigmentação',
                backgroundColor: 'rgba(75, 192, 192, 0.8)',
                data: [15, 20, 10]
            },
            {
                label: 'Outros',
                backgroundColor: 'rgba(255, 205, 86, 0.8)',
                data: [20, 15, 25]
            }
        ]
    };
    
    // Criar gráfico se existe canvas
    const ctx = document.getElementById('servicos-barbeiro-chart');
    
    if (ctx) {
        new Chart(ctx, {
            type: 'bar',
            data: dados,
            options: {
                plugins: {
                    title: {
                        display: true,
                        text: 'Serviços Realizados por Barbeiro (Últimos 30 dias)'
                    },
                },
                responsive: true,
                scales: {
                    x: {
                        stacked: true,
                    },
                    y: {
                        stacked: true
                    }
                }
            }
        });
    }
}

// Função para mostrar notificações
function mostrarNotificacao(mensagem, tipo) {
    // Verificar se a função existe no escopo global (pode estar em outro arquivo)
    if (typeof window.mostrarNotificacao === 'function') {
        window.mostrarNotificacao(mensagem, tipo);
        return;
    }
    
    // Implementação alternativa se a função global não existir
    console.log(`Notificação (${tipo}): ${mensagem}`);
    
    // Criar elemento toast
    const toastId = 'toast-' + Date.now();
    const toastHTML = `
        <div id="${toastId}" class="toast align-items-center border-0 fade" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body ${tipo === 'error' ? 'bg-danger text-white' : tipo === 'success' ? 'bg-success text-white' : tipo === 'warning' ? 'bg-warning' : 'bg-info text-white'}">
                    ${mensagem}
                </div>
                <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast" aria-label="Fechar"></button>
            </div>
        </div>
    `;
    
    // Adicionar ao container de toasts (criar se não existir)
    let toastContainer = document.getElementById('toast-container');
    
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
        document.body.appendChild(toastContainer);
    }
    
    toastContainer.insertAdjacentHTML('beforeend', toastHTML);
    
    // Mostrar toast
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { delay: 5000 });
    toast.show();
    
    // Remover após fechado
    toastElement.addEventListener('hidden.bs.toast', function() {
        toastElement.remove();
    });
}

// Adicionar CSS necessário
document.head.insertAdjacentHTML('beforeend', `
<style>
    .disponibilidade-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
    }
    
    .disponibilidade-slot {
        display: flex;
        flex-direction: column;
        align-items: center;
    }
    
    .disponibilidade-hora {
        font-size: 0.8rem;
        color: #6c757d;
        margin-bottom: 5px;
    }
    
    .disponibilidade-barra {
        width: 100%;
        height: 30px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
    }
    
    .disponibilidade-nenhum {
        background-color: #f8f9fa;
        border: 1px dashed #dee2e6;
        color: #adb5bd;
    }
    
    .disponibilidade-baixo {
        background-color: #dc3545;
    }
    
    .disponibilidade-medio {
        background-color: #ffc107;
        color: #212529;
    }
    
    .disponibilidade-alto {
        background-color: #28a745;
    }
    
    .disponibilidade-contador {
        font-size: 0.9rem;
    }
    
    .barbeiro-avatar {
        transition: all 0.3s ease;
    }
    
    .card:hover .barbeiro-avatar {
        transform: scale(1.05);
    }
</style>
`); 