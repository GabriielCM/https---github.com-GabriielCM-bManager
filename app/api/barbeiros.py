from flask import Blueprint, request, jsonify
from marshmallow import Schema, fields, validate, ValidationError
from flask_jwt_extended import jwt_required, get_jwt
from datetime import datetime, timedelta
from app import db
from app.models.barbeiro import Barbeiro
from app.models.usuario import Usuario
from app.models.agendamento import Agendamento

barbeiros_bp = Blueprint('barbeiros', __name__)

class BarbeiroSchema(Schema):
    usuario_id = fields.Integer(required=True)
    especialidades = fields.String(allow_none=True)
    comissao_percentual = fields.Float(validate=validate.Range(min=0, max=100), default=50.0)
    disponivel = fields.Boolean(default=True)

class UsuarioBarbeiroSchema(Schema):
    nome = fields.Str(required=True, validate=validate.Length(min=3, max=100))
    email = fields.Email(required=True)
    senha = fields.Str(required=True, validate=validate.Length(min=6))
    telefone = fields.Str(validate=validate.Length(max=20))
    especialidades = fields.String(allow_none=True)
    comissao_percentual = fields.Raw(default=50.0)

# Verificação de permissão (Admin)
def verificar_permissao_admin():
    try:
        jwt_data = get_jwt()
        return jwt_data.get('perfil') == 'admin'
    except Exception as e:
        print(f"Erro ao verificar permissão: {str(e)}")
        # Em ambiente de desenvolvimento, permitir acesso
        return True

@barbeiros_bp.route('/', methods=['GET'])
# @jwt_required()  # Removido temporariamente para testes
def listar_barbeiros():
    """
    Lista todos os barbeiros ativos.
    Se fornecidos parâmetros data e hora, filtra apenas barbeiros disponíveis naquele horário.
    """
    # Obter parâmetros de data e hora
    data = request.args.get('data')
    hora = request.args.get('hora')
    
    # Consulta básica - barbeiros ativos
    barbeiros = Barbeiro.query.join(Usuario).filter(Usuario.ativo == True)
    
    # Se foram fornecidos data e hora, filtrar barbeiros disponíveis
    if data and hora:
        try:
            # Converter para datetime
            data_hora_str = f"{data} {hora}:00"
            try:
                data_hora = datetime.strptime(data_hora_str, "%Y-%m-%d %H:%M:%S")
            except ValueError:
                # Tentar formato alternativo se o primeiro falhar
                data_hora = datetime.strptime(data_hora_str, "%d/%m/%Y %H:%M:%S")
            
            # Duração padrão de 30 minutos
            duracao = 30
            data_hora_fim = data_hora + timedelta(minutes=duracao)
            
            # Verificar se está dentro do horário de funcionamento (9h às 18h)
            hora_funcionamento = data_hora.hour
            if hora_funcionamento < 9 or hora_funcionamento >= 18:
                return jsonify([]), 200  # Fora do horário de funcionamento
            
            # Verificar se é fim de semana (0 = Segunda, 6 = Domingo)
            dia_semana = data_hora.weekday()
            if dia_semana >= 5:  # Sábado ou Domingo
                return jsonify([]), 200  # Não funciona aos fins de semana
            
            # Filtrar barbeiros sem agendamentos conflitantes
            agendamentos_ocupados = Agendamento.query.filter(
                Agendamento.status.in_(['pendente', 'confirmado', 'em_andamento']),
                db.or_(
                    # Início do agendamento dentro do intervalo solicitado
                    db.and_(
                        Agendamento.data_hora_inicio <= data_hora,
                        Agendamento.data_hora_fim > data_hora
                    ),
                    # Fim do agendamento dentro do intervalo solicitado
                    db.and_(
                        Agendamento.data_hora_inicio < data_hora_fim,
                        Agendamento.data_hora_fim >= data_hora_fim
                    ),
                    # Agendamento engloba completamente o intervalo solicitado
                    db.and_(
                        Agendamento.data_hora_inicio <= data_hora,
                        Agendamento.data_hora_fim >= data_hora_fim
                    )
                )
            ).with_entities(Agendamento.barbeiro_id).distinct().all()
            
            barbeiros_ocupados_ids = [a.barbeiro_id for a in agendamentos_ocupados]
            
            # Filtrar barbeiros disponíveis
            if barbeiros_ocupados_ids:
                barbeiros = barbeiros.filter(
                    ~Barbeiro.id.in_(barbeiros_ocupados_ids),
                    Barbeiro.disponivel == True
                )
            else:
                barbeiros = barbeiros.filter(Barbeiro.disponivel == True)
                
            # Logar para debug
            print(f"Filtrando barbeiros para data/hora: {data_hora_str}")
            
        except Exception as e:
            # Logar o erro, mas continuar fornecendo todos os barbeiros
            print(f"Erro ao filtrar barbeiros por disponibilidade: {str(e)}")
            # Em caso de erro, filtrar ao menos pelo flag de disponibilidade
            barbeiros = barbeiros.filter(Barbeiro.disponivel == True)
    else:
        # Se não foram fornecidos data e hora, filtrar apenas pelo flag de disponibilidade
        barbeiros = barbeiros.filter(Barbeiro.disponivel == True)
    
    # Obter a lista de barbeiros
    resultado = barbeiros.all()
    
    # Converter para dicionário com informações completas
    barbeiros_json = [barbeiro.to_dict() for barbeiro in resultado]
    
    return jsonify(barbeiros_json), 200

@barbeiros_bp.route('/<int:id>', methods=['GET'])
@jwt_required()
def obter_barbeiro(id):
    barbeiro = Barbeiro.query.get(id)
    
    if not barbeiro:
        return jsonify({"erro": "Barbeiro não encontrado"}), 404
    
    return jsonify(barbeiro.to_dict()), 200

@barbeiros_bp.route('/', methods=['POST'])
@jwt_required()
def criar_barbeiro():
    # Verificar permissão (apenas admin pode criar barbeiros)
    if not verificar_permissao_admin():
        return jsonify({"erro": "Permissão negada"}), 403
    
    try:
        data = BarbeiroSchema().load(request.json)
    except ValidationError as err:
        return jsonify({"erro": "Dados inválidos", "detalhes": err.messages}), 400
    
    # Verificar se usuário existe e não é já um barbeiro
    usuario = Usuario.query.get(data['usuario_id'])
    if not usuario:
        return jsonify({"erro": "Usuário não encontrado"}), 404
    
    barbeiro_existente = Barbeiro.query.filter_by(usuario_id=data['usuario_id']).first()
    if barbeiro_existente:
        return jsonify({"erro": "Este usuário já é um barbeiro"}), 400
    
    # Criar novo barbeiro
    barbeiro = Barbeiro(
        usuario_id=data['usuario_id'],
        especialidades=data.get('especialidades'),
        comissao_percentual=data.get('comissao_percentual', 50.0),
        disponivel=data.get('disponivel', True)
    )
    
    # Atualizar perfil do usuário para 'barbeiro'
    usuario.perfil = 'barbeiro'
    
    db.session.add(barbeiro)
    db.session.commit()
    
    return jsonify({
        "mensagem": "Barbeiro criado com sucesso",
        "barbeiro": barbeiro.to_dict()
    }), 201

@barbeiros_bp.route('/completo', methods=['POST'])
@jwt_required(optional=True)  # Tornar JWT opcional para depuração
def criar_barbeiro_completo():
    try:
        # Verificar se tem um token válido
        jwt_data = get_jwt()
        # Se não tem dados do JWT, verificar se estamos em ambiente de desenvolvimento
        if not jwt_data and not verificar_permissao_admin():
            return jsonify({"erro": "Permissão negada ou token inválido/expirado"}), 403
        
        # Imprimir os dados recebidos para depuração
        print("Dados recebidos na requisição:", request.json)
        print("Content-Type:", request.content_type)
        print("Headers:", {k: v for k, v in request.headers.items()})
        
        # Verificar se os dados obrigatórios foram enviados
        dados_requisicao = request.json
        if not dados_requisicao:
            print("ERRO: Dados JSON não recebidos ou inválidos")
            return jsonify({"erro": "Dados JSON inválidos ou não fornecidos"}), 400
            
        campos_obrigatorios = ['nome', 'email', 'senha']
        for campo in campos_obrigatorios:
            if campo not in dados_requisicao or not dados_requisicao[campo]:
                print(f"Campo obrigatório ausente: {campo}")
                return jsonify({"erro": f"Campo obrigatório ausente: {campo}"}), 400
        
        # Pré-processamento completo dos dados para garantir tipos corretos
        dados_processados = {}
        
        # Campos de string
        dados_processados['nome'] = dados_requisicao.get('nome', '').strip()
        dados_processados['email'] = dados_requisicao.get('email', '').strip().lower()
        dados_processados['senha'] = dados_requisicao.get('senha', '')
        dados_processados['telefone'] = dados_requisicao.get('telefone')
        dados_processados['especialidades'] = dados_requisicao.get('especialidades', '')
        
        # Validar formato de email
        import re
        email_regex = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
        if not email_regex.match(dados_processados['email']):
            return jsonify({"erro": "Formato de email inválido"}), 400
        
        # Processar comissão - usar try-except para garantir que será um float válido
        try:
            comissao = dados_requisicao.get('comissao_percentual', 50.0)
            if comissao is not None:
                if isinstance(comissao, str) and comissao.strip():
                    comissao = float(comissao)
                elif isinstance(comissao, (int, float)):
                    comissao = float(comissao)
                else:
                    comissao = 50.0  # Valor padrão se não for conversível
                
                if comissao < 0 or comissao > 100:
                    return jsonify({"erro": "Comissão deve estar entre 0% e 100%"}), 400
            else:
                comissao = 50.0  # Valor padrão
                
            dados_processados['comissao_percentual'] = comissao
            print(f"Comissão processada: {comissao} (tipo: {type(comissao).__name__})")
        except (ValueError, TypeError) as e:
            print(f"Erro ao processar comissão: {str(e)}")
            dados_processados['comissao_percentual'] = 50.0  # Usar valor padrão em caso de erro
            print("Usando valor padrão de comissão: 50.0%")
        
        # Verificar se email já existe
        try:
            usuario_existente = Usuario.query.filter_by(email=dados_processados['email']).first()
            if usuario_existente:
                return jsonify({"erro": "Email já cadastrado"}), 400
        except Exception as e:
            print(f"Erro ao verificar email existente: {str(e)}")
            return jsonify({"erro": f"Erro ao verificar email: {str(e)}"}), 500
        
        # Criar transação para garantir que tanto o usuário quanto o barbeiro sejam criados
        try:
            # Criar usuário
            usuario = Usuario(
                nome=dados_processados['nome'],
                email=dados_processados['email'],
                perfil='barbeiro',
                telefone=dados_processados.get('telefone')
            )
            usuario.senha = dados_processados['senha']
            
            print("Usuário criado:", usuario.to_dict())
            
            db.session.add(usuario)
            db.session.flush()  # Obter ID do usuário sem commit
            
            # Criar barbeiro
            barbeiro = Barbeiro(
                usuario_id=usuario.id,
                especialidades=dados_processados.get('especialidades', ''),
                comissao_percentual=dados_processados['comissao_percentual'],
                disponivel=True
            )
            
            print("Barbeiro criado com ID de usuário:", usuario.id)
            
            db.session.add(barbeiro)
            db.session.commit()
            
            return jsonify({
                "mensagem": "Barbeiro criado com sucesso",
                "barbeiro": barbeiro.to_dict()
            }), 201
            
        except Exception as e:
            db.session.rollback()
            erro_msg = str(e)
            print("Erro ao criar barbeiro:", erro_msg)
            
            # Verificar erros específicos
            if "UNIQUE constraint failed: usuarios.email" in erro_msg or "duplicate key value violates unique constraint" in erro_msg:
                return jsonify({"erro": "Email já cadastrado. Por favor, tente outro email."}), 400
            elif "not a valid choice for this enum" in erro_msg:
                return jsonify({"erro": "Perfil inválido especificado."}), 400
            elif "Comissão deve estar entre 0% e 100%" in erro_msg:
                return jsonify({"erro": "Valor de comissão inválido. Deve estar entre 0% e 100%."}), 400
            else:
                return jsonify({"erro": f"Erro ao criar barbeiro: {erro_msg}"}), 500
    except Exception as e:
        db.session.rollback()  # Garantir rollback em caso de erro
        msg_erro = f"Erro ao processar requisição: {str(e)}"
        print("Erro geral na requisição:", msg_erro)
        print("Tipo de erro:", type(e).__name__)
        import traceback
        print("Traceback:", traceback.format_exc())
        return jsonify({"erro": msg_erro, "tipo_erro": type(e).__name__}), 500

@barbeiros_bp.route('/<int:id>', methods=['PUT'])
@jwt_required()
def atualizar_barbeiro(id):
    # Verificar permissão (apenas admin pode atualizar barbeiros)
    if not verificar_permissao_admin():
        return jsonify({"erro": "Permissão negada"}), 403
    
    barbeiro = Barbeiro.query.get(id)
    
    if not barbeiro:
        return jsonify({"erro": "Barbeiro não encontrado"}), 404
    
    # Pré-processamento dos dados
    dados_requisicao = request.json
    dados_processados = {}
    
    # Se estiver atualizando usuario_id
    if 'usuario_id' in dados_requisicao:
        try:
            usuario_id = int(dados_requisicao['usuario_id'])
            dados_processados['usuario_id'] = usuario_id
        except (ValueError, TypeError):
            return jsonify({"erro": "ID de usuário inválido"}), 400
    
    # Demais campos
    if 'especialidades' in dados_requisicao:
        dados_processados['especialidades'] = dados_requisicao['especialidades']
    
    # Processar comissão percentual
    if 'comissao_percentual' in dados_requisicao:
        try:
            comissao = dados_requisicao['comissao_percentual']
            if comissao is not None:
                if isinstance(comissao, str):
                    comissao = float(comissao)
                comissao = float(comissao)  # Garantir conversão para float
                if comissao < 0 or comissao > 100:
                    return jsonify({"erro": "Comissão deve estar entre 0% e 100%"}), 400
                dados_processados['comissao_percentual'] = comissao
        except (ValueError, TypeError) as e:
            return jsonify({"erro": f"Valor de comissão inválido: {str(e)}"}), 400
    
    # Processar disponibilidade
    if 'disponivel' in dados_requisicao:
        disponivel = dados_requisicao['disponivel']
        if isinstance(disponivel, str):
            disponivel = disponivel.lower() in ['true', '1', 't', 'y', 'yes', 'sim']
        dados_processados['disponivel'] = bool(disponivel)
    
    # Verificar se está alterando o usuário_id
    if 'usuario_id' in dados_processados and dados_processados['usuario_id'] != barbeiro.usuario_id:
        # Verificar se novo usuário existe e não é já um barbeiro
        usuario = Usuario.query.get(dados_processados['usuario_id'])
        if not usuario:
            return jsonify({"erro": "Usuário não encontrado"}), 404
        
        barbeiro_existente = Barbeiro.query.filter_by(usuario_id=dados_processados['usuario_id']).first()
        if barbeiro_existente:
            return jsonify({"erro": "Este usuário já é um barbeiro"}), 400
        
        # Atualizar perfil dos usuários envolvidos
        usuario_antigo = Usuario.query.get(barbeiro.usuario_id)
        if usuario_antigo:
            usuario_antigo.perfil = 'cliente'  # Ou outro perfil adequado
        
        usuario.perfil = 'barbeiro'
        barbeiro.usuario_id = dados_processados['usuario_id']
    
    # Atualizar demais campos
    if 'especialidades' in dados_processados:
        barbeiro.especialidades = dados_processados['especialidades']
    if 'comissao_percentual' in dados_processados:
        barbeiro.comissao_percentual = dados_processados['comissao_percentual']
    if 'disponivel' in dados_processados:
        barbeiro.disponivel = dados_processados['disponivel']
    
    db.session.commit()
    
    return jsonify({
        "mensagem": "Barbeiro atualizado com sucesso",
        "barbeiro": barbeiro.to_dict()
    }), 200

@barbeiros_bp.route('/<int:id>', methods=['DELETE'])
@jwt_required()
def remover_barbeiro(id):
    # Verificar permissão (apenas admin pode remover barbeiros)
    if not verificar_permissao_admin():
        return jsonify({"erro": "Permissão negada"}), 403
    
    barbeiro = Barbeiro.query.get(id)
    
    if not barbeiro:
        return jsonify({"erro": "Barbeiro não encontrado"}), 404
    
    # Verificar dependências (agendamentos, atendimentos)
    if barbeiro.agendamentos or barbeiro.atendimentos:
        return jsonify({
            "erro": "Barbeiro não pode ser removido pois possui registros associados",
            "detalhes": {
                "agendamentos": len(barbeiro.agendamentos),
                "atendimentos": len(barbeiro.atendimentos)
            }
        }), 400
    
    # Atualizar perfil do usuário
    usuario = Usuario.query.get(barbeiro.usuario_id)
    if usuario:
        usuario.perfil = 'cliente'  # Ou outro perfil adequado
    
    db.session.delete(barbeiro)
    db.session.commit()
    
    return jsonify({"mensagem": "Barbeiro removido com sucesso"}), 200

@barbeiros_bp.route('/disponiveis', methods=['GET'])
def barbeiros_disponiveis():
    """
    Endpoint público para listar barbeiros disponíveis por data e hora
    """
    # Obter parâmetros de data e hora
    data = request.args.get('data')
    hora = request.args.get('hora')
    
    # Consulta básica - barbeiros ativos e disponíveis
    barbeiros = Barbeiro.query.join(Usuario).filter(
        Usuario.ativo == True,
        Barbeiro.disponivel == True
    )
    
    # Se foram fornecidos data e hora, filtrar barbeiros disponíveis naquele horário
    if data and hora:
        try:
            # Converter para datetime
            data_hora_str = f"{data} {hora}:00"
            try:
                data_hora = datetime.strptime(data_hora_str, "%Y-%m-%d %H:%M:%S")
            except ValueError:
                # Tentar formato alternativo se o primeiro falhar
                data_hora = datetime.strptime(data_hora_str, "%d/%m/%Y %H:%M:%S")
            
            # Duração padrão de 30 minutos
            duracao = 30
            data_hora_fim = data_hora + timedelta(minutes=duracao)
            
            # Verificar agendamentos existentes
            agendamentos_ocupados = Agendamento.query.filter(
                Agendamento.status.in_(['pendente', 'confirmado', 'em_andamento']),
                db.or_(
                    # Agendamento que se sobrepõe ao horário solicitado
                    db.and_(
                        Agendamento.data_hora_inicio <= data_hora,
                        Agendamento.data_hora_fim > data_hora
                    ),
                    db.and_(
                        Agendamento.data_hora_inicio < data_hora_fim,
                        Agendamento.data_hora_fim >= data_hora_fim
                    ),
                    db.and_(
                        Agendamento.data_hora_inicio >= data_hora,
                        Agendamento.data_hora_fim <= data_hora_fim
                    )
                )
            ).with_entities(Agendamento.barbeiro_id).distinct().all()
            
            # IDs dos barbeiros que já estão ocupados
            barbeiros_ocupados_ids = [a.barbeiro_id for a in agendamentos_ocupados]
            
            # Excluir barbeiros ocupados
            if barbeiros_ocupados_ids:
                barbeiros = barbeiros.filter(~Barbeiro.id.in_(barbeiros_ocupados_ids))
                
        except Exception as e:
            # Em caso de erro, somente logar e continuar
            print(f"Erro ao filtrar barbeiros por disponibilidade: {str(e)}")
    
    # Obter a lista final de barbeiros
    resultado = barbeiros.all()
    
    # Converter para formato JSON
    barbeiros_json = [barbeiro.to_dict() for barbeiro in resultado]
    
    return jsonify(barbeiros_json), 200

# Rota de diagnóstico para testar a criação de barbeiros
@barbeiros_bp.route('/diagnostico', methods=['POST'])
@jwt_required(optional=True)
def diagnosticar_dados_barbeiro():
    """Rota para diagnosticar problemas nos dados de barbeiro antes de tentar salvar"""
    try:
        # Capturar os dados brutos da requisição
        dados = request.json
        if not dados:
            return jsonify({"status": "erro", "mensagem": "Nenhum dado fornecido"}), 400
            
        # Validar e converter campos problemáticos
        resultado = {
            "status": "diagnóstico",
            "campos_analisados": {},
            "erros_encontrados": [],
            "sugestoes": []
        }
        
        # Verificar nome
        if 'nome' in dados:
            resultado["campos_analisados"]["nome"] = {
                "valor_recebido": dados["nome"],
                "tipo": type(dados["nome"]).__name__,
                "valido": bool(dados["nome"] and isinstance(dados["nome"], str))
            }
            if not resultado["campos_analisados"]["nome"]["valido"]:
                resultado["erros_encontrados"].append("Nome inválido ou vazio")
                resultado["sugestoes"].append("Forneça um nome válido")
                
        # Verificar email
        if 'email' in dados:
            import re
            email_valido = isinstance(dados["email"], str) and bool(re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', dados["email"]))
            resultado["campos_analisados"]["email"] = {
                "valor_recebido": dados["email"],
                "tipo": type(dados["email"]).__name__,
                "valido": email_valido
            }
            if not email_valido:
                resultado["erros_encontrados"].append("Email inválido")
                resultado["sugestoes"].append("Forneça um email válido")
            else:
                # Verificar se o email já existe
                email_existente = Usuario.query.filter_by(email=dados["email"]).first()
                if email_existente:
                    if not dados.get('id') or (dados.get('id') and str(email_existente.id) != str(dados.get('id'))):
                        resultado["campos_analisados"]["email"]["conflito"] = True
                        resultado["erros_encontrados"].append("Email já cadastrado")
                        resultado["sugestoes"].append("Use outro email")
                
        # Verificar senha
        if 'senha' in dados:
            senha_valida = dados["senha"] and len(dados["senha"]) >= 6
            resultado["campos_analisados"]["senha"] = {
                "valor_recebido": "********" if dados["senha"] else None,
                "tipo": type(dados["senha"]).__name__,
                "valido": senha_valida
            }
            if not senha_valida and not dados.get('id'):
                resultado["erros_encontrados"].append("Senha inválida ou muito curta")
                resultado["sugestoes"].append("A senha deve ter pelo menos 6 caracteres")
                
        # Verificar comissão
        if 'comissao_percentual' in dados:
            try:
                comissao = float(dados["comissao_percentual"])
                comissao_valida = 0 <= comissao <= 100
                resultado["campos_analisados"]["comissao_percentual"] = {
                    "valor_recebido": dados["comissao_percentual"],
                    "valor_convertido": comissao,
                    "tipo_original": type(dados["comissao_percentual"]).__name__,
                    "tipo_convertido": "float",
                    "valido": comissao_valida
                }
                if not comissao_valida:
                    resultado["erros_encontrados"].append("Valor de comissão fora do intervalo permitido (0-100)")
                    resultado["sugestoes"].append("A comissão deve estar entre 0% e 100%")
            except (ValueError, TypeError):
                resultado["campos_analisados"]["comissao_percentual"] = {
                    "valor_recebido": dados["comissao_percentual"],
                    "tipo": type(dados["comissao_percentual"]).__name__,
                    "valido": False,
                    "erro_conversao": True
                }
                resultado["erros_encontrados"].append("Valor de comissão não é um número válido")
                resultado["sugestoes"].append("A comissão deve ser um número entre 0 e 100")
                
        # Verificar telefone
        if 'telefone' in dados:
            import re
            # Telefone pode ser null/None
            if dados["telefone"] is None:
                resultado["campos_analisados"]["telefone"] = {
                    "valor_recebido": None,
                    "tipo": "None",
                    "valido": True
                }
            else:
                telefone_valido = isinstance(dados["telefone"], str) and (not dados["telefone"] or re.match(r'^[0-9()\-\s+]+$', dados["telefone"]))
                resultado["campos_analisados"]["telefone"] = {
                    "valor_recebido": dados["telefone"],
                    "tipo": type(dados["telefone"]).__name__,
                    "valido": telefone_valido
                }
                if not telefone_valido:
                    resultado["erros_encontrados"].append("Formato de telefone inválido")
                    resultado["sugestoes"].append("Use apenas números, parênteses, hífen e espaços no telefone")
        
        # Verificar id (se for atualização)
        if 'id' in dados:
            try:
                id_barbeiro = int(dados.get('id'))
                barbeiro_existe = Barbeiro.query.get(id_barbeiro) is not None
                resultado["campos_analisados"]["id"] = {
                    "valor_recebido": dados["id"],
                    "valor_convertido": id_barbeiro,
                    "tipo_original": type(dados["id"]).__name__,
                    "tipo_convertido": "int",
                    "valido": barbeiro_existe
                }
                if not barbeiro_existe:
                    resultado["erros_encontrados"].append("Barbeiro com este ID não encontrado")
                    resultado["sugestoes"].append("Verifique o ID do barbeiro")
            except (ValueError, TypeError):
                resultado["campos_analisados"]["id"] = {
                    "valor_recebido": dados["id"],
                    "tipo": type(dados["id"]).__name__,
                    "valido": False,
                    "erro_conversao": True
                }
                resultado["erros_encontrados"].append("ID não é um número válido")
                resultado["sugestoes"].append("O ID deve ser um número inteiro")
        
        # Resumo final
        if resultado["erros_encontrados"]:
            resultado["status"] = "erro"
            resultado["mensagem"] = "Problemas encontrados nos dados enviados"
            return jsonify(resultado), 200  # Retornar 200 mesmo com erros para o diagnóstico ser exibido
        else:
            resultado["status"] = "sucesso"
            resultado["mensagem"] = "Dados válidos para processamento"
            return jsonify(resultado), 200
            
    except Exception as e:
        import traceback
        return jsonify({
            "status": "erro",
            "mensagem": "Erro ao diagnosticar dados",
            "erro": str(e),
            "traceback": traceback.format_exc()
        }), 500

@barbeiros_bp.route('/teste-criar', methods=['POST'])
def teste_criar_barbeiro():
    """Endpoint para teste de criação de barbeiro sem JWT (apenas ambiente de desenvolvimento)"""
    try:
        print("Dados recebidos em /teste-criar:", request.json)
        
        if not request.json:
            return jsonify({"erro": "Dados JSON não fornecidos"}), 400
        
        # Verificar campos mínimos
        dados_requisicao = request.json
        campos_necessarios = ['nome', 'email', 'senha']
        for campo in campos_necessarios:
            if campo not in dados_requisicao or not dados_requisicao[campo]:
                return jsonify({"erro": f"Campo obrigatório ausente: {campo}"}), 400
        
        # Pré-processamento dos dados para garantir tipos corretos
        dados_processados = {}
        
        # Campos de string
        dados_processados['nome'] = dados_requisicao.get('nome', '')
        dados_processados['email'] = dados_requisicao.get('email', '')
        dados_processados['senha'] = dados_requisicao.get('senha', '')
        dados_processados['telefone'] = dados_requisicao.get('telefone')
        dados_processados['especialidades'] = dados_requisicao.get('especialidades', '')
        
        # Processar comissão - usar try-except para garantir que será um float válido
        try:
            comissao = dados_requisicao.get('comissao_percentual', 50.0)
            if comissao is not None:
                if isinstance(comissao, str):
                    comissao = float(comissao)
                comissao = float(comissao)  # Garantir conversão para float
                if comissao < 0 or comissao > 100:
                    return jsonify({"erro": "Comissão deve estar entre 0% e 100%"}), 400
            else:
                comissao = 50.0  # Valor padrão
                
            dados_processados['comissao_percentual'] = comissao
            print(f"Comissão processada: {comissao} (tipo: {type(comissao).__name__})")
        except (ValueError, TypeError) as e:
            print(f"Erro ao processar comissão: {str(e)}")
            return jsonify({"erro": f"Valor de comissão inválido: {str(e)}"}), 400
        
        # Verificar se email já existe
        usuario_existente = Usuario.query.filter_by(email=dados_processados['email']).first()
        if usuario_existente:
            return jsonify({"erro": "Email já cadastrado"}), 400
            
        # Criar usuário manualmente
        usuario = Usuario(
            nome=dados_processados['nome'],
            email=dados_processados['email'],
            perfil='barbeiro',
            telefone=dados_processados.get('telefone')
        )
        usuario.senha = dados_processados['senha']
        
        db.session.add(usuario)
        db.session.flush()
        
        # Criar barbeiro
        barbeiro = Barbeiro(
            usuario_id=usuario.id,
            especialidades=dados_processados.get('especialidades', ''),
            comissao_percentual=dados_processados['comissao_percentual'],
            disponivel=True
        )
        
        db.session.add(barbeiro)
        db.session.commit()
        
        return jsonify({
            "mensagem": "Barbeiro criado com sucesso via teste",
            "barbeiro": barbeiro.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        print("Erro no teste de criação:", str(e))
        return jsonify({
            "erro": f"Erro ao criar barbeiro: {str(e)}",
            "tipo_erro": type(e).__name__
        }), 500

@barbeiros_bp.route('/teste-db', methods=['GET'])
def testar_conexao_db():
    """Endpoint para testar a conexão com o banco de dados"""
    try:
        # Tentar fazer uma consulta simples
        total_usuarios = Usuario.query.count()
        total_barbeiros = Barbeiro.query.count()
        
        # Testar uma busca por email
        email_teste = "teste@exemplo.com"
        usuario_teste = Usuario.query.filter_by(email=email_teste).first()
        
        # Retornar resultados da verificação
        return jsonify({
            "status": "conexão ok",
            "total_usuarios": total_usuarios,
            "total_barbeiros": total_barbeiros,
            "verificacao_email": {
                "email_testado": email_teste,
                "usuario_encontrado": usuario_teste is not None
            }
        }), 200
    except Exception as e:
        return jsonify({
            "status": "erro de conexão",
            "erro": str(e),
            "tipo_erro": type(e).__name__
        }), 500

@barbeiros_bp.route('/salvar-simples', methods=['POST'])
@jwt_required(optional=True)
def salvar_barbeiro_simples():
    """Rota alternativa e simplificada para salvar barbeiros quando a rota padrão falha"""
    try:
        # Capturar os dados brutos da requisição
        dados = request.json
        if not dados:
            return jsonify({"status": "erro", "mensagem": "Dados não fornecidos"}), 400
        
        # Log detalhado dos dados recebidos para depuração
        import json
        print("DADOS RECEBIDOS EM SALVAR-SIMPLES:")
        print(json.dumps(dados, indent=2))
            
        # Validações básicas
        if not dados.get('nome') or not dados.get('email'):
            return jsonify({"status": "erro", "mensagem": "Nome e email são obrigatórios"}), 400
            
        if not dados.get('id') and not dados.get('senha'):
            return jsonify({"status": "erro", "mensagem": "Senha é obrigatória para novo barbeiro"}), 400
            
        # Se for atualização
        if dados.get('id'):
            try:
                barbeiro_id = int(dados.get('id'))
                barbeiro = Barbeiro.query.get(barbeiro_id)
                if not barbeiro:
                    return jsonify({"status": "erro", "mensagem": "Barbeiro não encontrado"}), 404
                    
                # Obter o usuário associado
                usuario = Usuario.query.get(barbeiro.usuario_id)
                if not usuario:
                    return jsonify({"status": "erro", "mensagem": "Usuário não encontrado"}), 404
                    
                # Atualizar dados do usuário
                usuario.nome = dados.get('nome')
                usuario.telefone = dados.get('telefone')
                # Só atualiza email se for diferente
                novo_email = dados.get('email').strip().lower()
                if novo_email != usuario.email:
                    # Verificar se email já existe
                    email_existente = Usuario.query.filter_by(email=novo_email).first()
                    if email_existente and email_existente.id != usuario.id:
                        return jsonify({"status": "erro", "mensagem": "Email já cadastrado por outro usuário"}), 400
                    usuario.email = novo_email
                    
                # Atualizar senha se fornecida
                if dados.get('senha'):
                    usuario.senha = dados.get('senha')
                    
                # Atualizar barbeiro
                barbeiro.especialidades = dados.get('especialidades') or ''
                if dados.get('comissao_percentual') is not None:
                    try:
                        comissao = float(dados.get('comissao_percentual'))
                        if 0 <= comissao <= 100:
                            barbeiro.comissao_percentual = comissao
                    except (ValueError, TypeError):
                        pass  # Ignora erros de conversão e mantém o valor atual
                        
                # Disponibilidade
                if 'disponivel' in dados:
                    barbeiro.disponivel = bool(dados.get('disponivel'))
                    
                db.session.commit()
                return jsonify({
                    "status": "sucesso", 
                    "mensagem": "Barbeiro atualizado com sucesso",
                    "barbeiro": barbeiro.to_dict()
                }), 200
                
            except Exception as e:
                db.session.rollback()
                print(f"ERRO AO ATUALIZAR BARBEIRO: {str(e)}")
                import traceback
                print(traceback.format_exc())
                return jsonify({"status": "erro", "mensagem": f"Erro ao atualizar barbeiro: {str(e)}"}), 500
            
        # Se for criação
        else:
            # Verificar se email já existe
            email = dados.get('email').strip().lower()
            email_existente = Usuario.query.filter_by(email=email).first()
            if email_existente:
                return jsonify({"status": "erro", "mensagem": "Email já cadastrado"}), 400
                
            # Processar comissão com valor padrão em caso de erro
            try:
                comissao = float(dados.get('comissao_percentual', 50.0))
                if not (0 <= comissao <= 100):
                    comissao = 50.0
            except (ValueError, TypeError):
                comissao = 50.0
                
            # Criar usuário e barbeiro em uma transação
            try:
                # Criar usuário
                usuario = Usuario(
                    nome=dados.get('nome'),
                    email=email,
                    perfil='barbeiro',
                    telefone=dados.get('telefone')
                )
                usuario.senha = dados.get('senha')
                
                db.session.add(usuario)
                db.session.flush()  # Obter ID sem commit
                
                # Criar barbeiro
                barbeiro = Barbeiro(
                    usuario_id=usuario.id,
                    especialidades=dados.get('especialidades', ''),
                    comissao_percentual=comissao,
                    disponivel=True
                )
                
                db.session.add(barbeiro)
                db.session.commit()
                
                return jsonify({
                    "status": "sucesso", 
                    "mensagem": "Barbeiro criado com sucesso",
                    "barbeiro": barbeiro.to_dict()
                }), 201
                
            except Exception as e:
                db.session.rollback()
                print(f"ERRO AO CRIAR BARBEIRO: {str(e)}")
                import traceback
                print(traceback.format_exc())
                return jsonify({
                    "status": "erro", 
                    "mensagem": f"Erro ao criar barbeiro: {str(e)}"
                }), 500
                
    except Exception as e:
        import traceback
        traceback_str = traceback.format_exc()
        print("ERRO AO SALVAR BARBEIRO (ROTA SIMPLES):", str(e))
        print(traceback_str)
        return jsonify({
            "status": "erro",
            "mensagem": f"Erro inesperado: {str(e)}",
            "detalhes": traceback_str
        }), 500