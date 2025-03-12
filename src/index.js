const express = require("express");
const bodyParser = require("body-parser");
require("dotenv").config();
const connectionDB = require("./config/database");
const routes = require("./routes/routes");

const app = express();
const port = process.env.PORT || 3005;

// listen: 2 param puerto y función flecha
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

app.use(bodyParser.json());
app.use('/api/v1', routes);

connectionDB();