import { NextResponse } from "next/server";
import { conectarDB } from "@/lib/mongodb";
import Plantilla from "@/models/plantilla";
import Usuario from "@/models/usuario";
import { comprobarReglas } from "@/lib/motorReglas";
import { startOfWeek, addDays } from "date-fns";

export async function GET(request: Request){
    try{
        await conectarDB();

        //para la vista de calendario:
        const { searchParams } = new URL(request.url);    
        const usuarioId = searchParams.get("usuarioId");
        const año = searchParams.get("año");
        
        if(usuarioId && año){
            const plantillaUsuario = await Plantilla.findOne({usuario: usuarioId, año: Number(año)});
            if(plantillaUsuario)
                return NextResponse.json(plantillaUsuario || {meses: []});
        }



        //para la vista del planificador:
        const hoy = new Date();
        const lunes = startOfWeek(hoy, {weekStartsOn: 1}); //primer dia de la semana
        

        const diasSemana:any = [] //conseguiremos el dia y mes de cada dia de la semana ya que pueden estar en meses distintos

        for(let i = 0; i < 7; i++){
            const d = addDays(lunes, i); //dia actual
            diasSemana.push({
                mes: d.getMonth() + 1, //+1 porque los meses son de 0 a 11 y yo quiero de 1 a 12
                dia: d.getDate()
            });
        }

        const plantillas = await Plantilla.find().populate({
                    path: "usuario",
                    model: Usuario,
                    select: "nombre apellido"
        });

        
        //ahora necesitamos obtener los turnos de la semana de cada empleado

        const totalTurnos = plantillas.filter((p: any) => p.usuario != null).map((p) => { //recorremos la plantilla de un usuario
            
            const turnosSemana = diasSemana.map((fecha: any) => { //recorremos todos los dias de la semana
                const mes = p.meses.find((m: any) => m.mes === fecha.mes); //obtenemos si el usuario tiene ese mes guardado
                if(mes){  //si tiene el mes recorremos los dias hasta encontrar el dia que queremos
                    const dia = mes.dias.find((d: any) => d.dia === fecha.dia) 
                    if(dia) return dia.turno; //si tenemos el dia devolvemos el turno para ese dia
                }
                return "L";
            });

            return{
                id: p.usuario._id,
                nombre: `${p.usuario.nombre} ${p.usuario.apellido}`,
                turnos: turnosSemana
            }
        })
        return NextResponse.json(totalTurnos);
    }catch(error){
        return NextResponse.json({error: "Fallo al cargar la plantilla"}, {status: 500});
    }
}


export async function PUT(request: Request) {
    try{
        await conectarDB();

        const {usuario_id, indiceDia, nuevoTurno} = await request.json();
        const hoy = new Date();
        const lunes = startOfWeek(hoy, {weekStartsOn: 1});
        

        const fechaAModificar = addDays(lunes, indiceDia); 

        const añoActual = fechaAModificar.getFullYear();
        const mes = fechaAModificar.getMonth() + 1;
        const dia = fechaAModificar.getDate(); 

        let plantilla = await Plantilla.findOne({usuario: usuario_id, año: añoActual});
        if(!plantilla){
            return NextResponse.json({error: "Plantilla no encontrada"});
        }

        const mesPlantilla = plantilla.meses.find((m: any) => m.mes === mes)
        if(mesPlantilla){
            const diaPlantilla = mesPlantilla.dias.find((d:any) => d.dia === dia);
            if(diaPlantilla){
                diaPlantilla.turno = nuevoTurno;
            }else{
                mesPlantilla.dias.push({dia:dia, turno: nuevoTurno});
            }
        }
        else{
            plantilla.meses.push({
                mes: mes,
                dias: [{dia: dia, turno: nuevoTurno}]
            })
        }

        await plantilla.save();


        //una vez cambiamos los turnos de la plantilla creamos las incidencias si son necesarias y no se cubre el personal
        await comprobarReglas(fechaAModificar, fechaAModificar, null);
       
        

        return NextResponse.json({mensaje: "Turno actualizado"});

    }catch(error){
        return NextResponse.json({error: "Fallo actualizando la plantilla"}, {status: 500});
    }
}