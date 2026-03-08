"use client";

import { Box, Card, Text, Heading, Button, Flex, Select, TextField, TextArea, Callout } from "@radix-ui/themes";
import { useState } from "react";
import { CalendarIcon, InfoCircledIcon, CheckCircledIcon } from "@radix-ui/react-icons";
import { useRouter } from "next/navigation";
<<<<<<< HEAD
import { format } from "date-fns";
=======
>>>>>>> a2fa2a4496c3053af3162cb2e07925da6c79733d

export default function DashboardSolicitudDia(){
    //Hook de estado con valor libre disposicion por defecto
    const[tipoDia, setTipoDia] = useState("Libre Disposición");
    const[fecha, setFecha] = useState("");
    const[comentario, setComentario] = useState("");
    const[enviado, setEnviado] = useState(false); //por defecto no hemos pulsado el botón de envío de la solicitud
    const fechaActual = format(new Date(), "yyyy-MM-dd");

    //Logica conexion BD
    const router = useRouter();
    const [mensaje, setMensaje] = useState<{ texto: string, tipo: "error" | "exito" } | null>(null);

    const envioFormulario = async (e: React.SubmitEvent) =>{
        e.preventDefault(); //Eviar recarga automática de la pagina

        if(fechaActual > fecha){
            setMensaje({texto: `La fecha seleccionada (${fecha}) no puede ser anterior a hoy`, tipo: "error"});
            return;
        }
        setEnviado(true);

        try{
            const usuarioGuardado: any = localStorage.getItem("usuarioLogueado");

            if(!usuarioGuardado){
                setMensaje({texto:"Sesion expirada. Es necesario que vuelva a loguearse", tipo:"error"});
                router.push("/login")
<<<<<<< HEAD
                return;
=======
>>>>>>> a2fa2a4496c3053af3162cb2e07925da6c79733d
            }

            const usuario = JSON.parse(usuarioGuardado);
            const respuesta = await fetch("/api/solicitudes",{
                method: 'POST',
                headers: {'Content-Type': "application/json"},
                body: JSON.stringify({
                    usuarioId: usuario._id,
                    tipoDia: tipoDia,
                    fechaInicio: fecha,
                    fechaFin: fecha,
                    comentario: comentario,
                    estado: "Pendiente"
                })
            });

            if (respuesta.ok) {
                setMensaje({ texto: "¡Solicitud enviada con éxito! Ya puedes verla en tu resumen.", tipo: "exito" });
                
                // Limpiamos los datos si ha ido bien
                setTipoDia("Libre Disposición");
                setComentario("");
                setFecha("");
            } else {
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
                <Heading size="6" mb="2" style={{color:"#111827"}}>Solicitar Dia</Heading>
                <Text size="2" color="gray">
                    Selecciona el tipo de día y la fecha; añade un comentario o documentos si así lo deseas.
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
                        <Button size="3" type="submit" style={{ backgroundColor: "#0284C7", width: "100%", marginTop: "10px"}} disabled={enviado}>
                            {enviado ? "Enviando Solicitud..." : "Solicitar"}
                        </Button> 
                    </Flex>
                </form>
             </Card>
        </Box>
    );
}