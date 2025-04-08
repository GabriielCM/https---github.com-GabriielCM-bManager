from app import create_app, db
from app.models.venda import Venda, VendaItem
from app.models.produto import Produto
from app.models.cliente import Cliente
from app.models.pagamento import Pagamento
from datetime import datetime

def testar_vendas():
    """Função para testar o funcionamento do módulo de vendas"""
    app = create_app()
    
    with app.app_context():
        print("=== TESTE DO SISTEMA DE VENDAS ===")
        
        # 1. Verificar produtos disponíveis
        produtos = Produto.query.filter(Produto.quantidade_estoque > 0).all()
        if not produtos:
            print("Erro: Não há produtos disponíveis para venda!")
            return
        
        print(f"Produtos disponíveis: {len(produtos)}")
        for i, produto in enumerate(produtos[:3], 1):  # Mostrar até 3 produtos
            print(f"  {i}. {produto.nome} - R$ {produto.preco:.2f} - Estoque: {produto.quantidade_estoque}")
        
        # 2. Verificar clientes
        clientes = Cliente.query.limit(3).all()
        if not clientes:
            print("Erro: Não há clientes cadastrados!")
            return
        
        print(f"\nClientes disponíveis: {len(clientes)}")
        for i, cliente in enumerate(clientes[:3], 1):  # Mostrar até 3 clientes
            print(f"  {i}. {cliente.nome} - {cliente.telefone}")
        
        # 3. Criar uma venda de teste
        print("\nCriando venda de teste...")
        
        # Selecionar primeiro produto e primeiro cliente
        produto_teste = produtos[0]
        cliente_teste = clientes[0]
        
        print(f"  Produto: {produto_teste.nome} (ID: {produto_teste.id})")
        print(f"  Cliente: {cliente_teste.nome} (ID: {cliente_teste.id})")
        
        # Criar venda
        venda = Venda(
            cliente_id=cliente_teste.id,
            data_hora=datetime.utcnow(),
            valor_total=0,  # Será calculado depois
            status='finalizada'
        )
        db.session.add(venda)
        db.session.flush()  # Obter ID sem commit
        
        # Adicionar item à venda
        quantidade = 1
        valor_unitario = produto_teste.preco
        
        item = VendaItem(
            venda_id=venda.id,
            produto_id=produto_teste.id,
            quantidade=quantidade,
            valor_unitario=valor_unitario
        )
        db.session.add(item)
        
        # Atualizar estoque
        estoque_anterior = produto_teste.quantidade_estoque
        try:
            produto_teste.atualizar_estoque(quantidade, 'saida')
            print(f"  Estoque atualizado: {estoque_anterior} -> {produto_teste.quantidade_estoque}")
        except ValueError as e:
            print(f"  Erro ao atualizar estoque: {e}")
            db.session.rollback()
            return
        
        # Calcular valor total
        venda.valor_total = quantidade * valor_unitario
        
        # Commit das alterações
        db.session.commit()
        print(f"  Venda #{venda.id} criada com sucesso! Valor: R$ {venda.valor_total:.2f}")
        
        # 4. Registrar pagamento
        print("\nRegistrando pagamento...")
        
        pagamento = Pagamento(
            venda_id=venda.id,
            valor=venda.valor_total,
            forma_pagamento='dinheiro',
            tipo='pagamento',
            status='confirmado'
        )
        db.session.add(pagamento)
        db.session.commit()
        
        print(f"  Pagamento registrado! Método: Dinheiro, Valor: R$ {pagamento.valor:.2f}")
        
        # 5. Buscar a venda para verificar
        venda_verificacao = Venda.query.get(venda.id)
        if venda_verificacao:
            print("\nVerificação da venda:")
            print(f"  ID: {venda_verificacao.id}")
            print(f"  Cliente: {venda_verificacao.cliente.nome if venda_verificacao.cliente else 'N/A'}")
            print(f"  Data: {venda_verificacao.data_hora}")
            print(f"  Valor: R$ {venda_verificacao.valor_total:.2f}")
            print(f"  Status: {venda_verificacao.status}")
            print(f"  Itens: {len(venda_verificacao.itens)}")
            print(f"  Pagamentos: {len(venda_verificacao.pagamentos)}")
            
            # Verificar itens
            for i, item in enumerate(venda_verificacao.itens, 1):
                prod = Produto.query.get(item.produto_id)
                print(f"    Item {i}: {prod.nome} - {item.quantidade} x R$ {item.valor_unitario:.2f} = R$ {(item.quantidade * item.valor_unitario):.2f}")
            
            # Verificar pagamentos
            for i, pag in enumerate(venda_verificacao.pagamentos, 1):
                print(f"    Pagamento {i}: {pag.forma_pagamento} - R$ {pag.valor:.2f} - Status: {pag.status}")
        else:
            print("\nErro: Venda não encontrada na verificação!")
        
        print("\n=== TESTE CONCLUÍDO COM SUCESSO ===")

if __name__ == "__main__":
    testar_vendas() 