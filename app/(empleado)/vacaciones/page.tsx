"use client";

import { Box, Card, Text, Heading, Button, Flex, TextField, TextArea, Callout } from "@radix-ui/themes";
import { useState } from "react";
import { CalendarIcon, InfoCircledIcon, CheckCircledIcon } from "@radix-ui/react-icons";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

export default function DashboardSolicitudVacaciones(){
    //Hook para actualizar el formulario
    const[fechaInicio, setFechaInicio] = useState("");
    const[fechaFinal, setFechaFinal] = useState("");
    const[comentario, setComentario] = useState("");
    const[enviado, setEnviado] = useState(false); //por defecto no hemos pulsado el botón de envío de la solicitudç
    const fechaActual = format(new Date(), "yyyy-MM-dd");


    //logica conexion BD
    const router = useRouter();
    const [mensaje, setMensaje] = useState<{ texto: string, tipo: "error" | "exito" } | null>(null);
    
    
    const envioFormulario = async (e: React.SubmitEvent) =>{
        e.preventDefault(); //Eviar recarga automática de la pagina
        setMensaje(null); //limpiamos el mensaje antes

        if(fechaActual > fechaInicio){
            setMensaje({texto: `La fecha de inicio solicitada ${fechaInicio} no puede ser anterior al día de hoy ${fechaActual}`, tipo: "error"});
            return;
        }
        if(fechaActual > fechaFinal){
            setMensaje({texto: `La fecha de fin ${fechaFinal} no puede ser anterior al día de hoy ${fechaActual}`, tipo: "error"});
            return;
        }
        if(fechaInicio > fechaFinal){
            setMensaje({texto: `La fecha de fin ${fechaFinal} no puede ser anterior a la fecha de inicio ${fechaInicio}`, tipo: "error"});
            return;
        }

        setEnviado(true);

        try {
            const usuarioGuardado:any = localStorage.getItem("usuarioLogueado");
            if(!usuarioGuardado){
                setMensaje({texto:"Sesion expirada. Es necesario que vuelva a loguearse", tipo:"error"});
                router.push("/login");
                return;
            }

            const usuario = JSON.parse(usuarioGuardado);
            
            const respuesta = await fetch("/api/solicitudes", {
                method: "POST",
                headers: {'Content-Type': "application/json"},
                body: JSON.stringify({
                    usuarioId: usuario._id,
                    tipoDia: "Vacaciones",
                    fechaInicio: fechaInicio,
                    fechaFin: fechaFinal,
                    comentario: comentario,
                    estado: "Pendiente"
                })
            });

            if(respuesta.ok){
                setMensaje({ texto: "¡Vacaciones solicitadas con éxito! Ya puedes verlas en tu resumen.", tipo: "exito" });
                setComentario("");
                setFechaInicio("");
                setFechaFinal("");
            }
            else {
                setMensaje({ texto: "Hubo un error en el envío de la solicitud", tipo: "error" });
            }
        }catch (error){
            setMensaje({texto: "Error en la conexión con el servidor", tipo:"error"});
        }finally{
            setEnviado(false); //una vez enviado lo ponemos a false para permitir nuevos envios
        }
    };

    return (
        //caja blanca del centro
        <Box p="6">
            <Box mb="6">  
                <Heading size="6" mb="2" style={{color:"#111827"}}>Solicitar Vacaciones</Heading>
                <Text size="2" color="gray">
                    Selecciona las fechas de inicio y final de las vacaciones deseadas.
                </Text>
            </Box>
            {/*Ahora añdimos el card que contendrá el formulario*/}
             <Card size="4" style={{maxWidth: "650px", padding: "35px", margin:"0 auto"}}>

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

                <form onSubmit={envioFormulario}>
                    {/*Ordenamos en vertical los elementos del formulario que lo alinearemos con el flex en vertical*/}
                    <Flex direction="column" gap="5">

                        {/*Selector del día Inicio de vacaciones*/}
                        <Box>
                            <Text as="div" size="3" weight="bold" mb="2">Fecha de Inicio</Text>
                            <TextField.Root>
                                <TextField.Slot>
                                    <CalendarIcon height="20" width="20" />
                                </TextField.Slot>
                                <input
                                type="date"  //Abre un calendario
                                required     //hace que sea obligatorio
                                value={fechaInicio} //el valor que se muestra es la fecha o por defecto o la ultima seleccionada
                                onChange={(e) => setFechaInicio(e.target.value)} //programamos un evento que actualice el valor de la fecha
                                onClick={(e) => e.currentTarget.showPicker()} //abrir el calendario 
                                style={{ 
                                    border: "none", 
                                    outline: "none", 
                                    background: "transparent", 
                                    width: "900000%", //antes 180
                                    fontSize: "15px", //antes 16
                                    fontFamily: "inherit",
                                    cursor: "pointer"
                                    }} 
                                    />
                            </TextField.Root>
                        </Box>

                        {/*Selector del día Final de vacaciones*/}
                        <Box>
                            <Text as="div" size="3" weight="bold" mb="2">Fecha de Fin</Text>
                            <TextField.Root>
                                <TextField.Slot>
                                    <CalendarIcon height="20" width="20" />
                                </TextField.Slot>
                                <input
                                type="date"  //Abre un calendario
                                required     //hace que sea obligatorio
                                value={fechaFinal} //el valor que se muestra es la fecha o por defecto o la ultima seleccionada
                                onChange={(e) => setFechaFinal(e.target.value)} //programamos un evento que actualice el valor de la fecha
                                onClick={(e) => e.currentTarget.showPicker()} //abrir el calendario 
                                style={{ 
                                    border: "none", 
                                    outline: "none", 
                                    background: "transparent", 
                                    width: "900000%", //antes 180
                                    fontSize: "15px", //antes 16
                                    fontFamily: "inherit",
                                    cursor: "pointer"
                                    }} 
                                    />
                            </TextField.Root>
                        </Box>
                        
                        {/*Comentarios y Documentos*/}
                        <Box>
                            <Text as="div" size="3" weight="bold" mb="2">Comentarios</Text>
                            {/*Aqui se incluira el texto del formulario*/}
                            <TextArea
                                placeholder="Añade un comentario si lo deseas."
                                rows={4}
                                value={comentario}
                                onChange={(e) => setComentario(e.target.value)}
                            />
                        </Box>
                        {/*Botón de envío*/}
                        <Button size="3" type="submit" style={{ backgroundColor: "#0284C7", width: "100%", marginTop: "10px"}} disabled={enviado}>
                            {enviado ? "Enviando Solicitud..." : "Solicitar"}
                        </Button> 
                    </Flex>
                </form>
             </Card>
        </Box>
    );
}