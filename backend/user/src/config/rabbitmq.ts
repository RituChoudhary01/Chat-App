import amqp from "amqplib"

let channel: amqp.Channel;
export const connectRabbitMQ = async()=>{
  try{
    const connection = await amqp.connect({
      protocol:"amqp",
      hostname:process.env.Rabbitmq_Host!,
      port:5672,
      username:process.env.Rabbitmq_Username!,
      password:process.env.Rabbitmq_Password!,
    });
    channel = await connection.createChannel();
    console.log("Connected to Rabbitmq");
  }catch(error){
    console.log("Failed to connect to Rabbitmq",error);
  }
}
export const publishToQueue = async(queueName:string,message:any)=>{
  if(!channel){
    console.error("Rabbitmq channel is not intialized");
    return;
  }
  await channel.assertQueue(queueName,{durable:true});
  channel.sendToQueue(queueName,Buffer.from(JSON.stringify(message)),{
    persistent:true,
  });
};