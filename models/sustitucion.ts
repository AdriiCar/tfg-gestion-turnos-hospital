import mongoose, { Schema } from "mongoose";

const SustitucionSchema = new Schema({
    fecha: { type: Date, required: true },
    turno: { type: String, required: true, enum: ["M", "N", "L", "Extra"] },
    sustituido: { type: String, required: true },
    sustitutoNombre: { type: String, required: true },
    sustitutoCorreo: { type: String, required: true },
    incidenciaRelacionada: { type: Schema.Types.ObjectId, ref: 'Incidencia' },
    solicitudRelacionada: { type: Schema.Types.ObjectId, ref: 'Solicitud' }
}, { timestamps: true });

const Sustitucion = mongoose.models.Sustitucion || mongoose.model("Sustitucion", SustitucionSchema, "sustituciones");

export default Sustitucion;