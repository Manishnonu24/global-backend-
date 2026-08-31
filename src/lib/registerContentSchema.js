export async function registerContentSchema({ siteId, apiKey, pages, apiUrl = "http://localhost:3000/api/content-schemas" }) {
  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        siteId,
        pages,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to register schemas');
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.error('Error registering content schemas:', err);
    throw err;
  }
}
