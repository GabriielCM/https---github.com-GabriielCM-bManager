/**
 * servicos.js - Gerenciamento de serviços do sistema
 * B-Manager - Sistema de Gestão para Barbearias
 */

// Carregar serviços ao iniciar a página
document.addEventListener('DOMContentLoaded', function() {
    console.log('Página de serviços inicializada');
    
    // Destacar item no menu
    highlightMenuItem('servicos-link');
    
    // Carregar categorias customizadas no select
    carregarCategoriasCustomizadas();
    
    // Carregar serviços
    carregarServicos();
    
    // Adicionar eventos
    document.getElementById('servico-novo-btn').addEventListener('click', () => abrirModalServico());
    document.getElementById('servico-busca-btn').addEventListener('click', () => buscarServicos());
    document.getElementById('servico-busca').addEventListener('keyup', (e) => {
        if (e.key === 'Enter') buscarServicos();
    });
    
    // Adicionar evento para o botão de nova categoria
    document.getElementById('categoria-nova-btn').addEventListener('click', () => abrirModalNovaCategoria());
    
    // Eventos do modal
    document.getElementById('form-servico').addEventListener('submit', (e) => {
        e.preventDefault();
        salvarServico();
    });
    
    // Inicializar tooltips
    initTooltips();
});

/**
 * Configurar headers padrão
 */
function getHeaders() {
    return {
        'Content-Type': 'application/json'
    };
}

/**
 * Carregar lista de serviços da API
 */
function carregarServicos() {
    // Exibir loading
    toggleLoading(true);
    
    // Fazer requisição à API
    fetch('/api/servicos/', {
        method: 'GET',
        headers: getHeaders()
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Erro ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            // Armazenar em cache local
            armazenarServicosCache(data);
            
            renderizarServicos(data);
            carregarEstatisticas(data);
            
            // Forçar atualização da seção de categorias
            renderizarCategorias(data);
        })
        .catch(error => {
            mostrarErro(`Falha ao carregar serviços: ${error.message}`);
        })
        .finally(() => {
            toggleLoading(false);
        });
}

/**
 * Renderiza a lista de serviços na tabela
 * @param {Array} servicos - Lista de serviços retornados pela API
 */
function renderizarServicos(servicos) {
    const tbody = document.getElementById('servicos-lista');
    const emptyState = document.getElementById('servicos-empty');
    
    if (!servicos || servicos.length === 0) {
        tbody.innerHTML = '';
        emptyState.classList.remove('d-none');
        return;
    }
    
    emptyState.classList.add('d-none');
    
    // Construir HTML da tabela
    let html = '';
    
    servicos.forEach(servico => {
        // Como o campo ativo não existe no modelo, vamos assumir que todos estão ativos
        const statusBadge = '<span class="badge bg-success">Ativo</span>';
            
        // Inferir categoria baseado no nome do serviço, já que não temos o campo no modelo
        const categoria = inferirCategoria(servico.nome);
        
        const preco = formataMoeda(servico.preco);
        
        html += `
            <tr>
                <td>${servico.nome}</td>
                <td>${categoria}</td>
                <td>${servico.duracao_estimada_min} min</td>
                <td>${preco}</td>
                <td>${statusBadge}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-primary me-1" 
                            onclick="abrirModalServico(${servico.id})" 
                            data-bs-toggle="tooltip" 
                            title="Editar serviço">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" 
                            onclick="confirmarExclusao(${servico.id}, '${servico.nome}')" 
                            data-bs-toggle="tooltip" 
                            title="Excluir serviço">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
    
    // Reinicializar tooltips nos botões
    initTooltips();
}

/**
 * Carregar estatísticas e gráficos
 * @param {Array} servicos - Lista de serviços
 */
function carregarEstatisticas(servicos) {
    if (!servicos || servicos.length === 0) {
        document.getElementById('servicos-populares-empty').classList.remove('d-none');
        return;
    }
    
    // Gerar dados para o gráfico
    const ctx = document.getElementById('servicos-populares-chart').getContext('2d');
    
    // Como não temos estatísticas de agendamentos, vamos simular valores aleatórios
    // Em produção, este dado viria da API junto com os serviços
    servicos.forEach(servico => {
        servico.total_agendamentos = Math.floor(Math.random() * 50) + 1; // 1-50 agendamentos aleatórios
    });
    
    // Ordenar serviços por número de agendamentos (popularidade)
    const servicosOrdenados = [...servicos]
        .sort((a, b) => {
            const aCount = a.total_agendamentos || 0;
            const bCount = b.total_agendamentos || 0;
            return bCount - aCount;
        })
        .slice(0, 5);  // Top 5
    
    // Preparar dados para o gráfico
    const labels = servicosOrdenados.map(s => s.nome);
    const data = servicosOrdenados.map(s => s.total_agendamentos || 0);
    const cores = [
        'rgba(75, 192, 192, 0.7)',
        'rgba(54, 162, 235, 0.7)',
        'rgba(255, 206, 86, 0.7)',
        'rgba(255, 99, 132, 0.7)',
        'rgba(153, 102, 255, 0.7)'
    ];
    
    // Destruir gráfico anterior se existir
    if (window.graficoServicos) {
        window.graficoServicos.destroy();
    }
    
    // Criar novo gráfico
    window.graficoServicos = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: cores,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            return `Agendamentos: ${value}`;
                        }
                    }
                }
            }
        }
    });
    
    // Exibir categorias
    renderizarCategorias(servicos);
}

/**
 * Renderiza as categorias de serviços
 */
function renderizarCategorias(servicos) {
    const container = document.getElementById('categorias-servicos');
    
    // Extrair categorias simuladas baseadas no nome do serviço
    const categoriasPorServico = servicos.map(s => inferirCategoria(s.nome));
    
    // Obter categorias customizadas do localStorage
    const categoriasCustomizadas = obterCategoriasCustomizadas();
    
    // Combinar todas as categorias
    const todasCategorias = [...new Set([...categoriasPorServico, ...categoriasCustomizadas])];
    
    // Contar serviços por categoria
    const contagem = todasCategorias.map(cat => {
        const total = categoriasPorServico.filter(c => c === cat).length;
        return { nome: cat, total };
    });
    
    // Ordenar por total
    contagem.sort((a, b) => b.total - a.total);
    
    // Gerar HTML
    let html = '<div class="list-group">';
    
    contagem.forEach(cat => {
        html += `
            <a href="#" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                ${cat.nome}
                <span class="badge bg-primary rounded-pill">${cat.total}</span>
            </a>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

/**
 * Infere a categoria com base no nome do serviço
 * Esta função é uma adaptação temporária enquanto o campo categoria não está disponível no modelo
 */
function inferirCategoria(nome) {
    // Primeiro, verificar se o nome já está no formato "Categoria: Nome"
    const todasCategorias = ["Cabelo", "Barba", "Combo", "Tratamento", "Outros", ...obterCategoriasCustomizadas()];
    
    for (const cat of todasCategorias) {
        const prefixo = `${cat}: `;
        if (nome.startsWith(prefixo)) {
            return cat; // Retorna a categoria extraída diretamente do nome
        }
    }
    
    // Se não estiver no formato padrão, inferir baseado em palavras-chave
    nome = nome.toLowerCase();
    
    if (nome.includes('cabelo') || nome.includes('corte') || nome.includes('penteado')) {
        return 'Cabelo';
    }
    else if (nome.includes('barba') || nome.includes('bigode')) {
        return 'Barba';
    }
    else if (nome.includes('tratamento') || nome.includes('hidratação')) {
        return 'Tratamento';
    }
    else if (nome.includes('combo') || (nome.includes('cabelo') && nome.includes('barba'))) {
        return 'Combo';
    }
    else {
        return 'Outros';
    }
}

/**
 * Abre o modal para criar ou editar um serviço
 * @param {Number} id - ID do serviço (null para novo serviço)
 */
function abrirModalServico(id = null) {
    // Referências
    const modal = new bootstrap.Modal(document.getElementById('modal-servico'));
    const form = document.getElementById('form-servico');
    const titulo = document.getElementById('modal-servico-titulo');
    
    // Resetar formulário
    form.reset();
    
    // Definir título
    titulo.textContent = id ? 'Editar Serviço' : 'Novo Serviço';
    
    // Configurar formulário
    document.getElementById('servico-id').value = id || '';
    
    // Carregar dados se for edição
    if (id) {
        fetch(`/api/servicos/${id}`, {
            headers: getHeaders()
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Erro ao carregar serviço');
                }
                return response.json();
            })
            .then(data => {
                // Preencher formulário
                document.getElementById('servico-nome').value = data.nome;
                document.getElementById('servico-descricao').value = data.descricao || '';
                document.getElementById('servico-preco').value = data.preco;
                document.getElementById('servico-duracao').value = data.duracao_estimada_min;
                
                // Simular categoria com base no nome
                const categoriaInferida = inferirCategoria(data.nome);
                const selectCategoria = document.getElementById('servico-categoria');
                
                for (let i = 0; i < selectCategoria.options.length; i++) {
                    if (selectCategoria.options[i].value === categoriaInferida) {
                        selectCategoria.selectedIndex = i;
                        break;
                    }
                }
            })
            .catch(error => {
                mostrarErro(error.message);
            });
    }
    
    // Abrir modal
    modal.show();
}

/**
 * Salva um serviço (novo ou edição)
 */
function salvarServico() {
    // Dados do formulário
    const id = document.getElementById('servico-id').value;
    const nome = document.getElementById('servico-nome').value;
    const descricao = document.getElementById('servico-descricao').value;
    const preco = parseFloat(document.getElementById('servico-preco').value);
    const duracao = parseInt(document.getElementById('servico-duracao').value);
    const categoria = document.getElementById('servico-categoria').value;
    
    // Validar campos obrigatórios
    if (!nome || !preco || !duracao) {
        mostrarErro('Por favor, preencha todos os campos obrigatórios');
        return;
    }
    
    // Se for edição, verificar se a categoria mudou
    let categoriaAnterior = null;
    if (id) {
        const servicosCache = obterServicosCache();
        if (servicosCache) {
            const servicoAtual = servicosCache.find(s => s.id == id);
            if (servicoAtual) {
                categoriaAnterior = inferirCategoria(servicoAtual.nome);
            }
        }
    }
    
    // Extrair o nome puro (sem a categoria anterior)
    let nomePuro = nome;
    
    // Lista de todas as categorias possíveis (padrão + customizadas)
    const todasCategorias = ["Cabelo", "Barba", "Combo", "Tratamento", "Outros", ...obterCategoriasCustomizadas()];
    
    // Verificar se o nome já contém uma categoria no formato "Categoria: Nome"
    for (const cat of todasCategorias) {
        const prefixo = `${cat}: `;
        if (nome.startsWith(prefixo)) {
            nomePuro = nome.substring(prefixo.length);
            break;
        }
    }
    
    // Incorporar a nova categoria no nome para persistência (já que não temos campo categoria no backend)
    let nomeFormatado = nomePuro;
    if (categoria && categoria !== "Outros") {
        nomeFormatado = `${categoria}: ${nomePuro}`;
    }
    
    // Preparar dados (apenas os campos que existem no modelo)
    const dados = {
        nome: nomeFormatado,
        descricao,
        preco,
        duracao_estimada_min: duracao
    };
    
    // Configurar requisição
    const url = id ? `/api/servicos/${id}` : '/api/servicos/';
    const method = id ? 'PUT' : 'POST';
    
    // Enviar requisição
    fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(dados)
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => {
                throw new Error(err.erro || 'Erro ao salvar serviço');
            });
        }
        return response.json();
    })
    .then(data => {
        // Fechar modal
        bootstrap.Modal.getInstance(document.getElementById('modal-servico')).hide();
        
        // Exibir toast de sucesso
        mostrarSucesso(id ? 'Serviço atualizado com sucesso!' : 'Serviço criado com sucesso!');
        
        // Limpar cache de serviços para forçar recarga completa
        localStorage.removeItem('servicos_cache');
        
        // Recarregar lista de serviços
        carregarServicos();
        
        // Se a categoria mudou, atualizar a contagem na seção de categorias
        if (categoriaAnterior && categoriaAnterior !== categoria) {
            atualizarContadorCategorias(categoriaAnterior, categoria);
        }
    })
    .catch(error => {
        mostrarErro(error.message);
    });
}

/**
 * Atualiza os contadores de categorias quando um serviço muda de categoria
 */
function atualizarContadorCategorias(categoriaAntiga, categoriaNova) {
    // Buscar categorias do localStorage
    const categorias = obterCategoriasCustomizadas();
    
    // Garantir que ambas as categorias estejam no localStorage
    if (!categorias.includes(categoriaAntiga) && categoriaAntiga !== "Cabelo" && 
        categoriaAntiga !== "Barba" && categoriaAntiga !== "Combo" && 
        categoriaAntiga !== "Tratamento" && categoriaAntiga !== "Outros") {
        adicionarCategoriaLocalStorage(categoriaAntiga);
    }
    
    if (!categorias.includes(categoriaNova) && categoriaNova !== "Cabelo" && 
        categoriaNova !== "Barba" && categoriaNova !== "Combo" && 
        categoriaNova !== "Tratamento" && categoriaNova !== "Outros") {
        adicionarCategoriaLocalStorage(categoriaNova);
    }
    
    // Forçar atualização da visualização das categorias
    setTimeout(() => {
        const servicos = obterServicosCache();
        if (servicos) {
            renderizarCategorias(servicos);
        } else {
            carregarServicos();
        }
    }, 500); // Pequeno atraso para garantir que os dados estejam atualizados
}

/**
 * Abre o modal de confirmação para excluir um serviço
 */
function confirmarExclusao(id, nome) {
    if (!confirm(`Tem certeza que deseja excluir o serviço "${nome}"? Esta ação não pode ser desfeita.`)) {
        return;
    }
    
    excluirServico(id);
}

/**
 * Exclui um serviço
 */
function excluirServico(id) {
    fetch(`/api/servicos/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => {
                throw new Error(err.erro || 'Erro ao excluir serviço');
            });
        }
        return response.json();
    })
    .then(data => {
        mostrarSucesso('Serviço excluído com sucesso!');
        carregarServicos();
    })
    .catch(error => {
        mostrarErro(error.message);
    });
}

/**
 * Busca serviços com o termo digitado
 */
function buscarServicos() {
    const termo = document.getElementById('servico-busca').value.trim().toLowerCase();
    
    if (!termo) {
        carregarServicos();
        return;
    }
    
    // Exibir loading
    toggleLoading(true);
    
    fetch('/api/servicos/', {
        headers: getHeaders()
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Erro ao buscar serviços');
            }
            return response.json();
        })
        .then(data => {
            // Filtrar resultados
            const resultados = data.filter(servico => 
                servico.nome.toLowerCase().includes(termo) || 
                (servico.descricao && servico.descricao.toLowerCase().includes(termo)) ||
                inferirCategoria(servico.nome).toLowerCase().includes(termo)
            );
            
            renderizarServicos(resultados);
        })
        .catch(error => {
            mostrarErro(error.message);
        })
        .finally(() => {
            toggleLoading(false);
        });
}

/**
 * Funções auxiliares
 */

// Formatar valor monetário
function formataMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', { 
        style: 'currency', 
        currency: 'BRL'
    }).format(valor);
}

// Mostrar/ocultar loading
function toggleLoading(mostrar) {
    const loading = document.getElementById('servicos-loading');
    if (mostrar) {
        loading.classList.remove('d-none');
    } else {
        loading.classList.add('d-none');
    }
}

// Mostrar mensagem de erro
function mostrarErro(mensagem) {
    console.error(mensagem);
    alert(`Erro: ${mensagem}`);
}

// Mostrar mensagem de sucesso
function mostrarSucesso(mensagem) {
    console.log(mensagem);
    alert(mensagem);
}

// Destacar item no menu
function highlightMenuItem(id) {
    const links = document.querySelectorAll('.sidebar .nav-link');
    links.forEach(link => link.classList.remove('active'));
    
    const activeLink = document.getElementById(id);
    if (activeLink) activeLink.classList.add('active');
}

// Inicializar tooltips
function initTooltips() {
    const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltips.forEach(el => new bootstrap.Tooltip(el));
}

/**
 * Abre modal para adicionar nova categoria
 */
function abrirModalNovaCategoria() {
    // Como o sistema atual não tem um modelo de categoria,
    // vamos simular com um prompt simples
    const categoria = prompt("Digite o nome da nova categoria:");
    
    if (!categoria) return; // Usuário cancelou
    
    // Adicionar ao select de categorias
    const select = document.getElementById('servico-categoria');
    const option = document.createElement('option');
    option.value = categoria;
    option.textContent = categoria;
    
    // Inserir antes da última opção (se for "Outros")
    const outrosIndex = Array.from(select.options).findIndex(o => o.value === "Outros");
    
    if (outrosIndex > -1) {
        select.insertBefore(option, select.options[outrosIndex]);
    } else {
        select.appendChild(option);
    }
    
    // Exibir mensagem de sucesso
    mostrarSucesso(`Categoria "${categoria}" adicionada com sucesso!`);
    
    // Atualizar e exibir a nova categoria na lista de categorias
    // Como não há backend para categorias, vamos simular adicionando a nova categoria localmente
    adicionarCategoriaLocalStorage(categoria);
    
    // Recarregar as categorias
    const servicos = obterServicosCache();
    if (servicos) {
        renderizarCategorias(servicos);
    }
}

/**
 * Adiciona uma categoria ao localStorage para persistência local
 */
function adicionarCategoriaLocalStorage(categoria) {
    // Obter categorias existentes
    let categorias = localStorage.getItem('categorias_customizadas');
    categorias = categorias ? JSON.parse(categorias) : [];
    
    // Adicionar nova categoria se ainda não existir
    if (!categorias.includes(categoria)) {
        categorias.push(categoria);
        localStorage.setItem('categorias_customizadas', JSON.stringify(categorias));
    }
}

/**
 * Obter categorias customizadas do localStorage
 */
function obterCategoriasCustomizadas() {
    const categorias = localStorage.getItem('categorias_customizadas');
    return categorias ? JSON.parse(categorias) : [];
}

/**
 * Armazena os serviços em cache para uso rápido
 */
function armazenarServicosCache(servicos) {
    localStorage.setItem('servicos_cache', JSON.stringify(servicos));
}

/**
 * Obtém os serviços do cache local
 */
function obterServicosCache() {
    const servicos = localStorage.getItem('servicos_cache');
    return servicos ? JSON.parse(servicos) : null;
}

/**
 * Carrega as categorias customizadas do localStorage para o select
 */
function carregarCategoriasCustomizadas() {
    const select = document.getElementById('servico-categoria');
    const categoriasCustomizadas = obterCategoriasCustomizadas();
    
    if (!categoriasCustomizadas.length) return;
    
    // Posição para inserir (antes de "Outros")
    const outrosIndex = Array.from(select.options).findIndex(o => o.value === "Outros");
    
    // Adicionar cada categoria customizada ao select
    categoriasCustomizadas.forEach(categoria => {
        // Verificar se a categoria já existe no select
        const categoriaExiste = Array.from(select.options).some(o => o.value === categoria);
        
        if (!categoriaExiste) {
            const option = document.createElement('option');
            option.value = categoria;
            option.textContent = categoria;
            
            if (outrosIndex > -1) {
                select.insertBefore(option, select.options[outrosIndex]);
            } else {
                select.appendChild(option);
            }
        }
    });
} 