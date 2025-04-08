import unittest
import json
from datetime import datetime, timedelta
from app import create_app, db
from app.models.usuario import Usuario
from app.models.cliente import Cliente
from app.models.produto import Produto
from app.models.venda import Venda, VendaItem
from app.models.pagamento import Pagamento
from flask_jwt_extended import create_access_token

class TestConfig:
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = 'test-secret-key'
    JWT_SECRET_KEY = 'test-jwt-secret-key'

class TestVendasAPI(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestConfig)
        self.client = self.app.test_client()
        self.app_context = self.app.app_context()
        self.app_context.push()
        
        # Criar banco de dados de teste
        db.create_all()
        
        # Configurar dados para testes
        self.setup_dados_teste()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    def setup_dados_teste(self):
        # Criar usuário administrador
        admin = Usuario(
            nome='Admin Teste',
            email='admin@teste.com',
            perfil='admin',
            ativo=True
        )
        admin.senha = 'senha123'
        db.session.add(admin)
        
        # Criar um usuário barbeiro
        barbeiro = Usuario(
            nome='Barbeiro Teste',
            email='barbeiro@teste.com',
            perfil='barbeiro',
            ativo=True
        )
        barbeiro.senha = 'senha123'
        db.session.add(barbeiro)
        
        # Criar cliente
        cliente = Cliente(
            nome='Cliente Teste',
            telefone='(11) 12345-6789',
            email='cliente@teste.com'
        )
        db.session.add(cliente)
        
        # Criar produtos
        produtos = [
            Produto(nome='Shampoo', descricao='Shampoo para cabelos', preco=25.90, quantidade_estoque=50, categoria='Produtos'),
            Produto(nome='Condicionador', descricao='Condicionador para cabelos', preco=22.90, quantidade_estoque=40, categoria='Produtos'),
            Produto(nome='Pomada', descricao='Pomada modeladora', preco=35.00, quantidade_estoque=30, categoria='Produtos')
        ]
        
        for produto in produtos:
            db.session.add(produto)
        
        db.session.commit()
        
        # Armazenar IDs para uso nos testes
        self.admin_id = admin.id
        self.barbeiro_id = barbeiro.id
        self.cliente_id = cliente.id
        self.produtos = produtos
        
        # Gerar tokens de autenticação
        with self.app.test_request_context():
            self.admin_token = create_access_token(
                identity=admin.id,
                additional_claims={'perfil': 'admin'}
            )
            
            self.barbeiro_token = create_access_token(
                identity=barbeiro.id,
                additional_claims={'perfil': 'barbeiro'}
            )

    def test_listar_vendas_sem_autenticacao(self):
        """Testa acesso sem autenticação à API de vendas"""
        response = self.client.get('/api/vendas/')
        self.assertEqual(response.status_code, 200)  # 200 OK porque DEV_MODE está ativado

    def test_listar_vendas_com_autenticacao(self):
        """Testa listagem de vendas com autenticação"""
        response = self.client.get(
            '/api/vendas/',
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('items', data)
        self.assertIn('total', data)

    def test_criar_venda_produto_unico(self):
        """Testa criação de uma venda com um único produto"""
        dados_venda = {
            'cliente_id': self.cliente_id,
            'itens': [
                {
                    'produto_id': self.produtos[0].id,
                    'quantidade': 1,
                    'valor_unitario': self.produtos[0].preco
                }
            ]
        }
        
        response = self.client.post(
            '/api/vendas/',
            headers={
                'Authorization': f'Bearer {self.admin_token}',
                'Content-Type': 'application/json'
            },
            data=json.dumps(dados_venda)
        )
        
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.data)
        self.assertIn('venda', data)
        self.assertEqual(data['venda']['cliente_id'], self.cliente_id)
        self.assertEqual(len(data['venda']['itens']), 1)
        
        # Armazenar ID da venda para testes posteriores
        self.venda_id = data['venda']['id']
        
        # Verificar atualização de estoque
        produto = Produto.query.get(self.produtos[0].id)
        self.assertEqual(produto.quantidade_estoque, 49)  # 50 - 1

    def test_criar_venda_multiplos_produtos(self):
        """Testa criação de uma venda com múltiplos produtos"""
        dados_venda = {
            'cliente_id': self.cliente_id,
            'itens': [
                {
                    'produto_id': self.produtos[0].id,
                    'quantidade': 1,
                    'valor_unitario': self.produtos[0].preco
                },
                {
                    'produto_id': self.produtos[1].id,
                    'quantidade': 2,
                    'valor_unitario': self.produtos[1].preco
                }
            ]
        }
        
        response = self.client.post(
            '/api/vendas/',
            headers={
                'Authorization': f'Bearer {self.barbeiro_token}',
                'Content-Type': 'application/json'
            },
            data=json.dumps(dados_venda)
        )
        
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.data)
        self.assertIn('venda', data)
        self.assertEqual(len(data['venda']['itens']), 2)
        
        # Verificar valor total
        valor_esperado = self.produtos[0].preco + (2 * self.produtos[1].preco)
        self.assertEqual(data['venda']['valor_total'], valor_esperado)

    def test_criar_venda_produto_sem_estoque(self):
        """Testa criação de venda com produto sem estoque suficiente"""
        dados_venda = {
            'cliente_id': self.cliente_id,
            'itens': [
                {
                    'produto_id': self.produtos[0].id,
                    'quantidade': 100,  # Maior que o estoque disponível
                    'valor_unitario': self.produtos[0].preco
                }
            ]
        }
        
        response = self.client.post(
            '/api/vendas/',
            headers={
                'Authorization': f'Bearer {self.admin_token}',
                'Content-Type': 'application/json'
            },
            data=json.dumps(dados_venda)
        )
        
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn('erro', data)
        self.assertIn('estoque insuficiente', data['erro'].lower())

    def test_obter_venda_detalhes(self):
        """Testa obtenção dos detalhes de uma venda específica"""
        # Primeiro criar uma venda
        self.test_criar_venda_produto_unico()
        
        # Obter detalhes da venda criada
        response = self.client.get(
            f'/api/vendas/{self.venda_id}',
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['id'], self.venda_id)
        self.assertEqual(data['cliente_id'], self.cliente_id)
        self.assertEqual(len(data['itens']), 1)

    def test_registrar_pagamento(self):
        """Testa o registro de pagamento para uma venda"""
        # Primeiro criar uma venda
        self.test_criar_venda_produto_unico()
        
        dados_pagamento = {
            'valor': self.produtos[0].preco,  # Valor total da venda
            'metodo': 'dinheiro'
        }
        
        response = self.client.post(
            f'/api/vendas/{self.venda_id}/pagamento',
            headers={
                'Authorization': f'Bearer {self.admin_token}',
                'Content-Type': 'application/json'
            },
            data=json.dumps(dados_pagamento)
        )
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('pagamento', data)
        self.assertEqual(data['pagamento']['valor'], self.produtos[0].preco)
        self.assertEqual(data['pagamento']['forma_pagamento'], 'dinheiro')
        self.assertEqual(data['valor_restante'], 0)

    def test_registrar_pagamento_parcial(self):
        """Testa o registro de pagamento parcial para uma venda"""
        # Primeiro criar uma venda com mais de um produto
        dados_venda = {
            'cliente_id': self.cliente_id,
            'itens': [
                {
                    'produto_id': self.produtos[0].id,
                    'quantidade': 1,
                    'valor_unitario': self.produtos[0].preco
                },
                {
                    'produto_id': self.produtos[1].id,
                    'quantidade': 1,
                    'valor_unitario': self.produtos[1].preco
                }
            ]
        }
        
        response = self.client.post(
            '/api/vendas/',
            headers={
                'Authorization': f'Bearer {self.admin_token}',
                'Content-Type': 'application/json'
            },
            data=json.dumps(dados_venda)
        )
        
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.data)
        venda_id = data['venda']['id']
        valor_total = data['venda']['valor_total']
        
        # Registrar pagamento parcial (metade do valor)
        dados_pagamento = {
            'valor': valor_total / 2,
            'metodo': 'cartao_credito'
        }
        
        response = self.client.post(
            f'/api/vendas/{venda_id}/pagamento',
            headers={
                'Authorization': f'Bearer {self.admin_token}',
                'Content-Type': 'application/json'
            },
            data=json.dumps(dados_pagamento)
        )
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['valor_restante'], valor_total / 2)

    def test_cancelar_venda(self):
        """Testa o cancelamento de uma venda"""
        # Primeiro criar uma venda
        self.test_criar_venda_produto_unico()
        
        estoque_anterior = Produto.query.get(self.produtos[0].id).quantidade_estoque
        
        # Cancelar a venda
        response = self.client.delete(
            f'/api/vendas/{self.venda_id}',
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('mensagem', data)
        
        # Verificar se o estoque foi restaurado
        estoque_atual = Produto.query.get(self.produtos[0].id).quantidade_estoque
        self.assertEqual(estoque_atual, estoque_anterior + 1)
        
        # Verificar se a venda foi cancelada
        venda = Venda.query.get(self.venda_id)
        self.assertEqual(venda.status, 'cancelada')

    def test_relatorio_diario(self):
        """Testa a geração de relatório diário de vendas"""
        # Criar algumas vendas
        self.test_criar_venda_produto_unico()
        self.test_criar_venda_multiplos_produtos()
        
        # Obter relatório
        response = self.client.get(
            '/api/vendas/relatorio/diario',
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('total_vendas', data)
        self.assertIn('valor_total', data)
        self.assertIn('metodos_pagamento', data)
        self.assertIn('produtos_mais_vendidos', data)

    def test_relatorio_resumo(self):
        """Testa a geração de resumo de vendas"""
        # Criar algumas vendas
        self.test_criar_venda_produto_unico()
        self.test_criar_venda_multiplos_produtos()
        
        # Obter resumo
        response = self.client.get(
            '/api/vendas/relatorio/resumo',
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('hoje', data)
        self.assertIn('semana', data)
        self.assertIn('mes', data)

    def test_exportar_vendas(self):
        """Testa a exportação de dados de vendas"""
        # Criar algumas vendas
        self.test_criar_venda_produto_unico()
        self.test_criar_venda_multiplos_produtos()
        
        # Exportar vendas
        response = self.client.get(
            '/api/vendas/exportar',
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('vendas', data)
        self.assertGreaterEqual(len(data['vendas']), 2)

if __name__ == '__main__':
    unittest.main() 