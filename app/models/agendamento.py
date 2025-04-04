from app import db
from app.models.base import Base
from datetime import datetime

class Agendamento(Base):
    __tablename__ = 'agendamentos'
    
    cliente_id = db.Column(db.Integer, db.ForeignKey('clientes.id'), nullable=False, index=True)
    barbeiro_id = db.Column(db.Integer, db.ForeignKey('barbeiros.id'), nullable=False, index=True)
    data_hora_inicio = db.Column(db.DateTime, nullable=False)
    data_hora_fim = db.Column(db.DateTime, nullable=False)
    status = db.Column(db.String(20), default='pendente', nullable=False, index=True)
    observacoes = db.Column(db.Text, nullable=True)
    
    # Relacionamentos
    servicos = db.relationship('AgendamentoServico', backref='agendamento', lazy=True, cascade='all, delete-orphan')
    atendimento = db.relationship('Atendimento', backref='agendamento', uselist=False, lazy=True)
    
    # Validador para o status
    @db.validates('status')
    def validate_status(self, key, value):
        estados_validos = ['pendente', 'confirmado', 'em_andamento', 'concluido', 'cancelado']
        if value not in estados_validos:
            raise ValueError(f"Status '{value}' inválido. Status permitidos: {', '.join(estados_validos)}")
        return value
    
    def to_dict(self):
        return {
            'id': self.id,
            'cliente_id': self.cliente_id,
            'barbeiro_id': self.barbeiro_id,
            'cliente_nome': self.cliente.nome if self.cliente else None,
            'barbeiro_nome': self.barbeiro.usuario.nome if self.barbeiro and self.barbeiro.usuario else None,
            'data_hora_inicio': self.data_hora_inicio.isoformat() if self.data_hora_inicio else None,
            'data_hora_fim': self.data_hora_fim.isoformat() if self.data_hora_fim else None,
            'status': self.status,
            'observacoes': self.observacoes,
            'servicos': [s.servico.to_dict() for s in self.servicos] if self.servicos else [],
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }

    @staticmethod
    def verificar_disponibilidade(barbeiro_id, data_hora_inicio, data_hora_fim, agendamento_id=None):
        # Verifica se o horário está disponível para o barbeiro
        query = Agendamento.query.filter(
            Agendamento.barbeiro_id == barbeiro_id,
            Agendamento.status != 'cancelado',
            db.or_(
                # Verifica se o início do novo agendamento está dentro de outro agendamento
                db.and_(
                    Agendamento.data_hora_inicio <= data_hora_inicio,
                    Agendamento.data_hora_fim > data_hora_inicio
                ),
                # Verifica se o fim do novo agendamento está dentro de outro agendamento
                db.and_(
                    Agendamento.data_hora_inicio < data_hora_fim,
                    Agendamento.data_hora_fim >= data_hora_fim
                ),
                # Verifica se o novo agendamento engloba completamente outro agendamento
                db.and_(
                    Agendamento.data_hora_inicio >= data_hora_inicio,
                    Agendamento.data_hora_fim <= data_hora_fim
                )
            )
        )
        
        # Se estiver atualizando um agendamento existente, exclua-o da verificação
        if agendamento_id:
            query = query.filter(Agendamento.id != agendamento_id)
            
        return query.count() == 0


class AgendamentoServico(Base):
    __tablename__ = 'agendamento_servicos'
    
    agendamento_id = db.Column(db.Integer, db.ForeignKey('agendamentos.id'), nullable=False, index=True)
    servico_id = db.Column(db.Integer, db.ForeignKey('servicos.id'), nullable=False, index=True)
    
    # Relacionamentos
    servico = db.relationship('Servico')
    
    def to_dict(self):
        return {
            'id': self.id,
            'agendamento_id': self.agendamento_id,
            'servico_id': self.servico_id,
            'servico': self.servico.to_dict() if self.servico else None,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        } 