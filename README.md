# B-Manager - Sistema de Gerenciamento para Barbearias

B-Manager é um sistema completo para gerenciamento de barbearias, desenvolvido em Python Flask e SQLite para o backend, e HTML, CSS e JavaScript para o frontend.

## Funcionalidades

- Gestão de Clientes
- Gestão de Barbeiros
- Agendamentos de Serviços
- Controle de Estoque
- Vendas de Produtos
- Pagamentos (múltiplos métodos)
- Planos de Fidelidade
- Relatórios e Estatísticas

## Requisitos do Sistema

- Python 3.8+
- Pip (gerenciador de pacotes Python)
- Navegador web moderno

## Instalação

1. Clone o repositório:
```
git clone https://github.com/seu-usuario/b-manager.git
cd b-manager
```

2. Crie um ambiente virtual Python:
```
python -m venv venv
```

3. Ative o ambiente virtual:
   - Windows:
   ```
   venv\Scripts\activate
   ```
   - Linux/macOS:
   ```
   source venv/bin/activate
   ```

4. Instale as dependências:
```
pip install -r requirements.txt
```

5. Configure as variáveis de ambiente (ou use as padrões do arquivo `.env`)

## Inicialização do Sistema

1. Inicie a aplicação:
```
python run.py
```

2. Acesse o sistema pelo navegador:
```
http://localhost:5000
```

3. (Opcional) Para popular o banco de dados com dados de exemplo:
```
python seed_db.py
```

## Credenciais de Exemplo (após executar seed_db.py)

- **Administrador**:
  - Email: admin@bmanager.com
  - Senha: admin123

- **Barbeiro**:
  - Email: joao@bmanager.com
  - Senha: senha123

## Estrutura do Projeto

```
b-manager/
├── app/                    # Aplicação principal
│   ├── api/                # Endpoints da API
│   ├── auth/               # Autenticação
│   ├── models/             # Modelos do banco de dados
│   ├── static/             # Arquivos estáticos (CSS, JS)
│   └── templates/          # Templates HTML
├── .env                    # Variáveis de ambiente
├── requirements.txt        # Dependências
├── run.py                  # Script para execução
└── seed_db.py              # Script para dados iniciais
```

## API Endpoints

O sistema fornece uma API completa para integração com outros sistemas:

- **Autenticação**: `/api/auth/`
- **Clientes**: `/api/clientes/`
- **Barbeiros**: `/api/barbeiros/`
- **Serviços**: `/api/servicos/`
- **Agendamentos**: `/api/agendamentos/`
- **Produtos**: `/api/produtos/`
- **Vendas**: `/api/vendas/`

Para mais detalhes sobre a API, consulte a documentação completa ou use o sistema pelo navegador.

## Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo LICENSE para detalhes.

## Contato

Para sugestões, bugs ou dúvidas, por favor abra uma Issue no GitHub.

---

Desenvolvido como parte do projeto B-Manager. 