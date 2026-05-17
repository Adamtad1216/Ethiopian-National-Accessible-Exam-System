import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { StudentResponse, ExamSession } from '@/types';

interface ENAESDb extends DBSchema {
  responses: {
    key: string;
    value: StudentResponse & { synced: boolean };
    indexes: { 'by-exam': string; 'by-synced': number };
  };
  sessions: {
    key: string;
    value: ExamSession;
    indexes: { 'by-exam-student': [string, string] };
  };
  examCache: {
    key: string;
    value: {
      examId: string;
      data: unknown;
      cachedAt: string;
    };
  };
}

let db: IDBPDatabase<ENAESDb> | null = null;

async function getDb(): Promise<IDBPDatabase<ENAESDb>> {
  if (db) return db;
  db = await openDB<ENAESDb>('enaes-offline', 1, {
    upgrade(database) {
      const responseStore = database.createObjectStore('responses', { keyPath: '_id' });
      responseStore.createIndex('by-exam', 'examId');
      responseStore.createIndex('by-synced', 'synced');

      const sessionStore = database.createObjectStore('sessions', { keyPath: '_id' });
      sessionStore.createIndex('by-exam-student', ['examId', 'studentId']);

      database.createObjectStore('examCache', { keyPath: 'examId' });
    },
  });
  return db;
}

// Responses
export async function saveResponse(response: StudentResponse) {
  const database = await getDb();
  await database.put('responses', { ...response, synced: false });
}

export async function getResponsesForExam(examId: string): Promise<StudentResponse[]> {
  const database = await getDb();
  return database.getAllFromIndex('responses', 'by-exam', examId);
}

export async function getUnsyncedResponses(): Promise<StudentResponse[]> {
  const database = await getDb();
  const all = await database.getAll('responses');
  return all.filter(r => !r.synced);
}

export async function markResponsesSynced(ids: string[]) {
  const database = await getDb();
  const tx = database.transaction('responses', 'readwrite');
  for (const id of ids) {
    const response = await tx.store.get(id);
    if (response) {
      await tx.store.put({ ...response, synced: true });
    }
  }
  await tx.done;
}

// Sessions
export async function saveSession(session: ExamSession) {
  const database = await getDb();
  await database.put('sessions', session);
}

export async function getSession(sessionId: string): Promise<ExamSession | undefined> {
  const database = await getDb();
  return database.get('sessions', sessionId);
}

// Exam cache
export async function cacheExamData(examId: string, data: unknown) {
  const database = await getDb();
  await database.put('examCache', { examId, data, cachedAt: new Date().toISOString() });
}

export async function getCachedExam(examId: string) {
  const database = await getDb();
  return database.get('examCache', examId);
}

export async function clearExamCache(examId: string) {
  const database = await getDb();
  await database.delete('examCache', examId);
}
