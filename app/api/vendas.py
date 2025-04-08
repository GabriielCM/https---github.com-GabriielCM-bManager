from flask import Blueprint, request, jsonify
from marshmallow import Schema, fields, validate, ValidationError
from flask_jwt_extended import jwt_required, get_jwt
from app import db
from app.models.venda import Venda, VendaItem
from app.models.produto import Produto
from app.models.cliente import Cliente
from app.models.barbeiro import Barbeiro
from app.models.pagamento import Pagamento
from datetime import datetime, timedelta

vendas_bp = Blueprint('vendas', __name__)

class ItemVendaSchema(Schema):
    produto_id = fields.Integer(required=True)
    quantidade = fields.Integer(required=True, validate=validate.Range(min=1))
    valor_unitario = fields.Float(required=True, validate=validate.Range(min=0))
    percentual_desconto = fields.Float(required=False, validate=validate.Range(min=0, max=100), default=0.0)

class VendaSchema(Schema):
    cliente_id = fields.Integer(allow_none=True)
    barbeiro_id = fields.Integer(allow_none=True)
    itens = fields.List(fields.Nested(ItemVendaSchema), required=True, validate=validate.Length(min=1))
    valor_desconto = fields.Float(required=False, validate=validate.Range(min=0), default=0.0)
    percentual_imposto = fields.Float(required=False, validate=validate.Range(min=0, max=100), default=0.0)
    observacao = fields.String(required=False, allow_none=True)

class PagamentoSchema(Schema):
    valor = fields.Float(required=True, validate=validate.Range(min=0.01))
    metodo = fields.Str(required=True, validate=validate.OneOf(['dinheiro', 'cartao_credito', 'cartao_debito', 'pix']))

# Flag para desenvolvimento (desabilitar autenticação)
DEV_MODE = True

def jwt_opcional(route_function):
    """Decorador que torna o JWT opcional em ambiente de desenvolvimento"""
    if DEV_MODE:
        return route_function
    else:
        return jwt_required()(route_function)

# Verificação de permissão (Admin ou Barbeiro)
def verificar_permissao_venda():
    if DEV_MODE:
        return True
    
    try:
        jwt_data = get_jwt()
        perfil = jwt_data.get('perfil')
        return perfil in ['admin', 'barbeiro']
    except:
        # Se ocorrer erro ao obter o JWT em desenvolvimento, permitir acesso
        return True

@vendas_bp.route('/', methods=['GET'])
@jwt_opcional
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
@jwt_opcional
def obter_venda(id):
    # Verificar permissão
    if not verificar_permissao_venda():
        return jsonify({"erro": "Permissão negada"}), 403
    
    venda = Venda.query.get(id)
    
    if not venda:
        return jsonify({"erro": "Venda não encontrada"}), 404
    
    return jsonify(venda.to_dict()), 200

@vendas_bp.route('/', methods=['POST'])
@jwt_opcional
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
    
    # Verificar se barbeiro existe (se fornecido)
    barbeiro_id = data.get('barbeiro_id')
    if barbeiro_id:
        barbeiro = Barbeiro.query.get(barbeiro_id)
        if not barbeiro:
            return jsonify({"erro": "Barbeiro não encontrado"}), 404
    
    # Criar venda
    venda = Venda(
        cliente_id=cliente_id,
        barbeiro_id=barbeiro_id,
        data_hora=datetime.utcnow(),
        valor_desconto=data.get('valor_desconto', 0.0),
        percentual_imposto=data.get('percentual_imposto', 0.0),
        observacao=data.get('observacao'),
        status='finalizada'
    )
    
    db.session.add(venda)
    db.session.flush()  # Obter ID da venda sem commit
    
    # Adicionar itens à venda
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
            valor_unitario=valor_unitario,
            percentual_desconto=item_data.get('percentual_desconto', 0.0)
        )
        
        db.session.add(item)
        
        # Atualizar estoque do produto
        try:
            produto.atualizar_estoque(item_data['quantidade'], 'saida')
        except ValueError as e:
            db.session.rollback()
            return jsonify({"erro": str(e)}), 400
    
    # Calcular valor total da venda (aplicando desconto e imposto)
    venda.calcular_total()
    
    db.session.commit()
    
    return jsonify({
        "mensagem": "Venda criada com sucesso",
        "venda": venda.to_dict()
    }), 201

@vendas_bp.route('/<int:id>/pagamento', methods=['POST'])
@jwt_opcional
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
        tipo='pagamento',
        valor=data['valor'],
        forma_pagamento=data['metodo'],
        status='confirmado',
        descricao=f'Pagamento de venda #{venda.id}'
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
@jwt_opcional
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
@jwt_opcional
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
        metodo = pagamento.forma_pagamento
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

@vendas_bp.route('/relatorio/resumo', methods=['GET'])
@jwt_opcional
def relatorio_resumo():
    # Verificar permissão
    if not verificar_permissao_venda():
        return jsonify({"erro": "Permissão negada"}), 403
    
    # Obter datas para os cálculos
    hoje = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    inicio_semana = hoje - timedelta(days=hoje.weekday())
    inicio_mes = hoje.replace(day=1)
    
    # Vendas de hoje
    vendas_hoje = Venda.query.filter(
        Venda.data_hora >= hoje,
        Venda.status == 'finalizada'
    ).all()
    
    # Vendas da semana
    vendas_semana = Venda.query.filter(
        Venda.data_hora >= inicio_semana,
        Venda.status == 'finalizada'
    ).all()
    
    # Vendas do mês
    vendas_mes = Venda.query.filter(
        Venda.data_hora >= inicio_mes,
        Venda.status == 'finalizada'
    ).all()
    
    # Cálculo do ticket médio atual (mês atual)
    total_mes = sum(venda.valor_total for venda in vendas_mes)
    ticket_medio_atual = total_mes / len(vendas_mes) if vendas_mes else 0
    
    # Cálculo do ticket médio do mês anterior para comparação
    mes_anterior_inicio = (inicio_mes - timedelta(days=1)).replace(day=1)
    mes_anterior_fim = inicio_mes - timedelta(days=1)
    
    vendas_mes_anterior = Venda.query.filter(
        Venda.data_hora >= mes_anterior_inicio,
        Venda.data_hora <= mes_anterior_fim,
        Venda.status == 'finalizada'
    ).all()
    
    total_mes_anterior = sum(venda.valor_total for venda in vendas_mes_anterior)
    ticket_medio_anterior = total_mes_anterior / len(vendas_mes_anterior) if vendas_mes_anterior else 0
    
    # Cálculo da variação percentual
    variacao = 0
    if ticket_medio_anterior > 0:
        variacao = ((ticket_medio_atual - ticket_medio_anterior) / ticket_medio_anterior) * 100
    
    return jsonify({
        "hoje": {
            "total": len(vendas_hoje),
            "valor": sum(venda.valor_total for venda in vendas_hoje)
        },
        "semana": {
            "total": len(vendas_semana),
            "valor": sum(venda.valor_total for venda in vendas_semana)
        },
        "mes": {
            "total": len(vendas_mes),
            "valor": sum(venda.valor_total for venda in vendas_mes)
        },
        "ticket_medio": ticket_medio_atual,
        "ticket_variacao": variacao
    }), 200

@vendas_bp.route('/relatorio/grafico', methods=['GET'])
@jwt_opcional
def relatorio_grafico():
    # Verificar permissão
    if not verificar_permissao_venda():
        return jsonify({"erro": "Permissão negada"}), 403
    
    # Obter período (dias) do parâmetro da requisição
    periodo = request.args.get('periodo', '30')
    try:
        dias = int(periodo)
    except ValueError:
        return jsonify({"erro": "Período inválido"}), 400
    
    # Limitar a 365 dias
    dias = min(dias, 365)
    
    # Calcular data de início
    data_inicio = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=dias-1)
    
    # Obter vendas no período
    vendas = Venda.query.filter(
        Venda.data_hora >= data_inicio,
        Venda.status == 'finalizada'
    ).order_by(Venda.data_hora).all()
    
    # Criar dicionário para armazenar dados por dia
    dados_por_dia = {}
    
    # Inicializar todos os dias do período com valor zero
    for i in range(dias):
        data = data_inicio + timedelta(days=i)
        data_str = data.strftime('%Y-%m-%d')
        dados_por_dia[data_str] = 0
    
    # Somar valores de vendas por dia
    for venda in vendas:
        data_str = venda.data_hora.strftime('%Y-%m-%d')
        dados_por_dia[data_str] += venda.valor_total
    
    # Formatar datas para exibição dependendo do período
    labels = []
    valores = []
    
    for data_str, valor in dados_por_dia.items():
        data = datetime.strptime(data_str, '%Y-%m-%d')
        
        if dias <= 7:  # Para períodos curtos, exibir dia da semana
            label = data.strftime('%a')
        elif dias <= 31:  # Para mês, exibir dia/mês
            label = data.strftime('%d/%m')
        else:  # Para períodos longos, exibir mês
            label = data.strftime('%b/%y')
        
        labels.append(label)
        valores.append(round(valor, 2))
    
    return jsonify({
        "labels": labels,
        "valores": valores
    }), 200

@vendas_bp.route('/relatorio/pagamentos', methods=['GET'])
@jwt_opcional
def relatorio_pagamentos():
    # Verificar permissão
    if not verificar_permissao_venda():
        return jsonify({"erro": "Permissão negada"}), 403
    
    # Definir período: último mês
    data_inicio = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    # Obter todos os pagamentos no período
    pagamentos = Pagamento.query.join(Venda).filter(
        Venda.data_hora >= data_inicio,
        Venda.status == 'finalizada'
    ).all()
    
    # Contagem por método de pagamento
    metodos = {
        'dinheiro': 0,
        'cartao_credito': 0,
        'cartao_debito': 0,
        'pix': 0
    }
    
    for pagamento in pagamentos:
        if pagamento.forma_pagamento in metodos:
            metodos[pagamento.forma_pagamento] += pagamento.valor
    
    # Calcular percentuais
    total = sum(metodos.values())
    percentuais = {}
    
    for metodo, valor in metodos.items():
        percentuais[metodo] = round((valor / total * 100) if total > 0 else 0, 1)
    
    return jsonify({
        "valores": metodos,
        "percentuais": percentuais
    }), 200

@vendas_bp.route('/exportar', methods=['GET'])
@jwt_opcional
def exportar_vendas():
    # Verificar permissão
    if not verificar_permissao_venda():
        return jsonify({"erro": "Permissão negada"}), 403
    
    # Parâmetros de consulta para filtragem
    data_inicio = request.args.get('data_inicio')
    data_fim = request.args.get('data_fim')
    status = request.args.get('status')
    
    # Construir consulta com filtros
    query = Venda.query
    
    if data_inicio:
        data_inicio = datetime.fromisoformat(data_inicio)
        query = query.filter(Venda.data_hora >= data_inicio)
    
    if data_fim:
        data_fim = datetime.fromisoformat(data_fim)
        query = query.filter(Venda.data_hora <= data_fim)
    
    if status and status != 'todos':
        query = query.filter(Venda.status == status)
    
    # Ordenar por data (mais recente primeiro)
    query = query.order_by(Venda.data_hora.desc())
    
    # Obter todas as vendas (sem paginação)
    vendas = query.all()
    
    # Retornar dados para download
    return jsonify({
        'vendas': [venda.to_dict() for venda in vendas]
    }), 200 