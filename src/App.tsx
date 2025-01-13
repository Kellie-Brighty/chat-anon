import { useEffect, useState, useRef } from "react";

const App = () => {
  const [ip, setIp] = useState<string | null>(null);
  const [status, setStatus] = useState("idle"); // idle, searching, chatting, video_call
  const [messages, setMessages] = useState<{ text: string; fromMe: boolean }[]>(
    []
  );
  const [input, setInput] = useState("");
  const [ws, setWs] = useState<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Video Call State
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [peerConnection, setPeerConnection] =
    useState<RTCPeerConnection | null>(null);

  // WebRTC configuration
  const rtcConfig = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" }, // Public STUN server
    ],
  };

  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const res = await fetch("https://ipapi.co/json/");
        const data = await res.json();
        setIp(data.country_name || "an unknown location");
        console.log("country data:::", data);
      } catch (err) {
        console.error("Error fetching location:", err);
        setIp("an unknown location");
      }
    };

    fetchLocation();
  }, []);

  useEffect(() => {
    // Scroll to the bottom whenever messages change
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const initializeWebSocket = (action: string) => {
    if (!ip) return;

    const socket = new WebSocket("ws://localhost:4000"); // Replace with your WebSocket server URL
    setWs(socket);
    setStatus("searching");

    socket.onopen = () => {
      console.log("Connected to WebSocket server");
      socket.send(JSON.stringify({ action, location: ip }));
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.action === "match_found") {
        setStatus(action === "search" ? "chatting" : "video_call");
        console.log("Match found! Start chatting or video call.");
        if (action === "video_call") initializeVideoCall(socket);
      } else if (data.action === "message") {
        setMessages((prev) => [
          ...prev,
          { text: `User: ${data.message}`, fromMe: false },
        ]);
      } else if (data.action === "video_offer") {
        handleVideoOffer(data.offer);
      } else if (data.action === "video_answer") {
        handleVideoAnswer(data.answer);
      } else if (data.action === "ice_candidate") {
        handleNewICECandidate(data.candidate);
      } else if (data.action === "partner_disconnected") {
        handlePartnerDisconnected();
      }
    };

    socket.onclose = () => {
      console.log("WebSocket connection closed");
      setStatus("idle");
    };
  };

  const handleStartText = () => {
    initializeWebSocket("search");
  };

  const handleStartVideo = () => {
    initializeWebSocket("video_call");
  };

  const initializeVideoCall = async (socket: WebSocket) => {
    const localMediaStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    setLocalStream(localMediaStream);

    const pc = new RTCPeerConnection(rtcConfig);
    localMediaStream
      .getTracks()
      .forEach((track) => pc.addTrack(track, localMediaStream));

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.send(
          JSON.stringify({
            action: "ice_candidate",
            candidate: event.candidate,
          })
        );
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socket.send(JSON.stringify({ action: "video_offer", offer }));

    setPeerConnection(pc);
  };

  const handleVideoOffer = async (offer: RTCSessionDescriptionInit) => {
    if (!ws) return;

    const localMediaStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    setLocalStream(localMediaStream);

    const pc = new RTCPeerConnection(rtcConfig);
    localMediaStream
      .getTracks()
      .forEach((track) => pc.addTrack(track, localMediaStream));

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        ws.send(
          JSON.stringify({
            action: "ice_candidate",
            candidate: event.candidate,
          })
        );
      }
    };

    await pc.setRemoteDescription(offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    ws.send(JSON.stringify({ action: "video_answer", answer }));

    setPeerConnection(pc);
  };

  const handleVideoAnswer = async (answer: RTCSessionDescriptionInit) => {
    if (peerConnection) {
      await peerConnection.setRemoteDescription(answer);
    }
  };

  const handleNewICECandidate = async (candidate: RTCIceCandidateInit) => {
    if (peerConnection) {
      await peerConnection.addIceCandidate(candidate);
    }
  };

  const handlePartnerDisconnected = () => {
    setMessages((prev) => [
      ...prev,
      { text: "Your partner has disconnected.", fromMe: false },
    ]);
    setLocalStream(null);
    setRemoteStream(null);
    setPeerConnection(null);
    setStatus("idle");
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && ws) {
      setMessages((prev) => [...prev, { text: `You: ${input}`, fromMe: true }]);
      ws.send(JSON.stringify({ action: "send_message", message: input }));
      setInput("");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-gray-900 to-black text-white">
      <div className="w-full max-w-md sm:max-w-sm md:max-w-lg lg:max-w-xl bg-blue-800/90 rounded-lg shadow-lg p-4">
        <header className="p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-center text-xl font-bold rounded-t-lg">
          Chat Anon
        </header>

        <main className="space-y-4">
          {status === "idle" && (
            <div className="flex flex-col items-center space-y-4">
              <p className="text-center text-gray-300">
                Click the button to start chatting anonymously.
              </p>
              <button
                onClick={handleStartText}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-teal-400 rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                Start Text
              </button>
              <button
                onClick={handleStartVideo}
                className="px-6 py-3 bg-gradient-to-r from-teal-400 to-green-500 rounded-lg"
              >
                Start Video
              </button>
            </div>
          )}

          {status === "searching" && (
            <div className="flex flex-col items-center space-y-4">
              <p className="text-center text-gray-300">
                Searching for a match...
              </p>
              <div className="w-12 h-12 border-4 border-t-transparent border-blue-400 rounded-full animate-spin"></div>
            </div>
          )}

          {status === "chatting" && (
            <div>
              <div className="h-64 overflow-y-auto p-2 bg-blue-900/50 rounded-lg shadow-inner space-y-2">
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`p-2 rounded-lg max-w-[80%] ${
                      msg.fromMe
                        ? "bg-blue-700 ml-auto rounded-br-xl rounded-bl-xl" // For user messages, right aligned
                        : "bg-blue-600 mr-auto rounded-tr-xl rounded-tl-xl" // For partner messages, left aligned
                    }`}
                  >
                    {msg.text}
                  </div>
                ))}
                {messages.length === 0 && (
                  <p className="text-gray-400 text-center">
                    You have been connected with an anonymous user from {ip}
                  </p>
                )}
                {/* Invisible div for scrolling */}
                <div ref={messagesEndRef} />
              </div>
              <form
                className="mt-4 flex flex-col sm:flex-row items-center space-x-2"
                onSubmit={handleSendMessage}
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-grow px-4 py-2 bg-blue-800 text-white rounded-lg focus:outline-none"
                />
                <button
                  className="px-4 py-2 bg-gradient-to-r from-teal-400 to-blue-500 rounded-lg font-medium hover:opacity-90 transition-opacity mt-2 sm:mt-0"
                  type="submit"
                >
                  Send
                </button>
              </form>
            </div>
          )}

          {status === "video_call" && (
            <div className="space-y-4">
              <div className="video-container flex space-x-4">
                <video
                  autoPlay
                  muted
                  playsInline
                  ref={(video) => {
                    if (video && localStream) video.srcObject = localStream;
                  }}
                  className="w-1/2 rounded-lg"
                />
                <video
                  autoPlay
                  playsInline
                  ref={(video) => {
                    if (video && remoteStream) video.srcObject = remoteStream;
                  }}
                  className="w-1/2 rounded-lg"
                />
              </div>
              <p>You are in a video call!</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
