"use client";

import { Box, Card, Text, Heading, Button, Flex, TextField, TextArea } from "@radix-ui/themes";
import { useState, useTransition } from "react";
import { CalendarIcon} from "@radix-ui/react-icons";
import { format } from "date-fns";
import { toast } from "sonner";

//INTERFACES
export interface DatosSolicitud{
    usuarioId: string;
    tipoDia: string;
    fechaInicio: string;
    fechaFin: string;
    comentario: string;
}

interface SolicitudVacacionesProps {
    usuarioId: string;
    guardar: (datos: DatosSolicitud) => Promise<{exito: boolean, mensaje: string}>; 
}

export default function DashboardSolicitudVacacionesVista({
    usuarioId,
    guardar
}: SolicitudVacacionesProps){
    //Hook para actualizar el formulario
    const[fechaInicio, setFechaInicio] = useState("");
    const[fechaFinal, setFechaFinal] = useState("");
    const[comentario, setComentario] = useState("");
    const fechaActual = format(new Date(), "yyyy-MM-dd");

    const[estaPendiente, empezarTransicion] = useTransition();
    
    
    
    const envioFormulario = async (e: React.SubmitEvent) =>{
        e.preventDefault(); //Eviar recarga automática de la pagina

        if(fechaActual > fechaInicio){
            toast.error(`La fecha de inicio solicitada no puede ser anterior al día de hoy`);
            return;
        }
        if(fechaActual > fechaFinal){
            toast.error(`La fecha de fin no puede ser anterior al día de hoy`);
            return;
        }
        if(fechaInicio > fechaFinal){
            toast.error(`La fecha de fin no puede ser anterior a la fecha de inicio`);
            return;
        }

        empezarTransicion(async () => {
            try{
                const resultado = await guardar({
                    usuarioId: usuarioId,
                    tipoDia: "Vacaciones",
                    fechaInicio: fechaInicio,
                    fechaFin: fechaFinal,
                    comentario: comentario
                });

                if(resultado.exito){
                    toast.success(resultado.mensaje);
                    setFechaInicio("");
                    setFechaFinal("");
                    setComentario("");
                }else{
                    toast.error(resultado.mensaje);
                }
            }catch(error){
                toast.error("Error en la conexión con el servidor al registrar vacaciones.");
            }
        }); 
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
                        <Button size="3" type="submit" style={{ backgroundColor: "#0284C7", width: "100%", marginTop: "10px"}} disabled={estaPendiente}>
                            {estaPendiente ? "Enviando Solicitud..." : "Solicitar"}
                        </Button> 
                    </Flex>
                </form>
             </Card>
        </Box>
    );
}