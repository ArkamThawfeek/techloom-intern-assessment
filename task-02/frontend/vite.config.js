import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/products': 'http://localhost:4000',
      '/orders': 'http://localhost:4000',
      '/cart': 'http://localhost:4000'
    }
  }
});
