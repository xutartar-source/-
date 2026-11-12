# 八字排盘

自用的八字排盘网页应用(PWA),手机浏览器打开后可添加到主屏幕,离线可用。

当前为第一阶段:输入出生时间、性别、出生地,输出四柱、十神、藏干、纳音、大运。

## 排盘规则

- 历法计算全部交给 [lunar-javascript](https://github.com/6tail/lunar-javascript)。
- 年柱、月柱、大运:按北京时间与节气时刻比较。
- 日柱、时柱:按真太阳时(经度修正 + 均时差),可在表单里关闭。
- 1986–1991 年夏令时期间出生,自动减 1 小时。
- 晚子时(23 点后)日柱默认算次日,可在表单里切换。
- 命盘只保存在本机浏览器(localStorage),可导出、导入 JSON 备份。

## 开发

```bash
npm install
npm run dev          # 本地开发
npm test             # 排盘与真太阳时测试
npm run build        # 构建到 dist/
npm run test:mobile  # 手机视口端到端测试(需先 build,依赖 Playwright)
```

## 部署

`dist/` 是纯静态文件,放到任何支持 HTTPS 的静态托管即可(PWA 需要 HTTPS)。
构建命令 `npm run build`,输出目录 `dist`。
