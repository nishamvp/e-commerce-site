const { response } = require('express');
var express = require('express');
const productHelpers = require('../helpers/product-helpers');
const userHelpers = require('../helpers/user-helpers');
var router = express.Router()

const verifyLogin=(req,res,next)=>{
  if(req.session.userLoggedIn){
    next()
  }else{
    res.redirect('/login')
  }
}

/* GET home page. */

router.get('/', async function (req, res) {
  let user= req.session.user
  console.log(user);
  let cartCount=null;
  if(req.session.user){
    cartCount=await userHelpers.getCartCount(req.session.user._id);

  }
  productHelpers.getAllProducts().then((products)=>{
    res.render('user/view-products',{products,user,cartCount});
  })
})

router.get("/login",(req,res)=>{
  console.log(req.session.user);
  if(req.session.user){
    res.redirect('/')
  }else{
    res.render('user/login',{loginErr:req.session.userLoginErr});
    req.session.userLoginErr=false
  }
});

router.get("/signup",(req,res)=>{
  res.render('user/signup')
});

router.get('/logout',(req,res)=>{
  req.session.userLoggedIn=false 
     req.session.user=null
    
    
    res.redirect('/')
  
});

router.get('/cart',verifyLogin,async(req,res)=>{
  let products=await userHelpers.getCartProducts(req.session.user._id);
  let totalValue=await userHelpers.getTotalAmount(req.session.user._id);
  res.render('user/cart',{products,user:req.session.user,totalValue})
});
//using AJAX
router.get('/add-to-cart/:id',(req,res)=>{
  userHelpers.addToCart(req.params.id,req.session.user._id).then(()=>{
    
    res.json({status:true})
    // res.redirect('/');
  })
});


router.get('/place-order',verifyLogin,async(req,res)=>{
  let total=await userHelpers.getTotalAmount(req.session.user._id)
  res.render('user/place-order',{total,user:req.session.user});
  
});

//using AJAX
router.post('/place-order',async(req,res)=>{

  let products=await userHelpers.getCartProductList(req.body.userId);
  let totalPrice=await userHelpers.getTotalAmount(req.body.userId);
  userHelpers.placeOrder(req.body,products,totalPrice).then((orderId)=>{
    if(req.body['payment-method']==='COD'){
      res.json({codSuccess:true})
    }else{
      userHelpers.generateRazorpay(orderId,totalPrice).then((response)=>{
        res.json(response)
      })
    }
  
  })
});

router.post('/verify-payment',(req,res)=>{
  console.log(req.body);
  userHelpers.verifyPayment(req.body).then(()=>{
    userHelpers.changePaymentStatus(req.body['order[receipt]']).then(()=>{
      console.log('payment successfull');
      res.json({status:true})
    })
  }).catch((err)=>{
    console.log(err);
    res.json({status:false,errMsg:''})
  })
})

router.get('/order-success',(req,res)=>{
  res.render('user/order-success',{user:req.session.user})
});

router.get('/orders',verifyLogin,async(req,res)=>{
  let orders= await userHelpers.getOrderList(req.session.user._id)
    res.render('user/orders',{user:req.session.user,orders});
  });

router.get('/view-order-products:id',verifyLogin,async(req,res)=>{
 let products=await userHelpers.getOrderProducts(req.params.id)
 res.render('user/view-order-products',{user:req.session.user,products})
})
  


//using AJAX
router.post('/change-product-quantity',(req,res,next)=>{
  userHelpers.changeProductQuantity(req.body).then(async(response)=>{
     response.total=await userHelpers.getTotalAmount(req.session.user._id)
      res.json(response)
    
    
  })
})


router.post('/signup',(req,res)=>{
  userHelpers.doSignup(req.body).then((response)=>{
    console.log(response);
    req.session.user=req.body
    req.session.userLoggedIn=true;
    res.redirect('/')
  })
});

router.post('/login',(req,res)=>{

  userHelpers.doLogin(req.body).then((response)=>{
    if(response.status){
      req.session.user=response.user
      req.session.userLoggedIn=true;
      res.redirect('/')
    }else{
      req.session.userLoginErr="Invalid email or password"
      res.redirect('/login')
      
    }
  })
});




module.exports = router
