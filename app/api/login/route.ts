import { NextResponse } from 'next/server';
import { conectarDB } from '../../../lib/mongodb';
import Usuario from '../../../models/usuario';

export async function POST(request: Request) {
    try{
        await conectarDB();

        //Leemos el correo y las contraseñas introducidas por el usuario en el cliente
        const {correo, password} = await request.json();
        //Buscamos si existe el correo
        const usuario = await Usuario.findOne({correo: correo});

        //Comprobamos si existe, en caso de que no exista:
        if(!usuario){
            return NextResponse.json({error: "El correo no está asociado a ninguna cuenta existene"}, {status: 404});
        }

        //Si existe, comprobamos que las contraseñas conincidan
        if(usuario.password !== password){
            return NextResponse.json({error: "La contraseña no es correcta"},{ status: 401 });
        }

        //formateamos el usuario para evitar mandar la contraseña al frontend
        const usuarioJSON = usuario.toObject();
        delete usuarioJSON.password;

        //En caso de que coincida:
        return NextResponse.json({
            mensaje: "Inicio de sesión completado", 
            usuario: usuarioJSON 
        }, { status: 200 });
    }
    catch (error){
        return NextResponse.json({error: "Fallo al iniciar sesión con el usuario"}, {status: 500});
    }
}


