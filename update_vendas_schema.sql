-- Adicionar novos campos à tabela vendas
ALTER TABLE vendas ADD COLUMN valor_desconto FLOAT DEFAULT 0.0 NOT NULL;
ALTER TABLE vendas ADD COLUMN percentual_imposto FLOAT DEFAULT 0.0 NOT NULL;
ALTER TABLE vendas ADD COLUMN valor_imposto FLOAT DEFAULT 0.0 NOT NULL;
ALTER TABLE vendas ADD COLUMN observacao TEXT;

-- Adicionar novos campos à tabela venda_itens
ALTER TABLE venda_itens ADD COLUMN percentual_desconto FLOAT DEFAULT 0.0 NOT NULL; 