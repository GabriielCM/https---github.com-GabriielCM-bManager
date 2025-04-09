/**
 * Scripts para a página de Relatórios
 */

// Dados de exemplo para os gráficos
const dadosFaturamento = {
    labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
    datasets: [{
        label: 'Faturamento Mensal (R$)',
        data: [12800, 15400, 14200, 16800, 18900, 17500],
        backgroundColor: 'rgba(78, 115, 223, 0.4)',
        borderColor: 'rgba(78, 115, 223, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(78, 115, 223, 1)',
        pointRadius: 3
    }]
};

const dadosServicos = {
    labels: ['Corte', 'Barba', 'Combo', 'Coloração', 'Hidratação'],
    datasets: [{
        label: 'Serviços Realizados',
        data: [65, 45, 38, 12, 8],
        backgroundColor: [
            'rgba(78, 115, 223, 0.7)',
            'rgba(28, 200, 138, 0.7)',
            'rgba(54, 185, 204, 0.7)',
            'rgba(246, 194, 62, 0.7)',
            'rgba(231, 74, 59, 0.7)'
        ],
        borderWidth: 1
    }]
};

const dadosClientes = {
    labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
    datasets: [{
        label: 'Novos Clientes',
        data: [25, 32, 28, 35, 42, 38],
        backgroundColor: 'rgba(28, 200, 138, 0.4)',
        borderColor: 'rgba(28, 200, 138, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(28, 200, 138, 1)',
        pointRadius: 3
    }]
};

// Inicializar gráficos quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    // Verificar se estamos na página de relatórios
    if (window.location.pathname !== '/relatorios') return;
    
    // Inicializar gráficos
    inicializarGraficos();
    
    // Inicializar seletor de período
    inicializarControles();
    
    // Carregar estatísticas gerais
    carregarEstatisticas();
});

// Inicializar os gráficos
function inicializarGraficos() {
    // Gráfico de Faturamento
    const ctxFaturamento = document.getElementById('grafico-faturamento');
    if (ctxFaturamento) {
        new Chart(ctxFaturamento, {
            type: 'line',
            data: dadosFaturamento,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return 'R$ ' + value.toLocaleString('pt-BR');
                            }
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return 'R$ ' + context.raw.toLocaleString('pt-BR');
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Gráfico de Serviços
    const ctxServicos = document.getElementById('grafico-servicos');
    if (ctxServicos) {
        new Chart(ctxServicos, {
            type: 'doughnut',
            data: dadosServicos,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
    
    // Gráfico de Clientes
    const ctxClientes = document.getElementById('grafico-clientes');
    if (ctxClientes) {
        new Chart(ctxClientes, {
            type: 'bar',
            data: dadosClientes,
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
                }
            }
        });
    }
}

// Inicializar controles de filtro
function inicializarControles() {
    const filtroData = document.getElementById('filtro-data');
    if (filtroData) {
        filtroData.addEventListener('change', function() {
            // Aqui você pode implementar a lógica para recarregar os dados com base no período selecionado
            console.log('Período selecionado:', this.value);
            // atualizarDados(this.value);
        });
    }
    
    // Botão para exportar relatórios
    const btnExportar = document.getElementById('btn-exportar');
    if (btnExportar) {
        btnExportar.addEventListener('click', function() {
            alert('Funcionalidade de exportação será implementada em breve!');
        });
    }
}

// Carregar estatísticas gerais
function carregarEstatisticas() {
    // Estas estatísticas seriam carregadas de uma API
    // Por enquanto, usamos dados estáticos
    const estatisticas = {
        faturamento_total: 95600,
        ticket_medio: 85.30,
        total_clientes: 324,
        taxa_retorno: 68.5,
        servicos_realizados: 1125,
        produtos_vendidos: 438
    };
    
    // Atualizar elementos na página
    document.getElementById('faturamento-total')?.textContent = 'R$ ' + estatisticas.faturamento_total.toLocaleString('pt-BR');
    document.getElementById('ticket-medio')?.textContent = 'R$ ' + estatisticas.ticket_medio.toLocaleString('pt-BR');
    document.getElementById('total-clientes')?.textContent = estatisticas.total_clientes;
    document.getElementById('taxa-retorno')?.textContent = estatisticas.taxa_retorno + '%';
    document.getElementById('servicos-realizados')?.textContent = estatisticas.servicos_realizados;
    document.getElementById('produtos-vendidos')?.textContent = estatisticas.produtos_vendidos;
}

// Função para atualizar os dados dos gráficos com base no período selecionado
function atualizarDados(periodo) {
    // Esta função seria implementada para buscar dados reais da API
    // Por enquanto, apenas exibe uma mensagem
    console.log('Atualizando dados para o período:', periodo);
} 