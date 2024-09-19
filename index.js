require("dotenv").config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const jwt = require('jsonwebtoken');

const SSLCommerzPayment = require('sslcommerz-lts')


const port = process.env.PORT;

// app.use(cors({
//   origin: ['http://localhost:5173'],
//   credentials: true
// }
// ));
app.use(cors());
app.use(express.json());



function createToken(user) {
  const token = jwt.sign(
    {
      email: user.email,
    },
    "secret",
    { expiresIn: "7d" }
  );
  return token;
}

function verifyToken(req, res, next) {
  const token = req.headers.authorization.split(" ")[1];
  const verify = jwt.verify(token, "secret");
  if (!verify?.email) {
    return res.send("You are not authorized");
  }
  req.user = verify.email;
  next();
}
const uri = process.env.DATABASE_URL;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const store_id = process.env.STORE_ID;
const store_passwd = process.env.STORE_PASSWORD;
const is_live = false //true for live, false for sandbox

async function run() {
  try {
    
    client.connect();
    const productDB = client.db("productDB");
    const ballcollection = productDB.collection("ballcollection");
    const userDB = client.db("userDB");
    const userCollection = userDB.collection("userCollection");
    const orderDB = client.db("orderDB");
    const orderCollection = orderDB.collection("orderCollection");

    // app.post ('/jwt', async (req, res)=>{
    //   const user= req.body;
    //   console.log(user)
    //   const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'})
    //   res
    //   .cookie('token', token, {
    //     httpOnly: true,
    //     secure: false,
    //     sameSite: 'none'
    //   })
    //   .send({success: true})
    // }
    // )

  //   app.post('/courses', verifyToken, async (req, res) => {
  //       const balls=  req.body;
  //       const result = await ballcollection.insertOne(balls);
  //       res.send(result);
  // });
    app.post('/courses',  async (req, res) => {
        const balls=  req.body;
        const result = await ballcollection.insertOne(balls);
        res.send(result);
  });

  //payment
  const tran_id= new ObjectId().toString()

    app.post('/order/:id',async (req, res) => {
      const id= req.params.id
    //  const product = await ballcollection.findOne({ _id: new ObjectId(id)});
    //  console.log(product)
      const data = {
        // total_amount: product.price*req.body.quantity,
        total_amount: req.body.price,
        currency: 'BDT',
        tran_id: tran_id, 
        success_url: `http://localhost:5000/payment/success/${tran_id}`,
        fail_url: `http://localhost:5000/payment/fail/${tran_id}`,
        cancel_url: 'http://localhost:3030/cancel',
        ipn_url: 'http://localhost:3030/ipn',
        shipping_method: 'Courier',
        product_name: 'Computer.',
        product_category: 'Electronic',
        product_profile: 'general',
        cus_name: req.body.name,
        cus_email: 'customer@example.com',
        cus_add1: req.body.address,
        cus_add2: 'Dhaka',
        cus_city: 'Dhaka',
        cus_state: 'Dhaka',
        cus_postcode: '1000',
        cus_country: 'Bangladesh',
        cus_phone: req.body.contact,
        cus_fax: '01711111111',
        ship_name: 'Customer Name',
        ship_add1: 'Dhaka',
        ship_add2: 'Dhaka',
        ship_city: 'Dhaka',
        ship_state: 'Dhaka',
        ship_postcode: 1000,
        ship_country: 'Bangladesh',
    };
   
    const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live)
    sslcz.init(data).then(apiResponse => {
        
        let GatewayPageURL = apiResponse.GatewayPageURL
        res.send({ url : GatewayPageURL});

        const finalOrder= {
          // product,
          paidStatus: false,
          transactionId: tran_id,
          customer: req.body.name
          
        }
        const result = orderCollection.insertOne(finalOrder)
        console.log(result);
        console.log('Redirecting to: ', GatewayPageURL)
    });

app.post('/payment/success/:tran_id',async (req, res) => {
console.log(req.params.tran_id)

const result =await orderCollection.updateOne({transactionId: req.params.tran_id },
  {
    $set:{
      paidStatus: true
    }
    }
)

const item = await ballcollection.findOne({ _id: new ObjectId(id)});

    if (!item) {
      return res.status(404).send({ error: 'Item not found' });
    }

    //const newStock = item.stock - 1;


    // Update the stock value
    // const result1 = await ballcollection.updateOne(
    //   { _id: new ObjectId(id)},
    //   {
    //     $set: {
    //       stock: newStock,
    //     },
    //   }
    // );

if (result.modifiedCount> 0){
  res.redirect(`http://localhost:5173/payment/success/${req.params.tranId}`)
}
})

app.post('/payment/fail/:tranId',async (req, res) => {
  const result =await orderCollection.deleteOne({transactionId: req.params.tranId })

  if (result.deletedCount){
    res.redirect(`http://localhost:5173/payment/fail/${req.params.tranId}`)
  }
})
  });

  app.get('/courses', async (req, res) => {
    const balls=  ballcollection.find();
    const result = await balls.toArray();
    res.send(result);
  });

  app.get('/courses/:id', async (req, res) => {
    const id= req.params.id
     const ballData = await ballcollection.findOne({ _id: new ObjectId(id)});
     res.send(ballData);
  });
  
  // app.patch('/courses/:id',verifyToken, async (req, res) => {
  //   const id= req.params.id
  //   const updatedData= req.body;
  //    const result = await ballcollection.updateOne(
  //       { _id: new ObjectId(id)},
  //       {$set: updatedData}
  //   );
  //    res.send( result);
  // });

  app.patch('/courses/:id', async (req, res) => {
    const id= req.params.id
    const updatedData= req.body;
     const result = await ballcollection.updateOne(
        { _id: new ObjectId(id)},
        {$set: updatedData}
    );
     res.send( result);
  });

  // app.delete('/courses/:id', verifyToken, async (req, res) => {
  //   const id= req.params.id
  //   // const updatedData= req.body;
  //    const result = await ballcollection.deleteOne(
  //       { _id: new ObjectId(id)}
  //   );
  //    res.send( result);
  // });
  app.delete('/courses/:id', async (req, res) => {
    const id= req.params.id
    // const updatedData= req.body;
     const result = await ballcollection.deleteOne(
        { _id: new ObjectId(id)}
    );
     res.send( result);
  });

  //users
  app.post("/user", async (req, res) => {
    const user = req.body;

    const token = createToken(user);
    //console.log(token);

    const isUserExist = await userCollection.findOne({ email: user?.email });
    if (isUserExist?._id) {
      return res.send({
        statu: "success",
        message: "Login success",
        token,
      });
    }
    await userCollection.insertOne(user);
    return res.send({ token });
  });

  app.get('/users', async (req, res) => {
    const users=  userCollection.find();
    const result = await users.toArray();
    res.send(result);
  });

  app.get("/user/get/:id", async (req, res) => {
    const id = req.params.id;
    //console.log(req);
    const result = await userCollection.findOne({ _id: new ObjectId(id) });
    res.send(result);
  });

  
  app.get("/user/:email", async (req, res) => {
    const email = req.params.email;
    const result = await userCollection.findOne({ email });
    res.send(result);
  });

  app.patch("/user/:email", async (req, res) => {
    const email = req.params.email;
    const userData = req.body;
    const result = await userCollection.updateOne(
      { email },
      { $set: userData },
      { upsert: true }
    );
    res.send(result);
  });

    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    
    //await client.close();
  }
}
run().catch(console.log);



app.get('/', (req, res) => {
  res.send('Hello users!')
})

 app.listen(port, () => {
   console.log(`Example app listening on port ${port}`)
 })

//arafatanjan
//W9jFFKWsQ0yGc2Dj