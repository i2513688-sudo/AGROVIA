# Agrovia - Sistema Web conectado a MariaDB/phpMyAdmin

## 1. Crear la base de datos
En phpMyAdmin:
1. Crear la base de datos `agrovia_v01` con cotejamiento `utf8mb4_unicode_ci`.
2. Importar `sql/agrovia_v01.sql`.

Si la base `agrovia_v01` ya existía y ya ejecutaste `sql/migracion_contenidos_educativos.sql`, selecciona esa base en phpMyAdmin e importa una sola vez `sql/migracion_video_contenidos_educativos.sql`.

Para enlazar el comprobante fiscal seleccionado con cada pago en una base existente, importa una sola vez `sql/migracion_pago_facturacion.sql` después de crear `datos_facturacion`.

## 2. Configurar conexión
Copiar `.env.example` como `.env` y revisar:
- DB_HOST
- DB_PORT
- DB_NAME
- DB_USER
- DB_PASSWORD
- SECRET_KEY

Genera una clave aleatoria para `SECRET_KEY` con `python -c "import secrets; print(secrets.token_hex(32))"` y no la compartas ni la guardes en el repositorio. En producción define además `APP_ENV=production`, configura el servicio detrás de HTTPS y usa `SESSION_COOKIE_SECURE=true`; la aplicación rechaza iniciar en producción sin una clave de al menos 32 caracteres. El modo de depuración está desactivado.

Los formularios POST incluyen protección CSRF automáticamente. Las cookies de sesión usan `HttpOnly` y `SameSite=Lax`. Mantén la clave secreta privada y reiníciala si se filtra.

Para habilitar la recuperación de contraseña, configurar también `APP_BASE_URL` (URL pública de la aplicación), `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` y `SMTP_USE_TLS` en `.env`. El enlace expira en 30 minutos y cada cuenta puede solicitar hasta 3 enlaces por cada ventana de 15 minutos.

La aplicación invalida los enlaces de recuperación utilizados al cambiar la contraseña. Configura SMTP con credenciales válidas y prueba el flujo con una cuenta controlada; los errores de conexión se registran en el log de la aplicación.

Para XAMPP/MariaDB local normalmente:
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=

## 3. Instalar dependencias
Windows:
```bash
py -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

## 4. Crear usuario administrador
```bash
python crear_admin.py
```

## 5. Ejecutar
```bash
python app.py
```
Abrir: http://127.0.0.1:5000

## 6. Recuperación de cuenta
El enlace de recuperación solo se envía cuando SMTP está configurado. Los tokens se almacenan como hash, expiran a los 30 minutos y se invalidan al cambiar la contraseña.

## Módulos incluidos
- Inicio / marketplace
- Inicio de sesión
- Dashboard
- Catálogo de productos
- Predios, direcciones de entrega y direcciones fiscales con selección de ubigeo
- Lotes publicados
- Usuarios y roles
- Operaciones con historial de estados visible para productor y comprador participantes; 5 puntos por participante cuando la operación está completada y ambos la calificaron
- Dashboard administrativo con métricas de lotes disponibles, operaciones activas, pagos por revisar, cosechas en proceso, entregas pendientes e incidencias abiertas
- Mi cuenta
- Referencias calculadas de precios, cosecha y logística a través de vistas SQL

El módulo de Cosechas muestra los parámetros y costos referenciales activos de `vw_parametros_cosecha_demo`, incluyendo calidad y fuente del dato. Las rutas con permisos operativos validan las asignaciones activas en `usuarios_roles`, `roles`, `roles_permisos` y `permisos`; los cambios de rol o permiso se aplican sin depender de los datos guardados al iniciar sesión.

Los compradores deben registrar una dirección de entrega con ubigeo antes de cotizar. Al aceptar una cotización, administración confirma los kilómetros por carretera, la carga en kg, el tipo de vehículo y los peajes. El costo base, el precio al cliente y el detalle de distancia, carga y tipo de vehículo se conservan en `cotizaciones_operacion` y `cotizaciones_logisticas`. Al asignar el transporte, el sistema exige un vehículo activo, disponible, perteneciente al transportista elegido y con capacidad suficiente para la carga registrada; la asignación actualiza vehículo, operación y lote en una transacción. El rango de producción verificado se propone como carga inicial cuando existe; administración debe confirmarlo. La distancia es manual porque el sistema no tiene un proveedor de rutas conectado.

La aplicación consulta directamente las tablas de la BD `agrovia_v01`; no crea una base de datos paralela.
