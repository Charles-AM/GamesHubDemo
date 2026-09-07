import { defineConfig,devices } from '@playwright/test';

const web = { command:'npm run dev -w apps/web -- --host localhost --force', url:'http://localhost:5173', reuseExistingServer:!process.env.CI };
const api = { command:'npm run dev -w apps/api', url:'http://localhost:3001/health', reuseExistingServer:!process.env.CI };

export default defineConfig({
  testDir:'./e2e',
  fullyParallel:false,
  retries:process.env.CI?1:0,
  reporter:[['list'],['html',{open:'never'}]],
  use:{baseURL:'http://localhost:5173',trace:'retain-on-failure'},
  projects:[
    {name:'chromium',use:{...devices['Desktop Chrome']}},
    {name:'mobile',use:{...devices['iPhone 13'],defaultBrowserType:'chromium'}},
  ],
  webServer:process.env.E2E_GUEST_ONLY ? [web] : [web,api],
  timeout:30000,
});
