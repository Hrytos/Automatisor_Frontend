export const runtime = "edge";

export async function GET() {
  const base = process.env.BACKEND_URL ?? "https://automatisor-backend.onrender.com";
  const url = `${base}/health`;

  try {
    const res = await fetch(url, { method: "GET" });
    return Response.json({ ok: res.ok, status: res.status, ts: Date.now() });
  } catch (err) {
    return Response.json(
      { ok: false, error: String(err), ts: Date.now() },
      { status: 500 }
    );
  }
}
