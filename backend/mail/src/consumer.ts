import amqp from "amqplib";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

export const startSendOtpConsumer = async (): Promise<void> => {
  try {
    /* ---------------- RABBITMQ CONNECTION ---------------- */
    const connection = await amqp.connect({
      protocol: "amqp",
      hostname: process.env.Rabbitmq_Host!,
      port: 5672,
      username: process.env.Rabbitmq_Username!,
      password: process.env.Rabbitmq_Password!,
    });

    const channel = await connection.createChannel();

    const queueName = "send-otp";

    await channel.assertQueue(queueName, {
      durable: true,
    });

    console.log(
      "Mail service consumer started, listening for OTP emails..."
    );

    /* ---------------- NODEMAILER TRANSPORTER ---------------- */
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    /* ---------------- CONSUMER ---------------- */
    channel.consume(queueName, async (msg) => {
      if (!msg) return;

      try {
        const { to, subject, body } = JSON.parse(
          msg.content.toString()
        );

        await transporter.sendMail({
          from: process.env.SMTP_USER,
          to,
          subject,
          text: body,
        });

        console.log(`OTP email sent to ${to}`);

        /* ACKNOWLEDGE MESSAGE */
        channel.ack(msg);
      } catch (error) {
        console.log("Failed to send OTP email:", error);

        /* REJECT MESSAGE */
        channel.nack(msg, false, false);
      }
    });
  } catch (error) {
    console.log("Failed to start RabbitMQ consumer:", error);
  }
};