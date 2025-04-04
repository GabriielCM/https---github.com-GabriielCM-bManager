from app import create_app, db
from sqlalchemy.sql import text

def apply_indexes():
    """Aplica índices e validações ao banco de dados"""
    app = create_app()
    
    with app.app_context():
        # Adicionar índices para agendamentos
        db.session.execute(text("CREATE INDEX IF NOT EXISTS ix_agendamentos_cliente_id ON agendamentos (cliente_id)"))
        db.session.execute(text("CREATE INDEX IF NOT EXISTS ix_agendamentos_barbeiro_id ON agendamentos (barbeiro_id)"))
        db.session.execute(text("CREATE INDEX IF NOT EXISTS ix_agendamentos_status ON agendamentos (status)"))
        
        # Adicionar índices para agendamento_servicos
        db.session.execute(text("CREATE INDEX IF NOT EXISTS ix_agendamento_servicos_agendamento_id ON agendamento_servicos (agendamento_id)"))
        db.session.execute(text("CREATE INDEX IF NOT EXISTS ix_agendamento_servicos_servico_id ON agendamento_servicos (servico_id)"))
        
        # Adicionar índices para barbeiros
        db.session.execute(text("CREATE INDEX IF NOT EXISTS ix_barbeiros_usuario_id ON barbeiros (usuario_id)"))
        
        # Adicionar índices para clientes
        db.session.execute(text("CREATE INDEX IF NOT EXISTS ix_clientes_nome ON clientes (nome)"))
        
        # Commit das alterações
        db.session.commit()
        
        print("Índices adicionados com sucesso!")

if __name__ == "__main__":
    apply_indexes() 