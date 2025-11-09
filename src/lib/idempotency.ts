export function newIdempotencyKey() {
  return (crypto as any).randomUUID ? (crypto as any).randomUUID() : `${Date.now()}-${Math.random()}`;
}

export async function postWithIdempotency(url: string, body: unknown) {
  const idk = newIdempotencyKey();
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": idk }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}
