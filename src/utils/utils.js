import {RsaArr} from '../encrypt/wx_rsa.js';

/**
 * 接收一个字符串并根据 PUBLIC KEY 对齐进行加密
 * @param {String} word 字符串
 * @return {String} 加密后的字符串
 */
export function RSAEncrypt(word) {
    let encryptRsa = RsaArr.RSAKey();
    encryptRsa = RsaArr.KEYUTIL.getKey("-----BEGIN PUBLIC KEY-----MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBAKf9iZkA5HEFw4zt7MRBkcmgUiz5+r5eqDOKbaurEbScmXd3ZZTtyzirqkYKRIH5mQ+8hq+Wd/pTZNXHS8L0+88CAwEAAQ==-----END PUBLIC KEY-----");
    let encStr = encryptRsa.encrypt(word);
    encStr = RsaArr.hex2b64(encStr);
    return encStr;
};
