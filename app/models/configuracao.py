from app import db
from app.models.base import Base

class Configuracao(Base):
    __tablename__ = 'configuracoes'
    
    chave = db.Column(db.String(100), unique=True, nullable=False)
    valor = db.Column(db.Text, nullable=True)
    descricao = db.Column(db.Text, nullable=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'chave': self.chave,
            'valor': self.valor,
            'descricao': self.descricao,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }
    
    @staticmethod
    def obter_valor(chave, valor_padrao=None):
        config = Configuracao.query.filter_by(chave=chave).first()
        if config:
            return config.valor
        return valor_padrao 