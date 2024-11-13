import express, { NextFunction, Request, Response } from "express"
import NodeCache from "node-cache";
import { connectDB } from "./utils/features.js";
import { errorMiddleware } from "./middlewares/error.js";
import {config} from "dotenv"
import morgan from "morgan"

// user routes
import orderRoutes from './routes/orders.js'
import userRoutes from './routes/user.js'
import productRoutes from './routes/product.js'
import paymentRoutes from './routes/payment.js'
import statsRoutes from './routes/stats.js'
import Stripe from "stripe";

config({
    path: './.env'
})

const STRIPE_KEY = process.env.STRIPE_KEY || ''

export const stripe = new Stripe(STRIPE_KEY);
const port =process.env.PORT || 4000;
const app = express();

app.use(express.json())
app.use(morgan('dev'))  //a middleware that logs HTTP requests and errors
connectDB(process.env.MONGO_URI!);

export const myCache = new NodeCache();

app.use("/api/v1/user",userRoutes)
app.use("/api/v1/product",productRoutes)
app.use("/api/v1/order",orderRoutes)
app.use("/api/v1/payment",paymentRoutes)
app.use("/api/v1/dashboard",statsRoutes)


app.use('/uploads',express.static("uploads"))
//error handling middleware
app.use(errorMiddleware)

app.listen(port,()=>{
    console.log(`server is running on localhost ${port}`)
})