"use client";

import { Box, Card, Text, Heading, Button, Flex, Select, TextField, TextArea } from "@radix-ui/themes";
import { useState, useTransition } from "react";
import { CalendarIcon} from "@radix-ui/react-icons";
import { format } from "date-fns";
import { toast } from "sonner";

//INTERFACES
export interface DatosSolicitud{ //export porque son los datos que se enviaran al servidor
    usuarioId: string;
    tipoDia: string;
    fechaInicio: string;
    fechaFin: string;
    comentario: string;
}

interface SolicitudProps {
    usuarioId: string;
    guardar: (datos: DatosSolicitud) => Promise<{exito: boolean, mensaje: string}>; 
}


export default function DashboardSolicitudDiaCliente({
    usuarioId,
    guardar
}: SolicitudProps){
    //Hook de estado con valor libre disposicion por defecto
    const[tipoDia, setTipoDia] = useState("Libre Disposición");
    const[fecha, setFecha] = useState("");
    const[comentario, setComentario] = useState("");
    const fechaActual = format(new Date(), "yyyy-MM-dd");
    const[estaPendiente, empezarTransicion] = useTransition();

   
    
    
    const envioFormulario = async (e: React.SyntheticEvent<HTMLFormElement>) =>{
        e.preventDefault(); //Eviar recarga automática de la pagina

        if(fechaActual > fecha){
            toast.error(`La fecha seleccionada (${fecha}) no puede ser anterior a hoy`);
            return;
        }

        empezarTransicion(async () => {
            try{
                const resultado = await guardar({
                    usuarioId: usuarioId,
                    tipoDia: "Vacaciones",
                    fechaInicio: fecha,
                    fechaFin: fecha,
                    comentario: comentario
                });

                if(resultado.exito){
                    toast.success(resultado.mensaje);
                    setFecha("");
                    setComentario("");
                }else{
                    toast.error(resultado.mensaje);
                }
            }catch(error){
                toast.error("Error en la conexión con el servidor al solicitar día.");
            }
        }); 
       
    };   

    return (
        //caja blanca del centro
        <Box p="6">
            <Box mb="6">  
                <Heading size="6" mb="2" style={{color:"#111827"}}>Solicitar Dia</Heading>
                <Text size="2" color="gray">
                    Selecciona el tipo de día y la fecha; añade un comentario o documentos si así lo deseas.
                </Text>
            </Box>
            {/*Ahora añdimos el card que contendrá el formulario*/}
             <Card size="4" style={{maxWidth: "650px", padding: "35px", margin:"0 auto"}}>
                <form onSubmit={envioFormulario}>
                    {/*Ordenamos en vertical los elementos del formulario que lo alinearemos con el flex en vertical*/}
                    <Flex direction="column" gap="5">

                        {/*Selector del día con texto*/}
                        <Box>
                            <Text as= "div" size="3" weight="bold" mb="2">Tipo de Día</Text>
                            {/*Desplegable selector del día*/}
                            <Select.Root value={tipoDia} onValueChange={setTipoDia}>
                                {/*Texto por defecto*/}
                                <Select.Trigger placeholder="Selecciona el tipo..." style={{width: "100%"}}/>
                                {/*Caja que sale al pulsar con las opciones*/}
                                <Select.Content>
                                    {/*grupo de opciones*/}
                                    <Select.Group>
                                        {/*Texto con el nombre del grupo*/}
                                        <Select.Label>Permisos Retribuidos</Select.Label>
                                        {/*Lista de opciones*/}
                                        <Select.Item value="Libre Disposición">Día de Libre Disposición</Select.Item>
                                        <Select.Item value="Mudanza">Mudanza</Select.Item>
                                        <Select.Item value="Examen">Examen</Select.Item>
                                        <Select.Item value="Médico">Medico</Select.Item>
                                        
                                        {/*Barra separadora*/}
                                        <Select.Separator/>

                                        <Select.Label>Ausencias</Select.Label>
                                        <Select.Item value="Ausencia Justificada">Ausencia Justificada</Select.Item>
                                        <Select.Item value="Indisposición">Indisposicion (Sin baja)</Select.Item>
                                    </Select.Group>
                                </Select.Content>
                            </Select.Root>
                        </Box>

                        {/*Selector del día*/}
                        <Box>
                            <Text as="div" size="3" weight="bold" mb="2">Fecha día Solicitado</Text>
                            <TextField.Root>
                                <TextField.Slot>
                                    <CalendarIcon height="20" width="20" />
                                </TextField.Slot>
                                <input
                                type="date"  //Abre un calendario
                                required     //hace que sea obligatorio
                                value={fecha} //el valor que se muestra es la fecha o por defecto o la ultima seleccionada
                                onChange={(e) => setFecha(e.target.value)} //programamos un evento que actualice el valor de la fecha
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
                            <Text as="div" size="3" weight="bold" mb="2">Comentarios y Documentos</Text>
                            {/*Aqui se incluira el texto del formulario*/}
                            <TextArea
                                placeholder="Añade un comentario o documento"
                                rows={4}
                                value={comentario}
                                onChange={(e) => setComentario(e.target.value)}
                            />
                        {/*Botón para añadir documentos*/}
                            <Flex justify="start"  mt="2" gap="2" align="center">
                                <Button type="button" variant="soft" size="1" color="gray"style={{ cursor: "pointer" }}>
                                    Adjuntar archivo...
                                </Button>
                                <Text size="1" color="gray">(Max 5MB)</Text>
                            </Flex>
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