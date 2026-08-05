require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

async function checkNames() {
  await mongoose.connect(MONGODB_URI);
  const col = mongoose.connection.collection('products');

  // Pobierz 30 przykładowych nazw
  const samples = await col.find({}, { projection: { name: 1 } }).limit(30).toArray();
  console.log('Przykładowe nazwy produktów:');
  samples.forEach(p => console.log(`  "${p.name}"`));

  // Policz ile ma literę+kropkę+literę
  const withDots = await col.countDocuments({ name: /[A-Za-z]\.[A-Za-z]/ });
  console.log(`\nProduktów z wzorcem litera.litera: ${withDots}`);

  // Policz ile w ogóle ma kropki
  const withAnyDot = await col.countDocuments({ name: /\./ });
  console.log(`Produktów z jakąkolwiek kropką: ${withAnyDot}`);

  await mongoose.connection.close();
}

checkNames().catch(console.error);
