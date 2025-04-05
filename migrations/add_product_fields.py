"""
Script de migração para adicionar novos campos à tabela de produtos.
"""
import sys
import os

# Adicionar o diretório raiz ao path para importar a aplicação Flask
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from sqlalchemy import Column, String, Float, Integer, Text, inspect
from flask_sqlalchemy import SQLAlchemy

def run_migration():
    """Executa a migração para adicionar os novos campos à tabela de produtos."""
    app = create_app()
    
    with app.app_context():
        # Verificar se a tabela produtos existe
        inspector = db.inspect(db.engine)
        if 'produtos' not in inspector.get_table_names():
            print("Tabela 'produtos' não encontrada. Nada a fazer.")
            return False
        
        # Verificar quais colunas já existem
        colunas_existentes = [c['name'] for c in inspector.get_columns('produtos')]
        colunas_para_adicionar = []
        
        # Definir novos campos - sem restrições unique (SQLite não suporta)
        novos_campos = {
            'codigo': ('VARCHAR(20)', True),
            'categoria': ('VARCHAR(50)', False),
            'marca': ('VARCHAR(50)', False),
            'unidade_medida': ('VARCHAR(20) DEFAULT "un"', False),
            'preco_custo': ('FLOAT', False),
            'estoque_minimo': ('INTEGER DEFAULT 5', False),
            'imagem_url': ('VARCHAR(255)', False)
        }
        
        # Verificar quais campos precisam ser adicionados
        for nome_campo, info in novos_campos.items():
            if nome_campo not in colunas_existentes:
                colunas_para_adicionar.append((nome_campo, info[0], info[1]))
        
        if not colunas_para_adicionar:
            print("Todos os campos já existem. Nada a fazer.")
            return False
        
        # Adicionar cada coluna
        with db.engine.connect() as conn:
            for nome_campo, tipo_campo, is_unique in colunas_para_adicionar:
                # Criar comando SQL para adicionar a coluna
                sql = f"ALTER TABLE produtos ADD COLUMN {nome_campo} {tipo_campo}"
                
                # Executar o comando
                print(f"Adicionando campo '{nome_campo}' à tabela produtos...")
                try:
                    conn.execute(db.text(sql))
                    conn.commit()
                    print(f"Campo '{nome_campo}' adicionado com sucesso.")
                except Exception as e:
                    print(f"Erro ao adicionar campo '{nome_campo}': {e}")
                    
                # Se for para ser único, adicionar um índice único após criar a coluna
                if is_unique:
                    try:
                        sql_index = f"CREATE UNIQUE INDEX idx_produtos_{nome_campo} ON produtos({nome_campo}) WHERE {nome_campo} IS NOT NULL"
                        conn.execute(db.text(sql_index))
                        conn.commit()
                        print(f"Índice único criado para '{nome_campo}'.")
                    except Exception as e:
                        print(f"Erro ao criar índice único para '{nome_campo}': {e}")
        
        print("Migração concluída com sucesso!")
        return True

if __name__ == "__main__":
    run_migration() 