import mongoose, {Schema} from "mongoose";

const RotacionSchema = new Schema({
    nombre:{type: String, required: true},
    patronBaseId: {type: String, required: true},
    diaDesfase: {type: Number, required: true, default: 0},
    empleados: [{type: Schema.Types.ObjectId, ref: 'Usuario'}],
    plantaId: { type: Schema.Types.ObjectId, ref: 'Planta', required: true }
}, {timestamps: true});


RotacionSchema.index({ plantaId: 1 });
RotacionSchema.index({ empleados: 1 });

const Rotacion = mongoose.models.Rotacion || mongoose.model("Rotacion", RotacionSchema, "rotaciones");

export default Rotacion;