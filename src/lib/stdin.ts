export async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  const reader = process.stdin;

  return new Promise((resolve, reject) => {
    reader.on("data", (chunk: Buffer) => chunks.push(chunk));
    reader.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    reader.on("error", reject);

    if (process.stdin.isTTY) {
      resolve("");
    }
  });
}
