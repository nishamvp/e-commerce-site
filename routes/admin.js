const { response } = require('express')
var express = require('express')
const adminHelpers = require('../helpers/admin-helpers')
const productHelpers = require('../helpers/product-helpers')
var router = express.Router()


const adminverifyLogin=(req,res,next)=>{
  if(req.session.adminLoggedIn){
    next()
  }else{
    res.redirect('/admin/login')
  }
}
/* GET users listing. */
router.get('/',adminverifyLogin, function (req, res) {
  productHelpers.getAllProducts().then((products) => {
    res.render('admin/view-products', { admin:req.session.admin, products })
  })
});


router.get('/add-product', adminverifyLogin,(req, res) => {
  res.render('admin/add-product', { admin: req.session.admin})
})

router.get('/delete-product/', (req, res) => {
  let proId = req.query.id
  console.log(proId)
  productHelpers.deleteProduct(proId).then((response) => {
    console.log(response)
    res.redirect('/admin/')
  })
})

router.get('/edit-product',adminverifyLogin, async (req, res) => {
  let product = await productHelpers.getProductDetails(req.query.id)
  console.log(product)
  res.render('admin/edit-product', { product , admin:req.session.admin })
});

router.get('/all-orders',adminverifyLogin,(req,res)=>{
  adminHelpers.getAllOrders().then((orders)=>{
    res.render('admin/all-orders',{admin:req.session.admin,orders})
  })
});

router.get('/all-users',adminverifyLogin,(req,res)=>{
  adminHelpers.getAllUsers().then((users)=>{
    res.render('admin/all-users',{admin:req.session.admin,users});
  })
})


router.get("/login",(req,res)=>{
  if(req.session.admin){
    res.redirect('/admin')
  }else{
    res.render('admin/admin-login',{loginErr:req.session.adminLoginErr});
    req.session.adminLoginErr=false
  }
});

router.get('/logout',(req,res)=>{
  req.session.adminLoggedIn=false 
     req.session.admin=null
     res.redirect('/admin/login')
  
});

router.post('/login',async(req,res)=>{
  adminHelpers.setLoginDetails(req.body).then((response)=>{
    console.log('response on server',response);
    if(response.status){
    req.session.admin=response.admin
    req.session.adminLoggedIn=true;
    res.redirect('/admin')
    console.log(req.session);
    }else{
      req.session.adminLoginErr="Invalid email or password"
      res.redirect('/admin/login')
    }
  })

});
router.post('/add-product', (req, res) => {
  productHelpers.addProduct(req.body, (id) => {
    let Image = req.files.image
    Image.mv('./public/product-images/' + id + '.jpg', (err, done) => {
      if (!err) {
        res.render('admin/add-product')
      } else {
        console.log(err)
      }
    })
  })
})

router.post('/edit-product', (req, res) => {
  console.log(req.query.id);
  let id=req.query.id
  productHelpers.updateProduct(req.query.id, req.body).then(() => {
    res.redirect('/')
    if(req.files.image){
     let Image = req.files.image
     Image.mv('./public/product-images/' + id + '.jpg')

    }
    
  })
});

router.post('/confirm-shipment',(req,res)=>{
  adminHelpers.confirmShipment(req.body).then(()=>{
    res.json({status:true})
  })
})




module.exports = router
