from app import db
from app.models.base import Base

class Cliente(Base):
    __tablename__ = 'clientes'
    
    nome = db.Column(db.String(100), nullable=False)
    telefone = db.Column(db.String(20), unique=True, nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=True)
    
    # Relacionamentos
    agendamentos = db.relationship('Agendamento', backref='cliente', lazy=True)
    vendas = db.relationship('Venda', backref='cliente', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'telefone': self.telefone,
            'email': self.email,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        } 