const express = require('express');
const bodyParser = require('body-parser');
const favicon = require('express-favicon');
const path = require('path');
const cors = require('cors');
const port = process.env.PORT || 8080;
const app = express();


const BoxSDK = require('box-node-sdk');
const boxConfig = process.env.BOX_CONFIG;
const sdk = BoxSDK.getPreconfiguredInstance(JSON.parse(boxConfig));
const client = sdk.getAppAuthClient('enterprise');

const { EXPLORER_SCOPES, RECENTS_SCOPES, PICKER_SCOPES, UPLOADER_SCOPES, PREVIEW_SCOPES } = require('./server-constants');

const decode = require("salesforce-signed-request");
const signedRequestConsumerSecret = process.env.SIGNED_REQUEST_CONSUMER_SECRET;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors({
  origin: [
      `https://${process.env.REACT_APP_NAME}.herokuapp.com`, 
      `https://${process.env.SALESFORCE_DOMAIN}.my.salesforce.com`, 
      'http://localhost:8080'
    ]
}));
app.use(favicon(__dirname + '/build/favicon.ico'));
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, 'build')));

app.post("/signedrequest", async (req, res) => {
  console.log('wassup')
  try {

    const signedRequest = decode(req.body.signed_request, signedRequestConsumerSecret);      
    const context = signedRequest.context;
    console.log('Found context: ', context);

    const oauthToken = signedRequest.client.oauthToken;
    console.log('Found oauth token: ', oauthToken);

    const instanceUrl = signedRequest.client.instanceUrl;
    console.log('Found instance url: ', instanceUrl);

    const parameters = context.environment.parameters;
    console.log("Found params: ", parameters);
    console.log("Element Type: ", parameters.elementType);
    const uiElement = parameters.elementType;
    
    let folderId;
    switch(uiElement) {
        case "explorer":
            folderId = parameters.folderId;
            res.redirect(301, `/explorer/${folderId}`);
            break;
        case "recents":
            const userId = parameters.userId;
            res.redirect(301, `/recents/${userId}`);
            break;
        case "picker":
            folderId = parameters.folderId;
            res.redirect(301, `/picker/${folderId}`);
            break;
        case "uploader":
            folderId = parameters.folderId;
            res.redirect(301, `/uploader/${folderId}`);
            break;
        case "preview":
            const fileId = parameters.fileId;
            res.redirect(301, `/preview/${fileId}`);
            break;
        default:
            res.redirect(301, '/explorer/0');
    }

  }
  catch(error) {
      console.log('Failed to get UI Element: ', error);
      res.status(500).send({ error: error.mesage });
  }
});

app.get('/box/explorer/token-downscope/:folderId', async (req, res) => {
    try {

        console.log('Here')
        await client.users.get(client.CURRENT_USER_ID)
            .then(result => {
                console.log(result)
            })
        const folderId = req.params.folderId;     
        const downscopedToken = await client.exchangeToken(EXPLORER_SCOPES, `https://api.box.com/2.0/folders/${folderId}`);
        console.log(downscopedToken)
        res.setHeader('Content-Type', 'application/json');
        res.status(200).send(downscopedToken);
    }
    catch(error) {
        console.log('Failed to get downscoped token: ', error)
        res.status(500).send({ error: error.mesage });
    }
})

app.get('/box/explorer-recents/token-downscope/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const userClient = sdk.getAppAuthClient('user', userId);
        const downscopedToken = await userClient.exchangeToken(RECENTS_SCOPES)

        res.setHeader('Content-Type', 'application/json');
        res.status(200).send(downscopedToken);
    }
    catch(error) {
        console.log('Failed to get downscoped token: ', error)
        res.status(500).send({ error: error.mesage });
    }
})

app.get('/box/picker/token-downscope/:folderId', async (req, res) => {
    try {
        const folderId = req.params.folderId;
        const downscopedToken = await client.exchangeToken(PICKER_SCOPES, `https://api.box.com/2.0/folders/${folderId}`);

        res.setHeader('Content-Type', 'application/json');
        res.status(200).send(downscopedToken);
    }
    catch(error) {
        console.log('Failed to get downscoped token: ', error)
        res.status(500).send({ error: error.mesage });
    }
})

app.get('/box/uploader/token-downscope/:folderId', async (req, res) => {
    try {
        await client.users.get(client.CURRENT_USER_ID)
            .then(result => {
                console.log('uploader', result)
            })
        const folderId = req.params.folderId;
        const downscopedToken = await client.exchangeToken(UPLOADER_SCOPES, `https://api.box.com/2.0/folders/${folderId}`);

        res.setHeader('Content-Type', 'application/json');
        res.status(200).send(downscopedToken);
    }
    catch(error) {
        console.log('Failed to get downscoped token: ', error)
        res.status(500).send({ error: error.mesage });
    }
})

app.get('/box/preview/token-downscope/:fileId', async (req, res) => {
    try {
        const fileId = req.params.fileId;
        const downscopedToken = await client.exchangeToken(PREVIEW_SCOPES, `https://api.box.com/2.0/files/${fileId}`);

        res.setHeader('Content-Type', 'application/json');
        res.status(200).send(downscopedToken);
    }
    catch(error) {
        console.log('Failed to get downscoped token: ', error)
        res.status(500).send({ error: error.mesage });
    }
})

app.listen(port);

   
app.get('/*', function (req, res) {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});