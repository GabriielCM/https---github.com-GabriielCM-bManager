/**
 * Funções para gerenciamento de clientes
 */

// Variáveis globais
let clientesTable;
let currentPage = 1;
let searchTerm = '';

// Inicialização da página de clientes
$(document).ready(function() {
    // Inicializar componentes
    initClientesPage();
});

// Inicializar página de clientes
function initClientesPage() {
    // Carregar lista de clientes
    loadClientes();
    
    // Carregar estatísticas
    loadClientesStats();
    
    // Carregar clientes recentes
    loadRecentClientes();
    
    // Aplicar máscara ao campo de telefone
    if ($.fn.mask) {
        $('#cliente-telefone').mask('(00) 00000-0000');
    } else {
        // Caso a biblioteca não esteja carregada, carregá-la dinamicamente
        $.getScript('/static/vendor/jquery-mask/jquery.mask.min.js', function() {
            $('#cliente-telefone').mask('(00) 00000-0000');
        });
    }
    
    // Eventos de busca
    $('#cliente-busca-btn').on('click', function() {
        searchTerm = $('#cliente-busca').val();
        loadClientes(1, searchTerm);
    });
    
    $('#cliente-busca').on('keypress', function(e) {
        if (e.which === 13) {
            searchTerm = $(this).val();
            loadClientes(1, searchTerm);
        }
    });
    
    // Eventos para modais
    $('#cliente-novo-btn').on('click', function() {
        abrirModalCliente();
    });
    
    $(document).on('click', '#cliente-novo-btn-empty', function() {
        abrirModalCliente();
    });
    
    // Salvar cliente
    $('#salvar-cliente-btn').on('click', function() {
        salvarCliente();
    });
    
    // Exportar clientes
    $('#clientes-exportar').on('click', function() {
        exportClientes();
    });
    
    // Imprimir clientes
    $('#clientes-imprimir').on('click', function() {
        printClientes();
    });
    
    // Importar clientes
    $('#clientes-importar').on('click', function() {
        importClientes();
    });
}

// Alias para compatibilidade com código HTML
function inicializarPaginaClientes() {
    initClientesPage();
}

// Carregar lista de clientes
function loadClientes(page = 1, search = '') {
    // Atualizar variáveis
    currentPage = page;
    
    // Mostrar carregamento
    $('#clientes-lista').html('');
    $('#clientes-loading').removeClass('d-none');
    $('#clientes-empty').addClass('d-none');
    
    // Adicionar timestamp para evitar cache
    const timestamp = new Date().getTime();
    
    // Fazer requisição AJAX para a API
    $.ajax({
        url: `/api/clientes/?pagina=${page}&busca=${search}&por_pagina=10&_=${timestamp}`,
        type: 'GET',
        cache: false, // Desabilitar cache explicitamente
        success: function(response) {
            console.log('Clientes carregados:', response);
            
            // Esconder carregamento
            $('#clientes-loading').addClass('d-none');
            
            if (!response.items || response.items.length === 0) {
                // Mostrar mensagem vazia
                $('#clientes-empty').removeClass('d-none');
            } else {
                // Renderizar lista
                let html = '';
                
                response.items.forEach(function(cliente) {
                    // Definir status e classe
                    let statusText = 'Novo';
                    let statusClass = 'bg-info';
                    
                    // Determinar status baseado em dados do cliente (a ser implementado)
                    if (cliente.ultimo_atendimento) {
                        const dataUltimoAtendimento = new Date(cliente.ultimo_atendimento);
                        const hoje = new Date();
                        const diffDias = Math.floor((hoje - dataUltimoAtendimento) / (1000 * 60 * 60 * 24));
                        
                        if (diffDias <= 30) {
                            statusText = 'Frequente';
                            statusClass = 'bg-success';
                        } else if (diffDias <= 90) {
                            statusText = 'Regular';
                            statusClass = 'bg-primary';
                        } else if (diffDias <= 180) {
                            statusText = 'Ocasional';
                            statusClass = 'bg-warning';
                        } else {
                            statusText = 'Inativo';
                            statusClass = 'bg-danger';
                        }
                    }
                    
                    // Formatar data do último atendimento
                    const ultimoAtendimento = cliente.ultimo_atendimento 
                        ? new Date(cliente.ultimo_atendimento).toLocaleDateString('pt-BR') 
                        : 'Nunca';
                    
                    // Construir linha da tabela
                    html += `
                        <tr>
                            <td>${cliente.nome}</td>
                            <td>${cliente.telefone}</td>
                            <td>${cliente.email || '-'}</td>
                            <td>${ultimoAtendimento}</td>
                            <td><span class="badge ${statusClass}">${statusText}</span></td>
                            <td class="text-center">
                                <div class="btn-group btn-group-sm">
                                    <button type="button" class="btn btn-outline-primary editar-cliente" data-id="${cliente.id}">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button type="button" class="btn btn-outline-info ver-cliente" data-id="${cliente.id}">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                    <button type="button" class="btn btn-outline-danger excluir-cliente" data-id="${cliente.id}">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `;
                });
                
                // Adicionar à tabela
                $('#clientes-lista').html(html);
                
                // Gerar paginação
                generatePagination(page, response.paginas, response.total);
                
                // Adicionar eventos aos botões
                $('.editar-cliente').on('click', function() {
                    const id = $(this).data('id');
                    abrirModalCliente(id);
                });
                
                $('.ver-cliente').on('click', function() {
                    const id = $(this).data('id');
                    viewClienteProfile(id);
                });
                
                $('.excluir-cliente').on('click', function() {
                    const id = $(this).data('id');
                    confirmDeleteCliente(id);
                });
            }
        },
        error: function(xhr) {
            // Esconder carregamento e mostrar erro
            $('#clientes-loading').addClass('d-none');
            
            let mensagem = 'Erro ao carregar clientes';
            
            if (xhr.responseJSON && xhr.responseJSON.erro) {
                mensagem += ': ' + xhr.responseJSON.erro;
            }
            
            console.error('Erro ao carregar clientes:', xhr);
            
            $('#clientes-lista').html(`
                <tr>
                    <td colspan="6" class="text-center text-danger">
                        <i class="fas fa-exclamation-circle me-2"></i>${mensagem}
                    </td>
                </tr>
            `);
        }
    });
}

// Gerar links de paginação
function generatePagination(currentPage, totalPages, totalItems) {
    if (totalPages <= 1) {
        $('#clientes-paginacao').html('');
        return;
    }
    
    let html = '';
    
    // Botão Anterior
    html += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="javascript:void(0)" data-page="${currentPage - 1}" aria-label="Anterior">
                <span aria-hidden="true">&laquo;</span>
            </a>
        </li>
    `;
    
    // Páginas
    for (let i = 1; i <= totalPages; i++) {
        if (
            i === 1 || 
            i === totalPages || 
            (i >= currentPage - 1 && i <= currentPage + 1)
        ) {
            html += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="javascript:void(0)" data-page="${i}">${i}</a>
                </li>
            `;
        } else if (
            i === currentPage - 2 || 
            i === currentPage + 2
        ) {
            html += `
                <li class="page-item disabled">
                    <a class="page-link" href="javascript:void(0)">...</a>
                </li>
            `;
        }
    }
    
    // Botão Próximo
    html += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="javascript:void(0)" data-page="${currentPage + 1}" aria-label="Próximo">
                <span aria-hidden="true">&raquo;</span>
            </a>
        </li>
    `;
    
    $('#clientes-paginacao').html(html);
    
    // Adicionar evento de clique
    $('#clientes-paginacao .page-link').on('click', function(e) {
        e.preventDefault();
        const page = $(this).data('page');
        if (page && !isNaN(page) && page !== currentPage) {
            loadClientes(page, searchTerm);
        }
    });
}

// Carregar estatísticas de clientes
function loadClientesStats() {
    const timestamp = new Date().getTime();
    
    $.ajax({
        url: `/api/clientes/estatisticas?_=${timestamp}`,
        type: 'GET',
        cache: false,
        success: function(response) {
            console.log('Estatísticas carregadas:', response);
            $('#estatistica-total-clientes').text(response.total || 0);
            $('#estatistica-novos-clientes').text(response.novos_mes || 0);
            $('#estatistica-clientes-frequentes').text(response.frequentes || 0);
            $('#estatistica-clientes-inativos').text(response.inativos || 0);
        },
        error: function(xhr) {
            console.error('Erro ao carregar estatísticas de clientes:', xhr);
        }
    });
}

// Carregar clientes recentes
function loadRecentClientes() {
    const timestamp = new Date().getTime();
    
    $.ajax({
        url: `/api/clientes/recentes?_=${timestamp}`,
        type: 'GET',
        cache: false,
        success: function(response) {
            console.log('Clientes recentes carregados:', response);
            
            if (!response || response.length === 0) {
                $('#clientes-recentes-lista').html(`
                    <tr>
                        <td colspan="3" class="text-center">Nenhum cliente recente</td>
                    </tr>
                `);
                return;
            }
            
            let html = '';
            
            response.forEach(function(cliente) {
                const dataCadastro = new Date(cliente.created_at).toLocaleDateString('pt-BR');
                
                html += `
                    <tr>
                        <td>${cliente.nome}</td>
                        <td>${dataCadastro}</td>
                        <td>
                            <button type="button" class="btn btn-sm btn-outline-info ver-cliente-recente" data-id="${cliente.id}">
                                <i class="fas fa-eye"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });
            
            $('#clientes-recentes-lista').html(html);
            
            // Adicionar evento
            $('.ver-cliente-recente').on('click', function() {
                const id = $(this).data('id');
                viewClienteProfile(id);
            });
        },
        error: function(xhr) {
            console.error('Erro ao carregar clientes recentes:', xhr);
            $('#clientes-recentes-lista').html(`
                <tr>
                    <td colspan="3" class="text-center text-danger">
                        <i class="fas fa-exclamation-circle me-2"></i>Erro ao carregar clientes recentes
                    </td>
                </tr>
            `);
        }
    });
}

// Abrir modal para adicionar/editar cliente
function abrirModalCliente(id = null) {
    // Resetar formulário
    $('#cliente-form')[0].reset();
    $('#cliente-form .is-invalid').removeClass('is-invalid');
    $('#cliente-id').val('');
    
    // Aplicar máscara ao campo de telefone
    if ($.fn.mask) {
        $('#cliente-telefone').mask('(00) 00000-0000');
    } else {
        console.error('Plugin jQuery Mask não encontrado. Verifique se o arquivo está sendo carregado corretamente.');
    }
    
    if (id) {
        // Editar cliente existente
        $('#clienteModalLabel').text('Editar Cliente');
        
        // Carregar dados do cliente
        $.ajax({
            url: `/api/clientes/${id}`,
            type: 'GET',
            beforeSend: function() {
                // Mostrar indicador de carregamento
                $('#salvar-cliente-btn').prop('disabled', true);
            },
            success: function(cliente) {
                $('#cliente-id').val(cliente.id);
                $('#cliente-nome').val(cliente.nome);
                
                // Formatar telefone para exibição (caso ainda não esteja formatado)
                let telefone = cliente.telefone;
                if (telefone && telefone.replace(/\D/g, '').length === 11) {
                    // Se telefone tem 11 dígitos, pode aplicar formatação
                    $('#cliente-telefone').val(telefone);
                } else {
                    $('#cliente-telefone').val(telefone);
                }
                
                $('#cliente-email').val(cliente.email || '');
                
                // Reaplicar máscara após preencher dados
                if ($.fn.mask) {
                    $('#cliente-telefone').mask('(00) 00000-0000');
                }
                
                // Mostrar modal
                $('#clienteModal').modal('show');
            },
            error: function(xhr) {
                let mensagem = 'Erro ao carregar dados do cliente';
                
                if (xhr.responseJSON && xhr.responseJSON.erro) {
                    mensagem += ': ' + xhr.responseJSON.erro;
                }
                
                console.error('Erro ao carregar cliente:', xhr);
                alert(mensagem);
            },
            complete: function() {
                $('#salvar-cliente-btn').prop('disabled', false);
            }
        });
    } else {
        // Novo cliente
        $('#clienteModalLabel').text('Novo Cliente');
        $('#clienteModal').modal('show');
    }
}

// Salvar cliente (criar/atualizar)
function salvarCliente() {
    // Validar formulário
    const form = document.getElementById('cliente-form');
    
    if (!form.checkValidity()) {
        // Marcar campos inválidos
        Array.from(form.elements).forEach(input => {
            if (input.checkValidity()) {
                input.classList.remove('is-invalid');
            } else {
                input.classList.add('is-invalid');
            }
        });
        return;
    }
    
    // Limpar estados de erro anteriores
    $('#cliente-form .is-invalid').removeClass('is-invalid');
    
    // Obter dados do formulário
    const id = $('#cliente-id').val();
    const nome = $('#cliente-nome').val();
    const telefone = $('#cliente-telefone').val().replace(/\D/g, ''); // Remove todos os não dígitos
    const email = $('#cliente-email').val();
    
    // Preparar dados
    const data = {
        nome: nome,
        telefone: telefone,
        email: email.trim() === '' ? null : email
    };
    
    // Log para debug
    console.log('Enviando dados:', data);
    
    // Determinar URL e método
    const url = id ? `/api/clientes/${id}` : '/api/clientes';
    const method = id ? 'PUT' : 'POST';
    
    // Desabilitar botão enquanto salva
    $('#salvar-cliente-btn').prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-2"></span>Salvando...');
    
    // Função para limpar o formulário e recarregar os dados
    function limparFormularioERecarregar() {
        // Limpar formulário
        form.reset();
        $('#cliente-id').val('');
        
        // Recarregar dados com atraso para garantir que a API tenha processado as alterações
        setTimeout(function() {
            loadClientes(1, searchTerm); // Sempre voltar para a primeira página para ver o novo cliente
            loadClientesStats();
            loadRecentClientes();
        }, 300);
        
        // Feedback positivo
        showToast('Sucesso', id ? 'Cliente atualizado com sucesso!' : 'Cliente cadastrado com sucesso!', 'success');
    }
    
    // Enviar requisição
    $.ajax({
        url: url,
        type: method,
        contentType: 'application/json',
        data: JSON.stringify(data),
        success: function(response) {
            console.log('Cliente salvo com sucesso:', response);
            
            // Fechar modal
            const modalEl = document.getElementById('clienteModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) {
                modal.hide();
                limparFormularioERecarregar();
            } else {
                // Caso não consiga obter a instância do modal via bootstrap
                $('#clienteModal').modal('hide');
                limparFormularioERecarregar();
            }
        },
        error: function(xhr) {
            console.error('Erro ao salvar cliente:', xhr);
            
            let mensagem = 'Erro ao salvar cliente';
            
            if (xhr.responseJSON && xhr.responseJSON.erro) {
                mensagem = xhr.responseJSON.erro;
                
                // Marcar campos com erro
                if (xhr.responseJSON.detalhes) {
                    Object.keys(xhr.responseJSON.detalhes).forEach(campo => {
                        const elementoId = `cliente-${campo}`;
                        console.log(`Marcando campo como inválido: ${elementoId}`);
                        
                        const elemento = $(`#${elementoId}`);
                        if (elemento.length) {
                            elemento.addClass('is-invalid');
                            
                            // Atualizar mensagem de erro específica
                            const feedbackEl = elemento.siblings('.invalid-feedback');
                            if (feedbackEl.length) {
                                feedbackEl.text(xhr.responseJSON.detalhes[campo]);
                            }
                        }
                    });
                }
            }
            
            // Mostrar notificação de erro
            showToast('Erro', mensagem, 'danger');
        },
        complete: function() {
            // Restaurar estado do botão
            $('#salvar-cliente-btn').prop('disabled', false).text('Salvar');
        }
    });
}

// Confirmar exclusão de cliente
function confirmDeleteCliente(id) {
    if (confirm('Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.')) {
        deleteCliente(id);
    }
}

// Excluir cliente
function deleteCliente(id) {
    $.ajax({
        url: `/api/clientes/${id}`,
        type: 'DELETE',
        success: function(response) {
            showToast('Sucesso', 'Cliente excluído com sucesso!', 'success');
            
            // Recarregar dados
            loadClientes(currentPage, searchTerm);
            loadClientesStats();
            loadRecentClientes();
        },
        error: function(xhr) {
            let mensagem = 'Erro ao excluir cliente';
            
            if (xhr.responseJSON && xhr.responseJSON.erro) {
                mensagem = xhr.responseJSON.erro;
            }
            
            showToast('Erro', mensagem, 'danger');
        }
    });
}

// Ver perfil do cliente
function viewClienteProfile(id) {
    // Implementar visualização de perfil (próxima fase)
    alert('Visualização detalhada do perfil do cliente será implementada em breve!');
}

// Exportar clientes
function exportClientes() {
    // Implementar exportação
    alert('Funcionalidade de exportação será implementada em breve!');
}

// Imprimir clientes
function printClientes() {
    // Implementar impressão
    window.print();
}

// Importar clientes
function importClientes() {
    // Implementar importação
    alert('Funcionalidade de importação será implementada em breve!');
}

// Exibir toast de notificação
function showToast(titulo, mensagem, tipo = 'info') {
    // Verificar se está implementado em uma função global
    if (typeof window.showToast === 'function') {
        window.showToast(titulo, mensagem, tipo);
    } else {
        // Criar elemento de alerta
        const alert = document.createElement('div');
        alert.className = `alert alert-${tipo} alert-dismissible fade show`;
        alert.role = 'alert';
        alert.innerHTML = `
            <strong>${titulo}:</strong> ${mensagem}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
        `;
        
        // Adicionar ao topo da página
        const container = document.querySelector('#clientes');
        container.insertBefore(alert, container.firstChild);
        
        // Remover automaticamente após alguns segundos
        setTimeout(() => {
            if (alert.parentNode) {
                alert.parentNode.removeChild(alert);
            }
        }, 5000);
    }
} 