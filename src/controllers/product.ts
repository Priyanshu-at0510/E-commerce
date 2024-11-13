import { Request } from "express";
import { TryCatch } from "../middlewares/error.js";
import { BaseQuery, NewProductRequestBody, SearchRequestQuery } from "../types/types.js";
import { Product } from "../models/product.js";
import ErrorHandler from "../utils/utility-class.js";
import { rm } from "fs";
import {faker} from "@faker-js/faker"
import { myCache } from "../app.js";
import { invalidateCache } from "../utils/features.js";


export const newProduct = TryCatch(
    async(req:Request<{},{},NewProductRequestBody>,res,next)=>{

        const {name , category ,price , stock} = req.body;
        const photo = req.file ;

        if(!photo){
            return next(new ErrorHandler("please upload a photo",400));
        }
        
        if(!name || !price ||!category ||!stock){
            rm(photo.path,()=>{
                console.log("deletd")
            })
            return next(new ErrorHandler("please fill all fields",400));
        }
        
        const product= await Product.create({
            name ,
            category:category.toLowerCase() ,
            price , 
            stock,
            photo:photo?.path
        });
        // Invalidating products cache 
        await invalidateCache({product:true, admin:true,productId:String(product._id)});

        res.status(201).json({
            success:true,
            message:`product created successfully`
        })


    }
)

export const getLatestProduct=TryCatch(
    async (req,res,next)=>{
        let products =[]
        //Revalidate cache on New, update , delete or new order
        if(myCache.has("latest-product")) 
            products= JSON.parse(myCache.get("latest-product")!)
        else{
        // +1 => ascending    -1=>descending
        products=await Product.find().sort({createdAt:-1}).limit(5);
        myCache.set("latest-product",JSON.stringify(products));
        }

        res.status(200).json({
            success:true,
            products
        })
    }
)

export const getAllCategories = TryCatch(
    async(req,res,next)=>{
        //Revalidate on new , update, delete
        let categories;
        if(myCache.has("categories")){
            categories=JSON.parse(myCache.get("categories")!)
        }else{
            categories = await Product.find().distinct("category");
            myCache.set("categories",JSON.stringify(categories));
        }

        res.status(200).json({
            success:true,
            categories
        })
            

    }
)


export const getAdminProducts = TryCatch(
    async(req,res,next)=>{
        let products;
        if(myCache.has("admin-products")){
            products=JSON.parse(myCache.get("admin-products")!)
        }else{
            products = await Product.find({});
            myCache.set("admin-products",JSON.stringify(products));
        }
        return res.status(200).json({
            success:true,
            products
        })

    }
)

export const getSingleProduct = TryCatch(
    async(req,res,next)=>{
        let product;
        if(myCache.has(`single-product-${req.params.id}`)){
            product=JSON.parse(myCache.get(`single-product-${req.params.id}`)!)
         }else{
            product = await Product.findById(req.params.id);
            myCache.set(`single-product-${req.params.id}`,JSON.stringify(product));
         }
        return res.status(200).json({
            success:true,
            product
        })

    }
)


export const updateProduct = TryCatch(
    async(req,res,next)=>{
        const {id} = req.params

        const {name , category ,price , stock} = req.body;
        const photo = req.file ;

        const product = await Product.findById(id);

        if(!product){
            return next(new ErrorHandler("Invalid product Id",404))
        }

        if(photo){
            rm(product.photo!,()=>{
                console.log("Old photo deleted")
            })
            
            product.photo = photo.path
        }

        if(name) product.name = name;
        if(stock) product.stock = stock;
        if(price) product.price = price;
        if(category) product.category = category;

        await product.save();
        //Invalidating products cache 
        await invalidateCache({product:true, admin:true,productId:String(product._id)});

        res.status(200).json({
            success:true,
            message:`product updated successfully`
        })


    }
)


export const deleteProduct = TryCatch(
    async(req,res,next)=>{
        const id = req.params;
        if(!id) return next(new ErrorHandler("Do not get id",400))
        
        const product = await Product.findById(req.params.id);
        if(!product) return next(new ErrorHandler("Invalid id",404))
        
        //deleteing the product 
        rm(product.photo!,()=>{
            console.log("Old photo deletd")
        })
        await Product.deleteOne();
        //Invalidating products cache 
        await invalidateCache({product:true, admin:true,productId:String(product._id)});

        return res.status(200).json({
            success:true,
            message:"Product deleted successfully"
        })

    }
)

// To get all products with filter 
export const getAllProducts= TryCatch(
    async(req:Request<{},{},{},SearchRequestQuery>,res,next)=>{
        const {search,sort,category,price} = req.query

        const page =Number(req.query.page) || 1;
        const limit = Number(process.env.PRODUCT_PER_PAGE) || 8;

        const skip = limit * (page-1);
        let baseQuery:BaseQuery ={}

        if(search) baseQuery.name ={
            $regex:search,
            $options:"i"
        }

        if(price) baseQuery.price= {
            $lte:Number(price) // less than eqaual to given price
        }

        if(category) baseQuery.category = category

        const [products, filteredOnlyProducts] = await Promise.all([
            Product.find(baseQuery)
            .sort( sort && { price:sort=== "asc" ? 1 :-1})
            .limit(limit)
            .skip(skip)  ,

            Product.find(baseQuery)

        ])

        const totalPage =Math.ceil(filteredOnlyProducts.length/ limit) ;
        
        return res.status(200).json({
            success:true,
            products,
            totalPage
        })
    }
)

// const generateRandomProducts = async (count: number = 10) => {
//   const products = [];

//   for (let i = 0; i < count; i++) {
//     const product = {
//       name: faker.commerce.productName(),
//       photo: "uploads\\5ba9bd91-b89c-40c2-bb8a-66703408f986.png",
//       price: faker.commerce.price({ min: 1500, max: 80000, dec: 0 }),
//       stock: faker.commerce.price({ min: 0, max: 100, dec: 0 }),
//       category: faker.commerce.department(),
//       createdAt: new Date(faker.date.past()),
//       updatedAt: new Date(faker.date.recent()),
//       __v: 0,
//     };

//     products.push(product);
//   }

//   await Product.create(products);

//   console.log({ succecss: true });
// };


// const deleteRandomsProducts = async (count: number = 10) => {
//   const products = await Product.find({}).skip(2);

//   for (let i = 0; i < products.length; i++) {
//     const product = products[i];
//     await product.deleteOne();
//   }

//   console.log({ succecss: true });
// };

// deleteRandomsProducts()

//generateRandomProducts(40)