from app import create_app
from app.models.venda import Venda

def check_vendas():
    app = create_app()
    
    with app.app_context():
        vendas = Venda.query.all()
        
        print(f"Total de vendas: {len(vendas)}")
        
        for venda in vendas:
            print(f"Venda #{venda.id}: Status: {venda.status}")
            print(f"  Cliente: {venda.cliente.nome if venda.cliente else 'N/A'}")
            print(f"  Valor: R$ {venda.valor_total:.2f}")
            print(f"  Pagamentos: {len(venda.pagamentos)}")
            print("")

if __name__ == "__main__":
    check_vendas() 