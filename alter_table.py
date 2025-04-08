import sqlite3
from app import create_app, db
from sqlalchemy import text

def recreate_vendas_table():
    app = create_app()
    with app.app_context():
        try:
            # Verificar se a tabela vendas existe e criar uma tabela temporária com os dados existentes
            db.session.execute(text("""
            CREATE TABLE IF NOT EXISTS vendas_backup AS SELECT * FROM vendas;
            """))
            
            # Remover a tabela vendas existente
            db.session.execute(text("DROP TABLE IF EXISTS vendas;"))
            
            # Criar a tabela vendas com todas as colunas necessárias
            db.session.execute(text("""
            CREATE TABLE vendas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cliente_id INTEGER REFERENCES clientes(id),
                barbeiro_id INTEGER REFERENCES barbeiros(id),
                data_hora DATETIME NOT NULL,
                valor_total FLOAT NOT NULL DEFAULT 0.0,
                valor_desconto FLOAT NOT NULL DEFAULT 0.0,
                percentual_imposto FLOAT NOT NULL DEFAULT 0.0,
                valor_imposto FLOAT NOT NULL DEFAULT 0.0,
                observacao VARCHAR(255),
                status VARCHAR(20) NOT NULL DEFAULT 'finalizada',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            """))
            
            # Tentar copiar os dados de volta (se existirem e se forem compatíveis)
            try:
                db.session.execute(text("""
                INSERT INTO vendas (id, cliente_id, data_hora, valor_total, status, created_at, updated_at)
                SELECT id, cliente_id, data_hora, valor_total, status, created_at, updated_at 
                FROM vendas_backup;
                """))
                print("Dados da tabela vendas restaurados com sucesso")
            except Exception as e:
                print(f"Não foi possível restaurar os dados da tabela vendas: {str(e)}")
            
            # Commit das alterações
            db.session.commit()
            print("Tabela vendas recriada com sucesso com todas as colunas necessárias")
            
        except Exception as e:
            print(f"Erro ao recriar tabela vendas: {str(e)}")
            db.session.rollback()

def adicionar_coluna_venda_itens():
    app = create_app()
    with app.app_context():
        try:
            # Verificar se a coluna já existe
            try:
                db.session.execute(text("SELECT percentual_desconto FROM venda_itens LIMIT 1"))
                print("Coluna 'percentual_desconto' já existe na tabela venda_itens")
                return
            except Exception:
                # A coluna não existe, vamos adicioná-la
                db.session.execute(text("""
                ALTER TABLE venda_itens ADD COLUMN percentual_desconto FLOAT DEFAULT 0.0 NOT NULL;
                """))
                db.session.commit()
                print("Coluna 'percentual_desconto' adicionada com sucesso à tabela venda_itens")
        except Exception as e:
            print(f"Erro ao adicionar coluna à tabela venda_itens: {str(e)}")
            db.session.rollback()

if __name__ == "__main__":
    recreate_vendas_table()
    adicionar_coluna_venda_itens() 