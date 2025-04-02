from flask import Blueprint, request, jsonify
from marshmallow import Schema, fields, validate, ValidationError
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app import db
from app.models.cliente import Cliente
from app.models.usuario import Usuario

clientes_bp = Blueprint('clientes', __name__)

class ClienteSchema(Schema):
    nome = fields.Str(required=True, validate=validate.Length(min=3, max=100))
    telefone = fields.Str(required=True, validate=validate.Length(min=8, max=20))
    email = fields.Email(allow_none=True)

# Verificação de permissão (Admin)
def verificar_permissao_admin():
    jwt_data = get_jwt()
    return jwt_data.get('perfil') == 'admin'

@clientes_bp.route('/', methods=['GET'])
@jwt_required()
def listar_clientes():
    # Parâmetros de consulta para filtragem e paginação
    busca = request.args.get('busca', '')
    pagina = int(request.args.get('pagina', 1))
    por_pagina = int(request.args.get('por_pagina', 10))
    
    # Iniciar consulta
    query = Cliente.query
    
    # Aplicar filtro de busca se fornecido
    if busca:
        query = query.filter(db.or_(
            Cliente.nome.ilike(f'%{busca}%'),
            Cliente.telefone.ilike(f'%{busca}%'),
            Cliente.email.ilike(f'%{busca}%')
        ))
    
    # Ordenar e paginar resultados
    query = query.order_by(Cliente.nome.asc())
    resultados = query.paginate(page=pagina, per_page=por_pagina)
    
    return jsonify({
        'total': resultados.total,
        'paginas': resultados.pages,
        'pagina_atual': pagina,
        'por_pagina': por_pagina,
        'items': [cliente.to_dict() for cliente in resultados.items]
    }), 200

@clientes_bp.route('/<int:id>', methods=['GET'])
@jwt_required()
def obter_cliente(id):
    cliente = Cliente.query.get(id)
    
    if not cliente:
        return jsonify({"erro": "Cliente não encontrado"}), 404
    
    return jsonify(cliente.to_dict()), 200

@clientes_bp.route('/', methods=['POST'])
@jwt_required()
def criar_cliente():
    try:
        data = ClienteSchema().load(request.json)
    except ValidationError as err:
        return jsonify({"erro": "Dados inválidos", "detalhes": err.messages}), 400
    
    # Verificar se telefone já existe
    cliente_existente = Cliente.query.filter_by(telefone=data['telefone']).first()
    if cliente_existente:
        return jsonify({"erro": "Telefone já cadastrado"}), 400
    
    # Verificar se email já existe (se fornecido)
    if data.get('email'):
        cliente_existente = Cliente.query.filter_by(email=data['email']).first()
        if cliente_existente:
            return jsonify({"erro": "Email já cadastrado"}), 400
        
        # Verificar se email existe em Usuarios
        usuario_existente = Usuario.query.filter_by(email=data['email']).first()
        if usuario_existente:
            return jsonify({"erro": "Email já utilizado por outro usuário"}), 400
    
    # Criar novo cliente
    cliente = Cliente(
        nome=data['nome'],
        telefone=data['telefone'],
        email=data.get('email')
    )
    
    db.session.add(cliente)
    db.session.commit()
    
    return jsonify({
        "mensagem": "Cliente criado com sucesso",
        "cliente": cliente.to_dict()
    }), 201

@clientes_bp.route('/<int:id>', methods=['PUT'])
@jwt_required()
def atualizar_cliente(id):
    cliente = Cliente.query.get(id)
    
    if not cliente:
        return jsonify({"erro": "Cliente não encontrado"}), 404
    
    try:
        data = ClienteSchema().load(request.json)
    except ValidationError as err:
        return jsonify({"erro": "Dados inválidos", "detalhes": err.messages}), 400
    
    # Verificar se telefone já existe (excluindo o cliente atual)
    cliente_existente = Cliente.query.filter(
        Cliente.telefone == data['telefone'],
        Cliente.id != id
    ).first()
    if cliente_existente:
        return jsonify({"erro": "Telefone já cadastrado"}), 400
    
    # Verificar se email já existe (se fornecido, excluindo o cliente atual)
    if data.get('email'):
        cliente_existente = Cliente.query.filter(
            Cliente.email == data['email'],
            Cliente.id != id
        ).first()
        if cliente_existente:
            return jsonify({"erro": "Email já cadastrado"}), 400
        
        # Verificar se email existe em Usuarios
        usuario_existente = Usuario.query.filter_by(email=data['email']).first()
        if usuario_existente:
            return jsonify({"erro": "Email já utilizado por outro usuário"}), 400
    
    # Atualizar cliente
    cliente.nome = data['nome']
    cliente.telefone = data['telefone']
    cliente.email = data.get('email')
    
    db.session.commit()
    
    return jsonify({
        "mensagem": "Cliente atualizado com sucesso",
        "cliente": cliente.to_dict()
    }), 200

@clientes_bp.route('/<int:id>', methods=['DELETE'])
@jwt_required()
def remover_cliente(id):
    # Verificar permissão (apenas admin pode remover clientes)
    if not verificar_permissao_admin():
        return jsonify({"erro": "Permissão negada"}), 403
    
    cliente = Cliente.query.get(id)
    
    if not cliente:
        return jsonify({"erro": "Cliente não encontrado"}), 404
    
    # Verificar dependências (agendamentos, vendas, etc.)
    if cliente.agendamentos or cliente.vendas or cliente.planos:
        return jsonify({
            "erro": "Cliente não pode ser removido pois possui registros associados",
            "detalhes": {
                "agendamentos": len(cliente.agendamentos),
                "vendas": len(cliente.vendas),
                "planos": len(cliente.planos)
            }
        }), 400
    
    db.session.delete(cliente)
    db.session.commit()
    
    return jsonify({"mensagem": "Cliente removido com sucesso"}), 200 