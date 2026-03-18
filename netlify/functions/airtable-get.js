exports.handler = async (event) => {
  const TOKEN   = process.env.AIRTABLE_TOKEN;
  const BASE_ID = process.env.AIRTABLE_BASE_ID;
  const { table, qs } = event.queryStringParameters || {};

  if (!table) return { statusCode: 400, body: JSON.stringify({ error: 'table manquante' }) };

  try {
    const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(table)}${qs ? '?' + qs : ''}`;
    const res  = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
    const data = await res.json();
    return {
      statusCode: res.status,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(data)
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
