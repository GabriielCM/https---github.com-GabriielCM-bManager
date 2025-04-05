from flask import Blueprint, request, jsonify
from marshmallow import Schema, fields, validate, ValidationError
from flask_jwt_extended import jwt_required, get_jwt
from app import db
from app.models.produto import Produto
from app.models.movimento_estoque import MovimentoEstoque
from sqlalchemy import func

produtos_bp = Blueprint('produtos', __name__)

class ProdutoSchema(Schema):
    codigo = fields.Str(allow_none=True)
    nome = fields.Str(required=True, validate=validate.Length(min=3, max=100))
    descricao = fields.Str(allow_none=True)
    categoria = fields.Str(allow_none=True)
    marca = fields.Str(allow_none=True)
    unidade_medida = fields.Str(allow_none=True)
    preco = fields.Float(required=True, validate=validate.Range(min=0))
    preco_custo = fields.Float(allow_none=True, validate=validate.Range(min=0))
    quantidade_estoque = fields.Integer(default=0, validate=validate.Range(min=0))
    estoque_minimo = fields.Integer(default=5, validate=validate.Range(min=0))
    imagem_url = fields.Str(allow_none=True)

class MovimentoEstoqueSchema(Schema):
    tipo = fields.Str(required=True, validate=validate.OneOf(['entrada', 'saida', 'ajuste']))
    quantidade = fields.Integer(required=True, validate=validate.Range(min=1))
    motivo = fields.Str(allow_none=True)

# Verificação de permissão (Admin)
def verificar_permissao_admin():
    jwt_data = get_jwt()
    return jwt_data.get('perfil') == 'admin'

@produtos_bp.route('/', methods=['GET'])
def listar_produtos():
    # Parâmetros de consulta para filtragem e paginação
    busca = request.args.get('busca', '')
    categoria = request.args.get('categoria', '')
    estoque_baixo = request.args.get('estoque_baixo') == 'true'
    pagina = int(request.args.get('pagina', 1))
    por_pagina = int(request.args.get('por_pagina', 10))
    
    # Iniciar consulta
    query = Produto.query
    
    # Aplicar filtros
    if busca:
        query = query.filter(db.or_(
            Produto.nome.ilike(f'%{busca}%'),
            Produto.descricao.ilike(f'%{busca}%'),
            Produto.codigo.ilike(f'%{busca}%'),
            Produto.marca.ilike(f'%{busca}%')
        ))
    
    if categoria:
        query = query.filter(Produto.categoria == categoria)
    
    if estoque_baixo:
        query = query.filter(Produto.quantidade_estoque <= Produto.estoque_minimo)
    
    # Ordenar e paginar resultados
    query = query.order_by(Produto.nome.asc())
    resultados = query.paginate(page=pagina, per_page=por_pagina)
    
    return jsonify({
        'total': resultados.total,
        'paginas': resultados.pages,
        'pagina_atual': pagina,
        'por_pagina': por_pagina,
        'items': [produto.to_dict() for produto in resultados.items]
    }), 200

@produtos_bp.route('/categorias', methods=['GET'])
def listar_categorias():
    categorias = db.session.query(Produto.categoria).filter(Produto.categoria != None).distinct().all()
    return jsonify([c[0] for c in categorias if c[0]]), 200

@produtos_bp.route('/<int:id>', methods=['GET'])
def obter_produto(id):
    produto = Produto.query.get(id)
    
    if not produto:
        return jsonify({"erro": "Produto não encontrado"}), 404
    
    return jsonify(produto.to_dict()), 200

@produtos_bp.route('/', methods=['POST'])
def criar_produto():
    # Verificar permissão (apenas admin pode criar produtos)
    # if not verificar_permissao_admin():
    #     return jsonify({"erro": "Permissão negada"}), 403
    
    try:
        data = ProdutoSchema().load(request.json)
    except ValidationError as err:
        return jsonify({"erro": "Dados inválidos", "detalhes": err.messages}), 400
    
    # Verificar se nome já existe
    produto_existente = Produto.query.filter_by(nome=data['nome']).first()
    if produto_existente:
        return jsonify({"erro": "Nome de produto já cadastrado"}), 400
    
    # Verificar se código já existe, se fornecido
    if data.get('codigo'):
        codigo_existente = Produto.query.filter_by(codigo=data['codigo']).first()
        if codigo_existente:
            return jsonify({"erro": "Código de produto já cadastrado"}), 400
    
    # Criar novo produto
    produto = Produto(
        codigo=data.get('codigo'),
        nome=data['nome'],
        descricao=data.get('descricao'),
        categoria=data.get('categoria'),
        marca=data.get('marca'),
        unidade_medida=data.get('unidade_medida', 'un'),
        preco=data['preco'],
        preco_custo=data.get('preco_custo'),
        quantidade_estoque=data.get('quantidade_estoque', 0),
        estoque_minimo=data.get('estoque_minimo', 5),
        imagem_url=data.get('imagem_url')
    )
    
    # Primeiro, adiciona e comita o produto para ter um ID
    db.session.add(produto)
    db.session.commit()
    
    # Depois registra o movimento de estoque inicial, se necessário
    if produto.quantidade_estoque > 0:
        movimento = MovimentoEstoque(
            produto_id=produto.id,
            tipo='entrada',
            quantidade=produto.quantidade_estoque,
            motivo='Estoque inicial'
        )
        db.session.add(movimento)
        db.session.commit()
    
    return jsonify({
        "mensagem": "Produto criado com sucesso",
        "produto": produto.to_dict()
    }), 201

@produtos_bp.route('/<int:id>', methods=['PUT'])
def atualizar_produto(id):
    # Verificar permissão (apenas admin pode atualizar produtos)
    # if not verificar_permissao_admin():
    #     return jsonify({"erro": "Permissão negada"}), 403
    
    produto = Produto.query.get(id)
    
    if not produto:
        return jsonify({"erro": "Produto não encontrado"}), 404
    
    try:
        data = ProdutoSchema(partial=True).load(request.json)
    except ValidationError as err:
        return jsonify({"erro": "Dados inválidos", "detalhes": err.messages}), 400
    
    # Verificar se nome já existe (excluindo o produto atual)
    if 'nome' in data and data['nome'] != produto.nome:
        produto_existente = Produto.query.filter_by(nome=data['nome']).first()
        if produto_existente:
            return jsonify({"erro": "Nome de produto já cadastrado"}), 400
    
    # Verificar se código já existe (excluindo o produto atual)
    if 'codigo' in data and data['codigo'] != produto.codigo:
        codigo_existente = Produto.query.filter_by(codigo=data['codigo']).first()
        if codigo_existente:
            return jsonify({"erro": "Código de produto já cadastrado"}), 400
    
    # Verificar se está atualizando o estoque
    estoque_anterior = produto.quantidade_estoque
    
    # Atualizar produto
    for campo, valor in data.items():
        if campo != 'quantidade_estoque':  # Estoque tratado separadamente
            setattr(produto, campo, valor)
    
    # Se estiver atualizando o estoque, registrar movimento
    if 'quantidade_estoque' in data:
        quantidade_ajuste = data['quantidade_estoque']
        diferenca = quantidade_ajuste - estoque_anterior
        
        produto.quantidade_estoque = quantidade_ajuste
        
        if diferenca != 0:
            tipo = 'ajuste'
            movimento = MovimentoEstoque(
                produto_id=produto.id,
                tipo=tipo,
                quantidade=abs(diferenca),
                motivo=f'Ajuste manual de estoque: {estoque_anterior} para {quantidade_ajuste}'
            )
            db.session.add(movimento)
    
    db.session.commit()
    
    return jsonify({
        "mensagem": "Produto atualizado com sucesso",
        "produto": produto.to_dict()
    }), 200

@produtos_bp.route('/<int:id>', methods=['DELETE'])
def remover_produto(id):
    # Verificar permissão (apenas admin pode remover produtos)
    # if not verificar_permissao_admin():
    #     return jsonify({"erro": "Permissão negada"}), 403
    
    produto = Produto.query.get(id)
    
    if not produto:
        return jsonify({"erro": "Produto não encontrado"}), 404
    
    # Verificar dependências (vendas)
    if produto.venda_itens:
        return jsonify({
            "erro": "Produto não pode ser removido pois está associado a vendas",
            "detalhes": {
                "vendas": len(produto.venda_itens)
            }
        }), 400
    
    # Remover todos os movimentos de estoque
    for movimento in produto.movimentos_estoque:
        db.session.delete(movimento)
    
    db.session.delete(produto)
    db.session.commit()
    
    return jsonify({"mensagem": "Produto removido com sucesso"}), 200

@produtos_bp.route('/<int:id>/estoque', methods=['POST'])
def movimentar_estoque(id):
    # Verificar permissão (apenas admin pode movimentar estoque)
    # if not verificar_permissao_admin():
    #     return jsonify({"erro": "Permissão negada"}), 403
    
    produto = Produto.query.get(id)
    
    if not produto:
        return jsonify({"erro": "Produto não encontrado"}), 404
    
    try:
        data = MovimentoEstoqueSchema().load(request.json)
    except ValidationError as err:
        return jsonify({"erro": "Dados inválidos", "detalhes": err.messages}), 400
    
    tipo = data['tipo']
    quantidade = data['quantidade']
    motivo = data.get('motivo', '')
    
    try:
        # Atualizar estoque do produto
        estoque_anterior = produto.quantidade_estoque
        produto.atualizar_estoque(quantidade, tipo)
        
        # Registrar movimento de estoque
        movimento = MovimentoEstoque(
            produto_id=produto.id,
            tipo=tipo,
            quantidade=quantidade,
            motivo=motivo
        )
        
        db.session.add(movimento)
        db.session.commit()
        
        return jsonify({
            "mensagem": f"Estoque de '{produto.nome}' atualizado com sucesso",
            "produto": produto.to_dict(),
            "movimento": {
                "tipo": tipo,
                "quantidade": quantidade,
                "estoque_anterior": estoque_anterior,
                "estoque_atual": produto.quantidade_estoque
            }
        }), 200
        
    except ValueError as e:
        return jsonify({"erro": str(e)}), 400

@produtos_bp.route('/<int:id>/movimentos', methods=['GET'])
def listar_movimentos(id):
    # Verificar permissão (apenas admin pode ver movimentos)
    # if not verificar_permissao_admin():
    #     return jsonify({"erro": "Permissão negada"}), 403
    
    produto = Produto.query.get(id)
    
    if not produto:
        return jsonify({"erro": "Produto não encontrado"}), 404
    
    movimentos = MovimentoEstoque.query.filter_by(produto_id=id).\
        order_by(MovimentoEstoque.created_at.desc()).all()
    
    return jsonify([{
        'id': m.id,
        'tipo': m.tipo,
        'quantidade': m.quantidade,
        'motivo': m.motivo,
        'data': m.created_at
    } for m in movimentos]), 200

@produtos_bp.route('/estoque-baixo', methods=['GET'])
def produtos_estoque_baixo():
    # Consultar produtos com estoque abaixo do mínimo
    produtos = Produto.query.filter(
        Produto.quantidade_estoque <= Produto.estoque_minimo
    ).order_by(
        (Produto.quantidade_estoque / Produto.estoque_minimo).asc()
    ).all()
    
    return jsonify([produto.to_dict() for produto in produtos]), 200

@produtos_bp.route('/mais-vendidos', methods=['GET'])
def produtos_mais_vendidos():
    # Versão simplificada que não depende de VendaItem
    # Retorna apenas os produtos atuais ordenados por estoque
    try:
        limite = int(request.args.get('limite', 5))
        
        # Ordenar produtos pelo estoque (presumindo que os mais vendidos têm menos estoque)
        produtos = Produto.query.order_by(Produto.quantidade_estoque.asc()).limit(limite).all()
        
        return jsonify([{
            'id': p.id,
            'nome': p.nome,
            'total_vendido': 0  # Valor fictício já que não temos dados reais de vendas
        } for p in produtos]), 200
    except Exception as e:
        return jsonify({"erro": str(e)}), 500 