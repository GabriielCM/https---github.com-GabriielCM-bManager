# Testes do B-Manager

Este documento descreve os testes implementados para o sistema B-Manager.

## Testes de Cliente

Implementamos testes para as operações CRUD de clientes, incluindo:

1. **Criação de Cliente**: Testa a criação de um novo cliente e verifica se os dados estão corretos.
2. **Verificação de Telefone Duplicado**: Testa se a API rejeita a criação de clientes com telefones duplicados.
3. **Atualização de Cliente**: Testa a atualização de um cliente existente.
4. **Exclusão de Cliente**: Testa a tentativa de exclusão de um cliente, que é rejeitada devido à existência de agendamentos associados.
5. **Exclusão de Cliente Inexistente**: Testa a tentativa de exclusão de um cliente que não existe.

## Testes de Agendamento

Implementamos testes para o sistema de agendamentos, incluindo:

1. **Verificação de Disponibilidade - Horário Livre**: Testa a verificação de disponibilidade quando o horário está livre.
2. **Verificação de Disponibilidade - Horário Ocupado**: Testa a verificação de disponibilidade quando o horário está ocupado.
3. **Consulta de Disponibilidade via API**: Testa a consulta de disponibilidade de barbeiros via API.
4. **Criação de Agendamento**: Testa a criação de um novo agendamento (atualmente retornando 422 na API).
5. **Criação de Agendamento com Conflito**: Testa a tentativa de criar um agendamento em horário já ocupado (atualmente retornando 422 na API).
6. **Atualização de Agendamento**: Testa a atualização de um agendamento existente (atualmente retornando 422 na API).
7. **Cancelamento de Agendamento**: Testa o cancelamento de um agendamento (atualmente retornando 422 na API).

## Adaptações Necessárias

Durante a criação dos testes, identificamos algumas questões que precisam de atenção:

1. **Erro 422 nas Rotas de Agendamento**: A API retorna 422 Unprocessable Entity para as operações de criar, atualizar e cancelar agendamentos. Isso pode ser devido a:
   - Problemas na estrutura de dados esperada
   - Problemas na autenticação JWT
   - Verificações de validação não satisfeitas

2. **Formato de Resposta Inconsistente**: A rota de consulta de disponibilidade retorna um formato diferente do esperado, contendo apenas 'disponivel' e 'mensagem', em vez de detalhes específicos de horários.

## Próximos Passos

Para melhorar a qualidade dos testes e da API, sugerimos:

1. Investigar e corrigir os problemas que estão causando o erro 422 nas rotas de agendamento.
2. Padronizar o formato de resposta das APIs para facilitar o consumo pelos clientes.
3. Implementar mocks para evitar dependências externas nos testes.
4. Adicionar testes para cenários de erro mais específicos.
5. Adicionar testes para outras funcionalidades do sistema (serviços, barbeiros, etc).

## Como Executar os Testes

Para executar todos os testes:

```
python -m unittest test_cliente.py test_agendamento.py
```

Para executar apenas os testes de cliente:

```
python -m unittest test_cliente.py
```

Para executar apenas os testes de agendamento:

```
python -m unittest test_agendamento.py 