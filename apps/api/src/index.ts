import {createServer} from 'node:http';
import {createApp} from './app.js';
import {config} from './config.js';
import {db,redis,logger} from './db.js';
import {attachMultiplayer} from './multiplayer.js';
import {rebuildRanking} from './results.js';
await redis.connect();await db.$connect();await rebuildRanking();
// Redis must be connected before createApp constructs the shared rate-limit stores.
const server=createServer(await createApp()),multiplayer=attachMultiplayer(server);
server.listen(config.PORT,'0.0.0.0',()=>logger.info({port:config.PORT},'Arcadia API ready'));
let closing=false;
async function shutdown(){if(closing)return;closing=true;await multiplayer.stop();server.close();await db.$disconnect();await redis.quit();}
process.on('SIGTERM',()=>void shutdown());process.on('SIGINT',()=>void shutdown());
