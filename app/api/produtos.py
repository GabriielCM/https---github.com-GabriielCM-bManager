from flask import Blueprint, request, jsonify
from marshmallow import Schema, fields, validate, ValidationError
from flask_jwt_extended import jwt_required, get_jwt
from app import db
from app.models.produto import Produto
from app.models.movimento_estoque import MovimentoEstoque

produtos_bp = Blueprint('produtos', __name__)

class ProdutoSchema(Schema):
    nome = fields.Str(required=True, validate=validate.Length(min=3, max=100))
    descricao = fields.Str(allow_none=True)
    preco = fields.Float(required=True, validate=validate.Range(min=0))
    quantidade_estoque = fields.Integer(default=0, validate=validate.Range(min=0))

class MovimentoEstoqueSchema(Schema):
    tipo = fields.Str(required=True, validate=validate.OneOf(['entrada', 'saida', 'ajuste']))
    quantidade = fields.Integer(required=True, validate=validate.Range(min=1))
    motivo = fields.Str(allow_none=True)

# Verificação de permissão (Admin)
def verificar_permissao_admin():
    jwt_data = get_jwt()
    return jwt_data.get('perfil') == 'admin'

@produtos_bp.route('/', methods=['GET'])
@jwt_required()
def listar_produtos():
    # Parâmetros de consulta para filtragem e paginação
    busca = request.args.get('busca', '')
    pagina = int(request.args.get('pagina', 1))
    por_pagina = int(request.args.get('por_pagina', 10))
    
    # Iniciar consulta
    query = Produto.query
    
    # Aplicar filtro de busca se fornecido
    if busca:
        query = query.filter(db.or_(
            Produto.nome.ilike(f'%{busca}%'),
            Produto.descricao.ilike(f'%{busca}%')
        ))
    
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

@produtos_bp.route('/<int:id>', methods=['GET'])
@jwt_required()
def obter_produto(id):
    produto = Produto.query.get(id)
    
    if not produto:
        return jsonify({"erro": "Produto não encontrado"}), 404
    
    return jsonify(produto.to_dict()), 200

@produtos_bp.route('/', methods=['POST'])
@jwt_required()
def criar_produto():
    # Verificar permissão (apenas admin pode criar produtos)
    if not verificar_permissao_admin():
        return jsonify({"erro": "Permissão negada"}), 403
    
    try:
        data = ProdutoSchema().load(request.json)
    except ValidationError as err:
        return jsonify({"erro": "Dados inválidos", "detalhes": err.messages}), 400
    
    # Verificar se nome já existe
    produto_existente = Produto.query.filter_by(nome=data['nome']).first()
    if produto_existente:
        return jsonify({"erro": "Nome de produto já cadastrado"}), 400
    
    # Criar novo produto
    produto = Produto(
        nome=data['nome'],
        descricao=data.get('descricao'),
        preco=data['preco'],
        quantidade_estoque=data.get('quantidade_estoque', 0)
    )
    
    db.session.add(produto)
    
    # Registrar movimento de estoque inicial se houver quantidade
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
@jwt_required()
def atualizar_produto(id):
    # Verificar permissão (apenas admin pode atualizar produtos)
    if not verificar_permissao_admin():
        return jsonify({"erro": "Permissão negada"}), 403
    
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
    
    # Verificar se está atualizando o estoque
    estoque_anterior = produto.quantidade_estoque
    
    # Atualizar produto
    if 'nome' in data:
        produto.nome = data['nome']
    if 'descricao' in data:
        produto.descricao = data['descricao']
    if 'preco' in data:
        produto.preco = data['preco']
    if 'quantidade_estoque' in data:
        # Registrar movimento de ajuste de estoque
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
@jwt_required()
def remover_produto(id):
    # Verificar permissão (apenas admin pode remover produtos)
    if not verificar_permissao_admin():
        return jsonify({"erro": "Permissão negada"}), 403
    
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
@jwt_required()
def movimentar_estoque(id):
    # Verificar permissão (apenas admin pode movimentar estoque)
    if not verificar_permissao_admin():
        return jsonify({"erro": "Permissão negada"}), 403
    
    produto = Produto.query.get(id)
    
    if not produto:
        return jsonify({"erro": "Produto não encontrado"}), 404
    
    try:
        data = MovimentoEstoqueSchema().load(request.json)
    except ValidationError as err:
        return jsonify({"erro": "Dados inválidos", "detalhes": err.messages}), 400
    
    # Atualizar estoque e registrar movimento
    tipo = data['tipo']
    quantidade = data['quantidade']
    motivo = data.get('motivo', '')
    
    try:
        # Atualizar estoque do produto
        produto.atualizar_estoque(quantidade, tipo)
        
        # Registrar movimento
        movimento = MovimentoEstoque(
            produto_id=produto.id,
            tipo=tipo,
            quantidade=quantidade,
            motivo=motivo
        )
        
        db.session.add(movimento)
        db.session.commit()
        
        return jsonify({
            "mensagem": f"Estoque atualizado com sucesso. {tipo.capitalize()} de {quantidade} unidades.",
            "produto": produto.to_dict(),
            "movimento": movimento.to_dict()
        }), 200
        
    except ValueError as e:
        return jsonify({"erro": str(e)}), 400

@produtos_bp.route('/<int:id>/movimentos', methods=['GET'])
@jwt_required()
def listar_movimentos(id):
    # Verificar permissão (apenas admin pode ver movimentos)
    if not verificar_permissao_admin():
        return jsonify({"erro": "Permissão negada"}), 403
    
    produto = Produto.query.get(id)
    
    if not produto:
        return jsonify({"erro": "Produto não encontrado"}), 404
    
    # Obter movimentos de estoque ordenados por data
    movimentos = MovimentoEstoque.query.filter_by(produto_id=id)\
        .order_by(MovimentoEstoque.created_at.desc()).all()
    
    return jsonify([movimento.to_dict() for movimento in movimentos]), 200

@produtos_bp.route('/estoque-baixo', methods=['GET'])
@jwt_required()
def produtos_estoque_baixo():
    # Verificar permissão (apenas admin pode ver relatório de estoque baixo)
    if not verificar_permissao_admin():
        return jsonify({"erro": "Permissão negada"}), 403
    
    # Limite de estoque considerado baixo
    limite = int(request.args.get('limite', 5))
    
    # Buscar produtos com estoque abaixo do limite
    produtos = Produto.query.filter(Produto.quantidade_estoque < limite).all()
    
    return jsonify([produto.to_dict() for produto in produtos]), 200 