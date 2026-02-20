"use client";

import { Box, Card, Text, Heading, Button, Flex, Select, TextField, TextArea } from "@radix-ui/themes";
import {useState} from "react"
import {CalendarIcon } from "@radix-ui/react-icons";

export default function DashboardSolicitudDia(){
    //Hook de estado con valor libre disposicion por defecto
    const[tipoDia, setTipoDia] = useState("libre-disposicion");
    const[fecha, setFecha] = useState("");
    const[comentario, setComentario] = useState("");
    const[enviado, setEnviado] = useState(false); //por defecto no hemos pulsado el botón de envío de la solicitud
    const fechaActual = new Date().toISOString().split("T")[0]; 

    const envioFormulario = (e: React.SubmitEvent) =>{
        e.preventDefault(); //Eviar recarga automática de la pagina

        if(fechaActual > fecha){
            alert(`ERROR: \n -Fecha solicitada: ${fecha} es anterior al dia de hoy ${fechaActual}`);
            return;
        }
        setEnviado(true);

        setTimeout(() =>{
            alert(
                `Solicitud Enviada: \n -Tipo de Día: ${tipoDia}\n -Fecha Solicitada: ${fecha}\n -Comentarios Añadidos: ${comentario}`
            );
            setEnviado(false); //una vez enviado lo ponemos a false para permitir nuevos envios
            //Limpiamos todos los datos
            setTipoDia("libre-disposicion");
            setComentario("");
            setFecha("");
        }, 10);
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
                                        <Select.Item value="libre-disposicion">Día de Libre Disposición</Select.Item>
                                        <Select.Item value="mudanza">Mudanza</Select.Item>
                                        <Select.Item value="examen">Examen</Select.Item>
                                        <Select.Item value="medico">Medico</Select.Item>
                                        
                                        {/*Barra separadora*/}
                                        <Select.Separator/>

                                        <Select.Label>Ausencias</Select.Label>
                                        <Select.Item value="ausencia-justificada">Ausencia Justificada</Select.Item>
                                        <Select.Item value="indisposicion">Indisposicion (Sin baja)</Select.Item>
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
                        <Button size="3" type="submit" style={{ backgroundColor: "#0284C7", width: "100%", marginTop: "10px"}} disabled={enviado}>
                            {enviado ? "Enviando Solicitud..." : "Solicitar"}
                        </Button> 
                    </Flex>
                </form>
             </Card>
        </Box>
    );
}