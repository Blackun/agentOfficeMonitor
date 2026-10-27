import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import type { HttpServer } from 'vite';
import { OfficeMonitorServer } from './server/index';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'agent-office-monitor-backend',
      configureServer(server) {
        const officeServer = new OfficeMonitorServer();
        officeServer.start();

        server.middlewares.use((req, res, next) => {
          if (officeServer.handleApiRequest(req, res)) {
            return;
          }
          next();
        });

        if (server.httpServer) {
          officeServer.attachToHttpServer(server.httpServer as unknown as import('node:http').Server);
        }
      },
      configurePreviewServer(server) {
        const officeServer = new OfficeMonitorServer();
        officeServer.start();

        server.middlewares.use((req, res, next) => {
          if (officeServer.handleApiRequest(req, res)) {
            return;
          }
          next();
        });

        if (server.httpServer) {
          officeServer.attachToHttpServer(server.httpServer as unknown as import('node:http').Server);
        }
      },
    },
  ],
  server: {
    port: 5173,
    host: '127.0.0.1',
  },
  preview: {
    port: 4173,
    host: '127.0.0.1',
  },
});
