from app import db
from app.models.base import Base
from datetime import datetime

class Atendimento(Base):
    __tablename__ = 'atendimentos'
    
    agendamento_id = db.Column(db.Integer, db.ForeignKey('agendamentos.id'), nullable=False)
    barbeiro_id = db.Column(db.Integer, db.ForeignKey('barbeiros.id'), nullable=False)
    data_hora_inicio = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'agendamento_id': self.agendamento_id,
            'barbeiro_id': self.barbeiro_id,
            'barbeiro_nome': self.barbeiro.usuario.nome if self.barbeiro and self.barbeiro.usuario else None,
            'data_hora_inicio': self.data_hora_inicio.isoformat() if self.data_hora_inicio else None,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        } 