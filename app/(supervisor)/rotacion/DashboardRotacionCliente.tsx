"use client"

import { Box, Flex, Heading, Text, Card, Button, Badge, Separator, Grid, Dialog, TextField, Callout } from "@radix-ui/themes";
import { PlusIcon, Pencil1Icon, TrashIcon, Cross1Icon, PlayIcon } from "@radix-ui/react-icons";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

type tipoTurno = "M" | "N" | "L";

type colorRadix = "orange" | "blue" | "green";

//INTERFACES

interface Empleado {
    id: string;
    nombre: string;
    correo: string;
}

interface Patron {
    id: string;
    nombre: string;
    secuencia: tipoTurno[];
}

interface GrupoRotacion {
    id: string;
    nombre: string;
    patronId: string;
    diaInicio: number;
    empleados: Empleado[];
}

interface RotacionProps {
    config: any;
    grupos: GrupoRotacion[];
    actualizarParametros: (datos: any) => Promise<{ exito: boolean; mensaje: string }>;
    guardarPatron: (patronId: string | null, nombre: string, secuencia: tipoTurno[]) => Promise<{ exito: boolean; mensaje: string }>;
    borrarPatron: (patronId: string) => Promise<{ exito: boolean; mensaje: string }>;
    agregarUsuario: (grupoId: string, correo: string) => Promise<{ exito: boolean; mensaje: string }>;
    quitarUsuario: (grupoId: string, empleadoId: string) => Promise<{ exito: boolean; mensaje: string }>;
    crearTareaAlgoritmo: (parametros: any) => Promise<{ exito: boolean, taskId?: string, mensaje: string }>;
    consultarEstadoTarea: (taskId: string) => Promise<{ exito: boolean, estado: string, resultado?: any, error?: string }>;
    ejecutarMotorAnual: (patronId: string) => Promise<{ exito: boolean; mensaje: string }>;
}


const getConfiTurno = (turno: tipoTurno): { color: colorRadix, label: string, fondo: string } => {
    if (turno === "M") return { color: "orange", label: "M", fondo: "#FEF3C7" };
    if (turno === "N") return { color: "blue", label: "N", fondo: "#DBEAFE" };
    return { color: "green", label: "L", fondo: "#D1FAE5" };
}

export default function DashboardRotacionCliente({
    config,
    grupos,
    actualizarParametros,
    guardarPatron,
    borrarPatron,
    agregarUsuario,
    quitarUsuario,
    crearTareaAlgoritmo,
    consultarEstadoTarea,
    ejecutarMotorAnual
}: RotacionProps) {

    const [estaPendiente, empezarTransicion] = useTransition();

    const patrones: Patron[] = config.patrones;


    //contendra los datos de configuración de personal
    const [duracionM, setDuracionM] = useState(config.duracionM);
    const [duracionN, setDuracionN] = useState(config.duracionN);
    const [cobEnfM, setCobEnfM] = useState(config.cobEnfM);
    const [cobEnfN, setCobEnfN] = useState(config.cobEnfN);
    const [cobAuxM, setCobAuxM] = useState(config.cobAuxM);
    const [cobAuxN, setCobAuxN] = useState(config.cobAuxN);

    //Añadir, Editar y borrar patrón
    const [dialogoPatron, setDialogoPatron] = useState<boolean>(false);
    const [dialogoBorrarPatron, setDialogoBorrarPatron] = useState<boolean>(false);

    //el id del patron a borrar o editar
    const [patronEditadoId, setPatronEditadoId] = useState<string | null>(null);
    const [patronBorrarId, setPatronBorrarId] = useState<string | null>(null);

    const [datosPatron, setDatosPatron] = useState<{ nombre: string, longitud: string, secuencia: tipoTurno[] }>({ nombre: "", longitud: "5", secuencia: ["L", "L", "L", "L", "L"] })

    //Logica de grupo de patrones
    const [dialogoAgregar, setDialogoAgregar] = useState<boolean>(false);
    const [datosUsuario, setDatosUsuario] = useState({ nombre: "", correo: "" });
    const [grupoSeleccionado, setGrupoSeleccionado] = useState<string | null>(null);


    //para generar el algoritmo
    const [dialogoGenerar, setDialogoGenerar] = useState<boolean>(false);



    //FUNCION PARA CAMBIAR COBERTURA DE PLANTA U HORAS DE LOS TURNOS
    const guardarParametrosPlanta = () => {
        const datos = {
            parametrosGlobales: { horasTurnoM: Number(duracionM), horasTurnoN: Number(duracionN) },
            coberturaPlanta: {
                turnoM: { enfermeros: Number(cobEnfM), auxiliares: Number(cobAuxM) },
                noche: { enfermeros: Number(cobEnfN), auxiliares: Number(cobAuxN) }
            }
        };

        empezarTransicion(async () => {
            try {
                const resultado = await actualizarParametros(datos);
                if (resultado.exito) {
                    toast.success(resultado.mensaje);
                }
                else toast.error(resultado.mensaje);
            } catch (error) {
                toast.error("Error al guardar los parámetros de planta")
            }
        });
    };

    //PANEL DE CREACION DEL PATRON
    const abrirCrearPatron = () => {
        setPatronEditadoId(null);
        setDatosPatron({ nombre: "", longitud: "5", secuencia: ["L", "L", "L", "L", "L"] })
        setDialogoPatron(true);
    };

    //PANEL DE EDICION DE PATRON
    const abrirEditarPatron = (patron: Patron) => {
        console.log(patron);
        setPatronEditadoId(patron.id);
        setDatosPatron({ nombre: patron.nombre, longitud: patron.secuencia.length.toString(), secuencia: [...patron.secuencia] });
        setDialogoPatron(true);
    };

    //PARA ABRIR EL DIALOGO DE BORRAR PATRON
    const abrirBorrarPatron = (id: string) => {
        setPatronBorrarId(id);
        setDialogoBorrarPatron(true);
    };

    //LOGICA DE BORRAR PATRON
    const confirmarBorrarPatron = async () => {
        if (!patronBorrarId) {
            toast.error("Selecciona un patron para borrar");
            return;
        }

        empezarTransicion(async () => {
            try {
                const resultado = await borrarPatron(patronBorrarId);
                if (resultado.exito) {
                    setDialogoBorrarPatron(false);
                    toast.success(resultado.mensaje);
                } else {
                    toast.error(resultado.mensaje);
                }
            } catch (error) {
                toast.error("Fallo al borrar el patrón");
            }
        });
    };

    //CAMBIO DE LONGITUD DE UN PATRON EN CREACION O EDICION
    const actualizarLongitudPatron = (valor: string) => {
        const nuevaLongitud = parseInt(valor);
        setDatosPatron(prev => {
            const nuevaSecuencia = [...prev.secuencia];
            if (!isNaN(nuevaLongitud) && nuevaLongitud > 0 && nuevaLongitud <= 14) {
                if (nuevaLongitud > nuevaSecuencia.length) {
                    while (nuevaSecuencia.length < nuevaLongitud) nuevaSecuencia.push("L");
                } else {
                    nuevaSecuencia.length = nuevaLongitud;
                }
            }
            return { ...prev, longitud: valor, secuencia: nuevaSecuencia };
        });
    };

    //GUARDAMOS LOS CAMBIOS O CREAMOS UN NUEVO PATRON
    const confirmarGuardarPatron = async () => {
        if (!datosPatron.nombre) {
            toast.error("Introduce un nombre para el patron");
            return;
        }

        empezarTransicion(async () => {
            try {
                //si el id es nulo lo creara si tiene valor lo editará
                const resultado = await guardarPatron(patronEditadoId, datosPatron.nombre, datosPatron.secuencia);
                if (resultado.exito) {
                    toast.success(resultado.mensaje);
                    setDialogoPatron(false);
                } else {
                    toast.error(resultado.mensaje);
                }
            } catch (error) {
                toast.error("No se pudo guardar el patrón");
            }
        });
    };



    //PARA ESTABLECER EL PATRON DE UN GRUPO
    const calcularPatronRotatorio = (secuencia: tipoTurno[], diaInicio: number): tipoTurno[] => {
        if (!secuencia || secuencia.length === 0) return [];
        const inicioFijo = diaInicio % secuencia.length;
        const inicioPatron = secuencia.slice(inicioFijo);
        const finPatron = secuencia.slice(0, inicioFijo);
        return [...inicioPatron, ...finPatron];
    };

    //DIALOGO DE AÑADIR USUARIO
    const abrirDialogoUsuario = (idGrupo: string) => {
        setGrupoSeleccionado(idGrupo);
        setDatosUsuario({ nombre: "", correo: "" });
        setDialogoAgregar(true);
    }

    //LOGICA PARA CAMBIAR EL PATRON(si seleccionas una caja va rotando el turno)
    const ciclarTurnoPatron = (indice: number) => {
        setDatosPatron(prev => {
            const nuevaSecuencia = [...prev.secuencia];
            const actual = nuevaSecuencia[indice];
            nuevaSecuencia[indice] = actual === "M" ? "N" : actual === "N" ? "L" : "M";
            return { ...prev, secuencia: nuevaSecuencia };
        });
    }

    //AÑADMOS A UN USUARIO A UN GRUPO
    const confirmarAgregarUsuario = async () => {
        if (!datosUsuario.nombre || !datosUsuario.correo) {
            toast.error("Por favor, complete todos los campos");
            return;
        }
        if (!grupoSeleccionado) {
            toast.error("Por favor, seleccione un grupo");
            return;
        }

        empezarTransicion(async () => {
            try {
                const resultado = await agregarUsuario(grupoSeleccionado, datosUsuario.correo);
                if (resultado.exito) {
                    setDialogoAgregar(false);
                    toast.success(resultado.mensaje);
                } else {
                    toast.error(resultado.mensaje);
                }
            } catch (error) {
                toast.error("Fallo al intentar añadir el usuario del grupo");
            }
        });
    }


    //ELIMINAMOS A UN USUARIO DE UN GRUPO
    const confirmarQuitarUsuario = async (idGrupo: string, idEmpleado: string) => {
        empezarTransicion(async () => {
            try {
                const resultado = await quitarUsuario(idGrupo, idEmpleado);
                if (resultado.exito) {
                    toast.success(resultado.mensaje);
                } else {
                    toast.error(resultado.mensaje);
                }
            } catch (error) {
                toast.error("Fallo al intentar quitar el usuario del grupo")
            }
        });
    };

    const [modoAlgoritmo, setModoAlgoritmo] = useState<"patrones" | "sin-patrones">("patrones");
    //COMPROBAMOS SI SE PUEDE EJECUTAR EL ALGORITMO
    const abrirResumenGeneracion = (modo: "patrones" | "sin-patrones") => {
        if (modo === "patrones" && patrones.length === 0) {
            toast.error("Debe exisitr al menos un patrón para generar los turnos")
            return;
        }
        setModoAlgoritmo(modo);
        setDialogoGenerar(true);
    };

    const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

    const ejecutarAlgoritmo = () => {
        setDialogoGenerar(false);

        const parametrosZ3 = {
            horasTurnoM: Number(duracionM),
            horasTurnoN: Number(duracionN),
            cobertura: {
                turnoM: { enfermeros: Number(cobEnfM), auxiliares: Number(cobAuxM) },
                noche: { enfermeros: Number(cobEnfN), auxiliares: Number(cobAuxN) }
            },
            patrones: patrones,
            usarPatrones: modoAlgoritmo === "patrones"
        };

        empezarTransicion(async () => {
            const resultado = await crearTareaAlgoritmo(parametrosZ3);

            if (resultado.exito && resultado.taskId) {
                toast.info(resultado.mensaje);

                const intervalo = setInterval(async () => {
                    const res = await consultarEstadoTarea(resultado.taskId as string);

                    if (res.estado === "completed") {
                        clearInterval(intervalo);

                        toast.info("Rotación generada. Analizando reglas anuales...");
                        const motorRes = await ejecutarMotorAnual(config.plantaId);

                        if (motorRes.exito) {
                            toast.success("Cuadrante y reglas procesadas con éxito.");
                        } else {
                            toast.error("Rotación lista, pero hubo un error al validar reglas.");
                        }

                        toast.success("Cuadrante generado con éxito. Puedes revisar las asignaciones");

                        setTimeout(() => {
                            window.location.reload();
                        }, 1500);
                    } else if (res.estado === "failed") {
                        clearInterval(intervalo);
                        toast.error("El algoritmo falló: " + (res.error || "Imposible generar"));
                    }
                }, 3000);
                setPollingInterval(intervalo);
            } else {
                toast.error(resultado.mensaje);
            }
        });
    };

    useEffect(() => {
        return () => {
            if (pollingInterval) clearInterval(pollingInterval);
        };
    }, [pollingInterval]);




    return (
        <Box p="6">
            <Heading size="6" mb="5" style={{ color: "#1F2937" }}>Motor de Rotaciones Anuales</Heading>
            {/*Seccion 1: Inputs Algoritmo*/}
            <Grid columns={{ initial: "1", md: "2" }} gap="6" mb="6" style={{ opacity: estaPendiente ? 0.7 : 1 }}>

                {/*Panel izquierda: Numero de horas y cobertura por turno*/}
                <Card size="3" style={{ boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}>
                    <Heading size="4" mb="4" style={{ color: "#4B5563" }}>Parámetros y Cobertura</Heading>
                    <Text size="2" color="gray" mb="4" as="div">
                        Define la duración de los turnos y la cobertura diaria de los mismos.
                    </Text>

                    <Flex direction="column" gap="4">
                        <Grid columns="2" gap="4">
                            <Box>
                                <Text size="2" weight="bold" mb="1" as="div" color="gray">Horas Turno (M):</Text>
                                <TextField.Root
                                    type="number"
                                    variant="surface"
                                    disabled={estaPendiente}
                                    value={duracionM}
                                    onChange={(e) => setDuracionM(e.target.value)}
                                    onBlur={guardarParametrosPlanta}
                                    onKeyDown={(e) => { if (e.key === 'Enter') guardarParametrosPlanta(); }}
                                />
                            </Box>
                            <Box>
                                <Text size="2" weight="bold" mb="1" as="div" color="gray">Horas Turno (N):</Text>
                                <TextField.Root
                                    type="number"
                                    variant="surface"
                                    disabled={estaPendiente}
                                    value={duracionN}
                                    onChange={(e) => setDuracionN(e.target.value)}
                                    onBlur={guardarParametrosPlanta}
                                    onKeyDown={(e) => { if (e.key === 'Enter') guardarParametrosPlanta(); }}
                                />
                            </Box>
                        </Grid>


                        <Separator size="4" style={{ opacity: 0.5 }} />

                        <Box>
                            <Text size="2" weight="bold" mb="2" as="div" color="gray">Cobertura Mínima Requerida:</Text>
                            <Flex direction="column" gap="2">
                                <Grid columns="3" gap="2" align="center" style={{ backgroundColor: "#FEF08A", padding: "12px", borderRadius: "6px" }}>
                                    <Text size="3" weight="bold" style={{ color: "#000" }}>Mañana</Text>
                                    <Flex align="center" gap="2">
                                        <TextField.Root
                                            size="2"
                                            disabled={estaPendiente}
                                            value={cobEnfM}
                                            onChange={(e) => setCobEnfM(e.target.value)}
                                            onBlur={guardarParametrosPlanta}
                                            onKeyDown={(e) => { if (e.key === 'Enter') guardarParametrosPlanta(); }}
                                        />
                                        <Text size="2" style={{ color: "#000" }}>Enf</Text>
                                    </Flex>
                                    <Flex align="center" gap="2">
                                        <TextField.Root
                                            size="2"
                                            disabled={estaPendiente}
                                            value={cobAuxM}
                                            onChange={(e) => setCobAuxM(e.target.value)}
                                            onBlur={guardarParametrosPlanta}
                                            onKeyDown={(e) => { if (e.key === 'Enter') guardarParametrosPlanta(); }}
                                        />
                                        <Text size="2" style={{ color: "#000" }}>Aux</Text>
                                    </Flex>
                                </Grid>

                                <Grid columns="3" gap="2" align="center" style={{ backgroundColor: "#4F86D9", padding: "12px", borderRadius: "6px" }}>
                                    <Text size="3" weight="bold" style={{ color: "#000" }}>Noche</Text>
                                    <Flex align="center" gap="2">
                                        <TextField.Root
                                            size="2"
                                            disabled={estaPendiente}
                                            value={cobEnfN}
                                            onChange={(e) => setCobEnfN(e.target.value)}
                                            onBlur={guardarParametrosPlanta}
                                            onKeyDown={(e) => { if (e.key === 'Enter') guardarParametrosPlanta(); }}
                                        />
                                        <Text size="2" style={{ color: "#000" }}>Enf</Text>
                                    </Flex>
                                    <Flex align="center" gap="2">
                                        <TextField.Root
                                            size="2"
                                            disabled={estaPendiente}
                                            value={cobAuxN}
                                            onChange={(e) => setCobAuxN(e.target.value)}
                                            onBlur={guardarParametrosPlanta}
                                            onKeyDown={(e) => { if (e.key === 'Enter') guardarParametrosPlanta(); }}
                                        />
                                        <Text size="2" style={{ color: "#000" }}>Aux</Text>
                                    </Flex>
                                </Grid>
                            </Flex>
                        </Box>

                    </Flex>
                </Card>

                {/*Panel derecha: Lista de patrones*/}
                <Card size="3" style={{ boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}>
                    <Flex justify="between" align="center" mb="4">
                        <Heading size="4" style={{ color: "#4B5563" }}>Patrones Horarios</Heading>
                        <Button variant="soft" size="2" disabled={estaPendiente} style={{ cursor: "pointer" }} onClick={abrirCrearPatron}>
                            <PlusIcon /> Nuevo Patrón
                        </Button>
                    </Flex>

                    <Flex direction="column" gap="3">
                        {patrones.length === 0 && <Text size="2" color="gray">No hay patrones definidos.</Text>}
                        {patrones.map((patron) => (
                            <Box key={patron.id} p="3" style={{ border: "1px solid #E5E7EB", borderRadius: "6px" }}>
                                <Flex justify="between" align="center" mb="2">
                                    <Text weight="bold">{patron.nombre} ({patron.secuencia.length} días)</Text>
                                    <Flex gap="3">
                                        <Pencil1Icon color="gray" style={{ cursor: estaPendiente ? "not-allowed" : "pointer" }} onClick={() => !estaPendiente && abrirEditarPatron(patron)} />
                                        <TrashIcon color="red" style={{ cursor: estaPendiente ? "not-allowed" : "pointer" }} onClick={() => !estaPendiente && abrirBorrarPatron(patron.id)} />
                                    </Flex>
                                </Flex>
                                <Flex gap="1">
                                    {patron.secuencia.map((turno, i) => {
                                        const config = getConfiTurno(turno);
                                        return (
                                            <Badge key={i} variant="solid" color={config.color} style={{ width: "30px", justifyContent: "center" }}>
                                                {config.label}
                                            </Badge>
                                        )
                                    })}
                                </Flex>
                            </Box>
                        ))}
                    </Flex>
                </Card>
            </Grid>
            {/*Seccion 2: Botones para ejecutar el algoritmo*/}
            <Grid columns={{ initial: "1", md: "2" }} gap="4" mb="6">
                {/*Botón 1: Botón de activacion del algoritmo usando patrones*/}
                <Card size="2" style={{ backgroundColor: "#F0F9FF", border: "1px solid #BAE6FD", cursor: estaPendiente ? "not-allowed" : "pointer" }}
                    onClick={() => !estaPendiente && abrirResumenGeneracion("patrones")}>
                    <Flex direction="column" align="center" gap="2" p="3">
                        <Text size="4" weight="bold" style={{ color: "#0369A1" }}>Generar Turnos Rotatorios a partir de tus Patrones</Text>
                        <Text size="2" color="gray" align="center">
                            El algoritmo repartirá al personal utilizando únicamente los turnos que has definido en el panel derecho.
                        </Text>
                    </Flex>
                </Card>

                {/*Botón 2: Botón de activación del algoritmo encontrando los patrones mas adecuados*/}
                <Card size="2" style={{ backgroundColor: "#ECFDF5", border: "1px solid #A7F3D0", cursor: estaPendiente ? "not-allowed" : "pointer" }}
                    onClick={() => !estaPendiente && abrirResumenGeneracion("sin-patrones")}>
                    <Flex direction="column" align="center" gap="2" p="3">
                        <Text size="4" weight="bold" style={{ color: "#047857" }}>Generación Automática</Text>
                        <Text size="2" color="gray" align="center">
                            El sistema ignorará tus patrones y encontrará los mejores turnos rotatorios que optimizen tus preferencias.
                        </Text>
                    </Flex>
                </Card>

            </Grid>

            {/*Seccion 3: Grupos creados por el algoritmo*/}
            <Card size="4" style={{ padding: "30px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)", opacity: estaPendiente ? 0.7 : 1 }}>
                <Heading size="5" mb="2"> Asignación de Personal</Heading>
                <Text size="2" color="gray" mb="5" as="div">
                    El algoritmo ha establecido los siguientes grupo. Pueden modificarse manualmente.
                </Text>

                <Flex direction="column" gap="5">
                    {grupos.length === 0 && <Text color="gray">Ejecutar el algoritmo para generar los grupos.</Text>}
                    {grupos.map((grupo) => {
                        const patronBase = patrones.find(p => p.id === grupo.patronId)?.secuencia || [];
                        const patronRotado = calcularPatronRotatorio(patronBase, grupo.diaInicio);
                        return (
                            <Box key={grupo.id}>
                                <Flex align="center" gap="4" mb="3">
                                    <Text weight="bold" size="3" style={{ width: "220px" }}>
                                        {grupo.nombre} <Text color="gray" size="2">(Día {grupo.diaInicio + 1})</Text>
                                    </Text>
                                    <Flex gap="2">
                                        {patronRotado.map((turno, indice) => {
                                            const config = getConfiTurno(turno);
                                            return (
                                                <Badge key={indice} variant="soft" color={config.color} style={{ width: "35px", justifyContent: "center", fontWeight: "bold" }}>
                                                    {config.label}
                                                </Badge>
                                            );
                                        })}
                                    </Flex>
                                </Flex>

                                <Flex justify="between" align="end">
                                    <Box>
                                        <Text size="2" color="gray" mb="2" as="div">Empleados Asignados:</Text>
                                        <Flex gap="2" wrap="wrap" style={{ maxWidth: "600px" }}>
                                            {grupo.empleados.map((usuario) => (
                                                <Badge key={usuario.id} size="3" style={{ backgroundColor: "#FDE68A", color: "#78350F", padding: "8px 15px", borderRadius: "8px" }}>
                                                    {usuario.nombre}
                                                    <Cross1Icon
                                                        style={{ marginLeft: "8px", cursor: estaPendiente ? "not-allowed" : "pointer" }}
                                                        onClick={() => !estaPendiente && confirmarQuitarUsuario(grupo.id, usuario.id)}
                                                    />
                                                </Badge>
                                            ))}
                                            {grupo.empleados.length === 0 && <Text size="2" color="red">Grupo sin asignaciones</Text>}
                                        </Flex>
                                    </Box>

                                    <Button size="3" variant="soft" disabled={estaPendiente} onClick={() => abrirDialogoUsuario(grupo.id)} style={{ cursor: "pointer" }}>
                                        <PlusIcon /> Añadir Empleado
                                    </Button>
                                </Flex>

                                {grupo.id !== grupos[grupos.length - 1]?.id && (
                                    <Separator size="4" my="5" style={{ opacity: 0.5 }} />
                                )}
                            </Box>

                        );

                    })}
                </Flex>
            </Card>

            {/*DIALOGOS*/}

            {/*Dialogo confirmar datos para el algoritmo*/}
            <Dialog.Root open={dialogoGenerar} onOpenChange={setDialogoGenerar}>
                <Dialog.Content style={{ maxWidth: 400 }}>
                    <Dialog.Title size="5" mb="3">Confirmar Ejecución</Dialog.Title>
                    <Text size="3" mb="4" as="div">
                        Se enviarán los siguientes datos al algoritmo:
                    </Text>

                    <Callout.Root color={modoAlgoritmo === "patrones" ? "blue" : "green"} variant="soft" mb="4">
                        <Callout.Text>
                            <strong>Horas:</strong> Mañana ({duracionM}h) - Noche ({duracionN}h) <br />
                            <strong>Cobertura Mañana:</strong> {cobEnfM} Enf / {cobAuxM} Aux <br />
                            <strong>Cobertura Noche:</strong> {cobEnfN} Enf / {cobAuxN} Aux <br />
                            {/*El numero de patrones solo se muestra si se seleccionó el modo patron*/}
                            {modoAlgoritmo === "patrones" ? (
                                <><strong>Patrones base:</strong> {patrones.length} seleccionados.</>
                            ) : (
                                <><strong>Se ejecuta sin patrones base</strong></>
                            )}

                        </Callout.Text>
                    </Callout.Root>

                    <Flex justify="end" gap="3" mt="5">
                        <Button variant="soft" color="gray" disabled={estaPendiente} onClick={() => setDialogoGenerar(false)} style={{ cursor: "pointer" }}>
                            Cancelar
                        </Button>
                        <Button style={{ backgroundColor: "#0284C7", cursor: "pointer", minWidth: "120px" }} disabled={estaPendiente} onClick={ejecutarAlgoritmo}>
                            <PlayIcon /> Ejecutar
                        </Button>
                    </Flex>
                </Dialog.Content>
            </Dialog.Root>


            {/*Dialogo crear o modificar patron*/}
            <Dialog.Root open={dialogoPatron} onOpenChange={setDialogoPatron}>
                <Dialog.Content style={{ maxWidth: 500 }}>
                    <Dialog.Title size="5" mb="4">
                        {patronEditadoId === null ? "Crear Nuevo Patrón" : "Editar Patrón"}
                    </Dialog.Title>

                    <Grid columns="2" gap="4" mb="5">
                        <Box>
                            <Text size="2" weight="bold" mb="1" as="div">Nombre:</Text>
                            <TextField.Root variant="surface" value={datosPatron.nombre} onChange={(e) => setDatosPatron({ ...datosPatron, nombre: e.target.value })} />
                        </Box>
                        <Box>
                            <Text size="2" weight="bold" mb="1" as="div">Días de longitud:</Text>
                            <TextField.Root variant="surface" value={datosPatron.longitud} onChange={(e) => actualizarLongitudPatron(e.target.value)} />
                        </Box>
                    </Grid>

                    <Text size="2" weight="bold" mb="3" as="div">Define la secuencia (Pulsa para cambiar M/N/L):</Text>
                    <Flex gap="2" wrap="wrap" mb="6" style={{ backgroundColor: "#F9FAFB", padding: "15px", borderRadius: "8px" }}>
                        {datosPatron.secuencia.map((turno, indice) => {
                            const config = getConfiTurno(turno);
                            return (
                                <Flex key={indice} direction="column" align="center" gap="1">
                                    <Text size="1" color="gray">Día {indice + 1}</Text>
                                    <Badge
                                        size="3" variant="solid" color={config.color}
                                        style={{ width: "40px", height: "40px", display: "flex", justifyContent: "center", cursor: "pointer", userSelect: "none" }}
                                        onClick={() => ciclarTurnoPatron(indice)}
                                    >
                                        {config.label}
                                    </Badge>
                                </Flex>
                            );
                        })}
                    </Flex>
                    <Flex justify="end" gap="3">
                        <Dialog.Close><Button variant="soft" color="gray" disabled={estaPendiente} style={{ cursor: "pointer" }}>Cancelar</Button></Dialog.Close>
                        <Button onClick={confirmarGuardarPatron} disabled={estaPendiente} style={{ backgroundColor: "#0088CC", cursor: "pointer" }}>Guardar Patrón</Button>
                    </Flex>
                </Dialog.Content>
            </Dialog.Root>

            {/*Dialogo borrar patron*/}
            <Dialog.Root open={dialogoBorrarPatron} onOpenChange={setDialogoBorrarPatron}>
                <Dialog.Content style={{ maxWidth: 400 }}>
                    <Dialog.Title size="5" mb="2" weight="bold" color="red">Eliminar Patrón</Dialog.Title>
                    <Text size="3" mb="6" as="p">
                        ¿Seguro que quieres eliminar este patrón? Los grupos que lo estén usando también desaparecerán. Esta acción no se puede deshacer.
                    </Text>
                    <Flex gap="3" justify="end" mt="4">
                        <Dialog.Close>
                            <Button variant="soft" color="gray" disabled={estaPendiente} style={{ cursor: "pointer" }}>Cancelar</Button>
                        </Dialog.Close>
                        <Button color="red" disabled={estaPendiente} style={{ cursor: "pointer", backgroundColor: "#DC2626" }} onClick={confirmarBorrarPatron}>
                            Sí, Eliminar
                        </Button>
                    </Flex>
                </Dialog.Content>
            </Dialog.Root>

            {/*Dialogo añadir usuario*/}
            <Dialog.Root open={dialogoAgregar} onOpenChange={setDialogoAgregar}>
                <Dialog.Content style={{ maxWidth: 400 }}>
                    <Dialog.Title size="5" mb="4">Asignar Empleado a Grupo</Dialog.Title>
                    <Flex direction="column" gap="4">
                        <Text size="2">Nombre del empleado:</Text>
                        <TextField.Root variant="surface" placeholder="Ej: Lucas Ramírez" value={datosUsuario.nombre} onChange={(e) => setDatosUsuario({ ...datosUsuario, nombre: e.target.value })} />
                        <Text size="2">Correo del empleado:</Text>
                        <TextField.Root variant="surface" placeholder="Ej: Lucasra@gmail.com" value={datosUsuario.correo} onChange={(e) => setDatosUsuario({ ...datosUsuario, correo: e.target.value })} />
                        <Flex justify="end" gap="3" mt="4">
                            <Dialog.Close><Button variant="soft" color="gray" disabled={estaPendiente} style={{ cursor: "pointer" }}>Cancelar</Button></Dialog.Close>
                            <Button onClick={confirmarAgregarUsuario} disabled={estaPendiente} style={{ cursor: "pointer", backgroundColor: "#0088CC" }}>Asignar</Button>
                        </Flex>
                    </Flex>
                </Dialog.Content>
            </Dialog.Root>
        </Box>


    );
}