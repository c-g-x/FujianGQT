import axios from 'axios';
import qs from 'qs';

// axios.defaults.proxy = {
//     host: '127.0.0.1',
//     port: '8889',
// }

const BaiduOCR = {
    grantType: 'client_credentials',
    publicKey: 'aj3j5Rb1gOSdj6VfyDLUrNgg',
    secretKey: 'OjrvyR57kI0LrcdskVX6s2FOgKh2sdGo',

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
        return respData['words_result'][0].words;
    }
}
export {BaiduOCR};