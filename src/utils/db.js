class NotesDB {
  constructor() {
    this.dbName = 'PinTheNoteDB';
    this.version = 1;
    this.db = null;
  }

  async open() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('drawings')) {
          db.createObjectStore('drawings', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('audios')) {
          db.createObjectStore('audios', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('files')) {
          db.createObjectStore('files', { keyPath: 'id' });
        }
      };

      request.onsuccess = (e) => {
        this.db = e.target.result;
        resolve(this.db);
      };

      request.onerror = (e) => {
        reject(e.target.error);
      };
    });
  }

  async getStore(storeName, mode = 'readonly') {
    const db = await this.open();
    const transaction = db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  // Drawings
  async saveDrawing(id, strokes) {
    const store = await this.getStore('drawings', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put({ id, strokes, updatedAt: new Date().toISOString() });
      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async getDrawing(id) {
    const store = await this.getStore('drawings');
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async getAllDrawings() {
    const store = await this.getStore('drawings');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async deleteDrawing(id) {
    const store = await this.getStore('drawings', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  // Audios
  async saveAudio(id, blob, noteId = null) {
    const store = await this.getStore('audios', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put({ id, blob, noteId, createdAt: new Date().toISOString() });
      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async getAudio(id) {
    const store = await this.getStore('audios');
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async getAllAudios() {
    const store = await this.getStore('audios');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async deleteAudio(id) {
    const store = await this.getStore('audios', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  // Files & Image Lab
  async saveFile(id, name, type, originalSize, processedSize, originalBlob, processedBlob) {
    const store = await this.getStore('files', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put({
        id,
        name,
        type,
        originalSize,
        processedSize,
        originalBlob,
        processedBlob,
        createdAt: new Date().toISOString()
      });
      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async getFile(id) {
    const store = await this.getStore('files');
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async getAllFiles() {
    const store = await this.getStore('files');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async deleteFile(id) {
    const store = await this.getStore('files', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e.target.error);
    });
  }
}

export const db = new NotesDB();
