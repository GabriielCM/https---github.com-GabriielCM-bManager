from app.models.base import Base
from app.models.usuario import Usuario
from app.models.cliente import Cliente
from app.models.barbeiro import Barbeiro
from app.models.servico import Servico
from app.models.agendamento import Agendamento, AgendamentoServico
from app.models.atendimento import Atendimento
from app.models.produto import Produto
from app.models.venda import Venda, VendaItem
from app.models.pagamento import Pagamento
from app.models.caixa_diario import CaixaDiario
from app.models.plano_mensal import PlanoMensal, PlanoMensalServico
from app.models.movimento_estoque import MovimentoEstoque
from app.models.configuracao import Configuracao

# Expor todos os modelos em um dicionário para facilitar o acesso
models = {
    'Base': Base,
    'Usuario': Usuario,
    'Cliente': Cliente,
    'Barbeiro': Barbeiro,
    'Servico': Servico,
    'Agendamento': Agendamento,
    'AgendamentoServico': AgendamentoServico,
    'Atendimento': Atendimento,
    'Produto': Produto,
    'Venda': Venda,
    'VendaItem': VendaItem,
    'Pagamento': Pagamento,
    'CaixaDiario': CaixaDiario,
    'PlanoMensal': PlanoMensal,
    'PlanoMensalServico': PlanoMensalServico,
    'MovimentoEstoque': MovimentoEstoque,
    'Configuracao': Configuracao
} 