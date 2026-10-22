/**
 * Entry point of the web API: `npm run dev` (development) or `npm start`.
 * Background jobs run in a separate process: see worker.ts.
 */
import { app } from './app.js';
import { env, features } from './config/env.js';
import { startQueue } from './lib/queue.js';

await startQueue(); // the API adds jobs, so the queue must be ready

app.listen(env.PORT, () => {
  console.log(`🚀 PhotoMatch AI API on http://localhost:${env.PORT}  (public URL: ${env.APP_URL})`);
  // Show at a glance which optional features are configured in .env.
  const status = Object.entries(features).map(([name, on]) => `${on ? '✅' : '⚪'} ${name}`);
  console.log(`   ${status.join('   ')}`);
});
