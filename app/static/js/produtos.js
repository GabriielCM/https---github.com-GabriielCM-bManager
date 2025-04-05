// Funções para gerenciamento de produtos
document.addEventListener('DOMContentLoaded', function() {
    console.log('Página de produtos carregada com sucesso!');
    
    // Inicializar página
    inicializarPagina();
    
    // Eventos dos botões
    configurarEventos();
});

// Inicialização da página
function inicializarPagina() {
    // Carregar lista de produtos
    carregarProdutos();
    
    // Carregar categorias para o filtro
    carregarCategorias();
    
    // Destacar o link de produtos no sidebar como ativo
    const produtosLink = document.getElementById('produtos-link');
    if (produtosLink) {
        const sidebarLinks = document.querySelectorAll('.nav-link');
        sidebarLinks.forEach(link => link.classList.remove('active'));
        produtosLink.classList.add('active');
    }
}

// Configurar eventos dos elementos da página
function configurarEventos() {
    // Botão de busca
    document.getElementById('produto-busca-btn').addEventListener('click', function() {
        const busca = document.getElementById('produto-busca').value;
        carregarProdutos(1, busca);
    });
    
    // Enter no campo de busca
    document.getElementById('produto-busca').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const busca = this.value;
            carregarProdutos(1, busca);
        }
    });
    
    // Filtro de categoria
    document.getElementById('produto-categoria-filtro').addEventListener('change', function() {
        const busca = document.getElementById('produto-busca').value;
        carregarProdutos(1, busca);
    });
    
    // Botão novo produto (topo da página)
    document.getElementById('produto-novo-btn').addEventListener('click', function() {
        abrirModalProduto();
    });
    
    // Botão novo produto (mensagem vazia)
    const btnEmpty = document.getElementById('produto-novo-btn-empty');
    if (btnEmpty) {
        btnEmpty.addEventListener('click', function() {
            abrirModalProduto();
        });
    }
    
    // Botão salvar produto
    document.getElementById('salvar-produto').addEventListener('click', function() {
        salvarProduto();
    });
    
    // Botão salvar estoque
    document.getElementById('salvar-estoque').addEventListener('click', function() {
        salvarAjusteEstoque();
    });
    
    // Preview de imagem
    document.getElementById('produto-imagem').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const preview = document.getElementById('produto-imagem-preview');
                preview.querySelector('img').src = e.target.result;
                preview.classList.remove('d-none');
            };
            reader.readAsDataURL(file);
        }
    });
    
    // Remover imagem
    document.getElementById('remover-imagem').addEventListener('click', function() {
        document.getElementById('produto-imagem').value = '';
        document.getElementById('produto-imagem-preview').classList.add('d-none');
    });
    
    // Delegação de eventos para botões na tabela de produtos
    document.getElementById('produtos-lista').addEventListener('click', function(e) {
        const target = e.target;
        
        // Editar produto
        if (target.classList.contains('editar-produto')) {
            const id = target.getAttribute('data-id');
            abrirModalProduto(id);
        }
        
        // Ajustar estoque
        if (target.classList.contains('ajustar-estoque')) {
            const id = target.getAttribute('data-id');
            abrirModalEstoque(id);
        }
        
        // Ver histórico
        if (target.classList.contains('ver-historico')) {
            const id = target.getAttribute('data-id');
            abrirModalHistorico(id);
        }
        
        // Excluir produto
        if (target.classList.contains('excluir-produto')) {
            const id = target.getAttribute('data-id');
            confirmarExclusao(id);
        }
    });
}

// Carregar lista de produtos
function carregarProdutos(pagina = 1, busca = '') {
    // Mostrar loading
    document.getElementById('produtos-lista').innerHTML = '';
    document.getElementById('produtos-loading').classList.remove('d-none');
    document.getElementById('produtos-empty').classList.add('d-none');
    
    // Construir URL com filtros
    let url = `/api/produtos?pagina=${pagina}&por_pagina=10`;
    
    if (busca) {
        url += `&busca=${encodeURIComponent(busca)}`;
    }
    
    // Filtro de categoria
    const categoria = document.getElementById('produto-categoria-filtro').value;
    if (categoria) {
        url += `&categoria=${encodeURIComponent(categoria)}`;
    }
    
    // Fazer requisição AJAX
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('Erro ao carregar produtos');
            }
            return response.json();
        })
        .then(data => {
            document.getElementById('produtos-loading').classList.add('d-none');
            
            if (data.items.length === 0) {
                document.getElementById('produtos-empty').classList.remove('d-none');
                document.getElementById('produtos-paginacao').innerHTML = '';
            } else {
                let tabela = '';
                
                data.items.forEach(produto => {
                    const estoqueBaixo = produto.quantidade_estoque <= produto.estoque_minimo;
                    const estoqueClasse = estoqueBaixo ? 'text-danger' : '';
                    
                    tabela += `
                    <tr>
                        <td>${produto.codigo || '-'}</td>
                        <td>${produto.nome}</td>
                        <td>${produto.categoria || '-'}</td>
                        <td class="${estoqueClasse}">${produto.quantidade_estoque}</td>
                        <td>${produto.estoque_minimo}</td>
                        <td>R$ ${formatarValor(produto.preco)}</td>
                        <td>${produto.quantidade_estoque > 0 ? 
                            '<span class="badge bg-success">Disponível</span>' : 
                            '<span class="badge bg-danger">Indisponível</span>'}</td>
                        <td class="text-center">
                            <button class="btn btn-sm btn-outline-primary editar-produto" data-id="${produto.id}" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-warning ajustar-estoque" data-id="${produto.id}" title="Ajustar Estoque">
                                <i class="fas fa-box"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-info ver-historico" data-id="${produto.id}" title="Histórico">
                                <i class="fas fa-history"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger excluir-produto" data-id="${produto.id}" title="Excluir">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>`;
                });
                
                document.getElementById('produtos-lista').innerHTML = tabela;
                
                // Gerar paginação
                gerarPaginacao('produtos-paginacao', pagina, data.paginas, function(novaPagina) {
                    carregarProdutos(novaPagina, busca);
                });
                
                // Carregar produtos com estoque baixo
                carregarProdutosEstoqueBaixo();
                
                // Carregar produtos mais vendidos
                carregarProdutosMaisVendidos();
            }
        })
        .catch(error => {
            console.error('Erro:', error);
            document.getElementById('produtos-loading').classList.add('d-none');
            document.getElementById('produtos-lista').innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-danger">
                        Erro ao carregar produtos. Tente novamente.
                    </td>
                </tr>`;
        });
}

// Carregar categorias para o filtro e datalist
function carregarCategorias() {
    fetch('/api/produtos/categorias')
        .then(response => {
            if (!response.ok) {
                throw new Error('Erro ao carregar categorias');
            }
            return response.json();
        })
        .then(categorias => {
            // Preencher select de filtro
            const select = document.getElementById('produto-categoria-filtro');
            categorias.forEach(categoria => {
                const option = document.createElement('option');
                option.value = categoria;
                option.textContent = categoria;
                select.appendChild(option);
            });
            
            // Preencher datalist
            const datalist = document.getElementById('categorias-list');
            categorias.forEach(categoria => {
                const option = document.createElement('option');
                option.value = categoria;
                datalist.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Erro ao carregar categorias:', error);
        });
}

// Carregar produtos com estoque baixo
function carregarProdutosEstoqueBaixo() {
    fetch('/api/produtos/estoque-baixo')
        .then(response => {
            if (!response.ok) {
                throw new Error('Erro ao carregar produtos com estoque baixo');
            }
            return response.json();
        })
        .then(produtos => {
            const tbody = document.getElementById('produtos-baixo-estoque');
            const empty = document.getElementById('produtos-baixo-estoque-empty');
            
            if (produtos.length === 0) {
                tbody.innerHTML = '';
                empty.classList.remove('d-none');
            } else {
                empty.classList.add('d-none');
                
                let html = '';
                produtos.forEach(produto => {
                    html += `
                    <tr>
                        <td>${produto.nome}</td>
                        <td class="text-danger">${produto.quantidade_estoque}</td>
                        <td>${produto.estoque_minimo}</td>
                        <td>
                            <button class="btn btn-sm btn-warning ajustar-estoque" data-id="${produto.id}">
                                <i class="fas fa-plus-circle me-1"></i>Ajustar
                            </button>
                        </td>
                    </tr>`;
                });
                
                tbody.innerHTML = html;
                
                // Adicionar evento aos botões
                const botoes = tbody.querySelectorAll('.ajustar-estoque');
                botoes.forEach(botao => {
                    botao.addEventListener('click', function() {
                        const id = this.getAttribute('data-id');
                        abrirModalEstoque(id);
                    });
                });
            }
        })
        .catch(error => {
            console.error('Erro:', error);
        });
}

// Carregar produtos mais vendidos para o gráfico
function carregarProdutosMaisVendidos() {
    fetch('/api/produtos/mais-vendidos?periodo=mes&limite=5')
        .then(response => {
            if (!response.ok) {
                throw new Error('Erro ao carregar produtos mais vendidos');
            }
            return response.json();
        })
        .then(produtos => {
            if (produtos.length > 0) {
                criarGraficoProdutos(produtos);
            } else {
                document.getElementById('produtos-mais-vendidos-empty').classList.remove('d-none');
            }
        })
        .catch(error => {
            console.error('Erro:', error);
        });
}

// Criar gráfico de produtos mais vendidos
function criarGraficoProdutos(produtos) {
    // Preparar dados para o gráfico
    const labels = produtos.map(p => p.nome);
    const dados = produtos.map(p => p.total_vendido);
    
    // Verificar se já existe um gráfico
    if (window.produtosMaisVendidosChart) {
        window.produtosMaisVendidosChart.destroy();
    }
    
    // Criar o gráfico
    const ctx = document.getElementById('produtos-mais-vendidos-chart').getContext('2d');
    window.produtosMaisVendidosChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Quantidade Vendida',
                data: dados,
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
                    ticks: {
                        precision: 0
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// Abrir modal de produto (novo ou edição)
function abrirModalProduto(id = null) {
    // Resetar formulário
    document.getElementById('form-produto').reset();
    document.getElementById('produto-error').classList.add('d-none');
    document.getElementById('produto-imagem-preview').classList.add('d-none');
    
    const modalTitle = document.getElementById('modal-produto-label');
    
    if (id) {
        // Edição de produto existente
        modalTitle.textContent = 'Editar Produto';
        document.getElementById('produto-id').value = id;
        
        // Carregar dados do produto
        fetch(`/api/produtos/${id}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Erro ao carregar produto');
                }
                return response.json();
            })
            .then(produto => {
                // Preencher campos
                document.getElementById('produto-codigo').value = produto.codigo || '';
                document.getElementById('produto-nome').value = produto.nome;
                document.getElementById('produto-descricao').value = produto.descricao || '';
                document.getElementById('produto-categoria').value = produto.categoria || '';
                document.getElementById('produto-marca').value = produto.marca || '';
                document.getElementById('produto-unidade').value = produto.unidade_medida || 'un';
                document.getElementById('produto-preco').value = produto.preco;
                document.getElementById('produto-preco-custo').value = produto.preco_custo || '';
                document.getElementById('produto-estoque').value = produto.quantidade_estoque;
                document.getElementById('produto-estoque-minimo').value = produto.estoque_minimo;
                
                // Imagem (se houver)
                if (produto.imagem_url) {
                    document.getElementById('produto-imagem-preview').querySelector('img').src = produto.imagem_url;
                    document.getElementById('produto-imagem-preview').classList.remove('d-none');
                }
                
                // Abrir modal
                const modal = new bootstrap.Modal(document.getElementById('modal-produto'));
                modal.show();
            })
            .catch(error => {
                console.error('Erro:', error);
                mostrarAlerta('erro', 'Erro ao carregar produto');
            });
    } else {
        // Novo produto
        modalTitle.textContent = 'Novo Produto';
        document.getElementById('produto-id').value = '';
        
        // Abrir modal
        const modal = new bootstrap.Modal(document.getElementById('modal-produto'));
        modal.show();
    }
}

// Abrir modal de ajuste de estoque
function abrirModalEstoque(id) {
    // Resetar formulário
    document.getElementById('form-estoque').reset();
    document.getElementById('estoque-error').classList.add('d-none');
    document.getElementById('estoque-produto-id').value = id;
    
    // Carregar dados do produto
    fetch(`/api/produtos/${id}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Erro ao carregar produto');
            }
            return response.json();
        })
        .then(produto => {
            // Preencher campos
            document.getElementById('estoque-produto-nome').value = produto.nome;
            document.getElementById('estoque-atual').value = produto.quantidade_estoque;
            document.getElementById('estoque-minimo').value = produto.estoque_minimo;
            
            // Abrir modal
            const modal = new bootstrap.Modal(document.getElementById('modal-estoque'));
            modal.show();
        })
        .catch(error => {
            console.error('Erro:', error);
            mostrarAlerta('erro', 'Erro ao carregar produto');
        });
}

// Abrir modal de histórico de movimentações
function abrirModalHistorico(id) {
    // Mostrar loading
    document.getElementById('historico-lista').innerHTML = '';
    document.getElementById('historico-loading').classList.remove('d-none');
    document.getElementById('historico-empty').classList.add('d-none');
    
    // Abrir modal
    const modal = new bootstrap.Modal(document.getElementById('modal-historico'));
    modal.show();
    
    // Carregar dados do produto
    fetch(`/api/produtos/${id}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Erro ao carregar produto');
            }
            return response.json();
        })
        .then(produto => {
            // Atualizar título
            document.getElementById('historico-produto-nome').textContent = produto.nome;
            
            // Carregar movimentações
            return fetch(`/api/produtos/${id}/movimentos`);
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Erro ao carregar movimentações');
            }
            return response.json();
        })
        .then(movimentos => {
            document.getElementById('historico-loading').classList.add('d-none');
            
            if (movimentos.length === 0) {
                document.getElementById('historico-empty').classList.remove('d-none');
            } else {
                let html = '';
                
                movimentos.forEach(mov => {
                    // Formatar data
                    const data = new Date(mov.data);
                    const dataFormatada = data.toLocaleDateString('pt-BR') + ' ' + 
                                         data.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
                    
                    // Determinar classe de acordo com o tipo
                    let tipoClasse = '';
                    let tipoTexto = '';
                    
                    if (mov.tipo === 'entrada') {
                        tipoClasse = 'bg-success';
                        tipoTexto = 'Entrada';
                    } else if (mov.tipo === 'saida') {
                        tipoClasse = 'bg-danger';
                        tipoTexto = 'Saída';
                    } else {
                        tipoClasse = 'bg-warning';
                        tipoTexto = 'Ajuste';
                    }
                    
                    html += `
                    <tr>
                        <td>${dataFormatada}</td>
                        <td><span class="badge ${tipoClasse}">${tipoTexto}</span></td>
                        <td>${mov.quantidade}</td>
                        <td>${mov.motivo || '-'}</td>
                    </tr>`;
                });
                
                document.getElementById('historico-lista').innerHTML = html;
            }
        })
        .catch(error => {
            console.error('Erro:', error);
            document.getElementById('historico-loading').classList.add('d-none');
            document.getElementById('historico-lista').innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-danger">
                        Erro ao carregar histórico. Tente novamente.
                    </td>
                </tr>`;
        });
}

// Salvar produto (novo ou edição)
function salvarProduto() {
    // Desabilitar botão para evitar múltiplos envios
    const botao = document.getElementById('salvar-produto');
    botao.disabled = true;
    botao.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Salvando...';
    
    // Coletar dados do formulário
    const id = document.getElementById('produto-id').value;
    const isNovo = !id;
    
    const dados = {
        codigo: document.getElementById('produto-codigo').value || null,
        nome: document.getElementById('produto-nome').value,
        descricao: document.getElementById('produto-descricao').value || null,
        categoria: document.getElementById('produto-categoria').value || null,
        marca: document.getElementById('produto-marca').value || null,
        unidade_medida: document.getElementById('produto-unidade').value,
        preco: parseFloat(document.getElementById('produto-preco').value) || 0,
        preco_custo: parseFloat(document.getElementById('produto-preco-custo').value) || null,
        quantidade_estoque: parseInt(document.getElementById('produto-estoque').value) || 0,
        estoque_minimo: parseInt(document.getElementById('produto-estoque-minimo').value) || 5
    };
    
    // Validar campos obrigatórios
    if (!dados.nome) {
        document.getElementById('produto-error').textContent = 'O nome do produto é obrigatório';
        document.getElementById('produto-error').classList.remove('d-none');
        botao.disabled = false;
        botao.textContent = 'Salvar';
        return;
    }
    
    // Preparar URL e método
    const url = isNovo ? '/api/produtos' : `/api/produtos/${id}`;
    const metodo = isNovo ? 'POST' : 'PUT';
    
    // Enviar dados
    fetch(url, {
        method: metodo,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(dados)
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.erro || 'Erro ao salvar produto');
            });
        }
        return response.json();
    })
    .then(data => {
        // Fechar modal
        bootstrap.Modal.getInstance(document.getElementById('modal-produto')).hide();
        
        // Recarregar lista
        carregarProdutos();
        
        // Mostrar mensagem de sucesso
        mostrarAlerta('sucesso', isNovo ? 'Produto cadastrado com sucesso!' : 'Produto atualizado com sucesso!');
    })
    .catch(error => {
        console.error('Erro:', error);
        document.getElementById('produto-error').textContent = error.message;
        document.getElementById('produto-error').classList.remove('d-none');
    })
    .finally(() => {
        // Restaurar botão
        botao.disabled = false;
        botao.textContent = 'Salvar';
    });
}

// Salvar ajuste de estoque
function salvarAjusteEstoque() {
    // Desabilitar botão para evitar múltiplos envios
    const botao = document.getElementById('salvar-estoque');
    botao.disabled = true;
    botao.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Salvando...';
    
    // Coletar dados do formulário
    const produtoId = document.getElementById('estoque-produto-id').value;
    const tipo = document.getElementById('estoque-tipo').value;
    const quantidade = parseInt(document.getElementById('estoque-quantidade').value);
    const motivo = document.getElementById('estoque-motivo').value;
    
    // Validar campos
    if (!quantidade || quantidade <= 0) {
        document.getElementById('estoque-error').textContent = 'Informe uma quantidade válida';
        document.getElementById('estoque-error').classList.remove('d-none');
        botao.disabled = false;
        botao.textContent = 'Confirmar';
        return;
    }
    
    // Preparar dados
    const dados = {
        tipo: tipo,
        quantidade: quantidade,
        motivo: motivo
    };
    
    // Enviar dados
    fetch(`/api/produtos/${produtoId}/estoque`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(dados)
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.erro || 'Erro ao ajustar estoque');
            });
        }
        return response.json();
    })
    .then(data => {
        // Fechar modal
        bootstrap.Modal.getInstance(document.getElementById('modal-estoque')).hide();
        
        // Recarregar lista
        carregarProdutos();
        
        // Mostrar mensagem de sucesso
        mostrarAlerta('sucesso', data.mensagem);
    })
    .catch(error => {
        console.error('Erro:', error);
        document.getElementById('estoque-error').textContent = error.message;
        document.getElementById('estoque-error').classList.remove('d-none');
    })
    .finally(() => {
        // Restaurar botão
        botao.disabled = false;
        botao.textContent = 'Confirmar';
    });
}

// Confirmar exclusão de produto
function confirmarExclusao(id) {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
        // Enviar requisição de exclusão
        fetch(`/api/produtos/${id}`, {
            method: 'DELETE'
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.erro || 'Erro ao excluir produto');
                });
            }
            return response.json();
        })
        .then(data => {
            // Recarregar lista
            carregarProdutos();
            
            // Mostrar mensagem de sucesso
            mostrarAlerta('sucesso', data.mensagem);
        })
        .catch(error => {
            console.error('Erro:', error);
            mostrarAlerta('erro', error.message);
        });
    }
}

// Gerar HTML de paginação
function gerarPaginacao(elementId, paginaAtual, totalPaginas, callback) {
    if (totalPaginas <= 1) {
        document.getElementById(elementId).innerHTML = '';
        return;
    }
    
    let html = '';
    
    // Botão anterior
    html += `
    <li class="page-item ${paginaAtual === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" data-pagina="${paginaAtual - 1}" aria-label="Anterior">
            <span aria-hidden="true">&laquo;</span>
        </a>
    </li>`;
    
    // Páginas
    const maxPages = 5;
    let startPage = Math.max(1, paginaAtual - Math.floor(maxPages / 2));
    let endPage = Math.min(totalPaginas, startPage + maxPages - 1);
    
    if (endPage - startPage + 1 < maxPages) {
        startPage = Math.max(1, endPage - maxPages + 1);
    }
    
    // Primeira página
    if (startPage > 1) {
        html += `
        <li class="page-item">
            <a class="page-link" href="#" data-pagina="1">1</a>
        </li>`;
        
        if (startPage > 2) {
            html += `
            <li class="page-item disabled">
                <span class="page-link">...</span>
            </li>`;
        }
    }
    
    // Páginas do meio
    for (let i = startPage; i <= endPage; i++) {
        html += `
        <li class="page-item ${i === paginaAtual ? 'active' : ''}">
            <a class="page-link" href="#" data-pagina="${i}">${i}</a>
        </li>`;
    }
    
    // Última página
    if (endPage < totalPaginas) {
        if (endPage < totalPaginas - 1) {
            html += `
            <li class="page-item disabled">
                <span class="page-link">...</span>
            </li>`;
        }
        
        html += `
        <li class="page-item">
            <a class="page-link" href="#" data-pagina="${totalPaginas}">${totalPaginas}</a>
        </li>`;
    }
    
    // Botão próximo
    html += `
    <li class="page-item ${paginaAtual === totalPaginas ? 'disabled' : ''}">
        <a class="page-link" href="#" data-pagina="${paginaAtual + 1}" aria-label="Próximo">
            <span aria-hidden="true">&raquo;</span>
        </a>
    </li>`;
    
    // Atualizar HTML
    document.getElementById(elementId).innerHTML = html;
    
    // Adicionar eventos
    const links = document.getElementById(elementId).querySelectorAll('.page-link');
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const pagina = parseInt(this.getAttribute('data-pagina'));
            if (pagina && !isNaN(pagina) && pagina !== paginaAtual) {
                callback(pagina);
            }
        });
    });
}

// Exibir mensagem de alerta
function mostrarAlerta(tipo, mensagem) {
    // Criar elemento de alerta
    const alerta = document.createElement('div');
    alerta.className = `alert alert-${tipo === 'sucesso' ? 'success' : 'danger'} alert-dismissible fade show position-fixed`;
    alerta.style.top = '20px';
    alerta.style.right = '20px';
    alerta.style.zIndex = '9999';
    
    alerta.innerHTML = `
        ${mensagem}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
    `;
    
    // Adicionar ao body
    document.body.appendChild(alerta);
    
    // Remover após 5 segundos
    setTimeout(() => {
        alerta.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(alerta);
        }, 300);
    }, 5000);
}

// Formatar valor para moeda
function formatarValor(valor) {
    return valor.toFixed(2).replace('.', ',');
} 