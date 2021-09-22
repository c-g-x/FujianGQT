import axios from 'axios';
import {Buffer} from 'buffer';
import {BaiduOCR} from './src/utils/baidu-ocr.js';
import {RSAEncrypt} from './src/utils/utils.js';
import qs from 'qs'
import _ from 'lodash';
import gm from 'gm';
import {getSecretaries} from './src/utils/config-loading.js'

let secretaries = await getSecretaries();

/**
 * 获取 Cookies 字符串和 验证码字符串
 *
 * @returns {Promise<Object>} 含有 cookies 属性和 validationCode 属性的对象
 */
async function getCookiesAndValidationCode() {
    const resp = await axios.get('https://m.fjcyl.com/validateCode?0.123123&width=58&height=19&num=4', {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Linux; U; Android 4.1.2; zh-cn; GT-I9300 Build/JZO54K) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30 MicroMessenger/5.2.380',
            "Access-Control-Allow-Origin": "https://m.fjcyl.com",
            "Access-Control-Allow-Headers": "X-Requested-With,Content-Type",
            "Access-Control-Allow-Methods": "PUT,POST,GET,DELETE,OPTIONS",
            "Access-Control-Allow-Credentials": true,
            "withCredentials": true,
        },
        responseType: 'arraybuffer',
    });

    let data = await Buffer.from(resp.data);
    let img = await 'data:image/jpg;base64,' + data.toString('base64');

    const validateCode = await BaiduOCR.getWords(img);
    await console.log(`validateCode: ${validateCode}`);
    let validationCode = await validateCode;
    let cookies = await resp.headers['set-cookie'][0].match(/(JSESSIONID=.*); .*/)[1];
    console.log(cookies);
    return {cookies, validationCode};
};

/**
 * 自动学习青年大学习
 *
 * @param members 团员账号列表
 */
function autoLearning(secretary) {
    getCookiesAndValidationCode().then((object) => {
        const url = 'https://m.fjcyl.com/mobileNologin';
        const data = {
            'userName': RSAEncrypt(secretary.username),
            'pwd': RSAEncrypt(secretary.password),
            'validateCode': RSAEncrypt(object.validationCode),
        }
        const config = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; U; Android 4.1.2; zh-cn; GT-I9300 Build/JZO54K) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30 MicroMessenger/5.2.380',
                "Access-Control-Allow-Origin": "https://m.fjcyl.com",
                "Access-Control-Allow-Headers": "X-Requested-With,Content-Type",
                "Access-Control-Allow-Methods": "PUT,POST,GET,DELETE,OPTIONS",
                "Access-Control-Allow-Credentials": true,
                "withCredentials": true,
                'Cookie': object.cookies,
            },
        };
        axios.post(url, qs.stringify(data), config).then(() => { // 做大学习
            axios.post('https://m.fjcyl.com/studyRecord', null, config).then((resp) => {
                console.log(`${secretary.username} 学习${resp.data['success'] ? '成功' : '失败'}`);
            });
        });

        setTimeout(() => {
            /* 获取当前最新的季度号 */
            axios.post('https://m.fjcyl.com/admin/cylOrgMembers/groupByList?groupBy=1', null, config).then(async resp => {
                const quarterNo = resp?.data?.rs?.[0]?.quarterNo;

                if (!quarterNo) {
                    console.log("获取当前季度号 `quarterNo` 失败");
                    return;
                }

                const {data: userSession} = await axios.post('https://m.fjcyl.com/getUserSession', null, config);
                const organizationId = await userSession?.rs?.currentCylOrgMember?.orgId;

                if (!organizationId) {
                    console.log("未成功获取个人信息中的组织号 orgId");
                    return;
                }
                // 获取最新一期的 group id
                axios.post(`https://m.fjcyl.com/admin/cylOrgMembers/selectList?orderBy=1&quarterNo=${quarterNo}`, null, config)
                    .then(resp => {
                        const groupStudyId = resp?.data?.rs[0]?.guoupStudyId;
                        if (groupStudyId) {
                            // 查询学习情况列表
                            axios.post(`https://m.fjcyl.com/admin/cylOrgMembers/selectCurrentStudy?` +
                                `studyId=${groupStudyId}&current=&PAGE_SIZE=40&CURRENT_PAGE=1&orgId=${organizationId}`,
                                null, config).then((resp) => {
                                const groups = _.groupBy(resp.data.rs.rs, o => o.isStudy === '否');
                                const data = {
                                    "incomplete": _.map(groups.true, 'acctName'),
                                    "complete": _.map(groups.false, 'acctName'),
                                }

                                let imageMagick = gm.subClass({imageMagick: true});
                                let incompleteImage = imageMagick('./assets/images/background-image.png')
                                    .font('./assets/fonts/msyh.ttf')
                                    .fontSize(40)
                                    .fill('#ff4da5');

                                let x = 260;
                                let y = 150;
                                const LENGTH = 80;
                                let length = 1200 / data.incomplete.length;
                                incompleteImage.drawText(130, 80, '青年大学习未完成名单')
                                for (let name of data.incomplete) {
                                    incompleteImage = incompleteImage.drawText(x, y, name);
                                    y += length; // 80
                                }
                                incompleteImage.write('./assets/images/incomplete.png', err => {
                                    if (!err) {
                                        console.log("生成青年大学习完成情况图");
                                    } else {
                                        console.log(err.message || "青年大学习完成情况图生成失败");
                                    }
                                })

                                console.log(JSON.stringify(data, null, 2));
                            });
                        }
                    });
            })

        }, 3000);
    });
};

for (const secretary of secretaries) {
    autoLearning(secretary);
}
