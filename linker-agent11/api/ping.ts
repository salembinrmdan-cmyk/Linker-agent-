export default function handler(_req: unknown, res: { status: (n: number) => { json: (o: unknown) => void } }) {
  res.status(200).json({ ok: true, message: 'pong' });
}
