from app import create_app
from flask import jsonify
import json
from datetime import datetime, date

app = create_app()

def test_agenda_route():
    """Testa a rota /api/agendamentos/data/YYYY-MM-DD"""
    data_atual = date.today().strftime('%Y-%m-%d')
    
    # Criar um cliente de teste para a aplicação Flask
    with app.test_client() as client:
        # Fazer uma requisição para a API
        response = client.get(f'/api/agendamentos/data/{data_atual}')
        
        # Verificar código de status
        print(f"Status code: {response.status_code}")
        
        # Verificar headers
        print(f"Content-Type: {response.headers.get('Content-Type')}")
        
        # Verificar se é JSON válido
        try:
            data = json.loads(response.data)
            print("Resposta é JSON válido")
            print(f"Agendamentos encontrados: {len(data) if isinstance(data, list) else 'Não é uma lista'}")
            print(json.dumps(data, indent=2))
        except json.JSONDecodeError as e:
            print(f"Erro ao decodificar JSON: {e}")
            print(f"Resposta bruta: {response.data.decode('utf-8')[:100]}...")

    # Testar a rota principal da API
    with app.test_client() as client:
        response = client.get('/api')
        print("\nTestando rota /api:")
        print(f"Status code: {response.status_code}")
        print(f"Content-Type: {response.headers.get('Content-Type')}")
        try:
            data = json.loads(response.data)
            print("Resposta é JSON válido")
            print(json.dumps(data, indent=2))
        except json.JSONDecodeError as e:
            print(f"Erro ao decodificar JSON: {e}")
            print(f"Resposta bruta: {response.data.decode('utf-8')[:100]}...")

if __name__ == "__main__":
    print("Iniciando teste da API...")
    test_agenda_route() 