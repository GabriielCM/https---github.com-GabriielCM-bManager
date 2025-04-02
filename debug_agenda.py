from app import create_app
from app.models.agendamento import Agendamento
import requests
import json
import datetime

def debug_api():
    """Script para diagnosticar problemas na API de agendamentos"""
    app = create_app()
    
    with app.app_context():
        # Verificar agendamentos no banco
        agendamentos = Agendamento.query.all()
        print(f"Total de agendamentos no banco: {len(agendamentos)}")
        
        for a in agendamentos:
            print(f"ID: {a.id}, Cliente: {a.cliente_id}, Data: {a.data_hora_inicio}, Status: {a.status}")
        
        # Testa o endpoint de agendamentos por data
        print("\n--- Testando API de agendamentos ---")
        
        hoje = datetime.datetime.now().strftime("%Y-%m-%d")
        url = f"http://localhost:5000/api/agendamentos/data/{hoje}"
        
        try:
            print(f"Fazendo requisição para: {url}")
            response = requests.get(url)
            
            print(f"Status da resposta: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                
                print(f"Dados recebidos: {json.dumps(data, indent=2)}")
                print(f"Quantidade de agendamentos retornados: {len(data)}")
                
                # Verificar se os dados estão completos
                if data and len(data) > 0:
                    sample = data[0]
                    print("\nVerificando estrutura de dados do primeiro agendamento:")
                    campos_esperados = ['id', 'cliente_id', 'cliente_nome', 'barbeiro_id', 
                                        'barbeiro_nome', 'data_hora_inicio', 'data_hora_fim',
                                        'status', 'servicos']
                    
                    for campo in campos_esperados:
                        valor = sample.get(campo, "NÃO ENCONTRADO")
                        print(f"  - {campo}: {valor}")
                    
                    # Verificar serviços
                    if 'servicos' in sample:
                        print(f"\nQuantidade de serviços no agendamento: {len(sample['servicos'])}")
                        if sample['servicos']:
                            print(f"Primeiro serviço: {sample['servicos'][0]}")
            else:
                print(f"Erro na resposta: {response.text}")
                
        except Exception as e:
            print(f"Erro ao acessar a API: {str(e)}")
        
        # Testar API de próximos agendamentos
        print("\n--- Testando API de próximos agendamentos ---")
        url = f"http://localhost:5000/api/agendamentos?data_inicio={hoje}&status=pendente&por_pagina=5"
        
        try:
            print(f"Fazendo requisição para: {url}")
            response = requests.get(url)
            
            print(f"Status da resposta: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                
                print(f"Dados recebidos: {json.dumps(data, indent=2)}")
                if 'items' in data:
                    print(f"Quantidade de agendamentos retornados: {len(data['items'])}")
            else:
                print(f"Erro na resposta: {response.text}")
                
        except Exception as e:
            print(f"Erro ao acessar a API: {str(e)}")
            
        # Testar o endpoint específico que parece estar falhando
        print("\n--- Testando acesso direto ao endpoint /api ---")
        try:
            response = requests.get("http://localhost:5000/api")
            print(f"Status da resposta: {response.status_code}")
            print(f"Resposta: {response.text}")
        except Exception as e:
            print(f"Erro ao acessar a API: {str(e)}")

if __name__ == "__main__":
    debug_api() 