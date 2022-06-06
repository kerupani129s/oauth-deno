/**
 * The OAuthError class.
 * @extends Error
 */
export class OAuthError extends Error {

	/**
	 * Create an OAuthError object.
	 * @param [message]
	 * @param [options]
	 * @param [options.error]
	 */
	constructor(message = undefined, options = undefined) {

		super(message, options);

		if ( Error.captureStackTrace ) {
			Error.captureStackTrace(this, OAuthError);
		}

		this.name = 'OAuthError';

	}

}
