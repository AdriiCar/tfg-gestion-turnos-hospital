import { NextResponse } from "next/server";
import { conectarDB } from "@/lib/mongodb";
import Incidencia from "@/models/incidencia";
import Usuario from "@/models/usuario";
import Sustitucion from "@/models/sustitucion";
import Solicitud from "@/models/solicitud"; 

export async function POST(request: Request) {
    try {
        await conectarDB();
        const body = await request.json();
        
        //recibimos los datos del frontend
        const { fecha, turno, sustituido, sustitutoNombre, sustitutoCorreo, incidenciaId, solicitudId } = body;

        //verificamos si existe el usuario
        const existenciaUsuario = await Usuario.exists({ correo: sustitutoCorreo });
        if(!existenciaUsuario){
            return NextResponse.json({ error: "El usuario introducido no existe" }, { status: 404 });
        }

        //vemos si la sustitucion es por solicitud o por incidencia
        let solicitudRelacionadaId = solicitudId || null;
        let incidenciaRelacionadaId = incidenciaId || null;

        //una incidencia puede tener una solicitud relacionada, entonces si solo tenemos la incidencia comprobamos
        if (incidenciaId && !solicitudRelacionadaId) {
            const incidencia = await Incidencia.findById(incidenciaId);
            if (incidencia && incidencia.solicitudRelacionada) {
                solicitudRelacionadaId = incidencia.solicitudRelacionada;
            }
        }

        //creamos la sustitucion con los datos
        const nuevaSustitucion = await Sustitucion.create({
            fecha,
            turno,
            sustituido,
            sustitutoNombre,
            sustitutoCorreo,
            incidenciaRelacionada: incidenciaRelacionadaId,
            solicitudRelacionada: solicitudRelacionadaId 
        });

        //si tenia una incidencia entonces la marcamos como resuleta
        if (incidenciaRelacionadaId) {
            await Incidencia.findByIdAndUpdate(incidenciaRelacionadaId, { resuelta: true });
        }

        //si tenia una solicitud entonces le registramos el sustituto para que aparezca en el panel de sustituciones
        if (solicitudRelacionadaId) {
            await Solicitud.findByIdAndUpdate(solicitudRelacionadaId, {
                sustitutoNombre: sustitutoNombre,
                sustitutoCorreo: sustitutoCorreo
            });
        }

        return NextResponse.json({ 
            mensaje: "Sustitución registrada y sincronizada con éxito", 
            nuevaSustitucion 
        }, { status: 201 });

    } catch (error) {
        console.error("Error al guardar la sustitución:", error);
        return NextResponse.json({ error: "Fallo al guardar la sustitución" }, { status: 500 });
    }
}

export async function GET(){
    try{
        await conectarDB();
        // Obtenemos todas las sustituciones ordenadas por la más reciente
        const sustituciones = await Sustitucion.find().sort({createdAt: -1});
        return NextResponse.json(sustituciones);
    }catch(error){
        console.error("Error al obtener las sustituciones:", error);
        return NextResponse.json({error: "Fallo al obtener las sustituciones"}, {status: 500});
    }
}