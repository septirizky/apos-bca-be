const express = require("express");
const http = require("http");
const { sequelize } = require("./models");
const routes = require("./routes/api");
const realtimeService = require("./services/realtimeService");

require("dotenv").config();

const app = express();
const server = http.createServer(app);

app.use(express.json());

app.use("/api", routes);

sequelize
  .authenticate()
  .then(() => console.log("Database connected"))
  .catch((err) => console.error(err));

realtimeService.attach(server);

server.listen(3000, () => {
  console.log("Server running on port 3000");
});
