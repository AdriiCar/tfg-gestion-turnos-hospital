import { jwtVerify } from "jose";

export async function decrypt(token: string){
    try{
        const secret = new TextEncoder().encode(process.env.JWT_SECRET);

        const {payload} = await jwtVerify(token, secret);
        return payload;
    }catch(error){
        return null;
    }
}