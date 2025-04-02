from app import create_app, db
from app.models.agendamento import Agendamento, AgendamentoServico
from app.models.servico import Servico
from app.models.cliente import Cliente
from app.models.barbeiro import Barbeiro
import datetime

def seed_test_data():
    """Adiciona dados de teste para a página de agendamentos"""
    app = create_app()
    
    with app.app_context():
        # Verificar se já existem dados
        agendamentos = Agendamento.query.count()
        if agendamentos > 0:
            print(f"Já existem {agendamentos} agendamentos no banco de dados.")
            return
        
        # Verificar se existem clientes, barbeiros e serviços
        clientes = Cliente.query.all()
        if not clientes:
            print("Erro: Não há clientes cadastrados!")
            return
            
        barbeiros = Barbeiro.query.all()
        if not barbeiros:
            print("Erro: Não há barbeiros cadastrados!")
            return
            
        servicos = Servico.query.all()
        if not servicos:
            print("Erro: Não há serviços cadastrados!")
            return
            
        # Criar alguns agendamentos de exemplo
        hoje = datetime.datetime.now()
        cliente = clientes[0]
        barbeiro = barbeiros[0]
        servico = servicos[0]
        
        # Agendamento para hoje
        agendamento1 = Agendamento(
            cliente_id=cliente.id,
            barbeiro_id=barbeiro.id,
            data_hora_inicio=hoje.replace(hour=10, minute=0, second=0),
            data_hora_fim=hoje.replace(hour=10, minute=30, second=0),
            status='pendente',
            observacoes='Agendamento de teste'
        )
        
        # Agendamento para amanhã
        amanha = hoje + datetime.timedelta(days=1)
        agendamento2 = Agendamento(
            cliente_id=cliente.id,
            barbeiro_id=barbeiro.id,
            data_hora_inicio=amanha.replace(hour=14, minute=0, second=0),
            data_hora_fim=amanha.replace(hour=14, minute=30, second=0),
            status='pendente',
            observacoes='Agendamento de teste para amanhã'
        )
        
        db.session.add(agendamento1)
        db.session.add(agendamento2)
        db.session.flush()
        
        # Adicionar serviços aos agendamentos
        agendamento_servico1 = AgendamentoServico(
            agendamento_id=agendamento1.id,
            servico_id=servico.id
        )
        
        agendamento_servico2 = AgendamentoServico(
            agendamento_id=agendamento2.id,
            servico_id=servico.id
        )
        
        db.session.add(agendamento_servico1)
        db.session.add(agendamento_servico2)
        
        db.session.commit()
        
        print(f"Agendamentos de teste criados com sucesso! IDs: {agendamento1.id}, {agendamento2.id}")
        print(f"Data do agendamento 1: {agendamento1.data_hora_inicio}")
        print(f"Data do agendamento 2: {agendamento2.data_hora_inicio}")

if __name__ == "__main__":
    seed_test_data() 