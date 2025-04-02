from flask import Blueprint, request, jsonify
from marshmallow import Schema, fields, validate, ValidationError
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from sqlalchemy import and_, or_, func
from app import db
from app.models.agendamento import Agendamento, AgendamentoServico
from app.models.servico import Servico
from app.models.cliente import Cliente
from app.models.barbeiro import Barbeiro
from app.models.usuario import Usuario
from datetime import datetime, timedelta

agendamentos_bp = Blueprint('agendamentos', __name__)

class ServicoIdSchema(Schema):
    servico_id = fields.Integer(required=True)

class AgendamentoSchema(Schema):
    cliente_id = fields.Integer(required=True)
    barbeiro_id = fields.Integer(required=True)
    data_hora_inicio = fields.DateTime(required=True)
    servicos = fields.List(fields.Nested(ServicoIdSchema), required=True, validate=validate.Length(min=1))
    observacoes = fields.Str(allow_none=True)

# Verificações de permissão
def verificar_permissao_admin():
    jwt_data = get_jwt()
    return jwt_data.get('perfil') == 'admin'

def verificar_acesso_barbeiro(barbeiro_id):
    jwt_data = get_jwt()
    usuario_id = get_jwt_identity()
    
    if jwt_data.get('perfil') == 'admin':
        return True
    
    if jwt_data.get('perfil') == 'barbeiro':
        barbeiro = Barbeiro.query.filter_by(usuario_id=usuario_id).first()
        return barbeiro and barbeiro.id == barbeiro_id
    
    return False

def verificar_acesso_cliente(cliente_id):
    jwt_data = get_jwt()
    usuario_id = get_jwt_identity()
    
    if jwt_data.get('perfil') == 'admin':
        return True
    
    if jwt_data.get('perfil') == 'cliente':
        cliente = Cliente.query.filter_by(id=cliente_id).first()
        usuario = Usuario.query.filter_by(id=usuario_id, email=cliente.email).first()
        return usuario is not None
    
    return False

@agendamentos_bp.route('/', methods=['GET'])
@jwt_required()
def listar_agendamentos():
    # Parâmetros de consulta para filtragem e paginação
    status = request.args.get('status')
    data_inicio = request.args.get('data_inicio')
    data_fim = request.args.get('data_fim')
    barbeiro_id = request.args.get('barbeiro_id')
    cliente_id = request.args.get('cliente_id')
    
    pagina = int(request.args.get('pagina', 1))
    por_pagina = int(request.args.get('por_pagina', 10))
    
    # Construir consulta com filtros
    query = Agendamento.query
    
    if status:
        query = query.filter(Agendamento.status == status)
    
    if data_inicio:
        data_inicio = datetime.fromisoformat(data_inicio)
        query = query.filter(Agendamento.data_hora_inicio >= data_inicio)
    
    if data_fim:
        data_fim = datetime.fromisoformat(data_fim)
        query = query.filter(Agendamento.data_hora_inicio <= data_fim)
    
    if barbeiro_id:
        query = query.filter(Agendamento.barbeiro_id == barbeiro_id)
    
    if cliente_id:
        query = query.filter(Agendamento.cliente_id == cliente_id)
    
    # Aplicar verificação de permissão
    jwt_data = get_jwt()
    perfil = jwt_data.get('perfil')
    usuario_id = get_jwt_identity()
    
    if perfil == 'barbeiro':
        barbeiro = Barbeiro.query.filter_by(usuario_id=usuario_id).first()
        if barbeiro:
            query = query.filter(Agendamento.barbeiro_id == barbeiro.id)
        else:
            return jsonify({"erro": "Barbeiro não encontrado"}), 404
    
    elif perfil == 'cliente':
        # Encontrar cliente pelo email do usuário
        usuario = Usuario.query.get(usuario_id)
        if usuario and usuario.email:
            cliente = Cliente.query.filter_by(email=usuario.email).first()
            if cliente:
                query = query.filter(Agendamento.cliente_id == cliente.id)
            else:
                return jsonify({"erro": "Cliente não encontrado"}), 404
        else:
            return jsonify({"erro": "Cliente não encontrado"}), 404
    
    # Ordenar e paginar resultados
    query = query.order_by(Agendamento.data_hora_inicio.desc())
    resultados = query.paginate(page=pagina, per_page=por_pagina)
    
    return jsonify({
        'total': resultados.total,
        'paginas': resultados.pages,
        'pagina_atual': pagina,
        'por_pagina': por_pagina,
        'items': [agendamento.to_dict() for agendamento in resultados.items]
    }), 200

@agendamentos_bp.route('/<int:id>', methods=['GET'])
@jwt_required()
def obter_agendamento(id):
    agendamento = Agendamento.query.get(id)
    
    if not agendamento:
        return jsonify({"erro": "Agendamento não encontrado"}), 404
    
    # Verificar permissão
    jwt_data = get_jwt()
    perfil = jwt_data.get('perfil')
    usuario_id = get_jwt_identity()
    
    if perfil == 'admin':
        # Admin tem acesso a todos os agendamentos
        pass
    elif perfil == 'barbeiro':
        barbeiro = Barbeiro.query.filter_by(usuario_id=usuario_id).first()
        if not barbeiro or barbeiro.id != agendamento.barbeiro_id:
            return jsonify({"erro": "Acesso negado"}), 403
    elif perfil == 'cliente':
        # Verificar se o agendamento pertence ao cliente
        usuario = Usuario.query.get(usuario_id)
        if not usuario or not usuario.email:
            return jsonify({"erro": "Acesso negado"}), 403
        
        cliente = Cliente.query.filter_by(email=usuario.email).first()
        if not cliente or cliente.id != agendamento.cliente_id:
            return jsonify({"erro": "Acesso negado"}), 403
    
    return jsonify(agendamento.to_dict()), 200

@agendamentos_bp.route('/', methods=['POST'])
@jwt_required()
def criar_agendamento():
    try:
        data = AgendamentoSchema().load(request.json)
    except ValidationError as err:
        return jsonify({"erro": "Dados inválidos", "detalhes": err.messages}), 400
    
    # Verificações
    cliente = Cliente.query.get(data['cliente_id'])
    if not cliente:
        return jsonify({"erro": "Cliente não encontrado"}), 404
    
    barbeiro = Barbeiro.query.get(data['barbeiro_id'])
    if not barbeiro:
        return jsonify({"erro": "Barbeiro não encontrado"}), 404
    
    if not barbeiro.disponivel:
        return jsonify({"erro": "Barbeiro não está disponível"}), 400
    
    # Verificar permissão
    jwt_data = get_jwt()
    perfil = jwt_data.get('perfil')
    usuario_id = get_jwt_identity()
    
    if perfil == 'cliente':
        # Cliente só pode criar agendamento para si mesmo
        usuario = Usuario.query.get(usuario_id)
        if not usuario or not usuario.email:
            return jsonify({"erro": "Acesso negado"}), 403
        
        cliente_do_usuario = Cliente.query.filter_by(email=usuario.email).first()
        if not cliente_do_usuario or cliente_do_usuario.id != cliente.id:
            return jsonify({"erro": "Acesso negado"}), 403
    
    # Calcular duração com base nos serviços
    duracao_total = 0
    for servico_item in data['servicos']:
        servico = Servico.query.get(servico_item['servico_id'])
        if not servico:
            return jsonify({"erro": f"Serviço ID {servico_item['servico_id']} não encontrado"}), 404
        
        duracao_total += servico.duracao_estimada_min
    
    data_hora_inicio = data['data_hora_inicio']
    data_hora_fim = data_hora_inicio + timedelta(minutes=duracao_total)
    
    # Verificar disponibilidade
    if not Agendamento.verificar_disponibilidade(
        data['barbeiro_id'], data_hora_inicio, data_hora_fim
    ):
        return jsonify({"erro": "Horário não disponível para o barbeiro"}), 400
    
    # Criar agendamento
    agendamento = Agendamento(
        cliente_id=data['cliente_id'],
        barbeiro_id=data['barbeiro_id'],
        data_hora_inicio=data_hora_inicio,
        data_hora_fim=data_hora_fim,
        status='pendente',
        observacoes=data.get('observacoes')
    )
    
    db.session.add(agendamento)
    db.session.flush()  # Obter ID do agendamento sem commit
    
    # Adicionar serviços ao agendamento
    for servico_item in data['servicos']:
        agendamento_servico = AgendamentoServico(
            agendamento_id=agendamento.id,
            servico_id=servico_item['servico_id']
        )
        db.session.add(agendamento_servico)
    
    db.session.commit()
    
    return jsonify({
        "mensagem": "Agendamento criado com sucesso",
        "agendamento": agendamento.to_dict()
    }), 201

@agendamentos_bp.route('/<int:id>', methods=['PUT'])
@jwt_required()
def atualizar_agendamento(id):
    agendamento = Agendamento.query.get(id)
    
    if not agendamento:
        return jsonify({"erro": "Agendamento não encontrado"}), 404
    
    # Não permitir atualização de agendamentos concluídos ou cancelados
    if agendamento.status in ['concluido', 'cancelado']:
        return jsonify({"erro": f"Não é possível atualizar um agendamento com status '{agendamento.status}'"}), 400
    
    # Verificar permissão
    jwt_data = get_jwt()
    perfil = jwt_data.get('perfil')
    
    if perfil not in ['admin', 'barbeiro']:
        return jsonify({"erro": "Acesso negado"}), 403
    
    if perfil == 'barbeiro':
        usuario_id = get_jwt_identity()
        barbeiro = Barbeiro.query.filter_by(usuario_id=usuario_id).first()
        if not barbeiro or barbeiro.id != agendamento.barbeiro_id:
            return jsonify({"erro": "Acesso negado"}), 403
    
    # Atualizar apenas o status e observações
    data = request.json
    
    if 'status' in data:
        agendamento.status = data['status']
    
    if 'observacoes' in data:
        agendamento.observacoes = data['observacoes']
    
    db.session.commit()
    
    return jsonify({
        "mensagem": "Agendamento atualizado com sucesso",
        "agendamento": agendamento.to_dict()
    }), 200

@agendamentos_bp.route('/<int:id>', methods=['DELETE'])
@jwt_required()
def excluir_agendamento(id):
    # Verificar permissão (apenas admin pode remover clientes)
    jwt_data = get_jwt()
    if jwt_data.get('perfil') != 'admin':
        return jsonify({"erro": "Permissão negada"}), 403
    
    agendamento = Agendamento.query.get(id)
    
    if not agendamento:
        return jsonify({"erro": "Agendamento não encontrado"}), 404
    
    # Verificar dependências
    if agendamento.atendimento:
        return jsonify({"erro": "Agendamento não pode ser removido pois está associado a um atendimento"}), 400
    
    # Remover serviços associados
    for servico in agendamento.servicos:
        db.session.delete(servico)
    
    db.session.delete(agendamento)
    db.session.commit()
    
    return jsonify({"mensagem": "Agendamento removido com sucesso"}), 200

@agendamentos_bp.route('/cliente/<int:cliente_id>', methods=['GET'])
@jwt_required()
def agendamentos_cliente(cliente_id):
    # Verificar permissão
    if not verificar_acesso_cliente(cliente_id) and not verificar_permissao_admin():
        return jsonify({"erro": "Acesso negado"}), 403
    
    # Listar agendamentos do cliente
    agendamentos = Agendamento.query.filter_by(cliente_id=cliente_id)\
        .order_by(Agendamento.data_hora_inicio.desc()).all()
    
    return jsonify([agendamento.to_dict() for agendamento in agendamentos]), 200

@agendamentos_bp.route('/barbeiro/<int:barbeiro_id>', methods=['GET'])
@jwt_required()
def agendamentos_barbeiro(barbeiro_id):
    # Verificar permissão
    if not verificar_acesso_barbeiro(barbeiro_id) and not verificar_permissao_admin():
        return jsonify({"erro": "Acesso negado"}), 403
    
    # Parâmetros de consulta
    data = request.args.get('data')
    
    # Listar agendamentos do barbeiro
    query = Agendamento.query.filter_by(barbeiro_id=barbeiro_id)
    
    if data:
        # Converter data para datetime
        try:
            data_datetime = datetime.fromisoformat(data.split('T')[0])
            data_inicio = data_datetime.replace(hour=0, minute=0, second=0, microsecond=0)
            data_fim = data_datetime.replace(hour=23, minute=59, second=59, microsecond=999999)
            
            query = query.filter(
                Agendamento.data_hora_inicio >= data_inicio,
                Agendamento.data_hora_inicio <= data_fim
            )
        except ValueError:
            return jsonify({"erro": "Formato de data inválido. Use ISO 8601 (YYYY-MM-DD)"}), 400
    
    agendamentos = query.order_by(Agendamento.data_hora_inicio).all()
    
    return jsonify([agendamento.to_dict() for agendamento in agendamentos]), 200

@agendamentos_bp.route('/data/<data>', methods=['GET'])
@jwt_required()
def agendamentos_data(data):
    # Converter data para datetime
    try:
        data_datetime = datetime.fromisoformat(data.split('T')[0])
        data_inicio = data_datetime.replace(hour=0, minute=0, second=0, microsecond=0)
        data_fim = data_datetime.replace(hour=23, minute=59, second=59, microsecond=999999)
    except ValueError:
        return jsonify({"erro": "Formato de data inválido. Use ISO 8601 (YYYY-MM-DD)"}), 400
    
    # Filtrar por barbeiro (opcional)
    barbeiro_id = request.args.get('barbeiro_id')
    
    # Construir consulta
    query = Agendamento.query.filter(
        Agendamento.data_hora_inicio >= data_inicio,
        Agendamento.data_hora_inicio <= data_fim
    )
    
    if barbeiro_id:
        query = query.filter(Agendamento.barbeiro_id == barbeiro_id)
    
    # Aplicar verificação de permissão
    jwt_data = get_jwt()
    perfil = jwt_data.get('perfil')
    usuario_id = get_jwt_identity()
    
    if perfil == 'barbeiro' and not barbeiro_id:
        barbeiro = Barbeiro.query.filter_by(usuario_id=usuario_id).first()
        if barbeiro:
            query = query.filter(Agendamento.barbeiro_id == barbeiro.id)
        else:
            return jsonify({"erro": "Barbeiro não encontrado"}), 404
    
    # Ordenar resultados
    agendamentos = query.order_by(Agendamento.data_hora_inicio).all()
    
    return jsonify([agendamento.to_dict() for agendamento in agendamentos]), 200

@agendamentos_bp.route('/disponibilidade', methods=['GET'])
def verificar_disponibilidade():
    # Parâmetros
    barbeiro_id = request.args.get('barbeiro_id')
    data = request.args.get('data')
    
    if not barbeiro_id or not data:
        return jsonify({"erro": "Parâmetros barbeiro_id e data são obrigatórios"}), 400
    
    # Converter data para datetime
    try:
        data_datetime = datetime.fromisoformat(data.split('T')[0])
        data_inicio = data_datetime.replace(hour=0, minute=0, second=0, microsecond=0)
        data_fim = data_datetime.replace(hour=23, minute=59, second=59, microsecond=999999)
    except ValueError:
        return jsonify({"erro": "Formato de data inválido. Use ISO 8601 (YYYY-MM-DD)"}), 400
    
    # Verificar se o barbeiro existe e está disponível
    barbeiro = Barbeiro.query.get(barbeiro_id)
    if not barbeiro:
        return jsonify({"erro": "Barbeiro não encontrado"}), 404
    
    if not barbeiro.disponivel:
        return jsonify({
            "disponivel": False,
            "horarios_disponiveis": [],
            "mensagem": "Barbeiro não está disponível para agendamentos"
        }), 200
    
    # Obter todos os agendamentos do barbeiro na data
    agendamentos = Agendamento.query.filter(
        Agendamento.barbeiro_id == barbeiro_id,
        Agendamento.data_hora_inicio >= data_inicio,
        Agendamento.data_hora_inicio <= data_fim,
        Agendamento.status != 'cancelado'
    ).order_by(Agendamento.data_hora_inicio).all()
    
    # Horário de funcionamento (exemplo: 8h às 18h)
    hora_inicio_funcionamento = 8
    hora_fim_funcionamento = 18
    
    # Duração média de um serviço em minutos
    duracao_padrao = 30
    
    # Gerar horários disponíveis
    horarios_disponiveis = []
    horario_atual = data_inicio.replace(hour=hora_inicio_funcionamento, minute=0, second=0, microsecond=0)
    horario_fim = data_inicio.replace(hour=hora_fim_funcionamento, minute=0, second=0, microsecond=0)
    
    while horario_atual < horario_fim:
        # Verificar se o horário está disponível
        horario_fim_servico = horario_atual + timedelta(minutes=duracao_padrao)
        disponivel = True
        
        for agendamento in agendamentos:
            # Verificar se há sobreposição com algum agendamento existente
            if (horario_atual >= agendamento.data_hora_inicio and horario_atual < agendamento.data_hora_fim) or \
               (horario_fim_servico > agendamento.data_hora_inicio and horario_fim_servico <= agendamento.data_hora_fim) or \
               (horario_atual <= agendamento.data_hora_inicio and horario_fim_servico >= agendamento.data_hora_fim):
                disponivel = False
                break
        
        if disponivel:
            horarios_disponiveis.append(horario_atual.isoformat())
        
        # Avançar para o próximo horário (incrementos de 30min)
        horario_atual += timedelta(minutes=30)
    
    return jsonify({
        "disponivel": len(horarios_disponiveis) > 0,
        "horarios_disponiveis": horarios_disponiveis
    }), 200

@agendamentos_bp.route('/<int:id>/concluir', methods=['POST'])
@jwt_required()
def concluir_agendamento(id):
    agendamento = Agendamento.query.get(id)
    
    if not agendamento:
        return jsonify({"erro": "Agendamento não encontrado"}), 404
    
    # Verificar se o agendamento já foi concluído ou cancelado
    if agendamento.status == 'concluido':
        return jsonify({"erro": "Agendamento já foi concluído"}), 400
    
    if agendamento.status == 'cancelado':
        return jsonify({"erro": "Não é possível concluir um agendamento cancelado"}), 400
    
    # Verificar permissão (apenas admin ou barbeiro responsável)
    jwt_data = get_jwt()
    perfil = jwt_data.get('perfil')
    usuario_id = get_jwt_identity()
    
    if perfil == 'admin':
        # Admin tem acesso a todos os agendamentos
        pass
    elif perfil == 'barbeiro':
        barbeiro = Barbeiro.query.filter_by(usuario_id=usuario_id).first()
        if not barbeiro or barbeiro.id != agendamento.barbeiro_id:
            return jsonify({"erro": "Acesso negado"}), 403
    else:
        return jsonify({"erro": "Apenas administradores ou barbeiros podem concluir agendamentos"}), 403
    
    # Obter observações, se houver
    observacoes = request.json.get('observacoes')
    
    # Atualizar agendamento
    agendamento.status = 'concluido'
    if observacoes:
        if agendamento.observacoes:
            agendamento.observacoes += f"\n[Conclusão] {observacoes}"
        else:
            agendamento.observacoes = f"[Conclusão] {observacoes}"
    
    db.session.commit()
    
    # Verificar se há um atendimento associado
    from app.models.atendimento import Atendimento
    atendimento = Atendimento.query.filter_by(agendamento_id=agendamento.id).first()
    
    # Se não houver atendimento, criar um
    if not atendimento:
        from app.models.pagamento import Pagamento
        
        # Calcular valor total do atendimento
        valor_total = sum(servico.servico.preco for servico in agendamento.servicos)
        
        # Criar atendimento
        atendimento = Atendimento(
            agendamento_id=agendamento.id,
            cliente_id=agendamento.cliente_id,
            barbeiro_id=agendamento.barbeiro_id,
            valor_total=valor_total,
            data_hora=agendamento.data_hora_inicio,
            observacoes=f"Atendimento baseado no agendamento #{agendamento.id}"
        )
        db.session.add(atendimento)
        db.session.commit()
        
        # Verificar se existe um caixa aberto para registrar o pagamento
        from app.models.caixa_diario import CaixaDiario
        caixa_aberto = CaixaDiario.query.filter_by(status='aberto').first()
        
        # Se houver um caixa aberto, criar um pagamento associado
        if caixa_aberto and 'forma_pagamento' in request.json:
            pagamento = Pagamento(
                tipo='pagamento',
                valor=valor_total,
                forma_pagamento=request.json.get('forma_pagamento', 'dinheiro'),
                status='confirmado',
                descricao=f"Pagamento do atendimento #{atendimento.id}",
                atendimento_id=atendimento.id,
                caixa_diario_id=caixa_aberto.id
            )
            db.session.add(pagamento)
            db.session.commit()
    
    return jsonify({
        "mensagem": "Agendamento concluído com sucesso",
        "agendamento": agendamento.to_dict()
    }), 200

@agendamentos_bp.route('/<int:id>/cancelar', methods=['POST'])
@jwt_required()
def cancelar_agendamento(id):
    agendamento = Agendamento.query.get(id)
    
    if not agendamento:
        return jsonify({"erro": "Agendamento não encontrado"}), 404
    
    # Verificar se o agendamento já foi concluído ou cancelado
    if agendamento.status == 'cancelado':
        return jsonify({"erro": "Agendamento já foi cancelado"}), 400
    
    if agendamento.status == 'concluido':
        return jsonify({"erro": "Não é possível cancelar um agendamento concluído"}), 400
    
    # Verificar permissão
    jwt_data = get_jwt()
    perfil = jwt_data.get('perfil')
    usuario_id = get_jwt_identity()
    
    if perfil == 'admin':
        # Admin tem acesso a todos os agendamentos
        pass
    elif perfil == 'barbeiro':
        barbeiro = Barbeiro.query.filter_by(usuario_id=usuario_id).first()
        if not barbeiro or barbeiro.id != agendamento.barbeiro_id:
            return jsonify({"erro": "Acesso negado"}), 403
    elif perfil == 'cliente':
        # Verificar se o agendamento pertence ao cliente
        usuario = Usuario.query.get(usuario_id)
        if not usuario or not usuario.email:
            return jsonify({"erro": "Acesso negado"}), 403
        
        cliente = Cliente.query.filter_by(email=usuario.email).first()
        if not cliente or cliente.id != agendamento.cliente_id:
            return jsonify({"erro": "Acesso negado"}), 403
        
        # Verificar regra de cancelamento (por exemplo, cliente só pode cancelar com 24h de antecedência)
        now = datetime.now()
        if (agendamento.data_hora_inicio - now).total_seconds() < 24 * 3600:
            return jsonify({"erro": "Cancelamentos devem ser feitos com pelo menos 24 horas de antecedência"}), 400
    else:
        return jsonify({"erro": "Permissão negada"}), 403
    
    # Obter motivo do cancelamento
    motivo = request.json.get('motivo', 'Não informado')
    
    # Atualizar agendamento
    agendamento.status = 'cancelado'
    if agendamento.observacoes:
        agendamento.observacoes += f"\n[Cancelamento] {motivo}"
    else:
        agendamento.observacoes = f"[Cancelamento] {motivo}"
    
    db.session.commit()
    
    return jsonify({
        "mensagem": "Agendamento cancelado com sucesso",
        "agendamento": agendamento.to_dict()
    }), 200 