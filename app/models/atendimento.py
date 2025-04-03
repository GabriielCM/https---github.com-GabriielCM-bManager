from app import db
from app.models.base import Base
from datetime import datetime

class Atendimento(Base):
    __tablename__ = 'atendimentos'
    
    agendamento_id = db.Column(db.Integer, db.ForeignKey('agendamentos.id'), nullable=True)
    cliente_id = db.Column(db.Integer, db.ForeignKey('clientes.id'), nullable=False)
    barbeiro_id = db.Column(db.Integer, db.ForeignKey('barbeiros.id'), nullable=False)
    valor_total = db.Column(db.Float, nullable=False)
    data_hora = db.Column(db.DateTime, nullable=False)
    status = db.Column(db.String(20), default='pendente', nullable=False)
    observacoes = db.Column(db.Text, nullable=True)
    
    # Relacionamentos
    cliente = db.relationship('Cliente', backref='atendimentos')
    barbeiro = db.relationship('Barbeiro', backref='atendimentos_realizados')
    pagamentos = db.relationship('Pagamento', backref='atendimento', lazy=True)
    
    def to_dict(self):
        """Converte o objeto para um dicionário"""
        return {
            'id': self.id,
            'agendamento_id': self.agendamento_id,
            'cliente_id': self.cliente_id,
            'cliente_nome': self.cliente.nome if self.cliente else None,
            'barbeiro_id': self.barbeiro_id,
            'barbeiro_nome': self.barbeiro.usuario.nome if self.barbeiro and self.barbeiro.usuario else None,
            'valor_total': self.valor_total,
            'data_hora': self.data_hora.isoformat() if self.data_hora else None,
            'status': self.status,
            'observacoes': self.observacoes,
            'pagamentos': [p.to_dict() for p in self.pagamentos] if self.pagamentos else [],
            'created_at': self.created_at,
            'updated_at': self.updated_at
        } 