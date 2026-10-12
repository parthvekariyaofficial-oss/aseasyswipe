import cron from 'node-cron';
import { db } from '../db/store.js';

export const initMidnightLimitCron = () => {
  // Cron schedule: 00:00:00 IST (every day at midnight)
  // '0 0 * * *' in Asia/Kolkata timezone
  cron.schedule('0 0 * * *', () => {
    console.log(`\n[CRON 00:00:00 IST] Midnight Limit Rotation Triggered! Resetting current_day_collection across all QR Masters...`);
    
    let count = 0;
    db.qr_master.forEach(qr => {
      qr.current_day_collection = 0.00;
      qr.updated_at = new Date().toISOString();
      count++;
    });

    console.log(`✅ Reset executed for ${count} Master Bank QR accounts. Daily limits rotated.\n`);
  }, {
    timezone: 'Asia/Kolkata'
  });

  console.log('⏰ Midnight Limit Rotation Cron Scheduler Initialized (Target: 00:00:00 IST).');
};
