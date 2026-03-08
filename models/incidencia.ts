import mongoose, { Schema } from "mongoose";

const IncidenciaSchema = new Schema({
    fecha: { type: Date, required: true },
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
        enum: ["Enfermero", "Auxiliar", "General"], // "General" para cuando sea falta de descanso u otros
        default: "General"
    },
    mensaje: { type: String, required: true },
    resuelta: { type: Boolean, default: false },
    solicitudRelacionada: { type: Schema.Types.ObjectId, ref: 'Solicitud' }
}, { timestamps: true });

const Incidencia = mongoose.models.Incidencia || mongoose.model("Incidencia", IncidenciaSchema, "incidencias");

export default Incidencia;