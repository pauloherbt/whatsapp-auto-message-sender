import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import userRepo from '../../persistence/SqliteUserRepository';
import { signToken } from '../middleware/authMiddleware';

const router = Router();

router.post('/register', async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;
    if (!email || !password) {
        res.status(400).json({ error: 'email and password are required' });
        return;
    }
    if (password.length < 8) {
        res.status(400).json({ error: 'password must be at least 8 characters' });
        return;
    }
    if (userRepo.findByEmail(email)) {
        res.status(409).json({ error: 'Email already registered' });
        return;
    }
    const hash = await bcrypt.hash(password, 12);
    const user = userRepo.create(email, hash);
    const token = signToken(Number(user.id));
    res.status(201).json({ token, email });
});

router.post('/login', async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;
    if (!email || !password) {
        res.status(400).json({ error: 'email and password are required' });
        return;
    }
    const user = userRepo.findByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
    }
    const token = signToken(user.id);
    res.json({ token, email: user.email });
});

export default router;
