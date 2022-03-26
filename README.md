# 福建共青团青年大学习

## 使用说明

### 环境

- node >= 14(推荐 lts，目前为 16.14.2)

### 安装

1. 将 /config_fjgqt/config.json.bak 的后缀 **.bak** 去掉
2. 申请百度智能云上的免费文字识别 OCR（用于识别验证码，也可自行修改程序配置其它 OCR 接口），获取的 public-key 和 secret-key 分别填入 `config.json`
3. 配置 `config.json` 的 email 用于发送完成情况到邮箱，[QQ 邮箱授权码获取方式](https://service.mail.qq.com/cgi-bin/help?subtype=1&id=28&no=1001256])
4. 配置 `config.json` 的 secretaries（团支书账户）账号密码，用于获取团支部青年大学习完成情况
5. 配置 `config.json` 的 members（团支部成员账户）账号密码，用于设置批量完成青年大学习的账号

### 建议

将本项目 clone 到云服务器上，配置 crontab 每周定时执行该脚本即可

以下是我的 crontab 配置（`crontab -e`）周一到周三下午 17:50 执行

```crontab
50 17 * * 1-3 cd /root/projects/FujianGQT && npm run start
```

```bash
npm install
```

### 运行

```bash
npm run start
```

## Links

- https://github.com/azz/pretty-quick
