import { build } from 'esbuild';
import fs from 'fs/promises';
import path from 'path';

async function runBuild() {
  console.log('Iniciando o build para produção (minificação)...');

  // 1. Minificar o JavaScript usando esbuild
  await build({
    entryPoints: ['public/scripts/app.js'],
    bundle: true,
    minify: true, // Isso remove espaços e ofusca/encurta variáveis (a, b)
    format: 'esm',
    target: 'es2020',
    sourcemap: false, // Garante que o source map não será gerado (evita que o F12 veja o código original)
    outfile: 'public/app.min.js',
    allowOverwrite: true,
  });
  console.log('✅ JS minificado com sucesso em public/app.min.js');

  // 2. Atualizar o index.html apontando para o app.min.js
  const indexPath = path.join(process.cwd(), 'public', 'index.html');
  let html = await fs.readFile(indexPath, 'utf-8');
  
  html = html.replace(
    '<script type="module" src="scripts/app.js"></script>',
    '<script type="module" src="app.min.js"></script>'
  );

  await fs.writeFile(indexPath, html, 'utf-8');
  console.log('✅ index.html atualizado para usar o JS minificado.');
}

runBuild().catch((err) => {
  console.error("Erro no build:", err);
  process.exit(1);
});
