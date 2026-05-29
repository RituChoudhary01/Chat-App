import {v2 as cloudinary} from "cloudinary"
import dotenv from "dotenv"
dotenv.config()
cloudinary.config({
  cloud_name:process.env.Cloud_Name!,
  api_key:process.env.Cloud_Api_Key!,
  api_secret:process.env.Cloud_Api_Secret!,
});
export default cloudinary;