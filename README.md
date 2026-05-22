# Planificador Hospitalario - TFG

Plataforma para la gestión hospitalaria, permite tanto la generación de turnos como el control de coberturas en tiempo real.
Incorpora gestión de solicitudes, balance horario y gestión de plantillas.

## Requisitos Previos

Para poder ejecutar este proyecto en tu máquina local, necesitarás tener instalado lo siguiente:

* **Node.js** (v18 o superior) para el frontend y backend en Next.js.
* **Python** (v3.8 o superior) para ejecutar el *worker* encargado de los algoritmos de asignación.
* **MongoDB**: Una base de datos en la nube (MongoDB Atlas) o local.
* **MiniZinc**: El entorno para resolver el modelo sin patrones.

### Instalación de MiniZinc 
El algoritmo de generación libre requiere MiniZinc. 
1. Descárgalo desde su [página oficial](https://www.minizinc.org/).
2. Instálalo en tu sistema.
3. **Aviso de ruta:** El código Python espera encontrar el ejecutable por defecto en la ruta de Windows: `C:\Program Files\MiniZinc`. Si lo instalas en otra ruta (o usas Linux/macOS), deberás actualizar la variable `os.environ["PATH"]` en el archivo `modelo_minizinc.py`.

## Instalación y Configuración

**1. Clonar el repositorio e instalar dependencias de Node**
```bash
git clone <url-de-tu-repo>
cd tfg_v4
npm install
```

**2. Instalar dependencias de Python**
El worker que procesa los cuadrantes en segundo plano utiliza librerías específicas. Ejecuta:
```bash
pip install z3-solver minizinc pymongo python-dotenv bcrypt
```

**3. Variables de Entorno**
Crea un archivo llamado `.env.local` en la raíz del proyecto con las siguientes variables:
```env
MONGODB_URL="tu_cadena_de_conexion_a_mongodb"
JWT_SECRET="una_clave_secreta_para_los_tokens"
EMAIL_USER="tu_correo_gmail_para_enviar_los_datos_al_nuevo_usuario@gmail.com"
EMAIL_PASS="tu_contraseña_de_aplicacion_gmail" 
```
**Nota sobre EMAIL_PASS:** No es la contraseña por defecto de tu cuenta de gmail, sino que debes generar una Contraseña de aplicación de 16 caracteres. Para ello, ve a los ajustes de tu cuenta de Google > Seguridad > Verificación en dos pasos > Contraseñas de aplicaciones, y crea una para el proyecto

## Ejecución del Proyecto

El sistema se divide en dos procesos que deben ejecutarse en terminales simultáneas:

**Terminal 1: Iniciar el servidor web (Next.js)**
```bash
npm run dev
```
La aplicación estará disponible en `http://localhost:3000`.

**Terminal 2: Iniciar el Worker de Python**
Para que la aplicación pueda procesar los algoritmos de generación de turnos, debes dejar corriendo el script `worker.py`.
```bash
python worker.py
```
Este script se quedará escuchando tareas en la cola y ejecutará Z3 o MiniZinc según corresponda.

## Carga de Datos de Prueba

Para no empezar con la base de datos vacía, la aplicación incluye un endpoint con datos de prueba.

1. Con el servidor web arrancado, abre en tu navegador: `http://localhost:3000/api/datos-prueba`
2. Verás un mensaje en formato JSON indicando que la "Planta de Traumatología" se ha creado con éxito.

**Nota importante:** Este endpoint genera la plantilla de turnos **únicamente para un mes**. El resto de los meses del año aparecerán sin turnos asignados. Para evitar confusiones y rellenar el año completo, una vez inicies sesión, dirígete a la sección de rotaciones y ejecuta cualquiera de los algoritmos de turnos (explicados en la siguiente sección). 

**Credenciales de acceso para probar (Supervisor):**
* **Usuario:** `lmartinez@gmail.com`
* **Contraseña:** `123`

## Uso de los Algoritmos de Turnos

Una vez dentro como supervisor, puedes probar la generación automática de turnos desde la sección de configuración de rotaciones. Tienes dos modelos disponibles:

### 1. Modelo con Patrones Base (Z3)
Este modelo respeta secuencias cíclicas estrictas definidas por el usuario.
* **Cómo probarlo:** Define un patrón para tu plantilla (por ejemplo, `MMLNNL` donde `M`=Mañana, `N`=Noche, `L`=Libre).
* Asegúrate de marcar la opción de usar patrones al lanzar la generación.
* El motor buscará la manera de encajar a los usuarios en distintos "desfases" de tu patrón para cumplir la cobertura diaria requerida, respetando contratos.

### 2. Modelo Sin Patrones Base (MiniZinc)
Si no defines patrones, el sistema usará un modelo de optimización mediante restricciones (Constraint Programming).
* **Cómo probarlo:** Simplemente establece la demanda de cobertura diaria en la planta y desmarca la opción de patrones.
* El algoritmo generará secuencias personalizadas para cada trabajador, optimizando los balances horarios y asegurando la mezcla de experiencia (Senior/Junior).


