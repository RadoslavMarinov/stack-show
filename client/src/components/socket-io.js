import io from "socket.io-client";
// const socket = io("http://localhost:3000");
const socket = io("https://electricity-manager1.herokuapp.com/");

socket.on("connect", () => {
  console.log("Greetings from server: ");
});

socket.on("greeting", data => {
  console.log("DATA:", data);
});

export { socket };
