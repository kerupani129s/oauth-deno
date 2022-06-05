export const hmacSHA1 = async (data, key) => {

	const cryptoKey = await crypto.subtle.importKey(
		'raw',
		key,
		{ name: 'HMAC', hash: 'SHA-1' },
		false,
		['sign'],
	);

	const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, data);

	return signatureBuffer;

};
