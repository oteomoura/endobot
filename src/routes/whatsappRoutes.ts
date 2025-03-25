import express, { Router } from 'express';
import { handleIncomingWhatsAppMessage } from '../controllers/whatsappController.js';

const router: Router = express.Router();

router.post('/whatsapp', handleIncomingWhatsAppMessage);

export default router; 