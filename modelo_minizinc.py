import os
os.environ["PATH"] = r"C:\Program Files\MiniZinc" + os.pathsep + os.environ.get("PATH", "")

import calendar
from datetime import datetime, date, timedelta
from bson.objectid import ObjectId
from minizinc import Instance, Model, Solver
from minizinc.error import MiniZincError
def rotaciones_minizinc(rol, empleados_rol, cobertura, horas_M, horas_N, longitud_patron, num_patrones, NUM_DIAS):
    
    if not empleados_rol:
        return None

    #Obtengo la ruta de mi codigo en minizinc
    ruta_minizinc = os.path.join(os.path.dirname(__file__), "rotaciones_sin_patrones.mzn")
    #conectamos python a minizinc
    modelo_minizinc = Model(ruta_minizinc) 

    #Leemos la cobertura en funcion del rol y llenamos un array simulando booleanos para saber si el usuario es senior o no asi como las horas de contrato de cada uno
    cob_M = cobertura["turnoM"]["enfermeros"] if rol == "Enfermero" else cobertura["turnoM"]["auxiliares"]
    cob_N = cobertura["noche"]["enfermeros"] if rol == "Enfermero" else cobertura["noche"]["auxiliares"]
    es_senior = [1 if e["nivel"] == "Senior" else 0 for e in empleados_rol]
    horas_contrato = [int(e["horasContrato"]) for e in empleados_rol]


    solver = Solver.lookup("chuffed")
    instancia = Instance(solver, modelo_minizinc)

   
    
    #Obtenemos las horas que deberia trabajar cada empleado en un ciclo del patron para cumplir con su objetivo anual, redondeamos y evitamos decimales
    horas_por_usuario = []
    
    dias_vacaciones = 22
    dias_libres = 6
    horas_por_ausencia = 7
    horas_ausencias = (dias_vacaciones + dias_libres) * horas_por_ausencia 
    
    for contrato in horas_contrato:
        objetivo_anual = contrato + horas_ausencias

        horas_usuario_ciclo = (objetivo_anual * longitud_patron) / NUM_DIAS
        horas_por_usuario.append(round(horas_usuario_ciclo))

    #Matriz de desfases[dia_actual][desfase] da el indice 
    desfases_matriz = []
    for d_actual in range(1, longitud_patron+1):
        fila = []
        for desfase in range(1, longitud_patron+1):
            indice = ((d_actual - desfase) % longitud_patron) + 1 #En minizinc empieza en el dia 1 no en 0
            fila.append(indice)
        desfases_matriz.append(fila)

    #Instanciamos los valores de entrada al modelo
    instancia["num_empleados"] = len(empleados_rol)
    instancia["num_turnos_base"] = num_patrones
    instancia["longitud_patron"] = longitud_patron
    #instancia["dias_anuales"] = NUM_DIAS
    instancia["horas_M"] = int(horas_M)
    instancia["horas_N"] = int(horas_N)
    instancia["cob_M"] = int(cob_M)
    instancia["cob_N"] = int(cob_N)
    instancia["es_senior"] = es_senior
    instancia["max_dias_trabajados"] = 5
    instancia["horas_por_usuario"] = horas_por_usuario
    instancia["desfases_matriz"] = desfases_matriz
    #instancia["horas_contrato"] = horas_contrato

    resultado = instancia.solve(timeout=timedelta(seconds=60))
    if resultado.solution:
        return resultado.solution
    
    raise Exception(f"No se pudo asignar turnos para {rol}.")


def calcular_turnos_sin_patrones(datos):

    #Leemos los datos de entrada y los metemos en variables
    empleados = datos["empleados"]
    cobertura = datos["cobertura"]
    horas_M = datos["horasTurnoM"]
    horas_N = datos["horasTurnoN"]
    planta_id = datos["plantaId"]

    longitud_patron = 7
    num_patrones = 2
    #comprobamos si es año bisiesto
    year_generacion = datetime.now().year
    es_bisiesto = calendar.isleap(year_generacion)
    NUM_DIAS = 366 if es_bisiesto else 365

    enf_empleados = [e for e in empleados if e["rol"] == "Enfermero"]
    aux_empleados = [e for e in empleados if e["rol"] == "Auxiliar"]

    #Ejecutamos por un lado enfermeros y por otro auxiliares
    resultado_enf = rotaciones_minizinc("Enfermero", enf_empleados, cobertura, horas_M, horas_N, longitud_patron, num_patrones, NUM_DIAS)
    resultado_aux = rotaciones_minizinc("Auxiliar", aux_empleados, cobertura, horas_M, horas_N, longitud_patron, num_patrones, NUM_DIAS)

    patrones_generados = []
    grupos_rotacion = {}
    plantillas_calendario = []
    horas_usuarios = []

    def formatear_resultado(resultado, empleados_grupo, base_patron_i):
        if not resultado:
            return
        
        nonlocal patrones_generados, grupos_rotacion, plantillas_calendario, horas_usuarios

        inicio_year = date(year_generacion, 1, 1)

        #Obtenemos las variables de salida del modelo de minizinc
        turnos = resultado.turnos
        asignacion = resultado.asignacion

        #obtenemos cada uno de los dias de los distintos patrones
        p_ids = []
        for p in range(num_patrones):
            secuencia = []
            for d in range(longitud_patron):
                turno = int(turnos[p][d])
                if turno == 1:
                    secuencia.append("M")
                elif turno == 2:
                    secuencia.append("N")
                else:
                    secuencia.append("L")
            #Lo generamos
            id_patron = str(ObjectId())
            p_ids.append(id_patron)
            patrones_generados.append({
                "id": id_patron,
                "nombre": f"Patron {base_patron_i + p + 1}",
                "secuencia": secuencia
            })
        #Para cada empleado generamos su rotacion
        for i, emp in enumerate(empleados_grupo):
            for p in range(num_patrones):
                for d in range(longitud_patron):
                    if bool(asignacion[i][p][d]):
                        clave_grupo = f"{p_ids[p]}_desfase{d}"
                        if clave_grupo not in grupos_rotacion: #Comprobamos si ya existia su rotacion
                            grupos_rotacion[clave_grupo] = {
                                "nombre": f"Grupo {patrones_generados[-num_patrones + p]['nombre']} - Desfase {d}",
                                "patronBaseId": p_ids[p],
                                "diaDesfase": d,
                                "plantaId": ObjectId(planta_id),
                                "empleados": []
                            }
                        #Añadimos al empleado a la rotacion
                        grupos_rotacion[clave_grupo]["empleados"].append(ObjectId(emp["id"]))

                        horas_totales = 0
                        secuencia_asignada = patrones_generados[-num_patrones + p]["secuencia"]
                        meses = {}
                        #Obtenemos las horas totales que va a hacer el usuario segun la rotacion que le toco en todo el año
                        for dia in range(NUM_DIAS):
                            fecha_actual = inicio_year + timedelta(days=dia)
                            mes_num = fecha_actual.month
                            dia_num = fecha_actual.day

                            turno_asignado = secuencia_asignada[(dia-d) % longitud_patron]

                            if turno_asignado == "M": horas_totales += horas_M
                            elif turno_asignado == "N": horas_totales += horas_N

                            if mes_num not in meses:
                                meses[mes_num] = []

                            meses[mes_num].append({"dia": dia_num, "turno": turno_asignado})
                        
                        dias_vacaciones = 22
                        dias_libres = 6
                        horas_por_ausencia = 7

                        horas_ausencias = (dias_vacaciones + dias_libres) * horas_por_ausencia

                        horas_contrato = emp["horasContrato"]
                        balance = horas_totales - (horas_contrato + horas_ausencias)

                        horas_usuarios.append({
                            "usuarioId": ObjectId(emp["id"]),
                            "horasPrevistas": horas_totales,
                            "balanceAnual": balance
                        })
                        #generamos su plantilla recorremos cada mes y obtenemos la lista de dias con el turno asignado por dia
                        meses_array = [{"mes": mes, "dias": listaDias} for mes, listaDias in meses.items()]
                        plantillas_calendario.append({
                            "usuario": ObjectId(emp["id"]),
                            "year": year_generacion,
                            "meses": meses_array
                        })

    formatear_resultado(resultado_enf, enf_empleados, 0)
    formatear_resultado(resultado_aux, aux_empleados, num_patrones)

    return {
        "patrones": patrones_generados,
        "rotaciones": list(grupos_rotacion.values()),
        "plantillas": plantillas_calendario,
        "horas_usuarios": horas_usuarios
    }

