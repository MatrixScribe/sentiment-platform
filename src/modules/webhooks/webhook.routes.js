import { Router } from 'express';
import { handleReloadlyWebhook } from './reloadly.webhook.js';
import { handleDingWebhook } from './ding.webhook.js';

const router = Router();

router.post('/reloadly', handleReloadlyWebhook);
router.post('/ding', handleDingWebhook);

export default router;
