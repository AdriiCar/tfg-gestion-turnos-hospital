"use server";

import { conectarDB } from "@/lib/mongodb";
import Usuario from "@/models/usuario";
import { cookies } from "next/headers";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";

export async function loginAction(correo: string, password: string){
    try{
        await conectarDB();

        const usuario = await Usuario.findOne({correo});

        if(!usuario) return {exito: false, mensaje: "Correo o contraseña incorrecta"};

        const passwordCifrada = await bcrypt.compare(password, usuario.password);

        if(!passwordCifrada) return {exito: false, mensaje: "Correo o contraseña incorrecta"};

        const secret = new TextEncoder().encode(process.env.JWT_SECRET);

        //generamos el token
        const token = await new SignJWT({
            usuarioId: usuario._id.toString(),
            nombre: usuario.nombre,
            rol: usuario.rol,
            esSupervisor: usuario.esSupervisor,
            plantaId: usuario.plantaId ? usuario.plantaId.toString() : null
        })
        .setProtectedHeader({alg:"HS256"})
        .setExpirationTime("8h")
        .sign(secret);

        //guaradmos el token en las cookies
        const cookieStore = await cookies();
        cookieStore.set("auth_token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60*60*8 //8 horas
        });

        return {exito: true, mensaje: "Login exitoso", esSupervisor: usuario.esSupervisor, nombre: usuario.nombre};
    }catch(error){
        console.log(error);
        return {exito: false, mensaje: "Error en el servidor al intentar iniciar sesión"};
    }
}



export async function registroAction(datos: { nombre: string, apellido: string, correo: string, password: string }){
    try{
        await conectarDB();

        const existeUsuario = await Usuario.findOne({correo: datos.correo});

        if(existeUsuario){
            return {exito: false, mensaje: "Ya hay una cuenta vinculada a ese correo"};
        }

        const sal = await bcrypt.genSalt(); //por defecto son 10 rondas
        const passwordCifrada = await bcrypt.hash(datos.password, sal);

        await Usuario.create({
            nombre: datos.nombre,
            apellido: datos.apellido,
            correo: datos.correo,
            password: passwordCifrada
        });

        return {exito: true, mensaje: "¡Usuario registrado con éxito! Inicia sesión para acceder"};
    }catch(error){
        return {exito: false, mensaje: "Error en el servidor al crear el usuario"};
    }
}