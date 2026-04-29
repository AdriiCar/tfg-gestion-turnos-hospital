"use server";
import { conectarDB } from "@/lib/mongodb";
import Usuario from "@/models/usuario";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

export async function actualizarPerfilAction(usuarioId: string, datos: any) {
    try {
        await conectarDB();
        const usuario = await Usuario.findById(usuarioId);
        if (!usuario) return { exito: false, mensaje: "Usuario no encontrado" };

        // Si se intenta cambiar la contraseña tenemos que comprobar que haya introducido la actual de forma correcta
        if (datos.passwordNueva) {
            const esCorrecta = await bcrypt.compare(datos.passwordActual, usuario.password);
            if (!esCorrecta) return { exito: false, mensaje: "La contraseña actual no es correcta" };

            const salt = await bcrypt.genSalt(10);
            usuario.password = await bcrypt.hash(datos.passwordNueva, salt);
            usuario.esNuevoUsuario = false; // Ya no es nuevo
        }

        usuario.nombre = datos.nombre;
        usuario.apellido = datos.apellido;

        await usuario.save();

        //como se cambian los datos hay que generar un nuevo token 
        const secret = new TextEncoder().encode(process.env.JWT_SECRET);
        const nuevoToken = await new SignJWT({
            usuarioId: usuario._id.toString(),
            nombre: usuario.nombre, 
            apellido: usuario.apellido, 
            rol: usuario.rol,
            esSupervisor: usuario.esSupervisor,
            plantaId: usuario.plantaId ? usuario.plantaId.toString() : null
        })
        .setProtectedHeader({alg:"HS256"})
        .setExpirationTime("8h")
        .sign(secret);

        const cookieStore = await cookies();
        cookieStore.set("auth_token", nuevoToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60*60*8 
        });
        
        if(usuario.esSupervisor) revalidatePath("/perfil_supervisor");
        else revalidatePath("/perfil");
        
        return { exito: true, mensaje: "Perfil actualizado correctamente" };
    } catch (error) {
        return { exito: false, mensaje: "Error al actualizar el perfil" };
    }
}