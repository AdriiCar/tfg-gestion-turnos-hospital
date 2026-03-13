import mongoose,{Schema} from "mongoose";

const PlantaSchema = new Schema({
    nombre: {type:String, required: true},
    piso: {type:Number}
});


const Planta = mongoose.models.Planta || mongoose.model("Planta", PlantaSchema, "plantas");

export default Planta;