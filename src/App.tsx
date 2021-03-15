import type { FC } from "react";
import { useEffect, useRef, useState } from "react";

const App: FC = () => {
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const peerRef = useRef<RTCPeerConnection | undefined>(undefined);

  const [
    localSessionDescription,
    setLocalSessionDescription,
  ] = useState<RTCSessionDescriptionInit | null>(null);
  const [
    rawRemoteSessionDescription,
    setRawRemoteSessionDescription,
  ] = useState("");

  const [localIceCandidate, setLocalIceCandidate] = useState<
    Array<RTCIceCandidateInit>
  >([]);
  const [rawRemoteIceCandidate, setRawRemoteIceCandidate] = useState("");

  useEffect(() => {
    (async () => {
      if (localAudioRef.current === null || remoteAudioRef.current === null) {
        return;
      }

      const localMediaStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      localAudioRef.current.srcObject = localMediaStream;

      const peer = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      peerRef.current = peer;

      localMediaStream
        .getTracks()
        .forEach((track) => peer.addTrack(track, localMediaStream));

      peer.addEventListener("icecandidate", (event) => {
        const candidate = event.candidate;
        if (candidate === null) return;
        setLocalIceCandidate((prev) => [...prev, candidate.toJSON()]);
      });

      peer.addEventListener("track", (event) => {
        const stream = event.streams[0];
        if (stream === undefined || remoteAudioRef.current === null) return;
        remoteAudioRef.current.srcObject = stream;
      });
    })();
  }, [localAudioRef, remoteAudioRef]);

  const handleGenerateSdpOffer = async () => {
    const peer = peerRef.current;
    if (peer === undefined) return;
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);

    setLocalSessionDescription(offer);
  };

  const handleReceiveSessionDescription = async () => {
    const peer = peerRef.current;
    if (peer === undefined) return;
    const sessionDescription: RTCSessionDescriptionInit = JSON.parse(
      rawRemoteSessionDescription,
    );
    switch (sessionDescription.type) {
      case "offer": {
        await peer.setRemoteDescription(sessionDescription);
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);

        setLocalSessionDescription(answer);
        break;
      }
      case "answer": {
        await peer.setRemoteDescription(sessionDescription);
        break;
      }
    }
  };

  const handleReceiveIceCandidate = () => {
    const peer = peerRef.current;
    if (peer === undefined) return;
    const iceCandidateArray: Array<RTCIceCandidateInit> = JSON.parse(
      rawRemoteIceCandidate,
    );
    iceCandidateArray.forEach((iceCandidate) => {
      peer.addIceCandidate(iceCandidate).catch(console.error);
    });
  };

  return (
    <div>
      <div>
        <audio ref={localAudioRef} autoPlay muted />
      </div>
      <div>
        <audio ref={remoteAudioRef} autoPlay />
      </div>
      <div>
        <textarea
          value={JSON.stringify(localSessionDescription, null, 2)}
          rows={10}
          readOnly
        />
        <textarea
          value={rawRemoteSessionDescription}
          onChange={({ target }) =>
            setRawRemoteSessionDescription(target.value)
          }
          rows={10}
        />
        <button onClick={handleGenerateSdpOffer}>Offer生成</button>
        <button onClick={handleReceiveSessionDescription}>
          Session Description受け取り
        </button>
      </div>
      <div>
        <textarea
          value={JSON.stringify(localIceCandidate, null, 2)}
          rows={10}
          readOnly
        />
        <textarea
          value={rawRemoteIceCandidate}
          onChange={({ target }) => setRawRemoteIceCandidate(target.value)}
          rows={10}
        />
        <button onClick={handleReceiveIceCandidate}>
          ICE Candidate受け取り
        </button>
      </div>
    </div>
  );
};

export default App;
