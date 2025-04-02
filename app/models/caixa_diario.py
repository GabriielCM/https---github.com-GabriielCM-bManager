from app import db
from app.models.base import Base
from sqlalchemy.ext.hybrid import hybrid_property

class CaixaDiario(Base):
    __tablename__ = 'caixa_diario'
    
    data_abertura = db.Column(db.DateTime, nullable=False)
    data_fechamento = db.Column(db.DateTime, nullable=True)
    valor_inicial = db.Column(db.Float, nullable=False, default=0)
    valor_final = db.Column(db.Float, nullable=True)
    status = db.Column(db.Enum('aberto', 'fechado', name='status_caixa_enum'), nullable=False, default='aberto')
    usuario_abertura_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=False)
    usuario_fechamento_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=True)
    observacoes = db.Column(db.Text, nullable=True)
    
    # Relacionamentos
    pagamentos = db.relationship('Pagamento', backref='caixa', lazy=True)
    usuario_abertura = db.relationship('Usuario', foreign_keys=[usuario_abertura_id])
    usuario_fechamento = db.relationship('Usuario', foreign_keys=[usuario_fechamento_id])
    
    @hybrid_property
    def total_entradas(self):
        return sum(p.valor for p in self.pagamentos if p.tipo in ['pagamento', 'entrada'])
    
    @hybrid_property
    def total_saidas(self):
        return sum(p.valor for p in self.pagamentos if p.tipo == 'saida')
    
    @hybrid_property
    def saldo(self):
        return self.valor_inicial + self.total_entradas - self.total_saidas
    
    def to_dict(self, include_pagamentos=False):
        result = {
            'id': self.id,
            'data_abertura': self.data_abertura,
            'data_fechamento': self.data_fechamento,
            'valor_inicial': self.valor_inicial,
            'valor_final': self.valor_final,
            'status': self.status,
            'usuario_abertura_id': self.usuario_abertura_id,
            'usuario_fechamento_id': self.usuario_fechamento_id,
            'observacoes': self.observacoes,
            'total_entradas': self.total_entradas,
            'total_saidas': self.total_saidas,
            'saldo': self.saldo,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }
        
        if include_pagamentos:
            result['pagamentos'] = [p.to_dict() for p in self.pagamentos]
            
        return result 