import { WebSocketServer } from "ws";

// Create the WebSocket server
// const PORT = process.env.PORT || 4000;
const PORT = process.env.PORT || 6000;
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
      videoClients.push({ ws, location: data.location });
      console.log("New user searching for video call:", data.location);

      if (videoClients.length >= 2) {
        const [user1, user2] = videoClients.splice(0, 2);

        user1.ws.partner = user2.ws;
        user2.ws.partner = user1.ws;

        user1.ws.send(
          JSON.stringify({ action: "match_found", type: "video_call" })
        );
        user2.ws.send(
          JSON.stringify({ action: "match_found", type: "video_call" })
        );

        console.log("Match found for video call between two users.");
      }
    }

    // Handle sending a message
    else if (data.action === "send_message") {
      console.log("Message sent:", data.message);

      if (ws.partner) {
        ws.partner.send(
          JSON.stringify({ action: "message", message: data.message })
        );
      } else {
        console.log("No partner found for this user.");
      }
    }

    // Handle typing state
    else if (data.action === "typing") {
      console.log("User is typing...");
      if (ws.partner) {
        // Notify the partner that the user is typing
        ws.partner.send(JSON.stringify({ action: "partner_typing" }));
      }
    }

    // Handle stop typing state
    else if (data.action === "stop_typing") {
      console.log("User stopped typing.");
      if (ws.partner) {
        // Notify the partner that the user stopped typing
        ws.partner.send(JSON.stringify({ action: "partner_stop_typing" }));
      }
    }

    // Handle video offer
    else if (data.action === "video_offer") {
      console.log("Video offer received.");
      if (ws.partner) {
        ws.partner.send(
          JSON.stringify({ action: "video_offer", offer: data.offer })
        );
      }
    }

    // Handle video answer
    else if (data.action === "video_answer") {
      console.log("Video answer received.");
      if (ws.partner) {
        ws.partner.send(
          JSON.stringify({ action: "video_answer", answer: data.answer })
        );
      }
    }

    // Handle ICE candidates
    else if (data.action === "ice_candidate") {
      console.log("ICE candidate received.");
      if (ws.partner) {
        ws.partner.send(
          JSON.stringify({ action: "ice_candidate", candidate: data.candidate })
        );
      }
    }
  });

  ws.on("close", () => {
    if (ws.partner) {
      ws.partner.send(JSON.stringify({ action: "partner_disconnected" }));
      ws.partner.partner = null;
    }

    const clientIndex = clients.findIndex((client) => client.ws === ws);
    if (clientIndex !== -1) clients.splice(clientIndex, 1);

    const videoClientIndex = videoClients.findIndex(
      (client) => client.ws === ws
    );
    if (videoClientIndex !== -1) videoClients.splice(videoClientIndex, 1);

    console.log("User disconnected.");
  });
});
