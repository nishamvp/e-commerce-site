const db = require('../config/connection')
const collections = require('../config/collections')
const { response } = require('express')
const objectId = require('mongodb').ObjectId
const bcrypt=require('bcrypt')

module.exports={
    setLoginDetails:(adminData)=>{
        return new Promise(async (resolve, reject) => {
            let response={}
            let adminObj ={
                adminId: 'Nish123',
                password:await bcrypt.hash('hello123', 10)
            }
        let adminDetails = await db.get().collection(collections.ADMIN_COLLECTION).findOne({adminId:adminData.adminId})
                if(adminDetails){
                   console.log('admin already exist');
                  await bcrypt.compare(adminData.password, adminDetails.password).then((status)=>{
                    response.admin=adminDetails
                    response.status=status
                    resolve(response)
                    
                  })
                }else{
                   let count= await db.get().collection(collections.ADMIN_COLLECTION).count()
                   if(count==0){
                    await db.get().collection(collections.ADMIN_COLLECTION).insertOne(adminObj).then((result) => {
                        console.log('admin added');
                        response.admin=result;
                        response.status=true;
                        resolve(response)
                        console.log('response',response);

                       })
                    }else{
                        console.log('admin is alredy in database');
                        resolve(false)
                    }
                }           
       
          })
    },
    getAllOrders:()=>{
        return new Promise(async(resolve, reject) => {
            let allOrders=await db.get().collection(collections.ORDER_COLLECTION).find({status:'placed'}).toArray()
            resolve(allOrders)
        })
    },
    getAllUsers:()=>{
        return new Promise(async(resolve,reject)=>{
           let users= await db.get().collection(collections.USER_COLLECTION).find().toArray()
           resolve(users)
           
        })
    },
    confirmShipment:(orderId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collections.ORDER_COLLECTION)
            .updateOne({_id:objectId(orderId.orderId)},
            {
                $set:{
                    status:'shipped'
                }
            }).then(()=>{
                resolve()
                
            })
        })
    }
    
}