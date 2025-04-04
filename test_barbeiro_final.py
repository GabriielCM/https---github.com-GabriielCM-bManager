from app import create_app
from flask import jsonify
import json
from datetime import datetime, date
import time

app = create_app()

def test_comissao_percentual_corrigido():
    """Testa se a correção do campo comissao_percentual foi bem-sucedida"""
    print("Testando a correção da validação do campo comissao_percentual...")
    
    # Valores de teste que antes davam erro
    valores_teste = [
        ("String numérica", "50"),
        ("String numérica com ponto", "50.0"),
        ("Valor None", None)
    ]
    
    # Criar um cliente de teste para a aplicação Flask
    with app.test_client() as client:
        for i, (descricao, valor) in enumerate(valores_teste):
            # Gerar email único para cada teste
            timestamp = int(time.time()) + i
            email = f"teste_final_{timestamp}@example.com"
            
            # Dados base para o barbeiro com email único
            dados_teste = {
                "nome": f"Barbeiro Teste Final {i+1}",
                "email": email,
                "senha": "senha123456",
                "telefone": "11987654321",
                "especialidades": "Corte,Barba"
            }
            
            # Adicionar o valor de comissão ao teste
            if valor is not None:  # Se valor for None, não incluímos no JSON
                dados_teste["comissao_percentual"] = valor
            
            print(f"\n===== Testando com {descricao}: {valor} =====")
            print(f"Dados enviados: {json.dumps(dados_teste)}")
            
            # Teste com o endpoint corrigido
            response = client.post(
                '/api/barbeiros/teste-criar', 
                json=dados_teste,
                headers={'Content-Type': 'application/json'}
            )
            
            print(f"Status code: {response.status_code}")
            
            # Verificar resposta
            try:
                data = json.loads(response.data)
                if response.status_code == 201:
                    # Sucesso!
                    barbeiro_id = data.get('barbeiro', {}).get('id')
                    barbeiro_comissao = data.get('barbeiro', {}).get('comissao_percentual')
                    print(f"Sucesso! Barbeiro criado com ID: {barbeiro_id}")
                    print(f"Comissão salva: {barbeiro_comissao} (tipo: {type(barbeiro_comissao).__name__})")
                else:
                    print("Falha na criação do barbeiro:")
                    print(json.dumps(data, indent=2))
            except json.JSONDecodeError as e:
                print(f"Erro ao decodificar JSON: {e}")
                print(f"Resposta bruta: {response.data.decode('utf-8')}")

if __name__ == "__main__":
    print("Iniciando teste final após correções...")
    test_comissao_percentual_corrigido() 