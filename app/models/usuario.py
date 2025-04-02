from app import db, bcrypt
from app.models.base import Base
from sqlalchemy.ext.hybrid import hybrid_property

class Usuario(Base):
    __tablename__ = 'usuarios'
    
    nome = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    _senha_hash = db.Column(db.String(128), nullable=False)
    perfil = db.Column(db.Enum('admin', 'barbeiro', 'cliente', name='perfil_enum'), nullable=False)
    telefone = db.Column(db.String(20), nullable=True)
    ativo = db.Column(db.Boolean, default=True)
    token_reset_senha = db.Column(db.String(100), nullable=True)
    
    # Relacionamentos
    barbeiro = db.relationship('Barbeiro', backref='usuario', uselist=False, lazy=True)
    
    @hybrid_property
    def senha(self):
        raise AttributeError('senha: acesso somente para escrita')
    
    @senha.setter
    def senha(self, valor):
        self._senha_hash = bcrypt.generate_password_hash(valor).decode('utf-8')
    
    def verificar_senha(self, senha):
        return bcrypt.check_password_hash(self._senha_hash, senha)
    
    def to_dict(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'email': self.email,
            'perfil': self.perfil,
            'telefone': self.telefone,
            'ativo': self.ativo,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        } 