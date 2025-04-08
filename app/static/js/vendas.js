// Vendas.js - Gestão de vendas na interface do usuário
document.addEventListener('DOMContentLoaded', function() {
    // Variáveis globais
    let currentPage = 1;
    let totalPages = 1;
    let vendasData = [];
    let carrinho = [];
    let clienteSelecionado = null;
    
    // Inicialização
    function init() {
        console.log('Inicializando funcionalidade de vendas...');
        
        // Verificar se elementos da UI existem
        if (!document.getElementById('vendas-lista')) {
            console.error('Elemento vendas-lista não encontrado');
            return;
        }
        
        try {
            carregarVendas();
            
            // Carregar outros dados se os elementos existirem
            if (document.getElementById('resumo-total-vendas')) {
                carregarResumoVendas();
            }
            
            if (document.getElementById('grafico-periodo')) {
                carregarGraficoVendas();
            }
            
            if (document.getElementById('metodos-pagamento-chart')) {
                carregarMetodosPagamento();
            }
            
            setupEventListeners();
            console.log('Inicialização de vendas concluída com sucesso');
        } catch (error) {
            console.error('Erro na inicialização de vendas:', error);
        }
    }
    
    // Configurar eventos de interface
    function setupEventListeners() {
        console.log('Configurando event listeners...');
        
        // Botão de nova venda
        const novaBotao = document.getElementById('venda-nova-btn');
        if (novaBotao) {
            novaBotao.addEventListener('click', () => abrirModalNovaVenda());
        }
        
        // Filtros de data
        const filtrarDataBtn = document.getElementById('filtrar-data-btn');
        if (filtrarDataBtn) {
            filtrarDataBtn.addEventListener('click', () => {
                currentPage = 1;
                carregarVendas();
            });
        }
        
        // Filtro de status
        const filtroStatus = document.getElementById('filtro-status');
        if (filtroStatus) {
            filtroStatus.addEventListener('change', () => {
                currentPage = 1;
                carregarVendas();
            });
        }
        
        // Busca de vendas
        const buscaBtn = document.getElementById('venda-busca-btn');
        if (buscaBtn) {
            buscaBtn.addEventListener('click', () => {
                currentPage = 1;
                carregarVendas();
            });
        }
        
        // Seleção de período do gráfico
        const graficoPeriodo = document.getElementById('grafico-periodo');
        if (graficoPeriodo) {
            graficoPeriodo.addEventListener('change', () => carregarGraficoVendas());
        }

        // Exportar, imprimir, gerar relatório
        const exportarBtn = document.getElementById('vendas-exportar');
        if (exportarBtn) {
            exportarBtn.addEventListener('click', exportarVendas);
        }
        
        const imprimirBtn = document.getElementById('vendas-imprimir');
        if (imprimirBtn) {
            imprimirBtn.addEventListener('click', imprimirVendas);
        }
        
        const relatorioBtn = document.getElementById('vendas-relatorio');
        if (relatorioBtn) {
            relatorioBtn.addEventListener('click', gerarRelatorio);
        }
        
        // Valores de desconto e impostos (na tela de nova venda)
        const descontoInput = document.getElementById('venda-desconto');
        if (descontoInput) {
            descontoInput.addEventListener('input', atualizarTotaisVenda);
        }
        
        const impostoInput = document.getElementById('venda-imposto');
        if (impostoInput) {
            impostoInput.addEventListener('input', atualizarTotaisVenda);
        }
        
        // Botão de limpar carrinho
        const limparCarrinhoBtn = document.getElementById('limpar-venda-btn');
        if (limparCarrinhoBtn) {
            limparCarrinhoBtn.addEventListener('click', limparCarrinho);
        }
        
        // Botão de finalizar venda
        const finalizarVendaBtn = document.getElementById('finalizar-venda-btn');
        if (finalizarVendaBtn) {
            finalizarVendaBtn.addEventListener('click', finalizarVenda);
        }
        
        // Botão de limpar cliente
        const limparClienteBtn = document.getElementById('limpar-cliente-btn');
        if (limparClienteBtn) {
            limparClienteBtn.addEventListener('click', limparCliente);
        }
        
        console.log('Event listeners configurados com sucesso');
    }
    
    // Carregar lista de vendas
    function carregarVendas() {
        const dataInicio = document.getElementById('data-inicio')?.value;
        const dataFim = document.getElementById('data-fim')?.value;
        const statusElement = document.getElementById('filtro-status');
        const buscaElement = document.getElementById('venda-busca');
        
        const status = statusElement?.value || 'todos';
        const busca = buscaElement?.value || '';
        
        // Exibir loading
        const listaElement = document.getElementById('vendas-lista');
        const loadingElement = document.getElementById('vendas-loading');
        const emptyElement = document.getElementById('vendas-empty');
        
        if (listaElement) listaElement.innerHTML = '';
        if (loadingElement) loadingElement.classList.remove('d-none');
        if (emptyElement) emptyElement.classList.add('d-none');
        
        // Construir query params
        const params = new URLSearchParams();
        if (dataInicio) params.append('data_inicio', dataInicio);
        if (dataFim) params.append('data_fim', dataFim);
        if (status !== 'todos') params.append('status', status);
        if (busca) params.append('busca', busca);
        params.append('pagina', currentPage);
        params.append('por_pagina', 10);
        
        // Fazer requisição à API usando API.call do app.js
        API.call(`/vendas/?${params.toString()}`)
            .then(data => {
                vendasData = data.items;
                totalPages = data.paginas;
                
                // Esconder loading
                if (loadingElement) loadingElement.classList.add('d-none');
                
                // Verificar se há vendas
                if (vendasData.length === 0) {
                    if (emptyElement) emptyElement.classList.remove('d-none');
                    return;
                }
                
                // Renderizar lista de vendas
                renderizarVendas(vendasData);
                
                // Renderizar paginação
                renderizarPaginacao(currentPage, totalPages);
            })
            .catch(error => {
                console.error('Erro ao carregar vendas:', error);
                if (loadingElement) loadingElement.classList.add('d-none');
                mostrarAlerta('danger', 'Erro ao carregar vendas. Por favor, tente novamente.');
            });
    }
    
    // Renderizar lista de vendas na tabela
    function renderizarVendas(vendas) {
        const tabela = document.getElementById('vendas-lista');
        tabela.innerHTML = '';
        
        vendas.forEach(venda => {
            const data = new Date(venda.data_hora);
            const dataFormatada = data.toLocaleDateString('pt-BR');
            const horaFormatada = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            
            // Construir string de itens
            let itensTexto = venda.itens.length === 1 
                ? '1 item' 
                : `${venda.itens.length} itens`;
            
            // Definir classes para status
            let statusClass = 'badge bg-secondary';
            if (venda.status === 'finalizada') statusClass = 'badge bg-success';
            if (venda.status === 'pendente') statusClass = 'badge bg-warning';
            if (venda.status === 'cancelada') statusClass = 'badge bg-danger';
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>#${venda.id}</td>
                <td>${dataFormatada}<br><small class="text-muted">${horaFormatada}</small></td>
                <td>${venda.cliente_nome}</td>
                <td>${itensTexto}</td>
                <td>R$ ${venda.valor_total.toFixed(2)}</td>
                <td>${statusPagamento(venda)}</td>
                <td><span class="${statusClass}">${capitalizarPrimeiraLetra(venda.status)}</span></td>
                <td class="text-center">
                    <div class="btn-group">
                        <button class="btn btn-sm btn-outline-primary view-venda" data-id="${venda.id}">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-info payment-venda" data-id="${venda.id}" ${venda.status === 'cancelada' ? 'disabled' : ''}>
                            <i class="fas fa-dollar-sign"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger cancel-venda" data-id="${venda.id}" ${venda.status !== 'finalizada' ? 'disabled' : ''}>
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </td>
            `;
            
            tabela.appendChild(tr);
        });
        
        // Adicionar event listeners aos botões
        document.querySelectorAll('.view-venda').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                verDetalhesVenda(id);
            });
        });
        
        document.querySelectorAll('.payment-venda').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                abrirModalPagamento(id);
            });
        });
        
        document.querySelectorAll('.cancel-venda').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                confirmarCancelamentoVenda(id);
            });
        });
    }
    
    // Verificar status de pagamento
    function statusPagamento(venda) {
        // Lógica simplificada - em uma implementação real seria mais complexo
        if (venda.status === 'cancelada') {
            return '<span class="badge bg-secondary">Cancelado</span>';
        }
        
        // Assumindo que temos acesso a pagamentos em venda.pagamentos
        // e que o valor total de pagamentos pode ser inferior ao valor total da venda
        const totalPago = venda.pagamentos ? venda.pagamentos.reduce((sum, p) => sum + p.valor, 0) : 0;
        
        if (totalPago >= venda.valor_total) {
            return '<span class="badge bg-success">Pago</span>';
        } else if (totalPago > 0) {
            return '<span class="badge bg-warning">Parcial</span>';
        } else {
            return '<span class="badge bg-danger">Pendente</span>';
        }
    }
    
    // Renderizar paginação
    function renderizarPaginacao(pagina, total) {
        const paginacao = document.getElementById('vendas-paginacao');
        paginacao.innerHTML = '';
        
        // Botão anterior
        const anterior = document.createElement('li');
        anterior.className = `page-item ${pagina === 1 ? 'disabled' : ''}`;
        anterior.innerHTML = `<a class="page-link" href="#" aria-label="Anterior">
            <span aria-hidden="true">&laquo;</span>
        </a>`;
        paginacao.appendChild(anterior);
        
        // Limitar a quantidade de páginas exibidas
        let startPage = Math.max(1, pagina - 2);
        let endPage = Math.min(total, pagina + 2);
        
        // Garantir que sempre exibimos 5 páginas se possível
        if (endPage - startPage < 4 && total > 4) {
            if (startPage === 1) {
                endPage = Math.min(5, total);
            } else if (endPage === total) {
                startPage = Math.max(1, total - 4);
            }
        }
        
        // Primeira página
        if (startPage > 1) {
            const primeira = document.createElement('li');
            primeira.className = 'page-item';
            primeira.innerHTML = '<a class="page-link" href="#">1</a>';
            paginacao.appendChild(primeira);
            
            if (startPage > 2) {
                const ellipsis = document.createElement('li');
                ellipsis.className = 'page-item disabled';
                ellipsis.innerHTML = '<a class="page-link" href="#">...</a>';
                paginacao.appendChild(ellipsis);
            }
        }
        
        // Páginas numeradas
        for (let i = startPage; i <= endPage; i++) {
            const item = document.createElement('li');
            item.className = `page-item ${i === pagina ? 'active' : ''}`;
            item.innerHTML = `<a class="page-link" href="#">${i}</a>`;
            paginacao.appendChild(item);
        }
        
        // Última página
        if (endPage < total) {
            if (endPage < total - 1) {
                const ellipsis = document.createElement('li');
                ellipsis.className = 'page-item disabled';
                ellipsis.innerHTML = '<a class="page-link" href="#">...</a>';
                paginacao.appendChild(ellipsis);
            }
            
            const ultima = document.createElement('li');
            ultima.className = 'page-item';
            ultima.innerHTML = `<a class="page-link" href="#">${total}</a>`;
            paginacao.appendChild(ultima);
        }
        
        // Botão próximo
        const proximo = document.createElement('li');
        proximo.className = `page-item ${pagina === total ? 'disabled' : ''}`;
        proximo.innerHTML = `<a class="page-link" href="#" aria-label="Próximo">
            <span aria-hidden="true">&raquo;</span>
        </a>`;
        paginacao.appendChild(proximo);
        
        // Adicionar event listeners
        document.querySelectorAll('#vendas-paginacao .page-item:not(.disabled) .page-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const pagina = e.target.textContent;
                
                if (pagina === '«') {
                    currentPage--;
                } else if (pagina === '»') {
                    currentPage++;
                } else if (pagina === '...') {
                    // Ignorar cliques em reticências
                    return;
                } else {
                    currentPage = parseInt(pagina);
                }
                
                carregarVendas();
            });
        });
    }
    
    // Carregar resumo de vendas para os cards
    function carregarResumoVendas() {
        API.call('/vendas/relatorio/resumo')
            .then(data => {
                // Renderizar dados do resumo nos elementos do card
                if (document.getElementById('vendas-hoje-total')) {
                    document.getElementById('vendas-hoje-total').textContent = data.hoje.total;
                    document.getElementById('vendas-hoje-valor').textContent = `R$ ${data.hoje.valor.toFixed(2)}`;
                }
                
                if (document.getElementById('vendas-semana-total')) {
                    document.getElementById('vendas-semana-total').textContent = data.semana.total;
                    document.getElementById('vendas-semana-valor').textContent = `R$ ${data.semana.valor.toFixed(2)}`;
                }
                
                if (document.getElementById('vendas-mes-total')) {
                    document.getElementById('vendas-mes-total').textContent = data.mes.total;
                    document.getElementById('vendas-mes-valor').textContent = `R$ ${data.mes.valor.toFixed(2)}`;
                }
                
                if (document.getElementById('vendas-ticket-medio')) {
                    document.getElementById('vendas-ticket-medio').textContent = `R$ ${data.ticket_medio.toFixed(2)}`;
                    document.getElementById('vendas-ticket-medio-variacao').textContent = `${data.ticket_variacao > 0 ? '+' : ''}${data.ticket_variacao.toFixed(1)}%`;
                }
            })
            .catch(error => {
                console.error('Erro ao carregar resumo de vendas:', error);
            });
    }
    
    // Carregar gráfico de vendas
    function carregarGraficoVendas() {
        const periodo = document.getElementById('grafico-periodo').value;
        
        API.call(`/vendas/relatorio/grafico?periodo=${periodo}`)
            .then(data => {
                renderizarGrafico(data);
            })
            .catch(error => {
                console.error('Erro ao carregar dados do gráfico:', error);
            });
    }
    
    // Carregar dados para o gráfico de métodos de pagamento
    function carregarMetodosPagamento() {
        API.call('/vendas/relatorio/pagamentos')
            .then(data => {
                renderizarGraficoPagamentos(data);
            })
            .catch(error => {
                console.error('Erro ao carregar dados de pagamentos:', error);
            });
    }
    
    // Renderizar gráfico de pagamentos
    function renderizarGraficoPagamentos(data) {
        // Atualizar percentuais nos elementos da UI
        if (document.getElementById('percent-dinheiro')) {
            document.getElementById('percent-dinheiro').textContent = `${data.percentuais.dinheiro}%`;
            document.getElementById('percent-credito').textContent = `${data.percentuais.cartao_credito}%`;
            document.getElementById('percent-debito').textContent = `${data.percentuais.cartao_debito}%`;
            document.getElementById('percent-pix').textContent = `${data.percentuais.pix}%`;
        }
        
        // Renderizar gráfico de pizza se o canvas existir
        const canvas = document.getElementById('metodos-pagamento-chart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        // Limpar gráfico anterior se existir
        if (window.metodosPagamentoChart) {
            window.metodosPagamentoChart.destroy();
        }
        
        // Cores para o gráfico
        const cores = {
            dinheiro: '#28a745',        // Verde
            cartao_credito: '#dc3545',  // Vermelho
            cartao_debito: '#007bff',   // Azul
            pix: '#fd7e14'              // Laranja
        };
        
        // Configuração do gráfico
        window.metodosPagamentoChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Dinheiro', 'Cartão de Crédito', 'Cartão de Débito', 'Pix'],
                datasets: [{
                    data: [
                        data.valores.dinheiro, 
                        data.valores.cartao_credito,
                        data.valores.cartao_debito,
                        data.valores.pix
                    ],
                    backgroundColor: [
                        cores.dinheiro,
                        cores.cartao_credito, 
                        cores.cartao_debito,
                        cores.pix
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                                return `${label}: R$ ${value.toFixed(2)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Renderizar gráfico de vendas
    function renderizarGrafico(data) {
        // Verificar se o canvas existe
        const canvas = document.getElementById('vendas-grafico');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        // Limpar gráfico anterior se existir
        if (window.vendasGrafico) {
            window.vendasGrafico.destroy();
        }
        
        // Configuração do gráfico
        window.vendasGrafico = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Vendas (R$)',
                    data: data.valores,
                    backgroundColor: 'rgba(78, 115, 223, 0.05)',
                    borderColor: 'rgba(78, 115, 223, 1)',
                    pointRadius: 3,
                    pointBackgroundColor: 'rgba(78, 115, 223, 1)',
                    pointBorderColor: 'rgba(78, 115, 223, 1)',
                    pointHoverRadius: 4,
                    pointHoverBackgroundColor: 'rgba(78, 115, 223, 1)',
                    pointHoverBorderColor: 'rgba(78, 115, 223, 1)',
                    pointHitRadius: 10,
                    pointBorderWidth: 2,
                    borderWidth: 2,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return 'R$ ' + value.toFixed(2);
                            }
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return 'R$ ' + context.raw.toFixed(2);
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Abrir modal para nova venda
    function abrirModalNovaVenda() {
        // Abrir o modal existente
        const modalNovaVenda = new bootstrap.Modal(document.getElementById('nova-venda-modal'));
        modalNovaVenda.show();
        
        // Limpar o carrinho
        carrinho = [];
        renderizarCarrinho();
        
        // Carregar lista de barbeiros
        carregarBarbeiros();
        
        // Carregar lista de clientes
        carregarClientes();
        
        // Carregar lista de produtos
        carregarProdutosDisponiveis();
    }
    
    // Carregar lista de barbeiros para a venda
    function carregarBarbeiros() {
        const barbeiroSelect = document.getElementById('barbeiro-venda');
        if (!barbeiroSelect) return;
        
        // Limpar opções atuais
        barbeiroSelect.innerHTML = '<option value="">Carregando barbeiros...</option>';
        
        // Buscar barbeiros via API
        API.call('/barbeiros/')
            .then(response => {
                // Verificar se temos barbeiros
                if (response.length === 0) {
                    barbeiroSelect.innerHTML = '<option value="">Nenhum barbeiro disponível</option>';
                    return;
                }
                
                // Preencher select com os barbeiros
                barbeiroSelect.innerHTML = '<option value="">Selecione um barbeiro...</option>';
                response.forEach(barbeiro => {
                    const option = document.createElement('option');
                    option.value = barbeiro.id;
                    option.textContent = barbeiro.nome;
                    barbeiroSelect.appendChild(option);
                });
            })
            .catch(error => {
                console.error('Erro ao carregar barbeiros:', error);
                barbeiroSelect.innerHTML = '<option value="">Erro ao carregar barbeiros</option>';
                mostrarAlerta('danger', 'Não foi possível carregar a lista de barbeiros.');
            });
    }
    
    // Carregar lista de clientes para a venda
    function carregarClientes() {
        const clienteSelect = document.getElementById('cliente-venda');
        if (!clienteSelect) return;
        
        // Limpar opções atuais
        clienteSelect.innerHTML = '<option value="">Carregando clientes...</option>';
        
        // Buscar clientes via API
        fetch('/api/clientes/')
            .then(response => response.json())
            .then(response => {
                console.log('Resposta da API clientes:', response);
                
                // Verificar se temos clientes
                if (!response.items || response.items.length === 0) {
                    clienteSelect.innerHTML = '<option value="">Nenhum cliente disponível</option>';
                    return;
                }
                
                // Preencher select com os clientes
                clienteSelect.innerHTML = '<option value="">Selecione um cliente...</option>';
                response.items.forEach(cliente => {
                    const option = document.createElement('option');
                    option.value = cliente.id;
                    option.textContent = cliente.nome;
                    clienteSelect.appendChild(option);
                });
                
                // Adicionar event listener para o select
                clienteSelect.addEventListener('change', function() {
                    const clienteId = this.value;
                    if (clienteId) {
                        const clienteNome = this.options[this.selectedIndex].text;
                        selecionarCliente(clienteId, clienteNome);
                    } else {
                        limparCliente();
                    }
                });
            })
            .catch(error => {
                console.error('Erro ao carregar clientes:', error);
                clienteSelect.innerHTML = '<option value="">Erro ao carregar clientes</option>';
                mostrarAlerta('danger', 'Não foi possível carregar a lista de clientes.');
            });
    }
    
    // Carregar lista de produtos disponíveis
    function carregarProdutosDisponiveis() {
        const produtosTabela = document.getElementById('produtos-disponiveis');
        const produtosLoading = document.getElementById('produtos-loading');
        
        if (!produtosTabela || !produtosLoading) return;
        
        // Mostrar loading
        produtosTabela.innerHTML = '';
        produtosLoading.classList.remove('d-none');
        
        // Buscar produtos via API
        fetch('/api/produtos/')
            .then(response => response.json())
            .then(response => {
                console.log('Resposta da API produtos:', response);
                
                // Ocultar loading
                produtosLoading.classList.add('d-none');
                
                // Verificar se temos produtos
                if (!response.items || response.items.length === 0) {
                    produtosTabela.innerHTML = '<tr><td colspan="4" class="text-center">Nenhum produto disponível</td></tr>';
                    return;
                }
                
                // Preencher tabela com os produtos
                produtosTabela.innerHTML = '';
                response.items.forEach(produto => {
                    const tr = document.createElement('tr');
                    
                    // Definir classe de estoque
                    const estoqueClass = produto.quantidade_estoque > 0 ? 'text-success' : 'text-danger';
                    const estoqueTexto = produto.quantidade_estoque > 0 ? produto.quantidade_estoque : 'Indisponível';
                    
                    tr.innerHTML = `
                        <td>${produto.nome} ${produto.codigo ? `<small class="text-muted">(${produto.codigo})</small>` : ''}</td>
                        <td>R$ ${produto.preco.toFixed(2)}</td>
                        <td class="${estoqueClass}">${estoqueTexto}</td>
                        <td>
                            <button class="btn btn-sm btn-primary adicionar-produto" data-id="${produto.id}" 
                                ${produto.quantidade_estoque <= 0 ? 'disabled' : ''}>
                                <i class="fas fa-plus"></i> Adicionar
                            </button>
                        </td>
                    `;
                    
                    produtosTabela.appendChild(tr);
                });
                
                // Adicionar event listeners aos botões de adicionar
                document.querySelectorAll('.adicionar-produto').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const produtoId = this.getAttribute('data-id');
                        // Encontrar o produto no array de resposta
                        const produto = response.items.find(p => p.id == produtoId);
                        if (produto) {
                            adicionarProdutoCarrinho(produto);
                        }
                    });
                });
            })
            .catch(error => {
                console.error('Erro ao carregar produtos:', error);
                produtosLoading.classList.add('d-none');
                produtosTabela.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Erro ao carregar produtos</td></tr>';
                mostrarAlerta('danger', 'Não foi possível carregar a lista de produtos.');
            });
    }
    
    // Selecionar cliente para a venda
    function selecionarCliente(id, nome) {
        clienteSelecionado = { id, nome };
        
        // Atualizar os elementos do DOM
        const clienteVendaSelect = document.getElementById('cliente-venda');
        if (clienteVendaSelect) {
            clienteVendaSelect.value = id;
        }
        
        // Mostrar a badge do cliente selecionado
        const clienteSelecionadoDiv = document.getElementById('cliente-selecionado');
        const clienteNomeDisplay = document.getElementById('cliente-nome-display');
        if (clienteSelecionadoDiv && clienteNomeDisplay) {
            clienteNomeDisplay.textContent = nome;
            clienteSelecionadoDiv.classList.remove('d-none');
        }
    }
    
    // Limpar cliente selecionado
    function limparCliente() {
        clienteSelecionado = null;
        
        // Limpar elementos do DOM
        const clienteVendaSelect = document.getElementById('cliente-venda');
        if (clienteVendaSelect) {
            clienteVendaSelect.value = '';
        }
        
        // Esconder a badge do cliente
        const clienteSelecionadoDiv = document.getElementById('cliente-selecionado');
        if (clienteSelecionadoDiv) {
            clienteSelecionadoDiv.classList.add('d-none');
        }
    }
    
    // Funções auxiliares de formatação
    function capitalizarPrimeiraLetra(texto) {
        return texto.charAt(0).toUpperCase() + texto.slice(1);
    }
    
    // Obter token JWT
    function getToken() {
        return localStorage.getItem('token');
    }
    
    // Exibir mensagem de alerta
    function mostrarAlerta(tipo, mensagem) {
        const alertaHTML = `
            <div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
                ${mensagem}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
            </div>
        `;
        
        const alertasContainer = document.getElementById('alertas-container');
        if (!alertasContainer) {
            const container = document.createElement('div');
            container.id = 'alertas-container';
            container.className = 'container mt-3';
            container.style.position = 'fixed';
            container.style.top = '1rem';
            container.style.right = '1rem';
            container.style.zIndex = '9999';
            container.style.maxWidth = '400px';
            document.body.appendChild(container);
        }
        
        const alertElement = document.createElement('div');
        alertElement.innerHTML = alertaHTML;
        document.getElementById('alertas-container').appendChild(alertElement.firstChild);
        
        // Remover alerta após 5 segundos
        setTimeout(() => {
            const alerta = document.querySelector('#alertas-container .alert');
            if (alerta) {
                alerta.classList.remove('show');
                setTimeout(() => alerta.remove(), 300);
            }
        }, 5000);
    }
    
    // Buscar cliente para a venda
    function buscarCliente() {
        console.log('Função buscarCliente() chamada');
        // Criar modal de busca de cliente dinamicamente
        if (!document.getElementById('modal-buscar-cliente')) {
            console.log('Criando modal buscar-cliente');
            const modalHTML = `
                <div class="modal fade" id="modal-buscar-cliente" tabindex="-1" aria-hidden="true">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Buscar Cliente</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
                            </div>
                            <div class="modal-body">
                                <div class="input-group mb-3">
                                    <input type="text" class="form-control" id="busca-cliente-texto" placeholder="Nome, CPF ou email do cliente...">
                                    <button class="btn btn-primary" type="button" id="btn-buscar-cliente-texto">
                                        <i class="fas fa-search"></i>
                                    </button>
                                </div>
                                
                                <div id="clientes-loading" class="text-center py-4 d-none">
                                    <div class="spinner-border"></div>
                                    <p>Buscando clientes...</p>
                                </div>
                                
                                <div id="clientes-empty" class="text-center py-4 d-none">
                                    <i class="fas fa-users fa-3x text-gray-300 mb-3"></i>
                                    <p>Nenhum cliente encontrado.</p>
                                </div>
                                
                                <div class="list-group" id="clientes-resultado">
                                    <!-- Lista de clientes será preenchida via AJAX -->
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            const modalElement = document.createElement('div');
            modalElement.innerHTML = modalHTML;
            document.body.appendChild(modalElement.firstChild);
            
            // Adicionar event listeners
            document.getElementById('btn-buscar-cliente-texto').addEventListener('click', () => {
                console.log('Botão buscar-cliente-texto clicado');
                buscarClienteTexto();
            });
            
            document.getElementById('busca-cliente-texto').addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    console.log('Enter pressionado no campo busca-cliente-texto');
                    buscarClienteTexto();
                }
            });
        }
        
        // Resetar e abrir modal
        document.getElementById('busca-cliente-texto').value = '';
        document.getElementById('clientes-resultado').innerHTML = '';
        document.getElementById('clientes-loading').classList.add('d-none');
        document.getElementById('clientes-empty').classList.add('d-none');
        
        console.log('Abrindo modal buscar-cliente');
        const modal = new bootstrap.Modal(document.getElementById('modal-buscar-cliente'));
        modal.show();
    }
    
    // Buscar cliente por texto
    function buscarClienteTexto() {
        console.log('Função buscarClienteTexto() chamada');
        const texto = document.getElementById('busca-cliente-texto').value.trim();
        
        if (!texto) {
            console.log('Texto de busca vazio');
            return;
        }
        
        console.log('Buscando cliente com texto:', texto);
        
        // Mostrar loading
        document.getElementById('clientes-resultado').innerHTML = '';
        document.getElementById('clientes-loading').classList.remove('d-none');
        document.getElementById('clientes-empty').classList.add('d-none');
        
        // URL corrigida para buscar clientes
        const url = `/api/clientes/?busca=${encodeURIComponent(texto)}`;
        console.log('URL de busca:', url);
        
        // Buscar clientes na API usando API.call
        API.call(url)
            .then(data => {
                console.log('Resultado da busca de clientes:', data);
                
                // Esconder loading
                document.getElementById('clientes-loading').classList.add('d-none');
                
                // Verificar se há resultados
                if (!data.items || data.items.length === 0) {
                    console.log('Nenhum cliente encontrado');
                    document.getElementById('clientes-empty').classList.remove('d-none');
                    return;
                }
                
                // Renderizar resultados
                const resultadosList = document.getElementById('clientes-resultado');
                resultadosList.innerHTML = '';
                
                data.items.forEach(cliente => {
                    console.log('Renderizando cliente:', cliente);
                    const itemLista = document.createElement('a');
                    itemLista.href = '#';
                    itemLista.className = 'list-group-item list-group-item-action';
                    itemLista.innerHTML = `
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="mb-1">${cliente.nome}</h6>
                                <small class="text-muted">${cliente.telefone || 'Sem telefone'}</small>
                            </div>
                            <button class="btn btn-sm btn-primary selecionar-cliente" data-id="${cliente.id}" data-nome="${cliente.nome}">
                                Selecionar
                            </button>
                        </div>
                    `;
                    resultadosList.appendChild(itemLista);
                });
                
                // Adicionar evento aos botões
                document.querySelectorAll('.selecionar-cliente').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.preventDefault();
                        const id = btn.getAttribute('data-id');
                        const nome = btn.getAttribute('data-nome');
                        console.log('Cliente selecionado:', id, nome);
                        selecionarCliente(id, nome);
                    });
                });
            })
            .catch(error => {
                console.error('Erro ao buscar clientes:', error);
                document.getElementById('clientes-loading').classList.add('d-none');
                document.getElementById('clientes-empty').classList.remove('d-none');
                document.getElementById('clientes-empty').innerHTML = `
                    <i class="fas fa-exclamation-triangle fa-3x text-danger mb-3"></i>
                    <p>Erro ao buscar clientes: ${error.message || 'Tente novamente'}</p>
                `;
            });
    }
    
    // Buscar produto para adicionar à venda
    function buscarProduto() {
        console.log('Função buscarProduto() chamada');
        const busca = document.getElementById('produto-venda').value.trim();
        
        if (!busca) {
            console.log('Texto de busca vazio');
            mostrarAlerta('warning', 'Digite um termo para buscar produtos');
            return;
        }
        
        console.log('Buscando produto com texto:', busca);
        
        // Criar modal de busca de produto dinamicamente
        if (!document.getElementById('modal-buscar-produto')) {
            console.log('Criando modal buscar-produto');
            const modalHTML = `
                <div class="modal fade" id="modal-buscar-produto" tabindex="-1" aria-hidden="true">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Buscar Produto</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
                            </div>
                            <div class="modal-body">
                                <div id="produtos-loading" class="text-center py-4 d-none">
                                    <div class="spinner-border"></div>
                                    <p>Buscando produtos...</p>
                                </div>
                                
                                <div id="produtos-empty" class="text-center py-4 d-none">
                                    <i class="fas fa-box fa-3x text-gray-300 mb-3"></i>
                                    <p>Nenhum produto encontrado.</p>
                                </div>
                                
                                <div class="list-group" id="produtos-resultado">
                                    <!-- Lista de produtos será preenchida via AJAX -->
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            const modalElement = document.createElement('div');
            modalElement.innerHTML = modalHTML;
            document.body.appendChild(modalElement.firstChild);
        }
        
        // Mostrar loading, limpar resultados
        const resultadosList = document.getElementById('produtos-resultado');
        resultadosList.innerHTML = '';
        document.getElementById('produtos-loading').classList.remove('d-none');
        document.getElementById('produtos-empty').classList.add('d-none');
        
        // Abrir modal
        const modal = new bootstrap.Modal(document.getElementById('modal-buscar-produto'));
        modal.show();
        
        // URL corrigida para buscar produtos
        const url = `/api/produtos/?busca=${encodeURIComponent(busca)}`;
        console.log('URL de busca:', url);
        
        // Buscar produtos na API usando API.call
        API.call(url)
            .then(data => {
                console.log('Resultado da busca de produtos:', data);
                document.getElementById('produtos-loading').classList.add('d-none');
                
                if (!data.items || data.items.length === 0) {
                    console.log('Nenhum produto encontrado');
                    document.getElementById('produtos-empty').classList.remove('d-none');
                    return;
                }
                
                resultadosList.innerHTML = '';
                
                data.items.forEach(produto => {
                    console.log('Renderizando produto:', produto);
                    const item = document.createElement('a');
                    item.href = '#';
                    item.className = 'list-group-item list-group-item-action';
                    
                    // Verificar estoque
                    const estoqueClass = produto.quantidade_estoque > 0 ? 'text-success' : 'text-danger';
                    const estoqueMensagem = produto.quantidade_estoque > 0 
                        ? `Em estoque: ${produto.quantidade_estoque}` 
                        : 'Fora de estoque';
                    
                    item.innerHTML = `
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="mb-0">${produto.nome}</h6>
                                <small class="text-muted">Código: ${produto.codigo || '---'}</small>
                            </div>
                            <div class="text-end">
                                <div class="mb-1">R$ ${produto.preco.toFixed(2)}</div>
                                <small class="${estoqueClass}">${estoqueMensagem}</small>
                            </div>
                        </div>
                    `;
                    
                    // Adicionar ao carrinho quando clicar
                    item.addEventListener('click', (e) => {
                        e.preventDefault();
                        console.log('Adicionando produto ao carrinho:', produto);
                        adicionarProdutoCarrinho(produto);
                        
                        // Fechar modal
                        bootstrap.Modal.getInstance(document.getElementById('modal-buscar-produto')).hide();
                    });
                    
                    resultadosList.appendChild(item);
                });
            })
            .catch(error => {
                console.error('Erro ao buscar produtos:', error);
                document.getElementById('produtos-loading').classList.add('d-none');
                document.getElementById('produtos-empty').classList.remove('d-none');
                document.getElementById('produtos-empty').innerHTML = `
                    <div class="text-center">
                        <i class="fas fa-exclamation-triangle text-danger fa-3x mb-3"></i>
                        <p>Erro ao buscar produtos: ${error.message || 'Tente novamente'}</p>
                    </div>
                `;
            });
    }
    
    // Adicionar produto ao carrinho
    function adicionarProdutoCarrinho(produto) {
        console.log('Adicionando produto ao carrinho:', produto);
        // Verificar estoque
        if (produto.quantidade_estoque <= 0) {
            mostrarAlerta('warning', `O produto "${produto.nome}" está fora de estoque.`);
            return;
        }
        
        // Verificar se já existe no carrinho
        const itemExistente = carrinho.find(item => item.produto_id === produto.id || item.id === produto.id);
        
        if (itemExistente) {
            // Verificar se quantidade não ultrapassa estoque
            if (itemExistente.quantidade + 1 > produto.quantidade_estoque) {
                mostrarAlerta('warning', `Quantidade excede o estoque disponível (${produto.quantidade_estoque}).`);
                return;
            }
            
            // Incrementar quantidade
            itemExistente.quantidade++;
            mostrarAlerta('success', `Quantidade de "${produto.nome}" aumentada para ${itemExistente.quantidade}.`);
        } else {
            // Adicionar novo item
            const novoProduto = {
                produto_id: produto.id,
                id: produto.id,           // Adicionando 'id' para compatibilidade
                nome: produto.nome,
                quantidade: 1,
                valor_unitario: produto.preco,
                preco: produto.preco,     // Adicionando 'preco' para compatibilidade
                percentual_desconto: 0,
                estoque_disponivel: produto.quantidade_estoque
            };
            
            carrinho.push(novoProduto);
            console.log('Produto adicionado ao carrinho:', novoProduto);
            mostrarAlerta('success', `Produto "${produto.nome}" adicionado ao carrinho.`);
        }
        
        // Atualizar interface
        renderizarCarrinho();
    }
    
    // Renderizar carrinho na interface
    function renderizarCarrinho() {
        const carrinhoItems = document.getElementById('carrinho-items');
        const carrinhoVazio = document.getElementById('carrinho-vazio');
        const finalizarBtn = document.getElementById('finalizar-venda-btn');
        
        if (!carrinhoItems || !carrinhoVazio || !finalizarBtn) {
            console.error('Elementos do carrinho não encontrados');
            return;
        }
        
        carrinhoItems.innerHTML = '';
        
        if (carrinho.length === 0) {
            carrinhoVazio.classList.remove('d-none');
            finalizarBtn.disabled = true;
            document.getElementById('carrinho-table').classList.add('d-none');
            return;
        }
        
        carrinhoVazio.classList.add('d-none');
        document.getElementById('carrinho-table').classList.remove('d-none');
        finalizarBtn.disabled = false;
        
        // Renderizar cada item do carrinho
        carrinho.forEach((item, index) => {
            const subtotal = calcularSubtotalItem(item);
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.nome}</td>
                <td>
                    <div class="input-group input-group-sm">
                        <button class="btn btn-outline-secondary" type="button" onclick="window.vendas.decrementarItem(${index})">-</button>
                        <input type="number" class="form-control text-center" value="${item.quantidade}" min="1" 
                            onchange="window.vendas.atualizarQuantidade(${index}, this.value)">
                        <button class="btn btn-outline-secondary" type="button" onclick="window.vendas.incrementarItem(${index})">+</button>
                    </div>
                </td>
                <td>
                    <div class="input-group input-group-sm">
                        <span class="input-group-text">R$</span>
                        <input type="number" class="form-control" value="${item.valor_unitario.toFixed(2)}" step="0.01" min="0.01"
                            onchange="window.vendas.atualizarValorUnitario(${index}, this.value)">
                    </div>
                </td>
                <td>
                    <input type="number" class="form-control form-control-sm" value="${item.percentual_desconto || 0}" 
                        min="0" max="100" step="0.5" onchange="window.vendas.atualizarDescontoItem(${index}, this.value)">
                </td>
                <td class="text-end">R$ ${subtotal.toFixed(2)}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-danger" onclick="window.vendas.removerItem(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            
            carrinhoItems.appendChild(tr);
        });
        
        // Atualizar totais
        atualizarTotaisVenda();
    }
    
    // Calcular subtotal de um item considerando desconto
    function calcularSubtotalItem(item) {
        const valorBruto = item.quantidade * item.valor_unitario;
        const desconto = valorBruto * (item.percentual_desconto || 0) / 100;
        return valorBruto - desconto;
    }
    
    // Atualizar valores totais da venda
    function atualizarTotaisVenda() {
        // Elementos do DOM
        const subtotalElement = document.getElementById('venda-subtotal');
        const totalElement = document.getElementById('venda-total');
        const descontoInput = document.getElementById('venda-desconto');
        const descontoPercentElement = document.getElementById('venda-desconto-percent');
        const impostoInput = document.getElementById('venda-imposto');
        
        if (!subtotalElement || !totalElement || !descontoInput || !impostoInput) {
            return;
        }
        
        // Calcular subtotal do carrinho
        const subtotal = carrinho.reduce((total, item) => total + calcularSubtotalItem(item), 0);
        
        // Obter valores do formulário
        const desconto = parseFloat(descontoInput.value) || 0;
        const percentual_imposto = parseFloat(impostoInput.value) || 0;
        
        // Calcular o percentual que o desconto representa do subtotal
        const percentualDesconto = subtotal > 0 ? Math.round((desconto / subtotal) * 100) : 0;
        
        // Calcular imposto
        const imposto = (subtotal - desconto) * (percentual_imposto / 100);
        
        // Calcular total
        const total = subtotal - desconto + imposto;
        
        // Atualizar valores na interface
        subtotalElement.textContent = `R$ ${subtotal.toFixed(2)}`;
        descontoPercentElement.textContent = `(${percentualDesconto}%)`;
        totalElement.textContent = `R$ ${Math.max(0, total).toFixed(2)}`;
    }
    
    // Incrementar quantidade de um item
    function incrementarItem(index) {
        if (index >= 0 && index < carrinho.length) {
            const item = carrinho[index];
            
            if (item.quantidade < item.estoque_disponivel) {
                item.quantidade++;
                renderizarCarrinho();
            } else {
                mostrarAlerta('warning', `Quantidade máxima disponível para "${item.nome}" é ${item.estoque_disponivel}.`);
            }
        }
    }
    
    // Decrementar quantidade de um item
    function decrementarItem(index) {
        if (index >= 0 && index < carrinho.length) {
            const item = carrinho[index];
            
            if (item.quantidade > 1) {
                item.quantidade--;
                renderizarCarrinho();
            }
        }
    }
    
    // Atualizar quantidade de um item
    function atualizarQuantidade(index, novaQuantidade) {
        if (index >= 0 && index < carrinho.length) {
            const item = carrinho[index];
            novaQuantidade = parseInt(novaQuantidade) || 1;
            
            if (novaQuantidade <= 0) {
                novaQuantidade = 1;
            }
            
            if (novaQuantidade > item.estoque_disponivel) {
                mostrarAlerta('warning', `Quantidade máxima disponível para "${item.nome}" é ${item.estoque_disponivel}.`);
                item.quantidade = item.estoque_disponivel;
            } else {
                item.quantidade = novaQuantidade;
            }
            
            renderizarCarrinho();
        }
    }
    
    // Atualizar percentual de desconto de um item
    function atualizarDescontoItem(index, novoDesconto) {
        if (index >= 0 && index < carrinho.length) {
            const item = carrinho[index];
            novoDesconto = parseFloat(novoDesconto) || 0;
            
            if (novoDesconto < 0) {
                novoDesconto = 0;
            }
            
            if (novoDesconto > 100) {
                novoDesconto = 100;
            }
            
            item.percentual_desconto = novoDesconto;
            renderizarCarrinho();
        }
    }
    
    // Atualizar valor unitário de um item
    function atualizarValorUnitario(index, novoValor) {
        if (index >= 0 && index < carrinho.length) {
            const item = carrinho[index];
            novoValor = parseFloat(novoValor) || 0;
            
            if (novoValor <= 0) {
                novoValor = 0.01;
            }
            
            item.valor_unitario = novoValor;
            renderizarCarrinho();
        }
    }
    
    // Remover item do carrinho
    function removerItem(index) {
        carrinho.splice(index, 1);
        renderizarCarrinho();
    }
    
    // Limpar carrinho
    function limparCarrinho() {
        if (carrinho.length === 0) {
            return;
        }
        
        if (confirm('Tem certeza que deseja limpar o carrinho?')) {
            carrinho = [];
            renderizarCarrinho();
            mostrarAlerta('success', 'Carrinho limpo com sucesso.');
        }
    }
    
    // Finalizar venda e registrar no banco de dados
    function finalizarVenda() {
        const finalizarBtn = document.getElementById('finalizar-venda-btn');
        
        // Verificar se há produtos no carrinho
        if (carrinho.length === 0) {
            mostrarAlerta('warning', 'Adicione pelo menos um produto para finalizar a venda');
            return;
        }
        
        // Desativar botão para evitar múltiplos cliques
        if (finalizarBtn) {
            finalizarBtn.disabled = true;
            finalizarBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processando...';
        }
        
        // Obter valores dos campos
        const clienteSelect = document.getElementById('cliente-venda');
        const clienteId = clienteSelect ? clienteSelect.value : null;
        
        const barbeiroId = document.getElementById('barbeiro-venda').value || null;
        const observacao = document.getElementById('venda-observacao').value || '';
        const desconto = parseFloat(document.getElementById('venda-desconto').value || 0);
        const imposto = parseFloat(document.getElementById('venda-imposto').value || 0);
        
        // Preparar itens da venda
        const itens = carrinho.map(item => ({
            produto_id: item.produto_id || item.id,
            quantidade: item.quantidade,
            valor_unitario: item.valor_unitario || item.preco,
            percentual_desconto: item.percentual_desconto || 0
        }));
        
        // Preparar dados da venda
        const vendaData = {
            cliente_id: clienteId,
            barbeiro_id: barbeiroId,
            valor_desconto: desconto,
            percentual_imposto: imposto,
            observacao: observacao,
            itens: itens
        };
        
        console.log('Enviando dados da venda:', vendaData);
        
        // Enviar requisição para API
        fetch('/api/vendas/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(vendaData)
        })
            .then(response => response.json())
            .then(response => {
                console.log('Venda finalizada com sucesso:', response);
                
                // Fechar modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('nova-venda-modal'));
                if (modal) modal.hide();
                
                // Limpar dados sem perguntar
                carrinho = [];
                renderizarCarrinho();
                clienteSelecionado = null;
                
                // Mostrar mensagem de sucesso
                mostrarAlerta('success', 'Venda finalizada com sucesso!');
                
                // Recarregar lista de vendas
                carregarVendas();
                
                // Perguntar sobre impressão do comprovante
                setTimeout(() => {
                    if (confirm('Deseja imprimir o comprovante da venda?')) {
                        imprimirComprovante(response.venda.id);
                    }
                }, 500);
            })
            .catch(error => {
                console.error('Erro ao finalizar venda:', error);
                mostrarAlerta('danger', `Erro ao finalizar venda: ${error.message || 'Tente novamente'}`);
                
                // Reativar botão
                if (finalizarBtn) {
                    finalizarBtn.disabled = false;
                    finalizarBtn.innerHTML = '<i class="fas fa-check me-2"></i>Finalizar Venda';
                }
            });
    }
    
    // Ver detalhes da venda
    function verDetalhesVenda(id) {
        const detalhesContent = document.getElementById('detalhes-venda-content');
        
        if (!detalhesContent) {
            console.error('Elemento detalhes-venda-content não encontrado');
            return;
        }
        
        // Mostrar loading
        detalhesContent.innerHTML = `
            <div class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Carregando...</span>
                </div>
                <p class="mt-2">Carregando detalhes da venda...</p>
            </div>
        `;
        
        // Abrir modal
        const detalhesModal = new bootstrap.Modal(document.getElementById('detalhes-venda-modal'));
        detalhesModal.show();
        
        // Carregar dados da venda
        API.call(`/vendas/${id}`)
            .then(venda => {
                // Formatar data
                const data = new Date(venda.data_hora);
                const dataFormatada = data.toLocaleDateString('pt-BR');
                const horaFormatada = data.toLocaleTimeString('pt-BR');
                
                // Calcular valores
                const subtotal = venda.subtotal || 
                    venda.itens.reduce((sum, item) => sum + (item.valor_unitario * item.quantidade), 0);
                
                // Renderizar detalhes
                detalhesContent.innerHTML = `
                    <div class="mb-4">
                        <div class="d-flex justify-content-between">
                            <h6 class="fw-bold">Venda #${venda.id}</h6>
                            <span class="badge ${venda.status === 'finalizada' ? 'bg-success' : 
                                venda.status === 'cancelada' ? 'bg-danger' : 'bg-warning'}">${capitalizarPrimeiraLetra(venda.status)}</span>
                        </div>
                        <div class="row mt-2">
                            <div class="col-md-6">
                                <p class="mb-1"><strong>Data:</strong> ${dataFormatada} às ${horaFormatada}</p>
                                <p class="mb-1"><strong>Cliente:</strong> ${venda.cliente_nome}</p>
                                ${venda.observacao ? `<p class="mb-1"><strong>Observação:</strong> ${venda.observacao}</p>` : ''}
                            </div>
                            <div class="col-md-6 text-md-end">
                                <p class="mb-1"><strong>Total:</strong> R$ ${venda.valor_total.toFixed(2)}</p>
                                ${venda.valor_desconto > 0 ? `<p class="mb-1"><strong>Desconto:</strong> R$ ${venda.valor_desconto.toFixed(2)}</p>` : ''}
                                ${venda.valor_imposto > 0 ? `<p class="mb-1"><strong>Imposto (${venda.percentual_imposto}%):</strong> R$ ${venda.valor_imposto.toFixed(2)}</p>` : ''}
                            </div>
                        </div>
                    </div>
                    
                    <div class="table-responsive mb-4">
                        <table class="table table-sm table-bordered">
                            <thead class="table-light">
                                <tr>
                                    <th>Produto</th>
                                    <th class="text-center">Quantidade</th>
                                    <th class="text-end">Valor Unit.</th>
                                    <th class="text-end">Desconto</th>
                                    <th class="text-end">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${venda.itens.map(item => `
                                    <tr>
                                        <td>${item.produto_nome}</td>
                                        <td class="text-center">${item.quantidade}</td>
                                        <td class="text-end">R$ ${item.valor_unitario.toFixed(2)}</td>
                                        <td class="text-end">${item.percentual_desconto ? `${item.percentual_desconto}% (R$ ${item.valor_desconto.toFixed(2)})` : '-'}</td>
                                        <td class="text-end">R$ ${item.valor_total.toFixed(2)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colspan="4" class="text-end fw-bold">Subtotal:</td>
                                    <td class="text-end">R$ ${subtotal.toFixed(2)}</td>
                                </tr>
                                ${venda.valor_desconto > 0 ? `
                                <tr>
                                    <td colspan="4" class="text-end fw-bold">Desconto Geral:</td>
                                    <td class="text-end">- R$ ${venda.valor_desconto.toFixed(2)}</td>
                                </tr>` : ''}
                                ${venda.valor_imposto > 0 ? `
                                <tr>
                                    <td colspan="4" class="text-end fw-bold">Imposto (${venda.percentual_imposto}%):</td>
                                    <td class="text-end">+ R$ ${venda.valor_imposto.toFixed(2)}</td>
                                </tr>` : ''}
                                <tr class="table-primary">
                                    <td colspan="4" class="text-end fw-bold">TOTAL:</td>
                                    <td class="text-end fw-bold">R$ ${venda.valor_total.toFixed(2)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                    
                    ${venda.pagamentos && venda.pagamentos.length > 0 ? `
                        <div class="mb-3">
                            <h6 class="fw-bold">Pagamentos</h6>
                            <div class="table-responsive">
                                <table class="table table-sm table-bordered">
                                    <thead class="table-light">
                                        <tr>
                                            <th>Data</th>
                                            <th>Método</th>
                                            <th class="text-end">Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${venda.pagamentos.map(pagamento => {
                                            const dataPagamento = new Date(pagamento.data_hora);
                                            return `
                                                <tr>
                                                    <td>${dataPagamento.toLocaleDateString('pt-BR')} às ${dataPagamento.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
                                                    <td>${formatarMetodoPagamento(pagamento.metodo)}</td>
                                                    <td class="text-end">R$ ${pagamento.valor.toFixed(2)}</td>
                                                </tr>
                                            `;
                                        }).join('')}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td colspan="2" class="text-end fw-bold">Total Pago:</td>
                                            <td class="text-end">R$ ${venda.pagamentos.reduce((sum, pagamento) => sum + pagamento.valor, 0).toFixed(2)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="d-grid gap-2 d-md-flex justify-content-md-end">
                        ${venda.status === 'finalizada' ? `
                            <button type="button" class="btn btn-sm btn-outline-danger" onclick="window.vendas.confirmarCancelamentoVenda(${venda.id})">
                                <i class="fas fa-times me-1"></i> Cancelar Venda
                            </button>
                        ` : ''}
                        
                        <button type="button" class="btn btn-sm btn-outline-primary" onclick="window.vendas.abrirModalPagamento(${venda.id})">
                            <i class="fas fa-dollar-sign me-1"></i> Adicionar Pagamento
                        </button>
                    </div>
                `;
                
                // Atualizar ID da venda no botão de imprimir comprovante
                const imprimirBtn = document.getElementById('imprimir-comprovante-btn');
                if (imprimirBtn) {
                    imprimirBtn.onclick = () => imprimirComprovante(venda.id);
                }
            })
            .catch(error => {
                console.error('Erro ao carregar detalhes da venda:', error);
                detalhesContent.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        Erro ao carregar detalhes da venda. Por favor, tente novamente.
                    </div>
                `;
            });
    }
    
    // Formatar método de pagamento
    function formatarMetodoPagamento(metodo) {
        const metodos = {
            'dinheiro': 'Dinheiro',
            'cartao_credito': 'Cartão de Crédito',
            'cartao_debito': 'Cartão de Débito',
            'pix': 'PIX'
        };
        
        return metodos[metodo] || metodo;
    }
    
    // Abrir modal de pagamento
    function abrirModalPagamento(id) {
        API.call(`/vendas/${id}`)
            .then(venda => {
                // Criar modal de pagamento dinamicamente
                if (!document.getElementById('modal-pagamento-venda')) {
                    const modalHTML = `
                        <div class="modal fade" id="modal-pagamento-venda" tabindex="-1" aria-hidden="true">
                            <div class="modal-dialog">
                                <div class="modal-content">
                                    <div class="modal-header">
                                        <h5 class="modal-title">Registrar Pagamento - Venda #<span id="pagamento-venda-id"></span></h5>
                                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
                                    </div>
                                    <div class="modal-body">
                                        <div class="row mb-3">
                                            <div class="col">
                                                <div class="alert alert-info">
                                                    <div class="d-flex justify-content-between">
                                                        <span>Valor Total:</span>
                                                        <strong id="pagamento-valor-total">R$ 0,00</strong>
                                                    </div>
                                                    <div class="d-flex justify-content-between">
                                                        <span>Total Pago:</span>
                                                        <strong id="pagamento-valor-pago">R$ 0,00</strong>
                                                    </div>
                                                    <div class="d-flex justify-content-between">
                                                        <span>Valor Restante:</span>
                                                        <strong id="pagamento-valor-restante">R$ 0,00</strong>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <form id="form-pagamento">
                                            <div class="mb-3">
                                                <label for="pagamento-valor" class="form-label">Valor do Pagamento</label>
                                                <div class="input-group">
                                                    <span class="input-group-text">R$</span>
                                                    <input type="number" class="form-control" id="pagamento-valor" step="0.01" min="0.01" required>
                                                </div>
                                            </div>
                                            
                                            <div class="mb-3">
                                                <label for="pagamento-metodo" class="form-label">Método de Pagamento</label>
                                                <select class="form-select" id="pagamento-metodo" required>
                                                    <option value="">Selecione o método</option>
                                                    <option value="dinheiro">Dinheiro</option>
                                                    <option value="cartao_credito">Cartão de Crédito</option>
                                                    <option value="cartao_debito">Cartão de Débito</option>
                                                    <option value="pix">PIX</option>
                                                </select>
                                            </div>
                                        </form>
                                    </div>
                                    <div class="modal-footer">
                                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                                        <button type="button" class="btn btn-success" id="btn-confirmar-pagamento">
                                            Confirmar Pagamento
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                    
                    const modalElement = document.createElement('div');
                    modalElement.innerHTML = modalHTML;
                    document.body.appendChild(modalElement.firstChild);
                    
                    // Adicionar event listener para confirmação de pagamento
                    document.getElementById('btn-confirmar-pagamento').addEventListener('click', confirmarPagamento);
                    
                    // Atualizar valor restante ao digitar valor
                    document.getElementById('pagamento-valor').addEventListener('input', (e) => {
                        const valorTotal = parseFloat(document.getElementById('pagamento-valor-total').textContent.replace('R$ ', ''));
                        const valorPago = parseFloat(document.getElementById('pagamento-valor-pago').textContent.replace('R$ ', ''));
                        const valorDigitado = parseFloat(e.target.value) || 0;
                        const valorRestante = valorTotal - valorPago - valorDigitado;
                        
                        document.getElementById('pagamento-valor-restante').textContent = `R$ ${Math.max(0, valorRestante).toFixed(2)}`;
                        
                        // Se valor digitado for maior que o restante, ajustar
                        if (valorDigitado > (valorTotal - valorPago)) {
                            e.target.value = (valorTotal - valorPago).toFixed(2);
                        }
                    });
                }
                
                // Preencher dados da venda
                document.getElementById('pagamento-venda-id').textContent = venda.id;
                document.getElementById('pagamento-valor-total').textContent = `R$ ${venda.valor_total.toFixed(2)}`;
                
                // Calcular total já pago
                const totalPago = venda.pagamentos ? venda.pagamentos.reduce((sum, p) => sum + p.valor, 0) : 0;
                const valorRestante = venda.valor_total - totalPago;
                
                document.getElementById('pagamento-valor-pago').textContent = `R$ ${totalPago.toFixed(2)}`;
                document.getElementById('pagamento-valor-restante').textContent = `R$ ${valorRestante.toFixed(2)}`;
                
                // Definir valor padrão como o restante
                document.getElementById('pagamento-valor').value = valorRestante.toFixed(2);
                document.getElementById('pagamento-metodo').value = '';
                
                // Verificar se há valor a ser pago
                if (valorRestante <= 0) {
                    document.getElementById('pagamento-valor').disabled = true;
                    document.getElementById('pagamento-metodo').disabled = true;
                    document.getElementById('btn-confirmar-pagamento').disabled = true;
                } else {
                    document.getElementById('pagamento-valor').disabled = false;
                    document.getElementById('pagamento-metodo').disabled = false;
                    document.getElementById('btn-confirmar-pagamento').disabled = false;
                }
                
                // Abrir modal
                const modal = new bootstrap.Modal(document.getElementById('modal-pagamento-venda'));
                modal.show();
            })
            .catch(error => {
                console.error('Erro ao carregar dados da venda:', error);
                mostrarAlerta('danger', 'Erro ao carregar dados da venda. Tente novamente.');
            });
    }
    
    // Confirmar pagamento
    function confirmarPagamento() {
        const vendaId = document.getElementById('pagamento-venda-id').textContent;
        const valor = parseFloat(document.getElementById('pagamento-valor').value);
        const metodo = document.getElementById('pagamento-metodo').value;
        
        if (!valor || valor <= 0) {
            mostrarAlerta('warning', 'O valor do pagamento deve ser maior que zero.');
            return;
        }
        
        if (!metodo) {
            mostrarAlerta('warning', 'Selecione um método de pagamento.');
            return;
        }
        
        // Dados do pagamento
        const pagamentoData = {
            valor: valor,
            metodo: metodo
        };
        
        // Enviar para API usando API.call
        API.call(`/vendas/${vendaId}/pagamento`, 'POST', pagamentoData)
            .then(data => {
                // Fechar modal
                bootstrap.Modal.getInstance(document.getElementById('modal-pagamento-venda')).hide();
                
                // Exibir mensagem de sucesso
                mostrarAlerta('success', 'Pagamento registrado com sucesso!');
                
                // Recarregar dados
                carregarVendas();
                carregarResumoVendas();
                carregarMetodosPagamento();
            })
            .catch(error => {
                console.error('Erro ao registrar pagamento:', error);
                mostrarAlerta('danger', error.message || 'Erro ao registrar pagamento. Tente novamente.');
            });
    }
    
    // Confirmar cancelamento de venda
    function confirmarCancelamentoVenda(id) {
        if (confirm('Tem certeza que deseja cancelar esta venda? Esta ação não pode ser desfeita.')) {
            API.call(`/vendas/${id}`, 'DELETE')
                .then(data => {
                    mostrarAlerta('success', 'Venda cancelada com sucesso!');
                    carregarVendas();
                    carregarResumoVendas();
                    carregarGraficoVendas();
                    carregarMetodosPagamento();
                })
                .catch(error => {
                    console.error('Erro ao cancelar venda:', error);
                    mostrarAlerta('danger', error.message || 'Erro ao cancelar venda. Tente novamente.');
                });
        }
    }
    
    // Exportar vendas em CSV
    function exportarVendas() {
        // Parâmetros de filtro atuais
        const dataInicio = document.getElementById('data-inicio').value;
        const dataFim = document.getElementById('data-fim').value;
        const status = document.getElementById('filtro-status').value;
        
        // Construir query params
        const params = new URLSearchParams();
        if (dataInicio) params.append('data_inicio', dataInicio);
        if (dataFim) params.append('data_fim', dataFim);
        if (status !== 'todos') params.append('status', status);
        
        // Usar API.call
        API.call(`/vendas/exportar?${params.toString()}`)
            .then(data => {
                if (!data.vendas || data.vendas.length === 0) {
                    mostrarAlerta('warning', 'Não há vendas para exportar com os filtros atuais.');
                    return;
                }
                
                // Criar CSV
                let csv = 'ID,Data,Cliente,Valor Total,Status,Itens,Pagamento\n';
                
                data.vendas.forEach(venda => {
                    const data = new Date(venda.data_hora);
                    const dataFormatada = data.toLocaleDateString('pt-BR');
                    const itens = venda.itens.length;
                    const pagamentos = venda.pagamentos ? venda.pagamentos.length : 0;
                    
                    csv += `${venda.id},${dataFormatada},"${venda.cliente_nome}",${venda.valor_total.toFixed(2)},${venda.status},${itens},${pagamentos}\n`;
                });
                
                // Download do arquivo
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                const url = URL.createObjectURL(blob);
                
                link.setAttribute('href', url);
                link.setAttribute('download', `vendas_${new Date().toISOString().split('T')[0]}.csv`);
                link.style.visibility = 'hidden';
                
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            })
            .catch(error => {
                console.error('Erro ao exportar vendas:', error);
                mostrarAlerta('danger', 'Erro ao exportar vendas. Tente novamente.');
            });
    }
    
    // Imprimir relatório de vendas
    function imprimirVendas() {
        // Abrir janela de impressão com os dados atuais
        const printWindow = window.open('', '_blank');
        
        if (!printWindow) {
            mostrarAlerta('warning', 'O bloqueador de pop-ups impediu a abertura da janela de impressão. Por favor, permita pop-ups para este site.');
            return;
        }
        
        // Definir conteúdo da janela de impressão
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Relatório de Vendas - B-Manager</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
                    h1 { text-align: center; margin-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
                    @media print {
                        .no-print { display: none; }
                        body { padding: 0; }
                    }
                </style>
            </head>
            <body>
                <div class="no-print" style="text-align: right; margin-bottom: 20px;">
                    <button onclick="window.print()">Imprimir</button>
                    <button onclick="window.close()">Fechar</button>
                </div>
                
                <h1>Relatório de Vendas</h1>
                
                <div style="margin-bottom: 20px;">
                    <p><strong>Data do relatório:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
                    <p><strong>Filtros aplicados:</strong> 
                        ${document.getElementById('data-inicio').value ? 'Data início: ' + document.getElementById('data-inicio').value : 'Sem data início'} | 
                        ${document.getElementById('data-fim').value ? 'Data fim: ' + document.getElementById('data-fim').value : 'Sem data fim'} | 
                        Status: ${document.getElementById('filtro-status').options[document.getElementById('filtro-status').selectedIndex].text}
                    </p>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Data</th>
                            <th>Cliente</th>
                            <th>Itens</th>
                            <th>Valor Total</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${vendasData.map(venda => {
                            const data = new Date(venda.data_hora);
                            const dataFormatada = data.toLocaleDateString('pt-BR');
                            return `
                                <tr>
                                    <td>${venda.id}</td>
                                    <td>${dataFormatada}</td>
                                    <td>${venda.cliente_nome}</td>
                                    <td>${venda.itens.length} item(ns)</td>
                                    <td>R$ ${venda.valor_total.toFixed(2)}</td>
                                    <td>${capitalizarPrimeiraLetra(venda.status)}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                    <tfoot>
                        <tr>
                            <th colspan="4">Total:</th>
                            <th>R$ ${vendasData.reduce((total, venda) => total + venda.valor_total, 0).toFixed(2)}</th>
                            <th>${vendasData.length} venda(s)</th>
                        </tr>
                    </tfoot>
                </table>
                
                <div class="footer">
                    <p>B-Manager - Sistema de Gestão para Barbearias</p>
                    <p>Relatório gerado em ${new Date().toLocaleString('pt-BR')}</p>
                </div>
            </body>
            </html>
        `);
        
        printWindow.document.close();
    }
    
    // Gerar relatório mais detalhado
    function gerarRelatorio() {
        // Implementação seria similar à de imprimirVendas, mas com mais informações
        // e possivelmente gráficos ou análises adicionais
        mostrarAlerta('info', 'Funcionalidade de relatório detalhado em desenvolvimento.');
    }
    
    // Imprimir comprovante de uma venda específica
    function imprimirComprovante(vendaId) {
        API.call(`/vendas/${vendaId}`)
            .then(venda => {
                const printWindow = window.open('', '_blank');
                
                if (!printWindow) {
                    mostrarAlerta('warning', 'O bloqueador de pop-ups impediu a abertura da janela de impressão. Por favor, permita pop-ups para este site.');
                    return;
                }
                
                const data = new Date(venda.data_hora);
                const dataFormatada = data.toLocaleDateString('pt-BR') + ' ' + data.toLocaleTimeString('pt-BR');
                
                // Calcular total pago
                const totalPago = venda.pagamentos ? venda.pagamentos.reduce((sum, p) => sum + p.valor, 0) : 0;
                
                // Definir conteúdo do comprovante
                printWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>Comprovante de Venda #${venda.id}</title>
                        <style>
                            body { font-family: 'Courier New', monospace; margin: 0; padding: 10px; font-size: 12px; }
                            .header { text-align: center; margin-bottom: 10px; }
                            .divider { border-top: 1px dashed #000; margin: 10px 0; }
                            table { width: 100%; border-collapse: collapse; }
                            th, td { text-align: left; padding: 3px 0; }
                            .right { text-align: right; }
                            .center { text-align: center; }
                            .footer { text-align: center; margin-top: 20px; font-size: 10px; }
                            @media print {
                                .no-print { display: none; }
                                body { padding: 0; }
                            }
                        </style>
                    </head>
                    <body>
                        <div class="no-print" style="text-align: right; margin-bottom: 10px;">
                            <button onclick="window.print()">Imprimir</button>
                            <button onclick="window.close()">Fechar</button>
                        </div>
                        
                        <div class="header">
                            <h1 style="margin: 0; font-size: 16px;">B-MANAGER BARBEARIA</h1>
                            <p>CNPJ: 00.000.000/0000-00</p>
                            <p>Rua Exemplo, 123 - Cidade - Estado</p>
                            <p>Tel: (11) 1234-5678</p>
                        </div>
                        
                        <div class="divider"></div>
                        
                        <h2 style="text-align: center; font-size: 14px;">COMPROVANTE DE VENDA</h2>
                        <p><strong>Venda Nº:</strong> ${venda.id}</p>
                        <p><strong>Data/Hora:</strong> ${dataFormatada}</p>
                        <p><strong>Cliente:</strong> ${venda.cliente_nome}</p>
                        <p><strong>Status:</strong> ${capitalizarPrimeiraLetra(venda.status)}</p>
                        
                        <div class="divider"></div>
                        
                        <table>
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th class="center">Qtd</th>
                                    <th class="right">Valor Unit.</th>
                                    <th class="right">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${venda.itens.map(item => {
                                    const subtotal = item.quantidade * item.valor_unitario;
                                    return `
                                        <tr>
                                            <td>${item.produto_nome}</td>
                                            <td class="center">${item.quantidade}</td>
                                            <td class="right">R$ ${item.valor_unitario.toFixed(2)}</td>
                                            <td class="right">R$ ${subtotal.toFixed(2)}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <th colspan="3" class="right">Total:</th>
                                    <th class="right">R$ ${venda.valor_total.toFixed(2)}</th>
                                </tr>
                            </tfoot>
                        </table>
                        
                        <div class="divider"></div>
                        
                        <h3 style="font-size: 12px;">PAGAMENTOS</h3>
                        ${venda.pagamentos && venda.pagamentos.length > 0 ? `
                            <table>
                                <thead>
                                    <tr>
                                        <th>Método</th>
                                        <th class="right">Valor</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${venda.pagamentos.map(pagamento => {
                                        let metodoText = 'Desconhecido';
                                        if (pagamento.forma_pagamento === 'dinheiro') metodoText = 'Dinheiro';
                                        if (pagamento.forma_pagamento === 'cartao_credito') metodoText = 'Cartão de Crédito';
                                        if (pagamento.forma_pagamento === 'cartao_debito') metodoText = 'Cartão de Débito';
                                        if (pagamento.forma_pagamento === 'pix') metodoText = 'PIX';
                                        
                                        return `
                                            <tr>
                                                <td>${metodoText}</td>
                                                <td class="right">R$ ${pagamento.valor.toFixed(2)}</td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <th class="right">Total Pago:</th>
                                        <th class="right">R$ ${totalPago.toFixed(2)}</th>
                                    </tr>
                                    <tr>
                                        <th class="right">Valor Restante:</th>
                                        <th class="right">R$ ${(venda.valor_total - totalPago).toFixed(2)}</th>
                                    </tr>
                                </tfoot>
                            </table>
                        ` : `
                            <p class="center">Nenhum pagamento registrado.</p>
                        `}
                        
                        <div class="divider"></div>
                        
                        <div class="footer">
                            <p>Obrigado pela preferência!</p>
                            <p>B-Manager - Sistema de Gestão para Barbearias</p>
                            <p>Comprovante gerado em ${new Date().toLocaleString('pt-BR')}</p>
                        </div>
                    </body>
                    </html>
                `);
                
                printWindow.document.close();
            })
            .catch(error => {
                console.error('Erro ao gerar comprovante:', error);
                mostrarAlerta('danger', 'Erro ao gerar comprovante. Tente novamente.');
            });
    }
    
    // Inicializar a página
    init();

    // Disponibilizar funções globalmente
    window.vendas = {
        init: init,
        decrementarItem: decrementarItem,
        incrementarItem: incrementarItem,
        atualizarQuantidade: atualizarQuantidade,
        removerItem: removerItem,
        atualizarDescontoItem: atualizarDescontoItem, 
        atualizarValorUnitario: atualizarValorUnitario,
        finalizarVenda: finalizarVenda,
        verDetalhesVenda: verDetalhesVenda,
        abrirModalPagamento: abrirModalPagamento,
        confirmarPagamento: confirmarPagamento,
        confirmarCancelamentoVenda: confirmarCancelamentoVenda
    };
}); 