"use server";

import { conectarDB } from "@/lib/mongodb";
import Usuario from "@/models/usuario";
import { revalidatePath } from "next/cache";


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
        await conectarDB();

        await Usuario.create({
            nombre: datos.nombre,
            apellido: datos.apellido,
            correo: datos.correo,
            password: "123456", 
            rol: datos.rol,
            nivel: datos.nivel,
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
        await conectarDB();

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
        await conectarDB();

        await Usuario.findByIdAndDelete(idUsuario);

        revalidatePath("/(supervisor)/personal");

        return {exito: true, mensaje: "¡Usuario eliminado con éxito!"};
    }catch(error){
        return {exito: false, mensaje: "Error en el servidor al borrar el usuario"};
    }
}