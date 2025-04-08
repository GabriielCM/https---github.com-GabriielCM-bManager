from app import create_app, db
from app.models.venda import Venda
from app.models.produto import Produto

def cancelar_venda(venda_id):
    """Cancela uma venda e restaura o estoque dos produtos"""
    app = create_app()
    
    with app.app_context():
        print(f"=== CANCELANDO VENDA #{venda_id} ===")
        
        # Buscar a venda
        venda = Venda.query.get(venda_id)
        
        if not venda:
            print(f"Erro: Venda #{venda_id} não encontrada!")
            return
        
        print(f"Venda #{venda.id} encontrada")
        print(f"  Cliente: {venda.cliente.nome if venda.cliente else 'Cliente não identificado'}")
        print(f"  Data: {venda.data_hora}")
        print(f"  Valor: R$ {venda.valor_total:.2f}")
        print(f"  Status atual: {venda.status}")
        
        # Verificar se a venda já está cancelada
        if venda.status == 'cancelada':
            print("Erro: Esta venda já está cancelada!")
            return
        
        # Verificar se tem pagamentos
        if venda.pagamentos:
            print(f"Atenção: Esta venda possui {len(venda.pagamentos)} pagamento(s) registrado(s)!")
            print("Para cancelar, é necessário estornar os pagamentos primeiro.")
            
            confirmacao = input("Deseja continuar mesmo assim? (s/n): ")
            if confirmacao.lower() != 's':
                print("Operação cancelada pelo usuário.")
                return
        
        # Restaurar estoque dos produtos
        print("\nRestaurando estoque dos produtos:")
        for item in venda.itens:
            produto = Produto.query.get(item.produto_id)
            if produto:
                estoque_anterior = produto.quantidade_estoque
                produto.atualizar_estoque(item.quantidade, 'entrada')
                print(f"  {produto.nome}: {estoque_anterior} -> {produto.quantidade_estoque} (+{item.quantidade})")
            else:
                print(f"  Produto ID {item.produto_id} não encontrado!")
        
        # Atualizar status da venda
        venda.status = 'cancelada'
        
        # Salvar alterações
        db.session.commit()
        
        print(f"\nVenda #{venda.id} cancelada com sucesso!")
        print("=== OPERAÇÃO CONCLUÍDA ===")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) != 2:
        print("Uso: python cancelar_venda.py <id_da_venda>")
        sys.exit(1)
    
    try:
        venda_id = int(sys.argv[1])
    except ValueError:
        print("Erro: O ID da venda deve ser um número inteiro.")
        sys.exit(1)
    
    cancelar_venda(venda_id) 