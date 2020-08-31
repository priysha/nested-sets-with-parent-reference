import express from 'express';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import http from 'http'
import userRoutes from './routes/userRoutes'
import { config } from './config'
import noCors from "./lib/noCors";

const app = express();

// express.json is a built-in middleware
app.use(bodyParser.json());

// required to avoid no-cors policy on UI
app.use(noCors);

mongoose.connect(config.MONGO, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

userRoutes(app);

const protocol = http.createServer(app);
protocol.listen(config.PORT, () => {
  console.log(`Server running at ${config.BASEURL}:${config.PORT}`)
});
