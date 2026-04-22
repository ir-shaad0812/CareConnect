//  APP ENTRY
// Creates and configures the Express application
import express from 'express';
import { configureApp } from './loaders/app.loader.js';

const app = express();

configureApp(app);

export default app;
