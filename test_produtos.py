"""
Script para testar a funcionalidade de produtos
"""
import os
import sys
import json
import random
from datetime import datetime, timedelta

# Adicionar o diretório raiz ao path para importar a aplicação Flask
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from app.models.produto import Produto
from app.models.movimento_estoque import MovimentoEstoque

app = create_app()

# Dados de exemplo para produtos
categorias = [
    "Shampoo", "Condicionador", "Óleo para Barba", "Creme de Barbear", 
    "Pomada", "Acessórios", "Pós-Barba", "Gel", "Máquina", "Lâmina"
]

marcas = [
    "BarberPro", "BeardMaster", "ManCare", "HairStyle", "GroomingGo", 
    "ClipperKing", "ShaveExpert", "StyleMaster", "BarberTech", "ProCut"
]

unidades = ["un", "ml", "g", "kit", "cx"]

def gerar_dados_aleatorios(quantidade=10):
    """Gera dados aleatórios para teste"""
    produtos = []
    
    for i in range(1, quantidade + 1):
        codigo = f"P{i:03d}"
        categoria = random.choice(categorias)
        marca = random.choice(marcas)
        unidade = random.choice(unidades)
        preco = round(random.uniform(10, 150), 2)
        preco_custo = round(preco * random.uniform(0.4, 0.7), 2)
        quantidade_estoque = random.randint(0, 50)
        estoque_minimo = random.randint(5, 15)
        
        produto = {
            "codigo": codigo,
            "nome": f"{marca} {categoria} {random.randint(1, 5)}",
            "descricao": f"Descrição do produto {codigo}. {categoria} de qualidade superior.",
            "categoria": categoria,
            "marca": marca,
            "unidade_medida": unidade,
            "preco": preco,
            "preco_custo": preco_custo,
            "quantidade_estoque": quantidade_estoque,
            "estoque_minimo": estoque_minimo
        }
        
        produtos.append(produto)
    
    return produtos

def criar_produtos_teste():
    """Cria produtos de teste no banco de dados"""
    with app.app_context():
        # Verificar se já existem produtos
        if Produto.query.count() > 0:
            print("Já existem produtos no banco de dados.")
            return
        
        # Gerar dados de teste
        produtos_dados = gerar_dados_aleatorios(20)
        
        # Criar produtos no banco de dados
        for dados in produtos_dados:
            produto = Produto(
                codigo=dados["codigo"],
                nome=dados["nome"],
                descricao=dados["descricao"],
                categoria=dados["categoria"],
                marca=dados["marca"],
                unidade_medida=dados["unidade_medida"],
                preco=dados["preco"],
                preco_custo=dados["preco_custo"],
                quantidade_estoque=dados["quantidade_estoque"],
                estoque_minimo=dados["estoque_minimo"]
            )
            
            db.session.add(produto)
            
            # Criar movimento de estoque inicial
            if produto.quantidade_estoque > 0:
                movimento = MovimentoEstoque(
                    produto_id=produto.id,
                    tipo="entrada",
                    quantidade=produto.quantidade_estoque,
                    motivo="Estoque inicial"
                )
                db.session.add(movimento)
        
        db.session.commit()
        print(f"Foram criados {len(produtos_dados)} produtos de teste.")
        
def listar_produtos():
    """Lista todos os produtos do banco de dados"""
    with app.app_context():
        produtos = Produto.query.all()
        
        if not produtos:
            print("Não há produtos cadastrados.")
            return
        
        print(f"\n{'ID':<5} {'Código':<8} {'Nome':<40} {'Categoria':<15} {'Estoque':<10} {'Preço':>8}")
        print("-" * 90)
        
        for p in produtos:
            codigo = p.codigo or '-'
            categoria = (p.categoria or '-')[:13]
            estoque = p.quantidade_estoque or 0
            nome = p.nome[:38] if p.nome else '-'
            
            print(f"{p.id:<5} {codigo:<8} {nome:<40} {categoria:<15} {estoque:<10} R$ {p.preco:>6.2f}")
            
        print("-" * 90)
        print(f"Total: {len(produtos)} produtos\n")

def testar_estoque_baixo():
    """Testa a funcionalidade de produtos com estoque baixo"""
    with app.app_context():
        produtos_baixo_estoque = Produto.query.filter(
            Produto.quantidade_estoque <= Produto.estoque_minimo
        ).all()
        
        print("\nProdutos com estoque baixo:")
        print(f"{'Nome':<40} {'Estoque':<10} {'Mínimo':<10} {'Status'}")
        print("-" * 70)
        
        for p in produtos_baixo_estoque:
            nome = p.nome[:38] if p.nome else '-'
            estoque = p.quantidade_estoque or 0
            minimo = p.estoque_minimo or 5
            status = "CRÍTICO" if estoque == 0 else "BAIXO"
            
            print(f"{nome:<40} {estoque:<10} {minimo:<10} {status}")
            
        print("-" * 70)
        print(f"Total: {len(produtos_baixo_estoque)} produtos com estoque baixo\n")

def testar_movimentacao_estoque():
    """Testa a funcionalidade de movimentação de estoque"""
    with app.app_context():
        # Selecionar um produto aleatório
        produto = Produto.query.order_by(db.func.random()).first()
        
        if not produto:
            print("Não há produtos para testar movimentação de estoque.")
            return
        
        print(f"\nTestando movimentação de estoque para o produto: {produto.nome}")
        print(f"Estoque atual: {produto.quantidade_estoque or 0}")
        
        # Simular entrada
        estoque_anterior = produto.quantidade_estoque or 0
        quantidade_entrada = random.randint(5, 20)
        produto.atualizar_estoque(quantidade_entrada, "entrada")
        
        movimento = MovimentoEstoque(
            produto_id=produto.id,
            tipo="entrada",
            quantidade=quantidade_entrada,
            motivo="Teste de entrada de estoque"
        )
        db.session.add(movimento)
        db.session.commit()
        
        print(f"Entrada de {quantidade_entrada} unidades registrada.")
        print(f"Estoque anterior: {estoque_anterior}")
        print(f"Estoque atual: {produto.quantidade_estoque}")
        
        # Simular saída
        estoque_anterior = produto.quantidade_estoque
        quantidade_saida = min(random.randint(1, 10), produto.quantidade_estoque)
        
        if quantidade_saida > 0:
            produto.atualizar_estoque(quantidade_saida, "saida")
            
            movimento = MovimentoEstoque(
                produto_id=produto.id,
                tipo="saida",
                quantidade=quantidade_saida,
                motivo="Teste de saída de estoque"
            )
            db.session.add(movimento)
            db.session.commit()
            
            print(f"Saída de {quantidade_saida} unidades registrada.")
            print(f"Estoque anterior: {estoque_anterior}")
            print(f"Estoque atual: {produto.quantidade_estoque}")
        else:
            print("Estoque insuficiente para registrar saída.")
        
        # Listar movimentos
        movimentos = MovimentoEstoque.query.filter_by(produto_id=produto.id).order_by(MovimentoEstoque.created_at.desc()).limit(5).all()
        
        print("\nÚltimos movimentos de estoque:")
        print(f"{'Data':<20} {'Tipo':<10} {'Quantidade':<10} {'Motivo'}")
        print("-" * 70)
        
        for m in movimentos:
            data = m.created_at.strftime("%d/%m/%Y %H:%M")
            print(f"{data:<20} {m.tipo:<10} {m.quantidade:<10} {m.motivo or '-'}")
            
        print("-" * 70)

if __name__ == "__main__":
    opcao = None
    
    if len(sys.argv) > 1:
        opcao = sys.argv[1]
    
    if opcao == "criar":
        criar_produtos_teste()
    elif opcao == "listar":
        listar_produtos()
    elif opcao == "estoque-baixo":
        testar_estoque_baixo()
    elif opcao == "movimentacao":
        testar_movimentacao_estoque()
    else:
        print("\nTestador de Funcionalidade de Produtos\n")
        print("Uso: python test_produtos.py [opção]")
        print("\nOpções disponíveis:")
        print("  criar           - Criar produtos de teste")
        print("  listar          - Listar todos os produtos")
        print("  estoque-baixo   - Testar produtos com estoque baixo")
        print("  movimentacao    - Testar movimentação de estoque")
        print("\nExemplo: python test_produtos.py criar\n") 