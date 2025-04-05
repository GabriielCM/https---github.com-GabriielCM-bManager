from app import db
from app.models.base import Base

class Produto(Base):
    __tablename__ = 'produtos'
    
    codigo = db.Column(db.String(20), unique=True, nullable=True)
    nome = db.Column(db.String(100), unique=True, nullable=False)
    descricao = db.Column(db.Text, nullable=True)
    categoria = db.Column(db.String(50), nullable=True)
    marca = db.Column(db.String(50), nullable=True)
    unidade_medida = db.Column(db.String(20), nullable=True, default='un')
    preco = db.Column(db.Float, nullable=False)
    preco_custo = db.Column(db.Float, nullable=True)
    quantidade_estoque = db.Column(db.Integer, default=0)
    estoque_minimo = db.Column(db.Integer, default=5)
    imagem_url = db.Column(db.String(255), nullable=True)
    
    # Relacionamentos
    venda_itens = db.relationship('VendaItem', backref='produto', lazy=True)
    movimentos_estoque = db.relationship('MovimentoEstoque', backref='produto', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'codigo': self.codigo,
            'nome': self.nome,
            'descricao': self.descricao,
            'categoria': self.categoria,
            'marca': self.marca,
            'unidade_medida': self.unidade_medida,
            'preco': self.preco,
            'preco_custo': self.preco_custo,
            'quantidade_estoque': self.quantidade_estoque,
            'estoque_minimo': self.estoque_minimo,
            'imagem_url': self.imagem_url,
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
        
        return self
    
    def verificar_estoque_baixo(self):
        """
        Verifica se o produto está com estoque abaixo do mínimo
        """
        return self.quantidade_estoque <= self.estoque_minimo
    
    def calcular_margem_lucro(self):
        """
        Calcula a margem de lucro do produto
        """
        if not self.preco_custo or self.preco_custo <= 0:
            return None
        
        return ((self.preco - self.preco_custo) / self.preco_custo) * 100 