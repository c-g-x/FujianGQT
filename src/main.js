import axios from './request/axios-fjgqt.js';
import { Buffer } from 'buffer';
import BaiduOCR from './utils/baidu-ocr.js';
import qs from 'qs';
import _ from 'lodash';
import gm from 'gm';
import { getEmailConfigurations, getMembers, getSecretaries } from './utils/config-loading.js';
import Hex from './encrypt/hex.js';
import SM4 from './encrypt/sm4.js';
import nodemailer from 'nodemailer';

const secretaries = await getSecretaries();
const members = await getMembers();
const email = await getEmailConfigurations();

/*
 * 测试ecb sm4加密
 */
function ecbEnc(str) {
  const hex = new Hex();
  const keyRec = 'A7E74D2B6282AEB1C5EA3C28D25660A7';
  const inputBytes = hex.utf8StrToBytes(str);
  const key = hex.decode(keyRec);
  const sm4 = new SM4();
  const cipher = sm4.encrypt_ecb(key, inputBytes);
  return hex.encode(cipher, 0, cipher.length);
}

/**
 * 获取 Cookies 字符串和验证码字符串
 *
 * @returns {Promise<Object>} 含有 cookies 属性和 validationCode 属性的对象
 */
async function getCookiesAndValidationCode() {
  const resp = await axios.get('https://m.fjcyl.com/validateCode?0.123123&width=58&height=19&num=4', {
    responseType: 'arraybuffer',
  });

  let data = await Buffer.from(resp.data);
  let img = 'data:image/jpg;base64,' + data.toString('base64');

  const validateCode = await BaiduOCR.getWords(img);
  // await console.log(`validateCode: ${validateCode}`);
  let validationCode = await validateCode;
  let cookies = await resp.headers['set-cookie'][0].match(/(JSESSIONID=.*); .*/)[1];
  // console.log(cookies);
  return { cookies, validationCode };
}

/**
 * 自动学习青年大学习
 *
 * @param member
 */
async function autoLearning(member, tryCount) {
  tryCount = tryCount || 1;
  if (tryCount >= 10) {
    return;
  }
  const cookiesAndValidationCode = await getCookiesAndValidationCode();
  const cookies = cookiesAndValidationCode.cookies;
  const validationCode = cookiesAndValidationCode.validationCode.trim();

  if (_.isEmpty(validationCode)) {
    return autoLearning(member, tryCount + 1);
  }
  const url = 'https://m.fjcyl.com/mobileNologin';

  const data = {
    userName: ecbEnc(member.username),
    pwd: ecbEnc(member.password),
    validateCode: ecbEnc(validationCode),
  };

  axios.post(url, qs.stringify(data), { headers: { Cookie: cookies } }).then((resp) => {
    // 做大学习
    if (resp?.data?.success !== true) {
      console.log(`${member.name} 登录失败|response: ${JSON.stringify(resp.data)}`);
      return autoLearning(member, tryCount + 1);
    }

    axios.post('https://m.fjcyl.com/studyRecord', null, { headers: { Cookie: cookies } }).then((resp) => {
      console.log(`${member.name} 学习${resp.data['success'] ? '成功' : '失败'}`);
    });
  });
}

function generateImage(data) {
  let imageMagick = gm.subClass({ imageMagick: true });
  let incompleteImage = imageMagick('./assets/images/background-image.png').font('./assets/fonts/msyh.ttf').fontSize(40).fill('#ff4da5');

  let x = 260;
  let y = 150;
  // const LENGTH = 80;
  let length = 1200 / data.incomplete.length;
  incompleteImage.drawText(130, 80, '青年大学习未完成名单');
  for (let name of data.incomplete) {
    incompleteImage = incompleteImage.drawText(x, y, name);
    y += length; // 80
  }
  incompleteImage.write('./assets/images/incomplete.png', (err) => {
    if (!err) {
      console.log('生成青年大学习完成情况图');
    } else {
      console.log(err.message || '青年大学习完成情况图生成失败');
    }
  });
}

function sendEmail(subject, text) {
  let transporter = nodemailer.createTransport({
    service: email.service,
    // port: 465,
    // secure: false,
    auth: {
      user: email.auth.user,
      pass: email.auth.pass,
    },
  });
  return transporter.sendMail({ from: email.from, to: email.from, subject: subject, text: text });
}

/**
 * 获取未完成青年大学习的团员名单
 *
 * @param secretary 团支部书记信息
 */
function getIncompleteMembers(secretary) {
  getCookiesAndValidationCode().then((object) => {
    const url = 'https://m.fjcyl.com/mobileNologin';
    const data = {
      userName: ecbEnc(secretary.username),
      pwd: ecbEnc(secretary.password),
      validateCode: ecbEnc(object.validationCode),
    };
    axios.post(url, qs.stringify(data), { headers: { Cookie: object.cookies } }).then((resp) => {
      // 做大学习
      if (resp?.data?.success !== true) {
        console.log(`${secretary.username} 登录失败 response: ${JSON.stringify(resp.data)}`);
        return false;
      }

      setTimeout(() => {
        /* 获取当前最新的季度号 */
        axios
          .post('https://m.fjcyl.com/admin/cylOrgMembers/groupByList?groupBy=1', null, { headers: { Cookie: object.cookies } })
          .then(async (resp) => {
            const quarterNo = resp?.data?.['rs']?.[0]?.['quarterNo'];

            if (!quarterNo) {
              console.log('获取当前季度号 `quarterNo` 失败');
              return;
            }

            const { data: userSession } = await axios.post('https://m.fjcyl.com/getUserSession', null, { headers: { Cookie: object.cookies } });
            const organizationId = await userSession?.['rs']?.['currentCylOrgMember']?.['orgId'];

            if (!organizationId) {
              console.log('未成功获取个人信息中的组织号 orgId');
              return;
            }
            // 获取最新一期的 group id
            axios
              .post(`https://m.fjcyl.com/admin/cylOrgMembers/selectList?orderBy=1&quarterNo=${quarterNo}`, null, {
                headers: { Cookie: object.cookies },
              })
              .then((resp) => {
                const groupStudyId = resp?.data?.['rs']?.[0]?.['guoupStudyId'];
                if (groupStudyId) {
                  // 查询学习情况列表
                  axios
                    .post(
                      `https://m.fjcyl.com/admin/cylOrgMembers/selectCurrentStudy?` +
                        `studyId=${groupStudyId}&current=&PAGE_SIZE=40&CURRENT_PAGE=1&orgId=${organizationId}`,
                      null,
                      { headers: { Cookie: object.cookies } }
                    )
                    .then(async (resp) => {
                      const groups = _.groupBy(resp.data?.['rs']?.['rs'], (o) => o['isStudy'] === '否');
                      const data = {
                        未完成名单: _.map(groups['true'], 'acctName'),
                        已完成名单: _.map(groups['false'], 'acctName'),
                      };

                      // generateImage(data);

                      console.log(JSON.stringify(data, null, 2));
                      await sendEmail('青年大学习完成情况', JSON.stringify(data, null, 2));
                    });
                }
              });
          });
      }, 2000);
    });
    return true;
  });
}

(async () => {
  let i = 0;
  for (const member of members) {
    setTimeout(async () => {
      await autoLearning(member);
    }, i * 2 * 1000);
    ++i;
  }

  setTimeout(() => {
    for (const secretary of secretaries) {
      getIncompleteMembers(secretary);
    }
  }, 60 * 1000);
})();
