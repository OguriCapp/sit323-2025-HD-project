/**
 * Screenshot Capture Script
 * 
 * This script launches the application and captures screenshots of key pages
 * using Puppeteer. It's used for documentation and demonstration purposes.
 * 
 * Usage: node scripts/capture-screenshots.js
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Create screenshots directory if it doesn't exist
const screenshotsDir = path.join(__dirname, '..', 'docs', 'screenshots');

const setupDirectories = () => {
  const dirs = [
    screenshotsDir,
    path.join(screenshotsDir, 'authentication'),
    path.join(screenshotsDir, 'dashboard'),
    path.join(screenshotsDir, 'tasks'),
    path.join(screenshotsDir, 'teams'),
    path.join(screenshotsDir, 'profile')
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

// Start the application server
const startServer = () => {
  console.log('Starting application server...');
  const server = spawn('node', ['app.js'], {
    stdio: 'inherit',
    env: { ...process.env, PORT: '3000' }
  });
  
  return new Promise((resolve) => {
    // Wait for server to start
    setTimeout(() => {
      console.log('Server started');
      resolve(server);
    }, 3000);
  });
};

// Capture screenshots
const captureScreenshots = async (baseUrl = 'http://localhost:3000') => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 800 }
  });
  
  const page = await browser.newPage();
  
  try {
    // Login credentials (replace with test account)
    const testUser = {
      email: 'test@example.com',
      password: 'testpassword'
    };
    
    // 1. Authentication pages
    console.log('Capturing authentication pages...');
    
    // Home page
    await page.goto(`${baseUrl}/`);
    await page.waitForSelector('.card-body');
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'authentication', 'home.png'),
      fullPage: true
    });
    
    // Register page
    await page.goto(`${baseUrl}/auth/register`);
    await page.waitForSelector('form');
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'authentication', 'register.png'),
      fullPage: true
    });
    
    // Login page
    await page.goto(`${baseUrl}/auth/login`);
    await page.waitForSelector('form');
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'authentication', 'login.png'),
      fullPage: true
    });
    
    // Login to capture authenticated pages
    await page.type('#email', testUser.email);
    await page.type('#password', testUser.password);
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle0' })
    ]);
    
    // 2. Dashboard
    console.log('Capturing dashboard...');
    await page.waitForSelector('.card');
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'dashboard', 'dashboard-overview.png'),
      fullPage: true
    });
    
    // 3. Tasks
    console.log('Capturing task pages...');
    
    // Task list
    await page.goto(`${baseUrl}/tasks`);
    await page.waitForSelector('.card');
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'tasks', 'task-list.png'),
      fullPage: true
    });
    
    // Task creation
    await page.goto(`${baseUrl}/tasks/create`);
    await page.waitForSelector('form');
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'tasks', 'task-creation.png'),
      fullPage: true
    });
    
    // 4. Teams
    console.log('Capturing team pages...');
    
    // Team list
    await page.goto(`${baseUrl}/teams`);
    await page.waitForSelector('.card');
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'teams', 'team-list.png'),
      fullPage: true
    });
    
    // Team creation
    await page.goto(`${baseUrl}/teams/create`);
    await page.waitForSelector('form');
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'teams', 'team-creation.png'),
      fullPage: true
    });
    
    // 5. Profile
    console.log('Capturing profile page...');
    await page.goto(`${baseUrl}/users/profile`);
    await page.waitForSelector('.card');
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'profile', 'user-profile.png'),
      fullPage: true
    });
    
    console.log('All screenshots captured successfully!');
    
  } catch (error) {
    console.error('Error capturing screenshots:', error);
  } finally {
    await browser.close();
  }
};

// Main function
const main = async () => {
  setupDirectories();
  
  try {
    // If running in development with already started server
    const useExistingServer = process.argv.includes('--use-existing-server');
    
    let server;
    if (!useExistingServer) {
      server = await startServer();
    }
    
    await captureScreenshots();
    
    if (server) {
      server.kill();
    }
    
    console.log('Screenshot capture completed.');
    
  } catch (error) {
    console.error('Error in screenshot capture process:', error);
  }
};

main(); 