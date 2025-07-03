// gerar-hash.js
const bcrypt = require('bcryptjs');

// --- Defina sua nova senha aqui ---
const novaSenha = 'senhaforte123';
// ---------------------------------

const saltRounds = 10;
const hash = bcrypt.hashSync(novaSenha, saltRounds);

console.log('--- GERADOR DE HASH ---');
console.log('Use esta senha para fazer o login:');
console.log(novaSenha);
console.log('\nCopie e cole este hash no seu arquivo db.json:');
console.log(hash);
console.log('-----------------------');