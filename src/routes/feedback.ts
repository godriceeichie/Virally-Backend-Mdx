import { Router } from 'express';
const router = Router();

router.get('/', (_req, res) => {
	res.json({ message: 'Feedback route is working' });
});

export default router;
