import { jwtVerify } from "jose";

export async function decrypt(token: string){
    try{
        //comprobamos que el token haya sido creado por el servidor a partir del JWT_SECRET y lo traducimos a binario
        const secret = new TextEncoder().encode(process.env.JWT_SECRET);

        //comrpobamos que el token no este manipulado por terceros y que no haya expirado para obtener el payload
        const {payload} = await jwtVerify(token, secret);
        return payload;
    }catch(error){
        return null;
    }
}