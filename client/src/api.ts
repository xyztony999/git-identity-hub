export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(path, { headers: { accept: "application/json" } });
  const body = (await response.json().catch(() => null)) as { message?: string } | T | null;
  if (!response.ok) {
    const message = body && typeof body === "object" && "message" in body && body.message ? body.message : "请求失败";
    throw new ApiError(response.status, message);
  }
  return body as T;
}

export async function postJson<T>(path: string, payload: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(payload),
  });
  const body = (await response.json().catch(() => null)) as { message?: string } | T | null;
  if (!response.ok) {
    const message = body && typeof body === "object" && "message" in body && body.message ? body.message : "没有保存";
    throw new ApiError(response.status, message);
  }
  return body as T;
}
