import { defineConfig, normalizePath } from 'vite';
import { builtinModules } from 'module';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import fs from 'fs';
import path from 'path';

const getInputEntries = () => {
  const entries: Record<string, string> = {
    index: 'index.ts', // Your main application entry point
  };

    const commandsDir = path.resolve(__dirname, 'commands');

    // Recursive helper function to crawl subfolders
    const crawlDirectory = (dirPath: string) => {
        if (!fs.existsSync(dirPath)) return;

        const files = fs.readdirSync(dirPath);

        files.forEach((file) => {
            const fullPath = path.join(dirPath, file);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
            // If it's a subfolder, dive into it
            crawlDirectory(fullPath);
            } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
            // Compute the relative path from the root /commands folder
            // e.g., "utility/ping.ts" or "ping.ts"
            const relativePath = path.relative(commandsDir, fullPath);
            
            // Strip the .ts extension for the Vite output key
            const pathWithoutExt = relativePath.replace(/\.ts$/, '');
            
            // Key: 'commands/utility/ping' -> Value: 'commands/utility/ping.ts'
            entries[`commands/${pathWithoutExt}`] = `commands/${relativePath}`;
            }
        });
    };

    crawlDirectory(commandsDir);
    return entries;
};

const nativeCopyPlugin = () => ({
  name: 'native-copy-plugin',
  closeBundle() {
    const srcDrizzle = path.resolve(__dirname, 'src/drizzle');
    const destDrizzle = path.resolve(__dirname, 'dist', 'drizzle');

    if (fs.existsSync(srcDrizzle)) {
      // Native Node recursive file copy (supported in modern Node engines)
      fs.cpSync(srcDrizzle, destDrizzle, { recursive: true, force: true });
      console.log('Successfully copied drizzle migrations folder to dist/drizzle natively!');
    }
  }
});

export default defineConfig({
    plugins: [
        nativeCopyPlugin()
    ],
    build: {
    target: 'node22',     // Matches your Cloud Run runtime environment
    ssr: true,           // Optimizes module compilation for Node.js
    outDir: 'dist',       // Where your compiled JS files will go
    minify: false,        // Keep false during transition for easier debugging
    rollupOptions: {
      input: {
        index: 'src/index.ts', // Back to a single entry point!
      },
      output: {
        format: 'esm',              // Output standard ECMAScript Modules
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      },
      // Prevents Vite from trying to bundle Node built-ins or your node_modules
      external: [
        ...builtinModules,
        ...builtinModules.map(m => `node:${m}`),
        /node_modules/
      ],
    },
  },
});
