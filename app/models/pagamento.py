from app import db
from app.models.base import Base

class Pagamento(Base):
    __tablename__ = 'pagamentos'
    
    tipo = db.Column(db.Enum('pagamento', 'entrada', 'saida', name='tipo_pagamento_enum'), nullable=False)
    valor = db.Column(db.Float, nullable=False)
    forma_pagamento = db.Column(db.Enum('dinheiro', 'cartao_credito', 'cartao_debito', 'pix', 'transferencia', name='forma_pagamento_enum'), nullable=False)
    status = db.Column(db.Enum('pendente', 'confirmado', 'cancelado', name='status_pagamento_enum'), nullable=False, default='pendente')
    descricao = db.Column(db.String(200), nullable=True)
    
    # Relacionamentos
    venda_id = db.Column(db.Integer, db.ForeignKey('vendas.id'), nullable=True)
    atendimento_id = db.Column(db.Integer, db.ForeignKey('atendimentos.id'), nullable=True)
    plano_mensal_id = db.Column(db.Integer, db.ForeignKey('planos_mensais.id'), nullable=True)
    caixa_diario_id = db.Column(db.Integer, db.ForeignKey('caixa_diario.id'), nullable=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'tipo': self.tipo,
            'valor': self.valor,
            'forma_pagamento': self.forma_pagamento,
            'status': self.status,
            'descricao': self.descricao,
            'venda_id': self.venda_id,
            'atendimento_id': self.atendimento_id,
            'plano_mensal_id': self.plano_mensal_id,
            'caixa_diario_id': self.caixa_diario_id,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        } 