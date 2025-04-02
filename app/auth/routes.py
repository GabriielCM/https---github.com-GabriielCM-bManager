from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
from marshmallow import Schema, fields, validate, ValidationError
from app.models.usuario import Usuario
from app import db, bcrypt
from datetime import timedelta
import secrets
import string

auth_bp = Blueprint('auth', __name__)

class LoginSchema(Schema):
    email = fields.Email(required=True)
    senha = fields.Str(required=True)

class RegistroSchema(Schema):
    nome = fields.Str(required=True, validate=validate.Length(min=3, max=100))
    email = fields.Email(required=True)
    senha = fields.Str(required=True, validate=validate.Length(min=6))
    perfil = fields.Str(required=True, validate=validate.OneOf(['admin', 'barbeiro', 'cliente']))
    telefone = fields.Str(validate=validate.Length(max=20))

class ResetSenhaSchema(Schema):
    email = fields.Email(required=True)

class NovaSenhaSchema(Schema):
    token = fields.Str(required=True)
    nova_senha = fields.Str(required=True, validate=validate.Length(min=6))

@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = LoginSchema().load(request.json)
    except ValidationError as err:
        return jsonify({"erro": "Dados inválidos", "detalhes": err.messages}), 400
    
    usuario = Usuario.query.filter_by(email=data['email']).first()
    
    if not usuario or not usuario.verificar_senha(data['senha']):
        return jsonify({"erro": "Credenciais inválidas"}), 401
    
    if not usuario.ativo:
        return jsonify({"erro": "Usuário desativado"}), 403
    
    # Gerar token JWT
    access_token = create_access_token(
        identity=usuario.id,
        additional_claims={'perfil': usuario.perfil},
        expires_delta=timedelta(days=1)
    )
    
    return jsonify({
        "token": access_token,
        "usuario": usuario.to_dict()
    }), 200

@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        data = RegistroSchema().load(request.json)
    except ValidationError as err:
        return jsonify({"erro": "Dados inválidos", "detalhes": err.messages}), 400
    
    # Verificar se o email já existe
    usuario_existente = Usuario.query.filter_by(email=data['email']).first()
    if usuario_existente:
        return jsonify({"erro": "Email já cadastrado"}), 400
    
    # Criar novo usuário
    usuario = Usuario(
        nome=data['nome'],
        email=data['email'],
        perfil=data['perfil'],
        telefone=data.get('telefone')
    )
    usuario.senha = data['senha']
    
    db.session.add(usuario)
    db.session.commit()
    
    # Gerar token JWT
    access_token = create_access_token(
        identity=usuario.id,
        additional_claims={'perfil': usuario.perfil},
        expires_delta=timedelta(days=1)
    )
    
    return jsonify({
        "mensagem": "Usuário registrado com sucesso",
        "token": access_token,
        "usuario": usuario.to_dict()
    }), 201

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_me():
    usuario_id = get_jwt_identity()
    usuario = Usuario.query.get(usuario_id)
    
    if not usuario:
        return jsonify({"erro": "Usuário não encontrado"}), 404
    
    return jsonify(usuario.to_dict()), 200

@auth_bp.route('/solicitar-reset-senha', methods=['POST'])
def solicitar_reset_senha():
    try:
        data = ResetSenhaSchema().load(request.json)
    except ValidationError as err:
        return jsonify({"erro": "Dados inválidos", "detalhes": err.messages}), 400
    
    usuario = Usuario.query.filter_by(email=data['email']).first()
    
    if not usuario:
        # Por segurança, não informamos se o email existe ou não
        return jsonify({"mensagem": "Se o email estiver cadastrado, você receberá instruções para redefinir sua senha"}), 200
    
    # Gerar token de reset de senha
    caracteres = string.ascii_letters + string.digits
    token = ''.join(secrets.choice(caracteres) for i in range(20))
    
    usuario.token_reset_senha = token
    db.session.commit()
    
    # Aqui implementaria o envio de email com o token
    # Em um ambiente real, enviaria um email com link para redefinir a senha
    
    return jsonify({"mensagem": "Se o email estiver cadastrado, você receberá instruções para redefinir sua senha", "token": token}), 200

@auth_bp.route('/reset-senha', methods=['POST'])
def reset_senha():
    try:
        data = NovaSenhaSchema().load(request.json)
    except ValidationError as err:
        return jsonify({"erro": "Dados inválidos", "detalhes": err.messages}), 400
    
    usuario = Usuario.query.filter_by(token_reset_senha=data['token']).first()
    
    if not usuario:
        return jsonify({"erro": "Token inválido ou expirado"}), 400
    
    usuario.senha = data['nova_senha']
    usuario.token_reset_senha = None
    db.session.commit()
    
    return jsonify({"mensagem": "Senha redefinida com sucesso"}), 200

@auth_bp.route('/verificar-perfil', methods=['GET'])
@jwt_required()
def verificar_perfil():
    jwt_data = get_jwt()
    perfil = jwt_data.get('perfil')
    
    return jsonify({
        "perfil": perfil,
        "admin": perfil == 'admin',
        "barbeiro": perfil == 'barbeiro',
        "cliente": perfil == 'cliente'
    }), 200

@auth_bp.route('/alterar-senha', methods=['POST'])
@jwt_required()
def alterar_senha():
    usuario_id = get_jwt_identity()
    usuario = Usuario.query.get(usuario_id)
    
    if not usuario:
        return jsonify({"erro": "Usuário não encontrado"}), 404
    
    data = request.json
    if not 'senha_atual' in data or not 'nova_senha' in data:
        return jsonify({"erro": "Dados inválidos. Necessário senha_atual e nova_senha"}), 400
    
    if not usuario.verificar_senha(data['senha_atual']):
        return jsonify({"erro": "Senha atual incorreta"}), 401
    
    if len(data['nova_senha']) < 6:
        return jsonify({"erro": "A nova senha deve ter pelo menos 6 caracteres"}), 400
    
    usuario.senha = data['nova_senha']
    db.session.commit()
    
    return jsonify({"mensagem": "Senha alterada com sucesso"}), 200 