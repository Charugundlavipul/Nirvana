const fs = require('fs');
const readline = require('readline');

const API_BASE_URL = 'https://public.api.hospitable.com/v2';
const PROPERTY_IDS_FILE = 'property_ids.json';
const PROPERTIES_FILE = 'properties.jsonl';
const RESERVATIONS_FILE = 'reservations.jsonl';
const CONVERSATIONS_FILE = 'conversations.jsonl';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getToken() {
  const pat = process.env.HOSPITABLE_PAT || process.argv[2];

  if (!pat) {
    console.error('Please provide a Hospitable Personal Access Token.');
    console.error('Usage: node scripts/run_all.js <YOUR_PAT>');
    console.error('Or set HOSPITABLE_PAT environment variable.');
    process.exit(1);
  }

  return pat;
}

async function fetchJson(pat, url) {
  while (true) {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${pat}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 429) {
      console.warn('Rate limited. Waiting 5 seconds before retrying...');
      await sleep(5000);
      continue;
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`${response.status} ${response.statusText}: ${text}`);
    }

    return response.json();
  }
}

async function fetchAllProperties(pat) {
  const properties = [];
  let nextUrl = `${API_BASE_URL}/properties`;

  while (nextUrl) {
    console.log(`Fetching properties from: ${nextUrl}`);
    const json = await fetchJson(pat, nextUrl);

    if (!Array.isArray(json.data)) {
      throw new Error(`Unexpected properties response: ${JSON.stringify(json)}`);
    }

    properties.push(...json.data);
    nextUrl = json.links?.next || null;

    if (nextUrl) await sleep(500);
  }

  return properties;
}

async function writeProperties(properties) {
  const propertyIds = properties.map((property) => property.id).filter(Boolean);
  fs.writeFileSync(PROPERTY_IDS_FILE, JSON.stringify(propertyIds, null, 2));

  const stream = fs.createWriteStream(PROPERTIES_FILE, { flags: 'w' });
  for (const property of properties) {
    stream.write(`${JSON.stringify(property)}\n`);
  }
  stream.end();

  await new Promise((resolve) => stream.on('finish', resolve));
  console.log(`Saved ${propertyIds.length} property IDs to ${PROPERTY_IDS_FILE}`);
  console.log(`Saved ${properties.length} property records to ${PROPERTIES_FILE}`);
}

async function fetchReservationsForProperty(pat, propertyId, stream) {
  const today = new Date();
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(today.getFullYear() - 2);

  const startDate = twoYearsAgo.toISOString().split('T')[0];
  const endDate = today.toISOString().split('T')[0];
  let page = 1;

  while (true) {
    const url = `${API_BASE_URL}/reservations?properties[]=${propertyId}&start_date=${startDate}&end_date=${endDate}&page=${page}`;
    console.log(`Fetching reservations for property ${propertyId} (page ${page})`);
    const json = await fetchJson(pat, url);

    if (!Array.isArray(json.data)) {
      throw new Error(`Unexpected reservations response: ${JSON.stringify(json)}`);
    }

    for (const reservation of json.data) {
      if (!reservation.id) continue;
      stream.write(
        `${JSON.stringify({
          reservation_id: reservation.id,
          property_id: propertyId,
        })}\n`
      );
    }

    if (json.meta?.current_page < json.meta?.last_page) {
      page += 1;
      await sleep(500);
    } else {
      break;
    }
  }
}

async function fetchAllReservations(pat, propertyIds) {
  const stream = fs.createWriteStream(RESERVATIONS_FILE, { flags: 'w' });

  for (let index = 0; index < propertyIds.length; index += 1) {
    const propertyId = propertyIds[index];
    console.log(`Processing property ${index + 1}/${propertyIds.length}: ${propertyId}`);
    await fetchReservationsForProperty(pat, propertyId, stream);

    if (index < propertyIds.length - 1) await sleep(1000);
  }

  stream.end();
  await new Promise((resolve) => stream.on('finish', resolve));
  console.log(`Saved reservations to ${RESERVATIONS_FILE}`);
}

async function fetchMessagesForReservation(pat, reservationId) {
  const messages = [];
  let nextUrl = `${API_BASE_URL}/reservations/${reservationId}/messages`;

  while (nextUrl) {
    const json = await fetchJson(pat, nextUrl);

    if (!Array.isArray(json.data)) {
      throw new Error(`Unexpected messages response: ${JSON.stringify(json)}`);
    }

    for (const message of json.data) {
      messages.push({
        label: message.sender_type || message.sender?.first_name || 'unknown',
        message: message.body,
      });
    }

    nextUrl = json.links?.next || null;
    if (nextUrl) await sleep(500);
  }

  return messages;
}

async function readJsonl(filePath) {
  const records = [];
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (line.trim()) records.push(JSON.parse(line));
  }

  return records;
}

async function fetchAllConversations(pat, propertyNameById) {
  const reservations = await readJsonl(RESERVATIONS_FILE);
  const stream = fs.createWriteStream(CONVERSATIONS_FILE, { flags: 'w' });

  console.log(`Fetching conversations for ${reservations.length} reservations...`);

  for (let index = 0; index < reservations.length; index += 1) {
    const { reservation_id, property_id } = reservations[index];
    console.log(`Processing reservation ${index + 1}/${reservations.length}: ${reservation_id}`);

    const conversation = await fetchMessagesForReservation(pat, reservation_id);
    stream.write(
      `${JSON.stringify({
        reservation_id,
        property_name: propertyNameById[property_id] || property_id,
        conversation,
      })}\n`
    );

    if (index < reservations.length - 1) await sleep(500);
  }

  stream.end();
  await new Promise((resolve) => stream.on('finish', resolve));
  console.log(`Saved conversations to ${CONVERSATIONS_FILE}`);
}

async function main() {
  const pat = getToken();

  try {
    console.log('Starting Hospitable end-to-end pipeline...');

    const properties = await fetchAllProperties(pat);
    const propertyNameById = Object.fromEntries(
      properties
        .filter((property) => property.id)
        .map((property) => [property.id, property.name || property.id])
    );
    const propertyIds = Object.keys(propertyNameById);

    if (!propertyIds.length) {
      console.log('No properties found. Nothing else to fetch.');
      return;
    }

    await writeProperties(properties);
    await fetchAllReservations(pat, propertyIds);
    await fetchAllConversations(pat, propertyNameById);

    console.log('\nPipeline complete.');
  } catch (error) {
    console.error('\nPipeline failed:', error.message);
    process.exit(1);
  }
}

main();
