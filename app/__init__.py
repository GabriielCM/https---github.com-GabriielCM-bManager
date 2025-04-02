from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt
from flask_cors import CORS
import os
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

# Inicializar extensões
db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
bcrypt = Bcrypt()

def create_app(config_class=None):
    app = Flask(__name__)
    
    # Habilitar CORS para permitir comunicação entre frontend e backend
    CORS(app)
    
    # Configurar a aplicação
    if config_class:
        app.config.from_object(config_class)
    else:
        # Configuração padrão
        app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'chave_secreta_padrao')
        app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///bmanager.db')
        app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
        app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'jwt_chave_secreta_padrao')
    
    # Inicializar extensões
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    bcrypt.init_app(app)
    
    # Registrar blueprints
    from app.auth import auth_bp
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    
    from app.api.barbeiros import barbeiros_bp
    app.register_blueprint(barbeiros_bp, url_prefix='/api/barbeiros')
    
    from app.api.clientes import clientes_bp
    app.register_blueprint(clientes_bp, url_prefix='/api/clientes')
    
    from app.api.servicos import servicos_bp
    app.register_blueprint(servicos_bp, url_prefix='/api/servicos')
    
    from app.api.produtos import produtos_bp
    app.register_blueprint(produtos_bp, url_prefix='/api/produtos')
    
    from app.api.agendamentos import agendamentos_bp
    app.register_blueprint(agendamentos_bp, url_prefix='/api/agendamentos')
    
    from app.api.vendas import vendas_bp
    app.register_blueprint(vendas_bp, url_prefix='/api/vendas')
    
    from app.api.caixa import caixa_bp
    app.register_blueprint(caixa_bp, url_prefix='/api/caixa')
    
    from app.routes import routes_bp
    app.register_blueprint(routes_bp)
    
    return app 