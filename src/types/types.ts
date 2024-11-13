import { NextFunction, Request, Response } from "express";
import { StringSchemaDefinition } from "mongoose";

export interface NewUserRequestBody {
    name: string;
    email: string;
    photo: string;
    gender: string;
    _id: string;
    dob: Date;
}

export interface NewProductRequestBody {
    name: string;
    category: string;
    price:Number;
    stock:Number;
    
}


export type ControllerType = (
    req: Request,
    res: Response,
    next: NextFunction
) => Promise<void | Response<any, Record<string, any>>>;

export type SearchRequestQuery={
    search?:string;
    price?:string;
    category?:string;
    sort?:string;
    page?:StringSchemaDefinition
}

export interface BaseQuery{
    name?:{
        $regex:string,
        $options:string
    };
    price?:{
        $lte:number
    };

    category?:string;

}

export interface invalidateCacheProps{
    product?:boolean;
    order?:boolean;
    admin?:boolean;
    userId?:string;
    orderId? :string;
    productId?:string | string[];

}
export type OrderItem={
    name:String;
    photo:string;
    price:number;
    quantity:number;
    productId:string;

}

export type ShippingInfoType= {
    address:string;
    city:string;
    state:string;
    country:string;
    pincode:string;
    
}

export interface NewOrderRequestBody{
    shippingInfo:ShippingInfoType;
    user:string;
    subTotal:number;
    tax:number;
    shippingCharges:number;
    discount:number;
    total:number;
    orderItems:OrderItem[];

}
