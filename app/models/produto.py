from app import db
from app.models.base import Base

class Produto(Base):
    __tablename__ = 'produtos'
    
    nome = db.Column(db.String(100), unique=True, nullable=False)
    descricao = db.Column(db.Text, nullable=True)
    preco = db.Column(db.Float, nullable=False)
    quantidade_estoque = db.Column(db.Integer, default=0)
    
    # Relacionamentos
    venda_itens = db.relationship('VendaItem', backref='produto', lazy=True)
    movimentos_estoque = db.relationship('MovimentoEstoque', backref='produto', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'descricao': self.descricao,
            'preco': self.preco,
            'quantidade_estoque': self.quantidade_estoque,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }
    
    def atualizar_estoque(self, quantidade, tipo):
        """
        Atualiza a quantidade em estoque e registra o movimento
        tipo: 'entrada', 'saida' ou 'ajuste'
        """
        if tipo == 'entrada':
            self.quantidade_estoque += quantidade
        elif tipo == 'saida':
            if self.quantidade_estoque >= quantidade:
                self.quantidade_estoque -= quantidade
            else:
                raise ValueError(f"Estoque insuficiente para o produto {self.nome}")
        elif tipo == 'ajuste':
            self.quantidade_estoque = quantidade 