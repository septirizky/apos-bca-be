const express = require("express");
const { sequelize } = require("./models");
const routes = require("./routes/api");

require("dotenv").config();

const app = express();

app.use(express.json());

app.use("/api", routes);

sequelize
  .authenticate()
  .then(() => console.log("Database connected"))
  .catch((err) => console.error(err));

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
