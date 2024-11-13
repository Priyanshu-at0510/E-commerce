import { NextFunction, Request, Response } from "express";
import { User } from "../models/user.js";
import { NewUserRequestBody } from "../types/types.js";
import ErrorHandler from "../utils/utility-class.js";
import { TryCatch } from "../middlewares/error.js";

export const newUser =TryCatch(
    async (
        req:Request,
        res:Response,
        next:NextFunction
    )=>{

            //return next( new ErrorHandler("mera custom erroe",400) )
             
            const {name,email,photo,gender,_id,dob}=req.body;

            if(!name || !email || !photo || !gender || !_id || !dob){
                next(new ErrorHandler("Please add all fiels ",400))
            }

            let user = await User.findById(_id);
            if(user){
                return res.status(200).json({
                    success:true,
                    message:`Welcome , ${user.name}`
                })
            }

             user =await User.create({
                name,email,photo,gender,_id,
                dob:new Date(dob)
            })
    
            return res.status(200).json({
                success:true,
                message:`Welcome ${user.name}`
            })
    
    }
);

export const getAllUsers = TryCatch(
    async (
        req,res,next
    )=>{
        const users = await User.find({});
        return res.status(200).json({
            success:true,
            users:users
        })
    }
)

export const getUser =TryCatch(
    async(req,res,next)=>{
       
        const id = req.params.id;
        const user = await User.findById(id);
        

        if(!user){
            return next(new ErrorHandler("User not find with given id",400))
        }

        return res.status(200).json({
            succes:true,
            user:user
        })
    }
)

export const deleteUser = TryCatch(
    async(req,res,next)=>{

        const id = req.params.id;
        const user = await User.findById(id);
        if(!user){
            return next(new ErrorHandler("User not find with given id",400))
        }

        await user.deleteOne();

        return res.status(200).json({
            succes:true,
            message:"user deleted successfully"
        })


    }
)