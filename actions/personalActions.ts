"use server";

import { decrypt } from "@/lib/auth";
import { conectarDB } from "@/lib/mongodb";
import Usuario from "@/models/usuario";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";


export interface DatosEmpleado {
    nombre: string;
    apellido: string;
    correo: string;
    rol: string;
    nivel: string;
    fechaInicio: string; //admitimos string para cuando creemos o modifiquemos le pasemos los datos del formulario que son string
    fechaFin?:  string;
}

export async function crearEmpleadoAction(datos: DatosEmpleado){
    try{

        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token")?.value;
        const sesion = await decrypt(token as string);

        if (!sesion || !sesion.plantaId || !sesion.esSupervisor) return { exito: false, mensaje: "Permiso denegado." };
          

        const salt = await bcrypt.genSalt();
        const passwordCifrada = await bcrypt.hash("111", salt);


        await conectarDB();

        await Usuario.create({
            nombre: datos.nombre,
            apellido: datos.apellido,
            correo: datos.correo,
            password: passwordCifrada, 
            rol: datos.rol,
            nivel: datos.nivel,
            plantaId: sesion.plantaId,
            datosContractuales: {
                horasContrato: 1492,
                fechaInicio: datos.fechaInicio || new Date(),
                fechaFin: datos.fechaFin || null
            },
            estadoActual: {
                horasPrevistas: 1492,
                horasRealizadas: 0,
                balanceAnual: 0,
                diasLibresRestantes: 6
            }
        });

        revalidatePath("/(supervisor)/personal");
        return {exito: true, mensaje: "¡Usuario creado con éxito!"};
    }catch(error){
        return {exito: false, mensaje: "Error en el servidor al crear el usuario"};
    }
}


export async function modificarEmpleadoAction(idUsuario: string, datos:DatosEmpleado){
    try{

        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token")?.value;
        const sesion = await decrypt(token as string);

        if (!sesion || !sesion.plantaId || !sesion.esSupervisor) return { exito: false, mensaje: "Permiso denegado." };


        await conectarDB();

        //comprobamos que el usuario que vamos a modificar pertenezca a nuestra planta
        const usuarioAModificar = await Usuario.findById(idUsuario);
        if(!usuarioAModificar || String(usuarioAModificar.plantaId) != String(sesion.plantaId)){
            return {exito: false, mensaje: "No tienes permiso para modificar a un usuario de otra planta"};
        }

        await Usuario.findByIdAndUpdate(idUsuario, {
            nombre: datos.nombre,
            apellido: datos.apellido,
            correo: datos.correo,
            rol: datos.rol,
            nivel: datos.nivel,
            "datosContractuales.fechaInicio": datos.fechaInicio,
            "datosContractuales.fechaFin": datos.fechaFin
        });

        revalidatePath("/(supervisor)/personal");
        return {exito: true, mensaje: "¡Usuario modificado con éxito!"};
    }catch(error){
        return {exito: false, mensaje: "Error en el servidor al modificar el usuario"};
    }
}


export async function eliminarEmpleadoAction(idUsuario: string){
    try{
        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token")?.value;
        const sesion = await decrypt(token as string);

        if (!sesion || !sesion.plantaId || !sesion.esSupervisor) return { exito: false, mensaje: "Permiso denegado." };


        await conectarDB();

        const usuarioAModificar = await Usuario.findById(idUsuario);
        if(!usuarioAModificar || String(usuarioAModificar.plantaId) != String(sesion.plantaId)){
            return {exito: false, mensaje: "No tienes permiso para eliminar a un usuario de otra planta"};
        }

        await Usuario.findByIdAndDelete(idUsuario);

        revalidatePath("/(supervisor)/personal");

        return {exito: true, mensaje: "¡Usuario eliminado con éxito!"};
    }catch(error){
        return {exito: false, mensaje: "Error en el servidor al borrar el usuario"};
    }
}