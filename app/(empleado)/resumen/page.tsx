// app/resumen/page.tsx
"use client";

import { Box, Grid, Card, Text, Heading, Badge, Button, Flex, Separator, Dialog, Callout } from "@radix-ui/themes";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { InfoCircledIcon, CheckCircledIcon } from "@radix-ui/react-icons";
<<<<<<< HEAD
import { startOfDay, addDays, format } from "date-fns";
import { es } from "date-fns/locale";

=======
>>>>>>> a2fa2a4496c3053af3162cb2e07925da6c79733d

type ColorEstado = "green" | "orange" | "red" | "gray";

type EstadoSolicitud = "Pendiente" | "Aprobada" | "Rechazado";

//INTERFACES
interface Solicitud {
<<<<<<< HEAD
    _id: string;
=======
    _id: number;
>>>>>>> a2fa2a4496c3053af3162cb2e07925da6c79733d
    tipoDia: string,
    fechaInicio: string,
    fechaFin:string,
    fechaSolicitud: string,
    estado: EstadoSolicitud
  }

<<<<<<< HEAD
=======
//MOCK DATA


const proximoTurno = { 
  texto: "Mañana (M): jueves, 5 de febrero", 
  horas: "8:00 - 20:00" 
};

>>>>>>> a2fa2a4496c3053af3162cb2e07925da6c79733d

const getColorEstado = (estado: EstadoSolicitud): ColorEstado =>{
  switch(estado){
    case "Aprobada": return "green";
    case "Pendiente": return "orange";
    case "Rechazado": return "red";
    default: return "gray";
  }
}

const formatearFecha = (fechaISO: string) => {
    if(!fechaISO) return "";
<<<<<<< HEAD
    const fecha = startOfDay(new Date(fechaISO));
    return format(fecha, "dd MMM yyyy", { locale: es });
=======
    const fecha = new Date(fechaISO);
    return fecha.toLocaleDateString("es-ES", { day: '2-digit', month: 'short', year: 'numeric' });
>>>>>>> a2fa2a4496c3053af3162cb2e07925da6c79733d
}

export default function DashboardResumen() {

  //estado para el usuario
  const router = useRouter();
  const [usuario, setUsuario] = useState<any>(null);

  //datos 
  const [dialogoBorrar, setDialogoBorrar] = useState<boolean>(false)
  
  const[listaSolicitudes, setListaSolicitudes] = useState<Solicitud[]>([])

<<<<<<< HEAD
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<string | null>(null)

  const [mensaje, setMensaje] = useState<{ texto: string, tipo: "error" | "exito" } | null>(null);

  const [proximoTurno, setProximoTurno] = useState<{texto: string, horas: string} | null>(null);

=======
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<number | null>(null)

  const [mensaje, setMensaje] = useState<{ texto: string, tipo: "error" | "exito" } | null>(null);

>>>>>>> a2fa2a4496c3053af3162cb2e07925da6c79733d
  useEffect (() => {
    const usuarioGuardado = localStorage.getItem("usuarioLogueado");
    if(usuarioGuardado){
      const usuarioParseado = JSON.parse(usuarioGuardado);
      setUsuario(usuarioParseado);

      //esperamos a obtener las solicitudes
      fetch(`/api/solicitudes?usuarioId=${usuarioParseado._id}`)
      .then(respuesta => respuesta.json())
      .then(datos =>{
        setListaSolicitudes(datos);
        console.log("datos", datos);
      })
<<<<<<< HEAD

      const añoActual = new Date().getFullYear();
      fetch(`/api/plantillas?usuarioId=${usuarioParseado._id}&año=${añoActual}`)
      .then(respuesta => respuesta.json())
      .then(plantilla => {
          // Calculamos cuál es el próximo turno
          const turno = calcularProximoTurno(plantilla);
          setProximoTurno(turno);
      });
=======
>>>>>>> a2fa2a4496c3053af3162cb2e07925da6c79733d
    }
    else{
      router.push("/login")
    }
  }, [router])

<<<<<<< HEAD
  const calcularProximoTurno = (plantilla: any) => {
      if (!plantilla || !plantilla.meses) return null;

      let fechaActual = startOfDay(new Date());

      // Buscamos como máximo en los próximos 30 días, es dudoso que haya vacaciones de más tiempo
      for (let i = 0; i < 30; i++) {
          const fechaBuscada = addDays(fechaActual, i);
          const mes = fechaBuscada.getMonth() + 1; //el mes del 1 al 12
          const dia = fechaBuscada.getDate();

          const mesPlantilla = plantilla.meses.find((m: any) => m.mes === mes);
          if (mesPlantilla) {
              const diaPlantilla = mesPlantilla.dias.find((d: any) => d.dia === dia);
              
              // Si tiene turno de Mañana o Noche asignado
              if (diaPlantilla && (diaPlantilla.turno === "M" || diaPlantilla.turno === "N")) {
                  const tipoTexto = diaPlantilla.turno === "M" ? "Mañana (M)" : "Noche (N)";
                  
                  //ajustamos las horas segun el turno
                  const horasTexto = diaPlantilla.turno === "M" ? "8:00 - 20:00" : "20:00 - 8:00"; 
                  
                  // Formatea: "jueves, 5 de febrero"
                  const fechaTexto = format(fechaBuscada, "EEEE, d 'de' MMMM", { locale: es });

                  return {
                      texto: `${tipoTexto}: ${fechaTexto}`,
                      horas: horasTexto
                  };
              }
          }
      }
      return null; // Si no encuentra turno en 30 días
  };




  const abrirDialogoBorrar = (id: string) => {
=======

  const abrirDialogoBorrar = (id: number) => {
>>>>>>> a2fa2a4496c3053af3162cb2e07925da6c79733d
    setSolicitudSeleccionada(id)
    setDialogoBorrar(true)

  };

  const borrarSolicitud = async () =>{
    if(solicitudSeleccionada === null)return;

    setMensaje(null);

    try{
      const respuesta = await fetch(`/api/solicitudes?id=${solicitudSeleccionada}`,{
        method: "DELETE", //queremos borrarla
      });

      if(respuesta.ok){
        const nuevaLista = listaSolicitudes.filter(sol => sol._id !== solicitudSeleccionada);
        setListaSolicitudes(nuevaLista);

        setSolicitudSeleccionada(null);
        setDialogoBorrar(false);
        setMensaje({texto: "Solicitud cancelada con éxito", tipo:"exito"});
      }
      else{
        setDialogoBorrar(false);
        setMensaje({texto: "No se pudo cancelar la solicitud", tipo:"error"})
      }
    }catch(error){
      setDialogoBorrar(false);
      setMensaje({texto:"Error al conectar con el servidor", tipo:"error"});
    }

  };

  //camuflamos el tiempo de carga
  if (!usuario) {
    return (
      <Box p="6" style={{ display: "flex", justifyContent: "center", marginTop: "50px" }}>
        <Text size="4" color="gray">Cargando datos del empleado...</Text>
      </Box>
    );
  }

  return (
    <Box p="6" style={{ maxWidth: "1000px" }}> {/* Contenedor limitado */}
      
      <Heading size="6" mb="5" style={{ color: "#1F2937" }}>Mi Resumen</Heading>
      {mensaje && (
          <Box mb="5">
              <Callout.Root color={mensaje.tipo === "error" ? "red" : "green"} variant="soft">
                  <Callout.Icon>
                      {mensaje.tipo === "error" ? <InfoCircledIcon /> : <CheckCircledIcon />}
                  </Callout.Icon>
                  <Callout.Text>
                      {mensaje.texto}
                  </Callout.Text>
              </Callout.Root>
          </Box>
      )}

      {/*Seccion Resumen Datos Usuario*/}
      <Grid columns={{ initial: "1", sm: "2", md: "2" }} gap="4" mb="6">      {/*Ajustamos las columnas segun el tamaño de la pantalla */}
        {/* Fila 1 */}
        <Card style={{ padding: "20px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}>
          <Text as="div" size="4" weight="bold" color="gray" mb="1">Balance Actual</Text>
<<<<<<< HEAD
          <Text as="div" size="7" weight="bold" style={{ color: "#10B981" }}>+{usuario?.estadoActual?.balanceAnual || 0} h</Text>
=======
          <Text as="div" size="7" weight="bold" style={{ color: "#10B981" }}>+{usuario.estadoActual.balanceAnual} h</Text>
>>>>>>> a2fa2a4496c3053af3162cb2e07925da6c79733d
        </Card>

        <Card style={{ padding: "20px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}>
          <Text as="div" size="4" weight="bold" color="gray" mb="1">Horas Realizadas (Objetivo)</Text>
<<<<<<< HEAD
          <Text as="div" size="7" weight="bold" style={{ color: "#1F2937" }}>{usuario?.estadoActual?.horasRealizadas || 0} h</Text>
=======
          <Text as="div" size="7" weight="bold" style={{ color: "#1F2937" }}>{usuario.estadoActual.horasRealizadas} h</Text>
>>>>>>> a2fa2a4496c3053af3162cb2e07925da6c79733d
        </Card>

        {/* Fila 2 */}
        <Card style={{ padding: "20px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}>
          <Text as="div" size="4" weight="bold" color="gray" mb="1">Días libres restantes</Text>
<<<<<<< HEAD
          <Text as="div" size="7" weight="bold" style={{ color: "#3B82F6" }}>{usuario?.estadoActual?.diasLibresRestantes || 0}</Text>
=======
          <Text as="div" size="7" weight="bold" style={{ color: "#3B82F6" }}>{usuario.estadoActual.diasLibresRestantes}</Text>
>>>>>>> a2fa2a4496c3053af3162cb2e07925da6c79733d
        </Card>

        <Card style={{ padding: "20px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}>
          <Text as="div" size="4" weight="bold" color="gray" mb="1">Horas Anuales (Objetivo)</Text>
<<<<<<< HEAD
          <Text as="div" size="7" weight="bold" style={{ color: "#1F2937" }}>{usuario?.estadoActual?.horasPrevistas || 0} h</Text>
=======
          <Text as="div" size="7" weight="bold" style={{ color: "#1F2937" }}>{usuario.estadoActual.horasPrevistas} h</Text>
>>>>>>> a2fa2a4496c3053af3162cb2e07925da6c79733d
        </Card>
      </Grid>

      {/* Seccion Proximo Turno */}
      <Heading size="4" mb="3">Próximo Turno</Heading>
      <Card style={{ padding: "25px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)", marginBottom: "30px" }}>
        <Text size="3" weight="bold" style={{ color: "#0088D1" }}>
          {proximoTurno?.texto} ({proximoTurno?.horas})
        </Text>
      </Card>

      {/**Seccion Solicitudes */}
      <Heading size="4" mb="3"> Mis Solicitudes Anuales</Heading>
      <Card style={{ padding: "0px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)"}}>
        {listaSolicitudes.length > 0 ? (

          listaSolicitudes.map((solicitud, index) => (
                <Box key = {solicitud._id}>
                    <Flex justify="between" align="center" p="4">
                        <Box>
                            {/*mostramos el tipo de dia solicitado */}
                            <Text as="div" weight="bold" style={{ color: "#374151", textTransform: "capitalize"}}>
                                {solicitud.tipoDia}
                            </Text>

                            {/*mostramos el rango o el dia pedido*/}
                            <Text as="div" size="2" style={{ color: "#111827", marginTop: "2px" }}>
                                {solicitud.fechaInicio === solicitud.fechaFin 
                                    ? `Día: ${formatearFecha(solicitud.fechaInicio)}` 
                                    : `Del ${formatearFecha(solicitud.fechaInicio)} al ${formatearFecha(solicitud.fechaFin)}`}
                            </Text>

                            {/*dia en el que se realizo la solicitud*/}
                            <Text as="div" size="1" style={{color:"#1fa1b2", marginTop: "4px" }}>
                                Solicitado el: {formatearFecha(solicitud.fechaSolicitud)}
                            </Text>
                        </Box>
                        <Flex align="center" gap="4">
                            <Badge
                             variant="soft"  //color suabe
                             color={getColorEstado(solicitud.estado)} //cambia de color segun el botón
                             size="3" //tamaño
                             radius="full" //para que sea redondeado
                             style={{padding: "5px 15px"}}  
                            >
                                {solicitud.estado}
                            </Badge>
                        {/*Añadimo el boton de poder cancelar si esta solicitud esta pendiente de ser aprobada*/}
                        {solicitud.estado === "Pendiente" &&(
                            <Button
                              variant="soft"
                              style={{color: "#500e0e", backgroundColor: "#CD4444"}}
                              onClick={() => abrirDialogoBorrar(solicitud._id)}
                              >
                                Cancelar
                            </Button>
                        )}
                        </Flex>
                    </Flex>
                    {index < listaSolicitudes.length-1 && <Separator size="4"></Separator>}
                </Box>
            ))
        ) : (
          <Box p="5">
              <Text color="gray" align="center" as="div">No tienes solicitudes pendientes ni aprobadas.</Text>
          </Box>

        )}
            
      </Card>


       {/*Dialogo borrar solicitud*/}
      <Dialog.Root open={dialogoBorrar} onOpenChange={setDialogoBorrar}>
          <Dialog.Content style={{maxWidth: 400}}>
              <Dialog.Title size="5" mb="2" weight="bold" color="red">Cancelar Solicitud</Dialog.Title>
              <Text size="3" mb="6" as="p">¿Seguro que quieres eliminar la solicitud? Esta acción no se puede deshacer.</Text>
              <Flex gap="3" justify="end" mt="4">
                  <Dialog.Close>
                      <Button variant="soft" color="gray" style={{cursor:"pointer"}}>Cancelar</Button>
                  </Dialog.Close>
                  <Button onClick={borrarSolicitud} color="red" style={{cursor: "pointer", backgroundColor: "#DC2626"}}>
                      Sí, Eliminar
                  </Button>
              </Flex>
          </Dialog.Content>
      </Dialog.Root>
    </Box>
  );
}