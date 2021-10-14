import axios from 'axios';

axios.defaults.withCredentials = true;
axios.defaults.headers = {
  'User-Agent':
    'Mozilla/5.0 (Linux; U; Android 4.1.2; zh-cn; GT-I9300 Build/JZO54K) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30 MicroMessenger/5.2.380',
  'Access-Control-Allow-Origin': 'https://m.fjcyl.com',
  'Access-Control-Allow-Headers': 'X-Requested-With,Content-Type',
  'Access-Control-Allow-Methods': 'PUT,POST,GET,DELETE,OPTIONS',
  'Access-Control-Allow-Credentials': true,
  withCredentials: true,
  'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
};
// axios.defaults.proxy = {
//     host: '127.0.0.1',
//     port: 8889,
// };

export default axios;
