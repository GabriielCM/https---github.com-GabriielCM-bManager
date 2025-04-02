from flask import Blueprint, request, jsonify
from marshmallow import Schema, fields, validate, ValidationError
from flask_jwt_extended import jwt_required, get_jwt
from app import db
from app.models.venda import Venda, VendaItem
from app.models.produto import Produto
from app.models.cliente import Cliente
from app.models.pagamento import Pagamento
from datetime import datetime

vendas_bp = Blueprint('vendas', __name__)

class ItemVendaSchema(Schema):
    produto_id = fields.Integer(required=True)
    quantidade = fields.Integer(required=True, validate=validate.Range(min=1))
    valor_unitario = fields.Float(required=True, validate=validate.Range(min=0))

class VendaSchema(Schema):
    cliente_id = fields.Integer(allow_none=True)
    itens = fields.List(fields.Nested(ItemVendaSchema), required=True, validate=validate.Length(min=1))

class PagamentoSchema(Schema):
    valor = fields.Float(required=True, validate=validate.Range(min=0.01))
    metodo = fields.Str(required=True, validate=validate.OneOf(['dinheiro', 'cartao_credito', 'cartao_debito', 'pix']))

# Verificação de permissão (Admin ou Barbeiro)
def verificar_permissao_venda():
    jwt_data = get_jwt()
    perfil = jwt_data.get('perfil')
    return perfil in ['admin', 'barbeiro']

@vendas_bp.route('/', methods=['GET'])
@jwt_required()
def listar_vendas():
    # Verificar permissão
    if not verificar_permissao_venda():
        return jsonify({"erro": "Permissão negada"}), 403
    
    # Parâmetros de consulta para filtragem e paginação
    data_inicio = request.args.get('data_inicio')
    data_fim = request.args.get('data_fim')
    cliente_id = request.args.get('cliente_id')
    
    pagina = int(request.args.get('pagina', 1))
    por_pagina = int(request.args.get('por_pagina', 10))
    
    # Construir consulta com filtros
    query = Venda.query
    
    if data_inicio:
        data_inicio = datetime.fromisoformat(data_inicio)
        query = query.filter(Venda.data_hora >= data_inicio)
    
    if data_fim:
        data_fim = datetime.fromisoformat(data_fim)
        query = query.filter(Venda.data_hora <= data_fim)
    
    if cliente_id:
        query = query.filter(Venda.cliente_id == cliente_id)
    
    # Ordenar e paginar resultados
    query = query.order_by(Venda.data_hora.desc())
    resultados = query.paginate(page=pagina, per_page=por_pagina)
    
    return jsonify({
        'total': resultados.total,
        'paginas': resultados.pages,
        'pagina_atual': pagina,
        'por_pagina': por_pagina,
        'items': [venda.to_dict() for venda in resultados.items]
    }), 200

@vendas_bp.route('/<int:id>', methods=['GET'])
@jwt_required()
def obter_venda(id):
    # Verificar permissão
    if not verificar_permissao_venda():
        return jsonify({"erro": "Permissão negada"}), 403
    
    venda = Venda.query.get(id)
    
    if not venda:
        return jsonify({"erro": "Venda não encontrada"}), 404
    
    return jsonify(venda.to_dict()), 200

@vendas_bp.route('/', methods=['POST'])
@jwt_required()
def criar_venda():
    # Verificar permissão
    if not verificar_permissao_venda():
        return jsonify({"erro": "Permissão negada"}), 403
    
    try:
        data = VendaSchema().load(request.json)
    except ValidationError as err:
        return jsonify({"erro": "Dados inválidos", "detalhes": err.messages}), 400
    
    # Verificar se cliente existe (se fornecido)
    cliente_id = data.get('cliente_id')
    if cliente_id:
        cliente = Cliente.query.get(cliente_id)
        if not cliente:
            return jsonify({"erro": "Cliente não encontrado"}), 404
    
    # Criar venda
    venda = Venda(
        cliente_id=cliente_id,
        data_hora=datetime.utcnow(),
        status='finalizada'
    )
    
    db.session.add(venda)
    db.session.flush()  # Obter ID da venda sem commit
    
    # Adicionar itens à venda
    total_venda = 0
    for item_data in data['itens']:
        produto = Produto.query.get(item_data['produto_id'])
        if not produto:
            db.session.rollback()
            return jsonify({"erro": f"Produto ID {item_data['produto_id']} não encontrado"}), 404
        
        # Verificar estoque disponível
        if produto.quantidade_estoque < item_data['quantidade']:
            db.session.rollback()
            return jsonify({
                "erro": f"Estoque insuficiente para o produto '{produto.nome}'",
                "disponivel": produto.quantidade_estoque,
                "solicitado": item_data['quantidade']
            }), 400
        
        # Obter valor unitário (usar o informado ou o preço atual do produto)
        valor_unitario = item_data.get('valor_unitario', produto.preco)
        
        # Criar item de venda
        item = VendaItem(
            venda_id=venda.id,
            produto_id=produto.id,
            quantidade=item_data['quantidade'],
            valor_unitario=valor_unitario
        )
        
        db.session.add(item)
        
        # Atualizar estoque do produto
        try:
            produto.atualizar_estoque(item_data['quantidade'], 'saida')
        except ValueError as e:
            db.session.rollback()
            return jsonify({"erro": str(e)}), 400
        
        # Somar ao total da venda
        total_venda += valor_unitario * item_data['quantidade']
    
    # Atualizar valor total da venda
    venda.valor_total = total_venda
    
    db.session.commit()
    
    return jsonify({
        "mensagem": "Venda criada com sucesso",
        "venda": venda.to_dict()
    }), 201

@vendas_bp.route('/<int:id>/pagamento', methods=['POST'])
@jwt_required()
def registrar_pagamento(id):
    # Verificar permissão
    if not verificar_permissao_venda():
        return jsonify({"erro": "Permissão negada"}), 403
    
    venda = Venda.query.get(id)
    
    if not venda:
        return jsonify({"erro": "Venda não encontrada"}), 404
    
    try:
        data = PagamentoSchema().load(request.json)
    except ValidationError as err:
        return jsonify({"erro": "Dados inválidos", "detalhes": err.messages}), 400
    
    # Verificar se o valor do pagamento é válido
    total_pagamentos = sum(pagamento.valor for pagamento in venda.pagamentos)
    valor_restante = venda.valor_total - total_pagamentos
    
    if data['valor'] > valor_restante:
        return jsonify({
            "erro": "Valor do pagamento excede o valor restante da venda",
            "valor_venda": venda.valor_total,
            "total_pago": total_pagamentos,
            "valor_restante": valor_restante,
            "valor_informado": data['valor']
        }), 400
    
    # Criar pagamento
    pagamento = Pagamento(
        venda_id=venda.id,
        valor=data['valor'],
        metodo=data['metodo'],
        status='aprovado'
    )
    
    db.session.add(pagamento)
    db.session.commit()
    
    # Verificar se a venda foi totalmente paga
    total_pagamentos_atualizado = sum(pagamento.valor for pagamento in venda.pagamentos)
    valor_restante_atualizado = venda.valor_total - total_pagamentos_atualizado
    
    return jsonify({
        "mensagem": "Pagamento registrado com sucesso",
        "pagamento": pagamento.to_dict(),
        "venda_total": venda.valor_total,
        "total_pago": total_pagamentos_atualizado,
        "valor_restante": valor_restante_atualizado
    }), 200

@vendas_bp.route('/<int:id>', methods=['DELETE'])
@jwt_required()
def cancelar_venda(id):
    # Verificar permissão
    if not verificar_permissao_venda():
        return jsonify({"erro": "Permissão negada"}), 403
    
    venda = Venda.query.get(id)
    
    if not venda:
        return jsonify({"erro": "Venda não encontrada"}), 404
    
    # Verificar se a venda já foi paga
    if venda.pagamentos:
        return jsonify({
            "erro": "Não é possível cancelar uma venda que já possui pagamentos",
            "pagamentos": len(venda.pagamentos)
        }), 400
    
    # Restaurar estoque dos produtos
    for item in venda.itens:
        produto = Produto.query.get(item.produto_id)
        if produto:
            produto.atualizar_estoque(item.quantidade, 'entrada')
    
    # Marcar venda como cancelada
    venda.status = 'cancelada'
    db.session.commit()
    
    return jsonify({
        "mensagem": "Venda cancelada com sucesso"
    }), 200

@vendas_bp.route('/relatorio/diario', methods=['GET'])
@jwt_required()
def relatorio_diario():
    # Verificar permissão
    if not verificar_permissao_venda():
        return jsonify({"erro": "Permissão negada"}), 403
    
    # Data para o relatório (hoje por padrão)
    data_str = request.args.get('data')
    
    try:
        if data_str:
            data = datetime.fromisoformat(data_str.split('T')[0])
        else:
            data = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        
        data_inicio = data.replace(hour=0, minute=0, second=0, microsecond=0)
        data_fim = data.replace(hour=23, minute=59, second=59, microsecond=999999)
    except ValueError:
        return jsonify({"erro": "Formato de data inválido. Use ISO 8601 (YYYY-MM-DD)"}), 400
    
    # Buscar vendas do dia
    vendas = Venda.query.filter(
        Venda.data_hora >= data_inicio,
        Venda.data_hora <= data_fim,
        Venda.status == 'finalizada'
    ).all()
    
    # Calcular totais
    total_vendas = len(vendas)
    valor_total = sum(venda.valor_total for venda in vendas)
    
    # Agrupar por método de pagamento
    pagamentos = Pagamento.query.join(Venda).filter(
        Venda.data_hora >= data_inicio,
        Venda.data_hora <= data_fim,
        Venda.status == 'finalizada'
    ).all()
    
    metodos_pagamento = {}
    for pagamento in pagamentos:
        metodo = pagamento.metodo
        if metodo not in metodos_pagamento:
            metodos_pagamento[metodo] = 0
        metodos_pagamento[metodo] += pagamento.valor
    
    # Produtos mais vendidos
    from sqlalchemy import func
    produtos_vendidos = db.session.query(
        Produto.id,
        Produto.nome,
        func.sum(VendaItem.quantidade).label('quantidade_total'),
        func.sum(VendaItem.quantidade * VendaItem.valor_unitario).label('valor_total')
    ).join(VendaItem).join(Venda).filter(
        Venda.data_hora >= data_inicio,
        Venda.data_hora <= data_fim,
        Venda.status == 'finalizada'
    ).group_by(Produto.id).order_by(func.sum(VendaItem.quantidade).desc()).limit(10).all()
    
    top_produtos = [
        {
            'produto_id': prod.id,
            'produto_nome': prod.nome,
            'quantidade_total': int(prod.quantidade_total),
            'valor_total': float(prod.valor_total)
        }
        for prod in produtos_vendidos
    ]
    
    return jsonify({
        'data': data.isoformat().split('T')[0],
        'total_vendas': total_vendas,
        'valor_total': valor_total,
        'metodos_pagamento': metodos_pagamento,
        'produtos_mais_vendidos': top_produtos,
        'vendas': [venda.to_dict() for venda in vendas]
    }), 200 