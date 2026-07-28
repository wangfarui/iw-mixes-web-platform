export type RemoteShareSlot = 'A' | 'B'

export class RemoteSharePeer {
  private readonly peer = new RTCPeerConnection({ iceServers: [] })
  private socket?: WebSocket
  private channel?: RTCDataChannel

  constructor(private readonly roomId: string, private readonly capability: string, private readonly slot: RemoteShareSlot,
              private readonly onPayload: (payload: string) => void, private readonly onReady: () => void) {
    this.peer.onicecandidate = ({ candidate }) => { if (candidate) this.signal({ type: 'candidate', candidate }) }
    this.peer.ondatachannel = ({ channel }) => this.bind(channel)
  }

  connect() {
    const base = new URL(window.location.href)
    base.protocol = base.protocol === 'https:' ? 'wss:' : 'ws:'
    base.pathname = '/external-service/wb/remote-share'
    base.search = new URLSearchParams({ room: this.roomId, capability: this.capability }).toString()
    base.hash = ''
    this.socket = new WebSocket(base)
    this.socket.onmessage = ({ data }) => this.handleSignal(JSON.parse(String(data)))
    this.socket.onopen = async () => {
      if (this.slot !== 'A') return
      this.bind(this.peer.createDataChannel('remote-share', { ordered: true }))
      const offer = await this.peer.createOffer()
      await this.peer.setLocalDescription(offer)
      this.signal({ type: 'offer', sdp: offer })
    }
  }

  send(payload: string) { if (this.channel?.readyState === 'open') this.channel.send(payload); else throw new Error('局域网直连尚未建立') }
  isOpen() { return this.channel?.readyState === 'open' }
  close() { this.channel?.close(); this.peer.close(); this.socket?.close() }

  private bind(channel: RTCDataChannel) {
    this.channel = channel
    channel.onopen = () => this.onReady()
    channel.onmessage = ({ data }) => this.onPayload(String(data))
  }

  private signal(payload: unknown) { if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(payload)) }
  private async handleSignal(message: any) {
    if (message.type === 'offer' && this.slot === 'B') {
      await this.peer.setRemoteDescription(message.sdp)
      const answer = await this.peer.createAnswer()
      await this.peer.setLocalDescription(answer)
      this.signal({ type: 'answer', sdp: answer })
    } else if (message.type === 'answer' && this.slot === 'A') await this.peer.setRemoteDescription(message.sdp)
    else if (message.type === 'candidate') await this.peer.addIceCandidate(message.candidate)
  }
}
