"""
Script para atualizar os produtos existentes com os novos campos.
"""
import os
import sys
import random

# Adicionar o diretório raiz ao path para importar a aplicação Flask
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from app.models.produto import Produto

app = create_app()

# Dados de exemplo
categorias = [
    "Shampoo", "Condicionador", "Óleo para Barba", "Creme de Barbear", 
    "Pomada", "Pós-Barba", "Gel"
]

marcas = [
    "BarberPro", "BeardMaster", "ManCare", "HairStyle", "GroomingGo"
]

# Mapeamento para os produtos existentes
atualizacoes = {
    "Pomada Modeladora": {
        "codigo": "P001",
        "categoria": "Pomada",
        "marca": "BarberPro",
        "unidade_medida": "un",
        "preco_custo": 15.50,
        "estoque_minimo": 5
    },
    "Óleo para Barba": {
        "codigo": "P002",
        "categoria": "Óleo para Barba",
        "marca": "BeardMaster",
        "unidade_medida": "ml",
        "preco_custo": 22.75,
        "estoque_minimo": 10
    },
    "Shampoo Anticaspa": {
        "codigo": "P003",
        "categoria": "Shampoo",
        "marca": "ManCare",
        "unidade_medida": "ml",
        "preco_custo": 12.90,
        "estoque_minimo": 8
    }
}

def atualizar_produtos():
    """Atualiza os produtos existentes com os novos campos."""
    with app.app_context():
        produtos = Produto.query.all()
        
        if not produtos:
            print("Não há produtos para atualizar.")
            return
        
        count = 0
        for produto in produtos:
            print(f"Atualizando produto: {produto.nome}")
            
            # Verificar se temos dados específicos para este produto
            if produto.nome in atualizacoes:
                dados = atualizacoes[produto.nome]
                produto.codigo = dados["codigo"]
                produto.categoria = dados["categoria"]
                produto.marca = dados["marca"]
                produto.unidade_medida = dados["unidade_medida"]
                produto.preco_custo = dados["preco_custo"]
                produto.estoque_minimo = dados["estoque_minimo"]
            else:
                # Gerar dados aleatórios para produtos não mapeados
                produto.codigo = f"P{produto.id:03d}"
                produto.categoria = random.choice(categorias)
                produto.marca = random.choice(marcas)
                produto.unidade_medida = "un"
                produto.preco_custo = round(produto.preco * 0.6, 2)  # 60% do preço de venda
                produto.estoque_minimo = 5
            
            count += 1
        
        db.session.commit()
        print(f"Foram atualizados {count} produtos com sucesso.")

if __name__ == "__main__":
    atualizar_produtos() 