/**
 * B-Manager - Sistema de Gerenciamento para Barbearias
 * Arquivo JS principal
 */

// Funções para API
const API = {
    // Autenticação
    login: async (email, password) => {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });
            
            if (!response.ok) {
                throw new Error('Falha na autenticação');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Erro ao fazer login:', error);
            throw error;
        }
    },
    
    // Dashboard
    getDashboardData: async () => {
        try {
            // Em uma aplicação real, aqui seria feita uma requisição para a API
            // Simulando dados para demonstração
            return {
                agendamentos: {
                    hoje: 8,
                    crescimento: 15,
                    concluidos: '5/8',
                    progresso: 62.5
                },
                vendas: {
                    hoje: 'R$ 450,00',
                    crescimento: 8,
                    ticket: 'R$ 56,25',
                    progresso: 45
                },
                clientes: {
                    novos: 3,
                    crescimento: 12,
                    total: 147,
                    progresso: 75
                },
                produtos: {
                    baixoEstoque: 4,
                    crescimento: 25,
                    total: 34,
                    progresso: 12
                }
            };
        } catch (error) {
            console.error('Erro ao obter dados do dashboard:', error);
            throw error;
        }
    },
    
    // Agendamentos
    getAgendamentosHoje: async () => {
        try {
            // Simulando dados para demonstração
            return [
                {
                    id: 1,
                    horario: '10:00',
                    cliente: 'João Silva',
                    servico: 'Corte + Barba',
                    barbeiro: 'Carlos',
                    status: 'concluído'
                },
                {
                    id: 2,
                    horario: '11:30',
                    cliente: 'Pedro Santos',
                    servico: 'Corte',
                    barbeiro: 'André',
                    status: 'concluído'
                },
                {
                    id: 3,
                    horario: '13:00',
                    cliente: 'Lucas Mendes',
                    servico: 'Barba',
                    barbeiro: 'Carlos',
                    status: 'concluído'
                },
                {
                    id: 4,
                    horario: '14:30',
                    cliente: 'Roberto Ferreira',
                    servico: 'Corte + Barba',
                    barbeiro: 'André',
                    status: 'confirmado'
                },
                {
                    id: 5,
                    horario: '15:45',
                    cliente: 'Marcelo Costa',
                    servico: 'Corte',
                    barbeiro: 'Carlos',
                    status: 'confirmado'
                }
            ];
        } catch (error) {
            console.error('Erro ao obter agendamentos:', error);
            throw error;
        }
    },
    
    // Atividades recentes
    getAtividadesRecentes: async () => {
        try {
            // Simulando dados para demonstração
            return [
                {
                    id: 1,
                    tipo: 'agendamento',
                    descricao: 'Novo agendamento para Pedro Santos',
                    horario: '09:45',
                    data: 'Hoje'
                },
                {
                    id: 2,
                    tipo: 'venda',
                    descricao: 'Venda finalizada no valor de R$ 85,00',
                    horario: '11:20',
                    data: 'Hoje'
                },
                {
                    id: 3,
                    tipo: 'produto',
                    descricao: 'Estoque baixo de Gel Modelador',
                    horario: '13:15',
                    data: 'Hoje'
                },
                {
                    id: 4,
                    tipo: 'cliente',
                    descricao: 'Novo cliente cadastrado: Roberto Ferreira',
                    horario: '14:00',
                    data: 'Hoje'
                }
            ];
        } catch (error) {
            console.error('Erro ao obter atividades recentes:', error);
            throw error;
        }
    }
};

// Gerenciamento do Dashboard
const Dashboard = {
    init: async () => {
        try {
            // Atualiza os dados do dashboard
            const dashboardData = await API.getDashboardData();
            
            // Atualiza os contadores
            document.getElementById('agendamentos-hoje').textContent = dashboardData.agendamentos.hoje;
            document.getElementById('agendamentos-crescimento').textContent = `${dashboardData.agendamentos.crescimento}%`;
            document.getElementById('agendamentos-concluidos').textContent = dashboardData.agendamentos.concluidos;
            document.getElementById('agendamentos-progress').style.width = `${dashboardData.agendamentos.progresso}%`;
            
            document.getElementById('vendas-hoje').textContent = dashboardData.vendas.hoje;
            document.getElementById('vendas-crescimento').textContent = `${dashboardData.vendas.crescimento}%`;
            document.getElementById('vendas-ticket').textContent = dashboardData.vendas.ticket;
            document.getElementById('vendas-progress').style.width = `${dashboardData.vendas.progresso}%`;
            
            document.getElementById('clientes-novos').textContent = dashboardData.clientes.novos;
            document.getElementById('clientes-crescimento').textContent = `${dashboardData.clientes.crescimento}%`;
            document.getElementById('clientes-total').textContent = dashboardData.clientes.total;
            document.getElementById('clientes-progress').style.width = `${dashboardData.clientes.progresso}%`;
            
            document.getElementById('produtos-baixo-estoque').textContent = dashboardData.produtos.baixoEstoque;
            document.getElementById('produtos-baixo-crescimento').textContent = `${dashboardData.produtos.crescimento}%`;
            document.getElementById('produtos-total').textContent = dashboardData.produtos.total;
            document.getElementById('produtos-progress').style.width = `${dashboardData.produtos.progresso}%`;
            
            // Carrega agendamentos de hoje
            await Dashboard.carregarAgendamentos();
            
            // Carrega atividades recentes
            await Dashboard.carregarAtividades();
            
        } catch (error) {
            console.error('Erro ao inicializar dashboard:', error);
        }
    },
    
    carregarAgendamentos: async () => {
        try {
            // Obtém elementos do DOM
            const tabelaAgendamentos = document.getElementById('tabela-agendamentos');
            const agendamentosEmpty = document.getElementById('agendamentos-empty');
            const agendamentosLoading = document.getElementById('agendamentos-loading');
            
            // Mostra loading
            agendamentosLoading.classList.remove('d-none');
            agendamentosEmpty.classList.add('d-none');
            
            // Obtém dados da API
            const agendamentos = await API.getAgendamentosHoje();
            
            // Esconde loading
            agendamentosLoading.classList.add('d-none');
            
            // Verifica se há agendamentos
            if (agendamentos.length === 0) {
                agendamentosEmpty.classList.remove('d-none');
                return;
            }
            
            // Limpa a tabela
            tabelaAgendamentos.innerHTML = '';
            
            // Adiciona os agendamentos à tabela
            agendamentos.forEach(agendamento => {
                const tr = document.createElement('tr');
                
                // Define a classe baseada no status
                if (agendamento.status === 'concluído') {
                    tr.classList.add('table-success');
                }
                
                tr.innerHTML = `
                    <td>${agendamento.horario}</td>
                    <td>${agendamento.cliente}</td>
                    <td>${agendamento.servico}</td>
                    <td>${agendamento.barbeiro}</td>
                    <td>
                        <span class="badge ${agendamento.status === 'concluído' ? 'bg-success' : 'bg-primary'}">
                            ${agendamento.status}
                        </span>
                    </td>
                    <td>
                        <div class="btn-group">
                            <button type="button" class="btn btn-sm btn-outline-secondary">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button type="button" class="btn btn-sm btn-outline-secondary">
                                <i class="fas fa-edit"></i>
                            </button>
                        </div>
                    </td>
                `;
                
                tabelaAgendamentos.appendChild(tr);
            });
            
        } catch (error) {
            console.error('Erro ao carregar agendamentos:', error);
        }
    },
    
    carregarAtividades: async () => {
        try {
            // Obtém elementos do DOM
            const atividadesTimeline = document.getElementById('atividades-timeline');
            const atividadesEmpty = document.getElementById('atividades-empty');
            const atividadesLoading = document.getElementById('atividades-loading');
            
            // Mostra loading
            atividadesLoading.classList.remove('d-none');
            atividadesEmpty.classList.add('d-none');
            
            // Obtém dados da API
            const atividades = await API.getAtividadesRecentes();
            
            // Esconde loading
            atividadesLoading.classList.add('d-none');
            
            // Verifica se há atividades
            if (atividades.length === 0) {
                atividadesEmpty.classList.remove('d-none');
                return;
            }
            
            // Limpa o timeline
            atividadesTimeline.innerHTML = '';
            
            // Adiciona as atividades ao timeline
            atividades.forEach(atividade => {
                // Define o ícone baseado no tipo de atividade
                let icone = 'fas fa-info-circle';
                let corIcone = 'bg-primary';
                
                switch (atividade.tipo) {
                    case 'agendamento':
                        icone = 'fas fa-calendar-check';
                        corIcone = 'bg-primary';
                        break;
                    case 'venda':
                        icone = 'fas fa-shopping-cart';
                        corIcone = 'bg-success';
                        break;
                    case 'produto':
                        icone = 'fas fa-box';
                        corIcone = 'bg-warning';
                        break;
                    case 'cliente':
                        icone = 'fas fa-user';
                        corIcone = 'bg-info';
                        break;
                }
                
                const itemHtml = `
                    <div class="timeline-item mb-3">
                        <div class="d-flex">
                            <div class="me-3">
                                <div class="icon-circle ${corIcone} text-white">
                                    <i class="${icone}"></i>
                                </div>
                            </div>
                            <div>
                                <div class="small text-gray-500">${atividade.data} - ${atividade.horario}</div>
                                <div>${atividade.descricao}</div>
                            </div>
                        </div>
                    </div>
                `;
                
                atividadesTimeline.innerHTML += itemHtml;
            });
            
        } catch (error) {
            console.error('Erro ao carregar atividades:', error);
        }
    }
};

// Inicialização da aplicação
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar o Dashboard quando necessário
    const dashboardContainer = document.getElementById('dashboard-container');
    
    // Observa mudanças na visibilidade do dashboard
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                const isVisible = !dashboardContainer.classList.contains('d-none');
                if (isVisible) {
                    Dashboard.init();
                }
            }
        });
    });
    
    observer.observe(dashboardContainer, { attributes: true });
});