# OAuth 1.0a Client Library for Deno

## Features

- Supported signature method: HMAC-SHA1
- Supported authorization type: HTTP Authorization header

## Examples

### Client

```js
import { OAuth } from 'https://raw.githubusercontent.com/kerupani129s/oauth-deno/v1.0.5/src/oauth.js';

const authClient = new OAuth(
    'consumerKey',
    'consumerSecret',
);
```

### Setting a Token

```js
authClient.setToken(
    'token',
    'tokenSecret',
);
```

### Authentication

```js
// Step 1
const getRequestToken = async () => {

    const requestTokenURL = 'requestTokenURL';
    const request = await authClient.makeRequestForRequestToken(requestTokenURL);
    const response = await fetch(request);
    const responseParams = await authClient.getRequestTokenParamsFrom(response);

    return {
        requestToken      : responseParams.get('oauth_token'),
        requestTokenSecret: responseParams.get('oauth_token_secret'),
    };

};

// Step 2
const generateAuthURL = () => {
    const authURL = 'authURL';
    return authClient.generateAuthURL(authURL);
};

// Step 3
const getAccessToken = async verifier => {

    const accessTokenURL = 'accessTokenURL';
    const request = await authClient.makeRequestForAccessToken(accessTokenURL, verifier);
    const response = await fetch(request);
    const responseParams = await authClient.getAccessTokenParamsFrom(response);

    return {
        token      : responseParams.get('oauth_token'),
        tokenSecret: responseParams.get('oauth_token_secret'),
    };

};

// PIN-based authorization
const authenticate = async = () => {

    // Step 1
    await getRequestToken();

    // Step 2
    const authURL = generateAuthURL();
    console.log(`User Authorization URL: ${authURL}`);

    // Step 3
    const verifier = prompt('Enter the PIN:');
    const accessTokenInfo = await getAccessToken(verifier);

    return accessTokenInfo;

};
```

### Accessing Protected Resources

```js
const resourceURL = 'resourceURL';
const method = 'GET';
const params = [
    ['key_foo', 'value_foo'],
    ['key_bar', 'value_bar'],
];

const request = await authClient.makeRequestForResource(
    resourceURL,
    {
        method,
        params,
    },
);

const response = await fetch(request);
```

```js
const resourceURL = 'resourceURL';
const method = 'POST';
const contentType = 'application/x-www-form-urlencoded';
const bodyValue = [
    ['key_foo', 'value_foo'],
    ['key_bar', 'value_bar'],
];

const request = await authClient.makeRequestForResource(
    resourceURL,
    {
        method,
        contentType,
        bodyValue,
    },
);

const response = await fetch(request);
```

## License

[MIT License](LICENSE)
