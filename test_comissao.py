from app import create_app
from flask import jsonify
import json
from datetime import datetime, date
import time

app = create_app()

def test_comissao_percentual():
    """Testa especificamente o campo comissao_percentual"""
    print("Testando validação do campo comissao_percentual...")
    
    # Testes com diferentes valores de comissão
    valores_teste = [
        ("Valor inteiro", 50),
        ("Valor float", 50.0),
        ("String numérica", "50"),
        ("String numérica com ponto", "50.0"),
        ("String não numérica", "ABC"),
        ("Valor None", None),
        ("Valor negativo", -10),
        ("Valor acima do limite", 101)
    ]
    
    # Criar um cliente de teste para a aplicação Flask
    with app.test_client() as client:
        # Primeiro, testar o endpoint de diagnóstico para ver como os dados são validados
        print("\n*** TESTE DO ENDPOINT DE DIAGNÓSTICO ***")
        for i, (descricao, valor) in enumerate(valores_teste):
            # Gerar email único para cada teste
            timestamp = int(time.time()) + i
            email = f"teste{timestamp}@example.com"
            
            # Dados base para o barbeiro com email único
            dados_teste = {
                "nome": f"Barbeiro Teste {i+1}",
                "email": email,
                "senha": "senha123456",
                "telefone": "11987654321",
                "especialidades": "Corte,Barba"
            }
            
            # Adicionar o valor de comissão ao teste
            if valor is not None:  # Se valor for None, não incluímos no JSON
                dados_teste["comissao_percentual"] = valor
            
            print(f"\n\n===== Testando com {descricao}: {valor} (tipo: {type(valor).__name__}) =====")
            print(f"Dados enviados: {json.dumps(dados_teste)}")
            
            # Testar o endpoint de diagnóstico para validação
            diag_response = client.post(
                '/api/barbeiros/diagnostico',
                json=dados_teste,
                headers={'Content-Type': 'application/json'}
            )
            
            print(f"Resposta diagnóstico (status {diag_response.status_code}):")
            try:
                diag_data = json.loads(diag_response.data)
                print(json.dumps(diag_data, indent=2))
            except json.JSONDecodeError as e:
                print(f"Erro ao decodificar JSON: {e}")
            
        # Agora, testar o endpoint de teste-criar que funciona
        print("\n\n*** TESTE DO ENDPOINT TESTE-CRIAR (FUNCIONAL) ***")
        for i, (descricao, valor) in enumerate(valores_teste):
            # Gerar email único para cada teste
            timestamp = int(time.time()) + 100 + i
            email = f"teste{timestamp}@example.com"
            
            # Dados base para o barbeiro com email único
            dados_teste = {
                "nome": f"Barbeiro Teste {i+1}",
                "email": email,
                "senha": "senha123456",
                "telefone": "11987654321",
                "especialidades": "Corte,Barba"
            }
            
            # Adicionar o valor de comissão ao teste
            if valor is not None:  # Se valor for None, não incluímos no JSON
                dados_teste["comissao_percentual"] = valor
            
            print(f"\n\n===== Testando com {descricao}: {valor} (tipo: {type(valor).__name__}) =====")
            print(f"Dados enviados: {json.dumps(dados_teste)}")
            
            # Testar endpoint de teste
            response = client.post(
                '/api/barbeiros/teste-criar', 
                json=dados_teste,
                headers={'Content-Type': 'application/json'}
            )
            
            print(f"Endpoint /api/barbeiros/teste-criar - Status: {response.status_code}")
            
            # Verificar resposta
            try:
                data = json.loads(response.data)
                if response.status_code == 201:
                    barbeiro_id = data.get('barbeiro', {}).get('id')
                    barbeiro_comissao = data.get('barbeiro', {}).get('comissao_percentual')
                    print(f"Barbeiro criado com ID: {barbeiro_id}, comissão: {barbeiro_comissao} (tipo {type(barbeiro_comissao).__name__})")
                else:
                    print(json.dumps(data, indent=2))
            except json.JSONDecodeError as e:
                print(f"Erro ao decodificar JSON: {e}")
                print(f"Resposta bruta: {response.data.decode('utf-8')}")

if __name__ == "__main__":
    print("Iniciando teste de validação de comissão percentual...")
    test_comissao_percentual() 