from app import create_app, db
from app.models.usuario import Usuario
from app.models.cliente import Cliente
from app.models.barbeiro import Barbeiro
from app.models.servico import Servico
from app.models.produto import Produto
from app.models.configuracao import Configuracao
from app.models.movimento_estoque import MovimentoEstoque

app = create_app()

def seed_database():
    """Preenche o banco de dados com dados iniciais de exemplo"""
    with app.app_context():
        print("Iniciando criação de dados iniciais...")
        
        # Limpar tabelas existentes
        db.session.query(MovimentoEstoque).delete()
        db.session.query(Barbeiro).delete()
        db.session.query(Usuario).delete()
        db.session.query(Cliente).delete()
        db.session.query(Servico).delete()
        db.session.query(Produto).delete()
        db.session.query(Configuracao).delete()
        db.session.commit()
        
        print("Tabelas limpas com sucesso!")
        
        # Criar usuário admin
        admin = Usuario(
            nome="Administrador",
            email="admin@bmanager.com",
            perfil="admin",
            telefone="(11) 99999-9999",
            ativo=True
        )
        admin.senha = "admin123"
        db.session.add(admin)
        
        # Criar usuários barbeiros
        barbeiro1 = Usuario(
            nome="João Silva",
            email="joao@bmanager.com",
            perfil="barbeiro",
            telefone="(11) 98888-8888",
            ativo=True
        )
        barbeiro1.senha = "senha123"
        db.session.add(barbeiro1)
        
        barbeiro2 = Usuario(
            nome="Carlos Oliveira",
            email="carlos@bmanager.com",
            perfil="barbeiro",
            telefone="(11) 97777-7777",
            ativo=True
        )
        barbeiro2.senha = "senha123"
        db.session.add(barbeiro2)
        
        # Commit para obter IDs dos usuários
        db.session.commit()
        
        # Criar barbeiros
        barbeiro_joao = Barbeiro(
            usuario_id=barbeiro1.id,
            especialidades="Corte clássico,Barba,Degradê",
            comissao_percentual=50.0,
            disponivel=True
        )
        db.session.add(barbeiro_joao)
        
        barbeiro_carlos = Barbeiro(
            usuario_id=barbeiro2.id,
            especialidades="Degradê,Coloração,Design de sobrancelhas",
            comissao_percentual=50.0,
            disponivel=True
        )
        db.session.add(barbeiro_carlos)
        
        # Criar clientes
        cliente1 = Cliente(
            nome="Pedro Souza",
            telefone="(11) 96666-6666",
            email="pedro@email.com"
        )
        db.session.add(cliente1)
        
        cliente2 = Cliente(
            nome="Lucas Pereira",
            telefone="(11) 95555-5555",
            email="lucas@email.com"
        )
        db.session.add(cliente2)
        
        cliente3 = Cliente(
            nome="Gabriel Santos",
            telefone="(11) 94444-4444",
            email="gabriel@email.com"
        )
        db.session.add(cliente3)
        
        # Criar serviços
        servico1 = Servico(
            nome="Corte Masculino",
            descricao="Corte de cabelo masculino padrão",
            preco=40.00,
            duracao_estimada_min=30
        )
        db.session.add(servico1)
        
        servico2 = Servico(
            nome="Barba Completa",
            descricao="Serviço completo de barba com toalha quente",
            preco=35.00,
            duracao_estimada_min=30
        )
        db.session.add(servico2)
        
        servico3 = Servico(
            nome="Corte + Barba",
            descricao="Combo de corte masculino e barba completa",
            preco=65.00,
            duracao_estimada_min=60
        )
        db.session.add(servico3)
        
        servico4 = Servico(
            nome="Degradê",
            descricao="Corte com técnica de degradê",
            preco=50.00,
            duracao_estimada_min=40
        )
        db.session.add(servico4)
        
        # Criar produtos
        produto1 = Produto(
            nome="Pomada Modeladora",
            descricao="Pomada para cabelo com fixação forte",
            preco=35.00,
            quantidade_estoque=20
        )
        db.session.add(produto1)
        
        produto2 = Produto(
            nome="Óleo para Barba",
            descricao="Óleo hidratante para barba",
            preco=45.00,
            quantidade_estoque=15
        )
        db.session.add(produto2)
        
        produto3 = Produto(
            nome="Shampoo Anticaspa",
            descricao="Shampoo especial para controle de caspa",
            preco=30.00,
            quantidade_estoque=10
        )
        db.session.add(produto3)
        
        # Commit para obter IDs dos produtos
        db.session.commit()
        
        # Registrar movimentos de estoque iniciais
        movimento1 = MovimentoEstoque(
            produto_id=produto1.id,
            tipo="entrada",
            quantidade=20,
            motivo="Estoque inicial"
        )
        db.session.add(movimento1)
        
        movimento2 = MovimentoEstoque(
            produto_id=produto2.id,
            tipo="entrada",
            quantidade=15,
            motivo="Estoque inicial"
        )
        db.session.add(movimento2)
        
        movimento3 = MovimentoEstoque(
            produto_id=produto3.id,
            tipo="entrada",
            quantidade=10,
            motivo="Estoque inicial"
        )
        db.session.add(movimento3)
        
        # Adicionar configurações
        config1 = Configuracao(
            chave="horario_inicio",
            valor="08:00",
            descricao="Horário de início de funcionamento"
        )
        db.session.add(config1)
        
        config2 = Configuracao(
            chave="horario_fim",
            valor="18:00",
            descricao="Horário de fim de funcionamento"
        )
        db.session.add(config2)
        
        config3 = Configuracao(
            chave="intervalo_agendamento",
            valor="30",
            descricao="Intervalo de agendamento em minutos"
        )
        db.session.add(config3)
        
        # Commit final
        db.session.commit()
        
        print("Dados iniciais criados com sucesso!")
        print("Usuário admin criado: admin@bmanager.com / admin123")

if __name__ == "__main__":
    seed_database() 