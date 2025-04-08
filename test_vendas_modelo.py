import unittest
from datetime import datetime
from app import create_app, db
from app.models.venda import Venda, VendaItem
from app.models.produto import Produto
from app.models.cliente import Cliente
from app.models.pagamento import Pagamento

class TestConfig:
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    SQLALCHEMY_TRACK_MODIFICATIONS = False

class TestVendaModelo(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestConfig)
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()
        
        # Configurar dados para testes
        self.criar_dados_teste()
        
    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.app_context.pop()
        
    def criar_dados_teste(self):
        # Criar cliente
        cliente = Cliente(
            nome="Cliente Teste",
            telefone="(11) 98765-4321",
            email="cliente@teste.com"
        )
        db.session.add(cliente)
        
        # Criar produtos
        produtos = [
            Produto(
                nome="Produto 1",
                descricao="Descrição do produto 1",
                preco=10.50,
                quantidade_estoque=20,
                categoria="Produtos"
            ),
            Produto(
                nome="Produto 2",
                descricao="Descrição do produto 2",
                preco=15.75,
                quantidade_estoque=30,
                categoria="Produtos"
            )
        ]
        
        for produto in produtos:
            db.session.add(produto)
        
        db.session.commit()
        
        # Armazenar referências para uso nos testes
        self.cliente = cliente
        self.produtos = produtos
        
    def test_criar_venda(self):
        """Testa a criação de um objeto Venda"""
        venda = Venda(
            cliente_id=self.cliente.id,
            data_hora=datetime.utcnow(),
            status='finalizada'
        )
        db.session.add(venda)
        db.session.commit()
        
        # Verificar se a venda foi criada corretamente
        venda_db = Venda.query.get(venda.id)
        self.assertIsNotNone(venda_db)
        self.assertEqual(venda_db.cliente_id, self.cliente.id)
        self.assertEqual(venda_db.status, 'finalizada')
        self.assertEqual(venda_db.valor_total, 0.0)  # Valor inicial
        
    def test_adicionar_itens_venda(self):
        """Testa a adição de itens a uma venda"""
        # Criar venda
        venda = Venda(
            cliente_id=self.cliente.id,
            data_hora=datetime.utcnow(),
            status='finalizada'
        )
        db.session.add(venda)
        db.session.flush()
        
        # Adicionar itens
        item1 = VendaItem(
            venda_id=venda.id,
            produto_id=self.produtos[0].id,
            quantidade=2,
            valor_unitario=self.produtos[0].preco
        )
        
        item2 = VendaItem(
            venda_id=venda.id,
            produto_id=self.produtos[1].id,
            quantidade=1,
            valor_unitario=self.produtos[1].preco
        )
        
        db.session.add(item1)
        db.session.add(item2)
        
        # Calcular valor total
        venda.valor_total = (
            item1.quantidade * item1.valor_unitario + 
            item2.quantidade * item2.valor_unitario
        )
        
        db.session.commit()
        
        # Verificar itens e valor total
        venda_db = Venda.query.get(venda.id)
        self.assertEqual(len(venda_db.itens), 2)
        
        # Verificar cálculo do valor total
        valor_esperado = (2 * self.produtos[0].preco) + (1 * self.produtos[1].preco)
        self.assertEqual(venda_db.valor_total, valor_esperado)
        
    def test_atualizar_estoque(self):
        """Testa a atualização do estoque ao criar uma venda"""
        # Armazenar estoque inicial
        estoque_inicial_1 = self.produtos[0].quantidade_estoque
        estoque_inicial_2 = self.produtos[1].quantidade_estoque
        
        # Criar venda
        venda = Venda(
            cliente_id=self.cliente.id,
            data_hora=datetime.utcnow(),
            status='finalizada'
        )
        db.session.add(venda)
        db.session.flush()
        
        # Adicionar itens
        item1 = VendaItem(
            venda_id=venda.id,
            produto_id=self.produtos[0].id,
            quantidade=2,
            valor_unitario=self.produtos[0].preco
        )
        
        item2 = VendaItem(
            venda_id=venda.id,
            produto_id=self.produtos[1].id,
            quantidade=3,
            valor_unitario=self.produtos[1].preco
        )
        
        db.session.add(item1)
        db.session.add(item2)
        
        # Atualizar estoque
        self.produtos[0].atualizar_estoque(2, 'saida')
        self.produtos[1].atualizar_estoque(3, 'saida')
        
        db.session.commit()
        
        # Verificar estoque atualizado
        produto1 = Produto.query.get(self.produtos[0].id)
        produto2 = Produto.query.get(self.produtos[1].id)
        
        self.assertEqual(produto1.quantidade_estoque, estoque_inicial_1 - 2)
        self.assertEqual(produto2.quantidade_estoque, estoque_inicial_2 - 3)
        
    def test_calcular_total(self):
        """Testa o método calcular_total da classe Venda"""
        # Criar venda
        venda = Venda(
            cliente_id=self.cliente.id,
            data_hora=datetime.utcnow(),
            status='finalizada'
        )
        db.session.add(venda)
        db.session.flush()
        
        # Adicionar itens
        item1 = VendaItem(
            venda_id=venda.id,
            produto_id=self.produtos[0].id,
            quantidade=2,
            valor_unitario=self.produtos[0].preco
        )
        
        item2 = VendaItem(
            venda_id=venda.id,
            produto_id=self.produtos[1].id,
            quantidade=3,
            valor_unitario=self.produtos[1].preco
        )
        
        db.session.add(item1)
        db.session.add(item2)
        db.session.flush()
        
        # Chamar método calcular_total
        total = venda.calcular_total()
        
        # Verificar resultado
        valor_esperado = (2 * self.produtos[0].preco) + (3 * self.produtos[1].preco)
        self.assertEqual(total, valor_esperado)
        self.assertEqual(venda.valor_total, valor_esperado)
        
    def test_to_dict(self):
        """Testa o método to_dict da classe Venda"""
        # Criar venda
        venda = Venda(
            cliente_id=self.cliente.id,
            data_hora=datetime.utcnow(),
            status='finalizada'
        )
        db.session.add(venda)
        db.session.flush()
        
        # Adicionar um item
        item = VendaItem(
            venda_id=venda.id,
            produto_id=self.produtos[0].id,
            quantidade=2,
            valor_unitario=self.produtos[0].preco
        )
        db.session.add(item)
        
        # Atualizar valor total
        venda.valor_total = item.quantidade * item.valor_unitario
        
        db.session.commit()
        
        # Obter representação em dicionário
        venda_dict = venda.to_dict()
        
        # Verificar campos
        self.assertEqual(venda_dict['id'], venda.id)
        self.assertEqual(venda_dict['cliente_id'], self.cliente.id)
        self.assertEqual(venda_dict['cliente_nome'], self.cliente.nome)
        self.assertEqual(venda_dict['valor_total'], venda.valor_total)
        self.assertEqual(venda_dict['status'], 'finalizada')
        self.assertEqual(len(venda_dict['itens']), 1)
        
    def test_venda_item_to_dict(self):
        """Testa o método to_dict da classe VendaItem"""
        # Criar venda com item
        venda = Venda(
            cliente_id=self.cliente.id,
            data_hora=datetime.utcnow(),
            status='finalizada'
        )
        db.session.add(venda)
        db.session.flush()
        
        item = VendaItem(
            venda_id=venda.id,
            produto_id=self.produtos[0].id,
            quantidade=2,
            valor_unitario=self.produtos[0].preco
        )
        db.session.add(item)
        db.session.commit()
        
        # Obter representação em dicionário
        item_dict = item.to_dict()
        
        # Verificar campos
        self.assertEqual(item_dict['id'], item.id)
        self.assertEqual(item_dict['venda_id'], venda.id)
        self.assertEqual(item_dict['produto_id'], self.produtos[0].id)
        self.assertEqual(item_dict['produto_nome'], self.produtos[0].nome)
        self.assertEqual(item_dict['quantidade'], 2)
        self.assertEqual(item_dict['valor_unitario'], self.produtos[0].preco)
        self.assertEqual(item_dict['valor_total'], 2 * self.produtos[0].preco)
        
    def test_registrar_pagamento(self):
        """Testa o registro de pagamento para uma venda"""
        # Criar venda
        venda = Venda(
            cliente_id=self.cliente.id,
            data_hora=datetime.utcnow(),
            status='finalizada',
            valor_total=100.0
        )
        db.session.add(venda)
        db.session.flush()
        
        # Registrar pagamento
        pagamento = Pagamento(
            venda_id=venda.id,
            tipo='pagamento',
            valor=50.0,
            forma_pagamento='dinheiro',
            status='confirmado',
            descricao='Pagamento parcial'
        )
        db.session.add(pagamento)
        db.session.commit()
        
        # Verificar pagamento
        venda_db = Venda.query.get(venda.id)
        self.assertEqual(len(venda_db.pagamentos), 1)
        self.assertEqual(venda_db.pagamentos[0].valor, 50.0)
        
        # Registrar segundo pagamento
        pagamento2 = Pagamento(
            venda_id=venda.id,
            tipo='pagamento',
            valor=50.0,
            forma_pagamento='cartao_credito',
            status='confirmado',
            descricao='Pagamento final'
        )
        db.session.add(pagamento2)
        db.session.commit()
        
        # Verificar pagamentos
        venda_db = Venda.query.get(venda.id)
        self.assertEqual(len(venda_db.pagamentos), 2)
        
        # Calcular total pago
        total_pago = sum(p.valor for p in venda_db.pagamentos)
        self.assertEqual(total_pago, venda_db.valor_total)
        
    def test_cancelar_venda(self):
        """Testa o cancelamento de uma venda"""
        # Armazenar estoque inicial
        estoque_inicial = self.produtos[0].quantidade_estoque
        
        # Criar venda
        venda = Venda(
            cliente_id=self.cliente.id,
            data_hora=datetime.utcnow(),
            status='finalizada'
        )
        db.session.add(venda)
        db.session.flush()
        
        # Adicionar item
        item = VendaItem(
            venda_id=venda.id,
            produto_id=self.produtos[0].id,
            quantidade=2,
            valor_unitario=self.produtos[0].preco
        )
        db.session.add(item)
        
        # Atualizar estoque
        self.produtos[0].atualizar_estoque(2, 'saida')
        
        # Atualizar valor total
        venda.valor_total = item.quantidade * item.valor_unitario
        
        db.session.commit()
        
        # Verificar estoque após venda
        produto = Produto.query.get(self.produtos[0].id)
        self.assertEqual(produto.quantidade_estoque, estoque_inicial - 2)
        
        # Cancelar venda
        venda.status = 'cancelada'
        
        # Restaurar estoque
        produto.atualizar_estoque(2, 'entrada')
        
        db.session.commit()
        
        # Verificar status da venda
        venda_db = Venda.query.get(venda.id)
        self.assertEqual(venda_db.status, 'cancelada')
        
        # Verificar estoque restaurado
        produto = Produto.query.get(self.produtos[0].id)
        self.assertEqual(produto.quantidade_estoque, estoque_inicial)

if __name__ == '__main__':
    unittest.main() 