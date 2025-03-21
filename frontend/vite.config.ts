import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react()],
	build: {
		target: 'es2022',
	},
	server: {
		port: 4000,
	},
});
