import express from "express";
import { adminOnly } from "../middlewares/auth.js";
import { getBarCharts, getLineCharts, getPieChart, getdashboardStats } from "../controllers/stats.js";
const app = express.Router();

//Statistics routes for admin dashboard 
app.get('/stats',adminOnly,getdashboardStats);
app.get('/pie',adminOnly,getPieChart);
app.get('/bar',adminOnly,getBarCharts);
app.get('/line',adminOnly,getLineCharts);

export default app;