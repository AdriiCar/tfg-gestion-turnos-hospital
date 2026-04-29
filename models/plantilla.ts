import mongoose, {Schema} from "mongoose";

const PlantillaSchema = new Schema({
  usuario: { type: Schema.Types.ObjectId, ref: "Usuario", required: true },
    year: { type: Number, required: true },
    meses: [{
        mes: { type: Number, required: true },
        dias: [{
            dia: { type: Number, required: true },
            turno: { type: String, enum: ["M", "N", "L", "BAJA"], required: true }
        }]
    }]
}, { timestamps: true });


PlantillaSchema.index({ usuario: 1, year: 1 }, { unique: true }); 


const Plantilla = mongoose.models.Plantilla || mongoose.model("Plantilla", PlantillaSchema, "plantillas");

export default Plantilla;