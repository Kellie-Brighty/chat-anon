import { WebSocketServer } from "ws";

// Create the WebSocket server
const PORT = process.env.PORT || 4000;
const wss = new WebSocketServer({ port: PORT });

// Log a message when the server starts
console.log(`WebSocket server is running on ws://localhost:${PORT}`);

// Arrays to manage clients for specific actions
const clients = []; // General clients for searching (text chat)
const videoClients = []; // Separate clients for video calls

wss.on("connection", (ws) => {
  ws.on("message", (message) => {
    const data = JSON.parse(message);

    // Handle search event for text
    if (data.action === "search") {
      // Add the user to the clients array with their WebSocket and location
      clients.push({ ws, location: data.location });
      console.log("New user searching for text chat:", data.location);

      // Pair users if at least two are searching
      if (clients.length >= 2) {
        const [user1, user2] = clients.splice(0, 2);

        // Assign partners
        user1.ws.partner = user2.ws;
        user2.ws.partner = user1.ws;

        // Notify both users that a match was found
        user1.ws.send(JSON.stringify({ action: "match_found", type: "text" }));
        user2.ws.send(JSON.stringify({ action: "match_found", type: "text" }));

        console.log("Match found for text chat between two users.");
      }
    }

    // Handle video call initialization
    else if (data.action === "video_call") {
      // Add the user to the videoClients array with their WebSocket and location
      videoClients.push({ ws, location: data.location });
      console.log("New user searching for video call:", data.location);

      // Pair users if at least two are searching for video calls
      if (videoClients.length >= 2) {
        const [user1, user2] = videoClients.splice(0, 2);

        // Assign partners
        user1.ws.partner = user2.ws;
        user2.ws.partner = user1.ws;

        // Notify both users that a video call match was found
        user1.ws.send(
          JSON.stringify({ action: "match_found", type: "video_call" })
        );
        user2.ws.send(
          JSON.stringify({ action: "match_found", type: "video_call" })
        );

        console.log("Match found for video call between two users.");
      }
    }

    // Handle sending a message during a text chat or video call
    else if (data.action === "send_message") {
      console.log("Message sent:", data.message);

      // Check if the sender has a partner
      if (ws.partner) {
        ws.partner.send(
          JSON.stringify({ action: "message", message: data.message })
        );
      } else {
        console.log("No partner found for this user.");
      }
    }

    // Handle video offer for WebRTC handshake
    else if (data.action === "video_offer") {
      console.log("Video offer received.");
      if (ws.partner) {
        // Forward the video offer to the partner
        ws.partner.send(
          JSON.stringify({ action: "video_offer", offer: data.offer })
        );
      }
    }

    // Handle video answer for WebRTC handshake
    else if (data.action === "video_answer") {
      console.log("Video answer received.");
      if (ws.partner) {
        // Forward the video answer to the partner
        ws.partner.send(
          JSON.stringify({ action: "video_answer", answer: data.answer })
        );
      }
    }

    // Handle ICE candidates for WebRTC
    else if (data.action === "ice_candidate") {
      console.log("ICE candidate received.");
      if (ws.partner) {
        // Forward the ICE candidate to the partner
        ws.partner.send(
          JSON.stringify({ action: "ice_candidate", candidate: data.candidate })
        );
      }
    }
  });

  ws.on("close", () => {
    if (ws.partner) {
      // Notify the partner that the user has disconnected
      ws.partner.send(JSON.stringify({ action: "partner_disconnected" }));
      ws.partner.partner = null; // Remove the reverse link
    }

    // Remove the disconnected user from the clients array
    const clientIndex = clients.findIndex((client) => client.ws === ws);
    if (clientIndex !== -1) clients.splice(clientIndex, 1);

    // Remove the disconnected user from the videoClients array
    const videoClientIndex = videoClients.findIndex(
      (client) => client.ws === ws
    );
    if (videoClientIndex !== -1) videoClients.splice(videoClientIndex, 1);

    console.log("User disconnected.");
  });
});
