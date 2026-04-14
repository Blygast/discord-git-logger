import * as fs from "fs";
import * as path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE_PATH = path.join(DATA_DIR, "lastPush.json");

interface PushLog {
  pushId: number;
  timestamp: string;
}

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function getLastPushId(): number {
  try {
    if (fs.existsSync(FILE_PATH)) {
      const data: PushLog = JSON.parse(fs.readFileSync(FILE_PATH, "utf-8"));
      return data.pushId;
    }
  } catch {
    // ignore parse errors
  }
  return 0;
}

export function saveLastPushId(pushId: number): void {
  ensureDataDir();
  const data: PushLog = {
    pushId,
    timestamp: new Date().toISOString(),
  };
  fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2), "utf-8");
}
