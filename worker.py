import os
import time
from pymongo import MongoClient, UpdateOne
from bson.objectid import ObjectId
from dotenv import load_dotenv
from modelo import calcula_turnos_con_patrones
from modelo_minizinc import calcular_turnos_sin_patrones

#Obtenemos la ruta de la url de monog para conectarnos a la base de datos
ruta_env = os.path.join(os.path.dirname(__file__), ".env.local")
load_dotenv(ruta_env)
MONGO_URL = os.environ.get("MONGODB_URL")
if not MONGO_URL:
    raise ValueError("No se encontró MONGODB_URL en las variables de entorno.")

client = MongoClient(MONGO_URL)
db = client.get_database("tfg_V3")


#Obtenemos cada coleccion:
tareas_col = db.tareas
rotaciones_col = db.rotaciones 
plantillas_col = db.plantillas 
usuarios_col = db.usuarios
config_col = db.configuracionAlgoritmo

def procesar_tarea(parametros, planta_id):
    #metemos la planta en la lista de parametros
    parametros["plantaId"] = planta_id
    #comprobamos si vierne la variable usar patrones para saber que modelo tenemos que usar
    usarPatrones = parametros.get("usarPatrones", True);

    if usarPatrones:
        resultadoZ3 = calcula_turnos_con_patrones(datos=parametros)
    else:
        resultadoZ3 = calcular_turnos_sin_patrones(datos=parametros)

    #Borramos todo lo previo que ya no sirve
    rotaciones_col.delete_many({"plantaId": ObjectId(planta_id)})
    
    #es importante borrar los huecos estructurales para evitar que nuevos problemas de cobertura usen estas solicitudes del sistema para no aparecer
    huecos_estructurales = list(db.solicitudes.find({
        "esDeSistema": True,
        "plantaId": ObjectId(planta_id)
    }))

    if huecos_estructurales:
        ids_huecos = [hueco["_id"] for hueco in huecos_estructurales]

        #Elimino las sustituciones asociadas a los huecos 
        db.sustituciones.delete_many({"solicitudRelacionada": {"$in": ids_huecos}})

        #Borro las incidencias relacionadas con eso
        db.incidencias.delete_many({"solicitudRelacionada": {"$in": ids_huecos}})

        #Borro los huecos
        db.solicitudes.delete_many({"_id": {"$in": ids_huecos}})

    #obtenemos la lista de los empleados y borramos sus plantillas
    ids_empleados = [ObjectId(emp["id"]) for emp in parametros.get("empleados", [])]
    if ids_empleados:
        plantillas_col.delete_many({"usuario": {"$in": ids_empleados}});
    #obtenemos los datos ya formateados
    rotaciones = resultadoZ3.get("rotaciones", [])
    plantillas = resultadoZ3.get("plantillas", [])
    horas_usuarios = resultadoZ3.get("horas_usuarios", [])
    patrones = resultadoZ3.get("patrones", [])

    #Insertamos los datos
    if rotaciones:
        rotaciones_col.insert_many(rotaciones)


    #En el caso del modelo con patrones el get devuelve [] y esto no se ejecuta
    if patrones:
        patrones_base = [
            {
                "_id": ObjectId(p["id"]),
                "nombre": p["nombre"],
                "secuencia": p["secuencia"]
            }
            for p in patrones
        ]
        config_col.update_one(
            {"plantaId": ObjectId(planta_id)},
            {"$set": {"patronesBase": patrones_base}},
            upsert=True
        )

    if plantillas:
        plantillas_col.insert_many(plantillas)

    if horas_usuarios:
        operaciones = []
        for h in horas_usuarios:
            operaciones.append(
                UpdateOne(
                    {"_id": h["usuarioId"]}, 
                    {"$set": {
                        "estadoActual.horasPrevistas": h["horasPrevistas"],
                        "estadoActual.balanceAnual": h["balanceAnual"]
                    }}
                )
            )
        if operaciones:
            usuarios_col.bulk_write(operaciones)

    return {
        "mensaje": "Algoritmo ejecutado con éxito",
        "estadisticas": f"Se generaron {len(rotaciones)} grupos y {len(plantillas)} calendarios."
    }


def main():
    #Bucle infinito que recibira todas las tareas que entren a la cola y las procesara 
    while True:
        try:
            #Obtenemos una tarea y le cambiamos el estado para saber que esta en progreso de ser ejecutada
            tarea = tareas_col.find_one_and_update(
                {"estado": "queued", "tipo": "generar_rotacion"},
                {"$set": {"estado": "in-progress"}},
                return_document=True
            )

            if tarea:
                #Obtenemos los datos de la tarea que nos pasa el action
                parametros = tarea.get("parametros",{})
                planta_id = str(tarea.get("plantaId"))

                try:
                    #Llamamos a procesar que sera el encargado de actualizar la bd ejecutando el modelo seleccionado
                    resultado = procesar_tarea(parametros, planta_id)
                    #Una vez se ejecuta la tarea comprobamos actualizamos su estado y su resultado para saber si hubo algun problema o se ejecuto bien
                    tareas_col.update_one(
                        {"_id": tarea["_id"]},
                        {"$set": {"estado": "completed", "resultado": resultado}}
                    )
                except Exception as error_algoritmo:
                    print(f"Fallo en el algoritmo: {error_algoritmo}")
                    #Si salta una excpecion la actualizamos a failed 
                    tareas_col.update_one(
                        {"_id": tarea["_id"]},
                        {"$set": {"estado": "failed", "error": str(error_algoritmo)}}
                    )
            else:
                time.sleep(3)
                
        except Exception as error_db:
            print(f"Fallo de conexión con la BD: {error_db}")
            time.sleep(5)

if __name__ == "__main__":
    main()