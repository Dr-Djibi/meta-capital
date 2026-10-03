const fs = require('fs');

// Simple TypeScript to CommonJS transpiler for testing
function loadTSModule(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  // Strip import statements for types/constants
  content = content.replace(/import\s+type\s+[\s\S]*?;/g, '');
  content = content.replace(/import\s+[\s\S]*?;/g, '');
  content = content.replace(/export\s+interface\s+[\s\S]*?}/g, '');
  content = content.replace(/export\s+type\s+[\s\S]*?;/g, '');
  content = content.replace(/:\s*StandardPaymentMethod/g, '');
  content = content.replace(/:\s*TransactionCategory/g, '');
  content = content.replace(/:\s*ParsedSMS\s*\[\]/g, '');
  content = content.replace(/:\s*ParsedSMS\s*\|\s*null/g, '');
  content = content.replace(/:\s*ParsedSMS/g, '');
  content = content.replace(/:\s*string\s*\|\s*undefined/g, '');
  content = content.replace(/:\s*string/g, '');
  content = content.replace(/:\s*number/g, '');
  content = content.replace(/:\s*'INCOME'\s*\|\s*'EXPENSE'/g, '');
  content = content.replace(/\(ref\?\)/g, '(ref)');
  content = content.replace(/export\s+/g, '');

  const module = { exports: {} };
  const fn = new Function('module', 'exports', content + '\nreturn { parseGNFAmount, detectCategory, parseSingleSMS, parseSMSBatch };');
  return fn(module, module.exports);
}

const smsParser = loadTSModule('src/utils/smsParser.ts');

const omExamples = [
  {
    name: 'OM 1: Paiement chez Achat de pass',
    sms: 'Bonjour,vous venez d efectuar un paiement de 14000.00GNF chez Achat de pass pour tiers2.Frais 0.00GNF, Nouveau Solde 13432045.55GNF, Ref :MP261002.1231.B32921. Orange Money vous remercie.',
    expected: {
      provider: 'ORANGE_MONEY',
      type: 'EXPENSE',
      amountGNF: 14000,
      paymentMethod: 'ORANGE_MONEY',
      feeGNF: 0,
      newBalanceGNF: 13432045.55,
      reference: 'MP261002.1231.B32921',
      description: 'Paiement chez Achat de pass pour tiers2',
      category: 'PERSONAL_EXPENSE',
    },
  },
  {
    name: 'OM 2: Réception de fonds',
    sms: 'Bonjour, reception de: 120000.00GNF de la part du 629771290,Nouveau Solde :13446045.55GNF, reference:PP261001.2245.B20256. Orange Money vous remercie',
    expected: {
      provider: 'ORANGE_MONEY',
      type: 'INCOME',
      amountGNF: 120000,
      paymentMethod: 'ORANGE_MONEY',
      newBalanceGNF: 13446045.55,
      reference: 'PP261001.2245.B20256',
      description: 'Réception de 629771290',
      category: 'PERSONAL_FUNDS',
    },
  },
  {
    name: 'OM 3: Paiement chez SOCIETE PAY CARD',
    sms: 'Bonjour,vous venez d efectuar un paiement de 100000.00GNF chez SOCIETE PAY CARD.Frais 1000.00GNF, Nouveau Solde 1380250.00GNF, Ref :MP261001.2105.A67342. Orange Money vous remercie.',
    expected: {
      provider: 'ORANGE_MONEY',
      type: 'EXPENSE',
      amountGNF: 100000,
      paymentMethod: 'ORANGE_MONEY',
      feeGNF: 1000,
      newBalanceGNF: 1380250,
      reference: 'MP261001.2105.A67342',
      description: 'Paiement chez SOCIETE PAY CARD',
      category: 'PERSONAL_EXPENSE',
    },
  },
  {
    name: 'OM 4: Envoi de fonds',
    sms: 'Bonjour,Envoi de:31000.00GNF vers le 628831338, Frais:500.00GNF, Nouveau Solde: 1492250.00GNF, reference:PP260930.1237.C76715. Orange Money vous remercie',
    expected: {
      provider: 'ORANGE_MONEY',
      type: 'EXPENSE',
      amountGNF: 31000,
      paymentMethod: 'ORANGE_MONEY',
      feeGNF: 500,
      newBalanceGNF: 1492250,
      reference: 'PP260930.1237.C76715',
      description: 'Envoi vers 628831338',
      category: 'PERSONAL_EXPENSE',
    },
  },
  {
    name: 'OM 5: Retrait de fonds avec prefixe',
    sms: '5Bonjour,Retrait de 110000.00GNF emis par le 628845446 ,Frais 1100.00GNF,reference:CO260921.1524.A67895,nouveau Solde 2214250.00GNF. Orange vous remercie',
    expected: {
      provider: 'ORANGE_MONEY',
      type: 'EXPENSE',
      amountGNF: 110000,
      paymentMethod: 'ORANGE_MONEY',
      feeGNF: 1100,
      newBalanceGNF: 2214250,
      reference: 'CO260921.1524.A67895',
      description: 'Retrait émis par 628845446',
      category: 'PERSONAL_EXPENSE',
    },
  },
];

const paycardExamples = [
  {
    name: 'PayCard 1: Dépôt reçu',
    sms: 'Vous avez recu un depot de 100 000 GNF de OFMG. Reference: 2610-GGWUGU. Solde : 142 300 GNF',
    expected: {
      provider: 'CARTE_BANCAIRE',
      type: 'INCOME',
      amountGNF: 100000,
      paymentMethod: 'CARTE_BANCAIRE',
      newBalanceGNF: 142300,
      reference: '2610-GGWUGU',
      description: 'Dépôt de OFMG',
      category: 'PERSONAL_FUNDS',
    },
  },
  {
    name: 'PayCard 2: Paiement VISA FACEBK',
    sms: 'vous avez effectue un paiement VISA a FACEBK *WBYAA8J8S4 Dublin IE de 93 400 GNF. Reference: 2610-98VR9W. Solde : 48 900 GNF.',
    expected: {
      provider: 'CARTE_BANCAIRE',
      type: 'EXPENSE',
      amountGNF: 93400,
      paymentMethod: 'CARTE_BANCAIRE',
      newBalanceGNF: 48900,
      reference: '2610-98VR9W',
      description: 'Paiement VISA FACEBK *WBYAA8J8S4 Dublin IE',
      category: 'ADVERTISING',
    },
  },
];

console.log('--- EXÉCUTION DES TESTS SMS PARSER ---\n');
let passed = 0;
let failed = 0;

const allTests = [...omExamples, ...paycardExamples];

for (const t of allTests) {
  const res = smsParser.parseSingleSMS(t.sms);
  if (!res) {
    console.error(`❌ FAILED: ${t.name} -> Le parser a renvoyé null!`);
    failed++;
    continue;
  }

  let testOk = true;
  for (const [key, val] of Object.entries(t.expected)) {
    if (res[key] !== val) {
      console.error(`❌ FAILED: ${t.name} -> Champ '${key}': reçu '${res[key]}', attendu '${val}'`);
      testOk = false;
    }
  }

  if (testOk) {
    console.log(`✅ PASSED: ${t.name}`);
    console.log(`   └─ [${res.provider}] ${res.type} | Montant: ${res.amountGNF} GNF | Ref: ${res.reference} | Cat: ${res.category}`);
    passed++;
  } else {
    failed++;
  }
}

console.log('\n--- TEST BATCH / MULTI-SMS ---');
const batchText = allTests.map((t) => t.sms).join('\n\n');
const batchRes = smsParser.parseSMSBatch(batchText);
if (batchRes.length === allTests.length) {
  console.log(`✅ PASSED: Multi-SMS batch parsing a extrait ${batchRes.length}/${allTests.length} SMS.`);
  passed++;
} else {
  console.error(`❌ FAILED: Multi-SMS batch parsing a extrait ${batchRes.length}/${allTests.length} SMS.`);
  failed++;
}

console.log(`\nRÉSULTATS: ${passed} reussis, ${failed} echoues.`);
if (failed > 0) process.exit(1);
