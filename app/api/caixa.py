from flask import Blueprint, request, jsonify
from marshmallow import Schema, fields, validate, ValidationError
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app import db
from app.models.caixa_diario import CaixaDiario
from app.models.pagamento import Pagamento
from datetime import datetime

caixa_bp = Blueprint('caixa', __name__)

class AberturaCaixaSchema(Schema):
    valor_inicial = fields.Float(required=True, validate=validate.Range(min=0))
    observacoes = fields.Str(allow_none=True)

class FechamentoCaixaSchema(Schema):
    observacoes = fields.Str(allow_none=True)

class PagamentoSchema(Schema):
    tipo = fields.Str(required=True, validate=validate.OneOf(['entrada', 'saida']))
    valor = fields.Float(required=True, validate=validate.Range(min=0.01))
    forma_pagamento = fields.Str(required=True, validate=validate.OneOf(['dinheiro', 'cartao_credito', 'cartao_debito', 'pix', 'transferencia']))
    descricao = fields.Str(required=True)

# Verificar permissão de admin ou caixa
def verificar_permissao_caixa():
    jwt_data = get_jwt()
    perfil = jwt_data.get('perfil')
    return perfil == 'admin'

@caixa_bp.route('/abrir', methods=['POST'])
@jwt_required()
def abrir_caixa():
    if not verificar_permissao_caixa():
        return jsonify({"erro": "Permissão negada"}), 403
    
    try:
        data = AberturaCaixaSchema().load(request.json)
    except ValidationError as err:
        return jsonify({"erro": "Dados inválidos", "detalhes": err.messages}), 400
    
    # Verificar se já existe um caixa aberto
    caixa_aberto = CaixaDiario.query.filter_by(status='aberto').first()
    if caixa_aberto:
        return jsonify({
            "erro": "Já existe um caixa aberto",
            "caixa": caixa_aberto.to_dict()
        }), 400
    
    # Criar novo caixa
    usuario_id = get_jwt_identity()
    caixa = CaixaDiario(
        data_abertura=datetime.now(),
        valor_inicial=data['valor_inicial'],
        status='aberto',
        usuario_abertura_id=usuario_id,
        observacoes=data.get('observacoes')
    )
    
    db.session.add(caixa)
    db.session.commit()
    
    return jsonify({
        "mensagem": "Caixa aberto com sucesso",
        "caixa": caixa.to_dict()
    }), 201

@caixa_bp.route('/fechar', methods=['POST'])
@jwt_required()
def fechar_caixa():
    if not verificar_permissao_caixa():
        return jsonify({"erro": "Permissão negada"}), 403
    
    # Verificar se existe um caixa aberto
    caixa_aberto = CaixaDiario.query.filter_by(status='aberto').first()
    if not caixa_aberto:
        return jsonify({"erro": "Não há caixa aberto para fechar"}), 400
    
    try:
        data = FechamentoCaixaSchema().load(request.json)
    except ValidationError as err:
        return jsonify({"erro": "Dados inválidos", "detalhes": err.messages}), 400
    
    # Fechar caixa
    usuario_id = get_jwt_identity()
    caixa_aberto.data_fechamento = datetime.now()
    caixa_aberto.valor_final = caixa_aberto.saldo
    caixa_aberto.status = 'fechado'
    caixa_aberto.usuario_fechamento_id = usuario_id
    if data.get('observacoes'):
        if caixa_aberto.observacoes:
            caixa_aberto.observacoes += f"\n[Fechamento] {data['observacoes']}"
        else:
            caixa_aberto.observacoes = f"[Fechamento] {data['observacoes']}"
    
    db.session.commit()
    
    return jsonify({
        "mensagem": "Caixa fechado com sucesso",
        "caixa": caixa_aberto.to_dict(include_pagamentos=True)
    }), 200

@caixa_bp.route('/atual', methods=['GET'])
@jwt_required()
def obter_caixa_atual():
    if not verificar_permissao_caixa():
        return jsonify({"erro": "Permissão negada"}), 403
    
    caixa_aberto = CaixaDiario.query.filter_by(status='aberto').first()
    if not caixa_aberto:
        return jsonify({"erro": "Não há caixa aberto"}), 404
    
    return jsonify(caixa_aberto.to_dict(include_pagamentos=True)), 200

@caixa_bp.route('/movimento', methods=['POST'])
@jwt_required()
def registrar_movimento():
    if not verificar_permissao_caixa():
        return jsonify({"erro": "Permissão negada"}), 403
    
    # Verificar se existe um caixa aberto
    caixa_aberto = CaixaDiario.query.filter_by(status='aberto').first()
    if not caixa_aberto:
        return jsonify({"erro": "Não há caixa aberto para registrar movimento"}), 400
    
    try:
        data = PagamentoSchema().load(request.json)
    except ValidationError as err:
        return jsonify({"erro": "Dados inválidos", "detalhes": err.messages}), 400
    
    # Criar novo pagamento
    pagamento = Pagamento(
        tipo=data['tipo'],
        valor=data['valor'],
        forma_pagamento=data['forma_pagamento'],
        status='confirmado',
        descricao=data['descricao'],
        caixa_diario_id=caixa_aberto.id
    )
    
    db.session.add(pagamento)
    db.session.commit()
    
    return jsonify({
        "mensagem": f"{data['tipo'].capitalize()} registrado com sucesso",
        "pagamento": pagamento.to_dict(),
        "saldo_atual": caixa_aberto.saldo
    }), 201

@caixa_bp.route('/historico', methods=['GET'])
@jwt_required()
def listar_historico():
    if not verificar_permissao_caixa():
        return jsonify({"erro": "Permissão negada"}), 403
    
    # Parâmetros para filtragem e paginação
    data_inicio = request.args.get('data_inicio')
    data_fim = request.args.get('data_fim')
    pagina = int(request.args.get('pagina', 1))
    por_pagina = int(request.args.get('por_pagina', 10))
    
    # Construir consulta com filtros
    query = CaixaDiario.query
    
    if data_inicio:
        data_inicio = datetime.fromisoformat(data_inicio)
        query = query.filter(CaixaDiario.data_abertura >= data_inicio)
    
    if data_fim:
        data_fim = datetime.fromisoformat(data_fim)
        query = query.filter(CaixaDiario.data_abertura <= data_fim)
    
    # Ordenar e paginar resultados
    query = query.order_by(CaixaDiario.data_abertura.desc())
    resultados = query.paginate(page=pagina, per_page=por_pagina)
    
    return jsonify({
        'total': resultados.total,
        'paginas': resultados.pages,
        'pagina_atual': pagina,
        'por_pagina': por_pagina,
        'items': [caixa.to_dict() for caixa in resultados.items]
    }), 200

@caixa_bp.route('/<int:id>', methods=['GET'])
@jwt_required()
def obter_caixa(id):
    if not verificar_permissao_caixa():
        return jsonify({"erro": "Permissão negada"}), 403
    
    caixa = CaixaDiario.query.get(id)
    if not caixa:
        return jsonify({"erro": "Caixa não encontrado"}), 404
    
    return jsonify(caixa.to_dict(include_pagamentos=True)), 200 