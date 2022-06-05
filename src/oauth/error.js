export const OAuthError = class extends Error {

	constructor(message, options = undefined) {

		super(message, options);

		if ( Error.captureStackTrace ) {
			Error.captureStackTrace(this, OAuthError);
		}

		this.name = 'OAuthError';

	}

};
