"use server";

import { conectarDB } from "@/lib/mongodb";
import Configuracion from "@/models/configuracion";
import Rotacion from "@/models/rotacion";
import Usuario from "@/models/usuario";
import { revalidatePath } from "next/cache";


//guardar el cambio de la cobertura y las horas
export async function actualizarParametrosAction(datos: any) {
    try {
        await conectarDB();
        let config = await Configuracion.findOne();
        if (!config) config = new Configuracion();
        
        config.parametrosGlobales = datos.parametrosGlobales;
        config.coberturaPlanta = datos.coberturaPlanta;
        await config.save();
        
        revalidatePath("/(supervisor)/rotacion");
        return { exito: true, mensaje: "Parámetros actualizados con éxito" };
    } catch (error) {
        return { exito: false, mensaje: "Error al guardar parámetros" };
    }
}

//guardar o editar un patron
export async function guardarPatronAction(patronId: string | null, nombre: string, secuencia: string[]) {
    try {
        await conectarDB();
        let config = await Configuracion.findOne();
        if (!config) config = new Configuracion({ patronesBase: [] });

        if (patronId) {
            // Editar existente
            console.log("DATOS PATRON", patronId)
            const patron = config.patronesBase.find((p: any) => p._id.toString() === patronId);
            if (patron) {
                patron.nombre = nombre;
                patron.secuencia = secuencia;
            }
        } else {
            console.log("DATOS PATRON", patronId)
            // Crear nuevo
            config.patronesBase.push({
                nombre,
                secuencia
            });
        }
        
        await config.save();
        revalidatePath("/(supervisor)/rotacion");
        return { exito: true, mensaje: patronId ? "Patrón editado con éxito" : "Patrón creado con éxito" };
    } catch (error) {
        return { exito: false, mensaje: "Error al guardar el patrón" };
    }
}

export async function borrarPatronAction(patronId: string){
    try{
        await conectarDB();

        await Configuracion.findOneAndUpdate(
            {}, 
            { $pull: { patronesBase: { _id: patronId } } }
        );
        
        // Y borramos los grupos que usaban ese patrón
        await Rotacion.deleteMany({ patronBaseId: patronId });

        revalidatePath("/(supervisor)/rotacion");
        
        return {exito: true, mensaje: "Patron eliminado correctamente"};
    }catch(error){
        return {exito: false, mensaje: "Error en el servidor al borrar el patron"};
    }
}


export async function añadirUsuarioGrupoAction(grupoId: string, correo: string){
    try{
        await conectarDB();
        const usuario = await Usuario.findOne({correo});

        if(!usuario) return {exito: false, mensaje: "El usuario seleccionado no existe"};

        await Rotacion.findByIdAndUpdate(grupoId, {
            $addToSet: {empleados: usuario._id}
        });return { exito: true, mensaje: "Usuario añadido al grupo con éxito" };
        
    } catch (error) {
        return { exito: false, mensaje: "Error en el servidor al asignar usuario al grupo" };
    }
}



export async function quitarUsuarioGrupoAction(grupoId: string, empleadoId: string){
    try{
        await conectarDB();
        await Rotacion.findByIdAndUpdate(grupoId, {
            $pull: {empleados: empleadoId}
        });

        revalidatePath("/(supervisor)/rotacion");

        return {exito: true, mensaje: "Usuario eliminado del grupo"};
    }catch(error){
        return {exito: false, mensaje: "Error en el servidor al borrar usuario"};
    }
}