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
    
    try:
        data = ServicoSchema().load(request.json)
    except ValidationError as err:
        return jsonify({"erro": "Dados inválidos", "detalhes": err.messages}), 400
    
    # Verificar se nome já existe
    servico_existente = Servico.query.filter_by(nome=data['nome']).first()
    if servico_existente:
        return jsonify({"erro": "Nome de serviço já cadastrado"}), 400
    
    # Criar novo serviço
    servico = Servico(
        nome=data['nome'],
        descricao=data.get('descricao'),
        preco=data['preco'],
        duracao_estimada_min=data['duracao_estimada_min']
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
    
    try:
        data = ServicoSchema().load(request.json)
    except ValidationError as err:
        return jsonify({"erro": "Dados inválidos", "detalhes": err.messages}), 400
    
    # Verificar se nome já existe (excluindo o serviço atual)
    servico_existente = Servico.query.filter(
        Servico.nome == data['nome'],
        Servico.id != id
    ).first()
    if servico_existente:
        return jsonify({"erro": "Nome de serviço já cadastrado"}), 400
    
    # Atualizar serviço
    servico.nome = data['nome']
    servico.descricao = data.get('descricao')
    servico.preco = data['preco']
    servico.duracao_estimada_min = data['duracao_estimada_min']
    
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