import { Request, Response, NextFunction } from "express";
import { Document } from "mongoose";
import jwt, { JwtPayload } from "jsonwebtoken";

interface IUser extends Omit<Document, '_id'> {
  _id: string; 
  name: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user?: IUser | null;
}

export const isAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        message: "Please Login - No Auth header",
      });
      return;
    }

    const token = authHeader.split(" ")[1];

    const decodedValue = jwt.verify(
      token as string,
      process.env.JWT_SECRET as string
    ) as JwtPayload;

    if (!decodedValue || !decodedValue.user) {
      res.status(401).json({
        message: "Invalid token",
      });
      return;
    }

    req.user = decodedValue.user;

    next();
  } catch (error) {
    res.status(401).json({
      message: "Please login - JWT error",
    });
  }
};

export default isAuth;