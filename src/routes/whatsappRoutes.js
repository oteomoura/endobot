import express from 'express';
import { handleIncomingWhatsAppMessage } from '../controllers/whatsappController.js';

const router = express.Router();

router.post('/whatsapp', handleIncomingWhatsAppMessage);

export default router;
