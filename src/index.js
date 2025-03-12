const express = require("express");
require("dotenv").config();
const connectionDB = require("./config/database");

const app = express();
const port = process.env.PORT || 3005;

// listen: 2 param puerto y función flecha
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

connectionDB();