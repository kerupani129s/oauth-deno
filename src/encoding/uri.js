/**
 * Unreserved: A-Z a-z 0-9 - _ . ! ~ * ' ( )
 */
const encodeURIComponentRFC2396 = encodeURIComponent;

/**
 * Unreserved: A-Z a-z 0-9 - _ . ~
 */
export const encodeURIComponentRFC3986 = uriComponent => (
	encodeURIComponentRFC2396(uriComponent)
		.replace(/[!'()*]/g, char => `%${char.charCodeAt().toString(16)}`)
);
