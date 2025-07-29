import express from 'express';
import { getMessage, getUsersForSidebar, markMessageAsSeen, sendMessage } from '../controllers/messageController.js';
import { protectRoute } from '../middleware/auth.js';

const messageRouter = express.Router();
messageRouter.get('/users', protectRoute, getUsersForSidebar);
messageRouter.get('/:id',protectRoute,getMessage);
messageRouter.put('/mark/:id',protectRoute,markMessageAsSeen);
messageRouter.post('/send/:id',protectRoute,sendMessage)

export default messageRouter;