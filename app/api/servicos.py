from flask import Blueprint, request, jsonify
from marshmallow import Schema, fields, validate, ValidationError
from flask_jwt_extended import jwt_required, get_jwt
from app import db
from app.models.servico import Servico

servicos_bp = Blueprint('servicos', __name__)

class ServicoSchema(Schema):
    nome = fields.Str(required=True, validate=validate.Length(min=3, max=100))
    descricao = fields.Str(allow_none=True)
    preco = fields.Float(required=True, validate=validate.Range(min=0))
    duracao_estimada_min = fields.Integer(required=True, validate=validate.Range(min=5))

# Verificação de permissão (Admin)
def verificar_permissao_admin():
    # Em modo de desenvolvimento, permitir todos os acessos
    # Em produção, verificar o JWT
    try:
        jwt_data = get_jwt()
        return jwt_data.get('perfil') == 'admin'
    except:
        # Se ocorrer erro ao obter o JWT, permitir acesso em desenvolvimento
        return True

@servicos_bp.route('/', methods=['GET'])
# Temporariamente removido para desenvolvimento: @jwt_required()
def listar_servicos():
    servicos = Servico.query.order_by(Servico.nome).all()
    return jsonify([servico.to_dict() for servico in servicos]), 200

@servicos_bp.route('/<int:id>', methods=['GET'])
# Temporariamente removido para desenvolvimento: @jwt_required()
def obter_servico(id):
    servico = Servico.query.get(id)
    
    if not servico:
        return jsonify({"erro": "Serviço não encontrado"}), 404
    
    return jsonify(servico.to_dict()), 200

@servicos_bp.route('/', methods=['POST'])
# Temporariamente removido para desenvolvimento: @jwt_required()
def criar_servico():
    # Verificar permissão (apenas admin pode criar serviços)
    if not verificar_permissao_admin():
        return jsonify({"erro": "Permissão negada"}), 403
    
    dados_requisicao = request.json
    if not dados_requisicao:
        return jsonify({"erro": "Dados JSON não fornecidos"}), 400
    
    # Verificar campos obrigatórios
    campos_obrigatorios = ['nome', 'preco', 'duracao_estimada_min']
    for campo in campos_obrigatorios:
        if campo not in dados_requisicao or dados_requisicao[campo] is None:
            return jsonify({"erro": f"Campo obrigatório ausente: {campo}"}), 400
    
    # Processar os dados
    dados_processados = {}
    
    # Copiar campos de texto
    dados_processados['nome'] = dados_requisicao['nome']
    dados_processados['descricao'] = dados_requisicao.get('descricao')
    
    # Processar preço
    try:
        preco = dados_requisicao['preco']
        if isinstance(preco, str):
            preco = float(preco.replace(',', '.'))  # Substituir vírgula por ponto
        preco = float(preco)  # Garantir conversão para float
        if preco < 0:
            return jsonify({"erro": "Preço não pode ser negativo"}), 400
        dados_processados['preco'] = preco
    except (ValueError, TypeError) as e:
        return jsonify({"erro": f"Valor de preço inválido: {str(e)}"}), 400
    
    # Processar duração
    try:
        duracao = dados_requisicao['duracao_estimada_min']
        if isinstance(duracao, str):
            duracao = int(duracao)
        duracao = int(duracao)  # Garantir conversão para int
        if duracao < 5:
            return jsonify({"erro": "Duração mínima é de 5 minutos"}), 400
        dados_processados['duracao_estimada_min'] = duracao
    except (ValueError, TypeError) as e:
        return jsonify({"erro": f"Valor de duração inválido: {str(e)}"}), 400
    
    # Verificar se nome já existe
    servico_existente = Servico.query.filter_by(nome=dados_processados['nome']).first()
    if servico_existente:
        return jsonify({"erro": "Nome de serviço já cadastrado"}), 400
    
    # Criar novo serviço
    servico = Servico(
        nome=dados_processados['nome'],
        descricao=dados_processados.get('descricao'),
        preco=dados_processados['preco'],
        duracao_estimada_min=dados_processados['duracao_estimada_min']
    )
    
    db.session.add(servico)
    db.session.commit()
    
    return jsonify({
        "mensagem": "Serviço criado com sucesso",
        "servico": servico.to_dict()
    }), 201

@servicos_bp.route('/<int:id>', methods=['PUT'])
# Temporariamente removido para desenvolvimento: @jwt_required()
def atualizar_servico(id):
    # Verificar permissão (apenas admin pode atualizar serviços)
    if not verificar_permissao_admin():
        return jsonify({"erro": "Permissão negada"}), 403
    
    servico = Servico.query.get(id)
    
    if not servico:
        return jsonify({"erro": "Serviço não encontrado"}), 404
    
    dados_requisicao = request.json
    if not dados_requisicao:
        return jsonify({"erro": "Dados JSON não fornecidos"}), 400
    
    # Processar os dados
    dados_processados = {}
    
    # Copiar campos de texto
    if 'nome' in dados_requisicao:
        dados_processados['nome'] = dados_requisicao['nome']
    
    if 'descricao' in dados_requisicao:
        dados_processados['descricao'] = dados_requisicao['descricao']
    
    # Processar preço
    if 'preco' in dados_requisicao:
        try:
            preco = dados_requisicao['preco']
            if isinstance(preco, str):
                preco = float(preco.replace(',', '.'))  # Substituir vírgula por ponto
            preco = float(preco)  # Garantir conversão para float
            if preco < 0:
                return jsonify({"erro": "Preço não pode ser negativo"}), 400
            dados_processados['preco'] = preco
        except (ValueError, TypeError) as e:
            return jsonify({"erro": f"Valor de preço inválido: {str(e)}"}), 400
    
    # Processar duração
    if 'duracao_estimada_min' in dados_requisicao:
        try:
            duracao = dados_requisicao['duracao_estimada_min']
            if isinstance(duracao, str):
                duracao = int(duracao)
            duracao = int(duracao)  # Garantir conversão para int
            if duracao < 5:
                return jsonify({"erro": "Duração mínima é de 5 minutos"}), 400
            dados_processados['duracao_estimada_min'] = duracao
        except (ValueError, TypeError) as e:
            return jsonify({"erro": f"Valor de duração inválido: {str(e)}"}), 400
    
    # Verificar se nome já existe (excluindo o serviço atual)
    if 'nome' in dados_processados:
        servico_existente = Servico.query.filter(
            Servico.nome == dados_processados['nome'],
            Servico.id != id
        ).first()
        if servico_existente:
            return jsonify({"erro": "Nome de serviço já cadastrado"}), 400
    
    # Atualizar serviço
    if 'nome' in dados_processados:
        servico.nome = dados_processados['nome']
    if 'descricao' in dados_processados:
        servico.descricao = dados_processados['descricao']
    if 'preco' in dados_processados:
        servico.preco = dados_processados['preco']
    if 'duracao_estimada_min' in dados_processados:
        servico.duracao_estimada_min = dados_processados['duracao_estimada_min']
    
    db.session.commit()
    
    return jsonify({
        "mensagem": "Serviço atualizado com sucesso",
        "servico": servico.to_dict()
    }), 200

@servicos_bp.route('/<int:id>', methods=['DELETE'])
# Temporariamente removido para desenvolvimento: @jwt_required()
def remover_servico(id):
    # Verificar permissão (apenas admin pode remover serviços)
    if not verificar_permissao_admin():
        return jsonify({"erro": "Permissão negada"}), 403
    
    servico = Servico.query.get(id)
    
    if not servico:
        return jsonify({"erro": "Serviço não encontrado"}), 404
    
    # Verificar dependências (agendamentos)
    if servico.agendamento_servicos:
        return jsonify({
            "erro": "Serviço não pode ser removido pois está associado a agendamentos",
            "detalhes": {
                "agendamentos": len(servico.agendamento_servicos)
            }
        }), 400
    
    db.session.delete(servico)
    db.session.commit()
    
    return jsonify({"mensagem": "Serviço removido com sucesso"}), 200 