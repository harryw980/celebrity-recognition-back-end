const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const knex = require('knex');
const bcrypt = require('bcrypt-nodejs');

const db = knex({
    client: 'pg',
    connection: {
      connectString : process.env.DATABASE_URL,
      ssl: false
    }
});

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const app = express();

app.use(bodyParser.json());
app.use(cors());

app.get('/', (req, res) => {
    res.json('server working');
})

app.post('/signin', (req, res) => {
    const {email, pass} = req.body;

    db.select('email','hash')
    .from('login')
    .where('email', '=', email)
    .then(data => {
        if(bcrypt.compareSync(pass, data[0].hash)){
            db.select('*')
            .from('users')
            .where('email', '=', email)
            .then(userInfo => {
                res.json(userInfo[0]);
            })
            .catch(err => res.status(400).json('unable to get info'))
        } else{
            res.status(400).json('wrong password');
        }
    })
    .catch(err => res.status(400).json('user does not exist'))
});

app.post('/register', (req, res) => {
    const { email, name, pass } = req.body;
    if(!email || !name || !pass){
        return res.status(400).json('empty form');
    }

    const hash = bcrypt.hashSync(pass);
    db.transaction(trx => {
        trx.insert({
          hash: hash,
          email: email
        })
        .into('login')
        .returning('email')
        .then(loginEmail => {
          return trx('users')
            .returning('*')
            .insert({
              email: loginEmail[0],
              name: name,
              joined: new Date()
            })
            .then(user => {
              res.json(user[0]);
            })
        })
        .then(trx.commit)
        .catch(trx.rollback)
    })
    .catch(err => res.status(400).json('unable to register'))
})

app.put('/image', (req, res) => {
    const { id } = req.body;
    db('users')
        .where('id', '=', id)
        .increment('entries', 1)
        .returning('entries')
        .then(entries => {
            res.json(entries[0]);he
        })
        .catch(error => {
            res.status(400).json('unable to get count')
        })
})

app.listen((process.env.PORT || 3000), ()=>{
    console.log(`App is running on port ${process.env.PORT || 3000}`);
})