import { NextResponse } from "next/server";
import { conectarDB } from "@/lib/mongodb";
import Usuario from "@/models/usuario";
import Configuracion from "@/models/configuracion";
import Plantilla from "@/models/plantilla";
import Solicitud from "@/models/solicitud";
import Incidencia from "@/models/incidencia";
import Sustitucion from "@/models/sustitucion";

export async function GET() {
    try {
        await conectarDB();

  
        console.log("Borrando base de datos...");
        await Usuario.deleteMany({});
        await Configuracion.deleteMany({});
        await Plantilla.deleteMany({});
        await Solicitud.deleteMany({});
        await Incidencia.deleteMany({});
        await Sustitucion.deleteMany({});

        console.log("Creando configuración...");
        await Configuracion.create({
            coberturaPlanta: {
                mañana: { enfermeros: 1, auxiliares: 1 },
                noche: { enfermeros: 1, auxiliares: 1 }
            }
        });

        console.log("Creando usuarios...");
        const juan = await Usuario.create({ nombre: "Juan", apellido: "Pérez", correo: "juan@hospital.com", password: "123", rol: "Enfermero", esSupervisor: false,  nivel: "Senior" });
        const maria = await Usuario.create({ nombre: "María", apellido: "Gómez", correo: "maria@hospital.com", password: "123", rol: "Enfermero", esSupervisor: true, nivel: "Junior" });
        const carlos = await Usuario.create({ nombre: "Carlos", apellido: "Ruiz", correo: "carlos@hospital.com", password: "123", rol: "Auxiliar", esSupervisor: false, nivel: "Senior" });
        const ana = await Usuario.create({ nombre: "Ana", apellido: "López", correo: "ana@hospital.com", password: "123", rol: "Auxiliar", esSupervisor: true, nivel: "Senior" });
        const laura = await Usuario.create({ nombre: "Laura", apellido: "Sustituta", correo: "laura@hospital.com", password: "123", rol: "Enfermero", esSupervisor: false, nivel: "Senior" });

       
        console.log("Creando plantillas...");
        await Plantilla.create([
            { usuario: juan._id, año: 2026, meses: [{ mes: 3, dias: [{dia: 4, turno: "M"}, {dia: 5, turno: "M"}, {dia: 6, turno: "M"}] }] },
            { usuario: maria._id, año: 2026, meses: [{ mes: 3, dias: [{dia: 4, turno: "N"}, {dia: 5, turno: "N"}, {dia: 6, turno: "N"}] }] },
            { usuario: carlos._id, año: 2026, meses: [{ mes: 3, dias: [{dia: 4, turno: "M"}, {dia: 5, turno: "M"}, {dia: 6, turno: "M"}] }] },
            { usuario: ana._id, año: 2026, meses: [{ mes: 3, dias: [{dia: 4, turno: "N"}, {dia: 5, turno: "N"}, {dia: 6, turno: "N"}] }] }
        ]);

       
        console.log("Creando solicitud...");
        await Solicitud.create({
            usuarioId: juan._id,
            tipoDia: "Día Libre",
            fechaInicio: new Date("2026-03-05T00:00:00Z"), 
            fechaFin: new Date("2026-03-05T00:00:00Z"),
            fechaSolicitud: new Date("2026-03-01T00:00:00Z"),
            estado: "Pendiente",
            comentario: "Asunto familiar"
        });

        console.log("¡Proceso completado!");
        return NextResponse.json({ 
            mensaje: "¡ÉXITO! Base de datos reseteada y poblada con datos de prueba.",
            instrucciones: "Ve a /planificador y /solicitudes para probar."
        });

    } catch (error) {
        console.error("Error al resetear la BD:", error);
        return NextResponse.json({ error: "Fallo al resetear la BD" }, { status: 500 });
    }
}