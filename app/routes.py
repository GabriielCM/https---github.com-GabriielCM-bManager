from flask import Blueprint, render_template, send_from_directory, redirect, url_for
import os

routes_bp = Blueprint('routes', __name__)

@routes_bp.route('/')
def index():
    return render_template('index.html')

@routes_bp.route('/agenda')
def agenda():
    return render_template('pages/agenda.html')

@routes_bp.route('/agenda-test')
def agenda_test():
    return send_from_directory(os.path.abspath('.'), 'agenda_test.html')

@routes_bp.route('/agenda-teste')
def agenda_teste():
    """Rota para testes de diagnóstico da página de agenda"""
    return render_template('pages/agenda.html', modo_teste=True)

# Novas rotas para outras seções do sistema
@routes_bp.route('/clientes')
def clientes():
    return render_template('pages/clientes.html')

@routes_bp.route('/servicos')
def servicos():
    return render_template('pages/servicos.html')

@routes_bp.route('/produtos')
def produtos():
    return render_template('pages/produtos.html')

@routes_bp.route('/vendas')
def vendas():
    return render_template('pages/vendas.html')

@routes_bp.route('/barbeiros')
def barbeiros():
    return render_template('pages/barbeiros.html')

@routes_bp.route('/teste-barbeiro')
def teste_barbeiro():
    """Página de teste para o cadastro de barbeiros"""
    return render_template('pages/teste_barbeiro.html')

@routes_bp.route('/relatorios')
def relatorios():
    return render_template('pages/relatorios.html')

@routes_bp.route('/configuracoes')
def configuracoes():
    return render_template('pages/configuracoes.html') 