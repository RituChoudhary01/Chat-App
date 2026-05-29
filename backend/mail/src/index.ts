import express from "express"
import dotenv from "dotenv"
import cors from "cors"
import { startSendOtpConsumer } from "./consumer.js";
dotenv.config();
const app = express()
app.use(cors());
startSendOtpConsumer()
app.listen(process.env.PORT,()=>{
  console.log(`Server is running on port ${process.env.PORT}`);
})