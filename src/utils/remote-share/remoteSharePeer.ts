export type RemoteShareSlot = 'A' | 'B'
const DIRECT_FRAME_BYTES = 16 * 1024

export class RemoteSharePeer {
  private readonly peer = new RTCPeerConnection({ iceServers: [] })
  private socket?: WebSocket
  private channel?: RTCDataChannel
  private incoming?: { manifest: string; sizes: number[]; parts: Uint8Array[]; frames: Uint8Array[]; frameBytes: number }
  private readonly pendingCandidates: RTCIceCandidateInit[] = []
  private signalQueue = Promise.resolve()
  private readonly readyWaiters: Array<(ready: boolean) => void> = []

  constructor(private readonly roomId: string, private readonly capability: string, private readonly slot: RemoteShareSlot,
              private readonly onPayload: (payload: string) => void, private readonly onReady: () => void,
              private readonly onFile: (manifest: string, chunks: Uint8Array[]) => void) {
    this.peer.onicecandidate = ({ candidate }) => { if (candidate) this.signal({ type: 'candidate', candidate }) }
    this.peer.ondatachannel = ({ channel }) => this.bind(channel)
  }

  connect() {
    const base = new URL(import.meta.env.VITE_BUILD_ENV === 'prod' ? 'https://api.itwray.com' : window.location.origin)
    base.protocol = base.protocol === 'https:' ? 'wss:' : 'ws:'
    base.pathname = '/external-service/wb/remote-share'
    base.search = new URLSearchParams({ room: this.roomId, capability: this.capability }).toString()
    base.hash = ''
    this.socket = new WebSocket(base)
    this.socket.onmessage = ({ data }) => {
      this.signalQueue = this.signalQueue.then(() => this.handleSignal(JSON.parse(String(data)))).catch(() => undefined)
    }
    this.socket.onopen = async () => {
      if (this.slot !== 'A') return
      this.bind(this.peer.createDataChannel('remote-share', { ordered: true }))
      const offer = await this.peer.createOffer()
      await this.peer.setLocalDescription(offer)
      this.signal({ type: 'offer', sdp: offer })
    }
  }

  send(payload: string) { if (this.channel?.readyState === 'open') this.channel.send(payload); else throw new Error('局域网直连尚未建立') }
  sendRelay(payload: string) { if (this.socket?.readyState === WebSocket.OPEN) this.signal({ type: 'relay-text', ciphertext: payload }); else throw new Error('会话连接尚未建立') }
  isRelayOpen() { return this.socket?.readyState === WebSocket.OPEN }
  async sendFile(manifest: string, chunks: Uint8Array[]) {
    if (!this.isOpen()) throw new Error('局域网直连尚未建立')
    this.channel!.send(JSON.stringify({ kind: 'file-start', manifest, sizes: chunks.map(chunk => chunk.byteLength) }))
    for (const chunk of chunks) {
      for (let offset = 0; offset < chunk.byteLength; offset += DIRECT_FRAME_BYTES) {
        await this.waitForBuffer()
        this.channel!.send(chunk.slice(offset, Math.min(chunk.byteLength, offset + DIRECT_FRAME_BYTES)))
      }
    }
  }
  isOpen() { return this.channel?.readyState === 'open' }
  close() { this.channel?.close(); this.peer.close(); this.socket?.close() }
  waitForReady(timeoutMs: number) {
    if (this.isOpen()) return Promise.resolve(true)
    return new Promise<boolean>(resolve => {
      const timer = window.setTimeout(() => {
        const index = this.readyWaiters.indexOf(waiter)
        if (index >= 0) this.readyWaiters.splice(index, 1)
        resolve(false)
      }, timeoutMs)
      const waiter = (ready: boolean) => { window.clearTimeout(timer); resolve(ready) }
      this.readyWaiters.push(waiter)
    })
  }

  private bind(channel: RTCDataChannel) {
    this.channel = channel
    channel.binaryType = 'arraybuffer'
    channel.bufferedAmountLowThreshold = 256 * 1024
    channel.onopen = () => {
      this.onReady()
      this.readyWaiters.splice(0).forEach(waiter => waiter(true))
    }
    channel.onmessage = ({ data }) => {
      if (typeof data === 'string') {
        try {
          const control = JSON.parse(data)
          if (control.kind === 'file-start' && Array.isArray(control.sizes) && control.sizes.every((size: unknown) => typeof size === 'number' && Number.isInteger(size) && size > 0 && size <= 1024 * 1024 + 64)) {
            this.incoming = { manifest: control.manifest, sizes: control.sizes, parts: [], frames: [], frameBytes: 0 }
            return
          }
        } catch { /* encrypted text is opaque and forwarded below */ }
        this.onPayload(data)
      } else if (this.incoming) {
        const part = new Uint8Array(data as ArrayBuffer)
        this.acceptFrame(part)
      }
    }
  }

  private acceptFrame(frame: Uint8Array) {
    const incoming = this.incoming!
    const expected = incoming.sizes[incoming.parts.length]
    incoming.frames.push(frame)
    incoming.frameBytes += frame.byteLength
    if (incoming.frameBytes > expected) { this.incoming = undefined; return }
    if (incoming.frameBytes < expected) return
    const chunk = new Uint8Array(expected)
    let offset = 0
    incoming.frames.forEach(part => { chunk.set(part, offset); offset += part.byteLength })
    incoming.parts.push(chunk)
    incoming.frames = []
    incoming.frameBytes = 0
    if (incoming.parts.length === incoming.sizes.length) {
      this.incoming = undefined
      this.onFile(incoming.manifest, incoming.parts)
    }
  }

  private async waitForBuffer() {
    if (!this.channel || this.channel.bufferedAmount <= 512 * 1024) return
    await new Promise<void>((resolve, reject) => {
      const channel = this.channel!
      const timer = window.setTimeout(() => reject(new Error('局域网直连传输超时')), 15_000)
      channel.onbufferedamountlow = () => {
        window.clearTimeout(timer)
        resolve()
      }
    })
  }

  private signal(payload: unknown) { if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(payload)) }
  private async handleSignal(message: any) {
    if (message.type === 'relay-text' && typeof message.ciphertext === 'string') { this.onPayload(message.ciphertext); return }
    if (message.type === 'offer' && this.slot === 'B') {
      await this.peer.setRemoteDescription(message.sdp)
      await this.flushCandidates()
      const answer = await this.peer.createAnswer()
      await this.peer.setLocalDescription(answer)
      this.signal({ type: 'answer', sdp: answer })
    } else if (message.type === 'answer' && this.slot === 'A') {
      await this.peer.setRemoteDescription(message.sdp)
      await this.flushCandidates()
    } else if (message.type === 'candidate') {
      if (this.peer.remoteDescription) await this.peer.addIceCandidate(message.candidate)
      else this.pendingCandidates.push(message.candidate)
    }
  }

  private async flushCandidates() {
    while (this.pendingCandidates.length) await this.peer.addIceCandidate(this.pendingCandidates.shift()!)
  }
}
