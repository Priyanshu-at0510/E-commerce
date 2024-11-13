import mongoose, { Document } from "mongoose"
import { OrderItem, invalidateCacheProps } from "../types/types.js"
import { myCache } from "../app.js"
import { Product } from "../models/product.js"
import { Order } from "../models/order.js"

export const connectDB=(uri:string)=>{
    mongoose.connect(uri,{
        dbName:"Ecommerce_App"
    }).then(c=>{
        console.log(`Db connectd to ${c.connection.host}`)
    }).catch((e)=>console.log(e))

}

export const invalidateCache =async({
    product,
    order,
    admin,
    userId,
    orderId,
    productId
    }:invalidateCacheProps)=>{

    if(product){
        const productKeys:string[]=[
            "latest-product",
            "categories",
            "admin-products",
           
        ]

        if(typeof productId==="string")
             productKeys.push( `single-product-${productId}`)
        if(typeof productId==="object")  
            productId.forEach(i=>{productKeys.push(`single-product-${i}`)})      
        
        myCache.del(productKeys)

    }

    if(order){
        const orderKeys:string[]=[
            "all-orders" ,
            `my-orders-${userId}`,
            `order-${orderId}`
        ]

        myCache.del(orderKeys);
    
    }

    if(admin){
        const adminKeys = ['admin-stats','admin-pie-charts',
            'admin-bar-charts','admin-line-charts'
        ]

        myCache.del(adminKeys)
    }


}

export const reduceStock=async (orderItems:OrderItem[])=>{
    for(let i =0 ; i < orderItems.length; ++i){
        const item =orderItems[i]
        const product =await Product.findById(item.productId)

        if(!product) throw new Error("Product not found")
        product.stock = product.stock -item.quantity
        await product.save()

    }

}

// calculation absolute with respect to last montth 
// 2=> 8    400 %
export const calculatePercentage =(
    thisMonth:number,
    lastmonth:number 
)=>{

    if(lastmonth===0) return thisMonth*100;

    const percent=( (lastmonth)/lastmonth)*100
    return Number(percent.toFixed(0))

}

interface MyDocument extends Document {
    createdAt: Date;
    discount?: number;
    total?: number;
  }
  type FuncProps = {
    length: number;
    docArr: MyDocument[];
    today: Date;
    property?: "discount" | "total";
  };
  
  export const getChartData = ({
    length,
    docArr,
    today,
    property,
  }: FuncProps) => {
    const data: number[] = new Array(length).fill(0);
  
    docArr.forEach((i) => {
      const creationDate = i.createdAt;
      const monthDiff = (today.getMonth() - creationDate.getMonth() + 12) % 12;
  
      if (monthDiff < length) {
        if (property) {
          data[length - monthDiff - 1] += i[property]!;
        } else {
          data[length - monthDiff - 1] += 1;
        }
      }
    });
  
    return data;
  };