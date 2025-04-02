from app import db
from app.models.base import Base

class Barbeiro(Base):
    __tablename__ = 'barbeiros'
    
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=False)
    especialidades = db.Column(db.Text, nullable=True)  # Lista separada por vírgulas
    comissao_percentual = db.Column(db.Float, default=50.0)
    disponivel = db.Column(db.Boolean, default=True)
    
    # Relacionamentos
    agendamentos = db.relationship('Agendamento', backref='barbeiro', lazy=True)
    atendimentos = db.relationship('Atendimento', backref='barbeiro', lazy=True)
    
    def to_dict(self):
        especialidades_lista = self.especialidades.split(',') if self.especialidades else []
        
        return {
            'id': self.id,
            'usuario_id': self.usuario_id,
            'nome': self.usuario.nome if self.usuario else None,
            'especialidades': especialidades_lista,
            'comissao_percentual': self.comissao_percentual,
            'disponivel': self.disponivel,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        } 