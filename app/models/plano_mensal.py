from app import db
from app.models.base import Base
from datetime import date, timedelta

class PlanoMensal(Base):
    __tablename__ = 'planos_mensais'
    
    nome = db.Column(db.String(100), unique=True, nullable=False)
    descricao = db.Column(db.Text, nullable=True)
    valor = db.Column(db.Float, nullable=False)
    duracao_dias = db.Column(db.Integer, default=30, nullable=False)
    
    # Relacionamentos
    servicos = db.relationship('PlanoMensalServico', backref='plano', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'descricao': self.descricao,
            'valor': self.valor,
            'duracao_dias': self.duracao_dias,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }


class PlanoMensalServico(Base):
    __tablename__ = 'plano_mensal_servicos'
    
    plano_mensal_id = db.Column(db.Integer, db.ForeignKey('planos_mensais.id'), nullable=False)
    servico_id = db.Column(db.Integer, db.ForeignKey('servicos.id'), nullable=False)
    quantidade_inclusa = db.Column(db.Integer, default=1, nullable=False)
    
    # Relacionamentos
    servico = db.relationship('Servico', backref='planos', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'plano_mensal_id': self.plano_mensal_id,
            'plano_nome': self.plano.nome if self.plano else None,
            'servico_id': self.servico_id,
            'servico_nome': self.servico.nome if self.servico else None,
            'quantidade_inclusa': self.quantidade_inclusa,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        } 