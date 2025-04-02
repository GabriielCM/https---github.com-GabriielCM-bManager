from app import db
from app.models.base import Base
from datetime import datetime

class Venda(Base):
    __tablename__ = 'vendas'
    
    cliente_id = db.Column(db.Integer, db.ForeignKey('clientes.id'), nullable=True)
    data_hora = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    valor_total = db.Column(db.Float, default=0.0, nullable=False)
    status = db.Column(db.String(20), default='finalizada', nullable=False)
    
    # Relacionamentos
    itens = db.relationship('VendaItem', backref='venda', lazy=True, cascade='all, delete-orphan')
    pagamentos = db.relationship('Pagamento', backref='venda', lazy=True)
    
    def calcular_total(self):
        total = sum(item.valor_unitario * item.quantidade for item in self.itens)
        self.valor_total = total
        return total
    
    def to_dict(self):
        return {
            'id': self.id,
            'cliente_id': self.cliente_id,
            'cliente_nome': self.cliente.nome if self.cliente else 'Cliente não identificado',
            'data_hora': self.data_hora.isoformat() if self.data_hora else None,
            'valor_total': self.valor_total,
            'status': self.status,
            'itens': [item.to_dict() for item in self.itens] if self.itens else [],
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }


class VendaItem(Base):
    __tablename__ = 'venda_itens'
    
    venda_id = db.Column(db.Integer, db.ForeignKey('vendas.id'), nullable=False)
    produto_id = db.Column(db.Integer, db.ForeignKey('produtos.id'), nullable=False)
    quantidade = db.Column(db.Integer, nullable=False)
    valor_unitario = db.Column(db.Float, nullable=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'venda_id': self.venda_id,
            'produto_id': self.produto_id,
            'produto_nome': self.produto.nome if self.produto else None,
            'quantidade': self.quantidade,
            'valor_unitario': self.valor_unitario,
            'valor_total': self.quantidade * self.valor_unitario,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        } 