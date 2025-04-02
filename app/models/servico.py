from app import db
from app.models.base import Base

class Servico(Base):
    __tablename__ = 'servicos'
    
    nome = db.Column(db.String(100), unique=True, nullable=False)
    descricao = db.Column(db.Text, nullable=True)
    preco = db.Column(db.Float, nullable=False)
    duracao_estimada_min = db.Column(db.Integer, nullable=False)
    
    # Relacionamentos
    agendamento_servicos = db.relationship('AgendamentoServico', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'descricao': self.descricao,
            'preco': self.preco,
            'duracao_estimada_min': self.duracao_estimada_min,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        } 