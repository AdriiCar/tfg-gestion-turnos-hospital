import mongoose, {Schema} from "mongoose";

const RotacionSchema = new Schema({
    nombre:{type: String, required: true},
    patronBaseId: {type: String, required: true}, //no conecta con el id del patron ya que al ir dentro de configuracion, desacrtivamos el id de los patrones y lo generamos en el frontend, entonces _id como tal no esta activado
    diaDesfase: {type: Number, required: true, default: 0},
    empleados: [{type: Schema.Types.ObjectId, ref: 'Usuario'}],
    plantaId: { type: Schema.Types.ObjectId, ref: 'Planta', required: true }
}, {timestamps: true});


RotacionSchema.index({ plantaId: 1 });
RotacionSchema.index({ empleados: 1 });

const Rotacion = mongoose.models.Rotacion || mongoose.model("Rotacion", RotacionSchema, "rotaciones");

export default Rotacion;