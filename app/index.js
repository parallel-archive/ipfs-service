import safeCompare from 'safe-compare';

import fs from 'fs-extra'
import fetch from 'node-fetch';
import FormData from 'form-data';

fs.emptyDirSync('tmp-files/')

import multer from 'multer'
const upload = multer({ dest: 'tmp-files/' })

import express from 'express'
const app = express()
const port = 5000

function authFn (req, res, next) {
    res.locals.t = new Date().getTime()
    if(!process.env.API_PASSWORD){
        res.status(500).json({error:'Password not set'})
        return
    }
    
    if(!safeCompare(process.env.API_PASSWORD, req.get('Authorization'))) {
        res.status(401).json({error:'Unauthorized'})
        return
    }
    next()
  }

  
app.get('/hello', (req, res) => {
    res.json({
        status:'OK'
    })
})
    
app.use(authFn)
app.get('/', (req, res) => {
    try {
        fetch('http://localhost:9094/id')
        .then(d => d.json())
        .then(d => res.json(d))
    } 
    
    catch (e) {
        console.error(e)
        res.status(500).json({error:'Server Error'})
    }
})

let backPressure = 0
let id = 0

app.post('/add', upload.single('file'), async function (req, res, next) {
    id++
    const t = res.locals.t
    const fileSizeMB = req.file.size / 1024 / 1024
    backPressure += fileSizeMB
    console.log(`${id}: file got after ${new Date().getTime() - t} ms, size: ${fileSizeMB.toFixed(2)} MB`)
    try {
        const formData = new FormData()
        formData.append('file', fs.createReadStream(req.file.path))
        const formHeaders = formData.getHeaders()

        const cid = await fetch('http://localhost:5001/api/v0/add',
            {
                method: 'POST',
                headers: {
                    ...formHeaders
                },
                body: formData
            })
            .then(res => res.json())
            .then(res => res.Hash)

        console.log(`${id}: add to ipfs finished after ${new Date().getTime() - t} ms`)
        
        await fetch(`http://localhost:9094/pins/${cid}`, { method: 'POST' })

        console.log(`${id}: pin to cluster finished after ${new Date().getTime() - t} ms`)

        res.json({ cid })
    } 

    catch (e) {
        console.error(e)
        res.status(500).json({error:'Server Error'})
    }
    backPressure -= fileSizeMB
    console.log(`${id}: add endpoint finished after ${new Date().getTime() - t} ms, backpressure: ${backPressure.toFixed(2)} MB`)
    fs.remove(req.file.path)

})

app.listen(port, () => {
    console.log(`OSA IPFS Service API listening on port ${port}`)
})