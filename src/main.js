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
import { sleep } from './utils/utils.js';

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
 * @param member{object} 成员对象
 * @param tryCount{number} 尝试次数
 */
async function autoLearning(member, tryCount = 1) {
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
 * @param isGenerateImage{boolean} 是否生成图片
 */
async function getIncompleteMembers(secretary, isGenerateImage = false) {
  const CookieObject = await getCookiesAndValidationCode();

  const LOGIN_URL = 'https://m.fjcyl.com/mobileNologin';
  const data = {
    userName: ecbEnc(secretary.username),
    pwd: ecbEnc(secretary.password),
    validateCode: ecbEnc(CookieObject.validationCode),
  };

  const loginResponse = await axios.post(LOGIN_URL, qs.stringify(data), { headers: { Cookie: CookieObject.cookies } });
  if (loginResponse?.data?.success !== true) {
    console.log(`${secretary.username} 登录失败 response: ${JSON.stringify(loginResponse.data)}`);
    return false;
  }

  await sleep();

  // 做大学习
  // 获取当前最新的季度号
  const groupListResponse = await axios.post('https://m.fjcyl.com/admin/cylOrgMembers/groupByList?groupBy=1', null, {
    headers: { Cookie: CookieObject.cookies },
  });
  const quarterNo = groupListResponse?.data?.['rs']?.[0]?.['quarterNo'];

  if (!quarterNo) {
    console.log('获取当前季度号 `quarterNo` 失败');
    return false;
  }

  const { data: userSession } = await axios.post('https://m.fjcyl.com/getUserSession', null, { headers: { Cookie: CookieObject.cookies } });
  const organizationId = await userSession?.['rs']?.['currentCylOrgMember']?.['orgId'];

  if (!organizationId) {
    console.log('未成功获取个人信息中的组织号 orgId', organizationId);
    return false;
  }
  // 获取最新一期的 group id
  const selectListResponse = await axios.post(`https://m.fjcyl.com/admin/cylOrgMembers/selectList?orderBy=1&quarterNo=${quarterNo}`, null, {
    headers: { Cookie: CookieObject.cookies },
  });
  const groupStudyId = selectListResponse?.data?.['rs']?.[0]?.['guoupStudyId'];
  if (!groupStudyId) {
    console.log('获取groupStudyId失败');
    return false;
  }

  // 查询学习情况列表

  const groupStudyIdResponse = await axios.post(
    `https://m.fjcyl.com/admin/cylOrgMembers/selectCurrentStudy?` +
      `studyId=${groupStudyId}&current=&PAGE_SIZE=40&CURRENT_PAGE=1&orgId=${organizationId}`,
    null,
    { headers: { Cookie: CookieObject.cookies } }
  );
  const groups = _.groupBy(groupStudyIdResponse.data?.['rs']?.['rs'], (o) => o['isStudy'] === '否');
  const resultGroupData = {
    未完成名单: _.map(groups['true'], 'acctName'),
    已完成名单: _.map(groups['false'], 'acctName'),
  };

  // 生成完成情况图片
  if (isGenerateImage) {
    generateImage(resultGroupData);
  }

  console.log(JSON.stringify(resultGroupData, null, 2));
  await sendEmail('青年大学习完成情况', JSON.stringify(resultGroupData, null, 2));
  return true;
}

(async () => {
  for (const member of members) {
    await autoLearning(member);
    await sleep(2000); // 防止过于频繁请求百度 OCR 接口导致限制并发数（免费账号并发数为 1）
  }

  for (const secretary of secretaries) {
    let success = await getIncompleteMembers(secretary);
    console.log(`↑============================success: ${success}============================↑\n`);
  }
})();
