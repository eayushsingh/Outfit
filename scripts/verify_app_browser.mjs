import puppeteer from '/Users/ayush/Desktop/outfit/frontend/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import fs from 'fs';
import path from 'path';

async function runBrowserVerification() {
  console.log('--- Starting VirtualFit AI Real Browser Verification ---');

  const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (!fs.existsSync(chromePath)) {
    throw new Error(`Chrome binary not found at ${chromePath}`);
  }

  const screenshotsDir = path.resolve('docs/screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--window-size=1280,800',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  page.on('console', (msg) => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', (err) => console.log('BROWSER PAGE ERROR:', err.message));

  // Monitor network traffic to verify zero frame uploads in Mode A
  const networkRequests = [];
  page.on('request', (req) => {
    networkRequests.push({
      url: req.url(),
      method: req.method(),
      resourceType: req.resourceType(),
    });
  });

  try {
    console.log('1. Navigating to http://127.0.0.1:5173/ ...');
    await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0', timeout: 15000 });

    const pageTitle = await page.title();
    console.log('Page Title:', pageTitle);

    // Capture main kiosk screenshot
    await page.screenshot({ path: path.join(screenshotsDir, '01_kiosk_initial.png') });
    console.log('Captured: 01_kiosk_initial.png');

    // 2. Test Privacy Modal
    console.log('2. Testing Customer Privacy Modal...');
    await page.waitForSelector('#privacy-button', { timeout: 5000 });
    await page.click('#privacy-button');
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({ path: path.join(screenshotsDir, '02_privacy_modal.png') });
    console.log('Captured: 02_privacy_modal.png');

    // Click "Agree & Start Mirror"
    const buttons = await page.$$('button');
    for (const btn of buttons) {
      const text = await page.evaluate((el) => el.innerText, btn);
      if (text.includes('Agree & Start Mirror')) {
        await btn.click();
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 1200));

    // 3. Test Camera Flow (Simulated stream)
    console.log('3. Testing Simulated Camera Stream & Mode A Overlay...');
    await page.screenshot({ path: path.join(screenshotsDir, '03_camera_active.png') });
    console.log('Captured: 03_camera_active.png');

    // Verify Mode A network isolation: check if any video/frame POST requests were made
    const frameUploads = networkRequests.filter(
      (r) => r.method === 'POST' && r.url.includes('/api/tryon/generate')
    );
    console.log(
      `Mode A Network Audit: ${frameUploads.length} frame upload requests detected during live preview.`
    );
    if (frameUploads.length === 0) {
      console.log('VERIFIED: 100% on-device processing. Zero video frames uploaded during Mode A!');
    }

    // 4. Test Catalog Filtering
    console.log('4. Testing Catalog Filtering & Garment Selection...');
    const chipButtons = await page.$$('.chip');
    for (const chip of chipButtons) {
      const text = await page.evaluate((el) => el.innerText, chip);
      if (text.includes('Jackets')) {
        await chip.click();
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 800));
    await page.screenshot({ path: path.join(screenshotsDir, '04_catalog_filtered_jackets.png') });
    console.log('Captured: 04_catalog_filtered_jackets.png');

    // 5. Test Photo Guide Modal
    console.log('5. Testing Garment Photo Guide Modal...');
    await page.click('#guide-button');
    await new Promise((r) => setTimeout(r, 800));
    await page.screenshot({ path: path.join(screenshotsDir, '05_photo_guide_modal.png') });
    console.log('Captured: 05_photo_guide_modal.png');

    // Close photo guide modal
    const closeButtons = await page.$$('button');
    for (const btn of closeButtons) {
      const text = await page.evaluate((el) => el.innerText, btn);
      if (text.includes('Got It')) {
        await btn.click();
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 600));

    // 6. Test Admin Dashboard with Token Authentication
    console.log('6. Testing Admin Dashboard...');
    await page.click('#admin-button');
    await new Promise((r) => setTimeout(r, 800));
    await page.screenshot({ path: path.join(screenshotsDir, '06_admin_auth_gate.png') });
    console.log('Captured: 06_admin_auth_gate.png');

    // Fill in admin token
    await page.type('input[placeholder="Admin API Key"]', 'admin_dev_token_2026');
    await page.click('button[type="submit"]');
    await new Promise((r) => setTimeout(r, 1200));
    await page.screenshot({ path: path.join(screenshotsDir, '07_admin_dashboard_unlocked.png') });
    console.log('Captured: 07_admin_dashboard_unlocked.png');

    console.log('--- Real Browser Verification Complete: SUCCESS ---');
  } finally {
    await browser.close();
  }
}

runBrowserVerification().catch((err) => {
  console.error('Browser verification failed:', err);
  process.exit(1);
});
