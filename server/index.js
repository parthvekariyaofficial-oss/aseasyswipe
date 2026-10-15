import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import qrRoutes from './routes/qr.routes.js';
import b2bRoutes from './routes/b2b.routes.js';
import billsRoutes from './routes/bills.routes.js';
import commissionRoutes from './routes/commission.routes.js';
import financialRoutes from './routes/financial.routes.js';
import submissionsRoutes from './routes/submissions.routes.js';
import bankRoutes from './routes/bank.routes.js';
import billRequestRoutes from './routes/billRequest.routes.js';
import payoutRoutes from './routes/payout.routes.js';
import statementRoutes from './routes/statement.routes.js';
import kycRoutes from './routes/kyc.routes.js';
import './db/supabase.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request Logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'AsEasySwipe Fintech Multi-Role Auth & User Management Engine',
    timestamp: new Date().toISOString()
  });
});

// Mount Routes (Auth, User, QR, B2B, Bills, Commission, Financial, Submissions, Bank, BillRequest, Payout, Statement)
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/b2b', b2bRoutes);
app.use('/api/bills', billsRoutes);
app.use('/api/commission', commissionRoutes);
app.use('/api/financial', financialRoutes);
app.use('/api/submissions', submissionsRoutes);
app.use('/api/bank', bankRoutes);
app.use('/api/bill-request', billRequestRoutes);
app.use('/api/payout', payoutRoutes);
app.use('/api/statement', statementRoutes);
app.use('/api/kyc', kycRoutes);

// Serve frontend static build in production (SPA fallback)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../dist');

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));

  // SPA fallback: All non-API GET requests serve index.html
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api/') && req.path !== '/api') {
      return res.sendFile(path.join(distPath, 'index.html'));
    }
    if (req.path.startsWith('/api/') || req.path === '/api') {
      return res.status(404).json({ success: false, message: `Cannot ${req.method} ${req.path}` });
    }
    next();
  });
}

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ success: false, message: 'Internal Server Error', error: err.message });
});

// Start Express Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n=============================================================`);
  console.log(`🚀 AsEasySwipe Auth & User Management Backend running on http://0.0.0.0:${PORT}`);
  console.log(`=============================================================\n`);
});
