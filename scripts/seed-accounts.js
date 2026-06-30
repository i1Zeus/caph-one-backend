#!/usr/bin/env node

/**
 * سكريبت لإدخال الحسابات المحاسبية إلى قاعدة البيانات
 * 
 * الاستخدام:
 * npm run seed:accounts
 * أو
 * node scripts/seed-accounts.js
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 بدء عملية إدخال الحسابات المحاسبية...\n');

try {
  // تجميع TypeScript
  console.log('📦 تجميع ملف TypeScript...');
  execSync('npx tsc prisma/seed-accounts.ts --outDir dist/prisma --esModuleInterop --skipLibCheck', {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..')
  });

  // تشغيل الملف المجمع
  console.log('\n🌱 تشغيل ملف البيانات الأولية...\n');
  execSync('node dist/prisma/seed-accounts.js', {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..')
  });

  console.log('\n✅ تمت عملية إدخال الحسابات بنجاح!');
} catch (error) {
  console.error('\n❌ فشلت عملية إدخال الحسابات:', error.message);
  process.exit(1);
}
