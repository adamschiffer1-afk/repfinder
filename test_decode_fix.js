// Test the fixed decode function

const BRAND_MAP = {
  'a.s': 'Acne Studios',
  's.k': 'Seiko',
  'm.a.s.c.o.t': 'Mascot',
  's.k.a.t.e.b.o.a.r.d': 'Skateboard',
  'l.v': 'Louis Vuitton',
  'L.V': 'Louis Vuitton',
};

function decodeBrandName(name) {
  let decoded = name;
  
  // Sort BRAND_MAP entries by key length (longest first) to prevent partial matches
  const sortedEntries = Object.entries(BRAND_MAP).sort((a, b) => b[0].length - a[0].length);
  
  for (const [abbrev, full] of sortedEntries) {
    // For dotted abbreviations, ensure they're followed by space or end of string
    // This prevents matching "a.s" inside "m.a.s.c.o.t"
    const escapedAbbrev = abbrev.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp('(?:^|\\s)(' + escapedAbbrev + ')(?=\\s|$)', 'gi');
    decoded = decoded.replace(regex, (match, p1) => {
      return match.replace(p1, full);
    });
  }
  
  // Remove Chinese characters
  decoded = decoded.replace(/[\u4e00-\u9fa5]/g, '');
  
  // Remove dots from remaining abbreviations (e.g., B.O.S.S → BOSS)
  decoded = decoded.replace(/\b([A-Z]\.){2,}[A-Z]\b/g, (match) => match.replace(/\./g, ''));
  
  // Clean up product type names
  decoded = decoded.toLowerCase();
  decoded = decoded.replace(/\bshort[- ]sleeves?\b/gi, 'T-shirt');
  decoded = decoded.replace(/\blong[- ]sleeves?\b/gi, 'Long Sleeve');
  
  // Capitalize first letter of each word
  decoded = decoded.replace(/\b\w/g, char => char.toUpperCase());
  // Clean up extra spaces
  decoded = decoded.replace(/\s+/g, ' ').trim();
  
  return decoded;
}

// Test cases
const testCases = [
  'm.a.s.c.o.t sweater',
  'L.V s.k.a.t.e.b.o.a.r.d shoes',
  'l.v travel bag',
  'a.s jacket',
  's.k watch',
];

console.log('Testing brand decoding:');
console.log('='.repeat(80));
testCases.forEach(test => {
  const result = decodeBrandName(test);
  console.log(`Input:  ${test}`);
  console.log(`Output: ${result}`);
  console.log('');
});
