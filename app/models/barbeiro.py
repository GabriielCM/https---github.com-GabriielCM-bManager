from app import db
from app.models.base import Base

class Barbeiro(Base):
    __tablename__ = 'barbeiros'
    
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=False, index=True)
    especialidades = db.Column(db.Text, nullable=True)  # Lista separada por vírgulas
    comissao_percentual = db.Column(db.Float, default=50.0)
    disponivel = db.Column(db.Boolean, default=True)
    
    # Validações
    @db.validates('comissao_percentual')
    def validate_comissao(self, key, value):
        if value < 0 or value > 100:
            raise ValueError("Comissão deve estar entre 0% e 100%")
        return value
    
    # Relacionamentos
    agendamentos = db.relationship('Agendamento', backref='barbeiro', lazy=True)
    # Relacionamento com Atendimento é criado pelo backref em Atendimento
    
    def to_dict(self):
        try:
            especialidades_lista = self.especialidades.split(',') if self.especialidades else []
            
            # Obter informações básicas do usuário associado
            usuario_info = {
                'nome': None,
                'email': None,
                'telefone': None
            }
            
            if hasattr(self, 'usuario') and self.usuario:
                usuario_info = {
                    'nome': self.usuario.nome,
                    'email': self.usuario.email,
                    'telefone': self.usuario.telefone if hasattr(self.usuario, 'telefone') else None
                }
            
            # Calcular quantos agendamentos o barbeiro tem hoje
            from datetime import datetime, timedelta
            hoje_inicio = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            hoje_fim = hoje_inicio + timedelta(days=1)
            
            agendamentos_hoje = 0
            if hasattr(self, 'agendamentos'):
                agendamentos_hoje = len([a for a in self.agendamentos 
                                    if a.data_hora_inicio >= hoje_inicio and 
                                    a.data_hora_inicio < hoje_fim and
                                    a.status != 'cancelado'])
            
            return {
                'id': self.id,
                'usuario_id': self.usuario_id,
                'nome': usuario_info['nome'],
                'email': usuario_info['email'],
                'telefone': usuario_info['telefone'],
                'especialidades': especialidades_lista,
                'especialidades_texto': self.especialidades or '',
                'comissao_percentual': self.comissao_percentual,
                'disponivel': self.disponivel,
                'agendamentos_hoje': agendamentos_hoje,
                'created_at': self.created_at,
                'updated_at': self.updated_at
            }
        except Exception as e:
            print(f"Erro ao converter barbeiro para dict: {str(e)}")
            # Retornar um dict mínimo em caso de erro
            return {
                'id': self.id,
                'usuario_id': self.usuario_id,
                'disponivel': self.disponivel,
                'comissao_percentual': self.comissao_percentual,
                'error': f"Erro ao processar dados completos: {str(e)}"
            } 