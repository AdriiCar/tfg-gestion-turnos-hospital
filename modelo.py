from z3 import *
import math
import calendar
from datetime import datetime, date, timedelta
from bson.objectid import ObjectId

def calcula_turnos_con_patrones(datos):
    #Extraemos los datos
    empleados = datos["empleados"] #Lista de los distintos empleados
    patrones = datos["patrones"]
    cobertura = datos["cobertura"]
    horas_M = datos["horasTurnoM"]
    horas_N  = datos["horasTurnoN"]
    planta_id = datos["plantaId"]

    num_empleados = len(empleados) #Numero de empleados 
    num_patrones = len(patrones) #Numero de patrones

    secuencias = [p["secuencia"] for p in patrones]
    long_secuencias = [len(s) for s in secuencias] #contiene la longitud de la secuencia que coincide con los distintos valores de desfase

    mcm = math.lcm(*long_secuencias)

    #Buscamos minimizar las horas entonces calculamos las anuales que genera cada patron por desfase

    horas_anuales_patrones = [] #Contiene en cada elemento del vector una lista con las distintas horas por desfase del propio patron
    
    
    year_generacion = datetime.now().year

    es_bisiesto = calendar.isleap(year_generacion)
    NUM_DIAS = 366 if es_bisiesto else 365

    for i, secuencia in enumerate(secuencias):
        l_secuencia = long_secuencias[i]
        #Cada desfase tendrá su cómputo global de horas
        horas_desfase = []

        for desfase in range(l_secuencia):
            horas_totales = 0
            for dia in range(NUM_DIAS):
                #Obtenemos el turno dia a dia
                turno = secuencia[(dia-desfase) % l_secuencia]
                if(turno == "M"):
                    horas_totales += horas_M
                elif(turno == "N"):
                    horas_totales += horas_N
            
            horas_desfase.append(horas_totales)

        horas_anuales_patrones.append(horas_desfase)
    
    opt = Optimize()

    #VARIABLES DE DECISION

    #x[i][p][d] = 1 si el empleado i tiene el patron p con desfase d

    x = [[[Int(f"x_{i}_{p}_{d}") for d in range(long_secuencias[p])] for p in range(num_patrones)] for i in range(num_empleados)]

    for i in range(num_empleados):
        for p in range(num_patrones):
            for d in range(long_secuencias[p]):
                opt.add(Or(x[i][p][d] == 0, x[i][p][d] == 1)) #O bien no lo tiene asignado o bien lo tiene

    #RESTRICCION 1: GARANTIZAR QUE TODOS LOS EMPLEADOS TENGAN UN Y SOLO UNA ROTACION ASIGNADA
    for i in range(num_empleados):
        asignaciones = sum(x[i][p][d] for p in range(num_patrones) for d in range(long_secuencias[p]))
        opt.add(asignaciones == 1) 

    #RESTRICCION 2: CUMPLIR CON LA COBERTURA DIARIA Y NO SOLO PERSONAL SIN EXPERIENCIA EN PLANTA
    enf_necesariosM = cobertura["turnoM"]["enfermeros"]
    enf_necesariosN = cobertura["noche"]["enfermeros"]
    aux_necesariosM = cobertura["turnoM"]["auxiliares"]
    aux_necesariosN = cobertura["noche"]["auxiliares"]

    for dia in range(mcm):
        #Por cada rol tenemos el numero total por turno y el numero de senior por turnos para garantizar la cobertura y que no haya personal sin experiencia en la planta
        num_enfM = num_enfN = num_enfSM = num_enfSN = 0
        num_auxM = num_auxN = num_auxSM = num_auxSN = 0 

        for i, emp in enumerate(empleados):
            es_enfermero = (emp["rol"] == "Enfermero")
            es_senior = (emp["nivel"] == "Senior")
            
            for i_secuencia, secuencia in enumerate(secuencias):
                l_secuencia = long_secuencias[i_secuencia]

                for desfase in range(l_secuencia):
                    turno = secuencia[(dia-desfase) % l_secuencia] #Obtenemos el turno a parir del desfase
                    esta_asignado = x[i][i_secuencia][desfase]

                    if(turno == "M"):
                        if(es_enfermero):
                            num_enfM += esta_asignado
                            if(es_senior): 
                                num_enfSM += esta_asignado
                        else:
                            num_auxM += esta_asignado
                            if(es_senior):
                                num_auxSM += esta_asignado

                    elif(turno == "N"):
                        if(es_enfermero):
                            num_enfN += esta_asignado
                            if(es_senior):
                                num_enfSN += esta_asignado
                        else:
                            num_auxN += esta_asignado
                            if(es_senior):
                                num_auxSN += esta_asignado

        #COMPROBAMOS LA DISPONIBILIDAD
        opt.add(num_enfM >= enf_necesariosM)
        opt.add(num_enfN >= enf_necesariosN)
        opt.add(num_auxM >= aux_necesariosM)
        opt.add(num_auxN >= aux_necesariosN)

        #COMPROBAMOS LA EXPERIENCIA
        if (enf_necesariosM > 0): opt.add(num_enfSM > 0)
        if (enf_necesariosN > 0): opt.add(num_enfSN > 0)
        if (aux_necesariosM > 0): opt.add(num_auxSM > 0)
        if (aux_necesariosN > 0): opt.add(num_auxSN > 0)

    
    #MINIMIZAMOS LA DIFERENCIA DE LAS SUMAS
    Z = Int("maxima_diferencia")

    for i, emp in enumerate(empleados):
        horas_objetivo = emp["horasContrato"]

        #Obtenemos las horas que trabajara el usuario i con patron asignado p empezando en el desfase d mediante las horas que anualmente corresponden al patron p empezando en el desfase d
        horas_empleado = sum(x[i][p][d] * horas_anuales_patrones[p][d] for p in range(num_patrones) for d in range(long_secuencias[p]))

        opt.add(Z >= horas_empleado - horas_objetivo)
        opt.add(Z >= horas_objetivo - horas_empleado)
    
    opt.minimize(Z)

    #SALIDA DE DATOS
    if(opt.check() == sat):
        m = opt.model()

        print(f"Maxima diferencia de horas en la plantilla respecto de las previstas: {m.eval(Z)} horas al year\n")

        grupos_rotacion = {}
        
        plantillas_calendario = []

        horas_usuarios = []

        year_actual = datetime.now().year
        fecha_inicio_year = date(year_actual, 1, 1)

        for i, emp in enumerate(empleados):
            for p_i in range(num_patrones):
                for d in range(long_secuencias[p_i]):
                    if(m.evaluate(x[i][p_i][d]).as_long() == 1):
                        horas_empleado = horas_anuales_patrones[p_i][d]
                        horas_usuarios.append({
                            "usuarioId": ObjectId(emp["id"]),
                            "horasPrevistas": horas_empleado,
                            "balanceAnual": horas_empleado - emp["horasContrato"]

                        })

                        clave_grupo = f"{patrones[p_i]['id']}_desfase{d}"
                        
                        if clave_grupo not in grupos_rotacion:
                            grupos_rotacion[clave_grupo] = {
                                "nombre": f"Grupo {patrones[p_i]['nombre']} - Desfase {d}",
                                "patronBaseId": patrones[p_i]["id"],
                                "diaDesfase": d,
                                "plantaId": ObjectId(planta_id),
                                "empleados": []
                            }
                        # Añadimos el empleado a este grupo
                        grupos_rotacion[clave_grupo]["empleados"].append(ObjectId(emp["id"]))

                        secuencia_asignada = secuencias[p_i]
                        l_sec = long_secuencias[p_i]

                        meses = {}
                        for dia in range(NUM_DIAS):
                            fecha_actual = fecha_inicio_year + timedelta(days=dia)
                            mes_num = fecha_actual.month
                            dia_num = fecha_actual.day

                            turno_asignado = secuencia_asignada[(dia - d) % l_sec]

                            if mes_num not in meses:
                                meses[mes_num] = []
                            meses[mes_num].append({
                                "dia": dia_num,
                                "turno": turno_asignado
                            })
                        meses_array = [
                            {"mes": mes, "dias": listaDias} for mes, listaDias in meses.items()
                        ]

                        plantilla_usuario = {
                            "usuario": ObjectId(emp["id"]),
                            "year": year_actual,
                            "meses": meses_array
                        }

                        plantillas_calendario.append(plantilla_usuario)

        return {
            "rotaciones": list(grupos_rotacion.values()),
            "plantillas": plantillas_calendario,
            "horas_usuarios": horas_usuarios
        }
        
    else:
        raise Exception("UNSAT: No hay forma de repartir a los usuarios con ese número de patrones y cobertura.")


