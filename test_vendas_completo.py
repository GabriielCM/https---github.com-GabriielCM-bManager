import unittest
from app import create_app, db
from app.models.venda import Venda, VendaItem
from app.models.produto import Produto
from app.models.cliente import Cliente
from app.models.pagamento import Pagamento
from app.models.usuario import Usuario
from datetime import datetime, timedelta
import json
from flask_jwt_extended import create_access_token

class TestVendasConfig:
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = 'test-secret-key'
    JWT_SECRET_KEY = 'test-jwt-secret-key'

class TestVendas(unittest.TestCase):
    def setUp(self):
        # Configurar aplicação para testes
        self.app = create_app(TestVendasConfig)
        self.app_context = self.app.app_context()
        self.app_context.push()
        self.client = self.app.test_client()
        
        # Criar as tabelas no banco de dados
        db.create_all()
        
        # Criar dados de teste
        self.criar_dados_teste()
        
        # Criar token JWT para autenticação
        self.token = self.criar_token_jwt()

    def tearDown(self):
        # Limpar banco de dados
        db.session.remove()
        db.drop_all()
        
        # Remover contexto da aplicação
        self.app_context.pop()

    def criar_dados_teste(self):
        # Criar usuário de teste
        usuario = Usuario(
            nome='Administrador de Teste',
            email='admin@teste.com',
            perfil='admin',
            ativo=True
        )
        usuario.senha = 'senha123'
        db.session.add(usuario)
        
        # Criar cliente de teste
        cliente = Cliente(
            nome='Cliente de Teste',
            telefone='(11) 98765-4321',
            email='cliente@teste.com'
        )
        db.session.add(cliente)
        
        # Criar produtos de teste
        produtos = [
            Produto(
                nome='Produto Teste 1',
                descricao='Descrição do produto 1',
                preco=19.90,
                quantidade_estoque=50,
                codigo='123456789',
                categoria='Produtos'
            ),
            Produto(
                nome='Produto Teste 2',
                descricao='Descrição do produto 2',
                preco=29.90,
                quantidade_estoque=30,
                codigo='987654321',
                categoria='Produtos'
            ),
            Produto(
                nome='Produto Teste 3',
                descricao='Descrição do produto 3',
                preco=39.90,
                quantidade_estoque=20,
                codigo='456789123',
                categoria='Produtos'
            )
        ]
        
        for produto in produtos:
            db.session.add(produto)
        
        # Commit para salvar dados e obter IDs
        db.session.commit()
        
        # Armazenar os objetos para uso nos testes
        self.usuario = usuario
        self.cliente = cliente
        self.produtos = Produto.query.all()

    def criar_token_jwt(self):
        with self.app.app_context():
            # Criar token JWT para o usuário de teste
            token = create_access_token(
                identity=self.usuario.id,
                additional_claims={
                    'perfil': self.usuario.perfil,
                    'nome': self.usuario.nome,
                    'email': self.usuario.email
                }
            )
            return token

    def test_01_listar_vendas_vazio(self):
        """Verifica se a listagem de vendas retorna uma lista vazia quando não há vendas"""
        response = self.client.get(
            '/api/vendas/',
            headers={'Authorization': f'Bearer {self.token}'}
        )
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['total'], 0)
        self.assertEqual(len(data['items']), 0)

    def test_02_criar_venda(self):
        """Testa a criação de uma venda com um item"""
        dados_venda = {
            'cliente_id': self.cliente.id,
            'itens': [
                {
                    'produto_id': self.produtos[0].id,
                    'quantidade': 2,
                    'valor_unitario': self.produtos[0].preco
                }
            ]
        }
        
        response = self.client.post(
            '/api/vendas/',
            headers={
                'Authorization': f'Bearer {self.token}',
                'Content-Type': 'application/json'
            },
            data=json.dumps(dados_venda)
        )
        
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.data)
        self.assertIn('venda', data)
        self.assertEqual(data['venda']['cliente_id'], self.cliente.id)
        self.assertEqual(data['venda']['valor_total'], 2 * self.produtos[0].preco)
        self.assertEqual(len(data['venda']['itens']), 1)
        
        # Verificar atualização do estoque
        produto = Produto.query.get(self.produtos[0].id)
        self.assertEqual(produto.quantidade_estoque, 48)  # 50 - 2
        
        # Armazenar ID da venda para testes posteriores
        self.venda_id = data['venda']['id']

    def test_03_obter_venda(self):
        """Testa a obtenção dos detalhes de uma venda específica"""
        # Primeiro criar uma venda
        self.test_02_criar_venda()
        
        # Agora buscar a venda criada
        response = self.client.get(
            f'/api/vendas/{self.venda_id}',
            headers={'Authorization': f'Bearer {self.token}'}
        )
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['id'], self.venda_id)
        self.assertEqual(data['cliente_id'], self.cliente.id)
        self.assertEqual(len(data['itens']), 1)
        self.assertEqual(data['itens'][0]['produto_id'], self.produtos[0].id)
        self.assertEqual(data['itens'][0]['quantidade'], 2)

    def test_04_registrar_pagamento(self):
        """Testa o registro de um pagamento para uma venda"""
        # Primeiro criar uma venda
        self.test_02_criar_venda()
        
        # Registrar pagamento
        dados_pagamento = {
            'valor': self.produtos[0].preco * 2,  # Valor total da venda
            'metodo': 'dinheiro'
        }
        
        response = self.client.post(
            f'/api/vendas/{self.venda_id}/pagamento',
            headers={
                'Authorization': f'Bearer {self.token}',
                'Content-Type': 'application/json'
            },
            data=json.dumps(dados_pagamento)
        )
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('pagamento', data)
        self.assertEqual(data['pagamento']['venda_id'], self.venda_id)
        self.assertEqual(data['pagamento']['valor'], self.produtos[0].preco * 2)
        self.assertEqual(data['pagamento']['forma_pagamento'], 'dinheiro')
        self.assertEqual(data['valor_restante'], 0)

    def test_05_venda_multiplos_itens(self):
        """Testa a criação de uma venda com múltiplos itens"""
        dados_venda = {
            'cliente_id': self.cliente.id,
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
                'Authorization': f'Bearer {self.token}',
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
        
        # Verificar atualização do estoque
        produto1 = Produto.query.get(self.produtos[0].id)
        produto2 = Produto.query.get(self.produtos[1].id)
        
        # Cuidado com o estoque já reduzido de testes anteriores
        # Se o teste_02_criar_venda já foi executado, o produto1 teve redução de 2 unidades
        if hasattr(self, 'venda_id'):  # Verifica se test_02 foi executado
            self.assertEqual(produto1.quantidade_estoque, 47)  # 50 - 2 - 1
        else:
            self.assertEqual(produto1.quantidade_estoque, 49)  # 50 - 1
            
        self.assertEqual(produto2.quantidade_estoque, 28)  # 30 - 2

    def test_06_validacoes_venda(self):
        """Testa as validações na criação de uma venda"""
        # 1. Produto inexistente
        dados_venda = {
            'cliente_id': self.cliente.id,
            'itens': [
                {
                    'produto_id': 9999,  # ID inexistente
                    'quantidade': 1,
                    'valor_unitario': 10.0
                }
            ]
        }
        
        response = self.client.post(
            '/api/vendas/',
            headers={
                'Authorization': f'Bearer {self.token}',
                'Content-Type': 'application/json'
            },
            data=json.dumps(dados_venda)
        )
        
        self.assertEqual(response.status_code, 404)
        self.assertIn('erro', json.loads(response.data))
        
        # 2. Quantidade insuficiente
        dados_venda = {
            'cliente_id': self.cliente.id,
            'itens': [
                {
                    'produto_id': self.produtos[0].id,
                    'quantidade': 100,  # Quantidade maior que estoque
                    'valor_unitario': self.produtos[0].preco
                }
            ]
        }
        
        response = self.client.post(
            '/api/vendas/',
            headers={
                'Authorization': f'Bearer {self.token}',
                'Content-Type': 'application/json'
            },
            data=json.dumps(dados_venda)
        )
        
        self.assertEqual(response.status_code, 400)
        self.assertIn('erro', json.loads(response.data))
        
        # 3. Dados incompletos
        dados_venda = {
            'cliente_id': self.cliente.id,
            'itens': []  # Lista vazia de itens
        }
        
        response = self.client.post(
            '/api/vendas/',
            headers={
                'Authorization': f'Bearer {self.token}',
                'Content-Type': 'application/json'
            },
            data=json.dumps(dados_venda)
        )
        
        self.assertEqual(response.status_code, 400)
        self.assertIn('erro', json.loads(response.data))

    def test_07_cancelar_venda(self):
        """Testa o cancelamento de uma venda"""
        # Primeiro criar uma venda
        self.test_02_criar_venda()
        
        # Armazenar estoque atual
        produto = Produto.query.get(self.produtos[0].id)
        estoque_antes = produto.quantidade_estoque
        
        # Cancelar a venda
        response = self.client.delete(
            f'/api/vendas/{self.venda_id}',
            headers={'Authorization': f'Bearer {self.token}'}
        )
        
        self.assertEqual(response.status_code, 200)
        self.assertIn('mensagem', json.loads(response.data))
        
        # Verificar se a venda foi marcada como cancelada
        venda = Venda.query.get(self.venda_id)
        self.assertEqual(venda.status, 'cancelada')
        
        # Verificar se o estoque foi restaurado
        produto = Produto.query.get(self.produtos[0].id)
        self.assertEqual(produto.quantidade_estoque, estoque_antes + 2)
        
    def test_08_relatorio_diario(self):
        """Testa a geração do relatório diário de vendas"""
        # Criar algumas vendas
        self.test_02_criar_venda()
        self.test_05_venda_multiplos_itens()
        
        # Realizar um pagamento
        self.test_04_registrar_pagamento()
        
        # Obter relatório diário
        response = self.client.get(
            '/api/vendas/relatorio/diario',
            headers={'Authorization': f'Bearer {self.token}'}
        )
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        
        # Deve haver pelo menos 2 vendas e valores condizentes
        self.assertGreaterEqual(data['total_vendas'], 2)
        self.assertGreater(data['valor_total'], 0)
        self.assertIn('metodos_pagamento', data)
        self.assertIn('produtos_mais_vendidos', data)
        
    def test_09_relatorio_grafico(self):
        """Testa a geração de dados para o gráfico de vendas"""
        # Criar algumas vendas
        self.test_02_criar_venda()
        self.test_05_venda_multiplos_itens()
        
        # Obter dados para gráfico
        response = self.client.get(
            '/api/vendas/relatorio/grafico?periodo=30',
            headers={'Authorization': f'Bearer {self.token}'}
        )
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        
        # Verificar estrutura dos dados
        self.assertIn('labels', data)
        self.assertIn('valores', data)
        self.assertEqual(len(data['labels']), len(data['valores']))
        
    def test_10_relatorio_pagamentos(self):
        """Testa a geração do relatório de métodos de pagamento"""
        # Criar venda e registrar pagamento
        self.test_04_registrar_pagamento()
        
        # Obter relatório de pagamentos
        response = self.client.get(
            '/api/vendas/relatorio/pagamentos',
            headers={'Authorization': f'Bearer {self.token}'}
        )
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        
        # Verificar dados
        self.assertIn('valores', data)
        self.assertIn('percentuais', data)
        self.assertIn('dinheiro', data['valores'])
        self.assertTrue(data['valores']['dinheiro'] > 0)
        self.assertEqual(data['percentuais']['dinheiro'], 100)  # 100% em dinheiro

if __name__ == '__main__':
    unittest.main() 