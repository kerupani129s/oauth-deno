import { encode as encodeBase64 } from './deps/std/encoding/base64.ts';

import { stringify as stringifyHex } from './encoding/hex.js';
import { parse as parseUint8Array } from './encoding/uint8array.js';
import { encodeURIComponentRFC3986 as encodePercent } from './encoding/uri.js';
import { hmacSHA1 } from './hash/hmac_sha1.js';
import { OAuthError } from './oauth/error.js';

const buildQuery = params => (
	params
		.map(([key, value]) => `${encodePercent(key)}=${encodePercent(value)}`)
		.join('&')
);

const buildURL = (requestURL, params, isPost) => {
	if ( isPost || ! params.length ) {
		return requestURL;
	} else {
		return `${requestURL}?${buildQuery(params)}`;
	}
};

const buildBody = (bodyValue, isBodyTypeParams) => {
	if ( isBodyTypeParams ) {
		return buildQuery(bodyValue);
	} else {
		return bodyValue;
	}
};

/**
 * The OAuth 1.0a client class.
 */
export class OAuth {

	static #type = 'OAuth';

	#consumerKey;
	#consumerSecret;

	#token = '';
	#tokenSecret = '';

	#signatureMethod = 'HMAC-SHA1';
	#version = '1.0';

	/**
	 * Create an OAuth object.
	 * @param consumerKey - The consumer key.
	 * @param consumerSecret - The consumer secret.
	 */
	constructor(consumerKey, consumerSecret) {
		this.#consumerKey = consumerKey;
		this.#consumerSecret = consumerSecret;
	}

	/**
	 * Set the token and token secret.
	 * @param [token=] - The token.
	 * @param [tokenSecret=] - The token secret.
	 */
	setToken(token = '', tokenSecret = '') {
		this.#token = token;
		this.#tokenSecret = tokenSecret;
	}

	// 参考: https://oauth.net/core/1.0a/#rfc.section.8
	#getNonce() {
		const uint8array = new Uint8Array(16);
		crypto.getRandomValues(uint8array);
		return stringifyHex(uint8array);
	}

	// 参考: https://oauth.net/core/1.0a/#rfc.section.8
	#getTimestamp() {
		return Math.floor(Date.now() / 1000);
	}

	// 注意: oAuthParams に realm や oauth_signature を含めないでください。
	async #generateSignature(
		method,
		requestURL,
		params,
		oAuthParams,
		bodyParams,
	) {

		// 参考: https://oauth.net/core/1.0a/#rfc.section.9.1.1
		const paramsString = [...params, ...oAuthParams, ...bodyParams]
			.map(([key, value]) => [encodePercent(key), encodePercent(value)])
			.sort(([aKey, aValue], [bKey, bValue]) => {
				if ( aKey < bKey ) return -1;
				if ( aKey > bKey ) return 1;
				if ( aValue < bValue ) return -1;
				if ( aValue > bValue ) return 1;
				return 0;
			})
			.map(([key, value]) => `${key}=${value}`)
			.join('&');

		// 参考: https://oauth.net/core/1.0a/#rfc.section.9.1.3
		const baseString = `${
			method.toUpperCase()
		}&${
			encodePercent(requestURL)
		}&${
			encodePercent(paramsString)
		}`;

		// 参考: https://oauth.net/core/1.0a/#rfc.section.9.2
		// メモ: Token Secret は空の場合でも連結は必要なため注意
		const keyString = `${
			encodePercent(this.#consumerSecret)
		}&${
			encodePercent(this.#tokenSecret)
		}`;

		// 参考: https://oauth.net/core/1.0a/#rfc.section.9.2
		// 参考: https://oauth.net/core/1.0a/#rfc.section.9.2.1
		// メモ: ドキュメントの説明文では「URL エンコードする」と書かれているが、具体例ではそうなっていない
		// メモ: URL エンコードは後で行うため不要なはず
		const data = parseUint8Array(baseString);
		const key  = parseUint8Array(keyString);

		const signatureBuffer = await hmacSHA1(data, key);
		const signature = encodeBase64(signatureBuffer);

		return signature;

	}

	// 参考: https://oauth.net/core/1.0a/#rfc.section.5.4.1
	async #getCredentials(method, requestURL, params, oAuthParams, bodyParams) {

		const signature = await this.#generateSignature(
			method,
			requestURL,
			params,
			oAuthParams,
			bodyParams,
		);

		const credentials = [
			...oAuthParams,
			['oauth_signature', signature],
		]
			.map(([key, value]) => `${encodePercent(key)}="${encodePercent(value)}"`)
			.join(', ');

		return credentials;

	}

	// 参考: https://oauth.net/core/1.0a/#rfc.section.5.4.1
	async #getAuthHeaderValue(
		method,
		requestURL,
		params,
		oAuthParams,
		bodyParams,
	) {
		const credentials = await this.#getCredentials(
			method,
			requestURL,
			params,
			oAuthParams,
			bodyParams,
		);
		return `${OAuth.#type} ${credentials}`;
	}

	async #makeRequest(
		requestURL,
		{
			method = 'GET',
			params = [],
			oAuthParams = [],
			contentType = 'application/x-www-form-urlencoded',
			bodyValue,
		} = {},
	) {

		const isBodyTypeParams = (
			'application/x-www-form-urlencoded' === contentType
		);
		const isPost = 'POST' === method && bodyValue;

		// 
		const url = buildURL(requestURL, params, isPost);

		const bodyParams = isPost && isBodyTypeParams ? bodyValue : [];
		const authorization = await this.#getAuthHeaderValue(
			method,
			requestURL,
			params,
			oAuthParams,
			bodyParams,
		);

		const body = isPost ? buildBody(bodyValue, isBodyTypeParams) : undefined;

		const request = new Request(url, {
			method,
			headers: {
				'Authorization': authorization,
				...(isPost ? { 'Content-Type': contentType } : undefined),
			},
			body,
		});

		return request;

	}

	/**
	 * Make a Request object for a request token.
	 * @param requestTokenURL - The request token URL.
	 * @param [options]
	 * @param [options.method=POST] - The request method.
	 * @param [options.params=[]] - The HTTP GET parameters.
	 * @param [options.contentType=application/x-www-form-urlencoded] - The content type of the body of the HTTP POST request.
	 * @param [options.bodyValue] - The value of the body of the HTTP POST request.
	 * @param [options.callbackURL=oob] - The callback URL.
	 * @returns {Request}
	 */
	// 参考: https://oauth.net/core/1.0a/#rfc.section.6.1.1
	async makeRequestForRequestToken(
		requestTokenURL,
		{
			method = 'POST',
			params = [],
			contentType = 'application/x-www-form-urlencoded',
			bodyValue,
			callbackURL = 'oob',
		} = {},
	) {

		this.setToken();

		// 
		const oAuthParams = [
			['oauth_callback'        , callbackURL],
			['oauth_consumer_key'    , this.#consumerKey],
			['oauth_nonce'           , this.#getNonce()],
			['oauth_signature_method', this.#signatureMethod],
			['oauth_timestamp'       , this.#getTimestamp()],
			['oauth_version'         , this.#version],
		];

		const request = await this.#makeRequest(requestTokenURL, {
			method,
			params,
			oAuthParams,
			contentType,
			bodyValue,
		});

		return request;

	}

	/**
	 * Get a request token from the Responmse object.
	 * @param {Response} response - The Response object.
	 * @returns {URLSearchParams}
	 * @throws {OAuthError}
	 */
	// 参考: https://oauth.net/core/1.0a/#rfc.section.6.1.2
	async getRequestTokenParamsFrom(response) {

		if ( ! response.ok ) {
			throw new OAuthError('Failed to get request token');
		}

		const text = await response.text();
		const params = new URLSearchParams(text);

		// メモ: OAuth 1.0 と 1.0a を区別するために必要
		// メモ: OAuth 1.0a の仕様ではクライアント側での確認は強制でない
		if ( ! params.get('oauth_callback_confirmed') ) {
			throw new OAuthError('Unconfirmed callback');
		}

		this.setToken(
			params.get('oauth_token'),
			params.get('oauth_token_secret'),
		);

		return params;

	}

	/**
	 * Generate a user authorization URL with the parameters.
	 * @param authURL - The user authorization URL.
	 * @param [options]
	 * @param [options.params=[]] - The HTTP GET parameters.
	 * @returns {string}
	 */
	// 参考: https://oauth.net/core/1.0a/#rfc.section.6.2.1
	generateAuthURL(
		authURL,
		{
			params = [],
		} = {},
	) {
		const query = [
			['oauth_token', this.#token],
			...params,
		]
			.map(([key, value]) => `${encodePercent(key)}=${encodePercent(value)}`)
			.join('&');
		return `${authURL}?${query}`;
	}

	/**
	 * Make a Request object for a access token.
	 * @param accessTokenURL - The access token URL.
	 * @param [options]
	 * @param [options.method=POST] - The request method.
	 * @returns {Request}
	 */
	// 参考: https://oauth.net/core/1.0a/#rfc.section.6.3.1
	async makeRequestForAccessToken(
		accessTokenURL,
		verifier,
		{
			method = 'POST',
		} = {},
	) {

		const oAuthParams = [
			['oauth_consumer_key'    , this.#consumerKey],
			['oauth_nonce'           , this.#getNonce()],
			['oauth_signature_method', this.#signatureMethod],
			['oauth_timestamp'       , this.#getTimestamp()],
			['oauth_token'           , this.#token],
			['oauth_verifier'        , verifier],
			['oauth_version'         , this.#version],
		];

		const request = await this.#makeRequest(accessTokenURL, {
			method,
			oAuthParams,
		});

		return request;

	}

	/**
	 * Get an access token from the Responmse object.
	 * @param {Response} response - The Response object.
	 * @returns {URLSearchParams}
	 * @throws {OAuthError}
	 */
	// 参考: https://oauth.net/core/1.0a/#rfc.section.6.3.2
	async getAccessTokenParamsFrom(response) {

		if ( ! response.ok ) {
			throw new OAuthError('Failed to get access token');
		}

		const text = await response.text();
		const params = new URLSearchParams(text);

		this.setToken(
			params.get('oauth_token'),
			params.get('oauth_token_secret'),
		);

		return params;

	}

	/**
	 * Make a Request object for the protected resources.
	 * @param resourceURL - The resource URL.
	 * @param [options]
	 * @param [options.method=GET] - The request method.
	 * @param [options.params=[]] - The HTTP GET parameters.
	 * @param [options.contentType=application/x-www-form-urlencoded] - The content type of the body of the HTTP POST request.
	 * @param [options.bodyValue] - The value of the body of the HTTP POST request.
	 * @returns {Request}
	 */
	// 参考: https://oauth.net/core/1.0a/#rfc.section.7
	async makeRequestForResource(
		resourceURL,
		{
			method = 'GET',
			params = [],
			contentType = 'application/x-www-form-urlencoded',
			bodyValue,
		} = {},
	) {

		const oAuthParams = [
			['oauth_consumer_key'    , this.#consumerKey],
			['oauth_nonce'           , this.#getNonce()],
			['oauth_signature_method', this.#signatureMethod],
			['oauth_timestamp'       , this.#getTimestamp()],
			['oauth_token'           , this.#token],
			['oauth_version'         , this.#version],
		];

		const request = await this.#makeRequest(resourceURL, {
			method,
			params,
			oAuthParams,
			contentType,
			bodyValue,
		});

		return request;

	}

}
