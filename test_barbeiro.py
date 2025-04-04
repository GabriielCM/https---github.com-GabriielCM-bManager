from app import create_app
from flask import jsonify
import json
from datetime import datetime, date

app = create_app()

def test_criar_barbeiro():
    """Testa a criação de um barbeiro através do endpoint /api/barbeiros/teste-criar"""
    print("Testando criação de barbeiro...")
    
    # Criar dados de teste
    dados_barbeiro = {
        "nome": "Barbeiro Teste",
        "email": "teste@example.com",
        "senha": "senha123456",
        "telefone": "11987654321",
        "especialidades": "Corte,Barba",
        "comissao_percentual": 50
    }
    
    # Criar um cliente de teste para a aplicação Flask
    with app.test_client() as client:
        # Fazer uma requisição para a API usando o endpoint de teste
        print("\nTestando com endpoint /api/barbeiros/teste-criar")
        response = client.post(
            '/api/barbeiros/teste-criar', 
            json=dados_barbeiro,
            headers={'Content-Type': 'application/json'}
        )
        
        # Verificar código de status
        print(f"Status code: {response.status_code}")
        
        # Verificar headers
        print(f"Content-Type: {response.headers.get('Content-Type')}")
        
        # Verificar resposta
        try:
            data = json.loads(response.data)
            print("Resposta é JSON válido")
            print(json.dumps(data, indent=2))
        except json.JSONDecodeError as e:
            print(f"Erro ao decodificar JSON: {e}")
            print(f"Resposta bruta: {response.data.decode('utf-8')}")
            
        # Se for erro 422, vamos verificar os detalhes da validação
        if response.status_code == 422:
            print("\nTeste com diferentes valores de comissão_percentual:")
            
            # Testar com valores diferentes de comissão
            for comissao in [40, "50", "abc", None]:
                dados_teste = dados_barbeiro.copy()
                dados_teste["comissao_percentual"] = comissao
                
                print(f"\nTentando com comissao_percentual = {comissao} (tipo: {type(comissao).__name__})")
                
                resp = client.post(
                    '/api/barbeiros/teste-criar', 
                    json=dados_teste,
                    headers={'Content-Type': 'application/json'}
                )
                
                print(f"Status: {resp.status_code}")
                
                try:
                    resp_data = json.loads(resp.data)
                    print(json.dumps(resp_data, indent=2))
                except:
                    print(f"Resposta não é JSON válido: {resp.data.decode('utf-8')}")

        # Testar o endpoint de diagnóstico
        print("\nTestando endpoint de diagnóstico")
        diag_response = client.post(
            '/api/barbeiros/diagnostico',
            json=dados_barbeiro,
            headers={'Content-Type': 'application/json'}
        )
        
        print(f"Status code: {diag_response.status_code}")
        
        try:
            diag_data = json.loads(diag_response.data)
            print("Resposta é JSON válido")
            print(json.dumps(diag_data, indent=2))
        except json.JSONDecodeError as e:
            print(f"Erro ao decodificar JSON: {e}")
            print(f"Resposta bruta: {diag_response.data.decode('utf-8')}")

if __name__ == "__main__":
    print("Iniciando teste de criação de barbeiro...")
    test_criar_barbeiro() 