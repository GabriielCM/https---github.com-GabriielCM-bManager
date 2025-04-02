from app import db
from app.models.base import Base

class MovimentoEstoque(Base):
    __tablename__ = 'movimentos_estoque'
    
    produto_id = db.Column(db.Integer, db.ForeignKey('produtos.id'), nullable=False)
    tipo = db.Column(db.Enum('entrada', 'saida', 'ajuste', name='tipo_movimento_enum'), nullable=False)
    quantidade = db.Column(db.Integer, nullable=False)
    motivo = db.Column(db.Text, nullable=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'produto_id': self.produto_id,
            'produto_nome': self.produto.nome if self.produto else None,
            'tipo': self.tipo,
            'quantidade': self.quantidade,
            'motivo': self.motivo,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        } 