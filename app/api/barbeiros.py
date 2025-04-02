from flask import Blueprint, request, jsonify
from marshmallow import Schema, fields, validate, ValidationError
from flask_jwt_extended import jwt_required, get_jwt
from app import db
from app.models.barbeiro import Barbeiro
from app.models.usuario import Usuario

barbeiros_bp = Blueprint('barbeiros', __name__)

class BarbeiroSchema(Schema):
    usuario_id = fields.Integer(required=True)
    especialidades = fields.String(allow_none=True)
    comissao_percentual = fields.Float(validate=validate.Range(min=0, max=100), default=50.0)
    disponivel = fields.Boolean(default=True)

class UsuarioBarbeiroSchema(Schema):
    nome = fields.Str(required=True, validate=validate.Length(min=3, max=100))
    email = fields.Email(required=True)
    senha = fields.Str(required=True, validate=validate.Length(min=6))
    telefone = fields.Str(validate=validate.Length(max=20))
    especialidades = fields.String(allow_none=True)
    comissao_percentual = fields.Float(validate=validate.Range(min=0, max=100), default=50.0)

# Verificação de permissão (Admin)
def verificar_permissao_admin():
    jwt_data = get_jwt()
    return jwt_data.get('perfil') == 'admin'

@barbeiros_bp.route('/', methods=['GET'])
@jwt_required()
def listar_barbeiros():
    barbeiros = Barbeiro.query.join(Usuario).filter(Usuario.ativo == True).all()
    return jsonify([barbeiro.to_dict() for barbeiro in barbeiros]), 200

@barbeiros_bp.route('/<int:id>', methods=['GET'])
@jwt_required()
def obter_barbeiro(id):
    barbeiro = Barbeiro.query.get(id)
    
    if not barbeiro:
        return jsonify({"erro": "Barbeiro não encontrado"}), 404
    
    return jsonify(barbeiro.to_dict()), 200

@barbeiros_bp.route('/', methods=['POST'])
@jwt_required()
def criar_barbeiro():
    # Verificar permissão (apenas admin pode criar barbeiros)
    if not verificar_permissao_admin():
        return jsonify({"erro": "Permissão negada"}), 403
    
    try:
        data = BarbeiroSchema().load(request.json)
    except ValidationError as err:
        return jsonify({"erro": "Dados inválidos", "detalhes": err.messages}), 400
    
    # Verificar se usuário existe e não é já um barbeiro
    usuario = Usuario.query.get(data['usuario_id'])
    if not usuario:
        return jsonify({"erro": "Usuário não encontrado"}), 404
    
    barbeiro_existente = Barbeiro.query.filter_by(usuario_id=data['usuario_id']).first()
    if barbeiro_existente:
        return jsonify({"erro": "Este usuário já é um barbeiro"}), 400
    
    # Criar novo barbeiro
    barbeiro = Barbeiro(
        usuario_id=data['usuario_id'],
        especialidades=data.get('especialidades'),
        comissao_percentual=data.get('comissao_percentual', 50.0),
        disponivel=data.get('disponivel', True)
    )
    
    # Atualizar perfil do usuário para 'barbeiro'
    usuario.perfil = 'barbeiro'
    
    db.session.add(barbeiro)
    db.session.commit()
    
    return jsonify({
        "mensagem": "Barbeiro criado com sucesso",
        "barbeiro": barbeiro.to_dict()
    }), 201

@barbeiros_bp.route('/completo', methods=['POST'])
@jwt_required()
def criar_barbeiro_completo():
    # Verificar permissão (apenas admin pode criar barbeiros)
    if not verificar_permissao_admin():
        return jsonify({"erro": "Permissão negada"}), 403
    
    try:
        data = UsuarioBarbeiroSchema().load(request.json)
    except ValidationError as err:
        return jsonify({"erro": "Dados inválidos", "detalhes": err.messages}), 400
    
    # Verificar se email já existe
    usuario_existente = Usuario.query.filter_by(email=data['email']).first()
    if usuario_existente:
        return jsonify({"erro": "Email já cadastrado"}), 400
    
    # Criar transação para garantir que tanto o usuário quanto o barbeiro sejam criados
    try:
        # Criar usuário
        usuario = Usuario(
            nome=data['nome'],
            email=data['email'],
            perfil='barbeiro',
            telefone=data.get('telefone')
        )
        usuario.senha = data['senha']
        
        db.session.add(usuario)
        db.session.flush()  # Obter ID do usuário sem commit
        
        # Criar barbeiro
        barbeiro = Barbeiro(
            usuario_id=usuario.id,
            especialidades=data.get('especialidades'),
            comissao_percentual=data.get('comissao_percentual', 50.0),
            disponivel=True
        )
        
        db.session.add(barbeiro)
        db.session.commit()
        
        return jsonify({
            "mensagem": "Barbeiro criado com sucesso",
            "barbeiro": barbeiro.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"erro": f"Erro ao criar barbeiro: {str(e)}"}), 500

@barbeiros_bp.route('/<int:id>', methods=['PUT'])
@jwt_required()
def atualizar_barbeiro(id):
    # Verificar permissão (apenas admin pode atualizar barbeiros)
    if not verificar_permissao_admin():
        return jsonify({"erro": "Permissão negada"}), 403
    
    barbeiro = Barbeiro.query.get(id)
    
    if not barbeiro:
        return jsonify({"erro": "Barbeiro não encontrado"}), 404
    
    try:
        data = BarbeiroSchema().load(request.json, partial=True)
    except ValidationError as err:
        return jsonify({"erro": "Dados inválidos", "detalhes": err.messages}), 400
    
    # Verificar se está alterando o usuário_id
    if 'usuario_id' in data and data['usuario_id'] != barbeiro.usuario_id:
        # Verificar se novo usuário existe e não é já um barbeiro
        usuario = Usuario.query.get(data['usuario_id'])
        if not usuario:
            return jsonify({"erro": "Usuário não encontrado"}), 404
        
        barbeiro_existente = Barbeiro.query.filter_by(usuario_id=data['usuario_id']).first()
        if barbeiro_existente:
            return jsonify({"erro": "Este usuário já é um barbeiro"}), 400
        
        # Atualizar perfil dos usuários envolvidos
        usuario_antigo = Usuario.query.get(barbeiro.usuario_id)
        if usuario_antigo:
            usuario_antigo.perfil = 'cliente'  # Ou outro perfil adequado
        
        usuario.perfil = 'barbeiro'
        barbeiro.usuario_id = data['usuario_id']
    
    # Atualizar demais campos
    if 'especialidades' in data:
        barbeiro.especialidades = data['especialidades']
    if 'comissao_percentual' in data:
        barbeiro.comissao_percentual = data['comissao_percentual']
    if 'disponivel' in data:
        barbeiro.disponivel = data['disponivel']
    
    db.session.commit()
    
    return jsonify({
        "mensagem": "Barbeiro atualizado com sucesso",
        "barbeiro": barbeiro.to_dict()
    }), 200

@barbeiros_bp.route('/<int:id>', methods=['DELETE'])
@jwt_required()
def remover_barbeiro(id):
    # Verificar permissão (apenas admin pode remover barbeiros)
    if not verificar_permissao_admin():
        return jsonify({"erro": "Permissão negada"}), 403
    
    barbeiro = Barbeiro.query.get(id)
    
    if not barbeiro:
        return jsonify({"erro": "Barbeiro não encontrado"}), 404
    
    # Verificar dependências (agendamentos, atendimentos)
    if barbeiro.agendamentos or barbeiro.atendimentos:
        return jsonify({
            "erro": "Barbeiro não pode ser removido pois possui registros associados",
            "detalhes": {
                "agendamentos": len(barbeiro.agendamentos),
                "atendimentos": len(barbeiro.atendimentos)
            }
        }), 400
    
    # Atualizar perfil do usuário
    usuario = Usuario.query.get(barbeiro.usuario_id)
    if usuario:
        usuario.perfil = 'cliente'  # Ou outro perfil adequado
    
    db.session.delete(barbeiro)
    db.session.commit()
    
    return jsonify({"mensagem": "Barbeiro removido com sucesso"}), 200