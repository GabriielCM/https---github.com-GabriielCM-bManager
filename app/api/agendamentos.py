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
        try:
            data_inicio = datetime.fromisoformat(data_inicio)
            query = query.filter(Agendamento.data_hora_inicio >= data_inicio)
        except ValueError:
            return jsonify({"erro": "Formato de data_inicio inválido"}), 400
    
    if data_fim:
        try:
            data_fim = datetime.fromisoformat(data_fim)
            query = query.filter(Agendamento.data_hora_inicio <= data_fim)
        except ValueError:
            return jsonify({"erro": "Formato de data_fim inválido"}), 400
    
    if barbeiro_id:
        query = query.filter(Agendamento.barbeiro_id == barbeiro_id)
    
    if cliente_id:
        query = query.filter(Agendamento.cliente_id == cliente_id)
    
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
def obter_agendamento(id):
    agendamento = Agendamento.query.get(id)
    
    if not agendamento:
        return jsonify({"erro": "Agendamento não encontrado"}), 404
    
    return jsonify(agendamento.to_dict()), 200

@agendamentos_bp.route('/', methods=['POST'])
@jwt_required()
def criar_agendamento():
    try:
        dados_requisicao = request.json
        if not dados_requisicao:
            return jsonify({"erro": "Dados JSON não fornecidos"}), 400
        
        # Verificar campos obrigatórios
        campos_obrigatorios = ['cliente_id', 'barbeiro_id', 'data_hora_inicio', 'servicos']
        for campo in campos_obrigatorios:
            if campo not in dados_requisicao or dados_requisicao[campo] is None:
                return jsonify({"erro": f"Campo obrigatório ausente: {campo}"}), 400
        
        # Processar IDs
        try:
            cliente_id = int(dados_requisicao['cliente_id'])
            barbeiro_id = int(dados_requisicao['barbeiro_id'])
        except (ValueError, TypeError):
            return jsonify({"erro": "ID de cliente ou barbeiro inválido"}), 400
        
        # Processar data e hora
        try:
            if isinstance(dados_requisicao['data_hora_inicio'], str):
                data_hora_inicio = datetime.fromisoformat(dados_requisicao['data_hora_inicio'].replace('Z', '+00:00'))
            else:
                return jsonify({"erro": "Formato de data/hora inválido"}), 400
        except ValueError:
            return jsonify({"erro": "Formato de data/hora inválido. Use o formato ISO 8601 (YYYY-MM-DDTHH:MM:SS)"}), 400
        
        # Processar serviços
        if not isinstance(dados_requisicao['servicos'], list) or len(dados_requisicao['servicos']) == 0:
            return jsonify({"erro": "Lista de serviços inválida ou vazia"}), 400
        
        servicos_ids = []
        for servico_item in dados_requisicao['servicos']:
            if not isinstance(servico_item, dict) or 'servico_id' not in servico_item:
                return jsonify({"erro": "Formato de serviço inválido. Deve incluir servico_id"}), 400
            try:
                servico_id = int(servico_item['servico_id'])
                servicos_ids.append(servico_id)
            except (ValueError, TypeError):
                return jsonify({"erro": "ID de serviço inválido"}), 400
        
        # Verificações de existência
        cliente = Cliente.query.get(cliente_id)
        if not cliente:
            return jsonify({"erro": "Cliente não encontrado"}), 404
        
        barbeiro = Barbeiro.query.get(barbeiro_id)
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
        servicos_validos = []
        for servico_id in servicos_ids:
            servico = Servico.query.get(servico_id)
            if not servico:
                return jsonify({"erro": f"Serviço ID {servico_id} não encontrado"}), 404
            
            duracao_total += servico.duracao_estimada_min
            servicos_validos.append({"servico_id": servico_id})
        
        data_hora_fim = data_hora_inicio + timedelta(minutes=duracao_total)
        
        # Verificar disponibilidade
        if not Agendamento.verificar_disponibilidade(
            barbeiro_id, data_hora_inicio, data_hora_fim
        ):
            return jsonify({"erro": "Horário não disponível para o barbeiro"}), 400
        
        # Adicionar observações se fornecidas
        observacoes = dados_requisicao.get('observacoes')
        
        # Criar agendamento
        agendamento = Agendamento(
            cliente_id=cliente_id,
            barbeiro_id=barbeiro_id,
            data_hora_inicio=data_hora_inicio,
            data_hora_fim=data_hora_fim,
            status='pendente',
            observacoes=observacoes
        )
        
        db.session.add(agendamento)
        db.session.flush()  # Obter ID do agendamento sem commit
        
        # Adicionar serviços ao agendamento
        for servico_item in servicos_validos:
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
    except Exception as e:
        db.session.rollback()
        print(f"Erro ao criar agendamento: {str(e)}")
        return jsonify({"erro": f"Erro ao criar agendamento: {str(e)}"}), 500

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
    
    # Carregar e validar os dados da requisição
    try:
        data = AgendamentoSchema().load(request.json)
    except ValidationError as err:
        return jsonify({"erro": "Dados inválidos", "detalhes": err.messages}), 400
    
    # Verificações dos dados atualizados
    if 'cliente_id' in data:
        cliente = Cliente.query.get(data['cliente_id'])
        if not cliente:
            return jsonify({"erro": "Cliente não encontrado"}), 404
        agendamento.cliente_id = data['cliente_id']
    
    if 'barbeiro_id' in data:
        barbeiro = Barbeiro.query.get(data['barbeiro_id'])
        if not barbeiro:
            return jsonify({"erro": "Barbeiro não encontrado"}), 404
        if not barbeiro.disponivel:
            return jsonify({"erro": "Barbeiro não está disponível"}), 400
        agendamento.barbeiro_id = data['barbeiro_id']
    
    # Atualizar data e hora de início
    nova_data_hora = None
    if 'data_hora_inicio' in data:
        nova_data_hora = data['data_hora_inicio']
        
        # Calcular duração com base nos serviços (novos ou existentes)
        duracao_total = 0
        
        # Se temos novos serviços, calculamos com base neles
        if 'servicos' in data and data['servicos']:
            for servico_item in data['servicos']:
                servico = Servico.query.get(servico_item['servico_id'])
                if not servico:
                    return jsonify({"erro": f"Serviço ID {servico_item['servico_id']} não encontrado"}), 404
                duracao_total += servico.duracao_estimada_min
        else:
            # Senão, mantemos a mesma duração que tinha antes
            duracao_total = (agendamento.data_hora_fim - agendamento.data_hora_inicio).total_seconds() / 60
        
        nova_data_hora_fim = nova_data_hora + timedelta(minutes=duracao_total)
        
        # Verificar disponibilidade para o novo horário
        if not Agendamento.verificar_disponibilidade(
            agendamento.barbeiro_id if 'barbeiro_id' not in data else data['barbeiro_id'], 
            nova_data_hora, 
            nova_data_hora_fim,
            agendamento_id=id
        ):
            return jsonify({"erro": "Horário não disponível para o barbeiro"}), 400
        
        agendamento.data_hora_inicio = nova_data_hora
        agendamento.data_hora_fim = nova_data_hora_fim
    
    # Atualizar observações
    if 'observacoes' in data:
        agendamento.observacoes = data['observacoes']
    
    # Atualizar status
    if 'status' in data:
        agendamento.status = data['status']
    
    # Atualizar serviços associados (se fornecidos)
    if 'servicos' in data:
        # Remover serviços existentes
        for servico in agendamento.servicos:
            db.session.delete(servico)
        
        # Adicionar novos serviços
        for servico_item in data['servicos']:
            agendamento_servico = AgendamentoServico(
                agendamento_id=agendamento.id,
                servico_id=servico_item['servico_id']
            )
            db.session.add(agendamento_servico)
        
        # Recalcular data_hora_fim se não atualizamos a data e hora de início
        if not nova_data_hora:
            duracao_total = 0
            for servico_item in data['servicos']:
                servico = Servico.query.get(servico_item['servico_id'])
                duracao_total += servico.duracao_estimada_min
            
            agendamento.data_hora_fim = agendamento.data_hora_inicio + timedelta(minutes=duracao_total)
    
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

@agendamentos_bp.route('/data/<string:data>', methods=['GET'])
def listar_agendamentos_por_data(data):
    # Verificar formato da data (YYYY-MM-DD)
    try:
        data_obj = datetime.strptime(data, '%Y-%m-%d')
    except ValueError:
        return jsonify({"erro": "Formato de data inválido. Use YYYY-MM-DD"}), 400
    
    # Definir início e fim do dia
    inicio_dia = datetime.combine(data_obj.date(), datetime.min.time())
    fim_dia = datetime.combine(data_obj.date(), datetime.max.time())
    
    # Buscar agendamentos do dia
    agendamentos = Agendamento.query.filter(
        Agendamento.data_hora_inicio >= inicio_dia,
        Agendamento.data_hora_inicio <= fim_dia
    ).order_by(Agendamento.data_hora_inicio).all()
    
    # Converter para dicionários
    agendamentos_dict = [agendamento.to_dict() for agendamento in agendamentos]
    
    # Logar para debug
    print(f"Agendamentos encontrados para {data}: {len(agendamentos_dict)}")
    
    return jsonify(agendamentos_dict), 200

@agendamentos_bp.route('/disponibilidade', methods=['GET'])
def verificar_disponibilidade():
    # Parâmetros
    barbeiro_id = request.args.get('barbeiro_id')
    data = request.args.get('data')
    duracao = request.args.get('duracao', type=int, default=30)  # Duração em minutos
    
    # Validar parâmetros
    if not barbeiro_id or not data:
        return jsonify({"erro": "É necessário informar barbeiro_id e data"}), 400
    
    try:
        data_obj = datetime.fromisoformat(data.replace('Z', '+00:00'))
    except ValueError:
        return jsonify({"erro": "Formato de data inválido. Use o formato ISO (YYYY-MM-DDTHH:MM:SS)"}), 400
    
    # Verificar se o barbeiro existe
    barbeiro = Barbeiro.query.get(barbeiro_id)
    if not barbeiro:
        return jsonify({"erro": "Barbeiro não encontrado"}), 404
    
    # Verificar se o barbeiro está disponível
    if not barbeiro.disponivel:
        return jsonify({
            "disponivel": False,
            "mensagem": "Barbeiro não está disponível para agendamentos"
        }), 200
    
    # Obter todos os agendamentos do dia para o barbeiro
    inicio_dia = data_obj.replace(hour=0, minute=0, second=0, microsecond=0)
    fim_dia = inicio_dia + timedelta(days=1) - timedelta(microseconds=1)
    
    agendamentos = Agendamento.query.filter(
        Agendamento.barbeiro_id == barbeiro_id,
        Agendamento.status.in_(['pendente', 'confirmado', 'em_andamento']),
        Agendamento.data_hora_inicio >= inicio_dia,
        Agendamento.data_hora_inicio <= fim_dia
    ).order_by(Agendamento.data_hora_inicio).all()
    
    # Calcular a data de término do agendamento proposto
    fim_agendamento = data_obj + timedelta(minutes=duracao)
    
    # Verificar se há conflito com algum agendamento existente
    for agendamento in agendamentos:
        # Verificar sobreposição de horários
        if (data_obj < agendamento.data_hora_fim and fim_agendamento > agendamento.data_hora_inicio):
            return jsonify({
                "disponivel": False,
                "mensagem": "Horário não disponível, conflito com agendamento existente",
                "conflito": {
                    "agendamento_id": agendamento.id,
                    "inicio": agendamento.data_hora_inicio.isoformat(),
                    "fim": agendamento.data_hora_fim.isoformat(),
                    "cliente": agendamento.cliente.nome if agendamento.cliente else "Cliente não especificado"
                }
            }), 200
    
    # Verificar horário de funcionamento (assumindo 9h às 18h)
    hora = data_obj.hour
    if hora < 9 or hora >= 18:
        return jsonify({
            "disponivel": False,
            "mensagem": "Horário fora do expediente (9h às 18h)"
        }), 200
    
    # Verificar se é fim de semana (0 = Segunda, 6 = Domingo)
    dia_semana = data_obj.weekday()
    if dia_semana >= 5:  # Sábado ou Domingo
        return jsonify({
            "disponivel": False,
            "mensagem": f"Estabelecimento não funciona aos {'domingos' if dia_semana == 6 else 'sábados'}"
        }), 200
    
    # Se chegou até aqui, o horário está disponível
    # Calcular próximos horários disponíveis
    horarios_disponiveis = []
    horario_atual = inicio_dia.replace(hour=9, minute=0)  # Começa às 9h
    
    while horario_atual.hour < 18:  # Até as 18h
        # Verificar se o horário atual está disponível
        horario_fim = horario_atual + timedelta(minutes=duracao)
        disponivel = True
        
        for agendamento in agendamentos:
            if (horario_atual < agendamento.data_hora_fim and horario_fim > agendamento.data_hora_inicio):
                disponivel = False
                break
        
        # Se o horário já passou, não é disponível
        if horario_atual < datetime.now():
            disponivel = False
        
        if disponivel:
            horarios_disponiveis.append(horario_atual.isoformat())
        
        # Avançar 30 minutos
        horario_atual += timedelta(minutes=30)
    
    return jsonify({
        "disponivel": True,
        "mensagem": "Horário disponível",
        "proximos_horarios": horarios_disponiveis[:5]  # Retornar apenas os próximos 5 horários disponíveis
    }), 200

@agendamentos_bp.route('/<int:id>/concluir', methods=['POST'])
@jwt_required()
def concluir_agendamento(id):
    # Verificar permissões (apenas barbeiro do agendamento ou admin)
    jwt_data = get_jwt()
    perfil = jwt_data.get('perfil')
    usuario_id = get_jwt_identity()
    
    if perfil not in ['admin', 'barbeiro']:
        return jsonify({"erro": "Permissão negada. Apenas administradores ou barbeiros podem concluir agendamentos."}), 403
    
    # Buscar agendamento
    agendamento = Agendamento.query.get(id)
    
    if not agendamento:
        return jsonify({"erro": "Agendamento não encontrado"}), 404
    
    # Verificar se barbeiro tem permissão para este agendamento
    if perfil == 'barbeiro':
        barbeiro = Barbeiro.query.filter_by(usuario_id=usuario_id).first()
        if not barbeiro or barbeiro.id != agendamento.barbeiro_id:
            return jsonify({"erro": "Você não tem permissão para concluir este agendamento"}), 403
    
    # Verificar se agendamento pode ser concluído
    if agendamento.status == 'cancelado':
        return jsonify({"erro": "Não é possível concluir um agendamento cancelado"}), 400
    
    if agendamento.status == 'concluido':
        return jsonify({"mensagem": "Agendamento já está concluído"}), 200
    
    # Atualizar status do agendamento
    agendamento.status = 'concluido'
    db.session.commit()
    
    # Registrar atendimento se ainda não existir
    from app.models.atendimento import Atendimento
    
    atendimento = Atendimento.query.filter_by(agendamento_id=agendamento.id).first()
    if not atendimento:
        # Calcular valor total
        valor_total = sum([servico.servico.preco for servico in agendamento.servicos])
        
        # Criar atendimento
        atendimento = Atendimento(
            agendamento_id=agendamento.id,
            cliente_id=agendamento.cliente_id,
            barbeiro_id=agendamento.barbeiro_id,
            valor_total=valor_total,
            data_hora=datetime.now(),
            status='pago'  # Assumindo pagamento imediato ao concluir
        )
        db.session.add(atendimento)
        db.session.commit()
    
    return jsonify({
        "mensagem": "Agendamento concluído com sucesso",
        "agendamento": agendamento.to_dict(),
        "atendimento": atendimento.to_dict() if atendimento else None
    }), 200

@agendamentos_bp.route('/<int:id>/cancelar', methods=['POST'])
@jwt_required()
def cancelar_agendamento(id):
    # Verificar permissões (cliente do agendamento, barbeiro do agendamento ou admin)
    jwt_data = get_jwt()
    perfil = jwt_data.get('perfil')
    usuario_id = get_jwt_identity()
    
    # Buscar agendamento
    agendamento = Agendamento.query.get(id)
    
    if not agendamento:
        return jsonify({"erro": "Agendamento não encontrado"}), 404
    
    # Verificar permissões específicas
    tem_permissao = False
    
    if perfil == 'admin':
        tem_permissao = True
    elif perfil == 'barbeiro':
        barbeiro = Barbeiro.query.filter_by(usuario_id=usuario_id).first()
        tem_permissao = barbeiro and barbeiro.id == agendamento.barbeiro_id
    elif perfil == 'cliente':
        # Verificar se o cliente pertence ao usuário
        cliente = Cliente.query.filter_by(id=agendamento.cliente_id).first()
        usuario = Usuario.query.get(usuario_id)
        tem_permissao = cliente and usuario and cliente.email == usuario.email
    
    if not tem_permissao:
        return jsonify({"erro": "Você não tem permissão para cancelar este agendamento"}), 403
    
    # Verificar se agendamento pode ser cancelado
    if agendamento.status == 'cancelado':
        return jsonify({"mensagem": "Agendamento já está cancelado"}), 200
    
    if agendamento.status == 'concluido':
        return jsonify({"erro": "Não é possível cancelar um agendamento concluído"}), 400
    
    # Verificar se o agendamento está prestes a acontecer (menos de 1 hora)
    if agendamento.data_hora_inicio <= datetime.now() + timedelta(hours=1):
        # Apenas admin pode cancelar agendamentos próximos
        if perfil != 'admin':
            return jsonify({
                "erro": "Não é possível cancelar agendamentos com menos de 1 hora de antecedência. Entre em contato com o estabelecimento."
            }), 400
    
    # Obter motivo do cancelamento (opcional)
    data = request.json or {}
    motivo = data.get('motivo', 'Não informado')
    
    # Atualizar status do agendamento
    agendamento.status = 'cancelado'
    agendamento.observacoes = f"{agendamento.observacoes or ''}\nCancelamento: {motivo}".strip()
    db.session.commit()
    
    return jsonify({
        "mensagem": "Agendamento cancelado com sucesso",
        "agendamento": agendamento.to_dict()
    }), 200 