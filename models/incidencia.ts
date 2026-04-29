import mongoose, { Schema } from "mongoose";

const IncidenciaSchema = new Schema({
    fechaInicio: { type: Date, required: true },
    fechaFin: { type: Date, required: true },
    turno: { type: String, required: true, enum: ["M", "N", "L", "BAJA"] },
    tipoIncidencia: { 
        type: String, 
        required: true,
        enum: [
            "Falta de descanso legal", 
            "Falta de cobertura en planta", 
            "Falta de personal con experiencia",
            "Turno descubierto"
        ]
    },
    rolAfectado: { 
        type: String, 
        enum: ["Enfermero", "Auxiliar", "General"],
        default: "General"
    },
    mensaje: { type: String, required: true },
    resuelta: { type: Boolean, default: false },
    solicitudRelacionada: { type: Schema.Types.ObjectId, ref: 'Solicitud' },
    plantaId: { type: Schema.Types.ObjectId, ref: 'Planta', required: true }
}, { timestamps: true });


IncidenciaSchema.index({ plantaId: 1, fechaInicio: 1, fechaFin: 1 }); //usado en el motor de reglas -> en incidencias afectadas o en el borrado
IncidenciaSchema.index({ solicitudRelacionada: 1 }); //en eliminarEmpleadoAction y en agregarUsuarioGrupoAction

const Incidencia = mongoose.models.Incidencia || mongoose.model("Incidencia", IncidenciaSchema, "incidencias");

export default Incidencia;