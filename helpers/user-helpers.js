const db = require('../config/connection')
const collections = require('../config/collections')
const bcrypt = require('bcrypt')
const objectId = require('mongodb').ObjectId
const Razorpay = require('razorpay');

var instance = new Razorpay({
  key_id: 'rzp_test_Q1OrsZTNjK6RX5',
  key_secret: 'YSFAODtKOIPC69p6cj0lGL0w',
});

module.exports = {
  doSignup: (userData) => {
    return new Promise(async (resolve, reject) => {
      userData.password = await bcrypt.hash(userData.password, 10)
      db.get()
        .collection(collections.USER_COLLECTION)
        .insertOne(userData)
        .then((data) => {
          resolve(data)
        })
    })
  },

  doLogin: (userData) => {
    return new Promise(async (resolve, reject) => {
      let loginStatus = false
      let response = {}
      let user = await db
        .get()
        .collection(collections.USER_COLLECTION)
        .findOne({ email: userData.email })
      if (user) {
        bcrypt.compare(userData.password, user.password).then((status) => {
          if (status) {
            response.user = user
            response.status = true
            resolve(response)
          } else {
            console.log('login failed..check your password')
            resolve({ status: false })
          }
        })
      } else {
        console.log('there are no user')
        resolve({ status: false })
      }
    })
  },
  addToCart: (prodId, userId) => {
    let prodObj = {
      item: objectId(prodId),
      quantity: 1,
    }
    return new Promise(async (resolve, reject) => {
      let userCart = await db
        .get()
        .collection(collections.CART_COLLECTION)
        .findOne({ user: objectId(userId) })
      if (userCart) {
        let proExist = userCart.products.findIndex(
          (product) => product.item == prodId,
        )
        if (proExist != -1) {
          db.get()
            .collection(collections.CART_COLLECTION)
            .updateOne(
              { user: objectId(userId), 'products.item': objectId(prodId) },
              { $inc: { 'products.$.quantity': 1 } },
            )
            .then(() => {
              resolve()
            })
        } else {
          db.get()
            .collection(collections.CART_COLLECTION)
            .updateOne(
              { user: objectId(userId) },
              { $push: { products: prodObj } },
            )
            .then((response) => {
              resolve()
            })
        }
      } else {
        let cartObj = {
          user: objectId(userId),
          products: [prodObj],
        }
        db.get()
          .collection(collections.CART_COLLECTION)
          .insertOne(cartObj)
          .then((response) => {
            resolve()
          })
      }
    })
  },
  getCartProducts: (userId) => {
    return new Promise(async (resolve, reject) => {
      let cartItems = await db
        .get()
        .collection(collections.CART_COLLECTION)
        .aggregate([
          {
            $match:{user:objectId(userId)}
          },
          {
            $unwind: '$products',
          },
          {
            $project: {
              item: '$products.item',
              quantity: '$products.quantity',
            },
          },
          {
            $lookup: {
              from: collections.PRODUCT_COLLECTION,
              localField: 'item',
              foreignField: '_id',
              as: 'product',
            },
          },
        ])
        .toArray()

      resolve(cartItems)
    })
  },
  getCartCount: (userId) => {
    return new Promise(async (resolve, reject) => {
      let count = 0
      let cart = await db
        .get()
        .collection(collections.CART_COLLECTION)
        .findOne({ user: objectId(userId) })
      if (cart) {
        count = cart.products.length
      }
      resolve(count)
    })
  },
  changeProductQuantity: (details) => {
    details.count = parseInt(details.count)
    details.quantity = parseInt(details.quantity)
    return new Promise(async (resolve, reject) => {
      if (details.count == -1 && details.quantity == 1) {
        await db
          .get()
          .collection(collections.CART_COLLECTION)
          .updateOne(
          
            { _id: objectId(details.cart) },
            { $pull: { products: { item: objectId(details.product) } } },
          )
          .then((response) => {
            resolve({ removeProduct: true })
          })
      } else {
        db.get()
          .collection(collections.CART_COLLECTION)
          .updateOne(
            {
              _id: objectId(details.cart),
              'products.item': objectId(details.product),
            },
            { $inc: { 'products.$.quantity': details.count } },
          )
          .then((response) => {
            resolve({status:true})
          })
      }
    })
  },
  getTotalAmount: () => {
    return new Promise(async (resolve, reject) => {
      let total = await db
        .get()
        .collection(collections.CART_COLLECTION)
        .aggregate([
          
          {
            $unwind: '$products',
          },
          {
            $project: {
              item: '$products.item',
              quantity: '$products.quantity',
            },
          },
          {
            $lookup: {
              from: collections.PRODUCT_COLLECTION,
              localField: 'item',
              foreignField: '_id',
              as: 'product',
            },
          },
          {
            $group: {
              _id: null,
              total: {
                $sum: {
                  $multiply: [
                    '$quantity',
                    {
                      $convert: {
                        input: { $arrayElemAt: ['$product.price', 0] },
                        to: 'double',
                      },
                    },
                  ],
                },
              },
            },
            /* Here, in the database price are in stored as string,so therefor $convert operator is used.
            The $convert operator converts a value from one type to another. The operator takes 3 arguments: the first argument is the value to be converted,
             the second argument is the type to convert to, and the third argument is an optional options.second argument is "double" here.
             In MongoDB, "double" is a type that represents a 64-bit floating-point number. It is used to store decimal numbers that require a high degree of precision.
             Then the $arrayElemAt operator is used to select an element from an array by its index. The operator takes two arguments, the first argument is the array, 
             and the second argument is the index of the element to be selected. The operator returns the element at the specified index, or null if the index is out of bounds.
             Here input used for an expression */
          },
          
        ])
        .toArray()
        if(total.length === 0){
          resolve(0);
        }else{
          resolve(total[0].total)
        }
      
    })
  },
  placeOrder:(order,products,total)=>{
    return new Promise((resolve,reject)=>{
      let status=order['payment-method']==='COD'?'placed':'pending'
      let orderObj={
        deliveryDetails:{
          address:order.address,
          pincode:order.pincode,
          mobile:order.mobile
        },
        userId:objectId(order.userId),
        products:products,
        total:total,
        paymentMethod:order['payment-method'],
        date:new Date(),
        status:status
      }
      db.get().collection(collections.ORDER_COLLECTION).insertOne(orderObj).then((response)=>{
        db.get().collection(collections.CART_COLLECTION).deleteOne({user:objectId(order.userId)})
        resolve(response.insertedId)
       
        
      })
    })

  },
  getCartProductList:(userId)=>{
    return new Promise(async(resolve,reject)=>{
    let cart=await db.get().collection(collections.CART_COLLECTION).findOne({user:objectId(userId)});
      resolve(cart.products)
    })
  },
  getOrderList:(userId)=>{
    return new Promise(async(resolve, reject) => {
      let ordersList=await db.get().collection(collections.ORDER_COLLECTION).find({userId:objectId(userId)}).toArray()
      resolve(ordersList)
      
    })
  },
  getOrderProducts:(ordersId)=>{
    return new Promise(async(resolve, reject) => {
    let orderItems= await db.get().collection(collections.ORDER_COLLECTION).aggregate([
        {
          $match:{_id:objectId(ordersId)}
        },
        {
          $unwind:'$products'
        },
        {
          $project: {item: '$products.item',
                    quantity: '$products.quantity'}
        },
        {
          $lookup:{
            from:collections.PRODUCT_COLLECTION,
            localField:'item',
            foreignField:'_id',
            as:'product'
          }
        },
        {
          $project:{item:1,quantity:1,product:{$arrayElemAt:['$product',0]}}
        }
        
      ]).toArray()
      resolve(orderItems)
      
      
    })
  },
  generateRazorpay:(orderId,total)=>{
    console.log('orderId..',orderId);
    return new Promise((resolve, reject) => {
      {
        var options = {
          amount: total*100,  // amount in the smallest currency unit
          currency: "INR",
          receipt: orderId.toString()
        };
        instance.orders.create(options, function(err, order) {
          if(err){
            console.log(err);
          }else{
          console.log('New Order',order);
          resolve(order)
        }
        });
      }
    })
  },
  verifyPayment:(details)=>{
    return new Promise((resolve, reject) => {
      const crypto=require('crypto');
      let hmac = crypto.createHmac('sha256', 'YSFAODtKOIPC69p6cj0lGL0w')
      hmac.update(details['payment[razorpay_order_id]']+'|'+details['payment[razorpay_payment_id]'])
      hmac=hmac.digest('hex');
      if(hmac==details['payment[razorpay_signature]']){
        resolve()
      }else{
        reject()
      }
    })
  },
  changePaymentStatus:(orderId)=>{
    return new Promise((resolve,reject)=>{
      db.get().collection(collections.ORDER_COLLECTION)
      .updateOne({_id:objectId(orderId)},
      {
        $set:{
          status:'placed'
        }
      }).then(()=>{
        resolve()
      })
    })
  }



}
