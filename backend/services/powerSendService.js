const crypto = require('crypto');
const dgram = require('dgram');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { normalizeInputPath, validatePathArray } = require('../security/pathGuard');

const DISCOVERY_PORT = Number(process.env.POWER_SEND_DISCOVERY_PORT || 38492);
const TERMINAL_STATES = new Set(['completed', 'failed', 'canceled']);

const makeId = (prefix) => `${prefix}_${Date.now()}_${crypto.randomBytes(5).toString('hex')}`;
const hashCode = (code) => crypto.createHash('sha256').update(code, 'utf8').digest('hex');

const normalizeCode = (value) => {
  const code = String(value || '').trim();
  if (!code) {
    const err = new Error('Send/receive code is required');
    err.statusCode = 400;
    throw err;
  }
  if (code.length > 128) {
    const err = new Error('Code must be 128 characters or fewer');
    err.statusCode = 400;
    throw err;
  }
  return code;
};

const ipToNumber = (address) => {
  return address.split('.').reduce((value, part) => ((value << 8) | Number(part)) >>> 0, 0);
};

const numberToIp = (value) => {
  return [24, 16, 8, 0].map(shift => (value >>> shift) & 255).join('.');
};

const getBroadcastAddresses = () => {
  const addresses = new Set(['255.255.255.255']);
  const interfaces = os.networkInterfaces();

  for (const entries of Object.values(interfaces)) {
    for (const entry of entries || []) {
      if (entry.family !== 'IPv4' || entry.internal || !entry.netmask) continue;
      const ip = ipToNumber(entry.address);
      const mask = ipToNumber(entry.netmask);
      addresses.add(numberToIp(((ip & mask) | (~mask >>> 0)) >>> 0));
    }
  }

  return Array.from(addresses);
};

const safeRelativeParts = (relativePath) => {
  const normalized = String(relativePath || '').replace(/\\/g, '/');
  const parts = normalized.split('/').filter(Boolean);
  if (parts.some(part => part === '.' || part === '..' || part.includes('\0'))) {
    throw new Error('Unsafe path received from peer');
  }
  return parts;
};

const reserveDestination = (destinationDir, baseName, reserved) => {
  const parsed = path.parse(baseName);
  let candidate = path.join(destinationDir, baseName);
  let index = 0;

  while (fs.existsSync(candidate) || reserved.has(path.resolve(candidate).toLowerCase())) {
    index += 1;
    const suffix = index === 1 ? ' - Copy' : ` - Copy ${index}`;
    candidate = path.join(destinationDir, `${parsed.name}${suffix}${parsed.ext}`);
  }

  reserved.add(path.resolve(candidate).toLowerCase());
  return candidate;
};

class PowerSendService {
  constructor({ discoveryPort = DISCOVERY_PORT } = {}) {
    this.discoveryPort = discoveryPort;
    this.transfers = new Map();
    this.subscribers = new Set();
    this.pendingDiscoveries = new Map();
    this.outgoingSessions = new Map();
    this.discoverySocket = null;
    this.transferServer = null;
    this.transferPort = null;
    this.startPromise = null;
  }

  list() {
    return Array.from(this.transfers.values())
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(transfer => this.serialize(transfer));
  }

  get(id) {
    const transfer = this.transfers.get(id);
    return transfer ? this.serialize(transfer) : null;
  }

  async ensureStarted() {
    if (this.startPromise) return this.startPromise;
    this.startPromise = Promise.all([
      this.startTransferServer(),
      this.startDiscoverySocket()
    ]);
    return this.startPromise;
  }

  async createOffer({ paths, code }) {
    await this.ensureStarted();
    const normalizedCode = normalizeCode(code);
    const safePaths = validatePathArray(paths);
    const codeHash = hashCode(normalizedCode);
    const manifest = await this.buildManifest(safePaths);
    const transfer = {
      id: makeId('offer'),
      type: 'outgoing',
      direction: 'send',
      createdAt: new Date().toISOString(),
      accessToken: crypto.randomBytes(24).toString('hex'),
      activeStreams: new Set()
    };

    Object.assign(transfer, {
      status: 'ready',
      code: normalizedCode,
      codeHash,
      sources: safePaths,
      roots: manifest.roots,
      entries: manifest.entries,
      totalBytes: manifest.totalBytes,
      processedBytes: 0,
      totalItems: manifest.entries.length,
      processedItems: 0,
      currentPath: '',
      speedBps: 0,
      etaSeconds: null,
      peerName: '',
      peerAddress: '',
      error: '',
      canceled: false,
      finishedAt: null
    });

    this.transfers.set(transfer.id, transfer);
    this.emit(transfer);
    return this.serialize(transfer);
  }

  findLatestOffer(codeHashValue) {
    return Array.from(this.transfers.values())
      .filter(transfer => (
        transfer.type === 'outgoing'
        && transfer.codeHash === codeHashValue
        && !transfer.canceled
      ))
      .reduce((latest, transfer) => (
        !latest || new Date(transfer.createdAt) >= new Date(latest.createdAt)
          ? transfer
          : latest
      ), null);
  }

  receive({ code, destinationDir }) {
    const normalizedCode = normalizeCode(code);
    const safeDestination = normalizeInputPath(destinationDir, {
      mustExist: true,
      directory: true
    });
    const transfer = {
      id: makeId('receive'),
      type: 'incoming',
      direction: 'receive',
      status: 'discovering',
      code: normalizedCode,
      codeHash: hashCode(normalizedCode),
      destinationDir: safeDestination,
      sources: [],
      roots: [],
      totalBytes: 0,
      processedBytes: 0,
      totalItems: 0,
      processedItems: 0,
      currentPath: '',
      speedBps: 0,
      etaSeconds: null,
      peerName: '',
      peerAddress: '',
      error: '',
      canceled: false,
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      finishedAt: null,
      activeRequest: null,
      activeResponse: null,
      activeWriter: null,
      tempPath: ''
    };

    this.transfers.set(transfer.id, transfer);
    this.emit(transfer);
    setImmediate(() => this.runReceive(transfer.id));
    return this.serialize(transfer);
  }

  cancel(id) {
    const transfer = this.transfers.get(id);
    if (!transfer) return null;
    if (TERMINAL_STATES.has(transfer.status)) return this.serialize(transfer);

    transfer.canceled = true;
    transfer.status = 'canceled';
    transfer.finishedAt = new Date().toISOString();

    transfer.activeRequest?.destroy(new Error('Transfer canceled'));
    transfer.activeResponse?.destroy(new Error('Transfer canceled'));
    transfer.activeWriter?.destroy(new Error('Transfer canceled'));
    for (const stream of transfer.activeStreams || []) {
      stream.destroy(new Error('Transfer canceled'));
    }
    if (transfer.tempPath) {
      fs.rm(transfer.tempPath, { force: true }, () => {});
    }

    this.emit(transfer);
    return this.serialize(transfer);
  }

  remove(id) {
    const transfer = this.transfers.get(id);
    if (!transfer) return false;
    if (!TERMINAL_STATES.has(transfer.status) && transfer.status !== 'ready') {
      const err = new Error('Stop the transfer before removing it');
      err.statusCode = 409;
      throw err;
    }
    this.transfers.delete(id);
    this.emitSnapshot();
    return true;
  }

  subscribe(res) {
    this.subscribers.add(res);
    res.write(`data: ${JSON.stringify({ type: 'snapshot', transfers: this.list() })}\n\n`);
    return () => this.subscribers.delete(res);
  }

  serialize(transfer) {
    const percent = transfer.totalBytes > 0
      ? Math.min(100, Math.round((transfer.processedBytes / transfer.totalBytes) * 100))
      : transfer.status === 'completed' ? 100 : 0;

    return {
      id: transfer.id,
      type: transfer.type,
      direction: transfer.direction,
      status: transfer.status,
      code: transfer.code,
      sources: transfer.sources || [],
      destinationDir: transfer.destinationDir || '',
      totalBytes: transfer.totalBytes || 0,
      processedBytes: transfer.processedBytes || 0,
      totalItems: transfer.totalItems || 0,
      processedItems: transfer.processedItems || 0,
      currentPath: transfer.currentPath || '',
      speedBps: transfer.speedBps || 0,
      etaSeconds: transfer.etaSeconds,
      peerName: transfer.peerName || '',
      peerAddress: transfer.peerAddress || '',
      error: transfer.error || '',
      createdAt: transfer.createdAt,
      startedAt: transfer.startedAt || null,
      finishedAt: transfer.finishedAt || null,
      percent
    };
  }

  emit(transfer) {
    const payload = JSON.stringify({ type: 'transfer', transfer: this.serialize(transfer) });
    for (const res of this.subscribers) {
      try {
        res.write(`data: ${payload}\n\n`);
      } catch {
        this.subscribers.delete(res);
      }
    }
  }

  emitSnapshot() {
    const payload = JSON.stringify({ type: 'snapshot', transfers: this.list() });
    for (const res of this.subscribers) {
      try {
        res.write(`data: ${payload}\n\n`);
      } catch {
        this.subscribers.delete(res);
      }
    }
  }

  async buildManifest(sources) {
    const roots = [];
    const entries = [];
    let totalBytes = 0;

    const walk = async (sourcePath, sourceId, relativePath = '') => {
      const stats = await fs.promises.lstat(sourcePath);
      if (stats.isSymbolicLink()) {
        const err = new Error(`Symbolic links are not supported: ${sourcePath}`);
        err.statusCode = 400;
        throw err;
      }

      if (stats.isDirectory()) {
        entries.push({
          id: makeId('entry'),
          sourceId,
          type: 'directory',
          relativePath,
          size: 0,
          absolutePath: sourcePath
        });
        for (const child of await fs.promises.readdir(sourcePath)) {
          await walk(path.join(sourcePath, child), sourceId, path.join(relativePath, child));
        }
      } else if (stats.isFile()) {
        entries.push({
          id: makeId('entry'),
          sourceId,
          type: 'file',
          relativePath,
          size: stats.size,
          absolutePath: sourcePath
        });
        totalBytes += stats.size;
      }
    };

    for (const sourcePath of sources) {
      const sourceId = makeId('source');
      const stats = await fs.promises.lstat(sourcePath);
      roots.push({
        id: sourceId,
        name: path.basename(sourcePath),
        type: stats.isDirectory() ? 'directory' : 'file'
      });
      await walk(sourcePath, sourceId);
    }

    return { roots, entries, totalBytes };
  }

  async startTransferServer() {
    if (this.transferServer) return;
    this.transferServer = http.createServer((req, res) => this.handleTransferRequest(req, res));

    await new Promise((resolve, reject) => {
      this.transferServer.once('error', reject);
      this.transferServer.listen(0, '0.0.0.0', () => {
        this.transferServer.off('error', reject);
        this.transferPort = this.transferServer.address().port;
        resolve();
      });
    });
  }

  async startDiscoverySocket() {
    if (this.discoverySocket) return;
    this.discoverySocket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    this.discoverySocket.on('message', (message, rinfo) => this.handleDiscoveryMessage(message, rinfo));
    this.discoverySocket.on('error', (err) => {
      console.warn('[PowerSend] UDP discovery error:', err.message);
    });

    await new Promise((resolve, reject) => {
      this.discoverySocket.once('error', reject);
      this.discoverySocket.bind(this.discoveryPort, '0.0.0.0', () => {
        this.discoverySocket.off('error', reject);
        this.discoverySocket.setBroadcast(true);
        resolve();
      });
    });
  }

  handleDiscoveryMessage(message, rinfo) {
    let payload;
    try {
      payload = JSON.parse(message.toString('utf8'));
    } catch {
      return;
    }

    if (payload.type === 'powersend-query' && payload.codeHash) {
      const offer = this.findLatestOffer(payload.codeHash);
      if (!offer) return;

      const response = Buffer.from(JSON.stringify({
        type: 'powersend-offer',
        codeHash: offer.codeHash,
        offerId: offer.id,
        port: this.transferPort,
        token: offer.accessToken,
        machineName: os.hostname(),
        totalBytes: offer.totalBytes,
        totalItems: offer.totalItems
      }));
      this.discoverySocket.send(response, rinfo.port, rinfo.address);
      return;
    }

    if (payload.type === 'powersend-offer' && payload.codeHash) {
      const pendingSet = this.pendingDiscoveries.get(payload.codeHash);
      if (pendingSet) {
        for (const pending of Array.from(pendingSet)) {
          pending.resolve({ ...payload, address: rinfo.address });
        }
      }
    }
  }

  discover(codeHashValue, timeoutMs = 8000) {
    return new Promise(async (resolve, reject) => {
      try {
        await this.ensureStarted();
      } catch (err) {
        reject(err);
        return;
      }

      let interval;
      let timeout;
      const cleanup = () => {
        clearInterval(interval);
        clearTimeout(timeout);
        const pendingSet = this.pendingDiscoveries.get(codeHashValue);
        pendingSet?.delete(pending);
        if (pendingSet?.size === 0) {
          this.pendingDiscoveries.delete(codeHashValue);
        }
      };
      const pending = {
        resolve: (offer) => {
          cleanup();
          resolve(offer);
        }
      };
      const pendingSet = this.pendingDiscoveries.get(codeHashValue) || new Set();
      pendingSet.add(pending);
      this.pendingDiscoveries.set(codeHashValue, pendingSet);

      const sendQuery = () => {
        const message = Buffer.from(JSON.stringify({
          type: 'powersend-query',
          codeHash: codeHashValue,
          machineName: os.hostname()
        }));
        for (const address of getBroadcastAddresses()) {
          this.discoverySocket.send(message, this.discoveryPort, address, () => {});
        }
      };

      sendQuery();
      interval = setInterval(sendQuery, 900);
      timeout = setTimeout(() => {
        cleanup();
        const err = new Error('No sender with this code was found on the LAN');
        err.statusCode = 404;
        reject(err);
      }, timeoutMs);
    });
  }

  handleTransferRequest(req, res) {
    const requestUrl = new URL(req.url, 'http://localhost');
    const parts = requestUrl.pathname.split('/').filter(Boolean);
    if (parts[0] !== 'powersend' || parts.length < 3) {
      res.writeHead(404).end();
      return;
    }

    const action = parts[1];
    const offerId = parts[2];
    const offer = this.transfers.get(offerId);
    const token = req.headers['x-powersend-token'];
    if (!offer || offer.type !== 'outgoing' || token !== offer.accessToken || offer.canceled) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid or expired Power Send token' }));
      return;
    }

    if (action === 'manifest' && req.method === 'GET') {
      const sessionId = String(req.headers['x-powersend-session'] || makeId('session'));
      this.outgoingSessions.set(sessionId, {
        id: sessionId,
        offerId,
        startedAt: Date.now(),
        processedBytes: 0,
        processedItems: 0
      });
      offer.status = 'sending';
      offer.startedAt = new Date().toISOString();
      offer.finishedAt = null;
      offer.processedBytes = 0;
      offer.processedItems = 0;
      offer.peerAddress = req.socket.remoteAddress || '';
      offer.peerName = String(req.headers['x-powersend-machine'] || '');
      this.emit(offer);

      const body = JSON.stringify({
        offerId,
        roots: offer.roots,
        entries: offer.entries.map(entry => ({
          id: entry.id,
          sourceId: entry.sourceId,
          type: entry.type,
          relativePath: entry.relativePath.replace(/\\/g, '/'),
          size: entry.size
        })),
        totalBytes: offer.totalBytes,
        totalItems: offer.totalItems,
        machineName: os.hostname()
      });
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(body)
      });
      res.end(body);
      return;
    }

    if (action === 'file' && req.method === 'GET' && parts[3]) {
      const entry = offer.entries.find(item => item.id === parts[3] && item.type === 'file');
      if (!entry || !fs.existsSync(entry.absolutePath)) {
        res.writeHead(404).end();
        return;
      }
      const sessionId = String(req.headers['x-powersend-session'] || '');
      const session = this.outgoingSessions.get(sessionId);
      if (!session || session.offerId !== offerId) {
        res.writeHead(409).end();
        return;
      }

      offer.currentPath = entry.relativePath || path.basename(entry.absolutePath);
      const stream = fs.createReadStream(entry.absolutePath);
      offer.activeStreams.add(stream);
      let streamCompleted = false;
      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Length': entry.size
      });

      stream.on('data', chunk => {
        session.processedBytes += chunk.length;
        offer.processedBytes = Math.min(offer.totalBytes, session.processedBytes);
        this.updateThroughput(offer, session.startedAt);
        this.emit(offer);
      });
      stream.on('end', () => {
        streamCompleted = true;
        session.processedItems += 1;
        offer.processedItems = session.processedItems;
        offer.activeStreams.delete(stream);
        this.emit(offer);
      });
      stream.on('error', err => {
        offer.activeStreams.delete(stream);
        offer.status = offer.canceled ? 'canceled' : 'failed';
        offer.error = err.message;
        offer.finishedAt = new Date().toISOString();
        this.emit(offer);
        if (!res.headersSent) res.writeHead(500);
        res.end(err.message);
      });
      res.on('close', () => {
        if (!streamCompleted && !stream.destroyed) {
          stream.destroy(new Error('Receiver disconnected'));
        }
        offer.activeStreams.delete(stream);
      });
      stream.pipe(res);
      return;
    }

    if (action === 'complete' && req.method === 'POST') {
      const sessionId = String(req.headers['x-powersend-session'] || '');
      this.outgoingSessions.delete(sessionId);
      offer.status = 'completed';
      offer.processedBytes = offer.totalBytes;
      offer.processedItems = offer.totalItems;
      offer.currentPath = '';
      offer.speedBps = 0;
      offer.etaSeconds = 0;
      offer.finishedAt = new Date().toISOString();
      this.emit(offer);
      res.writeHead(204).end();
      return;
    }

    res.writeHead(404).end();
  }

  async runReceive(id) {
    const transfer = this.transfers.get(id);
    if (!transfer) return;

    try {
      const peer = await this.discover(transfer.codeHash);
      this.throwIfCanceled(transfer);
      transfer.status = 'connecting';
      transfer.peerName = peer.machineName || '';
      transfer.peerAddress = `${peer.address}:${peer.port}`;
      this.emit(transfer);

      const sessionId = makeId('session');
      const headers = {
        'x-powersend-token': peer.token,
        'x-powersend-session': sessionId,
        'x-powersend-machine': os.hostname()
      };
      const baseUrl = `http://${peer.address}:${peer.port}/powersend`;
      const manifest = await this.requestJson(`${baseUrl}/manifest/${peer.offerId}`, headers, transfer);
      this.throwIfCanceled(transfer);

      transfer.status = 'receiving';
      transfer.totalBytes = Number(manifest.totalBytes || 0);
      transfer.totalItems = Number(manifest.totalItems || manifest.entries.length);
      transfer.roots = manifest.roots || [];
      transfer.startedAt = new Date().toISOString();
      const startedAtMs = Date.now();
      this.emit(transfer);

      const rootDestinations = new Map();
      const reservedDestinations = new Set();
      for (const root of manifest.roots || []) {
        const destination = reserveDestination(transfer.destinationDir, root.name, reservedDestinations);
        rootDestinations.set(root.id, destination);
        if (root.type === 'directory') {
          fs.mkdirSync(destination, { recursive: true });
        }
      }

      const directories = manifest.entries.filter(entry => entry.type === 'directory');
      const files = manifest.entries.filter(entry => entry.type === 'file');

      for (const entry of directories) {
        this.throwIfCanceled(transfer);
        const rootDestination = rootDestinations.get(entry.sourceId);
        if (!rootDestination) throw new Error('Invalid root in sender manifest');
        const targetPath = path.resolve(rootDestination, ...safeRelativeParts(entry.relativePath));
        if (targetPath !== path.resolve(rootDestination) && !targetPath.startsWith(`${path.resolve(rootDestination)}${path.sep}`)) {
          throw new Error('Unsafe destination path received from peer');
        }
        fs.mkdirSync(targetPath, { recursive: true });
        transfer.processedItems += 1;
      }

      for (const entry of files) {
        this.throwIfCanceled(transfer);
        const rootDestination = rootDestinations.get(entry.sourceId);
        if (!rootDestination) throw new Error('Invalid root in sender manifest');
        const relativeParts = safeRelativeParts(entry.relativePath);
        const targetPath = relativeParts.length === 0
          ? path.resolve(rootDestination)
          : path.resolve(rootDestination, ...relativeParts);
        if (targetPath !== path.resolve(rootDestination) && !targetPath.startsWith(`${path.resolve(rootDestination)}${path.sep}`)) {
          throw new Error('Unsafe destination path received from peer');
        }
        transfer.currentPath = entry.relativePath || path.basename(targetPath);
        await this.downloadFile(
          `${baseUrl}/file/${peer.offerId}/${entry.id}`,
          headers,
          targetPath,
          transfer,
          startedAtMs
        );
        transfer.processedItems += 1;
        this.emit(transfer);
      }

      await this.requestEmpty(`${baseUrl}/complete/${peer.offerId}`, 'POST', headers, transfer);
      transfer.status = 'completed';
      transfer.processedBytes = transfer.totalBytes;
      transfer.processedItems = transfer.totalItems;
      transfer.currentPath = '';
      transfer.speedBps = 0;
      transfer.etaSeconds = 0;
      transfer.finishedAt = new Date().toISOString();
      this.emit(transfer);
    } catch (err) {
      if (transfer.tempPath) {
        fs.rmSync(transfer.tempPath, { force: true });
      }
      if (!transfer.canceled) {
        transfer.status = 'failed';
        transfer.error = err.message;
        transfer.finishedAt = new Date().toISOString();
        this.emit(transfer);
      }
    } finally {
      transfer.activeRequest = null;
      transfer.activeResponse = null;
      transfer.activeWriter = null;
      transfer.tempPath = '';
    }
  }

  requestJson(url, headers, transfer) {
    return new Promise((resolve, reject) => {
      const req = http.get(url, { headers }, res => {
        transfer.activeResponse = res;
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
          transfer.activeResponse = null;
          if (res.statusCode !== 200) {
            reject(new Error(`Sender returned HTTP ${res.statusCode}`));
            return;
          }
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
          } catch {
            reject(new Error('Sender returned an invalid manifest'));
          }
        });
      });
      transfer.activeRequest = req;
      req.on('error', reject);
    });
  }

  requestEmpty(url, method, headers, transfer) {
    return new Promise((resolve, reject) => {
      const req = http.request(url, { method, headers }, res => {
        transfer.activeResponse = res;
        res.resume();
        res.on('end', () => {
          transfer.activeResponse = null;
          if (res.statusCode >= 200 && res.statusCode < 300) resolve();
          else reject(new Error(`Sender returned HTTP ${res.statusCode}`));
        });
      });
      transfer.activeRequest = req;
      req.on('error', reject);
      req.end();
    });
  }

  downloadFile(url, headers, targetPath, transfer, startedAtMs) {
    return new Promise((resolve, reject) => {
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      const tempPath = `${targetPath}.powersend-${transfer.id}.part`;
      transfer.tempPath = tempPath;
      const writer = fs.createWriteStream(tempPath);
      transfer.activeWriter = writer;
      let settled = false;

      const fail = (err) => {
        if (settled) return;
        settled = true;
        writer.destroy();
        fs.rm(tempPath, { force: true }, () => reject(err));
      };

      const req = http.get(url, { headers }, res => {
        transfer.activeResponse = res;
        if (res.statusCode !== 200) {
          res.resume();
          fail(new Error(`Sender returned HTTP ${res.statusCode}`));
          return;
        }

        res.on('data', chunk => {
          transfer.processedBytes += chunk.length;
          this.updateThroughput(transfer, startedAtMs);
          this.emit(transfer);
        });
        res.on('error', fail);
        writer.on('error', fail);
        writer.on('finish', () => {
          if (settled) return;
          settled = true;
          writer.close(() => {
            fs.renameSync(tempPath, targetPath);
            transfer.tempPath = '';
            transfer.activeWriter = null;
            transfer.activeResponse = null;
            resolve();
          });
        });
        res.pipe(writer);
      });

      transfer.activeRequest = req;
      req.on('error', fail);
    });
  }

  updateThroughput(transfer, startedAtMs) {
    const elapsedSeconds = Math.max(1, (Date.now() - startedAtMs) / 1000);
    transfer.speedBps = Math.round(transfer.processedBytes / elapsedSeconds);
    const remainingBytes = Math.max(0, transfer.totalBytes - transfer.processedBytes);
    transfer.etaSeconds = transfer.speedBps > 0
      ? Math.ceil(remainingBytes / transfer.speedBps)
      : null;
  }

  throwIfCanceled(transfer) {
    if (transfer.canceled) {
      throw new Error('Transfer canceled');
    }
  }
}

module.exports = {
  PowerSendService,
  hashCode,
  normalizeCode,
  getBroadcastAddresses,
  safeRelativeParts
};
