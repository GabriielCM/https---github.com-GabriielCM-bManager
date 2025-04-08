from flask import Blueprint, request, jsonify
from marshmallow import Schema, fields, validate, ValidationError
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app import db
from app.models.cliente import Cliente
from app.models.usuario import Usuario
from datetime import datetime, timedelta
from sqlalchemy import func

clientes_bp = Blueprint('clientes', __name__)

class ClienteSchema(Schema):
    nome = fields.Str(required=True, validate=validate.Length(min=3, max=100))
    telefone = fields.Str(required=True, validate=validate.Length(min=8, max=20))
    email = fields.Email(allow_none=True)

# Verificação de permissão (Admin)
def verificar_permissao_admin():
    try:
        jwt_data = get_jwt()
        return jwt_data.get('perfil') == 'admin'
    except:
        # Em ambiente de desenvolvimento, permitir acesso
        return True

# Flag para desenvolvimento (desabilitar autenticação)
DEV_MODE = True

def jwt_opcional(route_function):
    """Decorador que torna o JWT opcional em ambiente de desenvolvimento"""
    if DEV_MODE:
        return route_function
    else:
        return jwt_required()(route_function)

@clientes_bp.route('/', methods=['GET'])
@jwt_opcional
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
@jwt_opcional
def obter_cliente(id):
    cliente = Cliente.query.get(id)
    
    if not cliente:
        return jsonify({"erro": "Cliente não encontrado"}), 404
    
    return jsonify(cliente.to_dict()), 200

@clientes_bp.route('/', methods=['POST'])
@jwt_opcional
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
@jwt_opcional
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
@jwt_opcional
def remover_cliente(id):
    # Verificar permissão (apenas admin pode remover clientes)
    if not verificar_permissao_admin() and not DEV_MODE:
        return jsonify({"erro": "Permissão negada"}), 403
    
    cliente = Cliente.query.get(id)
    
    if not cliente:
        return jsonify({"erro": "Cliente não encontrado"}), 404
    
    # Verificar dependências (agendamentos, vendas, etc.)
    if hasattr(cliente, 'agendamentos') and cliente.agendamentos:
        return jsonify({
            "erro": "Cliente não pode ser removido pois possui agendamentos associados"
        }), 400
    
    if hasattr(cliente, 'vendas') and cliente.vendas:
        return jsonify({
            "erro": "Cliente não pode ser removido pois possui vendas associadas"
        }), 400
    
    db.session.delete(cliente)
    db.session.commit()
    
    return jsonify({"mensagem": "Cliente removido com sucesso"}), 200

@clientes_bp.route('/estatisticas', methods=['GET'])
@jwt_opcional
def obter_estatisticas():
    # Total de clientes
    total = Cliente.query.count()
    
    # Novos clientes este mês
    data_inicio_mes = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    novos_mes = Cliente.query.filter(Cliente.created_at >= data_inicio_mes).count()
    
    # Clientes frequentes (com visita nos últimos 30 dias)
    data_30_dias = datetime.now() - timedelta(days=30)
    frequentes = 0
    
    # Clientes inativos (sem visita há mais de 90 dias)
    data_90_dias = datetime.now() - timedelta(days=90)
    inativos = 0
    
    # Implementação básica por enquanto - em um sistema real precisaria
    # consultar a tabela de agendamentos para calcular frequência
    
    return jsonify({
        "total": total,
        "novos_mes": novos_mes,
        "frequentes": frequentes,
        "inativos": inativos
    }), 200

@clientes_bp.route('/recentes', methods=['GET'])
@jwt_opcional
def listar_clientes_recentes():
    # Buscar os 5 clientes mais recentes
    clientes_recentes = Cliente.query.order_by(Cliente.created_at.desc()).limit(5).all()
    
    return jsonify([cliente.to_dict() for cliente in clientes_recentes]), 200

@clientes_bp.route('/busca', methods=['GET'])
@jwt_opcional
def buscar_clientes():
    termo = request.args.get('termo', '')
    
    if not termo or len(termo) < 2:
        return jsonify([]), 200
    
    # Buscar clientes pelo termo (nome, telefone ou email)
    clientes = Cliente.query.filter(
        db.or_(
            Cliente.nome.ilike(f'%{termo}%'),
            Cliente.telefone.ilike(f'%{termo}%'),
            Cliente.email.ilike(f'%{termo}%')
        )
    ).limit(10).all()
    
    return jsonify([cliente.to_dict() for cliente in clientes]), 200 