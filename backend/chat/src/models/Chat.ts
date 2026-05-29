import mongoose, { Document, Schema, Types } from "mongoose"; // ✅ Fix 1: import Types

export interface IChat extends Document {
  users: string[]; 
  latestMessage: {
    text: string;
    sender: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

const chatSchema = new Schema<IChat>(
  {
    users: [{ type:String,required: true }],
    latestMessage: {
      text: String,
      sender: String,
    },
  },
  { timestamps: true }
);

export const Chat = mongoose.model<IChat>("Chat", chatSchema);