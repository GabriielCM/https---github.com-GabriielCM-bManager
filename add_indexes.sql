-- Adicionar índices para a tabela agendamentos
CREATE INDEX IF NOT EXISTS ix_agendamentos_cliente_id ON agendamentos (cliente_id);
CREATE INDEX IF NOT EXISTS ix_agendamentos_barbeiro_id ON agendamentos (barbeiro_id);
CREATE INDEX IF NOT EXISTS ix_agendamentos_status ON agendamentos (status);

-- Adicionar índices para a tabela agendamento_servicos
CREATE INDEX IF NOT EXISTS ix_agendamento_servicos_agendamento_id ON agendamento_servicos (agendamento_id);
CREATE INDEX IF NOT EXISTS ix_agendamento_servicos_servico_id ON agendamento_servicos (servico_id);

-- Adicionar índices para a tabela barbeiros
CREATE INDEX IF NOT EXISTS ix_barbeiros_usuario_id ON barbeiros (usuario_id);

-- Adicionar índices para a tabela clientes
CREATE INDEX IF NOT EXISTS ix_clientes_nome ON clientes (nome); 