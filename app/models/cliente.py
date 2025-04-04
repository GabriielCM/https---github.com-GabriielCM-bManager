from app import db
from app.models.base import Base
from datetime import datetime
import re

class Cliente(Base):
    __tablename__ = 'clientes'
    
    nome = db.Column(db.String(100), nullable=False, index=True)
    telefone = db.Column(db.String(20), nullable=False, unique=True)
    email = db.Column(db.String(100), unique=True)
    
    # Validadores
    @db.validates('telefone')
    def validate_telefone(self, key, value):
        # Aceita apenas números, parênteses, traços e espaços
        if not value or not re.match(r'^[0-9()\-\s]+$', value):
            raise ValueError("Formato de telefone inválido")
        return value
    
    @db.validates('email')
    def validate_email(self, key, value):
        if value:  # Só valida se um email for fornecido (não é obrigatório)
            # Verifica formato básico de email
            if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', value):
                raise ValueError("Formato de email inválido")
        return value
    
    # Relacionamentos
    agendamentos = db.relationship('Agendamento', backref='cliente', lazy='dynamic')
    vendas = db.relationship('Venda', backref='cliente', lazy='dynamic')
    
    def __repr__(self):
        return f'<Cliente {self.nome}>'
    
    def to_dict(self):
        """Converte o objeto cliente para um dicionário"""
        # Obter a data do último agendamento, se existir
        ultimo_atendimento = None
        if hasattr(self, 'agendamentos') and self.agendamentos.count() > 0:
            agendamento = self.agendamentos.filter_by(status='concluido').order_by(db.desc('data_hora_inicio')).first()
            if agendamento:
                ultimo_atendimento = agendamento.data_hora_inicio

        return {
            'id': self.id,
            'nome': self.nome,
            'telefone': self.telefone,
            'email': self.email,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'ultimo_atendimento': ultimo_atendimento.isoformat() if ultimo_atendimento else None
        } 