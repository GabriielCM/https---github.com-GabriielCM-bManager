from app import db
from app.models.base import Base
from datetime import datetime

class Venda(Base):
    __tablename__ = 'vendas'
    
    cliente_id = db.Column(db.Integer, db.ForeignKey('clientes.id'), nullable=True)
    barbeiro_id = db.Column(db.Integer, db.ForeignKey('barbeiros.id'), nullable=True)
    data_hora = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    valor_total = db.Column(db.Float, default=0.0, nullable=False)
    valor_desconto = db.Column(db.Float, default=0.0, nullable=False)
    percentual_imposto = db.Column(db.Float, default=0.0, nullable=False)
    valor_imposto = db.Column(db.Float, default=0.0, nullable=False)
    observacao = db.Column(db.String(255), nullable=True)
    status = db.Column(db.String(20), default='finalizada', nullable=False)
    
    # Relacionamentos
    itens = db.relationship('VendaItem', backref='venda', lazy=True, cascade='all, delete-orphan')
    pagamentos = db.relationship('Pagamento', backref='venda', lazy=True)
    barbeiro = db.relationship('Barbeiro', backref='vendas', lazy=True)
    
    def calcular_total(self):
        subtotal = sum(item.valor_unitario * item.quantidade for item in self.itens)
        total_com_desconto = subtotal - self.valor_desconto
        
        # Garantir que o total não fique negativo caso o desconto seja maior que o subtotal
        if total_com_desconto < 0:
            total_com_desconto = 0
            
        # Calcular imposto se percentual maior que zero
        if self.percentual_imposto > 0:
            self.valor_imposto = round(total_com_desconto * (self.percentual_imposto / 100), 2)
        else:
            self.valor_imposto = 0
            
        # Valor final
        self.valor_total = round(total_com_desconto + self.valor_imposto, 2)
        return self.valor_total
    
    def to_dict(self):
        return {
            'id': self.id,
            'cliente_id': self.cliente_id,
            'cliente_nome': self.cliente.nome if self.cliente else 'Cliente não identificado',
            'barbeiro_id': self.barbeiro_id,
            'barbeiro_nome': self.barbeiro.usuario.nome if self.barbeiro and hasattr(self.barbeiro, 'usuario') else None,
            'data_hora': self.data_hora.isoformat() if self.data_hora else None,
            'valor_total': self.valor_total,
            'valor_desconto': self.valor_desconto,
            'percentual_imposto': self.percentual_imposto,
            'valor_imposto': self.valor_imposto,
            'subtotal': sum(item.valor_unitario * item.quantidade for item in self.itens) if self.itens else 0,
            'observacao': self.observacao,
            'status': self.status,
            'itens': [item.to_dict() for item in self.itens] if self.itens else [],
            'pagamentos': [pagamento.to_dict() for pagamento in self.pagamentos] if self.pagamentos else [],
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }


class VendaItem(Base):
    __tablename__ = 'venda_itens'
    
    venda_id = db.Column(db.Integer, db.ForeignKey('vendas.id'), nullable=False)
    produto_id = db.Column(db.Integer, db.ForeignKey('produtos.id'), nullable=False)
    quantidade = db.Column(db.Integer, nullable=False)
    valor_unitario = db.Column(db.Float, nullable=False)
    percentual_desconto = db.Column(db.Float, default=0.0, nullable=False)
    
    def to_dict(self):
        valor_total = self.quantidade * self.valor_unitario
        desconto = round(valor_total * (self.percentual_desconto / 100), 2) if self.percentual_desconto > 0 else 0
        
        return {
            'id': self.id,
            'venda_id': self.venda_id,
            'produto_id': self.produto_id,
            'produto_nome': self.produto.nome if self.produto else None,
            'quantidade': self.quantidade,
            'valor_unitario': self.valor_unitario,
            'percentual_desconto': self.percentual_desconto,
            'valor_desconto': desconto,
            'valor_total': round(valor_total - desconto, 2),
            'created_at': self.created_at,
            'updated_at': self.updated_at
        } 