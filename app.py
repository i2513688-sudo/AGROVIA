from datetime import datetime
from functools import wraps
import os
from pathlib import Path

from flask import Flask, jsonify, redirect, render_template, request, session, url_for
from flask_bcrypt import Bcrypt
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv
from sqlalchemy import CheckConstraint


BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")
app = Flask(__name__)
app.config["SECRET_KEY"] = "agrovia-local-development-key"
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv(
    "DATABASE_URL",
    f"sqlite:///{BASE_DIR / 'agrovia.db'}",
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)
bcrypt = Bcrypt(app)


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(160), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False)
    company = db.Column(db.String(160), nullable=True)
    location = db.Column(db.String(160), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    products = db.relationship("Product", backref="farmer", lazy=True, cascade="all, delete-orphan")
    orders = db.relationship("Order", backref="buyer", lazy=True, cascade="all, delete-orphan")


class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    category = db.Column(db.String(60), nullable=False)
    description = db.Column(db.Text, nullable=False)
    quantity = db.Column(db.Float, nullable=False)
    unit = db.Column(db.String(30), nullable=False)
    price = db.Column(db.Float, nullable=False)
    harvest_date = db.Column(db.String(40), nullable=True)
    image = db.Column(db.String(500), nullable=True)
    farmer_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    orders = db.relationship("Order", backref="product", lazy=True, cascade="all, delete-orphan")
    __table_args__ = (CheckConstraint("quantity > 0", name="positive_quantity"),)


class Order(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    quantity = db.Column(db.Float, nullable=False)
    message = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), default="pending", nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    buyer_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey("product.id"), nullable=False)


def current_user():
    user_id = session.get("user_id")
    return db.session.get(User, user_id) if user_id else None


def login_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not current_user():
            return jsonify({"error": "Necesitas iniciar sesión para continuar."}), 401
        return view(*args, **kwargs)

    return wrapped


def role_required(role):
    def decorator(view):
        @wraps(view)
        @login_required
        def wrapped(*args, **kwargs):
            user = current_user()
            if user.role != role:
                return jsonify({"error": "Esta acción no está disponible para tu tipo de cuenta."}), 403
            return view(*args, **kwargs)

        return wrapped

    return decorator


def user_payload(user):
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "company": user.company,
        "location": user.location,
    }


def product_payload(product, include_orders=False):
    payload = {
        "id": product.id,
        "name": product.name,
        "category": product.category,
        "description": product.description,
        "quantity": product.quantity,
        "unit": product.unit,
        "price": product.price,
        "harvest_date": product.harvest_date,
        "image": product.image,
        "farmer_id": product.farmer_id,
        "farmer": user_payload(product.farmer),
        "created_at": product.created_at.isoformat(),
    }
    if include_orders:
        payload["orders"] = [order_payload(order) for order in product.orders]
    return payload


def order_payload(order):
    return {
        "id": order.id,
        "quantity": order.quantity,
        "message": order.message,
        "status": order.status,
        "created_at": order.created_at.isoformat(),
        "buyer": user_payload(order.buyer),
        "product": {"id": order.product.id, "name": order.product.name, "unit": order.product.unit},
    }


@app.get("/")
def home():
    return render_template("index.html")


@app.get("/login")
def login_page():
    return render_template("login.html")


@app.get("/register")
def register_page():
    return render_template("register.html")


@app.get("/dashboard")
def dashboard_page():
    if not current_user():
        return redirect(url_for("login_page"))
    return render_template("dashboard.html", user=current_user())


@app.get("/api/session")
def session_info():
    user = current_user()
    return jsonify({"user": user_payload(user) if user else None})


@app.post("/api/register")
def register():
    data = request.get_json() or {}
    required = ["name", "email", "password", "role"]
    if any(not data.get(field) for field in required):
        return jsonify({"error": "Completa todos los campos obligatorios."}), 400
    if data["role"] not in ("farmer", "buyer"):
        return jsonify({"error": "Selecciona un tipo de cuenta válido."}), 400
    if len(data["password"]) < 6:
        return jsonify({"error": "La contraseña debe tener al menos 6 caracteres."}), 400
    email = data["email"].strip().lower()
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Ya existe una cuenta con ese correo."}), 409
    user = User(
        name=data["name"].strip(),
        email=email,
        password_hash=bcrypt.generate_password_hash(data["password"]).decode("utf-8"),
        role=data["role"],
        company=data.get("company", "").strip() or None,
        location=data.get("location", "").strip() or None,
    )
    db.session.add(user)
    db.session.commit()
    session["user_id"] = user.id
    return jsonify({"user": user_payload(user)}), 201


@app.post("/api/login")
def login():
    data = request.get_json() or {}
    user = User.query.filter_by(email=data.get("email", "").strip().lower()).first()
    if not user or not bcrypt.check_password_hash(user.password_hash, data.get("password", "")):
        return jsonify({"error": "Correo o contraseña incorrectos."}), 401
    session["user_id"] = user.id
    return jsonify({"user": user_payload(user)})


@app.post("/api/logout")
def logout():
    session.clear()
    return jsonify({"ok": True})


@app.get("/api/products")
def list_products():
    products = Product.query.order_by(Product.created_at.desc()).all()
    return jsonify({"products": [product_payload(product) for product in products]})


@app.post("/api/products")
@role_required("farmer")
def create_product():
    data = request.get_json() or {}
    required = ["name", "category", "description", "quantity", "unit", "price"]
    if any(data.get(field) in (None, "") for field in required):
        return jsonify({"error": "Completa los datos del lote."}), 400
    try:
        quantity = float(data["quantity"])
        price = float(data["price"])
    except (TypeError, ValueError):
        return jsonify({"error": "Cantidad y precio deben ser números."}), 400
    if quantity <= 0 or price <= 0:
        return jsonify({"error": "Cantidad y precio deben ser mayores a cero."}), 400
    product = Product(
        name=data["name"].strip(),
        category=data["category"].strip(),
        description=data["description"].strip(),
        quantity=quantity,
        unit=data["unit"].strip(),
        price=price,
        harvest_date=data.get("harvest_date", "").strip() or None,
        image=data.get("image", "").strip() or None,
        farmer_id=current_user().id,
    )
    db.session.add(product)
    db.session.commit()
    return jsonify({"product": product_payload(product)}), 201


@app.delete("/api/products/<int:product_id>")
@role_required("farmer")
def delete_product(product_id):
    product = db.session.get(Product, product_id)
    if not product or product.farmer_id != current_user().id:
        return jsonify({"error": "No puedes eliminar este lote."}), 404
    db.session.delete(product)
    db.session.commit()
    return jsonify({"ok": True})


@app.get("/api/orders")
@login_required
def list_orders():
    user = current_user()
    if user.role == "buyer":
        orders = Order.query.filter_by(buyer_id=user.id).order_by(Order.created_at.desc()).all()
    else:
        orders = Order.query.join(Product).filter(Product.farmer_id == user.id).order_by(Order.created_at.desc()).all()
    return jsonify({"orders": [order_payload(order) for order in orders]})


@app.post("/api/orders")
@role_required("buyer")
def create_order():
    data = request.get_json() or {}
    product = db.session.get(Product, data.get("product_id"))
    if not product:
        return jsonify({"error": "Ese lote ya no está disponible."}), 404
    try:
        quantity = float(data.get("quantity", 0))
    except (TypeError, ValueError):
        quantity = 0
    if quantity <= 0 or quantity > product.quantity:
        return jsonify({"error": f"La cantidad debe estar entre 0 y {product.quantity:g} {product.unit}."}), 400
    if product.farmer_id == current_user().id:
        return jsonify({"error": "No puedes solicitar un lote publicado por ti."}), 400
    order = Order(
        quantity=quantity,
        message=(data.get("message") or "").strip() or None,
        buyer_id=current_user().id,
        product_id=product.id,
    )
    db.session.add(order)
    db.session.commit()
    return jsonify({"order": order_payload(order)}), 201


@app.patch("/api/orders/<int:order_id>")
@role_required("farmer")
def update_order(order_id):
    order = db.session.get(Order, order_id)
    if not order or order.product.farmer_id != current_user().id:
        return jsonify({"error": "No puedes actualizar esta solicitud."}), 404
    status = (request.get_json() or {}).get("status")
    if status not in ("accepted", "declined"):
        return jsonify({"error": "Estado no válido."}), 400
    if order.status != "pending":
        return jsonify({"error": "Esta solicitud ya fue procesada."}), 409
    if status == "accepted" and order.quantity > order.product.quantity:
        return jsonify({"error": "Ya no hay suficiente inventario para aceptar esta solicitud."}), 409
    if status == "accepted":
        order.product.quantity -= order.quantity
    order.status = status
    db.session.commit()
    return jsonify({"order": order_payload(order)})


def seed_data():
    if User.query.first():
        return
    farmer = User(
        name="Mariana López",
        email="demo@agrovia.co",
        password_hash=bcrypt.generate_password_hash("demo123").decode("utf-8"),
        role="farmer",
        company="Finca La Esperanza",
        location="Rionegro, Antioquia",
    )
    buyer = User(
        name="Restaurante Sazón Local",
        email="comprador@agrovia.co",
        password_hash=bcrypt.generate_password_hash("demo123").decode("utf-8"),
        role="buyer",
        company="Sazón Local",
        location="Medellín, Antioquia",
    )
    db.session.add_all([farmer, buyer])
    db.session.flush()
    db.session.add_all([
        Product(name="Papa", category="Hortalizas", description="Papa seleccionada, fresca y de excelente calidad para restaurantes y negocios locales.", quantity=840, unit="kg", price=9800, harvest_date="12 sep 2026", image="/static/images/papa.png", farmer_id=farmer.id),
        Product(name="Choclo", category="Granos", description="Choclo fresco y dulce, ideal para cocina tradicional y preparaciones de alto volumen.", quantity=420, unit="kg", price=4200, harvest_date="10 sep 2026", image="/static/images/choclo.png", farmer_id=farmer.id),
        Product(name="Habas", category="Hortalizas", description="Habas frescas de cosecha reciente, cultivadas localmente y listas para tu negocio.", quantity=120, unit="kg", price=39000, harvest_date="28 ago 2026", image="/static/images/habas.png", farmer_id=farmer.id),
    ])
    db.session.commit()


def sync_product_catalog():
    catalog = {
        "Aguacate Hass premium": ("Papa", "Hortalizas", "Papa seleccionada, fresca y de excelente calidad para restaurantes y negocios locales.", "/static/images/papa.png"),
        "Tomate chonto": ("Choclo", "Granos", "Choclo fresco y dulce, ideal para cocina tradicional y preparaciones de alto volumen.", "/static/images/choclo.png"),
        "Café especial lavado": ("Habas", "Hortalizas", "Habas frescas de cosecha reciente, cultivadas localmente y listas para tu negocio.", "/static/images/habas.png"),
    }
    changed = False
    for old_name, (name, category, description, image) in catalog.items():
        product = Product.query.filter_by(name=old_name).first()
        if product:
            product.name = name
            product.category = category
            product.description = description
            product.image = image
            changed = True
    if changed:
        db.session.commit()


with app.app_context():
    db.create_all()
    seed_data()
    sync_product_catalog()


if __name__ == "__main__":
    app.run(debug=True, port=5000)
