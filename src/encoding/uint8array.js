const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export const parse = string => textEncoder.encode(string);

export const stringify = buffer => textDecoder.decode(buffer);
