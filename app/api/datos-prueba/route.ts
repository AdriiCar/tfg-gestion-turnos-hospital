import { NextResponse } from "next/server";
import { conectarDB } from "@/lib/mongodb";
import Planta from "@/models/planta";
import Configuracion from "@/models/configuracion";
import Usuario from "@/models/usuario";
import Plantilla from "@/models/plantilla";
import Incidencia from "@/models/incidencia";
import Sustitucion from "@/models/sustitucion";
import Solicitud from "@/models/solicitud";
import bcrypt from "bcryptjs"; 

export async function GET() {
    try {
        await conectarDB();

        // Correos usuarios
        const correosTest = [
            "lmartinez@gmail.com", "cruiz@gmail.com", "snavarro@gmail.com", 
            "dlopez@gmail.com", "agomez@gmail.com", "jtorres@gmail.com",
            "csanchez@gmail.com", "rdiaz@gmail.com", "eromero@gmail.com", "mgil@gmail.com"
        ];

        //Eliminamos los usuarios previos
        const usuariosViejos = await Usuario.find({ correo: { $in: correosTest } }).select("_id");
        if (usuariosViejos.length > 0) {
            const idsUsuariosViejos = usuariosViejos.map(u => u._id);
            await Plantilla.deleteMany({ usuario: { $in: idsUsuariosViejos } });
            await Solicitud.deleteMany({ usuarioId: { $in: idsUsuariosViejos } });
            await Usuario.deleteMany({ correo: { $in: correosTest } });
        }

        // Eliminamos las plantas anteriores
        const nombrePlantaTest = "Planta de Traumatología (Ala Norte)";
        const plantasTest = await Planta.find({ nombre: nombrePlantaTest }).select("_id");
        if (plantasTest.length > 0) {
            const idsPlantasTest = plantasTest.map(p => p._id);
            await Incidencia.deleteMany({ plantaId: { $in: idsPlantasTest } });
            await Sustitucion.deleteMany({ plantaId: { $in: idsPlantasTest } });
            await Configuracion.deleteMany({ plantaId: { $in: idsPlantasTest } });
            await Planta.deleteMany({ _id: { $in: idsPlantasTest } });
        }
        
        //PLANTA HOSPITAL
        const nuevaPlanta = await Planta.create({
            nombre: nombrePlantaTest,
            hospital: "Hospital TFG",
            activa: true
        });

        await Configuracion.create({
            plantaId: nuevaPlanta._id,
            coberturaPlanta: {
                turnoM: { enfermeros: 2, auxiliares: 1 },
                noche: { enfermeros: 2, auxiliares: 1 }
            }
        });

        //CREAR USUARIOS
        const passwordCifrada = await bcrypt.hash("123", 10);

        const datosUsuarios = [
            // Enfermeros (Patrón 6 días: 3 Seniors y 3 Juniors intercalados)
            { nombre: "Laura", apellido: "Martínez", esSupervisor: true, rol: "Enfermero", nivel: "Senior", correo: "lmartinez@gmail.com", password: passwordCifrada, plantaId: nuevaPlanta._id },
            { nombre: "Carlos", apellido: "Ruiz", rol: "Enfermero", nivel: "Junior", correo: "cruiz@gmail.com", password: passwordCifrada, plantaId: nuevaPlanta._id },
            { nombre: "Sofía", apellido: "Navarro", rol: "Enfermero", nivel: "Senior", correo: "snavarro@gmail.com", password: passwordCifrada, plantaId: nuevaPlanta._id },
            { nombre: "Diego", apellido: "López", rol: "Enfermero", nivel: "Junior", correo: "dlopez@gmail.com", password: passwordCifrada, plantaId: nuevaPlanta._id },
            { nombre: "Ana", apellido: "Gómez", rol: "Enfermero", nivel: "Senior", correo: "agomez@gmail.com", password: passwordCifrada, plantaId: nuevaPlanta._id },
            { nombre: "Javier", apellido: "Torres", rol: "Enfermero", nivel: "Junior", correo: "jtorres@gmail.com", password: passwordCifrada, plantaId: nuevaPlanta._id },
            
            // Auxiliares (Patrón 4 días: Todos Senior)
            { nombre: "Carmen", apellido: "Sánchez", rol: "Auxiliar", nivel: "Senior", correo: "csanchez@gmail.com", password: passwordCifrada, plantaId: nuevaPlanta._id },
            { nombre: "Raúl", apellido: "Díaz", rol: "Auxiliar", nivel: "Senior", correo: "rdiaz@gmail.com", password: passwordCifrada, plantaId: nuevaPlanta._id },
            { nombre: "Elena", apellido: "Romero", rol: "Auxiliar", nivel: "Senior", correo: "eromero@gmail.com", password: passwordCifrada, plantaId: nuevaPlanta._id },
            { nombre: "Marcos", apellido: "Gil", rol: "Auxiliar", nivel: "Senior", correo: "mgil@gmail.com", password: passwordCifrada, plantaId: nuevaPlanta._id }
        ];

        const usuariosCreados = await Usuario.insertMany(datosUsuarios);

        
        const mesTest = new Date().getMonth() + 1; // Mes actual
        const anioTest = new Date().getFullYear();
        const diasDelMes = new Date(anioTest, mesTest, 0).getDate();

        // Patrones Rotatorios
        const patronesEnf = [
            ["M", "M", "N", "N", "L", "L"], // Laura
            ["L", "M", "M", "N", "N", "L"], // Carlos
            ["L", "L", "M", "M", "N", "N"], // Sofía
            ["N", "L", "L", "M", "M", "N"], // Diego
            ["N", "N", "L", "L", "M", "M"], // Ana
            ["M", "N", "N", "L", "L", "M"]  // Javier
        ];

        const patronesAux = [
            ["M", "N", "L", "L"], // Carmen
            ["L", "M", "N", "L"], // Raúl
            ["L", "L", "M", "N"], // Elena
            ["N", "L", "L", "M"]  // Marcos
        ];

        const plantillasAGuardar = [];

        for (let i = 0; i < usuariosCreados.length; i++) {
            const usuario = usuariosCreados[i];
            const esEnfermero = usuario.rol === "Enfermero";
            
            const patron = esEnfermero ? patronesEnf[i % 6] : patronesAux[(i - 6) % 4];
            const diasMesArray = [];

            for (let dia = 1; dia <= diasDelMes; dia++) {
                const turnoAsignado = patron[(dia - 1) % patron.length];
                diasMesArray.push({ dia: dia, turno: turnoAsignado });
            }
            plantillasAGuardar.push({
                usuario: usuario._id,
                year: anioTest,
                meses: [{
                    mes: mesTest,
                    dias: diasMesArray
                }]
            });
        }

        await Plantilla.insertMany(plantillasAGuardar);

        return NextResponse.json({ 
            exito: true, 
            mensaje: "¡Planta de Traumatología reiniciada y creada con éxito!",
            nota: "Puedes entrar con lmartinez@gmail.com (contraseña: 123) para ver el dashboard del supervisor."
        });

    } catch (error: any) {
        return NextResponse.json({ 
            exito: false, 
            error: "Fallo al crear o reiniciar la planta", 
            detalles: error.message || error.toString() 
        }, { status: 500 });
    }
}