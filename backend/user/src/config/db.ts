import mongoose from "mongoose";
const connectDb = async()=>{
  const url = process.env.MONGO_URI;
  if(!url){
    throw new Error("MONGO_URI is not defined in enviroment variables");
  }
  try{
    await mongoose.connect(url,{
      dbName:"Chatappmicroserviceapp"
    })
console.log("Connected to mongodb");
  }catch(error){
    console.log("Failed to connect to mongodb", error)
    process.exit(1);
  }
}

export default connectDb;