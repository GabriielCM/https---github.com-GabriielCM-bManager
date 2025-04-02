// Funções para gerenciamento de produtos

// Carregar lista de produtos
function loadProdutos(page = 1, search = '') {
    // Mostrar loading
    $('#produtos-lista-completa').html('');
    $('#produtos-loading').removeClass('d-none');
    $('#produtos-empty').addClass('d-none');
    
    let url = `${API_URL}/produtos?page=${page}`;
    if (search) {
        url += `&search=${encodeURIComponent(search)}`;
    }
    
    $.ajax({
        url: url,
        type: 'GET',
        success: function(response) {
            $('#produtos-loading').addClass('d-none');
            
            if (response.produtos.length === 0) {
                $('#produtos-empty').removeClass('d-none');
                $('#produtos-paginacao').html('');
            } else {
                let tableHTML = '';
                
                response.produtos.forEach(produto => {
                    const estoqueBaixo = produto.estoque <= produto.estoque_minimo;
                    
                    tableHTML += `
                    <tr>
                        <td>${produto.codigo || 'N/A'}</td>
                        <td>${produto.nome}</td>
                        <td>${produto.estoque}</td>
                        <td>${produto.estoque_minimo}</td>
                        <td>R$ ${produto.preco.toFixed(2).replace('.', ',')}</td>
                        <td>${produto.estoque > 0 ? '<span class="badge bg-success">Disponível</span>' : '<span class="badge bg-danger">Indisponível</span>'}</td>
                        <td>
                            <i class="fas fa-edit action-icon edit" title="Editar" data-id="${produto.id}"></i>
                            <i class="fas fa-box action-icon" title="Ajustar Estoque" data-id="${produto.id}"></i>
                            <i class="fas fa-trash-alt action-icon delete" title="Excluir" data-id="${produto.id}"></i>
                        </td>
                    </tr>`;
                });
                
                $('#produtos-lista-completa').html(tableHTML);
                
                // Gerar a paginação
                generatePagination('#produtos-paginacao', page, response.total_pages, function(newPage) {
                    loadProdutos(newPage, search);
                });
                
                // Carregar produtos com estoque baixo
                loadProdutosEstoqueBaixo();
                
                // Criar gráfico de produtos mais vendidos
                loadProdutosMaisVendidos();
            }
        },
        error: function() {
            $('#produtos-loading').addClass('d-none');
            $('#produtos-lista-completa').html('<tr><td colspan="7" class="text-center text-danger">Erro ao carregar produtos</td></tr>');
        }
    });
}

// Carregar produtos com estoque baixo
function loadProdutosEstoqueBaixo() {
    $.ajax({
        url: `${API_URL}/produtos/estoque-baixo`,
        type: 'GET',
        success: function(response) {
            if (response.length === 0) {
                $('#produtos-estoque-baixo-lista').empty();
                $('#produtos-estoque-baixo-empty').removeClass('d-none');
            } else {
                $('#produtos-estoque-baixo-empty').addClass('d-none');
                
                let tableHTML = '';
                
                response.forEach(produto => {
                    tableHTML += `
                    <tr>
                        <td>${produto.nome}</td>
                        <td class="text-danger">${produto.estoque}</td>
                        <td>${produto.estoque_minimo}</td>
                        <td>
                            <button class="btn btn-sm btn-primary ajustar-estoque" data-id="${produto.id}">
                                <i class="fas fa-plus-circle me-1"></i>Ajustar
                            </button>
                        </td>
                    </tr>`;
                });
                
                $('#produtos-estoque-baixo-lista').html(tableHTML);
                
                // Evento para o botão de ajustar estoque
                $('.ajustar-estoque').on('click', function() {
                    const produtoId = $(this).data('id');
                    openModalAjusteEstoque(produtoId);
                });
            }
        },
        error: function() {
            $('#produtos-estoque-baixo-lista').html('<tr><td colspan="4" class="text-center text-danger">Erro ao carregar produtos com estoque baixo</td></tr>');
        }
    });
}

// Carregar produtos mais vendidos
function loadProdutosMaisVendidos() {
    $.ajax({
        url: `${API_URL}/produtos/mais-vendidos`,
        type: 'GET',
        success: function(response) {
            if (response.length > 0) {
                createProdutosChart(response);
            }
        }
    });
}

// Criar gráfico de produtos mais vendidos
function createProdutosChart(produtos) {
    // Ordenar por quantidade vendida
    produtos.sort((a, b) => b.quantidade_vendida - a.quantidade_vendida);
    
    // Pegar os 5 primeiros
    const top5 = produtos.slice(0, 5);
    
    // Dados para o gráfico
    const labels = top5.map(produto => produto.nome);
    const data = top5.map(produto => produto.quantidade_vendida);
    
    // Verificar se já existe um gráfico e destruí-lo
    if (window.produtosChart) {
        window.produtosChart.destroy();
    }
    
    // Criar o gráfico
    const ctx = document.getElementById('produtos-vendidos-chart').getContext('2d');
    window.produtosChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Quantidade Vendida',
                data: data,
                backgroundColor: '#4e73df',
                borderColor: '#4e73df',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    precision: 0
                }
            }
        }
    });
}

// Abrir modal de produto (novo ou edição)
function openModalProduto(id = null) {
    // Limpar formulário
    $('#form-produto')[0].reset();
    $('#produto-error').addClass('d-none');
    
    if (id) {
        // Carregar dados do produto para edição
        $('#modal-produto-title').text('Editar Produto');
        $('#produto-id').val(id);
        
        // Carregar os dados do produto
        $.ajax({
            url: `${API_URL}/produtos/${id}`,
            type: 'GET',
            success: function(produto) {
                // Preencher os campos do formulário
                $('#produto-nome').val(produto.nome);
                $('#produto-codigo').val(produto.codigo);
                $('#produto-preco').val(produto.preco);
                $('#produto-estoque').val(produto.estoque);
                $('#produto-estoque-minimo').val(produto.estoque_minimo);
                $('#produto-descricao').val(produto.descricao);
                
                // Mostrar o modal
                const modal = new bootstrap.Modal(document.getElementById('modal-produto'));
                modal.show();
            },
            error: function() {
                alert('Erro ao carregar dados do produto');
            }
        });
    } else {
        // Novo produto
        $('#modal-produto-title').text('Novo Produto');
        $('#produto-id').val('');
        
        // Mostrar o modal
        const modal = new bootstrap.Modal(document.getElementById('modal-produto'));
        modal.show();
    }
}

// Abrir modal de ajuste de estoque
function openModalAjusteEstoque(id) {
    // Limpar formulário
    $('#form-ajuste-estoque')[0].reset();
    $('#ajuste-estoque-error').addClass('d-none');
    
    // Carregar os dados do produto
    $.ajax({
        url: `${API_URL}/produtos/${id}`,
        type: 'GET',
        success: function(produto) {
            $('#ajuste-produto-id').val(produto.id);
            $('#ajuste-produto-nome').text(produto.nome);
            $('#ajuste-estoque-atual').text(produto.estoque);
            $('#ajuste-quantidade').val(produto.estoque);
            
            // Mostrar o modal
            const modal = new bootstrap.Modal(document.getElementById('modal-ajuste-estoque'));
            modal.show();
        },
        error: function() {
            alert('Erro ao carregar dados do produto');
        }
    });
}

// Salvar produto
function salvarProduto() {
    // Verificar se os campos obrigatórios estão preenchidos
    if (!validarFormulario('#form-produto')) {
        return;
    }
    
    // Obter os dados do formulário
    const nome = $('#produto-nome').val();
    const codigo = $('#produto-codigo').val();
    const preco = parseFloat($('#produto-preco').val());
    const estoque = parseInt($('#produto-estoque').val());
    const estoqueMinimo = parseInt($('#produto-estoque-minimo').val());
    const descricao = $('#produto-descricao').val();
    
    // Criar o objeto de dados para enviar
    const dados = {
        nome: nome,
        codigo: codigo,
        preco: preco,
        estoque: estoque,
        estoque_minimo: estoqueMinimo,
        descricao: descricao
    };
    
    // Verificar se é um novo produto ou uma edição
    const id = $('#produto-id').val();
    const url = id ? `${API_URL}/produtos/${id}` : `${API_URL}/produtos`;
    const method = id ? 'PUT' : 'POST';
    
    // Enviar os dados para a API
    $.ajax({
        url: url,
        type: method,
        contentType: 'application/json',
        data: JSON.stringify(dados),
        success: function() {
            // Fechar o modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('modal-produto'));
            modal.hide();
            
            // Recarregar a lista de produtos
            loadProdutos();
            
            // Mostrar mensagem de sucesso
            showAlert('success', 'Produto salvo com sucesso!');
        },
        error: function(xhr) {
            let erro = "Erro ao salvar produto";
            if (xhr.responseJSON && xhr.responseJSON.erro) {
                erro = xhr.responseJSON.erro;
            }
            $('#produto-error').text(erro).removeClass('d-none');
        }
    });
}

// Salvar ajuste de estoque
function salvarAjusteEstoque() {
    // Verificar se os campos obrigatórios estão preenchidos
    if (!validarFormulario('#form-ajuste-estoque')) {
        return;
    }
    
    // Obter os dados do formulário
    const produtoId = $('#ajuste-produto-id').val();
    const quantidade = parseInt($('#ajuste-quantidade').val());
    const tipo = $('#ajuste-tipo').val();
    const observacao = $('#ajuste-observacao').val();
    
    // Criar o objeto de dados para enviar
    const dados = {
        produto_id: produtoId,
        quantidade: quantidade,
        tipo: tipo,
        observacao: observacao
    };
    
    // Enviar os dados para a API
    $.ajax({
        url: `${API_URL}/produtos/ajuste-estoque`,
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(dados),
        success: function() {
            // Fechar o modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('modal-ajuste-estoque'));
            modal.hide();
            
            // Recarregar a lista de produtos
            loadProdutos();
            
            // Mostrar mensagem de sucesso
            showAlert('success', 'Estoque ajustado com sucesso!');
        },
        error: function(xhr) {
            let erro = "Erro ao ajustar estoque";
            if (xhr.responseJSON && xhr.responseJSON.erro) {
                erro = xhr.responseJSON.erro;
            }
            $('#ajuste-estoque-error').text(erro).removeClass('d-none');
        }
    });
}

// Inicializar eventos
$(document).ready(function() {
    // Evento para salvar produto
    $('#btn-salvar-produto').on('click', function() {
        salvarProduto();
    });
    
    // Evento para salvar ajuste de estoque
    $('#btn-salvar-ajuste').on('click', function() {
        salvarAjusteEstoque();
    });
    
    // Evento para buscar produtos
    $('#produto-busca-btn').on('click', function() {
        const search = $('#produto-busca').val();
        loadProdutos(1, search);
    });
    
    // Evento para limpar busca de produtos
    $('#produto-busca').on('keyup', function(e) {
        if (e.key === 'Enter') {
            $('#produto-busca-btn').click();
        } else if ($(this).val() === '') {
            loadProdutos();
        }
    });
});

// Função para renderizar a lista de produtos
function renderProdutos(produtos, elementId) {
    const $element = $(`#${elementId}`);
    if (!produtos || produtos.length === 0) {
        $element.html(`
            <tr>
                <td colspan="7" class="text-center py-4">
                    <i class="fas fa-box-open fa-2x text-muted mb-3"></i>
                    <p class="mb-0">Nenhum produto encontrado.</p>
                </td>
            </tr>
        `);
        return;
    }

    let html = '';
    produtos.forEach(produto => {
        // Verificar status de estoque
        const estoqueClass = produto.estoque <= produto.estoque_minimo 
            ? 'text-danger fw-bold' 
            : (produto.estoque <= produto.estoque_minimo * 1.5 ? 'text-warning fw-medium' : '');
        
        // Status do produto
        const statusBadge = produto.status === 'ativo'
            ? '<span class="status-badge bg-success">Ativo</span>'
            : '<span class="status-badge bg-secondary">Inativo</span>';
            
        html += `
            <tr>
                <td><span class="badge bg-light text-dark">${produto.codigo || '-'}</span></td>
                <td>
                    <div class="fw-medium">${produto.nome}</div>
                    <small class="text-muted">${produto.descricao ? produto.descricao.substring(0, 50) + (produto.descricao.length > 50 ? '...' : '') : ''}</small>
                </td>
                <td class="${estoqueClass}">${produto.estoque}</td>
                <td>${produto.estoque_minimo}</td>
                <td>R$ ${formatarValor(produto.preco)}</td>
                <td>${statusBadge}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-primary rounded-circle" 
                            data-bs-toggle="tooltip" 
                            title="Editar produto" 
                            onclick="editarProduto(${produto.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-info rounded-circle ms-1" 
                            data-bs-toggle="tooltip" 
                            title="Ajustar estoque" 
                            onclick="ajustarEstoque(${produto.id})">
                        <i class="fas fa-boxes-stacked"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger rounded-circle ms-1" 
                            data-bs-toggle="tooltip" 
                            title="${produto.status === 'ativo' ? 'Desativar' : 'Ativar'} produto" 
                            onclick="toggleStatusProduto(${produto.id}, '${produto.status === 'ativo' ? 'inativo' : 'ativo'}')">
                        <i class="fas ${produto.status === 'ativo' ? 'fa-toggle-off' : 'fa-toggle-on'}"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    $element.html(html);
    
    // Inicializar tooltips
    $('[data-bs-toggle="tooltip"]').tooltip();
}

// Função para formatar valor monetário
function formatarValor(valor) {
    return parseFloat(valor).toFixed(2).replace('.', ',');
} 