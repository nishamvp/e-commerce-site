const db = require('../config/connection')
const collections = require('../config/collections')
const { response } = require('express')
const objectId = require('mongodb').ObjectId

module.exports = {
  addProduct: (product, callback) => {
    db.get()
      .collection(collections.PRODUCT_COLLECTION)
      .insertOne(product)
      .then((data) => {
        callback(data.insertedId)
      })
  },
  getAllProducts: () => {
    return new Promise(async (resolve, reject) => {
      let products = await db
        .get()
        .collection(collections.PRODUCT_COLLECTION)
        .find()
        .toArray()
      resolve(products)
    })
  },
  deleteProduct: (proId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.PRODUCT_COLLECTION)
        .deleteOne({ _id: objectId(proId) })
        .then((response) => {
          resolve(response)
        })
    })
  },
  getProductDetails: (prodId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.PRODUCT_COLLECTION)
        .findOne({ _id: objectId(prodId) })
        .then((product) => {
          resolve(product)
        })
    })
  },
  updateProduct: (prodId, prodDetails) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.PRODUCT_COLLECTION)
        .updateOne(
          { _id: objectId(prodId) },
          {
            $set: {
              name: prodDetails.name,
              category: prodDetails.category,
              price: prodDetails.price,
              description: prodDetails.description,
            },
          },
        )
        .then((response) => {
          resolve()
        })
    })
  },
}
