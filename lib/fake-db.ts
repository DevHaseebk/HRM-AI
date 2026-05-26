import fs from "fs/promises";
import path from "path";
import type { DataFile } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");

export async function readData<T>(filename: DataFile): Promise<T> {
  const filePath = path.join(DATA_DIR, filename);
  const content = await fs.readFile(filePath, "utf-8");
  return JSON.parse(content) as T;
}

export async function writeData<T>(filename: DataFile, data: T): Promise<void> {
  const filePath = path.join(DATA_DIR, filename);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export async function updateRecord<T extends { id: string }>(
  filename: DataFile,
  id: string,
  updates: Partial<T>
): Promise<T | null> {
  const records = await readData<T[]>(filename);
  const index = records.findIndex((record) => record.id === id);
  if (index === -1) return null;

  records[index] = { ...records[index], ...updates };
  await writeData(filename, records);
  return records[index];
}

export async function addRecord<T extends { id: string }>(
  filename: DataFile,
  record: T
): Promise<T> {
  const records = await readData<T[]>(filename);
  records.push(record);
  await writeData(filename, records);
  return record;
}

export async function deleteRecord<T extends { id: string }>(
  filename: DataFile,
  id: string
): Promise<boolean> {
  const records = await readData<T[]>(filename);
  const filtered = records.filter((record) => record.id !== id);
  if (filtered.length === records.length) return false;
  await writeData(filename, filtered);
  return true;
}
