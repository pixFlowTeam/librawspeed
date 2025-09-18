# raw_wb_tool

基于 LibRaw + littleCMS + OpenCV 的命令行工具：

- 读取 RAW 并解码为线性 RGB（由 LibRaw 完成，禁用 gamma 和自动增亮）
- 在线性空间中无损地应用色温(K)与色调(Tint)增益（Lightroom 风格）
- 可切换 LibRaw 白平衡模式：camera / auto / none / user
- 使用 littleCMS 将线性 RGB 映射到 sRGB，并应用 sRGB OETF 输出 JPEG
- 输出步骤备注（可选）并打印估算的 CCT 与 duv

构建：

```bash
make -C tools/raw_wb_tool | cat
```

示例：

```bash
tools/build/tools/raw_wb_tool /path/to/RAW.NEF --out /tmp/out.jpg --wb camera --kelvin 6500 --tint +10 --quality 92 --notes
```

原理说明：

- 无损调节：在 LibRaw 输出的线性 RGB 空间中对通道做比例缩放，相当于改变白点，不引入量化损失。
- K/Tint 到增益：以 6500K 作为参考，近似地对 R/B 通道使用 K 的幂律缩放，Tint 沿 u'v' 方向正交于黑体轨迹，对 R/G 与 B/G 相反方向调整；随后归一化保持灰卡不变。
- 色彩管理：利用 littleCMS 建立线性 RGB 到 sRGB 的变换，并再应用 sRGB OETF（显示伽马）以输出 JPEG。


