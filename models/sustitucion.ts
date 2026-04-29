import mongoose, { Schema } from "mongoose";

const SustitucionSchema = new Schema({
    fechaInicio: { type: Date, required: true },
    fechaFin: { type: Date, required: true },
    turno: { type: String, required: true, enum: ["M", "N", "L", "BAJA"] },
    sustituido: { type: String, required: true },
    sustituidoNombre: {type: String, default: ""},
    sustituidoCorreo: {type: String, default: ""},
    sustitutoNombre: { type: String, required: true },
    sustitutoCorreo: { type: String, required: true },
    nivel: { type: String, default: "Junior", enum: ["Junior", "Senior"] }, 
    incidenciaRelacionada: { type: Schema.Types.ObjectId, ref: 'Incidencia' },
    solicitudRelacionada: { type: Schema.Types.ObjectId, ref: 'Solicitud' },
    plantaId: { type: Schema.Types.ObjectId, ref: 'Planta', required: true }
    
}, { timestamps: true });

SustitucionSchema.index({ plantaId: 1, fechaInicio: 1, fechaFin: 1 });
SustitucionSchema.index({ solicitudRelacionada: 1 });

const Sustitucion = mongoose.models.Sustitucion || mongoose.model("Sustitucion", SustitucionSchema, "sustituciones");

export default Sustitucion;