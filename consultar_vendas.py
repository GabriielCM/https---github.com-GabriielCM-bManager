from app import create_app, db
from app.models.venda import Venda
from app.models.produto import Produto

def consultar_vendas():
    """Consulta todas as vendas no banco de dados"""
    app = create_app()
    
    with app.app_context():
        print("=== CONSULTA DE VENDAS NO BANCO DE DADOS ===")
        
        # Consultar todas as vendas
        vendas = Venda.query.all()
        
        if not vendas:
            print("Nenhuma venda encontrada no banco de dados.")
            return
        
        print(f"Total de vendas: {len(vendas)}")
        print("\nDetalhes das vendas:")
        
        for venda in vendas:
            print(f"\nVenda #{venda.id}")
            print(f"  Data: {venda.data_hora}")
            print(f"  Cliente: {venda.cliente.nome if venda.cliente else 'Cliente não identificado'}")
            print(f"  Valor Total: R$ {venda.valor_total:.2f}")
            print(f"  Status: {venda.status}")
            
            # Itens da venda
            print(f"  Itens ({len(venda.itens)}):")
            for item in venda.itens:
                produto = Produto.query.get(item.produto_id)
                print(f"    - {produto.nome}: {item.quantidade} x R$ {item.valor_unitario:.2f} = R$ {(item.quantidade * item.valor_unitario):.2f}")
            
            # Pagamentos
            print(f"  Pagamentos ({len(venda.pagamentos)}):")
            total_pago = 0
            for pagamento in venda.pagamentos:
                print(f"    - {pagamento.forma_pagamento}: R$ {pagamento.valor:.2f} ({pagamento.status})")
                if pagamento.status == 'confirmado':
                    total_pago += pagamento.valor
            
            # Status de pagamento
            if total_pago >= venda.valor_total:
                status_pagamento = "PAGO"
            elif total_pago > 0:
                status_pagamento = "PARCIAL"
            else:
                status_pagamento = "PENDENTE"
            
            print(f"  Status de Pagamento: {status_pagamento} ({total_pago:.2f}/{venda.valor_total:.2f})")
        
        print("\n=== CONSULTA CONCLUÍDA ===")

if __name__ == "__main__":
    consultar_vendas() 