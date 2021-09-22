import axios from 'axios';
import qs from 'qs';
import {getOcrConfig} from './config-loading.js'

axios.defaults.proxy = {
    host: '127.0.0.1',
    port: '8889',
}
axios.defaults.withCredentials = true;

const BAIDU_OCR_CONFIG = await getOcrConfig();

const BaiduOCR = {
    grantType: 'client_credentials',
    publicKey: BAIDU_OCR_CONFIG['public-key'],
    secretKey: BAIDU_OCR_CONFIG['secret-key'],

    async getAccessToken() {
        const url = 'https://aip.baidubce.com/oauth/2.0/token';
        const data = {
            grant_type: this.grantType,
            client_id: this.publicKey,
            client_secret: this.secretKey,
        }
        const config = {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            }
        }

        const resp = await axios.post(url, qs.stringify(data), config);
        return resp.data.access_token;
    },

    async getWords(base64image) {
        const accessToken = await this.getAccessToken();
        const url = `https://aip.baidubce.com/rest/2.0/ocr/v1/accurate_basic?access_token=${accessToken}`
        const data = {
            image: base64image,
        }
        const config = {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            }
        }

        let result = "";
        const {data: respData} = await axios.post(url, qs.stringify(data), config);
        return respData['words_result']?.[0]?.words || '';
    }
}
export {BaiduOCR};