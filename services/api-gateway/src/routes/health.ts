import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({ status: 'healthy', service: 'api-gateway' });
});

export default router;